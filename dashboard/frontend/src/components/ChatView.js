import React, { useState, useEffect, useCallback } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import InteractionView from './InteractionView'; // Import the new component
import './ChatView.css'; // We'll need to create this CSS file later

// Mock API call for chat messages
async function mockChatApiCall(payload) {
    console.log('Chat API Call with payload:', payload);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (payload.message.toLowerCase().includes("error")) {
                reject(new Error("Mock API Error: Something went wrong."));
                return;
            }
            const responses = [
                "Hello there! How can I help you today?",
                "I'm doing well, thanks for asking!",
                "That's an interesting question. Let me think...",
                "I'm sorry, I don't have an answer for that right now.",
                "Processing your request..."
            ];
            const agentResponse = {
                response: responses[Math.floor(Math.random() * responses.length)],
                session_id: payload.session_id || `session_${Date.now()}`
            };
            resolve(agentResponse);
        }, 1000);
    });
}

// Mock API call for interaction logs
async function mockInteractionLogApiCall(sessionId) {
    console.log('Interaction Log API Call for session:', sessionId);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (!sessionId) {
                resolve({ interactions: [] }); // No session, no logs
                return;
            }
            if (sessionId.includes("error_log")) {
                 reject(new Error("Mock API Error: Failed to fetch interaction logs."));
                 return;
            }
            const mockLogData = [
                { id: 'log1', type: 'user_message', text: "What's the weather in London?" },
                { id: 'log2', type: 'thought', text: "I need to use the weather tool for London." },
                { 
                  id: 'log3', 
                  type: 'tool_call', 
                  tool_name: 'get_weather', 
                  parameters: { location: 'London, UK' }, 
                  status: 'success', 
                  output: '{ "temperature": "15°C", "condition": "Cloudy" }' 
                },
                { id: 'log4', type: 'agent_response', text: "The weather in London is 15°C and Cloudy." }
            ];
            resolve({ interactions: mockLogData });
        }, 800);
    });
}


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

    // Initial greeting
    useEffect(() => {
        setMessages([{ 
            id: 'initial-greeting', 
            text: 'Welcome to Vana Chat! How can I assist you today?', 
            sender: 'agent' 
        }]);
    }, []);

    const fetchInteractionLog = useCallback(async (sessionIdToFetch) => {
        if (!sessionIdToFetch) {
            setInteractionLog([]); // Clear logs if no session ID
            return;
        }
        setIsLogLoading(true);
        setLogError(null);
        try {
            // const response = await fetch(`/api/agent/interactions?session_id=${sessionIdToFetch}`);
            // if (!response.ok) {
            //     const errorData = await response.json();
            //     throw new Error(errorData.error || `API Error: ${response.status}`);
            // }
            // const data = await response.json();
            // setInteractionLog(data.interactions || []);
            
            // Using mock API for now
            const data = await mockInteractionLogApiCall(sessionIdToFetch);
            setInteractionLog(data.interactions || []);

        } catch (err) {
            console.error("Failed to fetch interaction log:", err);
            setLogError(err.message);
            setInteractionLog([]); // Clear logs on error
        } finally {
            setIsLogLoading(false);
        }
    }, []);

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
            // const response = await fetch('/api/agent/chat', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         message: inputText,
            //         session_id: currentSessionId,
            //         user_id: 'currentUser', // This would come from auth context
            //     }),
            // });
            // if (!response.ok) {
            //     const errorData = await response.json();
            //     throw new Error(errorData.error || `API Error: ${response.status}`);
            // }
            // const data = await response.json();
            
            // Using mock API for now
            const data = await mockChatApiCall({
                message: inputText,
                session_id: currentSessionId,
                user_id: 'currentUser', // This would come from auth context
            });

            const agentMessage = {
                id: `agent-${Date.now()}`,
                text: data.response,
                sender: 'agent',
            };
            setMessages(prevMessages => [...prevMessages, agentMessage]);
            
            const newSessionId = data.session_id;
            if (newSessionId && newSessionId !== currentSessionId) {
                setCurrentSessionId(newSessionId);
                // If the details tab is already active, fetch logs for the new session
                if (activeTab === 'details') {
                    fetchInteractionLog(newSessionId);
                }
            }

        } catch (err) {
            console.error("Failed to send message:", err.message);
            setError(err.message);
            setMessages(prevMessages => [...prevMessages, {
                id: `error-${Date.now()}`,
                text: `Error: ${err.message || 'Could not connect to agent.'}`,
                sender: 'system'
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [currentSessionId, activeTab, fetchInteractionLog]);

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
