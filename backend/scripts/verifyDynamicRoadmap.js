/**
 * Regression check: the 30-day roadmap must be role-specific and gap-specific.
 *
 * Run from the backend directory:
 *   node scripts/verifyDynamicRoadmap.js
 *
 * Checks, for several target roles and several skill sets:
 *   1. skill gaps differ between roles
 *   2. 30-day roadmaps differ between roles
 *   3. roadmaps differ between two candidates with different gaps on the SAME role
 *   4. a skill the candidate already has never appears as a week-1 gap target
 *   5. every week carries focus / skills / tasks / outcome
 */

import "dotenv/config";
import { analyzeSkillGaps } from "../../ai/career-engine/skillGap.js";
import { generateRoadmap } from "../../ai/career-engine/roadmap.js";

const CASES = [
  {
    label: "Frontend Developer (strong JS, weak React)",
    role: "Frontend Developer",
    skills: ["JavaScript", "HTML", "CSS", "Git"],
  },
  {
    label: "Frontend Developer (strong React too)",
    role: "Frontend Developer",
    skills: ["JavaScript", "HTML", "CSS", "React", "TypeScript", "Git"],
  },
  {
    label: "Data Analyst",
    role: "Data Analyst",
    skills: ["Excel", "SQL"],
  },
  {
    label: "Cybersecurity Analyst",
    role: "Cybersecurity Analyst",
    skills: ["networking", "Linux"],
  },
  {
    label: "AI/ML Engineer",
    role: "AI/ML Engineer",
    skills: ["Python"],
  },
];

let failures = 0;
function check(label, condition, detail = "") {
  const mark = condition ? "PASS" : "FAIL";
  if (!condition) failures += 1;
  console.log(`  [${mark}] ${label}${detail ? ` ${detail}` : ""}`);
}

function build(candidate) {
  const gaps = analyzeSkillGaps(candidate.skills, candidate.role, { experience: "2 years" });
  const roadmap = generateRoadmap(candidate.role, gaps, { experience: "2 years" });
  return { candidate, gaps, roadmap };
}

const results = CASES.map(build);

console.log("\n=== Generated plans ===");
for (const { candidate, gaps, roadmap } of results) {
  console.log(`\n${candidate.label}`);
  console.log(`  role            : ${roadmap.targetRole} (readiness ${gaps.readiness}%)`);
  console.log(`  gaps (priority) : ${gaps.gaps.map((g) => `${g.skill}[${g.importance}]`).join(", ")}`);
  for (const week of roadmap.weeks) {
    console.log(`  week ${week.week}: ${week.focus}`);
    console.log(`           tasks   -> ${week.tasks.map((t) => t.title).join(" | ")}`);
    console.log(`           outcome -> ${week.outcome}`);
  }
}

console.log("\n=== Assertions ===");

// 1. Every week is fully populated.
for (const { candidate, roadmap } of results) {
  const complete = roadmap.weeks.every(
    (week) => week.focus && week.skills.length && week.tasks.length && week.outcome
  );
  check(
    `${candidate.label}: 4 weeks with focus/skills/tasks/outcome`,
    roadmap.weeks.length === 4 && complete
  );
}

const signature = (roadmap) =>
  roadmap.weeks.map((week) => `${week.focus}::${week.skills.join("+")}`).join(" | ");

const gapSignature = (gaps) => gaps.gaps.map((gap) => gap.skill).join(", ");

// 2. Different roles -> different gaps and different roadmaps.
for (let i = 0; i < results.length; i += 1) {
  for (let j = i + 1; j < results.length; j += 1) {
    const a = results[i];
    const b = results[j];
    const sameRole = a.candidate.role === b.candidate.role;
    const gapsSame = gapSignature(a.gaps) === gapSignature(b.gaps);
    const plansSame = signature(a.roadmap) === signature(b.roadmap);

    if (sameRole) {
      // Different skills, same role: the plan must still differ.
      check(
        `${a.candidate.label} vs ${b.candidate.label}: different gaps`,
        !gapsSame
      );
      check(
        `${a.candidate.label} vs ${b.candidate.label}: different roadmap`,
        !plansSame
      );
    } else {
      check(
        `${a.candidate.role} vs ${b.candidate.role}: different gaps`,
        !gapsSame
      );
      check(
        `${a.candidate.role} vs ${b.candidate.role}: different roadmap`,
        !plansSame
      );
    }
  }
}

// 3. A skill the candidate already has must not be a target.
for (const { candidate, roadmap, gaps } of results) {
  const owned = new Set(candidate.skills.map((s) => s.toLowerCase()));
  const taught = roadmap.weeks
    .filter((week) => week.kind === "build")
    .flatMap((week) => week.gapTargets);
  const alreadyKnown = taught.filter((skill) => owned.has(String(skill).toLowerCase()));
  check(
    `${candidate.label}: no already-owned skill scheduled`,
    alreadyKnown.length === 0,
    alreadyKnown.length ? `-> ${alreadyKnown.join(", ")}` : ""
  );
}

// 4. The headline case: strong JavaScript must not put JavaScript in week 1.
const jsCase = results.find((r) => r.candidate.label.startsWith("Frontend Developer (strong JS"));
check(
  "Strong-JS candidate: week 1 is React, not JavaScript",
  jsCase.roadmap.weeks[0].gapTargets.includes("React") &&
    !jsCase.roadmap.weeks[0].gapTargets.includes("JavaScript"),
  `-> week 1 = ${jsCase.roadmap.weeks[0].gapTargets.join(", ")}`
);

// 5. No universal week-1 across roles.
const week1s = new Set(results.map((r) => r.roadmap.weeks[0].focus));
check("Week 1 differs across all roles", week1s.size === results.length, `-> ${[...week1s].join(" || ")}`);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
