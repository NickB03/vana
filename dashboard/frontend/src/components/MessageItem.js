import React from 'react';
import './MessageItem.css'; // We'll need to create this CSS file later

function MessageItem({ message }) {
    const { text, sender } = message;

    // Determine the CSS class based on the sender
    // Allows for specific styling for user, agent, and system messages
    const messageClass = `message-item message-${sender}`;

    return (
        <div className={messageClass}>
            <div className="message-content">
                <p>{text}</p>
            </div>
            {/* Future enhancements: timestamp, avatar, sender name if not obvious */}
        </div>
    );
}

export default MessageItem;
