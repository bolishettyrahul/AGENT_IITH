const { callLLMJson } = require('./llm');

const SYSTEM_PROMPT = `You are a Risk analyst. Your sole goal is to protect against loss. When uncertain, always recommend HOLD.
Extract specific numbers, percentages, and named events from the news. Vague reasons are not acceptable.
Return ONLY valid JSON: { "verdict": "HOLD", "confidence": <0-100>, "reasons": ["<specific reason>", "<specific reason>", "<specific reason>"] }
No explanation. No preamble. No text outside the JSON.`;

async function runRiskAgent(ticker, newsText) {
  const userPrompt = `Ticker: ${ticker}\n\nNews:\n${newsText}`;
  const result = await callLLMJson(SYSTEM_PROMPT, userPrompt);
  return { agent: 'risk', verdict: result.verdict, confidence: result.confidence, reasons: result.reasons };
}

module.exports = { runRiskAgent };
