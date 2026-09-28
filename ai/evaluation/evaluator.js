/**
 * Interview Evaluation Module
 * Structured evaluation of interview performance with scoring and feedback.
 */

/**
 * The scored criteria, in the order the dashboard presents them.
 *
 * `answerStructure` is scored separately from `communicationClarity` on purpose:
 * clarity is whether the words were easy to understand, structure is whether the
 * answer was organised (situation first, then the reasoning, then the result).
 * A candidate can ramble clearly, or be structured but hard to follow, and a
 * coach needs to be able to tell those apart.
 *
 * The weights sum to 1, so `calculateOverallScore` is a plain weighted mean
 * whenever every criterion is present.
 */
export const EVALUATION_CRITERIA = {
  answerRelevance: {
    name: "Answer Relevance",
    weight: 0.18,
    description: "Did the candidate answer the question asked? Was the response on-topic?"
  },
  technicalKnowledge: {
    name: "Technical Knowledge",
    weight: 0.22,
    description: "How strong is the candidate's understanding of technical concepts?"
  },
  problemSolving: {
    name: "Problem Solving",
    weight: 0.15,
    description: "Did the candidate demonstrate logical thinking and problem-solving skills?"
  },
  answerStructure: {
    name: "Answer Structure",
    weight: 0.13,
    description: "Was the answer organised into a clear beginning, reasoning and conclusion?"
  },
  communicationClarity: {
    name: "Communication Clarity",
    weight: 0.13,
    description: "Was the answer clear and easy to follow?"
  },
  followUpHandling: {
    name: "Follow-up Handling",
    weight: 0.11,
    description: "How well did the candidate handle follow-up questions and dig deeper?"
  },
  confidence: {
    name: "Confidence",
    weight: 0.08,
    description: "Did the candidate speak with conviction and certainty?"
  }
};

export const SCORE_MAX = 10;
export const SCORE_MIN = 0;

/**
 * Coerce a model-supplied score to a number on the 0-10 scale.
 *
 * `null`, `undefined`, `""` and booleans are rejected explicitly: they all
 * coerce to 0 via `Number()`, which would silently report "no ability" for a
 * criterion the evaluator simply did not return.
 */
function clampScore(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, numeric));
}

export function calculateOverallScore(evaluation) {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, criteria] of Object.entries(EVALUATION_CRITERIA)) {
    const score = clampScore(evaluation?.[key]?.score);
    // Only weight a criterion the evaluator actually produced, so a partial
    // evaluation still yields a correct weighted mean over what is present.
    if (score === null) continue;
    totalScore += score * criteria.weight;
    totalWeight += criteria.weight;
  }

  return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : 0;
}

export function getScoreLabel(score) {
  if (score >= 9) return "Excellent";
  if (score >= 7) return "Good";
  if (score >= 5) return "Average";
  if (score >= 3) return "Below Average";
  return "Needs Improvement";
}

export function getScoreColor(score) {
  if (score >= 8) return "#00B894"; // Success Green
  if (score >= 6) return "#0984E3"; // Info Blue
  if (score >= 4) return "#FDCB6E"; // Warning Amber
  return "#D63031"; // Error Red
}

/**
 * Read a criterion's score defensively.
 *
 * A model that returns 12, -1, "8" or null must not be able to corrupt the
 * dashboard: a score becomes a clamped number, or `null` when it is missing.
 */
export function normaliseCriterionScore(value) {
  return clampScore(value);
}

/**
 * Build the report the dashboard and the voice agent read.
 *
 * Only criteria the evaluator actually scored appear, each with its score
 * clamped to the 0-10 scale, so every number the UI draws is a real one.
 */
export function formatEvaluationReport(evaluation) {
  const overallScore = clampScore(evaluation?.overallScore) ?? calculateOverallScore(evaluation?.evaluation);
  const report = {
    summary: {
      overallScore,
      scoreLabel: getScoreLabel(overallScore),
      strengths: evaluation?.strengths || [],
      improvements: evaluation?.improvements || []
    },
    breakdown: {},
    detailedFeedback: evaluation?.detailedFeedback || ""
  };

  for (const [key, criteria] of Object.entries(EVALUATION_CRITERIA)) {
    const entry = evaluation?.evaluation?.[key];
    const score = clampScore(entry?.score);
    if (score === null) continue;

    report.breakdown[key] = {
      name: criteria.name,
      score,
      weight: criteria.weight,
      description: criteria.description,
      feedback: entry?.feedback || "",
      label: getScoreLabel(score),
      color: getScoreColor(score)
    };
  }

  return report;
}
