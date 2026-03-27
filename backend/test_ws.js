// Quick test: POST /analyze + receive WebSocket events
require('dotenv').config();
const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 3001;
const TICKER = process.argv[2] || 'AAPL';

const ws = new WebSocket(`ws://localhost:${PORT}`);
let msgCount = 0;

ws.on('open', () => {
  console.log(`[WS] Connected to ws://localhost:${PORT}`);

  // POST /analyze
  const body = JSON.stringify({ ticker: TICKER });
  const req = http.request({
    hostname: 'localhost',
    port: PORT,
    path: '/analyze',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => console.log(`[HTTP] POST /analyze →`, res.statusCode, data));
  });
  req.write(body);
  req.end();
});

ws.on('message', (raw) => {
  msgCount++;
  const msg = JSON.parse(raw.toString());
  console.log(`\n[WS msg ${msgCount}]`, JSON.stringify(msg, null, 2));

  // Done when mediator arrives (has 'decision' field) or error
  if (msg.decision || msg.error) {
    console.log('\n--- Pipeline complete. Closing. ---');
    ws.close();
    process.exit(0);
  }
});

ws.on('error', (err) => { console.error('[WS error]', err.message); process.exit(1); });

// Timeout after 90s
setTimeout(() => {
  console.error('[Timeout] No mediator result in 90s');
  ws.close();
  process.exit(1);
}, 90_000);
