# Vector Search Audit Logging

[Home](../../index.md) > [Implementation](index.md) > Vector Search Audit Logging

## Overview

The Vector Search Audit Logging system provides comprehensive logging for security-sensitive operations in the Vector Search subsystem. It creates tamper-evident logs for operations such as searches, updates, and configuration changes, enabling security monitoring, compliance, and forensic analysis.

## Key Components

### 1. VectorSearchAuditLogger

The `VectorSearchAuditLogger` class (`tools/vector_search/vector_search_audit.py`) is the core component responsible for audit logging. It leverages the `AuditLogger` from the security module to create tamper-evident logs.

### 2. Integration with VectorSearchClient

The `VectorSearchClient` class (`tools/vector_search/vector_search_client.py`) has been enhanced to use the audit logger for all security-sensitive operations, including:

- Search operations
- Vector store searches
- Content uploads
- Batch uploads
- Configuration changes

## Implementation Details

### VectorSearchAuditLogger Class

The `VectorSearchAuditLogger` class provides specialized methods for logging different types of Vector Search operations:

#### Initialization

```python
def __init__(self, log_dir: str = "logs/audit/vector_search"):
    """
    Initialize the Vector Search Audit Logger.
    
    Args:
        log_dir: Directory for audit logs (default: logs/audit/vector_search)
    """
    # Create log directory if it doesn't exist
    os.makedirs(log_dir, exist_ok=True)
    
    # Create audit logger
    self.audit_logger = AuditLogger(
        log_dir=log_dir,
        log_prefix="vector_search_audit",
        max_file_size_mb=10,
        max_files=10
    )
```

#### Logging Methods

1. **Search Operations**

```python
def log_search(self, user_id: str, query: str, num_results: int, 
              metadata_filter: Optional[Dict[str, Any]] = None,
              status: str = "success", details: Optional[Dict[str, Any]] = None) -> bool:
```

This method logs Vector Search operations, capturing:
- User ID
- Search query
- Number of results requested
- Metadata filters used
- Operation status
- Additional details

2. **Update Operations**

```python
def log_update(self, user_id: str, operation_type: str, num_items: int,
              item_ids: Optional[List[str]] = None, 
              status: str = "success", details: Optional[Dict[str, Any]] = None) -> bool:
```

This method logs Vector Search update operations, capturing:
- User ID
- Operation type (upsert/remove)
- Number of items affected
- Item IDs
- Operation status
- Additional details

3. **Configuration Changes**

```python
def log_config_change(self, user_id: str, config_type: str, 
                     old_value: Optional[Any] = None, new_value: Optional[Any] = None,
                     status: str = "success", details: Optional[Dict[str, Any]] = None) -> bool:
```

This method logs Vector Search configuration changes, capturing:
- User ID
- Configuration type
- Old and new values
- Operation status
- Additional details

4. **Access Events**

```python
def log_access(self, user_id: str, access_type: str, 
              resource_id: Optional[str] = None,
              status: str = "success", details: Optional[Dict[str, Any]] = None) -> bool:
```

This method logs Vector Search access events, capturing:
- User ID
- Access type (read/write/admin)
- Resource ID
- Operation status
- Additional details

### Integration with VectorSearchClient

The `VectorSearchClient` class has been enhanced to use the audit logger for all security-sensitive operations:

#### Search Operations

```python
def search(self, query: str, top_k: int = 5, user_id: str = "system") -> List[Dict[str, Any]]:
    # Audit log the search attempt
    audit_details = {"method": "search", "top_k": top_k}
    
    # Log search events at various points in the method
    vector_search_audit_logger.log_search(
        user_id=user_id,
        query=query,
        num_results=top_k,
        status="success|failure",
        details=audit_details
    )
```

#### Vector Store Search Operations

```python
def search_vector_store(self, query_embedding: List[float], top_k: int = 5,
                      user_id: str = "system", original_query: str = None) -> List[Dict[str, Any]]:
    # Audit log the vector store search attempt
    audit_details = {
        "method": "search_vector_store",
        "top_k": top_k,
        "embedding_length": len(query_embedding) if query_embedding else 0
    }
    
    # Log search events at various points in the method
    vector_search_audit_logger.log_search(
        user_id=user_id,
        query=original_query or f"embedding_length_{len(query_embedding)}",
        num_results=top_k,
        status="success|failure",
        details=audit_details
    )
```

#### Upload Operations

```python
def upload_embedding(self, content: str, metadata: Dict[str, Any] = None, user_id: str = "system") -> bool:
    # Audit log the upload attempt
    audit_details = {
        "method": "upload_embedding",
        "content_length": len(content) if content else 0,
        "has_metadata": metadata is not None
    }
    
    # Log upload events at various points in the method
    vector_search_audit_logger.log_update(
        user_id=user_id,
        operation_type="upsert",
        num_items=1,
        status="success|failure",
        details=audit_details
    )
```

#### Batch Upload Operations

```python
def batch_upload_embeddings(self, items: List[Dict[str, Any]], user_id: str = "system") -> bool:
    # Audit log the batch upload attempt
    audit_details = {
        "method": "batch_upload_embeddings",
        "num_items": len(items)
    }
    
    # Log batch upload events at various points in the method
    vector_search_audit_logger.log_update(
        user_id=user_id,
        operation_type="batch_upsert",
        num_items=len(items),
        status="success|failure",
        details=audit_details
    )
```

## Log Format

The audit logs are stored in JSON format with the following structure:

```json
{
  "timestamp": "2023-06-01T12:34:56.789Z",
  "event_type": "search|update|config_change|access",
  "user_id": "user123",
  "operation": "vector_search|vector_upsert|vector_config_change|vector_access",
  "resource_type": "vector_index|vector_search_config",
  "resource_id": "deployed_index_id",
  "status": "success|failure|degraded",
  "details": {
    "method": "search|search_vector_store|upload_embedding|batch_upload_embeddings",
    "query": "example query",
    "num_results": 5,
    "embedding_length": 768,
    "content_length": 1024,
    "has_metadata": true,
    "error": "Error message if status is failure",
    "search_time_ms": 123.45,
    "api": "high-level|low-level",
    "using_mock": false
  }
}
```

## Security Considerations

1. **Tamper Evidence**: The audit logs are designed to be tamper-evident, making it difficult for malicious actors to modify logs without detection.

2. **Sensitive Data**: Care is taken to avoid logging sensitive data. For example, only the length of content is logged, not the content itself.

3. **User Identification**: All operations are associated with a user ID, enabling accountability and traceability.

4. **Comprehensive Coverage**: All security-sensitive operations are logged, including successes, failures, and degraded operations.

5. **Detailed Context**: Sufficient context is provided in the logs to enable effective security monitoring and forensic analysis.

## Usage Examples

### Searching for Security Events

```python
# Example: Search for failed search operations
import json
import glob

def find_failed_searches(log_dir="logs/audit/vector_search"):
    failed_searches = []
    for log_file in glob.glob(f"{log_dir}/*.json"):
        with open(log_file, 'r') as f:
            for line in f:
                try:
                    log_entry = json.loads(line)
                    if (log_entry.get("event_type") == "search" and 
                        log_entry.get("status") == "failure"):
                        failed_searches.append(log_entry)
                except json.JSONDecodeError:
                    continue
    return failed_searches
```

### Monitoring User Activity

```python
# Example: Monitor activity for a specific user
def get_user_activity(user_id, log_dir="logs/audit/vector_search"):
    user_activity = []
    for log_file in glob.glob(f"{log_dir}/*.json"):
        with open(log_file, 'r') as f:
            for line in f:
                try:
                    log_entry = json.loads(line)
                    if log_entry.get("user_id") == user_id:
                        user_activity.append(log_entry)
                except json.JSONDecodeError:
                    continue
    return user_activity
```

## Related Documentation

- [Security Overview](../architecture/security_overview.md): General security architecture in VANA
- [Security Integration Guide](../guides/security-integration.md): How to integrate with VANA's security features
- [API Security Guide](../guides/api-security.md): Security for API endpoints
