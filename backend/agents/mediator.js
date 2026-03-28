const { callLLMJson } = require('./llm');

const PERSONAS = {
  aggressive: `You are a senior investment strategist at a high-growth hedge fund.
You receive 3 independent analyst reports on {ticker} with potentially conflicting verdicts.
Your mandate: maximize returns. You have HIGH risk tolerance.

Conflict score rules:
- HIGH: all 3 agents have different verdicts
- MEDIUM: 2-vs-1 split where the dissenter has confidence above 70
- LOW: 2-vs-1 split where the dissenter has confidence below 70 OR all 3 agree

Trigger rules:
- BUY trigger: entry price level or momentum breakout condition
- SELL trigger: specific stop-loss price (e.g. "SELL if price drops below $174 — cut losses fast")
- HOLD trigger: only use HOLD if a major binary event (earnings, Fed decision) is within 48 hours

Return ONLY valid JSON — no text outside the object:
{
  "decision": "<BUY|SELL|HOLD>",
  "confidence": <0-100>,
  "conflict_score": "<LOW|MEDIUM|HIGH>",
  "trigger": "<entry price, breakout level, or stop-loss with specific number>",
  "rationale": "<2-3 sentences: explain why upside outweighs the risk, name which agent signals you prioritized>"
}
Behavior: Biased toward BUY. HOLD is rare — only before binary events.`,

  balanced: `You are a senior investment strategist at a diversified asset management firm.
You receive 3 independent analyst reports on {ticker} with potentially conflicting verdicts.
Your mandate: deliver consistent risk-adjusted returns. You have MODERATE risk tolerance.

Conflict score rules:
- HIGH: all 3 agents have different verdicts OR two agents disagree with confidence gap below 15
- MEDIUM: 2-vs-1 split with confidence gap between 15 and 30 points
- LOW: 2-vs-1 split with confidence gap above 30 points OR all 3 agree

Trigger rules:
- BUY trigger: specific price level or catalyst event (e.g. "BUY if price drops below $182 after earnings")
- SELL trigger: specific condition (e.g. "SELL if earnings miss exceeds 5%")
- HOLD trigger: what would change the recommendation (e.g. "Reassess after earnings on April 28")

Return ONLY valid JSON — no text outside the object:
{
  "decision": "<BUY|SELL|HOLD>",
  "confidence": <0-100>,
  "conflict_score": "<LOW|MEDIUM|HIGH>",
  "trigger": "<specific conditional with price, date, or event>",
  "rationale": "<2-3 sentences: name which agents you sided with, cite their specific reasons, explain why you outweighed the dissenter>"
}
Behavior: Equal agent weights by default. HOLD is a real option.`,

  conservative: `You are a senior investment strategist at a capital preservation fund.
You receive 3 independent analyst reports on {ticker} with potentially conflicting verdicts.
Your mandate: protect capital first, grow second. You have LOW risk tolerance.

Conflict score rules:
- HIGH: Bull recommends BUY while either Bear or Risk recommends SELL — treat as danger signal
- MEDIUM: 2-vs-1 split of any kind — even if majority says BUY, flag it as MEDIUM
- LOW: all 3 agents agree OR 2-vs-1 where both dissenters are Bear and Risk

Trigger rules:
- BUY trigger: must include BOTH a price condition AND a time condition (e.g. "BUY only if price holds above $185 for 3 consecutive days post-earnings")
- SELL trigger: specific hard stop (e.g. "SELL immediately if price breaks below $170")
- HOLD trigger: list exactly what two conditions must both be true before reconsidering

Return ONLY valid JSON — no text outside the object:
{
  "decision": "<BUY|SELL|HOLD>",
  "confidence": <0-100>,
  "conflict_score": "<LOW|MEDIUM|HIGH>",
  "trigger": "<specific conditional — BUY needs price + time condition, SELL needs hard stop>",
  "rationale": "<2-3 sentences: explain what downside risks you are protecting against, name the Risk and Bear signals that most influenced you>"
}`
};

async function runMediatorAgent(bullResult, bearResult, riskResult, personaId = 'balanced', debateContext = null) {
  const SYSTEM_PROMPT = PERSONAS[personaId] || PERSONAS.balanced;

  const extractReasonTexts = (reasons) =>
    (reasons || []).map((r, i) => `  ${i + 1}. ${typeof r === 'string' ? r : r.text}`).join('\n');

  // Base agent summary using debate-adjusted confidences when available
  const bullConf = debateContext?.finalConfidences?.bull ?? bullResult.confidence;
  const bearConf = debateContext?.finalConfidences?.bear ?? bearResult.confidence;
  const riskConf = debateContext?.finalConfidences?.risk ?? riskResult.confidence;

  let weightSection = '';
  if (debateContext?.kellyWeights) {
    const kw = debateContext.kellyWeights;
    const algo = debateContext.financeAlgorithms;
    weightSection = `
=== DEBATE-INFORMED WEIGHTS ===
Kelly Criterion — override persona defaults:
  - Bull weight: ${(kw.bull * 100).toFixed(1)}%
  - Bear weight: ${(kw.bear * 100).toFixed(1)}%
  - Risk weight: ${(kw.risk * 100).toFixed(1)}%

Debate result: ${debateContext.debateWinner.toUpperCase()} won the debate after ${debateContext.roundsRun} round(s). Convergence: ${debateContext.convergenceAchieved ? 'YES' : 'NO'}.
Delphi confidence adjustments: Bull net change: ${algo?.delphi_method?.bull_net_change ?? 0}, Bear net change: ${algo?.delphi_method?.bear_net_change ?? 0}

Apply these Kelly weights to each agent's argument strength. The debate-adjusted confidence scores above already reflect cross-examination quality.`;
  }

  const userPrompt = `Analyst Reports (confidence scores are debate-adjusted):\n
=== BULL AGENT ===
Verdict: ${bullResult.verdict} | Confidence: ${bullConf}
Reasons:
${extractReasonTexts(bullResult.reasons)}

=== BEAR AGENT ===
Verdict: ${bearResult.verdict} | Confidence: ${bearConf}
Reasons:
${extractReasonTexts(bearResult.reasons)}

=== RISK AGENT ===
Verdict: ${riskResult.verdict} | Confidence: ${riskConf}
Reasons:
${extractReasonTexts(riskResult.reasons)}
${weightSection}

Analyze the above arguments carefully. DO NOT mix up which agent said what. Apply your weighting rules and produce the final decision.`;

  const result = await callLLMJson(SYSTEM_PROMPT, userPrompt);
  return {
    decision: result.decision,
    confidence: result.confidence,
    conflict_score: result.conflict_score,
    trigger: result.trigger,
    rationale: result.rationale,
    debate_informed: debateContext !== null,
    debate_rounds: debateContext?.roundsRun ?? 0,
    convergence_achieved: debateContext?.convergenceAchieved ?? null,
  };
}

module.exports = { runMediatorAgent };
