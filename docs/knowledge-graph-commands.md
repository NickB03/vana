# Knowledge Graph Commands Reference

This document provides a detailed reference for all Knowledge Graph commands available in the VANA system.

## Overview

The Knowledge Graph provides a structured representation of knowledge, allowing for more sophisticated reasoning and retrieval. The commands in this reference enable you to interact with the Knowledge Graph, including querying for entities, storing new information, and viewing the current context.

## Command Reference

### Basic Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!kg_query [entity_type] [query]` | Search for entities in the Knowledge Graph | `!kg_query project "VANA"` |
| `!kg_store [entity_name] [entity_type] [observation]` | Store new information in the Knowledge Graph | `!kg_store VANA project "VANA is a multi-agent system"` |
| `!kg_context` | Show the current Knowledge Graph context | `!kg_context` |

### Advanced Commands

| Command | Description | Example |
|---------|-------------|---------|
| `!kg_query_related [entity_name] [relationship_type]` | Find entities related to a specific entity | `!kg_query_related VANA uses` |
| `!kg_store_relationship [entity1] [relationship] [entity2]` | Store a relationship between two entities | `!kg_store_relationship VANA uses "Vector Search"` |
| `!kg_delete [entity_name]` | Delete an entity from the Knowledge Graph | `!kg_delete "Test Entity"` |

## Command Details

### !kg_query

The `!kg_query` command searches for entities in the Knowledge Graph based on the entity type and query text.

**Syntax:**
```
!kg_query [entity_type] [query]
```

**Parameters:**
- `entity_type`: The type of entity to search for (e.g., project, concept, tool). Use "*" to search all entity types.
- `query`: The search query text.

**Examples:**
```
!kg_query project "VANA"
!kg_query concept "memory"
!kg_query * "Vector Search"
```

**Response:**
```
Found 2 entities for query: Vector Search

1. Vector Search (tool)
   Vector Search is a service provided by Vertex AI for semantic search.

2. Vector Search Integration (project)
   The integration of Vector Search into the VANA memory system.
```

### !kg_store

The `!kg_store` command stores new information in the Knowledge Graph.

**Syntax:**
```
!kg_store [entity_name] [entity_type] [observation]
```

**Parameters:**
- `entity_name`: The name of the entity to store.
- `entity_type`: The type of the entity (e.g., project, concept, tool).
- `observation`: The information about the entity.

**Examples:**
```
!kg_store VANA project "VANA is a multi-agent system using Google's ADK"
!kg_store "Vector Search" tool "Vector Search is a service provided by Vertex AI for semantic search"
!kg_store Memory concept "Memory in VANA refers to the system's ability to recall past conversations"
```

**Response:**
```
Successfully stored entity: VANA (project)
```

### !kg_context

The `!kg_context` command shows the current Knowledge Graph context, which includes the most relevant entities and their types.

**Syntax:**
```
!kg_context
```

**Parameters:**
None

**Example:**
```
!kg_context
```

**Response:**
```
Current Knowledge Graph Context:

Projects:
- VANA
- Vector Search Integration
- ADK Integration

Concepts:
- Memory
- Multi-agent System
- Knowledge Graph

Tools:
- Vector Search
- ADK
- n8n
```

### !kg_query_related

The `!kg_query_related` command finds entities related to a specific entity through a particular relationship type.

**Syntax:**
```
!kg_query_related [entity_name] [relationship_type]
```

**Parameters:**
- `entity_name`: The name of the entity to find related entities for.
- `relationship_type`: The type of relationship to search for (e.g., uses, contains, requires). Use "*" to search all relationship types.

**Examples:**
```
!kg_query_related VANA uses
!kg_query_related "Vector Search" requires
!kg_query_related Memory *
```

**Response:**
```
Entities related to VANA through 'uses' relationship:

1. Vector Search (tool)
   VANA uses Vector Search for semantic memory retrieval.

2. ADK (tool)
   VANA uses ADK for agent development.

3. n8n (tool)
   VANA uses n8n for workflow orchestration.
```

### !kg_store_relationship

The `!kg_store_relationship` command stores a relationship between two entities in the Knowledge Graph.

**Syntax:**
```
!kg_store_relationship [entity1] [relationship] [entity2]
```

**Parameters:**
- `entity1`: The name of the first entity.
- `relationship`: The type of relationship (e.g., uses, contains, requires).
- `entity2`: The name of the second entity.

**Examples:**
```
!kg_store_relationship VANA uses "Vector Search"
!kg_store_relationship "Vector Search" requires "Google Cloud"
!kg_store_relationship Memory contains "Conversation History"
```

**Response:**
```
Successfully stored relationship: VANA uses Vector Search
```

### !kg_delete

The `!kg_delete` command deletes an entity from the Knowledge Graph.

**Syntax:**
```
!kg_delete [entity_name]
```

**Parameters:**
- `entity_name`: The name of the entity to delete.

**Examples:**
```
!kg_delete "Test Entity"
```

**Response:**
```
Successfully deleted entity: Test Entity
```

## Implementation Details

### Knowledge Graph Manager

The Knowledge Graph commands are implemented using the `KnowledgeGraphManager` class:

```python
class KnowledgeGraphManager:
    def __init__(self):
        self.api_key = os.environ.get("MCP_API_KEY")
        self.server_url = os.environ.get("MCP_SERVER_URL")
        self.namespace = os.environ.get("MCP_NAMESPACE", "vana-project")
    
    def query(self, entity_type, query_text):
        """Query the Knowledge Graph for entities"""
        try:
            response = requests.get(
                f"{self.server_url}/api/kg/query",
                params={
                    "namespace": self.namespace,
                    "entity_type": entity_type,
                    "query": query_text
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error querying Knowledge Graph: {e}")
            return None
    
    def store(self, entity_name, entity_type, observation):
        """Store information in the Knowledge Graph"""
        try:
            response = requests.post(
                f"{self.server_url}/api/kg/store",
                json={
                    "namespace": self.namespace,
                    "entities": [{
                        "name": entity_name,
                        "type": entity_type,
                        "observation": observation
                    }]
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error storing in Knowledge Graph: {e}")
            return None
    
    def get_context(self):
        """Get the current Knowledge Graph context"""
        try:
            response = requests.get(
                f"{self.server_url}/api/kg/context",
                params={"namespace": self.namespace},
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting Knowledge Graph context: {e}")
            return None
    
    def query_related(self, entity_name, relationship_type):
        """Query for entities related to a specific entity"""
        try:
            response = requests.get(
                f"{self.server_url}/api/kg/related",
                params={
                    "namespace": self.namespace,
                    "entity": entity_name,
                    "relationship": relationship_type
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error querying related entities: {e}")
            return None
    
    def store_relationship(self, entity1, relationship, entity2):
        """Store a relationship between two entities"""
        try:
            response = requests.post(
                f"{self.server_url}/api/kg/relationship",
                json={
                    "namespace": self.namespace,
                    "entity1": entity1,
                    "relationship": relationship,
                    "entity2": entity2
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error storing relationship: {e}")
            return None
    
    def delete(self, entity_name):
        """Delete an entity from the Knowledge Graph"""
        try:
            response = requests.delete(
                f"{self.server_url}/api/kg/entity",
                params={
                    "namespace": self.namespace,
                    "entity": entity_name
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error deleting entity: {e}")
            return None
```

## Integration with MCP

The Knowledge Graph commands are integrated with the MCP interface in the `MemoryMCP` class:

```python
def handle_command(self, command):
    # ... existing code ...
    
    # Knowledge Graph commands
    elif command.startswith("!kg_query"):
        parts = command.split()
        if len(parts) < 3:
            return "Error: Invalid query command. Use !kg_query [entity_type] [query]"
        
        entity_type = parts[1]
        query = " ".join(parts[2:])
        result = self.kg_manager.query(entity_type, query)
        
        # Format and return results
        # ...
    
    elif command.startswith("!kg_store"):
        parts = command.split()
        if len(parts) < 4:
            return "Error: Invalid store command. Use !kg_store [entity_name] [entity_type] [observation]"
        
        entity_name = parts[1]
        entity_type = parts[2]
        observation = " ".join(parts[3:])
        
        result = self.kg_manager.store(entity_name, entity_type, observation)
        
        # Format and return results
        # ...
    
    elif command == "!kg_context":
        result = self.kg_manager.get_context()
        
        # Format and return results
        # ...
    
    # ... additional Knowledge Graph commands ...
```

## Best Practices

1. **Use Consistent Entity Types**: Stick to a consistent set of entity types (e.g., project, concept, tool) to make querying more effective.

2. **Be Specific with Observations**: Provide clear, specific observations that capture the essential information about an entity.

3. **Use Relationships**: Explicitly store relationships between entities to create a rich knowledge graph.

4. **Check the Context**: Use `!kg_context` regularly to understand what information is currently most relevant.

5. **Combine with Vector Search**: Use Knowledge Graph commands alongside Vector Search for the most comprehensive knowledge retrieval.

## Troubleshooting

### Command Not Recognized

If a Knowledge Graph command is not recognized:

1. Check that you're using the correct command syntax
2. Verify that the MCP interface is properly initialized
3. Ensure that the Knowledge Graph manager is properly initialized

### API Connection Issues

If you encounter API connection issues:

1. Verify that the MCP API key is valid
2. Check that the MCP server URL is accessible
3. Ensure that the namespace is correctly set
4. Test the Knowledge Graph connection using a simple API request

### Entity Not Found

If an entity is not found:

1. Check that you're using the correct entity name
2. Verify that the entity exists in the Knowledge Graph
3. Try using a more general entity type (e.g., "*" instead of a specific type)
4. Use `!kg_context` to see what entities are currently in the context
