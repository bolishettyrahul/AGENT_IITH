import React from 'react';
import { ArrowRight } from 'lucide-react';

// Easily editable copy for the landing page
const CONTENT = {
  heroBadge: "Autonomic Institutional Intelligence",
  heroTitleLine1: "PARALLEL MARKET",
  heroTitleLine2: "REASONING ENGINE",
  heroSubtitle: "Experience the future of financial analysis. Our platform deploys autonomous Bull, Bear, and Risk agents to evaluate market conditions simultaneously. A central Mediator synthesizes conflicting viewpoints into actionable insights via live WebSocket streaming.",
  launchBtn: "LAUNCH ENGINE",
  
  featuresTitle: "DISTRIBUTED COGNITION.",
  featuresSubtitle: "Three distinct agent matrices evaluating the same ticker in absolute parallel. No singular bias.",
  features: [
    {
      id: "bull",
      icon: '[BULL]',
      title: "BULL AGENT",
      desc: "Aggressively scans for upward momentum, earnings beats, sector growth, and undocumented macro catalysts."
    },
    {
      id: "bear",
      icon: '[BEAR]',
      title: "BEAR AGENT",
      desc: "Identifies overvaluation, sector headwinds, declining fundamentals, and critical negative trends."
    },
    {
      id: "risk",
      icon: '[RISK]',
      title: "RISK AGENT",
      desc: "Monitors supply chain vulnerabilities, regulatory exposure, currency headwinds, and black swan potential."
    }
  ],
  
  demoImage: "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=2000" // Abstract blockchain/tech dark theme
};

export default function LandingPage({ onLaunch }) {
  return (
    <div style={{ overflowY: 'auto', height: '100vh', scrollBehavior: 'smooth' }}>
      <div className="background-glow" />
      
      <nav className="top-navbar" style={{position: 'absolute', width: '100%', top: 0, zIndex: 50, background: 'transparent', border: 'none'}}>
        <div className="navbar-brand">MARKET.INTEL</div>
        <div className="navbar-status">
            <button className="btn-primary" onClick={onLaunch} style={{padding: '0.5rem 1.25rem', fontSize: '0.75rem'}}>
              ENTER APP
            </button>
        </div>
      </nav>
      
      {/* SECTION 1: HERO */}
      <section className="hero-wrapper" style={{minHeight: '100vh', justifyContent: 'center'}}>
        <div className="hero-badge anim-stagger-1" style={{marginTop: '-2rem'}}>
          {CONTENT.heroBadge} <ArrowRight size={14} />
        </div>
        <h1 className="hero-title anim-stagger-2">
          {CONTENT.heroTitleLine1}<br />{CONTENT.heroTitleLine2}
        </h1>
        <p className="hero-subtitle anim-stagger-3">
          {CONTENT.heroSubtitle}
        </p>
        <div className="anim-stagger-4" style={{marginTop: '1.5rem'}}>
          <button className="btn-primary" onClick={onLaunch} style={{padding: '1.25rem 2.5rem', fontSize: '1rem', letterSpacing: '0.1em'}}>
            {CONTENT.launchBtn}
          </button>
        </div>
      </section>

      {/* SECTION 2: PRODUCT PREVIEW IMAGE */}
      <section className="demo-image-container anim-stagger-2">
        <img 
          src={CONTENT.demoImage} 
          alt="Platform Preview Placeholder" 
          className="demo-image"
        />
      </section>

      {/* SECTION 3: FEATURES */}
      <section className="landing-features-section">
        <div style={{textAlign: 'center', marginBottom: '4rem'}}>
          <h2 style={{fontSize: '3rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '1rem'}}>
            {CONTENT.featuresTitle}
          </h2>
          <p style={{fontSize: '1.125rem', color: '#888', maxWidth: '600px', margin: '0 auto'}}>
            {CONTENT.featuresSubtitle}
          </p>
        </div>

        <div className="features-grid">
          {CONTENT.features.map(feature => (
            <div key={feature.id} className="feature-card">
              {feature.icon}
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
        
        <div style={{textAlign: 'center', marginTop: '6rem'}}>
          <button className="btn-primary" onClick={onLaunch} style={{backgroundColor: 'transparent', color: '#fff', border: '1px solid #555', padding: '1rem 2rem'}}>
            PROCEED TO DASHBOARD
          </button>
        </div>
      </section>
      
      {/* FOOTER */}
      <footer style={{borderTop: '1px solid rgba(255,255,255,0.1)', padding: '2rem', textAlign: 'center', color: '#555', fontSize: '0.875rem'}}>
        MARKET.INTEL © 2026 FORGE INSPIRA
      </footer>
    </div>
  );
}
