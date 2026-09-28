/**
 * Voice Agent Routes
 *
 * Secure backend surface for the AssemblyAI Voice Agent API. The browser never
 * sees the AssemblyAI API key: it asks for a short-lived token here, opens the
 * Voice Agent WebSocket with that token, and calls back here to execute tools.
 */

import { Router } from "express";
import {
  mintVoiceAgentToken,
  getVoiceAgentConfig,
  executeVoiceAgentTool,
  getVoiceAgentSessionSnapshot,
  clearVoiceAgentSession,
  SUPPORTED_TOOLS,
} from "../services/voiceAgent.js";

const router = Router();

function parseList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return undefined;
}

/**
 * GET /api/voice-agent/token
 * GET /api/voice-token  (alias, see server.js)
 *
 * Mints a single-use, short-lived token for wss://agents.assemblyai.com/v1/ws.
 * ASSEMBLYAI_API_KEY stays on the server.
 */
export async function handleMintToken(_req, res) {
  try {
    const { token, expiresIn, maxSessionDuration } = await mintVoiceAgentToken();
    res.json({
      token,
      expiresIn,
      maxSessionDuration,
      wsUrl: "wss://agents.assemblyai.com/v1/ws",
    });
  } catch (error) {
    console.error("Voice agent token error:", error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
}

router.get("/token", handleMintToken);

/**
 * GET /api/voice-agent/config
 * Returns the `session.update` payload for this interview, assembled on the
 * server from ai/prompts and ai/career-engine.
 *
 * Query: sessionId, targetRole, mode, maxQuestions, candidateName
 */
router.get("/config", (req, res) => {
  try {
    const { sessionId, targetRole, mode, maxQuestions, candidateName, jobDescription, experience } = req.query;
    const skills = parseList(req.query.skills);
    const config = getVoiceAgentConfig({
      sessionId,
      targetRole,
      mode,
      maxQuestions,
      candidateName,
      jobDescription,
      candidateProfile: skills ? { skills, experience } : null,
    });
    res.json(config);
  } catch (error) {
    console.error("Voice agent config error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/voice-agent/tools
 * Executes one AssemblyAI tool call against the existing ai/ modules.
 * Body: { sessionId, tool, arguments, transcript, targetRole, mode, candidateProfile, jobDescription }
 */
router.post("/tools", async (req, res) => {
  try {
    const {
      sessionId,
      tool,
      arguments: args,
      transcript,
      targetRole,
      mode,
      candidateProfile,
      jobDescription,
    } = req.body || {};

    if (!tool) {
      return res.status(400).json({ error: "tool is required" });
    }

    const result = await executeVoiceAgentTool({
      sessionId,
      tool,
      args: args || {},
      transcript,
      targetRole,
      mode,
      candidateProfile,
      jobDescription,
    });

    res.json({ tool, result });
  } catch (error) {
    console.error("Voice agent tool error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

/** GET /api/voice-agent/session/:sessionId — transcript snapshot for debugging. */
router.get("/session/:sessionId", (req, res) => {
  const session = getVoiceAgentSessionSnapshot(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Voice agent session not found" });
  }
  res.json({
    targetRole: session.targetRole,
    mode: session.mode,
    turnCount: session.transcript.length,
    transcript: session.transcript,
  });
});

/** DELETE /api/voice-agent/session/:sessionId */
router.delete("/session/:sessionId", (req, res) => {
  clearVoiceAgentSession(req.params.sessionId);
  res.json({ status: "voice_agent_session_cleared" });
});

export { SUPPORTED_TOOLS };
export default router;
