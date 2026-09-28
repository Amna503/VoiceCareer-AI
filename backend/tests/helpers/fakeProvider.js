/**
 * Test harness — fake OpenAI-compatible LLM + TTS server.
 *
 * The app talks to `LLM_BASE_URL` with a plain `fetch`, so the whole AI +
 * API surface can be exercised end to end without an API key, a network call,
 * or a mock library. The fake server speaks the same wire format as Groq /
 * OpenAI and is scriptable per test:
 *
 *   mode: "ok"        -> a valid, schema-correct response for the prompt kind
 *   mode: "empty"     -> 200 with an empty message content  (empty response)
 *   mode: "garbage"   -> 200 with unparseable prose        (bad AI response)
 *   mode: "http-500"  -> upstream failure                  (AI service error)
 *   mode: "hang"      -> never answers, so the socket times out
 *   mode: "reset"     -> destroys the socket (network failure mid-request)
 *
 * `setResponder` swaps the whole behaviour mid-test, so a single server can
 * answer normally and then start failing.
 */

import http from "node:http";

/** Build a valid interview evaluation payload for the CoachAgent prompt. */
export function evaluationJson(overrides = {}) {
  return JSON.stringify({
    overallScore: 7,
    evaluation: {
      answerRelevance: { score: 7, feedback: "Answered the question asked, though a little slowly." },
      technicalKnowledge: { score: 8, feedback: "Explained state management correctly with a React example." },
      problemSolving: { score: 7, feedback: "Broke the problem into steps and justified the trade-off." },
      answerStructure: { score: 6, feedback: "Set up the problem, then reasoned through it, but never landed a conclusion." },
      communicationClarity: { score: 6, feedback: "Ideas were clear but the answer rambled before the point." },
      followUpHandling: { score: 7, feedback: "Answered the follow-up with a concrete example." },
      confidence: { score: 6, feedback: "Hedged on the deeper question." },
    },
    strengths: ["Named a concrete project instead of describing theory"],
    improvements: ["Answer with the conclusion first, then the reasoning"],
    detailedFeedback: "A solid interview overall with clear room to tighten structure.",
    ...overrides,
  });
}

/** Build a valid skill-gap enrichment payload. */
export function skillGapJson() {
  return JSON.stringify({
    gaps: [
      { skill: "React", currentLevel: "beginner", suggestedImprovement: "Rebuild a two-page app with hooks" },
      { skill: "TypeScript", currentLevel: "beginner", suggestedImprovement: "Type one existing project end to end" },
    ],
    summary: "Two open gaps, both closable inside the first month.",
  });
}

/** Build a valid roadmap enrichment payload that sticks to the allowed skills. */
export function roadmapJson() {
  return JSON.stringify({
    weeks: [1, 2, 3, 4].map((week) => ({
      week,
      focus: `Week ${week} focus`,
      gapTargets: ["React"],
      goals: ["Ship something small"],
      tasks: [{ type: "practice", title: `Task ${week}`, description: "Describe it", duration: "2 hours" }],
      project: { title: "Project", description: "Build it" },
      outcome: "Something demonstrable",
    })),
  });
}

/**
 * Read the system prompt out of a request so the fake can answer with the
 * right shape for the agent that asked.
 */
function promptKind(body) {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const system = String(messages.find((m) => m?.role === "system")?.content || "");
  if (/CAREER COACH AGENT|EVALUATION CRITERIA/i.test(system)) return "evaluation";
  if (/SKILL GAP ANALYST/i.test(system)) return "skill-gap";
  if (/CAREER ROADMAP GENERATOR/i.test(system)) return "roadmap";
  if (/CAREER DISCOVERY/i.test(system)) return "discovery";
  if (/ADAPTIVE INTERVIEW AGENT/i.test(system)) return "interview";
  return "generic";
}

function defaultContent(kind) {
  switch (kind) {
    case "evaluation":
      return evaluationJson();
    case "skill-gap":
      return skillGapJson();
    case "roadmap":
      return roadmapJson();
    case "discovery":
      return "What do you enjoy most, and why?";
    case "interview":
      return "Thanks for that. Can you walk me through how you debugged it?";
    default:
      return "Here is a helpful response.";
  }
}

function chatResponse(content) {
  return {
    id: "chatcmpl-test",
    object: "chat.completion",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
  };
}

/**
 * Start the fake provider.
 *
 * @param {object} [options]
 * @param {string} [options.mode="ok"] initial behaviour
 * @param {number} [options.llmStatus=200] status for "http-500"
 * @param {number} [options.delayMs=0] artificial latency, to force timeouts
 * @returns {Promise<{url:string, port:number, setMode:Function, setResponder:Function,
 *                    requests:Array, close:Function, failNext:Function}>}
 */
export async function startFakeProvider(options = {}) {
  const state = {
    mode: options.mode || "ok",
    status: options.llmStatus || 500,
    delayMs: options.delayMs || 0,
    responder: null,
    requests: [],
  };

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      let body = null;
      try {
        body = raw ? JSON.parse(raw) : null;
      } catch {
        body = null;
      }
      state.requests.push({ url: req.url, method: req.method, body });

      // Mid-request network failure: kill the socket without a response.
      if (state.mode === "reset") {
        req.socket.destroy();
        return;
      }
      if (state.mode === "hang") {
        return; // never responds
      }
      if (state.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, state.delayMs));
      }

      const path = (req.url || "").split("?")[0];

      // Any failure mode fails speech synthesis too, so the voice loop's
      // fallback path is exercised by the same switch as the chat path.
      if (state.mode === "http-500") {
        res.writeHead(state.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: "upstream failure" } }));
        return;
      }

      if (state.mode === "empty") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(chatResponse("")));
        return;
      }

      // TTS endpoint — return a real (if tiny) WAV so the voice flow and the
      // chunk-merging path both see genuine audio bytes.
      if (path.endsWith("/audio/speech")) {
        res.writeHead(200, { "Content-Type": "audio/wav" });
        res.end(Buffer.from(sampleWavBase64(), "base64"));
        return;
      }

      if (state.mode === "garbage") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify(
            chatResponse("I'm sorry, I can't help with that. Please try rephrasing your question.")
          )
        );
        return;
      }

      const content = state.responder
        ? await state.responder(body, promptKind(body))
        : defaultContent(promptKind(body));

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(chatResponse(content)));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}/v1`,
    port,
    requests: state.requests,
    setMode(mode) {
      state.mode = mode;
      return this;
    },
    setResponder(fn) {
      state.responder = fn;
      return this;
    },
    failNext(mode = "http-500", status) {
      state.mode = mode;
      if (status) state.status = status;
      return this;
    },
    close() {
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

/** Minimal valid 8-bit mono WAV, for tests that assert on audio shape. */
export function sampleWavBase64() {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + 1, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36);
  header.writeUInt32LE(1, 40);
  return Buffer.concat([header, Buffer.from([0])]).toString("base64");
}

/** A short, believable interview transcript. */
export function sampleTranscript() {
  return [
    { role: "assistant", content: "Tell me about your frontend experience." },
    { role: "user", content: "I built a React dashboard with hooks and fetched data from a REST API." },
    { role: "assistant", content: "How did you handle loading states?" },
    { role: "user", content: "I used a loading flag per component and disabled the button while fetching." },
    { role: "assistant", content: "INTERVIEW_COMPLETE" },
  ];
}
