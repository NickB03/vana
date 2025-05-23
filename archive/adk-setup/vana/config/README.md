# VANA Agent Configuration

This directory contains configuration files for the VANA agent system.

## Knowledge Base Integration

The VANA agents are integrated with a Vector Search knowledge base that allows them to retrieve information about the system architecture, implementation details, and agent roles.

### Knowledge Usage Guidelines

The `instructions/knowledge_usage.md` file contains guidelines for agents on how to effectively use the shared knowledge base. These guidelines are included in each agent's instructions to ensure consistent usage patterns.

Key guidelines include:
- When to use the knowledge base
- How to formulate effective queries
- How to cite sources
- How to handle missing information
- How to combine knowledge from multiple sources

### Vector Search Configuration

The Vector Search configuration is defined in `settings.py` and includes:
- Vector Search index name
- Vector dimensions
- Project ID and location

## Testing Agent Knowledge Retrieval

To test the agents' ability to retrieve knowledge from Vector Search, use the `scripts/test_agent_knowledge.py` script:

```bash
cd ~/vana
python scripts/test_agent_knowledge.py
```

This script sends queries to the agents and verifies that they can access and use the knowledge base.

## End-to-End Testing

To test the entire VANA agent system end-to-end, including knowledge retrieval and agent delegation, use the `scripts/test_end_to_end.py` script:

```bash
cd ~/vana
python scripts/test_end_to_end.py
```

This script tests the full functionality of the agent system, including:
1. Agent initialization
2. Knowledge retrieval from Vector Search
3. Agent delegation
4. Cross-agent communication

## Troubleshooting

If agents are not retrieving knowledge correctly:
1. Check that the Vector Search index is properly set up and populated
2. Verify that the environment variables are correctly set
3. Run the `verify_vector_search.py` script to test the Vector Search integration
4. Check the agent logs for any errors related to knowledge retrieval
