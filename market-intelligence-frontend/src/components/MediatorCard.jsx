import React from 'react';
import { Lock, Settings, BarChart2, ShieldAlert, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';

export default function MediatorCard({ mediator, ticker }) {
  const getRecColorClass = (rec) => {
    switch (rec) {
      case 'BUY': return 'text-green';
      case 'SELL': return 'text-red';
      default: return 'text-blue'; // HOLD
    }
  };

  const formattedConfidence = `${(mediator.confidence * 100).toFixed(0)}%`;

  return (
    <div className="mediator-container">
      <div className="mediator-top">
        {/* Left Side: Ticker and Confidence mimicking Balance/Income */}
        <div className="mediator-left">
          <div style={{ marginBottom: '2rem' }}>
            <h2 className="mediator-title">
              FINAL CONFIDENCE <span className="mediator-title-ticker">({ticker})</span>
            </h2>
            <div className={`mediator-confidence ${getRecColorClass(mediator.final_recommendation)}`}>
              {formattedConfidence}
            </div>
            <div className="mediator-actions">
              <button className="btn-mediator">
                <ArrowUpRight /> APPROVE
              </button>
              <button className="btn-mediator">
                <ArrowDownRight /> OVERRIDE
              </button>
            </div>
          </div>
          <div className="mediator-stats">
            <div>
              <span className="stat-label">Recommendation</span>
              <span className={`stat-value ${getRecColorClass(mediator.final_recommendation)}`}>
                {mediator.final_recommendation}
              </span>
            </div>
            <div>
              <span className="stat-label">Risk Level</span>
              <span className="stat-value text-yellow">
                {mediator.risk_level}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Card mimicking the actual Credit Card graphic */}
        <div className="mediator-graphic">
          <div className="graphic-shape-1"></div>
          <div className="graphic-shape-2"></div>
          <div className="graphic-shape-3"></div>
          
          <div className="graphic-content">
            <div className="graphic-header">
              <span className="graphic-title-text">M.INTEL | MEDIATOR</span>
              <ShieldAlert className="graphic-icon" />
            </div>
            
            <div>
              <p className="graphic-summary">
                "{mediator.executive_summary}"
              </p>
              
              <div className="graphic-actions">
                <div className="graphic-action-item">
                  <span className="graphic-action-dot"></span>
                  {mediator.action_items[0].substring(0, 15)}...
                </div>
                <div className="graphic-action-item">
                  <span className="graphic-action-dot"></span>
                  {mediator.action_items[1].substring(0, 15)}...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav Links mimicking the 'Lock | Limits | Settings' row */}
      <div className="mediator-nav">
        <div className="mediator-nav-item">
          <Lock /> Lock State
        </div>
        <div className="mediator-nav-item">
          <BarChart2 /> Parameters
        </div>
        <div className="mediator-nav-item">
          <Settings /> Settings
        </div>
        <div className="mediator-nav-item active">
          <AlertCircle /> Key Constraints
        </div>
      </div>
    </div>
  );
}
