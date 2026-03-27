# Person A — Hackathon Plan
## Market Intelligence Agent · Forge Inspira 2026

---

## Your Identity

| Field | Detail |
|---|---|
| Role | Backend Engineer + AI Prompt Engineer |
| Owns | Scraping · Agent Logic · Prompts · Supabase · WebSocket Server |
| Does NOT own | React UI · Frontend design · Vercel deployment |
| Judging impact | Intelligence & Reasoning (20pts) · Use of Data (20pts) |

> **Golden rule:** Prompt quality is your biggest competitive advantage. Every other team will have weak, generic prompts. Spend 40% of your time refining prompts — not just wiring things together.

---

## JSON Contract — Agree With Person B First (15 min)

Write this down before either person writes a single line of code.

```json
// Each agent emits this — one at a time as they finish
{
  "agent": "bull | bear | risk",
  "verdict": "BUY | SELL | HOLD",
  "confidence": 0–100,
  "reasons": ["string", "string", "string"]
}

// Mediator emits this last
{
  "decision": "BUY | SELL | HOLD",
  "confidence": 0–100,
  "conflict_score": "LOW | MEDIUM | HIGH",
  "trigger": "string — conditional action e.g. BUY if price < $182",
  "rationale": "string — 2-3 sentence explanation"
}
```

Person B builds their entire UI against this hardcoded shape. You make sure your output matches this exact shape. When you connect at Hour 10 — it just works.

---

## Phase 1 — Setup + First Working Call (Hour 0–4)

**Goal:** AAPL scrape → Bull Agent verdict printed in terminal. One working end-to-end call.

### Tasks

- [ ] Create GitHub repo + Node.js project structure
  - Folders: `/backend/agents`, `/backend/scraper`, `/backend/db`
  - Create `.env` with keys: `BRIGHTDATA_KEY`, `FEATHERLESS_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`
  - Share `.env.example` with Person B (no real values)

- [ ] Create Supabase project + signals table
  - Table: `signals (id, ticker, agent, verdict, confidence, reasons jsonb, created_at)`
  - Free tier is enough for the hackathon
  - Save URL + anon key to `.env`

- [ ] Bright Data — test one scrape on Yahoo Finance
  - Use promo code `hack100` for free credits
  - Scrape Yahoo Finance news page for AAPL
  - Log raw text to console — if headlines come back, you're done
  - Don't over-engineer parsing yet

- [ ] Featherless.ai — test one LLM call
  - Send a simple prompt and confirm a response comes back
  - Note the latency — important for demo timing expectations
  - Confirm the API key works and you know the model name to use

- [ ] Write Bull Agent prompt — confirm clean JSON output
  - System prompt: `"You are a Bull analyst. Your sole goal is to find every reason to BUY. Return ONLY valid JSON: { verdict, confidence, reasons[3] }. No explanation. No preamble."`
  - Test 3 times — JSON must be clean and parseable every single time
  - If it returns text outside the JSON even once — tighten the prompt

- [ ] **Milestone:** Run AAPL end-to-end in terminal
  - `AAPL → scrape Yahoo Finance → pass raw text to Bull Agent → print JSON to terminal`
  - This single working call means Phase 1 is done
  - Commit immediately: `"Phase 1 milestone: AAPL scrape → Bull Agent JSON working"`

### Phase 1 is done when
Terminal prints `{ agent: "bull", verdict: "BUY", confidence: 74, reasons: [...] }` for AAPL using live scraped data.

---

## Phase 2 — All 4 Agents + Full Pipeline (Hour 4–10)

**Goal:** All 3 agents run in parallel → Mediator resolves conflict → full decision saved to Supabase → WebSocket server emitting results.

> **Hour 4 check-in (10 min):** Show Person B your terminal output. B shows you the dummy UI. Confirm your JSON shape matches exactly what B hardcoded. Fix any drift now — not at Hour 10.

### The 4 Agents

| Agent | Mandate | Key difference from Bull |
|---|---|---|
| Bull | Find every reason to BUY. Never say SELL. | Already done in Phase 1 |
| Bear | Find every reason to SELL. Never say BUY. | Change mandate line only — same schema |
| Risk | Minimize exposure. Bias toward HOLD always. | Change mandate line only — same schema |
| Mediator | Receive all 3, resolve conflict, produce final decision | Different prompt + different output schema |

### Bear + Risk Prompt Pattern

Copy the Bull prompt. Change only the mandate line:

- **Bear:** `"Your sole goal is to find every downside risk and reason the stock will fall."`
- **Risk:** `"Your sole goal is to protect against loss. When uncertain, always recommend HOLD."`

Everything else — output schema, JSON rules, no-preamble rule — stays identical.

### Mediator Prompt Structure

```
You are a senior investment strategist.
You receive 3 analyst reports with conflicting verdicts.
Your job: resolve the conflict and produce ONE final decision.

Rules:
- You MUST acknowledge which agents disagree and why
- Weight confidence scores — higher confidence = more influence  
- If all 3 conflict equally: default to HOLD
- Always include a conditional trigger (e.g. "BUY if X happens")
- Return ONLY valid JSON. No prose outside the JSON.

Output schema:
{ "decision": "BUY|SELL|HOLD", "confidence": 0-100,
  "conflict_score": "LOW|MEDIUM|HIGH",
  "trigger": "string", "rationale": "string" }
```

### WebSocket Event Flow

This is the sequence you implement — emit each result as soon as it resolves, not all at once at the end:

```
1. Client sends:   POST /analyze with { ticker: "AAPL" }
2. You:            Scrape + start all 3 agents in parallel (Promise.all)
3. Bull finishes → emit { agent: "bull", verdict, confidence, reasons }
4. Bear finishes → emit { agent: "bear", verdict, confidence, reasons }
5. Risk finishes → emit { agent: "risk", verdict, confidence, reasons }
6. Mediator runs → emit { decision, conflict_score, trigger, rationale }
```

> The parallel emit (not waiting for all 3) is what creates the live "agents deliberating" visual in Person B's UI. This is your demo's best moment.

### Tasks

- [ ] Write Bear + Risk agent prompts — same JSON schema, different mandate
  - Test each independently before combining
  - JSON must be clean and parseable every single time

- [ ] Run all 3 agents in parallel using `Promise.all()`
  - Pass the same scraped news text to all 3 simultaneously
  - Do NOT run them sequentially — parallel is faster and enables the live UI effect

- [ ] Write Mediator prompt — test with hardcoded conflicting inputs
  - Test 1: bull=BUY, bear=SELL, risk=HOLD → should get `conflict_score: "HIGH"`
  - Test 2: bull=BUY, bear=HOLD, risk=HOLD → should get `conflict_score: "LOW"`
  - Both must return clean parseable JSON

- [ ] Save all agent outputs to Supabase
  - After each agent finishes → insert a row into `signals` table
  - After mediator finishes → insert the final decision row
  - This creates the audit trail judges look for under "Use of Data" criterion

- [ ] Build WebSocket server — emit agent results as they finish
  - Emit each agent result immediately when it resolves (not after all 3 are done)
  - Final mediator result emitted after all 3 agents complete

- [ ] Expose `POST /analyze` endpoint
  - Accepts `{ ticker: "AAPL" }`
  - Returns `200` immediately, then pushes results via WebSocket as they arrive
  - Confirm CORS is enabled for localhost and Person B's Vercel domain

- [ ] **Milestone:** Test full pipeline — AAPL + TSLA both working
  - Run AAPL → get full 4-agent decision
  - Run TSLA → get completely different outputs
  - Commit: `"Full 4-agent pipeline working — AAPL and TSLA tested"`

---

## Integration — Hour 10 (30 min together with Person B)

**Goal:** B's React frontend receives your live WebSocket events. AAPL works end-to-end in the browser.

### Checklist (do together)

- [ ] Confirm CORS is enabled for B's localhost and Vercel URL
- [ ] B enters AAPL in the UI → your backend fires → agent columns populate live
- [ ] Verify JSON field names match the contract exactly — fix any mismatches immediately
- [ ] Run TSLA — confirm completely different output from AAPL
- [ ] Both agree the system is working — split back to individual polish tasks

> If integration takes longer than 30 minutes, the JSON contract was not followed. Fix the shape mismatch, not the logic.

---

## Phase 3 — Prompt Refinement + Polish (Hour 10–18)

**Goal:** Reasoning quality is sharp. Outputs feel intelligent, not generic. Edge cases handled.

### Tasks

- [ ] Read 5 real outputs — evaluate reasoning quality
  - Generic: `"Revenue is up"` — bad
  - Intelligent: `"Q1 revenue beat analyst estimate by 8% against consensus of 4%"` — good
  - Push for specificity in the `reasons` field — this is what judges evaluate

- [ ] Refine all 4 prompts for sharper reasoning
  - Add: `"Extract specific numbers, percentages, and named events from the news. Vague reasons are not acceptable."`
  - Re-test after each prompt change

- [ ] Handle edge cases
  - Invalid ticker → emit `{ error: "No data found for ticker" }` via WebSocket
  - API timeout → retry once, then emit partial results
  - JSON parse failure → retry call with `"Return ONLY JSON, nothing else"` appended
  - A broken demo during judging costs you the entire Execution score (20pts)

- [ ] Test 5 different tickers — confirm meaningful variety
  - Run: AAPL, TSLA, NVDA, MSFT, AMZN
  - Each should produce different agent stances
  - If 3 tickers all get the same verdict → your prompts aren't using scraped data enough → fix the prompt

- [ ] Deploy backend to Railway
  - Free tier supports persistent Node.js processes
  - Add all `.env` variables in Railway dashboard
  - Confirm WebSocket works from deployed URL — not just localhost
  - Share the deployed URL with Person B

---

## Fallback Plans — Pre-Decided

If something breaks, you already know what to do. No time wasted deciding under pressure.

| If this breaks | Do this instead |
|---|---|
| Bright Data fails | Use `yfinance` Python library — free, no API key, call via Node subprocess. 20 min to set up. |
| Featherless.ai is slow | Switch to Groq API — free tier, OpenAI-compatible, very fast. Change one line: the base URL. Same prompts work. |
| WebSocket too complex | Use REST polling every 3 seconds instead. B polls `GET /results`. Same visual effect. Simpler to debug. |
| Prompts return bad JSON | Add `JSON.parse` try/catch + retry. If parse fails twice, return a default stub so B's UI doesn't break. |

---

## Git Protocol

| Rule | Detail |
|---|---|
| Commit frequency | Every 1–2 hours minimum. Judges check commit history. |
| Branch | Push to `/backend` branch. Merge to main only at sync points. |
| Commit messages | Meaningful only. `"Add Bull agent prompt + JSON schema validation"` not `"update"`. |
| Never push broken code to main | Test locally before merging. |

---

## Sync Points

| Time | What happens |
|---|---|
| Hour 0 (15 min) | Joint session — agree JSON contract with Person B. Then split. |
| Hour 4 (10 min) | Check-in — A shows terminal output, B shows dummy UI. Fix any contract drift. |
| Hour 10 (30 min) | Integration — connect A's backend to B's frontend. Test AAPL live in browser. |
| Hour 18 (together) | Full deploy, demo rehearsal, fix last bugs. |

---

## Judging Criteria — Your Direct Impact

| Criterion | Points | How you score it |
|---|---|---|
| Intelligence & Reasoning | 20pts | Multi-step reasoning visible — 3 agents think independently, Mediator resolves with logic |
| Use of Data & Inputs | 20pts | Live Bright Data scraping — different tickers → completely different outputs |
| Quality of Output | 20pts | Structured JSON decision with trigger, conflict score, rationale — not a paragraph dump |
| Clarity of Problem | 20pts | Shared with Person B |
| Execution & Demo | 20pts | Shared with Person B |

---

## Phase 1 First 30 Minutes — Exact Order

1. Create repo + folder structure
2. Set up `.env` with all keys
3. Supabase table created
4. Bright Data test scrape — confirm headlines come back
5. Featherless.ai test call — confirm LLM responds
6. Write Bull prompt — confirm JSON comes back clean
7. Wire scrape → Bull Agent → print to terminal
8. Commit: `"Phase 1 milestone done"`

> If steps 1–7 are done in 4 hours, you're on track. If Bright Data or Featherless takes more than 45 minutes to get working, activate the fallback plan immediately — do not burn more time debugging.

---

*Forge Inspira 2026 · Theme 1 — Autonomous System · Market Intelligence Agent*
*Build window: March 27–28, 2026 · Submission deadline: 12:00 PM March 28*