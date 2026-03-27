/**
 * Phase 1 milestone test:
 * AAPL → scrape Yahoo Finance → Bull Agent → print JSON to terminal
 *
 * Run: node test-phase1.js
 */
require('dotenv').config();
const { scrapeYahooFinance } = require('./scraper/brightdata');
const { runBullAgent } = require('./agents/bull');

(async () => {
  const ticker = process.argv[2] || 'AAPL';
  console.log(`\n[Phase 1 Test] Analyzing ${ticker}...\n`);

  console.log('Step 1: Scraping Yahoo Finance...');
  const newsText = await scrapeYahooFinance(ticker);
  console.log(`  → Got ${newsText.length} chars\n`);

  console.log('Step 2: Running Bull Agent...');
  const result = await runBullAgent(ticker, newsText);
  console.log('\n✓ Phase 1 Result:');
  console.log(JSON.stringify(result, null, 2));
})().catch((err) => {
  console.error('[Error]', err.message);
  process.exit(1);
});
