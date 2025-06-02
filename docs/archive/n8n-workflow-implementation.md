# n8n Workflow Implementation

This document provides detailed information about the n8n workflow implementation for the VANA project.

## Table of Contents

1. [Overview](#overview)
2. [Implementation Approach](#implementation-approach)
3. [Workflow Interface](#workflow-interface)
4. [Direct Implementation](#direct-implementation)
5. [n8n Workflow Definitions](#n8n-workflow-definitions)
6. [Integration with VANA](#integration-with-vana)
7. [Security Integration](#security-integration)
8. [Monitoring Capabilities](#monitoring-capabilities)
9. [Testing](#testing)
10. [Next Steps](#next-steps)

## Overview

The n8n workflow implementation provides a flexible approach to workflow automation for the VANA project. It allows for both direct implementation of workflows (without n8n) and integration with n8n when available, providing a consistent interface for workflow operations.

The implementation includes:

1. **Workflow Interface**: A consistent API for workflow operations
2. **Direct Implementation**: Fallback implementation when n8n is not available
3. **n8n Workflow Definitions**: JSON definitions for n8n workflows
4. **Integration with VANA**: Integration with the existing VANA components
5. **Security Integration**: Secure handling of credentials and authentication
6. **Monitoring Capabilities**: Logging and monitoring for workflow operations

## Implementation Approach

Based on the n8n integration assessment, we've implemented Option C (Defer n8n Integration) with a workflow interface that can work with or without n8n. This approach allows us to make progress on the core functionality while preparing for future n8n integration.

The implementation follows these principles:

1. **Consistent Interface**: Provide a consistent API for workflow operations
2. **Graceful Fallbacks**: Fall back to direct implementation when n8n is not available
3. **Minimal Dependencies**: Minimize dependencies on external services
4. **Future-Proof Design**: Design with future n8n integration in mind
5. **Comprehensive Logging**: Log all operations for monitoring and debugging

## Workflow Interface

The `WorkflowInterface` class provides a consistent API for workflow operations:

```python
class WorkflowInterface:
    """Interface for workflow management, with or without n8n."""

    def __init__(self):
        """Initialize workflow interface."""
        self.n8n_url = os.environ.get("N8N_WEBHOOK_URL", "")
        self.n8n_username = os.environ.get("N8N_WEBHOOK_USERNAME", "")
        self.n8n_password = os.environ.get("N8N_WEBHOOK_PASSWORD", "")
        self.n8n_available = self._check_n8n_available() if self.n8n_url else False

        if not self.n8n_available:
            logger.info("n8n not available. Using direct implementation for workflows.")
        else:
            logger.info(f"n8n available at {self.n8n_url}. Using n8n for workflows.")

    def _check_n8n_available(self) -> bool:
        """Check if n8n is available."""
        try:
            response = requests.get(f"{self.n8n_url}/healthz", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"n8n not available: {e}")
            return False

    def trigger_memory_save(self, buffer: List[Dict[str, str]], tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """Trigger memory save workflow."""
        if self.n8n_available:
            # Use n8n webhook
            return self._trigger_n8n_workflow("save-memory", {
                "buffer": buffer,
                "tags": tags or [],
                "memory_on": True
            })
        else:
            # Direct implementation
            from vana.memory import MemoryManager
            memory_manager = MemoryManager()
            return memory_manager.save_buffer(buffer, tags)

    # Additional methods for other workflows...

    def _trigger_n8n_workflow(self, workflow_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger n8n workflow via webhook."""
        try:
            webhook_url = f"{self.n8n_url}/webhook/{workflow_name}"

            # Use basic auth if credentials are provided
            auth = None
            if self.n8n_username and self.n8n_password:
                auth = (self.n8n_username, self.n8n_password)

            response = requests.post(
                webhook_url,
                json=data,
                headers={"Content-Type": "application/json"},
                auth=auth,
                timeout=30
            )

            if response.status_code == 200:
                return response.json()
            else:
                error_msg = f"n8n workflow error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {"error": f"Workflow failed with status {response.status_code}"}
        except Exception as e:
            error_msg = f"Error triggering n8n workflow: {e}"
            logger.error(error_msg)
            return {"error": str(e)}
```

The `WorkflowInterface` class provides methods for:

1. **Memory Save**: Save chat buffer to Vector Search and Knowledge Graph
2. **Memory Sync**: Synchronize memory between components
3. **Knowledge Graph Sync**: Synchronize entities with Knowledge Graph
4. **Document Processing**: Process documents and add them to Vector Search and Knowledge Graph

Each method checks if n8n is available and either triggers the corresponding n8n workflow or falls back to direct implementation.

## Direct Implementation

The direct implementation provides fallback functionality when n8n is not available:

### Memory Manager

The `MemoryManager` class provides memory management functionality:

```python
class MemoryManager:
    """Memory Manager for VANA."""

    def __init__(self):
        """Initialize Memory Manager."""
        self.memory_cache = {}
        self.memory_cache_size = int(os.environ.get("MEMORY_CACHE_SIZE", "1000"))
        self.memory_cache_ttl = int(os.environ.get("MEMORY_CACHE_TTL", "3600"))
        self.entity_half_life_days = int(os.environ.get("ENTITY_HALF_LIFE_DAYS", "30"))
        self.vector_search_weight = float(os.environ.get("VECTOR_SEARCH_WEIGHT", "0.7"))
        self.knowledge_graph_weight = float(os.environ.get("KNOWLEDGE_GRAPH_WEIGHT", "0.3"))

        # Initialize Vector Search client
        try:
            from vana.vector_search import VectorSearchClient
            self.vector_search_client = VectorSearchClient()
        except Exception as e:
            logger.warning(f"Failed to initialize Vector Search client: {e}")
            self.vector_search_client = None

        # Initialize Knowledge Graph client
        try:
            from vana.knowledge_graph import KnowledgeGraphClient
            self.kg_client = KnowledgeGraphClient()
        except Exception as e:
            logger.warning(f"Failed to initialize Knowledge Graph client: {e}")
            self.kg_client = None

    def save_buffer(self, buffer: List[Dict[str, str]], tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """Save buffer to memory."""
        # Implementation...

    def sync_memory(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """Sync memory for user and session."""
        # Implementation...

    def search_memory(self, query: str, user_id: Optional[str] = None, top_k: int = 5) -> Dict[str, Any]:
        """Search memory for query."""
        # Implementation...
```

### Knowledge Graph Manager

The `KnowledgeGraphManager` class provides knowledge graph management functionality:

```python
class KnowledgeGraphManager:
    """Knowledge Graph Manager for VANA."""

    def __init__(self):
        """Initialize Knowledge Graph Manager."""
        try:
            self.kg_client = KnowledgeGraphClient()
        except Exception as e:
            logger.warning(f"Failed to initialize Knowledge Graph client: {e}")
            self.kg_client = None

    def sync_entities(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Sync entities with Knowledge Graph."""
        # Implementation...

    def query_knowledge_graph(self, query: str, entity_type: Optional[str] = None, top_k: int = 5) -> Dict[str, Any]:
        """Query Knowledge Graph."""
        # Implementation...
```

### Document Processor

The `DocumentProcessor` class provides document processing functionality:

```python
class DocumentProcessor:
    """Document Processor for VANA."""

    def __init__(self):
        """Initialize Document Processor."""
        # Initialize Vector Search client
        try:
            from vana.vector_search import VectorSearchClient
            self.vector_search_client = VectorSearchClient()
        except Exception as e:
            logger.warning(f"Failed to initialize Vector Search client: {e}")
            self.vector_search_client = None

        # Initialize Knowledge Graph client
        try:
            from vana.knowledge_graph import KnowledgeGraphClient
            self.kg_client = KnowledgeGraphClient()
        except Exception as e:
            logger.warning(f"Failed to initialize Knowledge Graph client: {e}")
            self.kg_client = None

    def process(self, document_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Process document."""
        # Implementation...
```

## n8n Workflow Definitions

The n8n workflow definitions are stored in the `n8n-workflows` directory:

1. **Memory Save**: `memory_save.json`
2. **Memory Sync**: `memory_sync.json`
3. **Knowledge Graph Sync**: `kg_sync.json`
4. **Document Processing**: `document_processing.json`

Each workflow is defined as a JSON file that can be imported into n8n.

### Memory Save Workflow

The Memory Save workflow is triggered by the `!rag` command and saves the current chat buffer to Vector Search and Knowledge Graph:

1. **Webhook**: Receives the buffer data from the MCP interface
2. **Check Memory Status**: Verifies that memory recording is active
3. **Format For Vector Search**: Formats the buffer data for Vector Search
4. **Extract Entities**: Extracts entities from the buffer for Knowledge Graph
5. **Upload to Vector Search**: Sends the formatted data to Vector Search
6. **Upload to Knowledge Graph**: Sends the extracted entities to Knowledge Graph
7. **Combine Results**: Combines the results from Vector Search and Knowledge Graph
8. **Respond to Webhook**: Sends the response back to the caller

### Memory Sync Workflow

The Memory Sync workflow synchronizes memory between components:

1. **Webhook**: Receives the sync request
2. **Process Parameters**: Processes the input parameters
3. **Sync Vector Search**: Synchronizes with Vector Search
4. **Sync Knowledge Graph**: Synchronizes with Knowledge Graph
5. **Combine Results**: Combines the results from Vector Search and Knowledge Graph
6. **Respond to Webhook**: Sends the response back to the caller

### Knowledge Graph Sync Workflow

The Knowledge Graph Sync workflow synchronizes entities with the Knowledge Graph:

1. **Webhook**: Receives the sync request
2. **Process Entities**: Processes the input entities
3. **Check Entities**: Checks if there are entities to sync
4. **Upload to Knowledge Graph**: Sends the entities to Knowledge Graph
5. **Success Response**: Creates a success response
6. **No Entities Response**: Creates a response for when there are no entities
7. **Respond to Webhook**: Sends the response back to the caller

### Document Processing Workflow

The Document Processing workflow processes documents and adds them to Vector Search and Knowledge Graph:

1. **Webhook**: Receives the document processing request
2. **Process Parameters**: Processes the input parameters
3. **Check Document Path**: Checks if the document path is valid
4. **Read Document**: Reads the document content
5. **Process Document**: Processes the document content
6. **Extract Entities**: Extracts entities from the document
7. **Upload to Vector Search**: Sends the document chunks to Vector Search
8. **Upload to Knowledge Graph**: Sends the extracted entities to Knowledge Graph
9. **Combine Results**: Combines the results from Vector Search and Knowledge Graph
10. **Respond to Webhook**: Sends the response back to the caller

## Integration with VANA

The n8n workflow implementation integrates with the existing VANA components:

1. **Context Management**: Uses the context manager to retrieve and store context information
2. **ADK Integration**: Integrates with the ADK components for session management
3. **Specialist Agent Enhancements**: Uses the enhanced ADKToolAdapter for tool registration
4. **Team Coordination System**: Integrates with the team coordination system for task planning and execution

Example integration with the VANA agent:

```python
from vana.workflows import WorkflowInterface

class VanaAgent:
    """VANA Agent with workflow integration."""

    def __init__(self):
        """Initialize VANA Agent."""
        self.workflow_interface = WorkflowInterface()
        # Other initialization...

    def process_message(self, user_id: str, session_id: str, message: str) -> str:
        """Process a message from the user."""
        # Process message...

        # Check for memory commands
        if message.startswith("!rag"):
            # Extract tags if provided
            tags = []
            if " tag " in message:
                tags = message.split(" tag ")[1].split()

            # Save buffer to memory
            result = self.workflow_interface.trigger_memory_save(self.buffer, tags)

            # Return result
            if result.get("success", False):
                return f"Memory saved successfully. Tagged with: {', '.join(tags)}" if tags else "Memory saved successfully."
            else:
                return f"Failed to save memory: {result.get('error', 'Unknown error')}"

        # Other processing...
```

## Security Integration

The n8n workflow implementation includes security integration:

1. **Credential Management**: Secure storage and retrieval of credentials
2. **Authentication**: Basic authentication for webhook endpoints
3. **Environment Variables**: Sensitive information stored in environment variables
4. **Error Handling**: Proper error handling to prevent information leakage
5. **Logging**: Structured logging with sensitive information filtering

Example security integration:

```python
def _trigger_n8n_workflow(self, workflow_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Trigger n8n workflow via webhook."""
    try:
        webhook_url = f"{self.n8n_url}/webhook/{workflow_name}"

        # Use basic auth if credentials are provided
        auth = None
        if self.n8n_username and self.n8n_password:
            auth = (self.n8n_username, self.n8n_password)

        # Log request (without sensitive information)
        logger.info(f"Triggering n8n workflow: {workflow_name}")

        response = requests.post(
            webhook_url,
            json=data,
            headers={"Content-Type": "application/json"},
            auth=auth,
            timeout=30
        )

        if response.status_code == 200:
            return response.json()
        else:
            error_msg = f"n8n workflow error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return {"error": f"Workflow failed with status {response.status_code}"}
    except Exception as e:
        error_msg = f"Error triggering n8n workflow: {e}"
        logger.error(error_msg)
        return {"error": str(e)}
```

## Monitoring Capabilities

The n8n workflow implementation includes monitoring capabilities:

1. **Logging**: Comprehensive logging of all operations
2. **Error Handling**: Proper error handling with detailed error messages
3. **Status Checking**: Regular checks of n8n availability
4. **Performance Monitoring**: Tracking of workflow execution times
5. **Result Validation**: Validation of workflow results

Example monitoring integration:

```python
def trigger_memory_save(self, buffer: List[Dict[str, str]], tags: Optional[List[str]] = None) -> Dict[str, Any]:
    """Trigger memory save workflow."""
    start_time = time.time()

    try:
        if self.n8n_available:
            # Use n8n webhook
            result = self._trigger_n8n_workflow("save-memory", {
                "buffer": buffer,
                "tags": tags or [],
                "memory_on": True
            })
        else:
            # Direct implementation
            from vana.memory import MemoryManager
            memory_manager = MemoryManager()
            result = memory_manager.save_buffer(buffer, tags)

        # Log result
        execution_time = time.time() - start_time
        logger.info(f"Memory save completed in {execution_time:.2f}s with result: {result.get('success', False)}")

        return result
    except Exception as e:
        # Log error
        execution_time = time.time() - start_time
        error_msg = f"Memory save failed in {execution_time:.2f}s with error: {e}"
        logger.error(error_msg)

        return {
            "success": False,
            "error": str(e)
        }
```

## Testing

The n8n workflow implementation includes comprehensive testing:

1. **Unit Tests**: Tests for individual components
2. **Integration Tests**: Tests for integration with other components
3. **End-to-End Tests**: Tests for the entire workflow
4. **Mock Tests**: Tests with mock implementations
5. **Error Handling Tests**: Tests for error handling

Example test for the `WorkflowInterface` class:

```python
def test_workflow_interface_init():
    """Test WorkflowInterface initialization."""
    # Test with n8n not available
    with patch.dict(os.environ, {"N8N_WEBHOOK_URL": ""}):
        workflow_interface = WorkflowInterface()
        assert not workflow_interface.n8n_available

    # Test with n8n available
    with patch.dict(os.environ, {"N8N_WEBHOOK_URL": "http://localhost:5678"}):
        with patch("requests.get") as mock_get:
            mock_get.return_value.status_code = 200
            workflow_interface = WorkflowInterface()
            assert workflow_interface.n8n_available

    # Test with n8n not responding
    with patch.dict(os.environ, {"N8N_WEBHOOK_URL": "http://localhost:5678"}):
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("Connection error")
            workflow_interface = WorkflowInterface()
            assert not workflow_interface.n8n_available
```

## Next Steps

The n8n workflow implementation is a solid foundation for workflow automation in the VANA project. The next steps are:

1. **Complete Integration**: Integrate the workflow interface with all VANA components
2. **Comprehensive Testing**: Create comprehensive tests for all workflows
3. **Documentation Updates**: Update all documentation to reflect the workflow implementation
4. **Monitoring Enhancements**: Enhance monitoring capabilities with dashboards and alerts
5. **Security Enhancements**: Enhance security with credential encryption and access controls
6. **n8n Deployment**: Deploy n8n to Railway.app for production use
7. **Workflow Enhancements**: Enhance workflows with additional features and optimizations
8. **User Interface**: Create a user interface for workflow management
9. **Automated Testing**: Implement automated testing for workflows
10. **Performance Optimization**: Optimize workflow performance with caching and parallel execution
