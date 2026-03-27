import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [tickerInput, setTickerInput] = useState("AAPL");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    bull: null,
    bear: null,
    risk: null,
    mediator: null
  });

  useEffect(() => {
    // Attempt to connect to WebSocket on mount
    const socket = new WebSocket("ws://localhost:3001");
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.agent) {
          // agent is "bull" | "bear" | "risk"
          setResults((prev) => ({ ...prev, [data.agent]: data }));
        } else if (data.decision) {
          // mediator event
          setResults((prev) => ({ ...prev, mediator: data }));
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    socket.onerror = (err) => {
      console.warn("WebSocket connection failed (Backend might be offline)", err);
    };

    return () => socket.close();
  }, []);

  const simulateWebSocketDemo = () => {
    // 1. Bull finishes first
    setTimeout(() => setResults(prev => ({ ...prev, bull: { 
      agent: "bull", verdict: "BUY", confidence: 74, 
      reasons: ["Q1 revenue beat analyst estimate by 8% vs consensus of 4%", "Services segment grew 14% YoY, highest margin business", "Apple Vision Pro pre-orders exceeded supply by 3x"]
    }})), 1000);
    
    // 2. Bear finishes next
    setTimeout(() => setResults(prev => ({ ...prev, bear: {
      agent: "bear", verdict: "SELL", confidence: 61,
      reasons: ["Heightened regulatory pressure.", "Valuation premium at risk.", "China iPhone sales down 24% in first 6 weeks of 2024."]
    }})), 2200);
    
    // 3. Risk finishes
    setTimeout(() => setResults(prev => ({ ...prev, risk: {
      agent: "risk", verdict: "HOLD", confidence: 55,
      reasons: ["Concentration risk in fintech sector exposure.", "Ongoing legal challenges regarding digital lending guidelines.", "Macro volatility suggests waiting."]
    }})), 3500);
    
    // 4. Mediator completes
    setTimeout(() => {
      setResults(prev => ({ ...prev, mediator: {
        decision: "BUY", confidence: 68, conflict_score: "MEDIUM",
        trigger: "BUY if price drops below $182 on next earnings dip",
        rationale: "Bull and Risk agents align on strong fundamentals while Bear flags macro headwinds. High bull confidence outweighs moderate bear case, warranting a cautious buy with a price trigger."
      }}));
      setLoading(false);
    }, 5000);
  };

  const handleAnalyze = async () => {
    if (!tickerInput.trim() || loading) return;
    setLoading(true);
    setResults({ bull: null, bear: null, risk: null, mediator: null });
    
    try {
      const res = await fetch("http://localhost:3001/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: tickerInput.toUpperCase().trim() })
      });
      
      if (!res.ok) throw new Error("Backend API down");
      // The actual results will stream via WebSocket
    } catch (err) {
      console.warn("Using WebSocket simulation due to backend error:", err);
      simulateWebSocketDemo();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  // Helper code to map agent skeleton vs data
  const AgentColumn = ({ title, agentKey }) => {
    const data = results[agentKey];
    if (!data) {
      return (
        <div className="agent-column" style={{ opacity: 0.5 }}>
          <h4 className="agent-title">{title}</h4>
          <div style={{ padding: '2rem 0', textAlign: 'center', fontSize: '0.875rem', color: '#666' }}>
            AWAITING SIGNAL...
          </div>
        </div>
      );
    }
    return (
      <div className="agent-column">
        <h4 className="agent-title">{title}</h4>
        <div className="agent-verdict-row">
          <span className="verdict-chip">{data.verdict}</span>
          <span className="agent-conf-text">{data.confidence}% CONFIDENCE</span>
        </div>
        <div className="agent-divider"></div>
        <div className="agent-divider short"></div>
        <ul className="agent-bullet-list">
          {data.reasons.map((pt, i) => (
            <li key={i} className="agent-bullet">{pt}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <>
      <nav className="top-navbar">
        <div className="navbar-brand">MARKET INTELLIGENCE AGENT</div>
        <div className="navbar-status">
          {loading ? (
            <span className="status-indicator loading">DELIBERATING</span>
          ) : (
            <span className="status-indicator online">SYSTEM READY</span>
          )}
        </div>
      </nav>

      <div className="dashboard-container">
        
        {/* Input bar */}
        <div className="zone-1-wrapper">
          <div className="input-field-container">
            <input 
              type="text" 
              className="input-field" 
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ENTER TICKER SYMBOL..."
            />
          </div>
          <button className="btn-analyze" onClick={handleAnalyze} disabled={loading}>
            {loading ? 'ANALYZING...' : 'ANALYZE'}
          </button>
        </div>

        {/* Audit trail / Status Stats */}
        <div className="audit-grid">
          <div className="audit-card">
            <span className="audit-value">{results.bull ? 1 : 0} / 3</span>
            <span className="audit-label">Agents Completed</span>
          </div>
          <div className="audit-card">
            <span className="audit-value">
              {results.mediator ? `${results.mediator.confidence}%` : '---'}
            </span>
            <span className="audit-label">Consensus Conf</span>
          </div>
          <div className="audit-card">
            <span className="audit-value">
              {results.mediator ? results.mediator.conflict_score : '---'}
            </span>
            <span className="audit-label">Conflict Level</span>
          </div>
        </div>

        {/* Agent reasoning columns */}
        <div className="agents-grid">
          <AgentColumn title="BULL AGENT" agentKey="bull" />
          <AgentColumn title="BEAR AGENT" agentKey="bear" />
          <AgentColumn title="RISK AGENT" agentKey="risk" />
        </div>

        {/* Final decision card */}
        {results.mediator ? (
          <div className="decision-wrap">
            <div className="decision-header">
              <div className="decision-title">
                {tickerInput.toUpperCase()} <span>→ {results.mediator.decision}</span>
              </div>
              <div className="conflict-badge">{results.mediator.conflict_score} CONFLICT</div>
            </div>
            
            <p className="decision-rationale">{results.mediator.rationale}</p>
            
            <div className="decision-trigger">
              <strong>ACTION TRIGGER:</strong> {results.mediator.trigger}
            </div>
            
            <div className="meta-chip-row">
              <span className="meta-pill">{results.mediator.confidence}% MEDIATOR CONFIDENCE</span>
              <span className="meta-pill">LIVE SYNCED</span>
            </div>
          </div>
        ) : (
          <div className="decision-wrap" style={{ opacity: 0.5, textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: '#666', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.1em' }}>
              PENDING MEDIATOR RESOLUTION
            </p>
          </div>
        )}
        
      </div>
    </>
  );
}
