const { callLLMJson } = require('./llm');

// ─── Bayesian Source Tier Scoring ───────────────────────────────────────────

const SOURCE_TIERS = {
  // Tier 3 — institutional
  Reuters: 3, Bloomberg: 3, 'Financial Times': 3, 'Wall Street Journal': 3,
  'Associated Press': 3, 'The Economist': 3,
  // Tier 2 — major business
  CNBC: 2, 'Business Standard': 2, 'Economic Times': 2, 'Inc42': 2,
  Forbes: 2, Fortune: 2, 'Business Insider': 2, Barron: 2, MarketWatch: 2,
  // Tier 1 — general / unverified
  'Yahoo Finance': 1, Mint: 1, 'Seeking Alpha': 1,
};

function getSourceTier(publisherName) {
  if (!publisherName) return 1;
  return SOURCE_TIERS[publisherName.trim()] || 1;
}

function getBestSourceTier(reasonsOrAttacks, articles) {
  let maxTier = 1;
  const sourceSets = reasonsOrAttacks.map((r) => r.sources || []);
  for (const sources of sourceSets) {
    for (const srcId of sources) {
      const article = articles.find((a) => a.id === srcId);
      if (article) {
        const t = getSourceTier(article.publisher);
        if (t > maxTier) maxTier = t;
      }
    }
  }
  return maxTier;
}

function bayesianTierResult(rebuttalItems, originalReasons, articles) {
  const rebuttalTier = getBestSourceTier(rebuttalItems, articles);
  const originalTier = getBestSourceTier(originalReasons, articles);
  return {
    rebuttalTier,
    originalTier,
    tierWin: rebuttalTier > originalTier,
    tierRatio: rebuttalTier / Math.max(originalTier, 1),
  };
}

// ─── Delphi Confidence Updates ───────────────────────────────────────────────

/**
 * Applies a calibrated confidence penalty.
 * Full rebuttal from higher-tier source: -8 to -12 pts (amplified by tier ratio)
 * Partial concede: -6 pts on the conceding agent
 */
function delphiUpdate(currentConf, eventType, tierRatio = 1) {
  let delta = 0;
  if (eventType === 'full_rebuttal') {
    delta = -(8 + Math.round((tierRatio - 1) * 4));
    delta = Math.max(delta, -12);
  } else if (eventType === 'partial_concede') {
    delta = -6;
  } else if (eventType === 'full_concede') {
    delta = -12;
  }
  return Math.max(0, Math.min(100, currentConf + delta));
}

// ─── Kelly Criterion Weights ─────────────────────────────────────────────────

function computeKellyWeight(wins, totalRounds, concessions) {
  const winRate = totalRounds > 0 ? wins / totalRounds : 0.33;
  const edge = Math.max(0, 2 * winRate - 1); // standard Kelly edge
  const credibilityBonus = Math.min(0.15, concessions * 0.05);
  return Math.min(1.0, edge + credibilityBonus);
}

function applyPersonaBias(kellyWeights, personaId) {
  // Persona biases directional preference but Kelly can override when decisive
  const biasMaps = {
    aggressive: { bull: 1.4, bear: 0.7, risk: 0.5 },
    conservative: { bull: 0.5, bear: 1.1, risk: 1.4 },
    balanced:    { bull: 1.0, bear: 1.0, risk: 1.0 },
  };
  const bias = biasMaps[personaId] || biasMaps.balanced;
  const biased = {
    bull: kellyWeights.bull * bias.bull,
    bear: kellyWeights.bear * bias.bear,
    risk: kellyWeights.risk * bias.risk,
  };
  const sum = biased.bull + biased.bear + biased.risk;
  if (sum === 0) return { bull: 0.45, bear: 0.35, risk: 0.20 };
  return {
    bull: +(biased.bull / sum).toFixed(3),
    bear: +(biased.bear / sum).toFixed(3),
    risk: +(biased.risk / sum).toFixed(3),
  };
}

// ─── LLM Prompts ─────────────────────────────────────────────────────────────

const BULL_REBUTTAL_SYSTEM = `You are the Bull analyst making a cross-examination rebuttal.
You MUST directly address the Bear's specific claims — no generic statements.

MANDATORY RULES:
1. Cite source tags [S1], [S2], etc. for EVERY counter-argument.
2. You may concede a point — mark it "concede" — if Bear's evidence is clearly stronger. A genuine concession earns credibility.
3. Be specific: cite numbers, percentages, named events.

Return ONLY valid JSON:
{
  "turn_type": "rebuttal" | "partial_concede" | "full_concede",
  "confidence_after": <0-100, your adjusted confidence after this rebuttal>,
  "points": [
    { "type": "counter" | "concede", "claim_addressed": "<exact Bear claim>", "response": "<specific counter or concession>", "sources": ["S1"], "weight": "HIGH" | "MEDIUM" | "LOW" }
  ],
  "summary": "<1-2 sentences: your overall rebuttal stance>"
}`;

const BEAR_REBUTTAL_SYSTEM = `You are the Bear analyst making a cross-examination rebuttal.
You MUST directly address the Bull's specific claims — no generic statements.

MANDATORY RULES:
1. Cite source tags [S1], [S2], etc. for EVERY counter-argument.
2. You may concede a point — mark it "concede" — if Bull's evidence is clearly stronger. A genuine concession earns credibility.
3. Be specific: cite numbers, percentages, named events.

Return ONLY valid JSON:
{
  "turn_type": "rebuttal" | "partial_concede" | "full_concede",
  "confidence_after": <0-100, your adjusted confidence after this rebuttal>,
  "points": [
    { "type": "counter" | "concede", "claim_addressed": "<exact Bull claim>", "response": "<specific counter or concession>", "sources": ["S1"], "weight": "HIGH" | "MEDIUM" | "LOW" }
  ],
  "summary": "<1-2 sentences: your overall rebuttal stance>"
}`;

function buildRiskDevilSystem(targetAgent) {
  return `You are the Risk analyst acting as devil's advocate.
Your sole job: stress-test the ${targetAgent.toUpperCase()} agent because it holds the highest confidence score.
Do NOT defend a position. Find the strongest possible ATTACK on ${targetAgent}'s argument.

MANDATORY RULES:
1. Name the target agent explicitly and state why (their confidence score).
2. Cite source tags [S1], [S2], etc. that undermine the target's claims.
3. Be surgical — vague attacks are invalid.

Return ONLY valid JSON:
{
  "turn_type": "devil_advocate",
  "target_agent": "${targetAgent}",
  "target_reason": "<why you target this agent — name their confidence score>",
  "confidence_after": <0-100, Risk's confidence after this attack>,
  "attacks": [
    { "claim_attacked": "<exact claim from ${targetAgent}>", "attack": "<specific evidence-based attack>", "sources": ["S3"], "severity": "HIGH" | "MEDIUM" | "LOW" }
  ],
  "summary": "<1-2 sentences: core vulnerability you exposed>"
}`;
}

// ─── Main Debate Orchestrator ─────────────────────────────────────────────────

async function runDebate(bullResult, bearResult, riskResult, articles, broadcastFn, ticker, personaId = 'balanced') {
  let bullConf = bullResult.confidence;
  let bearConf = bearResult.confidence;
  let riskConf = riskResult.confidence;

  let bullWins = 0, bearWins = 0;
  let bullConcessions = 0, bearConcessions = 0;
  let riskSuccessfulAttacks = 0;

  const allTurns = [];
  const rounds = [];

  broadcastFn({
    type: 'debate_start',
    ticker,
    initial_confidences: { bull: bullConf, bear: bearConf, risk: riskConf },
  });

  const MAX_ROUNDS = 2;
  let roundNum = 0;

  // Build compact news reference for rebuttal prompts
  const newsRef = articles.map((a) => `[${a.id}] ${a.publisher}: ${a.title}`).join(' | ').slice(0, 1500);

  while (roundNum < MAX_ROUNDS) {
    roundNum++;
    const roundTurns = [];

    // ── Bull rebuts Bear ──────────────────────────────────────────────────────
    const bullRebuttalUser = `Ticker: ${ticker} | Round: ${roundNum}

BEAR's argument (confidence ${bearConf}):
${bearResult.reasons.map((r) => `[${r.sources?.join(',')}] ${r.text}`).join('\n')}

YOUR opening position (confidence ${bullConf}):
${bullResult.reasons.map((r) => `[${r.sources?.join(',')}] ${r.text}`).join('\n')}

Available sources: ${newsRef}`;

    const bullRebuttal = await callLLMJson(BULL_REBUTTAL_SYSTEM, bullRebuttalUser, 8000).catch((e) => {
      console.error('[Debate][Bull rebuttal failed]', e.message);
      return null;
    });

    if (bullRebuttal) {
      const counterPoints = (bullRebuttal.points || []).filter((p) => p.type === 'counter');
      const concededPoints = (bullRebuttal.points || []).filter((p) => p.type === 'concede');
      bullConcessions += concededPoints.length;

      const { tierWin, tierRatio } = bayesianTierResult(counterPoints, bearResult.reasons, articles);

      if (tierWin) {
        bearConf = delphiUpdate(bearConf, 'full_rebuttal', tierRatio);
        bullWins++;
      }
      if (bullRebuttal.turn_type === 'partial_concede') {
        bullConf = delphiUpdate(bullConf, 'partial_concede');
      } else if (bullRebuttal.turn_type === 'full_concede') {
        bullConf = delphiUpdate(bullConf, 'full_concede');
      }
      // Accept LLM's self-assessed confidence if lower (don't let it inflate)
      if (typeof bullRebuttal.confidence_after === 'number') {
        bullConf = Math.min(bullConf, bullRebuttal.confidence_after);
      }

      const turn = {
        agent: 'bull',
        round: roundNum,
        turn_type: bullRebuttal.turn_type || 'rebuttal',
        points: bullRebuttal.points || [],
        summary: bullRebuttal.summary || '',
        confidence_before: bullResult.confidence,
        confidence_after: bullConf,
        tier_win: tierWin,
      };
      roundTurns.push(turn);
      allTurns.push(turn);
      broadcastFn({ type: 'debate_turn', ticker, ...turn });
    }

    // ── Bear rebuts Bull ──────────────────────────────────────────────────────
    const bearRebuttalUser = `Ticker: ${ticker} | Round: ${roundNum}

BULL's argument (confidence ${bullConf}):
${bullResult.reasons.map((r) => `[${r.sources?.join(',')}] ${r.text}`).join('\n')}

YOUR opening position (confidence ${bearConf}):
${bearResult.reasons.map((r) => `[${r.sources?.join(',')}] ${r.text}`).join('\n')}

Available sources: ${newsRef}`;

    const bearRebuttal = await callLLMJson(BEAR_REBUTTAL_SYSTEM, bearRebuttalUser, 8000).catch((e) => {
      console.error('[Debate][Bear rebuttal failed]', e.message);
      return null;
    });

    if (bearRebuttal) {
      const counterPoints = (bearRebuttal.points || []).filter((p) => p.type === 'counter');
      const concededPoints = (bearRebuttal.points || []).filter((p) => p.type === 'concede');
      bearConcessions += concededPoints.length;

      const { tierWin, tierRatio } = bayesianTierResult(counterPoints, bullResult.reasons, articles);

      if (tierWin) {
        bullConf = delphiUpdate(bullConf, 'full_rebuttal', tierRatio);
        bearWins++;
      }
      if (bearRebuttal.turn_type === 'partial_concede') {
        bearConf = delphiUpdate(bearConf, 'partial_concede');
      } else if (bearRebuttal.turn_type === 'full_concede') {
        bearConf = delphiUpdate(bearConf, 'full_concede');
      }
      if (typeof bearRebuttal.confidence_after === 'number') {
        bearConf = Math.min(bearConf, bearRebuttal.confidence_after);
      }

      const turn = {
        agent: 'bear',
        round: roundNum,
        turn_type: bearRebuttal.turn_type || 'rebuttal',
        points: bearRebuttal.points || [],
        summary: bearRebuttal.summary || '',
        confidence_before: bearResult.confidence,
        confidence_after: bearConf,
        tier_win: tierWin,
      };
      roundTurns.push(turn);
      allTurns.push(turn);
      broadcastFn({ type: 'debate_turn', ticker, ...turn });
    }

    // ── Risk devil's advocate — targets highest confidence ─────────────────
    const targetAgent = bullConf >= bearConf ? 'bull' : 'bear';
    const targetResult = targetAgent === 'bull' ? bullResult : bearResult;
    const targetConf = targetAgent === 'bull' ? bullConf : bearConf;

    const riskAttackUser = `Ticker: ${ticker} | Round: ${roundNum}

TARGET: ${targetAgent.toUpperCase()} agent (confidence ${targetConf})
${targetAgent.toUpperCase()} arguments:
${targetResult.reasons.map((r) => `[${r.sources?.join(',')}] ${r.text}`).join('\n')}

Available sources: ${newsRef}`;

    const riskAttack = await callLLMJson(buildRiskDevilSystem(targetAgent), riskAttackUser, 8000).catch((e) => {
      console.error('[Debate][Risk attack failed]', e.message);
      return null;
    });

    if (riskAttack) {
      const attackItems = (riskAttack.attacks || []).map((a) => ({ sources: a.sources || [] }));
      const { tierWin, tierRatio } = bayesianTierResult(attackItems, targetResult.reasons, articles);

      if (tierWin) {
        if (targetAgent === 'bull') {
          bullConf = delphiUpdate(bullConf, 'full_rebuttal', tierRatio);
        } else {
          bearConf = delphiUpdate(bearConf, 'full_rebuttal', tierRatio);
        }
        riskSuccessfulAttacks++;
      }
      if (typeof riskAttack.confidence_after === 'number') {
        riskConf = riskAttack.confidence_after;
      }

      const turn = {
        agent: 'risk',
        round: roundNum,
        turn_type: 'devil_advocate',
        target_agent: riskAttack.target_agent || targetAgent,
        target_reason: riskAttack.target_reason || '',
        attacks: riskAttack.attacks || [],
        summary: riskAttack.summary || '',
        confidence_before: riskResult.confidence,
        confidence_after: riskConf,
        tier_win: tierWin,
      };
      roundTurns.push(turn);
      allTurns.push(turn);
      broadcastFn({ type: 'debate_turn', ticker, ...turn });
    }

    // ── Round summary ─────────────────────────────────────────────────────────
    const roundSummary = {
      round: roundNum,
      confidences: { bull: bullConf, bear: bearConf, risk: riskConf },
      scores: { bull: bullWins, bear: bearWins, risk: riskSuccessfulAttacks },
    };
    rounds.push({ round: roundNum, turns: roundTurns, summary: roundSummary });
    broadcastFn({ type: 'debate_round_summary', ticker, ...roundSummary });

    // ── Early convergence check ───────────────────────────────────────────────
    const gap = Math.abs(bullConf - bearConf);
    if (gap < 15) {
      console.log(`[Debate] Early convergence round ${roundNum}: gap=${gap}`);
      break;
    }
    // ── Decisive winner check — skip further rounds if gap is already large ──
    if (gap >= 25) {
      console.log(`[Debate] Decisive winner after round ${roundNum}: gap=${gap}, skipping remaining rounds`);
      break;
    }
  }

  // ─── Compute Kelly Criterion weights ──────────────────────────────────────
  const rawBullKelly = computeKellyWeight(bullWins, roundNum, bullConcessions);
  const rawBearKelly = computeKellyWeight(bearWins, roundNum, bearConcessions);
  const rawRiskKelly = computeKellyWeight(riskSuccessfulAttacks, roundNum, 0) * 0.6 + 0.2; // Risk gets baseline

  const rawSum = rawBullKelly + rawBearKelly + rawRiskKelly;
  const normalizedKelly = rawSum > 0
    ? { bull: rawBullKelly / rawSum, bear: rawBearKelly / rawSum, risk: rawRiskKelly / rawSum }
    : { bull: 0.45, bear: 0.35, risk: 0.20 };

  const kellyWeights = applyPersonaBias(normalizedKelly, personaId);
  const convergenceAchieved = Math.abs(bullConf - bearConf) < 15;
  const debateWinner = bullConf > bearConf ? 'bull' : bearConf > bullConf ? 'bear' : 'draw';

  // ─── Finance algorithm summary ────────────────────────────────────────────
  const financeAlgorithms = {
    bayesian_tier_scoring: {
      description: 'Publisher trust tiers: Reuters/Bloomberg/FT/WSJ=3, major business=2, general=1. Higher-tier rebuttal wins the argument point automatically.',
      bull_best_tier: getBestSourceTier(bullResult.reasons, articles),
      bear_best_tier: getBestSourceTier(bearResult.reasons, articles),
    },
    delphi_method: {
      description: 'Confidence scores adjusted after each rebuttal based on argument quality and source tier. Tier-1 rebuttal: -8 to -12 pts. Partial concede: -6 pts.',
      bull_net_change: bullConf - bullResult.confidence,
      bear_net_change: bearConf - bearResult.confidence,
      bull_final: bullConf,
      bear_final: bearConf,
    },
    kelly_criterion: {
      description: 'Mediator weights computed from debate win rates + concession credibility bonuses, then biased by persona.',
      weights: kellyWeights,
      debate_winner: debateWinner,
      rounds_run: roundNum,
    },
  };

  const debateComplete = {
    type: 'debate_complete',
    ticker,
    rounds_run: roundNum,
    convergence_achieved: convergenceAchieved,
    debate_winner: debateWinner,
    final_confidences: { bull: bullConf, bear: bearConf, risk: riskConf },
    kelly_weights: kellyWeights,
    finance_algorithms: financeAlgorithms,
  };
  broadcastFn(debateComplete);

  return {
    allTurns,
    rounds,
    finalConfidences: { bull: bullConf, bear: bearConf, risk: riskConf },
    kellyWeights,
    convergenceAchieved,
    debateWinner,
    roundsRun: roundNum,
    financeAlgorithms,
  };
}

module.exports = { runDebate };
