import React, { useState } from 'react';
import { ArrowLeft, Activity, Bell, X, ExternalLink, RefreshCw } from 'lucide-react';

export default function TrackedStocks({ onBack, trackedStocks, alerts, onReanalyze }) {
  const [expandedStock, setExpandedStock] = useState(null);

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
                <span style={{ fontSize: '1rem', marginLeft: '1rem', color: isUp ? '#10b981' : '#ef4444' }}>
                  {isUp ? '▲' : '▼'} {Math.abs(stock.change || 0).toFixed(2)}%
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
              <span className={`verdict-chip ${stock.verdict === 'BUY' ? 'bg-green' : stock.verdict === 'SELL' ? 'bg-red' : 'bg-blue'}`} style={{ border: 'none', background: 'rgba(255,255,255,0.1)' }}>
                {stock.verdict || 'PENDING'}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#888' }}>{stock.confidence}% CONFIDENCE</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
            <button 
              className="btn-primary" 
              onClick={() => onReanalyze(stock.ticker)} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid #3b82f6' }}
            >
              <RefreshCw size={16} /> RE-ANALYZE STOCK
            </button>
            <button className="btn-primary" onClick={() => setExpandedStock(null)} style={{ padding: '0.75rem 1.5rem', background: 'transparent' }}>
              CLOSE
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action Trigger</span>
              <div style={{ fontSize: '1rem', color: '#ef4444', fontFamily: 'Space Mono, monospace', marginTop: '0.5rem' }}>{stock.trigger}</div>
            </div>

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
                        {src.title} <ExternalLink size={14} />
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
          <ArrowLeft size={16}/> BACK TO DASHBOARD
        </div>
        <div className="navbar-status">
          <span className="status-indicator online"><Activity size={12} style={{display: 'inline-block', marginRight:'4px'}}/> MONITORING ACTIVE</span>
        </div>
      </nav>

      <div className="dashboard-container anim-stagger-1">
        <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '2rem', letterSpacing: '0.05em' }}>
          TRACKED STOCKS DIRECTORY
        </h2>

        {trackedStocks.length === 0 ? (
          <div className="base-card" style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
            <Bell size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
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
                    <span style={{ fontSize: '0.875rem', marginLeft: '0.75rem', color: isUp ? '#10b981' : '#ef4444' }}>
                      {isUp ? '▲' : '▼'} {Math.abs(stock.change || 0).toFixed(2)}%
                    </span>
                  </div>

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
