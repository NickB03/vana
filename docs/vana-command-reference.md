# VANA Command Reference

This document provides a comprehensive reference for all commands and tools available in the VANA system.

## Table of Contents

1. [Knowledge Retrieval Commands](#knowledge-retrieval-commands)
2. [Knowledge Graph Commands](#knowledge-graph-commands)
3. [Document Processing Commands](#document-processing-commands)
4. [Web Search Commands](#web-search-commands)
5. [System Commands](#system-commands)
6. [Advanced Usage](#advanced-usage)

## Knowledge Retrieval Commands

### Vector Search

Search for information semantically using Vertex AI Vector Search.

```
!vector_search <query>
```

**Parameters:**
- `query`: The search query text
- `top_k`: (Optional) Maximum number of results to return (default: 5)

**Example:**
```
!vector_search What is VANA?
!vector_search How does Vector Search work? top_k=10
```

### Knowledge Graph Query

Query structured knowledge using entity types and relationships.

```
!kg_query <entity_type> <query>
```

**Parameters:**
- `entity_type`: Type of entity to query for (e.g., "project", "technology", "*" for all types)
- `query`: The search query text

**Example:**
```
!kg_query project "VANA"
!kg_query technology "Vector Search"
!kg_query * "ADK"
```

### Hybrid Search

Search using both Vector Search and Knowledge Graph for comprehensive results.

```
!hybrid_search <query>
```

**Parameters:**
- `query`: The search query text
- `top_k`: (Optional) Maximum number of results to return (default: 5)

**Example:**
```
!hybrid_search What is the architecture of VANA?
!hybrid_search How to implement hybrid search? top_k=10
```

### Enhanced Hybrid Search

Search using Vector Search, Knowledge Graph, and Web Search for the most comprehensive results.

```
!enhanced_search <query>
```

**Parameters:**
- `query`: The search query text
- `top_k`: (Optional) Maximum number of results to return (default: 5)
- `include_web`: (Optional) Whether to include web search results (default: true)

**Example:**
```
!enhanced_search What is the architecture of VANA?
!enhanced_search Latest developments in vector search top_k=10
!enhanced_search How to implement hybrid search? include_web=false
```

### Web Search

Search the web for recent information.

```
!web_search <query>
```

**Parameters:**
- `query`: The search query text
- `num_results`: (Optional) Maximum number of results to return (default: 5)

**Example:**
```
!web_search What is Google's Agent Development Kit?
!web_search Latest developments in vector search num_results=10
```

## Knowledge Graph Commands

### Store Entity

Store information in the Knowledge Graph.

```
!kg_store <entity_name> <entity_type> <observation>
```

**Parameters:**
- `entity_name`: Name of the entity to store
- `entity_type`: Type of the entity (e.g., "project", "technology", "person")
- `observation`: Information about the entity

**Example:**
```
!kg_store VANA project "VANA is a multi-agent system using Google's ADK"
!kg_store Vector_Search technology "Vector Search is a semantic search technology"
```

### Store Relationship

Store a relationship between two entities in the Knowledge Graph.

```
!kg_relationship <entity1> <relationship> <entity2>
```

**Parameters:**
- `entity1`: Name of the first entity
- `relationship`: Type of relationship (e.g., "uses", "contains", "part_of")
- `entity2`: Name of the second entity

**Example:**
```
!kg_relationship VANA uses Vector_Search
!kg_relationship VANA contains Knowledge_Graph
```

### Extract Entities

Extract entities from text and store them in the Knowledge Graph.

```
!kg_extract <text>
```

**Parameters:**
- `text`: Text to extract entities from

**Example:**
```
!kg_extract VANA is a multi-agent system that uses Vector Search and Knowledge Graph for knowledge retrieval.
```

### Query Related Entities

Query for entities related to a specific entity.

```
!kg_related <entity_name> <relationship_type>
```

**Parameters:**
- `entity_name`: Name of the entity to find related entities for
- `relationship_type`: Type of relationship to look for (use "*" for all relationships)

**Example:**
```
!kg_related VANA uses
!kg_related Vector_Search *
```

## Document Processing Commands

### Process Document

Process a document and extract information.

```
!process_document <file_path>
```

**Parameters:**
- `file_path`: Path to the document file

**Example:**
```
!process_document docs/vana-architecture-guide.md
!process_document data/sample.pdf
```

### Semantic Chunking

Chunk a document into semantic chunks.

```
!chunk_document <file_path>
```

**Parameters:**
- `file_path`: Path to the document file
- `target_size`: (Optional) Target chunk size in tokens (default: 3000)

**Example:**
```
!chunk_document docs/vana-architecture-guide.md
!chunk_document data/sample.pdf target_size=1000
```

### Extract Metadata

Extract metadata from a document.

```
!extract_metadata <file_path>
```

**Parameters:**
- `file_path`: Path to the document file

**Example:**
```
!extract_metadata docs/vana-architecture-guide.md
!extract_metadata data/sample.pdf
```

## Web Search Commands

### Web Search

Search the web for information.

```
!web_search <query>
```

**Parameters:**
- `query`: The search query text
- `num_results`: (Optional) Maximum number of results to return (default: 5)

**Example:**
```
!web_search What is Google's Agent Development Kit?
!web_search Latest developments in vector search num_results=10
```

## System Commands

### Help

Display help information.

```
!help
```

**Example:**
```
!help
!help vector_search
!help kg_query
```

### Status

Check the status of VANA components.

```
!status
```

**Example:**
```
!status
```

### Version

Display the current version of VANA.

```
!version
```

**Example:**
```
!version
```

## Advanced Usage

### Combining Commands

You can combine multiple commands to create more complex workflows.

**Example:**
```
!process_document docs/vana-architecture-guide.md
!kg_extract The VANA architecture consists of Vector Search and Knowledge Graph components.
!hybrid_search What is the architecture of VANA?
```

### Using Results in Subsequent Commands

You can reference results from previous commands in new commands.

**Example:**
```
!vector_search What is VANA?
!kg_extract [Result from previous command]
```

### Filtering Results

You can filter results by specifying additional criteria.

**Example:**
```
!vector_search What is VANA? filter=source:documentation
!kg_query technology * filter=created_after:2023-01-01
```

## Troubleshooting

If you encounter issues with any commands, try the following:

1. Check that all required parameters are provided
2. Verify that the VANA system is properly configured
3. Check the logs for error messages
4. Try simplifying the command or query
5. Ensure that the referenced entities or files exist

For more detailed troubleshooting information, see the [Troubleshooting Guide](troubleshooting.md).
