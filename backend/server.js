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
const { saveSignal } = require('./db/supabase');

const app = express();
// CORS - Universal allowlist for local hackathon frontend
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Track connected WebSocket clients
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// POST /analyze — accepts { ticker, persona }
app.post('/analyze', async (req, res) => {
  const { ticker, persona = 'balanced' } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });

  res.status(200).json({ status: 'processing', ticker });

  // Run pipeline async — results pushed via WebSocket as they arrive
  runPipeline(ticker.toUpperCase(), persona).catch((err) => {
    console.error('[Pipeline error]', err.message);
    broadcast({ error: err.message, ticker });
  });
});

async function runPipeline(ticker, persona) {
  console.log(`[Pipeline] Starting analysis for ${ticker} [Persona: ${persona}]`);

  // Step 1 — Scrape
  let newsText;
  try {
    newsText = await scrapeYahooFinance(ticker);
    console.log(`[Scraper] Got ${newsText.length} chars for ${ticker}`);
  } catch (err) {
    broadcast({ error: `No data found for ticker: ${ticker}`, ticker });
    return;
  }

  // Step 2 — Run all 3 agents in parallel, emit each as it resolves
  // allSettled: one agent failing won't kill the others or block the mediator
  const agentResults = {};

  await Promise.allSettled([
    runBullAgent(ticker, newsText).then((result) => {
      agentResults.bull = result;
      broadcast(result);
      saveSignal({ ticker, agent: result.agent, verdict: result.verdict, confidence: result.confidence, reasons: result.reasons });
      console.log('[Bull]', JSON.stringify(result));
    }).catch((err) => console.error('[Bull failed]', err.message)),

    runBearAgent(ticker, newsText).then((result) => {
      agentResults.bear = result;
      broadcast(result);
      saveSignal({ ticker, agent: result.agent, verdict: result.verdict, confidence: result.confidence, reasons: result.reasons });
      console.log('[Bear]', JSON.stringify(result));
    }).catch((err) => console.error('[Bear failed]', err.message)),

    runRiskAgent(ticker, newsText).then((result) => {
      agentResults.risk = result;
      broadcast(result);
      saveSignal({ ticker, agent: result.agent, verdict: result.verdict, confidence: result.confidence, reasons: result.reasons });
      console.log('[Risk]', JSON.stringify(result));
    }).catch((err) => console.error('[Risk failed]', err.message)),
  ]);

  // Only run mediator if all 3 agents succeeded
  if (!agentResults.bull || !agentResults.bear || !agentResults.risk) {
    broadcast({ error: 'One or more agents failed — mediator skipped', ticker });
    return;
  }

  // Step 3 — Mediator resolves conflict
  const mediatorResult = await runMediatorAgent(agentResults.bull, agentResults.bear, agentResults.risk, persona);
  broadcast(mediatorResult);
  saveSignal({ ticker, agent: 'mediator', verdict: mediatorResult.decision, confidence: mediatorResult.confidence, decision: mediatorResult.decision, conflict_score: mediatorResult.conflict_score, trigger: mediatorResult.trigger, rationale: mediatorResult.rationale });
  console.log('[Mediator]', JSON.stringify(mediatorResult));
}

// Root — confirms server is live
app.get('/', (_req, res) => res.json({
  status: 'ok',
  service: 'Market Intelligence Agent',
  endpoints: {
    analyze: 'POST /analyze  body: { ticker: "AAPL", persona: "balanced" }',
    health:  'GET  /health',
  },
  websocket: `ws://localhost:${process.env.PORT || 3001}`,
}));

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket ready`);
});
