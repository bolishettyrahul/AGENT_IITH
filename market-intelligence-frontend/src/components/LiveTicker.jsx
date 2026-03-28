import React from 'react';

export default function LiveTicker({ trackedStocks }) {
  if (!trackedStocks || trackedStocks.length === 0) {
    return (
      <div className="live-ticker-container empty-ticker">
        <div className="live-ticker-text">
          TRACK A STOCK TO DISPLAY LIVE PRICE UPDATES HERE
        </div>
      </div>
    );
  }

  // No infinite scroll duplication
  const tickerItems = trackedStocks;

  return (
    <div className="live-ticker-container active-ticker">
      <div className="live-ticker-centered-scroll">
        {tickerItems.map((stock, idx) => {
          const isUp = stock.change >= 0;
          return (
            <div key={idx} className="live-ticker-item">
              <span className="ticker-symbol">{stock.ticker}</span>
              <span className="ticker-price">${stock.price?.toFixed(2) || '0.00'}</span>
              <span className={`ticker-change ${isUp ? 'text-green' : 'text-red'}`}>
                {isUp ? '▲' : '▼'} {Math.abs(stock.change || 0).toFixed(2)}%
              </span>
              {idx < tickerItems.length - 1 && <div className="ticker-separator" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
