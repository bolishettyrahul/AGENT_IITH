import React from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';

export default function WatchlistArea({ currentTicker }) {
  return (
    <div className="watchlist-area">
      <div className="watchlist-header">
        <h2>Recent Analyses</h2>
        <ChevronDown />
      </div>

      <div className="watchlist-list">
        <div className="watchlist-item active">
          <span className="watchlist-item-name">AAPL</span>
          <span className="watchlist-item-val">14:20 PM</span>
        </div>
        <div className="watchlist-item">
          <span className="watchlist-item-name">MSFT</span>
          <span className="watchlist-item-val" style={{ fontWeight: 'normal' }}>11:05 AM</span>
        </div>
        <div className="watchlist-item">
          <span className="watchlist-item-name">TSLA</span>
          <span className="watchlist-item-val" style={{ fontWeight: 'normal' }}>09:12 AM</span>
        </div>
      </div>

      <div className="watchlist-header">
        <h2>Watchlist</h2>
        <ChevronDown />
      </div>

      <div className="watchlist-list">
        <div className="watchlist-item">
          <span className="watchlist-item-name">NVDA</span>
          <span className="watchlist-item-val text-green">+1.2%</span>
        </div>
        <div className="watchlist-item">
          <span className="watchlist-item-name">META</span>
          <span className="watchlist-item-val text-red">-0.4%</span>
        </div>
      </div>

      <div className="watchlist-new">
        <div className="watchlist-header" style={{ marginBottom: '1rem' }}>
          <h2>New Analysis</h2>
          <ChevronUp />
        </div>
        
        <div className="watchlist-input-wrapper">
          <input 
            type="text" 
            placeholder="Ticker (e.g. AAPL)" 
            className="watchlist-input"
            defaultValue="AAPL"
          />
        </div>
        <button className="btn-analyze">
          <Plus />
          ANALYZE TICKER
        </button>
      </div>
    </div>
  );
}
