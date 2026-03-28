require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const { scrapeYahooFinance } = require('./scraper/brightdata');
const { runBullAgent } = require('./agents/bull');
const { runBearAgent } = require('./agents/bear');
const { runRiskAgent } = require('./agents/risk');
const { runMediatorAgent } = require('./agents/mediator');
const { runDebate } = require('./agents/debate');
const { saveSignal, saveDebateTurn, saveDebateSummary } = require('./db/supabase');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

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
  ws.on('error', (err) => {
    console.error(`[WebSocket] Client error:`, err.message);
  });
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  let sent = 0;
  for (const client of clients) {
    try {
      if (client.readyState === 1) {
        client.send(msg);
        sent++;
      }
    } catch (err) {
      console.error(`[Broadcast] Error sending to client:`, err.message);
    }
  }
  if (sent === 0 && clients.size > 0) {
    console.warn(`[Broadcast] Had ${clients.size} clients but none ready to receive (state != 1)`);
  }
}

const cron = require('node-cron');

const trackedStocks = [];

// POST /track — start tracking a stock
app.post('/track', (req, res) => {
  const { ticker, verdict, confidence, rationale, trigger, sources } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });
  
  if (!trackedStocks.find(s => s.ticker === ticker)) {
    trackedStocks.push({ 
      ticker, 
      price: 0, 
      change: 0, 
      verdict: verdict || 'PENDING', 
      confidence: confidence || 0,
      rationale: rationale || 'Waiting for next analysis cycle.',
      trigger: trigger || 'Awaiting conditions.',
      sources: sources || []
    });
    console.log(`[Monitor] Unlocked tracking for ${ticker}`);
    broadcast({ type: 'alerts_update', stocks: trackedStocks, new_alerts: [] });
  }
  res.json({ status: 'ok', trackedStocks });
});

app.get('/tracked', (req, res) => {
  res.json({ stocks: trackedStocks });
});

// Scheduled monitoring worker
let isWorkerRunning = false;
cron.schedule('*/1 * * * *', async () => {
  if (trackedStocks.length === 0 || isWorkerRunning) return;
  isWorkerRunning = true;
  console.log(`[Worker] Running background monitoring for ${trackedStocks.length} tracked stocks...`);
  
  const newAlerts = [];
  
  const tasks = trackedStocks.map((stock, i) => 
    scrapeYahooFinance(stock.ticker)
      .then((scraperResult) => {
        const meta = scraperResult.meta || {};
        const newPrice = meta.regularMarketPrice ?? stock.price;
        const newChange = meta.regularMarketChangePercent != null ? Number(meta.regularMarketChangePercent) : stock.change;

        // Detect anomalies for alerts
        if (stock.price > 0 && Math.abs(newChange) > 2.0 && stock.change !== newChange) {
          newAlerts.push({
            ticker: stock.ticker,
            message: `Volatility alert: Price moved ${newChange.toFixed(2)}% in active trading session.`
          });
        }

        // Update store
        stock.price = newPrice;
        stock.change = newChange;

        // Incremental per-stock broadcast
        broadcast({ type: 'alerts_update', stocks: trackedStocks, new_alerts: [] });
        console.log(`[Worker] ${stock.ticker}: $${newPrice} (${newChange >= 0 ? '+' : ''}${newChange.toFixed(2)}%)`);
      })
      .catch((e) => {
        console.warn(`[Worker] Failed tracking ${stock.ticker}`, e.message);
      })
  );

  await Promise.allSettled(tasks);
  
  // Final summary broadcast with any accumulated alerts
  if (newAlerts.length > 0) {
    broadcast({ type: 'alerts_update', stocks: trackedStocks, new_alerts: newAlerts });
  }
  
  isWorkerRunning = false;
});

// POST /analyze — accepts { ticker, persona }
app.post('/analyze', async (req, res) => {
  const { ticker, persona = 'balanced' } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });

  res.status(200).json({ status: 'processing', ticker });

  runPipeline(ticker.toUpperCase(), persona).catch((err) => {
    console.error('[Pipeline error]', err.message, err.stack);
    try {
      broadcast({ error: err.message, ticker });
    } catch (broadcastErr) {
      console.error('[Broadcast error during error handling]', broadcastErr.message);
    }
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

  // Step 2 — Run all 3 agents in parallel with 200ms stagger to avoid Groq TPM burst
  const agentResults = {};
  const stagger = (ms) => new Promise((r) => setTimeout(r, ms));

  await Promise.allSettled([
    runBullAgent(ticker, newsText, articles).then((result) => {
      agentResults.bull = result;
      broadcast(result);
      saveSignal({ ticker, agent: result.agent, verdict: result.verdict, confidence: result.confidence, reasons: result.reasons });
      console.log('[Bull]', result.verdict, result.confidence);
    }).catch((err) => console.error('[Bull failed]', err.message)),

    stagger(200).then(() => runBearAgent(ticker, newsText, articles)).then((result) => {
      agentResults.bear = result;
      broadcast(result);
      saveSignal({ ticker, agent: result.agent, verdict: result.verdict, confidence: result.confidence, reasons: result.reasons });
      console.log('[Bear]', result.verdict, result.confidence);
    }).catch((err) => console.error('[Bear failed]', err.message)),

    stagger(400).then(() => runRiskAgent(ticker, newsText, articles)).then((result) => {
      agentResults.risk = result;
      broadcast(result);
      saveSignal({ ticker, agent: result.agent, verdict: result.verdict, confidence: result.confidence, reasons: result.reasons });
      console.log('[Risk]', result.verdict, result.confidence);
    }).catch((err) => console.error('[Risk failed]', err.message)),
  ]);

  if (!agentResults.bull || !agentResults.bear || !agentResults.risk) {
    broadcast({ error: 'One or more agents failed — mediator skipped', ticker });
    return;
  }

  // Step 3 — Debate engine (streams turns live via WebSocket)
  let debateContext = null;
  try {
    console.log(`[Debate] Starting debate for ${ticker}`);
    debateContext = await runDebate(
      agentResults.bull, agentResults.bear, agentResults.risk,
      articles, broadcast, ticker, persona
    );

    // Persist all debate turns
    for (const turn of debateContext.allTurns) {
      saveDebateTurn({ ticker, ...turn });
    }
    saveDebateSummary({ ticker, ...debateContext });
    console.log(`[Debate] Complete — winner: ${debateContext.debateWinner}, rounds: ${debateContext.roundsRun}`);
  } catch (err) {
    console.error('[Debate failed — falling back to persona weights]', err.message);
    broadcast({ type: 'debate_error', ticker, message: 'Debate module failed — mediator using default weights' });
    debateContext = null;
  }

  // Step 4 — Mediator (debate-informed when available)
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
  });
  console.log('[Mediator]', mediatorResult.decision, mediatorResult.confidence);
}

app.get('/', (_req, res) => res.json({
  status: 'ok',
  service: 'Market Intelligence Agent',
  endpoints: {
    analyze: 'POST /analyze  body: { ticker: "AAPL", persona: "balanced" }',
    health: 'GET  /health',
  },
  websocket: `ws://localhost:${process.env.PORT || 3001}`,
}));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// GET /chart/:ticker — historical price data for charting
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
      })).filter(p => p.close != null),
    });
  } catch (err) {
    console.error(`[Chart] Failed for ${ticker}:`, err.message);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket ready`);
});
