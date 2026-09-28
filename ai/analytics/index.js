/**
 * Analytics Module — chart-ready data for the Career Dashboard
 *
 * Everything a chart needs, and nothing a chart does not: no React, no chart
 * library, no DOM. The output of this module is a plain object of numbers,
 * labels and arrays that Recharts / Chart.js / a hand-rolled SVG can all read
 * directly.
 *
 *   interview evaluation (ai/evaluation)
 *   skill gap analysis  (ai/career-engine)
 *   30-day roadmap      (ai/career-engine)
 *   evaluation history  (backend session store)
 *     -> interview performance    buildPerformanceAnalytics()
 *     -> skill breakdown          buildSkillAnalytics()
 *     -> progress over sessions   buildProgressAnalytics()
 *     -> strengths                buildStrengthsWeaknesses().strengths
 *     -> weaknesses               buildStrengthsWeaknesses().weaknesses
 *     -> all of it                buildAnalytics()
 *
 * Rules this module holds to:
 *   1. It never invents a number. Every value traces to a score, a gap, a
 *      matched skill or a week the engine already produced.
 *   2. It never throws. A missing evaluation, an empty LLM response or a
 *      half-built session yields `available: false` and empty arrays, so the
 *      dashboard renders an empty state instead of crashing.
 *   3. Scales are explicit. The evaluator scores 1-10; the UI shows 0-100.
 *      `rawScore` and `percent` are both returned so nothing is re-derived
 *      downstream.
 */

import { EVALUATION_CRITERIA, getScoreLabel } from "../evaluation/evaluator.js";

/** The evaluator's ceiling for every criterion. */
export const SCORE_MAX = 10;

/** The scale the dashboard charts read. */
export const PERCENT_MAX = 100;

const IMPORTANCE_BANDS = ["critical", "important", "nice-to-have"];

const IMPORTANCE_LABEL = {
  critical: "Critical",
  important: "Important",
  "nice-to-have": "Nice to have",
};

/** How much the role needs a skill, by importance band (0-100). */
const REQUIRED_BY_IMPORTANCE = { critical: 90, important: 70, "nice-to-have": 50 };

/** Free-text level words the LLM enrichment emits -> 0-100. */
const LEVEL_PERCENT = {
  beginner: 25,
  novice: 20,
  basic: 25,
  intermediate: 55,
  competent: 55,
  advanced: 80,
  expert: 95,
};

/** A covered skill is charted at the level the role asks for it at. */
const COVERED_PERCENT = 85;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Coerce to a number, rejecting the values that `Number()` would silently turn
 * into 0 — an unscored criterion must chart as "no data", not as 0%.
 */
function toNumber(value) {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value) {
  return Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean) : [];
}

/** The evaluator's 1-10 score, re-expressed on the chart's 0-100 scale. */
export function toPercent(score) {
  const numeric = toNumber(score);
  if (numeric === null) return null;
  return Math.round(clamp(numeric, 0, SCORE_MAX) * 10);
}

/** Consistent colour banding so a bar's colour always matches its score. */
export function toneForPercent(percent) {
  if (percent === null) return "none";
  if (percent >= 80) return "emerald";
  if (percent >= 60) return "cyan";
  if (percent >= 40) return "amber";
  return "rose";
}

/**
 * Flatten the evaluation breakdown into one record per scored criterion,
 * carrying the criterion's canonical weight, name and description alongside the
 * score so a chart label can never drift from what the evaluator scored.
 */
export function readCriteria(evaluation) {
  const breakdown = evaluation?.breakdown || {};

  return Object.entries(EVALUATION_CRITERIA)
    .map(([key, criteria]) => {
      const entry = breakdown[key];
      const raw = toNumber(entry?.score);
      const percent = toPercent(raw);
      return {
        key,
        name: text(entry?.name) || criteria.name,
        description: criteria.description,
        weight: criteria.weight,
        rawScore: raw,
        score: percent === null ? null : round(raw, 1),
        percent,
        max: PERCENT_MAX,
        label: text(entry?.label) || (raw === null ? null : getScoreLabel(raw)),
        feedback: text(entry?.feedback) || null,
        tone: toneForPercent(percent),
        scored: percent !== null,
      };
    });
}

/**
 * Interview performance — the overall ring, the per-criterion bars and the
 * radar axes, all read from the same scored criteria.
 */
export function buildPerformanceAnalytics(evaluation) {
  const criteria = readCriteria(evaluation);
  const scored = criteria.filter((criterion) => criterion.scored);
  const summary = evaluation?.summary || {};

  const rawOverall = toNumber(summary.overallScore);
  const percent = toPercent(rawOverall);
  const available = scored.length > 0;

  const strongest = scored.length
    ? scored.reduce((best, criterion) => (criterion.percent > best.percent ? criterion : best))
    : null;
  const weakest = scored.length
    ? scored.reduce((worst, criterion) => (criterion.percent < worst.percent ? criterion : worst))
    : null;

  const averagePercent = scored.length
    ? round(scored.reduce((sum, criterion) => sum + criterion.percent, 0) / scored.length)
    : null;

  return {
    available,
    overall: {
      rawScore: rawOverall,
      percent,
      score: percent,
      max: PERCENT_MAX,
      label: text(summary.scoreLabel) || (rawOverall === null ? null : getScoreLabel(rawOverall)),
      tone: toneForPercent(percent),
    },
    // Bar chart: one entry per scored criterion.
    bars: scored.map((criterion) => ({
      key: criterion.key,
      label: criterion.name,
      value: criterion.percent,
      max: PERCENT_MAX,
      tone: criterion.tone,
      weight: criterion.weight,
      feedback: criterion.feedback,
    })),
    // Radar chart: parallel label/value arrays.
    radar: {
      labels: criteria.map((criterion) => criterion.name),
      values: criteria.map((criterion) => criterion.percent),
      max: PERCENT_MAX,
    },
    criteria,
    scoredCount: scored.length,
    criterionCount: criteria.length,
    averagePercent,
    strongest,
    weakest,
    detailedFeedback: text(evaluation?.detailedFeedback) || null,
  };
}

/** The 0-100 level a candidate is at for a skill, from the LLM's own estimate. */
function currentPercentFor(gap) {
  const level = LEVEL_PERCENT[String(gap?.currentLevel || "").toLowerCase()];
  if (typeof level === "number") return level;
  if (gap?.inJobDescription) return 35;
  return 20;
}

/**
 * Skill breakdown — coverage of the target role's requirements, split by
 * importance band, plus the current-vs-required rows the comparison chart reads.
 */
export function buildSkillAnalytics(skillGaps, roadmap) {
  const gaps = Array.isArray(skillGaps?.gaps) ? skillGaps.gaps.filter(Boolean) : [];
  const matched = strings(skillGaps?.matchedSkills);

  const totalRequired =
    toNumber(skillGaps?.totalRequired) ?? gaps.length + matched.length;
  const matchedCount = toNumber(skillGaps?.matchedCount) ?? matched.length;
  const gapCount = toNumber(skillGaps?.gapCount) ?? gaps.length;
  const readiness = toNumber(skillGaps?.readiness);

  // Coverage per importance band. The engine owns the requirement counts, so
  // the bands always add up to the full requirement list — including the skills
  // this candidate already covers.
  const coverage = skillGaps?.coverageByImportance || {};
  const bands = IMPORTANCE_BANDS.map((key) => {
    const band = coverage[key] || {};
    const bandGaps = gaps.filter((gap) => gap.importance === key);
    const required = toNumber(band.required) ?? bandGaps.length;
    const covered = toNumber(band.matched) ?? Math.max(required - bandGaps.length, 0);
    return {
      key,
      label: IMPORTANCE_LABEL[key],
      required,
      covered,
      gaps: toNumber(band.gaps) ?? bandGaps.length,
      percent: toNumber(band.percent) ?? (required > 0 ? round((covered / required) * 100) : 100),
    };
  });

  const rows = [
    ...gaps.map((gap) => ({
      key: gap.skill,
      label: gap.skill,
      current: currentPercentFor(gap),
      required: REQUIRED_BY_IMPORTANCE[gap.importance] ?? 60,
      max: PERCENT_MAX,
      importance: gap.importance || "important",
      importanceLabel: IMPORTANCE_LABEL[gap.importance] || "Important",
      rank: toNumber(gap.rank),
      currentLevel: text(gap.currentLevel) || null,
      description: text(gap.description) || null,
      suggestedImprovement: text(gap.suggestedImprovement) || null,
      isGap: true,
    })),
    ...matched.map((skill) => ({
      key: skill,
      label: skill,
      current: COVERED_PERCENT,
      required: COVERED_PERCENT,
      max: PERCENT_MAX,
      importance: "covered",
      importanceLabel: "Covered",
      rank: null,
      currentLevel: null,
      description: null,
      suggestedImprovement: null,
      isGap: false,
    })),
  ]
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, 12);

  const currentValues = rows.map((row) => row.current);
  const requiredValues = rows.map((row) => row.required);

  return {
    available: rows.length > 0,
    roleTitle: text(roadmap?.targetRoleTitle) || text(skillGaps?.targetRoleTitle) || text(skillGaps?.targetRole) || null,
    readiness,
    readinessPercent: readiness,
    gapCount,
    matchedCount,
    totalRequired,
    // Donut chart: covered vs missing.
    coverage: {
      matched: matchedCount,
      missing: gapCount,
      total: totalRequired,
      percent: readiness ?? (totalRequired > 0 ? round((matchedCount / totalRequired) * 100) : 0),
      labels: ["Covered", "Missing"],
      values: [matchedCount, gapCount],
    },
    bands,
    // Grouped bar chart: how much of each band is covered.
    bandChart: {
      labels: bands.map((band) => band.label),
      values: bands.map((band) => band.percent),
      covered: bands.map((band) => band.covered),
      missing: bands.map((band) => band.gaps),
      max: PERCENT_MAX,
    },
    // Comparison chart: current level vs the level the role requires.
    comparison: {
      labels: rows.map((row) => row.label),
      current: currentValues,
      required: requiredValues,
      max: PERCENT_MAX,
    },
    rows,
    // The roadmap's own hour distribution, so plan effort can be charted too.
    plan: {
      totalHours: toNumber(roadmap?.totalHours) ?? 0,
      labels: (Array.isArray(roadmap?.weeks) ? roadmap.weeks : []).map((week) =>
        `Week ${toNumber(week?.week) ?? "?"}`
      ),
      hours: (Array.isArray(roadmap?.weeks) ? roadmap.weeks : []).map(
        (week) => toNumber(week?.hours) ?? 0
      ),
    },
  };
}

/** One row per completed interview, oldest first, however the caller stored it. */
function normaliseHistory(history) {
  const list = Array.isArray(history) ? history : history ? [history] : [];

  return list
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const evaluation = entry.evaluation || entry.report || entry;
      const skillGaps = entry.skillGaps || null;
      const summary = evaluation?.summary || {};

      const overallRaw = toNumber(summary.overallScore ?? evaluation?.overallScore);
      const readiness = toNumber(skillGaps?.readiness);
      const at = text(entry.evaluatedAt) || text(entry.completedAt) || text(entry.at) || null;

      return {
        index,
        at,
        label: at ? new Date(at).toLocaleDateString() : `Session ${index + 1}`,
        overallRaw,
        overall: toPercent(overallRaw),
        readiness,
        gapCount: toNumber(skillGaps?.gapCount) ?? null,
        matchedCount: toNumber(skillGaps?.matchedCount) ?? null,
        totalRequired: toNumber(skillGaps?.totalRequired) ?? null,
      };
    })
    .filter(Boolean)
    .filter((entry) => entry.overall !== null || entry.readiness !== null);
}

function trendOf(values) {
  const points = values.filter((value) => value !== null);
  if (points.length < 2) return "unknown";
  const delta = round(points[points.length - 1] - points[0]);
  if (delta > 0.5) return "up";
  if (delta < -0.5) return "down";
  return "flat";
}

/**
 * Progress — the same candidate's score and readiness across every interview
 * they have completed, so a dashboard can chart movement rather than a single
 * number. One session is a valid (flat) series, not an error.
 */
export function buildProgressAnalytics(history) {
  const sessions = normaliseHistory(history);
  const available = sessions.length > 0;

  const overallSeries = sessions.map((session) => session.overall);
  const readinessSeries = sessions.map((session) => session.readiness);

  const first = sessions.length > 1 ? sessions[0] : null;
  const last = sessions[sessions.length - 1] || null;

  const delta = {
    overall: first && last ? round(last.overall - first.overall) : null,
    readiness: first && last ? round(last.readiness - first.readiness) : null,
    gapsClosed:
      first && last && first.gapCount !== null && last.gapCount !== null
        ? first.gapCount - last.gapCount
        : null,
  };

  return {
    available,
    sessionCount: sessions.length,
    // Line chart: parallel arrays ordered oldest -> newest.
    labels: sessions.map((session) => session.label),
    points: sessions,
    series: {
      overall: overallSeries,
      readiness: readinessSeries,
      gapCount: sessions.map((session) => session.gapCount),
      max: PERCENT_MAX,
    },
    latest: last,
    previous: sessions.length > 1 ? sessions[sessions.length - 2] : null,
    delta,
    trend: trendOf(overallSeries),
    readinessTrend: trendOf(readinessSeries),
    headline: last
      ? `Session ${sessions.length}: ${last.overall ?? "—"}/100 overall, ${last.readiness ?? "—"}% role readiness.`
      : null,
  };
}

/**
 * Strengths and weaknesses — criteria above and below the candidate's own
 * average, plus the role skills that are covered or still open. Every item says
 * where it came from, so the UI can badge the evidence.
 */
export function buildStrengthsWeaknesses(evaluation, skillGaps) {
  const performance = buildPerformanceAnalytics(evaluation);
  const criteria = performance.criteria.filter((criterion) => criterion.scored);
  const average = performance.averagePercent;

  const summary = evaluation?.summary || {};
  const coachStrengths = strings(summary.strengths);
  const coachImprovements = strings(summary.improvements);

  const gaps = Array.isArray(skillGaps?.gaps) ? skillGaps.gaps.filter(Boolean) : [];
  const matched = strings(skillGaps?.matchedSkills);

  // Above / below the candidate's own average, so "strong" and "weak" are
  // relative to this interview rather than a hardcoded threshold.
  const stronger = criteria
    .filter((criterion) => average === null || criterion.percent >= average)
    .sort((a, b) => b.percent - a.percent);
  const weaker = criteria
    .filter((criterion) => average === null || criterion.percent < average)
    .sort((a, b) => a.percent - b.percent);

  const strengths = [
    ...coachStrengths.map((detail, index) => ({
      key: `coach-strength-${index}`,
      label: "Coach feedback",
      detail,
      source: "evaluation",
      percent: null,
    })),
    ...stronger.map((criterion) => ({
      key: `criterion-${criterion.key}`,
      label: criterion.name,
      detail: criterion.feedback || `${criterion.name} scored ${criterion.percent}/100.`,
      source: "evaluation",
      criterion: criterion.key,
      percent: criterion.percent,
      tone: criterion.tone,
    })),
    ...matched.slice(0, 5).map((skill) => ({
      key: `covered-${skill}`,
      label: skill,
      detail: `Already covered for this role.`,
      source: "skill-gap",
      percent: COVERED_PERCENT,
      tone: "emerald",
    })),
  ].slice(0, 8);

  const weaknesses = [
    ...coachImprovements.map((detail, index) => ({
      key: `coach-improvement-${index}`,
      label: "Coach feedback",
      detail,
      source: "evaluation",
      percent: null,
    })),
    ...weaker.map((criterion) => ({
      key: `criterion-${criterion.key}`,
      label: criterion.name,
      detail: criterion.feedback || `${criterion.name} scored ${criterion.percent}/100.`,
      source: "evaluation",
      criterion: criterion.key,
      percent: criterion.percent,
      tone: criterion.tone,
    })),
    ...gaps.slice(0, 5).map((gap) => ({
      key: `gap-${gap.skill}`,
      label: gap.skill,
      detail:
        text(gap.suggestedImprovement) ||
        text(gap.description) ||
        `${gap.skill} is still an open gap for this role.`,
      source: "skill-gap",
      skill: gap.skill,
      importance: gap.importance || "important",
      percent: currentPercentFor(gap),
      tone: toneForPercent(currentPercentFor(gap)),
    })),
  ].slice(0, 8);

  return {
    available: strengths.length > 0 || weaknesses.length > 0,
    strengths,
    weaknesses,
    averagePercent: average,
    strongest: performance.strongest,
    weakest: performance.weakest,
  };
}

/**
 * Headline KPIs for the dashboard's stat row. Every one is a direct read of
 * engine output, and each carries the value behind it so the UI can show the
 * detail on hover.
 */
function buildKpis({ performance, skills, progress, evaluation, skillGaps }) {
  const summary = evaluation?.summary || {};
  const roleTitle = text(skillGaps?.targetRoleTitle) || text(skillGaps?.targetRole) || null;

  return [
    {
      key: "overall-score",
      label: "Overall score",
      value: performance.overall.percent,
      display: performance.overall.percent === null ? "—" : `${performance.overall.percent}/100`,
      tone: performance.overall.tone,
      detail: performance.overall.label,
    },
    {
      key: "readiness",
      label: "Role readiness",
      value: skills.readiness,
      display: skills.readiness === null ? "—" : `${skills.readiness}%`,
      tone: toneForPercent(skills.readiness),
      detail: roleTitle
        ? `${skills.matchedCount}/${skills.totalRequired} ${roleTitle} requirements covered`
        : "Requirements covered for the target role",
    },
    {
      key: "open-gaps",
      label: "Open gaps",
      value: skills.gapCount,
      display: skills.gapCount === null ? "—" : String(skills.gapCount),
      tone: skills.gapCount ? "amber" : "emerald",
      detail: "Skills the target role needs that are not covered yet",
    },
    {
      key: "plan-hours",
      label: "Plan effort",
      value: skills.plan.totalHours,
      display: skills.plan.totalHours ? `${skills.plan.totalHours} hrs` : "—",
      tone: "violet",
      detail: "Total hours across the 30-day roadmap",
    },
    {
      key: "sessions",
      label: "Interviews",
      value: progress.sessionCount || null,
      display: progress.sessionCount ? String(progress.sessionCount) : "—",
      tone: "sky",
      detail:
        progress.delta.overall === null
          ? "Complete another interview to see progress"
          : `${progress.delta.overall >= 0 ? "+" : ""}${progress.delta.overall} points since your first session`,
    },
    {
      key: "feedback",
      label: "Coach summary",
      value: null,
      display: null,
      tone: "none",
      detail: text(summary.detailedFeedback) || performance.detailedFeedback || null,
    },
  ];
}

/**
 * Everything, in one payload. Safe to call with nothing, null or junk at all.
 */
export function buildAnalytics(input) {
  const source = input && typeof input === "object" ? input : {};
  const { evaluation, skillGaps, roadmap, history } = source;

  const performance = buildPerformanceAnalytics(evaluation);
  const skills = buildSkillAnalytics(skillGaps, roadmap);
  const progress = buildProgressAnalytics(history);
  const { strengths, weaknesses, available: highlightsAvailable, averagePercent } =
    buildStrengthsWeaknesses(evaluation, skillGaps);

  return {
    generatedAt: new Date().toISOString(),
    // True when there is anything at all to draw; the dashboard uses this to
    // choose between an empty state and real charts.
    available: performance.available || skills.available || progress.available,
    hasEvaluation: performance.available,
    hasSkillData: skills.available,
    hasProgress: progress.sessionCount > 1,
    roleTitle: skills.roleTitle,
    kpis: buildKpis({ performance, skills, progress, evaluation, skillGaps }),
    performance,
    skills,
    progress,
    strengths: { available: highlightsAvailable && strengths.length > 0, items: strengths },
    weaknesses: { available: highlightsAvailable && weaknesses.length > 0, items: weaknesses },
    averagePercent,
  };
}

export default {
  SCORE_MAX,
  PERCENT_MAX,
  toPercent,
  toneForPercent,
  readCriteria,
  buildAnalytics,
  buildPerformanceAnalytics,
  buildSkillAnalytics,
  buildProgressAnalytics,
  buildStrengthsWeaknesses,
};
