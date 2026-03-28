import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import TrackedStocks from './components/TrackedStocks';
import LiveTicker from './components/LiveTicker';
import { HTTP_URL, WS_URL } from './config';

export default function App() {
  const [currentPage, setCurrentPage] = useState('landing'); // 'landing', 'dashboard', 'tracked'
  const [trackedStocks, setTrackedStocks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [targetTicker, setTargetTicker] = useState("");

  useEffect(() => {
    // Global WebSocket for alerts & ticker updates
    let ws;
    let reconnectTimeout;
    let backoff = 1000;
    const MAX_BACKOFF = 30000;

    const connectWS = () => {
      ws = new WebSocket(WS_URL);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'alerts_update') {
            setTrackedStocks(data.stocks || []);
            
            // Show new toast notifications
            if (data.new_alerts && data.new_alerts.length > 0) {
              const newToasts = data.new_alerts.map(a => ({ id: Date.now() + Math.random(), ...a }));
              setToasts(prev => [...newToasts, ...prev].slice(0, 5));
              setAlerts(prev => [...data.new_alerts, ...prev]);
            }
          }
        } catch (e) {
          console.error(e);
        }
      };
      
      ws.onopen = () => { backoff = 1000; };
      ws.onclose = () => {
        reconnectTimeout = setTimeout(() => {
          backoff = Math.min(backoff * 2, MAX_BACKOFF);
          connectWS();
        }, backoff);
      };
    };

    connectWS();
    
    // Fetch initial list of tracked stocks
    fetch(`${HTTP_URL}/tracked`)
      .then(res => res.json())
      .then(data => setTrackedStocks(data.stocks || []))
      .catch(err => console.error('Failed to fetch tracked stocks', err));

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  // Remove toast after 5 seconds
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(0, prev.length - 1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  return (
    <div className="app-wrapper">
      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast-item">
            <div className="toast-icon">⚠️</div>
            <div className="toast-content">
              <strong>{toast.ticker} ALERT</strong>
              <p>{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      {currentPage === 'landing' ? (
        <LandingPage onLaunch={() => setCurrentPage('dashboard')} />
      ) : (
        <>
          <LiveTicker trackedStocks={trackedStocks} />
          
          {currentPage === 'dashboard' && (
             <Dashboard 
               onHome={() => setCurrentPage('landing')} 
               onViewTracked={() => setCurrentPage('tracked')}
               trackedStocks={trackedStocks}
               targetTicker={targetTicker}
             />
          )}
          
          {currentPage === 'tracked' && (
             <TrackedStocks 
               onBack={() => setCurrentPage('dashboard')} 
               trackedStocks={trackedStocks}
               alerts={alerts}
               onReanalyze={(ticker) => {
                 setTargetTicker(ticker);
                 setCurrentPage('dashboard');
               }}
             />
          )}
        </>
      )}
    </div>
  );
}
