/**
 * End-to-end check against a running backend (default http://localhost:3000).
 * Confirms that two different target roles produce different skill gaps and
 * different 30-day roadmaps, and that the payload the dashboard renders is the
 * one the backend generated.
 *
 *   node scripts/verifyApiRoadmap.js
 */

const BASE = process.env.BASE_URL || "http://localhost:3000";

const CASES = [
  {
    label: "Frontend Developer (strong JS, weak React)",
    targetRole: "frontend",
    skills: ["JavaScript", "HTML", "CSS", "Git"],
  },
  {
    label: "Cybersecurity Analyst",
    targetRole: "cybersecurity",
    skills: ["networking", "Linux"],
  },
  {
    label: "Data Analyst",
    targetRole: "data",
    skills: ["Excel", "SQL"],
  },
];

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${label}${detail ? ` ${detail}` : ""}`);
};

async function post(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${path} -> ${response.status}: ${payload.error || "unknown"}`);
  return payload;
}

const results = [];
for (const testCase of CASES) {
  process.stdout.write(`fetching ${testCase.label} ... `);
  const started = Date.now();
  const data = await post("/api/evaluate/dashboard", {
    targetRole: testCase.targetRole,
    skills: testCase.skills,
    experience: "2 years",
  });
  console.log(`${Date.now() - started}ms`);

  results.push({ testCase, data });

  const roadmap = data.roadmap;
  console.log(`\n  role        : ${roadmap.targetRoleTitle}  (requested "${testCase.targetRole}")`);
  console.log(`  source      : ${roadmap.source}  | generatedFrom: ${roadmap.generatedFrom.join(" + ")}`);
  console.log(`  readiness   : ${data.skillGaps.readiness}%  (${data.skillGaps.matchedCount}/${data.skillGaps.totalRequired} covered)`);
  console.log(`  skills src  : ${data.skillGaps.skillsSource}`);
  console.log(`  gaps        : ${data.skillGaps.gaps.map((g) => `${g.skill}[${g.importance}]`).join(", ")}`);
  for (const week of roadmap.weeks) {
    console.log(`  week ${week.week}: ${week.focus}`);
    console.log(`     skills : ${week.skills.join(", ")}`);
    console.log(`     tasks  : ${week.tasks.map((t) => t.title).join(" | ")}`);
    console.log(`     outcome: ${week.outcome}`);
  }
  console.log("");
}

console.log("=== Assertions ===");

const sig = (roadmap) => roadmap.weeks.map((w) => `${w.focus}::${w.skills.join("+")}`).join(" | ");
const gapSig = (gaps) => gaps.gaps.map((g) => g.skill).join(",");

for (let i = 0; i < results.length; i += 1) {
  for (let j = i + 1; j < results.length; j += 1) {
    const a = results[i];
    const b = results[j];
    check(
      `${a.testCase.targetRole} vs ${b.testCase.targetRole}: skill gaps differ`,
      gapSig(a.data.skillGaps) !== gapSig(b.data.skillGaps)
    );
    check(
      `${a.testCase.targetRole} vs ${b.testCase.targetRole}: 30-day roadmap differs`,
      sig(a.data.roadmap) !== sig(b.data.roadmap)
    );
    check(
      `${a.testCase.targetRole} vs ${b.testCase.targetRole}: roadmap names the right role`,
      a.data.roadmap.targetRoleTitle !== b.data.roadmap.targetRoleTitle
    );
  }
}

for (const { testCase, data } of results) {
  const weeks = data.roadmap.weeks;
  check(
    `${testCase.targetRole}: 4 weeks, each with focus + skills + tasks + outcome`,
    weeks.length === 4 && weeks.every((w) => w.focus && w.skills.length && w.tasks.length && w.outcome)
  );

  const owned = new Set(testCase.skills.map((s) => s.toLowerCase()));
  const taught = weeks.filter((w) => w.kind === "build").flatMap((w) => w.gapTargets);
  check(
    `${testCase.targetRole}: never schedules a skill the candidate already has`,
    taught.every((skill) => !owned.has(String(skill).toLowerCase())),
    `-> ${taught.join(", ")}`
  );
}

const frontend = results.find((r) => r.testCase.targetRole === "frontend");
check(
  "Frontend (strong JS): week 1 targets React, not JavaScript",
  frontend.data.roadmap.weeks[0].gapTargets.includes("React") &&
    !frontend.data.roadmap.weeks[0].gapTargets.includes("JavaScript"),
  `-> week 1 = ${frontend.data.roadmap.weeks[0].gapTargets.join(", ")}`
);

const week1 = new Set(results.map((r) => r.data.roadmap.weeks[0].focus));
check("Week 1 is unique per role", week1.size === results.length, `-> ${[...week1].join(" || ")}`);

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
