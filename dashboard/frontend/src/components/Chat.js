import React, { useState, useRef, useEffect } from "react";

function Chat({ user, token, selectedAgent }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  // Initialize with welcome message from selected agent
  useEffect(() => {
    if (selectedAgent && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        text: `Hello! I'm ${selectedAgent.name}. ${selectedAgent.description}. How can I help you today?`,
        sender: "agent",
        agentId: selectedAgent.id,
        agentEmoji: selectedAgent.emoji,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages([welcomeMessage]);
    }
  }, [selectedAgent]);

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
          sender: "agent",
          agentId: selectedAgent.id,
          agentEmoji: selectedAgent.emoji,
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
      background: "rgba(255, 255, 255, 0.9)",
      backdropFilter: "blur(10px)",
      margin: "1rem",
      borderRadius: "20px",
      overflow: "hidden",
      boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
      height: "calc(100vh - 100px)"
    }}>
      {/* Sophisticated Chat Header */}
      <div style={{
        background: "linear-gradient(135deg, #667eea, #764ba2)",
        color: "white",
        padding: "1.5rem 2rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem"
      }}>
        <span style={{ fontSize: "1.5rem" }}>{selectedAgent.emoji}</span>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{selectedAgent.name}</h2>
          <p style={{
            margin: "0.25rem 0 0 0",
            opacity: "0.9",
            fontSize: "0.9rem"
          }}>
            {selectedAgent.description}
          </p>
        </div>
        <div style={{ marginLeft: "auto", fontSize: "0.8rem", opacity: "0.9" }}>
          {selectedAgent.status} • {selectedAgent.responseTime}
        </div>
      </div>

      {/* Sophisticated Messages */}
      <div style={{
        flex: 1,
        padding: "2rem",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              gap: "1rem",
              maxWidth: "80%",
              alignSelf: message.sender === "user" ? "flex-end" : "flex-start",
              flexDirection: message.sender === "user" ? "row-reverse" : "row"
            }}
          >
            {/* Message Avatar */}
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
              background: message.sender === "user"
                ? "linear-gradient(135deg, #667eea, #764ba2)"
                : "#f0f0f0",
              color: message.sender === "user" ? "white" : "#333"
            }}>
              {message.sender === "user"
                ? (user?.name || user?.email || "U").charAt(0).toUpperCase()
                : message.agentEmoji || "🤖"
              }
            </div>

            {/* Message Content */}
            <div style={{
              background: message.sender === "user"
                ? "linear-gradient(135deg, #667eea, #764ba2)"
                : message.sender === "system"
                ? "#f44336"
                : "white",
              color: message.sender === "user" || message.sender === "system" ? "white" : "#333",
              padding: "1rem 1.5rem",
              borderRadius: "18px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              border: message.sender === "agent" ? "1px solid #eee" : "none",
              position: "relative"
            }}>
              <div style={{
                marginBottom: "0.5rem",
                lineHeight: "1.4",
                whiteSpace: "pre-wrap"
              }}>
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
          <div style={{
            display: "flex",
            gap: "1rem",
            maxWidth: "80%",
            alignSelf: "flex-start"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              background: "#f0f0f0",
              flexShrink: 0
            }}>
              {selectedAgent.emoji}
            </div>
            <div style={{
              background: "white",
              padding: "1rem 1.5rem",
              borderRadius: "18px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
              border: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              {/* Typing Animation */}
              <div style={{ display: "flex", gap: "4px" }}>
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#667eea",
                  animation: "typing 1.4s infinite ease-in-out"
                }} />
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#667eea",
                  animation: "typing 1.4s infinite ease-in-out 0.2s"
                }} />
                <div style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#667eea",
                  animation: "typing 1.4s infinite ease-in-out 0.4s"
                }} />
              </div>
              <span style={{ color: "#666", fontSize: "0.9rem", marginLeft: "0.5rem" }}>
                {selectedAgent.name} is thinking...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sophisticated Input */}
      <div style={{
        padding: "2rem",
        background: "white",
        borderTop: "1px solid #eee",
        display: "flex",
        gap: "1rem",
        alignItems: "flex-end"
      }}>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${selectedAgent.name} anything...`}
            disabled={loading}
            style={{
              width: "100%",
              border: "2px solid #eee",
              borderRadius: "25px",
              padding: "1rem 1.5rem",
              fontSize: "1rem",
              resize: "none",
              outline: "none",
              transition: "border-color 0.3s ease",
              fontFamily: "inherit",
              minHeight: "50px",
              maxHeight: "120px"
            }}
            onFocus={(e) => e.target.style.borderColor = "#667eea"}
            onBlur={(e) => e.target.style.borderColor = "#eee"}
            rows={1}
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={loading || !inputMessage.trim()}
          style={{
            background: loading || !inputMessage.trim()
              ? "#ccc"
              : "linear-gradient(135deg, #667eea, #764ba2)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: loading || !inputMessage.trim() ? "not-allowed" : "pointer",
            transition: "transform 0.3s ease",
            fontSize: "1.2rem"
          }}
          onMouseEnter={(e) => {
            if (!loading && inputMessage.trim()) {
              e.target.style.transform = "scale(1.1)";
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "scale(1)";
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default Chat;
