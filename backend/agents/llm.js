const axios = require('axios');
require('dotenv').config();

// Groq — OpenAI-compatible, free tier, high rate limits, fast LPU hardware
const GROQ_BASE = 'https://api.groq.com/openai/v1';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// callLLM runs per-agent (agents still launch in parallel via Promise.allSettled in server.js)
// This only retries the individual call if Groq returns 429
async function callLLM(systemPrompt, userPrompt) {
  const MAX_RETRIES = 4;
  let delay = 8000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        `${GROQ_BASE}/chat/completions`,
        {
          model: process.env.GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 800,
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
    } catch (err) {
      const status = err.response?.status;
      if (status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = err.response?.headers?.['retry-after'];
        const suggested = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
        const waitMs = Math.min(suggested, 60000); // cap at 60s — fail fast if badly throttled
        console.warn(`[LLM] 429 — waiting ${waitMs}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(waitMs);
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
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
