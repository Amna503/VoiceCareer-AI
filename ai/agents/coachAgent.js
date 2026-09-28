/**
 * Career Coach Agent
 * Evaluates interview performance, provides feedback, identifies skill gaps,
 * and generates personalized career roadmaps.
 */

const COACH_EVALUATION_PROMPT = `You are VoiceCareer AI's Career Coach Agent. Your job is to evaluate interview performance and provide constructive, actionable feedback.

EVALUATION CRITERIA:
1. ANSWER RELEVANCE — Did the candidate answer the question asked?
2. TECHNICAL KNOWLEDGE — How strong is their technical understanding?
3. COMMUNICATION CLARITY — Was their answer clear and well-structured?
4. PROBLEM SOLVING — Did they demonstrate logical thinking?
5. CONFIDENCE — Did they speak with confidence and conviction?
5. FOLLOW-UP HANDLING — How well did they handle follow-up questions?

RULES:
- Be constructive and specific — not generic
- Reference specific answers from the interview
- Provide actionable improvement suggestions
- Balance positive feedback with areas for growth
- Keep the tone supportive and encouraging

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "overallScore": number (1-10),
  "evaluation": {
    "answerRelevance": { "score": number (1-10), "feedback": "string" },
    "technicalKnowledge": { "score": number (1-10), "feedback": "string" },
    "communicationClarity": { "score": number (1-10), "feedback": "string" },
    "problemSolving": { "score": number (1-10), "feedback": "string" },
    "confidence": { "score": number (1-10), "feedback": "string" },
    "followUpHandling": { "score": number (1-10), "feedback": "string" }
  },
  "strengths": ["string"],
  "improvements": ["string"],
  "detailedFeedback": "string"
}`;

const SKILL_GAP_PROMPT = `You are VoiceCareer AI's Skill Gap Analyst. Compare the candidate's current skills against the requirements of their target career role.

INPUT:
- Current skills from the career profile
- Target career role
- Interview performance data

OUTPUT FORMAT:
Return a JSON object:
{
  "targetRole": "string",
  "currentSkills": [
    { "skill": "string", "level": "beginner|intermediate|advanced", "evidence": "string" }
  ],
  "requiredSkills": [
    { "skill": "string", "importance": "critical|important|nice-to-have", "description": "string" }
  ],
  "gaps": [
    { "skill": "string", "importance": "critical|important|nice-to-have", "currentLevel": "string", "suggestedImprovement": "string" }
  ],
  "matchedSkills": ["string"],
  "summary": "string"
}`;

const ROADMAP_PROMPT = `You are VoiceCareer AI's Career Roadmap Generator. Create a personalized, actionable career roadmap based on the candidate's profile, skill gaps, and career goals.

GUIDELINES:
- Create a 30-day roadmap (4 weeks)
- Each week should have a clear focus area
- Include specific learning resources, projects, and practice activities
- Prioritize skill gaps that are most critical for the target role
- Include both learning and practice activities
- End with interview preparation and portfolio building
- Be specific — not generic advice

OUTPUT FORMAT:
Return a JSON object:
{
  "roadmap": [
    {
      "week": number,
      "focus": "string",
      "goals": ["string"],
      "activities": [
        { "type": "learn|practice|project|review", "title": "string", "description": "string", "duration": "string" }
      ],
      "milestone": "string"
    }
  ],
  "totalHours": number,
  "keyResources": [
    { "name": "string", "type": "course|article|tool|practice", "url": "string or null" }
  ]
}`;

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

    const response = await this.llm.generate(messages, {
      maxTokens: 800,
      temperature: 0.3
    });

    try {
      const jsonStart = response.indexOf("{");
      const jsonEnd = response.lastIndexOf("}") + 1;
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        return JSON.parse(response.substring(jsonStart, jsonEnd));
      }
    } catch (e) {
      console.error("Failed to parse evaluation JSON:", e);
    }

    return {
      overallScore: 5,
      evaluation: {
        answerRelevance: { score: 5, feedback: "Evaluation parsing failed" },
        technicalKnowledge: { score: 5, feedback: "Evaluation parsing failed" },
        communicationClarity: { score: 5, feedback: "Evaluation parsing failed" },
        problemSolving: { score: 5, feedback: "Evaluation parsing failed" },
        confidence: { score: 5, feedback: "Evaluation parsing failed" },
        followUpHandling: { score: 5, feedback: "Evaluation parsing failed" }
      },
      strengths: [],
      improvements: [],
      detailedFeedback: "Unable to generate detailed feedback at this time."
    };
  }

  async analyzeSkillGaps(candidateProfile, targetRole, evaluation) {
    const prompt = `Analyze skill gaps for this candidate:

CANDIDATE PROFILE: ${JSON.stringify(candidateProfile || {})}
TARGET ROLE: ${targetRole}
INTERVIEW EVALUATION: ${JSON.stringify(evaluation || {})}

Provide your analysis as a JSON object following the specified format.`;

    const messages = [
      { role: "system", content: SKILL_GAP_PROMPT },
      { role: "user", content: prompt }
    ];

    const response = await this.llm.generate(messages, {
      maxTokens: 800,
      temperature: 0.3
    });

    try {
      const jsonStart = response.indexOf("{");
      const jsonEnd = response.lastIndexOf("}") + 1;
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        return JSON.parse(response.substring(jsonStart, jsonEnd));
      }
    } catch (e) {
      console.error("Failed to parse skill gap JSON:", e);
    }

    return {
      targetRole,
      currentSkills: [],
      requiredSkills: [],
      gaps: [],
      matchedSkills: [],
      summary: "Unable to generate skill gap analysis at this time."
    };
  }

  async generateRoadmap(candidateProfile, skillGaps, targetRole) {
    const prompt = `Generate a personalized 30-day career roadmap:

CANDIDATE PROFILE: ${JSON.stringify(candidateProfile || {})}
TARGET ROLE: ${targetRole}
SKILL GAPS: ${JSON.stringify(skillGaps || {})}

Create an actionable roadmap with specific weekly goals, activities, and milestones.

Provide your roadmap as a JSON object following the specified format.`;

    const messages = [
      { role: "system", content: ROADMAP_PROMPT },
      { role: "user", content: prompt }
    ];

    const response = await this.llm.generate(messages, {
      maxTokens: 1200,
      temperature: 0.4
    });

    try {
      const jsonStart = response.indexOf("{");
      const jsonEnd = response.lastIndexOf("}") + 1;
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        return JSON.parse(response.substring(jsonStart, jsonEnd));
      }
    } catch (e) {
      console.error("Failed to parse roadmap JSON:", e);
    }

    return {
      roadmap: [],
      totalHours: 0,
      keyResources: []
    };
  }

  async generateCompleteAnalysis(interviewHistory, candidateProfile, targetRole) {
    const evaluation = await this.evaluateInterview(interviewHistory, candidateProfile);
    const skillGaps = await this.analyzeSkillGaps(candidateProfile, targetRole, evaluation);
    const roadmap = await this.generateRoadmap(candidateProfile, skillGaps, targetRole);

    return {
      evaluation,
      skillGaps,
      roadmap
    };
  }
}

export default CoachAgent;
