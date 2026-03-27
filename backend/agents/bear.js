const { callLLMJson } = require('./llm');

const SYSTEM_PROMPT = `You are a Bear analyst.
Your sole goal is to find the strongest possible case for selling this stock.
Even if the overall news is positive, identify the most significant downside risks available.
Focus exclusively on: earnings misses, analyst downgrades, insider selling, macro headwinds,
regulatory risks, valuation concerns, and competitive threats.
Extract specific numbers, percentages, dates, and named risk events.
Do not reference any positive signals — they are outside your mandate.
If fewer than 3 strong bearish signals exist, include the weakest available but mark low confidence.

CRITICAL: Each news item in the feed has a source tag like [S1], [S2], etc.
For EVERY reason you cite, you MUST include the source tag(s) it came from.
Also assign a weight to each reason: "HIGH", "MEDIUM", or "LOW" based on signal strength.

Return ONLY valid JSON:
{
  "verdict": "SELL",
  "confidence": <0-100>,
  "reasons": [
    { "text": "<specific reason with number/event>", "sources": ["S1", "S4"], "weight": "HIGH" },
    { "text": "<specific reason>", "sources": ["S2"], "weight": "MEDIUM" },
    { "text": "<specific reason>", "sources": ["S6"], "weight": "LOW" }
  ]
}
No explanation. No preamble. Nothing outside the JSON.`;

async function runBearAgent(ticker, newsText, articles = []) {
  const userPrompt = `Ticker: ${ticker}\n\nNews:\n${newsText}`;
  const result = await callLLMJson(SYSTEM_PROMPT, userPrompt);

  // Normalize reasons to always be the new structured format
  const reasons = normalizeReasons(result.reasons);

  return { agent: 'bear', verdict: result.verdict, confidence: result.confidence, reasons, articles };
}

function normalizeReasons(reasons) {
  if (!Array.isArray(reasons)) return [];
  return reasons.map((r) => {
    if (typeof r === 'string') {
      const sourceTags = [...r.matchAll(/\[S(\d+)\]/g)].map(m => `S${m[1]}`);
      return { text: r.replace(/\[S\d+\]/g, '').trim(), sources: sourceTags, weight: 'MEDIUM' };
    }
    return {
      text: r.text || String(r),
      sources: Array.isArray(r.sources) ? r.sources : [],
      weight: r.weight || 'MEDIUM',
    };
  });
}

module.exports = { runBearAgent };
