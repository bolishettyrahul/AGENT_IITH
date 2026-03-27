const axios = require('axios');
require('dotenv').config();

// Yahoo Finance unofficial JSON API — no scraping needed, no JS rendering issues.
// Returns clean structured data (titles, summaries, publisher, publish time).
const YF_SEARCH_URL = 'https://query2.finance.yahoo.com/v1/finance/search';
const YF_CHART_URL  = 'https://query1.finance.yahoo.com/v8/finance/chart';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'application/json',
};

/**
 * Fetch Yahoo Finance news + basic price context for a ticker.
 * Returns a plain-text block suitable for LLM consumption.
 */
async function scrapeYahooFinance(ticker) {
  const [newsRes, chartRes] = await Promise.all([
    // News headlines + summaries
    axios.get(YF_SEARCH_URL, {
      params: { q: ticker, newsCount: 15, enableFuzzyQuery: false, quotesCount: 0 },
      headers: YF_HEADERS,
      timeout: 15000,
    }),
    // Recent price context (last 5 days)
    axios.get(`${YF_CHART_URL}/${ticker}`, {
      params: { interval: '1d', range: '5d' },
      headers: YF_HEADERS,
      timeout: 15000,
    }),
  ]);

  const news = newsRes.data?.news ?? [];
  const meta = chartRes.data?.chart?.result?.[0]?.meta ?? {};

  // Build a readable text block for the LLM
  const lines = [];

  // Price context
  if (meta.regularMarketPrice) {
    lines.push(`=== ${ticker} Price Context ===`);
    lines.push(`Current Price: $${meta.regularMarketPrice}`);
    if (meta.regularMarketChangePercent !== undefined) {
      lines.push(`Change: ${meta.regularMarketChangePercent.toFixed(2)}% today`);
    }
    if (meta.fiftyTwoWeekHigh && meta.fiftyTwoWeekLow) {
      lines.push(`52-Week Range: $${meta.fiftyTwoWeekLow} – $${meta.fiftyTwoWeekHigh}`);
    }
    lines.push('');
  }

  // News headlines
  lines.push(`=== ${ticker} Recent News ===`);
  if (news.length === 0) {
    lines.push('No recent news found.');
  } else {
    for (const item of news) {
      lines.push(`• ${item.title}`);
      if (item.summary) lines.push(`  ${item.summary}`);
      if (item.publisher) lines.push(`  Source: ${item.publisher}`);
      lines.push('');
    }
  }

  const text = lines.join('\n');
  return text.slice(0, 8000);
}

module.exports = { scrapeYahooFinance };
