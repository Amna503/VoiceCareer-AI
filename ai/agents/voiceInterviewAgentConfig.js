/**
 * Voice Interview Agent — AssemblyAI Voice Agent configuration.
 *
 * Builds the inline `session.update` payload for the AssemblyAI Voice Agent API
 * (wss://agents.assemblyai.com/v1/ws) out of the modules that already exist in
 * this repo: the prompts in ai/prompts and the role requirements in
 * ai/career-engine. Nothing here is duplicated from those modules — it composes them.
 *
 * The backend serves this payload to the browser so the agent configuration and
 * the AssemblyAI API key both stay on the server.
 */

import {
  INTERVIEW_SYSTEM_PROMPT,
  TECHNICAL_INTERVIEW_PROMPT,
  HR_INTERVIEW_PROMPT,
} from "../prompts/interview.js";
import { CAREER_ROLE_REQUIREMENTS, getRoleRequirements } from "../career-engine/skillGap.js";
import { resolveRoleKey } from "../career-engine/roleCatalog.js";

/** Voice Agent API audio format: 24 kHz mono PCM16, base64 per event. */
export const VOICE_AGENT_SAMPLE_RATE = 24000;

/** Roles the career engine knows how to evaluate. */
export const SUPPORTED_ROLES = Object.keys(CAREER_ROLE_REQUIREMENTS);

/** Audio chunk size sent per `input.audio` event: ~50 ms at 24 kHz. */
export const AUDIO_CHUNK_SAMPLES = 1200;

const MODE_PROMPTS = {
  technical: TECHNICAL_INTERVIEW_PROMPT,
  hr: HR_INTERVIEW_PROMPT,
  behavioral: HR_INTERVIEW_PROMPT,
};

function normalizeRole(role) {
  // The catalog owns alias resolution ("cyber security analyst" -> cybersecurity),
  // so the voice agent and the dashboard always agree on the target role.
  return resolveRoleKey(role) || "general";
}

function normalizeMode(mode) {
  const value = String(mode || "technical").trim().toLowerCase();
  return MODE_PROMPTS[value] ? value : "technical";
}

function clampQuestions(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 8;
  return Math.min(10, Math.max(6, parsed));
}

/**
 * Tool schemas handed to the agent. Each one is executed by the backend against
 * ai/career-engine and ai/evaluation — see backend/services/voiceAgent.js.
 */
export function buildVoiceAgentTools() {
  return [
    {
      type: "function",
      name: "get_role_requirements",
      description:
        "Look up the skill requirements for a target job role. Call this before answering any question about what skills a role needs, and at the start of the interview to ground your questions in the real requirements.",
      parameters: {
        type: "object",
        properties: {
          role: {
            type: "string",
            description: "The target job role.",
            enum: SUPPORTED_ROLES,
            examples: ["frontend", "backend", "data", "cybersecurity", "ml"],
          },
        },
        required: ["role"],
      },
      execution_mode: "interactive",
      timeout_seconds: 60,
    },
    {
      type: "function",
      name: "analyze_skill_gaps",
      description:
        "Compare the candidate's current skills against the requirements of their target role and return the prioritized gaps, biggest gap first. Call this when the candidate asks what they need to learn, what they are missing, or how ready they are for the role.",
      parameters: {
        type: "object",
        properties: {
          target_role: {
            type: "string",
            description: "The role being prepared for.",
            enum: SUPPORTED_ROLES,
            examples: ["frontend", "backend", "data", "cybersecurity", "ml"],
          },
          candidate_skills: {
            type: "array",
            description:
              "Skills the candidate has said they have. Pass an empty array if they have not listed any yet.",
            items: { type: "string" },
            examples: [["JavaScript", "React"], ["Python", "SQL"]],
          },
          job_description: {
            type: "string",
            description:
              "The job description or role requirements text, if the candidate shared one. Omit it if not.",
          },
        },
        required: ["target_role"],
      },
      execution_mode: "interactive",
      timeout_seconds: 120,
    },
    {
      type: "function",
      name: "evaluate_interview",
      description:
        "Score the interview that just happened using the full conversation transcript and return the weighted score, per-criterion feedback, strengths and improvements. Call this when the candidate asks how they did, requests feedback, wants to know their score, or says the interview is over. When in doubt, call it.",
      parameters: {
        type: "object",
        properties: {
          target_role: {
            type: "string",
            description: "The role the interview was for.",
            enum: SUPPORTED_ROLES,
            examples: ["frontend", "backend", "data", "cybersecurity", "ml"],
          },
          focus: {
            type: "string",
            description: "Optional area the candidate specifically wants feedback on.",
            examples: ["technical depth", "communication", "follow-up handling"],
          },
        },
        required: ["target_role"],
      },
      execution_mode: "interactive",
      timeout_seconds: 180,
    },
    {
      type: "function",
      name: "generate_career_roadmap",
      description:
        "Generate a personalized week-by-week improvement plan for the target role, prioritised around the candidate's skill gaps. Call this when the candidate asks what to do next, how to prepare, or wants an improvement plan.",
      parameters: {
        type: "object",
        properties: {
          target_role: {
            type: "string",
            description: "The role the plan is for.",
            enum: SUPPORTED_ROLES,
            examples: ["frontend", "backend", "data", "cybersecurity", "ml"],
          },
          candidate_skills: {
            type: "array",
            description: "Skills the candidate already has, so the plan skips what they know.",
            items: { type: "string" },
            examples: [["JavaScript", "CSS"], ["Python", "Pandas"]],
          },
          job_description: {
            type: "string",
            description:
              "The job description or role requirements text, if the candidate shared one. Omit it if not.",
          },
        },
        required: ["target_role"],
      },
      execution_mode: "interactive",
      timeout_seconds: 180,
    },
  ];
}

/**
 * Compose the agent's system prompt from the existing interview prompt modules
 * plus the role-specific context for this session.
 */
export function buildSystemPrompt({ targetRole, mode, maxQuestions, candidateProfile } = {}) {
  const role = normalizeRole(targetRole);
  const resolvedMode = normalizeMode(mode);
  const questions = clampQuestions(maxQuestions);
  const requirements = getRoleRequirements(role);

  const modeBlock = MODE_PROMPTS[resolvedMode] || TECHNICAL_INTERVIEW_PROMPT;

  const criticalSkills = requirements.critical.map((item) => item.skill);
  const importantSkills = requirements.important.map((item) => item.skill);

  const profileBlock = candidateProfile && Object.keys(candidateProfile).length > 0
    ? `\nCANDIDATE PROFILE (use this, do not re-ask for it):\n${JSON.stringify(candidateProfile)}\n`
    : "";

  return `${INTERVIEW_SYSTEM_PROMPT}

${modeBlock}

TARGET ROLE: ${requirements.title}
The candidate is preparing for this role. Call get_role_requirements once at the start of the interview to ground your questions in the real requirements, and lean on these areas:
- Critical: ${criticalSkills.join(", ")}
- Important: ${importantSkills.join(", ")}
${profileBlock}
VOICE RULES (you are speaking out loud, not typing):
- Keep every reply to 1-3 short sentences. Spoken answers must be brief.
- Never read out lists, JSON, scores tables, or URLs. Summarise in plain speech.
- Never spell out or enumerate long sequences out loud. Keep it conversational.
- If the candidate asks something you cannot answer, say so and offer to move on.

FIRST TURN:
- Open by introducing yourself as an interviewer for ${requirements.title}.
- Confirm the candidate's target job in one short question. If the candidate has already said the role, confirm it instead of asking again.
- Then ask your first interview question.

QUESTION COUNTING:
- Ask between 6 and ${questions} questions total, counting your first one.
- Call get_role_requirements once, early, for the role requirements.
- If the candidate asks for feedback or says they are ready to finish, call evaluate_interview and then generate_career_roadmap, and give them their personalized improvement plan out loud.
- Do not keep the candidate trapped in questions once they have asked for feedback.

TOOL USE:
- Default to calling the tool. A wasted call is fine; answering from memory is not.
- The candidate's target job: call get_role_requirements.
- "What should I learn" / "am I ready": call analyze_skill_gaps.
- "How did I do" / "give me feedback": call evaluate_interview.
- "What should I do next" / "give me a plan": call generate_career_roadmap.
- You can call two tools in a row when the candidate asks how they did AND what to do next. Call evaluate_interview first, then generate_career_roadmap.

ANTI-FABRICATION (important):
- NEVER state a score, a skill gap, a roadmap week, or a rating unless that exact value came back from a tool result in this conversation.
- If you have not called the tool, you do not have those numbers. Do not estimate, approximate, or guess them.
- If a tool returns an error, tell the candidate plainly that the analysis is unavailable right now and offer to continue the interview.

TONE: professional, encouraging, and neutral. Never critical during the interview — the evaluation happens after.`;
}

export function buildGreeting({ targetRole, candidateName, mode } = {}) {
  const role = normalizeRole(targetRole);
  const requirements = getRoleRequirements(role);
  const name = candidateName ? `, ${candidateName}` : "";
  const focus = normalizeMode(mode) === "technical"
    ? "technical questions and how you think through problems"
    : "your experience and how you work with a team";

  return `Hi${name}, thanks for meeting with me today. I'm your AI interviewer for ${requirements.title}. This will be about ${focus}, and I'll follow up on what you tell me. Before we start — is ${requirements.title} the role you're preparing for?`;
}

/**
 * Full `session` object for the first `session.update`.
 * Inline configuration: no stored agent_id, so nothing is hardcoded in the browser.
 */
export function buildVoiceAgentSession(options = {}) {
  const role = normalizeRole(options.targetRole);
  const resolvedMode = normalizeMode(options.mode);
  const voice = options.voice || "alba";

  return {
    system_prompt: buildSystemPrompt(options),
    greeting: buildGreeting(options),
    input: {
      format: {
        encoding: "audio/pcm",
        sample_rate: VOICE_AGENT_SAMPLE_RATE,
      },
      transcription_mode: "balanced",
      keyterms: getRoleRequirements(role).critical
        .map((item) => item.skill)
        .slice(0, 40),
      turn_detection: {
        vad_threshold: 0.5,
        interrupt_response: true,
        interruption_delay: 600,
      },
    },
    output: {
      voice,
      format: {
        encoding: "audio/pcm",
        sample_rate: VOICE_AGENT_SAMPLE_RATE,
      },
      volume: 100,
    },
    tools: buildVoiceAgentTools(),
  };
}

export default {
  VOICE_AGENT_SAMPLE_RATE,
  AUDIO_CHUNK_SAMPLES,
  SUPPORTED_ROLES,
  buildVoiceAgentTools,
  buildSystemPrompt,
  buildGreeting,
  buildVoiceAgentSession,
};
