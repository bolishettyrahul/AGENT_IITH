export const dummyData = {
  ticker: "AAPL",
  signalsIngested: 47,
  analysisTime: "8.2s",
  sourcesUsed: 4,
  conflictType: "3-way",
  conflictScore: "HIGH",
  liveData: [
    { type: "news", text: "Apple Q1 earnings beat by 8% against analyst estimate of 4.2%" },
    { type: "news", text: "EU antitrust fine risk: €3.8B ruling expected Q2 2026" },
    { type: "price", text: "AAPL $189.40 · VIX 22.4 · 30d vol 18.3%" },
    { type: "social", text: "Insider selling: CEO sold $42M in shares March 24" }
  ],
  agents: {
    bull: {
      verdict: "BUY",
      confidence: "74%",
      reasons: [
        "Q1 revenue beat by 8% vs 4.2% estimate expected",
        "Services segment grew 14% year-over-year",
        "Vision Pro pre-orders exceeded conservative targets"
      ]
    },
    bear: {
      verdict: "SELL",
      confidence: "61%",
      reasons: [
        "EU antitrust fine poses immediate €3.8B threat",
        "China iPhone sales down 24% in first 6 weeks of 2024",
        "Valuation remains stretched at 28x forward P/E"
      ]
    },
    risk: {
      verdict: "HOLD",
      confidence: "82%",
      reasons: [
        "High regulatory exposure in key markets",
        "Macro volatility (VIX 22.4) suggests waiting",
        "Insider selling detected at current price levels"
      ]
    }
  },
  mediator: {
    finalVerdict: "HOLD",
    conditionalVerdict: "conditional BUY",
    rationale: "Risk Agent (82%) outweighs Bull (74%) on timing. Bear's EU fine risk is real but priced in at current levels.",
    trigger: "BUY if price retraces below $182 OR VIX drops below 18",
    confidence: "68% confidence",
    splitType: "3-way split",
    weightMethod: "Risk-weighted"
  }
};
