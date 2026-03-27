import React from 'react';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, ChevronRight } from 'lucide-react';

export default function AgentCard({ type, data }) {
  let titleColorClass, barColorClass, Icon, bgColorClass;

  switch (type) {
    case 'BULL':
      titleColorClass = 'text-green';
      barColorClass = 'text-green';
      bgColorClass = 'bg-green-light';
      Icon = ArrowUpRight;
      break;
    case 'BEAR':
      titleColorClass = 'text-red';
      barColorClass = 'text-red';
      bgColorClass = 'bg-red-light';
      Icon = ArrowDownRight;
      break;
    case 'RISK':
      titleColorClass = 'text-orange';
      barColorClass = 'text-orange';
      bgColorClass = 'bg-orange-light';
      Icon = AlertTriangle;
      break;
    default:
      titleColorClass = 'text-blue';
      barColorClass = 'text-blue';
      bgColorClass = 'bg-blue-light';
      Icon = ChevronRight;
  }

  const confidencePct = `${(data.confidence * 100).toFixed(0)}%`;

  return (
    <div className={`agent-card ${titleColorClass}`}>
      {/* Header mimicking "Spendings" title */}
      <div className="agent-header">
        <div className="agent-header-titles">
          <span className="agent-type" style={{ color: '#1f2937' }}>
            {type.toLowerCase()} Agent
          </span>
          <span className="agent-stance">
            {data.stance}
          </span>
        </div>
        <div className={`agent-icon-wrapper ${bgColorClass}`}>
          <Icon />
        </div>
      </div>

      {/* Imitate the bar chart / visual metric */}
      <div className="agent-bar-chart">
        {[0.3, 0.5, 0.8, 0.4, 0.6, 0.9, 0.5, 0.7, 0.2, 0.6].map((h, i) => (
          <div 
            key={i} 
            className={`agent-bar ${i === 5 ? 'active' : ''}`}
            style={{ height: `${Math.max(20, h * 100 * (i === 5 ? (data.score / 10) : 0.4))}%` }}
          ></div>
        ))}
      </div>
      
      <div className="agent-confidence-row">
        <span className="agent-conf-label">CONFIDENCE</span>
        <span className="agent-conf-val">{confidencePct}</span>
      </div>

      {/* Mimic the "Categories" bullet points */}
      <div className="agent-content">
        <div className="agent-section-title">Key Points</div>
        <ul className="agent-points">
          {data.key_points.map((point, idx) => (
            <li key={idx} className="agent-point">
              <span className="agent-point-dot"></span>
              <span className="agent-point-text">{point}</span>
            </li>
          ))}
        </ul>
        
        <div className="agent-reasoning" style={{ borderLeftColor: 'currentColor' }}>
          "{data.reasoning}"
        </div>
      </div>
      
      {/* Footer mimic */}
      <div className="agent-footer">
        <span className="agent-score" style={{ color: '#9ca3af' }}>SCORE: {data.score}/10</span>
        <span className={`agent-footer-stance ${bgColorClass}`}>
          {data.stance}
        </span>
      </div>
    </div>
  );
}
