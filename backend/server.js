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

// Scheduled monitoring worker (runs every 1 minute for demo purposes, originally requested 5 min)
cron.schedule('*/1 * * * *', async () => {
  if (trackedStocks.length === 0) return;
  console.log('[Worker] Running background monitoring for tracked stocks...');
  
  const newAlerts = [];
  
  for (let i = 0; i < trackedStocks.length; i++) {
    const stock = trackedStocks[i];
    try {
      // Light re-analysis via existing pipeline primitives just to get fresh data
      const scraperResult = await scrapeYahooFinance(stock.ticker);
      
      // We parse the exact price and change from the scraper text
      const priceRally = scraperResult.newsText.match(/Current Price: \$([\d.]+)/);
      const changeRally = scraperResult.newsText.match(/Change: ([\d.-]+)%/);
      
      const newPrice = priceRally ? parseFloat(priceRally[1]) : stock.price;
      const newChange = changeRally ? parseFloat(changeRally[1]) : stock.change;
      
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
      
    } catch (e) {
      console.warn(`[Worker] Failed tracking ${stock.ticker}`, e.message);
    }
  }
  
  broadcast({ type: 'alerts_update', stocks: trackedStocks, new_alerts: newAlerts });
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

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket ready`);
});
