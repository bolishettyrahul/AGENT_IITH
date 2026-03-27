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

## Phase 1 — Setup + First Working Call (Hour 0–4) ✅ COMPLETE

**Goal:** AAPL scrape → Bull Agent verdict printed in terminal. One working end-to-end call.

### Tasks

- [x] Create GitHub repo + Node.js project structure
  - Folders: `/backend/agents`, `/backend/scraper`, `/backend/db`
  - `.env` filled with all real keys — `.env.example` shared with Person B
  - Branch: `backend` pushed to `bolishettyrahul/AGENT_IITH`

- [x] Create Supabase project + signals table
  - Schema in `backend/db/schema.sql` — run in Supabase SQL Editor
  - `saveSignal()` helper in `backend/db/supabase.js`

- [x] Scraper — Yahoo Finance JSON API (primary) + Bright Data Browser API fallback
  - Primary: `query1/query2.finance.yahoo.com` — clean JSON, no credits, no JS rendering needed
  - Fallback: Bright Data Scraping Browser via `puppeteer-core` + `BROWSER_WS`
  - Fixed bugs: `Promise.allSettled` + `Number()` cast on `toFixed()`

- [x] Featherless.ai — model confirmed working
  - Model: `Qwen/Qwen2.5-72B-Instruct`
  - JSON retry logic in `backend/agents/llm.js` — retries once with stricter prompt on parse fail

- [x] Bull Agent prompt — confirmed clean JSON output
  - Tested AAPL end-to-end in terminal

- [x] **Milestone complete** — committed `"Phase 1 milestone: AAPL scrape → Bull Agent JSON working"`

---

## Phase 2 — All 4 Agents + Full Pipeline (Hour 4–10) 🔴 IN PROGRESS

**Goal:** All 3 agents run in parallel → Mediator resolves conflict → full decision saved to Supabase → WebSocket server emitting results.

> **Prompt decision:** All 4 prompts reviewed, approved, and locked. `{ticker}` bug fixed — ticker is injected via user prompt only, not system prompt.

### Approved Prompts (locked — do not change without re-testing JSON output)

#### Bull
```
You are a Bull analyst.
Your sole goal is to find the strongest possible case for buying this stock.
Even if the overall news is mixed or negative, identify the best bullish signals available.
Extract specific numbers, percentages, earnings beats, analyst upgrades, and named catalysts.
Vague reasons like "revenue is up" are not acceptable — cite exact figures.
If fewer than 3 strong bullish signals exist, include the weakest available but mark low confidence.
Return ONLY valid JSON:
{ "verdict": "BUY", "confidence": <0-100>, "reasons": ["<specific with number/event>", "<specific>", "<specific>"] }
No explanation. No preamble. Nothing outside the JSON.
```

#### Bear
```
You are a Bear analyst.
Your sole goal is to find the strongest possible case for selling this stock.
Even if the overall news is positive, identify the most significant downside risks available.
Focus exclusively on: earnings misses, analyst downgrades, insider selling, macro headwinds,
regulatory risks, valuation concerns, and competitive threats.
Extract specific numbers, percentages, dates, and named risk events.
Do not reference any positive signals — they are outside your mandate.
If fewer than 3 strong bearish signals exist, include the weakest available but mark low confidence.
Return ONLY valid JSON:
{ "verdict": "SELL", "confidence": <0-100>, "reasons": ["<specific with number/event>", "<specific>", "<specific>"] }
No explanation. No preamble. Nothing outside the JSON.
```

#### Risk
```
You are a Risk analyst.
Your sole goal is to protect capital and minimize exposure.
You are strongly biased toward HOLD. Only deviate if the evidence is overwhelming:
- Deviate to BUY only if volatility is very low AND Bull signals are unusually strong
- Deviate to SELL only if there is an imminent, specific, dated risk event with high probability
Default behavior when uncertain: always return HOLD.
Flag: volatility indexes, upcoming earnings dates, Fed decisions, geopolitical exposure,
options skew, and any events within the next 30 days that could move the stock significantly.
Extract specific numbers, dates, and named risk events from the news.
Return ONLY valid JSON:
{ "verdict": "<HOLD|BUY|SELL>", "confidence": <0-100>, "reasons": ["<specific with number/event>", "<specific>", "<specific>"] }
No explanation. No preamble. Nothing outside the JSON.
```

#### Mediator
```
You are a senior investment strategist at a hedge fund.
You receive 3 independent analyst reports with potentially conflicting verdicts.
Your job: synthesize them into ONE final, defensible decision.

Weighting rules:
- Higher confidence score = more influence on the final decision
- 2-vs-1 majority wins ONLY if the majority's average confidence exceeds the dissenter's by 15+ points
- If all 3 disagree with confidence within 10 points of each other: default to HOLD
- Risk Agent's HOLD recommendation adds 10 points of resistance against BUY or SELL decisions

Conflict score rules (use exactly these):
- HIGH: all 3 agents have different verdicts OR two agents disagree with confidence gap < 15
- MEDIUM: 2-vs-1 split with confidence gap between 15-30 points
- LOW: 2-vs-1 split with confidence gap > 30 points OR all 3 agree

Trigger rules:
- BUY trigger: must include a specific price level or catalyst event
- SELL trigger: must include a specific condition
- HOLD trigger: must include what would change the recommendation

Return ONLY valid JSON — no text outside the object:
{
  "decision": "<BUY|SELL|HOLD>",
  "confidence": <0-100>,
  "conflict_score": "<LOW|MEDIUM|HIGH>",
  "trigger": "<specific conditional with price, date, or event>",
  "rationale": "<2-3 sentences: name which agents you sided with, cite their specific reasons, explain why you outweighed the dissenter>"
}
```

### WebSocket Event Flow

```
1. Client sends:   POST /analyze with { ticker: "AAPL" }
2. Server:         Scrape → start all 3 agents in parallel (Promise.all)
3. Bull finishes → emit { agent: "bull", verdict, confidence, reasons }
4. Bear finishes → emit { agent: "bear", verdict, confidence, reasons }
5. Risk finishes → emit { agent: "risk", verdict, confidence, reasons }
6. Mediator runs → emit { decision, conflict_score, trigger, rationale }
```

> Emit each agent the moment it resolves — NOT after all 3 finish. This is the live "agents deliberating" visual.

### Tasks

- [x] Bull Agent prompt — approved and locked
- [ ] Bear Agent prompt — update with approved prompt, test 3× clean JSON
- [ ] Risk Agent prompt — update with approved prompt, test 3× clean JSON
- [ ] Mediator prompt — update with approved prompt, test hardcoded inputs:
  - Test 1: bull=BUY/80, bear=SELL/75, risk=HOLD/60 → expect `conflict_score: "HIGH"`
  - Test 2: bull=BUY/85, bear=HOLD/40, risk=HOLD/55 → expect `conflict_score: "LOW"`
- [ ] Wire all 3 agents in parallel — `Promise.all()` in `server.js` runPipeline()
- [ ] Save all outputs to Supabase — one row per agent + one row for mediator
- [ ] WebSocket server emits per-agent as each resolves
- [ ] CORS confirmed for Person B's Vercel domain
- [ ] **Milestone:** AAPL + TSLA both produce different outputs end-to-end
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