const express = require('express');
const router = express.Router();

const sessions = {};

// 1. Session Start
router.post('/session', (req, res) => {
  const { userName, careerGoal } = req.body;
  const sessionId = 'session_' + Date.now();
  sessions[sessionId] = { id: sessionId, userName, careerGoal };
  res.status(201).json({ success: true, sessionId, session: sessions[sessionId] });
});

// 2. Fetch Session
router.get('/session/:id', (req, res) => {
  const session = sessions[req.params.id];
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
  res.json({ success: true, session });
});

// 3. Transcribe Audio
router.post('/voice/transcribe', (req, res) => {
  res.json({ success: true, transcription: "Sample transcription text." });
});

// 4. Analyze Career
router.post('/career/analyze', (req, res) => {
  res.json({ success: true, profile: { targetRole: "Developer", skills: ["JS", "Node"] } });
});

// 5. Start Interview
router.post('/interview/start', (req, res) => {
  res.json({ success: true, questionId: 1, question: "Tell me about your tech background." });
});

// 6. Interview Response
router.post('/interview/respond', (req, res) => {
  res.json({ success: true, nextQuestion: "How do you handle APIs?" });
});

// 7. Evaluate Interview
router.post('/interview/evaluate', (req, res) => {
  res.json({ success: true, evaluation: { score: "8/10", feedback: "Good communication" } });
});

// 8. Career Roadmap
router.post('/roadmap', (req, res) => {
  res.json({ success: true, roadmap: ["Week 1: Basics", "Week 2: Advanced"] });
});

module.exports = router;