import React, { useState, useRef, useEffect } from "react";

function Chat({ user, token }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      const chatUrl = process.env.REACT_APP_CHAT_URL || "/api/chat";
      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId: sessionId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update session ID if provided
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }

        const botMessage = {
          id: Date.now() + 1,
          text: data.response,
          sender: "vana",
          timestamp: new Date().toLocaleTimeString(),
          messageId: data.messageId
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMessage = {
          id: Date.now() + 1,
          text: `Error: ${data.detail || "Failed to send message"}`,
          sender: "system",
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "Network error. Please try again.",
        sender: "system",
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100vh",
      background: "#f5f5f5"
    }}>
      {/* Header */}
      <div style={{
        background: "white",
        padding: "1rem 2rem",
        borderBottom: "1px solid #eee",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ margin: 0, color: "#333" }}>VANA Chat</h2>
        <p style={{ margin: "0.5rem 0 0 0", color: "#666", fontSize: "0.9rem" }}>
          Welcome, {user?.name || user?.email}
        </p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: "center",
            color: "#666",
            fontStyle: "italic",
            marginTop: "2rem"
          }}>
            Start a conversation with VANA...
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent: message.sender === "user" ? "flex-end" : "flex-start"
            }}
          >
            <div style={{
              maxWidth: "70%",
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              background: message.sender === "user" 
                ? "#667eea" 
                : message.sender === "system"
                ? "#f44336"
                : "white",
              color: message.sender === "user" || message.sender === "system" ? "white" : "#333",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              border: message.sender === "vana" ? "1px solid #eee" : "none"
            }}>
              <div style={{ marginBottom: "0.25rem" }}>
                {message.text}
              </div>
              <div style={{
                fontSize: "0.75rem",
                opacity: 0.7,
                textAlign: "right"
              }}>
                {message.timestamp}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "0.75rem 1rem",
              borderRadius: "10px",
              background: "white",
              border: "1px solid #eee",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}>
              <div style={{ color: "#666" }}>VANA is typing...</div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        background: "white",
        padding: "1rem 2rem",
        borderTop: "1px solid #eee",
        display: "flex",
        gap: "1rem",
        alignItems: "flex-end"
      }}>
        <textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "0.75rem",
            border: "1px solid #ddd",
            borderRadius: "5px",
            resize: "none",
            minHeight: "40px",
            maxHeight: "120px",
            fontSize: "1rem",
            fontFamily: "inherit"
          }}
          rows={1}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !inputMessage.trim()}
          style={{
            padding: "0.75rem 1.5rem",
            background: loading || !inputMessage.trim() ? "#ccc" : "#667eea",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: loading || !inputMessage.trim() ? "not-allowed" : "pointer",
            fontWeight: "bold",
            transition: "background 0.3s"
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat;
