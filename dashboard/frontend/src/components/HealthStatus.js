import React, { useEffect, useState } from "react";

function HealthStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      setStatus(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading health status...</div>;
  if (!status) return <div>Health status unavailable.</div>;

  const color =
    status.status === "ok"
      ? "#388e3c"
      : status.status === "warning"
      ? "#fbc02d"
      : status.status === "error"
      ? "#d32f2f"
      : "#616161";

  return (
    <div
      style={{
        background: "#fff",
        border: `2px solid ${color}`,
        borderRadius: "6px",
        padding: "1rem",
        marginBottom: "2rem",
        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
      }}
    >
      <h2 style={{ color }}>System Health: {status.status.toUpperCase()}</h2>
      <div style={{ fontSize: "0.95em", color: "#333" }}>
        <strong>Checked:</strong> {new Date(status.timestamp).toLocaleString()}
        <ul>
          {Object.entries(status.components || {}).map(([name, comp]) => (
            <li key={name}>
              <strong>{name}:</strong> {comp.status} — {comp.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default HealthStatus;