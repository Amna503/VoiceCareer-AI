/**
 * API integration — the real Express app, over real HTTP, against a fake AI
 * provider. No API key, no network, no mocks of our own code.
 *
 * Covers the contract the frontend depends on:
 *   - every route responds, and responds with the documented shape
 *   - invalid input is rejected with 400 and a readable message
 *   - an AI outage (upstream 500, dead socket, empty or unparseable reply)
 *     never takes the API down and never returns a half-built payload
 *   - a completed interview always produces a full analysis
 */

import test, { after, before, describe } from "node:test";
import assert from "node:assert/strict";

import { startTestServer, DEAD_LLM_URL } from "./helpers/testServer.js";
import { evaluationJson, sampleTranscript } from "./helpers/fakeProvider.js";

let server;
let provider;

before(async () => {
  server = await startTestServer();
  provider = server.provider;
});

after(async () => {
  await server?.close();
  await provider?.close();
});

const CANDIDATE = {
  name: "Amna",
  skills: ["JavaScript", "HTML", "CSS", "Git"],
  experience: "2 years",
  careerGoal: "Frontend Developer",
};

/* ------------------------------------------------------------------ *
 * Health and discovery
 * ------------------------------------------------------------------ */

describe("service endpoints", () => {
  test("the health check reports ok", async () => {
    const { status, data } = await server.get("/health");
    assert.equal(status, 200);
    // Railway polls this path, so it must stay cheap and must not report
    // anything about key validity or other configuration state.
    assert.equal(data.status, "ok");
    assert.equal(data.service, "voicecareer-ai-api");
    assert.equal(typeof data.uptimeSeconds, "number");
    assert.equal(
      JSON.stringify(data).includes("KEY"),
      false,
      "the health payload must not mention credentials",
    );
  });

  test("the API index documents every route the frontend calls", async () => {
    const { status, data } = await server.get("/api");
    assert.equal(status, 200);
    assert.equal(data.name, "VoiceCareer AI API");

    for (const group of ["voice", "career", "interview", "evaluate", "voiceAgent"]) {
      assert.ok(data.endpoints[group], `missing endpoint group: ${group}`);
    }
    assert.ok(data.endpoints.evaluate["POST /api/evaluate/analytics"]);
    assert.ok(data.endpoints.evaluate["GET /api/evaluate/analytics/:sessionId"]);
  });

  test("the role catalogue is served, not hardcoded in the UI", async () => {
    const { status, data } = await server.get("/api/evaluate/roles");
    assert.equal(status, 200);
    assert.ok(Array.isArray(data.roles) && data.roles.length >= 4);

    for (const role of data.roles) {
      assert.ok(role.key && role.title);
      assert.ok(role.skillCount > 0, `${role.key} has no skills`);
    }
    assert.ok(data.roles.some((role) => role.key === "frontend"));
  });
});

/* ------------------------------------------------------------------ *
 * Invalid input
 * ------------------------------------------------------------------ */

describe("invalid input is rejected, not guessed at", () => {
  const cases = [
    ["POST", "/api/evaluate/interview", {}, "interview history"],
    ["POST", "/api/evaluate/interview", { interviewHistory: "not an array" }, "interview history"],
    ["POST", "/api/evaluate/complete", {}, "interview history"],
    ["POST", "/api/evaluate/skill-gaps", { skills: ["React"] }, "target role"],
    ["POST", "/api/evaluate/roadmap", { skills: ["React"] }, "target role"],
    ["POST", "/api/evaluate/dashboard", { skills: ["React"] }, "target role"],
    ["POST", "/api/interview/start", {}, "session"],
    ["POST", "/api/interview/respond", { sessionId: "s1" }, "answer"],
    ["POST", "/api/interview/respond", { sessionId: "s1", answer: "   " }, "blank answer"],
    ["POST", "/api/interview/voice", { sessionId: "s1" }, "audio"],
    ["POST", "/api/voice/process", {}, "audio"],
    ["POST", "/api/voice/process-text", { text: "   " }, "blank text"],
    ["POST", "/api/career/start", {}, "session"],
    ["POST", "/api/career/chat", { sessionId: "s1" }, "message"],
    ["POST", "/api/career/chat", { sessionId: "s1", message: "  " }, "blank message"],
  ];

  for (const [method, path, body, expectation] of cases) {
    test(`${method} ${path} without ${expectation} returns 400`, async () => {
      const { status, data } = await server.request(method, path, body);
      assert.equal(status, 400, `expected 400 from ${path}, got ${status}`);
      assert.ok(typeof data.error === "string" && data.error.length > 0, "no error message");
    });
  }

  test("an empty interview history is still evaluated rather than crashing", async () => {
    const { status, data } = await server.post("/api/evaluate/interview", {
      interviewHistory: [],
      candidateProfile: CANDIDATE,
      targetRole: "Frontend Developer",
    });

    assert.equal(status, 200);
    assert.ok(data.evaluation, "an empty interview must still yield a report");
    assert.equal(typeof data.evaluation.summary.overallScore, "number");
  });

  test("an unknown session id is a 404, not a crash", async () => {
    for (const path of ["/api/evaluate/does-not-exist", "/api/evaluate/analytics/nope", "/api/interview/history/nope"]) {
      const { status, data } = await server.get(path);
      assert.equal(status, 404, `${path} should be 404`);
      assert.ok(data.error);
    }
  });

  test("malformed JSON is rejected by the body parser", async () => {
    const response = await fetch(`${server.baseUrl}/api/evaluate/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ this is not json",
    });
    assert.ok(response.status >= 400 && response.status < 500);
  });
});

/* ------------------------------------------------------------------ *
 * AI responses and network failure
 * ------------------------------------------------------------------ */

describe("AI failures degrade gracefully", () => {
  test("an upstream 500 becomes a 500 with a message, not a stack trace", async () => {
    provider.setMode("http-500", 503);

    const { status, data, text } = await server.post("/api/evaluate/interview", {
      interviewHistory: sampleTranscript(),
      candidateProfile: CANDIDATE,
    });

    assert.equal(status, 500);
    assert.ok(data.error);
    assert.ok(!text.includes("at Object."), "a stack trace leaked into the response");
    assert.ok(!text.includes("/backend/"), "a file path leaked into the response");

    provider.setMode("ok");
  });

  test("a dead AI provider is reported, not swallowed", async () => {
    const previous = process.env.LLM_BASE_URL;
    process.env.LLM_BASE_URL = DEAD_LLM_URL;

    try {
      const { status, data } = await server.post("/api/evaluate/interview", {
        interviewHistory: sampleTranscript(),
        candidateProfile: CANDIDATE,
      });
      assert.equal(status, 500);
      assert.ok(data.error);
    } finally {
      process.env.LLM_BASE_URL = previous;
    }
  });

  test("a connection reset mid-request is reported", async () => {
    provider.setMode("reset");

    const { status, data } = await server.post("/api/interview/respond", {
      sessionId: "reset-session",
      answer: "I built a React app with hooks and a REST API.",
    });

    assert.equal(status, 500);
    assert.ok(data.error);

    provider.setMode("ok");
  });

  test("an empty AI response still yields a complete, scoreable evaluation", async () => {
    provider.setMode("empty");

    const { status, data } = await server.post("/api/evaluate/interview", {
      interviewHistory: sampleTranscript(),
      candidateProfile: CANDIDATE,
    });

    assert.equal(status, 200, "an empty model reply must not become a 500");
    const report = data.evaluation;
    assert.ok(report, "a report is still returned");
    assert.equal(Object.keys(report.breakdown).length, 7, "all seven criteria must be present");
    for (const entry of Object.values(report.breakdown)) {
      assert.ok(entry.score >= 0 && entry.score <= 10);
    }
    assert.ok(report.summary.overallScore >= 0 && report.summary.overallScore <= 10);

    provider.setMode("ok");
  });

  test("an unparseable AI response falls back without leaking the bad text", async () => {
    provider.setMode("garbage");

    const { status, data, text } = await server.post("/api/evaluate/interview", {
      interviewHistory: sampleTranscript(),
      candidateProfile: CANDIDATE,
    });

    assert.equal(status, 200);
    assert.equal(Object.keys(data.evaluation.breakdown).length, 7);
    assert.ok(!text.includes("I can't help with that"), "the raw refusal was passed through");
    assert.match(data.evaluation.detailedFeedback, /Unable to generate/);

    provider.setMode("ok");
  });

  test("skill gaps and the roadmap survive an AI outage with the engine's own plan", async () => {
    provider.setMode("http-500", 500);

    const gaps = await server.post("/api/evaluate/skill-gaps", {
      targetRole: "Frontend Developer",
      skills: CANDIDATE.skills,
    });
    assert.equal(gaps.status, 200, "the deterministic engine must not need the LLM");
    assert.ok(gaps.data.skillGaps.gaps.length > 0);
    assert.equal(gaps.data.skillGaps.source, "career-engine");

    const roadmap = await server.post("/api/evaluate/roadmap", {
      targetRole: "Frontend Developer",
      skills: CANDIDATE.skills,
    });
    assert.equal(roadmap.status, 200);
    assert.equal(roadmap.data.roadmap.weeks.length, 4);
    assert.equal(roadmap.data.roadmap.source, "career-engine");

    provider.setMode("ok");
  });
});

/* ------------------------------------------------------------------ *
 * Interview flow and completion
 * ------------------------------------------------------------------ */

describe("the interview runs to completion and produces a full analysis", () => {
  test("start -> answer -> complete -> analyse, end to end", async () => {
    const sessionId = "flow-session";

    const started = await server.post("/api/interview/start", {
      sessionId,
      targetRole: "Frontend Developer",
      candidateProfile: CANDIDATE,
    });
    assert.equal(started.status, 200);
    assert.equal(started.data.status, "interview_started");
    assert.ok(started.data.message.length > 0, "the interviewer must speak first");

    // One adaptive follow-up.
    const answered = await server.post("/api/interview/respond", {
      sessionId,
      answer: "I built a React dashboard using hooks, fetch and a Node REST API.",
    });
    assert.equal(answered.status, 200);
    assert.ok(answered.data.message.length > 0);
    assert.equal(answered.data.totalQuestions, 10);
    assert.ok(answered.data.coveredTopics.includes("react"), "topics were not tracked");
    assert.ok(answered.data.coveredTopics.includes("api"));

    const history = await server.get(`/api/interview/history/${sessionId}`);
    assert.equal(history.status, 200);
    assert.equal(history.data.status, "in_progress");
    assert.equal(history.data.history.length, 3, "greeting, answer and follow-up are stored");

    // The completion marker ends the interview.
    provider.setResponder(() => "Thanks for your time. INTERVIEW_COMPLETE");
    const last = await server.post("/api/interview/respond", {
      sessionId,
      answer: "I also wrote unit tests with Jest.",
    });
    assert.equal(last.data.interviewComplete, true, "INTERVIEW_COMPLETE was not honoured");
    assert.ok(!last.data.message.includes("INTERVIEW_COMPLETE"), "the marker leaked into the message");

    const done = await server.get(`/api/interview/history/${sessionId}`);
    assert.equal(done.data.status, "completed");

    provider.setResponder(null);

    // Now analyse the completed interview.
    const analysis = await server.post("/api/evaluate/complete", {
      sessionId,
      interviewHistory: history.data.history,
      targetRole: "Frontend Developer",
      candidateProfile: CANDIDATE,
      mode: "technical",
    });

    assert.equal(analysis.status, 200);
    assert.equal(Object.keys(analysis.data.evaluation.breakdown).length, 7);
    assert.ok(analysis.data.skillGaps.gaps.length > 0);
    assert.equal(analysis.data.roadmap.weeks.length, 4);
    assert.equal(analysis.data.dashboard.interviewCompleted, true);
    assert.equal(analysis.data.dashboard.targetRoleTitle, "Frontend Developer");
    assert.ok(analysis.data.dashboard.nextSteps.length > 0);
    assert.ok(analysis.data.dashboard.candidate.skills.length > 0);

    // The stored evaluation is retrievable, with its history for the trend.
    const stored = await server.get(`/api/evaluate/${sessionId}`);
    assert.equal(stored.status, 200);
    assert.ok(Array.isArray(stored.data.history) && stored.data.history.length >= 1);
  });

  test("the interview also ends after the maximum number of questions", async () => {
    const sessionId = "max-session";
    await server.post("/api/interview/start", { sessionId, targetRole: "general" });

    // The model never signals completion, so the turn count must end it.
    provider.setResponder((body, kind) =>
      kind === "interview" && /Start a professional interview greeting/.test(JSON.stringify(body))
        ? "Hello, let's begin."
        : "Another question for you."
    );

    let last;
    for (let i = 0; i < 12; i += 1) {
      last = await server.post("/api/interview/respond", { sessionId, answer: `Answer number ${i}` });
      if (last.data.interviewComplete) break;
    }

    assert.ok(last.data.interviewComplete, "the interview never stopped");
    assert.equal(last.data.totalQuestions, 10);
    assert.ok(last.data.questionNumber <= 11);

    provider.setResponder(null);
  });

  test("clearing a session resets the interview", async () => {
    const sessionId = "clear-session";
    await server.post("/api/interview/start", { sessionId, targetRole: "Data Analyst" });

    const cleared = await server.del(`/api/interview/session/${sessionId}`);
    assert.equal(cleared.status, 200);
    assert.equal(cleared.data.status, "interview_session_cleared");

    const gone = await server.get(`/api/interview/history/${sessionId}`);
    assert.equal(gone.status, 404);
  });
});

/* ------------------------------------------------------------------ *
 * Analytics
 * ------------------------------------------------------------------ */

describe("analytics are served as chart-ready payloads", () => {
  test("the dashboard payload carries a full analytics block", async () => {
    const { status, data } = await server.post("/api/evaluate/dashboard", {
      targetRole: "Data Analyst",
      skills: ["Excel", "SQL"],
      candidateProfile: { name: "Irtiqa", skills: ["Excel", "SQL"] },
      experience: "1 year",
    });

    assert.equal(status, 200);
    const analytics = data.analytics;
    assert.equal(analytics.available, true);
    assert.ok(analytics.skills.rows.length > 0);
    assert.ok(analytics.performance.radar.labels.length === 7, "no interview yet, but axes are stable");
    assert.ok(analytics.kpis.length >= 5);
  });

  test("analytics can be requested for a stored session, with progress", async () => {
    const sessionId = "analytics-session";

    for (const overall of [4, 6, 8]) {
      provider.setResponder(
        (body, kind) => (kind === "evaluation" ? evaluationJson({ overallScore: overall }) : null)
      );
      const result = await server.post("/api/evaluate/complete", {
        sessionId,
        interviewHistory: sampleTranscript(),
        targetRole: "Backend Developer",
        candidateProfile: { name: "Irtiqa", skills: ["Git", "SQL"] },
      });
      assert.equal(result.status, 200);
    }
    provider.setResponder(null);

    const { status, data } = await server.get(`/api/evaluate/analytics/${sessionId}`);
    assert.equal(status, 200);
    assert.equal(data.progress.sessionCount, 3);
    assert.deepEqual(data.progress.series.overall, [40, 60, 80]);
    assert.equal(data.progress.trend, "up");
    assert.equal(data.progress.delta.overall, 40);
    assert.equal(data.hasProgress, true);
    assert.ok(data.performance.bars.length === 7);
    assert.ok(data.weaknesses.items.length > 0);
  });

  test("analytics for an empty payload is a clean empty state, not an error", async () => {
    const { status, data } = await server.post("/api/evaluate/analytics", {});
    assert.equal(status, 200);
    assert.equal(data.available, false);
    assert.deepEqual(data.performance.bars, []);
    assert.deepEqual(data.skills.rows, []);
    assert.equal(data.progress.sessionCount, 0);
  });
});
