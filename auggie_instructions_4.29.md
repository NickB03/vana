auggie_instructions_4.29.md
# Detailed Implementation Plan: Persistent Memory with Delta-Based Updates for Project Vana

## Overview for Auggie

Given that you've successfully fixed the Vector Search integration, we can now focus on implementing a persistent memory system that uses delta-based updates. This plan details exactly how to implement this feature while leveraging your existing work.

## 1. Implementation Architecture

### Core Components:

1. **MCP Knowledge Graph Memory Server** - Use a public hosted solution
2. **Vertex AI Vector Search** - Already implemented and fixed by you
3. **Agent Engine Sessions** - For cross-device state persistence

## 2. Step-by-Step Implementation Plan

### Phase 1: Basic MCP Memory Integration

1. **Configure MCP Knowledge Graph Memory Connection**

   Add the following configuration to connect Vana to a public MCP memory server:

   ```python
   # In your configuration file (config.py or similar)
   MCP_MEMORY_SERVER = {
       "endpoint": "https://mcp.community.augment.co",  # Example of public MCP server
       "namespace": "vana-project",
       "api_key": os.environ.get("MCP_API_KEY")
   }
   ```

2. **Implement Basic MCP Client**

   Create a new file `tools/mcp_memory_client.py`:

   ```python
   import requests
   import json
   import logging
   from typing import Dict, List, Any, Optional

   logger = logging.getLogger(__name__)

   class MCPMemoryClient:
       """Client for interacting with MCP Knowledge Graph Memory Server."""
       
       def __init__(self, endpoint: str, namespace: str, api_key: str):
           self.endpoint = endpoint
           self.namespace = namespace
           self.headers = {
               "Content-Type": "application/json",
               "Authorization": f"Bearer {api_key}"
           }
           self.last_sync_timestamp = None
       
       def store_entity(self, entity_name: str, entity_type: str, 
                         observations: List[str]) -> Dict[str, Any]:
           """Store a new entity in the knowledge graph."""
           payload = {
               "operation": "store",
               "entityName": entity_name,
               "entityType": entity_type,
               "observations": observations
           }
           
           return self._make_request(payload)
       
       def retrieve_entity(self, entity_name: str) -> Dict[str, Any]:
           """Retrieve an entity from the knowledge graph."""
           payload = {
               "operation": "retrieve",
               "entityName": entity_name
           }
           
           return self._make_request(payload)
       
       def create_relationship(self, from_entity: str, relationship: str, 
                              to_entity: str) -> Dict[str, Any]:
           """Create a relationship between entities."""
           payload = {
               "operation": "relate",
               "fromEntity": from_entity,
               "relationship": relationship,
               "toEntity": to_entity
           }
           
           return self._make_request(payload)
       
       def _make_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
           """Make a request to the MCP server."""
           url = f"{self.endpoint}/{self.namespace}/memory"
           
           try:
               response = requests.post(url, headers=self.headers, 
                                      json=payload, timeout=10)
               response.raise_for_status()
               return response.json()
           except Exception as e:
               logger.error(f"Error making request to MCP server: {e}")
               return {"error": str(e)}
   ```

### Phase 2: Implement Delta-Based Updates

1. **Add Delta Sync Methods to MCP Client**

   Update the `tools/mcp_memory_client.py` file:

   ```python
   # Add these methods to the MCPMemoryClient class
   
   def get_initial_data(self) -> Dict[str, Any]:
       """Perform initial complete data load."""
       payload = {
           "operation": "retrieve_all"
       }
       
       result = self._make_request(payload)
       
       # Update last sync timestamp
       self.last_sync_timestamp = result.get("timestamp", 
                               self._current_timestamp())
       
       return result
   
   def sync_delta(self) -> Dict[str, Any]:
       """Get changes since last sync."""
       if not self.last_sync_timestamp:
           # If no previous sync, perform initial load
           return self.get_initial_data()
       
       payload = {
           "operation": "sync",
           "lastSyncTimestamp": self.last_sync_timestamp
       }
       
       result = self._make_request(payload)
       
       # Update last sync timestamp
       if "currentTimestamp" in result:
           self.last_sync_timestamp = result["currentTimestamp"]
       
       return result
   
   def _current_timestamp(self) -> str:
       """Get current ISO format timestamp."""
       from datetime import datetime
       return datetime.now().isoformat()
   ```

2. **Implement Memory Manager Class**

   Create a new file `tools/memory_manager.py`:

   ```python
   import logging
   import time
   from typing import Dict, List, Any, Optional
   from .mcp_memory_client import MCPMemoryClient
   
   logger = logging.getLogger(__name__)
   
   class MemoryManager:
       """Manages knowledge graph memory operations."""
       
       def __init__(self, mcp_client: MCPMemoryClient, 
                    sync_interval: int = 300):
           self.mcp_client = mcp_client
           self.local_cache = {}
           self.sync_interval = sync_interval  # in seconds
           self.last_sync_time = 0
       
       def initialize(self) -> bool:
           """Initialize the memory manager with initial data."""
           try:
               initial_data = self.mcp_client.get_initial_data()
               self._process_initial_data(initial_data)
               self.last_sync_time = time.time()
               return True
           except Exception as e:
               logger.error(f"Error initializing memory manager: {e}")
               return False
       
       def sync_if_needed(self) -> bool:
           """Sync with memory server if interval has passed."""
           current_time = time.time()
           if current_time - self.last_sync_time >= self.sync_interval:
               return self.sync()
           return True
       
       def sync(self) -> bool:
           """Synchronize with memory server using delta updates."""
           try:
               delta_data = self.mcp_client.sync_delta()
               self._process_delta(delta_data)
               self.last_sync_time = time.time()
               return True
           except Exception as e:
               logger.error(f"Error syncing memory: {e}")
               return False
       
       def _process_initial_data(self, data: Dict[str, Any]) -> None:
           """Process initial data from memory server."""
           if "entities" in data:
               for entity in data["entities"]:
                   entity_id = entity.get("id")
                   if entity_id:
                       self.local_cache[entity_id] = entity
           
           logger.info(f"Loaded {len(self.local_cache)} entities into cache")
       
       def _process_delta(self, delta: Dict[str, Any]) -> None:
           """Process delta updates from memory server."""
           # Process added entities
           added = delta.get("added", [])
           for entity in added:
               entity_id = entity.get("id")
               if entity_id:
                   self.local_cache[entity_id] = entity
           
           # Process modified entities
           modified = delta.get("modified", [])
           for entity in modified:
               entity_id = entity.get("id")
               if entity_id:
                   self.local_cache[entity_id] = entity
           
           # Process deleted entities
           deleted = delta.get("deleted", [])
           for entity_id in deleted:
               if entity_id in self.local_cache:
                   del self.local_cache[entity_id]
           
           logger.info(f"Processed delta: {len(added)} added, "
                       f"{len(modified)} modified, {len(deleted)} deleted")
   ```

### Phase 3: Integration with Vector Search

1. **Create Hybrid Search Tool**

   Create a new file `tools/hybrid_search.py`:

   ```python
   import logging
   from typing import Dict, List, Any, Optional
   from .rag_tools import search_knowledge
   from .memory_manager import MemoryManager
   
   logger = logging.getLogger(__name__)
   
   class HybridSearch:
       """Combines Vector Search and Knowledge Graph search results."""
       
       def __init__(self, memory_manager: MemoryManager):
           self.memory_manager = memory_manager
       
       async def search(self, query: str, top_k: int = 5) -> Dict[str, Any]:
           """Perform hybrid search across Vector Search and Knowledge Graph."""
           # Sync memory if needed
           self.memory_manager.sync_if_needed()
           
           # Get results from Vector Search
           vector_results = await search_knowledge(query, top_k)
           
           # Get relevant entities from Knowledge Graph
           kg_results = self._search_knowledge_graph(query, top_k)
           
           # Merge results
           merged_results = self._merge_results(vector_results, kg_results, top_k)
           
           return merged_results
       
       def _search_knowledge_graph(self, query: str, 
                                  top_k: int = 5) -> Dict[str, Any]:
           """Search the Knowledge Graph for relevant entities."""
           # Implementation would connect to the knowledge graph search endpoint
           # This is a simplified example
           
           # Normally would implement semantic search on the graph
           # For now, just returning relevant entities by simple matching
           results = []
           for entity_id, entity in self.memory_manager.local_cache.items():
               # Simple text matching (would be more sophisticated in production)
               if (query.lower() in entity.get("name", "").lower() or 
                   any(query.lower() in obs.lower() 
                       for obs in entity.get("observations", []))):
                   results.append({
                       "id": entity_id,
                       "name": entity.get("name"),
                       "type": entity.get("type"),
                       "observations": entity.get("observations", []),
                       "source": "knowledge_graph"
                   })
                   
                   if len(results) >= top_k:
                       break
           
           return {
               "results": results,
               "count": len(results)
           }
       
       def _merge_results(self, vector_results: Dict[str, Any], 
                         kg_results: Dict[str, Any], 
                         top_k: int = 5) -> Dict[str, Any]:
           """Merge Vector Search and Knowledge Graph results."""
           # This is a simple merge - production would use more sophisticated
           # relevance scoring and deduplication
           
           all_results = []
           
           # Add Vector Search results
           if "results" in vector_results:
               for result in vector_results["results"]:
                   result["source_type"] = "vector_search"
                   all_results.append(result)
           
           # Add Knowledge Graph results
           if "results" in kg_results:
               for result in kg_results["results"]:
                   result["source_type"] = "knowledge_graph"
                   all_results.append(result)
           
           # Simple deduplication by content
           seen_content = set()
           deduplicated_results = []
           
           for result in all_results:
               content = result.get("content", "")
               if not content or content not in seen_content:
                   if content:
                       seen_content.add(content)
                   deduplicated_results.append(result)
           
           # Limit to top_k results
           limited_results = deduplicated_results[:top_k]
           
           return {
               "results": limited_results,
               "count": len(limited_results),
               "sources": {
                   "vector_search": vector_results.get("count", 0),
                   "knowledge_graph": kg_results.get("count", 0)
               }
           }
   ```

### Phase 4: Performance Optimizations

1. **Add Caching and Performance Improvements**

   Create a new file `tools/memory_cache.py`:

   ```python
   import time
   from typing import Dict, Any, Optional, List
   
   class MemoryCache:
       """Caching layer for memory operations."""
       
       def __init__(self, max_size: int = 1000, ttl: int = 3600):
           self.cache = {}
           self.access_times = {}
           self.max_size = max_size
           self.ttl = ttl  # Time-to-live in seconds
       
       def get(self, key: str) -> Optional[Any]:
           """Get an item from the cache."""
           if key not in self.cache:
               return None
               
           # Check if item has expired
           if time.time() - self.access_times[key] > self.ttl:
               self._remove(key)
               return None
               
           # Update access time
           self.access_times[key] = time.time()
           return self.cache[key]
       
       def set(self, key: str, value: Any) -> None:
           """Add or update an item in the cache."""
           # Check if cache is at max capacity
           if len(self.cache) >= self.max_size and key not in self.cache:
               self._evict_oldest()
               
           self.cache[key] = value
           self.access_times[key] = time.time()
       
       def _evict_oldest(self) -> None:
           """Remove the oldest item from the cache."""
           if not self.access_times:
               return
               
           oldest_key = min(self.access_times, key=self.access_times.get)
           self._remove(oldest_key)
       
       def _remove(self, key: str) -> None:
           """Remove an item from the cache."""
           if key in self.cache:
               del self.cache[key]
           if key in self.access_times:
               del self.access_times[key]
   ```

2. **Implement Entity Importance Scoring**

   Create a new file `tools/entity_scorer.py`:

   ```python
   from datetime import datetime
   from typing import Dict, Any, List, Optional
   
   class EntityScorer:
       """Scores entities based on importance and recency."""
       
       def __init__(self):
           # Default importance weights by entity type
           self.type_weights = {
               "Person": 0.9,
               "Organization": 0.8,
               "Project": 0.7,
               "Task": 0.6,
               "Preference": 0.9,
               "Conversation": 0.5,
               "Fact": 0.7,
               "Default": 0.5
           }
           
           # Time decay settings
           self.half_life_days = 30  # Importance halves every 30 days
       
       def score_entity(self, entity: Dict[str, Any]) -> float:
           """Calculate an importance score for an entity."""
           # Base score by type
           entity_type = entity.get("type", "Default")
           base_score = self.type_weights.get(entity_type, 
                                             self.type_weights["Default"])
           
           # Recency factor (time decay)
           recency_factor = self._calculate_recency_factor(entity)
           
           # Access frequency factor
           access_count = entity.get("accessCount", 0)
           frequency_factor = min(1.5, 1.0 + (access_count / 20))
           
           # Calculate final score
           final_score = base_score * recency_factor * frequency_factor
           
           # Scale to 0-10 range for easier interpretation
           return min(10.0, final_score * 10)
       
       def _calculate_recency_factor(self, entity: Dict[str, Any]) -> float:
           """Calculate time decay factor based on entity age."""
           # Get the most recent timestamp (creation or update)
           last_updated = entity.get("updatedAt", entity.get("createdAt"))
           if not last_updated:
               return 1.0  # No timestamp, assume not stale
           
           try:
               # Parse the timestamp
               if isinstance(last_updated, str):
                   last_update_time = datetime.fromisoformat(
                       last_updated.replace("Z", "+00:00"))
               else:
                   last_update_time = last_updated
               
               # Calculate age in days
               now = datetime.now()
               age_days = (now - last_update_time).days
               
               # Calculate decay factor (exponential decay)
               decay_factor = 2 ** (-age_days / self.half_life_days)
               
               # Ensure the factor is between 0.1 and 1.0
               return max(0.1, min(1.0, decay_factor))
           except Exception:
               # If any parsing error, default to 1.0 (no decay)
               return 1.0
   ```

### Phase 5: Integration with Agent Engine

1. **Configure Vertex AI Agent Engine for Session Management**

   Create a new file `agent/agent_engine_integration.py`:

   ```python
   from vertexai.preview.reasoning_engines import AdkApp
   from google.adk.agents import Agent
   from typing import Dict, Any, List, Optional
   import logging
   import os
   
   from tools.memory_manager import MemoryManager
   from tools.mcp_memory_client import MCPMemoryClient
   
   logger = logging.getLogger(__name__)
   
   class AgentEngineIntegration:
       """Integrates with Vertex AI Agent Engine for session management."""
       
       def __init__(self, agent: Agent):
           self.agent = agent
           self.app = AdkApp(agent=agent)
           
           # Initialize memory client
           self.memory_client = MCPMemoryClient(
               endpoint=os.environ.get("MCP_ENDPOINT", 
                                      "https://mcp.community.augment.co"),
               namespace=os.environ.get("MCP_NAMESPACE", "vana-project"),
               api_key=os.environ.get("MCP_API_KEY", "")
           )
           
           # Initialize memory manager
           self.memory_manager = MemoryManager(self.memory_client)
           self.memory_manager.initialize()
       
       def get_or_create_session(self, user_id: str) -> Dict[str, Any]:
           """Get existing session or create a new one for the user."""
           try:
               # Try to get existing session
               sessions = self.app.list_sessions(user_id=user_id)
               if sessions:
                   return sessions[0]
               
               # Create new session if none exists
               return self.app.create_session(user_id=user_id)
           except Exception as e:
               logger.error(f"Error managing session: {e}")
               # Fall back to creating a new session
               return self.app.create_session(user_id=user_id)
       
       def process_message(self, user_id: str, 
                          message: str) -> Dict[str, Any]:
           """Process a user message with persistent session."""
           # Ensure memory is synced before processing
           self.memory_manager.sync_if_needed()
           
           # Get or create session
           session = self.get_or_create_session(user_id)
           
           # Process message using the session
           response_events = []
           for event in self.app.stream_query(
               user_id=user_id,
               session_id=session["id"],
               message=message
           ):
               response_events.append(event)
           
           # Extract entities and facts from the conversation
           # This would be implemented using an entity extractor
           # For now, it's a placeholder
           self._extract_and_store_entities(message, response_events)
           
           return {
               "session_id": session["id"],
               "events": response_events
           }
       
       def _extract_and_store_entities(self, user_message: str, 
                                     response_events: List[Dict[str, Any]]):
           """Extract and store entities from conversation."""
           # In a real implementation, this would use NLP to extract entities
           # This is just a placeholder example
           # Implement actual entity extraction logic here
           pass
   ```

## 3. Testing Plan

Create test files for each component:

1. **Test MCP Client**

   Create a new file `tests/test_mcp_client.py`:

   ```python
   import unittest
   import os
   import responses
   from tools.mcp_memory_client import MCPMemoryClient
   
   class TestMCPClient(unittest.TestCase):
       """Test cases for MCP Memory Client."""
       
       def setUp(self):
           self.endpoint = "https://example.com"
           self.namespace = "test-namespace"
           self.api_key = "test-api-key"
           self.client = MCPMemoryClient(self.endpoint, self.namespace, self.api_key)
       
       @responses.activate
       def test_store_entity(self):
           """Test storing an entity."""
           # Setup mock response
           responses.add(
               responses.POST,
               f"{self.endpoint}/{self.namespace}/memory",
               json={"success": True, "entityId": "test-id"},
               status=200
           )
           
           # Call method
           result = self.client.store_entity(
               "Test Entity", "TestType", ["Observation 1", "Observation 2"]
           )
           
           # Verify result
           self.assertTrue(result.get("success"))
           self.assertEqual(result.get("entityId"), "test-id")
       
       @responses.activate
       def test_sync_delta(self):
           """Test delta synchronization."""
           # Setup mock response
           responses.add(
               responses.POST,
               f"{self.endpoint}/{self.namespace}/memory",
               json={
                   "added": [{"id": "new-entity", "name": "New Entity"}],
                   "modified": [],
                   "deleted": [],
                   "currentTimestamp": "2025-04-01T12:00:00Z"
               },
               status=200
           )
           
           # Set last sync timestamp
           self.client.last_sync_timestamp = "2025-03-31T12:00:00Z"
           
           # Call method
           result = self.client.sync_delta()
           
           # Verify result
           self.assertEqual(len(result.get("added", [])), 1)
           self.assertEqual(result.get("added")[0].get("name"), "New Entity")
           self.assertEqual(self.client.last_sync_timestamp, "2025-04-01T12:00:00Z")
   ```

2. **Test Memory Manager**

   Create a new file `tests/test_memory_manager.py`:

   ```python
   import unittest
   from unittest.mock import MagicMock, patch
   import time
   from tools.memory_manager import MemoryManager
   
   class TestMemoryManager(unittest.TestCase):
       """Test cases for Memory Manager."""
       
       def setUp(self):
           self.mock_client = MagicMock()
           self.manager = MemoryManager(self.mock_client, sync_interval=60)
       
       def test_initialize(self):
           """Test initialization of memory manager."""
           # Setup mock response
           self.mock_client.get_initial_data.return_value = {
               "entities": [
                   {"id": "entity1", "name": "Entity 1"},
                   {"id": "entity2", "name": "Entity 2"}
               ]
           }
           
           # Call method
           result = self.manager.initialize()
           
           # Verify result
           self.assertTrue(result)
           self.assertEqual(len(self.manager.local_cache), 2)
           self.assertIn("entity1", self.manager.local_cache)
           self.assertIn("entity2", self.manager.local_cache)
       
       def test_sync(self):
           """Test synchronization with delta updates."""
           # Setup mock response
           self.mock_client.sync_delta.return_value = {
               "added": [{"id": "entity3", "name": "Entity 3"}],
               "modified": [{"id": "entity1", "name": "Entity 1 Updated"}],
               "deleted": ["entity2"]
           }
           
           # Set up initial cache
           self.manager.local_cache = {
               "entity1": {"id": "entity1", "name": "Entity 1"},
               "entity2": {"id": "entity2", "name": "Entity 2"}
           }
           
           # Call method
           result = self.manager.sync()
           
           # Verify result
           self.assertTrue(result)
           self.assertEqual(len(self.manager.local_cache), 2)  # One added, one modified, one deleted
           self.assertEqual(self.manager.local_cache["entity1"]["name"], "Entity 1 Updated")
           self.assertIn("entity3", self.manager.local_cache)
           self.assertNotIn("entity2", self.manager.local_cache)
       
       def test_sync_if_needed(self):
           """Test sync_if_needed method."""
           # Mock the sync method
           self.manager.sync = MagicMock(return_value=True)
           
           # Set last sync time to now
           self.manager.last_sync_time = time.time()
           
           # Call method - should not sync as interval hasn't passed
           self.manager.sync_if_needed()
           self.manager.sync.assert_not_called()
           
           # Set last sync time to more than interval ago
           self.manager.last_sync_time = time.time() - 120
           
           # Call method - should sync
           self.manager.sync_if_needed()
           self.manager.sync.assert_called_once()
   ```

3. **Test Hybrid Search**

   Create a new file `tests/test_hybrid_search.py`:

   ```python
   import unittest
   from unittest.mock import MagicMock, patch
   import asyncio
   from tools.hybrid_search import HybridSearch
   
   class TestHybridSearch(unittest.TestCase):
       """Test cases for Hybrid Search."""
       
       def setUp(self):
           self.mock_memory_manager = MagicMock()
           self.hybrid_search = HybridSearch(self.mock_memory_manager)
       
       @patch('tools.rag_tools.search_knowledge')
       def test_search(self, mock_search_knowledge):
           """Test hybrid search functionality."""
           # Setup mocks
           mock_search_knowledge.return_value = {
               "results": [
                   {"content": "Vector result 1", "distance": 0.9},
                   {"content": "Vector result 2", "distance": 0.8}
               ],
               "count": 2
           }
           
           # Mock the _search_knowledge_graph method
           self.hybrid_search._search_knowledge_graph = MagicMock(return_value={
               "results": [
                   {"id": "kg1", "name": "KG result 1", "observations": ["KG obs 1"]},
                   {"id": "kg2", "name": "KG result 2", "observations": ["KG obs 2"]}
               ],
               "count": 2
           })
           
           # Run the test using asyncio
           result = asyncio.run(self.hybrid_search.search("test query"))
           
           # Verify the result
           self.assertEqual(len(result["results"]), 4)  # Should have all 4 results
           self.assertEqual(result["sources"]["vector_search"], 2)
           self.assertEqual(result["sources"]["knowledge_graph"], 2)
           
           # Verify the memory manager was called to sync
           self.mock_memory_manager.sync_if_needed.assert_called_once()
   ```

## 4. Implementation Timeline

The implementation can be completed in the following phases:

1. **Initial Setup**: Configure MCP connection, implement basic client
2. **Delta Implementation**: Add delta sync functionality, memory manager
3. **Vector Search Integration**: Integrate with existing Vector Search, implement hybrid search
4. **Performance Optimizations**: Add caching, scoring, importance weighting
5. **Final Testing**: Comprehensive testing and performance validation

## 5. Conclusion

This plan provides a detailed roadmap for implementing persistent memory with delta-based updates in Project Vana, building on your existing Vector Search implementation. The implementation leverages a public hosted MCP knowledge graph server for memory storage and Vertex AI Agent Engine for session management.

Key advantages of this approach:
- Delta-based updates for efficient memory synchronization
- Hybrid search combining Vector Search and Knowledge Graph
- Performance optimizations through caching and entity scoring
- Full integration with Vertex AI Agent Engine for cross-device persistence

This implementation will ensure that Vana agents maintain context across sessions while optimizing performance through efficient delta-based updates.