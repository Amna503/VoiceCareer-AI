/**
 * Interview Routes
 * Handles adaptive interview sessions with voice integration.
 */

import { Router } from "express";
import { InterviewAgent } from "../../ai/agents/interviewAgent.js";
import { LLMService } from "../../ai/llmService.js";
import { transcribeAudio } from "../services/assemblyai.js";
import { synthesizeSpeech } from "../services/tts.js";

const router = Router();

// In-memory interview session store
const interviewSessions = new Map();

function getInterviewSession(sessionId) {
  if (!interviewSessions.has(sessionId)) {
    const llm = new LLMService();
    interviewSessions.set(sessionId, {
      interviewAgent: new InterviewAgent(llm),
      candidateProfile: null,
      targetRole: "general",
      status: "waiting",
      startedAt: new Date().toISOString()
    });
  }
  return interviewSessions.get(sessionId);
}

/**
 * POST /api/interview/start
 * Start a new adaptive interview
 */
router.post("/start", async (req, res) => {
  try {
    const { sessionId, targetRole, candidateProfile } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const session = getInterviewSession(sessionId);
    session.targetRole = targetRole || "general";
    session.candidateProfile = candidateProfile || null;

    session.interviewAgent.setTargetRole(session.targetRole);
    if (session.candidateProfile) {
      session.interviewAgent.setCandidateProfile(session.candidateProfile);
    }

    const greeting = await session.interviewAgent.startInterview("technical");
    session.status = "in_progress";

    const speech = await synthesizeSpeech(greeting);

    res.json({
      message: greeting,
      audio: speech ? speech.audioBase64 : null,
      audioContentType: speech ? speech.contentType : null,
      sessionId,
      targetRole: session.targetRole,
      status: "interview_started"
    });
  } catch (error) {
    console.error("Interview start error:", error.message);
    res.status(500).json({ error: error.message || "Failed to start interview" });
  }
});

/**
 * POST /api/interview/respond
 * Submit a text response during the interview
 */
router.post("/respond", async (req, res) => {
  try {
    const { sessionId, answer } = req.body;

    // A blank answer would otherwise be recorded as a turn and skew the
    // evaluation, so it is rejected like any other invalid input.
    if (!sessionId || typeof answer !== "string" || answer.trim().length === 0) {
      return res.status(400).json({ error: "Session ID and answer are required" });
    }

    const session = getInterviewSession(sessionId);
    const result = await session.interviewAgent.processAnswer(answer);

    if (result.interviewComplete) {
      session.status = "completed";
    }

    const speech = await synthesizeSpeech(result.message);

    res.json({
      message: result.message,
      audio: speech ? speech.audioBase64 : null,
      audioContentType: speech ? speech.contentType : null,
      questionNumber: result.questionNumber,
      totalQuestions: result.totalQuestions,
      interviewComplete: result.interviewComplete,
      coveredTopics: result.coveredTopics
    });
  } catch (error) {
    console.error("Interview respond error:", error.message);
    res.status(500).json({ error: error.message || "Failed to process answer" });
  }
});

/**
 * POST /api/interview/voice
 * Submit a voice response during the interview
 * Transcribes audio and processes the answer
 */
router.post("/voice", async (req, res) => {
  try {
    const { sessionId, audio } = req.body;

    if (!sessionId || !audio) {
      return res.status(400).json({ error: "Session ID and audio are required" });
    }

    // Transcribe audio
    const audioBuffer = Buffer.from(audio, "base64");
    const transcript = await transcribeAudio(audioBuffer);

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: "No speech detected in the audio" });
    }

    // Process the transcribed answer
    const session = getInterviewSession(sessionId);
    const result = await session.interviewAgent.processAnswer(transcript);

    if (result.interviewComplete) {
      session.status = "completed";
    }

    const speech = await synthesizeSpeech(result.message);

    res.json({
      transcript,
      message: result.message,
      audio: speech ? speech.audioBase64 : null,
      audioContentType: speech ? speech.contentType : null,
      questionNumber: result.questionNumber,
      totalQuestions: result.totalQuestions,
      interviewComplete: result.interviewComplete,
      coveredTopics: result.coveredTopics
    });
  } catch (error) {
    console.error("Interview voice error:", error.message);
    res.status(500).json({ error: error.message || "Failed to process voice" });
  }
});

/**
 * GET /api/interview/history/:sessionId
 * Get the interview conversation history
 */
router.get("/history/:sessionId", (req, res) => {
  const session = interviewSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Interview session not found" });
  }

  res.json({
    history: session.interviewAgent.getConversationHistory(),
    status: session.status,
    targetRole: session.targetRole
  });
});

/**
 * DELETE /api/interview/session/:sessionId
 * Clear an interview session
 */
router.delete("/session/:sessionId", (req, res) => {
  interviewSessions.delete(req.params.sessionId);
  res.json({ status: "interview_session_cleared" });
});

export default router;
