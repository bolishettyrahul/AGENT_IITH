# Market Intelligence Agent — Person B (Frontend & Integration)
## Comprehensive Project Brief for Hackathon Execution

---

## 1. PROJECT OVERVIEW

**Hackathon:** Forge Inspira 2026 (March 27-28, 2026)  
**Theme:** Theme 1 — Autonomous System That Takes Action  
**Challenge:** Build a system that observes, decides, and acts based on changing inputs  
**Team Size:** 2 people  
**Duration:** 24 hours

**Your Project:** Market Intelligence Agent
- **Bull Agent** - Arguments for buying/bullish signal
- **Bear Agent** - Arguments for selling/bearish signal  
- **Risk Agent** - Flags danger, warns of downside exposure
- **Mediator Agent** - Synthesizes all three positions and produces final recommendation

**Your Role:** Person B - Frontend Developer & System Integration Lead

---

## 2. WHAT THE SYSTEM DOES

### System Flow

1. User Input: Ticker symbol (e.g., "AAPL")
    ↓
2. Data Ingestion: Bright Data scrapes live news, financial data, social signals
    ↓
3. Agent Processing: Bull, Bear, Risk agents analyze independently
    ↓
4. Decision Making: Mediator synthesizes all perspectives
    ↓
5. Output: Structured decision card with:
   - Recommendation (BUY / HOLD / SELL)
   - Confidence level
   - Key reasoning from each agent
   - Risk factors
   - Action items
    ↓
6. Display: Clean UI showing the entire reasoning trail

### What Makes This Different

**Weak Version:** Summarizes market news into bullish/bearish paragraphs (instant judge red flag)

**Strong Version (Your Version):** 
- Shows actual agent **reasoning chains** 
- Displays **conflict resolution** between perspectives
- Produces **structured, actionable output** (not paragraphs)
- Demonstrates **autonomous decision-making** with logic visible throughout

---

## 3. PERSON B RESPONSIBILITIES

### Primary Focus: Frontend + System Integration

You own three critical areas:

#### A. Frontend Dashboard (Hours 0-12)
- Clean, professional React/Vue interface
- Display ticker input, loading states, error handling
- Show all four agent analyses side-by-side
- Display Mediator's final recommendation prominently
- Timeline/reasoning chain visualization

#### B. API Contract & Integration (Hours 6-14)
- Define the JSON contract between Person A (backend) and you (frontend)
- Build against dummy data first (parallel with Person A's development)
- Handle API calls, error states, data validation
- Fallback UI for when agents are still processing

#### C. Data Flow & UX Polish (Hours 14-24)
- Connect real API responses to UI
- Add animations/transitions for readability
- Build the 3-minute demo flow
- Test end-to-end functionality

---

## 4. YOUR EXACT ROLE BREAKDOWN

### What You Do

| Task | Owner | Timing | Deliverable |
|------|-------|--------|-------------|
| UI/UX Design mockups | You | Hour 0-1 | Figma/wireframe sketch |
| JSON schema agreement | You + Person A | Hour 0.5 | Shared schema document |
| React component structure | You | Hour 1-3 | Folder structure + empty components |
| Dummy data implementation | You | Hour 3-6 | Fully working UI with hardcoded responses |
| API integration layer | You | Hour 6-10 | Axios client setup, error handling |
| Live API connection | You | Hour 10-14 | Swap dummy → real data |
| Polish & animations | You | Hour 14-20 | Smooth UX, loading states |
| Demo walkthrough rehearsal | You | Hour 20-24 | Tight 3-minute demo |

### What Person A Does (Backend/Agents)

| Task | Owner | Timing | Deliverable |
|------|-------|--------|-------------|
| Bright Data integration | Person A | Hour 0-2 | Working scraper returning JSON |
| LLM API setup (Featherless) | Person A | Hour 2-4 | Test agent responding with JSON |
| Bull agent prompt engineering | Person A | Hour 4-6 | Production prompt + JSON schema |
| Bear + Risk agents | Person A | Hour 6-8 | All three agents returning structured output |
| Mediator agent + logic | Person A | Hour 8-12 | Final decision synthesis working |
| API endpoints (Node.js) | Person A | Hour 12-16 | `/analyze?ticker=AAPL` endpoint live |
| Error handling & robustness | Person A | Hour 16-22 | API resilient to failures |
| Final testing & optimization | Person A | Hour 22-24 | Ensures decision quality |

---

## 5. THE JSON CONTRACT (PERSON A ↔ PERSON B)

### This is your most important 15 minutes at Hour 0

**You must agree on this structure before either of you writes code.**

#### Request Format (You → Person A)

{
  "ticker": "AAPL",
  "timestamp": "2026-03-27T15:30:00Z"
}

#### Response Format (Person A → You)

{
  "ticker": "AAPL",
  "timestamp": "2026-03-27T15:30:05Z",
  "status": "completed",
  "agents": {
    "bull": {
      "stance": "BULLISH",
      "confidence": 0.78,
      "key_points": [
        "Strong Q1 earnings beat",
        "Tech sector recovery momentum",
        "New AI integration roadmap"
      ],
      "reasoning": "The company showed unexpected strength in earnings...",
      "score": 7.8
    },
    "bear": {
      "stance": "BEARISH",
      "confidence": 0.62,
      "key_points": [
        "Valuation stretched at 28x PE",
        "Macro headwinds expected",
        "Supply chain risks persist"
      ],
      "reasoning": "Despite positive earnings, valuations are concerning...",
      "score": 6.2
    },
    "risk": {
      "stance": "CAUTION",
      "confidence": 0.85,
      "key_points": [
        "Regulatory scrutiny increasing",
        "Currency headwinds vs USD strength",
        "Competition intensifying"
      ],
      "reasoning": "Multiple external risks could derail momentum...",
      "score": 3.5
    }
  },
  "mediator": {
    "final_recommendation": "HOLD",
    "confidence": 0.72,
    "executive_summary": "While fundamentals are strong, valuation and macro risks suggest waiting for pullback.",
    "action_items": [
      "Set entry target at $155 if support holds",
      "Monitor Fed policy announcements",
      "Track regulatory developments"
    ],
    "risk_level": "MODERATE"
  },
  "sources": [
    "Financial Times: Tech earnings surge",
    "Reuters: Regulatory proposal filed",
    "Yahoo Finance: Analyst upgrades"
  ]
}

**Critical Rules:**
- All confidence scores: 0-1.0 range
- All `score` fields: 0-10 scale
- `key_points`: Always array of 3-5 strings
- `reasoning`: Plain English, 2-3 sentences max
- `timestamp`: UTC ISO format
- `status`: One of ["completed", "processing", "error"]

---

## 6. YOUR TECH STACK

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React 18 (or Vue 3 if preferred) | UI component system |
| Styling | Tailwind CSS | Professional, responsive design |
| API Client | Axios | HTTP requests to Person A's backend |
| State Management | React Context or Zustand | Manage loading, error, data states |
| Charts/Visualization | Recharts or Chart.js | Display agent reasoning visually |
| Deployment | Vercel or Netlify | Live demo URL for judges |

---

## 7. PERSON B — HOUR-BY-HOUR EXECUTION PLAN

### Hour 0-1: Setup & Design
**Task:** Design and wireframe the UI  
**Outcome:** Agree on layout with Person A  

Wireframe components:
- Header with ticker input + submit button
- Loading spinner while agents think
- 4-column layout (Bull | Bear | Risk | Mediator)
- Each column shows: stance, confidence bar, key_points, score
- Final recommendation card at bottom (large, prominent)
- Sources cited

**Deliverable:** Shared Figma sketch or drawn mockup

---

### Hour 1-2: Project Setup
**Task:** Initialize React project + folder structure  

/market-intelligence-frontend
├── src/
│   ├── components/
│   │   ├── TickerInput.jsx
│   │   ├── AgentCard.jsx
│   │   ├── MediatorCard.jsx
│   │   ├── LoadingState.jsx
│   │   └── Dashboard.jsx
│   ├── services/
│   │   └── api.js (Axios client setup)
│   ├── context/
│   │   └── AnalysisContext.jsx
│   ├── App.jsx
│   ├── App.css
│   └── index.js
├── .env (API_URL)
└── package.json

**Deliverable:** Repo initialized, all folders created, basic component stubs

---

### Hour 2-3: Define JSON Contract with Person A
**Task:** Finalize the request/response schema  

**Sync Point #1:** Both agree on the JSON format above. Document it in a shared file.

**Deliverable:** `API_CONTRACT.md` file both of you reference

---

### Hour 3-6: Build UI with Dummy Data
**Task:** Fully working dashboard using hardcoded responses  

// Dummy data in Dashboard.jsx
const dummyResponse = {
  ticker: "AAPL",
  agents: {
    bull: {
      stance: "BULLISH",
      confidence: 0.78,
      key_points: ["Strong Q1 earnings", "Tech recovery", "AI roadmap"],
      reasoning: "Company beat earnings expectations...",
      score: 7.8
    },
    // ... rest of structure
  }
}

Build these components:
- `<TickerInput />` - Input field + button
- `<AgentCard />` - Reusable card for Bull/Bear/Risk
- `<MediatorCard />` - Larger card for final recommendation
- `<Dashboard />` - Main layout

**Deliverable:** Fully clickable UI, looks professional, uses dummy data

---

### Hour 6-8: API Integration Layer
**Task:** Build Axios client to connect to Person A's backend  

// services/api.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const analyzeStock = async (ticker) => {
  try {
    const response = await axios.post(`${API_BASE}/api/analyze`, {
      ticker: ticker.toUpperCase(),
      timestamp: new Date().toISOString()
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

Build loading/error states in Context:
- `isLoading` state
- `error` state
- `data` state
- `submitAnalysis()` function

**Deliverable:** API client ready, context setup, error handling in place

---

### Hour 8-10: Fallback State & Polish
**Task:** Build fallback UI for when data is missing or delayed  

- Show "Processing..." with spinner while waiting
- Show error card if API fails
- Retry button functionality
- Timeout handling (after 10 seconds, show error)

**Sync Point #2 (Hour 8):** Check in with Person A - are endpoints ready soon?

**Deliverable:** Robust error states, cannot crash

---

### Hour 10-14: Live API Integration
**Task:** Swap dummy data for real API responses  

// In Dashboard.jsx
const [data, setData] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);

const handleAnalyze = async (ticker) => {
  setIsLoading(true);
  setError(null);
  try {
    const result = await analyzeStock(ticker);
    setData(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

Person A will provide the live endpoint; you connect it.

**Sync Point #3 (Hour 10):** Person A's backend API is live. Plug it in.

**Deliverable:** Real data flowing from backend to frontend

---

### Hour 14-18: Polish & Animations
**Task:** Make it visually impressive for judges  

- Fade-in animations when data loads
- Confidence bars animate to their score
- Color coding: Bullish = green, Bearish = red, Risk = orange, Mediator = blue
- Smooth transitions between states
- Mobile responsive (just in case demo screen is small)
- Add visual connection lines between agents → mediator (shows flow)

**Deliverable:** Professional-looking, animated UI

---

### Hour 18-20: Testing & Edge Cases
**Task:** Test all scenarios  

- Try invalid ticker (should handle gracefully)
- Try ticker while API is slow (show spinner correctly)
- Try ticker while API fails (show error, allow retry)
- Test mobile responsiveness
- Test copy-paste from UI

**Deliverable:** Robust, no crashes

---

### Hour 20-24: Demo Rehearsal & Final Tweaks
**Task:** Perfect the 3-minute demo  

**Demo Script:**
1. **(0:00-0:30)** "This is the Market Intelligence Agent. It watches stock data and uses multiple AI perspectives."
2. **(0:30-0:45)** Type ticker "AAPL" into input, hit analyze
3. **(0:45-2:00)** "While it analyzes, you can see three independent agents: Bull argues for buying, Bear argues for selling, Risk warns of dangers. They process in parallel."
4. **(2:00-2:20)** Results load. Point to each agent card. "Notice the confidence scores and reasoning."
5. **(2:20-2:50)** Point to Mediator card. "The Mediator synthesizes all three perspectives and makes a final call: BUY, HOLD, or SELL. This decision is based on actual reasoning, not magic."
6. **(2:50-3:00)** "That's the core. Let me try another ticker..." (quick second example to show it's not hardcoded)

**Deliverable:** Smooth demo, zero crashes, clear messaging

---

## 8. THREE CRITICAL SYNC POINTS

| Sync Point | Time | What | Why |
|-----------|------|------|-----|
| **#1: JSON Contract** | Hour 0.5 | Agree on request/response schema | Without this, both of you will code in different directions |
| **#2: Check-in** | Hour 8 | Ask Person A: "Will endpoints be ready by Hour 10?" | Early warning if backend is behind schedule |
| **#3: Integration** | Hour 10 | Connect real API to frontend | Critical handoff point |

**If any sync point is missed or unclear, the whole integration falls apart in Hour 14.**

---

## 9. FALLBACK PLANS

### If Person A's API is Late
**What you do (Hour 10-12):**
- Keep using dummy data in UI
- Build a **mock server** that returns JSON matching the contract
- When real API comes online, swap endpoints (15-minute job)
- This prevents you from being blocked

### If Bright Data Fails
**What Person A will do:**
- Fallback to free financial APIs (Alpha Vantage, CoinGecko)
- Your UI doesn't change — just slightly different data source
- You shouldn't need to do anything

### If Featherless.ai is Overloaded
**What Person A will do:**
- Fallback to free OpenAI Gpt APIs or Groq
- Response schema stays identical
- Your UI stays identical

---

## 10. WHAT SUCCESS LOOKS LIKE (Person B)

### By Hour 24, You Should Have

✅ **Frontend**
- [ ] Clean, professional React dashboard
- [ ] Ticker input + submit button working
- [ ] Four agent cards displaying data cleanly
- [ ] Mediator card with final recommendation prominent
- [ ] Loading states, error handling, retry logic
- [ ] Responsive design (desktop + mobile)
- [ ] Animations/transitions smooth

✅ **Integration**
- [ ] Axios client configured correctly
- [ ] Context/state management working
- [ ] Real API connected and flowing data
- [ ] Error states tested and working
- [ ] No crashes or console errors

✅ **Demo-Ready**
- [ ] 3-minute demo script perfected
- [ ] Two different ticker examples tested
- [ ] All edge cases handled
- [ ] Live deployment (Vercel/Netlify) working

✅ **Judging**
- [ ] UI clearly shows agent reasoning
- [ ] Mediator decision is easy to understand
- [ ] Sources are visible
- [ ] System feels intelligent, not like a chatbot wrapper

---

## 11. KEY TECHNICAL DECISIONS FOR YOU

### Decision 1: React or Vue?
- **React** - More familiar to most devs, larger ecosystem
- **Vue** - Lighter, faster learning curve
- **Recommendation:** React (more judge familiarity)

### Decision 2: Styling Approach?
- **Tailwind CSS** - Fast, professional, built-in dark mode
- **Styled Components** - Component-scoped styling
- **Recommendation:** Tailwind (saves time)

### Decision 3: State Management?
- **React Context** - Simple, built-in
- **Zustand** - Lightweight external store
- **Recommendation:** Context (no external deps needed)

### Decision 4: Charts/Visualization?
- **Recharts** - React-specific, clean
- **Chart.js** - Universal, powerful
- **Recommendation:** Recharts (React-friendly)

---

## 12. MOCKUP DESIGN GUIDANCE

Your dashboard should show:

┌─────────────────────────────────────────────────────────────┐
│  Market Intelligence Agent                                  │
├─────────────────────────────────────────────────────────────┤
│  Ticker Input: [AAPL_____]  [ANALYZE]                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  BULL    │  │  BEAR    │  │  RISK    │  │ MEDIATOR │  │
│  │ 🟢 BULL  │  │ 🔴 BEAR  │  │ 🟠 WARN  │  │  🔵 HOLD │  │
│  │ 78% conf │  │ 62% conf │  │ 85% conf │  │ 72% conf │  │
│  │          │  │          │  │          │  │          │  │
│  │ • Beat   │  │ • 28x PE │  │ • Legal  │  │ Summary: │  │
│  │   earnings│  │ • Macro  │  │ • FX     │  │ Strong   │  │
│  │ • AI road│  │ • Supply │  │ • Comp   │  │ but wait │  │
│  │ • Sector │  │          │  │          │  │ for dip  │  │
│  │   growth │  │          │  │          │  │          │  │
│  │          │  │          │  │          │  │          │  │
│  │ Score: 7.8│ │ Score: 6.2│ │ Score: 3.5│ │ Action:  │  │
│  └──────────┘  └──────────┘  └──────────┘  │ • Set    │  │
│                                               │   target │  │
│                                               │ • Monitor│  │
│                                               │   regs   │  │
│                                               └──────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Sources: Financial Times, Reuters, Yahoo Finance           │
│  Analysis Complete at: 2:45 PM IST, March 27, 2026          │
└─────────────────────────────────────────────────────────────┘

---

## 13. DEPLOYMENT FOR DEMO DAY

**Critical:** Get this deployed to a live URL **by Hour 23**

**Option 1: Vercel (Recommended)**
npm install -g vercel
vercel login
vercel deploy
# Get live URL immediately

**Option 2: Netlify**
npm run build
# Drag-and-drop /build folder to Netlify

**Why:** Judges need to see a working, public URL. Cannot be localhost.

---

## 14. PERSON B SUCCESS METRICS

By end of 24 hours, judges should say:

✅ "The UI instantly communicates what's happening"  
✅ "I can see each agent's perspective clearly"  
✅ "The Mediator decision feels intelligent, not automated"  
✅ "The system shows reasoning, not just outputs"  
✅ "This is production-ready, not a proof of concept"  

---

## 15. JUDGING ALIGNMENT (How You Contribute to Score)

| Judging Criteria | Points | Your Contribution |
|-----------------|--------|------------------|
| Clarity of Problem → Solution | 20 pts | **UI makes it instantly clear** |
| Quality of Output | 20 pts | **Display makes structured decisions easy to parse** |
| Intelligence & Reasoning | 20 pts | **Reasoning chains visible in your cards** |
| Use of Data & Inputs | 20 pts | **Live data flowing, ticker input works** |
| Execution & Demo | 20 pts | **Your demo smooth, no crashes, 3 min tight** |
| **Total Contribution** | **60/100** | **Strong frontend + smooth integration** |

Your quality work here pushes the projected score from 85/100 → **96/100**.

---

## 16. QUICK REFERENCE: WHAT YOU NEED FROM PERSON A

**By Hour 0.5:**
- Agreement on JSON contract

**By Hour 8:**
- Status update on backend progress

**By Hour 10:**
- Live API endpoint: `POST /api/analyze`
- Response format matching contract

**By Hour 12:**
- Errors/edge case handling in API responses

**By Hour 22:**
- Final quality assurance of data outputs

---

## 17. YOUR COMMUNICATION PROTOCOL

**Daily Sync Points:**
- **Hour 0:** Initial design + contract sign-off
- **Hour 4:** Quick 5-min check-in (everything on track?)
- **Hour 8:** Is backend ready by Hour 10? Any blockers?
- **Hour 12:** Live API working? Any data issues?
- **Hour 18:** Does demo flow well? UX polish feedback?
- **Hour 22:** Final testing together

**Communication Channel:** WhatsApp (per hackathon guidelines)

---

## 18. EMERGENCY CONTACTS & RESOURCES

**Hackathon Support:**
- Telegram: #general channel for common issues
- #brightdata-support: If data scraping fails
- #featherless-support: If LLM API fails

**Frontend Resources:**
- React docs: https://react.dev
- Tailwind CSS: https://tailwindcss.com
- Recharts: https://recharts.org
- Axios docs: https://axios-http.com

**Deployment:**
- Vercel: https://vercel.com
- Netlify: https://netlify.com

---

## 19. FINAL REMINDERS

1. **Start the JSON contract at Hour 0.** This is the foundation.
2. **Build with dummy data first.** Parallel work prevents blocking.
3. **Deploy to live URL by Hour 23.** Judges need to see public link.
4. **Test edge cases early.** Error handling is not a last-minute task.
5. **Your UI is what judges see first.** Make it count.
6. **Rehearse the 3-minute demo 5 times.** Smooth delivery = high scores.
7. **Monitor sync points.** Miss one and cascading delays follow.
8. **Have fun.** You're building something genuinely novel.

---

## 20. PERSON B — GO/NO-GO CHECKLIST (Hour 24)

**Frontend Complete?**
- [ ] All 4 agent cards rendering correctly
- [ ] Mediator card prominent and clear
- [ ] Loading spinner works
- [ ] Error states tested
- [ ] Mobile responsive
- [ ] No console errors

**Integration Complete?**
- [ ] Axios client configured
- [ ] Real API connected
- [ ] Data flowing end-to-end
- [ ] No network errors in production

**Demo Ready?**
- [ ] 3-minute script rehearsed
- [ ] Two ticker examples tested
- [ ] Live deployment working
- [ ] Backup plan if API slows down (cached response)

**Judges Impressed?**
- [ ] UI communicates agent reasoning clearly
- [ ] Decision feels intelligent
- [ ] Sources visible
- [ ] Zero crashes during demo

---

**You've got this. Build something great.** 🚀

---

### Document Generated For: Nikhil Kotte (Person B)
**Project:** Market Intelligence Agent — Forge Inspira 2026  
**Date:** March 27, 2026  
**Role:** Frontend Developer & System Integration Lead  
**Team Size:** 2 people (You + Person A)
