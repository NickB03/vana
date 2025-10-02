"""Unit tests for bcrypt password security implementation.

This test suite validates that the bcrypt password hashing implementation
is secure and meets security requirements for CRIT-002.

Tests verify:
1. Password hashing uses bcrypt (not SHA256)
2. Password verification works correctly
3. Hash format is correct ($2b$ prefix)
4. Password strength validation
5. Migration from SHA256 to bcrypt
"""

import pytest
from app.auth.security import (
    get_password_hash,
    verify_password,
    validate_password_strength,
)
from app.auth.password_migration import (
    simple_hash,
    verify_old_password,
    check_hash_type,
)


class TestBcryptPasswordHashing:
    """Test bcrypt password hashing functionality."""

    def test_password_hash_uses_bcrypt(self):
        """Verify that password hashing uses bcrypt format."""
        password = "SecurePass123!"
        hashed = get_password_hash(password)

        # Bcrypt hashes start with $2b$ or $2a$
        assert hashed.startswith('$2b$') or hashed.startswith('$2a$'), \
            "Password hash must use bcrypt format"

        # Bcrypt hashes are 60 characters long
        assert len(hashed) == 60, \
            f"Bcrypt hash should be 60 characters, got {len(hashed)}"

    def test_password_verification_succeeds(self):
        """Test that correct password verification succeeds."""
        password = "TestPassword123!"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed), \
            "Password verification should succeed for correct password"

    def test_password_verification_fails_wrong_password(self):
        """Test that wrong password verification fails."""
        password = "TestPassword123!"
        wrong_password = "WrongPassword456!"
        hashed = get_password_hash(password)

        assert not verify_password(wrong_password, hashed), \
            "Password verification should fail for incorrect password"

    def test_password_hashes_are_unique(self):
        """Test that same password generates different hashes (salt)."""
        password = "TestPassword123!"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2, \
            "Bcrypt should generate unique hashes due to random salt"

        # But both should verify correctly
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)

    def test_bcrypt_rounds_configuration(self):
        """Test that bcrypt uses sufficient rounds (12-14)."""
        password = "TestPassword123!"
        hashed = get_password_hash(password)

        # Extract rounds from hash format: $2b$rounds$...
        parts = hashed.split('$')
        rounds = int(parts[2])

        assert rounds >= 12, \
            f"Bcrypt should use at least 12 rounds, got {rounds}"
        assert rounds <= 14, \
            f"Bcrypt should use at most 14 rounds for performance, got {rounds}"

    def test_empty_password_hashing(self):
        """Test that empty passwords can be hashed (though they fail validation)."""
        password = ""
        hashed = get_password_hash(password)

        assert hashed.startswith('$2b$') or hashed.startswith('$2a$')
        assert verify_password(password, hashed)

    def test_long_password_hashing(self):
        """Test hashing of very long passwords."""
        password = "A" * 100 + "123!"  # 104 character password
        hashed = get_password_hash(password)

        assert verify_password(password, hashed)


class TestPasswordStrengthValidation:
    """Test password strength validation requirements."""

    def test_valid_strong_password(self):
        """Test that strong passwords pass validation."""
        strong_passwords = [
            "SecurePass123!",
            "MyP@ssw0rd",
            "Test123!@#",
            "Aa1!Bb2@Cc3#",
        ]

        for password in strong_passwords:
            assert validate_password_strength(password), \
                f"Password '{password}' should pass validation"

    def test_invalid_short_password(self):
        """Test that passwords under 8 characters fail."""
        short_passwords = [
            "Pass1!",
            "Aa1!",
            "Test1@",
        ]

        for password in short_passwords:
            assert not validate_password_strength(password), \
                f"Password '{password}' should fail (too short)"

    def test_invalid_no_uppercase(self):
        """Test that passwords without uppercase fail."""
        assert not validate_password_strength("password123!"), \
            "Password should fail without uppercase letter"

    def test_invalid_no_lowercase(self):
        """Test that passwords without lowercase fail."""
        assert not validate_password_strength("PASSWORD123!"), \
            "Password should fail without lowercase letter"

    def test_invalid_no_digit(self):
        """Test that passwords without digits fail."""
        assert not validate_password_strength("Password!@#"), \
            "Password should fail without digit"

    def test_invalid_no_special_char(self):
        """Test that passwords without special characters fail."""
        assert not validate_password_strength("Password123"), \
            "Password should fail without special character"


class TestSHA256Migration:
    """Test SHA256 to bcrypt migration functionality."""

    def test_check_hash_type_bcrypt(self):
        """Test hash type detection for bcrypt."""
        bcrypt_hash = get_password_hash("test")
        assert check_hash_type(bcrypt_hash) == 'bcrypt'

    def test_check_hash_type_sha256(self):
        """Test hash type detection for SHA256 (legacy)."""
        sha256_hash = simple_hash("test")
        assert check_hash_type(sha256_hash) == 'sha256'
        assert len(sha256_hash) == 64  # SHA256 is 64 hex chars

    def test_verify_old_password_sha256(self):
        """Test verification against old SHA256 hash."""
        password = "Test123!"
        old_hash = simple_hash(password)

        assert verify_old_password(password, old_hash), \
            "Should verify against old SHA256 hash"
        assert not verify_old_password("WrongPass", old_hash), \
            "Should fail for wrong password"

    def test_sha256_different_from_bcrypt(self):
        """Ensure SHA256 and bcrypt produce different hashes."""
        password = "Test123!"
        sha256_hash = simple_hash(password)
        bcrypt_hash = get_password_hash(password)

        assert sha256_hash != bcrypt_hash, \
            "SHA256 and bcrypt should produce different hashes"

        # SHA256 should NOT verify with bcrypt
        assert not verify_password(password, sha256_hash), \
            "Bcrypt should not verify SHA256 hashes"


class TestSecurityRequirements:
    """Test that implementation meets security requirements."""

    def test_no_plaintext_password_storage(self):
        """Ensure passwords are never stored in plaintext."""
        password = "Test123!"
        hashed = get_password_hash(password)

        assert password not in hashed, \
            "Password hash must not contain plaintext password"

    def test_constant_time_verification(self):
        """Test that verification doesn't leak timing information."""
        import time

        password = "Test123!"
        hashed = get_password_hash(password)

        # Time correct password
        start = time.perf_counter()
        verify_password(password, hashed)
        correct_time = time.perf_counter() - start

        # Time incorrect password (same length)
        start = time.perf_counter()
        verify_password("Wrong123!", hashed)
        wrong_time = time.perf_counter() - start

        # Times should be similar (within 10x factor)
        # Bcrypt is designed to be constant-time
        ratio = max(correct_time, wrong_time) / min(correct_time, wrong_time)
        assert ratio < 10, \
            f"Timing ratio {ratio} suggests timing attack vulnerability"

    def test_bcrypt_computational_cost(self):
        """Test that bcrypt hashing has sufficient computational cost."""
        import time

        password = "Test123!"

        start = time.perf_counter()
        get_password_hash(password)
        elapsed = time.perf_counter() - start

        # Bcrypt with 12 rounds should take at least 50ms
        assert elapsed > 0.05, \
            f"Bcrypt should take at least 50ms, took {elapsed*1000:.2f}ms"

    def test_hash_uniqueness_with_same_salt(self):
        """Ensure that bcrypt generates unique salts."""
        password = "Test123!"
        hashes = [get_password_hash(password) for _ in range(10)]

        # All hashes should be unique
        assert len(set(hashes)) == len(hashes), \
            "Each bcrypt hash should have a unique salt"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
