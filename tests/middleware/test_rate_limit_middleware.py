"""Tests for rate limiting middleware."""
import pytest
import time
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.middleware.rate_limit_middleware import (
    RateLimitMiddleware,
    RateLimiter,
    RATE_LIMITERS,
)


@pytest.fixture
def app():
    """Create test FastAPI app with rate limiting."""
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware)

    @app.post("/api/auth/login")
    async def login():
        return {"status": "ok"}

    @app.get("/api/data")
    async def get_data():
        return {"data": "test"}

    @app.get("/api/sessions")
    async def get_sessions():
        return {"sessions": []}

    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def rate_limiter():
    """Create a test rate limiter."""
    return RateLimiter(requests=5, window_seconds=60)


class TestRateLimiter:
    """Tests for RateLimiter class."""

    def test_allows_requests_under_limit(self, rate_limiter):
        """Requests under limit are allowed."""
        client_ip = "192.168.1.1"

        # First 5 requests should be allowed
        for i in range(5):
            is_allowed, retry_after = rate_limiter.is_allowed(client_ip)
            assert is_allowed is True
            assert retry_after == 0

    def test_blocks_requests_over_limit(self, rate_limiter):
        """Requests over limit are blocked."""
        client_ip = "192.168.1.2"

        # Exhaust rate limit
        for i in range(5):
            rate_limiter.is_allowed(client_ip)

        # 6th request should be blocked
        is_allowed, retry_after = rate_limiter.is_allowed(client_ip)
        assert is_allowed is False
        assert retry_after > 0

    def test_different_ips_independent_limits(self, rate_limiter):
        """Different IPs have independent rate limits."""
        ip1 = "192.168.1.1"
        ip2 = "192.168.1.2"

        # Exhaust limit for ip1
        for i in range(5):
            rate_limiter.is_allowed(ip1)

        # ip1 should be blocked
        is_allowed, _ = rate_limiter.is_allowed(ip1)
        assert is_allowed is False

        # ip2 should still be allowed
        is_allowed, _ = rate_limiter.is_allowed(ip2)
        assert is_allowed is True

    def test_window_expiration(self):
        """Requests are allowed after window expires."""
        limiter = RateLimiter(requests=2, window_seconds=1)
        client_ip = "192.168.1.3"

        # Exhaust limit
        limiter.is_allowed(client_ip)
        limiter.is_allowed(client_ip)

        # Should be blocked
        is_allowed, _ = limiter.is_allowed(client_ip)
        assert is_allowed is False

        # Wait for window to expire
        time.sleep(1.1)

        # Should be allowed again
        is_allowed, _ = limiter.is_allowed(client_ip)
        assert is_allowed is True

    def test_cleanup_old_ips(self):
        """Old IP entries are cleaned up."""
        limiter = RateLimiter(requests=5, window_seconds=60)

        # Make requests from multiple IPs
        for i in range(10):
            limiter.is_allowed(f"192.168.1.{i}")

        assert len(limiter.requests) == 10

        # Cleanup with short max_age
        limiter.cleanup_old_ips(max_age_seconds=0)

        # All IPs should be cleaned up
        assert len(limiter.requests) == 0

    def test_retry_after_calculation(self, rate_limiter):
        """Retry-After header is calculated correctly."""
        client_ip = "192.168.1.4"

        # Exhaust rate limit
        for i in range(5):
            rate_limiter.is_allowed(client_ip)

        # Check retry after
        is_allowed, retry_after = rate_limiter.is_allowed(client_ip)
        assert is_allowed is False
        assert 0 < retry_after <= 60  # Should be within window


class TestRateLimitMiddleware:
    """Tests for RateLimitMiddleware."""

    def test_allows_requests_under_limit(self, client):
        """Requests under limit are allowed."""
        # First 5 requests should succeed (limit is 5/min for login)
        for i in range(5):
            response = client.post("/api/auth/login")
            assert response.status_code == 200
            assert response.json() == {"status": "ok"}

    def test_blocks_requests_over_limit(self, client):
        """Requests over limit are blocked."""
        # Exhaust rate limit
        for i in range(5):
            client.post("/api/auth/login")

        # 6th request should be rate limited
        response = client.post("/api/auth/login")
        assert response.status_code == 429
        assert "Rate limit exceeded" in response.json()["detail"]["error"]

    def test_retry_after_header_present(self, client):
        """Rate limit response includes Retry-After header."""
        # Exhaust rate limit
        for i in range(5):
            client.post("/api/auth/login")

        # Check rate limited response
        response = client.post("/api/auth/login")
        assert "Retry-After" in response.headers
        assert int(response.headers["Retry-After"]) > 0

    def test_rate_limit_headers_present(self, client):
        """Rate limit headers are present in response."""
        response = client.post("/api/auth/login")
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Window" in response.headers

    def test_different_endpoints_different_limits(self, client):
        """Different endpoints have different rate limits."""
        # Login has limit of 5/min
        for i in range(5):
            response = client.post("/api/auth/login")
            assert response.status_code == 200

        response = client.post("/api/auth/login")
        assert response.status_code == 429

        # Sessions has limit of 60/min (should still work)
        response = client.get("/api/sessions")
        assert response.status_code == 200

    def test_handles_proxy_headers(self, client):
        """X-Forwarded-For header is respected."""
        # Make requests with different X-Forwarded-For IPs
        for i in range(5):
            response = client.post(
                "/api/auth/login",
                headers={"X-Forwarded-For": "10.0.0.1"}
            )
            assert response.status_code == 200

        # 6th request from same IP should be blocked
        response = client.post(
            "/api/auth/login",
            headers={"X-Forwarded-For": "10.0.0.1"}
        )
        assert response.status_code == 429

        # Request from different IP should work
        response = client.post(
            "/api/auth/login",
            headers={"X-Forwarded-For": "10.0.0.2"}
        )
        assert response.status_code == 200

    def test_handles_multiple_ips_in_forwarded_header(self, client):
        """First IP in X-Forwarded-For chain is used."""
        # X-Forwarded-For with multiple IPs (proxy chain)
        headers = {"X-Forwarded-For": "203.0.113.1, 198.51.100.1, 192.0.2.1"}

        for i in range(5):
            response = client.post("/api/auth/login", headers=headers)
            assert response.status_code == 200

        # 6th request should be blocked
        response = client.post("/api/auth/login", headers=headers)
        assert response.status_code == 429

    def test_default_rate_limiter_used(self, client):
        """Default rate limiter is used for unmatched endpoints."""
        # /api/data should use default limiter (100 requests/min)
        for i in range(100):
            response = client.get("/api/data")
            assert response.status_code == 200

        # 101st request should be blocked
        response = client.get("/api/data")
        assert response.status_code == 429

    def test_rate_limit_error_message_format(self, client):
        """Rate limit error has correct format."""
        # Exhaust rate limit
        for i in range(5):
            client.post("/api/auth/login")

        # Check error format
        response = client.post("/api/auth/login")
        assert response.status_code == 429

        error_detail = response.json()["detail"]
        assert "error" in error_detail
        assert "message" in error_detail
        assert "retry_after" in error_detail
        assert isinstance(error_detail["retry_after"], int)


class TestRateLimiterConfiguration:
    """Tests for rate limiter configuration."""

    def test_authentication_endpoints_strict_limits(self):
        """Authentication endpoints have strict limits."""
        login_limiter = RATE_LIMITERS["/api/auth/login"]
        assert login_limiter.max_requests == 5
        assert login_limiter.window_seconds == 60

        register_limiter = RATE_LIMITERS["/api/auth/register"]
        assert register_limiter.max_requests == 3
        assert register_limiter.window_seconds == 3600

    def test_api_endpoints_moderate_limits(self):
        """API endpoints have moderate limits."""
        sessions_limiter = RATE_LIMITERS["/api/sessions"]
        assert sessions_limiter.max_requests == 60
        assert sessions_limiter.window_seconds == 60

    def test_default_limiter_exists(self):
        """Default rate limiter exists."""
        default_limiter = RATE_LIMITERS["default"]
        assert default_limiter.max_requests == 100
        assert default_limiter.window_seconds == 60


class TestThreadSafety:
    """Tests for thread safety."""

    def test_concurrent_requests_same_ip(self):
        """Concurrent requests from same IP are handled correctly."""
        import concurrent.futures

        limiter = RateLimiter(requests=10, window_seconds=60)
        client_ip = "192.168.1.100"

        def make_request():
            return limiter.is_allowed(client_ip)

        # Make 20 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            results = list(executor.map(lambda _: make_request(), range(20)))

        # Exactly 10 should be allowed
        allowed_count = sum(1 for is_allowed, _ in results if is_allowed)
        assert allowed_count == 10

    def test_concurrent_requests_different_ips(self):
        """Concurrent requests from different IPs don't interfere."""
        import concurrent.futures

        limiter = RateLimiter(requests=5, window_seconds=60)

        def make_request(ip):
            results = []
            for _ in range(5):
                results.append(limiter.is_allowed(f"192.168.1.{ip}"))
            return results

        # Make requests from 10 different IPs concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            ip_results = list(executor.map(make_request, range(10)))

        # All IPs should have 5 allowed requests
        for results in ip_results:
            allowed_count = sum(1 for is_allowed, _ in results if is_allowed)
            assert allowed_count == 5
