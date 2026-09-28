/**
 * Career Engine — Roadmap Generator
 *
 * Builds a 30-day (4 week) roadmap FROM the candidate's prioritised skill gaps
 * for their target role. There is no universal "week 1 / week 2 / week 3 /
 * week 4" plan anywhere in this file: the weeks are composed at request time.
 *
 *   target role + job description
 *     -> role requirements            (roleCatalog.js)
 *     -> candidate skills             (skillGap.js)
 *     -> prioritised skill gaps       (skillGap.js, ranked by importance + JD + interview)
 *     -> 4 weeks                      (this file)
 *
 * Two candidates on the same role with different gaps get different weeks, and
 * the same candidate targeting a different role gets a completely different plan.
 */

import { CAREER_ROLE_REQUIREMENTS, roleTitle, resolveExperienceLevel } from "./roleCatalog.js";
import { skillsMatch } from "./skillGap.js";

/** A 30-day plan is four weeks. */
export const WEEK_COUNT = 4;

/** How deep each week goes, by experience level (1 = junior, 4 = lead). */
const PACE = {
  1: { learn: "4 hours", practice: "3 hours", project: "4 hours", targetsPerWeek: 2, depth: "the fundamentals" },
  2: { learn: "3 hours", practice: "3 hours", project: "5 hours", targetsPerWeek: 2, depth: "working proficiency" },
  3: { learn: "2 hours", practice: "3 hours", project: "6 hours", targetsPerWeek: 2, depth: "production judgement" },
  4: { learn: "2 hours", practice: "3 hours", project: "8 hours", targetsPerWeek: 1, depth: "design-level ownership" },
};

function flattenRequirements(requirements) {
  return [
    ...(requirements.critical || []).map((item) => ({ ...item, importance: "critical" })),
    ...(requirements.important || []).map((item) => ({ ...item, importance: "important" })),
    ...(requirements.niceToHave || []).map((item) => ({ ...item, importance: "nice-to-have" })),
  ];
}

/**
 * Find the catalog entry behind a gap so we can reuse its playbook wording.
 * Falls back to the gap's own role-specific description.
 */
function resolvePlaybook(gap, requirements) {
  const all = flattenRequirements(requirements);
  const hit = all.find((item) => skillsMatch(gap.skill, item.skill)) || gap;

  return {
    skill: gap.skill,
    description: gap.description || hit.description || `${gap.skill} for the target role`,
    importance: gap.importance || hit.importance || "important",
    priority: typeof gap.priority === "number" ? gap.priority : 50,
    learn: hit.learn || gap.learn || `Work through a focused ${gap.skill} course or reference`,
    practice: hit.practice || gap.practice || `Complete hands-on ${gap.skill} exercises`,
    project: hit.project || gap.project || `Build something real that uses ${gap.skill}`,
    outcome: hit.outcome || gap.outcome || `Demonstrable ${gap.skill} on real work, not just exercises`,
  };
}

function normaliseGaps(skillGaps) {
  const raw = Array.isArray(skillGaps) ? skillGaps : Array.isArray(skillGaps?.gaps) ? skillGaps.gaps : [];

  const band = { critical: 0, important: 1, "nice-to-have": 2 };
  return raw
    .filter((gap) => gap && typeof gap.skill === "string" && gap.skill.trim())
    .map((gap, index) => ({
      ...gap,
      skill: gap.skill.trim(),
      importance: gap.importance || "important",
      _band: band[gap.importance] ?? 1,
      _priority: typeof gap.priority === "number" ? gap.priority : null,
      _index: index,
    }))
    .sort((a, b) => {
      if (a._priority !== null && b._priority !== null && a._priority !== b._priority) {
        return b._priority - a._priority;
      }
      if (a._band !== b._band) return a._band - b._band;
      return a._index - b._index;
    });
}

/** Readable week title built from the week's own gap names. */
function buildFocus(targets, roleTitleText) {
  if (!targets.length) return `${roleTitleText} fundamentals`;
  if (targets.length === 1) return targets[0].skill;
  if (targets.length === 2) return `${targets[0].skill} & ${targets[1].skill}`;
  const last = targets[targets.length - 1].skill;
  return `${targets.slice(0, -1).map((t) => t.skill).join(", ")} & ${last}`;
}

function hoursFromDuration(duration) {
  const parsed = Number.parseInt(String(duration || ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Compose one week from the gaps assigned to it.
 * `kind` is "build" for weeks 1-3 and "ship" for the closing week.
 */
function buildWeek({ weekNumber, targets, roleRequirements, experience, kind = "build", roleTitleText }) {
  const pace = PACE[experience.level] || PACE[2];
  const roleIdeas = roleRequirements.portfolioIdeas || [];
  const themes = roleRequirements.interviewThemes || [];
  const role = roleTitleText;

  if (kind === "ship") {
    const theme = themes[0] || `${role} fundamentals`;
    const projectIdea = roleIdeas[0] || `a documented ${role} portfolio project`;
    const tasks = [
      {
        type: "project",
        title: `Ship a portfolio project: ${projectIdea}`,
        description: `Finish, document, and publish ${projectIdea} so a reviewer can see your ${role} work without you explaining it.`,
        duration: pace.project,
      },
      {
        type: "practice",
        title: `Mock ${role} interview`,
        description: `Run a full mock interview and deliberately rehearse: ${theme}${themes[1] ? `, plus ${themes[1]}` : ""}.`,
        duration: pace.practice,
      },
      {
        type: "review",
        title: "Close the loop on your top gaps",
        description: targets.length
          ? `Re-test yourself on ${targets.map((t) => t.skill).join(", ")} and write down what you would still be asked to explain.`
          : `Re-test yourself on the ${role} requirements you started with and note anything you still cannot explain.`,
        duration: pace.practice,
      },
    ];

    return {
      week: weekNumber,
      kind: "ship",
      focus: `${role} portfolio & interview prep`,
      gapTargets: targets.map((t) => t.skill),
      skills: targets.length ? targets.map((t) => t.skill) : [role],
      goals: [
        `Have one public, documented ${role} project you can talk through`,
        `Rehearse the questions ${role} interviews actually ask`,
        `Re-test the highest-impact gaps from weeks 1-3`,
      ],
      tasks,
      project: {
        title: `Ship: ${projectIdea}`,
        description: `A finished, deployed ${role} project with a README explaining the problem, your decisions, and what you would do next.`,
      },
      outcome: `Walk into a ${role} interview with a shipped project and a rehearsed answer set.`,
      milestone: `Portfolio project shipped and ${role} interview rehearsed`,
      hours: tasks.reduce((sum, task) => sum + hoursFromDuration(task.duration), 0),
    };
  }

  const [lead, ...rest] = targets;

  const tasks = [
    {
      type: "learn",
      title: `Learn ${lead.skill}`,
      description: lead.learn,
      duration: pace.learn,
    },
    {
      type: "practice",
      title: `Practise ${lead.skill}`,
      description: lead.practice,
      duration: pace.practice,
    },
  ];

  for (const target of rest) {
    tasks.push({
      type: "learn",
      title: `Learn ${target.skill}`,
      description: target.learn,
      duration: pace.learn,
    });
  }

  tasks.push({
    type: "project",
    title: `Apply ${targets.length > 1 ? targets.map((t) => t.skill).join(" + ") : targets[0].skill}`,
    description: lead.project,
    duration: pace.project,
  });

  tasks.push({
    type: "review",
    title: `Self-check ${lead.skill}`,
    description: `Explain ${lead.skill} out loud in under two minutes, then note every gap you glossed over.`,
    duration: "1 hour",
  });

  return {
    week: weekNumber,
    kind: "build",
    focus: buildFocus(targets, role),
    gapTargets: targets.map((t) => t.skill),
    skills: targets.map((t) => t.skill),
    goals: targets.map((t) => t.learn),
    tasks,
    project: {
      title: `Project: ${lead.project}`,
      description: lead.project,
      outcome: lead.outcome,
    },
    outcome: lead.outcome,
    milestone: lead.outcome,
    hours: tasks.reduce((sum, task) => sum + hoursFromDuration(task.duration), 0),
  };
}

/**
 * Backfill targets once the real gaps run out, using the role's own remaining
 * requirements at a deeper level. Still role-specific — never a generic week.
 */
function buildDepthQueue(skillGaps, requirements, alreadyCovered) {
  const covered = new Set(alreadyCovered.map((gap) => gap.skill));
  return flattenRequirements(requirements)
    .filter((item) => !covered.has(item.skill) && !alreadyCovered.some((gap) => skillsMatch(gap.skill, item.skill)))
    .map((item) => ({ ...item, importance: item.importance, priority: 20, isDepth: true }));
}

/**
 * Generate a personalised 30-day roadmap.
 *
 * @param {string} targetRole free-text target role, e.g. "Cybersecurity Analyst"
 * @param {object} skillGaps  output of analyzeSkillGaps (or { gaps: [...] })
 * @param {object} context    { jobDescription, experience, evaluation }
 */
export function generateRoadmap(targetRole, skillGaps, context = {}) {
  const roleKey = skillGaps?.targetRoleKey || null;
  const roleRequirements = (roleKey && CAREER_ROLE_REQUIREMENTS[roleKey]) || CAREER_ROLE_REQUIREMENTS.general;
  const roleTitleText = roleRequirements.title || roleTitle(roleKey) || "General Professional";

  const experience = skillGaps?.experienceLevel || resolveExperienceLevel(context.experience);
  const pace = PACE[experience.level] || PACE[2];

  const gaps = normaliseGaps(skillGaps).map((gap) => resolvePlaybook(gap, roleRequirements));

  // Nothing missing? The plan becomes depth + proof, built from THIS role's
  // own requirements, rather than a universal template.
  const consolidation = gaps.length === 0;
  const realGaps = consolidation ? [] : gaps;
  const queue = consolidation
    ? flattenRequirements(roleRequirements)
        .slice(0, WEEK_COUNT * pace.targetsPerWeek)
        .map((item) => ({ ...resolvePlaybook({ ...item, priority: 30 }, roleRequirements), isDepth: true }))
    : gaps;

  const weeks = [];
  let cursor = 0;

  for (let weekNumber = 1; weekNumber < WEEK_COUNT; weekNumber += 1) {
    let targets = queue.slice(cursor, cursor + pace.targetsPerWeek);
    cursor += targets.length;

    if (targets.length === 0) {
      const backfill = buildDepthQueue(
        { gaps: realGaps },
        roleRequirements,
        queue.slice(0, cursor)
      ).slice(0, pace.targetsPerWeek);
      targets = backfill.map((item) => resolvePlaybook(item, roleRequirements));
    }

    if (targets.length === 0) {
      // Absolutely nothing left: still describe the role rather than going blank.
      targets = [resolvePlaybook({ skill: roleTitleText, importance: "important", priority: 10 }, roleRequirements)];
    }

    weeks.push(
      buildWeek({
        weekNumber,
        targets,
        roleRequirements,
        experience,
        kind: "build",
        roleTitleText,
      })
    );
  }

  const shipTargets = queue.slice(cursor, cursor + 1).map((gap) => resolvePlaybook(gap, roleRequirements));
  weeks.push(
    buildWeek({
      weekNumber: WEEK_COUNT,
      targets: shipTargets,
      roleRequirements,
      experience,
      kind: "ship",
      roleTitleText,
    })
  );

  const totalHours = weeks.reduce((sum, week) => sum + week.hours, 0);

  return {
    targetRole: roleTitleText,
    targetRoleKey: roleKey,
    targetRoleTitle: roleTitleText,
    roleRequested: targetRole || skillGaps?.roleRequested || null,
    roleResolved: skillGaps?.roleResolved ?? true,
    experienceLevel: experience,
    readiness: skillGaps?.readiness ?? null,
    matchedSkills: skillGaps?.matchedSkills || [],
    prioritizedSkills: (realGaps.length ? realGaps : queue).map((gap) => gap.skill),
    consolidation,
    weeks,
    roadmap: weeks,
    totalHours,
    keyResources: roleRequirements.resources || [],
    interviewThemes: roleRequirements.interviewThemes || [],
    portfolioIdeas: roleRequirements.portfolioIdeas || [],
    generatedFrom: [
      "target-role",
      "role-requirements",
      "candidate-skills",
      "skill-gaps",
      skillGaps?.sources?.includes("interview-evaluation") ? "interview-evaluation" : null,
      skillGaps?.sources?.includes("job-description") ? "job-description" : null,
      "experience-level",
    ].filter(Boolean),
  };
}

/**
 * Guarantee the week shape the UI and the voice agent expect, whatever produced
 * the roadmap (career engine or LLM). Fills every field rather than dropping it.
 */
export function normaliseWeek(rawWeek, index = 0, fallback = {}) {
  const week = rawWeek || {};
  const tasks = Array.isArray(week.tasks)
    ? week.tasks
    : Array.isArray(week.activities)
      ? week.activities
      : [];

  const normalisedTasks = tasks
    .filter((task) => task && (task.title || task.description))
    .map((task) => ({
      type: task.type || "practice",
      title: task.title || task.description || "Task",
      description: task.description || task.title || "",
      duration: task.duration || null,
    }));

  const gapTargets = Array.isArray(week.gapTargets) ? week.gapTargets : [];
  const skills = Array.isArray(week.skills) && week.skills.length ? week.skills : gapTargets;

  return {
    week: Number.isFinite(Number(week.week)) ? Number(week.week) : index + 1,
    kind: week.kind || "build",
    focus: week.focus || (skills.length ? skills.join(", ") : fallback.focus || "Focused practice"),
    gapTargets,
    skills,
    goals: Array.isArray(week.goals) && week.goals.length ? week.goals : [],
    tasks: normalisedTasks,
    // `activities` is the name the voice agent reads out; keep it in sync.
    activities: normalisedTasks,
    project: week.project || null,
    outcome: week.outcome || week.milestone || "",
    milestone: week.milestone || week.outcome || "",
    hours:
      Number.isFinite(Number(week.hours))
        ? Number(week.hours)
        : normalisedTasks.reduce((sum, task) => sum + hoursFromDuration(task.duration), 0),
  };
}

export default { WEEK_COUNT, generateRoadmap, normaliseWeek };
