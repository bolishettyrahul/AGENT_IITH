const axios = require('axios');
require('dotenv').config();

const GROQ_BASE = 'https://api.groq.com/openai/v1';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Extract the last complete JSON object from a string using bracket-depth counting.
 * Handles LLM preamble text before/after the JSON block.
 */
function extractLastJson(text) {
  let lastStart = -1;
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) lastStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && lastStart !== -1) {
        const candidate = text.slice(lastStart, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {
          lastStart = -1; // malformed — keep scanning
        }
      }
    }
  }
  throw new Error('No valid JSON object found in response');
}

async function callLLM(systemPrompt, userPrompt, timeout = 15000) {
  const MAX_RETRIES = 3;
  let delay = 3000;

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
          timeout,
        }
      );
      return response.data.choices[0].message.content;
    } catch (err) {
      const status = err.response?.status;
      if (status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = err.response?.headers?.['retry-after'];
        const suggested = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
        const waitMs = Math.min(suggested, 12000); // cap at 12s for demo
        console.warn(`[LLM] 429 — waiting ${waitMs}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(waitMs);
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

async function callLLMJson(systemPrompt, userPrompt, timeout = 15000) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const extra = attempt === 2 ? '\n\nReturn ONLY JSON, nothing else.' : '';
    const raw = await callLLM(systemPrompt, userPrompt + extra, timeout);

    try {
      return extractLastJson(raw);
    } catch {
      if (attempt === 2) throw new Error(`JSON parse failed after retry. Raw: ${raw}`);
    }
  }
}

module.exports = { callLLM, callLLMJson };
