import { useAnalysis } from '../context/AnalysisContext'

function TickerInput() {
  const { query, setQuery, submitAnalysis, requestState } = useAnalysis()

  const examples = [
    'Zepto vs Blinkit in India',
    'Funding and news for Ola Electric',
    'Top 3 competitors of Razorpay',
  ]

  const handleSubmit = async (event) => {
    event.preventDefault()
    await submitAnalysis(query)
  }

  const handleExample = async (value) => {
    setQuery(value)
    await submitAnalysis(value)
  }

  return (
    <section className="query-section" aria-label="Market intelligence query section">
      <div className="query-container">
        <form onSubmit={handleSubmit} className="query-form">
          <label htmlFor="query-input" className="query-label">
            Enter Market Query
          </label>
          <textarea
            id="query-input"
            className="query-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask about a company, its competitors, funding, and recent news..."
            disabled={requestState === 'loading'}
            rows={4}
          />

          <button type="submit" className="primary-button" disabled={requestState === 'loading'}>
            {requestState === 'loading' ? 'Generating...' : 'Generate Intelligence'}
          </button>
        </form>

        <div className="example-chips" aria-label="Example queries">
          <p className="chips-title">Try examples</p>
          <div className="chips-wrap">
            {examples.map((example) => (
              <button
                key={example}
                className="chip"
                onClick={() => handleExample(example)}
                type="button"
                disabled={requestState === 'loading'}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default TickerInput
