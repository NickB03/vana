import React, { useState, useEffect, useCallback } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import InteractionView from './InteractionView';
import './ChatView.css';


function ChatView() {
    // Chat state
    const [messages, setMessages] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // For sending messages
    const [error, setError] = useState(null); // For sending messages

    // Interaction Log state
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'details'
    const [interactionLog, setInteractionLog] = useState([]);
    const [isLogLoading, setIsLogLoading] = useState(false);
    const [logError, setLogError] = useState(null);

    // Placeholder for User ID - to be replaced by auth context in Task 3.1
    const currentUserId = "placeholder_user"; 
    // API Endpoints
    const CHAT_API_ENDPOINT = "/api/agent/chat"; 
    const INTERACTIONS_API_ENDPOINT_BASE = "/api/agent/interactions";

    // Initial greeting useEffect - Commented out for now to focus on user-initiated messages.
    // useEffect(() => {
    //     setMessages([{ 
    //         id: 'initial-greeting', 
    //         text: 'Welcome to Vana Chat! How can I assist you today?', 
    //         sender: 'agent' 
    //     }]);
    // }, []);

    const fetchInteractionLog = useCallback(async (sessionIdToFetch) => {
        if (!sessionIdToFetch) {
            setInteractionLog([]); // Clear logs if no session ID
            return;
        }
        setIsLogLoading(true);
        setLogError(null);
        try {
            const response = await fetch(`${INTERACTIONS_API_ENDPOINT_BASE}?session_id=${sessionIdToFetch}`, {
                // headers: { "Authorization": `Bearer ${authToken}` } // Add Auth later
            });
            const data = await response.json(); // Always try to parse JSON

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            if (data.error) { // Handle application-level errors from backend
                 throw new Error(data.error);
            }
            // The backend returns { "interactions": [...], "session_id": "..." }
            setInteractionLog(data.interactions || []);
        } catch (err) {
            console.error("Failed to fetch interaction log:", err);
            setLogError(err.message || "Failed to fetch interaction details.");
            setInteractionLog([]); // Clear previous logs on error
        } finally {
            setIsLogLoading(false);
        }
    }, [INTERACTIONS_API_ENDPOINT_BASE /* Add other dependencies if endpoint changes */]);

    // Effect to fetch logs when tab changes to 'details' or session ID updates
    useEffect(() => {
        if (activeTab === 'details' && currentSessionId) {
            fetchInteractionLog(currentSessionId);
        }
    }, [activeTab, currentSessionId, fetchInteractionLog]);


    const handleSendMessage = useCallback(async (inputText) => {
        if (!inputText.trim()) return;

        const userMessage = {
            id: `user-${Date.now()}`,
            text: inputText,
            sender: 'user',
        };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(CHAT_API_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    // "Authorization": `Bearer ${authToken}` // Add this later with auth
                },
                body: JSON.stringify({
                    message: inputText,
                    session_id: currentSessionId,
                    user_id: currentUserId, 
                }),
            });

            const data = await response.json(); // Always try to parse JSON, even for errors

            if (!response.ok) {
                // data.error should be populated by the backend for specific errors
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            // Handle cases where backend might return a 2xx but with an application-level error
            if (data.error) {
                throw new Error(data.error);
            }

            const agentMessage = {
                id: `agent-${Date.now()}`, // Consider more robust ID generation if needed
                text: data.response,
                sender: 'agent',
            };
            setMessages(prevMessages => [...prevMessages, agentMessage]);
            
            const newSessionId = data.session_id;
            if (newSessionId && newSessionId !== currentSessionId) {
                setCurrentSessionId(newSessionId);
                // If the details tab is already active and a new session starts, fetch its logs
                if (activeTab === 'details') {
                    fetchInteractionLog(newSessionId);
                }
            }

        } catch (err) {
            console.error("Failed to send message:", err);
            const errorMessage = err.message || "Failed to communicate with the agent.";
            setError(errorMessage);
            setMessages(prevMessages => [...prevMessages, {
                id: `error-${Date.now()}`, // Consider more robust ID generation
                text: `Error: ${errorMessage}`,
                sender: 'system'
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [currentSessionId, activeTab, fetchInteractionLog, CHAT_API_ENDPOINT, currentUserId]);

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
    };

    return (
        <div className="chat-view-container">
            <div className="chat-header">
                <h2>Vana Agent Interface</h2>
                <div className="tabs">
                    <button 
                        onClick={() => handleTabChange('chat')} 
                        className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
                        disabled={isLoading} // Disable tab switch during message send
                    >
                        Chat
                    </button>
                    <button 
                        onClick={() => handleTabChange('details')} 
                        className={`tab-button ${activeTab === 'details' ? 'active' : ''}`}
                        disabled={!currentSessionId || isLoading} // Disable if no session or sending message
                    >
                        Interaction Details
                    </button>
                </div>
            </div>

            {error && activeTab === 'chat' && <div className="chat-error-message">Chat Error: {error}</div>}
            
            {activeTab === 'chat' && (
                <>
                    <MessageList messages={messages} />
                    <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
                </>
            )}

            {activeTab === 'details' && (
                <InteractionView 
                    interactionData={interactionLog}
                    isLoading={isLogLoading}
                    error={logError}
                    onRefresh={() => fetchInteractionLog(currentSessionId)}
                    currentSessionId={currentSessionId}
                />
            )}
        </div>
    );
}

export default ChatView;
