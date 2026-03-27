const axios = require('axios');
require('dotenv').config();

// Groq — OpenAI-compatible, free tier, high rate limits, fast LPU hardware
const GROQ_BASE = 'https://api.groq.com/openai/v1';

async function callLLM(systemPrompt, userPrompt) {
  const response = await axios.post(
    `${GROQ_BASE}/chat/completions`,
    {
      model: process.env.GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * Call LLM and parse JSON from the response.
 * Retries once with a stricter JSON-only reminder if parsing fails.
 */
async function callLLMJson(systemPrompt, userPrompt) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const extra = attempt === 2 ? '\n\nReturn ONLY JSON, nothing else.' : '';
    const raw = await callLLM(systemPrompt, userPrompt + extra);

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON object found');
      return JSON.parse(match[0]);
    } catch {
      if (attempt === 2) throw new Error(`JSON parse failed after retry. Raw: ${raw}`);
    }
  }
}

module.exports = { callLLM, callLLMJson };
