const { callLLMJson } = require('./llm');

const SYSTEM_PROMPT = `You are a Bull analyst. Your sole goal is to find every reason to BUY this stock.
Extract specific numbers, percentages, and named events from the news. Vague reasons are not acceptable.
Return ONLY valid JSON: { "verdict": "BUY", "confidence": <0-100>, "reasons": ["<specific reason>", "<specific reason>", "<specific reason>"] }
No explanation. No preamble. No text outside the JSON.`;

async function runBullAgent(ticker, newsText) {
  const userPrompt = `Ticker: ${ticker}\n\nNews:\n${newsText}`;
  const result = await callLLMJson(SYSTEM_PROMPT, userPrompt);
  return { agent: 'bull', verdict: result.verdict, confidence: result.confidence, reasons: result.reasons };
}

module.exports = { runBullAgent };
