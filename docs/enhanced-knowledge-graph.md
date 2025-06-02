# Enhanced Knowledge Graph Integration

This document describes the enhanced Knowledge Graph integration in VANA, including entity extraction, relationship inference, and automated document processing.

## Overview

The Knowledge Graph provides structured representation of knowledge in VANA, complementing the Vector Search capabilities with explicit entity and relationship modeling. The enhanced Knowledge Graph integration adds:

1. Advanced entity extraction
2. Relationship inference
3. Entity linking
4. Automated document processing
5. Integration with semantic chunking

## Architecture

```
                  ┌─────────────────┐
                  │                 │
                  │  Document       │
                  │  Processing     │
                  │                 │
                  └────────┬────────┘
                           │
                           ▼
┌─────────────────┐   ┌────────────────┐   ┌─────────────────┐
│                 │   │                │   │                 │
│  Entity         │◄──┤  Knowledge     ├──►│  Vector         │
│  Extractor      │   │  Graph Manager │   │  Search         │
│                 │   │                │   │                 │
└─────────────────┘   └────────┬───────┘   └─────────────────┘
                               │
                               ▼
                      ┌─────────────────┐
                      │                 │
                      │  MCP Server     │
                      │  (Knowledge     │
                      │   Graph API)    │
                      │                 │
                      └─────────────────┘
```

## Entity Extraction

The enhanced entity extraction system uses multiple methods to identify entities in text:

1. **Rule-based extraction**: Pattern matching for known entity types
2. **NLP-based extraction**: Using spaCy for named entity recognition
3. **External API-based extraction**: Using the MCP Knowledge Graph API

### Entity Types

The system supports the following entity types:

- **project**: Projects like VANA
- **technology**: Technologies like Vector Search, Knowledge Graph
- **person**: People
- **organization**: Organizations
- **location**: Locations
- **concept**: Abstract concepts
- **document**: Documents in the system

### Example Usage

```python
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

# Initialize the Knowledge Graph manager
kg_manager = KnowledgeGraphManager()

# Extract entities from text
text = "VANA is a multi-agent system that uses Vector Search and Knowledge Graph for knowledge retrieval."
entities = kg_manager.extract_entities(text)

# Print extracted entities
for entity in entities:
    print(f"Entity: {entity['name']}, Type: {entity['type']}")
```

## Relationship Inference

The system can automatically infer relationships between entities based on:

1. **Co-occurrence**: Entities appearing together in the same document
2. **Contextual analysis**: Analyzing the text between entities
3. **Pattern matching**: Using predefined relationship patterns
4. **Knowledge Graph analysis**: Analyzing existing relationships

### Relationship Types

Common relationship types include:

- **uses**: Entity uses another entity (e.g., VANA uses Vector Search)
- **contains**: Entity contains another entity (e.g., VANA contains Knowledge Graph)
- **part_of**: Entity is part of another entity
- **created_by**: Entity was created by another entity
- **related_to**: General relationship between entities

### Example Usage

```python
# Infer relationships for an entity
relationships = kg_manager.infer_relationships("VANA")

# Print inferred relationships
for rel in relationships.get("inferred_relationships", []):
    print(f"{rel['entity1']} {rel['relationship']} {rel['entity2']} (Confidence: {rel['confidence']})")
```

## Entity Linking

Entity linking connects newly extracted entities with existing entities in the Knowledge Graph, enabling:

1. **Deduplication**: Avoiding duplicate entities
2. **Enrichment**: Adding new information to existing entities
3. **Relationship creation**: Creating relationships between entities
4. **Confidence scoring**: Assigning confidence scores to entity links

### Linking Methods

The system uses several methods for entity linking:

1. **Exact matching**: Linking entities with identical names
2. **Partial matching**: Linking entities with similar names
3. **Contextual matching**: Linking entities based on context
4. **Hierarchical matching**: Linking entities in a hierarchy

### Example Usage

```python
# Link entities in text to existing Knowledge Graph entities
text = "Vector Search is a semantic search technology used in VANA."
linking_result = kg_manager.link_entities(text)

# Print linking results
for link in linking_result.get("linked_entities", []):
    if link["linked_to"]:
        print(f"Linked {link['extracted']} to {link['linked_to']} ({link['action']})")
    else:
        print(f"Created new entity {link['extracted']}")
```

## Document Processing

The system can automatically process documents to extract entities and relationships:

1. **Document ingestion**: Processing documents from various sources
2. **Entity extraction**: Extracting entities from document content
3. **Relationship extraction**: Extracting relationships between entities
4. **Document entity creation**: Creating a document entity in the Knowledge Graph
5. **Entity linking**: Linking extracted entities to existing entities

### Example Usage

```python
# Process a document
document = {
    "doc_id": "doc-001",
    "title": "VANA Architecture Guide",
    "source": "documentation",
    "text": "VANA is a multi-agent system that uses Vector Search and Knowledge Graph..."
}
result = kg_manager.process_document(document)

# Print processing results
print(f"Processed document: {result['document']}")
print(f"Extracted {result['entities_extracted']} entities")
print(f"Stored {result['entities_stored']} entities")
print(f"Extracted {result['relationships_extracted']} relationships")
print(f"Stored {result['relationships_stored']} relationships")
```

## Integration with Semantic Chunking

The Knowledge Graph integration works with the semantic chunking system to:

1. **Process document chunks**: Extract entities from document chunks
2. **Maintain context**: Preserve document context in entity extraction
3. **Link chunks to entities**: Create relationships between chunks and entities
4. **Enhance retrieval**: Use Knowledge Graph to enhance retrieval results

### Example Integration

```python
from tools.document_processing.semantic_chunker import SemanticChunker
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

# Initialize components
chunker = SemanticChunker()
kg_manager = KnowledgeGraphManager()

# Process document
document = {
    "doc_id": "doc-001",
    "title": "VANA Architecture Guide",
    "source": "documentation",
    "text": "VANA is a multi-agent system that uses Vector Search and Knowledge Graph..."
}

# Chunk document
chunks = chunker.chunk_document(document)

# Process each chunk
for chunk in chunks:
    # Extract entities from chunk
    entities = kg_manager.extract_entities(chunk["text"])

    # Store entities
    for entity in entities:
        kg_manager.store(
            entity_name=entity["name"],
            entity_type=entity["type"],
            observation=entity.get("observation", "")
        )

        # Link chunk to entity
        kg_manager.store_relationship(
            entity1=f"Chunk-{chunk['metadata']['chunk_id']}",
            relationship="contains",
            entity2=entity["name"]
        )
```

## Performance Considerations

1. **Caching**: Entity extraction results are cached to improve performance
2. **Batch processing**: Documents are processed in batches
3. **Asynchronous processing**: Entity extraction runs asynchronously
4. **Confidence thresholds**: Only high-confidence entities and relationships are stored

## Future Enhancements

1. **Improved entity disambiguation**: Better handling of ambiguous entities
2. **Temporal relationships**: Adding time dimension to relationships
3. **Multi-language support**: Supporting entity extraction in multiple languages
4. **Visual entity extraction**: Extracting entities from images and diagrams
5. **User feedback integration**: Incorporating user feedback to improve entity extraction
