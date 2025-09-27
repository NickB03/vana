#!/usr/bin/env python3
"""Generate password hash for test user"""

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
password = "Test123!"
hashed = pwd_context.hash(password)

print(f"Password: {password}")
print(f"Hash: {hashed}")

# Verify it works
is_valid = pwd_context.verify(password, hashed)
print(f"Verification: {'✅ Works' if is_valid else '❌ Failed'}")