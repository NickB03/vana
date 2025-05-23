# VANA Agent Architecture

## Overview

VANA (Versatile Agent Network Architecture) implements a sophisticated agent architecture that enables intelligent knowledge retrieval and task execution. This document provides a comprehensive overview of VANA's agent architecture, including its components, interactions, and implementation details.

## Core Architecture

VANA's agent architecture consists of the following core components:

### 1. Primary Agent

The primary agent serves as the main interface for user interactions and coordinates the overall system:

- **Implementation**: `VanaAgent` class in `adk-setup/vana/agents/vana.py`
- **Responsibilities**:
  - Processing user queries
  - Delegating tasks to specialized components
  - Integrating results from various sources
  - Generating coherent responses

### 2. Knowledge Tools

Knowledge tools provide access to different knowledge sources:

- **Vector Search Tool**: Semantic search using embeddings
  - Implementation: `VectorSearchClient` class in `tools/vector_search/vector_search_client.py`
  - Capabilities: Embedding generation, similarity search, result ranking

- **Knowledge Graph Tool**: Structured knowledge representation
  - Implementation: `KnowledgeGraphManager` class in `tools/knowledge_graph/knowledge_graph_manager.py`
  - Capabilities: Entity storage, relationship management, structured queries

- **Hybrid Search Tool**: Combined search across multiple sources
  - Implementation: `HybridSearch` class in `tools/hybrid_search.py`
  - Capabilities: Multi-source search, result merging, relevance ranking

- **Enhanced Hybrid Search Tool**: Advanced search with web integration
  - Implementation: `EnhancedHybridSearch` class in `tools/enhanced_hybrid_search.py`
  - Capabilities: Web search integration, sophisticated ranking, source attribution

### 3. Document Processing

Document processing components handle the ingestion and processing of documents:

- **Document Processor**: Main document processing pipeline
  - Implementation: `DocumentProcessor` class in `tools/document_processing/document_processor.py`
  - Capabilities: Text extraction, metadata enrichment, multi-format support

- **Semantic Chunker**: Intelligent document chunking
  - Implementation: `SemanticChunker` class in `tools/document_processing/semantic_chunker.py`
  - Capabilities: Structure-aware chunking, context preservation, adaptive sizing

- **Entity Extractor**: Entity and relationship extraction
  - Implementation: `EntityExtractor` class in `tools/knowledge_graph/entity_extractor.py`
  - Capabilities: Named entity recognition, relationship extraction, confidence scoring

## Agent Interaction Flow

The interaction flow within VANA's agent architecture follows these steps:

1. **Query Reception**: The primary agent receives a user query
2. **Query Analysis**: The query is analyzed to determine the required knowledge sources
3. **Tool Selection**: Appropriate tools are selected based on the query analysis
4. **Parallel Execution**: Tools are executed in parallel for efficiency
5. **Result Integration**: Results from different tools are integrated and ranked
6. **Response Generation**: A coherent response is generated based on the integrated results
7. **Feedback Collection**: User feedback is collected for continuous improvement

```
User Query → Primary Agent → Query Analysis → Tool Selection → 
Parallel Execution → Result Integration → Response Generation → User
```

## Implementation Details

### Agent Definition

The primary agent is defined using Google's Agent Development Kit (ADK):

```python
class VanaAgent(agent_lib.LlmAgent):
    """
    VANA Agent - Primary interface leveraging knowledge tools via MCP
    """

    name = "vana"
    model = "gemini-1.5-pro"

    system_prompt = """
    You are VANA (Versatile Agent Network Architecture), an intelligent assistant built with Google's Gemini 2.5 Pro model and enhanced with specialized knowledge tools.

    Your purpose is to assist users with accurate, helpful information while maintaining a clear, direct communication style. You engage thoughtfully with users, providing structured, concise responses that focus on practical utility.
    """

    def __init__(self):
        """Initialize the VANA agent"""
        super().__init__()
        
        # Initialize knowledge tools
        self.vector_search_client = VectorSearchClient()
        self.kg_manager = KnowledgeGraphManager()
        self.hybrid_search = HybridSearch()
        self.enhanced_hybrid_search = EnhancedHybridSearch()
        
        # Initialize document processing
        self.document_processor = DocumentProcessor()
```

### Tool Implementation

Tools are implemented as methods with the `@tool_lib.tool` decorator:

```python
@tool_lib.tool("search_knowledge")
def search_knowledge_tool(self, query: str, top_k: int = 5) -> str:
    """
    Search for information in the knowledge base.

    Args:
        query: The search query
        top_k: Maximum number of results to return (default: 5)

    Returns:
        Formatted string with search results
    """
    try:
        logger.info(f"Searching knowledge base for: {query}")
        results = self.vector_search_client.search(query, top_k=top_k)
        
        # Format results
        formatted = []
        for result in results:
            content = result.get("content", "")
            metadata = result.get("metadata", {})
            source = metadata.get("source", "Unknown")
            
            formatted.append(f"Source: {source}\n{content}")
        
        return "\n\n".join(formatted)
    except Exception as e:
        logger.error(f"Error in search_knowledge: {str(e)}")
        return f"Error searching knowledge base: {str(e)}"
```

### Query Routing

The agent uses sophisticated query routing to direct queries to the appropriate tools:

```python
def route_query(self, query: str) -> Dict[str, Any]:
    """
    Route a query to the appropriate tools
    
    Args:
        query: User query
        
    Returns:
        Results from appropriate tools
    """
    # Analyze query
    query_type = self.analyze_query(query)
    
    # Route based on query type
    if query_type == "factual":
        # Use hybrid search for factual queries
        return {"tool": "hybrid_search", "results": self.hybrid_search_tool(query)}
    elif query_type == "procedural":
        # Use knowledge graph for procedural queries
        return {"tool": "kg_query", "results": self.kg_query_tool("*", query)}
    elif query_type == "current":
        # Use enhanced hybrid search with web for current information
        return {"tool": "enhanced_hybrid_search", "results": self.enhanced_hybrid_search_tool(query, include_web=True)}
    else:
        # Default to hybrid search
        return {"tool": "hybrid_search", "results": self.hybrid_search_tool(query)}
```

## Multi-Agent Architecture (Legacy)

In previous versions, VANA implemented a multi-agent architecture with specialized agents:

### Coordinator Agent (Ben)

- **Role**: Project Lead & DevOps Strategist
- **Responsibilities**: Task coordination, cross-agent communication, overall system management

### Specialist Agents

- **Rhea (Meta-Architect)**: Agent workflow design, memory systems, orchestration patterns
- **Max (Interaction Engineer)**: Interface design, visualization, user experience
- **Sage (Platform Automator)**: Backend deployment, infrastructure management, automation
- **Kai (Edge Case Hunter)**: Testing, error handling, edge case identification
- **Juno (Story Engineer)**: Documentation, narrative creation, user onboarding

### Agent Delegation

The coordinator agent delegated tasks to specialist agents based on their expertise:

```python
def delegate_task(self, task: str, agent_name: str) -> str:
    """
    Delegate a task to a specialist agent
    
    Args:
        task: Task description
        agent_name: Name of the agent to delegate to
        
    Returns:
        Result from the specialist agent
    """
    # Get the specialist agent
    specialist = self.get_specialist_agent(agent_name)
    
    # Delegate the task
    result = specialist.execute_task(task)
    
    return result
```

## Current Simplified Architecture

For the MVP, VANA has transitioned to a simplified single-agent architecture:

1. **Single Primary Agent**: All functionality is integrated into a single agent
2. **Tool-Based Approach**: Specialized capabilities are implemented as tools
3. **External MCP Server**: Model Context Protocol server for tool integration
4. **Knowledge Graph Integration**: Structured knowledge representation
5. **Vector Search Integration**: Semantic search capabilities

This simplified architecture provides a more streamlined user experience while maintaining the core capabilities of the system.

## Integration with External Services

VANA integrates with several external services:

### 1. Vertex AI

- **Vector Search**: Managed vector database for semantic search
- **Embedding Generation**: Text embedding generation for semantic search
- **Agent Engine**: Deployment platform for the agent

### 2. Model Context Protocol (MCP)

- **Tool Integration**: Standardized protocol for tool integration
- **Knowledge Graph**: Structured knowledge representation
- **Memory Management**: Long-term memory across sessions

### 3. Google Custom Search

- **Web Search**: Up-to-date information from the web
- **Result Integration**: Integration with internal knowledge sources

## Future Architecture Enhancements

Planned enhancements to VANA's agent architecture:

1. **Advanced Query Understanding**: More sophisticated query analysis and routing
2. **Personalization**: User-specific knowledge and preferences
3. **Multi-Modal Support**: Handling images, audio, and other modalities
4. **Federated Knowledge**: Integration with additional knowledge sources
5. **Continuous Learning**: Improving knowledge and capabilities over time

## Best Practices for Agent Development

When extending or modifying VANA's agent architecture, follow these best practices:

1. **Tool-First Approach**: Implement new capabilities as tools before creating new agents
2. **Clear Responsibilities**: Define clear responsibilities for each component
3. **Robust Error Handling**: Implement comprehensive error handling
4. **Comprehensive Logging**: Log all agent actions and decisions
5. **Thorough Testing**: Test all components individually and together
6. **Documentation**: Document all components and their interactions
7. **User-Centric Design**: Focus on user needs and experience
