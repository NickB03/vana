"""Standalone bcrypt security test - CRIT-002 validation.

This test can run independently without conftest dependencies.
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))


def test_bcrypt_implementation():
    """Verify bcrypt implementation is working correctly."""
    from app.auth.security import get_password_hash, verify_password

    # Test 1: Hash format
    password = "Test123!"
    hashed = get_password_hash(password)

    print(f"✅ Test 1: Password hashed")
    print(f"   Hash format: {hashed[:10]}...")
    assert hashed.startswith('$2b$') or hashed.startswith('$2a$'), \
        "Hash must use bcrypt format"
    print(f"   ✅ Bcrypt format verified")

    # Test 2: Verification
    assert verify_password(password, hashed), \
        "Correct password should verify"
    print(f"✅ Test 2: Password verification successful")

    # Test 3: Wrong password fails
    assert not verify_password("WrongPass123!", hashed), \
        "Wrong password should fail"
    print(f"✅ Test 3: Wrong password correctly rejected")

    # Test 4: Unique salts
    hash2 = get_password_hash(password)
    assert hash2 != hashed, "Salts should be unique"
    assert verify_password(password, hash2), "Both hashes should verify"
    print(f"✅ Test 4: Unique salts verified")

    # Test 5: Hash length
    assert len(hashed) == 60, f"Bcrypt hash should be 60 chars, got {len(hashed)}"
    print(f"✅ Test 5: Hash length correct (60 characters)")

    # Test 6: Extract and verify rounds
    parts = hashed.split('$')
    rounds = int(parts[2])
    assert 12 <= rounds <= 14, f"Rounds should be 12-14, got {rounds}"
    print(f"✅ Test 6: Bcrypt rounds = {rounds} (within 12-14 range)")

    print("\n" + "="*60)
    print("🎉 ALL BCRYPT SECURITY TESTS PASSED!")
    print("✅ CRIT-002: SHA256 successfully replaced with bcrypt")
    print("="*60)


def test_migration_detection():
    """Test SHA256 to bcrypt migration utilities."""
    from app.auth.password_migration import check_hash_type, simple_hash
    from app.auth.security import get_password_hash

    # SHA256 hash (old method)
    password = "Test123!"
    sha256_hash = simple_hash(password)

    print(f"\n📊 Migration Detection Tests:")
    print(f"   SHA256 hash length: {len(sha256_hash)}")
    assert check_hash_type(sha256_hash) == 'sha256'
    print(f"   ✅ SHA256 hash detected correctly")

    # Bcrypt hash (new method)
    bcrypt_hash = get_password_hash(password)
    assert check_hash_type(bcrypt_hash) == 'bcrypt'
    print(f"   ✅ Bcrypt hash detected correctly")

    # Verify they're different
    assert sha256_hash != bcrypt_hash
    print(f"   ✅ SHA256 and bcrypt produce different hashes")

    print("\n✅ Migration detection working correctly!")


if __name__ == "__main__":
    print("="*60)
    print("CRIT-002: BCRYPT PASSWORD SECURITY VALIDATION")
    print("="*60 + "\n")

    try:
        test_bcrypt_implementation()
        test_migration_detection()
        print("\n✨ All security requirements validated successfully!")
        exit(0)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
