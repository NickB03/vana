import React, { useEffect, useState } from "react";

function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const alertsUrl = process.env.REACT_APP_ALERTS_URL || "/api/alerts";
      const res = await fetch(alertsUrl);
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (e) {
      setAlerts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const acknowledgeAlert = async (alertId) => {
    await fetch("/api/alerts/acknowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: alertId }),
    });
    fetchAlerts();
  };

  const clearAlert = async (alertId) => {
    await fetch("/api/alerts/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: alertId }),
    });
    fetchAlerts();
  };

  if (loading) return <div>Loading alerts...</div>;
  if (!alerts.length) return <div>No active alerts.</div>;

  return (
    <div style={{ marginTop: "2rem" }}>
      <h2>Active Alerts</h2>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          style={{
            border: "1px solid #e57373",
            background: alert.severity === "critical" ? "#ffebee" : "#fffde7",
            color: "#b71c1c",
            borderRadius: "6px",
            padding: "1rem",
            marginBottom: "1rem",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
          }}
        >
          <strong>{alert.severity.toUpperCase()}</strong> — {alert.message}
          <div style={{ fontSize: "0.9em", color: "#555" }}>
            <span>Source: {alert.source}</span> | <span>{new Date(alert.timestamp).toLocaleString()}</span>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            {alert.status === "active" && (
              <>
                <button onClick={() => acknowledgeAlert(alert.id)} style={{ marginRight: "1em" }}>
                  Acknowledge
                </button>
                <button onClick={() => clearAlert(alert.id)}>Clear</button>
              </>
            )}
            {alert.status === "acknowledged" && <span>Acknowledged</span>}
            {alert.status === "cleared" && <span>Cleared</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Alerts;