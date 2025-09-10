import React from 'react';

// Simple debug component to test basic React rendering
export function DebugComponent() {
  return (
    <div style={{ padding: '20px', border: '2px solid red', margin: '10px' }}>
      <h2>Debug Component - React is Working</h2>
      <p>If you can see this, React is rendering correctly.</p>
      <p>Current time: {new Date().toLocaleTimeString()}</p>
    </div>
  );
}

export default DebugComponent;