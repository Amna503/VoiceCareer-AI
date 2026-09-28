/**
 * Career Engine Module
 * Role requirements, skill gap analysis and dynamic roadmap generation.
 */

export {
  CAREER_ROLE_REQUIREMENTS,
  getRoleRequirements,
  analyzeSkillGaps,
  resolveRole,
  extractJobDescriptionSkills,
  skillsMatch,
} from "./skillGap.js";
export {
  resolveRoleKey,
  resolveExperienceLevel,
  roleTitle,
  SKILL_ALIASES,
} from "./roleCatalog.js";
export { WEEK_COUNT, generateRoadmap, normaliseWeek } from "./roadmap.js";
export { buildNextSteps, NEXT_STEP_COUNT } from "./nextSteps.js";
