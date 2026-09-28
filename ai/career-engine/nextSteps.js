/**
 * Career Engine — Recommended Next Steps
 *
 * The dashboard's "Recommended Next Steps" list is NOT a fixed list of four
 * generic actions. Every item is composed from data this candidate actually
 * produced:
 *
 *   target role + role requirements + candidate skills
 *     -> prioritised skill gaps         (skillGap.js)
 *     -> interview evaluation            (ai/evaluation)
 *     -> 30-day roadmap                  (roadmap.js)
 *     -> recommended next steps          (this file)
 *
 * A frontend candidate on the same role with different gaps gets different
 * steps, and a Data Analyst gets different steps from a Cybersecurity
 * Analyst — because every string is built from that role's own gap playbooks,
 * the evaluation feedback, or that role's own portfolio ideas.
 */

/** How many items the dashboard shows by default. */
export const NEXT_STEP_COUNT = 4;

const IMPORTANCE_ORDER = { critical: 0, important: 1, "nice-to-have": 2 };

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  // The evaluator scores 1-10, but a roadmap-only candidate has no scores.
  return score <= 10 ? score : score / 10;
}

function toText(value) {
  if (typeof value !== "string") return "";
  return value.trim();
}

/** Criteria from the evaluation report, highest score first. */
function scoredCriteria(evaluation) {
  const breakdown = evaluation?.breakdown || {};
  return Object.entries(breakdown)
    .map(([key, entry]) => ({
      key,
      name: entry?.name || key,
      score: clampScore(entry?.score),
      feedback: toText(entry?.feedback),
      label: entry?.label || null,
    }))
    .filter((item) => item.score !== null);
}

/** Gaps in the order the roadmap will work them. */
function rankedGaps(skillGaps) {
  const gaps = Array.isArray(skillGaps) ? skillGaps : Array.isArray(skillGaps?.gaps) ? skillGaps.gaps : [];
  return gaps
    .filter((gap) => gap && typeof gap.skill === "string" && gap.skill.trim())
    .map((gap, index) => ({ ...gap, _order: index }))
    .sort((a, b) => {
      const priorityDiff = (b.priority ?? 0) - (a.priority ?? 0);
      if (priorityDiff) return priorityDiff;
      const band = (IMPORTANCE_ORDER[a.importance] ?? 1) - (IMPORTANCE_ORDER[b.importance] ?? 1);
      if (band) return band;
      return a._order - b._order;
    });
}

/** One step per real gap, worded from that gap's own playbook. */
function gapSteps(gaps, limit) {
  return gaps.slice(0, limit).map((gap) => ({
    kind: "skill-gap",
    priority: gap.priority ?? (gap.importance === "critical" ? 90 : 60),
    tag: gap.importance || "important",
    title:
      gap.importance === "critical"
        ? `Close your ${gap.skill} gap first`
        : `Work on ${gap.skill}`,
    detail:
      toText(gap.suggestedImprovement) ||
      toText(gap.practice) ||
      toText(gap.description) ||
      `Bring ${gap.skill} up to the level this role expects.`,
    skill: gap.skill,
  }));
}

/** One step per weak evaluation criterion, worded from the evaluator's feedback. */
function criteriaSteps(criteria, limit) {
  return criteria
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((criterion) => ({
      kind: "interview-skill",
      priority: 40 + (10 - Math.min(criterion.score, 10)) * 3,
      tag: "interview",
      title: `Improve ${criterion.name.toLowerCase()} in your answers`,
      detail:
        criterion.feedback ||
        `Your ${criterion.name.toLowerCase()} was the weakest part of this interview (${criterion.score}/10).`,
      criterion: criterion.key,
    }));
}

/**
 * Build the recommended next steps for this candidate.
 *
 * @param {object} input
 * @param {object} input.skillGaps  output of analyzeSkillGaps
 * @param {object} input.evaluation  formatted evaluation report (ai/evaluation/evaluator.js)
 * @param {object} input.roadmap  output of generateRoadmap
 * @param {number} [input.limit]  how many steps to return
 */
export function buildNextSteps({ skillGaps, evaluation, roadmap, limit = NEXT_STEP_COUNT } = {}) {
  const roleTitleText =
    toText(roadmap?.targetRoleTitle) ||
    toText(skillGaps?.targetRoleTitle) ||
    toText(skillGaps?.targetRole) ||
    "your target role";

  const gaps = rankedGaps(skillGaps);
  const criteria = scoredCriteria(evaluation);
  const steps = [];

  // 1. The two highest-priority skill gaps for THIS role.
  steps.push(...gapSteps(gaps, 2));

  // 2. The two weakest interview criteria, with the evaluator's own feedback.
  steps.push(...criteriaSteps(criteria, 2));

  const improvements = Array.isArray(evaluation?.summary?.improvements)
    ? evaluation.summary.improvements.filter(Boolean)
    : [];
  const overall = clampScore(evaluation?.summary?.overallScore);

  // 3. Re-interview only when the evaluation says there is something to rehearse,
  //    and say exactly what will be rehearsed.
  if (criteria.length) {
    const weakest = criteria.slice().sort((a, b) => a.score - b.score).slice(0, 2).map((item) => item.name.toLowerCase());
    steps.push({
      kind: "rehearse",
      priority: 50,
      tag: "interview",
      title: "Take another mock interview for this role",
      detail: `Rehearse ${weakest.join(" and ")}${
        improvements.length ? `, and work through: ${improvements[0]}` : ""
      }.`,
    });
  } else {
    // No interview scored: fall back to this role's own ship-ready work.
    const shipWeek = Array.isArray(roadmap?.weeks) ? roadmap.weeks[roadmap.weeks.length - 1] : null;
    const projectTitle = toText(shipWeek?.project?.title);
    if (projectTitle) {
      steps.push({
        kind: "project",
        priority: 45,
        tag: "portfolio",
        title: `Finish: ${projectTitle.replace(/^Ship:\s*/i, "")}`,
        detail: toText(shipWeek?.project?.description) || toText(shipWeek?.outcome),
        skill: null,
      });
    }
  }

  // 4. Prove the work with a real artefact, named from the role's own ideas.
  const portfolioIdea = Array.isArray(roadmap?.portfolioIdeas) ? roadmap.portfolioIdeas[0] : null;
  if (portfolioIdea) {
    steps.push({
      kind: "project",
      priority: 30,
      tag: "portfolio",
      title: `Build proof of ${roleTitleText} work`,
      detail: `Ship ${portfolioIdea} so a reviewer can see ${roleTitleText.toLowerCase()} skill without you explaining it.`,
    });
  } else if (!steps.length) {
    const theme = Array.isArray(roadmap?.interviewThemes) ? roadmap.interviewThemes[0] : null;
    steps.push({
      kind: "practice",
      priority: 20,
      tag: "interview",
      title: `Rehearse ${theme || `${roleTitleText} fundamentals`}`,
      detail: `Run a timed ${roleTitleText} mock interview and record what you would improve.`,
    });
  }

  const ordered = steps
    .filter((step) => step && step.title)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, Math.max(limit, 1))
    .map((step, index) => ({
      step: index + 1,
      kind: step.kind,
      tag: step.tag || null,
      skill: step.skill || null,
      title: step.title,
      detail: step.detail || "",
    }));

  return ordered;
}

export default { buildNextSteps, NEXT_STEP_COUNT };
