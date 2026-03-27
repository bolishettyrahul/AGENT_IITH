function LoadingState() {
  return (
    <section className="loading-card" aria-live="polite" aria-busy="true">
      <div className="spinner" />
      <div>
        <p className="state-title">Analyzing market data...</p>
        <p className="state-body">Gathering company profile, competitors, funding updates, and recent news.</p>
      </div>
    </section>
  )
}

export default LoadingState
