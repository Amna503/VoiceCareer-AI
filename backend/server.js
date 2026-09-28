import "dotenv/config";
import express from "express";
import cors from "cors";
import voiceRoutes from "./routes/voice.js";
import careerRoutes from "./routes/career.js";
import interviewRoutes from "./routes/interview.js";
import evaluationRoutes from "./routes/evaluation.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// API Routes
app.use("/api/voice", voiceRoutes);
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
      voice: {
        "POST /api/voice/process": "Process voice input and get AI response",
        "POST /api/voice/process-text": "Process text input and get AI response",
        "GET /api/voice/token": "Get a short-lived live streaming token"
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
        "GET /api/evaluate/:sessionId": "Get stored evaluation"
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`VoiceCareer AI backend running on http://localhost:${PORT}`);
});
