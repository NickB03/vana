#!/usr/bin/env python3
"""
VANA Knowledge Base Creator

This script creates a comprehensive knowledge base for VANA that agents can access
through the search_knowledge tool. Instead of trying to populate the complex ADK
memory systems, this creates a structured knowledge base that works with the
existing search infrastructure.

Usage:
    python scripts/create_vana_knowledge_base.py [--output-dir data/knowledge]
"""

import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class VANAKnowledgeBaseCreator:
    """Creates a comprehensive VANA knowledge base."""

    def __init__(self, output_dir: str = "data/knowledge"):
        self.output_dir = Path(output_dir)
        self.created_files = []

    def get_vana_system_knowledge(self) -> Dict[str, str]:
        """Get core VANA system knowledge organized by topic."""

        return {
            "system_overview.md": """# VANA System Overview

VANA is a comprehensive multi-agent AI system built with Google ADK (Agent Development Kit) that provides autonomous task execution through specialized agents and tools.

## Key Features
- **24 Specialized Agents**: Each agent has specific capabilities and expertise
- **59+ Tools**: Comprehensive toolkit for file operations, search, analysis, and coordination
- **Optimization Framework**: 5-component system for performance and efficiency
- **Memory Systems**: ADK-based memory with RAG pipeline and vector search
- **Cloud-Native**: Deployed on Google Cloud Run with Vertex AI integration

## Architecture
- **Multi-Agent Orchestration**: Agents coordinate through session state sharing
- **Tool Ecosystem**: Standardized tools following ADK patterns
- **Memory Hierarchy**: Session → RAG → Vector → Web search
- **Optimization Components**: Strategy, Factory, Optimizer, Coordinator, Unified system

## Deployment
- **Development**: vana-dev environment (1 vCPU/1 GiB)
- **Production**: vana-prod environment (2 vCPU/2 GiB)
- **Technology Stack**: Python 3.13, Poetry, FastAPI, Google Cloud
""",
            "agent_capabilities.md": """# VANA Agent Capabilities

## Core Agents

### Research Agent
- **Purpose**: Data gathering and information synthesis
- **Tools**: brave_search_mcp, search_knowledge, vector_search
- **Capabilities**: Web research, source validation, comprehensive reporting
- **Output**: Structured research reports with citations

### Analysis Agent  
- **Purpose**: Data processing and insight generation
- **Tools**: Analytical tools, data processing, visualization
- **Capabilities**: Statistical analysis, pattern recognition, report generation
- **Output**: Analysis reports with insights and recommendations

### Strategy Agent
- **Purpose**: Strategic planning and coordination
- **Tools**: Planning tools, coordination management
- **Capabilities**: AGOR-inspired strategy selection, multi-agent coordination
- **Output**: Strategic plans and execution roadmaps

### Coordination Manager
- **Purpose**: Agent orchestration and communication
- **Tools**: Agent coordination, performance monitoring
- **Capabilities**: Multi-agent workflows, task distribution, efficiency optimization
- **Output**: Coordination status and performance metrics

### Tool Optimizer
- **Purpose**: Performance monitoring and optimization
- **Tools**: Performance metrics, caching systems, rate limiting
- **Capabilities**: Intelligent caching, API rate limit protection, resource optimization
- **Output**: Performance reports and optimization recommendations

## Specialized Agents
- **Memory Management Agent**: Knowledge storage and retrieval
- **File Operations Agent**: Document and file management
- **Web Search Agent**: External information gathering
- **System Monitoring Agent**: Health and status tracking
- **Report Generation Agent**: Document creation and formatting
- **Task Status Agent**: Progress tracking and monitoring

## Agent Coordination Patterns
- **Session State Sharing**: Agents share data through session.state
- **Progressive Workflows**: Research → Analysis → Strategy → Execution
- **Parallel Processing**: Multiple agents working on different aspects
- **Error Recovery**: Fallback strategies and error handling
""",
            "tool_documentation.md": """# VANA Tool Documentation

## Search Tools

### brave_search_mcp
- **Purpose**: Web search using Brave Search API
- **Usage**: `brave_search_mcp("search query")`
- **Features**: Rate limit protection, intelligent caching
- **Output**: Structured search results with URLs and snippets

### search_knowledge  
- **Purpose**: Search VANA knowledge base using RAG pipeline
- **Usage**: `search_knowledge("VANA capabilities")`
- **Features**: Semantic search, VANA-specific knowledge
- **Output**: Relevant knowledge with confidence scores

### vector_search
- **Purpose**: Semantic similarity search using Vertex AI
- **Usage**: `vector_search("technical documentation")`
- **Features**: Vector embeddings, similarity matching
- **Output**: Similar content with relevance scores

## File Operations

### adk_read_file
- **Purpose**: Read file contents
- **Usage**: `adk_read_file("path/to/file.txt")`
- **Features**: Error handling, encoding detection
- **Output**: File contents as string

### adk_write_file
- **Purpose**: Write content to file
- **Usage**: `adk_write_file("path/to/file.txt", "content")`
- **Features**: Directory creation, backup handling
- **Output**: Success confirmation

### adk_list_directory
- **Purpose**: List directory contents
- **Usage**: `adk_list_directory("path/to/directory")`
- **Features**: Recursive listing, file type detection
- **Output**: Directory structure

## System Tools

### adk_echo
- **Purpose**: Echo input for testing
- **Usage**: `adk_echo("test message")`
- **Features**: Simple testing and validation
- **Output**: Echoed message

### adk_check_task_status
- **Purpose**: Check task execution status
- **Usage**: `adk_check_task_status("task_id")`
- **Features**: Progress tracking, status monitoring
- **Output**: Task status and progress

### adk_generate_report
- **Purpose**: Generate formatted reports
- **Usage**: `adk_generate_report(data, format="markdown")`
- **Features**: Multiple formats, template support
- **Output**: Formatted report document
""",
            "optimization_framework.md": """# VANA Optimization Framework

## Overview
The VANA Optimization Framework consists of 5 integrated components that provide 30-50% memory reduction and 20-40% performance improvements.

## Components

### 1. Strategy Orchestrator
- **Purpose**: AGOR-inspired dynamic strategy selection
- **Features**: Adaptive strategy selection, context-aware planning
- **Benefits**: Optimal approach selection for each task type
- **Implementation**: Dynamic strategy evaluation and selection

### 2. Dynamic Agent Factory
- **Purpose**: On-demand agent creation and lifecycle management
- **Features**: Agent creation, resource management, lifecycle tracking
- **Benefits**: Efficient resource utilization, scalable agent deployment
- **Implementation**: Factory pattern with resource optimization

### 3. Tool Optimizer
- **Purpose**: Performance monitoring and intelligent caching
- **Features**: API rate limiting, intelligent caching, performance metrics
- **Benefits**: Reduced API costs, improved response times
- **Implementation**: Smart caching with rate limit protection

### 4. Coordination Manager
- **Purpose**: Enhanced agent communication patterns
- **Features**: Multi-agent coordination, task distribution, performance monitoring
- **Benefits**: Efficient workflows, reduced coordination overhead
- **Implementation**: Session state sharing and communication protocols

### 5. VANA Optimizer
- **Purpose**: Unified optimization system
- **Features**: System-wide optimization, performance tracking, resource management
- **Benefits**: Holistic system optimization, comprehensive monitoring
- **Implementation**: Unified optimization framework with metrics

## Performance Benefits
- **Memory Reduction**: 30-50% through intelligent caching and resource management
- **Performance Improvement**: 20-40% through optimization and coordination
- **Cost Reduction**: Reduced API calls and resource usage
- **Reliability**: Enhanced error handling and fallback strategies

## Usage Patterns
- **Automatic Optimization**: Framework operates transparently
- **Performance Monitoring**: Real-time metrics and optimization tracking
- **Adaptive Behavior**: System learns and improves over time
- **Resource Management**: Intelligent allocation and cleanup
""",
            "memory_architecture.md": """# VANA Memory Architecture

## Memory Hierarchy

### 1. Session Memory (Automatic)
- **Purpose**: Current conversation context
- **Scope**: Single conversation session
- **Features**: Automatic management, conversation continuity
- **Access**: session.state dictionary

### 2. RAG Corpus (search_knowledge)
- **Purpose**: VANA-specific knowledge and documentation
- **Scope**: System-wide knowledge base
- **Features**: Semantic search, high-quality VANA information
- **Access**: search_knowledge("query")

### 3. Vector Search (vector_search)
- **Purpose**: Technical documentation and similarity search
- **Scope**: Broader technical knowledge
- **Features**: Vector embeddings, semantic similarity
- **Access**: vector_search("technical query")

### 4. Web Search (brave_search_mcp)
- **Purpose**: External information and current data
- **Scope**: Internet-wide information
- **Features**: Real-time data, external sources
- **Access**: brave_search_mcp("external query")

## Memory Usage Patterns

### Memory-First Strategy
1. **Check Session Memory**: Current conversation context
2. **Search VANA Knowledge**: search_knowledge for system information
3. **Use Vector Search**: vector_search for technical content
4. **Web Search**: brave_search_mcp for external information

### Agent Memory Behavior
- **Proactive Lookup**: Check memory before external searches
- **Context Preservation**: Maintain conversation continuity
- **Knowledge Sharing**: Share discoveries via session state
- **Learning**: Store successful patterns and preferences

### Memory Commands
- **!memory_on**: Start recording conversation
- **!memory_off**: Stop recording and clear buffer
- **!rag**: Save conversation to knowledge base

## Best Practices
- **Always check VANA knowledge first** for system questions
- **Use memory hierarchy** to avoid redundant searches
- **Store important discoveries** in session state
- **Cite memory sources** when using retrieved information
""",
            "troubleshooting.md": """# VANA Troubleshooting Guide

## Common Issues

### Import Hanging Issues
- **Symptoms**: Python imports hang or timeout
- **Causes**: Heavy dependency chains, blocking authentication
- **Solutions**: 
  - Recreate Poetry environment
  - Use lazy loading patterns
  - Check authentication configuration

### Memory Search Returns Fallback Results
- **Symptoms**: search_knowledge returns "fallback results"
- **Causes**: Empty RAG corpus, no populated content
- **Solutions**:
  - Run memory population script
  - Check ADK memory service configuration
  - Validate environment variables

### Tool Failures
- **Symptoms**: Tools return errors or empty results
- **Causes**: Missing API keys, configuration issues
- **Solutions**:
  - Check environment variables
  - Validate API key configuration
  - Test tool functionality individually

### Agent Coordination Issues
- **Symptoms**: Agents not sharing information properly
- **Causes**: Session state problems, coordination failures
- **Solutions**:
  - Debug session state content
  - Check agent coordination patterns
  - Validate session management

### Deployment Issues
- **Symptoms**: Cloud Run deployment failures
- **Causes**: Configuration errors, resource constraints
- **Solutions**:
  - Check environment variables
  - Validate resource allocation
  - Review deployment logs

## Environment Configuration

### Required Variables
```
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}
GOOGLE_CLOUD_LOCATION=us-central1
BRAVE_API_KEY=<your_brave_api_key>
```

### Development vs Production
- **Development**: Use vana-dev environment for testing
- **Production**: Deploy to vana-prod only after validation
- **Testing**: Use Playwright for comprehensive validation

## Debugging Steps
1. **Check Logs**: Review application and deployment logs
2. **Test Components**: Validate individual tools and agents
3. **Environment**: Verify all required variables are set
4. **Memory**: Check memory service availability and content
5. **Coordination**: Debug agent communication patterns
""",
        }

    def create_knowledge_base(self) -> bool:
        """Create the complete VANA knowledge base."""

        logger.info("🚀 Creating VANA knowledge base...")

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Get knowledge content
        knowledge_files = self.get_vana_system_knowledge()

        success_count = 0

        for filename, content in knowledge_files.items():
            try:
                file_path = self.output_dir / filename

                # Add metadata header
                metadata_header = f"""---
title: {filename.replace('.md', '').replace('_', ' ').title()}
created: {datetime.now().isoformat()}
source: vana_knowledge_base_creator
type: system_documentation
---

"""

                full_content = metadata_header + content

                # Write file
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(full_content)

                self.created_files.append(str(file_path))
                success_count += 1
                logger.info(f"✅ Created: {filename}")

            except Exception as e:
                logger.error(f"❌ Failed to create {filename}: {e}")

        # Create index file
        self.create_index_file()

        logger.info(f"📊 Knowledge base creation completed: {success_count}/{len(knowledge_files)} files created")
        return success_count == len(knowledge_files)

    def create_index_file(self):
        """Create an index file for the knowledge base."""

        index_content = f"""# VANA Knowledge Base Index

Created: {datetime.now().isoformat()}

## Available Documentation

"""

        for file_path in self.created_files:
            filename = Path(file_path).name
            title = filename.replace(".md", "").replace("_", " ").title()
            index_content += f"- [{title}]({filename})\n"

        index_content += f"""
## Usage

This knowledge base can be accessed by VANA agents through the `search_knowledge` tool:

```python
# Search for system information
results = search_knowledge("VANA capabilities")

# Search for agent information  
results = search_knowledge("Research Agent role")

# Search for tool documentation
results = search_knowledge("brave_search_mcp usage")
```

## Files Created
Total files: {len(self.created_files)}
"""

        index_path = self.output_dir / "index.md"
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(index_content)

        logger.info(f"📚 Created index file: {index_path}")


def main():
    """Main execution function."""

    import argparse

    parser = argparse.ArgumentParser(description="Create VANA knowledge base")
    parser.add_argument("--output-dir", default="data/knowledge", help="Output directory for knowledge base")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    creator = VANAKnowledgeBaseCreator(output_dir=args.output_dir)

    success = creator.create_knowledge_base()

    if success:
        logger.info(f"\n🎉 VANA Knowledge Base Created Successfully!")
        logger.info(f"📁 Location: {creator.output_dir}")
        logger.info(f"📊 Files created: {len(creator.created_files)}")
        logger.info(f"🧠 Knowledge base is ready for agent access")

        logger.info(f"\n🚀 Next steps:")
        logger.info(f"1. Update search_knowledge tool to use this knowledge base")
        logger.info(f"2. Test agent knowledge retrieval")
        logger.info(f"3. Deploy updated system")
    else:
        logger.error(f"\n❌ Knowledge base creation failed. Check logs for details.")
        sys.exit(1)


if __name__ == "__main__":
    main()
