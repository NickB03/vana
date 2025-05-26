import React, { useState } from 'react';
import './MessageInput.css'; // We'll need to create this CSS file later

function MessageInput({ onSendMessage, isLoading }) {
    const [inputText, setInputText] = useState('');

    const handleChange = (e) => {
        setInputText(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault(); // Prevent default form submission if wrapped in a form
        if (!inputText.trim() || isLoading) {
            return; // Don't send empty messages or when loading
        }
        onSendMessage(inputText);
        setInputText(''); // Clear input after sending
    };

    return (
        <form onSubmit={handleSubmit} className="message-input-form">
            <input
                type="text"
                className="message-input-field"
                value={inputText}
                onChange={handleChange}
                placeholder="Type your message..."
                disabled={isLoading}
                aria-label="Message input"
            />
            <button 
                type="submit" 
                className="message-send-button" 
                disabled={isLoading}
                aria-label="Send message"
            >
                {isLoading ? 'Sending...' : 'Send'}
            </button>
        </form>
    );
}

export default MessageInput;
