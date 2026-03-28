const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function saveSignal(data) {
  const { error } = await supabase.from('signals').insert(data);
  if (error) console.error('[Supabase] Insert error:', error.message);
}

async function saveDebateTurn(data) {
  const row = {
    agent: `debate_turn_${data.agent}`,
    ticker: data.ticker,
    verdict: data.turn_type,
    confidence: data.confidence_after,
    reasons: JSON.stringify({
      round: data.round,
      turn_type: data.turn_type,
      summary: data.summary,
      points: data.points || data.attacks || [],
      confidence_before: data.confidence_before,
      confidence_after: data.confidence_after,
      tier_win: data.tier_win,
    }),
  };
  const { error } = await supabase.from('signals').insert(row);
  if (error) console.error('[Supabase] Debate turn insert error:', error.message);
}

async function saveDebateSummary(data) {
  const row = {
    agent: 'debate_summary',
    ticker: data.ticker,
    verdict: data.debate_winner,
    confidence: null,
    reasons: JSON.stringify({
      rounds_run: data.roundsRun,
      convergence_achieved: data.convergenceAchieved,
      debate_winner: data.debateWinner,
      final_confidences: data.finalConfidences,
      kelly_weights: data.kellyWeights,
    }),
  };
  const { error } = await supabase.from('signals').insert(row);
  if (error) console.error('[Supabase] Debate summary insert error:', error.message);
}

module.exports = { supabase, saveSignal, saveDebateTurn, saveDebateSummary };
