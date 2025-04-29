# Knowledge Base Usage Guidelines

This document provides guidelines for VANA agents on how to effectively use multiple knowledge sources: Vector Search, Knowledge Graph via Context7 MCP, and Web Search.

## When to Use Each Knowledge Source

Agents should use the appropriate knowledge source based on the query type:

1. **Vector Search** - For semantic similarity search across project documentation:
   - When asked about specific details of the VANA system architecture
   - When asked about implementation details of Vector Search integration
   - When asked about project documentation or guidelines

2. **Knowledge Graph (via Context7 MCP)** - For structured knowledge and relationships:
   - When asked about relationships between entities
   - When asked about structured information that benefits from graph traversal
   - When precise, structured answers are required

3. **Web Search** - For up-to-date information from the internet:
   - When information might be outdated in the local knowledge base
   - When asked about recent developments or external technologies
   - When supplementary information is needed

## How to Use Multiple Knowledge Sources

When using multiple knowledge sources, follow these guidelines:

1. **Formulate Clear Queries**: Create specific, focused queries that target the information you need.

2. **Prioritize Sources**: Start with Vector Search, then Knowledge Graph, then Web Search as needed.

3. **Cite Sources**: When providing information, always cite the source document, file, or website.

4. **Verify Information**: Cross-check information from multiple sources when possible.

5. **Handle Missing Information**: If no knowledge source contains the requested information, clearly state this and provide your best response based on your general knowledge.

6. **Combine Knowledge**: Integrate information from all knowledge sources with your own reasoning to provide comprehensive responses.

## Example Usage Patterns

### Good Examples

#### Vector Search Example

```
To answer your question about the VANA agent architecture, I'll search our Vector Search knowledge base.

According to our documentation, VANA implements a hierarchical agent structure with Vana as the coordinator and specialist agents for specific tasks. The specialist agents include Rhea (Meta-Architect), Max (Interface), Sage (Platform), Kai (Edge Cases), and Juno (Story).

Source: knowledge_docs/advanced/agent_architecture.md
```

#### Knowledge Graph Example

```
Let me check our Knowledge Graph for information about how components in VANA are related.

According to the Knowledge Graph, the VANA system has the following component relationships:
1. Vana (coordinator) → manages → Specialist Agents
2. Vector Search ← integrates with → Knowledge Graph
3. Web Search → enhances → Hybrid Search

Source: Context7 MCP Knowledge Graph
```

#### Web Search Example

```
To provide you with the most up-to-date information about ADK, I'll perform a web search.

According to the latest documentation from Google, the Agent Development Kit (ADK) version 0.5.1 was released last month with the following new features:
1. Improved multi-agent communication
2. Enhanced tool calling capabilities
3. New deployment options for Vertex AI

Source: https://github.com/google/adk/releases
```

#### Combined Sources Example

```
Your question about VANA's hybrid search implementation requires information from multiple sources.

From our Vector Search knowledge base:
- VANA uses an enhanced hybrid search that combines results from Vector Search, Knowledge Graph, and Web Search
- The implementation is in the tools/enhanced_hybrid_search.py file

From the Knowledge Graph:
- The hybrid search component connects to 3 different data sources
- It uses a weighted ranking algorithm to prioritize results

From Web Search:
- Recent advancements in hybrid search techniques suggest adding a re-ranking step

By combining these sources, I can provide a comprehensive answer to your question.

Sources: knowledge_docs/enhanced_hybrid_search.md, Context7 MCP Knowledge Graph, https://example.com/hybrid-search-techniques
```

### Poor Examples

```
VANA has 6 agents in a hierarchy.
```
(Problem: No citation, no indication that any knowledge source was consulted)

```
I think Vector Search is set up with some kind of index and endpoint.
```
(Problem: Vague, uncertain, no specific details from knowledge sources)

```
According to the internet, VANA is a good system.
```
(Problem: Vague reference to web search without specific sources or details)

## Handling Knowledge Gaps

When none of the knowledge sources contain the requested information:

```
I've searched our Vector Search knowledge base, queried the Knowledge Graph via Context7 MCP, and performed a web search, but couldn't find specific information about [topic]. Based on my understanding, [provide best response]. Would you like me to help you document this information for future reference?
```

## Updating the Knowledge Base

The knowledge base is automatically updated through GitHub Actions when changes are made to the repository. If you identify missing or outdated information, suggest documenting it in the appropriate location in the repository.
