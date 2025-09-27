#!/usr/bin/env python3
"""Test authentication implementation"""

import sys
import json
sys.path.insert(0, '.')

from app.simple_auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password
)

def test_auth():
    print("Testing JWT Authentication Implementation")
    print("=" * 50)

    # Test 1: Password hashing
    print("\n1. Testing password hashing...")
    test_password = "Test123!"
    hashed = get_password_hash(test_password)
    print(f"   Original: {test_password}")
    print(f"   Hashed: {hashed[:50]}...")

    # Test 2: Password verification
    print("\n2. Testing password verification...")
    is_valid = verify_password(test_password, hashed)
    print(f"   Password verification: {'✅ PASSED' if is_valid else '❌ FAILED'}")

    # Test 3: User authentication
    print("\n3. Testing user authentication...")
    user = authenticate_user(email="test@test.com", username=None, password="Test123!")
    if user:
        print(f"   ✅ Authentication successful!")
        print(f"   User: {user.email} (ID: {user.id})")
    else:
        print("   ❌ Authentication failed!")

    # Test 4: Token creation
    print("\n4. Testing token creation...")
    if user:
        access_token = create_access_token(data={
            "username": user.username,
            "email": user.email,
            "user_id": user.id,
        })
        refresh_token = create_refresh_token(data={
            "username": user.username,
            "email": user.email,
            "user_id": user.id,
        })

        print(f"   Access token created: {access_token[:50]}...")
        print(f"   Refresh token created: {refresh_token[:50]}...")

        # Test 5: Token decoding
        print("\n5. Testing token decoding...")
        try:
            payload = decode_token(access_token)
            print(f"   ✅ Token decoded successfully!")
            print(f"   Payload: {json.dumps(payload, indent=2)}")
        except Exception as e:
            print(f"   ❌ Token decoding failed: {e}")

    # Test 6: Invalid credentials
    print("\n6. Testing invalid credentials...")
    invalid_user = authenticate_user(email="test@test.com", username=None, password="WrongPassword")
    print(f"   Invalid password: {'❌ Correctly rejected' if not invalid_user else '✅ ERROR - Should fail!'}")

    invalid_email = authenticate_user(email="wrong@email.com", username=None, password="Test123!")
    print(f"   Invalid email: {'❌ Correctly rejected' if not invalid_email else '✅ ERROR - Should fail!'}")

    print("\n" + "=" * 50)
    print("✅ All authentication tests completed!")
    print("\nTest Account Credentials:")
    print("  Email: test@test.com")
    print("  Password: Test123!")

if __name__ == "__main__":
    test_auth()