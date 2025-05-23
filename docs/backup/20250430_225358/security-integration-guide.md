# Security Integration Guide

This document provides a guide for integrating security components with the VANA memory system.

## Table of Contents

1. [Overview](#overview)
2. [Security Components](#security-components)
3. [Integration with Memory System](#integration-with-memory-system)
4. [Testing](#testing)
5. [Best Practices](#best-practices)

## Overview

The VANA memory system has been enhanced with security components to provide:

- Secure credential management
- Role-based access control
- Audit logging
- Circuit breaker protection

These components work together to provide a secure, resilient memory system that can handle failures gracefully and maintain a comprehensive audit trail.

## Security Components

### Credential Manager

The `CredentialManager` class provides secure credential management with the following features:

- Encryption of sensitive values
- Secure credential retrieval
- Credential caching for performance
- Masking of sensitive information in logs

```python
from tools.security import CredentialManager

# Create a credential manager
credential_manager = CredentialManager()

# Get a credential
api_key = credential_manager.get_credential("MCP_API_KEY")

# Get predefined credential sets
mcp_credentials = credential_manager.get_mcp_credentials()
```

### Access Control

The `AccessControlManager` class implements a permission model for memory operations:

- Role-based permissions (Guest, User, Agent, Admin)
- Operation-level access control
- Entity type restrictions
- Decorator for securing functions

```python
from tools.security import AccessControlManager, Role, Operation, require_permission

# Create an access control manager
acm = AccessControlManager()

# Check permissions
if acm.authorize(Role.USER, Operation.STORE_ENTITY, "user_data"):
    # Perform operation
    pass

# Secure a method with the decorator
@require_permission(Operation.STORE_ENTITY, entity_type_arg="entity_type")
def store_entity(entity_name, entity_type, observations):
    # Implementation
    pass
```

### Audit Logging

The `AuditLogger` class provides secure, tamper-evident logging for sensitive operations:

- Tamper-evident logs with hash chaining
- Filtering of sensitive information
- Comprehensive metadata
- Log integrity verification

```python
from tools.security import AuditLogger

# Create an audit logger
audit_logger = AuditLogger()

# Log an event
audit_logger.log_event(
    event_type="access",
    user_id="user123",
    operation="retrieve_entity",
    resource_type="entity",
    resource_id="entity123",
    details={"query": "search query"},
    status="success"
)

# Get audit logs
logs = audit_logger.get_audit_logs(limit=10)

# Verify log integrity
verification = audit_logger.verify_log_integrity()
```

### Circuit Breakers

The `CircuitBreaker` class implements the circuit breaker pattern to protect against cascading failures:

- Automatic circuit opening on failures
- Half-open state for testing recovery
- Configurable thresholds and timeouts
- Decorator for protecting functions

```python
from tools.resilience import CircuitBreaker, circuit_breaker, registry

# Use the decorator directly
@circuit_breaker("mcp_server", failure_threshold=3, reset_timeout=60.0)
def call_mcp_server():
    # Implementation
    pass

# Get circuit breaker states
states = registry.get_states()
```

## Integration with Memory System

The security components have been integrated with the memory system in the following ways:

### MCPMemoryClient Integration

The `MCPMemoryClient` class has been updated to use the security components:

```python
from tools.security import CredentialManager, AccessControlManager, Role
from tools.security import AuditLogger
from tools.resilience import circuit_breaker

class SecureMCPMemoryClient:
    def __init__(self):
        # Initialize security components
        self.credential_manager = CredentialManager()
        self.access_control = AccessControlManager()
        self.audit_logger = AuditLogger()
        
        # Set role for access control
        self.role = Role.AGENT
        
        # Get secure credentials
        mcp_credentials = self.credential_manager.get_mcp_credentials()
        
        # Initialize MCP client
        self.mcp_client = MCPMemoryClient(
            endpoint=mcp_credentials["endpoint"],
            namespace=mcp_credentials["namespace"],
            api_key=mcp_credentials["api_key"]
        )
    
    @circuit_breaker("store_entity", failure_threshold=3, reset_timeout=60.0)
    @require_permission(Operation.STORE_ENTITY, entity_type_arg="entity_type")
    def store_entity(self, entity_name, entity_type, observations):
        # Implementation with audit logging
        pass
```

### MemoryManager Integration

The `MemoryManager` class has been updated to use the security components:

```python
from tools.security import CredentialManager, AccessControlManager, Role
from tools.security import AuditLogger
from tools.resilience import circuit_breaker

class SecureMemoryManager:
    def __init__(self, mcp_client):
        # Initialize security components
        self.credential_manager = CredentialManager()
        self.access_control = AccessControlManager()
        self.audit_logger = AuditLogger()
        
        # Set role for access control
        self.role = Role.AGENT
        
        # Initialize memory manager
        self.mcp_client = mcp_client
        self.local_cache = {}
        
        # Get configuration
        memory_config = self.credential_manager.get_memory_config()
        self.sync_interval = memory_config["sync_interval"]
        self.local_db_path = memory_config["local_db_path"]
    
    @circuit_breaker("initialize", failure_threshold=3, reset_timeout=60.0)
    def initialize(self):
        # Implementation with audit logging
        pass
```

## Testing

The security integration can be tested using the provided scripts:

### Test Secure Memory

The `test_secure_memory.py` script tests the integration of security components with the memory system:

```bash
python scripts/test_secure_memory.py
```

This script tests:

- Credential manager
- Secure MCP client
- Audit logging
- Circuit breaker

### Test Local Memory

The `test_local_memory.py` script tests the memory system with the local MCP server:

```bash
python scripts/test_local_memory.py
```

This script tests:

- Local MCP server connection
- Memory manager initialization
- Hybrid search

### Initialize Local MCP

The `initialize_local_mcp.py` script initializes the local MCP server with basic entity types and relationships:

```bash
python scripts/initialize_local_mcp.py
```

## Best Practices

When working with the secure memory system, follow these best practices:

1. **Use the CredentialManager**: Always use the `CredentialManager` to retrieve credentials, rather than accessing environment variables directly.

2. **Apply Access Control**: Use the `@require_permission` decorator to secure methods that access sensitive data.

3. **Log Sensitive Operations**: Use the `AuditLogger` to log sensitive operations, such as storing or retrieving entities.

4. **Protect External Calls**: Use the `@circuit_breaker` decorator to protect calls to external services, such as the MCP server.

5. **Handle Circuit Breaker Errors**: Catch and handle `CircuitBreakerOpenError` exceptions to provide graceful degradation when external services are unavailable.

6. **Verify Log Integrity**: Periodically verify the integrity of audit logs using the `verify_log_integrity` method.

7. **Monitor Circuit Breaker States**: Monitor the states of circuit breakers using the `registry.get_states` method to detect issues with external services.

8. **Use Local Development Environment**: Use the local MCP server for development and testing to avoid affecting production data.

9. **Test Security Components**: Regularly test the security components to ensure they are working correctly.

10. **Keep Security Components Updated**: Keep the security components updated with the latest security patches and improvements.
