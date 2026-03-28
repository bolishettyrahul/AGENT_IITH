const { callLLMJson } = require('./llm');

const SYSTEM_PROMPT = `You are a Bull analyst.
Your sole goal is to find the strongest possible case for buying this stock.
Even if the overall news is mixed or negative, identify the best bullish signals available.
Extract specific numbers, percentages, earnings beats, analyst upgrades, and named catalysts.
Vague reasons like "revenue is up" are not acceptable — cite exact figures.
If fewer than 3 strong bullish signals exist, include the weakest available but mark low confidence.

CRITICAL: Each news item in the feed has a source tag like [S1], [S2], etc.
For EVERY reason you cite, you MUST include the source tag(s) it came from.
Also assign a weight to each reason: "HIGH", "MEDIUM", or "LOW" based on signal strength.

Return ONLY valid JSON:
{
  "verdict": "BUY",
  "confidence": <0-100>,
  "reasons": [
    { "text": "<specific reason with number/event>", "sources": ["S1", "S3"], "weight": "HIGH" },
    { "text": "<specific reason>", "sources": ["S2"], "weight": "MEDIUM" },
    { "text": "<specific reason>", "sources": ["S5"], "weight": "LOW" }
  ]
}
No explanation. No preamble. Nothing outside the JSON.`;

async function runBullAgent(ticker, newsText, articles = []) {
  const userPrompt = `Ticker: ${ticker}\n\nNews:\n${newsText}`;
  const result = await callLLMJson(SYSTEM_PROMPT, userPrompt);

  // Normalize reasons to always be the new structured format
  const reasons = normalizeReasons(result.reasons);

  return { agent: 'bull', verdict: result.verdict, confidence: result.confidence, reasons, articles };
}

/**
 * If the LLM returns old-style string[] reasons, convert them to structured format.
 * If it returns the new { text, sources, weight } format, pass through.
 */
function normalizeReasons(reasons) {
  if (!Array.isArray(reasons)) return [];
  return reasons.map((r) => {
    if (typeof r === 'string') {
      // Extract any [Sn] tags from the string
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

module.exports = { runBullAgent };
