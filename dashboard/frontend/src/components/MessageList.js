import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem'; // Will be created next
import './MessageList.css'; // We'll need to create this CSS file later

function MessageList({ messages }) {
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]); // Dependency array includes messages, so it runs when messages change

    if (!messages || messages.length === 0) {
        return <div className="message-list-empty">No messages yet. Start the conversation!</div>;
    }

    return (
        <div className="message-list-container">
            {messages.map((msg, index) => (
                // Using index as part of the key if message IDs are not guaranteed unique
                // across different types of messages (user, agent, system error)
                // Ideally, each message object should have a truly unique `id`.
                <MessageItem key={msg.id || `msg-${index}`} message={msg} />
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
}

export default MessageList;
