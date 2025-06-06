import React, { useState, useEffect } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";
import Alerts from "./components/Alerts";
import HealthStatus from "./components/HealthStatus";

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [currentView, setCurrentView] = useState("chat");

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

  // Main application interface
  return (
    <div style={{ fontFamily: "sans-serif", height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navigation */}
      <nav style={{
        background: "white",
        borderBottom: "1px solid #eee",
        padding: "0.5rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "#333" }}>VANA WebUI</h3>
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => setCurrentView("chat")}
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                background: currentView === "chat" ? "#667eea" : "transparent",
                color: currentView === "chat" ? "white" : "#333",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: currentView === "chat" ? "bold" : "normal"
              }}
            >
              Chat
            </button>
            <button
              onClick={() => setCurrentView("dashboard")}
              style={{
                padding: "0.5rem 1rem",
                border: "none",
                background: currentView === "dashboard" ? "#667eea" : "transparent",
                color: currentView === "dashboard" ? "white" : "#333",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: currentView === "dashboard" ? "bold" : "normal"
              }}
            >
              Dashboard
            </button>
          </div>
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
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {currentView === "chat" && <Chat user={user} token={token} />}
        {currentView === "dashboard" && (
          <div style={{ padding: "2rem", background: "#f7f7f7", height: "100%", overflow: "auto" }}>
            <h1>VANA Dashboard</h1>
            <HealthStatus />
            <Alerts />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;