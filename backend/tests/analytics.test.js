/**
 * Analytics — chart-ready data for the dashboard.
 *
 * Every chart the UI draws reads from this module, so the contract is:
 *   - the shapes are arrays a chart library can consume directly
 *   - every number traces to a score, a gap or a matched skill
 *   - missing or malformed input yields `available: false`, never a crash and
 *     never a fabricated 0%
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAnalytics,
  buildPerformanceAnalytics,
  buildProgressAnalytics,
  buildSkillAnalytics,
  buildStrengthsWeaknesses,
  readCriteria,
  toPercent,
  toneForPercent,
  PERCENT_MAX,
} from "../../ai/analytics/index.js";
import { analyzeSkillGaps } from "../../ai/career-engine/skillGap.js";
import { generateRoadmap } from "../../ai/career-engine/roadmap.js";
import { formatEvaluationReport } from "../../ai/evaluation/evaluator.js";
import { EVALUATION_CRITERIA } from "../../ai/evaluation/evaluator.js";

const CRITERION_KEYS = Object.keys(EVALUATION_CRITERIA);

function scoredEvaluation(overall = 7) {
  return formatEvaluationReport({
    evaluation: Object.fromEntries(
      CRITERION_KEYS.map((key, index) => [
        key,
        { score: Math.min(10, 5 + index), feedback: `${key} feedback` },
      ])
    ),
    strengths: ["Concrete project example"],
    improvements: ["Lead with the conclusion"],
    detailedFeedback: "Solid overall.",
    overallScore: overall,
  });
}

function analysisFixture() {
  const skillGaps = analyzeSkillGaps(["Excel", "SQL"], "Data Analyst", { experience: "2 years" });
  const roadmap = generateRoadmap("Data Analyst", skillGaps, { experience: "2 years" });
  return { evaluation: scoredEvaluation(7), skillGaps, roadmap };
}

/* ------------------------------------------------------------------ *
 * Scales
 * ------------------------------------------------------------------ */

test("scores convert to the 0-100 chart scale, and empty stays empty", () => {
  assert.equal(toPercent(10), 100);
  assert.equal(toPercent(7), 70);
  assert.equal(toPercent(0), 0);
  assert.equal(toPercent(12), 100, "out-of-range scores clamp");
  assert.equal(toPercent(-3), 0);
  assert.equal(toPercent(null), null, "an unscored criterion must not become 0%");
  assert.equal(toPercent(undefined), null);
  assert.equal(toPercent(""), null);
  assert.equal(toPercent("not a score"), null);
  assert.equal(toPercent(true), null);
});

test("tone banding is consistent so a bar's colour always matches its score", () => {
  assert.equal(toneForPercent(90), "emerald");
  assert.equal(toneForPercent(60), "cyan");
  assert.equal(toneForPercent(40), "amber");
  assert.equal(toneForPercent(20), "rose");
  assert.equal(toneForPercent(null), "none");
});

/* ------------------------------------------------------------------ *
 * Interview performance
 * ------------------------------------------------------------------ */

test("interview performance exposes bars and radar axes for every scored criterion", () => {
  const { evaluation } = analysisFixture();
  const performance = buildPerformanceAnalytics(evaluation);

  assert.equal(performance.available, true);
  assert.equal(performance.criteria.length, 7);
  assert.equal(performance.bars.length, 7);
  assert.equal(performance.radar.labels.length, performance.radar.values.length);
  assert.equal(performance.radar.max, PERCENT_MAX);

  for (const bar of performance.bars) {
    assert.ok(bar.label.length > 0);
    assert.ok(bar.value >= 0 && bar.value <= PERCENT_MAX);
    assert.equal(bar.max, PERCENT_MAX);
    assert.ok(["emerald", "cyan", "amber", "rose"].includes(bar.tone));
  }

  assert.equal(performance.overall.percent, 70);
  assert.equal(performance.overall.max, PERCENT_MAX);
  assert.ok(performance.strongest && performance.weakest);
  assert.ok(performance.strongest.percent >= performance.weakest.percent);
  // Seven criteria step 5..10 then clamp, so the bars are 50,60,70,80,90,100,100
  // and their unweighted mean is 78.6%.
  assert.equal(performance.averagePercent, 78.6);
  assert.notEqual(performance.averagePercent, performance.overall.percent,
    "the weighted overall need not equal the plain average of the bars");
});

test("performance reads the same numbers the evaluator produced", () => {
  const { evaluation } = analysisFixture();

  for (const criterion of readCriteria(evaluation)) {
    const source = evaluation.breakdown[criterion.key];
    assert.equal(criterion.score, source.score);
    assert.equal(criterion.percent, Math.round(source.score * 10));
    assert.equal(criterion.label, source.label);
    assert.equal(criterion.weight, EVALUATION_CRITERIA[criterion.key].weight);
  }
});

test("an unscored interview reports no performance rather than zeros", () => {
  const performance = buildPerformanceAnalytics(null);

  assert.equal(performance.available, false);
  assert.deepEqual(performance.bars, []);
  assert.equal(performance.overall.percent, null);
  assert.equal(performance.strongest, null);
  // The radar axis set is still complete, so a chart has a stable shape.
  assert.equal(performance.radar.labels.length, 7);
  assert.deepEqual(performance.radar.values, [null, null, null, null, null, null, null]);
});

/* ------------------------------------------------------------------ *
 * Skill breakdown
 * ------------------------------------------------------------------ */

test("the skill breakdown charts coverage, bands and current-vs-required", () => {
  const { skillGaps, roadmap } = analysisFixture();
  const skills = buildSkillAnalytics(skillGaps, roadmap);

  assert.equal(skills.available, true);
  assert.equal(skills.roleTitle, "Data Analyst");
  assert.equal(skills.gapCount + skills.matchedCount, skills.totalRequired);
  assert.equal(skills.readiness, skillGaps.readiness);

  // Coverage donut: covered vs missing.
  assert.deepEqual(skills.coverage.values, [skills.matchedCount, skills.gapCount]);
  assert.equal(skills.coverage.total, skills.totalRequired);

  // One band per importance level, each summing to the requirement count.
  assert.equal(skills.bands.length, 3);
  const bandTotal = skills.bands.reduce((sum, band) => sum + band.required, 0);
  assert.equal(bandTotal, skills.totalRequired);
  for (const band of skills.bands) {
    assert.equal(band.covered + band.gaps, band.required, `${band.label} does not add up`);
    assert.ok(band.percent >= 0 && band.percent <= 100);
  }

  // Grouped comparison chart.
  assert.equal(skills.comparison.labels.length, skills.rows.length);
  assert.equal(skills.comparison.current.length, skills.rows.length);
  assert.equal(skills.comparison.required.length, skills.rows.length);

  for (const row of skills.rows) {
    assert.ok(row.current >= 0 && row.current <= PERCENT_MAX, `${row.label} current out of range`);
    assert.ok(row.required >= 0 && row.required <= PERCENT_MAX, `${row.label} required out of range`);
  }

  // Gaps are ordered by the engine's own rank.
  const ranks = skills.rows.filter((row) => row.isGap && row.rank !== null).map((row) => row.rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));

  assert.ok(skills.plan.totalHours > 0, "plan effort must be chartable");
  assert.equal(skills.plan.hours.length, skills.plan.labels.length);
});

test("a covered skill charts at or above the level the role requires", () => {
  const { skillGaps, roadmap } = analysisFixture();
  const skills = buildSkillAnalytics(skillGaps, roadmap);

  for (const row of skills.rows.filter((item) => !item.isGap)) {
    assert.ok(row.current >= row.required, `${row.label} is covered but charts below required`);
  }
});

test("a candidate with no skill data yields an empty, non-crashing breakdown", () => {
  const skills = buildSkillAnalytics(null, null);

  assert.equal(skills.available, false);
  assert.deepEqual(skills.rows, []);
  assert.equal(skills.readiness, null);
  assert.equal(skills.comparison.labels.length, 0);
  assert.equal(skills.plan.totalHours, 0);
});

/* ------------------------------------------------------------------ *
 * Progress
 * ------------------------------------------------------------------ */

test("progress charts a series across repeated interviews", () => {
  const { skillGaps } = analysisFixture();

  const history = [
    { evaluatedAt: "2026-01-05T10:00:00.000Z", evaluation: scoredEvaluation(5), skillGaps },
    { evaluatedAt: "2026-01-12T10:00:00.000Z", evaluation: scoredEvaluation(7), skillGaps },
    { evaluatedAt: "2026-01-19T10:00:00.000Z", evaluation: scoredEvaluation(8), skillGaps },
  ];
  const progress = buildProgressAnalytics(history);

  assert.equal(progress.available, true);
  assert.equal(progress.sessionCount, 3);
  assert.deepEqual(progress.series.overall, [50, 70, 80]);
  assert.equal(progress.labels.length, 3);
  assert.equal(progress.delta.overall, 30);
  assert.equal(progress.trend, "up");
  assert.equal(progress.latest.overall, 80);
  assert.equal(progress.previous.overall, 70);
  assert.ok(progress.headline.includes("Session 3"));
});

test("a falling score reads as a downward trend", () => {
  const { skillGaps } = analysisFixture();
  const progress = buildProgressAnalytics([
    { evaluatedAt: "2026-02-01T00:00:00.000Z", evaluation: scoredEvaluation(9), skillGaps },
    { evaluatedAt: "2026-02-08T00:00:00.000Z", evaluation: scoredEvaluation(4), skillGaps },
  ]);

  assert.equal(progress.trend, "down");
  assert.equal(progress.delta.overall, -50);
});

test("one session is a valid flat series, and no sessions is an empty state", () => {
  const { skillGaps } = analysisFixture();

  const single = buildProgressAnalytics([{ evaluation: scoredEvaluation(6), skillGaps }]);
  assert.equal(single.available, true);
  assert.equal(single.sessionCount, 1);
  assert.equal(single.delta.overall, null, "no trend can be claimed from one session");
  assert.equal(single.trend, "unknown");

  for (const empty of [null, undefined, [], [{}], [null, 5, "x"]]) {
    const progress = buildProgressAnalytics(empty);
    assert.equal(progress.available, false);
    assert.deepEqual(progress.series.overall, []);
    assert.equal(progress.latest, null);
    assert.equal(progress.headline, null);
  }
});

/* ------------------------------------------------------------------ *
 * Strengths and weaknesses
 * ------------------------------------------------------------------ */

test("strengths and weaknesses are split around the candidate's own average", () => {
  const { evaluation, skillGaps } = analysisFixture();
  const { strengths, weaknesses, averagePercent } = buildStrengthsWeaknesses(evaluation, skillGaps);

  assert.equal(averagePercent, 78.6);
  assert.ok(strengths.length > 0 && weaknesses.length > 0);

  const criterionStrengths = strengths.filter((item) => item.source === "evaluation" && item.percent !== null);
  const criterionWeaknesses = weaknesses.filter((item) => item.source === "evaluation" && item.percent !== null);

  for (const item of criterionStrengths) assert.ok(item.percent >= averagePercent, `${item.label} is not above average`);
  for (const item of criterionWeaknesses) assert.ok(item.percent < averagePercent, `${item.label} is not below average`);

  // Open gaps surface as weaknesses, covered skills as strengths.
  assert.ok(weaknesses.some((item) => item.source === "skill-gap"));
  assert.ok(
    strengths.some((item) => item.detail.toLowerCase().includes("concrete project example")),
    "the coach's own strength must reach the dashboard"
  );
  for (const item of [...strengths, ...weaknesses]) {
    assert.ok(item.label && item.detail, "every item needs a label and a detail");
  }
});

test("with no evaluation the highlights fall back to the real skill data", () => {
  const { skillGaps } = analysisFixture();
  const { strengths, weaknesses } = buildStrengthsWeaknesses(null, skillGaps);

  assert.ok(strengths.length > 0, "covered skills become strengths");
  assert.ok(weaknesses.length > 0, "open gaps become weaknesses");
  assert.equal(buildStrengthsWeaknesses(null, null).available, false);
});

/* ------------------------------------------------------------------ *
 * The full payload
 * ------------------------------------------------------------------ */

test("the full payload carries KPIs plus all five chart groups", () => {
  const { evaluation, skillGaps, roadmap } = analysisFixture();
  const history = [
    { evaluatedAt: "2026-01-05T10:00:00.000Z", evaluation, skillGaps },
    { evaluatedAt: "2026-01-12T10:00:00.000Z", evaluation, skillGaps },
  ];
  const analytics = buildAnalytics({ evaluation, skillGaps, roadmap, history });

  assert.equal(analytics.available, true);
  assert.equal(analytics.hasEvaluation, true);
  assert.equal(analytics.hasSkillData, true);
  assert.equal(analytics.hasProgress, true);
  assert.ok(analytics.performance.bars.length > 0);
  assert.ok(analytics.skills.rows.length > 0);
  assert.equal(analytics.progress.sessionCount, 2);
  assert.ok(analytics.strengths.items.length > 0);
  assert.ok(analytics.weaknesses.items.length > 0);
  assert.ok(analytics.roleTitle);

  // KPIs must be chart/table ready: a label, a value and a detail.
  assert.ok(analytics.kpis.length >= 5);
  for (const kpi of analytics.kpis) {
    assert.ok(kpi.key && kpi.label);
    assert.ok("value" in kpi && "display" in kpi);
  }
  const overall = analytics.kpis.find((kpi) => kpi.key === "overall-score");
  assert.equal(overall.display, "70/100");
  const readiness = analytics.kpis.find((kpi) => kpi.key === "readiness");
  assert.match(readiness.display, /%/);
});

test("buildAnalytics with no data at all is a clean empty state", () => {
  const analytics = buildAnalytics();

  assert.equal(analytics.available, false);
  assert.equal(analytics.hasEvaluation, false);
  assert.equal(analytics.hasSkillData, false);
  assert.equal(analytics.hasProgress, false);
  assert.deepEqual(analytics.performance.bars, []);
  assert.deepEqual(analytics.skills.rows, []);
  assert.equal(analytics.progress.sessionCount, 0);
  assert.deepEqual(analytics.strengths.items, []);
  assert.deepEqual(analytics.weaknesses.items, []);
  assert.ok(analytics.generatedAt);
});

test("buildAnalytics never throws on malformed payloads", () => {
  const junk = [null, undefined, 0, "", "x", [], { evaluation: 5 }, { skillGaps: "nope" }, { roadmap: [] }];

  for (const input of junk) {
    const analytics = buildAnalytics(input);
    assert.equal(typeof analytics, "object");
    assert.equal(analytics.available, false);
  }
});
