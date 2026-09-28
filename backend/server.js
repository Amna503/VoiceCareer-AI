import "dotenv/config";
import express from "express";
import cors from "cors";
import voiceRoutes from "./routes/voice.js";
import voiceAgentRoutes, { handleMintToken } from "./routes/voiceAgent.js";
import careerRoutes from "./routes/career.js";
import interviewRoutes from "./routes/interview.js";
import evaluationRoutes from "./routes/evaluation.js";

const app = express();
// Railway injects PORT, so the deployed port wins; 3000 stays as the local default.
const PORT = Number(process.env.PORT) || 3000;

/**
 * CORS.
 *
 * The browser client is served from a different origin (Vercel) than this API
 * (Railway), and that URL is only known after the frontend is deployed, so the
 * allow-list defaults to any origin. Set ALLOWED_ORIGINS to a comma-separated
 * list to lock it down once the Vercel domain exists. No cookies are used, so
 * `credentials` stays off.
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length
      ? { origin: allowedOrigins, credentials: false }
      : { origin: true, credentials: false }
  )
);
app.use(express.json({ limit: "10mb" }));

// API Routes
app.use("/api/voice", voiceRoutes);
app.use("/api/voice-agent", voiceAgentRoutes);
// Flat alias so the browser client can call GET /api/voice-token directly.
app.get("/api/voice-token", handleMintToken);
app.use("/api/career", careerRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/evaluate", evaluationRoutes);

// Health check. Railway polls this path, so it must answer before any LLM or
// AssemblyAI call — it reports that the process is up, nothing more, and never
// reports whether a key is valid (that would leak configuration state).
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "voicecareer-ai-api",
    version: "1.0.0",
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// API documentation endpoint
app.get("/api", (_req, res) => {
  res.json({
    name: "VoiceCareer AI API",
    version: "1.0.0",
    endpoints: {
      voiceAgent: {
        "GET /api/voice-token": "Mint a short-lived AssemblyAI Voice Agent token (alias)",
        "GET /api/voice-agent/token": "Mint a short-lived AssemblyAI Voice Agent token",
        "GET /api/voice-agent/config": "Get the inline session.update config for the interview agent",
        "POST /api/voice-agent/tools": "Execute a voice agent tool call against ai/ modules",
        "GET /api/voice-agent/session/:sessionId": "Get stored transcript for a voice session",
        "DELETE /api/voice-agent/session/:sessionId": "Clear a voice session"
      },
      voice: {
        "POST /api/voice/process": "Process voice input and get AI response",
        "POST /api/voice/process-text": "Process text input and get AI response",
        "GET /api/voice/token": "Get a short-lived Universal-Streaming (v3) token"
      },
      career: {
        "POST /api/career/start": "Start career discovery conversation",
        "POST /api/career/chat": "Continue career discovery conversation",
        "GET /api/career/profile/:sessionId": "Get career profile",
        "DELETE /api/career/session/:sessionId": "Clear career session"
      },
      interview: {
        "POST /api/interview/start": "Start adaptive interview",
        "POST /api/interview/respond": "Submit text response",
        "POST /api/interview/voice": "Submit voice response",
        "GET /api/interview/history/:sessionId": "Get interview history",
        "DELETE /api/interview/session/:sessionId": "Clear interview session"
      },
      evaluate: {
        "POST /api/evaluate/interview": "Evaluate interview performance",
        "POST /api/evaluate/skill-gaps": "Analyze skill gaps",
        "POST /api/evaluate/roadmap": "Generate career roadmap",
        "POST /api/evaluate/complete": "Generate complete analysis",
        "POST /api/evaluate/dashboard": "Skill gaps + roadmap for a role, no transcript needed",
        "GET /api/evaluate/roles": "Roles the career engine can assess",
        "POST /api/evaluate/analytics": "Chart-ready analytics for a supplied payload",
        "GET /api/evaluate/analytics/:sessionId": "Chart-ready analytics + progress for a session",
        "GET /api/evaluate/:sessionId": "Get stored evaluation"
      }
    }
  });
});

// Exported so tests can mount the real app on an ephemeral port instead of
// hitting a long-running dev server.
export { app };

/* Listen unless we are running under the test runner.
 *
 * A host like Railway starts the process in ways that make an argv comparison
 * unreliable (it may exec `node server.js` from a different working directory),
 * so "did not run the tests" is the safe condition: NODE_ENV=test is set by
 * backend/tests/helpers/testServer.js, which imports this file to mount the app
 * on an ephemeral port. Production, staging and `node server.js` all listen. */
const isTestRun = process.env.NODE_ENV === "test";

if (!isTestRun) {
  // Bind 0.0.0.0 explicitly: a container that binds only loopback is
  // unreachable from outside, which looks like a dead deployment.
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`VoiceCareer AI backend listening on 0.0.0.0:${PORT}`);
    console.log(`Health check: http://0.0.0.0:${PORT}/health`);
  });
}

export default app;
