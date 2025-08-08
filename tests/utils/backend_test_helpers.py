# Copyright 2025 Google LLC
# Licensed under the Apache License, Version 2.0 (the "License")

"""
Comprehensive Backend Test Utilities and Helpers
Complete set of utilities for testing the Vana backend components
"""

import json
import time
import uuid
import asyncio
import threading
import tempfile
import os
import sqlite3
from typing import Dict, Any, List, Optional, Callable, AsyncGenerator, Generator
from unittest.mock import Mock, MagicMock, patch, AsyncMock
from dataclasses import dataclass
from contextlib import asynccontextmanager, contextmanager
import pytest
from fastapi.testclient import TestClient
import requests
from requests.exceptions import RequestException, Timeout, ConnectionError

# Import app components
from app.server import app
from app.models import User, Session
from app.utils.typing import Feedback


# ================================
# Data Classes for Test Objects
# ================================

@dataclass
class TestUser:
    """Test user data class."""
    id: str
    email: str
    display_name: str
    is_guest: bool = False
    created_at: float = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = time.time()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "email": self.email,
            "display_name": self.display_name,
            "is_guest": self.is_guest,
            "created_at": self.created_at
        }


@dataclass 
class TestSession:
    """Test session data class."""
    id: str
    user_id: str
    created_at: float
    updated_at: float = None
    state: Dict[str, Any] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.updated_at is None:
            self.updated_at = self.created_at
        if self.state is None:
            self.state = {}
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "state": self.state,
            "metadata": self.metadata
        }


@dataclass
class TestADKEvent:
    """Test ADK event data class."""
    author: str
    content: Dict[str, Any]
    actions: List[Dict[str, Any]] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.actions is None:
            self.actions = []
        if self.metadata is None:
            self.metadata = {"timestamp": time.time()}
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "author": self.author,
            "content": self.content,
            "actions": self.actions,
            "metadata": self.metadata
        }


# ================================
# Test Data Generators
# ================================

def create_test_user(
    id: Optional[str] = None,
    email: Optional[str] = None,
    **kwargs
) -> TestUser:
    """Create a test user with default or provided values."""
    if id is None:
        id = f"user_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    if email is None:
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    
    return TestUser(
        id=id,
        email=email,
        display_name=f"Test User {id[-6:]}",
        **kwargs
    )


def create_test_session(
    user_id: str,
    id: Optional[str] = None,
    **kwargs
) -> TestSession:
    """Create a test session with default or provided values."""
    if id is None:
        id = f"session_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    
    return TestSession(
        id=id,
        user_id=user_id,
        created_at=time.time(),
        state={"step": "initialized", "progress": 0},
        metadata={"source": "test", "version": "1.0"},
        **kwargs
    )


def create_test_feedback(**kwargs) -> Feedback:
    """Create test feedback data."""
    return Feedback(
        score=kwargs.get("score", 4),
        invocation_id=kwargs.get("invocation_id", str(uuid.uuid4())),
        text=kwargs.get("text", "Test feedback message")
    )


def create_test_adk_event(
    author: str = "system",
    content: Optional[Dict[str, Any]] = None,
    **kwargs
) -> TestADKEvent:
    """Create a test ADK event."""
    if content is None:
        content = {"parts": [{"text": "Test ADK event message"}]}
    
    return TestADKEvent(
        author=author,
        content=content,
        **kwargs
    )


def generate_test_messages(count: int = 10) -> List[Dict[str, Any]]:
    """Generate a list of test messages."""
    messages = []
    authors = ["user", "assistant", "system"]
    
    for i in range(count):
        messages.append({
            "id": f"msg_{i}",
            "author": authors[i % len(authors)],
            "content": f"Test message {i + 1}",
            "timestamp": time.time() + i * 1000,
            "parts": [{"text": f"Test message {i + 1}"}]
        })
    
    return messages


def generate_large_dataset(size_mb: float = 1.0) -> List[Dict[str, Any]]:
    """Generate a large dataset for testing."""
    target_size = int(size_mb * 1024 * 1024)  # Convert to bytes
    item_size = 1000  # Approximate size per item
    item_count = target_size // item_size
    
    dataset = []
    for i in range(item_count):
        dataset.append({
            "id": f"item_{i}",
            "data": "x" * (item_size - 100),  # Fill to approximate size
            "index": i,
            "timestamp": time.time() + i
        })
    
    return dataset


# ================================
# Mock Utilities
# ================================

class MockGCSClient:
    """Mock Google Cloud Storage client."""
    
    def __init__(self):
        self.buckets = {}
    
    def bucket(self, bucket_name: str):
        if bucket_name not in self.buckets:
            self.buckets[bucket_name] = MockGCSBucket(bucket_name)
        return self.buckets[bucket_name]


class MockGCSBucket:
    """Mock GCS bucket."""
    
    def __init__(self, name: str):
        self.name = name
        self.blobs = {}
    
    def blob(self, blob_name: str):
        if blob_name not in self.blobs:
            self.blobs[blob_name] = MockGCSBlob(blob_name)
        return self.blobs[blob_name]
    
    def list_blobs(self, prefix: str = None):
        blobs = list(self.blobs.values())
        if prefix:
            blobs = [blob for blob in blobs if blob.name.startswith(prefix)]
        return blobs


class MockGCSBlob:
    """Mock GCS blob."""
    
    def __init__(self, name: str):
        self.name = name
        self.data = b""
        self.updated = time.time()
        self.size = 0
    
    def upload_from_filename(self, filename: str):
        try:
            with open(filename, 'rb') as f:
                self.data = f.read()
                self.size = len(self.data)
        except FileNotFoundError:
            # Create empty data if file doesn't exist
            self.data = b'{"mock": "data"}'
            self.size = len(self.data)
    
    def download_to_filename(self, filename: str):
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, 'wb') as f:
            f.write(self.data)


class MockEventSource:
    """Mock EventSource for SSE testing."""
    
    def __init__(self, url: str):
        self.url = url
        self.readyState = 1  # OPEN
        self.onopen = None
        self.onmessage = None
        self.onerror = None
        self.listeners = {}
        
        # Simulate connection opening
        if self.onopen:
            self.onopen(MockEvent("open"))
    
    def close(self):
        self.readyState = 2  # CLOSED
        if self.listeners.get("close"):
            for listener in self.listeners["close"]:
                listener(MockEvent("close"))
    
    def addEventListener(self, event_type: str, listener):
        if event_type not in self.listeners:
            self.listeners[event_type] = []
        self.listeners[event_type].append(listener)
    
    def removeEventListener(self, event_type: str, listener):
        if event_type in self.listeners:
            try:
                self.listeners[event_type].remove(listener)
            except ValueError:
                pass
    
    def simulate_message(self, data: Any, event_type: str = "message"):
        """Test utility to simulate receiving a message."""
        event = MockMessageEvent(data, event_type)
        
        if event_type == "message" and self.onmessage:
            self.onmessage(event)
        
        if event_type in self.listeners:
            for listener in self.listeners[event_type]:
                listener(event)
    
    def simulate_error(self):
        """Test utility to simulate an error."""
        event = MockEvent("error")
        
        if self.onerror:
            self.onerror(event)
        
        if "error" in self.listeners:
            for listener in self.listeners["error"]:
                listener(event)


class MockEvent:
    """Mock event object."""
    
    def __init__(self, event_type: str):
        self.type = event_type


class MockMessageEvent:
    """Mock message event object."""
    
    def __init__(self, data: Any, event_type: str = "message"):
        self.type = event_type
        self.data = json.dumps(data) if not isinstance(data, str) else data


# ================================
# Database Test Utilities
# ================================

@contextmanager
def create_test_database():
    """Create a temporary test database."""
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    
    try:
        conn = sqlite3.connect(db_path)
        yield conn, db_path
    finally:
        if conn:
            conn.close()
        if os.path.exists(db_path):
            os.unlink(db_path)


def setup_test_session_db(db_path: str, sessions: List[TestSession] = None):
    """Set up a test session database with optional test data."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            state TEXT,
            metadata TEXT
        )
    ''')
    
    # Insert test sessions if provided
    if sessions:
        for session in sessions:
            cursor.execute('''
                INSERT INTO sessions (id, user_id, created_at, updated_at, state, metadata)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                session.id,
                session.user_id,
                session.created_at,
                session.updated_at,
                json.dumps(session.state),
                json.dumps(session.metadata)
            ))
    
    conn.commit()
    conn.close()


# ================================
# Performance Testing Utilities  
# ================================

class PerformanceTimer:
    """Utility for measuring performance."""
    
    def __init__(self):
        self.start_time = None
        self.end_time = None
    
    def start(self):
        """Start timing."""
        self.start_time = time.time()
        return self
    
    def stop(self):
        """Stop timing."""
        self.end_time = time.time()
        return self
    
    @property
    def elapsed(self) -> float:
        """Get elapsed time in seconds."""
        if self.start_time is None:
            return 0.0
        end = self.end_time or time.time()
        return end - self.start_time
    
    @property
    def elapsed_ms(self) -> float:
        """Get elapsed time in milliseconds."""
        return self.elapsed * 1000


@contextmanager
def measure_time():
    """Context manager for measuring execution time."""
    timer = PerformanceTimer()
    timer.start()
    try:
        yield timer
    finally:
        timer.stop()


def measure_memory_usage():
    """Measure current memory usage."""
    try:
        import psutil
        process = psutil.Process()
        return process.memory_info().rss
    except ImportError:
        # Fallback if psutil not available
        return 0


class LoadTestRunner:
    """Utility for running load tests."""
    
    def __init__(self, client: TestClient):
        self.client = client
        self.results = []
    
    def run_concurrent_requests(
        self, 
        request_fn: Callable[[], Any], 
        num_requests: int = 10,
        timeout: float = 30.0
    ):
        """Run concurrent requests and collect results."""
        results = []
        threads = []
        
        def make_request(request_id: int):
            try:
                start_time = time.time()
                result = request_fn()
                end_time = time.time()
                
                results.append({
                    "request_id": request_id,
                    "success": True,
                    "result": result,
                    "response_time": end_time - start_time
                })
            except Exception as e:
                results.append({
                    "request_id": request_id,
                    "success": False,
                    "error": str(e),
                    "response_time": None
                })
        
        # Start threads
        for i in range(num_requests):
            thread = threading.Thread(target=make_request, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for completion
        for thread in threads:
            thread.join(timeout=timeout)
        
        self.results = results
        return results
    
    def get_success_rate(self) -> float:
        """Get success rate of requests."""
        if not self.results:
            return 0.0
        
        successful = sum(1 for r in self.results if r.get("success", False))
        return successful / len(self.results)
    
    def get_average_response_time(self) -> float:
        """Get average response time of successful requests."""
        successful_times = [
            r["response_time"] for r in self.results 
            if r.get("success", False) and r.get("response_time") is not None
        ]
        
        if not successful_times:
            return 0.0
        
        return sum(successful_times) / len(successful_times)


# ================================
# Error Simulation Utilities
# ================================

class NetworkErrorSimulator:
    """Utility for simulating various network error conditions."""
    
    @staticmethod
    def simulate_timeout():
        """Simulate a network timeout."""
        raise Timeout("Simulated network timeout")
    
    @staticmethod
    def simulate_connection_error():
        """Simulate a connection error."""
        raise ConnectionError("Simulated connection error")
    
    @staticmethod
    def simulate_intermittent_failure(failure_rate: float = 0.3):
        """Simulate intermittent failures."""
        import random
        if random.random() < failure_rate:
            raise ConnectionError("Simulated intermittent failure")
    
    @staticmethod
    def simulate_slow_response(delay_seconds: float = 2.0):
        """Simulate a slow network response."""
        time.sleep(delay_seconds)
        return {"status": "delayed_success", "delay": delay_seconds}


# ================================
# Test Environment Setup
# ================================

class TestEnvironment:
    """Complete test environment setup and teardown."""
    
    def __init__(self):
        self.temp_files = []
        self.mock_patches = []
        self.background_tasks = []
    
    def create_temp_file(self, suffix: str = None) -> str:
        """Create a temporary file and track it for cleanup."""
        fd, path = tempfile.mkstemp(suffix=suffix)
        os.close(fd)
        self.temp_files.append(path)
        return path
    
    def add_mock_patch(self, patch_target: str, mock_value: Any = None):
        """Add a mock patch and track it for cleanup."""
        if mock_value is None:
            mock_value = Mock()
        
        patcher = patch(patch_target, mock_value)
        mock_obj = patcher.start()
        self.mock_patches.append(patcher)
        return mock_obj
    
    def start_background_task(self, task_fn: Callable):
        """Start a background task and track it for cleanup."""
        task = threading.Thread(target=task_fn, daemon=True)
        task.start()
        self.background_tasks.append(task)
        return task
    
    def cleanup(self):
        """Clean up all resources."""
        # Stop mock patches
        for patcher in self.mock_patches:
            try:
                patcher.stop()
            except RuntimeError:
                pass  # Already stopped
        
        # Remove temporary files
        for temp_file in self.temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
            except OSError:
                pass  # File may already be deleted
        
        # Wait for background tasks (with timeout)
        for task in self.background_tasks:
            task.join(timeout=1.0)
        
        # Clear tracking lists
        self.mock_patches.clear()
        self.temp_files.clear()
        self.background_tasks.clear()


@contextmanager
def test_environment():
    """Context manager for complete test environment."""
    env = TestEnvironment()
    try:
        yield env
    finally:
        env.cleanup()


# ================================
# Test Assertion Helpers
# ================================

def assert_response_time_under(response_time: float, max_time: float, operation: str = "Operation"):
    """Assert that response time is under the specified maximum."""
    if response_time > max_time:
        raise AssertionError(
            f"{operation} took {response_time:.3f}s, expected under {max_time:.3f}s"
        )


def assert_memory_usage_reasonable(initial_memory: int, final_memory: int, max_increase_mb: float = 100):
    """Assert that memory usage increase is reasonable."""
    increase = final_memory - initial_memory
    max_increase_bytes = max_increase_mb * 1024 * 1024
    
    if increase > max_increase_bytes:
        raise AssertionError(
            f"Memory usage increased by {increase / (1024*1024):.1f}MB, "
            f"expected under {max_increase_mb}MB"
        )


def assert_eventually_true(
    condition_fn: Callable[[], bool], 
    timeout: float = 5.0,
    message: str = "Condition was not met within timeout"
):
    """Assert that a condition eventually becomes true."""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        if condition_fn():
            return
        time.sleep(0.1)
    
    raise AssertionError(f"{message} (timeout: {timeout}s)")


# ================================
# Integration Test Helpers
# ================================

@contextmanager
def temporary_server(app_instance=None, port: int = 8001):
    """Start a temporary server for integration testing."""
    import uvicorn
    import multiprocessing
    
    if app_instance is None:
        app_instance = app
    
    def run_server():
        uvicorn.run(app_instance, host="127.0.0.1", port=port, log_level="error")
    
    server_process = multiprocessing.Process(target=run_server)
    server_process.start()
    
    # Wait for server to start
    time.sleep(2)
    
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        server_process.terminate()
        server_process.join(timeout=5)


class IntegrationTestClient:
    """Enhanced test client for integration testing."""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or "http://127.0.0.1:8000"
        self.session = requests.Session()
    
    def post_json(self, endpoint: str, data: Dict[str, Any], **kwargs):
        """POST JSON data to an endpoint."""
        url = f"{self.base_url}{endpoint}"
        return self.session.post(url, json=data, **kwargs)
    
    def get(self, endpoint: str, **kwargs):
        """GET request to an endpoint."""
        url = f"{self.base_url}{endpoint}"
        return self.session.get(url, **kwargs)
    
    def stream_sse(self, endpoint: str, timeout: float = 10.0):
        """Stream SSE events from an endpoint."""
        url = f"{self.base_url}{endpoint}"
        events = []
        
        try:
            response = self.session.get(
                url, 
                stream=True, 
                timeout=timeout,
                headers={"Accept": "text/event-stream"}
            )
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        event_data = line_str[6:]  # Remove 'data: ' prefix
                        try:
                            event = json.loads(event_data)
                            events.append(event)
                        except json.JSONDecodeError:
                            events.append({"raw": event_data})
                            
        except (Timeout, RequestException):
            pass  # Timeout is expected for streaming endpoints
        
        return events


# ================================
# Export main utilities
# ================================

__all__ = [
    # Data classes
    'TestUser', 'TestSession', 'TestADKEvent',
    
    # Data generators
    'create_test_user', 'create_test_session', 'create_test_feedback',
    'create_test_adk_event', 'generate_test_messages', 'generate_large_dataset',
    
    # Mock utilities
    'MockGCSClient', 'MockGCSBucket', 'MockGCSBlob', 'MockEventSource',
    
    # Database utilities
    'create_test_database', 'setup_test_session_db',
    
    # Performance utilities
    'PerformanceTimer', 'measure_time', 'measure_memory_usage', 'LoadTestRunner',
    
    # Error simulation
    'NetworkErrorSimulator',
    
    # Environment setup
    'TestEnvironment', 'test_environment',
    
    # Assertion helpers
    'assert_response_time_under', 'assert_memory_usage_reasonable', 'assert_eventually_true',
    
    # Integration testing
    'temporary_server', 'IntegrationTestClient'
]