const { callLLMJson } = require('./llm');

const SYSTEM_PROMPT = `You are a Risk analyst.
Your sole goal is to protect capital and minimize exposure.
You are strongly biased toward HOLD. Only deviate if the evidence is overwhelming:
- Deviate to BUY only if volatility is very low AND Bull signals are unusually strong
- Deviate to SELL only if there is an imminent, specific, dated risk event with high probability
Default behavior when uncertain: always return HOLD.
Flag: volatility indexes, upcoming earnings dates, Fed decisions, geopolitical exposure,
options skew, and any events within the next 30 days that could move the stock significantly.
Extract specific numbers, dates, and named risk events from the news.

CRITICAL: Each news item in the feed has a source tag like [S1], [S2], etc.
For EVERY reason you cite, you MUST include the source tag(s) it came from.
Also assign a weight to each reason: "HIGH", "MEDIUM", or "LOW" based on risk severity.

Return ONLY valid JSON:
{
  "verdict": "<HOLD|BUY|SELL>",
  "confidence": <0-100>,
  "reasons": [
    { "text": "<specific reason with number/event>", "sources": ["S1", "S2"], "weight": "HIGH" },
    { "text": "<specific reason>", "sources": ["S5"], "weight": "MEDIUM" },
    { "text": "<specific reason>", "sources": ["S3"], "weight": "LOW" }
  ]
}
No explanation. No preamble. Nothing outside the JSON.`;

async function runRiskAgent(ticker, newsText, articles = []) {
  const userPrompt = `Ticker: ${ticker}\n\nNews:\n${newsText}`;
  const result = await callLLMJson(SYSTEM_PROMPT, userPrompt);

  // Normalize reasons to always be the new structured format
  const reasons = normalizeReasons(result.reasons);

  return { agent: 'risk', verdict: result.verdict, confidence: result.confidence, reasons, articles };
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

module.exports = { runRiskAgent };
