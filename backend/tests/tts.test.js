/**
 * Text-to-speech — the "speak it back" half of the voice loop.
 *
 * The contract the browser depends on: `null` means "no audio, use the browser
 * fallback", and anything spoken must be a real WAV. Nothing here may throw,
 * because a broken voice must never take down a conversation.
 */

import test, { after, before, describe } from "node:test";
import assert from "node:assert/strict";

import { startFakeProvider } from "./helpers/fakeProvider.js";

let provider;
let synthesizeSpeech;

before(async () => {
  provider = await startFakeProvider();
  process.env.LLM_BASE_URL = provider.url;
  process.env.LLM_API_KEY = "test-key";
  process.env.TTS_ENABLED = "true";
  ({ synthesizeSpeech } = await import("../services/tts.js"));
});

after(async () => {
  await provider?.close();
});

/** Every WAV chunk header starts here. */
function isWav(buffer) {
  return (
    buffer.length >= 44 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WAVE"
  );
}

describe("speech synthesis", () => {
  test("a normal sentence becomes a playable WAV", async () => {
    const speech = await synthesizeSpeech("Welcome to your frontend interview.");

    assert.ok(speech, "no audio was produced");
    assert.equal(speech.contentType, "audio/wav");

    const buffer = Buffer.from(speech.audioBase64, "base64");
    assert.ok(isWav(buffer), "the audio is not a WAV file");
  });

  test("empty responses produce no audio instead of an error", async () => {
    for (const empty of ["", "   ", "\n\t", null, undefined, 42, {}, []]) {
      assert.equal(await synthesizeSpeech(empty), null, `input ${JSON.stringify(empty)}`);
    }
  });

  test("text that is only markup or markers is never spoken", async () => {
    for (const noise of ["PROFILE_COMPLETE", "INTERVIEW_COMPLETE", "```", "{}", "**"]) {
      assert.equal(await synthesizeSpeech(noise), null, `"${noise}" should not be spoken`);
    }
  });

  test("control markers and JSON are stripped from what is spoken", async () => {
    provider.requests.length = 0;
    await synthesizeSpeech('Here is your score. INTERVIEW_COMPLETE {"overallScore": 8}');

    const spoken = provider.requests
      .filter((request) => (request.url || "").endsWith("/audio/speech"))
      .map((request) => request.body.input)
      .join(" ");

    assert.ok(spoken.length > 0, "nothing was spoken at all");
    assert.ok(!/INTERVIEW_COMPLETE|PROFILE_COMPLETE/.test(spoken), "a control marker was spoken");
    assert.ok(!spoken.includes("overallScore"), "raw JSON was spoken");
    assert.match(spoken, /your score/i);
  });

  test("a long answer is chunked and merged into one valid WAV", async () => {
    provider.requests.length = 0;

    const long = "Here is a detailed piece of career feedback for you. ".repeat(20);
    const speech = await synthesizeSpeech(long);

    const chunks = provider.requests.filter((request) =>
      (request.url || "").endsWith("/audio/speech")
    );
    assert.ok(chunks.length > 1, `long text should be split, got ${chunks.length} chunk(s)`);
    for (const chunk of chunks) {
      assert.ok(chunk.body.input.length <= 180, "a chunk exceeded the model input limit");
    }

    const buffer = Buffer.from(speech.audioBase64, "base64");
    assert.ok(isWav(buffer), "the merged audio is not a WAV file");
    // A merged file carries one sample per chunk.
    assert.equal(buffer.readUInt32LE(40), chunks.length);
  });

  test("a speech service failure degrades to null, not an exception", async () => {
    // A fresh module instance pointed at a port nothing is listening on.
    process.env.LLM_BASE_URL = "http://127.0.0.1:9/v1";
    const { synthesizeSpeech: offline } = await import("../services/tts.js?offline=1");

    try {
      assert.equal(await offline("This should not throw."), null);
    } finally {
      process.env.LLM_BASE_URL = provider.url;
    }
  });

  test("a provider that rejects speech requests degrades to null", async () => {
    provider.setMode("http-500", 500);
    assert.equal(await synthesizeSpeech("Rejected upstream."), null);
    provider.setMode("ok");
  });

  test("a speech connection reset degrades to null", async () => {
    provider.setMode("reset");
    assert.equal(await synthesizeSpeech("Connection dropped."), null);
    provider.setMode("ok");
  });
});
