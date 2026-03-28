import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { HTTP_URL } from '../config';

// Lightweight SVG line chart component — no external libraries
function PriceChart({ points }) {
  if (!points || points.length < 2) {
    return <div style={{ color: '#888', fontSize: '0.8125rem', padding: '1rem 0' }}>Loading chart data...</div>;
  }

  const W = 720, H = 200, PAD = 30;
  const closes = points.map(p => p.close);
  const minY = Math.min(...closes);
  const maxY = Math.max(...closes);
  const rangeY = maxY - minY || 1;

  const scaleX = (i) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const scaleY = (v) => H - PAD - ((v - minY) / rangeY) * (H - PAD * 2);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(p.close).toFixed(1)}`).join(' ');
  const areaD = pathD + ` L${scaleX(points.length - 1).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;

  const isUp = closes[closes.length - 1] >= closes[0];
  const color = isUp ? '#6aab8e' : '#b87a7a';

  // Pick ~5 date labels evenly
  const labelIdxs = [0, Math.floor(points.length * 0.25), Math.floor(points.length * 0.5), Math.floor(points.length * 0.75), points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#chartGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
      {/* Y-axis labels */}
      <text x={PAD - 5} y={scaleY(maxY) + 4} fill="#888" fontSize="9" textAnchor="end">${maxY.toFixed(0)}</text>
      <text x={PAD - 5} y={scaleY(minY) + 4} fill="#888" fontSize="9" textAnchor="end">${minY.toFixed(0)}</text>
      {/* X-axis date labels */}
      {labelIdxs.map((idx) => (
        <text key={idx} x={scaleX(idx)} y={H - 5} fill="#888" fontSize="8" textAnchor="middle">{points[idx]?.date?.slice(5)}</text>
      ))}
      {/* Latest price dot */}
      <circle cx={scaleX(points.length - 1)} cy={scaleY(closes[closes.length - 1])} r="4" fill={color} />
    </svg>
  );
}

export default function TrackedStocks({ onBack, trackedStocks, alerts, onReanalyze }) {
  const [expandedStock, setExpandedStock] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [editBuyBelow, setEditBuyBelow] = useState('');

  useEffect(() => {
    if (!expandedStock) { setChartData(null); return; }
    fetch(`http://localhost:3001/chart/${expandedStock}`)
      .then(r => r.json())
      .then(data => setChartData(data.points || []))
      .catch(() => setChartData([]));
  }, [expandedStock]);

  const getStockDetails = (ticker) => trackedStocks.find(s => s.ticker === ticker);

  if (expandedStock) {
    const stock = getStockDetails(expandedStock);
    const latestAlert = alerts.find(a => a.ticker === stock.ticker);
    const isUp = stock.change >= 0;

    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.95)', zIndex: 1000, overflowY: 'auto', padding: '2rem' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '1rem', padding: '3rem', position: 'relative' }}>
          <button 
            onClick={() => setExpandedStock(null)} 
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1 }}>{stock.ticker}</h2>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '0.5rem' }}>
                ${stock.price?.toFixed(2) || '0.00'} 
                <span style={{ fontSize: '1rem', marginLeft: '1rem', color: isUp ? '#6aab8e' : '#b87a7a' }}>
                  {isUp ? '▲' : '▼'} {Math.abs(stock.change || 0).toFixed(2)}%
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
              <span className={`verdict-chip ${stock.verdict === 'BUY' ? 'bg-green' : stock.verdict === 'SELL' ? 'bg-red' : 'bg-blue'}`} style={{ border: 'none', background: 'rgba(255,255,255,0.1)' }}>
                {stock.verdict || 'PENDING'}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#888' }}>{stock.confidence}% CONFIDENCE</span>
              {stock.buyBelowPrice && (
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em',
                  color: stock.price > 0 && stock.price <= stock.buyBelowPrice ? '#6aab8e' : '#c9a050',
                  background: stock.price > 0 && stock.price <= stock.buyBelowPrice ? 'rgba(106,171,142,0.15)' : 'rgba(201,160,80,0.1)',
                  padding: '0.25rem 0.75rem', borderRadius: '999px',
                  border: `1px solid ${stock.price > 0 && stock.price <= stock.buyBelowPrice ? 'rgba(106,171,142,0.3)' : 'rgba(201,160,80,0.2)'}`,
                }}>
                  {stock.price > 0 && stock.price <= stock.buyBelowPrice ? '🚨 BUY NOW' : `⚠ BUY BELOW $${stock.buyBelowPrice.toFixed(2)}`}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <button 
              className="btn-primary" 
              onClick={() => onReanalyze(stock.ticker)} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid #3b82f6' }}
            >
              [REFRESH] RE-ANALYZE STOCK
            </button>
            <button 
              className="btn-primary" 
              onClick={() => { setEditBuyBelow(stock.buyBelowPrice ? stock.buyBelowPrice.toString() : ''); setShowPriceAlertModal(true); }} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'rgba(201,160,80,0.1)', color: '#c9a050', border: '1px solid rgba(201,160,80,0.4)' }}
            >
              {stock.buyBelowPrice ? '[EDIT] UPDATE PRICE ALERT' : '[NEW] SET PRICE ALERT'}
            </button>
            <button className="btn-primary" onClick={() => setExpandedStock(null)} style={{ padding: '0.75rem 1.5rem', background: 'transparent' }}>
              CLOSE
            </button>
          </div>

          {/* Price Alert Modal */}
          {showPriceAlertModal && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.85)', zIndex: 10001,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              animation: 'fadeIn 0.2s ease'
            }} onClick={() => { setShowPriceAlertModal(false); setEditBuyBelow(''); }}>
              <div style={{
                background: 'linear-gradient(145deg, #111111, #0a0a0a)',
                border: '1px solid rgba(201,160,80,0.3)',
                borderRadius: '1.25rem',
                padding: '2.5rem',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(201,160,80,0.08)',
                animation: 'slideUp 0.3s ease'
              }} onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📊</span>
                  <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, letterSpacing: '0.05em', color: '#fff' }}>
                    {stock.buyBelowPrice ? 'UPDATE' : 'SET'} PRICE ALERT — {stock.ticker}
                  </h3>
                </div>
                <p style={{ color: '#888', fontSize: '0.875rem', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                  {stock.price > 0 ? `Current price: $${stock.price.toFixed(2)}` : 'Current price: loading...'}
                </p>
                <p style={{ color: '#666', fontSize: '0.8125rem', margin: '0 0 2rem', lineHeight: 1.5 }}>
                  You’ll get notified when the stock drops below this level.
                </p>

                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: '#c9a050', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
                  BUY BELOW PRICE (USD)
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(201,160,80,0.3)',
                  borderRadius: '0.625rem', padding: '0 1rem', marginBottom: '0.75rem',
                }}>
                  <span style={{ color: '#c9a050', fontWeight: 700, fontSize: '1.25rem', marginRight: '0.5rem' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editBuyBelow}
                    onChange={e => setEditBuyBelow(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const priceNum = parseFloat(editBuyBelow);
                        fetch(`${HTTP_URL}/track/alert`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ticker: stock.ticker, buyBelowPrice: !isNaN(priceNum) && priceNum > 0 ? priceNum : null })
                        }).then(() => { setShowPriceAlertModal(false); setEditBuyBelow(''); });
                      }
                    }}
                    placeholder="e.g. 175.00"
                    autoFocus
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      color: '#fff', fontSize: '1.25rem', fontWeight: 600,
                      padding: '1rem 0', fontFamily: 'Space Mono, monospace',
                    }}
                  />
                </div>
                <p style={{ color: '#555', fontSize: '0.75rem', margin: '0 0 2rem' }}>
                  Leave empty to remove the price alert.
                </p>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={() => {
                      const priceNum = parseFloat(editBuyBelow);
                      fetch(`${HTTP_URL}/track/alert`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ticker: stock.ticker, buyBelowPrice: !isNaN(priceNum) && priceNum > 0 ? priceNum : null })
                      }).then(() => { setShowPriceAlertModal(false); setEditBuyBelow(''); });
                    }}
                    style={{
                      flex: 1, padding: '0.875rem',
                      background: 'linear-gradient(135deg, rgba(201,160,80,0.2), rgba(201,160,80,0.1))',
                      color: '#c9a050', border: '1px solid rgba(201,160,80,0.4)',
                      borderRadius: '0.625rem', cursor: 'pointer',
                      fontWeight: 800, fontSize: '0.8125rem', letterSpacing: '0.08em',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {stock.buyBelowPrice ? 'UPDATE ALERT' : 'SET ALERT'}
                  </button>
                  <button
                    onClick={() => { setShowPriceAlertModal(false); setEditBuyBelow(''); }}
                    style={{
                      padding: '0.875rem 1.5rem',
                      background: 'transparent', color: '#888',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.625rem', cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.8125rem', letterSpacing: '0.05em',
                    }}
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '1rem' }}>Price History (1 Month)</span>
            <PriceChart points={chartData} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Trigger</span>
              <div style={{ fontSize: '1rem', color: '#b87a7a', fontFamily: 'Space Mono, monospace', marginTop: '0.5rem' }}>{stock.trigger}</div>
            </div>

            {stock.buyBelowPrice && (
              <div style={{ padding: '1.5rem', background: stock.price > 0 && stock.price <= stock.buyBelowPrice ? 'rgba(106,171,142,0.08)' : 'rgba(201,160,80,0.05)', borderRadius: '0.5rem', border: `1px solid ${stock.price > 0 && stock.price <= stock.buyBelowPrice ? 'rgba(106,171,142,0.25)' : 'rgba(201,160,80,0.15)'}` }}>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price Alert Target</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'Space Mono, monospace', marginTop: '0.5rem', color: stock.price > 0 && stock.price <= stock.buyBelowPrice ? '#6aab8e' : '#c9a050' }}>
                  Buy below ${stock.buyBelowPrice.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#888', marginTop: '0.5rem' }}>
                  {stock.price > 0 && stock.price <= stock.buyBelowPrice
                    ? `✅ TRIGGERED — Current price $${stock.price.toFixed(2)} is below your target!`
                    : stock.price > 0
                      ? `Waiting — Current price $${stock.price.toFixed(2)} is $${(stock.price - stock.buyBelowPrice).toFixed(2)} above target`
                      : 'Waiting for price data...'
                  }
                </div>
              </div>
            )}

            <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Synthesized Rationale</span>
              <p style={{ fontSize: '1rem', color: '#ccc', marginTop: '0.5rem', lineHeight: 1.6 }}>{stock.rationale}</p>
            </div>
            
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Alert Log</span>
              <p style={{ fontSize: '1rem', color: '#ccc', marginTop: '0.5rem', lineHeight: 1.6 }}>
                {latestAlert ? latestAlert.message : 'No alerts generated yet. Real-time feeds are active.'}
              </p>
            </div>

            {stock.sources && stock.sources.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '1rem' }}>Scraped Source Articles</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {stock.sources.map((src, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>{src.publisher} &bull; {src.providerPublishTime}</div>
                      <a href={src.link} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {src.title} →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="background-glow" />
      <nav className="top-navbar">
        <div className="navbar-brand" onClick={onBack} style={{display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer'}}>
          ← BACK TO DASHBOARD
        </div>
        <div className="navbar-status">
          <span className="status-indicator online">[ACTIVE] MONITORING ACTIVE</span>
        </div>
      </nav>

      <div className="dashboard-container anim-stagger-1">
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', letterSpacing: '0.05em' }}>
          TRACKED STOCKS DIRECTORY
        </h2>

        {trackedStocks.length === 0 ? (
          <div className="base-card" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
            [EMPTY]
            <h3>No stocks currently tracked</h3>
            <p style={{ marginTop: '0.5rem' }}>Analyze a stock on the dashboard and click "TRACK STOCK" to monitor it here.</p>
          </div>
        ) : (
          <div className="agents-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {trackedStocks.map((stock, i) => {
              const latestAlert = alerts.find(a => a.ticker === stock.ticker);
              const isUp = stock.change >= 0;

              return (
                <div 
                  key={i} 
                  className="base-card agent-column" 
                  style={{ 
                    padding: '2rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid var(--border-color)',
                  }}
                  onClick={() => setExpandedStock(stock.ticker)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stock.ticker}</h3>
                    </div>
                    <span className={`verdict-chip ${stock.verdict === 'BUY' ? 'bg-green' : stock.verdict === 'SELL' ? 'bg-red' : 'bg-blue'}`} style={{ border: 'none', background: 'rgba(255,255,255,0.1)' }}>
                      {stock.verdict || 'PENDING'}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    ${stock.price?.toFixed(2) || '0.00'} 
                    <span style={{ fontSize: '0.875rem', marginLeft: '0.75rem', color: isUp ? '#6aab8e' : '#b87a7a' }}>
                      {isUp ? '▲' : '▼'} {Math.abs(stock.change || 0).toFixed(2)}%
                    </span>
                  </div>

                  {stock.buyBelowPrice && (
                    <div style={{
                      fontSize: '0.75rem', fontWeight: 700,
                      color: stock.price > 0 && stock.price <= stock.buyBelowPrice ? '#6aab8e' : '#c9a050',
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                    }}>
                      {stock.price > 0 && stock.price <= stock.buyBelowPrice ? '🚨' : '⚠'} Buy below ${stock.buyBelowPrice.toFixed(2)}
                    </div>
                  )}

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Alert Log</span>
                    <p style={{ fontSize: '0.875rem', color: '#ccc', marginTop: '0.5rem', lineHeight: 1.5 }}>
                      {latestAlert ? latestAlert.message : 'No alerts generated yet. Real-time feeds are active.'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
