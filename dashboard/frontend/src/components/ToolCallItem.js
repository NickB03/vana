import React, { useState } from 'react';
import './ToolCallItem.css'; // We'll need to create this CSS file later

function ToolCallItem({ toolName, parameters, output, status }) {
    const [isOutputExpanded, setIsOutputExpanded] = useState(false);
    const [isParamsExpanded, setIsParamsExpanded] = useState(false);

    const formatJson = (data) => {
        if (typeof data === 'string') {
            try {
                // Try to parse if it's a JSON string
                const parsed = JSON.parse(data);
                return JSON.stringify(parsed, null, 2);
            } catch (e) {
                // Not a JSON string, return as is
                return data;
            }
        }
        // If it's already an object
        return JSON.stringify(data, null, 2);
    };

    const paramsString = formatJson(parameters);
    const outputString = formatJson(output);

    // Simple heuristic to check if content is long
    const isLongParams = paramsString.length > 100;
    const isLongOutput = outputString.length > 150;


    return (
        <div className={`tool-call-item status-${status || 'info'}`}>
            <h4 className="tool-name">Tool: {toolName || 'Unknown Tool'}</h4>
            
            <div className="tool-parameters">
                <strong>Parameters:</strong>
                {isLongParams && (
                     <button 
                        onClick={() => setIsParamsExpanded(!isParamsExpanded)} 
                        className="toggle-expand-button"
                        aria-expanded={isParamsExpanded}
                    >
                        {isParamsExpanded ? 'Collapse' : 'Expand'}
                    </button>
                )}
                <pre className={`code-block ${isLongParams && !isParamsExpanded ? 'collapsed' : ''}`}>
                    <code>
                        {paramsString}
                    </code>
                </pre>
            </div>

            {output !== undefined && (
                <div className="tool-output">
                    <strong>Output:</strong>
                     {isLongOutput && (
                        <button 
                            onClick={() => setIsOutputExpanded(!isOutputExpanded)} 
                            className="toggle-expand-button"
                            aria-expanded={isOutputExpanded}
                        >
                            {isOutputExpanded ? 'Collapse' : 'Expand'}
                        </button>
                    )}
                    <pre className={`code-block ${isLongOutput && !isOutputExpanded ? 'collapsed' : ''}`}>
                        <code>
                            {outputString}
                        </code>
                    </pre>
                </div>
            )}
            {status && <div className="tool-status">Status: <span className={`status-badge status-${status}`}>{status}</span></div>}
        </div>
    );
}

export default ToolCallItem;
