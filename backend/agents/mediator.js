const { callLLMJson } = require('./llm');

const SYSTEM_PROMPT = `You are a senior investment strategist.
You receive 3 analyst reports with conflicting verdicts.
Your job: resolve the conflict and produce ONE final decision.

Rules:
- You MUST acknowledge which agents disagree and why
- Weight confidence scores — higher confidence = more influence
- If all 3 conflict equally: default to HOLD
- Always include a conditional trigger (e.g. "BUY if X happens")
- Extract specific numbers and events from the analyst reasons
- Return ONLY valid JSON. No prose outside the JSON.

Output schema:
{ "decision": "BUY|SELL|HOLD", "confidence": <0-100>, "conflict_score": "LOW|MEDIUM|HIGH", "trigger": "<string>", "rationale": "<2-3 sentence explanation>" }`;

async function runMediatorAgent(bullResult, bearResult, riskResult) {
  const userPrompt = `Analyst Reports:

Bull Agent: verdict=${bullResult.verdict}, confidence=${bullResult.confidence}
Reasons: ${bullResult.reasons.join(' | ')}

Bear Agent: verdict=${bearResult.verdict}, confidence=${bearResult.confidence}
Reasons: ${bearResult.reasons.join(' | ')}

Risk Agent: verdict=${riskResult.verdict}, confidence=${riskResult.confidence}
Reasons: ${riskResult.reasons.join(' | ')}

Resolve the conflict and produce a final decision.`;

  const result = await callLLMJson(SYSTEM_PROMPT, userPrompt);
  return {
    decision: result.decision,
    confidence: result.confidence,
    conflict_score: result.conflict_score,
    trigger: result.trigger,
    rationale: result.rationale,
  };
}

module.exports = { runMediatorAgent };
