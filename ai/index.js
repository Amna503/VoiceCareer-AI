/**
 * AI Agents Module
 * Central export point for all AI agents and services.
 */

export { CareerAgent } from "./agents/careerAgent.js";
export { InterviewAgent } from "./agents/interviewAgent.js";
export { CoachAgent } from "./agents/coachAgent.js";
export { LLMService } from "./llmService.js";
export {
  buildVoiceAgentSession,
  buildVoiceAgentTools,
  buildSystemPrompt,
  buildGreeting,
  VOICE_AGENT_SAMPLE_RATE,
  SUPPORTED_ROLES,
} from "./agents/voiceInterviewAgentConfig.js";

// Evaluation, career intelligence and the chart data the dashboard renders.
export {
  EVALUATION_CRITERIA,
  calculateOverallScore,
  formatEvaluationReport,
} from "./evaluation/index.js";
export {
  analyzeSkillGaps,
  generateRoadmap,
  buildNextSteps,
} from "./career-engine/index.js";
export { buildAnalytics, PERCENT_MAX } from "./analytics/index.js";
