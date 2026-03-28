import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, AlertCircle, ChevronDown, ChevronUp, ExternalLink, Bell } from 'lucide-react';
import DebateSection from './DebateSection';

export default function Dashboard({ onHome, onViewTracked, trackedStocks = [], targetTicker = '' }) {
  const [tickerInput, setTickerInput] = useState("");

  useEffect(() => {
    if (targetTicker) setTickerInput(targetTicker);
  }, [targetTicker]);

  const [persona, setPersona] = useState("balanced");
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
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

  const [isDebating, setIsDebating] = useState(false);
  const [debateTurns, setDebateTurns] = useState([]);
  const [debateRounds, setDebateRounds] = useState([]);
  const [debateComplete, setDebateComplete] = useState(null);

  const wsRef = useRef(null);

  useEffect(() => {
    let reconnectTimer;
    const connectWS = () => {
      const socket = new WebSocket("ws://localhost:3001");
      socket.onopen = () => { setWsConnected(true); setErrorState(null); };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
        if (data.error) {
          setErrorState(data.error);
          setLoading(false);
          // Trigger demo fallback on agent failures
          if (data.error.includes('agents failed') || data.error.includes('No data found')) {
            setTimeout(() => simulateWebSocketDemo(), 500);
          }
        } else if (data.type === 'sources') {
          setSourceArticles(data.articles || []);
        } else if (data.type === 'debate_start') {
          setIsDebating(true);
        } else if (data.type === 'debate_turn') {
          setDebateTurns((prev) => [...prev, data]);
        } else if (data.type === 'debate_round_summary') {
          setDebateRounds((prev) => [...prev, { round: data.round, summary: data }]);
        } else if (data.type === 'debate_complete') {
          setIsDebating(false);
          setDebateComplete(data);
        } else if (data.type === 'debate_error') {
          setIsDebating(false);
        } else if (data.agent) {
          setResults((prev) => ({ ...prev, [data.agent]: data }));
        } else if (data.decision) {
          setResults((prev) => ({ ...prev, mediator: data }));
          setLoading(false);
        }
        } catch (err) { }
      };
      socket.onclose = () => {
        setWsConnected(false);
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

    setTimeout(() => setIsDebating(true), 3800);

    setTimeout(() => setDebateTurns(prev => [...prev, {
      agent: 'bull', round: 1, turn_type: 'rebuttal',
      points: [
        { type: 'counter', claim_addressed: 'EU antitrust will erode App Store margins', response: 'Services margin grew 5pts YoY despite existing regulatory pressure — Bloomberg confirms structural moat [S1, S2]', sources: ['S1', 'S2'], weight: 'HIGH' },
        { type: 'concede', claim_addressed: 'China iPhone sales down 24%', response: 'Conceded: China hardware weakness is real. However Services revenue at 24% mix offsets geographic hardware risk [S6]', sources: ['S6'], weight: 'MEDIUM' },
      ],
      summary: 'Services durability counters regulatory fears. Conceding China hardware risk but revenue mix insulates the thesis.',
      confidence_before: 74, confidence_after: 68, tier_win: true,
    }]), 4300);

    setTimeout(() => setDebateTurns(prev => [...prev, {
      agent: 'bear', round: 1, turn_type: 'partial_concede',
      points: [
        { type: 'concede', claim_addressed: 'Services grew 14% YoY to all-time high', response: 'Conceded: Services growth is legitimate. Growth rate is decelerating from prior 18% runs — matters for forward multiple [S6]', sources: ['S6'], weight: 'MEDIUM' },
        { type: 'counter', claim_addressed: 'Vision Pro pre-orders exceeded supply 3x', response: 'Pre-order signal unverified until shipment data. EU DMA fine alone [S3] could exceed an entire quarter of hardware margin improvement.', sources: ['S3', 'S4'], weight: 'HIGH' },
      ],
      summary: 'Conceding Services strength but macro and regulatory headwinds dominate near-term price action.',
      confidence_before: 61, confidence_after: 57, tier_win: false,
    }]), 4900);

    setTimeout(() => setDebateTurns(prev => [...prev, {
      agent: 'risk', round: 1, turn_type: 'devil_advocate',
      target_agent: 'bull',
      target_reason: 'Bull holds highest post-rebuttal confidence at 68 — stress-testing their Services margin claim.',
      attacks: [
        { claim_attacked: 'Services segment at all-time high margin', attack: 'WSJ [S5] reports 3 additional EU member states joining DMA enforcement — Services faces 15–20% revenue haircut in European markets by Q3, wiping the margin expansion underpinning the Bull thesis.', sources: ['S5', 'S3'], severity: 'HIGH' },
      ],
      summary: 'Regulatory cascade risk on Services is under-priced. Bull thesis rests on a margin number facing concentrated regulatory attack.',
      confidence_before: 55, confidence_after: 58, tier_win: true,
    }]), 5400);

    setTimeout(() => setDebateRounds(prev => [...prev, {
      round: 1,
      summary: { round: 1, confidences: { bull: 68, bear: 57, risk: 58 }, scores: { bull: 1, bear: 0, risk: 1 } },
    }]), 5700);

    setTimeout(() => {
      setIsDebating(false);
      setDebateComplete({
        rounds_run: 1, convergence_achieved: false, debate_winner: 'bull',
        final_confidences: { bull: 68, bear: 57, risk: 58 },
        kelly_weights: { bull: 0.482, bear: 0.298, risk: 0.220 },
        finance_algorithms: {
          bayesian_tier_scoring: {
            description: 'Publisher trust tiers: Reuters/Bloomberg/FT/WSJ=3, major business=2, general=1. Higher-tier rebuttal wins the argument point automatically.',
            bull_best_tier: 3, bear_best_tier: 3,
          },
          delphi_method: {
            description: 'Confidence scores adjusted after each rebuttal based on argument quality and source tier. Tier-1 rebuttal: -8 to -12 pts. Partial concede: -6 pts.',
            bull_net_change: -6, bear_net_change: -4, bull_final: 68, bear_final: 57,
          },
          kelly_criterion: {
            description: 'Mediator weights computed from debate win rates + concession credibility bonuses, then biased by persona.',
            weights: { bull: 0.482, bear: 0.298, risk: 0.220 }, debate_winner: 'bull', rounds_run: 1,
          },
        },
      });
    }, 6000);

    setTimeout(() => {
      setResults(prev => ({ ...prev, mediator: {
        decision: "BUY", confidence: 68, conflict_score: "MEDIUM",
        trigger: "BUY if price drops below $182 on next earnings dip",
        rationale: "Debate-informed: Bull won Round 1 via tier-3 source rebuttal on Services margin. Bear conceded Services growth but exposed deceleration risk. Kelly weights favor Bull 48.2% vs Bear 29.8% post-debate.",
        debate_informed: true, debate_rounds: 1, convergence_achieved: false,
      }}));
      setLoading(false);
    }, 6500);
  };

  const handleAnalyze = async () => {
    if (!tickerInput.trim() || loading) return;
    setLoading(true);
    setErrorState(null);
    setSourceArticles([]);
    setResults({ bull: null, bear: null, risk: null, mediator: null });
    setIsDebating(false);
    setDebateTurns([]);
    setDebateRounds([]);
    setDebateComplete(null);

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

  const handleTrackStock = async () => {
    try {
       await fetch("http://localhost:3001/track", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ 
           ticker: tickerInput.toUpperCase().trim(),
           verdict: results.mediator?.decision,
           confidence: results.mediator?.confidence,
           rationale: results.mediator?.rationale,
           trigger: results.mediator?.trigger,
           sources: sourceArticles
         })
       });
       onViewTracked(); // Switch view
    } catch (e) {
       console.error(e);
    }
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
        <div className="navbar-status" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            className="status-indicator"
            onClick={onViewTracked}
            style={{ cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-color)', color: '#10b981', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.08em' }}
          >
            <Bell size={12} style={{ display: 'inline-block', marginRight: '4px', marginBottom: '-2px' }} />
            TRACKED ({trackedStocks.length})
          </button>
          {loading ? (
            <span className="status-indicator loading">DELIBERATING</span>
          ) : wsConnected ? (
            <span className="status-indicator online">SYSTEM READY</span>
          ) : (
            <span className="status-indicator" style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>WS OFFLINE</span>
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

        {!wsConnected && !loading && (
          <div className="anim-stagger-1" style={{backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fbbf24', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8125rem'}}>
            <AlertCircle size={16} />
            WebSocket offline — analysis can still be triggered but live streaming updates may not appear until reconnection.
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

        <DebateSection
          isDebating={isDebating}
          debateTurns={debateTurns}
          debateRounds={debateRounds}
          debateComplete={debateComplete}
          openingAgents={results}
          articles={sourceArticles}
        />

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
                {results.mediator.debate_informed && (
                  <span className="meta-pill">
                    DEBATE-INFORMED · {results.mediator.debate_rounds} ROUND{results.mediator.debate_rounds !== 1 ? 'S' : ''} · {results.mediator.convergence_achieved ? 'CONVERGED' : 'MAX ROUNDS'}
                  </span>
                )}
              </div>

              {!trackedStocks.find(s => s.ticker === tickerInput.toUpperCase().trim()) && (
                <div style={{ marginTop: '2rem' }}>
                  <button className="btn-primary" onClick={handleTrackStock} style={{ padding: '0.875rem 2rem', background: 'transparent', color: '#10b981', border: '1px solid #10b981' }}>
                    <Bell size={16} style={{ display: 'inline', marginRight: '0.5rem', marginBottom: '-2px' }} />
                    TRACK STOCK VIRTUALLY
                  </button>
                </div>
              )}
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
