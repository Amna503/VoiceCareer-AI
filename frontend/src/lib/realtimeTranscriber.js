import { apiUrl } from "./api.js";

const WS_URL = "wss://streaming.assemblyai.com/v3/ws";
const TARGET_SAMPLE_RATE = 16000;

/**
 * How long a stable partial transcript must hold (user stopped talking and the
 * server's end_of_turn never fired) before it is submitted as a finished turn.
 * AssemblyAI finalizes a turn only after detecting ~0.8s of silence; in noisy
 * environments the server can keep waiting forever, so we finalize ourselves.
 */
const PAUSE_SUBMIT_MS = 2000;

/**
 * Live (real-time) speech-to-text via AssemblyAI Universal-Streaming.
 * Captures the microphone as 16 kHz mono PCM16 in the browser and streams
 * it to the WebSocket. Turn messages arrive as the user speaks.
 */
export default class RealtimeTranscriber {
  constructor({ onPartial, onFinal, onSessionStart, onError, onDisconnect }) {
    this.onPartial = onPartial;
    this.onFinal = onFinal;
    this.onSessionStart = onSessionStart;
    this.onError = onError;
    this.onDisconnect = onDisconnect;

    this.ws = null;
    this.audioCtx = null;
    this.micStream = null;
    this.sourceNode = null;
    this.processorNode = null;
    this.resampleRatio = 1;
    this.resampleCarry = 0;
    this.sending = true;

    this.acc = "";
    this.lastFinal = "";
    this.pauseTimer = null;
  }

  setSending(enabled) {
    this.sending = enabled;
    if (!enabled) this.clearPauseTimer();
  }

  get isConnected() {
    return Boolean(this.ws) && this.ws.readyState === WebSocket.OPEN;
  }

  async connect() {
    const resp = await fetch(apiUrl("/api/voice/token"));
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || "Could not get a live streaming token");
    }
    const { token } = await resp.json();

    const url = new URL(WS_URL);
    url.searchParams.set("token", token);
    url.searchParams.set("sample_rate", String(TARGET_SAMPLE_RATE));
    url.searchParams.set("speech_model", "universal-3-5-pro");
    url.searchParams.set("encoding", "pcm_s16le");

    await new Promise((resolve, reject) => {
      const ws = new WebSocket(url.toString());
      this.ws = ws;

      ws.onopen = () => resolve();
      ws.onerror = () => {
        if (this.ws === ws && ws.readyState !== WebSocket.OPEN) {
          reject(new Error("Could not connect to the live transcription service"));
        }
      };
      ws.onmessage = (ev) => this.handleMessage(ev);
    });

    // Session-level failure handling. If the stream ever dies mid-conversation,
    // surface it so the UI can stop gracefully instead of going silent.
    this.ws.onerror = () => {
      if (this.onDisconnect) this.onDisconnect("Connection error");
    };
    this.ws.onclose = () => {
      if (this.onDisconnect) this.onDisconnect("Connection closed");
    };
  }

  handleMessage(event) {
    if (typeof event.data !== "string") return;

    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    if (msg.type === "Begin") {
      if (this.onSessionStart) this.onSessionStart(msg.id);
      return;
    }

    if (msg.type === "error") {
      const errMsg = msg.message || msg.error || "Live transcription error";
      if (this.onError) this.onError(new Error(errMsg));
      return;
    }

    if (msg.type === "Turn") {
      const transcript = (msg.transcript || "").trim();

      if (msg.end_of_turn) {
        this.clearPauseTimer();
        if (transcript && transcript !== this.lastFinal) {
          this.lastFinal = transcript;
          this.acc = "";
          if (this.onFinal) this.onFinal(transcript);
        }
        return;
      }

      // Partial transcript while the user is still speaking.
      if (this.acc !== transcript) {
        this.acc = transcript;
        if (this.onPartial) this.onPartial(transcript);
      }
      this.schedulePauseSubmit();
      return;
    }

    if (msg.type === "Termination") {
      if (this.onDisconnect) this.onDisconnect("Session ended");
    }
  }

  schedulePauseSubmit() {
    this.clearPauseTimer();
    this.pauseTimer = setTimeout(() => {
      this.pauseTimer = null;
      const text = this.acc.trim();
      if (text && text !== this.lastFinal) {
        this.lastFinal = text;
        this.acc = "";
        if (this.onFinal) this.onFinal(text);
      }
    }, PAUSE_SUBMIT_MS);
  }

  clearPauseTimer() {
    if (this.pauseTimer) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
  }

  async startMic() {
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await this.audioCtx.resume();

    const source = this.audioCtx.createMediaStreamSource(this.micStream);
    const processor = this.audioCtx.createScriptProcessor(4096, 1, 1);

    this.resampleRatio = this.audioCtx.sampleRate / TARGET_SAMPLE_RATE;
    this.resampleCarry = 0;
    this.acc = "";
    this.lastFinal = "";
    this.clearPauseTimer();

    processor.onaudioprocess = (e) => {
      this.onAudioProcess(e.inputBuffer.getChannelData(0));
    };

    source.connect(processor);
    processor.connect(this.audioCtx.destination);

    this.sourceNode = source;
    this.processorNode = processor;
  }

  onAudioProcess(input) {
    const ratio = this.resampleRatio;
    let carry = this.resampleCarry;

    // Nearest-neighbour downsampling to the target sample rate.
    const output = new Float32Array(Math.floor(input.length / ratio) + 1);
    let oi = 0;
    let si = Math.round(carry);
    while (si < input.length) {
      output[oi++] = input[si];
      carry += ratio;
      si = Math.round(carry);
    }
    this.resampleCarry = carry - input.length;

    if (!this.sending || !this.isConnected || oi === 0) return;

    const pcm = new Int16Array(oi);
    for (let i = 0; i < oi; i++) {
      const s = Math.max(-1, Math.min(1, output[i]));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.ws.send(pcm.buffer);
  }

  async stopMic() {
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
    }
    if (this.processorNode) {
      try {
        this.processorNode.disconnect();
      } catch {}
    }
    if (this.audioCtx) {
      try {
        await this.audioCtx.close();
      } catch {}
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
    }
    this.clearPauseTimer();
    this.sourceNode = null;
    this.processorNode = null;
    this.audioCtx = null;
    this.micStream = null;
  }

  async disconnect() {
    const ws = this.ws;
    this.ws = null;
    this.clearPauseTimer();

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "Terminate" }));
      } catch {}
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 2000);
        ws.onclose = () => {
          clearTimeout(timer);
          resolve();
        };
        try {
          ws.close();
        } catch {
          clearTimeout(timer);
          resolve();
        }
      });
    }
    await this.stopMic();
  }
}