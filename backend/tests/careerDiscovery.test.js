/**
 * Career discovery — the conversation that feeds everything downstream.
 *
 * The profile this flow produces is the input to the skill-gap engine, so the
 * tests check that a completed profile is well formed, that the completion
 * marker never leaks into what the user is shown, and that a malformed
 * profile payload cannot break the session.
 */

import test, { after, before, describe } from "node:test";
import assert from "node:assert/strict";

import { startTestServer } from "./helpers/testServer.js";

let server;
let provider;

const PROFILE = {
  name: "Irtiqa",
  interests: ["design", "accessibility"],
  skills: ["JavaScript", "CSS"],
  education: "BS Computer Science",
  experience: ["internship at a fintech"],
  careerGoal: "Frontend Developer",
  preferences: "remote, small team",
  strengths: ["persistence"],
  weaknesses: ["backend"],
};

before(async () => {
  server = await startTestServer();
  provider = server.provider;
});

after(async () => {
  await server?.close();
  await provider?.close();
});

describe("career discovery", () => {
  test("the conversation opens with a warm message", async () => {
    const { status, data } = await server.post("/api/career/start", { sessionId: "discovery" });

    assert.equal(status, 200);
    assert.equal(data.status, "discovery_started");
    assert.ok(data.message.trim().length > 0, "the agent must speak first");
  });

  test("each turn asks exactly one question and keeps going", async () => {
    const sessionId = "discovery-turns";
    await server.post("/api/career/start", { sessionId });

    for (let turn = 1; turn <= 3; turn += 1) {
      const { status, data } = await server.post("/api/career/chat", {
        sessionId,
        message: `I am telling you about my turn ${turn}.`,
      });

      assert.equal(status, 200);
      assert.equal(data.turnCount, turn, "the turn counter is wrong");
      assert.equal(data.profileComplete, false, "the profile completed too early");
      assert.ok(data.message.trim().length > 0);
      assert.ok(!data.message.includes("PROFILE_COMPLETE"), "the marker leaked to the user");
    }
  });

  test("a completed profile is stored and retrievable", async () => {
    const sessionId = "discovery-complete";
    await server.post("/api/career/start", { sessionId });

    provider.setResponder((body, kind) =>
      kind === "discovery"
        ? `Thanks, that is a clear picture.\n\nPROFILE_COMPLETE\n${JSON.stringify(PROFILE)}`
        : null
    );

    const { status, data } = await server.post("/api/career/chat", {
      sessionId,
      message: "I want to move into frontend development.",
    });

    assert.equal(status, 200);
    assert.equal(data.profileComplete, true);
    assert.ok(!data.message.includes("PROFILE_COMPLETE"), "the marker leaked to the user");
    assert.ok(!data.message.includes('"name"'), "raw profile JSON was shown to the user");
    assert.deepEqual(data.profile, PROFILE);

    provider.setResponder(null);

    const stored = await server.get(`/api/career/profile/${sessionId}`);
    assert.equal(stored.status, 200);
    assert.deepEqual(stored.data.profile, PROFILE);
    assert.ok(stored.data.history.length >= 3, "the conversation was not kept");
  });

  test("the profile feeds the skill-gap engine", async () => {
    const stored = await server.get("/api/career/profile/discovery-complete");
    const profile = stored.data.profile;

    const { status, data } = await server.post("/api/evaluate/dashboard", {
      targetRole: profile.careerGoal,
      skills: profile.skills,
      candidateProfile: profile,
    });

    assert.equal(status, 200);
    assert.equal(data.skillGaps.targetRoleKey, "frontend");
    assert.ok(data.skillGaps.matchedSkills.includes("JavaScript"), "a stated skill was lost");
    assert.ok(data.analytics.available);
  });

  test("a completion marker with unparseable JSON does not corrupt the session", async () => {
    const sessionId = "discovery-broken";
    await server.post("/api/career/start", { sessionId });

    provider.setResponder(() => "PROFILE_COMPLETE { this is not json at all");
    const broken = await server.post("/api/career/chat", { sessionId, message: "Here is my story." });
    assert.equal(broken.status, 200, "a bad profile payload must not become a 500");
    assert.equal(broken.data.profile, null);

    provider.setResponder(null);

    const recovered = await server.post("/api/career/chat", { sessionId, message: "Let me try again." });
    assert.equal(recovered.status, 200);
    assert.equal(recovered.data.turnCount, 2, "the session did not survive");

    const stored = await server.get(`/api/career/profile/${sessionId}`);
    assert.equal(stored.data.profile, null, "a bad profile must not be stored");
  });

  test("clearing a discovery session removes the profile", async () => {
    const sessionId = "discovery-clear";
    await server.post("/api/career/start", { sessionId });
    await server.del(`/api/career/session/${sessionId}`);

    const gone = await server.get(`/api/career/profile/${sessionId}`);
    assert.equal(gone.status, 404);
  });

  test("career chat rejects an empty message", async () => {
    for (const body of [{}, { sessionId: "x" }, { message: "hi" }, { sessionId: "x", message: "  " }]) {
      const { status, data } = await server.post("/api/career/chat", body);
      assert.equal(status, 400, `body ${JSON.stringify(body)} should be 400`);
      assert.ok(data.error);
    }
  });
});
