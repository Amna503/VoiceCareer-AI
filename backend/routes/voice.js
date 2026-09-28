import { Router } from "express";
import { transcribeAudio } from "../services/assemblyai.js";
import { generateResponse } from "../services/llm.js";
import { synthesizeSpeech } from "../services/tts.js";

const router = Router();

/**
 * GET /api/voice/token
 * Mint a short-lived AssemblyAI Universal-Streaming (v3) token.
 * Keeps the permanent API key server-side for the legacy live-transcription
 * client in frontend/src/lib/realtimeTranscriber.js.
 *
 * The Voice Agent flow uses its own endpoint instead: GET /api/voice-token.
 */
router.get("/token", async (_req, res) => {
  try {
    const apiKey = process.env.ASSEMBLYAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ASSEMBLYAI_API_KEY is not configured" });
    }

    const url = new URL("https://streaming.assemblyai.com/v3/token");
    url.searchParams.set("expires_in_seconds", "300");

    const response = await fetch(url, { headers: { authorization: apiKey } });

    if (!response.ok) {
      const text = await response.text();
      return res
        .status(response.status)
        .json({ error: text || "Failed to create streaming token" });
    }

    const data = await response.json();
    res.json({ token: data.token, expiresIn: data.expires_in_seconds });
  } catch (error) {
    console.error("Text processing error:", error.message);
    res.status(500).json({ error: error.message || "Failed to process text input" });
  }
});

export default router;

router.post("/process", async (req, res) => {
  try {
    const { audio, history } = req.body;

    if (!audio) {
      return res.status(400).json({ error: "No audio data provided" });
    }

    // Convert base64 audio to Buffer
    const audioBuffer = Buffer.from(audio, "base64");

    console.log(`Audio received: ${audioBuffer.length} bytes`);

    if (audioBuffer.length < 1000) {
      return res.status(400).json({ error: "Audio too short. Please record for at least 2 seconds." });
    }

    // Step 1: Transcribe audio → text
    const transcript = await transcribeAudio(audioBuffer);

    console.log(`Transcript: "${transcript}"`);

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: "No speech detected in the audio. Please speak clearly and try again." });
    }

    // Step 2: Build conversation context for LLM
    const conversationMessages = [
      ...(history || []),
      { role: "user", content: transcript },
    ];

    // Step 3: Generate AI response
    const aiResponse = await generateResponse(conversationMessages);

    // Step 4: Speak the response back (best-effort — text always returned)
    const speech = await synthesizeSpeech(aiResponse);

    // Step 5: Return transcript, AI response, and optional audio
    res.json({
      transcript,
      aiResponse,
      audio: speech ? speech.audioBase64 : null,
      audioContentType: speech ? speech.contentType : null,
    });
  } catch (error) {
    console.error("Voice processing error:", error.message);
    res.status(500).json({
      error: error.message || "Failed to process voice input",
    });
  }
});

/**
 * POST /api/voice/process-text
 * Process text input directly (bypasses voice transcription)
 */
router.post("/process-text", async (req, res) => {
  try {
    const { text, history } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "No text provided" });
    }

    // Build conversation context for LLM
    const conversationMessages = [
      ...(history || []),
      { role: "user", content: text },
    ];

    // Generate AI response
    const aiResponse = await generateResponse(conversationMessages);

    // Speak the response back (best-effort — text always returned)
    const speech = await synthesizeSpeech(aiResponse);

    res.json({
      transcript: text,
      aiResponse,
      audio: speech ? speech.audioBase64 : null,
      audioContentType: speech ? speech.contentType : null,
    });
  } catch (error) {
    console.error("Text processing error:", error.message);
    res.status(500).json({
      error: error.message || "Failed to process text input",
    });
  }
});
