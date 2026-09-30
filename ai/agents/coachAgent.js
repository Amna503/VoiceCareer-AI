/**
 * Career Coach Agent
 * Evaluates interview performance, provides feedback, identifies skill gaps,
 * and generates personalized career roadmaps.
 *
 * Division of responsibility:
 *   - ai/career-engine decides WHICH skills are gaps, in WHAT order they should
 *     be worked on, and WHICH role they belong to. That is deterministic and
 *     role-specific.
 *   - This agent's LLM calls only ENRICH that decision with better wording,
 *     concrete examples and role-specific nuance. It never invents the gap list
 *     and it never returns a plan that ignores the requested role.
 */

import {
  analyzeSkillGaps,
  getRoleRequirements,
  resolveRole,
  skillsMatch,
} from "../career-engine/skillGap.js";
import { generateRoadmap, normaliseWeek, WEEK_COUNT } from "../career-engine/roadmap.js";

const COACH_EVALUATION_PROMPT = `You are VoiceCareer AI's Career Coach Agent. Your job is to evaluate interview performance and provide constructive, actionable feedback.

EVALUATION CRITERIA:
1. ANSWER RELEVANCE — Did the candidate answer the question asked?
2. TECHNICAL KNOWLEDGE — How strong is their technical understanding?
3. PROBLEM SOLVING — Did they demonstrate logical thinking?
4. ANSWER STRUCTURE — Was the answer organised into a clear beginning, reasoning and conclusion?
5. COMMUNICATION CLARITY — Was the answer clear and easy to follow?
6. FOLLOW-UP HANDLING — How well did they handle follow-up questions?
7. CONFIDENCE — Did they speak with confidence and conviction?

RULES:
- Be constructive and specific — not generic
- Reference specific answers from the interview
- Provide actionable improvement suggestions
- Balance positive feedback with areas for growth
- Keep the tone supportive and encouraging
- Judge technical knowledge against the role the interview was for
- ANSWER STRUCTURE and COMMUNICATION CLARITY are different questions. Score structure on
  organisation (did they set up context, walk through reasoning, then land a conclusion?),
  and clarity on whether the words themselves were easy to follow. Do not give both the
  same number just because they sound related.

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "overallScore": number (1-10),
  "evaluation": {
    "answerRelevance": { "score": number (1-10), "feedback": "string" },
    "technicalKnowledge": { "score": number (1-10), "feedback": "string" },
    "problemSolving": { "score": number (1-10), "feedback": "string" },
    "answerStructure": { "score": number (1-10), "feedback": "string" },
    "communicationClarity": { "score": number (1-10), "feedback": "string" },
    "followUpHandling": { "score": number (1-10), "feedback": "string" },
    "confidence": { "score": number (1-10), "feedback": "string" }
  },
  "strengths": ["string"],
  "improvements": ["string"],
  "detailedFeedback": "string"
}`;

const SKILL_GAP_PROMPT = `You are VoiceCareer AI's Skill Gap Analyst.

You are given the authoritative list of skill gaps that has ALREADY been computed
for the candidate's target role. Do not decide the gap list yourself. For each gap
you are given, add a realistic current level and one concrete improvement action.

OUTPUT FORMAT:
Return a JSON object:
{
  "gaps": [
    { "skill": "string", "currentLevel": "beginner|intermediate|advanced", "suggestedImprovement": "string" }
  ],
  "summary": "string"
}

Use exactly the "skill" strings you were given so the results can be matched back.`;

const ROADMAP_PROMPT = `You are VoiceCareer AI's Career Roadmap Generator.

You are given a target role and an ordered list of that candidate's skill gaps. The
weeks have already been allocated to those gaps by the career engine. Your job is to
write each week well.

ABSOLUTE RULES:
- Write ONLY about skills from the list you were given. Never add a skill that is
  not in that list, and never produce a generic plan that would fit any role.
- Weeks 1-3 must focus on their assigned gap skills. Week 4 proves the work and
  prepares the candidate for a <ROLE> interview.
- Every task must be specific to <ROLE>: real tools, real commands, real artefacts.
- Match the depth to the candidate's experience level.
- If the candidate is already strong in something, do NOT schedule time to relearn it.

OUTPUT FORMAT:
Return a JSON object:
{
  "weeks": [
    {
      "week": number,
      "focus": "string",
      "gapTargets": ["string"],
      "goals": ["string"],
      "tasks": [
        { "type": "learn|practice|project|review", "title": "string", "description": "string", "duration": "string" }
      ],
      "project": { "title": "string", "description": "string" },
      "outcome": "string"
    }
  ]
}`;

function extractProfile(profile) {
  if (!profile) return {};
  if (Array.isArray(profile)) return { skills: profile };
  if (Array.isArray(profile.skills)) return profile;
  if (typeof profile.skills === "string") return { ...profile, skills: [profile.skills] };
  return profile;
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/[,;]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function parseJsonObject(text) {
  if (typeof text !== "string") return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Role-aware context block so no prompt is ever role-agnostic. */
function roleContextBlock(targetRole, jobDescription) {
  const requirements = getRoleRequirements(targetRole, { jobDescription });
  const lines = [
    `TARGET ROLE: ${requirements.title}`,
    `ROLE ALIAS MATCHED: ${requirements.roleKey}${requirements.roleResolved ? "" : " (inferred from the job description — not a named preset role)"}`,
    `CRITICAL SKILLS FOR THIS ROLE: ${requirements.critical.map((item) => item.skill).join(", ") || "n/a"}`,
    `IMPORTANT SKILLS FOR THIS ROLE: ${requirements.important.map((item) => item.skill).join(", ") || "n/a"}`,
    `NICE-TO-HAVE SKILLS FOR THIS ROLE: ${requirements.niceToHave.map((item) => item.skill).join(", ") || "n/a"}`,
  ];
  if (jobDescription) {
    lines.push(`JOB DESCRIPTION:\n${jobDescription}`);
  }
  return { requirements, block: lines.join("\n") };
}

export class CoachAgent {
  constructor(llmService) {
    this.llm = llmService;
  }

  async evaluateInterview(interviewHistory, candidateProfile) {
    const conversationText = interviewHistory
      .map(msg => `${msg.role === "assistant" ? "Interviewer" : "Candidate"}: ${msg.content}`)
      .join("\n\n");

    const prompt = `Please evaluate this interview performance:

CANDIDATE PROFILE: ${JSON.stringify(candidateProfile || {})}

INTERVIEW TRANSCRIPT:
${conversationText}

Provide your evaluation as a JSON object following the specified format.`;

    const messages = [
      { role: "system", content: COACH_EVALUATION_PROMPT },
      { role: "user", content: prompt }
    ];

    // Reasoning models (e.g. gpt-oss) spend part of max_tokens on reasoning
    // tokens, so a budget that looks generous for the JSON alone can still
    // truncate the response and break parsing.
    const response = await this.llm.generate(messages, {
      maxTokens: 2500,
      temperature: 0.3
    });

    const parsed = parseJsonObject(response);
    if (parsed && parsed.evaluation) return parsed;

    console.error("Failed to parse evaluation JSON");
    return {
      overallScore: 5,
      evaluation: {
        answerRelevance: { score: 5, feedback: "Evaluation parsing failed" },
        technicalKnowledge: { score: 5, feedback: "Evaluation parsing failed" },
        problemSolving: { score: 5, feedback: "Evaluation parsing failed" },
        answerStructure: { score: 5, feedback: "Evaluation parsing failed" },
        communicationClarity: { score: 5, feedback: "Evaluation parsing failed" },
        followUpHandling: { score: 5, feedback: "Evaluation parsing failed" },
        confidence: { score: 5, feedback: "Evaluation parsing failed" }
      },
      strengths: [],
      improvements: [],
      detailedFeedback: "Unable to generate detailed feedback at this time."
    };
  }

  /**
   * LLM enrichment for an ALREADY computed gap list. Returns {} on any problem
   * so the caller can fall back to the deterministic gaps.
   */
  async enrichSkillGaps(engineGaps, targetRole, context = {}) {
    const { block } = roleContextBlock(targetRole, context.jobDescription);
    const list = engineGaps.map((gap) => `- ${gap.skill} (${gap.importance}): ${gap.description}`);

    if (!list.length) return {};

    const prompt = `${block}

CANDIDATE SKILLS THEY ALREADY HAVE: ${(context.currentSkills || []).join(", ") || "none recorded"}
EXPERIENCE LEVEL: ${context.experienceLevel?.label || "unspecified"}
SKILL GAPS TO ENRICH (this list is final — do not add, remove, or rename entries):
${list.join("\n")}

INTERVIEW EVALUATION (weaknesses to weight towards):
${JSON.stringify(context.evaluation?.summary || context.evaluation || {})}

Add a currentLevel and a concrete suggestedImprovement to each gap, and write a one-sentence summary.`;

    try {
      const response = await this.llm.generate(
        [
          { role: "system", content: SKILL_GAP_PROMPT },
          { role: "user", content: prompt }
        ],
        { maxTokens: 1500, temperature: 0.3 }
      );
      return parseJsonObject(response) || {};
    } catch (error) {
      console.warn("Skill gap LLM enrichment failed:", error.message);
      return {};
    }
  }

  /**
   * Authoritative skill gaps: the career engine decides the list and ordering,
   * the LLM only adds per-gap detail.
   */
  async analyzeGaps(candidateProfile, targetRole, context = {}) {
    const profile = extractProfile(candidateProfile);
    const jobDescription = context.jobDescription || profile.jobDescription || "";
    const experience = context.experience || profile.experience || null;

    const engine = analyzeSkillGaps(toStringArray(profile.skills), targetRole, {
      jobDescription,
      experience,
      evaluation: context.evaluation || null,
      // The engine falls back to the transcript when no skill list was supplied,
      // so this has to be forwarded or every role skill is reported as a gap.
      interviewHistory: context.interviewHistory || null,
    });

    const enrichment = await this.enrichSkillGaps(
      engine.gaps,
      targetRole,
      {
        ...context,
        jobDescription,
        experienceLevel: engine.experienceLevel,
        currentSkills: engine.currentSkills,
      }
    );

    const llmGaps = Array.isArray(enrichment.gaps) ? enrichment.gaps : [];
    const gaps = engine.gaps.map((gap) => {
      const match = llmGaps.find(
        (item) => typeof item?.skill === "string" && skillsMatch(item.skill, gap.skill)
      );
      if (!match) return gap;
      return {
        ...gap,
        currentLevel: match.currentLevel || gap.currentLevel,
        suggestedImprovement: match.suggestedImprovement || gap.suggestedImprovement,
      };
    });

    return {
      ...engine,
      gaps,
      source: llmGaps.length > 0 ? "career-engine+llm" : "career-engine",
      summary: enrichment.summary || engine.summary,
    };
  }

  /** Legacy entry point kept for the existing call sites. */
  async analyzeSkillGaps(candidateProfile, targetRole, evaluation) {
    return this.analyzeGaps(candidateProfile, targetRole, { evaluation });
  }

  /**
   * LLM enrichment for the engine's 4 weeks. A returned week is only accepted if
   * it sticks to the skills the engine allocated to it, so a drifting or generic
   * model can never turn a role-specific plan into a universal one.
   */
  async enrichRoadmap(engineRoadmap, context = {}) {
    const { block } = roleContextBlock(context.targetRole, context.jobDescription);
    const role = engineRoadmap.targetRole;

    const allowed = [...new Set(engineRoadmap.weeks.flatMap((week) => week.gapTargets || []))];
    const allowance = allowed.length ? allowed : [role];

    const weekBrief = engineRoadmap.weeks
      .map(
        (week) =>
          `Week ${week.week} (${week.kind}) — allocated skills: ${(week.gapTargets || []).join(", ") || role}\n  engine focus: ${week.focus}`
      )
      .join("\n");

    const prompt = `${block}

EXPERIENCE LEVEL: ${engineRoadmap.experienceLevel?.label || "unspecified"}
ROLE: ${role}

CANDIDATE ALREADY HAS: ${(context.currentSkills || engineRoadmap.matchedSkills || []).join(", ") || "nothing recorded"}
CANDIDATE SKILL GAPS, HIGHEST PRIORITY FIRST: ${engineRoadmap.prioritizedSkills.join(", ") || "none — this plan is about depth and interview readiness"}

THE ENGINE HAS ALREADY ALLOCATED SKILLS TO WEEKS:
${weekBrief}

You may ONLY use these skills in the plan: ${allowance.join(", ")}

For "gapTargets" copy the allocated skill names EXACTLY as written above — do not
expand them into sub-topics (for example output "Python", never
"Advanced Python syntax (list comprehensions)"). Put any sub-topic detail in the
task description instead.

Rewrite the ${WEEK_COUNT} weeks so they are specific to a ${role}. Keep the same week number and the same allocated skills per week.`;

    try {
      const response = await this.llm.generate(
        [
          { role: "system", content: ROADMAP_PROMPT },
          { role: "user", content: prompt }
        ],
        { maxTokens: 3000, temperature: 0.4 }
      );

      const parsed = parseJsonObject(response);
      const weeks = Array.isArray(parsed?.weeks) ? parsed.weeks : Array.isArray(parsed?.roadmap) ? parsed.roadmap : null;
      if (!weeks || !weeks.length) return new Map();

      const byNumber = new Map();
      for (const week of weeks) {
        const number = Number(week?.week);
        if (Number.isFinite(number)) byNumber.set(number, week);
      }
      return byNumber;
    } catch (error) {
      console.warn("Roadmap LLM enrichment failed:", error.message);
      return new Map();
    }
  }

  /**
   * The roadmap every surface (dashboard and voice agent) should use.
   * Career engine decides the plan; the LLM improves the wording; if the LLM
   * drifts or fails, the role-specific engine plan is returned unchanged.
   */
  async buildRoadmap(candidateProfile, targetRole, context = {}) {
    const profile = extractProfile(candidateProfile);
    const jobDescription = context.jobDescription || profile.jobDescription || "";
    const experience = context.experience || profile.experience || null;
    const skillGaps = context.skillGaps || (await this.analyzeGaps(profile, targetRole, { ...context, jobDescription, experience }));

    const engineRoadmap = generateRoadmap(targetRole, skillGaps, { jobDescription, experience, evaluation: context.evaluation });

    const llmWeeks = await this.enrichRoadmap(engineRoadmap, {
      ...context,
      jobDescription,
      currentSkills: skillGaps.currentSkills || [],
    });

    // Enrichment is optional; the engine plan is always usable as-is.
    const enrichments = llmWeeks instanceof Map ? llmWeeks : new Map();
    const source = enrichments.size ? "career-engine+llm" : "career-engine";
    const rejected = [];
    const adjusted = [];

    const weeks = engineRoadmap.weeks.map((engineWeek, index) => {
      const base = normaliseWeek(engineWeek, index, engineRoadmap);
      const llmWeek = enrichments.get(base.week);
      if (!llmWeek) return base;

      // Guard 1: the LLM may only work with skills the engine allocated.
      // Models often re-label a skill with a sub-topic ("Advanced Python syntax"),
      // so drop the off-plan labels and keep the engine's own names instead of
      // discarding an otherwise good week.
      const proposed = toStringArray(llmWeek.gapTargets || llmWeek.skills);
      const onPlan = proposed.filter((skill) =>
        base.gapTargets.some((allowed) => skillsMatch(skill, allowed))
      );
      const offPlan = proposed.filter((skill) => !onPlan.includes(skill));
      const gapTargets = onPlan.length ? onPlan : base.gapTargets;
      if (offPlan.length) {
        adjusted.push({ week: base.week, offPlan, used: gapTargets });
      }

      // Guard 2: an enriched week must still be non-empty and mention its skills.
      const candidate = normaliseWeek(
        {
          ...llmWeek,
          week: base.week,
          kind: base.kind,
          gapTargets,
        },
        index,
        engineRoadmap
      );

      if (!candidate.tasks.length && !candidate.goals.length) {
        rejected.push({ week: base.week, reason: "empty" });
        return base;
      }
      if (!candidate.skills.length) candidate.skills = base.skills;
      if (!candidate.outcome) candidate.outcome = base.outcome;
      if (!candidate.milestone) candidate.milestone = base.milestone;
      if (!candidate.project) candidate.project = base.project;

      return candidate;
    });

    return {
      ...engineRoadmap,
      weeks,
      roadmap: weeks,
      totalHours: weeks.reduce((sum, week) => sum + (week.hours || 0), 0),
      source,
      rejectedWeeks: rejected,
      adjustedWeeks: adjusted,
      // Explicitly state what produced this plan so the UI and the voice agent
      // can never claim a roadmap that was not generated for this role.
      generatedForRole: engineRoadmap.targetRole,
    };
  }

  /** Legacy entry point kept for the existing call sites. */
  async generateRoadmap(candidateProfile, skillGaps, targetRole) {
    return this.buildRoadmap(candidateProfile, targetRole, { skillGaps });
  }

  async generateCompleteAnalysis(interviewHistory, candidateProfile, targetRole, context = {}) {
    const profile = extractProfile(candidateProfile);
    const evaluation = await this.evaluateInterview(interviewHistory, profile);

    // When the candidate never filled in a skill list, the transcript is the
    // source: the engine looks for role skills they actually mentioned.
    const skillGaps = await this.analyzeGaps(profile, targetRole, {
      ...context,
      evaluation,
      interviewHistory,
    });

    const roadmap = await this.buildRoadmap(profile, targetRole, {
      ...context,
      evaluation,
      skillGaps,
    });

    return {
      evaluation,
      skillGaps,
      roadmap,
      role: resolveRole(targetRole, context.jobDescription).key,
    };
  }
}

export default CoachAgent;
