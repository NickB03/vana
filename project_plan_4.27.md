# Comprehensive Implementation Plan: ADK + n8n + MCP Knowledge Graph

## Executive Summary

This plan outlines the integration of Google ADK, n8n workflows on Railway, and a Model Context Protocol (MCP) Knowledge Graph server to create a comprehensive agent memory and knowledge management system for Project Vana. The architecture leverages Google Vertex AI for core agent capabilities while using n8n for workflow orchestration and an MCP Knowledge Graph server for persistent memory.

## 1. Updated Architecture

### 1.1 High-Level Architecture

```
                                         ┌───────────────────┐
                                         │                   │
                                         │  Vertex AI Vector │
                                         │      Search       │
                                         │                   │
                                         └─────────┬─────────┘
                                                  │
┌───────────────┐     ┌───────────────┐     ┌────▼──────────┐     ┌───────────────────┐
│               │     │               │     │               │     │                   │
│   ADK Agent   │<───>│ MCP Interface │<───>│  n8n Workflows│<───>│  MCP Knowledge    │
│   (Vertex AI) │     │               │     │  (Railway)    │     │  Graph Server     │
│               │     │               │     │               │     │                   │
└───────────────┘     └───────────────┘     └───────────────┘     └───────────────────┘
```

### 1.2 Component Roles

1. **ADK Agent (Vertex AI)**
   - Core agent logic and reasoning
   - Primary user interaction interface
   - Handles RAG queries using Vertex AI Vector Search

2. **MCP Interface**
   - Standardized protocol for agent-server communication
   - Routes commands to appropriate systems
   - Provides consistent API for memory operations

3. **n8n Workflows (Railway)**
   - Visual workflow orchestration
   - Complex process management
   - Scheduled operations
   - Error handling and recovery

4. **MCP Knowledge Graph Server**
   - Persistent memory across sessions
   - Structured entity-relation storage
   - Flexible knowledge representation

5. **Vertex AI Vector Search**
   - High-performance vector storage
   - Semantic search capabilities
   - Scales with project needs

## 2. Implementation Plan

### 2.1 Phase 1: MCP Knowledge Graph Setup (Days 1-2)

1. **Set Up MCP Knowledge Graph Server**
   - Install official MCP server:
     ```bash
     npx -y @modelcontextprotocol/server-memory
     ```
   - Configure for persistent storage in Google Cloud:
     ```bash
     export MEMORY_FILE_PATH=/path/to/persistent/memory.json
     ```

2. **Configure Railway Deployment**
   - Update `railway.toml` to include MCP server
   - Set up volume for persistent storage
   - Configure environment variables

3. **Create Initial Schema**
   - Define project-specific entity types
   - Establish relation patterns
   - Set up observation structure

4. **Import Historical Data (if possible)**
   - Parse existing chat logs for entities and relations
   - Create batch import script
   - Validate imported knowledge structure

### 2.2 Phase 2: Integration with n8n (Days 3-4)

1. **Create n8n Workflows**
   - **Memory Read Workflow**: Retrieves information from Knowledge Graph
   - **Memory Write Workflow**: Stores new information in Knowledge Graph
   - **Memory Update Workflow**: Updates existing knowledge
   - **Memory Search Workflow**: Searches across knowledge structures

2. **Set Up Webhook Endpoints**
   - Configure n8n webhooks for ADK integration
   - Implement authentication
   - Create error handling

3. **Connect n8n to MCP Server**
   - Configure HTTP nodes for MCP server communication
   - Set up JSON transformation
   - Implement error handling

### 2.3 Phase 3: ADK Integration (Days 5-6)

1. **Create ADK Bridge Classes**
   - Implement ADK-to-n8n communication
   - Create ADK tools for memory operations
   - Set up callback handlers

2. **Update Agent Definitions**
   - Modify agent tools to include memory operations
   - Update prompts to utilize knowledge graph
   - Implement memory context augmentation

3. **Test Integration**
   - Validate end-to-end workflows
   - Test error recovery
   - Measure performance

### 2.4 Phase 4: Documentation and Refinement (Day 7)

1. **Update Project Documentation**
   - Update architecture diagrams
   - Revise implementation guides
   - Document API interfaces

2. **Optimize Performance**
   - Identify bottlenecks
   - Implement caching strategies
   - Optimize query patterns

3. **Finalize Deployment**
   - Complete Railway configuration
   - Set up monitoring
   - Establish backup procedures

## 3. Technical Implementation Details

### 3.1 MCP Knowledge Graph Server Configuration

```bash
# Install MCP server
npx -y @modelcontextprotocol/server-memory

# Configuration in railway.toml
[build]
builder = "SHELL"
command = "npx -y @modelcontextprotocol/server-memory"

[deploy]
startCommand = "node index.js"
healthcheckPath = "/healthz"
restartPolicyType = "ON_FAILURE"

[variables]
MEMORY_FILE_PATH = "/data/memory.json"
```

### 3.2 n8n Workflow Examples

**Memory Write Workflow:**
1. Webhook Trigger (receives data from ADK)
2. JSON Transform (format for MCP server)
3. HTTP Request (send to MCP server)
4. Error Handling (manage failures)
5. Response Formatter (prepare response for ADK)

**Memory Read Workflow:**
1. Webhook Trigger (receives query from ADK)
2. JSON Transform (format query for MCP server)
3. HTTP Request (query MCP server)
4. Results Processor (format results)
5. Response Formatter (prepare response for ADK)

### 3.3 ADK Integration Code

```python
from google.adk import LlmAgent, FunctionTool
import requests
import os

class McpKnowledgeGraph:
    def __init__(self, n8n_url, api_key):
        self.n8n_url = n8n_url
        self.headers = {"X-N8N-API-KEY": api_key}
        
    def query_knowledge(self, query, entity_type=None):
        """Query the Knowledge Graph via n8n workflow"""
        url = f"{self.n8n_url}/webhook/knowledge-query"
        payload = {"query": query, "entity_type": entity_type}
        response = requests.post(url, json=payload, headers=self.headers)
        return response.json()
        
    def store_knowledge(self, entity_name, entity_type, observations):
        """Store information in the Knowledge Graph"""
        url = f"{self.n8n_url}/webhook/knowledge-store"
        payload = {
            "entity": {
                "name": entity_name,
                "entityType": entity_type,
                "observations": observations
            }
        }
        response = requests.post(url, json=payload, headers=self.headers)
        return response.json()

# Create Knowledge Graph tool
kg = McpKnowledgeGraph(
    n8n_url=os.environ.get("N8N_URL"),
    api_key=os.environ.get("N8N_API_KEY")
)

# Create tools
query_tool = FunctionTool(
    name="query_knowledge",
    description="Query the knowledge graph for information",
    run=kg.query_knowledge
)

store_tool = FunctionTool(
    name="store_knowledge",
    description="Store new information in the knowledge graph",
    run=kg.store_knowledge
)

# Add to agent
class BenAgent(LlmAgent):
    name = "ben"
    model = "gemini-1.5-pro"
    tools = [query_tool, store_tool]
```

## 4. Updated Documentation 

### 4.1 Updated README.md

```markdown
# VANA - Multi-Agent System Using Google ADK with MCP Knowledge Graph

VANA is a sophisticated multi-agent system built using Google's Agent Development Kit (ADK) with integrated memory capabilities through Model Context Protocol (MCP) Knowledge Graph.

## Key Features

- **Google ADK Integration**: Core agent logic using Google's Agent Development Kit
- **MCP Knowledge Graph**: Persistent memory across sessions
- **n8n Workflow Orchestration**: Visual process management hosted on Railway
- **Vertex AI Vector Search**: High-performance semantic search capabilities

## Architecture

The system follows a modular architecture:
1. ADK Agents handle core reasoning and user interaction
2. MCP Knowledge Graph provides persistent memory
3. n8n orchestrates complex workflows
4. Vertex AI Vector Search powers semantic search

## Getting Started

See [docs/getting-started.md](docs/getting-started.md) for setup instructions.
```

### 4.2 Updated Architecture Document (vana-adk-architecture.md)

```markdown
# VANA ADK Architecture with MCP Knowledge Graph

## Overview

VANA implements a hierarchical agent structure with integrated memory through MCP Knowledge Graph.

## Components

### ADK Agents
- **Ben (Coordinator)**: Project Lead & DevOps Strategist
- **Rhea**: Meta-Architect of Agent Intelligence
- **Max**: Interaction Engineer
- **Sage**: Platform Automator
- **Kai**: Edge Case Hunter
- **Juno**: Story Engineer

### Memory System
- **MCP Knowledge Graph**: Stores entities, relations, and observations
- **n8n Workflows**: Orchestrates memory operations
- **Vertex AI Vector Search**: Powers semantic search capabilities

## Integration Points

The agents interact with the memory system through standardized MCP commands, routed through n8n workflows.
```

### 4.3 Updated phased_plan.md

```markdown
# Phased Execution Plan for VANA

This file outlines the staged execution progress for Vana with clear phasing, risks, and integration points.

1. Phase 1: Deploy Single Agent with RAG tool
2. Phase 2: Integrate n8n/MCP Knowledge Graph for Memory Management
3. Phase 3: Modularize and Route Multi-Agents
4. Phase 4: Performance Evaluation + Tuning

## Phase 1: Single AGENT Deploy with RAG + MCP
[...]

## Phase 2: Integrate n8n/MCP Knowledge Graph for Memory Management

This phase enhances the memory capabilities of the agent system by adding workflow orchestration with n8n and standardized memory operations with MCP Knowledge Graph.

### Steps:

#### 1. Deploy n8n on Railway.app
```bash
# Sign up for Railway.app
# Fork n8n GitHub repository
# Connect repository to Railway
# Configure environment variables
N8N_BASIC_AUTH_USER=your_username
N8N_BASIC_AUTH_PASSWORD=your_password
WEBHOOK_URL=your_railway_app_url
```

#### 2. Set up MCP Knowledge Graph Server
```bash
# Install MCP server
npx -y @modelcontextprotocol/server-memory

# Configure for persistent storage
export MEMORY_FILE_PATH=/path/to/memory.json
```

#### 3. Create n8n Workflows
- Memory Read Workflow
- Memory Write Workflow
- Memory Update Workflow
- Memory Search Workflow

#### 4. Implement MCP Interface
```python
# Create MCP interface for memory commands
class MemoryMCP:
    def handle_command(self, command):
        if command == "!memory_on":
            # Start buffering
        elif command == "!memory_off":
            # Stop buffering
        elif command == "!store":
            # Store memory in Knowledge Graph
```

#### 5. Integrate with ADK Agents
- Add memory tools to agents
- Implement context augmentation
- Set up knowledge retrieval

This phase enhances agents with sophisticated memory management capabilities, allowing for persistent memory across sessions and knowledge-based reasoning.
```

## 5. Instructions for Implementation

### 5.1 For Auggie (AI Code Assistant)

1. **Start with MCP Knowledge Graph Server Setup**
   - Implement the MCP server configuration in Railway
   - Create the necessary persistent storage setup
   - Test basic entity-relation operations

2. **Develop n8n Workflows**
   - Create the four core workflows (read, write, update, search)
   - Set up webhook endpoints with proper authentication
   - Implement error handling and retry logic

3. **Implement ADK Integration**
   - Create the bridge classes for ADK-to-n8n communication
   - Implement the necessary FunctionTools for memory operations
   - Update agent definitions to include memory tools

4. **Create Documentation Updates**
   - Update README.md with new architecture information
   - Create detailed documentation for memory system usage
   - Update architecture diagrams to reflect new components

5. **Implement Testing**
   - Create test scripts for end-to-end validation
   - Implement monitoring for memory operations
   - Validate performance metrics

## 6. Summary of Changes

This plan:
1. Replaces Ragie with MCP Knowledge Graph for persistent memory
2. Maintains n8n on Railway for workflow orchestration
3. Keeps ADK as the core agent framework
4. Leverages Vertex AI Vector Search for semantic search capabilities
5. Updates all documentation to reflect the new architecture

The focus is on creating a more integrated, scalable system that leverages standard protocols (MCP) while maintaining the flexibility of n8n workflows. By implementing these changes, Project Vana will have a comprehensive knowledge management system that works across any session connected to MCP.