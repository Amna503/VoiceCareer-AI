import "dotenv/config";
import { pathToFileURL } from "node:url";
import express from "express";
import cors from "cors";
import voiceRoutes from "./routes/voice.js";
import voiceAgentRoutes, { handleMintToken } from "./routes/voiceAgent.js";
import careerRoutes from "./routes/career.js";
import interviewRoutes from "./routes/interview.js";
import evaluationRoutes from "./routes/evaluation.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// API Routes
app.use("/api/voice", voiceRoutes);
app.use("/api/voice-agent", voiceAgentRoutes);
// Flat alias so the browser client can call GET /api/voice-token directly.
app.get("/api/voice-token", handleMintToken);
app.use("/api/career", careerRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/evaluate", evaluationRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
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

/* Only listen when executed directly, not when imported by a test.
 * Built with pathToFileURL because a Windows path like C:\app\server.js has to
 * become file:///C:/app/server.js before it can be compared to import.meta.url. */
const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`VoiceCareer AI backend running on http://localhost:${PORT}`);
  });
}

export default app;
