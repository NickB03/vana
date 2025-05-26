import React from 'react';
import ToolCallItem from './ToolCallItem'; // To be created
import ThoughtItem from './ThoughtItem'; // To be created
import './InteractionView.css'; // We'll need to create this CSS file later

// Mock interaction data structure for development
const mockInteractionData = [
    { id: '1', type: 'user_message', text: "What's the weather in London?" },
    { id: '2', type: 'thought', text: "I need to use the weather tool for London." },
    { 
      id: '3', 
      type: 'tool_call', 
      tool_name: 'get_weather', 
      parameters: { location: 'London, UK' }, 
      status: 'success', 
      output: '{ "temperature": "15°C", "condition": "Cloudy" }' 
    },
    { id: '4', type: 'agent_response', text: "The weather in London is 15°C and Cloudy." }
];


function InteractionView({ 
    interactionData, 
    isLoading, 
    error, 
    onRefresh, // Callback to re-fetch data
    currentSessionId // To show which session's logs are being viewed
}) {
    if (isLoading) {
        return <div className="interaction-view-loading">Loading interaction details...</div>;
    }

    if (error) {
        return (
            <div className="interaction-view-error">
                Error fetching interaction details: {typeof error === 'object' ? error.message : error}
                {onRefresh && <button onClick={onRefresh}>Try Again</button>}
            </div>
        );
    }

    const dataToDisplay = interactionData && interactionData.length > 0 ? interactionData : [];
    // If using mock data because actual data prop is empty/null:
    // const dataToDisplay = (interactionData && interactionData.length > 0) ? interactionData : mockInteractionData;


    if (dataToDisplay.length === 0) {
        return (
            <div className="interaction-view-empty">
                No interaction details available for this session.
                {currentSessionId && <p>Session ID: {currentSessionId}</p>}
                {onRefresh && <button onClick={onRefresh}>Refresh</button>}
            </div>
        );
    }

    return (
        <div className="interaction-view-container">
            <div className="interaction-view-header">
                <h3>Interaction Log</h3>
                {currentSessionId && <span className="session-id-display">Session: {currentSessionId}</span>}
                {onRefresh && (
                    <button onClick={onRefresh} className="refresh-button" disabled={isLoading}>
                        {isLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                )}
            </div>
            <ul className="interaction-list">
                {dataToDisplay.map((item, index) => {
                    // Using item.id if available and unique, otherwise index
                    const key = item.id || `interaction-${index}`; 
                    switch (item.type) {
                        case 'tool_call':
                            return (
                                <li key={key} className="interaction-list-item">
                                    <ToolCallItem
                                        toolName={item.tool_name}
                                        parameters={item.parameters}
                                        output={item.output}
                                        status={item.status || 'info'} // Default status if not provided
                                    />
                                </li>
                            );
                        case 'thought':
                        case 'agent_thought': // Supporting both for flexibility
                            return (
                                <li key={key} className="interaction-list-item">
                                    <ThoughtItem text={item.text || item.thought} logLevel={item.logLevel || 'info'} />
                                </li>
                            );
                        case 'user_message':
                            return (
                                 <li key={key} className="interaction-list-item">
                                    <ThoughtItem text={`User: ${item.text}`} logLevel="user" />
                                </li>
                            );
                        case 'agent_response':
                             return (
                                 <li key={key} className="interaction-list-item">
                                    <ThoughtItem text={`Agent: ${item.text}`} logLevel="agent" />
                                </li>
                            );
                        // Add more cases for other interaction types if needed
                        default:
                            return (
                                <li key={key} className="interaction-list-item">
                                    <ThoughtItem text={`Unknown event type: ${item.type} - ${JSON.stringify(item)}`} logLevel="warn" />
                                </li>
                            );
                    }
                })}
            </ul>
        </div>
    );
}

export default InteractionView;
