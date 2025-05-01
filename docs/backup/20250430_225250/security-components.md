# VANA Security Components

This document provides an overview of the security components implemented in the VANA project.

## Table of Contents

1. [Credential Management](#credential-management)
2. [Access Control](#access-control)
3. [Audit Logging](#audit-logging)
4. [Structured Logging](#structured-logging)
5. [Health Checks](#health-checks)
6. [Circuit Breakers](#circuit-breakers)
7. [Integration Guide](#integration-guide)

## Credential Management

The credential management system provides secure storage and retrieval of sensitive credentials.

### Features

- Encryption of sensitive values
- Secure credential retrieval
- Credential caching for performance
- Masking of sensitive information in logs

### Usage

```python
from tools.security import CredentialManager

# Create a credential manager
credential_manager = CredentialManager()

# Get a credential
api_key = credential_manager.get_credential("MCP_API_KEY")

# Store a credential securely
encrypted_value = credential_manager.store_credential("NEW_API_KEY", "secret_value")

# Get predefined credential sets
mcp_credentials = credential_manager.get_mcp_credentials()
vector_search_credentials = credential_manager.get_vector_search_credentials()
```

## Access Control

The access control framework provides permission-based access control for memory operations.

### Features

- Role-based permissions (Guest, User, Agent, Admin)
- Operation-level access control
- Entity type restrictions
- Decorator for securing functions

### Usage

```python
from tools.security import AccessControlManager, Role, Operation, require_permission

# Create an access control manager
acm = AccessControlManager()

# Check permissions
if acm.authorize(Role.USER, Operation.STORE_ENTITY, "user_data"):
    # Perform operation
    pass

# Secure a method with the decorator
class MemoryClient:
    def __init__(self):
        self.access_control = AccessControlManager()
        self.role = Role.AGENT
    
    @require_permission(Operation.STORE_ENTITY, entity_type_arg="entity_type")
    def store_entity(self, entity_name, entity_type, observations):
        # Implementation
        pass
```

## Audit Logging

The audit logging system provides secure, tamper-evident logging for sensitive operations.

### Features

- Tamper-evident logs with hash chaining
- Filtering of sensitive information
- Comprehensive metadata
- Log integrity verification

### Usage

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

# Verify log integrity
verification_result = audit_logger.verify_log_integrity()

# Retrieve audit logs
logs = audit_logger.get_audit_logs(
    start_time="2023-01-01T00:00:00",
    end_time="2023-01-31T23:59:59",
    event_types=["access", "modification"],
    user_id="user123",
    limit=100
)
```

## Structured Logging

The structured logging system provides standardized logging with correlation IDs and context tracking.

### Features

- Standardized log format
- Correlation IDs for tracking operations
- Context information
- JSON output for machine processing

### Usage

```python
from tools.logging import StructuredLogger

# Create a structured logger
logger = StructuredLogger("memory_manager")

# Set correlation ID for tracking operations
correlation_id = logger.set_correlation_id()

# Add context information
logger.add_context("user_id", "user123")
logger.add_context("session_id", "session456")

# Log messages at different levels
logger.info("Initializing memory manager")
logger.warning("Connection attempt failed, retrying", operation="connect")
logger.error("Failed to connect to MCP server", operation="connect", extra={"endpoint": "https://example.com"})

# Log memory operations
logger.log_memory_operation(
    operation="store_entity",
    status="success",
    details={"entity_name": "test_entity"}
)
```

## Health Checks

The health check system provides monitoring for system components.

### Features

- Component-level health checks
- Overall system health status
- Detailed health information
- Configurable check intervals

### Usage

```python
from tools.monitoring import HealthCheck, HealthStatus, MemorySystemHealthCheck

# Create a health check
health_check = HealthCheck()

# Register component health checks
health_check.register_component(
    "mcp_server",
    lambda: MemorySystemHealthCheck.check_mcp_server(mcp_client)
)

health_check.register_component(
    "memory_manager",
    lambda: MemorySystemHealthCheck.check_memory_manager(memory_manager)
)

# Check health
health_status = health_check.check_health()

# Check specific component
component_status = health_check.check_component("mcp_server")
```

## Circuit Breakers

The circuit breaker pattern provides protection against cascading failures when external services are unavailable.

### Features

- Automatic circuit opening on failures
- Half-open state for testing recovery
- Configurable thresholds and timeouts
- Decorator for protecting functions

### Usage

```python
from tools.resilience import CircuitBreaker, circuit_breaker, registry

# Create a circuit breaker
cb = CircuitBreaker(
    name="mcp_server",
    failure_threshold=5,
    reset_timeout=60.0,
    half_open_max_calls=1
)

# Use as a decorator
@cb
def call_mcp_server():
    # Implementation
    pass

# Use the global registry
cb = registry.get_or_create("vector_search")

# Use the decorator directly
@circuit_breaker("web_search", failure_threshold=3, reset_timeout=30.0)
def search_web(query):
    # Implementation
    pass

# Get circuit breaker states
states = registry.get_states()
```

## Integration Guide

### Integrating with Memory Client

```python
from tools.security import CredentialManager, AccessControlManager, Role
from tools.security import AuditLogger
from tools.logging import StructuredLogger
from tools.monitoring import HealthCheck, MemorySystemHealthCheck
from tools.resilience import circuit_breaker

class SecureMemoryClient:
    def __init__(self):
        # Initialize security components
        self.credential_manager = CredentialManager()
        self.access_control = AccessControlManager()
        self.audit_logger = AuditLogger()
        self.logger = StructuredLogger("memory_client")
        self.health_check = HealthCheck()
        
        # Set role
        self.role = Role.AGENT
        
        # Get credentials
        mcp_credentials = self.credential_manager.get_mcp_credentials()
        
        # Initialize MCP client
        self.mcp_client = MCPMemoryClient(
            endpoint=mcp_credentials["endpoint"],
            namespace=mcp_credentials["namespace"],
            api_key=mcp_credentials["api_key"]
        )
        
        # Register health checks
        self.health_check.register_component(
            "mcp_server",
            lambda: MemorySystemHealthCheck.check_mcp_server(self.mcp_client)
        )
    
    @circuit_breaker("store_entity", failure_threshold=3, reset_timeout=60.0)
    def store_entity(self, entity_name, entity_type, observations):
        # Set correlation ID for tracking
        correlation_id = self.logger.set_correlation_id()
        
        # Add context information
        self.logger.add_context("entity_name", entity_name)
        self.logger.add_context("entity_type", entity_type)
        
        # Log operation start
        self.logger.info(f"Storing entity: {entity_name}", operation="store_entity")
        
        try:
            # Check authorization
            if not self.access_control.authorize(self.role, "store_entity", entity_type):
                self.logger.warning("Access denied", operation="store_entity")
                self.audit_logger.log_event(
                    event_type="access_denied",
                    user_id=self.role.value,
                    operation="store_entity",
                    resource_type="entity",
                    details={"entity_name": entity_name, "entity_type": entity_type},
                    status="failure"
                )
                return {"error": "Access denied", "success": False}
            
            # Store entity
            result = self.mcp_client.store_entity(entity_name, entity_type, observations)
            
            # Log result
            if "error" in result:
                self.logger.error(f"Failed to store entity: {result['error']}", operation="store_entity")
                status = "failure"
            else:
                self.logger.info(f"Entity stored successfully", operation="store_entity")
                status = "success"
            
            # Audit log
            self.audit_logger.log_event(
                event_type="modification",
                user_id=self.role.value,
                operation="store_entity",
                resource_type="entity",
                resource_id=result.get("entityId"),
                details={"entity_name": entity_name, "entity_type": entity_type},
                status=status
            )
            
            return result
        except Exception as e:
            self.logger.error(f"Error storing entity: {str(e)}", operation="store_entity", exc_info=True)
            self.audit_logger.log_event(
                event_type="error",
                user_id=self.role.value,
                operation="store_entity",
                resource_type="entity",
                details={"entity_name": entity_name, "entity_type": entity_type, "error": str(e)},
                status="failure"
            )
            raise
        finally:
            # Clear context
            self.logger.clear_context()
```

### Health Check API Endpoint

```python
from flask import Flask, jsonify
from tools.monitoring import HealthCheck, MemorySystemHealthCheck

app = Flask(__name__)
health_check = HealthCheck()

# Register health checks
health_check.register_component(
    "mcp_server",
    lambda: MemorySystemHealthCheck.check_mcp_server(mcp_client)
)

health_check.register_component(
    "memory_manager",
    lambda: MemorySystemHealthCheck.check_memory_manager(memory_manager)
)

@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify(health_check.check_health())

@app.route('/health/<component>')
def component_health(component):
    """Component health check endpoint."""
    return jsonify(health_check.check_component(component))

if __name__ == '__main__':
    app.run(debug=True)
```
