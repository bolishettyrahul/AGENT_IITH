import React from 'react';
import { Home, FileText, CreditCard, PieChart, TrendingUp, Grid, Settings, MessageSquare } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="sidebar">
      {/* Logo */}
      <h1 className="sidebar-logo">MARKET.INTEL</h1>

      {/* Nav Menu */}
      <div className="sidebar-section-title">Main</div>
      <div className="sidebar-item active">
        <Home />
        <span>Dashboard</span>
      </div>
      <div className="sidebar-item">
        <FileText />
        <span>Analyses</span>
      </div>
      <div className="sidebar-item">
        <PieChart />
        <span>History</span>
      </div>

      <div className="sidebar-section-title" style={{ marginTop: '2rem' }}>Tools</div>
      <div className="sidebar-item">
        <TrendingUp />
        <span>Markets</span>
      </div>
      <div className="sidebar-item" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Grid />
          <span>Agents</span>
        </div>
        <div className="sidebar-badge">4</div>
      </div>
      <div className="sidebar-item">
        <Settings />
        <span>Settings</span>
      </div>

      <div className="sidebar-spacer"></div>

      {/* Invite a friend card equivalent */}
      <div className="api-status-card">
        <div className="api-status-glow"></div>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <MessageSquare />
          <h3>API Status: Optimal</h3>
          <p>Featherless.ai and Bright Data services are running smoothly with no delays.</p>
          <button>VIEW LOGS</button>
        </div>
      </div>
    </div>
  );
}
