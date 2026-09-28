/**
 * Test harness — boot the real Express app against the fake AI provider.
 *
 * Everything is set BEFORE the app is imported, because the AI and TTS
 * services read their configuration at module load:
 *   - TTS_ENABLED=false  -> voice tests assert on the text contract, not audio
 *   - LLM_BASE_URL       -> the fake provider, so no key and no network
 *   - LLM_API_KEY        -> placeholder
 *
 * A dead LLM port is exported too, so "network failure" can be tested by
 * pointing the app at a port nothing is listening on.
 */

import { startFakeProvider } from "./fakeProvider.js";

/** A port that is closed: connecting here fails instead of hanging. */
export const DEAD_LLM_URL = "http://127.0.0.1:9/v1";

/**
 * Boot the API with the fake provider wired in.
 * @param {object} [options] passed to the fake provider, plus `tts`
 *   (default false) to keep the text contract the focus; set true to also
 *   exercise the spoken-audio path.
 * @returns {Promise<{baseUrl, provider, close, request, get, post, del}>}
 */
export async function startTestServer(options = {}) {
  const { tts = false, ...providerOptions } = options;
  const provider = await startFakeProvider(providerOptions);

  process.env.TTS_ENABLED = tts ? "true" : "false";
  process.env.ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || "";
  process.env.LLM_API_KEY = "test-key";
  process.env.LLM_BASE_URL = provider.url;
  process.env.LLM_MODEL = "test-model";
  process.env.NODE_ENV = "test";

  // Imported after the env is set so the services pick it up.
  const { app } = await import("../../server.js");

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  const baseUrl = `http://127.0.0.1:${port}`;

  /** Thin JSON fetch wrapper that never throws on a non-2xx. */
  const request = async (method, path, body) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    return { status: response.status, data, text, ok: response.ok };
  };

  return {
    baseUrl,
    provider,
    request,
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    del: (path) => request("DELETE", path),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
