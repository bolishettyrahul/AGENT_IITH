function ReasoningTrail({ agent, name }) {
  if (!agent) return null

  const confidenceReason =
    agent.confidence > 0.8
      ? 'High confidence: Multiple strong signals aligned'
      : agent.confidence > 0.6
        ? 'Moderate confidence: Mixed signals with some support'
        : 'Lower confidence: Limited supportive evidence'

  const scoreInterpretation =
    agent.score > 7.5
      ? 'Strong conviction'
      : agent.score > 5.5
        ? 'Moderate position'
        : 'Cautious stance'

  return (
    <div className="reasoning-trail">
      <div className="trail-step">
        <p className="step-label">Evidence Chain</p>
        <ul className="evidence-list">
          {agent.key_points.map((point, i) => (
            <li key={point} className="evidence-item">
              <span className="evidence-index">{i + 1}</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="trail-step">
        <p className="step-label">Reasoning Logic</p>
        <p className="trail-reasoning">{agent.reasoning}</p>
      </div>

      <div className="trail-metrics">
        <div className="metric">
          <p className="metric-label">Conviction</p>
          <p className="metric-value">{scoreInterpretation}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Signal Quality</p>
          <p className="metric-value">{confidenceReason}</p>
        </div>
      </div>
    </div>
  )
}

export default ReasoningTrail
