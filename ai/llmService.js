/**
 * Shared LLM Service
 * Wraps the OpenAI-compatible API for use by all AI agents.
 */

export class LLMService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.LLM_BASE_URL || "https://api.openai.com/v1";
    this.apiKey = config.apiKey || process.env.LLM_API_KEY;
    this.model = config.model || process.env.LLM_MODEL || "gpt-4o-mini";
    this.defaultMaxTokens = config.maxTokens || 250;
    this.defaultTemperature = config.temperature || 0.7;
  }

  async generate(messages, options = {}) {
    const {
      maxTokens = this.defaultMaxTokens,
      temperature = this.defaultTemperature,
      model = this.model
    } = options;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}

export default LLMService;
