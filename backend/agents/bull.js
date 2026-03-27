const { callLLMJson } = require('./llm');

const SYSTEM_PROMPT = `You are a Bull analyst.
Your sole goal is to find the strongest possible case for buying this stock.
Even if the overall news is mixed or negative, identify the best bullish signals available.
Extract specific numbers, percentages, earnings beats, analyst upgrades, and named catalysts.
Vague reasons like "revenue is up" are not acceptable — cite exact figures.
If fewer than 3 strong bullish signals exist, include the weakest available but mark low confidence.
Return ONLY valid JSON:
{ "verdict": "BUY", "confidence": <0-100>, "reasons": ["<specific with number/event>", "<specific>", "<specific>"] }
No explanation. No preamble. Nothing outside the JSON.`;

async function runBullAgent(ticker, newsText) {
  const userPrompt = `Ticker: ${ticker}\n\nNews:\n${newsText}`;
  const result = await callLLMJson(SYSTEM_PROMPT, userPrompt);
  return { agent: 'bull', verdict: result.verdict, confidence: result.confidence, reasons: result.reasons };
}

module.exports = { runBullAgent };
