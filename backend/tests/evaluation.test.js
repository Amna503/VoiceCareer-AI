/**
 * Interview Evaluation — structure, scoring and consistency.
 *
 * The dashboard, the voice agent and the analytics charts all read the report
 * this module builds, so these tests pin the contract: seven criteria, a
 * weighted overall score, consistent labels, and no way for a bad model
 * response to produce a score outside the 0-10 scale.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  EVALUATION_CRITERIA,
  SCORE_MAX,
  calculateOverallScore,
  formatEvaluationReport,
  getScoreColor,
  getScoreLabel,
  normaliseCriterionScore,
} from "../../ai/evaluation/evaluator.js";

const CRITERION_KEYS = Object.keys(EVALUATION_CRITERIA);

function evaluationWith(scores, extra = {}) {
  return {
    overallScore: scores.overall,
    evaluation: Object.fromEntries(
      CRITERION_KEYS.map((key) => [key, { score: scores[key], feedback: `${key} feedback` }])
    ),
    strengths: ["specific example used"],
    improvements: ["lead with the conclusion"],
    detailedFeedback: "A readable summary.",
    ...extra,
  };
}

test("the evaluation model covers all seven scored criteria with positive weights", () => {
  assert.equal(CRITERION_KEYS.length, 7);

  const totalWeight = Object.values(EVALUATION_CRITERIA).reduce((sum, c) => sum + c.weight, 0);
  assert.ok(Math.abs(totalWeight - 1) < 1e-9, `weights must sum to 1, got ${totalWeight}`);

  for (const criteria of Object.values(EVALUATION_CRITERIA)) {
    assert.ok(criteria.weight > 0, `${criteria.name} needs a positive weight`);
    assert.ok(criteria.name.length > 0);
    assert.ok(criteria.description.length > 0);
  }
});

test("the seven required criteria are all present and named", () => {
  const names = CRITERION_KEYS.map((key) => EVALUATION_CRITERIA[key].name);
  for (const expected of [
    "Technical Knowledge",
    "Communication Clarity",
    "Answer Structure",
    "Answer Relevance",
    "Problem Solving",
    "Follow-up Handling",
    "Confidence",
  ]) {
    assert.ok(names.includes(expected), `missing criterion: ${expected}`);
  }
});

test("structure and clarity are scored as separate criteria", () => {
  // They answer different questions: organisation vs comprehensibility. A coach
  // can only tell a candidate which one to fix if they are reported separately.
  const structure = EVALUATION_CRITERIA.answerStructure;
  const clarity = EVALUATION_CRITERIA.communicationClarity;

  assert.ok(structure, "answerStructure must be a scored criterion");
  assert.notEqual(structure.name, clarity.name);
  assert.ok(
    structure.description !== clarity.description,
    "structure and clarity need distinct descriptions so the model does not collapse them",
  );

  // The two must be independently reportable: scoring one and not the other
  // yields a report that carries exactly the criterion that was scored.
  const report = formatEvaluationReport({
    evaluation: {
      answerStructure: { score: 9, feedback: "Situation, reasoning, conclusion." },
    },
  });

  assert.ok(report.breakdown.answerStructure);
  assert.equal(report.breakdown.answerStructure.score, 9);
  assert.equal(report.breakdown.communicationClarity, undefined);
});

test("formatEvaluationReport emits every scored criterion with a name, label and colour", () => {
  const report = formatEvaluationReport(
    evaluationWith({
      answerRelevance: 7,
      technicalKnowledge: 8,
      problemSolving: 7,
      answerStructure: 6,
      communicationClarity: 6,
      followUpHandling: 7,
      confidence: 6,
    })
  );

  assert.equal(Object.keys(report.breakdown).length, 7);
  for (const key of CRITERION_KEYS) {
    const entry = report.breakdown[key];
    assert.ok(entry, `breakdown is missing ${key}`);
    assert.equal(entry.name, EVALUATION_CRITERIA[key].name);
    assert.equal(entry.weight, EVALUATION_CRITERIA[key].weight);
    assert.equal(entry.label, getScoreLabel(entry.score));
    assert.equal(entry.color, getScoreColor(entry.score));
    assert.ok(entry.feedback.length > 0, `${key} needs feedback the UI can show`);
  }

  assert.deepEqual(report.summary.strengths, ["specific example used"]);
  assert.deepEqual(report.summary.improvements, ["lead with the conclusion"]);
  assert.equal(report.detailedFeedback, "A readable summary.");
});

test("the overall score is the weighted mean of the criterion scores", () => {
  // 7*.18 + 8*.22 + 7*.15 + 6*.13 + 6*.13 + 7*.11 + 6*.08 = 6.88 -> 6.9
  const evaluation = evaluationWith({
    answerRelevance: 7,
    technicalKnowledge: 8,
    problemSolving: 7,
    answerStructure: 6,
    communicationClarity: 6,
    followUpHandling: 7,
    confidence: 6,
  });

  assert.equal(calculateOverallScore(evaluation.evaluation), 6.9);
  assert.equal(formatEvaluationReport(evaluation).summary.overallScore, 6.9);
  assert.equal(formatEvaluationReport(evaluation).summary.scoreLabel, "Average");
});

test("a partial evaluation is still a correct weighted mean over the criteria present", () => {
  const partial = {
    technicalKnowledge: { score: 8 }, // weight 0.22
    problemSolving: { score: 4 }, // weight 0.15
  };

  // (8*0.22 + 4*0.15) / 0.37 = 6.378 -> 6.4
  assert.equal(calculateOverallScore(partial), 6.4);
  assert.equal(calculateOverallScore({}), 0);
  assert.equal(calculateOverallScore(null), 0);
});

test("scores are clamped to the 0-10 scale whatever the model returns", () => {
  const cases = [
    [12, 10],
    [-4, 0],
    ["8", 8],
    [0, 0],
    [Number.NaN, null],
    [null, null],
    [undefined, null],
    ["not a score", null],
    [Infinity, null],
  ];

  for (const [input, expected] of cases) {
    assert.equal(normaliseCriterionScore(input), expected, `score ${String(input)}`);
  }

  const wild = formatEvaluationReport(
    evaluationWith({
      answerRelevance: 42,
      technicalKnowledge: -10,
      communicationClarity: "7.5",
      problemSolving: null,
      confidence: undefined,
      followUpHandling: "nonsense",
    })
  );

  for (const entry of Object.values(wild.breakdown)) {
    assert.ok(entry.score >= 0 && entry.score <= SCORE_MAX, `unclamped score ${entry.score}`);
  }
  // The three unusable criteria are dropped rather than reported as zero.
  assert.equal(Object.keys(wild.breakdown).length, 3);
  assert.ok(wild.summary.overallScore >= 0 && wild.summary.overallScore <= SCORE_MAX);
});

test("a model-supplied overall score is trusted but bounded", () => {
  const clamped = formatEvaluationReport(evaluationWith({ overall: 99 })).summary.overallScore;
  assert.equal(clamped, 10);

  const recomputed = formatEvaluationReport({
    evaluation: {
      technicalKnowledge: { score: 8 },
      answerRelevance: { score: 8 },
      problemSolving: { score: 8 },
      answerStructure: { score: 8 },
      communicationClarity: { score: 8 },
      followUpHandling: { score: 8 },
      confidence: { score: 8 },
    },
  }).summary.overallScore;
  assert.equal(recomputed, 8, "an absent overallScore must be derived, not left undefined");
});

test("score labels are consistent at every boundary", () => {
  assert.equal(getScoreLabel(10), "Excellent");
  assert.equal(getScoreLabel(9), "Excellent");
  assert.equal(getScoreLabel(8.9), "Good");
  assert.equal(getScoreLabel(7), "Good");
  assert.equal(getScoreLabel(6.9), "Average");
  assert.equal(getScoreLabel(5), "Average");
  assert.equal(getScoreLabel(4.9), "Below Average");
  assert.equal(getScoreLabel(3), "Below Average");
  assert.equal(getScoreLabel(2.9), "Needs Improvement");
  assert.equal(getScoreLabel(0), "Needs Improvement");
});

test("the same evaluation always produces byte-identical output", () => {
  const evaluation = evaluationWith({
    answerRelevance: 6,
    technicalKnowledge: 9,
    problemSolving: 8,
    answerStructure: 5,
    communicationClarity: 5,
    followUpHandling: 4,
    confidence: 7,
  });

  const first = JSON.stringify(formatEvaluationReport(evaluation));
  for (let i = 0; i < 25; i += 1) {
    assert.equal(JSON.stringify(formatEvaluationReport(evaluation)), first, `run ${i} drifted`);
  }
});

test("formatEvaluationReport never throws on junk input", () => {
  for (const junk of [null, undefined, {}, { evaluation: null }, { evaluation: "nope" }, 0, "x", []]) {
    const report = formatEvaluationReport(junk);
    assert.equal(typeof report, "object");
    assert.equal(typeof report.summary.overallScore, "number");
    assert.equal(typeof report.breakdown, "object");
    assert.ok(Array.isArray(report.summary.strengths));
    assert.ok(Array.isArray(report.summary.improvements));
  }
});
