"""
Simple VANA Chat API Server for Testing

Provides basic chat functionality without authentication for testing the WebGUI.
"""

import os
import sys
import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import requests

# Add project root to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

app = Flask(__name__)
app.config['SECRET_KEY'] = 'vana-simple-chat-key'

# Enable CORS for frontend
CORS(app, origins=["http://localhost:3000", "http://localhost:3001"])

# Initialize SocketIO for real-time communication
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000", "http://localhost:3001"])

# VANA service configuration
VANA_SERVICE_URL = os.getenv('VANA_SERVICE_URL', 'https://vana-qqugqgsbcq-uc.a.run.app')

# In-memory storage for chat history
chat_history = {}

# Available agents based on VANA system
AVAILABLE_AGENTS = [
    {'id': 'vana', 'name': 'VANA Orchestrator', 'description': '🎯 Main AI Assistant with multi-agent coordination'},
    {'id': 'architecture_specialist', 'name': 'Architecture Specialist', 'description': '🏗️ System design and technical architecture'},
    {'id': 'ui_specialist', 'name': 'UI/UX Specialist', 'description': '🎨 Interface design and user experience'},
    {'id': 'devops_specialist', 'name': 'DevOps Specialist', 'description': '⚙️ Infrastructure and deployment management'},
    {'id': 'qa_specialist', 'name': 'QA Specialist', 'description': '🧪 Testing strategy and quality assurance'},
    {'id': 'travel_orchestrator', 'name': 'Travel Orchestrator', 'description': '✈️ Travel planning and booking coordination'},
    {'id': 'research_orchestrator', 'name': 'Research Orchestrator', 'description': '🔍 Information gathering and analysis'},
    {'id': 'development_orchestrator', 'name': 'Development Orchestrator', 'description': '💻 Software development coordination'}
]

# API Routes

@app.route('/api/agents', methods=['GET'])
def get_agents():
    """Get list of available agents."""
    return jsonify({'agents': AVAILABLE_AGENTS})

@app.route('/api/chat', methods=['POST'])
def send_message():
    """Send a message to VANA agent."""
    data = request.get_json()
    
    if not data or not data.get('message'):
        return jsonify({'error': 'Message required'}), 400
    
    session_id = data.get('sessionId') or str(uuid.uuid4())
    agent = data.get('agent', 'vana')
    message = data['message']
    
    # Store message in chat history
    if session_id not in chat_history:
        chat_history[session_id] = []
    
    user_message = {
        'id': str(uuid.uuid4()),
        'type': 'user',
        'content': message,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    chat_history[session_id].append(user_message)
    
    try:
        # Send message to VANA service
        response = requests.post(
            f'{VANA_SERVICE_URL}/chat',
            json={'message': message, 'agent': agent},
            timeout=30
        )
        
        if response.status_code == 200:
            agent_response = response.json()
            
            # Store agent response in chat history
            bot_message = {
                'id': str(uuid.uuid4()),
                'type': 'bot',
                'content': agent_response.get('response', 'No response'),
                'agent': agent,
                'timestamp': datetime.utcnow().isoformat(),
                'metadata': agent_response.get('metadata', {})
            }
            
            chat_history[session_id].append(bot_message)
            
            # Emit response via WebSocket
            socketio.emit('agent_response', {
                'message': bot_message['content'],
                'agent': agent,
                'metadata': bot_message['metadata'],
                'sessionId': session_id
            })
            
            return jsonify({
                'sessionId': session_id,
                'messageId': bot_message['id'],
                'status': 'sent',
                'response': bot_message['content']
            })
        else:
            error_message = f"VANA service error: {response.status_code}"
            
            # Store error in chat history
            error_response = {
                'id': str(uuid.uuid4()),
                'type': 'bot',
                'content': 'Sorry, I encountered an error. Please try again.',
                'agent': 'system',
                'timestamp': datetime.utcnow().isoformat(),
                'error': True
            }
            
            chat_history[session_id].append(error_response)
            
            # Emit error via WebSocket
            socketio.emit('agent_response', {
                'message': error_response['content'],
                'agent': 'system',
                'error': True,
                'sessionId': session_id
            })
            
            return jsonify({'error': error_message}), 500
            
    except requests.RequestException as e:
        error_message = f"Failed to connect to VANA service: {str(e)}"
        
        # Store error in chat history
        error_response = {
            'id': str(uuid.uuid4()),
            'type': 'bot',
            'content': 'Sorry, I cannot connect to the AI service right now. Please try again later.',
            'agent': 'system',
            'timestamp': datetime.utcnow().isoformat(),
            'error': True
        }
        
        chat_history[session_id].append(error_response)
        
        # Emit error via WebSocket
        socketio.emit('agent_response', {
            'message': error_response['content'],
            'agent': 'system',
            'error': True,
            'sessionId': session_id
        })
        
        return jsonify({'error': error_message}), 503

@app.route('/api/chat/history/<session_id>', methods=['GET'])
def get_chat_history(session_id):
    """Get chat history for a session."""
    history = chat_history.get(session_id, [])
    return jsonify({'messages': history})

@app.route('/api/chat/sessions', methods=['GET'])
def get_user_sessions():
    """Get all chat sessions."""
    user_sessions = []
    for session_id, messages in chat_history.items():
        if messages:
            last_message = messages[-1] if messages else None
            user_sessions.append({
                'sessionId': session_id,
                'lastMessage': last_message,
                'messageCount': len(messages),
                'createdAt': messages[0]['timestamp'] if messages else None
            })
    
    # Sort by last activity
    user_sessions.sort(key=lambda x: x['lastMessage']['timestamp'] if x['lastMessage'] else '', reverse=True)
    
    return jsonify({'sessions': user_sessions})

# WebSocket Events

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection."""
    emit('connected', {'status': 'connected'})
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection."""
    print('Client disconnected')

@socketio.on('join_session')
def handle_join_session(data):
    """Handle joining a chat session."""
    session_id = data.get('sessionId')
    if session_id:
        emit('session_joined', {'sessionId': session_id})

# Health Check

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'vana-simple-chat-api',
        'timestamp': datetime.utcnow().isoformat(),
        'vana_service': VANA_SERVICE_URL
    })

@app.route('/', methods=['GET'])
def index():
    """Index route."""
    return jsonify({
        'service': 'VANA Simple Chat API',
        'status': 'running',
        'endpoints': {
            'chat': '/api/chat',
            'agents': '/api/agents',
            'health': '/health'
        }
    })

if __name__ == '__main__':
    print("🚀 Starting VANA Simple Chat API Server...")
    print(f"📡 VANA Service: {VANA_SERVICE_URL}")
    print(f"🌐 API Server: http://localhost:5001")
    print("=" * 50)
    
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
