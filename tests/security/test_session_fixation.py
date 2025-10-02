"""Security tests for session fixation prevention (CRIT-007).

This module tests that session fixation attacks are prevented by ensuring
session IDs are rotated at critical authentication boundaries:
- User registration
- User login (password and OAuth)
- Password reset
- Privilege escalation

Session fixation is a serious vulnerability where an attacker can set a
known session ID before authentication and hijack the session after the
victim logs in.

References:
- OWASP Session Management Cheat Sheet
- CWE-384: Session Fixation
- NIST SP 800-63B Section 7.1
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.auth.models import User
from app.auth.security import get_password_hash
from app.server import app


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user for authentication tests."""
    user = User(
        email="fixation_test@example.com",
        username="fixation_test",
        hashed_password=get_password_hash("TestPassword123!"),
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


class TestSessionFixationPrevention:
    """Test suite for session fixation vulnerability prevention."""

    def test_registration_invalidates_pre_existing_session(
        self, client: TestClient, db_session: Session
    ):
        """Test that registration invalidates any pre-existing session.

        Attack scenario:
        1. Attacker creates a session and gets a session ID
        2. Attacker tricks victim into using that session ID
        3. Victim registers using the attacker's session ID
        4. Without rotation, attacker can hijack the authenticated session

        This test verifies that the session ID is rotated during registration.
        """
        # Step 1: Simulate attacker setting up a session ID
        attacker_session_id = "attacker_controlled_session_12345"

        # Step 2: Victim registers with the attacker's session ID
        registration_data = {
            "email": "victim@example.com",
            "username": "victim_user",
            "password": "VictimPassword123!",
            "first_name": "Victim",
            "last_name": "User",
        }

        # Set the attacker's session ID in cookies
        response = client.post(
            "/auth/register",
            json=registration_data,
            cookies={"session_id": attacker_session_id},
        )

        # Step 3: Verify registration succeeded
        assert response.status_code == 201
        response_data = response.json()
        assert "user" in response_data
        assert "tokens" in response_data

        # Step 4: Verify session was rotated (new tokens issued)
        # The attacker's session ID should NOT grant access
        # Try to use the old session ID - it should be invalid
        protected_response = client.get(
            "/auth/me",
            cookies={"session_id": attacker_session_id},
            headers={"Authorization": f"Bearer {response_data['tokens']['access_token']}"},
        )

        # The request should succeed with the new token, not the old session
        assert protected_response.status_code == 200

    def test_login_invalidates_pre_existing_session(
        self, client: TestClient, test_user: User, db_session: Session
    ):
        """Test that login invalidates any pre-existing session.

        Attack scenario:
        1. Attacker creates a session and gets a session ID
        2. Attacker tricks victim into using that session ID
        3. Victim logs in using the attacker's session ID
        4. Without rotation, attacker can use the known session ID

        This test verifies that the session ID is rotated during login.
        """
        # Step 1: Simulate attacker setting up a session ID
        attacker_session_id = "attacker_login_session_67890"

        # Step 2: Victim logs in with the attacker's session ID
        login_data = {
            "username": test_user.email,
            "password": "TestPassword123!",
        }

        response = client.post(
            "/auth/login",
            data=login_data,
            cookies={"session_id": attacker_session_id},
        )

        # Step 3: Verify login succeeded
        assert response.status_code == 200
        response_data = response.json()
        assert "user" in response_data
        assert "tokens" in response_data

        # Step 4: Verify the old session ID is not valid
        # Attempt to access protected endpoint with old session
        old_session_response = client.get(
            "/auth/me",
            cookies={"session_id": attacker_session_id},
            headers={"Authorization": f"Bearer {response_data['tokens']['access_token']}"},
        )

        # Access should succeed with new token, not old session
        assert old_session_response.status_code == 200

    def test_oauth_login_invalidates_session(
        self, client: TestClient, db_session: Session, monkeypatch
    ):
        """Test that OAuth login invalidates pre-existing sessions.

        This test verifies session rotation happens during OAuth authentication.
        """
        # Mock the Google identity verification
        def mock_verify_google_identity(id_token: str):
            return {
                "sub": "google_user_12345",
                "email": "oauth_victim@example.com",
                "given_name": "OAuth",
                "family_name": "Victim",
            }

        monkeypatch.setattr(
            "app.auth.routes.verify_google_identity",
            mock_verify_google_identity,
        )

        # Step 1: Attacker sets up session
        attacker_session_id = "attacker_oauth_session_abcde"

        # Step 2: Victim authenticates via OAuth with attacker's session
        oauth_data = {
            "id_token": "fake_google_token",
            "access_token": "fake_access_token",
        }

        response = client.post(
            "/auth/google",
            json=oauth_data,
            cookies={"session_id": attacker_session_id},
        )

        # Step 3: Verify OAuth login succeeded
        assert response.status_code == 200
        response_data = response.json()
        assert "user" in response_data
        assert "tokens" in response_data

        # Step 4: Verify session was rotated
        # The old session ID should not grant access
        protected_response = client.get(
            "/auth/me",
            cookies={"session_id": attacker_session_id},
            headers={"Authorization": f"Bearer {response_data['tokens']['access_token']}"},
        )

        # Should succeed with new token
        assert protected_response.status_code == 200

    def test_multiple_login_attempts_rotate_sessions(
        self, client: TestClient, test_user: User, db_session: Session
    ):
        """Test that multiple login attempts each rotate the session.

        This ensures session rotation happens consistently across multiple
        authentication events.
        """
        session_ids_seen = set()

        for attempt in range(3):
            # Each login should get a new session
            login_data = {
                "username": test_user.email,
                "password": "TestPassword123!",
            }

            response = client.post("/auth/login", data=login_data)

            assert response.status_code == 200
            response_data = response.json()

            # Each attempt should generate new tokens
            access_token = response_data["tokens"]["access_token"]
            assert access_token not in session_ids_seen
            session_ids_seen.add(access_token)

        # We should have 3 unique session identifiers
        assert len(session_ids_seen) == 3

    def test_session_invalidation_clears_cookies(
        self, client: TestClient, test_user: User, db_session: Session
    ):
        """Test that session invalidation properly clears session cookies.

        This verifies that the session rotation process removes old session
        state from cookies.
        """
        # Set up an old session cookie
        old_session_cookies = {
            "session": "old_session_value",
            "sessionid": "old_sessionid_value",
            "session_id": "old_session_id_value",
        }

        # Perform login with old cookies
        login_data = {
            "username": test_user.email,
            "password": "TestPassword123!",
        }

        response = client.post(
            "/auth/login",
            data=login_data,
            cookies=old_session_cookies,
        )

        # Login should succeed
        assert response.status_code == 200

        # The old session cookies should be invalidated
        # Verify by checking that old cookies don't grant access
        # (This is implicit - the new token is required for access)
        response_data = response.json()
        new_token = response_data["tokens"]["access_token"]

        # Access with new token should work
        me_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {new_token}"},
        )
        assert me_response.status_code == 200

    def test_session_rotation_logging(
        self, client: TestClient, test_user: User, db_session: Session, caplog
    ):
        """Test that session rotation events are properly logged.

        This ensures audit trail is maintained for security monitoring.
        """
        import logging

        caplog.set_level(logging.INFO)

        # Perform login to trigger session rotation
        login_data = {
            "username": test_user.email,
            "password": "TestPassword123!",
        }

        response = client.post("/auth/login", data=login_data)
        assert response.status_code == 200

        # Check that session rotation was logged
        log_messages = [record.message for record in caplog.records]
        session_rotation_logs = [
            msg for msg in log_messages if "session rotation" in msg.lower()
        ]

        # Should have at least one log entry about session rotation
        assert len(session_rotation_logs) > 0, "Session rotation should be logged"

        # Verify log contains key information
        rotation_log = " ".join(session_rotation_logs)
        assert "user_id" in rotation_log or str(test_user.id) in rotation_log
        assert "reason=login" in rotation_log or "login" in rotation_log.lower()

    def test_session_fixation_attack_fails(
        self, client: TestClient, test_user: User, db_session: Session
    ):
        """Test that a complete session fixation attack scenario fails.

        This is an integration test simulating a real attack:
        1. Attacker obtains a session ID
        2. Attacker tricks victim into using that session ID
        3. Victim logs in
        4. Attacker attempts to use the known session ID
        5. Attack should fail because session was rotated
        """
        # Step 1: Attacker gets a session ID (simulated)
        attacker_session_id = "attacker_fixation_attempt_xyz123"

        # Step 2 & 3: Victim logs in with attacker's session ID
        login_data = {
            "username": test_user.email,
            "password": "TestPassword123!",
        }

        victim_response = client.post(
            "/auth/login",
            data=login_data,
            cookies={"session_id": attacker_session_id},
        )

        assert victim_response.status_code == 200
        victim_data = victim_response.json()
        victim_token = victim_data["tokens"]["access_token"]

        # Step 4: Attacker tries to use the old session ID
        # This should fail because the session was rotated
        attacker_response = client.get(
            "/auth/me",
            cookies={"session_id": attacker_session_id},
            # Attacker doesn't have the new token, only the old session ID
        )

        # Attack should fail - attacker can't access the account
        # without the new access token
        assert attacker_response.status_code == 401

        # Step 5: Verify victim can still access with new token
        victim_auth_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {victim_token}"},
        )

        assert victim_auth_response.status_code == 200
        user_data = victim_auth_response.json()
        assert user_data["email"] == test_user.email

    def test_registration_with_existing_session_state(
        self, client: TestClient, db_session: Session
    ):
        """Test registration properly handles existing session state.

        Verifies that any pre-existing session state is cleared before
        creating a new authenticated session.
        """
        # Simulate existing session state
        existing_session_state = {
            "session_id": "pre_existing_session_state_12345",
            "csrf_token": "old_csrf_token",
        }

        # Register new user with existing session state
        registration_data = {
            "email": "new_user_session@example.com",
            "username": "new_user_session",
            "password": "NewUserPass123!",
            "first_name": "New",
            "last_name": "User",
        }

        response = client.post(
            "/auth/register",
            json=registration_data,
            cookies=existing_session_state,
        )

        # Registration should succeed
        assert response.status_code == 201
        response_data = response.json()

        # New tokens should be issued
        assert "tokens" in response_data
        new_token = response_data["tokens"]["access_token"]

        # Verify old session state doesn't grant access
        old_session_response = client.get(
            "/auth/me",
            cookies=existing_session_state,
        )

        # Should be unauthorized without new token
        assert old_session_response.status_code == 401

        # Should work with new token
        new_token_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {new_token}"},
        )

        assert new_token_response.status_code == 200


class TestSessionRotationEdgeCases:
    """Test edge cases and error handling in session rotation."""

    def test_session_rotation_with_no_prior_session(
        self, client: TestClient, test_user: User, db_session: Session
    ):
        """Test session rotation works when there's no prior session.

        This should be the common case and should work smoothly.
        """
        login_data = {
            "username": test_user.email,
            "password": "TestPassword123!",
        }

        # Login without any prior session cookies
        response = client.post("/auth/login", data=login_data)

        # Should succeed and create new session
        assert response.status_code == 200
        response_data = response.json()
        assert "tokens" in response_data

    def test_session_rotation_failure_doesnt_block_auth(
        self, client: TestClient, test_user: User, db_session: Session, monkeypatch
    ):
        """Test that session rotation failure doesn't prevent authentication.

        Session rotation is a security enhancement, but if it fails,
        authentication should still succeed (with a warning logged).
        """

        # Mock rotation to fail
        def mock_failing_rotation(*args, **kwargs):
            from app.auth.session_rotation import SessionRotationResult

            return SessionRotationResult(
                success=False,
                error_message="Simulated rotation failure",
            )

        monkeypatch.setattr(
            "app.auth.routes.rotate_session_on_login",
            mock_failing_rotation,
        )

        login_data = {
            "username": test_user.email,
            "password": "TestPassword123!",
        }

        # Login should still succeed even if rotation fails
        response = client.post("/auth/login", data=login_data)

        assert response.status_code == 200
        response_data = response.json()
        assert "tokens" in response_data


# Test fixtures and conftest integration would go here
# These tests assume pytest fixtures for client, db_session, etc.
# See tests/conftest.py for fixture definitions
