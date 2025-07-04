// VANA Web UI - Client-side JavaScript
// Handles WebSocket communication and UI interactions

class VANAWebUI {
    constructor() {
        this.ws = null;
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.agentStatus = document.getElementById('agentStatus');
        
        // Advanced UI elements
        this.teamLogContent = document.getElementById('teamLogContent');
        this.taskPlanContent = document.getElementById('taskPlanContent');
        this.canvasPreview = document.getElementById('canvasPreview');
        this.canvasCode = document.getElementById('canvasCode');
        this.canvasCodeContent = document.getElementById('canvasCodeContent');
        
        this.isConnected = false;
        this.isTyping = false;
        this.currentAssistantMessage = null;
        this.isFirstMessage = true;
        this.agentColors = {};
        this.colorPalette = ['#89b3f7', '#c58af9', '#fb923c', '#f28b82', '#34a853', '#fbbc04'];
        this.colorIndex = 0;
        this.rawCanvasContent = '';
        
        this.init();
    }
    
    init() {
        this.connectWebSocket();
        this.setupEventListeners();
        this.adjustTextareaHeight();
    }
    
    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.updateConnectionStatus('Connected', true);
                this.updateAgentStatus('Ready', 'success');
            };
            
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.isConnected = false;
                this.updateConnectionStatus('Disconnected', false);
                this.updateAgentStatus('Offline', 'error');
                
                // Attempt to reconnect after 3 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        this.connectWebSocket();
                    }
                }, 3000);
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus('Error', false);
            };
            
        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.updateConnectionStatus('Connection Failed', false);
        }
    }
    
    setupEventListeners() {
        // Send button click
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Enter key to send message
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
        });
        
        // Canvas view toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                const view = e.target.dataset.view;
                if (view === 'code') {
                    this.canvasPreview.parentElement.classList.add('hidden');
                    this.canvasCode.parentElement.classList.remove('hidden');
                } else {
                    this.canvasPreview.parentElement.classList.remove('hidden');
                    this.canvasCode.parentElement.classList.add('hidden');
                }
            });
        });
        
        // Focus on input when page loads
        this.messageInput.focus();
    }
    
    adjustTextareaHeight() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }
    
    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || !this.isConnected || this.isTyping) {
            return;
        }
        
        // Add user message to chat
        this.addMessage('user', message);
        
        // Reset advanced UI for new task
        this.resetAdvancedUI();
        
        // Send message via WebSocket
        this.ws.send(JSON.stringify({
            message: message
        }));
        
        // Clear input and reset height
        this.messageInput.value = '';
        this.adjustTextareaHeight();
        this.messageInput.focus();
        
        // Disable send button while processing
        this.sendButton.disabled = true;
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'user_message_received':
                // Message acknowledged by server
                break;
                
            case 'agent_typing':
                this.showTypingIndicator(data.message);
                this.updateAgentStatus('Thinking', 'warning');
                break;
                
            case 'agent_response_start':
                this.hideTypingIndicator();
                this.currentAssistantMessage = this.addMessage('assistant', '', data.agent);
                break;
                
            case 'agent_response_chunk':
                if (this.currentAssistantMessage) {
                    this.updateMessageContent(this.currentAssistantMessage, data.full_content);
                }
                break;
                
            case 'agent_response_complete':
                this.hideTypingIndicator();
                if (this.currentAssistantMessage) {
                    this.updateMessageContent(this.currentAssistantMessage, data.content);
                    this.addTimestamp(this.currentAssistantMessage, data.timestamp);
                }
                this.currentAssistantMessage = null;
                this.sendButton.disabled = false;
                this.updateAgentStatus('Ready', 'success');
                break;
                
            case 'error':
                this.hideTypingIndicator();
                this.addMessage('assistant', `Error: ${data.message}`, 'System');
                this.sendButton.disabled = false;
                this.updateAgentStatus('Error', 'error');
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }
    
    addMessage(role, content, agent = null) {
        // Remove welcome message if it exists
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (role === 'assistant' && agent) {
            const agentDiv = document.createElement('div');
            agentDiv.className = 'message-agent';
            agentDiv.textContent = agent;
            messageContent.appendChild(agentDiv);
        }
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = content;
        messageContent.appendChild(messageText);
        
        messageDiv.appendChild(messageContent);
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.scrollToBottom();
        
        return messageDiv;
    }
    
    updateMessageContent(messageElement, content) {
        const messageText = messageElement.querySelector('.message-text');
        if (messageText) {
            messageText.textContent = content;
            this.scrollToBottom();
        }
    }
    
    addTimestamp(messageElement, timestamp) {
        const messageContent = messageElement.querySelector('.message-content');
        if (messageContent) {
            const timestampDiv = document.createElement('div');
            timestampDiv.className = 'message-timestamp';
            const date = new Date(timestamp);
            timestampDiv.textContent = date.toLocaleTimeString();
            messageContent.appendChild(timestampDiv);
        }
    }
    
    showTypingIndicator(message) {
        this.isTyping = true;
        const typingText = this.typingIndicator.querySelector('.typing-text');
        if (typingText) {
            typingText.textContent = message || 'VANA is thinking...';
        }
        this.typingIndicator.style.display = 'flex';
    }
    
    hideTypingIndicator() {
        this.isTyping = false;
        this.typingIndicator.style.display = 'none';
    }
    
    updateConnectionStatus(status, isConnected) {
        const statusText = this.statusIndicator.querySelector('span');
        const statusDot = this.statusIndicator.querySelector('.status-dot');
        
        if (statusText) {
            statusText.textContent = status;
        }
        
        if (statusDot) {
            statusDot.style.backgroundColor = isConnected ? 'var(--success-color)' : 'var(--error-color)';
        }
    }
    
    updateAgentStatus(status, type) {
        const agentBadge = this.agentStatus.querySelector('.agent-badge');
        if (agentBadge) {
            agentBadge.textContent = status;
            
            // Update badge color based on type
            switch (type) {
                case 'success':
                    agentBadge.style.backgroundColor = 'var(--success-color)';
                    break;
                case 'warning':
                    agentBadge.style.backgroundColor = 'var(--warning-color)';
                    break;
                case 'error':
                    agentBadge.style.backgroundColor = 'var(--error-color)';
                    break;
                default:
                    agentBadge.style.backgroundColor = 'var(--success-color)';
            }
        }
    }
    
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
}

// Global functions for HTML onclick handlers
function sendMessage() {
    if (window.vanaUI) {
        window.vanaUI.sendMessage();
    }
}

function handleKeyDown(event) {
    if (window.vanaUI) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            window.vanaUI.sendMessage();
        }
    }
}

async function copyCanvasContent() {
    if (window.vanaUI && window.vanaUI.rawCanvasContent) {
        try {
            await navigator.clipboard.writeText(window.vanaUI.rawCanvasContent);
            // Visual feedback could be added here
        } catch (err) {
            console.error('Failed to copy content:', err);
        }
    }
}

async function clearConversation() {
    try {
        const response = await fetch('/api/clear', { method: 'POST' });
        if (response.ok) {
            // Reset the UI instead of full reload
            if (window.vanaUI) {
                window.vanaUI.isFirstMessage = true;
                window.vanaUI.chatMessages.innerHTML = `
                    <div class="welcome-message">
                        <div class="welcome-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                            </svg>
                        </div>
                        <h2>Welcome to VANA</h2>
                        <p>Ask for a high-level goal to see the agents work in the Team Log and Task Plan.</p>
                    </div>
                `;
                window.vanaUI.resetAdvancedUI();
            }
        }
    } catch (error) {
        console.error('Failed to clear conversation:', error);
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.vanaUI = new VANAWebUI();
});
