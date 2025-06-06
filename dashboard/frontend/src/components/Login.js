import React, { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loginUrl = process.env.REACT_APP_AUTH_LOGIN_URL || "/api/auth/login";
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token in localStorage
        localStorage.setItem("vana_token", data.token);
        localStorage.setItem("vana_user", JSON.stringify(data.user));
        onLogin(data.user, data.token);
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
    }}>
      <div style={{
        background: "white",
        padding: "2rem",
        borderRadius: "10px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
        width: "100%",
        maxWidth: "400px"
      }}>
        <h2 style={{ textAlign: "center", marginBottom: "2rem", color: "#333" }}>
          VANA Login
        </h2>
        
        {error && (
          <div style={{
            background: "#fee",
            color: "#c33",
            padding: "0.75rem",
            borderRadius: "5px",
            marginBottom: "1rem",
            border: "1px solid #fcc"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "5px",
                fontSize: "1rem"
              }}
              placeholder="test@vana.ai"
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "5px",
                fontSize: "1rem"
              }}
              placeholder="test123"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem",
              background: loading ? "#ccc" : "#667eea",
              color: "white",
              border: "none",
              borderRadius: "5px",
              fontSize: "1rem",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.3s"
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{ 
          marginTop: "1rem", 
          padding: "1rem", 
          background: "#f8f9fa", 
          borderRadius: "5px",
          fontSize: "0.9rem",
          color: "#666"
        }}>
          <strong>Demo Credentials:</strong><br />
          Email: test@vana.ai<br />
          Password: test123
        </div>
      </div>
    </div>
  );
}

export default Login;
