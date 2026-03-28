# Market.Intel: Combined Problems and Fixes

Date: 2026-03-28

This document combines all issues reported in the current build and the recommended fixes.

## 1) Dashboard stuck on CONNECTING

### Symptoms
- Navbar status stays on CONNECTING.
- Analyze button remains disabled.

### Root Causes
- WebSocket URL is hardcoded to localhost in multiple places.
- Two separate WebSocket connections are created (App + Dashboard), which can drift and fail independently.
- Analyze is gated on WebSocket state, so any socket failure blocks user actions.

### Evidence (current code)
- Dashboard socket: [market-intelligence-frontend/src/components/Dashboard.jsx](market-intelligence-frontend/src/components/Dashboard.jsx#L37)
- App socket: [market-intelligence-frontend/src/App.jsx](market-intelligence-frontend/src/App.jsx#L21)
- CONNECTING render: [market-intelligence-frontend/src/components/Dashboard.jsx](market-intelligence-frontend/src/components/Dashboard.jsx#L456)
- Analyze disabled by wsConnected: [market-intelligence-frontend/src/components/Dashboard.jsx](market-intelligence-frontend/src/components/Dashboard.jsx#L499)

### Fixes
1. Centralize HTTP and WS endpoints in one config file using env vars (derive ws/wss from API URL).
2. Keep a single app-level WebSocket; pass connection state down as props/context.
3. Remove dashboard-local socket initialization.
4. Do not hard-block Analyze when ws is down; allow request + show warning banner.
5. Add explicit reconnect strategy with bounded exponential backoff and timeout.

---

## 2) Slow Round 1 / Round 2 / Synthesis / Mediator response

### Symptoms
- Delayed debate turns and final mediator output.
- Perceived lag spikes under load.

### Root Causes
- Debate steps are sequential LLM calls per round (bull -> bear -> risk), not parallel.
- Debate can run 2 rounds, multiplying total latency.
- LLM retry policy uses large backoff and high timeout on 429/errors.
- Mediator waits until debate is complete.
- Scraper fallback path (browser automation) is slow.

### Evidence (current code)
- Debate round count: [backend/agents/debate.js](backend/agents/debate.js#L179)
- Sequential rebuttal calls: [backend/agents/debate.js](backend/agents/debate.js#L200), [backend/agents/debate.js](backend/agents/debate.js#L252), [backend/agents/debate.js](backend/agents/debate.js#L305)
- LLM timeout/backoff/retries: [backend/agents/llm.js](backend/agents/llm.js#L12), [backend/agents/llm.js](backend/agents/llm.js#L13), [backend/agents/llm.js](backend/agents/llm.js#L33), [backend/agents/llm.js](backend/agents/llm.js#L39)
- Debate then mediator sequencing: [backend/server.js](backend/server.js#L197), [backend/server.js](backend/server.js#L215)
- Slow browser fallback path: [backend/scraper/brightdata.js](backend/scraper/brightdata.js#L117)

### Fixes
1. Make round 2 conditional (run only if confidence gap remains above threshold).
2. Lower per-call timeout and tune retry/backoff for debate calls.
3. Add lightweight/degraded mode for debate under pressure.
4. Keep mediator fallback behavior robust when debate fails (already present; improve observability).
5. Cache recent scrape outputs per ticker for short windows to avoid repeated expensive fetches.

---

## 3) Tracked stock prices not updating constantly

### Symptoms
- Tracked prices update infrequently.
- Price feed appears stale or bursty.

### Root Causes
- Worker runs on cron cadence (currently every minute), not true streaming.
- Worker processes tracked stocks serially with await in loop.
- Broadcast happens once at end of cycle, so no incremental updates.
- Parsing price from text with regex can miss updates.
- Tracking data is in-memory only (lost on restart).

### Evidence (current code)
- Cron cadence: [backend/server.js](backend/server.js#L88)
- Serial loop: [backend/server.js](backend/server.js#L94)
- Per-stock scrape await: [backend/server.js](backend/server.js#L98)
- Batch broadcast at end: [backend/server.js](backend/server.js#L124)
- Frontend only listens to alerts_update payloads: [market-intelligence-frontend/src/App.jsx](market-intelligence-frontend/src/App.jsx#L26)

### Fixes
1. Process tracked stocks in parallel using Promise.allSettled with per-task timeout.
2. Emit per-stock incremental updates during cycle, then a final summary event.
3. Add a worker lock (isRunning flag) to prevent overlapping runs.
4. Extract structured numeric price/change from scraper response instead of text regex.
5. Persist tracked stocks + last snapshots to database (avoid in-memory volatility).
6. If truly live updates are required, integrate a quote streaming provider.

---

## 4) Live graph on stock click

### Symptoms
- Need a live chart when selecting a stock in the directory page.

### Root Causes
- Current app has no historical time-series endpoint wired for charting.

### Evidence (current code)
- Tracked stock UI is card-based, no chart source hookup: [market-intelligence-frontend/src/components/TrackedStocks.jsx](market-intelligence-frontend/src/components/TrackedStocks.jsx)
- API client only calls analyze endpoint: [market-intelligence-frontend/src/services/api.js](market-intelligence-frontend/src/services/api.js)

### Fixes
1. Add backend endpoint for historical OHLC/time-series and frontend chart component.
2. For production-grade live graphs, add market-data provider key (Polygon/Finnhub/Twelve Data/Alpha Vantage).
3. For demo-only mode, you can use unofficial/public sources, but reliability and rate limits are weaker.

---

## Priority Plan (Recommended)

1. Connection reliability first
- Unify URL config, single socket architecture, remove hard ws dependency from Analyze action.

2. Latency control next
- Conditional round 2, tuned retry/timeouts, cache scraper data.

3. Tracking freshness
- Parallel worker + per-stock streaming updates + worker lock.

4. Graph feature
- Add time-series endpoint and chart UI; select provider based on budget and key requirements.

---

## Quick Verification Checklist

1. Connection
- Open health endpoint and confirm socket reaches OPEN state quickly.
- Verify CONNECTING no longer persists indefinitely.

2. Analysis latency
- Measure average timeline for scrape, agents, debate, mediator before and after changes.

3. Tracking updates
- Track multiple tickers and confirm per-stock update events arrive continuously within cycle.

4. Graph
- Click tracked stock and verify chart renders historical + latest point updates.

---

## Optional Enhancements

1. Add performance telemetry per pipeline stage.
2. Add websocket heartbeat + latency ping metrics.
3. Add alert categories (CRITICAL/INFO) consistently in all alert payloads.
4. Add stale-data badges when last update exceeds threshold.
