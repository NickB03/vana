# Auggie Handoff: Implementing Native ADK Memory

## Project Knowledge Acquisition Plan

To gain complete understanding of the project and prepare for implementing native ADK memory, review these files in the recommended order:

### Core Project Understanding
1. **Project Overview and Architecture**
   - `/docs/vana-architecture-guide.md` - Understand the overall architecture
   - `/docs/project-status.md` - Current project status and progress
   - `/docs/critical-next-steps.md` - Immediate priorities
   - `/docs/implementation-roadmap.md` - Long-term vision

2. **Current Memory Implementation**
   - `/docs/memory-implementation-comparison.md` - Comparison between VANA's custom and ADK's native memory
   - `/docs/persistent-memory-implementation.md` - Details of current implementation
   - `/docs/memory-integration.md` - How memory is integrated with other components

3. **Core Agent Files**
   - `/adk-setup/vana/agents/vana.py` - Main VANA agent implementation
   - `/adk-setup/vana/tools/persistent_memory.py` - Current persistent memory implementation
   - `/adk-setup/vana/tools/persistent_memory_tools.py` - Tools for interacting with persistent memory

4. **Current Memory Backend**
   - `/tools/mcp_memory_client.py` - Client for MCP Knowledge Graph Memory Server
   - `/tools/mcp_memory_client_mock.py` - Mock implementation for testing
   - `/tools/memory_manager.py` - Memory management with local caching
   - `/tools/memory_cache.py` - Caching layer for memory operations

5. **Vector Search Integration**
   - `/tools/vector_search/vector_search_client.py` - Client for Vertex AI Vector Search
   - `/docs/vector-search-implementation.md` - Implementation details
   - `/docs/vertex-ai-transition.md` - Transition to Vertex AI

6. **Launch and Configuration**
   - `/launch_vana_agent.sh` - Script to launch VANA agent
   - `/run_vana_agent.sh` - Script to run VANA agent without web server
   - `/docs/environment-setup.md` - Environment setup instructions

## Implementation Plan: Native ADK Memory

### Overview
This plan outlines the steps to implement Google ADK's native memory capabilities using `VertexAiRagMemoryService` while maintaining compatibility with existing functionality. Based on the latest ADK documentation (as of May 2025), we'll integrate the ADK's session-based memory system with VANA's existing architecture.

### Phase 1: Setup and Research

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/native-adk-memory
   ```

2. **Install Required Dependencies**
   ```bash
   pip install google-adk[vertexai]==0.5.0
   ```

3. **Configure Vertex AI RAG Corpus**
   - Follow the [ADK Documentation: Memory](https://google.github.io/adk-docs/sessions/memory/) to set up a RAG Corpus
   - Add the RAG Corpus resource name to environment variables:
     ```
     RAG_CORPUS_RESOURCE_NAME=projects/analystai-454200/locations/us-central1/ragCorpora/vana-memory-corpus
     SIMILARITY_TOP_K=5
     VECTOR_DISTANCE_THRESHOLD=0.7
     ```

### Phase 2: Implement Native ADK Memory Service

1. **Create ADK Memory Service Module**
   - Create file: `/adk-setup/vana/memory/adk_memory_service.py`
   - Implement wrapper for `VertexAiRagMemoryService`
   - Add configuration options and fallback mechanisms

2. **Implement Session Management**
   - Create file: `/adk-setup/vana/memory/session_manager.py`
   - Implement session creation, retrieval, and management
   - Add support for cross-session memory retrieval

3. **Create Memory Tools**
   - Create file: `/adk-setup/vana/tools/adk_memory_tools.py`
   - Implement tools that use ADK's built-in `load_memory` functionality
   - Add custom tools for VANA-specific memory operations

### Phase 3: Integration with VANA Agent

1. **Update VANA Agent**
   - Modify `/adk-setup/vana/agents/vana.py` to use the new memory service
   - Add support for ADK's session-based memory
   - Maintain backward compatibility with existing memory commands

2. **Create Memory Adapter**
   - Create file: `/adk-setup/vana/memory/memory_adapter.py`
   - Implement adapter pattern to support both memory implementations
   - Add migration utilities for existing memory data

3. **Update System Prompt**
   - Update the agent's system prompt to reflect new memory capabilities
   - Add documentation for new memory commands

### Phase 4: Testing and Validation

1. **Create Test Scripts**
   - Create file: `/scripts/test_adk_memory.py`
   - Implement tests for memory storage and retrieval
   - Add benchmarks to compare with existing implementation

2. **Create Migration Script**
   - Create file: `/scripts/migrate_to_adk_memory.py`
   - Implement data migration from MCP to RAG Corpus
   - Add validation checks for successful migration

3. **Update Documentation**
   - Update `/docs/memory-implementation-comparison.md`
   - Create new file: `/docs/adk-memory-integration.md`
   - Update relevant existing documentation

## Detailed Implementation Guide

### 1. ADK Memory Service Implementation

Based on the latest [ADK Memory documentation](https://google.github.io/adk-docs/sessions/memory/), implement the following in `/adk-setup/vana/memory/adk_memory_service.py`:

```python
from google.adk.memory import VertexAiRagMemoryService
import os
import logging

logger = logging.getLogger(__name__)

class ADKMemoryService:
    """Wrapper for ADK's VertexAiRagMemoryService"""

    def __init__(self):
        """Initialize the ADK Memory Service"""
        self.rag_corpus = os.environ.get("RAG_CORPUS_RESOURCE_NAME")
        self.similarity_top_k = int(os.environ.get("SIMILARITY_TOP_K", "5"))
        self.vector_distance_threshold = float(os.environ.get("VECTOR_DISTANCE_THRESHOLD", "0.7"))

        if not self.rag_corpus:
            logger.warning("RAG_CORPUS_RESOURCE_NAME not set. ADK Memory Service will not be available.")
            self.memory_service = None
        else:
            try:
                self.memory_service = VertexAiRagMemoryService(
                    rag_corpus=self.rag_corpus,
                    similarity_top_k=self.similarity_top_k,
                    vector_distance_threshold=self.vector_distance_threshold
                )
                logger.info(f"ADK Memory Service initialized with RAG Corpus: {self.rag_corpus}")
            except Exception as e:
                logger.error(f"Error initializing ADK Memory Service: {e}")
                self.memory_service = None

    def is_available(self) -> bool:
        """Check if the ADK Memory Service is available"""
        return self.memory_service is not None

    def add_session_to_memory(self, session) -> bool:
        """Add a session to memory"""
        if not self.is_available():
            logger.warning("ADK Memory Service not available. Session not added to memory.")
            return False

        try:
            self.memory_service.add_session_to_memory(session)
            logger.info(f"Session added to memory: {session.session_id}")
            return True
        except Exception as e:
            logger.error(f"Error adding session to memory: {e}")
            return False

    async def search_memory(self, app_name: str, user_id: str, query: str):
        """Search memory for relevant information"""
        if not self.is_available():
            logger.warning("ADK Memory Service not available. Memory search failed.")
            return None

        try:
            results = await self.memory_service.search_memory(app_name, user_id, query)
            logger.info(f"Memory search completed for query: {query}")
            return results
        except Exception as e:
            logger.error(f"Error searching memory: {e}")
            return None
```

### 2. Session Manager Implementation

Implement session management in `/adk-setup/vana/memory/session_manager.py`:

```python
from google.adk.sessions import Session, InMemorySessionService
import logging
import os

logger = logging.getLogger(__name__)

class SessionManager:
    """Manager for ADK Sessions"""

    def __init__(self):
        """Initialize the Session Manager"""
        self.app_name = os.environ.get("APP_NAME", "vana")
        self.session_service = InMemorySessionService()
        logger.info(f"Session Manager initialized for app: {self.app_name}")

    def create_session(self, user_id: str, session_id: str = None) -> Session:
        """Create a new session"""
        session = self.session_service.create_session(
            app_name=self.app_name,
            user_id=user_id,
            session_id=session_id
        )
        logger.info(f"Created session: {session.session_id} for user: {user_id}")
        return session

    def get_session(self, user_id: str, session_id: str) -> Session:
        """Get an existing session"""
        try:
            session = self.session_service.get_session(
                app_name=self.app_name,
                user_id=user_id,
                session_id=session_id
            )
            return session
        except Exception as e:
            logger.error(f"Error getting session {session_id} for user {user_id}: {e}")
            return None

    def update_session_state(self, session: Session, key: str, value) -> bool:
        """Update session state"""
        try:
            session.state[key] = value
            return True
        except Exception as e:
            logger.error(f"Error updating session state: {e}")
            return False

    def get_session_state(self, session: Session, key: str, default=None):
        """Get session state value"""
        try:
            return session.state.get(key, default)
        except Exception as e:
            logger.error(f"Error getting session state: {e}")
            return default
```

### 3. Memory Tools Implementation

Implement memory tools in `/adk-setup/vana/tools/adk_memory_tools.py`:

```python
from google.adk.tools import FunctionTool
from ..memory.adk_memory_service import ADKMemoryService
from ..memory.session_manager import SessionManager
import logging

logger = logging.getLogger(__name__)

# Initialize services
memory_service = ADKMemoryService()
session_manager = SessionManager()

async def search_adk_memory(user_id: str, query: str, top_k: int = 5) -> str:
    """
    Search ADK memory for relevant information

    Args:
        user_id: User ID
        query: Search query
        top_k: Maximum number of results to return

    Returns:
        Formatted string with search results
    """
    try:
        app_name = session_manager.app_name
        results = await memory_service.search_memory(app_name, user_id, query)

        if not results or not results.memory_results:
            return "No relevant information found in memory."

        # Format results
        formatted = "Relevant information from memory:\n\n"
        for i, result in enumerate(results.memory_results[:top_k], 1):
            formatted += f"Memory {i}:\n"

            # Add session information if available
            if result.session:
                formatted += f"  From session: {result.session.session_id}\n"

            # Add events
            if result.events:
                for event in result.events:
                    if event.content and event.content.parts:
                        for part in event.content.parts:
                            if part.text:
                                formatted += f"  {event.author}: {part.text[:200]}...\n"

            formatted += "\n"

        return formatted
    except Exception as e:
        logger.error(f"Error searching ADK memory: {e}")
        return f"Error searching memory: {str(e)}"

def store_memory(user_id: str, session_id: str, content: str) -> str:
    """
    Store information in ADK memory

    Args:
        user_id: User ID
        session_id: Session ID
        content: Content to store

    Returns:
        Status message
    """
    try:
        # Get or create session
        session = session_manager.get_session(user_id, session_id)
        if not session:
            session = session_manager.create_session(user_id, session_id)

        # Add content to session state
        key = f"memory_{len(session.state) + 1}"
        session_manager.update_session_state(session, key, content)

        # Add session to memory
        success = memory_service.add_session_to_memory(session)

        if success:
            return f"Information stored in memory successfully."
        else:
            return "Failed to store information in memory."
    except Exception as e:
        logger.error(f"Error storing memory: {e}")
        return f"Error storing memory: {str(e)}"

# Create function tools
search_adk_memory_tool = FunctionTool(func=search_adk_memory)
store_memory_tool = FunctionTool(func=store_memory)
```

### 4. Integration with VANA Agent

Update the VANA agent in `/adk-setup/vana/agents/vana.py` to include the new memory tools:

```python
# Add imports for ADK memory
from vana.tools.adk_memory_tools import search_adk_memory_tool, store_memory_tool

class VanaAgent(agent_lib.LlmAgent):
    # ... existing code ...

    # Add new tools
    @tool_lib.tool("adk_memory_search")
    async def adk_memory_search(self, query: str, top_k: int = 5) -> str:
        """
        Search ADK memory for relevant information.

        Args:
            query: The search query
            top_k: Maximum number of results to return (default: 5)

        Returns:
            Formatted string with search results
        """
        try:
            # Get user ID from context
            user_id = self.context.get("user_id", "default_user")

            logger.info(f"Searching ADK memory for: {query}")
            return await search_adk_memory_tool(user_id, query, top_k)
        except Exception as e:
            logger.error(f"Error in adk_memory_search: {str(e)}")
            return f"Error searching ADK memory: {str(e)}"

    @tool_lib.tool("adk_memory_store")
    def adk_memory_store(self, content: str) -> str:
        """
        Store information in ADK memory.

        Args:
            content: Information to store

        Returns:
            Confirmation message
        """
        try:
            # Get user ID and session ID from context
            user_id = self.context.get("user_id", "default_user")
            session_id = self.context.get("session_id", "default_session")

            logger.info(f"Storing information in ADK memory")
            return store_memory_tool(user_id, session_id, content)
        except Exception as e:
            logger.error(f"Error in adk_memory_store: {str(e)}")
            return f"Error storing in ADK memory: {str(e)}"
```

## Next Steps After Implementation

1. **Testing**
   - Test the new memory implementation with various scenarios
   - Compare performance with the existing implementation
   - Ensure backward compatibility with existing memory commands
   - Create a benchmark script to compare ADK memory with custom MCP memory

2. **Documentation**
   - Update documentation to reflect the new memory implementation
   - Create user guides for the new memory commands
   - Document the migration process for existing users
   - Update the memory-implementation-comparison.md document with findings

3. **Deployment**
   - Create a pull request for the feature branch
   - Address any feedback from code review
   - Merge the feature branch into main
   - Update environment variables in deployment configurations

4. **Monitoring**
   - Set up monitoring for the new memory implementation
   - Track usage and performance metrics
   - Gather user feedback for further improvements
   - Create dashboards for memory performance

5. **Consider MCP Toolbox Integration**
   - Evaluate whether [MCP Toolbox for Databases](https://googleapis.github.io/genai-toolbox/) could be useful
   - The toolbox provides standardized ways to connect agents to databases
   - Could potentially simplify database access for memory storage
   - Supports various database types and has built-in connection pooling

## Resources

- [ADK Documentation: Sessions & Memory](https://google.github.io/adk-docs/sessions/)
- [ADK Documentation: Memory](https://google.github.io/adk-docs/sessions/memory/)
- [ADK Documentation: Session](https://google.github.io/adk-docs/sessions/session/)
- [ADK Documentation: State](https://google.github.io/adk-docs/sessions/state/)
- [ADK Documentation: Context](https://google.github.io/adk-docs/context/)
- [Vertex AI RAG Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/rag/overview)
- [MCP Toolbox for Databases](https://googleapis.github.io/genai-toolbox/getting-started/introduction/)
