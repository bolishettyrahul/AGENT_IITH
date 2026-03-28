# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Market Intelligence Agent** is a full-stack, real-time market analysis engine built for the Forge Inspira 2026 hackathon. The system uses multiple parallel AI agents (Bull, Bear, Risk, Mediator) to analyze stock market data and provide structured investment recommendations.

- **Frontend**: React + Vite with WebSocket real-time streaming
- **Backend**: Express + Node.js with Groq LLM inference, Bright Data web scraping, and Supabase persistence
- **Data Flow**: Ticker input → Web scraping → Parallel agent analysis → Real-time WebSocket broadcast → Dashboard visualization

## Quick Start Commands

### Backend (Node.js Express Server)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server (with auto-reload)
npm run dev

# Start production server
npm start

# Run scraper test for a ticker
npm run test:scraper
```

Backend runs on `http://localhost:3001` with WebSocket on `ws://localhost:3001`.

### Frontend (React + Vite)

```bash
# Navigate to frontend directory
cd market-intelligence-frontend

# Install dependencies
npm install

# Start development server (Vite dev mode)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint
```

Frontend runs on `http://localhost:5173` (Vite default) or configured port.

### Environment Setup

Both backend and frontend require `.env` files:

**Backend** (`backend/.env`):
- `BROWSER_WS`: Bright Data Scraping Browser WebSocket URL
- `GROQ_KEY`: Groq API key for LLM inference
- `GROQ_MODEL`: Model name (e.g., `llama-3.3-70b-versatile`)
- `SUPABASE_URL`: Database URL
- `SUPABASE_KEY`: Database API key
- `PORT`: Server port (default: 3001)
- `CORS_ORIGIN`: Frontend origin for CORS

**Frontend** (`market-intelligence-frontend/.env`):
- `VITE_API_URL`: Backend API URL (default: `http://localhost:3000`, but typically `http://localhost:3001`)

## Architecture Overview

### System Flow

```
User Input (Ticker)
    ↓
POST /analyze endpoint (backend)
    ↓
Bright Data Scraper (scraper/brightdata.js)
    ↓
Parallel Agent Execution (agents/)
  - Bull Agent: finds bullish signals
  - Bear Agent: finds bearish signals
  - Risk Agent: identifies risk factors
    ↓
WebSocket Broadcast (real-time streaming)
    ↓
Frontend Dashboard renders agents as they complete
    ↓
Mediator Agent: synthesizes all 3 perspectives
    ↓
Final recommendation broadcast + Supabase persistence
```

### Backend Structure

```
backend/
├── server.js                 # Express app, WebSocket server, /analyze endpoint
├── agents/
│   ├── bull.js              # Bullish analysis agent (Groq LLM call)
│   ├── bear.js              # Bearish analysis agent
│   ├── risk.js              # Risk analysis agent
│   ├── mediator.js          # Synthesis agent (combines all 3)
│   └── llm.js               # LLM utility (Groq API wrapper)
├── scraper/
│   └── brightdata.js        # Web scraping via Puppeteer + Bright Data
├── db/
│   └── supabase.js          # Database persistence layer
└── package.json
```

**Key Patterns**:
- **Parallel Execution**: `Promise.allSettled()` runs all 3 agents concurrently, with failures isolated
- **Streaming Results**: Each agent result is immediately broadcast via WebSocket as it resolves
- **JSON Schema**: Agents return strictly parsed JSON with `{ agent, verdict, confidence, reasons, articles }`
- **Source Attribution**: Scraped articles are tagged [S1], [S2], etc.; agents cite these in reasoning

### Frontend Structure

```
market-intelligence-frontend/
├── src/
│   ├── App.jsx              # App routing (Landing ↔ Dashboard)
│   ├── main.jsx             # Vite entry point
│   ├── components/
│   │   ├── LandingPage.jsx  # Hero/intro page with "Analyze" button
│   │   ├── Dashboard.jsx    # Main analysis view
│   │   ├── TickerInput.jsx  # Input form for ticker symbol
│   │   ├── AgentCard.jsx    # Reusable card for Bull/Bear/Risk agents
│   │   ├── MediatorCard.jsx # Final recommendation from Mediator
│   │   ├── LoadingState.jsx # Skeleton/loading UI while agents work
│   │   ├── ConflictAnalyzer.jsx  # Visualizes disagreement between agents
│   │   ├── ReasoningTrail.jsx    # Shows agent reasoning chains
│   │   ├── ResolutionChain.jsx   # Mediator's conflict resolution logic
│   │   ├── WatchlistArea.jsx     # List of analyzed tickers
│   │   └── Sidebar.jsx      # Navigation sidebar
│   ├── context/
│   │   └── AnalysisContext.jsx   # React context for global analysis state
│   ├── services/
│   │   └── api.js           # Axios client for POST /analyze
│   ├── data.js              # Dummy/mock data for fallback UI
│   └── index.css            # Global styles (glassmorphism, animations)
├── vite.config.js
├── eslint.config.js
└── package.json
```

**Key Patterns**:
- **State Management**: AnalysisContext.jsx holds ticker, agent results, loading state
- **Real-time Updates**: WebSocket listener in Dashboard.jsx updates state as agents emit results
- **Fallback UI**: If backend fails, `simulateWebSocketDemo()` triggers hardcoded demo data
- **Styling**: Custom CSS with radial gradients, glassmorphism, no Tailwind
- **Progressive Rendering**: Components render as WebSocket data arrives, not waiting for all agents

## WebSocket Communication

The backend broadcasts messages with the following structure:

```javascript
// Agent result (broadcast by each agent immediately after resolving)
{
  "agent": "bull" | "bear" | "risk" | "mediator",
  "ticker": "AAPL",
  "verdict": "BUY" | "HOLD" | "SELL",
  "confidence": 0-100,
  "reasons": [
    {
      "text": "Specific reason with numbers/events",
      "sources": ["S1", "S3"],
      "weight": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "articles": [ ... ]
}

// Source articles (broadcast before agents start)
{
  "type": "sources",
  "ticker": "AAPL",
  "articles": [ { title, url, source, publishedAt }, ... ]
}

// Error message
{
  "error": "Error description",
  "ticker": "AAPL"
}
```

## API Endpoints

### POST /analyze

**Request**:
```json
{
  "ticker": "AAPL",
  "persona": "balanced" (optional)
}
```

**Response** (immediate):
```json
{
  "status": "processing",
  "ticker": "AAPL"
}
```

**Then via WebSocket**: Agent results stream in as they complete.

### Other Routes

- `GET /` - Root (typically returns 404 or minimal response)
- All responses are streamed via WebSocket; no other REST endpoints return analysis data

## Common Development Tasks

### Adding a New Agent

1. Create `backend/agents/new-agent.js` following the pattern of `bull.js`:
   - Define `SYSTEM_PROMPT` with clear instructions
   - Use `callLLMJson()` to call Groq API
   - Return structured `{ agent, verdict, confidence, reasons, articles }`

2. Add to `server.js` pipeline:
   - Import `runNewAgent`
   - Add to `Promise.allSettled()` array in `runPipeline()`
   - Agent results auto-broadcast via WebSocket

3. Update frontend to display new agent:
   - Add AgentCard in Dashboard.jsx
   - Update AnalysisContext to include new agent state

### Debugging WebSocket Issues

- **Backend**: Check `server.js` for `clients` Set and `broadcast()` function
- **Frontend**: Open DevTools → Network → WS tab to inspect WebSocket messages
- **Test WebSocket**: Run `node backend/test_ws.js` to simulate WebSocket connection

### Testing Scraper

```bash
cd backend
npm run test:scraper  # Tests Yahoo Finance scraping for AAPL
```

Inspect `backend/scraper/brightdata.js` to understand how articles are extracted.

### Running Frontend with Different Backend URL

Set `VITE_API_URL` in `market-intelligence-frontend/.env`:
```
VITE_API_URL=http://your-backend-url:3001
```

## Key Implementation Notes

### LLM Integration

- **Provider**: Groq API (free tier, high rate limits, low latency)
- **Model**: llama-3.3-70b-versatile
- **Implementation**: `backend/agents/llm.js` wraps the API call
- **JSON Enforcement**: System prompts end with "Return ONLY valid JSON. No explanation."

### Supabase Integration

- **Table**: `signals` — stores every agent analysis for audit trail
- **Fields**: ticker, agent_type, verdict, confidence, reasons_json, created_at
- **Query**: `saveSignal()` in `backend/db/supabase.js`

### Error Handling

- **Agent Failure**: `Promise.allSettled()` ensures one agent failing doesn't block others
- **Network Failure**: Frontend catches fetch errors and triggers `simulateWebSocketDemo()`
- **Scraper Failure**: Returns error via broadcast; Mediator still runs if 1+ agents succeeded

### Performance Considerations

- **Parallel Agent Execution**: All 3 agents run simultaneously (not sequentially)
- **WebSocket Streaming**: Results sent as they arrive, not batched
- **Vite Dev Mode**: Hot Module Replacement (HMR) enabled for fast iteration
- **No Client-Side LLM**: All inference happens on backend (Groq API)

## Testing Strategy

- **Backend**: Use `npm run test:scraper` to validate Bright Data integration
- **Frontend**: Run ESLint with `npm run lint` to catch style issues
- **E2E**: Start backend (`npm run dev`) and frontend (`npm run dev`), input ticker in UI, inspect WebSocket messages in DevTools

## Deployment Notes

- **Environment Variables**: Ensure `.env` files are set in deployment (never commit sensitive keys)
- **CORS**: Backend has `cors({ origin: true })` for local dev; restrict in production
- **WebSocket Port**: Ensure port 3001 is open and accessible to frontend
- **Supabase**: Table schema must include `signals` table with expected columns

