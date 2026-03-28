const axios = require('axios');
require('dotenv').config();

// Yahoo Finance unofficial JSON API — primary source, no Bright Data credits used.
const YF_SEARCH_URL = 'https://query2.finance.yahoo.com/v1/finance/search';
const YF_CHART_URL  = 'https://query1.finance.yahoo.com/v8/finance/chart';

const YF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'application/json',
};

// ─── Scraper Cache (3-min TTL) ──────────────────────────────────────────────
const scraperCache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

/**
 * Primary: Yahoo Finance JSON API — fast, no JS rendering required.
 * Fallback: Bright Data Scraping Browser (puppeteer-core) — used if JSON API fails.
 *
 * Returns: { newsText: string, articles: Article[], meta: object }
 *   where Article = { id, title, summary, publisher, url }
 *   meta contains structured price data: { regularMarketPrice, regularMarketChangePercent, ... }
 *   Source IDs like [S1], [S2] are embedded inline in newsText for LLM attribution.
 */
async function scrapeYahooFinance(ticker) {
  const cacheKey = ticker.toUpperCase();
  const cached = scraperCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`[Scraper] Cache hit for ${cacheKey} (age: ${((Date.now() - cached.timestamp) / 1000).toFixed(0)}s)`);
    return cached.data;
  }

  let result;
  try {
    result = await scrapeViaJsonApi(ticker);
  } catch (err) {
    console.warn(`[Scraper] JSON API failed (${err.message}), falling back to Browser API...`);
    result = await scrapeViaBrowserApi(ticker);
  }

  scraperCache.set(cacheKey, { data: result, timestamp: Date.now() });
  return result;
}

// ─── Primary: Yahoo Finance JSON API ────────────────────────────────────────

async function scrapeViaJsonApi(ticker) {
  // BUG FIX: Use allSettled so a chart failure doesn't kill the news fetch too
  const [newsResult, chartResult] = await Promise.allSettled([
    axios.get(YF_SEARCH_URL, {
      params: { q: ticker, newsCount: 15, enableFuzzyQuery: false, quotesCount: 0 },
      headers: YF_HEADERS,
      timeout: 15000,
    }),
    axios.get(`${YF_CHART_URL}/${ticker}`, {
      params: { interval: '1d', range: '5d' },
      headers: YF_HEADERS,
      timeout: 15000,
    }),
  ]);

  const news = newsResult.status === 'fulfilled'
    ? (newsResult.value.data?.news ?? [])
    : [];

  const meta = chartResult.status === 'fulfilled'
    ? (chartResult.value.data?.chart?.result?.[0]?.meta ?? {})
    : {};

  if (news.length === 0 && !meta.regularMarketPrice) {
    throw new Error('No data returned from Yahoo Finance JSON API');
  }

  // Build structured articles array with source IDs
  const articles = news.map((item, idx) => ({
    id: `S${idx + 1}`,
    title: item.title || 'Untitled',
    summary: item.summary || '',
    publisher: item.publisher || 'Unknown',
    url: item.link || item.url || '',
  }));

  const lines = [];

  // Price context
  if (meta.regularMarketPrice) {
    lines.push(`=== ${ticker} Price Context ===`);
    lines.push(`Current Price: $${meta.regularMarketPrice}`);
    if (meta.regularMarketChangePercent !== undefined) {
      // BUG FIX: cast to Number before calling .toFixed() — avoids crash if value is a string
      lines.push(`Change: ${Number(meta.regularMarketChangePercent).toFixed(2)}% today`);
    }
    if (meta.fiftyTwoWeekHigh && meta.fiftyTwoWeekLow) {
      lines.push(`52-Week Range: $${meta.fiftyTwoWeekLow} – $${meta.fiftyTwoWeekHigh}`);
    }
    lines.push('');
  }

  lines.push(`=== ${ticker} Recent News (with Source IDs for attribution) ===`);
  if (articles.length === 0) {
    lines.push('No recent news found.');
  } else {
    for (const article of articles) {
      lines.push(`[${article.id}] ${article.title}`);
      if (article.summary) lines.push(`  ${article.summary}`);
      if (article.publisher) lines.push(`  Source: ${article.publisher}`);
      lines.push('');
    }
  }

  const newsText = lines.join('\n').slice(0, 8000);
  return { newsText, articles, meta };
}

// ─── Fallback: Bright Data Scraping Browser (puppeteer-core) ────────────────

async function scrapeViaBrowserApi(ticker) {
  if (!process.env.BROWSER_WS) {
    throw new Error('BROWSER_WS not set in .env — cannot use Browser API fallback');
  }

  const puppeteer = require('puppeteer-core');
  let browser;

  try {
    console.log('[Scraper] Connecting to Bright Data Scraping Browser...');
    browser = await puppeteer.connect({
      browserWSEndpoint: process.env.BROWSER_WS,
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);

    await page.goto(`https://finance.yahoo.com/quote/${ticker}/news/`, {
      waitUntil: 'domcontentloaded',
    });

    // Wait for news content to appear (or timeout gracefully)
    await page.waitForSelector('li[class*="story"]', { timeout: 15000 }).catch(() => {});

    // Pull all visible text — clean and slice for LLM
    const text = await page.evaluate(() => document.body.innerText);
    const cleanText = text.replace(/\s{3,}/g, '\n\n').slice(0, 8000);

    // Extract headline-like lines from the browser scrape to build articles
    const headlineLines = cleanText.split('\n').filter(l => l.trim().length > 20 && l.trim().length < 200);
    const articles = headlineLines.slice(0, 15).map((line, idx) => ({
      id: `S${idx + 1}`,
      title: line.trim(),
      summary: '',
      publisher: 'Yahoo Finance',
      url: `https://finance.yahoo.com/quote/${ticker}/news/`,
    }));

    // Re-tag the text with source IDs for attribution
    let taggedText = `=== ${ticker} Recent News (with Source IDs for attribution) ===\n`;
    for (const article of articles) {
      taggedText += `[${article.id}] ${article.title}\n`;
    }
    taggedText += '\n' + cleanText;

    return { newsText: taggedText.slice(0, 8000), articles };
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { scrapeYahooFinance };
