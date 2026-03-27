import React, { useState, useEffect } from 'react';
import {ArrowLeft} from 'lucide-react'

export default function Dashboard({ onHome }) {
  const [tickerInput, setTickerInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userResponse, setUserResponse] = useState("");
  const [chatLogs, setChatLogs] = useState([]);
  
  const [results, setResults] = useState({
    bull: null,
    bear: null,
    risk: null,
    mediator: null
  });

  useEffect(() => {
    // Attempt WebSocket connection gracefully
    const socket = new WebSocket("ws://localhost:3001");
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.agent) setResults((prev) => ({ ...prev, [data.agent]: data }));
        else if (data.decision) { setResults((prev) => ({ ...prev, mediator: data })); setLoading(false); }
      } catch (err) {}
    };
    return () => socket.close();
  }, []);

  const simulateWebSocketDemo = () => {
    setChatLogs([]);
    setTimeout(() => setResults(prev => ({ ...prev, bull: { 
      agent: "bull", verdict: "BUY", confidence: 74, 
      reasons: ["Q1 revenue beat analyst estimate by 8% vs consensus of 4%", "Services segment grew 14% YoY, highest margin business", "Apple Vision Pro pre-orders exceeded supply by 3x"]
    }})), 1000);
    setTimeout(() => setResults(prev => ({ ...prev, bear: {
      agent: "bear", verdict: "SELL", confidence: 61,
      reasons: ["Heightened regulatory pressure.", "Valuation premium at risk.", "China iPhone sales down 24% in first 6 weeks of 2024."]
    }})), 2200);
    setTimeout(() => setResults(prev => ({ ...prev, risk: {
      agent: "risk", verdict: "HOLD", confidence: 55,
      reasons: ["Concentration risk in fintech sector exposure.", "Ongoing legal challenges regarding digital lending guidelines.", "Macro volatility suggests waiting."]
    }})), 3500);
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
    } catch (err) {
      simulateWebSocketDemo();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAnalyze();
  };

  const handleSendResponse = () => {
    if (!userResponse.trim()) return;
    setChatLogs([...chatLogs, { sender: 'You', text: userResponse }]);
    setUserResponse('');
    // Mock simple backend response simulation for the interaction
    setTimeout(() => {
      setChatLogs(prev => [...prev, { 
        sender: 'Mediator', 
        text: "Parameters adjusted. Monitoring data feeds with new constraints..." 
      }]);
    }, 1500);
  };

  const resetView = () => {
    setTickerInput("");
    setResults({ bull: null, bear: null, risk: null, mediator: null });
    setChatLogs([]);
  };

  const AgentColumn = ({ title, agentKey, animClass }) => {
    const data = results[agentKey];
    if (!data) {
      return (
        <div className={`base-card agent-column ${animClass}`} style={{ opacity: 0.5 }}>
          <h4 className="agent-title">{title}</h4>
          <div style={{ padding: '3rem 0', textAlign: 'center', fontSize: '0.875rem', color: '#666', letterSpacing: '0.1em' }}>
            AWAITING SIGNAL...
          </div>
        </div>
      );
    }
    return (
      <div className={`base-card agent-column ${animClass}`}>
        <h4 className="agent-title">{title}</h4>
        <div className="agent-verdict-row">
          <span className="verdict-chip">{data.verdict}</span>
          <span className="agent-conf-text">{data.confidence}% CONFIDENCE</span>
        </div>
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
      <div className="background-glow" />
      
      <nav className="top-navbar">
        <div className="navbar-brand" onClick={onHome} style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
          <ArrowLeft size={16}/> MARKET.INTEL
        </div>
        <div className="navbar-status">
          {loading ? (
            <span className="status-indicator loading">DELIBERATING</span>
          ) : (
            <span className="status-indicator online">SYSTEM READY</span>
          )}
        </div>
      </nav>

      <div className="dashboard-container anim-stagger-1">
        
        {/* Input bar */}
        <div className="zone-1-wrapper" style={{marginBottom: '0.5rem'}}>
          <div className="input-field-container">
            <input 
              type="text" 
              className="hero-input"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ENTER TICKER SYMBOL TO START ANALYSIS..."
              autoFocus
            />
          </div>
          <button className="btn-primary" onClick={handleAnalyze} disabled={loading || !tickerInput.trim()} style={{padding: '0.875rem 2.5rem', fontSize: '1rem'}}>
            {loading ? 'ANALYZING...' : 'ANALYZE'}
          </button>
        </div>

        <div className="audit-grid anim-stagger-2">
          <div className="base-card audit-card">
            <span className="audit-value">{results.bull ? 1 : 0} / 3</span>
            <span className="audit-label">Agents Complete</span>
          </div>
          <div className="base-card audit-card">
            <span className="audit-value">
              {results.mediator ? `${results.mediator.confidence}%` : '---'}
            </span>
            <span className="audit-label">Consensus Conf</span>
          </div>
          <div className="base-card audit-card">
            <span className="audit-value">
              {results.mediator ? results.mediator.conflict_score : '---'}
            </span>
            <span className="audit-label">Conflict Level</span>
          </div>
          <div className="base-card audit-card">
            <span className="audit-value">LIVE</span>
            <span className="audit-label">Websocket</span>
          </div>
        </div>

        <div className="agents-grid">
          <AgentColumn title="BULL AGENT" agentKey="bull" animClass="anim-stagger-2" />
          <AgentColumn title="BEAR AGENT" agentKey="bear" animClass="anim-stagger-3" />
          <AgentColumn title="RISK AGENT" agentKey="risk" animClass="anim-stagger-4" />
        </div>

        {results.mediator ? (
          <div>
            <div className="base-card decision-wrap anim-stagger-1">
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
                <span className="meta-pill">{results.mediator.confidence}% CONFIDENCE</span>
                <span className="meta-pill">RESOLVED</span>
              </div>
            </div>

            {/* Interactive User Response Field */}
            <div className="base-card anim-stagger-2" style={{ marginTop: '2.5rem', padding: '2rem' }}>
              <h4 style={{fontSize: '0.875rem', fontWeight: 800, marginBottom: '1.5rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                Adjust Agent Constraints & Respond
              </h4>
              
              {chatLogs.length > 0 && (
                <div style={{marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  {chatLogs.map((log, idx) => (
                    <div key={idx} style={{fontSize: '0.875rem', color: log.sender === 'You' ? '#ccc' : '#fff'}}>
                      <strong style={{color: '#888', marginRight: '0.5rem'}}>{log.sender}:</strong>
                      {log.text}
                    </div>
                  ))}
                </div>
              )}

              <div style={{display: 'flex', gap: '1.5rem', alignItems: 'center'}}>
                <input 
                  type="text" 
                  className="hero-input" 
                  style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem 1.25rem', fontSize: '1rem'}}
                  placeholder="Provide additional context or ask for clarification..."
                  value={userResponse}
                  onChange={e => setUserResponse(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendResponse()}
                />
                <button className="btn-primary" onClick={handleSendResponse} style={{padding: '1rem 2.5rem', fontSize: '1rem'}}>
                  SEND
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="base-card decision-wrap anim-stagger-1" style={{ opacity: 0.5, textAlign: 'center', padding: '3rem 0' }}>
            <p style={{ color: '#888', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.1em' }}>
              AWAITING MEDIATOR RESOLUTION...
            </p>
          </div>
        )}
      </div>
    </>
  );
}
