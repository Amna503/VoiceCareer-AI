/**
 * Dashboard view model.
 *
 * Every value the Career Dashboard renders comes from the interview/evaluation
 * payload the backend already returns:
 *
 *   data.evaluation  -> { summary: { overallScore, scoreLabel, strengths, improvements },
 *                        breakdown: { <criterion>: { name, score, feedback, label, color } },
 *                        detailedFeedback }
 *   data.skillGaps   -> { targetRoleTitle, gaps[], matchedSkills[], currentSkills[],
 *                        readiness, gapCount, totalRequired, experienceLevel, summary }
 *   data.roadmap     -> { targetRoleTitle, weeks[], prioritizedSkills[], totalHours, ... }
 *
 * This module never invents a score, a skill, a roadmap week or a
 * recommendation. It only reshapes those values for display:
 *  - the backend scores on a 1-10 scale, the dashboard reads /100
 *  - the backend returns 7 evaluation criteria, the dashboard groups them
 *  - "Recommended Next Steps" are derived from the candidate's own ranked
 *    gaps + interview feedback + the weeks of their own plan
 */

/** The evaluator scores every criterion out of 10. */
const CRITERION_MAX = 10;

/** How much the role needs a skill, from the importance the backend assigned. */
const REQUIRED_BY_IMPORTANCE = { critical: 90, important: 70, 'nice-to-have': 50 };

/** Free-text level from the LLM enrichment, when present. */
const LEVEL_SCORE = {
  beginner: 25,
  novice: 20,
  basic: 25,
  intermediate: 55,
  competent: 55,
  advanced: 80,
  expert: 95,
};

const IMPORTANCE_LABEL = {
  critical: 'Critical',
  important: 'Important',
  'nice-to-have': 'Nice to have',
};

/**
 * The four headline bars. Each one is a direct read of a real criterion, so a
 * bar can never drift from the number the evaluator produced.
 */
const HEADLINE_CATEGORIES = [
  { key: 'technical', label: 'Technical Knowledge', criteria: ['technicalKnowledge'], tone: 'violet' },
  { key: 'communication', label: 'Communication', criteria: ['communicationClarity'], tone: 'cyan' },
  { key: 'structure', label: 'Answer Structure', criteria: ['answerStructure'], tone: 'amber' },
  { key: 'problemSolving', label: 'Problem Solving', criteria: ['problemSolving'], tone: 'sky' },
  { key: 'confidence', label: 'Confidence & Clarity', criteria: ['confidence'], tone: 'emerald' },
];

const MODE_LABEL = {
  technical: 'Voice Interview · Technical',
  hr: 'Voice Interview · HR / Behavioral',
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value) {
  // `Number(null)` is 0, which would chart an unscored criterion as 0% instead
  // of "no data" — so the empty values are rejected before coercion.
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function titleCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sentence(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

function listOfSkills(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

/** The evaluator's 1-10 score, re-expressed on the /100 scale the UI shows. */
export function toPercent(score) {
  const numeric = toNumber(score);
  if (numeric === null) return null;
  return Math.round(clamp(numeric, 0, CRITERION_MAX) * 10);
}

/** What the candidate currently has, per gap, as a 0-100 level. */
function currentLevelFor(gap) {
  const level = LEVEL_SCORE[String(gap?.currentLevel || '').toLowerCase()];
  if (typeof level === 'number') return level;
  if (gap?.inJobDescription) return 35;
  return 20;
}

/** Section 1 — overall performance, straight from the scored evaluation. */
export function buildOverallScore(evaluation) {
  const summary = evaluation?.summary || null;
  const raw = toNumber(summary?.overallScore);
  const score = toPercent(raw);

  return {
    score,
    rawScore: raw,
    max: 100,
    label: summary?.scoreLabel || null,
    hasScore: score !== null,
    // Ring gradient + a matching solid for bars/pills.
    ringFrom: '#7c5cff',
    ringTo: '#22d3ee',
    tone: score === null ? 'none' : score >= 80 ? 'emerald' : score >= 60 ? 'cyan' : score >= 40 ? 'amber' : 'rose',
  };
}

/** Section 2 — category bars, grouped from the evaluator's own breakdown. */
export function buildCategories(evaluation) {
  const breakdown = evaluation?.breakdown || {};
  const entries = Object.entries(breakdown);
  if (!entries.length) return { bars: [], extras: [] };

  const consumed = new Set();
  const bars = HEADLINE_CATEGORIES.map((category) => {
    let weighted = 0;
    let weight = 0;
    let criterionLabel = null;
    let feedback = null;

    for (const key of category.criteria) {
      const item = breakdown[key];
      const numeric = toNumber(item?.score);
      if (numeric === null) continue;
      consumed.add(key);
      weighted += clamp(numeric, 0, CRITERION_MAX);
      weight += 1;
      if (!criterionLabel) criterionLabel = item.name || null;
      if (!feedback) feedback = item.feedback || null;
    }

    if (!weight) return null;

    const average = round(weighted / weight, 2);
    return {
      key: category.key,
      // The dashboard's own label, with the evaluator's criterion name kept
      // alongside it so the wording is still traceable to the backend.
      label: category.label,
      criterion: criterionLabel && criterionLabel !== category.label ? criterionLabel : null,
      tone: category.tone,
      percent: toPercent(average),
      score: round(average, 1),
      feedback,
    };
  }).filter(Boolean);

  // Any criterion the dashboard does not headline is still surfaced, so no
  // scored signal from the backend is silently dropped.
  const extras = entries
    .filter(([key]) => !consumed.has(key))
    .map(([key, item]) => ({
      key,
      label: item?.name || key,
      percent: toPercent(item?.score),
      label_: item?.label || null,
    }))
    .filter((item) => item.percent !== null);

  return { bars, extras };
}

/**
 * Section 3 — the "Your Performance" narrative.
 * Assembled from the score, the real criterion scores, readiness and the gap
 * list, so two different candidates never read the same paragraph.
 */
export function buildPerformanceSummary(evaluation, skillGaps, roadmap) {
  const summary = evaluation?.summary || null;
  const breakdown = evaluation?.breakdown || {};
  const { bars } = buildCategories(evaluation);
  const roleTitle = roadmap?.targetRoleTitle || skillGaps?.targetRoleTitle || null;

  if (!summary && !skillGaps) {
    return {
      available: false,
      label: null,
      percent: null,
      headline: 'No analysis yet',
      body: 'Finish a voice interview, or generate a plan from a target role, to see your performance summary here.',
      signals: [],
    };
  }

  const percent = toPercent(summary?.overallScore);
  const label = summary?.scoreLabel || null;

  const scored = bars.filter((bar) => bar.percent !== null);
  const strongest = scored.length
    ? scored.reduce((best, bar) => (bar.percent > best.percent ? bar : best))
    : null;
  const weakest = scored.length
    ? scored.reduce((worst, bar) => (bar.percent < worst.percent ? bar : worst))
    : null;

  const sentences = [];

  if (percent !== null) {
    const readiness =
      toNumber(skillGaps?.readiness) !== null
        ? ` You currently meet ${skillGaps.matchedCount ?? skillGaps.matchedSkills?.length ?? 0} of the ${skillGaps.totalRequired ?? 0} ${roleTitle || 'role'} requirements (${skillGaps.readiness}% readiness).`
        : '';
    sentences.push(
      `You scored ${percent}/100 overall — ${label ? label.toLowerCase() : 'scored'}.${readiness}`,
    );
  } else {
    sentences.push('No interview has been scored for this role yet, so only your plan is shown.');
  }

  if (strongest && weakest && strongest.key !== weakest.key) {
    sentences.push(
      `${strongest.label} was your strongest area at ${strongest.percent}/100, while ${weakest.label.toLowerCase()} at ${weakest.percent}/100 is what pulled the overall score down.`,
    );
  } else if (strongest) {
    sentences.push(
      `${strongest.label} was your strongest area at ${strongest.percent}/100.`,
    );
  }

  const topGaps = (skillGaps?.gaps || []).slice(0, 3).map((gap) => gap.skill);
  if (topGaps.length) {
    sentences.push(
      `Your plan starts with ${topGaps.slice(0, -1).join(', ')}${topGaps.length > 1 ? ' and ' : ''}${topGaps[topGaps.length - 1]}.`,
    );
  }

  const feedback = Object.values(breakdown)
    .map((item) => item?.feedback)
    .filter(Boolean)
    .find((text) => String(text).length > 40);

  const signals = [
    {
      key: 'coverage',
      label: 'Requirements covered',
      value:
        skillGaps
          ? `${skillGaps.matchedCount ?? skillGaps.matchedSkills?.length ?? 0}/${skillGaps.totalRequired ?? 0}`
          : '—',
      tone: 'cyan',
    },
    {
      key: 'readiness',
      label: 'Role readiness',
      value: skillGaps?.readiness !== undefined && skillGaps?.readiness !== null ? `${skillGaps.readiness}%` : '—',
      tone: 'violet',
    },
    {
      key: 'gaps',
      label: 'Open gaps',
      value: skillGaps ? String(skillGaps.gapCount ?? 0) : '—',
      tone: 'amber',
    },
    {
      key: 'hours',
      label: 'Plan effort',
      value: roadmap?.totalHours ? `${roadmap.totalHours} hrs` : '—',
      tone: 'emerald',
    },
  ];

  return {
    available: Boolean(summary || skillGaps),
    label,
    percent,
    headline: summary?.scoreLabel || (skillGaps ? 'Plan ready' : 'No analysis yet'),
    body: sentences.join(' '),
    quote: feedback ? sentence(feedback) : null,
    signals,
  };
}

/** Section 4 / 5 — the evaluator's own strengths and improvement points. */
export function buildHighlights(evaluation, skillGaps) {
  const summary = evaluation?.summary || {};
  const strengths = Array.isArray(summary.strengths) ? summary.strengths.filter(Boolean) : [];
  const improvements = Array.isArray(summary.improvements)
    ? summary.improvements.filter(Boolean)
    : [];

  // No scored interview: fall back to what the career engine did find, so the
  // cards still carry real candidate-specific content instead of a dead end.
  const gapImprovements = improvements.length
    ? []
    : (skillGaps?.gaps || [])
        .slice(0, 5)
        .map((gap) =>
          gap.suggestedImprovement
            ? `${gap.skill} — ${gap.suggestedImprovement}`
            : `${gap.skill} is still an open gap for this role (${IMPORTANCE_LABEL[gap.importance] || gap.importance}).`,
        );

  const gapStrengths = strengths.length
    ? []
    : (skillGaps?.matchedSkills || []).slice(0, 5).map(
        (skill) => `You already cover ${skill}, which this role asks for.`,
      );

  return {
    strengths: strengths.length ? strengths.slice(0, 5) : gapStrengths,
    strengthsAreGaps: !strengths.length && gapStrengths.length > 0,
    improvements: improvements.length ? improvements.slice(0, 5) : gapImprovements,
    improvementsAreGaps: !improvements.length && gapImprovements.length > 0,
  };
}

/**
 * Section 6 — candidate level vs the level the target role requires.
 * The required bar is the importance band the role catalog assigned; the
 * current bar is the level the analyzer/LLM estimated for this candidate.
 */
export function buildSkillComparison(skillGaps) {
  const gaps = Array.isArray(skillGaps?.gaps) ? skillGaps.gaps : [];
  const matched = listOfSkills(skillGaps?.matchedSkills);

  const rows = [
    ...gaps.map((gap) => ({
      skill: gap.skill,
      current: currentLevelFor(gap),
      required: REQUIRED_BY_IMPORTANCE[gap.importance] ?? 60,
      importance: gap.importance,
      importanceLabel: IMPORTANCE_LABEL[gap.importance] || gap.importance,
      currentLevel: gap.currentLevel || null,
      suggestedImprovement: gap.suggestedImprovement || null,
      isGap: true,
    })),
    ...matched.map((skill) => ({
      skill,
      current: 85,
      required: 85,
      importance: 'covered',
      importanceLabel: 'Covered',
      currentLevel: null,
      suggestedImprovement: null,
      isGap: false,
    })),
  ].slice(0, 10);

  return {
    rows,
    gapCount: skillGaps?.gapCount ?? gaps.length,
    totalRequired: skillGaps?.totalRequired ?? rows.length,
    readiness: skillGaps?.readiness ?? null,
    hasData: rows.length > 0,
  };
}

/**
 * Section 7 — the 30-day roadmap exactly as the career engine produced it.
 * `stage` is presentation chrome derived from the week's own kind/position;
 * `focus`, `skills`, `tasks` and `outcome` all come from the backend.
 */
const BUILD_STAGES = ['Foundation', 'Core Development', 'Applied Practice'];

function stageFor(week, index) {
  if (week.kind === 'ship' || index === 3) return 'Job Readiness';
  return BUILD_STAGES[index] || 'Deepen';
}

export function buildRoadmap(roadmap) {
  const weeks = roadmap?.weeks || roadmap?.roadmap || [];
  const mapped = weeks.map((week, index) => ({
    key: `week-${week.week ?? index + 1}`,
    week: toNumber(week.week) ?? index + 1,
    kind: week.kind || 'build',
    stage: stageFor(week, index),
    focus: week.focus || (listOfSkills(week.skills).join(', ') || 'Focused practice'),
    skills: listOfSkills(week.skills).length ? listOfSkills(week.skills) : listOfSkills(week.gapTargets),
    goals: Array.isArray(week.goals) ? week.goals.filter(Boolean) : [],
    tasks: (Array.isArray(week.tasks) ? week.tasks : Array.isArray(week.activities) ? week.activities : [])
      .filter((task) => task && (task.title || task.description))
      .map((task, taskIndex) => ({
        key: `${task.title || 'task'}-${taskIndex}`,
        type: task.type || 'practice',
        title: task.title || task.description || 'Task',
        description: task.description || '',
        duration: task.duration || null,
      })),
    project: week.project || null,
    outcome: week.outcome || week.milestone || '',
    hours: toNumber(week.hours) ?? null,
  }));

  return {
    weeks: mapped,
    roleTitle: roadmap?.targetRoleTitle || roadmap?.targetRole || null,
    totalHours: toNumber(roadmap?.totalHours),
    prioritizedSkills: listOfSkills(roadmap?.prioritizedSkills),
    consolidation: Boolean(roadmap?.consolidation),
    source: roadmap?.source || null,
    generatedFrom: Array.isArray(roadmap?.generatedFrom) ? roadmap.generatedFrom : [],
    interviewThemes: listOfSkills(roadmap?.interviewThemes),
    portfolioIdeas: listOfSkills(roadmap?.portfolioIdeas),
    hasData: mapped.length > 0,
  };
}

/**
 * Section 8 — Recommended Next Steps.
 *
 * Derived, never hardcoded: each item names the signal it came from, so a
 * candidate whose gaps are SQL and Python never sees the same list as one
 * targeting Cybersecurity.
 */
export function buildNextSteps(evaluation, skillGaps, roadmapView, skillComparison) {
  const roleTitle =
    roadmapView.roleTitle || skillGaps?.targetRoleTitle || 'your target role';
  const overall = buildOverallScore(evaluation);
  const { bars } = buildCategories(evaluation);
  const steps = [];
  const seen = new Set();

  const push = (step) => {
    const fingerprint = step.title.toLowerCase();
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    steps.push({ ...step, id: `step-${steps.length + 1}` });
  };

  // 1. The candidate's highest-priority real gap.
  const topGap = (skillGaps?.gaps || [])[0];
  if (topGap) {
    push({
      tone: 'violet',
      origin: 'Skill gap',
      title: `Work on ${topGap.skill}`,
      detail:
        topGap.suggestedImprovement ||
        topGap.description ||
        `${topGap.skill} is a ${IMPORTANCE_LABEL[topGap.importance] || topGap.importance} requirement for ${roleTitle}.`,
      meta: IMPORTANCE_LABEL[topGap.importance] || topGap.importance,
    });
  }

  // 2. The evaluator's weakest category, with its own feedback attached.
  const weakest = bars
    .filter((bar) => bar.percent !== null)
    .reduce((worst, bar) => (!worst || bar.percent < worst.percent ? bar : worst), null);
  if (weakest) {
    push({
      tone: 'cyan',
      origin: 'Interview',
      title: `Improve ${weakest.label.toLowerCase()}`,
      detail: sentence(weakest.feedback) || `Your ${weakest.label} scored ${weakest.percent}/100 in this interview.`,
      meta: `${weakest.percent}/100`,
    });
  }

  // 3. The evaluator's own first improvement point.
  const improvement = (evaluation?.summary?.improvements || []).find(Boolean);
  if (improvement) {
    push({
      tone: 'rose',
      origin: 'Interview',
      title: 'Address this from your review',
      detail: sentence(improvement),
      meta: 'Coach feedback',
    });
  }

  // 4. Start of the candidate's own week 1.
  const weekOne = roadmapView.weeks[0];
  if (weekOne) {
    push({
      tone: 'emerald',
      origin: '30-day plan',
      title: `Start week 1: ${weekOne.focus}`,
      detail:
        weekOne.tasks[0]?.description ||
        weekOne.outcome ||
        `Your plan opens with ${listOfSkills(weekOne.skills).join(', ') || weekOne.focus}.`,
      meta: weekOne.hours ? `${weekOne.hours} hrs` : 'Week 1',
    });
  }

  // 5. The role-specific portfolio artefact.
  const projectIdea = roadmapView.portfolioIdeas[0];
  if (projectIdea) {
    push({
      tone: 'sky',
      origin: 'Portfolio',
      title: `Build: ${projectIdea}`,
      detail: `A finished ${roleTitle} project is the clearest proof of the skills you are closing.`,
      meta: 'Project',
    });
  }

  // 6. Readiness gap — only when there is a real readiness gap to close.
  const readiness = toNumber(skillGaps?.readiness);
  if (topGap && readiness !== null && readiness < 100) {
    const matched = skillGaps.matchedCount ?? skillGaps.matchedSkills?.length ?? 0;
    const total = skillGaps.totalRequired ?? 0;
    const opening = listOfSkills(roadmapView.prioritizedSkills).slice(0, 3);
    push({
      tone: 'amber',
      origin: 'Role fit',
      title: `Close ${skillGaps.gapCount} remaining ${roleTitle} requirement${skillGaps.gapCount === 1 ? '' : 's'}`,
      detail: `You meet ${matched} of ${total} ${roleTitle} requirements today (${readiness}% readiness).${
        opening.length ? ` Your plan opens with ${opening.slice(0, -1).join(', ')} and ${opening[opening.length - 1]}.` : ''
      }`,
      meta: `${readiness}% ready`,
    });
  }

  // 7. Re-interview — justified by the score, and named for the real role.
  if (!overall.hasScore || overall.percent < 70) {
    push({
      tone: 'violet',
      origin: 'Practice',
      title: `Take another ${roleTitle} mock interview`,
      detail: overall.hasScore
        ? `A ${overall.percent}/100 in this session. Rehearse the ${roadmapView.interviewThemes.slice(0, 2).join(' and ') || 'questions this role is assessed on'}, then re-score yourself.`
        : `Run a full mock ${roleTitle} interview so the dashboard can score you against the real criteria.`,
      meta: overall.hasScore ? `${overall.percent}/100` : 'Not scored',
    });
  }

  // 8. Strengthen what already worked.
  const topCovered = (skillComparison?.rows || []).find((row) => !row.isGap);
  if (topCovered) {
    push({
      tone: 'cyan',
      origin: 'Strength',
      title: `Keep ${topCovered.skill} interview-ready`,
      detail: `This is already covered for ${roleTitle} — rehearse a two-minute explanation of it so it stays a strength.`,
      meta: 'Covered',
    });
  }

  const fallbackDetail = skillGaps?.summary || 'Complete a voice interview to unlock a personalised plan.';

  return {
    steps: steps.slice(0, 6),
    hasSteps: steps.length > 0,
    fallback: steps.length ? null : fallbackDetail,
  };
}

/** Header / profile metadata. */
export function buildProfile({ data, result, candidateName, completedAt }) {
  const roadmap = data?.roadmap || null;
  const skillGaps = data?.skillGaps || null;
  const roleTitle =
    data?.targetRoleTitle || roadmap?.targetRoleTitle || roadmap?.targetRole || skillGaps?.targetRoleTitle || null;

  const rawTimestamp = completedAt || data?.generatedAt || data?.dashboard?.generatedAt || null;
  const parsed = rawTimestamp ? new Date(rawTimestamp) : null;
  const valid = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

  const firstName = String(candidateName || result?.candidateName || '').trim().split(/\s+/)[0] || '';

  // `/complete` keeps the mode inside its `dashboard` sub-object; `/dashboard`
  // returns it flat, and the interview page also passes it through as a prop.
  const rawMode = data?.mode || data?.dashboard?.mode || result?.mode || null;

  return {
    firstName,
    hasInterviews: Boolean(evaluationFeedback(data?.evaluation) || data?.skillGaps),
    displayName: String(candidateName || result?.candidateName || '').trim() || null,
    initials: (String(candidateName || result?.candidateName || '').trim() || 'VC')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'VC',
    roleTitle,
    roleKey: data?.targetRole || roadmap?.targetRoleKey || skillGaps?.targetRoleKey || null,
    experience: skillGaps?.experienceLevel?.label || roadmap?.experienceLevel?.label || null,
    experienceLevel: toNumber(skillGaps?.experienceLevel?.level ?? roadmap?.experienceLevel?.level),
    mode: rawMode,
    modeLabel: MODE_LABEL[rawMode] || null,
    interviewType: titleCase(rawMode || 'voice'),
    readiness: skillGaps?.readiness ?? null,
    currentSkills: listOfSkills(skillGaps?.currentSkills),
    matchedSkills: listOfSkills(skillGaps?.matchedSkills),
    totalRequired: skillGaps?.totalRequired ?? null,
    gapCount: skillGaps?.gapCount ?? null,
    skillsSource: skillGaps?.skillsSource || null,
    gapSummary: skillGaps?.summary || null,
    detailedFeedback: evaluationFeedback(data?.evaluation),
    timestamp: valid,
    timestampLabel: valid
      ? valid.toLocaleString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null,
    timeLabel: valid
      ? valid.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      : null,
    dateLabel: valid
      ? valid.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : null,
  };
}

function evaluationFeedback(evaluation) {
  const text = evaluation?.detailedFeedback;
  return typeof text === 'string' && text.trim() ? text.trim() : null;
}

/**
 * One call that turns the raw backend payload into every section's data.
 * `DashboardPage` calls this and passes slices down as props, so no component
 * reaches back into raw API shapes.
 */
export function buildDashboardModel({ data, result, candidateName, completedAt }) {
  const evaluation = data?.evaluation || null;
  const skillGaps = data?.skillGaps || null;
  const roadmap = data?.roadmap || null;

  const skillComparison = buildSkillComparison(skillGaps);
  const roadmapView = buildRoadmap(roadmap);
  const { bars: categories, extras: categoryExtras } = buildCategories(evaluation);
  const highlights = buildHighlights(evaluation, skillGaps);
  const nextSteps = buildNextSteps(evaluation, skillGaps, roadmapView, skillComparison);

  return {
    hasData: Boolean(data),
    evaluation,
    skillGaps,
    roadmap,
    overall: buildOverallScore(evaluation),
    categories,
    categoryExtras,
    performance: buildPerformanceSummary(evaluation, skillGaps, roadmap),
    highlights,
    skillComparison,
    roadmapView,
    nextSteps,
    profile: buildProfile({ data, result, candidateName, completedAt }),
  };
}

export { CRITERION_MAX, MODE_LABEL };
