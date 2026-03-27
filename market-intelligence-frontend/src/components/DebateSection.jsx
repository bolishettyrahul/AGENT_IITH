import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const AGENT_COLORS = {
  bull: '#10b981',
  bear: '#ef4444',
  risk: '#f59e0b',
};

const TURN_TYPE_LABELS = {
  rebuttal: 'REBUTTAL',
  partial_concede: 'PARTIAL CONCEDE',
  full_concede: 'FULL CONCEDE',
  devil_advocate: 'DEVIL\'S ADVOCATE',
};

function ConfidenceDelta({ before, after }) {
  const delta = after - before;
  if (delta === 0 || before == null || after == null) return null;
  const color = delta > 0 ? '#10b981' : '#ef4444';
  const arrow = delta > 0 ? '↑' : '↓';
  return (
    <span className="conf-delta">
      {before} <span style={{ color, fontWeight: 800 }}>{arrow} {after}</span>
      <span style={{ color, fontSize: '0.7rem', marginLeft: '0.25rem' }}>({delta > 0 ? '+' : ''}{delta})</span>
    </span>
  );
}

function DebateTurnCard({ turn, articles }) {
  const [expanded, setExpanded] = useState(false);
  const agentColor = AGENT_COLORS[turn.agent] || '#fff';
  const items = turn.points || turn.attacks || [];
  const label = TURN_TYPE_LABELS[turn.turn_type] || turn.turn_type?.toUpperCase();

  const getArticle = (srcId) => (articles || []).find((a) => a.id === srcId);

  return (
    <div className="debate-turn-card" style={{ borderLeftColor: agentColor }}>
      <div className="debate-turn-header">
        <div className="debate-turn-meta">
          <span className="debate-agent-avatar" style={{ background: agentColor }}>
            {turn.agent[0].toUpperCase()}
          </span>
          <span className="debate-agent-name" style={{ color: agentColor }}>
            {turn.agent.toUpperCase()} AGENT
          </span>
          <span className="debate-turn-badge" data-type={turn.turn_type}>
            {label}
          </span>
          {turn.target_agent && (
            <span className="debate-target-tag">
              → targeting {turn.target_agent.toUpperCase()}
            </span>
          )}
        </div>
        <div className="debate-conf-section">
          <ConfidenceDelta before={turn.confidence_before} after={turn.confidence_after} />
          {turn.tier_win && (
            <span className="tier-win-badge">TIER WIN</span>
          )}
        </div>
      </div>

      <p className="debate-turn-summary">{turn.summary}</p>

      {turn.target_reason && (
        <p className="debate-target-reason">{turn.target_reason}</p>
      )}

      {items.length > 0 && (
        <button className="debate-expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'HIDE' : 'SHOW'} {items.length} {turn.attacks ? 'ATTACK' : 'POINT'}{items.length !== 1 ? 'S' : ''}
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      )}

      {expanded && (
        <div className="debate-points-list">
          {items.map((item, i) => {
            const isAttack = !!item.attack;
            const text = isAttack ? item.attack : item.response;
            const claim = isAttack ? item.claim_attacked : item.claim_addressed;
            const severity = item.severity || item.weight || 'MEDIUM';
            const sources = item.sources || [];

            return (
              <div key={i} className={`debate-point-item ${item.type === 'concede' ? 'debate-point-concede' : ''}`}>
                <div className="debate-point-claim">
                  <span className="debate-point-label">
                    {item.type === 'concede' ? 'CONCEDE' : isAttack ? 'ATTACK' : 'COUNTER'}
                  </span>
                  <span className="debate-weight-badge" data-severity={severity}>{severity}</span>
                </div>
                {claim && <p className="debate-claim-text">"{claim}"</p>}
                <p className="debate-response-text">{text}</p>
                {sources.length > 0 && (
                  <div className="debate-source-chips">
                    {sources.map((srcId, j) => {
                      const art = getArticle(srcId);
                      return art ? (
                        <a key={j} href={art.url} target="_blank" rel="noopener noreferrer" className="debate-source-chip">
                          [{srcId}] {art.publisher} <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span key={j} className="debate-source-chip">[{srcId}]</span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArgumentStrengthBar({ scores }) {
  const total = (scores.bull || 0) + (scores.bear || 0) + (scores.risk || 0);
  if (total === 0) return null;
  const bullPct = ((scores.bull || 0) / total * 100).toFixed(0);
  const bearPct = ((scores.bear || 0) / total * 100).toFixed(0);
  const riskPct = ((scores.risk || 0) / total * 100).toFixed(0);

  return (
    <div className="arg-strength-section">
      <p className="arg-strength-label">ARGUMENT STRENGTH</p>
      <div className="arg-strength-bar">
        {scores.bull > 0 && (
          <div className="arg-bar-segment" style={{ width: `${bullPct}%`, background: AGENT_COLORS.bull }}>
            {bullPct > 10 ? `BULL ${bullPct}%` : ''}
          </div>
        )}
        {scores.bear > 0 && (
          <div className="arg-bar-segment" style={{ width: `${bearPct}%`, background: AGENT_COLORS.bear }}>
            {bearPct > 10 ? `BEAR ${bearPct}%` : ''}
          </div>
        )}
        {scores.risk > 0 && (
          <div className="arg-bar-segment" style={{ width: `${riskPct}%`, background: AGENT_COLORS.risk }}>
            {riskPct > 10 ? `RISK ${riskPct}%` : ''}
          </div>
        )}
      </div>
      <div className="arg-strength-legend">
        <span style={{ color: AGENT_COLORS.bull }}>● Bull {scores.bull || 0} wins</span>
        <span style={{ color: AGENT_COLORS.bear }}>● Bear {scores.bear || 0} wins</span>
        <span style={{ color: AGENT_COLORS.risk }}>● Risk {scores.risk || 0} hits</span>
      </div>
    </div>
  );
}

function SynthesisTab({ debateComplete }) {
  if (!debateComplete) {
    return (
      <div className="synthesis-placeholder">
        <div className="skeleton-line" style={{ width: '60%' }} />
        <div className="skeleton-line" style={{ width: '80%' }} />
        <div className="skeleton-line" style={{ width: '70%' }} />
      </div>
    );
  }

  const { finance_algorithms: fa, kelly_weights: kw, convergence_achieved, debate_winner, rounds_run } = debateComplete;

  return (
    <div className="synthesis-block">
      <div className="synthesis-row">
        <span className="algo-tag">Bayesian Source Scoring</span>
        <p className="synthesis-desc">{fa?.bayesian_tier_scoring?.description}</p>
        <div className="synthesis-detail">
          <span>Bull best tier: <strong>{fa?.bayesian_tier_scoring?.bull_best_tier}</strong></span>
          <span>Bear best tier: <strong>{fa?.bayesian_tier_scoring?.bear_best_tier}</strong></span>
        </div>
      </div>

      <div className="synthesis-row">
        <span className="algo-tag">Delphi Method</span>
        <p className="synthesis-desc">{fa?.delphi_method?.description}</p>
        <div className="synthesis-detail">
          <span>Bull confidence shift: <strong style={{ color: fa?.delphi_method?.bull_net_change >= 0 ? '#10b981' : '#ef4444' }}>
            {fa?.delphi_method?.bull_net_change >= 0 ? '+' : ''}{fa?.delphi_method?.bull_net_change} → {fa?.delphi_method?.bull_final}
          </strong></span>
          <span>Bear confidence shift: <strong style={{ color: fa?.delphi_method?.bear_net_change >= 0 ? '#10b981' : '#ef4444' }}>
            {fa?.delphi_method?.bear_net_change >= 0 ? '+' : ''}{fa?.delphi_method?.bear_net_change} → {fa?.delphi_method?.bear_final}
          </strong></span>
        </div>
      </div>

      <div className="synthesis-row">
        <span className="algo-tag">Kelly Criterion</span>
        <p className="synthesis-desc">{fa?.kelly_criterion?.description}</p>
        <div className="synthesis-detail">
          <span>Bull weight: <strong style={{ color: AGENT_COLORS.bull }}>{kw ? (kw.bull * 100).toFixed(1) : '—'}%</strong></span>
          <span>Bear weight: <strong style={{ color: AGENT_COLORS.bear }}>{kw ? (kw.bear * 100).toFixed(1) : '—'}%</strong></span>
          <span>Risk weight: <strong style={{ color: AGENT_COLORS.risk }}>{kw ? (kw.risk * 100).toFixed(1) : '—'}%</strong></span>
        </div>
      </div>

      <div className="synthesis-outcome">
        <div className="synthesis-outcome-item">
          <span className="synthesis-outcome-label">DEBATE WINNER</span>
          <span className="synthesis-outcome-value" style={{ color: AGENT_COLORS[debate_winner] || '#fff' }}>
            {debate_winner?.toUpperCase()}
          </span>
        </div>
        <div className="synthesis-outcome-item">
          <span className="synthesis-outcome-label">ROUNDS RUN</span>
          <span className="synthesis-outcome-value">{rounds_run}</span>
        </div>
        <div className="synthesis-outcome-item">
          <span className="synthesis-outcome-label">CONVERGENCE</span>
          <span className="synthesis-outcome-value" style={{ color: convergence_achieved ? '#10b981' : '#f59e0b' }}>
            {convergence_achieved ? 'ACHIEVED' : 'FORCED'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DebateSection({
  isDebating,
  debateTurns,
  debateRounds,
  debateComplete,
  openingAgents,
  articles,
}) {
  const [activeTab, setActiveTab] = useState('round_1');

  // Derive which rounds have turns
  const roundNumbers = useMemo(() => {
    const nums = new Set((debateTurns || []).map((t) => t.round));
    return [...nums].sort();
  }, [debateTurns]);

  const turnsForRound = (roundNum) =>
    (debateTurns || []).filter((t) => t.round === roundNum);

  const scoresForRound = (roundNum) => {
    const roundData = (debateRounds || []).find((r) => r.round === roundNum);
    return roundData?.summary?.scores || { bull: 0, bear: 0, risk: 0 };
  };

  // Auto-advance to latest round tab when new round data arrives
  const tabs = [
    { id: 'opening', label: 'OPENING POSITIONS', available: true },
    ...roundNumbers.map((n) => ({
      id: `round_${n}`,
      label: `ROUND ${n}`,
      available: true,
    })),
    { id: 'synthesis', label: 'SYNTHESIS', available: !!debateComplete },
  ];

  if (!isDebating && !debateTurns?.length && !debateComplete) return null;

  return (
    <div className="debate-section agent-arrive-anim">
      <div className="debate-header">
        <div className="debate-title-row">
          <span className="debate-title">THINKING BOX</span>
          {isDebating && <span className="debate-pulse-dot" />}
          {debateComplete && !isDebating && (
            <span className="debate-done-tag">
              {debateComplete.rounds_run} ROUND{debateComplete.rounds_run !== 1 ? 'S' : ''} •{' '}
              {debateComplete.convergence_achieved ? 'EARLY CONVERGENCE' : 'MAX ROUNDS'}
            </span>
          )}
        </div>
        <p className="debate-subtitle">
          Cross-examination debate between agents before mediator synthesis
        </p>
      </div>

      {/* Tab bar */}
      <div className="debate-tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`debate-tab ${activeTab === tab.id ? 'active' : ''} ${!tab.available ? 'disabled' : ''}`}
            onClick={() => tab.available && setActiveTab(tab.id)}
            disabled={!tab.available}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="debate-tab-content">

        {/* Opening positions tab */}
        {activeTab === 'opening' && (
          <div className="opening-positions-grid">
            {['bull', 'bear', 'risk'].map((agentKey) => {
              const agent = openingAgents?.[agentKey];
              if (!agent) return (
                <div key={agentKey} className="opening-card" style={{ borderTopColor: AGENT_COLORS[agentKey] }}>
                  <div className="skeleton-line" style={{ width: '60%' }} />
                  <div className="skeleton-line" style={{ width: '80%' }} />
                </div>
              );
              return (
                <div key={agentKey} className="opening-card" style={{ borderTopColor: AGENT_COLORS[agentKey] }}>
                  <div className="opening-card-header">
                    <span style={{ color: AGENT_COLORS[agentKey], fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                      {agentKey.toUpperCase()} AGENT
                    </span>
                    <span className="verdict-chip">{agent.verdict}</span>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '0.75rem 0' }}>
                    {agent.confidence}%
                  </div>
                  <ul className="opening-reasons">
                    {(agent.reasons || []).slice(0, 3).map((r, i) => (
                      <li key={i} className="opening-reason-item">
                        {typeof r === 'string' ? r : r.text}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* Round tabs */}
        {roundNumbers.map((n) => activeTab === `round_${n}` && (
          <div key={n} className="round-tab-content">
            <div className="debate-turns-list">
              {turnsForRound(n).length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <div className="skeleton-line" style={{ width: '70%', margin: '0 auto 1rem' }} />
                  <div className="skeleton-line" style={{ width: '50%', margin: '0 auto' }} />
                </div>
              ) : (
                turnsForRound(n).map((turn, i) => (
                  <DebateTurnCard key={i} turn={turn} articles={articles} />
                ))
              )}
            </div>
            <ArgumentStrengthBar scores={scoresForRound(n)} />
          </div>
        ))}

        {/* Synthesis tab */}
        {activeTab === 'synthesis' && (
          <SynthesisTab debateComplete={debateComplete} />
        )}
      </div>
    </div>
  );
}
