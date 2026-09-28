/**
 * AssemblyAI Voice Agent service.
 *
 * Everything that touches the AssemblyAI Voice Agent API lives on the server:
 *   1. minting the short-lived token the browser needs to open the WebSocket
 *   2. building the agent's session configuration from the ai/ modules
 *   3. executing the agent's tool calls against ai/career-engine and ai/evaluation
 *
 * The permanent ASSEMBLYAI_API_KEY never leaves this process.
 */

import {
  buildVoiceAgentSession,
  VOICE_AGENT_SAMPLE_RATE,
  AUDIO_CHUNK_SAMPLES,
  SUPPORTED_ROLES,
} from "../../ai/agents/voiceInterviewAgentConfig.js";
import { getRoleRequirements, analyzeSkillGaps } from "../../ai/career-engine/skillGap.js";
import { generateRoadmap } from "../../ai/career-engine/roadmap.js";
import { formatEvaluationReport } from "../../ai/evaluation/evaluator.js";
import { CoachAgent } from "../../ai/agents/coachAgent.js";
import { LLMService } from "../../ai/llmService.js";
const TOKEN_URL = "https://agents.assemblyai.com/v1/token";

/** Token redemption window. 1-600 allowed by the API. */
const TOKEN_TTL_SECONDS = clampInt(process.env.VOICE_AGENT_TOKEN_TTL, 300, 1, 600);

/** Cap on how long one interview session may run. 60-10800 allowed by the API. */
const MAX_SESSION_SECONDS = clampInt(
  process.env.VOICE_AGENT_MAX_SESSION_SECONDS,
  1800,
  60,
  10800
);

/** In-memory transcripts so a tool call can read the conversation so far. */
const sessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function clampInt(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sweepSessions() {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [id, session] of sessions) {
    if (session.updatedAt < cutoff) sessions.delete(id);
  }
}

function getSession(sessionId) {
  sweepSessions();
  if (!sessionId) return null;
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      transcript: [],
      targetRole: "general",
      mode: "technical",
      candidateProfile: null,
      jobDescription: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
  return sessions.get(sessionId);
}

/**
 * Mint a single-use, short-lived AssemblyAI Voice Agent token.
 * The browser passes this as `?token=` on wss://agents.assemblyai.com/v1/ws.
 */
export async function mintVoiceAgentToken() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    const error = new Error("ASSEMBLYAI_API_KEY is not configured on the server");
    error.status = 500;
    throw error;
  }

  const url = new URL(TOKEN_URL);
  url.searchParams.set("expires_in_seconds", String(TOKEN_TTL_SECONDS));
  url.searchParams.set("max_session_duration_seconds", String(MAX_SESSION_SECONDS));

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(
      `AssemblyAI token request failed (${response.status}): ${body || "no response body"}`
    );
    error.status = response.status === 401 ? 502 : response.status;
    throw error;
  }

  const data = await response.json();
  if (!data.token) {
    const error = new Error("AssemblyAI token response did not include a token");
    error.status = 502;
    throw error;
  }

  return {
    token: data.token,
    expiresIn: data.expires_in_seconds ?? TOKEN_TTL_SECONDS,
    maxSessionDuration: MAX_SESSION_SECONDS,
  };
}

/**
 * Build the inline `session.update` payload for this interview.
 * Served to the browser so the agent configuration stays server-side.
 */
export function getVoiceAgentConfig(options = {}) {
  const session = getSession(options.sessionId);
  const targetRole = options.targetRole || session?.targetRole || "general";
  const mode = options.mode || session?.mode || "technical";
  const candidateProfile = options.candidateProfile || session?.candidateProfile || null;
  const jobDescription = options.jobDescription || session?.jobDescription || "";
  const voice = process.env.VOICE_AGENT_VOICE || "alba";

  if (session) {
    session.targetRole = targetRole;
    session.mode = mode;
    if (candidateProfile) session.candidateProfile = candidateProfile;
    if (jobDescription) session.jobDescription = jobDescription;
    session.updatedAt = Date.now();
  }

  return {
    session: buildVoiceAgentSession({
      targetRole,
      mode,
      voice,
      maxQuestions: options.maxQuestions,
      candidateProfile,
      jobDescription,
      candidateName: options.candidateName,
    }),
    audio: {
      sampleRate: VOICE_AGENT_SAMPLE_RATE,
      chunkSamples: AUDIO_CHUNK_SAMPLES,
      channels: 1,
      encoding: "pcm_s16le",
    },
    supportedRoles: SUPPORTED_ROLES,
  };
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

async function runGetRoleRequirements(args) {
  const role = args.role || "general";
  const requirements = getRoleRequirements(role);
  return {
    role,
    roleKey: requirements.roleKey,
    title: requirements.title,
    critical: requirements.critical,
    important: requirements.important,
    niceToHave: requirements.niceToHave,
  };
}

async function runAnalyzeSkillGaps(args, session) {
  const role = args.target_role || session?.targetRole || "general";
  const skills = toStringArray(args.candidate_skills);
  const jobDescription = args.job_description || session?.jobDescription || "";

  // Same pipeline the dashboard uses: the career engine decides the gap list and
  // its order, the LLM only enriches each gap. Never a role-agnostic answer.
  try {
    const coach = new CoachAgent(new LLMService());
    const analysis = await coach.analyzeGaps(
      { skills },
      role,
      { jobDescription, experience: session?.candidateProfile?.experience }
    );

    return {
      targetRole: role,
      targetRoleTitle: analysis.targetRoleTitle,
      currentSkills: skills,
      source: analysis.source,
      matchedSkills: analysis.matchedSkills,
      readiness: analysis.readiness,
      experienceLevel: analysis.experienceLevel,
      // Ordered biggest gap first, so the spoken answer leads with the priority.
      gaps: analysis.gaps,
      gapCount: analysis.gapCount,
      totalRequired: analysis.totalRequired,
      summary: analysis.summary,
    };
  } catch (error) {
    console.warn("Skill gap LLM enhancement failed, using career-engine result:", error.message);
    const local = analyzeSkillGaps(skills, role, { jobDescription });
    return {
      targetRole: role,
      targetRoleTitle: getRoleRequirements(role).title,
      currentSkills: skills,
      source: "career-engine",
      matchedSkills: local.matchedSkills,
      readiness: local.readiness,
      experienceLevel: local.experienceLevel,
      gaps: local.gaps,
      gapCount: local.gapCount,
      totalRequired: local.totalRequired,
      summary: local.summary,
    };
  }
}

async function runEvaluateInterview(args, session) {
  const role = args.target_role || session?.targetRole || "general";
  const transcript = session?.transcript || [];
  const turns = transcript.filter((entry) => entry.content && entry.content.trim().length > 0);

  if (turns.length < 2) {
    return {
      error:
        "The interview transcript is empty, so there is nothing to evaluate yet. Ask the candidate at least one question and let them answer before evaluating.",
    };
  }

  const coach = new CoachAgent(new LLMService());
  const evaluation = await coach.evaluateInterview(turns, session?.candidateProfile || null);
  const report = formatEvaluationReport(evaluation);

  return {
    targetRole: role,
    turnsEvaluated: turns.length,
    overallScore: report.summary.overallScore,
    scoreLabel: report.summary.scoreLabel,
    strengths: report.summary.strengths,
    improvements: report.summary.improvements,
    breakdown: report.breakdown,
    detailedFeedback: report.detailedFeedback,
    requestedFocus: args.focus || null,
  };
}

async function runGenerateCareerRoadmap(args, session) {
  const role = args.target_role || session?.targetRole || "general";
  const skills = toStringArray(args.candidate_skills);
  const jobDescription = args.job_description || session?.jobDescription || "";
  const experience = session?.candidateProfile?.experience || null;

  const localGaps = analyzeSkillGaps(skills, role, { jobDescription, experience });

  let roadmap;
  try {
    const coach = new CoachAgent(new LLMService());
    roadmap = await coach.buildRoadmap(
      { skills },
      role,
      { jobDescription, experience, skillGaps: localGaps }
    );
  } catch (error) {
    console.warn("Roadmap LLM enhancement failed, using career-engine result:", error.message);
    roadmap = generateRoadmap(role, localGaps, { jobDescription, experience });
  }

  const requirements = getRoleRequirements(role, { jobDescription });

  // `weeks` is what the voice agent reads out; `activities` stays inside each week
  // because that is the field name the tool result documents.
  return {
    targetRole: role,
    targetRoleTitle: roadmap.targetRoleTitle || requirements.title,
    source: roadmap.source || "career-engine",
    experienceLevel: roadmap.experienceLevel,
    readiness: roadmap.readiness ?? localGaps.readiness,
    matchedSkills: roadmap.matchedSkills || localGaps.matchedSkills,
    totalHours: roadmap.totalHours ?? 0,
    prioritySkills: roadmap.prioritizedSkills || [],
    skillGaps: localGaps.gaps.map((gap) => ({
      skill: gap.skill,
      importance: gap.importance,
      priority: gap.priority,
    })),
    weeks: (roadmap.weeks || []).map((week) => ({
      week: week.week,
      focus: week.focus,
      goals: week.goals,
      skills: week.skills,
      activities: (week.tasks || week.activities || []).map((activity) => ({
        type: activity.type,
        title: activity.title,
        duration: activity.duration,
      })),
      outcome: week.outcome,
    })),
  };
}

const TOOL_HANDLERS = {
  get_role_requirements: runGetRoleRequirements,
  analyze_skill_gaps: runAnalyzeSkillGaps,
  evaluate_interview: runEvaluateInterview,
  generate_career_roadmap: runGenerateCareerRoadmap,
};

export const SUPPORTED_TOOLS = Object.keys(TOOL_HANDLERS);

/**
 * Execute one agent tool call against the existing ai/ modules.
 * `transcript` is merged into the session store so evaluate_interview always has
 * the real conversation, regardless of what the agent passed as arguments.
 */
export async function executeVoiceAgentTool({ sessionId, tool, args = {}, transcript, targetRole, mode, candidateProfile, jobDescription } = {}) {
  const handler = TOOL_HANDLERS[tool];
  if (!handler) {
    return { error: `Unknown tool "${tool}". Supported tools: ${SUPPORTED_TOOLS.join(", ")}.` };
  }

  const session = getSession(sessionId);
  if (session) {
    if (Array.isArray(transcript)) {
      session.transcript = transcript
        .filter((entry) => entry && typeof entry.content === "string" && entry.content.trim())
        .map((entry) => ({
          role: entry.role === "assistant" ? "assistant" : "user",
          content: entry.content.trim(),
        }));
    }
    if (targetRole) session.targetRole = targetRole;
    if (mode) session.mode = mode;
    if (candidateProfile) session.candidateProfile = candidateProfile;
    if (typeof jobDescription === "string" && jobDescription.trim()) {
      session.jobDescription = jobDescription.trim();
    }
    session.updatedAt = Date.now();
  }

  try {
    const result = await handler(args || {}, session);
    return result;
  } catch (error) {
    console.error(`Voice agent tool "${tool}" failed:`, error.message);
    // Returned verbatim to the model, so name what failed and what to do next.
    return { error: `${tool} failed: ${error.message}. Tell the candidate it is unavailable right now and offer to continue the interview.` };
  }
}

export function getVoiceAgentSessionSnapshot(sessionId) {
  return getSession(sessionId);
}

export function clearVoiceAgentSession(sessionId) {
  return sessions.delete(sessionId);
}

export default {
  mintVoiceAgentToken,
  getVoiceAgentConfig,
  executeVoiceAgentTool,
  getVoiceAgentSessionSnapshot,
  clearVoiceAgentSession,
  SUPPORTED_TOOLS,
};
