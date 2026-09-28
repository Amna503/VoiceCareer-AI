/**
 * Career Engine — Skill Gap Analysis
 *
 * Compares a candidate's stated skills against the requirements of the role they
 * are actually targeting, then PRIORITISES the gaps so the roadmap generator can
 * work on the biggest ones first.
 *
 * Inputs that shape the result:
 *   - current skills
 *   - target role (free text: "Cybersecurity Analyst", "senior data analyst", ...)
 *   - job description (optional free text)
 *   - experience level (optional free text)
 *   - interview evaluation (optional, raises the priority of skills it flagged)
 */

import {
  CAREER_ROLE_REQUIREMENTS,
  SKILL_ALIASES,
  JD_SKILL_HINTS,
  resolveRoleKey,
  resolveExperienceLevel,
  roleTitle,
} from "./roleCatalog.js";

export { CAREER_ROLE_REQUIREMENTS };

/** Base priority by importance band. */
const IMPORTANCE_WEIGHT = {
  critical: 100,
  important: 65,
  "nice-to-have": 35,
};

const IMPORTANCE_ORDER = { critical: 0, important: 1, "nice-to-have": 2 };

/** Lower-case, alias-fold, punctuation-normalised form of a skill name. */
function canonical(value) {
  let raw = String(value ?? "").toLowerCase().trim();
  if (!raw) return "";
  raw = SKILL_ALIASES[raw] || raw;
  return raw
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value) {
  return new Set(canonical(value).split(" ").filter(Boolean));
}

/**
 * Alias-tolerant skill matching.
 *
 * A short name only counts when it is the HEAD of the longer name, so
 * "Tableau" matches "Power BI/Tableau" (via the alias table) but "CSS" does not
 * match "Tailwind CSS". Multi-token names match by token subset, so
 * "React Native" satisfies "React".
 */
export function skillsMatch(candidateSkill, requiredSkill) {
  const a = canonical(candidateSkill);
  const b = canonical(requiredSkill);
  if (!a || !b) return false;
  if (a === b) return true;

  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (!ta.size || !tb.size) return false;

  const [shorter, longer, shorterName, longerName] = ta.size < tb.size
    ? [ta, tb, a, b]
    : [tb, ta, b, a];

  if (shorter.size === 1) {
    return longerName.split(" ")[0] === shorterName;
  }

  for (const token of shorter) {
    if (!longer.has(token)) return false;
  }
  return true;
}

/** Skills from a pasted job description that also appear in the role catalog. */
export function extractJobDescriptionSkills(jobDescription, allSkills = []) {
  const text = canonical(jobDescription);
  if (!text) return [];

  const found = new Set();
  for (const hint of JD_SKILL_HINTS) {
    const canonicalHint = canonical(hint);
    if (!canonicalHint) continue;
    if (text.includes(canonicalHint) || canonicalHint.includes(text)) {
      found.add(hint);
    }
  }
  // Also surface catalog skills named verbatim in the JD even if not in the hints.
  for (const skill of allSkills) {
    const name = canonical(skill.skill);
    if (name && name.length > 2 && text.includes(name)) found.add(skill.skill);
  }
  return [...found];
}

function flattenRequirements(requirements) {
  return [
    ...requirements.critical.map((item) => ({ ...item, importance: "critical" })),
    ...requirements.important.map((item) => ({ ...item, importance: "important" })),
    ...requirements.niceToHave.map((item) => ({ ...item, importance: "nice-to-have" })),
  ];
}

/** Free-text haystack built from the parts of an evaluation that flag weaknesses. */
function evaluationHaystack(evaluation) {
  if (!evaluation) return "";
  const parts = [];
  const summary = evaluation.summary || evaluation;
  if (Array.isArray(summary.improvements)) parts.push(...summary.improvements);
  if (Array.isArray(evaluation.improvements)) parts.push(...evaluation.improvements);
  if (Array.isArray(summary.strengths)) parts.push(...summary.strengths);
  if (typeof summary.detailedFeedback === "string") parts.push(summary.detailedFeedback);
  if (typeof evaluation.detailedFeedback === "string") parts.push(evaluation.detailedFeedback);

  const breakdown = evaluation.breakdown || {};
  for (const key of Object.keys(breakdown)) {
    const entry = breakdown[key];
    if (entry && typeof entry.feedback === "string") parts.push(`${key} ${entry.feedback}`);
  }
  return canonical(parts.join(" | "));
}

/**
 * Requirements for a role.
 *
 * Unknown roles resolve to `null` instead of silently pretending to be another
 * role: the caller decides whether to fall back to `general` or to a
 * job-description-derived requirement set.
 */
export function resolveRole(role, jobDescription) {
  const key = resolveRoleKey(role);
  if (key) {
    return { key, requirements: CAREER_ROLE_REQUIREMENTS[key], resolved: true, matchedAlias: String(role) };
  }

  if (jobDescription) {
    const hints = extractJobDescriptionSkills(jobDescription);
    if (hints.length) {
      return {
        key: null,
        resolved: false,
        matchedAlias: String(role || ""),
        requirements: buildRequirementsFromJobDescription(jobDescription, hints, role),
      };
    }
  }

  return {
    key: "general",
    requirements: CAREER_ROLE_REQUIREMENTS.general,
    resolved: false,
    matchedAlias: String(role || ""),
  };
}

function buildRequirementsFromJobDescription(jobDescription, hints, role) {
  const text = canonical(jobDescription);
  const known = hints
    .map((name) => {
      for (const requirements of Object.values(CAREER_ROLE_REQUIREMENTS)) {
        const hit = flattenRequirements(requirements).find((item) => skillsMatch(name, item.skill));
        if (hit) return { ...hit };
      }
      return { skill: name, description: `Mentioned in the ${role || "target"} job description` };
    })
    .filter((item, index, all) => all.findIndex((other) => skillsMatch(other.skill, item.skill)) === index);

  const critical = known.slice(0, 4);
  const important = known.slice(4, 8);
  const niceToHave = known.slice(8, 12);
  const label = String(role || "Target role").trim() || "Target role";

  return {
    title: label.charAt(0).toUpperCase() + label.slice(1),
    family: "job-description",
    aliases: [label.toLowerCase()],
    critical,
    important,
    niceToHave,
    interviewThemes: [],
    portfolioIdeas: [],
    resources: [],
  };
}

/**
 * Back-compatible accessor used by the voice agent's get_role_requirements tool.
 * Falls back to the `general` role only when the role genuinely is not covered.
 */
export function getRoleRequirements(role, context = {}) {
  const resolved = resolveRole(role, context.jobDescription);
  return { ...resolved.requirements, roleKey: resolved.key, roleResolved: resolved.resolved };
}

/**
 * Skills for the target role that the candidate actually mentioned in the
 * interview. Lets a transcript stand in for a manually entered skill list, so
 * the roadmap reflects what they said as well as what they typed.
 */
export function extractSkillsFromTranscript(transcript, targetRole, jobDescription) {
  const resolved = resolveRole(targetRole, jobDescription);
  const text = canonical(
    (transcript || [])
      .filter((turn) => turn && typeof turn.content === "string")
      .map((turn) => turn.content)
      .join(" | ")
  );
  if (!text) return [];

  return flattenRequirements(resolved.requirements)
    .filter((item) => [...tokenSet(item.skill)].every((token) => text.includes(token)) && tokenSet(item.skill).size > 0)
    .map((item) => item.skill);
}

/**
 * Analyse gaps for a candidate.
 *
 * @param {string[]} currentSkills skills the candidate already has
 * @param {string}   targetRole   free-text target role
 * @param {object}   context      { jobDescription, experience, evaluation, interviewHistory }
 */
export function analyzeSkillGaps(currentSkills, targetRole, context = {}) {
  const jobDescription = context.jobDescription || "";
  const evaluation = context.evaluation || null;
  const experience = resolveExperienceLevel(context.experience);

  const skills = (Array.isArray(currentSkills) ? currentSkills : String(currentSkills || "").split(/[,;]/))
    .map((item) => String(item).trim())
    .filter(Boolean);

  // No skill list supplied? Fall back to what the candidate said in the interview.
  const statedSkills = skills.length
    ? skills
    : extractSkillsFromTranscript(context.interviewHistory, targetRole, jobDescription);

  const resolved = resolveRole(targetRole, jobDescription);
  const requirements = resolved.requirements;
  const allRequirements = flattenRequirements(requirements);

  const jdSkills = extractJobDescriptionSkills(jobDescription, allRequirements);
  const evaluationText = evaluationHaystack(evaluation);

  const gaps = [];
  const matched = [];
  /** Requirement counts per importance band, so a coverage chart can read them. */
  const bands = {
    critical: { required: 0, matched: 0, gaps: 0 },
    important: { required: 0, matched: 0, gaps: 0 },
    "nice-to-have": { required: 0, matched: 0, gaps: 0 },
  };

  allRequirements.forEach((req, index) => {
    const isMatched = statedSkills.some((skill) => skillsMatch(skill, req.skill));
    const band = bands[req.importance] || bands.important;
    band.required += 1;

    if (isMatched) {
      band.matched += 1;
      matched.push(req.skill);
      return;
    }

    const inJobDescription = jdSkills.some((jdSkill) => skillsMatch(jdSkill, req.skill));
    const mentionedInEvaluation = evaluationText
      ? [...tokenSet(req.skill)].every((token) => evaluationText.includes(token)) &&
        tokenSet(req.skill).size > 0
      : false;

    let priority = IMPORTANCE_WEIGHT[req.importance] ?? 30;
    if (inJobDescription) priority += 12;
    if (mentionedInEvaluation) priority += 18;

    gaps.push({
      ...req,
      importance: req.importance,
      priority,
      catalogIndex: index,
      inJobDescription,
      mentionedInEvaluation,
    });
    band.gaps += 1;
  });

  // Biggest, most role-relevant gap first. Stable within a band thanks to index.
  gaps.sort((a, b) => b.priority - a.priority || a.catalogIndex - b.catalogIndex);
  gaps.forEach((gap, index) => {
    gap.rank = index + 1;
    delete gap.catalogIndex;
  });

  for (const band of Object.values(bands)) {
    band.percent = band.required > 0 ? Math.round((band.matched / band.required) * 100) : 100;
  }

  const totalRequired = allRequirements.length;
  const readiness = totalRequired === 0
    ? 100
    : Math.round((matched.length / totalRequired) * 100);

  const jd = jobDescription ? "job-description" : null;
  const sources = ["career-engine"];
  if (jd) sources.push(jd);
  if (evaluation) sources.push("interview-evaluation");

  return {
    targetRole: requirements.title,
    targetRoleKey: resolved.key,
    targetRoleTitle: roleTitle(resolved.key) || requirements.title,
    roleResolved: resolved.resolved,
    roleRequested: targetRole || null,
    currentSkills: statedSkills,
    skillsSource: skills.length ? "profile" : statedSkills.length ? "interview-transcript" : "none",
    matchedSkills: matched,
    gaps,
    totalRequired,
    matchedCount: matched.length,
    gapCount: gaps.length,
    // Per-importance coverage, so a dashboard can chart "how much of the
    // critical tier do I actually cover" without re-deriving the role.
    coverageByImportance: bands,
    readiness,
    experienceLevel: experience,
    jobDescriptionSkills: jdSkills,
    matched: Boolean(matched.length),
    sources,
    summary: buildSummary({ gaps, totalRequired, matched, requirements, readiness }),
  };
}

function buildSummary({ gaps, totalRequired, matched, requirements, readiness }) {
  const lead = gaps
    .slice(0, 3)
    .map((gap) => gap.skill)
    .join(", ");

  if (!gaps.length) {
    return `You already cover all ${totalRequired} core ${requirements.title} requirements. The plan below is about depth, portfolio proof, and interview readiness.`;
  }

  return `${gaps.length} of ${totalRequired} ${requirements.title} requirements are not covered yet (readiness ${readiness}%). You already have ${matched.length}. The plan starts with: ${lead || "the remaining gaps"}.`;
}

export default {
  CAREER_ROLE_REQUIREMENTS,
  getRoleRequirements,
  analyzeSkillGaps,
  resolveRole,
  extractJobDescriptionSkills,
  skillsMatch,
};
