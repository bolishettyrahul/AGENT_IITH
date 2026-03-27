# API Contract (Person A <-> Person B)

## Request Format

```json
{
  "ticker": "AAPL",
  "timestamp": "2026-03-27T15:30:00Z"
}
```

## Response Format

```json
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
```

## Contract Rules

- `confidence`: numeric range from `0` to `1.0`.
- `score`: numeric range from `0` to `10`.
- `key_points`: array with `3-5` strings.
- `reasoning`: plain English, max `2-3` short sentences.
- `timestamp`: UTC ISO-8601 string.
- `status`: one of `completed`, `processing`, `error`.
