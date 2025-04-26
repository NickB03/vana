# Knowledge Base Usage Guidelines

This document provides guidelines for VANA agents on how to effectively use the shared knowledge base through Vector Search.

## When to Use the Knowledge Base

Agents should use the knowledge base in the following situations:

1. When asked about specific details of the VANA system architecture
2. When asked about implementation details of Vector Search integration
3. When asked about the roles and responsibilities of different agents
4. When asked about technical specifications or configurations
5. When asked about project documentation or guidelines
6. When uncertain about a technical detail that might be documented

## How to Use the Knowledge Base

When using the knowledge base, follow these guidelines:

1. **Formulate Clear Queries**: Create specific, focused queries that target the information you need.

2. **Cite Sources**: When providing information from the knowledge base, cite the source document or file.

3. **Verify Information**: Cross-check information from multiple sources when possible.

4. **Handle Missing Information**: If the knowledge base doesn't contain the requested information, clearly state this and provide your best response based on your general knowledge.

5. **Combine Knowledge**: Integrate information from the knowledge base with your own reasoning to provide comprehensive responses.

## Example Usage Patterns

### Good Examples

```
To answer your question about the VANA agent architecture, I'll search our knowledge base.

According to our documentation, VANA implements a hierarchical agent structure with Ben as the coordinator and specialist agents for specific tasks. The specialist agents include Rhea (Meta-Architect), Max (Interface), Sage (Platform), Kai (Edge Cases), and Juno (Story).

Source: agent_architecture.txt
```

```
Let me check our knowledge base for information about Vector Search integration.

Our system uses Vertex AI Vector Search for knowledge retrieval. The setup process involves:
1. Creating a Vector Search index with SHARD_SIZE_SMALL configuration
2. Creating a public Vector Search index endpoint
3. Deploying the index to the endpoint using e2-standard-2 machines

Source: vector_search_implementation.txt
```

### Poor Examples

```
VANA has 6 agents in a hierarchy.
```
(Problem: No citation, no indication that knowledge base was consulted)

```
I think Vector Search is set up with some kind of index and endpoint.
```
(Problem: Vague, uncertain, no specific details from knowledge base)

## Handling Knowledge Gaps

When the knowledge base doesn't contain the requested information:

```
I've searched our knowledge base but couldn't find specific information about [topic]. Based on my understanding, [provide best response]. Would you like me to help you document this information for future reference?
```

## Updating the Knowledge Base

The knowledge base is automatically updated through GitHub Actions when changes are made to the repository. If you identify missing or outdated information, suggest documenting it in the appropriate location in the repository.
