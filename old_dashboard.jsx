import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, AlertCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export default function Dashboard({ onHome }) {
  const [tickerInput, setTickerInput] = useState("");
  const [persona, setPersona] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [userResponse, setUserResponse] = useState("");
  const [chatLogs, setChatLogs] = useState([]);
  const [sourceArticles, setSourceArticles] = useState([]);
  
  const [results, setResults] = useState({
    bull: null,
    bear: null,
    risk: null,
    mediator: null
  });

  const wsRef = useRef(null);

  useEffect(() => {
    let reconnectTimer;
    const connectWS = () => {
      const socket = new WebSocket("ws://localhost:3001");
      socket.onopen = () => { setErrorState(null); };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
        if (data.error) {
          setErrorState(data.error);
          setLoading(false);
        } else if (data.type === 'sources') {
          // Receive scraped article metadata early
          setSourceArticles(data.articles || []);
        } else if (data.agent) {
          setResults((prev) => ({ ...prev, [data.agent]: data }));
        } else if (data.decision) { 
          setResults((prev) => ({ ...prev, mediator: data })); 
          setLoading(false); 
        }
        } catch (err) { }
      };
      socket.onclose = () => {
        reconnectTimer = setTimeout(connectWS, 3000);
      };
      socket.onerror = (err) => {
        // We will mock silently if it fails, but track it
      };
      wsRef.current = socket;
    };

    connectWS();
    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  const simulateWebSocketDemo = () => {
    // If backend is down, run the demo with attributed mock data
    setErrorState("Backend unreachable. Running autonomic fallback simulation.");
    setChatLogs([]);

    // Set mock source articles
    setSourceArticles([
      { id: 'S1', title: 'Apple Q1 Revenue Beats Estimates With Strong Services Growth', summary: 'Apple reported Q1 revenue of $119.6B, beating analyst estimates by 8%.', publisher: 'Reuters', url: 'https://reuters.com' },
      { id: 'S2', title: 'Apple Vision Pro Pre-Orders Exceed Supply', summary: 'Initial pre-orders for Apple Vision Pro surpassed available supply by 3x.', publisher: 'Bloomberg', url: 'https://bloomberg.com' },
      { id: 'S3', title: 'EU Antitrust Regulators Increase Scrutiny on App Store Policies', summary: 'European regulators are ramping up pressure on Apple over App Store fees.', publisher: 'Financial Times', url: 'https://ft.com' },
      { id: 'S4', title: 'China iPhone Sales Decline 24% in Early 2024', summary: 'Apple struggled in its third-largest market with a steep decline.', publisher: 'CNBC', url: 'https://cnbc.com' },
      { id: 'S5', title: 'Fed Meeting Next Week — Rate Decision Expected', summary: 'Markets brace for Fed\'s rate decision amid mixed economic signals.', publisher: 'Wall Street Journal', url: 'https://wsj.com' },
      { id: 'S6', title: 'Apple Services Segment Grows 14% YoY', summary: 'Services revenue reached a new all-time high at $23.1 billion.', publisher: 'Yahoo Finance', url: 'https://finance.yahoo.com' },
    ]);

    setTimeout(() => setResults(prev => ({ ...prev, bull: { 
      agent: "bull", verdict: "BUY", confidence: 74, 
      reasons: [
        { text: "Q1 revenue beat analyst estimate by 8% vs consensus of 4%, reaching $119.6B", sources: ["S1"], weight: "HIGH" },
        { text: "Services segment grew 14% YoY to $23.1B — highest margin business at all-time high", sources: ["S6", "S1"], weight: "HIGH" },
        { text: "Apple Vision Pro pre-orders exceeded supply by 3x, strong demand signal", sources: ["S2"], weight: "MEDIUM" },
      ],
      articles: []
    }})), 1000);

    setTimeout(() => setResults(prev => ({ ...prev, bear: {
      agent: "bear", verdict: "SELL", confidence: 61,
      reasons: [
        { text: "Heightened regulatory pressure from EU antitrust on App Store — could erode margins", sources: ["S3"], weight: "HIGH" },
        { text: "China iPhone sales down 24% in first 6 weeks of 2024, third-largest market declining", sources: ["S4"], weight: "HIGH" },
        { text: "Fed rate decision uncertainty adding macro headwinds to growth stocks", sources: ["S5"], weight: "MEDIUM" },
      ],
      articles: []
    }})), 2200);

    setTimeout(() => setResults(prev => ({ ...prev, risk: {
      agent: "risk", verdict: "HOLD", confidence: 55,
      reasons: [
        { text: "Fed rate decision in less than 7 days — binary event risk is elevated", sources: ["S5"], weight: "HIGH" },
        { text: "Regulatory risk from EU antitrust could create significant downside volatility", sources: ["S3"], weight: "MEDIUM" },
        { text: "China sales weakness suggests geographic concentration risk", sources: ["S4"], weight: "MEDIUM" },
      ],
      articles: []
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
    setErrorState(null);
    setSourceArticles([]);
    setResults({ bull: null, bear: null, risk: null, mediator: null });
    
    try {
      const res = await fetch("http://localhost:3001/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: tickerInput.toUpperCase().trim(), persona })
      });
      if (!res.ok) throw new Error("Backend API returned " + res.status);
    } catch (err) {
      console.error(err);
      setErrorState(`Network Error: ${err.message}. Running fallback...`);
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
    setTimeout(() => {
      setChatLogs(prev => [...prev, { 
        sender: 'Mediator', 
        text: "Parameters adjusted. Monitoring data feeds with new constraints..." 
      }]);
    }, 1500);
  };

  // Resolve a source ID to its article object
  const getArticle = (sourceId) => {
    return sourceArticles.find(a => a.id === sourceId);
  };

  // Weight badge colors
  const getWeightColor = (weight) => {
    const w = (weight || '').toUpperCase();
    if (w === 'HIGH') return '#ef4444';
    if (w === 'MEDIUM') return '#f59e0b';
    if (w === 'LOW') return '#6b7280';
    return '#888';
  };

  const AgentColumn = ({ title, agentKey }) => {
    const data = results[agentKey];
    const [expandedReasons, setExpandedReasons] = useState({});
    const [showAllSources, setShowAllSources] = useState(false);

    const toggleReason = (idx) => {
      setExpandedReasons(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    if (!data) {
      // Skeleton Loading State
      return (
        <div className="base-card agent-column" data-agent={agentKey} style={{ opacity: 0.7 }}>
          <h4 className="agent-title" style={{color: '#555'}}>{title}</h4>
          <div className="skeleton-line" style={{width: '60%', height: '24px', marginBottom: '1.5rem'}}></div>
          <div className="skeleton-line" style={{width: '100%'}}></div>
          <div className="skeleton-line" style={{width: '90%'}}></div>
          <div className="skeleton-line" style={{width: '95%'}}></div>
        </div>
      );
    }

    // Collect all unique source IDs from this agent's reasons
    const allSourceIds = [...new Set(
      (data.reasons || []).flatMap(r => r.sources || [])
    )];

    return (
      <div className="base-card agent-column agent-arrive-anim" data-agent={agentKey}>
        <h4 className="agent-title">{title}</h4>
        <div className="agent-verdict-row">
          <span className="verdict-chip">{data.verdict}</span>
          <span className="agent-conf-text">{data.confidence}% CONFIDENCE</span>
        </div>
        
        {/* Attributed Reasons */}
        <div className="agent-bullet-list">
          {(data.reasons || []).map((reason, i) => {
            const reasonObj = typeof reason === 'string' 
              ? { text: reason, sources: [], weight: 'MEDIUM' } 
              : reason;
            const isExpanded = expandedReasons[i];

            return (
              <div key={i} className="reason-card">
                <div className="reason-header" onClick={() => toggleReason(i)}>
                  <span className="weight-badge" data-weight={(reasonObj.weight || 'MEDIUM').toUpperCase()}>
                    {reasonObj.weight || 'MEDIUM'}
                  </span>
                  <span className="reason-text">{reasonObj.text}</span>
                  {reasonObj.sources && reasonObj.sources.length > 0 && (
                    <span className="expand-icon">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  )}
                </div>

                {/* Source Attribution Pills */}
                {reasonObj.sources && reasonObj.sources.length > 0 && (
                  <div className="reason-sources-inline">
                    {reasonObj.sources.map((srcId, j) => {
                      const article = getArticle(srcId);
                      return (
                        <span key={j} className="source-pill-inline">
                          [{srcId}] {article ? article.publisher : 'Source'}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Expanded Source Detail */}
                {isExpanded && reasonObj.sources && reasonObj.sources.length > 0 && (
                  <div className="reason-expansion">
                    {reasonObj.sources.map((srcId, j) => {
                      const article = getArticle(srcId);
                      if (!article) return (
                        <div key={j} className="source-detail-card">
                          <span className="source-id-tag">[{srcId}]</span>
                          <span className="source-detail-text">Source data unavailable</span>
                        </div>
                      );
                      return (
                        <div key={j} className="source-detail-card">
                          <div className="source-detail-header">
                            <span className="source-id-tag">[{article.id}]</span>
                            <span className="source-publisher">{article.publisher}</span>
                            {article.url && (
                              <a href={article.url} target="_blank" rel="noopener noreferrer" className="source-link-icon">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <div className="source-detail-title">{article.title}</div>
                          {article.summary && (
                            <div className="source-detail-summary">{article.summary}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* All Sources Toggle */}
        {allSourceIds.length > 0 && (
          <div className="explainability-footer">
            <button className="explainability-toggle" onClick={() => setShowAllSources(!showAllSources)}>
              {showAllSources ? 'HIDE' : 'VIEW'} ALL SOURCES ({allSourceIds.length})
              {showAllSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showAllSources && (
              <div className="source-panel">
                {allSourceIds.map((srcId, i) => {
                  const article = getArticle(srcId);
                  if (!article) return null;
                  return (
                    <div key={i} className="source-panel-item">
                      <span className="source-id-tag">[{article.id}]</span>
                      <div className="source-panel-info">
                        <span className="source-panel-title">{article.title}</span>
                        <span className="source-panel-publisher">{article.publisher}</span>
                      </div>
                      {article.url && (
                        <a href={article.url} target="_blank" rel="noopener noreferrer" className="source-link-icon">
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Conflict Visualization Helpers
  const getConflictColor = (score) => {
    if (!score) return '#ffffff';
    const s = score.toUpperCase();
    if (s === 'HIGH') return '#ef4444'; // Red
    if (s === 'MEDIUM') return '#f59e0b'; // Amber
    if (s === 'LOW') return '#10b981'; // Green
    return '#ffffff';
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
        
        {/* Error Banner */}
        {errorState && (
          <div className="anim-stagger-1" style={{backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '1rem 1.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem'}}>
            <AlertCircle size={18} />
            {errorState}
          </div>
        )}

        {/* Input bar */}
        <div className="zone-1-wrapper" style={{marginBottom: '0.5rem'}}>
          <div className="input-field-container" style={{display: 'flex', gap: '1rem', padding: '0.625rem 1.25rem', alignItems: 'center'}}>
            <input 
              type="text" 
              className="hero-input"
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ENTER TICKER SYMBOL..."
              style={{flex: 1}}
              autoFocus
            />
            <select 
              className="hero-input"
              style={{ 
                width: 'auto', flexShrink: 0, background: 'transparent', border: 'none',
                borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '1rem',
                color: '#aaa', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em'
              }}
              value={persona}
              onChange={e => setPersona(e.target.value)}
            >
              <option style={{background: '#0a0a0a', color: '#fff'}} value="balanced">BALANCED TRADER</option>
              <option style={{background: '#0a0a0a', color: '#ef4444'}} value="aggressive">AGGRESSIVE TRADER</option>
              <option style={{background: '#0a0a0a', color: '#10b981'}} value="conservative">CONSERVATIVE TRADER</option>
            </select>
          </div>
          <button className="btn-primary" onClick={handleAnalyze} disabled={loading || !tickerInput.trim()} style={{padding: '0.875rem 2.5rem', fontSize: '1rem'}}>
            {loading ? 'ANALYZING...' : 'ANALYZE'}
          </button>
        </div>

        <div className="audit-grid anim-stagger-2">
          <div className="base-card audit-card">
            <span className="audit-value">
              {[results.bull, results.bear, results.risk].filter(Boolean).length} / 3
            </span>
            <span className="audit-label">Agents Complete</span>
          </div>
          <div className="base-card audit-card">
            <span className="audit-value">
              {results.mediator ? `${results.mediator.confidence}%` : '---'}
            </span>
            <span className="audit-label">Consensus Conf</span>
          </div>
          <div className="base-card audit-card">
            <span className="audit-value" style={{color: getConflictColor(results.mediator?.conflict_score)}}>
              {results.mediator ? results.mediator.conflict_score : '---'}
            </span>
            <span className="audit-label">Conflict Level</span>
          </div>
          <div className="base-card audit-card">
            <span className="audit-value">{sourceArticles.length > 0 ? sourceArticles.length : '---'}</span>
            <span className="audit-label">Sources Scraped</span>
          </div>
        </div>

        <div className="agents-grid">
          <AgentColumn title="BULL AGENT" agentKey="bull" />
          <AgentColumn title="BEAR AGENT" agentKey="bear" />
          <AgentColumn title="RISK AGENT" agentKey="risk" />
        </div>

        {results.mediator ? (
          <div>
            <div className="base-card decision-wrap agent-arrive-anim">
              <div className="decision-header">
                <div className="decision-title">
                  {tickerInput.toUpperCase()} <span>→ {results.mediator.decision}</span>
                </div>
                <div className="conflict-badge" style={{borderColor: getConflictColor(results.mediator.conflict_score), color: getConflictColor(results.mediator.conflict_score)}}>
                  {results.mediator.conflict_score} CONFLICT
                </div>
              </div>
              <p className="decision-rationale">{results.mediator.rationale}</p>
              <div className="decision-trigger">
                <strong>ACTION TRIGGER:</strong> {results.mediator.trigger}
              </div>
              <div className="meta-chip-row">
                <span className="meta-pill">{results.mediator.confidence}% CONFIDENCE</span>
                <span className="meta-pill">RESOLVED</span>
                <span className="meta-pill">{sourceArticles.length} SOURCES ANALYZED</span>
              </div>
            </div>

            {/* Interactive User Response Field */}
            <div className="base-card agent-arrive-anim" style={{ marginTop: '2.5rem', padding: '2rem' }}>
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
          <div className="base-card decision-wrap anim-stagger-1" style={{ opacity: 0.5, padding: '3rem 2.5rem' }}>
            <div className="skeleton-line" style={{width: '40%', height: '32px', marginBottom: '2rem'}}></div>
            <div className="skeleton-line" style={{width: '100%', marginBottom: '1rem'}}></div>
            <div className="skeleton-line" style={{width: '80%', marginBottom: '2rem'}}></div>
            <div className="skeleton-line" style={{width: '95%', height: '50px'}}></div>
          </div>
        )}
      </div>
    </>
  );
}
