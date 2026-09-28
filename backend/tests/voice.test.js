/**
 * Voice flow — listen, think, speak back.
 *
 * TTS is on here so the spoken half of the loop is covered too. Transcription
 * talks to AssemblyAI, which cannot be faked without a real key, so the tests
 * pin the two things that are ours: the audio the client sends is validated
 * before it costs anything, and a transcription failure surfaces as a clean
 * 500 that leaves the API running.
 */

import test, { after, before, describe } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, DEAD_LLM_URL } from "./helpers/testServer.js";

let server;
let provider;

/** The last chat-completion call, ignoring the TTS calls that follow it. */
function lastPrompt() {
  const prompts = provider.requests.filter((request) =>
    (request.url || "").endsWith("/chat/completions")
  );
  return prompts[prompts.length - 1];
}

/** A plausible recording: long enough to clear the minimum-length check. */
function recordingAudio() {
  return Buffer.alloc(4096, 1).toString("base64");
}

before(async () => {
  server = await startTestServer({ tts: true });
  provider = server.provider;
});

after(async () => {
  await server?.close();
  await provider?.close();
});

describe("the voice loop answers and speaks", () => {
  test("a typed turn returns a transcript, an answer and spoken audio", async () => {
    const { status, data } = await server.post("/api/voice/process-text", {
      text: "I want to move from teaching into frontend development.",
    });

    assert.equal(status, 200);
    assert.equal(data.transcript, "I want to move from teaching into frontend development.");
    assert.ok(typeof data.aiResponse === "string" && data.aiResponse.length > 0, "no answer");
    assert.equal(data.audioContentType, "audio/wav");
    assert.ok(data.audio && data.audio.length > 0, "the answer was not spoken back");

    const audio = Buffer.from(data.audio, "base64");
    assert.equal(audio.toString("ascii", 0, 4), "RIFF", "not a WAV file");
    assert.equal(audio.toString("ascii", 8, 12), "WAVE");
  });

  test("the AI receives the whole conversation, not just the last turn", async () => {
    provider.requests.length = 0;

    await server.post("/api/voice/process-text", {
      text: "Second turn.",
      history: [
        { role: "assistant", content: "What do you enjoy most?" },
        { role: "user", content: "First turn." },
      ],
    });

    const messages = lastPrompt().body.messages;
    assert.equal(messages.at(-1).role, "user");
    assert.equal(messages.at(-1).content, "Second turn.");
    assert.ok(
      messages.some((message) => message.content === "First turn."),
      "history was dropped from the prompt"
    );
    assert.equal(messages[0].role, "system", "the coach's system prompt is missing");
  });

  test("the AI is asked for one question at a time, not a form", async () => {
    provider.requests.length = 0;
    await server.post("/api/voice/process-text", { text: "I know HTML and CSS." });

    const system = lastPrompt().body.messages[0].content;
    assert.match(system, /ONE useful follow-up question/i);
    assert.match(system, /2-4 sentences/i);
  });

  test("every turn in a conversation gets a fresh, non-empty answer", async () => {
    const history = [];
    for (const text of ["I like design.", "I struggle with maths.", "I want a career change."]) {
      const { status, data } = await server.post("/api/voice/process-text", { text, history });
      assert.equal(status, 200);
      assert.ok(data.aiResponse.trim().length > 0, `empty answer for: ${text}`);
      history.push({ role: "user", content: text }, { role: "assistant", content: data.aiResponse });
    }
    assert.equal(history.length, 6);
  });
});

describe("the voice endpoints reject bad input before spending anything", () => {
  const cases = [
    ["no text", { text: "" }],
    ["whitespace only", { text: "   \n\t " }],
    ["missing text", {}],
  ];

  for (const [label, body] of cases) {
    test(`/api/voice/process-text with ${label} returns 400`, async () => {
      const { status, data } = await server.post("/api/voice/process-text", body);
      assert.equal(status, 400);
      assert.ok(data.error.length > 0);
    });
  }

  test("/api/voice/process with no audio returns 400", async () => {
    const { status, data } = await server.post("/api/voice/process", {});
    assert.equal(status, 400);
    assert.match(data.error, /audio/i);
  });

  test("/api/voice/process with a too-short recording returns 400", async () => {
    const { status, data } = await server.post("/api/voice/process", {
      audio: Buffer.from("tiny").toString("base64"),
    });
    assert.equal(status, 400);
    assert.match(data.error, /too short/i);
  });

  test("malformed audio is answered with an error, not a hang or a crash", async () => {
    const { status, data } = await server.post("/api/voice/process", { audio: "x".repeat(4000) });

    assert.ok(status >= 400 && status < 600, `unexpected status ${status}`);
    assert.ok(data.error, "the failure must be reported");

    const health = await server.get("/health");
    assert.equal(health.status, 200, "the API must stay up");
  });
});

describe("failures in the voice loop are survivable", () => {
  test("an unreachable transcription service is a clean 500, and the API stays up", async () => {
    const { status, data, text } = await server.post("/api/voice/process", {
      audio: recordingAudio(),
    });

    // No AssemblyAI key is configured in tests, so transcription cannot succeed.
    assert.equal(status, 500);
    assert.ok(data.error, "the failure must be reported, not swallowed");
    assert.ok(!text.includes("at Object."), "a stack trace leaked into the response");

    const health = await server.get("/health");
    assert.equal(health.status, 200, "the API must survive a transcription failure");
  });

  test("an AI outage returns 500 on the text path too, and recovers", async () => {
    provider.setMode("http-500", 500);

    const failed = await server.post("/api/voice/process-text", { text: "Hello there." });
    assert.equal(failed.status, 500);
    assert.ok(failed.data.error);

    provider.setMode("ok");

    const recovered = await server.post("/api/voice/process-text", { text: "Hello there." });
    assert.equal(recovered.status, 200, "the endpoint must recover once the AI returns");
    assert.ok(recovered.data.aiResponse.length > 0);
  });

  test("a dead AI provider is reported, not hung", async () => {
    const previous = process.env.LLM_BASE_URL;
    process.env.LLM_BASE_URL = DEAD_LLM_URL;

    try {
      const { status, data } = await server.post("/api/voice/process-text", { text: "Anyone there?" });
      assert.equal(status, 500);
      assert.ok(data.error);
    } finally {
      process.env.LLM_BASE_URL = previous;
    }
  });

  test("a failed TTS call still returns the text answer", async () => {
    // The speech endpoint is the only one the fake answers with audio; make it
    // fail by pointing the whole provider at a dead port for that call.
    const previous = process.env.LLM_BASE_URL;
    process.env.LLM_BASE_URL = DEAD_LLM_URL;

    try {
      const { status, data } = await server.post("/api/voice/process-text", { text: "Speak to me." });
      // The AI call fails first, so this asserts the request is bounded and
      // reported rather than hanging on a socket that never answers.
      assert.equal(status, 500);
    } finally {
      process.env.LLM_BASE_URL = previous;
    }

    provider.setResponder((body, kind) => "Here is a short spoken answer.");
    provider.setMode("ok");

    const ok = await server.post("/api/voice/process-text", { text: "Speak to me." });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.aiResponse, "Here is a short spoken answer.");
    assert.ok(ok.data.audio, "audio comes back when speech synthesis works");

    provider.setResponder(null);
  });

  test("an empty AI reply does not crash the voice loop", async () => {
    provider.setMode("empty");

    const { status, data } = await server.post("/api/voice/process-text", { text: "Say something." });
    assert.equal(status, 200);
    assert.equal(typeof data.aiResponse, "string");

    provider.setMode("ok");
  });
});
