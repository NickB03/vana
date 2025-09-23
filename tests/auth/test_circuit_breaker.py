"""Tests for authentication circuit breaker functionality."""

import pytest
import time
from unittest.mock import MagicMock, patch

from app.auth.circuit_breaker import (
    AuthenticationCircuitBreaker,
    CircuitState,
    FailedAttempt,
)
from app.auth.circuit_breaker_config import CircuitBreakerConfig


class TestAuthenticationCircuitBreaker:
    """Test suite for AuthenticationCircuitBreaker class."""
    
    def test_circuit_breaker_initialization(self):
        """Test circuit breaker initializes with correct default values."""
        cb = AuthenticationCircuitBreaker()
        
        assert cb.warning_threshold == 5
        assert cb.temporary_block_threshold == 10
        assert cb.extended_block_threshold == 20
        assert cb.long_term_block_threshold == 50
        assert cb.temporary_block_duration == 900  # 15 minutes
        assert cb.extended_block_duration == 3600  # 1 hour
        assert cb.long_term_block_duration == 86400  # 24 hours
        
    def test_trusted_ip_never_blocked(self):
        """Test that trusted IPs are never blocked."""
        cb = AuthenticationCircuitBreaker()
        
        # Test localhost is trusted
        should_block, reason, retry_after = cb.should_block_request("127.0.0.1")
        assert not should_block
        assert reason == "trusted_ip"
        assert retry_after is None
        
        # Record many failures for trusted IP
        for _ in range(100):
            cb.record_failed_attempt("127.0.0.1", "test_user")
        
        # Should still not be blocked
        should_block, reason, retry_after = cb.should_block_request("127.0.0.1")
        assert not should_block
        assert reason == "trusted_ip"
        
    def test_progressive_blocking_thresholds(self):
        """Test that circuit breaker implements progressive blocking."""
        cb = AuthenticationCircuitBreaker(
            warning_threshold=2,
            temporary_block_threshold=3,
            extended_block_threshold=5,
            long_term_block_threshold=10,
            temporary_block_duration=10,  # Short durations for testing
            extended_block_duration=20,
            long_term_block_duration=30,
        )
        
        ip = "192.168.1.100"
        
        # Should not be blocked initially
        should_block, reason, retry_after = cb.should_block_request(ip)
        assert not should_block
        assert reason == "no_history"
        
        # Add failures up to warning threshold
        for i in range(2):
            cb.record_failed_attempt(ip, f"user_{i}")
        
        # Should enter half-open state but not be blocked
        should_block, reason, retry_after = cb.should_block_request(ip)
        assert not should_block
        
        # Add one more failure to trigger temporary block
        cb.record_failed_attempt(ip, "user_3")
        
        # Should now be blocked
        should_block, reason, retry_after = cb.should_block_request(ip)
        assert should_block
        assert "circuit_open" in reason
        assert retry_after == 10
        
    def test_circuit_recovery_after_timeout(self):
        """Test that circuit breaker recovers after timeout period."""
        cb = AuthenticationCircuitBreaker(
            temporary_block_threshold=2,
            temporary_block_duration=1,  # 1 second for testing
        )
        
        ip = "192.168.1.101"
        
        # Trigger block
        cb.record_failed_attempt(ip, "user1")
        cb.record_failed_attempt(ip, "user2")
        
        # Should be blocked
        should_block, reason, retry_after = cb.should_block_request(ip)
        assert should_block
        
        # Wait for timeout
        time.sleep(1.1)
        
        # Should transition to half-open
        should_block, reason, retry_after = cb.should_block_request(ip)
        assert not should_block
        assert reason == "half_open_recovery"
        
    def test_successful_authentication_resets_circuit(self):
        """Test that successful authentication resets circuit breaker."""
        cb = AuthenticationCircuitBreaker(warning_threshold=2)
        
        ip = "192.168.1.102"
        
        # Add some failures
        cb.record_failed_attempt(ip, "user1")
        cb.record_failed_attempt(ip, "user2")
        
        # Record successful authentication
        cb.record_successful_attempt(ip, "user1")
        
        # Circuit should be reset
        state = cb.circuit_states.get(ip)
        assert state is not None
        assert state.consecutive_failures == 0
        assert state.state == CircuitState.CLOSED
        
    def test_cleanup_removes_old_data(self):
        """Test that cleanup removes old tracking data."""
        cb = AuthenticationCircuitBreaker(
            cleanup_interval=0,  # Force cleanup on every call
            max_tracking_age=1,  # 1 second max age
        )
        
        ip = "192.168.1.103"
        
        # Add failure
        cb.record_failed_attempt(ip, "user1")
        assert ip in cb.circuit_states
        
        # Wait for data to age out
        time.sleep(1.1)
        
        # Trigger cleanup by checking another IP
        cb.should_block_request("192.168.1.999")
        
        # Old data should be cleaned up
        # Note: IP state might still exist if it has recent activity
        # but old failed attempts should be removed
        if ip in cb.circuit_states:
            assert len(cb.circuit_states[ip].failed_attempts) == 0
            
    def test_circuit_breaker_stats(self):
        """Test circuit breaker statistics collection."""
        cb = AuthenticationCircuitBreaker()
        
        # Add some test data
        cb.record_failed_attempt("192.168.1.104", "user1")
        cb.record_failed_attempt("192.168.1.105", "user2")
        cb.record_failed_attempt("192.168.1.105", "user2")  # More failures for this IP
        
        stats = cb.get_stats()
        
        assert "total_tracked_ips" in stats
        assert "circuits_open" in stats
        assert "circuits_half_open" in stats
        assert "circuits_closed" in stats
        assert "total_failed_attempts" in stats
        assert "most_failed_ip" in stats
        assert "most_failures" in stats
        
        assert stats["total_tracked_ips"] >= 2
        assert stats["most_failed_ip"] == "192.168.1.105"
        assert stats["most_failures"] == 2
        
    def test_manual_ip_reset(self):
        """Test manual reset of circuit breaker for specific IP."""
        cb = AuthenticationCircuitBreaker()
        
        ip = "192.168.1.106"
        
        # Add failures to trigger circuit breaker
        for i in range(15):
            cb.record_failed_attempt(ip, f"user_{i}")
        
        # Should be blocked
        should_block, reason, retry_after = cb.should_block_request(ip)
        assert should_block
        
        # Reset the IP
        success = cb.reset_ip(ip)
        assert success
        
        # Should no longer be blocked
        should_block, reason, retry_after = cb.should_block_request(ip)
        assert not should_block
        
        # Reset non-existent IP should return False
        success = cb.reset_ip("non.existent.ip")
        assert not success


class TestCircuitBreakerConfig:
    """Test suite for CircuitBreakerConfig class."""
    
    def test_default_configuration(self):
        """Test default configuration values."""
        config = CircuitBreakerConfig()
        
        assert config.warning_threshold == 5
        assert config.temporary_block_threshold == 10
        assert config.enabled is True
        assert config.log_blocked_requests is True
        
    def test_production_configuration(self):
        """Test production-optimized configuration."""
        config = CircuitBreakerConfig.for_production()
        
        # Production should have stricter thresholds
        assert config.warning_threshold == 3
        assert config.temporary_block_threshold == 5
        assert config.extended_block_threshold == 10
        assert config.long_term_block_threshold == 25
        
        # Longer block durations
        assert config.temporary_block_duration == 1800  # 30 minutes
        assert config.extended_block_duration == 7200   # 2 hours
        
    def test_development_configuration(self):
        """Test development-friendly configuration."""
        config = CircuitBreakerConfig.for_development()
        
        # Development should have more lenient thresholds
        assert config.warning_threshold == 10
        assert config.temporary_block_threshold == 20
        assert config.log_successful_auth is True
        
    def test_testing_configuration(self):
        """Test testing-optimized configuration."""
        config = CircuitBreakerConfig.for_testing()
        
        # Testing should have very short durations
        assert config.temporary_block_duration == 5
        assert config.extended_block_duration == 10
        assert config.long_term_block_duration == 15
        
        # Minimal logging in tests
        assert config.log_blocked_requests is False
        assert config.log_successful_auth is False
        
    @patch.dict("os.environ", {
        "CB_WARNING_THRESHOLD": "3",
        "CB_TEMP_BLOCK_THRESHOLD": "7",
        "CB_ENABLED": "false"
    })
    def test_environment_variable_override(self):
        """Test that environment variables override default values."""
        config = CircuitBreakerConfig()
        
        assert config.warning_threshold == 3
        assert config.temporary_block_threshold == 7
        assert config.enabled is False
        
    def test_trusted_ips_parsing(self):
        """Test parsing of trusted IPs from environment."""
        with patch.dict("os.environ", {"CB_TRUSTED_IPS": "10.0.0.5,192.168.1.10"}):
            config = CircuitBreakerConfig()
            
            assert "10.0.0.5" in config.trusted_ips
            assert "192.168.1.10" in config.trusted_ips
            # Default trusted IPs should still be included
            assert "127.0.0.1" in config.trusted_ips
            
    def test_environment_summary(self):
        """Test environment summary for monitoring."""
        config = CircuitBreakerConfig.for_testing()
        summary = config.get_environment_summary()
        
        assert "enabled" in summary
        assert "warning_threshold" in summary
        assert "temporary_block_duration_minutes" in summary
        assert "trusted_ips_count" in summary
        
        # Check converted time units
        assert summary["temporary_block_duration_minutes"] == 0  # 5 seconds / 60
        assert summary["extended_block_duration_hours"] == 0     # 10 seconds / 3600


class TestFailedAttempt:
    """Test suite for FailedAttempt dataclass."""
    
    def test_failed_attempt_creation(self):
        """Test creation of FailedAttempt instances."""
        attempt = FailedAttempt(
            ip_address="192.168.1.100",
            timestamp=time.time(),
            user_identifier="test_user",
            user_agent="Mozilla/5.0...",
            endpoint="/auth/login"
        )
        
        assert attempt.ip_address == "192.168.1.100"
        assert attempt.user_identifier == "test_user"
        assert attempt.user_agent == "Mozilla/5.0..."
        assert attempt.endpoint == "/auth/login"
        assert isinstance(attempt.timestamp, float)


# Integration test would require more complex setup
@pytest.mark.integration
class TestCircuitBreakerIntegration:
    """Integration tests for circuit breaker with middleware."""
    
    @pytest.mark.skip(reason="Requires full app setup")
    def test_circuit_breaker_middleware_integration(self):
        """Test circuit breaker integration with FastAPI middleware."""
        # This would require setting up a test client with the full app
        # and making actual HTTP requests to test the middleware integration
        pass
    
    @pytest.mark.skip(reason="Requires full app setup")
    def test_circuit_breaker_with_authentication_routes(self):
        """Test circuit breaker working with actual authentication routes."""
        # This would test the full flow:
        # 1. Make failed login attempts
        # 2. Verify circuit breaker blocks subsequent requests
        # 3. Verify successful login resets the circuit
        pass