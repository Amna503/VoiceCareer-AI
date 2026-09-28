/**
 * Evaluation Routes
 * Handles interview evaluation, skill gap analysis, and roadmap generation.
 *
 * Every route runs the same pipeline, so the dashboard and the voice agent can
 * never disagree about a candidate's plan:
 *
 *   target role + job description
 *     -> role requirements   (ai/career-engine/roleCatalog.js)
 *     -> candidate skills
 *     -> prioritised gaps    (ai/career-engine/skillGap.js)
 *     -> interview evaluation(ai/evaluation + CoachAgent)
 *     -> 30-day roadmap      (ai/career-engine/roadmap.js, enriched by CoachAgent)
 */

import { Router } from "express";
import { CoachAgent } from "../../ai/agents/coachAgent.js";
import { LLMService } from "../../ai/llmService.js";
import { CAREER_ROLE_REQUIREMENTS, getRoleRequirements } from "../../ai/career-engine/skillGap.js";
import { buildNextSteps } from "../../ai/career-engine/nextSteps.js";
import { buildAnalytics } from "../../ai/analytics/index.js";
import { formatEvaluationReport } from "../../ai/evaluation/evaluator.js";

const router = Router();

/**
 * In-memory evaluation store.
 * `history` is kept per session so the dashboard can chart progress across
 * repeated interviews instead of showing a single number (ai/analytics).
 */
const evaluations = new Map();

/** Record one completed analysis and keep every earlier one for the trend. */
function storeEvaluation(sessionId, entry) {
  if (!sessionId) return entry;
  const record = { ...entry, evaluatedAt: entry.evaluatedAt || new Date().toISOString() };
  const existing = evaluations.get(sessionId);
  const history = Array.isArray(existing?.history) ? existing.history : [];
  evaluations.set(sessionId, {
    ...record,
    latest: record,
    history: [...history, record].slice(-20),
  });
  return record;
}

function readStored(sessionId) {
  const record = evaluations.get(sessionId);
  if (!record) return null;
  return {
    ...record,
    latest: record.latest || record,
    history: Array.isArray(record.history) && record.history.length ? record.history : [record],
  };
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,;]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

/** Read the analysis inputs out of a request body, accepting both nested and flat forms. */
function readContext(body = {}) {
  const profile = body.candidateProfile || null;
  return {
    candidateProfile: profile,
    targetRole: body.targetRole || profile?.careerGoal || "general",
    jobDescription: body.jobDescription || profile?.jobDescription || "",
    experience: body.experience || body.experienceLevel || profile?.experience || null,
    currentSkills: toStringArray(body.skills || body.currentSkills || profile?.skills),
    mode: body.mode,
  };
}

/** Compact dashboard payload so the React side renders backend data, never literals. */
function toDashboardPayload({
  evaluation,
  skillGaps,
  roadmap,
  targetRole,
  mode,
  candidateProfile,
  experience,
  interviewCompleted = false,
  history,
}) {
  const resolvedTargetRole = targetRole || candidateProfile?.careerGoal || "general";

  return {
    targetRole: resolvedTargetRole,
    targetRoleTitle: roadmap?.targetRoleTitle || skillGaps?.targetRoleTitle || null,
    mode: mode || null,
    // The candidate as the backend received them: the greeting, the profile panel
    // and the interview type line all read from here instead of a literal.
    candidate: {
      name: candidateProfile?.name || null,
      // The engine's list is the real one: it falls back to skills mentioned in
      // the interview transcript when the candidate never typed a list.
      skills: toStringArray(candidateProfile?.skills).length
        ? toStringArray(candidateProfile.skills)
        : toStringArray(skillGaps?.currentSkills),
      experience: experience || candidateProfile?.experience || skillGaps?.experienceLevel?.label || null,
    },
    interviewCompleted,
    interviewMode: mode || null,
    evaluation: evaluation || null,
    skillGaps: skillGaps || null,
    roadmap: roadmap || null,
    // Composed from THIS candidate's gaps + evaluation + roadmap (career-engine).
    nextSteps: buildNextSteps({ evaluation, skillGaps, roadmap }),
    // Chart-ready series: performance, skill breakdown, progress, strengths,
    // weaknesses. Same numbers the cards above render — never a second source.
    analytics: buildAnalytics({ evaluation, skillGaps, roadmap, history }),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * POST /api/evaluate/interview
 * Evaluate an interview based on conversation history
 */
router.post("/interview", async (req, res) => {
  try {
    const { sessionId, interviewHistory } = req.body;
    const context = readContext(req.body);

    if (!interviewHistory || !Array.isArray(interviewHistory)) {
      return res.status(400).json({ error: "Interview history is required" });
    }

    const llm = new LLMService();
    const coach = new CoachAgent(llm);

    const evaluation = await coach.evaluateInterview(interviewHistory, context.candidateProfile);
    const report = formatEvaluationReport(evaluation);

    // Store evaluation (and keep it in the session's progress history).
    if (sessionId) {
      storeEvaluation(sessionId, {
        evaluation,
        report,
        candidateProfile: context.candidateProfile,
        targetRole: context.targetRole,
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
 * Analyze skill gaps for a candidate against a specific target role
 */
router.post("/skill-gaps", async (req, res) => {
  try {
    const context = readContext(req.body);

    if (!req.body.targetRole) {
      return res.status(400).json({ error: "Target role is required" });
    }

    const requirements = getRoleRequirements(context.targetRole, {
      jobDescription: context.jobDescription,
    });

    const llm = new LLMService();
    const coach = new CoachAgent(llm);

    // The career engine decides which skills are gaps and in what order; the LLM
    // only enriches each one. There is no role-agnostic path.
    const skillGaps = await coach.analyzeGaps(
      context.currentSkills.length
        ? { skills: context.currentSkills }
        : context.candidateProfile,
      context.targetRole,
      {
        jobDescription: context.jobDescription,
        experience: context.experience,
      }
    );

    res.json({
      skillGaps,
      roleRequirements: {
        role: requirements.roleKey,
        title: requirements.title,
        critical: requirements.critical,
        important: requirements.important,
        niceToHave: requirements.niceToHave,
      }
    });
  } catch (error) {
    console.error("Skill gap analysis error:", error.message);
    res.status(500).json({ error: error.message || "Failed to analyze skill gaps" });
  }
});

/**
 * POST /api/evaluate/roadmap
 * Generate a personalized 30-day roadmap for a role and skill set.
 */
router.post("/roadmap", async (req, res) => {
  try {
    const context = readContext(req.body);

    if (!req.body.targetRole) {
      return res.status(400).json({ error: "Target role is required" });
    }

    const llm = new LLMService();
    const coach = new CoachAgent(llm);

    const roadmap = await coach.buildRoadmap(
      { skills: context.currentSkills },
      context.targetRole,
      {
        jobDescription: context.jobDescription,
        experience: context.experience,
        skillGaps: req.body.skillGaps || undefined,
      }
    );

    res.json({
      roadmap,
      // Convenience: the gaps the roadmap was actually built from.
      skillGaps: req.body.skillGaps || undefined
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
    const { sessionId, interviewHistory } = req.body;
    const context = readContext(req.body);

    if (!interviewHistory || !Array.isArray(interviewHistory)) {
      return res.status(400).json({ error: "Interview history is required" });
    }

    const llm = new LLMService();
    const coach = new CoachAgent(llm);

    // readContext accepts `skills` flat or nested, but the coach reads skills from
    // the profile. Fold them in so an explicitly supplied skill list is never
    // silently dropped (which would report every role skill as a gap).
    const candidateProfile = context.currentSkills.length
      ? { ...(context.candidateProfile || {}), skills: context.currentSkills }
      : context.candidateProfile;

    const analysis = await coach.generateCompleteAnalysis(
      interviewHistory,
      candidateProfile,
      context.targetRole,
      {
        jobDescription: context.jobDescription,
        experience: context.experience,
        mode: context.mode,
      }
    );

    const report = formatEvaluationReport(analysis.evaluation);

    // Record every completed interview so progress can be charted over time.
    const stored = sessionId
      ? storeEvaluation(sessionId, {
          ...analysis,
          report,
          evaluatedAt: new Date().toISOString(),
        })
      : null;
    const history = stored ? readStored(sessionId).history : [stored].filter(Boolean);

    res.json({
      evaluation: report,
      skillGaps: analysis.skillGaps,
      roadmap: analysis.roadmap,
      dashboard: toDashboardPayload({
        evaluation: report,
        skillGaps: analysis.skillGaps,
        roadmap: analysis.roadmap,
        targetRole: context.targetRole,
        mode: context.mode,
        candidateProfile,
        experience: context.experience,
        interviewCompleted: true,
        history,
      })
    });
  } catch (error) {
    console.error("Complete analysis error:", error.message);
    res.status(500).json({ error: error.message || "Failed to generate complete analysis" });
  }
});

/**
 * POST /api/evaluate/dashboard
 * Roadmap + skill gaps for a role, with no interview transcript required.
 * Lets the dashboard render a real backend-generated plan on first load.
 */
router.post("/dashboard", async (req, res) => {
  try {
    const context = readContext(req.body);

    if (!req.body.targetRole) {
      return res.status(400).json({ error: "Target role is required" });
    }

    const llm = new LLMService();
    const coach = new CoachAgent(llm);

    const skillGaps = await coach.analyzeGaps(
      { skills: context.currentSkills },
      context.targetRole,
      { jobDescription: context.jobDescription, experience: context.experience }
    );

    const roadmap = await coach.buildRoadmap(
      { skills: context.currentSkills },
      context.targetRole,
      { jobDescription: context.jobDescription, experience: context.experience, skillGaps }
    );

    res.json(
      toDashboardPayload({
        skillGaps,
        roadmap,
        targetRole: context.targetRole,
        mode: context.mode,
        candidateProfile: context.candidateProfile,
        experience: context.experience,
        interviewCompleted: false,
      })
    );
  } catch (error) {
    console.error("Dashboard analysis error:", error.message);
    res.status(500).json({ error: error.message || "Failed to build dashboard analysis" });
  }
});

/**
 * GET /api/evaluate/roles
 * The roles the career engine has structured requirements for, so the UI never
 * has to hardcode a role list.
 */
router.get("/roles", (_req, res) => {
  res.json({
    roles: Object.entries(CAREER_ROLE_REQUIREMENTS).map(([key, role]) => ({
      key,
      title: role.title,
      family: role.family,
      aliases: role.aliases || [],
      skillCount:
        (role.critical?.length || 0) + (role.important?.length || 0) + (role.niceToHave?.length || 0),
    })),
  });
});

/**
 * POST /api/evaluate/analytics
 * Chart-ready analytics (interview performance, skill breakdown, progress,
 * strengths, weaknesses) for a payload the caller already holds. Returns
 * `available: false` sections rather than failing when the interview has not
 * been scored, so the dashboard can render an empty state.
 */
router.post("/analytics", (req, res) => {
  const body = req.body || {};
  const history = Array.isArray(body.history)
    ? body.history
    : body.sessionId
      ? readStored(body.sessionId)?.history || []
      : [];

  res.json(
    buildAnalytics({
      evaluation: body.evaluation || null,
      skillGaps: body.skillGaps || null,
      roadmap: body.roadmap || null,
      history,
    })
  );
});

/**
 * GET /api/evaluate/analytics/:sessionId
 * Chart-ready analytics for a stored session, including the progress series
 * built from every interview that session has completed.
 */
router.get("/analytics/:sessionId", (req, res) => {
  const stored = readStored(req.params.sessionId);
  if (!stored) {
    return res.status(404).json({ error: "Evaluation not found" });
  }

  res.json(
    buildAnalytics({
      evaluation: stored.report || stored.evaluation,
      skillGaps: stored.skillGaps,
      roadmap: stored.roadmap,
      history: stored.history,
    })
  );
});

/**
 * GET /api/evaluate/:sessionId
 * Get stored evaluation for a session
 */
router.get("/:sessionId", (req, res) => {
  const evaluation = readStored(req.params.sessionId);
  if (!evaluation) {
    return res.status(404).json({ error: "Evaluation not found" });
  }

  res.json(evaluation);
});

export default router;
