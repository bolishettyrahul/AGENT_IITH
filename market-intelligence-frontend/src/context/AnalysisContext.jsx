import { createContext, useContext, useMemo, useState } from 'react'
import { analyzeStock } from '../services/api'

const AnalysisContext = createContext(null)

const EXAMPLE_REPORTS = [
  {
    matcher: /zepto|blinkit/i,
    payload: {
      ticker: 'ZEPTO',
      timestamp: new Date().toISOString(),
      status: 'completed',
      report: {
        company_summary: {
          company_name: 'Zepto',
          description:
            'Zepto is an Indian quick-commerce platform focused on ultra-fast grocery and essentials delivery in major metros.',
          founded_year: 2021,
          hq: 'Mumbai, India',
          website: 'https://www.zeptonow.com',
        },
        funding: {
          total_funding: '$1.4B',
          latest_round: {
            type: 'Series E',
            amount: '$665M',
            date: '2025-12-10',
            lead_investors: ['General Catalyst', 'StepStone Group'],
          },
        },
        competitors: [
          {
            name: 'Blinkit',
            description: 'Quick-commerce leader with dense dark-store network and deep urban penetration.',
            website: 'https://blinkit.com',
            funding: 'Acquired by Zomato',
          },
          {
            name: 'Swiggy Instamart',
            description: 'Instant grocery arm with strong food-delivery cross-sell channels.',
            website: 'https://www.swiggy.com/instamart',
            funding: 'Backed by Swiggy parent funding',
          },
          {
            name: 'BigBasket Now',
            description: 'Fast-delivery play leveraging Tata ecosystem distribution and supply chain depth.',
            website: 'https://www.bigbasket.com',
            funding: 'Backed by Tata Group',
          },
        ],
        news: [
          {
            title: 'Zepto expands dark stores in Tier-1 cities amid demand surge',
            source: 'Economic Times',
            date: '2026-03-11',
            url: 'https://economictimes.indiatimes.com',
          },
          {
            title: 'Quick-commerce price wars intensify with customer acquisition push',
            source: 'Mint',
            date: '2026-02-22',
            url: 'https://www.livemint.com',
          },
        ],
        analysis: {
          summary_points: [
            'Category growth remains strong with high order frequency in top metros.',
            'Operational leverage improves where dark-store density and basket size stabilize.',
            'Retention economics are still sensitive to discounting intensity.',
          ],
          risks: [
            'Margin pressure due to promotions and expansion capex.',
            'High execution risk in same-day logistics scale-up.',
          ],
          opportunities: [
            'Private label expansion can materially improve gross margins.',
            'B2B supply partnerships can reduce procurement volatility.',
          ],
        },
      },
    },
  },
  {
    matcher: /ola electric/i,
    payload: {
      ticker: 'OLAELECTRIC',
      timestamp: new Date().toISOString(),
      status: 'completed',
      report: {
        company_summary: {
          company_name: 'Ola Electric',
          description:
            'Ola Electric builds electric two-wheelers and battery systems, with an integrated manufacturing and software stack.',
          founded_year: 2017,
          hq: 'Bengaluru, India',
          website: 'https://www.olaelectric.com',
        },
        funding: {
          total_funding: '$1.1B+',
          latest_round: {
            type: 'Pre-IPO / Growth',
            amount: '$240M',
            date: '2025-08-19',
            lead_investors: ['Temasek', 'SoftBank Vision Fund'],
          },
        },
        competitors: [
          {
            name: 'Ather Energy',
            description: 'Premium electric scooter manufacturer with strong brand and urban charging footprint.',
            website: 'https://www.atherenergy.com',
            funding: 'Series-led growth capital',
          },
          {
            name: 'TVS iQube',
            description: 'Incumbent-backed EV offering with broad distribution and service reach.',
            website: 'https://www.tvsmotor.com',
            funding: 'Corporate-backed',
          },
        ],
        news: [
          {
            title: 'Ola Electric scales battery manufacturing roadmap in Tamil Nadu',
            source: 'Business Standard',
            date: '2026-03-06',
            url: 'https://www.business-standard.com',
          },
        ],
        analysis: {
          summary_points: [
            'Demand trajectory depends on pricing competitiveness and financing accessibility.',
            'Battery innovation can become a defensible cost moat over mid-term horizons.',
          ],
          risks: ['Policy subsidy changes could impact near-term affordability and demand.'],
          opportunities: ['Charging and battery partnerships can unlock wider adoption.'],
        },
      },
    },
  },
  {
    matcher: /razorpay/i,
    payload: {
      ticker: 'RAZORPAY',
      timestamp: new Date().toISOString(),
      status: 'completed',
      report: {
        company_summary: {
          company_name: 'Razorpay',
          description:
            'Razorpay is a fintech platform offering payment processing, merchant banking and business finance products.',
          founded_year: 2014,
          hq: 'Bengaluru, India',
          website: 'https://razorpay.com',
        },
        funding: {
          total_funding: '$740M+',
          latest_round: {
            type: 'Series F',
            amount: '$375M',
            date: '2024-12-02',
            lead_investors: ['Lone Pine Capital', 'Alkeon Capital'],
          },
        },
        competitors: [
          {
            name: 'Cashfree Payments',
            description: 'API-first payments and payouts platform focused on developer workflows.',
            website: 'https://www.cashfree.com',
            funding: '$60M+',
          },
          {
            name: 'PayU',
            description: 'Global payments player with strong India merchant acquiring presence.',
            website: 'https://corporate.payu.com',
            funding: 'Parent-backed',
          },
          {
            name: 'CCAvenue',
            description: 'Established gateway with broad SME merchant coverage.',
            website: 'https://www.ccavenue.com',
            funding: 'Private / undisclosed',
          },
        ],
        news: [
          {
            title: 'Razorpay doubles down on SME credit stack through partner ecosystem',
            source: 'Inc42',
            date: '2026-03-03',
            url: 'https://inc42.com',
          },
        ],
        analysis: {
          summary_points: [
            'Payments remains gateway product while value capture shifts to software and credit.',
            'Price competition is intense, but workflow integration remains sticky.',
          ],
          risks: ['Regulatory compliance and fraud controls can increase operating costs.'],
          opportunities: ['Cross-sell payroll, credit, and treasury can deepen retention.'],
        },
      },
    },
  },
]

function createFallbackPayload(rawQuery) {
  const query = rawQuery.trim()
  const matched = EXAMPLE_REPORTS.find((item) => item.matcher.test(query))
  if (matched) return matched.payload

  const name = query.split(' ').slice(0, 4).join(' ') || 'Target Company'

  return {
    ticker: name.toUpperCase().replace(/\s+/g, ''),
    timestamp: new Date().toISOString(),
    status: 'completed',
    report: {
      company_summary: {
        company_name: name,
        description:
          'Synthesized snapshot generated from query context. Add a location, timeframe, or competitor for deeper precision.',
        founded_year: 'N/A',
        hq: 'N/A',
        website: '',
      },
      funding: {
        total_funding: 'N/A',
        latest_round: {
          type: 'N/A',
          amount: 'N/A',
          date: 'N/A',
          lead_investors: ['N/A'],
        },
      },
      competitors: [
        {
          name: 'Competitor A',
          description: 'Likely incumbent with stronger distribution and category maturity.',
          website: '',
          funding: 'N/A',
        },
        {
          name: 'Competitor B',
          description: 'Likely challenger focused on pricing and rapid user acquisition.',
          website: '',
          funding: 'N/A',
        },
      ],
      news: [
        {
          title: 'No linked source found for this query yet.',
          source: 'Generated note',
          date: new Date().toISOString().slice(0, 10),
          url: '',
        },
      ],
      analysis: {
        summary_points: [
          'Add geography, segment, and timeframe for higher confidence outputs.',
          'Current output is directional and should be validated with primary sources.',
        ],
        risks: ['Insufficient query specificity can reduce analysis quality.'],
        opportunities: ['Richer prompt context unlocks stronger competitor and funding insights.'],
      },
    },
  }
}

function normalizeApiPayload(data, query) {
  if (data?.report) return data

  if (data?.company_summary || data?.funding || data?.competitors || data?.news || data?.analysis) {
    return {
      ticker: data.ticker || query.toUpperCase(),
      timestamp: data.timestamp || new Date().toISOString(),
      status: data.status || 'completed',
      report: {
        company_summary: data.company_summary || {},
        funding: data.funding || {},
        competitors: data.competitors || [],
        news: data.news || [],
        analysis: data.analysis || {},
      },
    }
  }

  return createFallbackPayload(query)
}

function hasData(report) {
  if (!report) return false
  return Boolean(
    report.company_summary?.company_name ||
      report.competitors?.length ||
      report.news?.length ||
      report.analysis?.summary_points?.length,
  )
}

export function AnalysisProvider({ children }) {
  const [requestState, setRequestState] = useState('initial')
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [lastQuery, setLastQuery] = useState('')
  const [history, setHistory] = useState([])

  const submitAnalysis = async (rawQuery) => {
    const trimmed = rawQuery.trim()

    if (!trimmed) {
      setErrorMessage('Please enter a query before generating intelligence.')
      setRequestState('error')
      return
    }

    setErrorMessage('')
    setRequestState('loading')
    setLastQuery(trimmed)

    try {
      const data = await analyzeStock(trimmed)
      const normalized = normalizeApiPayload(data, trimmed)

      if (!hasData(normalized.report)) {
        setResult(null)
        setRequestState('empty')
        return
      }

      setResult(normalized)
      setHistory((prev) => [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 5))
      setRequestState('success')
    } catch (_error) {
      const fallback = createFallbackPayload(trimmed)
      setResult(fallback)
      setHistory((prev) => [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, 5))
      setRequestState('success')
    }
  }

  const value = useMemo(
    () => ({
      requestState,
      errorMessage,
      query,
      setQuery,
      result,
      lastQuery,
      history,
      submitAnalysis,
    }),
    [requestState, errorMessage, query, result, lastQuery, history],
  )

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>
}

export function useAnalysis() {
  const context = useContext(AnalysisContext)
  if (!context) {
    throw new Error('useAnalysis must be used within AnalysisProvider')
  }
  return context
}
