import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  return (
    <div className="app-wrapper">
      {currentPage === 'landing' ? (
        <LandingPage onLaunch={() => setCurrentPage('dashboard')} />
      ) : (
        <Dashboard onHome={() => setCurrentPage('landing')} />
      )}
    </div>
  );
}

export default App;
