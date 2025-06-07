import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";
import Alerts from "./components/Alerts";
import HealthStatus from "./components/HealthStatus";
import AgentSidebar from "./components/AgentSidebar";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentView, setCurrentView] = useState("chat");
  const [selectedAgent, setSelectedAgent] = useState({
    id: "vana",
    name: "VANA Orchestrator",
    emoji: "🧠",
    description: "Multi-agent coordination and task management",
    status: "Active",
    responseTime: "2.3s"
  });

  // Available agents with emojis
  const agents = [
    {
      id: "vana",
      name: "VANA Orchestrator",
      emoji: "🧠",
      description: "Multi-agent coordination and task management",
      status: "Active",
      responseTime: "2.3s"
    },
    {
      id: "architecture",
      name: "Architecture Specialist",
      emoji: "🏗️",
      description: "System design and technical architecture",
      status: "Ready",
      responseTime: "1.8s"
    },
    {
      id: "ui",
      name: "UI/UX Specialist",
      emoji: "🎨",
      description: "Interface design and user experience",
      status: "Ready",
      responseTime: "1.5s"
    },
    {
      id: "devops",
      name: "DevOps Specialist",
      emoji: "🚀",
      description: "Infrastructure and deployment management",
      status: "Ready",
      responseTime: "2.1s"
    },
    {
      id: "qa",
      name: "QA Specialist",
      emoji: "🔍",
      description: "Testing strategy and quality assurance",
      status: "Ready",
      responseTime: "1.9s"
    },
    {
      id: "research",
      name: "Research Specialist",
      emoji: "📊",
      description: "Data analysis and competitive intelligence",
      status: "Ready",
      responseTime: "2.0s"
    }
  ];

  // Check for existing authentication on app load
  useEffect(() => {
    const savedToken = localStorage.getItem("vana_token");
    const savedUser = localStorage.getItem("vana_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (err) {
        // Clear invalid data
        localStorage.removeItem("vana_token");
        localStorage.removeItem("vana_user");
      }
    }
  }, []);

  const handleLogin = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
  };

  const handleLogout = async () => {
    try {
      const logoutUrl = process.env.REACT_APP_AUTH_LOGOUT_URL || "/api/auth/logout";
      await fetch(logoutUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Clear local storage and state
      localStorage.removeItem("vana_token");
      localStorage.removeItem("vana_user");
      setUser(null);
      setToken(null);
    }
  };

  // If not authenticated, show login
  if (!user || !token) {
    return <Login onLogin={handleLogin} />;
  }

  // Main application interface with sophisticated design
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      height: "100vh",
      overflow: "hidden"
    }}>
      {/* Sophisticated Header */}
      <div style={{
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        padding: "1rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 20px rgba(0,0,0,0.1)",
        borderBottom: "1px solid rgba(255,255,255,0.2)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1 style={{
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "1.8rem",
            fontWeight: "700",
            margin: 0
          }}>
            🧠 VANA
          </h1>
          <span style={{ color: "#666", fontSize: "0.9rem" }}>
            Multi-Agent Intelligence Platform
          </span>
        </div>

        {/* Agent Selector */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          background: "white",
          padding: "0.5rem 1rem",
          borderRadius: "25px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          border: "2px solid transparent",
          transition: "all 0.3s ease"
        }}>
          <span style={{ fontSize: "1.2rem" }}>{selectedAgent.emoji}</span>
          <select
            value={selectedAgent.id}
            onChange={(e) => {
              const agent = agents.find(a => a.id === e.target.value);
              setSelectedAgent(agent);
            }}
            style={{
              border: "none",
              background: "none",
              fontSize: "1rem",
              fontWeight: "600",
              color: "#333",
              cursor: "pointer",
              padding: "0.25rem"
            }}
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.emoji} {agent.name}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#4ade80"
            }} />
            <span style={{ fontSize: "0.8rem", color: "#666" }}>Online</span>
          </div>
        </div>

        {/* User Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "#666" }}>Welcome, {user?.name || user?.email}</span>
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold"
          }}>
            {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #ddd",
              background: "white",
              color: "#333",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ display: "flex", height: "calc(100vh - 80px)" }}>
        {/* Agent Sidebar */}
        <AgentSidebar
          agents={agents}
          selectedAgent={selectedAgent}
          onAgentSelect={setSelectedAgent}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {currentView === "chat" && (
            <Chat
              user={user}
              token={token}
              selectedAgent={selectedAgent}
            />
          )}
          {currentView === "dashboard" && (
            <div style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(10px)",
              margin: "1rem",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
              padding: "2rem"
            }}>
              <h1>VANA Dashboard</h1>
              <HealthStatus />
              <Alerts />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;