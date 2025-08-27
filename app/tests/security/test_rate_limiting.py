"""Rate Limiting Security Tests

Tests for rate limiting functionality, DDoS protection, and abuse prevention.
"""

import asyncio
import pytest
import time
from collections import defaultdict
from unittest.mock import Mock, patch, AsyncMock
from fastapi import FastAPI, Request, status
from fastapi.testclient import TestClient
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.auth.middleware import RateLimitMiddleware


class TestRateLimitMiddleware:
    """Test rate limiting middleware functionality."""

    def setup_method(self):
        """Set up test fixtures."""
        self.app = FastAPI()
        self.rate_limiter = RateLimitMiddleware(
            self.app,
            calls=10,  # 10 calls
            period=60  # per 60 seconds
        )
        
        # Add test endpoint
        @self.app.get("/auth/login")
        async def test_endpoint():
            return {"message": "success"}
        
        @self.app.get("/api/data")
        async def api_endpoint():
            return {"data": "value"}
        
        self.client = TestClient(self.app)

    def test_allows_requests_under_limit(self):
        """Test that requests under the rate limit are allowed."""
        # Make requests under the limit
        for i in range(5):
            response = self.client.get("/auth/login")
            assert response.status_code == 200
            assert response.json() == {"message": "success"}

    def test_blocks_requests_over_limit(self):
        """Test that requests over the rate limit are blocked."""
        # Make requests up to the limit
        for i in range(10):
            response = self.client.get("/auth/login")
            assert response.status_code == 200
        
        # Next request should be blocked
        response = self.client.get("/auth/login")
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert "Rate limit exceeded" in response.json()["detail"]
        assert "retry_after" in response.json()

    def test_only_applies_to_auth_endpoints(self):
        """Test that rate limiting only applies to auth endpoints."""
        # Make many requests to non-auth endpoint
        for i in range(15):
            response = self.client.get("/api/data")
            assert response.status_code == 200
        
        # Should still be able to make auth requests
        response = self.client.get("/auth/login")
        assert response.status_code == 200

    def test_different_ips_have_separate_limits(self):
        """Test that different IP addresses have separate rate limits."""
        # Mock different IP addresses
        with patch.object(self.rate_limiter, 'get_client_ip') as mock_get_ip:
            # First IP makes requests up to limit
            mock_get_ip.return_value = '192.168.1.1'
            for i in range(10):
                response = self.client.get("/auth/login")
                assert response.status_code == 200
            
            # Should be blocked
            response = self.client.get("/auth/login")
            assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
            
            # Second IP should still be allowed
            mock_get_ip.return_value = '192.168.1.2'
            response = self.client.get("/auth/login")
            assert response.status_code == 200

    def test_rate_limit_window_expiry(self):
        """Test that rate limit window expires correctly."""
        with patch('time.time') as mock_time:
            # Start at time 0
            mock_time.return_value = 0
            
            # Make requests up to limit
            for i in range(10):
                response = self.client.get("/auth/login")
                assert response.status_code == 200
            
            # Should be blocked
            response = self.client.get("/auth/login")
            assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
            
            # Advance time beyond rate limit window
            mock_time.return_value = 61  # 61 seconds later
            
            # Should be allowed again
            response = self.client.get("/auth/login")
            assert response.status_code == 200

    def test_handles_malformed_headers(self):
        """Test handling of malformed or malicious headers."""
        malicious_headers = [
            {'X-Forwarded-For': 'attacker.com\r\nX-Injected: malicious'},
            {'X-Real-IP': '127.0.0.1\n<script>alert(1)</script>'},
            {'X-Forwarded-For': '\x00\x01\x02\x03'},
            {'X-Real-IP': 'very.long.hostname.that.might.cause.buffer.overflow' * 100}
        ]
        
        for headers in malicious_headers:
            response = self.client.get("/auth/login", headers=headers)
            # Should not crash and should handle gracefully
            assert response.status_code in [200, 429]

    def test_ip_extraction_priority(self):
        """Test IP address extraction priority and security."""
        test_cases = [
            # X-Forwarded-For takes priority
            {
                'headers': {
                    'X-Forwarded-For': '192.168.1.100, 10.0.0.1',
                    'X-Real-IP': '172.16.0.1'
                },
                'expected_ip': '192.168.1.100'  # First in X-Forwarded-For
            },
            # X-Real-IP when no X-Forwarded-For
            {
                'headers': {
                    'X-Real-IP': '172.16.0.1'
                },
                'expected_ip': '172.16.0.1'
            },
            # Handles IPv6
            {
                'headers': {
                    'X-Forwarded-For': '2001:db8::1'
                },
                'expected_ip': '2001:db8::1'
            }
        ]
        
        for case in test_cases:
            mock_request = Mock()
            mock_request.headers.get.side_effect = lambda key: case['headers'].get(key)
            mock_request.client.host = '127.0.0.1'
            
            ip = self.rate_limiter.get_client_ip(mock_request)
            assert ip == case['expected_ip']

    def test_prevents_ip_spoofing(self):
        """Test prevention of IP spoofing attacks."""
        # Test various IP spoofing attempts
        spoofed_ips = [
            '127.0.0.1',  # localhost
            '0.0.0.0',    # any address
            '255.255.255.255',  # broadcast
            '192.168.1.1/32',  # CIDR notation
            'localhost',  # hostname
            '../../etc/passwd',  # path traversal
            '<script>alert(1)</script>',  # XSS
        ]
        
        for spoofed_ip in spoofed_ips:
            headers = {'X-Forwarded-For': spoofed_ip}
            
            # Make requests up to limit
            for i in range(10):
                response = self.client.get("/auth/login", headers=headers)
                assert response.status_code == 200
            
            # Should still be rate limited
            response = self.client.get("/auth/login", headers=headers)
            assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_concurrent_requests_handling(self):
        """Test handling of concurrent requests from same IP."""
        import threading
        import queue
        
        results = queue.Queue()
        
        def make_request():
            response = self.client.get("/auth/login")
            results.put(response.status_code)
        
        # Launch concurrent requests
        threads = []
        for i in range(20):  # More than the rate limit
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()
        
        # Wait for all requests to complete
        for thread in threads:
            thread.join()
        
        # Collect results
        status_codes = []
        while not results.empty():
            status_codes.append(results.get())
        
        # Should have some successful and some rate-limited
        success_count = status_codes.count(200)
        rate_limited_count = status_codes.count(429)
        
        assert success_count <= 10  # Should not exceed rate limit
        assert rate_limited_count > 0  # Should have some rate limited
        assert success_count + rate_limited_count == 20

    def test_memory_cleanup(self):
        """Test that old rate limit entries are cleaned up."""
        with patch('time.time') as mock_time:
            mock_time.return_value = 0
            
            # Make some requests
            for i in range(5):
                response = self.client.get("/auth/login")
                assert response.status_code == 200
            
            # Verify entries exist
            client_ip = self.rate_limiter.get_client_ip(Mock(headers={'X-Forwarded-For': None, 'X-Real-IP': None}, client=Mock(host='127.0.0.1')))
            assert len(self.rate_limiter.clients[client_ip]) == 5
            
            # Advance time and make another request
            mock_time.return_value = 120  # 2 minutes later
            
            response = self.client.get("/auth/login")
            assert response.status_code == 200
            
            # Old entries should be cleaned up
            assert len(self.rate_limiter.clients[client_ip]) == 1

    def test_distributed_rate_limiting_simulation(self):
        """Test simulation of distributed rate limiting behavior."""
        # Simulate multiple server instances
        instances = []
        for i in range(3):
            app = FastAPI()
            rate_limiter = RateLimitMiddleware(app, calls=5, period=60)
            
            @app.get("/auth/login")
            async def endpoint():
                return {"message": f"instance_{i}"}
            
            instances.append((app, TestClient(app)))
        
        # Each instance should have its own rate limit
        for app, client in instances:
            for i in range(5):
                response = client.get("/auth/login")
                assert response.status_code == 200
            
            # Should be rate limited on each instance
            response = client.get("/auth/login")
            assert response.status_code == 429


class TestAdvancedRateLimiting:
    """Test advanced rate limiting scenarios."""

    def test_sliding_window_rate_limit(self):
        """Test sliding window rate limiting implementation."""
        class SlidingWindowRateLimit:
            def __init__(self, max_requests=10, window_size=60):
                self.max_requests = max_requests
                self.window_size = window_size
                self.requests = defaultdict(list)
            
            def is_allowed(self, client_id):
                now = time.time()
                # Clean old requests
                self.requests[client_id] = [
                    req_time for req_time in self.requests[client_id]
                    if now - req_time < self.window_size
                ]
                
                if len(self.requests[client_id]) >= self.max_requests:
                    return False
                
                self.requests[client_id].append(now)
                return True
        
        rate_limiter = SlidingWindowRateLimit(max_requests=5, window_size=10)
        
        # Should allow initial requests
        for i in range(5):
            assert rate_limiter.is_allowed('client1') is True
        
        # Should block additional requests
        assert rate_limiter.is_allowed('client1') is False
        
        # Different client should be allowed
        assert rate_limiter.is_allowed('client2') is True

    def test_token_bucket_rate_limit(self):
        """Test token bucket rate limiting implementation."""
        class TokenBucketRateLimit:
            def __init__(self, capacity=10, refill_rate=1):
                self.capacity = capacity
                self.refill_rate = refill_rate  # tokens per second
                self.buckets = defaultdict(lambda: {
                    'tokens': capacity,
                    'last_refill': time.time()
                })
            
            def is_allowed(self, client_id):
                now = time.time()
                bucket = self.buckets[client_id]
                
                # Refill tokens
                time_passed = now - bucket['last_refill']
                tokens_to_add = time_passed * self.refill_rate
                bucket['tokens'] = min(self.capacity, bucket['tokens'] + tokens_to_add)
                bucket['last_refill'] = now
                
                if bucket['tokens'] >= 1:
                    bucket['tokens'] -= 1
                    return True
                return False
        
        rate_limiter = TokenBucketRateLimit(capacity=3, refill_rate=1)
        
        # Should allow initial burst
        for i in range(3):
            assert rate_limiter.is_allowed('client1') is True
        
        # Should block after burst
        assert rate_limiter.is_allowed('client1') is False
        
        # Should allow after some time (tokens refilled)
        time.sleep(1.1)
        assert rate_limiter.is_allowed('client1') is True

    def test_adaptive_rate_limiting(self):
        """Test adaptive rate limiting based on system load."""
        class AdaptiveRateLimit:
            def __init__(self, base_limit=10):
                self.base_limit = base_limit
                self.current_load = 0.5  # 50% system load
                self.requests = defaultdict(list)
            
            def get_dynamic_limit(self):
                # Reduce limit under high load
                if self.current_load > 0.8:
                    return max(1, self.base_limit // 4)
                elif self.current_load > 0.6:
                    return self.base_limit // 2
                return self.base_limit
            
            def is_allowed(self, client_id):
                now = time.time()
                dynamic_limit = self.get_dynamic_limit()
                
                # Clean old requests (1 minute window)
                self.requests[client_id] = [
                    req_time for req_time in self.requests[client_id]
                    if now - req_time < 60
                ]
                
                if len(self.requests[client_id]) >= dynamic_limit:
                    return False
                
                self.requests[client_id].append(now)
                return True
        
        rate_limiter = AdaptiveRateLimit(base_limit=10)
        
        # Normal load - should allow up to base limit
        rate_limiter.current_load = 0.5
        for i in range(10):
            assert rate_limiter.is_allowed('client1') is True
        assert rate_limiter.is_allowed('client1') is False
        
        # High load - should reduce limit
        rate_limiter.current_load = 0.9
        rate_limiter.requests.clear()
        for i in range(2):  # Should only allow 2 (base_limit // 4)
            assert rate_limiter.is_allowed('client2') is True
        assert rate_limiter.is_allowed('client2') is False

    def test_rate_limit_bypass_attempts(self):
        """Test various rate limit bypass attempts."""
        app = FastAPI()
        rate_limiter = RateLimitMiddleware(app, calls=3, period=60)
        
        @app.get("/auth/login")
        async def endpoint():
            return {"message": "success"}
        
        client = TestClient(app)
        
        bypass_attempts = [
            # Header manipulation
            {'X-Forwarded-For': '127.0.0.1, 192.168.1.1'},
            {'X-Real-IP': '10.0.0.1'},
            {'X-Forwarded-For': '127.0.0.1', 'X-Real-IP': '192.168.1.2'},
            
            # Multiple IPs
            {'X-Forwarded-For': '1.1.1.1, 2.2.2.2, 3.3.3.3'},
            
            # Empty or null values
            {'X-Forwarded-For': ''},
            {'X-Real-IP': 'null'},
            
            # Special characters
            {'X-Forwarded-For': '192.168.1.1%20'},
            {'X-Real-IP': '127.0.0.1;rm -rf /'},
        ]
        
        for attempt_headers in bypass_attempts:
            # Use up the rate limit
            for i in range(3):
                response = client.get("/auth/login", headers=attempt_headers)
                assert response.status_code == 200
            
            # Should still be rate limited despite bypass attempt
            response = client.get("/auth/login", headers=attempt_headers)
            assert response.status_code == 429
            
            # Clear rate limiter for next test
            rate_limiter.clients.clear()

    def test_rate_limit_error_responses(self):
        """Test rate limit error response security."""
        app = FastAPI()
        rate_limiter = RateLimitMiddleware(app, calls=2, period=60)
        
        @app.get("/auth/login")
        async def endpoint():
            return {"message": "success"}
        
        client = TestClient(app)
        
        # Use up rate limit
        for i in range(2):
            response = client.get("/auth/login")
            assert response.status_code == 200
        
        # Get rate limit error
        response = client.get("/auth/login")
        assert response.status_code == 429
        
        error_data = response.json()
        
        # Verify error response doesn't leak sensitive info
        assert "detail" in error_data
        assert "retry_after" in error_data
        assert "Rate limit exceeded" in error_data["detail"]
        
        # Should not contain server internals
        error_str = str(error_data)
        sensitive_info = [
            'client_ip', 'internal', 'server', 'database',
            'redis', 'cache', 'memory', 'cpu', 'load'
        ]
        
        for info in sensitive_info:
            assert info.lower() not in error_str.lower()

    def test_rate_limit_with_authentication(self):
        """Test rate limiting behavior with different authentication states."""
        app = FastAPI()
        rate_limiter = RateLimitMiddleware(app, calls=5, period=60)
        
        @app.get("/auth/login")
        async def login_endpoint():
            return {"message": "login"}
        
        @app.get("/auth/register")
        async def register_endpoint():
            return {"message": "register"}
        
        client = TestClient(app)
        
        # Rate limits should apply to both endpoints
        total_requests = 0
        
        # Mix of login and register requests
        for i in range(3):
            response = client.get("/auth/login")
            assert response.status_code == 200
            total_requests += 1
            
            response = client.get("/auth/register")
            assert response.status_code == 200 if total_requests < 5 else 429
            total_requests += 1
        
        # Should be rate limited now
        response = client.get("/auth/login")
        assert response.status_code == 429

    def test_rate_limit_persistence(self):
        """Test rate limit data persistence and recovery."""
        # This would test Redis/database persistence in real implementation
        # For now, test in-memory behavior
        
        app = FastAPI()
        rate_limiter = RateLimitMiddleware(app, calls=3, period=60)
        
        @app.get("/auth/login")
        async def endpoint():
            return {"message": "success"}
        
        client = TestClient(app)
        
        # Make some requests
        for i in range(3):
            response = client.get("/auth/login")
            assert response.status_code == 200
        
        # Should be rate limited
        response = client.get("/auth/login")
        assert response.status_code == 429
        
        # Simulate server restart by creating new rate limiter
        new_rate_limiter = RateLimitMiddleware(app, calls=3, period=60)
        
        # Without persistence, limits would reset (expected behavior for in-memory)
        # In production, this would maintain limits via Redis/database
        assert len(new_rate_limiter.clients) == 0
