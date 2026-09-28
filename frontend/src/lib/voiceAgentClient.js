/**
 * AssemblyAI Voice Agent client.
 *
 * Flow: backend-issued short-lived token -> wss://agents.assemblyai.com/v1/ws
 * -> session.update (built server-side from the ai/ modules) -> AudioWorklet
 * mic capture as 24 kHz mono PCM16 -> spoken reply played back locally.
 *
 * The AssemblyAI API key is never referenced here. Only the temporary token from
 * GET /api/voice-agent/token is used.
 */

import { apiUrl } from "./api.js";

const WS_URL = "wss://agents.assemblyai.com/v1/ws";
// Routed through apiUrl so a deployed build reaches the Railway backend
// instead of the Vercel origin, where these paths would 404.
const TOKEN_ENDPOINT = apiUrl("/api/voice-agent/token");
const CONFIG_ENDPOINT = apiUrl("/api/voice-agent/config");
const TOOL_ENDPOINT = apiUrl("/api/voice-agent/tools");
const WORKLET_URL = "/pcm-worklet.js";

/** Audio format the Voice Agent API expects. */
const PCM_SAMPLE_RATE = 24000;

/** @type {Record<string, 'connecting'|'connected'|'listening'|'speaking'|'disconnected'|'error'>} */
export const CONNECTION_STATES = {
  CONNECTING: "connecting",
  CONNECTED: "connected",
  LISTENING: "listening",
  SPEAKING: "speaking",
  DISCONNECTED: "disconnected",
  ERROR: "error",
};

const STATE_LABELS = {
  connecting: "Connecting…",
  connected: "Connected — speak when you are ready",
  listening: "Listening…",
  speaking: "Interviewer is speaking…",
  disconnected: "Disconnected",
  error: "Connection error",
};

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToPcm16(base64) {
  const binary = atob(base64);
  const view = new DataView(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) {
    view.setUint8(i, binary.charCodeAt(i));
  }
  const samples = new Float32Array(Math.floor(binary.length / 2));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = view.getInt16(i * 2, true) / 32768;
  }
  return samples;
}

function createSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `va-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default class VoiceAgentClient {
  constructor(options = {}) {
    this.onStateChange = options.onStateChange || (() => {});
    this.onMessage = options.onMessage || (() => {});
    this.onInterimUser = options.onInterimUser || (() => {});
    this.onToolActivity = options.onToolActivity || (() => {});
    this.onError = options.onError || (() => {});
    this.onAgentAudioEnd = options.onAgentAudioEnd || (() => {});

    this.targetRole = options.targetRole || "general";
    this.mode = options.mode || "technical";
    this.maxQuestions = options.maxQuestions || 8;
    this.candidateName = options.candidateName || "";
    this.candidateProfile = options.candidateProfile || null;
    this.jobDescription = options.jobDescription || "";

    this.sessionId = options.sessionId || createSessionId();

    this.state = CONNECTION_STATES.DISCONNECTED;
    this.sessionStateId = null;
    this.ws = null;
    this.ready = false;

    this.audioContext = null;
    this.micStream = null;
    this.sourceNode = null;
    this.workletNode = null;
    this.sinkNode = null;

    this.nextPlaybackTime = 0;
    this.activeSources = new Set();

    this.lastEvent = null;
    this.pendingTools = [];
    this.toolResults = new Map();
    this.agentSpeaking = false;
    this.stopping = false;

    /** Authoritative conversation, also sent to the backend on every tool call. */
    this.messages = [];
  }

  get statusLabel() {
    return STATE_LABELS[this.state] || "";
  }

  get isActive() {
    return this.state !== CONNECTION_STATES.DISCONNECTED && this.state !== CONNECTION_STATES.ERROR;
  }

  setState(next) {
    if (this.state === next) return;
    this.state = next;
    this.onStateChange(next);
  }

  // ---------------------------------------------------------------- lifecycle

  /**
   * Connect. Must be called from a user gesture: the microphone is requested
   * first so Safari's gesture requirement is satisfied before any await.
   */
  async start() {
    if (this.isActive) return;
    this.stopping = false;
    this.setState(CONNECTION_STATES.CONNECTING);

    try {
      await this.startAudio();
    } catch (error) {
      this.setState(CONNECTION_STATES.ERROR);
      const message =
        error && error.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow the microphone and try again."
          : `Could not start the microphone: ${error.message}`;
      this.onError(new Error(message));
      throw new Error(message);
    }

    try {
      const [{ token }, config] = await Promise.all([
        this.fetchToken(),
        this.fetchSessionConfig(),
      ]);

      await this.openSocket(token, config);
    } catch (error) {
      await this.teardown();
      this.setState(CONNECTION_STATES.ERROR);
      this.onError(error);
      throw error;
    }
  }

  /** End the session cleanly, then release local resources. */
  async stop() {
    this.stopping = true;
    const ws = this.ws;

    if (ws && ws.readyState === WebSocket.OPEN) {
      await new Promise((resolve) => {
        const done = () => resolve();
        const timer = setTimeout(done, 3000);
        this.onSessionEndedHook = () => {
          clearTimeout(timer);
          resolve();
        };
        try {
          ws.send(JSON.stringify({ type: "session.end" }));
        } catch {
          clearTimeout(timer);
          resolve();
        }
      });
    }

    await this.teardown();
    this.setState(CONNECTION_STATES.DISCONNECTED);
  }

  // ------------------------------------------------------------------ backend

  async fetchToken() {
    const response = await fetch(TOKEN_ENDPOINT);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.token) {
      throw new Error(data.error || "Could not get a temporary Voice Agent token");
    }
    return data;
  }

  async fetchSessionConfig() {
    const params = new URLSearchParams({
      sessionId: this.sessionId,
      targetRole: this.targetRole,
      mode: this.mode,
      maxQuestions: String(this.maxQuestions),
    });
    if (this.candidateName) params.set("candidateName", this.candidateName);
    if (this.jobDescription) params.set("jobDescription", this.jobDescription);

    const response = await fetch(`${CONFIG_ENDPOINT}?${params.toString()}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.session) {
      throw new Error(data.error || "Could not load the interviewer configuration");
    }
    return data;
  }

  // ----------------------------------------------------------------- websocket

  openSocket(token, config) {
    const url = new URL(WS_URL);
    url.searchParams.set("token", token);

    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url.toString());
      this.ws = ws;

      const fail = (error) => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        reject(error);
      };

      ws.onopen = () => {
        // Inline configuration, built on the server from ai/prompts + ai/career-engine.
        ws.send(JSON.stringify({ type: "session.update", session: config.session }));
      };

      ws.onerror = () => {
        if (!settled) fail(new Error("Could not open the Voice Agent WebSocket"));
      };

      ws.onclose = (event) => {
        if (!settled) {
          settled = true;
          reject(
            new Error(
              event.reason || "The Voice Agent connection closed before the session started"
            )
          );
          return;
        }
        this.onSocketClosed(event);
      };

      ws.onmessage = (event) => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        if (!settled && message.type === "session.ready") {
          settled = true;
          this.ready = true;
          this.setState(CONNECTION_STATES.CONNECTED);
          this.setMicMuted(false);
          resolve();
        }

        this.handleEvent(message);
      };
    });
  }

  onSocketClosed() {
    this.ready = false;
    this.flushPlayback();
    this.setMicMuted(true);
    if (!this.stopping) {
      this.setState(CONNECTION_STATES.DISCONNECTED);
    }
  }

  send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  // -------------------------------------------------------------------- audio

  async startAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("This browser does not support the Web Audio API");
    }

    // Default device rate on purpose: forcing 24 kHz is Chromium-only and breaks
    // Firefox echo cancellation. The worklet resamples to 24 kHz instead.
    this.audioContext = new AudioContextClass();
    await this.audioContext.resume();

    await this.audioContext.audioWorklet.addModule(WORKLET_URL);

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        channelCount: 1,
      },
    });

    this.workletNode = new AudioWorkletNode(this.audioContext, "voice-pcm-capture", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
      processorOptions: {
        inputSampleRate: this.audioContext.sampleRate,
        targetSampleRate: PCM_SAMPLE_RATE,
        chunkSamples: 1200,
      },
    });

    // Muted until session.ready so nothing is sent on an unready socket.
    this.workletNode.port.postMessage({ muted: true });

    this.workletNode.port.onmessage = (event) => {
      if (!this.ready) return;
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      this.send({ type: "input.audio", audio: arrayBufferToBase64(event.data) });
    };

    // A worklet with no output path is not guaranteed to be pulled by the graph,
    // so keep it alive through a silent sink.
    this.sinkNode = this.audioContext.createGain();
    this.sinkNode.gain.value = 0;
    this.sinkNode.connect(this.audioContext.destination);

    this.sourceNode = this.audioContext.createMediaStreamSource(this.micStream);
    this.sourceNode.connect(this.workletNode);
    this.workletNode.connect(this.sinkNode);

    this.nextPlaybackTime = this.audioContext.currentTime;
  }

  setMicMuted(muted) {
    if (this.workletNode) {
      this.workletNode.port.postMessage({ muted });
    }
  }

  playAgentAudio(base64) {
    if (!this.audioContext) return;
    const samples = base64ToPcm16(base64);
    if (samples.length === 0) return;

    const buffer = this.audioContext.createBuffer(1, samples.length, PCM_SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    this.nextPlaybackTime = Math.max(this.nextPlaybackTime, now + 0.02);
    source.start(this.nextPlaybackTime);
    this.nextPlaybackTime += buffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0 && this.agentSpeaking) {
        this.agentSpeaking = false;
        this.onAgentAudioEnd();
      }
    };
  }

  /** Drop queued playback — required on barge-in so the user hears no stale speech. */
  flushPlayback() {
    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    this.activeSources.clear();
    this.agentSpeaking = false;
    if (this.audioContext) {
      this.nextPlaybackTime = this.audioContext.currentTime;
    }
  }

  // ------------------------------------------------------------------- events

  pushMessage(message) {
    this.messages.push({ ...message, id: `${message.speaker}-${this.messages.length}` });
    this.onMessage(this.messages[this.messages.length - 1]);
  }

  /** Conversation in the shape the ai/ modules expect. */
  getMessages() {
    return this.messages;
  }

  handleEvent(message) {
    switch (message.type) {
      case "session.ready":
        this.sessionStateId = message.session_id || null;
        break;

      case "session.updated":
        break;

      case "input.speech.started":
        this.lastEvent = message.type;
        this.setState(CONNECTION_STATES.LISTENING);
        break;

      case "input.speech.stopped":
        break;

      case "transcript.user.delta":
        this.onInterimUser(message.text || "");
        break;

      case "transcript.user": {
        this.onInterimUser("");
        const text = (message.text || "").trim();
        if (text) {
          this.pushMessage({ speaker: "user", text, final: true });
        }
        break;
      }

      case "reply.started":
        this.lastEvent = message.type;
        this.agentSpeaking = true;
        this.setState(CONNECTION_STATES.SPEAKING);
        break;

      case "reply.audio":
        this.playAgentAudio(message.data || "");
        break;

      case "transcript.agent": {
        const text = (message.text || "").trim();
        if (text) {
          this.pushMessage({
            speaker: "agent",
            text,
            final: true,
            interrupted: Boolean(message.interrupted),
          });
        }
        this.onInterimUser("");
        break;
      }

      case "reply.done": {
        this.lastEvent = message.type;
        this.agentSpeaking = false;
        this.activeSources.clear();
        if (this.audioContext) {
          this.nextPlaybackTime = this.audioContext.currentTime;
        }
        if (message.status === "interrupted") {
          // The agent moved on: discard stale audio and any queued tool results.
          this.flushPlayback();
          this.pendingTools = [];
        } else {
          this.flushToolResults();
        }
        if (this.ready && this.state === CONNECTION_STATES.SPEAKING) {
          this.setState(CONNECTION_STATES.CONNECTED);
        }
        break;
      }

      case "tool.call":
        this.handleToolCall(message);
        break;

      case "reply.create":
        break;

      case "session.ended":
        if (this.onSessionEndedHook) {
          const hook = this.onSessionEndedHook;
          this.onSessionEndedHook = null;
          hook();
        }
        break;

      case "session.error":
      case "error": {
        const detail = message.message || message.error || "Voice Agent error";
        const code = message.code ? ` (${message.code})` : "";
        this.setState(CONNECTION_STATES.ERROR);
        this.onError(new Error(`${detail}${code}`));
        break;
      }

      default:
        break;
    }
  }

  // -------------------------------------------------------------- tool calling

  /**
   * Run an agent tool call against our backend. The transcript is sent with every
   * call so evaluate_interview always reads the real conversation.
   */
  async handleToolCall(message) {
    const { call_id: callId, name } = message;
    let args = {};
    try {
      const raw = message.arguments;
      args = typeof raw === "string" ? JSON.parse(raw) : raw || {};
    } catch {
      args = {};
    }

    this.pendingTools.push(callId);
    this.onToolActivity({ name, status: "running" });

    let result;
    try {
      const response = await fetch(TOOL_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          tool: name,
          arguments: args,
          transcript: this.toBackendTranscript(),
          targetRole: this.targetRole,
          mode: this.mode,
          candidateProfile: this.candidateProfile,
          jobDescription: this.jobDescription,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        result = { error: data.error || `${name} failed on the server` };
      } else {
        result = data.result || { error: `${name} returned no result` };
      }
    } catch (error) {
      result = { error: `${name} failed: ${error.message}` };
    }

    this.toolResults.set(callId, result);
    this.onToolActivity({ name, status: "done" });
    this.flushToolResults();
  }

  /**
   * Send queued tool results. Must happen when `reply.done` is the latest event
   * received, otherwise the agent is mid-transition and will not accept them.
   */
  flushToolResults() {
    if (this.lastEvent !== "reply.done" || this.pendingTools.length === 0) return;

    for (const callId of this.pendingTools) {
      const result = this.toolResults.get(callId);
      if (result === undefined) continue;
      this.send({
        type: "tool.result",
        call_id: callId,
        result: JSON.stringify(result),
      });
    }

    this.pendingTools = [];
  }

  toBackendTranscript() {
    return this.messages
      .filter((message) => message.text && message.text.trim())
      .map((message) => ({
        role: message.speaker === "agent" ? "assistant" : "user",
        content: message.text,
      }));
  }

  // ------------------------------------------------------------------ cleanup

  async teardown() {
    this.ready = false;
    this.setMicMuted(true);
    this.flushPlayback();

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        /* ignore */
      }
      this.sourceNode = null;
    }

    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
        this.workletNode.disconnect();
      } catch {
        /* ignore */
      }
      this.workletNode = null;
    }

    if (this.sinkNode) {
      try {
        this.sinkNode.disconnect();
      } catch {
        /* ignore */
      }
      this.sinkNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch {
        /* ignore */
      }
      this.audioContext = null;
    }

    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    }

    this.pendingTools = [];
    this.toolResults.clear();
  }
}
