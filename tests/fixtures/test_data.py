"""Test data fixtures and constants."""

import json
import uuid
from datetime import datetime
from typing import Any, Dict, List


# Sample User Data
SAMPLE_USERS = {
    "free_user": {
        "id": "user-free-12345",
        "email": "free.user@example.com",
        "name": "Free User",
        "type": "free"
    },
    "premium_user": {
        "id": "user-premium-67890",
        "email": "premium.user@example.com", 
        "name": "Premium User",
        "type": "premium"
    },
    "admin_user": {
        "id": "user-admin-11111",
        "email": "admin@example.com",
        "name": "Admin User",
        "type": "admin"
    }
}

# Sample Chat Data
SAMPLE_CHATS = {
    "basic_chat": {
        "id": "chat-basic-12345",
        "userId": "user-free-12345",
        "title": "Basic Test Chat",
        "visibility": "private",
        "createdAt": "2024-01-01T12:00:00Z",
        "updatedAt": "2024-01-01T12:00:00Z"
    },
    "shared_chat": {
        "id": "chat-shared-67890", 
        "userId": "user-premium-67890",
        "title": "Shared Test Chat",
        "visibility": "public",
        "createdAt": "2024-01-01T12:00:00Z",
        "updatedAt": "2024-01-01T12:00:00Z"
    }
}

# Sample Message Data
SAMPLE_MESSAGES = {
    "simple_text": {
        "id": "msg-simple-12345",
        "chatId": "chat-basic-12345", 
        "role": "user",
        "parts": [{"type": "text", "text": "Hello, can you help me?"}],
        "attachments": [],
        "createdAt": "2024-01-01T12:00:00Z"
    },
    "complex_text": {
        "id": "msg-complex-67890",
        "chatId": "chat-basic-12345",
        "role": "user", 
        "parts": [
            {"type": "text", "text": "I need help with "},
            {"type": "text", "text": "multiple parts of text"}
        ],
        "attachments": [],
        "createdAt": "2024-01-01T12:05:00Z"
    },
    "assistant_response": {
        "id": "msg-assistant-11111",
        "chatId": "chat-basic-12345",
        "role": "assistant",
        "parts": [{"type": "text", "text": "I'd be happy to help you with that!"}],
        "attachments": [],
        "createdAt": "2024-01-01T12:01:00Z"
    }
}

# Sample API Request Bodies
SAMPLE_CHAT_REQUESTS = {
    "basic_request": {
        "id": "chat-test-12345",
        "message": {
            "id": "msg-test-12345",
            "role": "user",
            "parts": [{"type": "text", "text": "Test message"}]
        },
        "selectedChatModel": "gemini-pro",
        "selectedVisibilityType": "private"
    },
    "vana_request": {
        "id": "chat-vana-12345", 
        "message": {
            "id": "msg-vana-12345",
            "role": "user",
            "parts": [{"type": "text", "text": "Hello Vana!"}]
        },
        "selectedVisibilityType": "private",
        "vanaOptions": {
            "agents": ["coder", "reviewer"],
            "model": "gemini-pro", 
            "enableProgress": True
        }
    }
}

# Sample API Responses
SAMPLE_RESPONSES = {
    "vana_backend_success": {
        "task_id": "vana-task-12345",
        "message_id": "msg-vana-12345",
        "status": "started",
        "chat_id": "chat-vana-12345"
    },
    "vana_frontend_success": {
        "task_id": "vana-task-12345",
        "message_id": "msg-vana-12345", 
        "status": "started",
        "stream_url": "/api/chat/vana/chat-vana-12345/stream?task_id=vana-task-12345"
    },
    "health_check": {
        "status": "healthy",
        "timestamp": "2024-01-01T12:00:00Z",
        "service": "vana",
        "version": "1.0.0",
        "session_storage_enabled": True,
        "session_storage_uri": "sqlite:///tmp/vana_sessions.db",
        "session_storage_bucket": "test-project-vana-session-storage"
    }
}

# Sample Environment Variables
SAMPLE_ENVIRONMENTS = {
    "production": {
        "GOOGLE_CLOUD_PROJECT": "prod-project-12345",
        "VANA_BASE_URL": "https://api.vana.com",
        "ALLOW_ORIGINS": "https://app.vana.com,https://dashboard.vana.com",
        "SESSION_DB_URI": "postgresql://prod-db/sessions",
        "REQUIRE_SSE_AUTH": "true"
    },
    "staging": {
        "GOOGLE_CLOUD_PROJECT": "staging-project-67890", 
        "VANA_BASE_URL": "https://staging-api.vana.com",
        "ALLOW_ORIGINS": "https://staging.vana.com",
        "SESSION_DB_URI": "postgresql://staging-db/sessions",
        "REQUIRE_SSE_AUTH": "false"
    },
    "development": {
        "GOOGLE_CLOUD_PROJECT": "dev-project-11111",
        "VANA_BASE_URL": "http://localhost:8000", 
        "ALLOW_ORIGINS": "http://localhost:3000,http://127.0.0.1:3000",
        "REQUIRE_SSE_AUTH": "false"
    },
    "ci": {
        "CI": "true",
        "GOOGLE_CLOUD_PROJECT": "ci-project-99999",
        "REQUIRE_SSE_AUTH": "false"
    }
}

# Sample Error Responses
SAMPLE_ERRORS = {
    "unauthorized": {
        "error": "unauthorized",
        "message": "Authentication required",
        "status": 401
    },
    "forbidden": {
        "error": "forbidden", 
        "message": "Access denied",
        "status": 403
    },
    "bad_request": {
        "error": "bad_request",
        "message": "Invalid request format",
        "status": 400
    },
    "vana_unavailable": {
        "error": "vana_unavailable",
        "message": "Vana backend is currently unavailable",
        "fallback_to_vercel": True,
        "status": 503
    },
    "internal_error": {
        "error": "internal_server_error",
        "message": "An unexpected error occurred", 
        "status": 500
    }
}

# Sample SSE Events
SAMPLE_SSE_EVENTS = {
    "connection": {
        "type": "connection",
        "status": "connected",
        "sessionId": "session-12345",
        "timestamp": "2024-01-01T12:00:00Z",
        "authenticated": True,
        "userId": "user-12345"
    },
    "agent_start": {
        "type": "agent_start",
        "agentId": "agent-coder-123",
        "agentType": "coder",
        "sessionId": "session-12345",
        "timestamp": "2024-01-01T12:00:30Z",
        "taskId": "task-12345"
    },
    "agent_progress": {
        "type": "agent_progress", 
        "agentId": "agent-coder-123",
        "progress": 0.5,
        "message": "Processing code analysis...",
        "sessionId": "session-12345",
        "timestamp": "2024-01-01T12:01:00Z"
    },
    "agent_complete": {
        "type": "agent_complete",
        "agentId": "agent-coder-123", 
        "result": {"status": "success", "output": "Analysis complete"},
        "sessionId": "session-12345",
        "timestamp": "2024-01-01T12:02:00Z"
    },
    "heartbeat": {
        "type": "heartbeat",
        "timestamp": "2024-01-01T12:00:00Z"
    },
    "error": {
        "type": "error",
        "message": "Connection error",
        "timestamp": "2024-01-01T12:00:00Z"
    }
}

# Test Configuration Constants
TEST_CONSTANTS = {
    "DEFAULT_TIMEOUT": 30,
    "SSE_TIMEOUT": 5,
    "MAX_MESSAGE_LENGTH": 10000,
    "MAX_CONCURRENT_REQUESTS": 10,
    "DEFAULT_MODEL": "gemini-pro",
    "DEFAULT_VISIBILITY": "private",
    "BACKEND_BASE_URL": "http://localhost:8000",
    "FRONTEND_BASE_URL": "http://localhost:3000"
}

# Database Test Data
DATABASE_TEST_DATA = {
    "users": list(SAMPLE_USERS.values()),
    "chats": list(SAMPLE_CHATS.values()),
    "messages": list(SAMPLE_MESSAGES.values())
}


def generate_test_data(data_type: str, count: int = 1, **kwargs) -> List[Dict[str, Any]]:
    """Generate test data of specified type."""
    data_list = []
    
    for i in range(count):
        if data_type == "user":
            data = {
                "id": f"test-user-{uuid.uuid4()}",
                "email": f"test{i}@example.com",
                "name": f"Test User {i}",
                "type": "free"
            }
        elif data_type == "chat":
            data = {
                "id": f"test-chat-{uuid.uuid4()}",
                "userId": f"test-user-{uuid.uuid4()}",
                "title": f"Test Chat {i}",
                "visibility": "private",
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat()
            }
        elif data_type == "message":
            data = {
                "id": f"test-msg-{uuid.uuid4()}",
                "chatId": f"test-chat-{uuid.uuid4()}",
                "role": "user",
                "parts": [{"type": "text", "text": f"Test message {i}"}],
                "attachments": [],
                "createdAt": datetime.now().isoformat()
            }
        else:
            raise ValueError(f"Unknown data type: {data_type}")
        
        # Apply any custom overrides
        data.update(kwargs)
        data_list.append(data)
    
    return data_list


def get_sample_data(category: str, key: str = None) -> Any:
    """Get sample data by category and optional key."""
    samples = {
        "users": SAMPLE_USERS,
        "chats": SAMPLE_CHATS, 
        "messages": SAMPLE_MESSAGES,
        "requests": SAMPLE_CHAT_REQUESTS,
        "responses": SAMPLE_RESPONSES,
        "environments": SAMPLE_ENVIRONMENTS,
        "errors": SAMPLE_ERRORS,
        "sse_events": SAMPLE_SSE_EVENTS,
        "constants": TEST_CONSTANTS
    }
    
    if category not in samples:
        raise ValueError(f"Unknown sample category: {category}")
    
    category_data = samples[category]
    
    if key is None:
        return category_data
    
    if key not in category_data:
        raise ValueError(f"Unknown key '{key}' in category '{category}'")
    
    return category_data[key]


def load_test_data_from_file(filepath: str) -> Dict[str, Any]:
    """Load test data from JSON file."""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        raise FileNotFoundError(f"Test data file not found: {filepath}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in test data file {filepath}: {e}")


def save_test_data_to_file(data: Dict[str, Any], filepath: str):
    """Save test data to JSON file.""" 
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2, default=str)