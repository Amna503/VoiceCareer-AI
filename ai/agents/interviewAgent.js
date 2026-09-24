/**
 * Adaptive Interview Agent
 * Conducts interviews that adapt based on the candidate's responses.
 * Generates contextual follow-up questions instead of fixed scripts.
 */

const INTERVIEW_SYSTEM_PROMPT = `You are VoiceCareer AI's Adaptive Interview Agent. You conduct professional, realistic interviews that adapt to the candidate's responses.

CORE PRINCIPLE: You do NOT follow a fixed script. You listen to what the candidate says and generate intelligent follow-up questions based on their specific answers.

INTERVIEW MODES:
1. TECHNICAL — Tests technical knowledge for the target role
2. HR/BEHAVIORAL — Tests soft skills, experience, and cultural fit

BEHAVIOR:
- Be professional but friendly — like a real interviewer
- Ask ONE question at a time
- Keep questions clear and concise (1-2 sentences)
- Listen carefully to answers and generate ADAPTIVE follow-ups
- If a candidate mentions a technology/project, dig deeper into it
- If a candidate gives a vague answer, ask for specific examples
- If a candidate shows strong knowledge, increase difficulty
- If a candidate struggles, offer a hint or move to another area
- Track which topics have been covered to avoid repetition

ADAPTIVE QUESTIONING RULES:
- NEVER ask the next question from a fixed list
- ALWAYS base your next question on what the candidate just said
- If they mention a specific technology → ask about their experience with it
- If they describe a project → ask about challenges they faced
- If they mention a weakness → ask how they're working to improve it
- If they give a theoretical answer → ask for a practical example
- If they give a practical answer → ask about the reasoning behind their approach

INTERVIEW FLOW:
1. Start with a brief introduction and first question
2. Conduct 6-10 questions (adaptive based on conversation)
3. After enough questions, end the interview gracefully
4. Signal completion with INTERVIEW_COMPLETE marker

INTERVIEW COMPLETION:
When you have asked enough questions (minimum 6, maximum 10) and covered sufficient ground, end with:

INTERVIEW_COMPLETE

TONE: Professional, encouraging, neutral. Never critical during the interview — evaluation happens after.`;

const TECHNICAL_QUESTIONS = {
  frontend: [
    "Can you tell me about your experience with frontend development?",
    "What is the virtual DOM and why is it useful?",
    "How do you handle state management in a React application?",
    "Can you explain the difference between CSS Grid and Flexbox?",
    "How do you optimize frontend performance?",
    "Describe your approach to responsive design.",
    "How do you handle API errors and loading states in a frontend application?",
    "What testing strategies do you use for frontend code?"
  ],
  backend: [
    "Can you tell me about your experience with backend development?",
    "How do you design a RESTful API?",
    "What is the difference between SQL and NoSQL databases?",
    "How do you handle authentication and authorization?",
    "Explain the concept of middleware in Express.js.",
    "How do you handle database migrations?",
    "What strategies do you use for API error handling?",
    "How do you optimize database queries?"
  ],
  data: [
    "Can you tell me about your experience with data analysis?",
    "What tools do you use for data visualization?",
    "How do you handle missing data in a dataset?",
    "Can you explain the difference between supervised and unsupervised learning?",
    "How do you ensure data quality in your analyses?",
    "Describe a time you used data to make a business recommendation.",
    "What SQL concepts are you comfortable with?",
    "How do you approach exploratory data analysis?"
  ],
  general: [
    "Tell me about yourself and your career journey.",
    "Why are you interested in this role?",
    "What are your greatest strengths?",
    "Can you describe a challenging project you worked on?",
    "How do you handle tight deadlines?",
    "Where do you see yourself in five years?",
    "Why should we hire you?",
    "Do you have any questions for us?"
  ]
};

export class InterviewAgent {
  constructor(llmService) {
    this.llm = llmService;
    this.conversationHistory = [];
    this.questions = [];
    this.currentMode = "general";
    this.targetRole = "general";
    this.turnCount = 0;
    this.maxQuestions = 10;
    this.coveredTopics = [];
    this.candidateProfile = null;
  }

  setTargetRole(role) {
    this.targetRole = role;
    if (TECHNICAL_QUESTIONS[role]) {
      this.currentMode = "technical";
    }
  }

  setCandidateProfile(profile) {
    this.candidateProfile = profile;
  }

  async startInterview(mode = "general") {
    this.currentMode = mode;

    const contextInfo = this.candidateProfile
      ? `\nCANDIDATE PROFILE: ${JSON.stringify(this.candidateProfile)}`
      : "";

    const roleInfo = this.targetRole !== "general"
      ? `\nTARGET ROLE: ${this.targetRole}`
      : "";

    const openingPrompt = `[SYSTEM: Start a professional interview greeting. Briefly introduce yourself as an AI interviewer, explain the interview format, and ask the first question. Be natural and professional. The interview mode is ${this.currentMode}.${roleInfo}${contextInfo}]`;

    const messages = [
      { role: "system", content: INTERVIEW_SYSTEM_PROMPT },
      { role: "user", content: openingPrompt }
    ];

    const response = await this.llm.generate(messages, { maxTokens: 200 });

    this.conversationHistory.push(
      { role: "assistant", content: response }
    );

    return response;
  }

  async processAnswer(candidateAnswer) {
    this.turnCount++;
    this.conversationHistory.push({ role: "user", content: candidateAnswer });

    const contextInfo = this.candidateProfile
      ? `\nCANDIDATE PROFILE: ${JSON.stringify(this.candidateProfile)}`
      : "";

    const topicInfo = this.coveredTopics.length > 0
      ? `\nTOPICS ALREADY COVERED: ${this.coveredTopics.join(", ")}`
      : "";

    const questionNumber = this.turnCount + 1;
    const remaining = this.maxQuestions - this.turnCount;

    const instruction = `[SYSTEM: The candidate just answered. Generate the next ADAPTIVE interview question based on what they said. Question ${questionNumber} of ${this.maxQuestions}.${topicInfo}${contextInfo}${remaining <= 2 ? " You should wrap up the interview soon." : ""}]`;

    const messages = [
      { role: "system", content: INTERVIEW_SYSTEM_PROMPT },
      ...this.conversationHistory,
      { role: "user", content: instruction }
    ];

    const response = await this.llm.generate(messages, { maxTokens: 200 });

    this.conversationHistory.push({ role: "assistant", content: response });

    // Track topics from candidate's answer
    const topics = this.extractTopics(candidateAnswer);
    this.coveredTopics.push(...topics);

    // Check if interview should end
    const interviewComplete = response.includes("INTERVIEW_COMPLETE") ||
      this.turnCount >= this.maxQuestions;

    return {
      message: response.split("INTERVIEW_COMPLETE")[0].trim(),
      questionNumber: this.turnCount + 1,
      totalQuestions: this.maxQuestions,
      interviewComplete,
      coveredTopics: [...this.coveredTopics]
    };
  }

  extractTopics(answer) {
    const topics = [];
    const lowerAnswer = answer.toLowerCase();

    const topicKeywords = {
      react: ["react", "jsx", "component", "hooks", "useState", "useEffect"],
      javascript: ["javascript", "js", "es6", "typescript", "node"],
      css: ["css", "styling", "tailwind", "grid", "flexbox", "responsive"],
      api: ["api", "rest", "fetch", "axios", "endpoint", "http"],
      database: ["database", "sql", "mongodb", "postgres", "supabase"],
      testing: ["test", "jest", "cypress", "testing", "unit test"],
      python: ["python", "django", "flask", "pandas", "numpy"],
      git: ["git", "github", "version control", "branch", "commit"],
      communication: ["communication", "team", "collaborate", "present"],
      leadership: ["lead", "mentor", "manage", "coordinate"],
      problem_solving: ["problem", "solve", "debug", "troubleshoot", "challenge"]
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => lowerAnswer.includes(kw))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  reset() {
    this.conversationHistory = [];
    this.questions = [];
    this.turnCount = 0;
    this.coveredTopics = [];
    this.candidateProfile = null;
  }
}

export default InterviewAgent;
