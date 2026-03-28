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
    reasons: {
      round: data.round,
      turn_type: data.turn_type,
      summary: data.summary,
      points: data.points || data.attacks || [],
      confidence_before: data.confidence_before,
      confidence_after: data.confidence_after,
      tier_win: data.tier_win,
    },
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
    reasons: {
      rounds_run: data.roundsRun,
      convergence_achieved: data.convergenceAchieved,
      debate_winner: data.debateWinner,
      final_confidences: data.finalConfidences,
      kelly_weights: data.kellyWeights,
    },
  };
  const { error } = await supabase.from('signals').insert(row);
  if (error) console.error('[Supabase] Debate summary insert error:', error.message);
}

async function loadTrackedStocks() {
  const { data, error } = await supabase
    .from('tracked_stocks')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[Supabase] Load tracked stocks error:', error.message);
    return [];
  }
  return data || [];
}

async function upsertTrackedStock(stock) {
  const { error } = await supabase.from('tracked_stocks').upsert(
    {
      ticker: stock.ticker,
      verdict: stock.verdict,
      confidence: stock.confidence,
      rationale: stock.rationale,
      trigger: stock.trigger,
      price: stock.price,
      change_pct: stock.change,
      sources: stock.sources || [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'ticker' }
  );
  if (error) console.error('[Supabase] Upsert tracked stock error:', error.message);
}

async function removeTrackedStock(ticker) {
  const { error } = await supabase.from('tracked_stocks').delete().eq('ticker', ticker);
  if (error) console.error('[Supabase] Remove tracked stock error:', error.message);
}

async function saveChatMessage({ ticker, role, content }) {
  const { error } = await supabase.from('chat_sessions').insert({ ticker, role, content });
  if (error) console.error('[Supabase] Save chat message error:', error.message);
}

async function getChatHistory(ticker, limit = 6) {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('role, content')
    .eq('ticker', ticker)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('[Supabase] Get chat history error:', error.message);
    return [];
  }
  return (data || []).reverse(); // oldest-first for LLM context
}

module.exports = {
  supabase,
  saveSignal,
  saveDebateTurn,
  saveDebateSummary,
  loadTrackedStocks,
  upsertTrackedStock,
  removeTrackedStock,
  saveChatMessage,
  getChatHistory,
};
