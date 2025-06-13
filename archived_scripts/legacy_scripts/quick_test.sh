#!/bin/bash

# Quick test script for GitHub RAG integration
echo "===== Quick RAG Integration Test ====="

# Create logs directory if it doesn't exist
mkdir -p logs

# Test direct Vector Search with a single query
echo ""
echo "1. Testing direct Vector Search..."
python scripts/test_vector_search_direct.py --query "What is the architecture of VANA?" > logs/vector_search_quick.log
grep "SUCCESS\|FAILED" logs/vector_search_quick.log

# Test agent knowledge with a single query
echo ""
echo "2. Testing agent knowledge retrieval..."
python scripts/test_agent_knowledge.py --agent ben --verbose --output logs/agent_knowledge_quick.json --queries-file /tmp/test_queries.json > logs/agent_knowledge_quick.log

# Create a small set of test queries
cat > /tmp/test_queries.json << EOF
[
  {"query": "What is the architecture of VANA?", "category": "architecture"}
]
EOF

python scripts/test_agent_knowledge.py --agent ben --verbose --output logs/agent_knowledge_quick.json --queries-file /tmp/test_queries.json > logs/agent_knowledge_quick.log
grep "Success rate" logs/agent_knowledge_quick.log

echo ""
echo "===== Tests Completed ====="
