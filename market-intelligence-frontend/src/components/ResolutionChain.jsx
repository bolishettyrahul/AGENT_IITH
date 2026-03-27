function ResolutionChain({ mediator, agents }) {
  if (!mediator || !agents) return null

  const bullScore = agents.bull.score
  const bearScore = agents.bear.score
  const riskScore = agents.risk.score

  // Calculate weighted influence
  const totalScore = bullScore + bearScore + (10 - riskScore)
  const bullInfluence = ((bullScore / totalScore) * 100).toFixed(0)
  const bearInfluence = ((bearScore / totalScore) * 100).toFixed(0)
  const riskInfluence = (((10 - riskScore) / totalScore) * 100).toFixed(0)

  const decisionLogic = `
    Bull perspective (${bullInfluence}% weight): Pushes toward BUY → ${mediator.final_recommendation}
    Bear perspective (${bearInfluence}% weight): Pushes toward SELL → ${mediator.final_recommendation}
    Risk assessment (${riskInfluence}% weight): Moderate concerns moderate upside
    Mediator synthesis: ${mediator.final_recommendation} balances all three
  `

  return (
    <section className="resolution-card" aria-label="Reasoning chain and decision logic">
      <div className="resolution-header">
        <p className="label">Autonomous Decision Chain</p>
      </div>

      <div className="resolution-flow">
        <div className="flow-stage">
          <div className="flow-icon">1</div>
          <div>
            <p className="flow-title">Agent Analysis</p>
            <p className="flow-desc">
              Bull, Bear, and Risk agents independently evaluate market signals in parallel
            </p>
          </div>
        </div>

        <div className="flow-connector" />

        <div className="flow-stage">
          <div className="flow-icon">2</div>
          <div>
            <p className="flow-title">Conflict Detection</p>
            <p className="flow-desc">
              System identifies disagreement: Bull {bullScore > bearScore ? 'leads' : 'trails'} Bear by{' '}
              {Math.abs(bullScore - bearScore).toFixed(1)} points
            </p>
          </div>
        </div>

        <div className="flow-connector" />

        <div className="flow-stage">
          <div className="flow-icon">3</div>
          <div>
            <p className="flow-title">Weighting & Synthesis</p>
            <p className="flow-desc">
              Mediator weighs: Bull {bullInfluence}% • Bear {bearInfluence}% • Risk {riskInfluence}%
            </p>
          </div>
        </div>

        <div className="flow-connector" />

        <div className="flow-stage final">
          <div className="flow-icon checkmark">✓</div>
          <div>
            <p className="flow-title">Final Recommendation</p>
            <p className="flow-desc">{mediator.final_recommendation}</p>
          </div>
        </div>
      </div>

      <div className="weighting-breakdown">
        <p className="label">Influence Breakdown</p>
        <div className="weights-grid">
          <div className="weight-item">
            <div className="weight-bar bull-accent">
              <div style={{ width: `${bullInfluence}%` }} />
            </div>
            <p>Bull: {bullInfluence}%</p>
          </div>
          <div className="weight-item">
            <div className="weight-bar bear-accent">
              <div style={{ width: `${bearInfluence}%` }} />
            </div>
            <p>Bear: {bearInfluence}%</p>
          </div>
          <div className="weight-item">
            <div className="weight-bar risk-accent">
              <div style={{ width: `${riskInfluence}%` }} />
            </div>
            <p>Risk: {riskInfluence}%</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ResolutionChain
