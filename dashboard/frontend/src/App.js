import React from "react";
import Alerts from "./components/Alerts";
import HealthStatus from "./components/HealthStatus";

function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", background: "#f7f7f7", minHeight: "100vh" }}>
      <h1>VANA Dashboard</h1>
      <HealthStatus />
      <Alerts />
    </div>
  );
}

export default App;
