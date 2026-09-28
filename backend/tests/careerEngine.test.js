/**
 * Skill Gap Engine + Career Roadmap.
 *
 * The promise of the career engine is: current skills + target role -> a
 * prioritised gap list -> a 30-day plan built from those gaps. These tests hold
 * it to that, including the failure modes that would make a plan useless —
 * a plan that ignores the role, one that reteaches a skill the candidate
 * already has, or one that is identical for two different candidates.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { analyzeSkillGaps, skillsMatch, resolveRole, CAREER_ROLE_REQUIREMENTS } from "../../ai/career-engine/skillGap.js";
import { generateRoadmap, normaliseWeek, WEEK_COUNT } from "../../ai/career-engine/roadmap.js";
import { buildNextSteps } from "../../ai/career-engine/nextSteps.js";
import { formatEvaluationReport } from "../../ai/evaluation/evaluator.js";

const IMPORTANCE = ["critical", "important", "nice-to-have"];

function planFor(role, skills, context = {}) {
  const skillGaps = analyzeSkillGaps(skills, role, context);
  const roadmap = generateRoadmap(role, skillGaps, context);
  return { skillGaps, roadmap };
}

/* ------------------------------------------------------------------ *
 * Skill gap engine: current skills + target role -> gaps
 * ------------------------------------------------------------------ */

test("a target role resolves to a requirement set with all three importance bands", () => {
  const { skillGaps } = planFor("Frontend Developer", ["JavaScript"]);

  assert.equal(skillGaps.targetRoleKey, "frontend");
  assert.equal(skillGaps.roleResolved, true);
  assert.ok(skillGaps.totalRequired > 0);
  assert.ok(skillGaps.gaps.length > 0);

  for (const gap of skillGaps.gaps) {
    assert.ok(IMPORTANCE.includes(gap.importance), `bad importance: ${gap.importance}`);
    assert.ok(gap.description, `${gap.skill} needs a description`);
    assert.ok(gap.learn, `${gap.skill} needs a learning topic`);
    assert.ok(gap.practice, `${gap.skill} needs a practice activity`);
    assert.ok(gap.project, `${gap.skill} needs a project`);
    assert.ok(typeof gap.priority === "number");
  }
});

test("a skill the candidate has is matched, not reported as a gap", () => {
  const { skillGaps } = planFor("Frontend Developer", ["React", "TypeScript", "JavaScript"]);

  assert.ok(skillGaps.matchedSkills.includes("React"));
  assert.ok(skillGaps.matchedSkills.includes("TypeScript"));
  assert.ok(skillGaps.matchedSkills.includes("JavaScript"));

  for (const matched of skillGaps.matchedSkills) {
    assert.ok(
      !skillGaps.gaps.some((gap) => gap.skill === matched),
      `${matched} is both matched and a gap`
    );
  }

  assert.equal(skillGaps.matchedCount, skillGaps.matchedSkills.length);
  assert.equal(skillGaps.gapCount, skillGaps.gaps.length);
  assert.equal(skillGaps.matchedCount + skillGaps.gapCount, skillGaps.totalRequired);
});

test("readiness is the share of role requirements covered, and rises with skills", () => {
  const bare = planFor("Data Analyst", ["Excel"]).skillGaps;
  const strong = planFor("Data Analyst", [
    "Excel", "SQL", "Python", "Power BI", "Tableau", "Statistics", "Pandas",
  ]).skillGaps;

  assert.ok(bare.readiness < strong.readiness, "more skills must mean more readiness");
  assert.ok(strong.readiness <= 100 && strong.readiness >= 0);
  assert.equal(bare.readiness, Math.round((bare.matchedSkills.length / bare.totalRequired) * 100));
});

test("gaps are ranked most-important first and numbered from 1", () => {
  const { skillGaps } = planFor("Backend Developer", ["Git"]);

  assert.deepEqual(
    skillGaps.gaps.map((gap) => gap.rank),
    skillGaps.gaps.map((_, index) => index + 1)
  );

  for (let i = 1; i < skillGaps.gaps.length; i += 1) {
    assert.ok(
      skillGaps.gaps[i - 1].priority >= skillGaps.gaps[i].priority,
      "gaps must be sorted by descending priority"
    );
  }

  const bands = skillGaps.gaps.map((gap) => IMPORTANCE.indexOf(gap.importance));
  assert.deepEqual(
    bands,
    [...bands].sort((a, b) => a - b),
    "every critical gap must rank above important, and important above nice-to-have"
  );
});

test("different roles produce different gap lists", () => {
  const roles = ["Frontend Developer", "Backend Developer", "Data Analyst", "Cybersecurity Analyst"];
  const signatures = roles.map((role) =>
    planFor(role, ["Git", "Python"]).skillGaps.gaps.map((gap) => gap.skill).join(",")
  );

  assert.equal(new Set(signatures).size, roles.length, `role gap lists collided: ${signatures.join(" | ")}`);
});

test("an unknown role falls back to general rather than inventing a role", () => {
  const resolved = resolveRole("Underwater Basket Weaver", "");
  assert.equal(resolved.key, "general");
  assert.equal(resolved.resolved, false);

  const { skillGaps } = planFor("Underwater Basket Weaver", ["Git"]);
  assert.equal(skillGaps.roleResolved, false);
  assert.equal(skillGaps.gaps.length + skillGaps.matchedCount, skillGaps.totalRequired);
});

test("skill matching is alias-tolerant without false positives", () => {
  assert.ok(skillsMatch("JS", "JavaScript"));
  assert.ok(skillsMatch("Postgres", "PostgreSQL"));
  assert.ok(skillsMatch("React Native", "React"));
  assert.ok(!skillsMatch("CSS", "Tailwind CSS"), "a short name must match as a head, not a tail");
  assert.ok(!skillsMatch("", "React"));
  assert.ok(!skillsMatch("React", ""));
});

test("the gap engine survives missing, empty and malformed input", () => {
  for (const input of [null, undefined, "", [], "React, CSS, ,, HTML", 42, {}]) {
    const { skillGaps, roadmap } = planFor("Frontend Developer", input);
    assert.ok(Array.isArray(skillGaps.gaps));
    assert.ok(skillGaps.totalRequired > 0);
    assert.equal(roadmap.weeks.length, WEEK_COUNT);
  }
});

/* ------------------------------------------------------------------ *
 * Career roadmap: learning topics, projects, practice, milestones
 * ------------------------------------------------------------------ */

test("the roadmap is 4 weeks and every week carries topics, practice, a project and a milestone", () => {
  const { roadmap } = planFor("Frontend Developer", ["JavaScript", "HTML", "CSS", "Git"]);

  assert.equal(roadmap.weeks.length, WEEK_COUNT);
  assert.equal(roadmap.weeks.length, roadmap.roadmap.length);
  assert.ok(roadmap.totalHours > 0);

  for (const week of roadmap.weeks) {
    assert.ok(week.focus, `week ${week.week} has no focus`);
    assert.ok(week.skills.length, `week ${week.week} has no skills`);
    assert.ok(week.tasks.length, `week ${week.week} has no tasks`);
    assert.ok(week.project?.title, `week ${week.week} has no project`);
    assert.ok(week.outcome, `week ${week.week} has no outcome`);
    assert.ok(week.milestone, `week ${week.week} has no milestone`);
    assert.ok(week.hours > 0);

    // Learning topics, practice activities, projects and review must all appear
    // in the build weeks; the closing week proves work instead of teaching it.
    const types = new Set(week.tasks.map((task) => task.type));
    if (week.kind === "build") {
      assert.ok(types.has("learn"), `week ${week.week} schedules no learning`);
      assert.ok(types.has("practice"), `week ${week.week} schedules no practice`);
      assert.ok(types.has("project"), `week ${week.week} schedules no project`);
      assert.ok(types.has("review"), `week ${week.week} schedules no review`);
    } else {
      assert.ok(types.has("project"), `week ${week.week} schedules no project`);
      assert.ok(types.has("practice"), `week ${week.week} schedules no practice`);
    }

    for (const task of week.tasks) {
      assert.ok(task.title && task.description, `week ${week.week} has a blank task`);
      assert.ok(task.duration, `task "${task.title}" has no duration`);
    }
  }
});

test("week 4 proves the work and prepares the interview", () => {
  const { roadmap } = planFor("Data Analyst", ["Excel", "SQL"]);

  const shipWeek = roadmap.weeks[WEEK_COUNT - 1];
  assert.equal(shipWeek.week, WEEK_COUNT);
  assert.equal(shipWeek.kind, "ship");
  assert.match(shipWeek.focus, /portfolio|interview/i);
  assert.ok(
    shipWeek.tasks.some((task) => /interview/i.test(task.title + task.description)),
    "the closing week must include interview practice"
  );
});

test("the roadmap is specific to the target role", () => {
  const front = planFor("Frontend Developer", ["Git"]).roadmap;
  const cyber = planFor("Cybersecurity Analyst", ["Git"]).roadmap;

  assert.notEqual(front.targetRole, cyber.targetRole);
  assert.notDeepEqual(
    front.weeks.map((week) => week.focus),
    cyber.weeks.map((week) => week.focus)
  );
  assert.ok(front.portfolioIdeas.length > 0, "a plan must name a portfolio artefact");
});

test("a plan never reteaches a skill the candidate already has", () => {
  const owned = ["JavaScript", "HTML", "CSS", "Git"];
  const { roadmap } = planFor("Frontend Developer", owned);

  const taught = roadmap.weeks
    .filter((week) => week.kind === "build")
    .flatMap((week) => week.gapTargets)
    .map((skill) => skill.toLowerCase());

  for (const skill of taught) {
    assert.ok(!owned.some((mine) => mine.toLowerCase() === skill), `"${skill}" is already owned`);
  }
  assert.ok(roadmap.weeks[0].gapTargets.includes("React"), "week 1 should open with a real gap");
});

test("two candidates on the same role with different skills get different plans", () => {
  const weak = planFor("Frontend Developer", ["JavaScript"]);
  const strong = planFor("Frontend Developer", ["JavaScript", "React", "TypeScript", "CSS", "Git"]);

  const signature = (roadmap) => roadmap.weeks.map((week) => week.gapTargets.join("+")).join("|");
  assert.notEqual(signature(weak.roadmap), signature(strong.roadmap));
  assert.ok(strong.skillGaps.readiness > weak.skillGaps.readiness);
});

test("a candidate who already covers everything gets a depth plan, not an empty one", () => {
  const skillGaps = analyzeSkillGaps(allGeneralSkills(), "General Professional", {});
  const roadmap = generateRoadmap("General Professional", skillGaps, {});

  assert.equal(skillGaps.gaps.length, 0, "this candidate should have no gaps left");
  assert.equal(roadmap.weeks.length, WEEK_COUNT);
  assert.equal(roadmap.consolidation, true);
  for (const week of roadmap.weeks) {
    assert.ok(week.tasks.length > 0, `consolidation week ${week.week} is empty`);
  }
});

/** Everything the general role asks for, so nothing is left as a gap. */
function allGeneralSkills() {
  const requirements = CAREER_ROLE_REQUIREMENTS.general;
  return [
    ...requirements.critical,
    ...requirements.important,
    ...requirements.niceToHave,
  ].map((item) => item.skill);
}

test("normaliseWeek fills every field the UI reads, whatever it is given", () => {
  const normalised = normaliseWeek({ activities: [{ title: "Practise SQL" }] }, 2, { focus: "SQL" });

  assert.equal(normalised.week, 3);
  assert.equal(normalised.tasks.length, 1);
  assert.equal(normalised.activities.length, 1, "activities must mirror tasks");
  assert.equal(normalised.kind, "build");
  assert.ok(normalised.focus);
  assert.ok(Array.isArray(normalised.goals));

  const empty = normaliseWeek(null, 0, {});
  assert.equal(empty.week, 1);
  assert.deepEqual(empty.tasks, []);
  assert.ok(typeof empty.focus === "string" && empty.focus.length > 0);
});

/* ------------------------------------------------------------------ *
 * Next steps: recommendations composed from the candidate's own data
 * ------------------------------------------------------------------ */

test("next steps are built from this candidate's gaps and weak criteria", () => {
  const { skillGaps, roadmap } = planFor("Data Analyst", ["Excel"]);
  const evaluation = formatEvaluationReport({
    evaluation: {
      answerRelevance: { score: 8, feedback: "Direct and on topic." },
      technicalKnowledge: { score: 8, feedback: "Strong SQL fundamentals." },
      communicationClarity: { score: 3, feedback: "Long, rambling answers." },
      problemSolving: { score: 7, feedback: "Clear steps." },
      confidence: { score: 6, feedback: "Some hedging." },
      followUpHandling: { score: 7, feedback: "Good examples." },
    },
  });

  const steps = buildNextSteps({ skillGaps, evaluation, roadmap });

  assert.equal(steps.length, 4);
  for (const step of steps) {
    assert.ok(step.title, "every step needs a title");
    assert.ok(step.detail, "every step needs a detail the user can act on");
    assert.equal(typeof step.step, "number");
  }

  const text = steps.map((step) => `${step.title} ${step.detail}`).join(" ").toLowerCase();
  assert.match(text, /sql|python/, "steps must name real gaps for this role");
  assert.ok(text.includes("clarity"), "the weakest criterion must be named");
  assert.ok(text.includes("sql") || text.includes("data analyst"));
});

test("next steps never repeat and never go empty", () => {
  const { skillGaps, roadmap } = planFor("Backend Developer", ["Git"]);
  const steps = buildNextSteps({ skillGaps, evaluation: null, roadmap });
  const titles = new Set(steps.map((step) => step.title.toLowerCase()));

  assert.equal(titles.size, steps.length, "duplicate recommendations");
  assert.ok(steps.length > 0);
  assert.ok(buildNextSteps({}).length > 0, "even with no data at all there is something to do");
  assert.ok(buildNextSteps({ skillGaps: null, evaluation: undefined, roadmap: null }).length > 0);
});
