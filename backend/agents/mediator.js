const { callLLMJson } = require('./llm');

const SYSTEM_PROMPT = `You are a senior investment strategist at a hedge fund.
You receive 3 independent analyst reports with potentially conflicting verdicts.
Your job: synthesize them into ONE final, defensible decision.

Weighting rules:
- Higher confidence score = more influence on the final decision
- 2-vs-1 majority wins ONLY if the majority's average confidence exceeds the dissenter's by 15+ points
- If all 3 disagree with confidence within 10 points of each other: default to HOLD
- Risk Agent's HOLD recommendation adds 10 points of resistance against BUY or SELL decisions

Conflict score rules (use exactly these):
- HIGH: all 3 agents have different verdicts OR two agents disagree with confidence gap < 15
- MEDIUM: 2-vs-1 split with confidence gap between 15-30 points
- LOW: 2-vs-1 split with confidence gap > 30 points OR all 3 agree

Trigger rules:
- BUY trigger: must include a specific price level or catalyst event
- SELL trigger: must include a specific condition
- HOLD trigger: must include what would change the recommendation

Return ONLY valid JSON — no text outside the object:
{
  "decision": "<BUY|SELL|HOLD>",
  "confidence": <0-100>,
  "conflict_score": "<LOW|MEDIUM|HIGH>",
  "trigger": "<specific conditional with price, date, or event>",
  "rationale": "<2-3 sentences: name which agents you sided with, cite their specific reasons, explain why you outweighed the dissenter>"
}`;

async function runMediatorAgent(bullResult, bearResult, riskResult) {
  const userPrompt = `Analyst Reports:

Bull Agent: verdict=${bullResult.verdict}, confidence=${bullResult.confidence}
Reasons: ${bullResult.reasons.join(' | ')}

Bear Agent: verdict=${bearResult.verdict}, confidence=${bearResult.confidence}
Reasons: ${bearResult.reasons.join(' | ')}

Risk Agent: verdict=${riskResult.verdict}, confidence=${riskResult.confidence}
Reasons: ${riskResult.reasons.join(' | ')}

Apply your weighting rules and produce the final decision.`;

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
