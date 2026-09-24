/**
 * Interview Evaluation Module
 * Structured evaluation of interview performance with scoring and feedback.
 */

export const EVALUATION_CRITERIA = {
  answerRelevance: {
    name: "Answer Relevance",
    weight: 0.2,
    description: "Did the candidate answer the question asked? Was the response on-topic?"
  },
  technicalKnowledge: {
    name: "Technical Knowledge",
    weight: 0.25,
    description: "How strong is the candidate's understanding of technical concepts?"
  },
  communicationClarity: {
    name: "Communication Clarity",
    weight: 0.15,
    description: "Was the answer clear, structured, and easy to follow?"
  },
  problemSolving: {
    name: "Problem Solving",
    weight: 0.15,
    description: "Did the candidate demonstrate logical thinking and problem-solving skills?"
  },
  confidence: {
    name: "Confidence",
    weight: 0.1,
    description: "Did the candidate speak with conviction and certainty?"
  },
  followUpHandling: {
    name: "Follow-up Handling",
    weight: 0.15,
    description: "How well did the candidate handle follow-up questions and dig deeper?"
  }
};

export function calculateOverallScore(evaluation) {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [key, criteria] of Object.entries(EVALUATION_CRITERIA)) {
    if (evaluation[key] && evaluation[key].score) {
      totalScore += evaluation[key].score * criteria.weight;
      totalWeight += criteria.weight;
    }
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

export function formatEvaluationReport(evaluation) {
  const overallScore = evaluation.overallScore || calculateOverallScore(evaluation.evaluation);
  const report = {
    summary: {
      overallScore,
      scoreLabel: getScoreLabel(overallScore),
      strengths: evaluation.strengths || [],
      improvements: evaluation.improvements || []
    },
    breakdown: {},
    detailedFeedback: evaluation.detailedFeedback || ""
  };

  for (const [key, criteria] of Object.entries(EVALUATION_CRITERIA)) {
    if (evaluation.evaluation && evaluation.evaluation[key]) {
      report.breakdown[key] = {
        name: criteria.name,
        score: evaluation.evaluation[key].score,
        feedback: evaluation.evaluation[key].feedback,
        label: getScoreLabel(evaluation.evaluation[key].score),
        color: getScoreColor(evaluation.evaluation[key].score)
      };
    }
  }

  return report;
}
