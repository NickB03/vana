import React from 'react';
import './App.css'; // Main app styles
import ChatView from './components/ChatView';
import HealthStatus from './components/HealthStatus'; // Re-importing
import Alerts from './components/Alerts';           // Re-importing

function App() {
  // Assume Streamlit runs on port 8501 locally
  const streamlitDashboardUrl = "http://localhost:8501"; 

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
          <h1>VANA Agent Interface</h1>
        </div>
        <div className="header-status-indicators">
          <Alerts /> {/* These might need specific styling for header context */}
          <HealthStatus /> {/* These might need specific styling for header context */}
        </div>
        <div className="header-nav-links">
          <a href={streamlitDashboardUrl} target="_blank" rel="noopener noreferrer">
            Monitoring Dashboard
          </a>
        </div>
      </header>
      <main className="app-main">
        <ChatView />
      </main>
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} VANA Project. All rights reserved.</p>
        {/* Other footer content can go here */}
      </footer>
    </div>
  );
}

export default App;