/**
 * Evaluation Routes
 * Handles interview evaluation, skill gap analysis, and roadmap generation.
 */

import { Router } from "express";
import { CoachAgent } from "../../ai/agents/coachAgent.js";
import { LLMService } from "../../ai/llmService.js";
import { analyzeSkillGaps } from "../../ai/career-engine/skillGap.js";
import { generateRoadmap } from "../../ai/career-engine/roadmap.js";
import { formatEvaluationReport } from "../../ai/evaluation/evaluator.js";

const router = Router();

// In-memory evaluation store
const evaluations = new Map();

/**
 * POST /api/evaluate/interview
 * Evaluate an interview based on conversation history
 */
router.post("/interview", async (req, res) => {
  try {
    const { sessionId, interviewHistory, candidateProfile, targetRole } = req.body;

    if (!interviewHistory || !Array.isArray(interviewHistory)) {
      return res.status(400).json({ error: "Interview history is required" });
    }

    const llm = new LLMService();
    const coach = new CoachAgent(llm);

    const evaluation = await coach.evaluateInterview(interviewHistory, candidateProfile);
    const report = formatEvaluationReport(evaluation);

    // Store evaluation
    if (sessionId) {
      evaluations.set(sessionId, {
        evaluation,
        report,
        candidateProfile,
        targetRole,
        evaluatedAt: new Date().toISOString()
      });
    }

    res.json({
      evaluation: report,
      rawEvaluation: evaluation
    });
  } catch (error) {
    console.error("Evaluation error:", error.message);
    res.status(500).json({ error: error.message || "Failed to evaluate interview" });
  }
});

/**
 * POST /api/evaluate/skill-gaps
 * Analyze skill gaps for a candidate
 */
router.post("/skill-gaps", async (req, res) => {
  try {
    const { candidateProfile, targetRole, interviewHistory } = req.body;

    if (!targetRole) {
      return res.status(400).json({ error: "Target role is required" });
    }

    // Use local skill gap analysis first
    const currentSkills = candidateProfile?.skills || [];
    const localAnalysis = analyzeSkillGaps(currentSkills, targetRole);

    // Enhance with LLM if available
    let enhancedAnalysis = localAnalysis;
    try {
      const llm = new LLMService();
      const coach = new CoachAgent(llm);
      enhancedAnalysis = await coach.analyzeSkillGaps(candidateProfile, targetRole, null);
    } catch (llmError) {
      console.log("LLM enhancement failed, using local analysis:", llmError.message);
    }

    res.json({
      skillGaps: enhancedAnalysis,
      localAnalysis
    });
  } catch (error) {
    console.error("Skill gap analysis error:", error.message);
    res.status(500).json({ error: error.message || "Failed to analyze skill gaps" });
  }
});

/**
 * POST /api/evaluate/roadmap
 * Generate a personalized career roadmap
 */
router.post("/roadmap", async (req, res) => {
  try {
    const { candidateProfile, skillGaps, targetRole } = req.body;

    if (!targetRole) {
      return res.status(400).json({ error: "Target role is required" });
    }

    // Use local roadmap generation
    const currentSkills = candidateProfile?.skills || [];
    const localSkillGaps = skillGaps || analyzeSkillGaps(currentSkills, targetRole);
    const roadmap = generateRoadmap(targetRole, localSkillGaps);

    // Enhance with LLM if available
    let enhancedRoadmap = roadmap;
    try {
      const llm = new LLMService();
      const coach = new CoachAgent(llm);
      enhancedRoadmap = await coach.generateRoadmap(candidateProfile, localSkillGaps, targetRole);
    } catch (llmError) {
      console.log("LLM enhancement failed, using local roadmap:", llmError.message);
    }

    res.json({
      roadmap: enhancedRoadmap,
      localRoadmap: roadmap
    });
  } catch (error) {
    console.error("Roadmap generation error:", error.message);
    res.status(500).json({ error: error.message || "Failed to generate roadmap" });
  }
});

/**
 * POST /api/evaluate/complete
 * Generate complete analysis (evaluation + skill gaps + roadmap)
 */
router.post("/complete", async (req, res) => {
  try {
    const { sessionId, interviewHistory, candidateProfile, targetRole } = req.body;

    if (!interviewHistory || !Array.isArray(interviewHistory)) {
      return res.status(400).json({ error: "Interview history is required" });
    }

    const llm = new LLMService();
    const coach = new CoachAgent(llm);

    const analysis = await coach.generateCompleteAnalysis(
      interviewHistory,
      candidateProfile,
      targetRole
    );

    const report = formatEvaluationReport(analysis.evaluation);

    // Store complete analysis
    if (sessionId) {
      evaluations.set(sessionId, {
        ...analysis,
        report,
        evaluatedAt: new Date().toISOString()
      });
    }

    res.json({
      evaluation: report,
      skillGaps: analysis.skillGaps,
      roadmap: analysis.roadmap
    });
  } catch (error) {
    console.error("Complete analysis error:", error.message);
    res.status(500).json({ error: error.message || "Failed to generate complete analysis" });
  }
});

/**
 * GET /api/evaluate/:sessionId
 * Get stored evaluation for a session
 */
router.get("/:sessionId", (req, res) => {
  const evaluation = evaluations.get(req.params.sessionId);
  if (!evaluation) {
    return res.status(404).json({ error: "Evaluation not found" });
  }

  res.json(evaluation);
});

export default router;
