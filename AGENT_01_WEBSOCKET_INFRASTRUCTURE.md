# Agent 1: WebSocket Infrastructure Implementation

## 🎯 **MISSION**
Implement WebSocket infrastructure for real-time communication between the React frontend and Flask backend, enabling live chat updates and agent activity monitoring.

## 📋 **SCOPE & DELIVERABLES**

### **Primary Deliverables:**
1. **Flask-SocketIO Integration** - Add WebSocket support to existing Flask backend
2. **Event System Architecture** - Design event types for chat, agent activity, and monitoring
3. **Connection Management** - Handle client connections, authentication, and reconnection
4. **Message Broadcasting** - Real-time message delivery and agent status updates
5. **Error Handling** - Robust error handling and fallback mechanisms

### **Technical Requirements:**
- Integrate Flask-SocketIO with existing Flask app in `dashboard/api/server.py`
- Maintain compatibility with existing authentication system
- Support multiple concurrent client connections
- Implement event namespaces for different data types
- Add connection logging and monitoring

## 🏗️ **IMPLEMENTATION PLAN**

### **Step 1: Install Dependencies**
```bash
cd /Users/nick/Development/vana-enhanced
pip install flask-socketio eventlet
```

### **Step 2: Create WebSocket Module**
Create `dashboard/websocket/socket_manager.py`:
```python
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
import logging
from typing import Dict, Any, List
from datetime import datetime

class SocketManager:
    def __init__(self, app=None):
        self.socketio = None
        self.active_connections = {}
        self.rooms = {
            'chat': set(),
            'monitoring': set(),
            'admin': set()
        }
        
    def init_app(self, app):
        self.socketio = SocketIO(
            app,
            cors_allowed_origins="*",
            async_mode='eventlet',
            logger=True,
            engineio_logger=True
        )
        self._register_handlers()
        
    def _register_handlers(self):
        @self.socketio.on('connect')
        def handle_connect(auth):
            # Handle client connection with authentication
            pass
            
        @self.socketio.on('disconnect')
        def handle_disconnect():
            # Handle client disconnection
            pass
            
        @self.socketio.on('join_room')
        def handle_join_room(data):
            # Handle room joining for different data streams
            pass
            
        @self.socketio.on('chat_message')
        def handle_chat_message(data):
            # Handle incoming chat messages
            pass
```

### **Step 3: Integrate with Flask App**
Modify `dashboard/api/server.py`:
```python
from dashboard.websocket.socket_manager import SocketManager

# Add after app creation
socket_manager = SocketManager()
socket_manager.init_app(app)

# Add WebSocket routes
@app.route('/api/websocket/status')
def websocket_status():
    return jsonify({
        "status": "active",
        "connections": len(socket_manager.active_connections),
        "rooms": {k: len(v) for k, v in socket_manager.rooms.items()}
    })
```

### **Step 4: Event Types Definition**
Create `dashboard/websocket/events.py`:
```python
from enum import Enum
from dataclasses import dataclass
from typing import Any, Dict, Optional
from datetime import datetime

class EventType(Enum):
    # Chat Events
    CHAT_MESSAGE = "chat_message"
    CHAT_RESPONSE = "chat_response"
    TYPING_INDICATOR = "typing_indicator"
    
    # Agent Events
    AGENT_STARTED = "agent_started"
    AGENT_COMPLETED = "agent_completed"
    TOOL_EXECUTED = "tool_executed"
    AGENT_HANDOFF = "agent_handoff"
    
    # System Events
    HEALTH_UPDATE = "health_update"
    PERFORMANCE_UPDATE = "performance_update"
    ALERT_CREATED = "alert_created"
    
    # Connection Events
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"

@dataclass
class SocketEvent:
    event_type: EventType
    data: Dict[str, Any]
    timestamp: datetime
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    room: Optional[str] = None
```

### **Step 5: Real-time Broadcasting**
Create `dashboard/websocket/broadcaster.py`:
```python
class EventBroadcaster:
    def __init__(self, socket_manager):
        self.socket_manager = socket_manager
        
    def broadcast_chat_message(self, message: str, user_id: str, session_id: str):
        """Broadcast chat message to all clients in session."""
        event = SocketEvent(
            event_type=EventType.CHAT_MESSAGE,
            data={
                "message": message,
                "user_id": user_id,
                "timestamp": datetime.now().isoformat()
            },
            user_id=user_id,
            session_id=session_id,
            room="chat"
        )
        self._emit_to_room("chat", event)
        
    def broadcast_agent_activity(self, agent_name: str, activity: str, details: Dict[str, Any]):
        """Broadcast agent activity to monitoring clients."""
        event = SocketEvent(
            event_type=EventType.AGENT_STARTED if activity == "started" else EventType.AGENT_COMPLETED,
            data={
                "agent_name": agent_name,
                "activity": activity,
                "details": details,
                "timestamp": datetime.now().isoformat()
            },
            room="monitoring"
        )
        self._emit_to_room("monitoring", event)
        
    def _emit_to_room(self, room: str, event: SocketEvent):
        """Emit event to specific room."""
        self.socket_manager.socketio.emit(
            event.event_type.value,
            event.data,
            room=room
        )
```

### **Step 6: Authentication Integration**
Add authentication middleware for WebSocket connections:
```python
from dashboard.auth.dashboard_auth import DashboardAuth

def authenticate_socket_connection(auth_data):
    """Authenticate WebSocket connection using existing auth system."""
    if not auth_data:
        return False
        
    token = auth_data.get('token')
    if not token:
        return False
        
    auth = DashboardAuth()
    token_data = auth.validate_token(token)
    return token_data is not None
```

### **Step 7: Testing & Validation**
Create `tests/websocket/test_socket_manager.py`:
```python
import pytest
from dashboard.websocket.socket_manager import SocketManager
from dashboard.api.server import app

def test_websocket_connection():
    """Test WebSocket connection establishment."""
    socket_manager = SocketManager()
    socket_manager.init_app(app)
    
    # Test connection logic
    assert socket_manager.socketio is not None
    
def test_event_broadcasting():
    """Test event broadcasting functionality."""
    # Test event emission and room management
    pass
```

## 🔧 **CONFIGURATION**

### **Environment Variables**
Add to `.env`:
```
WEBSOCKET_ENABLED=true
WEBSOCKET_CORS_ORIGINS=http://localhost:3000,http://localhost:3001
WEBSOCKET_ASYNC_MODE=eventlet
```

### **Requirements Update**
Add to `requirements.txt`:
```
flask-socketio==5.3.6
eventlet==0.33.3
```

## ✅ **SUCCESS CRITERIA**

1. **WebSocket Server Running** - Flask-SocketIO integrated and operational
2. **Client Connection Handling** - Multiple clients can connect/disconnect
3. **Authentication Working** - WebSocket connections authenticated via existing system
4. **Event Broadcasting** - Real-time events broadcast to appropriate rooms
5. **Error Handling** - Robust error handling and logging
6. **Performance** - Low latency (<100ms) for message delivery
7. **Tests Passing** - All WebSocket tests pass

## 📝 **DELIVERABLE FILES**

1. `dashboard/websocket/socket_manager.py` - Main WebSocket manager
2. `dashboard/websocket/events.py` - Event type definitions
3. `dashboard/websocket/broadcaster.py` - Event broadcasting system
4. `dashboard/websocket/__init__.py` - Module initialization
5. `tests/websocket/test_socket_manager.py` - WebSocket tests
6. Updated `dashboard/api/server.py` - Flask-SocketIO integration
7. Updated `requirements.txt` - New dependencies

## 🚀 **DEPLOYMENT NOTES**

- WebSocket server will run on same port as Flask API (5050)
- Supports both HTTP and WebSocket protocols
- Compatible with existing authentication system
- Scalable to multiple concurrent connections
- Ready for production deployment

**Branch**: Create `feat/websocket-infrastructure`
**PR Title**: "Add WebSocket Infrastructure for Real-time Communication"
