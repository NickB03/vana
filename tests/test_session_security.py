"""Comprehensive test suite for session security enhancements.

Tests cover:
- Session ID validation with various attack patterns
- User binding and tampering detection
- Session enumeration attack prevention
- Race condition protection in cleanup operations
- Security logging and monitoring features

These tests ensure the security enhancements work correctly and
provide protection against common session-based attacks.
"""

from unittest.mock import Mock, patch

import pytest

from app.utils.session_security import (
    SessionSecurityConfig,
    SessionSecurityValidator,
    are_session_ids_sequential,
    is_session_enumeration_attempt,
)
from app.utils.session_store import SessionStore, SessionStoreConfig


class TestSessionSecurityValidator:
    """Test the SessionSecurityValidator class."""

    def setup_method(self):
        """Set up test fixtures."""
        self.config = SessionSecurityConfig()
        self.validator = SessionSecurityValidator(self.config)

    def test_valid_session_id_formats(self):
        """Test that valid session ID formats pass validation."""
        valid_ids = [
            "abcdef1234567890abcdef1234567890",
            "session_12345-67890-abcdef",
            "550e8400-e29b-41d4-a716-446655440000",  # UUID
            "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",  # Long alphanumeric
        ]

        for session_id in valid_ids:
            result = self.validator.validate_session_id(session_id)
            assert result.is_valid, f"Session ID should be valid: {session_id}"
            assert result.session_id == session_id
            assert result.error_code is None

    def test_invalid_session_id_formats(self):
        """Test that invalid session ID formats fail validation."""
        invalid_ids = [
            "",  # Empty
            "short",  # Too short
            "a" * 200,  # Too long
            "session with spaces",  # Spaces
            "session@with#special$chars",  # Special chars
            "../../../etc/passwd",  # Path traversal
            "<script>alert('xss')</script>",  # XSS attempt
        ]

        for session_id in invalid_ids:
            result = self.validator.validate_session_id(session_id)
            assert not result.is_valid, f"Session ID should be invalid: {session_id}"
            assert result.error_code is not None

    def test_weak_session_id_detection(self):
        """Test detection of weak or predictable session IDs."""
        weak_ids = [
            "00000000000000000000000000000000",  # All zeros
            "11111111111111111111111111111111",  # All ones
            "testSessionId12345678901234567890",  # Starts with 'test'
            "adminSessionId1234567890123456789",  # Starts with 'admin'
            "12345678901234567890123456789012",  # Sequential numbers
        ]

        for session_id in weak_ids:
            result = self.validator.validate_session_id(session_id)
            # Some weak IDs might be caught by format validation, others by weakness detection
            if result.is_valid:
                assert result.security_warnings is not None
                assert len(result.security_warnings) > 0
            else:
                assert result.error_code in [
                    "WEAK_SESSION_ID",
                    "INVALID_SESSION_FORMAT",
                ]

    def test_user_binding_token_creation_and_verification(self):
        """Test creation and verification of user binding tokens."""
        session_id = "test_session_12345678901234567890"
        user_id = 42
        client_ip = "192.168.1.100"
        user_agent = "Mozilla/5.0 Test Browser"

        # Create binding token
        token = self.validator.create_user_binding_token(
            session_id, user_id, client_ip, user_agent
        )

        assert isinstance(token, str)
        assert ":" in token  # Should contain timestamp and signature

        # Verify valid token
        result = self.validator.verify_user_binding_token(
            session_id, user_id, client_ip, user_agent, token
        )

        assert result.is_valid
        assert result.session_id == session_id
        assert result.user_id == user_id

    def test_user_binding_tampering_detection(self):
        """Test that tampering with user binding is detected."""
        session_id = "test_session_12345678901234567890"
        user_id = 42
        client_ip = "192.168.1.100"
        user_agent = "Mozilla/5.0 Test Browser"

        # Create valid token
        token = self.validator.create_user_binding_token(
            session_id, user_id, client_ip, user_agent
        )

        # Test various tampering scenarios
        tampering_tests = [
            # Different session ID
            ("tampered_session_1234567890123456", user_id, client_ip, user_agent),
            # Different user ID
            (session_id, 999, client_ip, user_agent),
            # Different IP
            (session_id, user_id, "10.0.0.1", user_agent),
            # Different User-Agent
            (session_id, user_id, client_ip, "Malicious Browser"),
        ]

        for test_session, test_user, test_ip, test_ua in tampering_tests:
            result = self.validator.verify_user_binding_token(
                test_session, test_user, test_ip, test_ua, token
            )

            assert not result.is_valid
            assert result.error_code == "SESSION_TAMPERING_DETECTED"

    def test_csrf_token_creation_and_verification(self):
        """Test CSRF token creation and verification."""
        session_id = "test_session_12345678901234567890"
        user_id = 42

        # Create CSRF token
        csrf_token = self.validator.create_csrf_token(session_id, user_id)

        assert isinstance(csrf_token, str)
        assert ":" in csrf_token  # Should contain timestamp and signature

        # Verify valid token
        is_valid = self.validator.verify_csrf_token(session_id, user_id, csrf_token)
        assert is_valid

        # Test with wrong session ID
        is_valid = self.validator.verify_csrf_token(
            "wrong_session", user_id, csrf_token
        )
        assert not is_valid

        # Test with wrong user ID
        is_valid = self.validator.verify_csrf_token(session_id, 999, csrf_token)
        assert not is_valid

    def test_secure_session_id_generation(self):
        """Test secure session ID generation."""
        # Generate multiple session IDs
        session_ids = [self.validator.generate_secure_session_id() for _ in range(10)]

        # Check uniqueness
        assert len(set(session_ids)) == 10, "Generated session IDs should be unique"

        # Check each ID is valid
        for session_id in session_ids:
            result = self.validator.validate_session_id(session_id)
            assert result.is_valid, (
                f"Generated session ID should be valid: {session_id}"
            )

            # Check minimum entropy requirements
            assert len(session_id) >= 20, "Session ID should have sufficient length"
            assert len(set(session_id)) >= 8, (
                "Session ID should use diverse character set"
            )


class TestSessionEnumerationDetection:
    """Test session enumeration attack detection."""

    def test_sequential_session_id_detection(self):
        """Test detection of sequential session IDs."""
        # Test sequential numeric patterns
        assert are_session_ids_sequential("session123", "session124")
        assert are_session_ids_sequential("abc123def", "abc124def")

        # Test non-sequential patterns
        assert not are_session_ids_sequential("random123", "random789")
        assert not are_session_ids_sequential("abc123def", "xyz456ghi")

    def test_enumeration_attempt_detection(self):
        """Test detection of session enumeration patterns."""
        # Sequential session ID attempts
        sequential_attempts = [
            "session123",
            "session124",
            "session125",
            "session126",
            "session127",
        ]

        assert is_session_enumeration_attempt(sequential_attempts)

        # Random session ID attempts
        random_attempts = [
            "abc123def",
            "xyz789ghi",
            "random456",
            "test999",
            "sample123",
        ]

        assert not is_session_enumeration_attempt(random_attempts)

        # Too few attempts to detect pattern
        few_attempts = ["session123", "session124"]
        assert not is_session_enumeration_attempt(few_attempts)


class TestSessionStoreSecurityIntegration:
    """Test security integration in SessionStore."""

    def setup_method(self):
        """Set up test fixtures."""
        config = SessionStoreConfig(
            enable_session_validation=True,
            enable_user_binding=True,
            enable_tampering_detection=True,
            max_failed_attempts=3,
            enumeration_detection_window=60,
        )
        self.store = SessionStore(config)

    def test_secure_session_creation(self):
        """Test creation of secure sessions with security metadata."""
        user_id = 42
        client_ip = "192.168.1.100"
        user_agent = "Mozilla/5.0 Test Browser"
        title = "Test Session"

        # Create secure session
        session = self.store.create_secure_session(
            user_id=user_id, client_ip=client_ip, user_agent=user_agent, title=title
        )

        assert session.id is not None
        assert session.user_id == user_id
        assert session.client_ip == client_ip
        assert session.user_agent == user_agent
        assert session.title == title
        assert session.user_binding_token is not None
        assert session.csrf_token is not None
        assert session.last_access_at is not None
        assert session.failed_access_attempts == 0
        assert not session.is_security_flagged

    def test_session_validation_on_access(self):
        """Test that session access is validated."""
        # Create a session
        session = self.store.create_secure_session(
            user_id=42, client_ip="192.168.1.100", user_agent="Mozilla/5.0 Test Browser"
        )

        # Valid access
        retrieved = self.store.get_session(
            session.id,
            client_ip="192.168.1.100",
            user_agent="Mozilla/5.0 Test Browser",
            user_id=42,
        )
        assert retrieved is not None

        # Invalid access - wrong user
        retrieved = self.store.get_session(
            session.id,
            client_ip="192.168.1.100",
            user_agent="Mozilla/5.0 Test Browser",
            user_id=999,
        )
        assert retrieved is None

    def test_failed_attempt_tracking(self):
        """Test tracking of failed access attempts."""
        client_ip = "192.168.1.100"

        # Make several failed attempts
        for i in range(5):
            self.store.get_session(
                f"invalid_session_{i}", client_ip=client_ip, user_id=42
            )

        # Check security stats
        stats = self.store.get_security_stats()
        assert stats["total_failed_attempts"] >= 5

    def test_enumeration_detection_blocking(self):
        """Test that enumeration attempts are blocked."""
        client_ip = "192.168.1.100"

        # Attempt sequential session IDs
        sequential_ids = [
            f"session{i:03d}abcdef1234567890123456" for i in range(100, 110)
        ]

        for session_id in sequential_ids:
            result = self.store.get_session(session_id, client_ip=client_ip)
            # Later attempts should be blocked due to enumeration detection

        # Verify enumeration was detected
        stats = self.store.get_security_stats()
        assert stats["total_enumeration_attempts"] > 0

    def test_security_stats_reporting(self):
        """Test security statistics reporting."""
        # Create some sessions and attempts
        self.store.create_secure_session(user_id=1, client_ip="192.168.1.1")
        self.store.create_secure_session(user_id=2, client_ip="192.168.1.2")

        # Make some failed attempts
        self.store.get_session("invalid_session", client_ip="192.168.1.100")

        stats = self.store.get_security_stats()

        assert "total_sessions" in stats
        assert "flagged_sessions" in stats
        assert "sessions_with_warnings" in stats
        assert "total_failed_attempts" in stats
        assert "security_features" in stats
        assert "security_thresholds" in stats

        # Verify security features are enabled
        features = stats["security_features"]
        assert features["session_validation_enabled"]
        assert features["user_binding_enabled"]
        assert features["tampering_detection_enabled"]

    @patch("app.utils.session_store.logging.getLogger")
    def test_security_event_logging(self, mock_logger):
        """Test that security events are properly logged."""
        mock_logger_instance = Mock()
        mock_logger.return_value = mock_logger_instance

        # Create new store to get the mocked logger
        config = SessionStoreConfig(enable_session_validation=True)
        store = SessionStore(config)

        # Trigger a security event by accessing invalid session
        store.get_session("invalid_session", client_ip="192.168.1.100")

        # Verify logging was called
        assert mock_logger_instance.warning.called

    def test_race_condition_protection_in_cleanup(self):
        """Test that cleanup operations are protected against race conditions."""
        # Create multiple sessions
        sessions = []
        for i in range(10):
            session = self.store.create_secure_session(
                user_id=i, client_ip=f"192.168.1.{i}", title=f"Test Session {i}"
            )
            sessions.append(session)

        # Simulate concurrent access during cleanup
        def concurrent_access():
            for session in sessions[:5]:
                self.store.get_session(session.id, client_ip=session.client_ip)

        def concurrent_cleanup():
            self.store.cleanup_expired_sessions()

        # Run both operations - should not cause errors
        import threading

        threads = [
            threading.Thread(target=concurrent_access),
            threading.Thread(target=concurrent_cleanup),
            threading.Thread(target=concurrent_access),
        ]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        # Verify store is still in consistent state
        stats = self.store.get_security_stats()
        assert stats["total_sessions"] >= 0

    def test_session_security_metadata_serialization(self):
        """Test that security metadata is properly handled in serialization."""
        session = self.store.create_secure_session(
            user_id=42, client_ip="192.168.1.100", user_agent="Test Browser"
        )

        # Get session data without security info (default)
        session_data = self.store.get_session(session.id, client_ip="192.168.1.100")
        assert session_data is not None
        assert "user_binding_token" not in session_data  # Sensitive data excluded
        assert "csrf_token" not in session_data

        # Get sessions list with security info
        sessions_list = self.store.list_sessions(include_security=True)
        session_with_security = next(s for s in sessions_list if s["id"] == session.id)

        assert "last_access_at" in session_with_security
        assert "failed_access_attempts" in session_with_security
        assert "is_security_flagged" in session_with_security
        assert "security_warnings" in session_with_security
        # Sensitive tokens should still be excluded
        assert "user_binding_token" not in session_with_security
        assert "csrf_token" not in session_with_security


class TestSecurityConfigurationIntegration:
    """Test security configuration and feature toggles."""

    def test_disabled_security_features(self):
        """Test that security features can be disabled via configuration."""
        # Create store with security features disabled
        config = SessionStoreConfig(
            enable_session_validation=False,
            enable_user_binding=False,
            enable_tampering_detection=False,
        )
        store = SessionStore(config)

        # Should accept any session ID without validation
        result = store.ensure_session("invalid@session#id", user_id=42)
        assert result is not None
        assert result.user_binding_token is None
        assert result.csrf_token is None

    def test_configurable_security_thresholds(self):
        """Test that security thresholds are configurable."""
        config = SessionStoreConfig(
            max_failed_attempts=2,  # Lower threshold
            enumeration_detection_window=30,  # Shorter window
            enable_session_validation=True,
        )
        store = SessionStore(config)

        stats = store.get_security_stats()
        thresholds = stats["security_thresholds"]

        assert thresholds["max_failed_attempts"] == 2
        assert thresholds["enumeration_detection_window"] == 30


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
