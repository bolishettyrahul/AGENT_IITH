const axios = require('axios');
require('dotenv').config();

const FEATHERLESS_BASE = 'https://api.featherless.ai/v1';

/**
 * Call Featherless.ai with a system + user prompt.
 * Returns the raw response text.
 */
async function callLLM(systemPrompt, userPrompt) {
  const response = await axios.post(
    `${FEATHERLESS_BASE}/chat/completions`,
    {
      model: process.env.FEATHERLESS_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 512,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.FEATHERLESS_KEY}`,
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
      // Extract the first JSON object found in the response
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON object found');
      return JSON.parse(match[0]);
    } catch {
      if (attempt === 2) throw new Error(`JSON parse failed after retry. Raw: ${raw}`);
    }
  }
}

module.exports = { callLLM, callLLMJson };
