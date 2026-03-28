require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const cron = require('node-cron');

const { scrapeYahooFinance } = require('./scraper/brightdata');
const { runBullAgent } = require('./agents/bull');
const { runBearAgent } = require('./agents/bear');
const { runRiskAgent } = require('./agents/risk');
const { runMediatorAgent } = require('./agents/mediator');
const { runDebate } = require('./agents/debate');
const { callLLMJson, callLLMJsonWithOptions } = require('./agents/llm');
const {
  saveSignal, saveDebateTurn, saveDebateSummary,
  loadTrackedStocks, upsertTrackedStock, removeTrackedStock,
  saveChatMessage, getChatHistory,
} = require('./db/supabase');

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

const app = express();
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));
app.use(express.json());

// ─── HTTP + WebSocket server ──────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('error', (err) => {
  console.error('[WebSocket Server Error]', err.message, err.code);
});

const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WebSocket] Client connected. Total: ${clients.size}`);
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected. Total: ${clients.size}`);
  });
  ws.on('error', (err) => console.error('[WebSocket] Client error:', err.message));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    try {
      if (client.readyState === 1) client.send(msg);
    } catch (err) {
      console.error('[Broadcast] Error:', err.message);
    }
  }
}

// ─── Tracked stocks (in-memory, hydrated from DB on start) ───────────────────
const trackedStocks = [];

// ─── POST /analyze ────────────────────────────────────────────────────────────
app.post('/analyze', async (req, res) => {
  const { ticker, persona = 'balanced' } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });

  res.status(200).json({ status: 'processing', ticker });

  runPipeline(ticker.toUpperCase(), persona).catch((err) => {
    console.error('[Pipeline error]', err.message, err.stack);
    try { broadcast({ error: err.message, ticker }); } catch (_) {}
  });
});

async function runPipeline(ticker, persona) {
  console.log(`[Pipeline] Starting analysis for ${ticker} [Persona: ${persona}]`);

  // Step 1 — Scrape
  let newsText, articles;
  try {
    const scraperResult = await scrapeYahooFinance(ticker);
    newsText = scraperResult.newsText;
    articles = scraperResult.articles;
    console.log(`[Scraper] Got ${newsText.length} chars, ${articles.length} articles for ${ticker}`);
  } catch (err) {
    broadcast({ error: `No data found for ticker: ${ticker}`, ticker });
    return;
  }

  broadcast({ type: 'sources', ticker, articles });

  // Step 2 — Run all 3 agents in parallel with minimal stagger
  const agentResults = {};
  const stagger = (ms) => new Promise((r) => setTimeout(r, ms));

  await Promise.allSettled([
    runBullAgent(ticker, newsText, articles).then((result) => {
      agentResults.bull = result;
      broadcast(result);
      saveSignal({ ticker, agent: result.agent, verdict: result.verdict, confidence: result.confidence, reasons: result.reasons })
        .catch((e) => console.warn('[DB] saveSignal bull:', e.message));
      console.log('[Bull]', result.verdict, result.confidence);
    }).catch((err) => console.error('[Bull failed]', err.message)),

    stagger(50).then(() => runBearAgent(ticker, newsText, articles)).then((result) => {
      agentResults.bear = result;
      broadcast(result);
      saveSignal({ ticker, agent: result.agent, verdict: result.verdict, confidence: result.confidence, reasons: result.reasons })
        .catch((e) => console.warn('[DB] saveSignal bear:', e.message));
      console.log('[Bear]', result.verdict, result.confidence);
    }).catch((err) => console.error('[Bear failed]', err.message)),

    stagger(100).then(() => runRiskAgent(ticker, newsText, articles)).then((result) => {
      agentResults.risk = result;
      broadcast(result);
      saveSignal({ ticker, agent: result.agent, verdict: result.verdict, confidence: result.confidence, reasons: result.reasons })
        .catch((e) => console.warn('[DB] saveSignal risk:', e.message));
      console.log('[Risk]', result.verdict, result.confidence);
    }).catch((err) => console.error('[Risk failed]', err.message)),
  ]);

  if (!agentResults.bull || !agentResults.bear || !agentResults.risk) {
    broadcast({ error: 'One or more agents failed — mediator skipped', ticker });
    return;
  }

  // Step 3 — Debate engine
  let debateContext = null;
  try {
    console.log(`[Debate] Starting debate for ${ticker}`);
    debateContext = await runDebate(
      agentResults.bull, agentResults.bear, agentResults.risk,
      articles, broadcast, ticker, persona
    );

    for (const turn of debateContext.allTurns) {
      saveDebateTurn({ ticker, ...turn }).catch((e) => console.warn('[DB] saveDebateTurn:', e.message));
    }
    saveDebateSummary({ ticker, ...debateContext }).catch((e) => console.warn('[DB] saveDebateSummary:', e.message));
    console.log(`[Debate] Complete — winner: ${debateContext.debateWinner}, rounds: ${debateContext.roundsRun}`);
  } catch (err) {
    console.error('[Debate failed — falling back to persona weights]', err.message);
    broadcast({ type: 'debate_error', ticker, message: 'Debate module failed — mediator using default weights' });
    debateContext = null;
  }

  // Step 4 — Mediator
  const mediatorResult = await runMediatorAgent(
    agentResults.bull, agentResults.bear, agentResults.risk,
    persona, debateContext
  );
  broadcast(mediatorResult);
  saveSignal({
    ticker,
    agent: 'mediator',
    verdict: mediatorResult.decision,
    confidence: Math.round(mediatorResult.confidence),
    decision: mediatorResult.decision,
    conflict_score: mediatorResult.conflict_score,
    trigger: mediatorResult.trigger,
    rationale: mediatorResult.rationale,
  }).catch((e) => console.warn('[DB] saveSignal mediator:', e.message));
  console.log('[Mediator]', mediatorResult.decision, mediatorResult.confidence);
}

// ─── POST /chat — real LLM constraint chat ────────────────────────────────────
app.post('/chat', async (req, res) => {
  const { ticker, message, agentResults, persona = 'balanced' } = req.body;
  if (!ticker || !message) return res.status(400).json({ error: 'ticker and message are required' });

  try {
    const history = await getChatHistory(ticker, 6).catch(() => []);

    const bull = agentResults?.bull;
    const bear = agentResults?.bear;
    const risk = agentResults?.risk;
    const mediator = agentResults?.mediator;

    const systemPrompt = `You are the Mediator AI for ticker ${ticker}.
Current analysis:
- Bull Agent: ${bull?.verdict || 'N/A'} (confidence ${bull?.confidence ?? 'N/A'})
- Bear Agent: ${bear?.verdict || 'N/A'} (confidence ${bear?.confidence ?? 'N/A'})
- Risk Agent: ${risk?.verdict || 'N/A'} (confidence ${risk?.confidence ?? 'N/A'})
- Current recommendation: ${mediator?.decision || 'N/A'} (confidence ${mediator?.confidence ?? 'N/A'})
- Persona: ${persona}

The user will adjust constraints or ask questions. Respond analytically in 2-4 sentences, referencing the agent data.
State clearly whether the user's constraint changes the recommendation or not.

Return ONLY valid JSON:
{ "response": "<2-4 sentence analytical reply>", "updated_decision": "BUY" | "SELL" | "HOLD" | "UNCHANGED", "updated_confidence": <0-100> }`;

    const historyLines = history.map((m) => `${m.role === 'user' ? 'User' : 'Mediator'}: ${m.content}`).join('\n');
    const userPrompt = historyLines ? `${historyLines}\nUser: ${message}` : `User: ${message}`;

    let chatProvider = (process.env.CHAT_LLM_PROVIDER || 'featherless').toLowerCase();
    if (chatProvider === 'featherless' && (!process.env.FEATHERLESS_KEY || !process.env.FEATHERLESS_MODEL)) {
      console.warn('[Chat] Featherless not fully configured, falling back to Groq for /chat');
      chatProvider = 'groq';
    }

    const llmResult = await callLLMJsonWithOptions(systemPrompt, userPrompt, 10000, { provider: chatProvider });

    saveChatMessage({ ticker, role: 'user', content: message }).catch((e) => console.warn('[DB] saveChatMessage user:', e.message));
    saveChatMessage({ ticker, role: 'assistant', content: llmResult.response }).catch((e) => console.warn('[DB] saveChatMessage assistant:', e.message));

    res.json({
      response: llmResult.response,
      updated_decision: llmResult.updated_decision || 'UNCHANGED',
      updated_confidence: llmResult.updated_confidence ?? mediator?.confidence ?? 50,
    });
  } catch (err) {
    console.error('[Chat] Error:', err.message);
    res.status(500).json({ error: 'Chat failed', response: 'Unable to process your constraint at this time.' });
  }
});

// ─── POST /track ──────────────────────────────────────────────────────────────
app.post('/track', (req, res) => {
  const { ticker, verdict, confidence, rationale, trigger, sources, buyBelowPrice } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });

  if (!trackedStocks.find((s) => s.ticker === ticker)) {
    const stock = {
      ticker,
      price: 0,
      change: 0,
      verdict: verdict || 'PENDING',
      confidence: confidence || 0,
      rationale: rationale || 'Waiting for next analysis cycle.',
      trigger: trigger || 'Awaiting conditions.',
      sources: sources || [],
      buyBelowPrice: buyBelowPrice != null ? Number(buyBelowPrice) : null,
      buyAlertTriggered: false,
    };
    trackedStocks.push(stock);
    upsertTrackedStock(stock).catch((e) => console.warn('[DB] upsertTrackedStock:', e.message));
    console.log(`[Monitor] Tracking ${ticker}${buyBelowPrice ? ` (alert below $${buyBelowPrice})` : ''}`);
    broadcast({ type: 'alerts_update', stocks: trackedStocks, new_alerts: [] });
  }
  res.json({ status: 'ok', trackedStocks });
});

// ─── PUT /track/alert — update buy-below price on tracked stock ──────────────
app.put('/track/alert', (req, res) => {
  const { ticker, buyBelowPrice } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });

  const stock = trackedStocks.find((s) => s.ticker === ticker.toUpperCase());
  if (!stock) return res.status(404).json({ error: `${ticker} is not tracked` });

  stock.buyBelowPrice = buyBelowPrice != null ? Number(buyBelowPrice) : null;
  stock.buyAlertTriggered = false; // reset so alert fires again with new price
  upsertTrackedStock(stock).catch((e) => console.warn('[DB] upsertTrackedStock alert:', e.message));
  broadcast({ type: 'alerts_update', stocks: trackedStocks, new_alerts: [] });
  console.log(`[Monitor] Updated price alert for ${stock.ticker}: ${stock.buyBelowPrice ? `$${stock.buyBelowPrice}` : 'removed'}`);
  res.json({ status: 'ok', stock });
});

// ─── DELETE /track/:ticker ────────────────────────────────────────────────────
app.delete('/track/:ticker', (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const idx = trackedStocks.findIndex((s) => s.ticker === ticker);
  if (idx !== -1) {
    trackedStocks.splice(idx, 1);
    removeTrackedStock(ticker).catch((e) => console.warn('[DB] removeTrackedStock:', e.message));
    broadcast({ type: 'alerts_update', stocks: trackedStocks, new_alerts: [] });
    console.log(`[Monitor] Untracked ${ticker}`);
  }
  res.json({ status: 'ok', trackedStocks });
});

// ─── GET /tracked ─────────────────────────────────────────────────────────────
app.get('/tracked', (_req, res) => res.json({ stocks: trackedStocks }));

// ─── GET /chart/:ticker ───────────────────────────────────────────────────────
app.get('/chart/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const range = req.query.range || '1mo';
  const interval = req.query.interval || '1d';
  try {
    const axios = require('axios');
    const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker.toUpperCase()}`, {
      params: { interval, range },
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'application/json' },
      timeout: 10000,
    });
    const result = response.data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ error: 'No chart data found' });

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const meta = result.meta || {};

    res.json({
      ticker: ticker.toUpperCase(),
      currency: meta.currency || 'USD',
      points: timestamps.map((t, i) => ({
        date: new Date(t * 1000).toISOString().split('T')[0],
        close: closes[i] != null ? Number(closes[i].toFixed(2)) : null,
      })).filter((p) => p.close != null),
    });
  } catch (err) {
    console.error(`[Chart] Failed for ${ticker}:`, err.message);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

// ─── GET / and /health ────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({
  status: 'ok',
  service: 'Market Intelligence Agent',
  endpoints: {
    analyze: 'POST /analyze  body: { ticker, persona }',
    chat: 'POST /chat  body: { ticker, message, agentResults, persona }',
    track: 'POST /track  body: { ticker, ... }',
    untrack: 'DELETE /track/:ticker',
    health: 'GET /health',
  },
  websocket: `ws://localhost:${process.env.PORT || 3001}`,
}));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Cron worker — parallel scraping with per-stock timeout ──────────────────
let isWorkerRunning = false;
cron.schedule('*/1 * * * *', async () => {
  if (trackedStocks.length === 0 || isWorkerRunning) return;
  isWorkerRunning = true;
  console.log(`[Worker] Monitoring ${trackedStocks.length} tracked stocks...`);

  const newAlerts = [];

  try {
    const tasks = trackedStocks.map((stock) => {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
      return Promise.race([scrapeYahooFinance(stock.ticker), timeout])
        .then((scraperResult) => {
          const meta = scraperResult.meta || {};
          const newPrice = meta.regularMarketPrice ?? stock.price;
          const newChange = meta.regularMarketChangePercent != null
            ? Number(meta.regularMarketChangePercent)
            : stock.change;

          if (stock.price > 0 && Math.abs(newChange) > 2.0 && stock.change !== newChange) {
            newAlerts.push({
              ticker: stock.ticker,
              message: `Volatility alert: Price moved ${newChange.toFixed(2)}% in active trading session.`,
            });
          }

          // Buy-below price alert check
          if (stock.buyBelowPrice && newPrice > 0 && newPrice <= stock.buyBelowPrice && !stock.buyAlertTriggered) {
            stock.buyAlertTriggered = true;
            newAlerts.push({
              ticker: stock.ticker,
              type: 'buy_signal',
              message: `🚨 BUY ALERT: ${stock.ticker} is now $${newPrice.toFixed(2)}, below your target of $${stock.buyBelowPrice.toFixed(2)}!`,
            });
            console.log(`[Alert] Buy signal for ${stock.ticker}: $${newPrice.toFixed(2)} < $${stock.buyBelowPrice.toFixed(2)}`);
          }

          stock.price = newPrice;
          stock.change = newChange;

          upsertTrackedStock(stock).catch((e) => console.warn('[DB] upsertTrackedStock worker:', e.message));
          broadcast({ type: 'alerts_update', stocks: trackedStocks, new_alerts: [] });
          console.log(`[Worker] ${stock.ticker}: $${newPrice} (${newChange >= 0 ? '+' : ''}${newChange.toFixed(2)}%)`);
        })
        .catch((e) => console.warn(`[Worker] Failed tracking ${stock.ticker}:`, e.message));
    });

    await Promise.allSettled(tasks);

    if (newAlerts.length > 0) {
      broadcast({ type: 'alerts_update', stocks: trackedStocks, new_alerts: newAlerts });
    }
  } finally {
    isWorkerRunning = false;
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log('[Server] WebSocket ready');

  try {
    const stored = await loadTrackedStocks();
    stored.forEach((row) => trackedStocks.push({
      ticker: row.ticker,
      price: row.price || 0,
      change: row.change_pct || 0,
      verdict: row.verdict || 'PENDING',
      confidence: row.confidence || 0,
      rationale: row.rationale || '',
      trigger: row.trigger || '',
      sources: row.sources || [],
      buyBelowPrice: row.buy_below_price != null ? Number(row.buy_below_price) : null,
      buyAlertTriggered: false,
    }));
    console.log(`[DB] Loaded ${stored.length} tracked stock(s) from Supabase`);
  } catch (e) {
    console.warn('[DB] Could not load tracked stocks on start:', e.message);
  }
});
