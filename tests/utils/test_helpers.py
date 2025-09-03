"""Test utilities and helper functions."""

import asyncio
import json
import uuid
import tempfile
import os
from datetime import datetime
from typing import Any, Dict, List, Optional
from unittest.mock import AsyncMock, MagicMock
import pytest


class MockUser:
    """Mock user for testing."""
    
    def __init__(self, user_id: str = None, email: str = None, user_type: str = "free"):
        self.id = user_id or f"user-{uuid.uuid4()}"
        self.email = email or f"test-{self.id}@example.com"
        self.name = f"Test User {self.id}"
        self.type = user_type
        self.is_active = True


class MockSession:
    """Mock session for testing."""
    
    def __init__(self, user: MockUser = None):
        self.user = user or MockUser()
        self.expires = "2024-12-31T23:59:59.999Z"


class MockChat:
    """Mock chat for testing."""
    
    def __init__(self, chat_id: str = None, user_id: str = None, title: str = None):
        self.id = chat_id or f"chat-{uuid.uuid4()}"
        self.userId = user_id or f"user-{uuid.uuid4()}"
        self.title = title or "Test Chat"
        self.visibility = "private"
        self.createdAt = datetime.now()
        self.updatedAt = datetime.now()


class MockMessage:
    """Mock message for testing."""
    
    def __init__(self, message_id: str = None, chat_id: str = None, content: str = None):
        self.id = message_id or f"msg-{uuid.uuid4()}"
        self.chatId = chat_id or f"chat-{uuid.uuid4()}"
        self.role = "user"
        self.parts = [{"type": "text", "text": content or "Test message"}]
        self.attachments = []
        self.createdAt = datetime.now()


class TestDataFactory:
    """Factory for creating test data."""
    
    @staticmethod
    def create_user_data(user_id: str = None, **kwargs) -> Dict[str, Any]:
        """Create user test data."""
        data = {
            "id": user_id or f"user-{uuid.uuid4()}",
            "email": f"test-{uuid.uuid4()}@example.com",
            "name": "Test User",
            "type": "free"
        }
        data.update(kwargs)
        return data
    
    @staticmethod
    def create_chat_data(chat_id: str = None, user_id: str = None, **kwargs) -> Dict[str, Any]:
        """Create chat test data."""
        data = {
            "id": chat_id or f"chat-{uuid.uuid4()}",
            "userId": user_id or f"user-{uuid.uuid4()}",
            "title": "Test Chat",
            "visibility": "private"
        }
        data.update(kwargs)
        return data
    
    @staticmethod
    def create_message_data(message_id: str = None, chat_id: str = None, content: str = None, **kwargs) -> Dict[str, Any]:
        """Create message test data."""
        data = {
            "id": message_id or f"msg-{uuid.uuid4()}",
            "chatId": chat_id or f"chat-{uuid.uuid4()}",
            "role": "user",
            "parts": [{"type": "text", "text": content or "Test message"}],
            "attachments": []
        }
        data.update(kwargs)
        return data
    
    @staticmethod
    def create_vana_request_data(chat_id: str = None, message_id: str = None, **kwargs) -> Dict[str, Any]:
        """Create Vana API request test data."""
        data = {
            "id": chat_id or f"chat-{uuid.uuid4()}",
            "message": {
                "id": message_id or f"msg-{uuid.uuid4()}",
                "role": "user",
                "parts": [{"type": "text", "text": "Test message for Vana"}]
            },
            "selectedVisibilityType": "private",
            "vanaOptions": {
                "agents": ["coder", "reviewer"],
                "model": "gemini-pro",
                "enableProgress": True
            }
        }
        data.update(kwargs)
        return data
    
    @staticmethod
    def create_vana_response_data(task_id: str = None, message_id: str = None, **kwargs) -> Dict[str, Any]:
        """Create Vana API response test data."""
        data = {
            "task_id": task_id or f"task-{uuid.uuid4()}",
            "message_id": message_id or f"msg-{uuid.uuid4()}",
            "status": "started",
            "chat_id": f"chat-{uuid.uuid4()}"
        }
        data.update(kwargs)
        return data


class MockEnvironment:
    """Mock environment variables for testing."""
    
    def __init__(self, env_vars: Dict[str, str] = None):
        self.env_vars = env_vars or {}
        self.original_env = {}
    
    def __enter__(self):
        """Set test environment variables."""
        for key, value in self.env_vars.items():
            self.original_env[key] = os.environ.get(key)
            os.environ[key] = value
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Restore original environment variables."""
        for key in self.env_vars:
            if self.original_env[key] is not None:
                os.environ[key] = self.original_env[key]
            elif key in os.environ:
                del os.environ[key]


class MockHTTPResponse:
    """Mock HTTP response for testing."""
    
    def __init__(self, json_data: Dict[str, Any] = None, status_code: int = 200, 
                 text: str = None, ok: bool = None):
        self.status_code = status_code
        self.status = status_code
        self.ok = ok if ok is not None else (200 <= status_code < 400)
        self._json_data = json_data or {}
        self._text = text or json.dumps(self._json_data)
        self.headers = {"content-type": "application/json"}
    
    async def json(self):
        """Return JSON data."""
        return self._json_data
    
    async def text(self):
        """Return text content."""
        return self._text


class AsyncContextManager:
    """Helper for async context manager testing."""
    
    def __init__(self, return_value):
        self.return_value = return_value
    
    async def __aenter__(self):
        return self.return_value
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


class MockDatabase:
    """Mock database for testing."""
    
    def __init__(self):
        self.users = {}
        self.chats = {}
        self.messages = {}
    
    async def save_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save user to mock database."""
        self.users[user_data["id"]] = user_data
        return user_data
    
    async def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user from mock database."""
        return self.users.get(user_id)
    
    async def save_chat(self, chat_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save chat to mock database."""
        self.chats[chat_data["id"]] = chat_data
        return chat_data
    
    async def get_chat(self, chat_id: str) -> Optional[Dict[str, Any]]:
        """Get chat from mock database."""
        return self.chats.get(chat_id)
    
    async def save_message(self, message_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save message to mock database."""
        self.messages[message_data["id"]] = message_data
        return message_data
    
    async def get_messages_by_chat(self, chat_id: str) -> List[Dict[str, Any]]:
        """Get messages by chat ID."""
        return [msg for msg in self.messages.values() if msg["chatId"] == chat_id]


def create_temp_file(content: str = "", suffix: str = ".tmp") -> str:
    """Create a temporary file with content."""
    with tempfile.NamedTemporaryFile(mode='w', suffix=suffix, delete=False) as f:
        f.write(content)
        return f.name


def cleanup_temp_file(filepath: str):
    """Clean up temporary file."""
    if os.path.exists(filepath):
        os.unlink(filepath)


async def wait_for_condition(condition_func, timeout: float = 5.0, interval: float = 0.1):
    """Wait for a condition to be true with timeout."""
    start_time = asyncio.get_event_loop().time()
    while asyncio.get_event_loop().time() - start_time < timeout:
        if await condition_func() if asyncio.iscoroutinefunction(condition_func) else condition_func():
            return True
        await asyncio.sleep(interval)
    return False


class TestFixtures:
    """Common test fixtures."""
    
    @staticmethod
    def mock_successful_fetch():
        """Mock successful fetch response."""
        mock = AsyncMock()
        mock.return_value = MockHTTPResponse({
            "task_id": f"task-{uuid.uuid4()}",
            "status": "started"
        })
        return mock
    
    @staticmethod
    def mock_failed_fetch(status_code: int = 500, error_message: str = "Internal Server Error"):
        """Mock failed fetch response."""
        mock = AsyncMock()
        mock.return_value = MockHTTPResponse(
            {"error": error_message}, 
            status_code=status_code,
            ok=False
        )
        return mock
    
    @staticmethod
    def mock_timeout_fetch():
        """Mock fetch that times out."""
        mock = AsyncMock()
        mock.side_effect = asyncio.TimeoutError("Request timeout")
        return mock
    
    @staticmethod
    def mock_network_error_fetch():
        """Mock fetch with network error."""
        mock = AsyncMock()
        mock.side_effect = Exception("Network error")
        return mock


class AssertionHelpers:
    """Helper functions for common assertions."""
    
    @staticmethod
    def assert_valid_uuid(uuid_string: str):
        """Assert string is a valid UUID."""
        try:
            uuid.UUID(uuid_string)
        except (ValueError, TypeError):
            pytest.fail(f"'{uuid_string}' is not a valid UUID")
    
    @staticmethod
    def assert_valid_timestamp(timestamp_string: str):
        """Assert string is a valid ISO timestamp."""
        try:
            datetime.fromisoformat(timestamp_string.replace('Z', '+00:00'))
        except ValueError:
            pytest.fail(f"'{timestamp_string}' is not a valid ISO timestamp")
    
    @staticmethod
    def assert_dict_contains(actual: Dict[str, Any], expected_subset: Dict[str, Any]):
        """Assert dictionary contains expected subset."""
        for key, value in expected_subset.items():
            assert key in actual, f"Key '{key}' not found in actual dictionary"
            assert actual[key] == value, f"Expected {key}={value}, got {key}={actual[key]}"
    
    @staticmethod
    def assert_response_structure(response_data: Dict[str, Any], required_fields: List[str]):
        """Assert response has required structure."""
        for field in required_fields:
            assert field in response_data, f"Required field '{field}' missing from response"
    
    @staticmethod
    def assert_http_success(status_code: int):
        """Assert HTTP status code indicates success."""
        assert 200 <= status_code < 300, f"Expected success status code, got {status_code}"
    
    @staticmethod
    def assert_http_error(status_code: int, expected_range: tuple = (400, 600)):
        """Assert HTTP status code indicates error."""
        min_code, max_code = expected_range
        assert min_code <= status_code < max_code, f"Expected error status code in range {expected_range}, got {status_code}"


# Pytest fixtures that can be used across tests
@pytest.fixture
def mock_user():
    """Fixture providing a mock user."""
    return MockUser()


@pytest.fixture
def mock_session(mock_user):
    """Fixture providing a mock session."""
    return MockSession(mock_user)


@pytest.fixture
def mock_database():
    """Fixture providing a mock database."""
    return MockDatabase()


@pytest.fixture
def test_data_factory():
    """Fixture providing the test data factory."""
    return TestDataFactory()


@pytest.fixture
def assertion_helpers():
    """Fixture providing assertion helpers."""
    return AssertionHelpers()


@pytest.fixture
def temp_file():
    """Fixture providing a temporary file."""
    temp_path = create_temp_file()
    yield temp_path
    cleanup_temp_file(temp_path)