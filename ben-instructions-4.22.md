# Ben's Expert Instructions for GitHub RAG Integration (April 22, 2025)

This document provides expert-level instructions for completing the GitHub RAG (Retrieval Augmented Generation) integration for VANA.

## 1. Knowledge Sync Workflow Implementation

### Test the Knowledge Sync Workflow

```bash
cd ~/vana
# Trigger the workflow manually to test
python -c "
import os, json
from google.cloud import aiplatform, storage
from vertexai.language_models import TextEmbeddingModel
import vertexai

# Set up minimal test data
test_data = {
  'text': 'This is a test document for Vector Search',
  'source': 'test_document.md',
  'metadata': {'type': 'test'}
}

# Generate embeddings
vertexai.init(project='analystai-454200', location='us-central1')
model = TextEmbeddingModel.from_pretrained('text-embedding-004')
embeddings = model.get_embeddings([test_data['text']])[0]

# Save to file
with open('test_embeddings.json', 'w') as f:
  json.dump([{
    'id': 'test-1',
    'embedding': embeddings.values,
    'metadata': {'text': test_data['text'], 'source': test_data['source']}
  }], f)

print('Test embeddings created successfully')
"

# Run batch update with small test file
python scripts/batch_update_index.py --embeddings-file test_embeddings.json --wait
```

## 2. ADK Package Resolution

### Diagnose and Fix ADK Issues

```bash
cd ~/vana
source .venv/bin/activate

# Run diagnostic script and capture output
python scripts/test_adk_import.py > adk_diagnosis.log

# Try multiple installation methods based on diagnosis
pip uninstall -y google-adk google-cloud-aiplatform
pip install google-cloud-aiplatform==1.44.0
pip install 'google-cloud-aiplatform[adk]'

# If still failing, create minimal ADK wrapper
cat > tools/adk_wrapper.py << 'EOF'
#!/usr/bin/env python3
"""
ADK Wrapper to handle import issues

This wrapper provides access to ADK functionality regardless of the import path.
It attempts multiple import strategies to ensure compatibility.
"""

import os
import sys
import logging
import importlib
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class ADKWrapper:
    """Wrapper for ADK functionality that handles import issues."""
    
    def __init__(self):
        self.adk_module = None
        self.agent_module = None
        self._initialize()
    
    def _initialize(self):
        """Initialize the ADK wrapper by trying multiple import strategies."""
        # Strategy 1: Direct import
        try:
            import google.adk
            self.adk_module = google.adk
            logger.info("Imported ADK directly from google.adk")
            return
        except ImportError:
            logger.warning("Failed to import google.adk directly")
        
        # Strategy 2: Import through google.cloud.aiplatform
        try:
            from google.cloud import aiplatform
            if hasattr(aiplatform, 'adk'):
                self.adk_module = aiplatform.adk
                logger.info("Imported ADK from google.cloud.aiplatform.adk")
                return
        except ImportError:
            logger.warning("Failed to import google.cloud.aiplatform")
        
        # Strategy 3: Try aiplatform.agents for direct agent access
        try:
            from google.cloud.aiplatform import agents
            self.agent_module = agents
            logger.info("Imported agents from google.cloud.aiplatform.agents")
            return
        except ImportError:
            logger.warning("Failed to import google.cloud.aiplatform.agents")
        
        logger.error("All ADK import strategies failed")
    
    def create_agent(self, *args, **kwargs):
        """Create an agent using the available module."""
        if self.adk_module and hasattr(self.adk_module, 'create_agent'):
            return self.adk_module.create_agent(*args, **kwargs)
        elif self.agent_module and hasattr(self.agent_module, 'create_agent'):
            return self.agent_module.create_agent(*args, **kwargs)
        else:
            raise ImportError("No ADK module available to create agent")
    
    def run_agent(self, agent, *args, **kwargs):
        """Run an agent using the available module."""
        if hasattr(agent, 'run'):
            return agent.run(*args, **kwargs)
        else:
            raise AttributeError("Agent does not have 'run' method")
    
    def is_available(self) -> bool:
        """Check if ADK functionality is available."""
        return self.adk_module is not None or self.agent_module is not None

# Singleton instance
adk = ADKWrapper()

# Test functionality
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    if adk.is_available():
        print("✅ ADK wrapper initialized successfully")
        print(f"ADK module: {adk.adk_module}")
        print(f"Agent module: {adk.agent_module}")
    else:
        print("❌ ADK wrapper failed to initialize")
        sys.exit(1)
EOF

# Test the wrapper
python tools/adk_wrapper.py
```

## 3. Comprehensive Vector Search Testing

### Create and Run Comprehensive Tests

```bash
cd ~/vana

# Create multiple test queries spanning project domains
cat > scripts/comprehensive_vector_search_test.py << 'EOF'
#!/usr/bin/env python3
"""
Comprehensive Vector Search Test

This script tests Vector Search functionality with multiple queries
covering different aspects of the project.
"""

import sys
import logging
import json
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Import the direct test script
sys.path.append('scripts')
from test_vector_search_direct import search_knowledge

def run_test_query(query, description):
    """Run a test query and log the results."""
    logger.info(f"Testing query: '{query}' ({description})")
    
    # Search the knowledge base
    results = search_knowledge(query)
    
    # Check if results were found
    if "No results found" in results:
        logger.warning(f"❌ No results found for query: '{query}'")
        return False
    
    # Log successful results
    logger.info(f"✅ Results found for query: '{query}'")
    logger.debug(results)
    
    # Extract and return the first result's metadata
    return True

def main():
    """Run comprehensive Vector Search tests."""
    # Define test queries covering different aspects
    test_queries = [
        # Architecture queries
        {"query": "What is the architecture of VANA?", "description": "Basic architecture query"},
        {"query": "How are agents organized in VANA?", "description": "Agent hierarchy query"},
        {"query": "How does Vector Search integration work?", "description": "Vector Search architecture query"},
        
        # Technical queries
        {"query": "How to generate embeddings?", "description": "Technical embedding query"},
        {"query": "How to update the Vector Search index?", "description": "Index update query"},
        {"query": "What GitHub Actions workflows exist?", "description": "GitHub Actions query"},
        
        # Agent queries
        {"query": "What tools are available to agents?", "description": "Agent tools query"},
        {"query": "How do agents use the knowledge base?", "description": "Knowledge usage query"},
        
        # Documentation queries
        {"query": "Troubleshooting Vector Search", "description": "Troubleshooting query"},
        {"query": "Project status and next steps", "description": "Project status query"}
    ]
    
    # Run all test queries
    results = {}
    for test in test_queries:
        success = run_test_query(test["query"], test["description"])
        results[test["query"]] = success
    
    # Summarize results
    success_count = sum(1 for success in results.values() if success)
    total_count = len(results)
    success_rate = success_count / total_count * 100
    
    logger.info(f"\nSummary: {success_count}/{total_count} queries successful ({success_rate:.1f}%)")
    
    if success_rate < 50:
        logger.error("❌ Vector Search testing failed: Too many queries returned no results")
        return 1
    elif success_rate < 80:
        logger.warning("⚠️ Vector Search testing partial success: Some queries failed")
        return 0
    else:
        logger.info("✅ Vector Search testing successful")
        return 0

if __name__ == "__main__":
    sys.exit(main())
EOF

# Run the comprehensive test
python scripts/comprehensive_vector_search_test.py
```

## 4. Health Monitoring Implementation

```bash
cd ~/vana

# Create monitoring script for RAG health checks
cat > scripts/monitor_rag_health.py << 'EOF'
#!/usr/bin/env python3
"""
RAG Health Monitoring Script

This script monitors the health of the RAG system by:
1. Checking Vector Search connectivity
2. Verifying embedding generation
3. Running test queries and validating results
4. Logging metrics for monitoring

Run this script regularly to ensure the RAG system is working properly.
"""

import os
import sys
import time
import logging
import json
import datetime
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("rag_health.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Add scripts directory to path
sys.path.append('scripts')
from test_vector_search_direct import generate_embedding, get_vector_search_endpoint, search_knowledge

# Known-good test queries with expected patterns in results
TEST_QUERIES = [
    {
        "query": "What is Vector Search?",
        "expected_patterns": ["index", "embedding", "search"]
    },
    {
        "query": "How are agents organized in VANA?",
        "expected_patterns": ["agent", "hierarchy", "team"]
    },
    {
        "query": "What tools are available?",
        "expected_patterns": ["tool", "search", "knowledge"]
    }
]

def check_embedding_generation():
    """Check if embedding generation is working."""
    logger.info("Checking embedding generation...")
    start_time = time.time()
    
    try:
        embedding = generate_embedding("Test query for embedding generation")
        duration = time.time() - start_time
        
        if embedding and len(embedding) > 0:
            logger.info(f"✅ Embedding generation is working (dimensions: {len(embedding)}, time: {duration:.2f}s)")
            return True
        else:
            logger.error("❌ Embedding generation returned empty result")
            return False
    except Exception as e:
        logger.error(f"❌ Embedding generation failed: {str(e)}")
        return False

def check_vector_search_connectivity():
    """Check if Vector Search endpoint is accessible."""
    logger.info("Checking Vector Search connectivity...")
    
    try:
        endpoint, deployed_index_id = get_vector_search_endpoint()
        
        if endpoint and deployed_index_id:
            logger.info(f"✅ Vector Search endpoint is accessible (deployed_index_id: {deployed_index_id})")
            return True
        else:
            logger.error("❌ Vector Search endpoint not found")
            return False
    except Exception as e:
        logger.error(f"❌ Vector Search connectivity failed: {str(e)}")
        return False

def run_test_queries():
    """Run test queries and check results."""
    logger.info("Running test queries...")
    
    results = []
    for test in TEST_QUERIES:
        query = test["query"]
        expected_patterns = test["expected_patterns"]
        
        logger.info(f"Testing query: '{query}'")
        start_time = time.time()
        
        try:
            search_result = search_knowledge(query)
            duration = time.time() - start_time
            
            # Check if result contains expected patterns
            pattern_matches = [
                pattern for pattern in expected_patterns 
                if pattern.lower() in search_result.lower()
            ]
            
            success = len(pattern_matches) / len(expected_patterns) if expected_patterns else 0
            
            results.append({
                "query": query,
                "success": success >= 0.5,  # At least 50% of patterns should match
                "pattern_match_ratio": success,
                "duration": duration,
                "contains_results": "No results found" not in search_result
            })
            
            if success >= 0.5:
                logger.info(f"✅ Query test passed: '{query}' (match ratio: {success:.2f}, time: {duration:.2f}s)")
            else:
                logger.warning(f"⚠️ Query test partially failed: '{query}' (match ratio: {success:.2f}, time: {duration:.2f}s)")
        except Exception as e:
            logger.error(f"❌ Query test failed: '{query}' - {str(e)}")
            results.append({
                "query": query,
                "success": False,
                "error": str(e)
            })
    
    # Calculate overall success rate
    success_count = sum(1 for r in results if r.get("success", False))
    success_rate = success_count / len(results) if results else 0
    
    logger.info(f"Query tests: {success_count}/{len(results)} successful ({success_rate:.1f}%)")
    
    return results, success_rate >= 0.7  # At least 70% of queries should succeed

def save_metrics(metrics):
    """Save metrics to a JSON file."""
    metrics_dir = Path("metrics")
    metrics_dir.mkdir(exist_ok=True)
    
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    metrics_file = metrics_dir / f"rag_health_{timestamp}.json"
    
    with open(metrics_file, "w") as f:
        json.dump(metrics, f, indent=2)
    
    logger.info(f"Metrics saved to {metrics_file}")

def main():
    """Main function."""
    logger.info("Starting RAG health check")
    
    metrics = {
        "timestamp": datetime.datetime.now().isoformat(),
        "embedding_generation": {"success": False},
        "vector_search_connectivity": {"success": False},
        "test_queries": {"success": False, "results": []}
    }
    
    # Check embedding generation
    embedding_success = check_embedding_generation()
    metrics["embedding_generation"]["success"] = embedding_success
    
    # Check Vector Search connectivity
    connectivity_success = check_vector_search_connectivity()
    metrics["vector_search_connectivity"]["success"] = connectivity_success
    
    # Run test queries if previous checks passed
    if embedding_success and connectivity_success:
        query_results, query_success = run_test_queries()
        metrics["test_queries"]["success"] = query_success
        metrics["test_queries"]["results"] = query_results
    
    # Save metrics
    save_metrics(metrics)
    
    # Overall health status
    overall_success = all([
        metrics["embedding_generation"]["success"],
        metrics["vector_search_connectivity"]["success"],
        metrics["test_queries"]["success"]
    ])
    
    if overall_success:
        logger.info("✅ RAG system is healthy")
        return 0
    else:
        logger.error("❌ RAG system has issues")
        return 1

if __name__ == "__main__":
    sys.exit(main())
EOF

# Run the health check
python scripts/monitor_rag_health.py
```

## 5. Agent Integration (After ADK Issues Resolved)

```bash
cd ~/vana

# Create agent test harness that works with or without ADK
cat > scripts/agent_harness.py << 'EOF'
#!/usr/bin/env python3
"""
Agent Test Harness

This script provides a testing environment for agents with fallback to direct testing
if ADK is not available.
"""

import os
import sys
import logging
import json
import argparse
from typing import Dict, List, Any, Optional

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Try to import ADK wrapper
try:
    sys.path.append('tools')
    from adk_wrapper import adk
    ADK_AVAILABLE = adk.is_available()
except ImportError:
    logger.warning("ADK wrapper not available, falling back to direct testing")
    ADK_AVAILABLE = False

# Import search knowledge tool
try:
    sys.path.append('tools')
    from search_knowledge_tool import search_knowledge_tool
    SEARCH_AVAILABLE = True
except ImportError:
    logger.warning("Search knowledge tool not available")
    SEARCH_AVAILABLE = False

class MockAgent:
    """Mock agent for testing when ADK is not available."""
    
    def __init__(self, name, description, instructions):
        self.name = name
        self.description = description
        self.instructions = instructions
        self.tools = []
    
    def add_tool(self, tool_fn, name, description):
        """Add a tool to the agent."""
        self.tools.append({
            "function": tool_fn,
            "name": name,
            "description": description
        })
    
    def run(self, query):
        """Run the agent with direct tool access."""
        logger.info(f"MockAgent '{self.name}' processing query: '{query}'")
        
        # Check if the query is about knowledge
        knowledge_keywords = ["what", "how", "explain", "describe", "tell me about", "information"]
        should_search = any(keyword in query.lower() for keyword in knowledge_keywords)
        
        if should_search and SEARCH_AVAILABLE:
            logger.info("Using search_knowledge_tool to answer query")
            search_results = search_knowledge_tool(query)
            
            response = f"Based on my knowledge:\n\n{search_results}\n\n"
            response += f"Is there anything specific about {query} you'd like to know more about?"
            return response
        else:
            logger.warning("Cannot process knowledge query without search_knowledge_tool")
            return f"I understand you're asking about '{query}', but I don't have access to that information right now."

def create_test_agent():
    """Create a test agent with knowledge capabilities."""
    # Define agent parameters
    name = "KnowledgeAgent"
    description = "An agent that can answer questions using the knowledge base"
    instructions = """
    You are a knowledgeable assistant for the VANA project.
    When asked questions, search the knowledge base for relevant information.
    Provide clear and concise answers based on the available knowledge.
    If information is not available, acknowledge this and suggest alternatives.
    """
    
    if ADK_AVAILABLE:
        # Create ADK agent with knowledge tool
        try:
            agent = adk.create_agent(
                name=name,
                description=description, 
                instructions=instructions
            )
            
            # Add search_knowledge_tool if available
            if SEARCH_AVAILABLE:
                agent.add_tool(
                    search_knowledge_tool,
                    name="search_knowledge",
                    description="Search the knowledge base for information related to the query"
                )
            
            logger.info(f"Created ADK agent: {name}")
            return agent
        except Exception as e:
            logger.error(f"Error creating ADK agent: {str(e)}")
            logger.warning("Falling back to MockAgent")
    
    # Fallback to MockAgent
    agent = MockAgent(name, description, instructions)
    
    # Add search_knowledge_tool if available
    if SEARCH_AVAILABLE:
        agent.add_tool(
            search_knowledge_tool,
            name="search_knowledge",
            description="Search the knowledge base for information related to the query"
        )
    
    logger.info(f"Created MockAgent: {name}")
    return agent

def run_agent_test(agent, query):
    """Run a test with the agent."""
    logger.info(f"Testing agent with query: '{query}'")
    
    try:
        response = agent.run(query)
        logger.info(f"Agent response:\n{response}")
        return response
    except Exception as e:
        logger.error(f"Error running agent: {str(e)}")
        return None

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Agent test harness")
    parser.add_argument("--query", default="What is the architecture of VANA?", help="Query to test")
    args = parser.parse_args()
    
    # Create test agent
    agent = create_test_agent()
    
    # Run test
    response = run_agent_test(agent, args.query)
    
    if response:
        logger.info("Agent test completed successfully")
        return 0
    else:
        logger.error("Agent test failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
EOF

# Test agent harness with knowledge query
python scripts/agent_harness.py --query "How does the Vector Search integration work in this project?"
```

## 6. Documentation and Reporting

Create a detailed README for the RAG integration:

```bash
cat > README-RAG.md << 'EOF'
# VANA GitHub RAG Integration

This document explains how the GitHub RAG (Retrieval Augmented Generation) integration works in the VANA system.

## Overview

The VANA GitHub RAG integration enables agents to access knowledge stored in the GitHub repository using Vector Search. This allows agents to provide more accurate and context-aware responses based on the project's documentation and code.

## Architecture

The system consists of the following components:

1. **Knowledge Extraction**: Scripts that process GitHub repository files, extract text, and chunk it into manageable pieces.
2. **Embedding Generation**: Using Vertex AI to generate embeddings for text chunks.
3. **Vector Storage**: Storing embeddings in a Vector Search index for efficient retrieval.
4. **Knowledge Sync**: GitHub Actions workflow that keeps the knowledge base up-to-date.
5. **Knowledge Retrieval**: Tools that allow agents to search the knowledge base.

## Setup and Configuration

### Prerequisites

- Google Cloud Project with Vertex AI and Vector Search enabled
- GitHub repository with necessary secrets configured
- Service account with appropriate permissions

### Environment Variables

The following environment variables are required:

```
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=your-location
GOOGLE_STORAGE_BUCKET=your-bucket
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
VECTOR_SEARCH_INDEX_NAME=your-index-name
VECTOR_SEARCH_DIMENSIONS=768
DEPLOYED_INDEX_ID=your-deployed-index-id
```

### GitHub Secrets

The following secrets must be configured in the GitHub repository:

- GOOGLE_CLOUD_PROJECT
- GOOGLE_CLOUD_LOCATION
- GOOGLE_STORAGE_BUCKET
- GCP_SERVICE_ACCOUNT_KEY

## Usage

### Knowledge Sync

The knowledge sync workflow runs automatically when changes are pushed to the main branch or can be triggered manually from the Actions tab.

To trigger manually:
1. Go to the Actions tab in GitHub
2. Select the "Knowledge Sync" workflow
3. Click "Run workflow"
4. Configure the parameters (max files, file types)
5. Click "Run workflow" again

### Using the Search Tool

```python
from tools.search_knowledge_tool import search_knowledge_tool

# Search the knowledge base
results = search_knowledge_tool("What is the architecture of VANA?")
print(results)
```

### Testing Vector Search

```bash
# Run a direct test
python scripts/test_vector_search_direct.py --query "What is the architecture of VANA?"

# Run comprehensive tests
python scripts/comprehensive_vector_search_test.py

# Monitor RAG health
python scripts/monitor_rag_health.py
```

### Agent Integration

The agents have been configured to use the knowledge base. When an agent receives a query about the VANA system, it will search the knowledge base for relevant information.
EOF
```

## 7. Final Testing and Follow-up Steps

1. **Test the entire RAG pipeline end-to-end**
   - Verify Vector Search integration with comprehensive tests
   - Test the knowledge sync workflow with a small sample
   - Test agent integration if ADK issues are resolved

2. **Prepare for production**
   - Complete any remaining documentation
   - Set up regular monitoring
   - Plan for future enhancements

3. **Consider long-term improvements**
   - Create a new Vector Search index with StreamUpdate enabled
   - Implement improved chunking strategies
   - Add support for multimodal content
   - Enhance monitoring and analytics

## Contact

For questions or issues, please contact Ben or Nick directly.