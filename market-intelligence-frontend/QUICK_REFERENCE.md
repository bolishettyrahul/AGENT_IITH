# Market Intelligence Agent - Feature Reference & Quick Start

## Quick Demo

1. **Local Dev Launch:**
   ```bash
   cd market-intelligence-frontend
   npm run dev
   # Opens http://localhost:5173
   ```

2. **Default Demo:**
   - Dashboard loads with AAPL pre-analyzed
   - All components visible: agents, conflict, decision chain

3. **Try Tickers:**
   - AAPL (MODERATE conflict)
   - NVDA (LOW conflict, strong BUY case)
   - TSLA (MODERATE conflict, SELL case)
   - Any other (defaults to base payload)

4. **Expand Agent Reasoning:**
   - Click "▶ Show Reasoning" on Bull/Bear/Risk cards
   - See evidence chain → reasoning logic → conviction metrics

5. **Study Decision Flow:**
   - Scroll to "Autonomous Decision Chain" section
   - Follow 4 steps: analyze → conflict → weight → decide

---

## Complete Feature Set: What's New

### Core Autonomous Reasoning Architecture

```
INPUT: Ticker (AAPL)
  ↓
PARALLEL ANALYSIS:
  ├─ Bull Agent: Evaluates bullish signals → 7.8/10 BULLISH
  ├─ Bear Agent: Evaluates bearish signals → 6.2/10 BEARISH
  └─ Risk Agent: Flags downsides → 3.5/10 CAUTION
  ↓
CONFLICT DETECTION:
  ├─ Bull vs Bear: 1.6-point gap = MODERATE conflict
  ├─ Risk independent concern: 3.5/10 = HIGH caution flag
  └─ Confidence variance: Signals agree/disagree?
  ↓
WEIGHTING SYNTHESIS:
  ├─ Bull influence: 45% (strength of bullish case)
  ├─ Bear influence: 35% (strength of bearish case)
  └─ Risk influence: 20% (downside constraint)
  ↓
FINAL RECOMMENDATION:
  ├─ Decision: HOLD (weighted synthesis)
  ├─ Confidence: 72% (conviction level)
  ├─ Risk Level: MODERATE
  └─ Action Items: 3 specific next steps
```

---

## Component Hierarchy

### Dashboard Root
```
<Dashboard>
  ├─ <Sidebar>
  └─ <Workspace>
      ├─ <TickerInput>           User submits stock ticker
      ├─ <LoadingState>          Shows during analysis (1.2s)
      │
      ├─ <AgentCard name="Bull">
      │  ├─ Stance, Confidence, Score
      │  └─ [▶ Show Reasoning]
      │      ├─ Evidence Chain
      │      ├─ Reasoning Logic
      │      └─ Conviction Metrics
      │
      ├─ <AgentCard name="Bear">  (same structure)
      ├─ <AgentCard name="Risk">  (same structure)
      │
      ├─ <ConflictAnalyzer>       Quantifies disagreement
      │  ├─ Bull vs Bear chart
      │  └─ Risk caution meter
      │
      ├─ <ResolutionChain>         Shows decision logic
      │  ├─ Step 1: Agent Analysis
      │  ├─ Step 2: Conflict Detection
      │  ├─ Step 3: Weighting Synthesis
      │  ├─ Step 4: Final Recommendation
      │  └─ Influence Breakdown (%)
      │
      ├─ <MediatorCard>            Final output
      │  ├─ Recommendation + Confidence
      │  ├─ Executive Summary
      │  ├─ Decision Science explanation
      │  ├─ Risk Level
      │  └─ Action Items (3)
      │
      └─ <SourcesCard>            Attribution
         ├─ Source 1
         ├─ Source 2
         └─ Source 3
```

---

## Visual Indicators Reference

### Confidence Track (Agent Cards)
- **Bar color**: Yellow (low) → Blue (high) gradient
- **Width**: 0-100% based on confidence score
- **Semantics**: "How aligned are the signals?"

### Score Pill (Agent Cards)
- **Format**: "X.X / 10"
- **Color**: Gray background (neutral)
- **Semantics**: "Overall conviction on 0-10 scale"

### Stance Label
- **BULLISH**: Green accent bar (top)
- **BEARISH**: Red accent bar (top)
- **CAUTION**: Orange accent bar (top)

### Conflict Badge (Conflict Card)
- **🔴 RED (HIGH)**: Boston <1.5 pt difference
- **🟠 ORANGE (MODERATE)**: 1.5-3 pt difference
- **🟢 GREEN (LOW)**: >3 pt difference

### Decision Flow (Resolution Card)
- **Step 1-3**: Blue numbered icons
- **Step 4**: Green checkmark icon
- **Connectors**: Dashed lines, animated reveal

### Recommendation Color (Mediator Card)
- **Green**: BUY recommendation
- **Amber**: HOLD recommendation
- **Red**: SELL recommendation

---

## Data Structure: What Gets Sent & Received

### Request (Your → Person A)
```json
{
  "ticker": "AAPL",
  "timestamp": "2026-03-27T15:30:00Z"
}
```

### Response (Person A → Your UI)
```json
{
  "ticker": "AAPL",
  "timestamp": "2026-03-27T15:30:05Z",
  "status": "completed",
  "agents": {
    "bull": {
      "stance": "BULLISH",
      "confidence": 0.78,
      "score": 7.8,
      "key_points": ["Point 1", "Point 2", "Point 3"],
      "reasoning": "Full explanation..."
    },
    "bear": { ... },
    "risk": { ... }
  },
  "mediator": {
    "final_recommendation": "HOLD",
    "confidence": 0.72,
    "executive_summary": "...",
    "action_items": ["Item 1", "Item 2", "Item 3"],
    "risk_level": "MODERATE"
  },
  "sources": ["Source 1", "Source 2", "Source 3"]
}
```

---

## CSS Class Reference

### Cards
- `.agent-card` — Bull/Bear/Risk card container
- `.mediator-card` — Final recommendation container
- `.conflict-card` — Conflict analysis
- `.resolution-card` — Decision chain flow
- `.sources-card` — Attribution list

### Accents & Colors
- `.accent-bull` — Green top border
- `.accent-bear` — Red top border
- `.accent-risk` — Orange top border
- `.conflict-badge.conflict-high/moderate/low` — Color-coded levels
- `.risk-pill`, `.score-pill` — Styled info badges

### Layout
- `.app-shell` — Master grid (sidebar + workspace)
- `.sidebar` — Left navigation
- `.workspace` — Main content area
- `.agent-grid` — 3-column agent layout
- `.mediator-grid` — 2-col mediator content

### Interactive
- `.expand-button` — Reasoning expand/collapse button
- `.flow-stage.final` — Final decision step styling
- `.evidence-list`, `.evidence-item` — Reasoning chain UI

---

## Animation Timings

| Element | Duration | Easing | Trigger |
|---------|----------|--------|---------|
| New cards fade-in | 0.3-0.5s | ease | On data load |
| Confidence bar fill | 0.6s | ease | On render |
| Score bar fill | 0.6s | ease | On render |
| Conflict bars | 0.6s | ease | On calculation |
| Weight bars | 0.6s | ease | On calculation |
| Reasoning expand | instant | - | Button click |

---

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 15+
- ✅ Edge 90+
- ✅ Mobile browsers (responsive)

---

## Performance Notes

**Bundle Size:**
- CSS: 9.83 kB (gzipped: 2.71 kB)
- JS: 206 kB (gzipped: 64.5 kB)
- Total gzipped: ~67 kB

**Load Time:**
- Dashboard render: <100ms
- Agent card rendering: ~50-100ms each
- Analysis processing: 1.2s (simulated, ready for API)

**Optimization Opportunities (Post-Hour 6):**
- Code-split components for lazy load
- Image optimization (if adding charts)
- CSS minification (already done by Vite)

---

## Accessibility Features

- 🎯 **ARIA labels**: All dynamic sections have `aria-label`
- 🔊 **Semantic HTML**: `<section>`, `<article>`, `<header>`, `<nav>`
- ⌨️ **Keyboard navigation**: Expand buttons, form inputs
- 🌈 **Color contrast**: WCAG AA compliant (tested on Lighthouse)
- 📱 **Mobile**: Touch-friendly button sizes, responsive layout

---

## Keyboard Shortcuts (For Demo)

| Action | Trigger |
|--------|---------|
| Submit analysis | Enter (in input field) |
| Expand reasoning | Click ▶ or Tab+Enter |
| Collapse reasoning | Click ▼ or Tab+Enter |
| Scroll to mediator | Page Down |
| Refresh page | F5 (reload state) |

---

## Troubleshooting Reference

| Problem | Check |
|---------|-------|
| Reasoning trail not showing | Verify `expandReasoning` click handler working in AgentCard.jsx |
| Conflict analyzer missing | Make sure ConflictAnalyzer is imported & rendered in Dashboard |
| Styles not applied | Verify App.css linked in App.jsx; check no CSS conflicts |
| Ticker not updating | Check `lastTicker` state in AnalysisContext; verify form submit |
| Build fails | Run `npm install` to restore dependencies |

---

## Next Phase (Hour 6-10): Integration Readiness

**What's ready to swap:**
```javascript
// Current (dummy): 
const result = createPayload(ticker);

// Hour 6 (real API):
const result = await analyzeStock(ticker);
// Where analyzeStock() = axios.post(VITE_API_URL, {ticker, timestamp})
```

**What stays the same:**
- All ConflictAnalyzer logic (frontend-side)
- All ResolutionChain logic (frontend-side)
- All ReasoningTrail display (frontend-side)
- UI layout and styling (unchanged)
- LoadingState behavior (works same with real API)

**What needs tweaks:**
- `.env` VITE_API_URL value (Person A provides)
- Error handling for failed requests (not needed for dummy)
- Retry logic (nice-to-have, not required)
- Timeout after 10s (current 1.2s is hardcoded timer)

---

## Files Manifest

```
market-intelligence-frontend/
├── src/
│   ├── components/
│   │   ├── AgentCard.jsx (↑ enhanced)
│   │   ├── ConflictAnalyzer.jsx (✨ new)
│   │   ├── Dashboard.jsx (↑ enhanced)
│   │   ├── LoadingState.jsx (✓ stable)
│   │   ├── MediatorCard.jsx (↑ enhanced)
│   │   ├── ReasoningTrail.jsx (✨ new)
│   │   ├── ResolutionChain.jsx (✨ new)
│   │   └── TickerInput.jsx (✓ stable)
│   ├── context/
│   │   └── AnalysisContext.jsx (✓ ready for API)
│   ├── services/
│   │   └── api.js (✓ placeholder)
│   ├── App.jsx (✓ master layout)
│   ├── App.css (↑ +200 lines)
│   ├── index.css (✓ base styles)
│   └── main.jsx (✓ entry point)
├── API_CONTRACT.md (✓ shared)
├── ENHANCED_DEMO_GUIDE.md (✓ walkthroughs)
├── DELIVERY_SUMMARY.md (✓ this)
├── .env (✓ ready for Hour 6)
├── vite.config.js (✓ build config)
├── package.json (✓ dependencies)
└── dist/ (generated by npm run build)
```

---

## Success Criteria Checklist

- ✅ Reasoning chains visible (expandable agents)
- ✅ Conflict quantified (Bull vs Bear comparison)
- ✅ Structured output (no paragraphs, just data)
- ✅ Decision logic traceable (4-step flow)
- ✅ Dummy data working (AAPL/NVDA/TSLA)
- ✅ Zero build errors
- ✅ Production build successful
- ✅ Responsive design (desktop + mobile)
- ✅ Animations smooth
- ✅ Interactive (expand/collapse works)
- ✅ API contract documented
- ✅ Ready for Hour 6 integration

---

**Person B Dashboard** | Hour 3-6 Complete | Autonomous Reasoning Visualization Active

*Next: Hour 6-10 API Integration Layer*
