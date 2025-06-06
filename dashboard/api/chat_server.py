"""
VANA Chat API Server with Authentication and WebSocket Support

Provides comprehensive API for the VANA multi-agent platform including:
- Authentication (OAuth and local)
- Real-time chat with WebSocket support
- Agent orchestration
- Session management
"""

import os
import sys
import uuid
import jwt
import asyncio
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import hashlib

def simple_hash_password(password):
    """Simple password hashing using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()

def check_password(password, hashed):
    """Check password against hash."""
    return hashlib.sha256(password.encode()).hexdigest() == hashed
import requests
from functools import wraps

# Add project root to Python path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'vana-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')

# Enable CORS for frontend
CORS(app, origins=["http://localhost:3000", "http://localhost:3001"])

# Initialize SocketIO for real-time communication
socketio = SocketIO(app, cors_allowed_origins=["http://localhost:3000", "http://localhost:3001"])

# VANA service configuration
VANA_SERVICE_URL = os.getenv('VANA_SERVICE_URL', 'https://vana-qqugqgsbcq-uc.a.run.app')

# In-memory storage (replace with database in production)
users_db = {}
sessions_db = {}
chat_history = {}

def generate_token(user_id):
    """Generate JWT token for user authentication."""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    """Verify JWT token and return user ID."""
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# Global variable to store current user for request
current_user = None

def require_auth(f):
    """Decorator to require authentication for API endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        global current_user
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]  # Remove 'Bearer ' prefix
            user_id = verify_token(token)
            if user_id and user_id in users_db:
                current_user = users_db[user_id]
                return f(*args, **kwargs)

        return jsonify({'error': 'Authentication required'}), 401
    return decorated_function

# Authentication Routes

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user."""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    email = data['email'].lower()
    
    # Check if user already exists
    for user in users_db.values():
        if user['email'] == email:
            return jsonify({'error': 'User already exists'}), 400
    
    # Create new user
    user_id = str(uuid.uuid4())
    user = {
        'id': user_id,
        'email': email,
        'name': data.get('name', email.split('@')[0]),
        'password_hash': simple_hash_password(data['password']),
        'created_at': datetime.utcnow().isoformat(),
        'provider': 'local'
    }
    
    users_db[user_id] = user
    
    # Generate token
    token = generate_token(user_id)
    
    # Return user info (without password hash)
    user_info = {k: v for k, v in user.items() if k != 'password_hash'}
    
    return jsonify({
        'token': token,
        'user': user_info
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login with email and password."""
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    
    email = data['email'].lower()
    
    # Find user by email
    user = None
    for u in users_db.values():
        if u['email'] == email:
            user = u
            break
    
    if not user or not check_password(data['password'], user['password_hash']):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Generate token
    token = generate_token(user['id'])
    
    # Return user info (without password hash)
    user_info = {k: v for k, v in user.items() if k != 'password_hash'}
    
    return jsonify({
        'token': token,
        'user': user_info
    })

@app.route('/api/auth/me', methods=['GET'])
@require_auth
def get_current_user():
    """Get current user information."""
    user_info = {k: v for k, v in current_user.items() if k != 'password_hash'}
    return jsonify({'user': user_info})

@app.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    """Logout user (client should remove token)."""
    return jsonify({'message': 'Logged out successfully'})

# OAuth Routes (placeholder for future implementation)

@app.route('/api/auth/google')
def google_oauth():
    """Initiate Google OAuth flow."""
    # TODO: Implement Google OAuth
    return jsonify({'error': 'Google OAuth not implemented yet'}), 501

@app.route('/api/auth/github')
def github_oauth():
    """Initiate GitHub OAuth flow."""
    # TODO: Implement GitHub OAuth
    return jsonify({'error': 'GitHub OAuth not implemented yet'}), 501

# Chat API Routes

@app.route('/api/chat', methods=['POST'])
@require_auth
def send_message():
    """Send a message to VANA agent."""
    data = request.get_json()
    
    if not data or not data.get('message'):
        return jsonify({'error': 'Message required'}), 400
    
    user_id = current_user['id']
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
        'timestamp': datetime.utcnow().isoformat(),
        'user_id': user_id
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
            }, room=f'user_{user_id}')
            
            return jsonify({
                'sessionId': session_id,
                'messageId': bot_message['id'],
                'status': 'sent'
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
            }, room=f'user_{user_id}')
            
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
        }, room=f'user_{user_id}')
        
        return jsonify({'error': error_message}), 503

@app.route('/api/chat/history/<session_id>', methods=['GET'])
@require_auth
def get_chat_history(session_id):
    """Get chat history for a session."""
    user_id = request.current_user['id']
    
    # Verify user has access to this session
    history = chat_history.get(session_id, [])
    user_history = [msg for msg in history if msg.get('user_id') == user_id or msg['type'] == 'bot']
    
    return jsonify({'messages': user_history})

@app.route('/api/chat/sessions', methods=['GET'])
@require_auth
def get_user_sessions():
    """Get all chat sessions for the current user."""
    user_id = request.current_user['id']
    
    user_sessions = []
    for session_id, messages in chat_history.items():
        user_messages = [msg for msg in messages if msg.get('user_id') == user_id]
        if user_messages:
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
def handle_connect(auth):
    """Handle WebSocket connection."""
    # Verify authentication
    token = auth.get('token') if auth else None
    if token:
        user_id = verify_token(token)
        if user_id and user_id in users_db:
            join_room(f'user_{user_id}')
            emit('connected', {'status': 'authenticated'})
            return
    
    emit('connected', {'status': 'unauthenticated'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection."""
    print('Client disconnected')

# Health Check

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'vana-chat-api',
        'timestamp': datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    # Create a default admin user for development
    if not users_db:
        admin_id = str(uuid.uuid4())
        users_db[admin_id] = {
            'id': admin_id,
            'email': 'admin@vana.ai',
            'name': 'VANA Admin',
            'password_hash': generate_password_hash('admin123'),
            'created_at': datetime.utcnow().isoformat(),
            'provider': 'local'
        }
        print(f"Created default admin user: admin@vana.ai / admin123")
    
    socketio.run(app, host='0.0.0.0', port=5001, debug=True)
