import React from "react";

const AgentSidebar = ({ agents, selectedAgent, onAgentSelect, currentView, onViewChange }) => {
  return (
    <div style={{
      width: "300px",
      background: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(10px)",
      padding: "2rem",
      overflowY: "auto",
      borderRight: "1px solid rgba(255,255,255,0.2)"
    }}>
      {/* Dashboard Tabs */}
      <div style={{
        display: "flex",
        gap: "1rem",
        marginBottom: "1rem"
      }}>
        <button
          onClick={() => onViewChange("chat")}
          style={{
            padding: "0.5rem 1rem",
            background: currentView === "chat" ? "white" : "rgba(255,255,255,0.7)",
            border: "none",
            borderRadius: "20px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: currentView === "chat" ? "0 2px 10px rgba(0,0,0,0.1)" : "none",
            fontWeight: currentView === "chat" ? "600" : "normal"
          }}
        >
          Agents
        </button>
        <button
          onClick={() => onViewChange("dashboard")}
          style={{
            padding: "0.5rem 1rem",
            background: currentView === "dashboard" ? "white" : "rgba(255,255,255,0.7)",
            border: "none",
            borderRadius: "20px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: currentView === "dashboard" ? "0 2px 10px rgba(0,0,0,0.1)" : "none",
            fontWeight: currentView === "dashboard" ? "600" : "normal"
          }}
        >
          Dashboard
        </button>
      </div>

      <h3 style={{
        color: "#333",
        marginBottom: "1rem",
        fontSize: "1.1rem"
      }}>
        🤖 Active Agents
      </h3>

      {/* Agent List */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem"
      }}>
        {agents.map(agent => (
          <div
            key={agent.id}
            onClick={() => onAgentSelect(agent)}
            style={{
              background: selectedAgent.id === agent.id 
                ? "linear-gradient(135deg, #667eea, #764ba2)" 
                : "white",
              color: selectedAgent.id === agent.id ? "white" : "#333",
              padding: "1rem",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              border: selectedAgent.id === agent.id 
                ? "2px solid #667eea" 
                : "2px solid transparent",
              transition: "all 0.3s ease",
              cursor: "pointer",
              transform: selectedAgent.id === agent.id ? "translateY(-2px)" : "none"
            }}
            onMouseEnter={(e) => {
              if (selectedAgent.id !== agent.id) {
                e.target.style.borderColor = "#667eea";
                e.target.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedAgent.id !== agent.id) {
                e.target.style.borderColor = "transparent";
                e.target.style.transform = "none";
              }
            }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem"
            }}>
              <span style={{ fontSize: "1.5rem" }}>{agent.emoji}</span>
              <div>
                <div style={{
                  fontWeight: "600",
                  fontSize: "0.9rem"
                }}>
                  {agent.name}
                </div>
                <div style={{
                  fontSize: "0.75rem",
                  opacity: "0.8"
                }}>
                  {agent.status} • {agent.responseTime}
                </div>
              </div>
            </div>
            <div style={{
              fontSize: "0.8rem",
              opacity: "0.9",
              lineHeight: "1.3"
            }}>
              {agent.description}
            </div>
          </div>
        ))}
      </div>

      {/* System Status */}
      <div style={{
        marginTop: "2rem",
        padding: "1rem",
        background: "rgba(255,255,255,0.7)",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.3)"
      }}>
        <h4 style={{
          margin: "0 0 0.5rem 0",
          fontSize: "0.9rem",
          color: "#333"
        }}>
          🔧 System Status
        </h4>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8rem",
          color: "#666"
        }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#4ade80"
          }} />
          All agents operational
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.8rem",
          color: "#666",
          marginTop: "0.25rem"
        }}>
          <div style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "#3b82f6"
          }} />
          Chat system active
        </div>
      </div>
    </div>
  );
};

export default AgentSidebar;
