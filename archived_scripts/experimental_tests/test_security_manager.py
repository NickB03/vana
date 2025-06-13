"""
Tests for VANA Security Manager
"""

import pytest
import time
from unittest.mock import patch
from lib.security.security_manager import SecurityManager, SecurityEvent

class TestSecurityManager:
    """Test cases for SecurityManager."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.security = SecurityManager()
    
    def test_validate_input_valid(self):
        """Test input validation with valid input."""
        is_valid, message = self.security.validate_input("Hello, this is a normal message.")
        assert is_valid is True
        assert message == "Input validation passed"
    
    def test_validate_input_too_long(self):
        """Test input validation with too long input."""
        long_input = "x" * 10001
        is_valid, message = self.security.validate_input(long_input)
        assert is_valid is False
        assert "exceeds maximum length" in message
    
    def test_validate_input_xss_attack(self):
        """Test input validation with XSS attack."""
        xss_input = "<script>alert('xss')</script>"
        is_valid, message = self.security.validate_input(xss_input)
        assert is_valid is False
        assert "Suspicious pattern detected" in message
    
    def test_validate_input_sql_injection(self):
        """Test input validation with SQL injection."""
        sql_input = "'; DROP TABLE users; --"
        is_valid, message = self.security.validate_input(sql_input)
        assert is_valid is False
        assert "Suspicious pattern detected" in message
    
    def test_validate_input_path_traversal(self):
        """Test input validation with path traversal."""
        path_input = "../../../etc/passwd"
        is_valid, message = self.security.validate_input(path_input)
        assert is_valid is False
        assert "Suspicious pattern detected" in message
    
    def test_rate_limiting(self):
        """Test rate limiting functionality."""
        identifier = "test_user"
        
        # Should allow requests within limit
        for i in range(5):
            assert self.security.check_rate_limit(identifier, limit=10, window_seconds=60) is True
        
        # Should block when limit exceeded
        for i in range(10):
            self.security.check_rate_limit(identifier, limit=10, window_seconds=60)
        
        assert self.security.check_rate_limit(identifier, limit=10, window_seconds=60) is False
    
    def test_rate_limiting_window_reset(self):
        """Test rate limiting window reset."""
        identifier = "test_user"
        
        # Fill up the rate limit
        for i in range(10):
            self.security.check_rate_limit(identifier, limit=10, window_seconds=1)
        
        # Should be blocked
        assert self.security.check_rate_limit(identifier, limit=10, window_seconds=1) is False
        
        # Wait for window to reset
        time.sleep(1.1)
        
        # Should be allowed again
        assert self.security.check_rate_limit(identifier, limit=10, window_seconds=1) is True
    
    def test_ip_blocking(self):
        """Test IP blocking functionality."""
        ip_address = "192.168.1.100"
        
        # IP should not be blocked initially
        assert self.security.is_ip_blocked(ip_address) is False
        
        # Block the IP
        self.security.block_ip(ip_address, "Test blocking")
        
        # IP should now be blocked
        assert self.security.is_ip_blocked(ip_address) is True
        
        # Should have logged a security event
        assert len(self.security.security_events) == 1
        assert self.security.security_events[0].event_type == "ip_blocked"
    
    def test_security_event_logging(self):
        """Test security event logging."""
        self.security.log_security_event(
            "test_event",
            "medium",
            "192.168.1.1",
            "Mozilla/5.0",
            {"test": "data"}
        )
        
        assert len(self.security.security_events) == 1
        event = self.security.security_events[0]
        assert event.event_type == "test_event"
        assert event.severity == "medium"
        assert event.source_ip == "192.168.1.1"
        assert event.user_agent == "Mozilla/5.0"
        assert event.details == {"test": "data"}
    
    def test_critical_event_auto_block(self):
        """Test automatic IP blocking on critical events."""
        ip_address = "192.168.1.200"
        
        # Log a critical event
        self.security.log_security_event(
            "critical_attack",
            "critical",
            ip_address,
            "AttackBot/1.0",
            {"attack_type": "severe"}
        )
        
        # IP should be automatically blocked
        assert self.security.is_ip_blocked(ip_address) is True
        
        # Should have two events: the critical event and the IP block
        assert len(self.security.security_events) == 2
    
    def test_csrf_token_generation_and_validation(self):
        """Test CSRF token generation and validation."""
        session_id = "test_session_123"
        secret_key = "test_secret_key"
        
        # Generate token
        token = self.security.generate_csrf_token(session_id, secret_key)
        assert token is not None
        assert ":" in token  # Should contain timestamp and signature
        
        # Validate token
        is_valid = self.security.validate_csrf_token(token, session_id, secret_key)
        assert is_valid is True
        
        # Invalid token should fail
        is_valid = self.security.validate_csrf_token("invalid:token", session_id, secret_key)
        assert is_valid is False
        
        # Wrong session ID should fail
        is_valid = self.security.validate_csrf_token(token, "wrong_session", secret_key)
        assert is_valid is False
        
        # Wrong secret key should fail
        is_valid = self.security.validate_csrf_token(token, session_id, "wrong_key")
        assert is_valid is False
    
    def test_csrf_token_expiration(self):
        """Test CSRF token expiration."""
        session_id = "test_session_123"
        secret_key = "test_secret_key"
        
        # Generate token with short expiration
        with patch('time.time', return_value=1000):
            token = self.security.generate_csrf_token(session_id, secret_key)
        
        # Token should be expired after max_age
        with patch('time.time', return_value=2000):  # 1000 seconds later
            is_valid = self.security.validate_csrf_token(token, session_id, secret_key, max_age=500)
            assert is_valid is False
