# Knowledge Graph Commands

This document outlines the commands available for interacting with the Knowledge Graph component of VANA.

## Overview

The Knowledge Graph provides structured storage and retrieval of information using entities and relationships. These commands allow you to query, store, and manage information in the Knowledge Graph.

## Command Reference

### Query Commands

#### `!kg_query [entity_type] [query]`

Search for entities in the Knowledge Graph based on type and query.

**Parameters:**
- `entity_type`: Type of entity to search for (e.g., "project", "technology", "person")
- `query`: The search query (use `*` for all entities of the given type)

**Examples:**
```
!kg_query project "VANA"
!kg_query technology "Vector Search"
!kg_query * "knowledge management"
```

**Response:**
```
Found 3 entities matching "VANA":
1. VANA (project)
   "VANA is a multi-agent system using Google's ADK..."
2. VANA Architecture (concept)
   "The VANA architecture consists of multiple agents..."
3. VANA Components (concept)
   "VANA components include Vector Search and Knowledge Graph..."
```

### Storage Commands

#### `!kg_store [entity_name] [entity_type] [observation]`

Store an entity with an observation in the Knowledge Graph.

**Parameters:**
- `entity_name`: Name of the entity (e.g., "VANA", "Vector Search")
- `entity_type`: Type of entity (e.g., "project", "technology", "concept")
- `observation`: The information or description to store about the entity

**Examples:**
```
!kg_store VANA project "VANA is a multi-agent system using Google's ADK and Knowledge Graph for structured knowledge representation."
!kg_store "Hybrid Search" technology "A technique that combines semantic vector search with structured knowledge graph queries."
```

**Response:**
```
Entity "VANA" stored in Knowledge Graph with type "project".
```

### Relationship Commands

#### `!kg_relate [from_entity] [relation] [to_entity]`

Create a relationship between two entities in the Knowledge Graph.

**Parameters:**
- `from_entity`: The source entity name
- `relation`: The type of relationship (e.g., "uses", "contains", "depends_on")
- `to_entity`: The target entity name

**Examples:**
```
!kg_relate VANA uses "Vector Search"
!kg_relate "Hybrid Search" combines "Knowledge Graph"
```

**Response:**
```
Relationship created: VANA [uses] Vector Search
```

### Context Commands

#### `!kg_context`

Show the current Knowledge Graph context, including recent entities and relationships.

**Example:**
```
!kg_context
```

**Response:**
```
Current Knowledge Graph Context:
Entities:
- VANA (project)
- Vector Search (technology)
- Knowledge Graph (technology)

Relationships:
- VANA [uses] Vector Search
- VANA [uses] Knowledge Graph
- Vector Search [complements] Knowledge Graph
```

### Advanced Commands

#### `!kg_expand [entity_name] [depth]`

Expand an entity to show its relationships to the specified depth.

**Parameters:**
- `entity_name`: Name of the entity to expand
- `depth`: How many levels of relationships to traverse (default: 1)

**Example:**
```
!kg_expand VANA 2
```

**Response:**
```
Entity Expansion for "VANA":
Level 1:
- VANA [uses] Vector Search
- VANA [uses] Knowledge Graph
- VANA [implements] ADK

Level 2:
- Vector Search [stores] Embeddings
- Knowledge Graph [contains] Entities
- ADK [provides] Tools
```

#### `!hybrid_search [query]`

Perform a hybrid search using both Vector Search and Knowledge Graph.

**Parameters:**
- `query`: The search query

**Example:**
```
!hybrid_search "How does VANA store knowledge?"
```

**Response:**
```
Hybrid Search Results:

Vector Search Results:
1. "VANA uses Vertex AI Vector Search for memory management and semantic search..." (Score: 0.92)
2. "The knowledge storage mechanisms in VANA include both vector embeddings..." (Score: 0.87)

Knowledge Graph Results:
1. VANA (project)
   "VANA is a multi-agent system using Google's ADK..."
2. Knowledge Storage (concept)
   "Knowledge storage in VANA leverages both Vector Search and Knowledge Graph..."

Combined Results:
1. [KNOWLEDGE GRAPH] Knowledge Storage (concept) (Score: 0.95)
   "Knowledge storage in VANA leverages both Vector Search and Knowledge Graph..."
2. [VECTOR SEARCH] (Score: 0.92)
   "VANA uses Vertex AI Vector Search for memory management and semantic search..."
```

## Error Handling

Commands may return errors in the following cases:

- Entity not found
- Insufficient permissions
- Invalid query syntax
- Server connectivity issues

Example error response:
```
Error: Entity "VANAA" not found in Knowledge Graph.
Did you mean "VANA"?
```

## Best Practices

1. **Use specific entity types**: Consistently categorize entities with specific types
2. **Be descriptive in observations**: Include key information in entity observations
3. **Create meaningful relationships**: Use relationships to build a rich knowledge network
4. **Regularly query and check**: Verify stored information with `!kg_context` and `!kg_query`
5. **Use hybrid search**: For complex queries, use `!hybrid_search` to leverage both Vector Search and Knowledge Graph

## Troubleshooting

If commands fail or return unexpected results:

1. Check your connection to the MCP server with `python scripts/test_mcp_connection.py`
2. Verify that your API key is set correctly in the `claude-mcp-config.json` file
3. Ensure that the namespace in the configuration file is correct
4. Check that the entity/relationship exists using `!kg_query` or `!kg_context`
