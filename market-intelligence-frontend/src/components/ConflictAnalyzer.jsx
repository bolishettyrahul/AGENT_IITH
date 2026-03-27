function ConflictAnalyzer({ agents }) {
  if (!agents) return null

  const bullScore = agents.bull.score
  const bearScore = agents.bear.score
  const riskScore = agents.risk.score

  const scoreDiff = Math.abs(bullScore - bearScore)
  const bullLead = bullScore > bearScore

  const conflictLevel =
    scoreDiff < 1.5 ? 'HIGH' : scoreDiff < 3 ? 'MODERATE' : 'LOW'
  const conflictSeverity =
    scoreDiff < 1.5
      ? 'Agents heavily debate direction'
      : scoreDiff < 3
        ? 'Substantial disagreement between perspectives'
        : 'Strong consensus with limited dissent'

  return (
    <section className="conflict-card" aria-label="Agent conflict analysis">
      <div className="conflict-header">
        <p className="label">Agent Reasoning Conflict</p>
        <span className={`conflict-badge conflict-${conflictLevel.toLowerCase()}`}>
          {conflictLevel}
        </span>
      </div>

      <p className="conflict-summary">{conflictSeverity}</p>

      <div className="conflict-grid">
        <div className="conflict-pair">
          <div className="pair-label">
            Bull vs Bear
            <br />
            <span className="pair-score">
              {bullScore.toFixed(1)} vs {bearScore.toFixed(1)}
            </span>
          </div>
          <div className="conflict-bar">
            <div className="bull-side" style={{ width: `${(bullScore / 10) * 100}%` }} />
            <div className="bear-side" style={{ width: `${(bearScore / 10) * 100}%` }} />
          </div>
          <p className="conflict-note">
            {bullLead ? 'Bull has edge' : 'Bear has edge'} by {scoreDiff.toFixed(1)} pts
          </p>
        </div>

        <div className="conflict-pair">
          <div className="pair-label">
            Risk Caution Level
            <br />
            <span className="pair-score">{riskScore.toFixed(1)} / 10</span>
          </div>
          <div className="risk-meter">
            <div className="risk-fill" style={{ width: `${(riskScore / 10) * 100}%` }} />
          </div>
          <p className="conflict-note">
            {riskScore > 6 ? 'Significant downside concern' : 'Manageable risk profile'}
          </p>
        </div>
      </div>
    </section>
  )
}

export default ConflictAnalyzer
