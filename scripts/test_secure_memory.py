#!/usr/bin/env python3
"""
Test Secure Memory Integration

This script tests the integration of security components with the memory system.
"""

import logging
import os
import sys

from dotenv import load_dotenv

# Add project root to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


def test_credential_manager():
    """Test the credential manager."""
    from tools.security import CredentialManager

    logger.info("Testing CredentialManager...")

    # Create credential manager
    credential_manager = CredentialManager()

    # Get MCP credentials
    mcp_credentials = credential_manager.get_mcp_credentials()

    # Check if credentials are available
    if mcp_credentials["api_key"]:
        logger.info("✅ MCP API key is available")
    else:
        logger.warning("⚠️ MCP API key is not available")

    if mcp_credentials["endpoint"]:
        logger.info(f"✅ MCP endpoint is available: {mcp_credentials['endpoint']}")
    else:
        logger.warning("⚠️ MCP endpoint is not available")

    if mcp_credentials["namespace"]:
        logger.info(f"✅ MCP namespace is available: {mcp_credentials['namespace']}")
    else:
        logger.warning("⚠️ MCP namespace is not available")

    return mcp_credentials


def test_secure_mcp_client(mcp_credentials):
    """Test the secure MCP client."""
    from tools.mcp_memory_client import MCPMemoryClient
    from tools.resilience import CircuitBreakerOpenError

    logger.info("Testing secure MCPMemoryClient...")

    # Create MCP client
    mcp_client = MCPMemoryClient(
        endpoint=mcp_credentials["endpoint"],
        namespace=mcp_credentials["namespace"],
        api_key=mcp_credentials["api_key"],
    )

    # Check if client is initialized
    logger.info(f"MCP client initialized with endpoint: {mcp_client.endpoint}")
    logger.info(f"MCP client role: {mcp_client.role}")

    # Test storing an entity
    try:
        logger.info("Testing store_entity...")
        result = mcp_client.store_entity(
            entity_name="Test Entity",
            entity_type="Test",
            observations=["This is a test entity created for security testing"],
        )

        if result.get("success", False):
            logger.info("✅ Successfully stored entity")
            entity_id = result.get("entity", {}).get("id", "Unknown")
            logger.info(f"Entity ID: {entity_id}")
        else:
            logger.warning(
                f"⚠️ Failed to store entity: {result.get('error', 'Unknown error')}"
            )
    except CircuitBreakerOpenError as e:
        logger.error(f"❌ Circuit breaker open: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error storing entity: {str(e)}")

    # Test retrieving an entity
    try:
        logger.info("Testing retrieve_entity...")
        result = mcp_client.retrieve_entity("Test Entity")

        if "entity" in result:
            logger.info("✅ Successfully retrieved entity")
            entity = result["entity"]
            logger.info(f"Entity: {entity.get('name')} ({entity.get('type')})")
        else:
            logger.warning(
                f"⚠️ Failed to retrieve entity: {result.get('error', 'Unknown error')}"
            )
    except CircuitBreakerOpenError as e:
        logger.error(f"❌ Circuit breaker open: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Error retrieving entity: {str(e)}")

    return mcp_client


def test_audit_logging():
    """Test audit logging."""
    from tools.security import AuditLogger

    logger.info("Testing AuditLogger...")

    # Create audit logger
    audit_logger = AuditLogger()

    # Log a test event
    success = audit_logger.log_event(
        event_type="test",
        user_id="test_user",
        operation="test_operation",
        resource_type="test_resource",
        resource_id="test_id",
        details={"test_key": "test_value"},
        status="success",
    )

    if success:
        logger.info("✅ Successfully logged audit event")
    else:
        logger.warning("⚠️ Failed to log audit event")

    # Get audit logs
    logs = audit_logger.get_audit_logs(limit=1)

    if logs:
        logger.info(f"✅ Retrieved {len(logs)} audit logs")
    else:
        logger.warning("⚠️ No audit logs found")

    # Verify log integrity
    verification = audit_logger.verify_log_integrity()

    if verification["verified"]:
        logger.info("✅ Audit log integrity verified")
        logger.info(
            f"Checked {verification['files_checked']} files and {verification['entries_checked']} entries"
        )
    else:
        logger.warning("⚠️ Audit log integrity verification failed")
        logger.warning(f"Errors: {verification['errors']}")

    return audit_logger


def test_circuit_breaker():
    """Test circuit breaker."""
    from tools.resilience import CircuitBreaker, circuit_breaker, registry

    logger.info("Testing CircuitBreaker...")

    # Get circuit breaker states
    states = registry.get_states()

    if states:
        logger.info(f"✅ Retrieved {len(states)} circuit breaker states")
        for name, state in states.items():
            logger.info(f"Circuit breaker '{name}': {state['state']}")
    else:
        logger.warning("⚠️ No circuit breakers found")

    # Create a test circuit breaker
    cb = CircuitBreaker(
        name="test_circuit",
        failure_threshold=3,
        reset_timeout=60.0,
        half_open_max_calls=1,
    )

    logger.info(f"Created test circuit breaker: {cb.name}")
    logger.info(f"Initial state: {cb.state.value}")

    # Test circuit breaker decorator
    @circuit_breaker("test_decorator")
    def test_function():
        return "success"

    result = test_function()
    logger.info(f"Test function result: {result}")

    # Get the circuit breaker from the registry
    cb = registry.get("test_decorator")

    if cb:
        logger.info(f"✅ Retrieved circuit breaker from registry: {cb.name}")
        logger.info(f"State: {cb.state.value}")
    else:
        logger.warning("⚠️ Circuit breaker not found in registry")

    return registry


def main():
    """Main function."""
    logger.info("=== Testing Secure Memory Integration ===")

    # Test credential manager
    mcp_credentials = test_credential_manager()

    # Test secure MCP client
    mcp_client = test_secure_mcp_client(mcp_credentials)

    # Test audit logging
    audit_logger = test_audit_logging()

    # Test circuit breaker
    circuit_breaker_registry = test_circuit_breaker()

    logger.info("=== Secure Memory Integration Test Complete ===")


if __name__ == "__main__":
    main()
