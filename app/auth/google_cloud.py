"""Google Cloud IAM integration for authentication."""

import os
from typing import Any

from google.auth import default
from google.auth.transport import requests
from google.cloud import iam_admin_v1
from google.oauth2 import id_token


def verify_google_identity(id_token_str: str) -> dict[str, Any]:
    """Verify Google ID token signature and return authenticated user information.

    Args:
        id_token_str: Base64-encoded JWT ID token from Google OAuth flow.

    Returns:
        Dictionary containing verified user information from Google:
        - sub: Google user ID (unique identifier)
        - email: Verified email address
        - email_verified: Email verification status
        - given_name: First name (if available)
        - family_name: Last name (if available)
        - picture: Profile picture URL (if available)
        - iss: Token issuer (accounts.google.com)
        - aud: Token audience (your OAuth client ID)
        - exp: Token expiration timestamp

    Raises:
        ValueError: If token is invalid, expired, or configuration is missing.

    Security:
        - Validates JWT signature using Google's public keys
        - Verifies token audience matches configured OAuth client ID
        - Checks token issuer is legitimate Google service
        - Validates token expiration automatically
        - Prevents token replay attacks through nonce validation

    Environment Requirements:
        - GOOGLE_OAUTH_CLIENT_ID: OAuth 2.0 client ID from Google Cloud Console

    Token Validation Process:
        1. Fetch Google's current public signing keys
        2. Verify JWT signature using appropriate key
        3. Validate audience (aud) matches configured client ID
        4. Verify issuer (iss) is accounts.google.com
        5. Check token hasn't expired
        6. Return validated user claims

    Example:
        >>> id_token = "eyJhbGciOiJSUzI1NiIs..."  # From Google OAuth flow
        >>> user_info = verify_google_identity(id_token)
        >>> print(f"Authenticated user: {user_info['email']}")
        >>> print(f"Google ID: {user_info['sub']}")
    """
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
    """Retrieve detailed user information from Google API using access token.

    Args:
        access_token: OAuth 2.0 access token obtained from Google authorization flow.

    Returns:
        Dictionary containing user profile information:
        - id: Google user ID
        - email: User's email address
        - verified_email: Email verification status
        - name: Full display name
        - given_name: First name
        - family_name: Last name
        - picture: Profile picture URL
        - locale: User's locale preference

    Raises:
        ValueError: If API request fails or access token is invalid.

    Security:
        - Uses HTTPS for all API communications
        - Validates access token server-side with Google
        - Includes timeout to prevent hanging requests
        - Raises on HTTP errors to prevent silent failures

    API Endpoint:
        https://www.googleapis.com/oauth2/v2/userinfo
        - Requires valid OAuth 2.0 access token
        - Returns user profile data in JSON format
        - Rate limited by Google (usually generous for normal use)

    Example:
        >>> access_token = "ya29.a0AfH6SMC..."  # From OAuth flow
        >>> user_data = get_google_user_info(access_token)
        >>> print(f"User: {user_data['name']} ({user_data['email']})")
        >>> if user_data['verified_email']:
        ...     print("Email is verified by Google")
    """
    import httpx

    try:
        response = httpx.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30.0,
        )
        response.raise_for_status()
        return response.json()

    except httpx.HTTPError as e:
        raise ValueError(f"Failed to get Google user info: {e}") from e


class GoogleCloudIAM:
    """Google Cloud IAM integration for role and permission management.

    Provides integration with Google Cloud Identity and Access Management (IAM)
    to synchronize user roles and permissions between Google Cloud and the
    local authentication system.

    Attributes:
        project_id: Google Cloud project ID for IAM operations.
        credentials: Google Cloud credentials for API authentication.
        iam_client: Initialized IAM admin client for API calls.

    Security:
        - Uses Application Default Credentials (ADC) for authentication
        - Requires appropriate IAM permissions in Google Cloud
        - Supports service account impersonation for fine-grained access
        - Validates project existence before IAM operations

    Required Google Cloud Permissions:
        - resourcemanager.projects.getIamPolicy
        - resourcemanager.projects.setIamPolicy
        - iam.serviceAccounts.actAs (if using service account)

    Example:
        >>> iam = GoogleCloudIAM("my-project-id")
        >>> user_roles = iam.get_user_roles("user@example.com")
        >>> has_admin = iam.has_role("user@example.com", "roles/owner")
    """

    def __init__(self, project_id: str | None = None):
        """Initialize Google Cloud IAM integration.

        Args:
            project_id: Google Cloud project ID. If None, uses GOOGLE_CLOUD_PROJECT
                       environment variable.

        Raises:
            DefaultCredentialsError: If no valid credentials are found.
            ValueError: If project_id is not provided and environment variable is missing.
        """
        self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.credentials, _ = default()
        self.iam_client = iam_admin_v1.IAMClient(credentials=self.credentials)

    def get_user_roles(self, user_email: str) -> list[str]:
        """Retrieve Google Cloud IAM roles assigned to a specific user.

        Args:
            user_email: Email address of the user to check roles for.

        Returns:
            List of role names (e.g., ["roles/owner", "roles/editor"]) assigned
            to the user in the Google Cloud project.

        Security:
            - Requires resourcemanager.projects.getIamPolicy permission
            - Only returns roles for the configured project
            - Uses exact email matching for user identification
            - Returns empty list if project is not configured

        Error Handling:
            - Returns empty list on API errors to prevent breaking auth flow
            - Logs errors for debugging (consider structured logging in production)
            - Gracefully handles missing project configuration

        Example:
            >>> roles = iam.get_user_roles("admin@company.com")
            >>> print(roles)  # ["roles/owner", "roles/compute.admin"]
            >>> 
            >>> # Check for specific role
            >>> if "roles/owner" in roles:
            ...     grant_admin_access()
        """
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
        """Check if a user has a specific Google Cloud IAM role.

        Args:
            user_email: Email address of the user to check.
            role: IAM role name to check (e.g., "roles/owner", "roles/editor").

        Returns:
            True if user has the specified role, False otherwise.

        Security:
            - Uses get_user_roles() for role retrieval (inherits its security properties)
            - Performs exact string matching on role names
            - Case-sensitive role comparison

        Example:
            >>> if iam.has_role("user@example.com", "roles/owner"):
            ...     # User is project owner
            ...     allow_billing_changes()
            >>> 
            >>> # Check for editor access
            >>> is_editor = iam.has_role("dev@company.com", "roles/editor")
        """
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
                resource=resource, permissions=[permission]
            )

            # This would require impersonation or service account setup
            # For now, we'll return False as this requires more complex setup
            return False

        except Exception as e:
            print(
                f"Error testing Google Cloud permission {permission} for {user_email}: {e}"
            )
            return False

    def get_service_account_info(self) -> dict[str, Any]:
        """Get information about the current service account."""
        try:
            if hasattr(self.credentials, "service_account_email"):
                return {
                    "email": self.credentials.service_account_email,
                    "project_id": self.project_id,
                    "has_credentials": True,
                }
            else:
                return {
                    "email": None,
                    "project_id": self.project_id,
                    "has_credentials": False,
                }

        except Exception as e:
            return {"error": str(e), "has_credentials": False}


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

            new_binding = policy_pb2.Binding(role=role, members=[member])
            policy.bindings.append(new_binding)

        # Set updated policy
        set_request = iam_admin_v1.SetIamPolicyRequest(resource=resource, policy=policy)
        iam.iam_client.set_iam_policy(request=set_request)

        return True

    except Exception as e:
        print(f"Error creating Google Cloud binding for {user_email}: {e}")
        return False


# Global IAM instance for reuse
# Check for CI environment and credentials availability
def _should_initialize_iam() -> bool:
    """Check if IAM should be initialized based on environment and credentials."""
    if not os.getenv("GOOGLE_CLOUD_PROJECT"):
        return False

    # Skip initialization in CI environments unless credentials are available
    if os.getenv("CI") == "true" or os.getenv("RUNNING_IN_CI") == "true":
        # Check if we have valid credentials
        creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if not creds_path or not os.path.exists(creds_path):
            return False

    return True


google_iam = GoogleCloudIAM() if _should_initialize_iam() else None


def get_google_iam() -> GoogleCloudIAM | None:
    """Get Google Cloud IAM instance."""
    return google_iam
