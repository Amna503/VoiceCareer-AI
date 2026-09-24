/**
 * Modular LLM service — swap providers by changing this file.
 * Currently uses OpenAI-compatible API (works with OpenAI, Groq, etc.)
 */

const SYSTEM_PROMPT = `You are VoiceCareer AI, a friendly and insightful career coach.
Your role is to help users explore their career goals, understand their strengths, and plan their next steps.

Rules:
- Be warm, supportive, and conversational.
- Understand the user's career-related answer and respond naturally.
- Ask ONE useful follow-up question at a time.
- Keep responses concise (2-4 sentences max).
- Do NOT repeat the same question.
- Build on previous context from the conversation history.
- If the user shares something unclear, ask for clarification gently.`;

export async function generateResponse(messages) {
  const response = await fetch(`${process.env.LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 250,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
