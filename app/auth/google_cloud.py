"""Google Cloud IAM integration for authentication."""

import os
from typing import Any

from google.auth import default
from google.auth.transport import requests
from google.cloud import iam_admin_v1
from google.oauth2 import id_token


def verify_google_identity(id_token_str: str) -> dict[str, Any]:
    """Verify Google ID token and return user information."""
    try:
        # Google OAuth client ID is required to validate the token audience
        client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
        if not client_id:
            raise ValueError(
                "GOOGLE_OAUTH_CLIENT_ID is not configured. "
                "Obtain OAuth credentials from Google Cloud Console and set the environment variable."
            )

        # Verify the token against the configured client ID
        request = requests.Request()
        id_info = id_token.verify_oauth2_token(
            id_token_str,
            request,
            audience=client_id,
        )

        # Verify the issuer
        if id_info["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Wrong issuer")

        return id_info

    except ValueError as e:
        raise ValueError(f"Invalid Google ID token: {e}") from e


def get_google_user_info(access_token: str) -> dict[str, Any]:
    """Get user information from Google using access token."""
    import httpx

    try:
        response = httpx.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        response.raise_for_status()
        return response.json()

    except httpx.HTTPError as e:
        raise ValueError(f"Failed to get Google user info: {e}") from e


class GoogleCloudIAM:
    """Google Cloud IAM integration for role and permission management."""

    def __init__(self, project_id: str | None = None):
        self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.credentials, _ = default()
        self.iam_client = iam_admin_v1.IAMClient(credentials=self.credentials)

    def get_user_roles(self, user_email: str) -> list[str]:
        """Get Google Cloud IAM roles for a user."""
        try:
            if not self.project_id:
                return []

            # Get IAM policy for the project
            resource = f"projects/{self.project_id}"
            request = iam_admin_v1.GetIamPolicyRequest(resource=resource)
            policy = self.iam_client.get_iam_policy(request=request)

            user_roles = []
            member_identity = f"user:{user_email}"

            for binding in policy.bindings:
                if member_identity in binding.members:
                    user_roles.append(binding.role)

            return user_roles

        except Exception as e:
            print(f"Error getting Google Cloud roles for {user_email}: {e}")
            return []

    def has_role(self, user_email: str, role: str) -> bool:
        """Check if user has a specific Google Cloud IAM role."""
        user_roles = self.get_user_roles(user_email)
        return role in user_roles

    def has_permission(self, user_email: str, permission: str) -> bool:
        """Check if user has a specific Google Cloud IAM permission."""
        try:
            if not self.project_id:
                return False

            # Test IAM permissions
            resource = f"projects/{self.project_id}"
            iam_admin_v1.TestIamPermissionsRequest(
                resource=resource,
                permissions=[permission]
            )

            # This would require impersonation or service account setup
            # For now, we'll return False as this requires more complex setup
            return False

        except Exception as e:
            print(f"Error testing Google Cloud permission {permission} for {user_email}: {e}")
            return False

    def get_service_account_info(self) -> dict[str, Any]:
        """Get information about the current service account."""
        try:
            if hasattr(self.credentials, 'service_account_email'):
                return {
                    "email": self.credentials.service_account_email,
                    "project_id": self.project_id,
                    "has_credentials": True
                }
            else:
                return {
                    "email": None,
                    "project_id": self.project_id,
                    "has_credentials": False
                }

        except Exception as e:
            return {
                "error": str(e),
                "has_credentials": False
            }


def map_google_roles_to_local(google_roles: list[str]) -> list[str]:
    """Map Google Cloud IAM roles to local application roles."""
    role_mapping = {
        "roles/owner": ["admin", "user"],
        "roles/editor": ["user"],
        "roles/viewer": ["viewer"],
        "roles/compute.admin": ["admin"],
        "roles/storage.admin": ["admin"],
        "roles/logging.viewer": ["viewer"],
        "roles/monitoring.viewer": ["viewer"],
    }

    local_roles = set()
    for google_role in google_roles:
        if google_role in role_mapping:
            local_roles.update(role_mapping[google_role])

    # Default to user role if no mapping found
    if not local_roles:
        local_roles.add("user")

    return list(local_roles)


def sync_user_roles_from_google(user_email: str, db, user_model) -> list[str]:
    """Sync user roles from Google Cloud IAM to local database."""
    try:
        iam = GoogleCloudIAM()
        google_roles = iam.get_user_roles(user_email)
        local_roles = map_google_roles_to_local(google_roles)

        # Update user roles in database
        user = db.query(user_model).filter(user_model.email == user_email).first()
        if user:
            from .models import Role

            # Get role objects
            roles = db.query(Role).filter(Role.name.in_(local_roles)).all()
            user.roles = roles
            db.commit()

        return local_roles

    except Exception as e:
        print(f"Error syncing roles for {user_email}: {e}")
        return ["user"]  # Default role


def create_google_cloud_user_binding(user_email: str, role: str) -> bool:
    """Create IAM binding for user in Google Cloud (requires admin permissions)."""
    try:
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        if not project_id:
            return False

        iam = GoogleCloudIAM(project_id)

        # Get current IAM policy
        resource = f"projects/{project_id}"
        request = iam_admin_v1.GetIamPolicyRequest(resource=resource)
        policy = iam.iam_client.get_iam_policy(request=request)

        # Add user to role binding
        member = f"user:{user_email}"
        binding_found = False

        for binding in policy.bindings:
            if binding.role == role:
                if member not in binding.members:
                    binding.members.append(member)
                binding_found = True
                break

        if not binding_found:
            # Create new binding
            from google.iam.v1 import policy_pb2
            new_binding = policy_pb2.Binding(
                role=role,
                members=[member]
            )
            policy.bindings.append(new_binding)

        # Set updated policy
        set_request = iam_admin_v1.SetIamPolicyRequest(
            resource=resource,
            policy=policy
        )
        iam.iam_client.set_iam_policy(request=set_request)

        return True

    except Exception as e:
        print(f"Error creating Google Cloud binding for {user_email}: {e}")
        return False


# Global IAM instance for reuse
google_iam = GoogleCloudIAM() if os.getenv("GOOGLE_CLOUD_PROJECT") else None


def get_google_iam() -> GoogleCloudIAM | None:
    """Get Google Cloud IAM instance."""
    return google_iam
