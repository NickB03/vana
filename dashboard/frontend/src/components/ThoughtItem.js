import React from 'react';
import './ThoughtItem.css'; // We'll need to create this CSS file later

function ThoughtItem({ text, logLevel }) {
    // Default to 'info' if logLevel is not provided or is an unrecognized value
    const level = logLevel || 'info'; 
    const itemClass = `thought-item log-level-${level}`;

    return (
        <div className={itemClass}>
            <p className="thought-text">{text}</p>
            {/* 
                Optionally, display logLevel as a badge or prefix, 
                though class-based styling might be sufficient.
                Example: {logLevel && <span className="log-level-badge">{logLevel}</span>} 
            */}
        </div>
    );
}

export default ThoughtItem;
