/**
 * Career Routes
 * Handles career discovery, profile building, and session management.
 */

import { Router } from "express";
import { CareerAgent } from "../../ai/agents/careerAgent.js";
import { LLMService } from "../../ai/llmService.js";
import { synthesizeSpeech } from "../services/tts.js";

const router = Router();

// In-memory session store (replace with database in production)
const sessions = new Map();

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    const llm = new LLMService();
    sessions.set(sessionId, {
      careerAgent: new CareerAgent(llm),
      profile: null,
      createdAt: new Date().toISOString()
    });
  }
  return sessions.get(sessionId);
}

/**
 * POST /api/career/start
 * Start a new career discovery conversation
 */
router.post("/start", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const session = getSession(sessionId);
    const greeting = await session.careerAgent.startConversation();

    const speech = await synthesizeSpeech(greeting);

    res.json({
      message: greeting,
      audio: speech ? speech.audioBase64 : null,
      audioContentType: speech ? speech.contentType : null,
      sessionId,
      status: "discovery_started"
    });
  } catch (error) {
    console.error("Career start error:", error.message);
    res.status(500).json({ error: error.message || "Failed to start career discovery" });
  }
});

/**
 * POST /api/career/chat
 * Continue the career discovery conversation
 */
router.post("/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    // A blank or whitespace-only message is a mis-trigger, not a conversation
    // turn: rejecting it stops an empty turn being recorded in the profile.
    if (!sessionId || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Session ID and message are required" });
    }

    const session = getSession(sessionId);
    const result = await session.careerAgent.processUserInput(message);

    if (result.profileComplete && result.profile) {
      session.profile = result.profile;
    }

    const speech = await synthesizeSpeech(result.message);

    res.json({
      message: result.message,
      audio: speech ? speech.audioBase64 : null,
      audioContentType: speech ? speech.contentType : null,
      profileComplete: result.profileComplete,
      profile: result.profile,
      turnCount: result.turnCount
    });
  } catch (error) {
    console.error("Career chat error:", error.message);
    res.status(500).json({ error: error.message || "Failed to process message" });
  }
});

/**
 * GET /api/career/profile/:sessionId
 * Get the career profile for a session
 */
router.get("/profile/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  res.json({
    profile: session.profile,
    history: session.careerAgent.getHistory()
  });
});

/**
 * DELETE /api/career/session/:sessionId
 * Clear a career session
 */
router.delete("/session/:sessionId", (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ status: "session_cleared" });
});

export default router;
