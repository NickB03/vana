# VANA - Multi-Agent System Using Google ADK

![VANA Logo](https://img.shields.io/badge/VANA-Agent%20Development%20Kit-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.9%2B-blue)
![Status](https://img.shields.io/badge/status-development-orange)

VANA is a sophisticated multi-agent system built using Google's Agent Development Kit (ADK). It implements a hierarchical agent structure with specialized AI agents led by a coordinator agent, providing a powerful framework for complex AI tasks.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [Agent Team](#-agent-team)
- [Context Management](#-context-management)
- [ADK Integration](#-adk-integration)
- [Vector Search Integration](#-vector-search-integration)
- [MCP Integration](#-mcp-integration)
- [Knowledge Graph Integration](#-knowledge-graph-integration)
- [Enhanced Hybrid Search](#-enhanced-hybrid-search)
- [Web Search Integration](#-web-search-integration)
- [Feedback Collection](#-feedback-collection)
- [Automated Knowledge Base Maintenance](#-automated-knowledge-base-maintenance)
- [Agent Orchestration Model](#-agent-orchestration-model)
- [Team Coordination System](#-team-coordination-system)
- [Deployment](#-deployment)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)
- [Additional Resources](#-additional-resources)
- [Documentation](#-documentation)

## 📚 Documentation

The project documentation is organized as follows:

- [Architecture](docs/architecture/index.md): System design and component relationships
- [Implementation](docs/implementation/index.md): Implementation details for each component
- [Guides](docs/guides/index.md): User and developer guides
- [Integrations](docs/integrations/index.md): External integrations (n8n, MCP)
- [Project](docs/project/index.md): Project management documentation
- [API](docs/api/index.md): API reference documentation
- [Troubleshooting](docs/troubleshooting/index.md): Common issues and solutions

## 🔍 Overview

VANA (Versatile Agent Network Architecture) is a code-first implementation of a multi-agent system using Google's Agent Development Kit. The system features a primary agent (Vana) with specialist sub-agents, leveraging Vertex AI Vector Search, Knowledge Graph, and Web Search for comprehensive knowledge retrieval.

This project demonstrates how to build, configure, and deploy a team of specialized AI agents that can collaborate to solve complex problems, with each agent having specific responsibilities and capabilities.

## ✨ Features

- **Primary Agent with Specialists**: Vana as the lead agent with 5 specialist sub-agents
- **Sophisticated Context Management**: Context scoping, memory integration, and context summarization
- **Seamless ADK Integration**: Session management, tool registration, state synchronization, and event handling
- **Team Coordination System**: Task planning, parallel execution, result validation, and fallback mechanisms
- **Shared Knowledge Base**: Vector storage via Vertex AI Vector Search
- **Persistent Memory with Delta Updates**: Efficient MCP Knowledge Graph for long-term memory across sessions
- **Cross-Device State Persistence**: Agent Engine Sessions for consistent user experience
- **Web Search Integration**: Google Custom Search API integration for up-to-date information
- **Enhanced Hybrid Search**: Combined search across Vector Search, Knowledge Graph, and Web
- **Native Multi-Agent Support**: Built-in delegation through ADK
- **Comprehensive Testing Framework**: Juno as autonomous tester with learning capabilities
- **Development UI**: Built-in developer UI for testing
- **Cloud Deployment**: Seamless deployment to Vertex AI Agent Engine
- **Chat History Integration**: Import past conversations into the Knowledge Graph
- **Enhanced Document Processing**: PDF support, semantic chunking, and metadata enrichment
- **Advanced Entity Extraction**: NLP-based entity and relationship extraction
- **Comprehensive Evaluation Framework**: Metrics for precision, recall, F1 score, and NDCG
- **Optimized Search Algorithms**: Query classification, improved relevance calculation, and result diversity

## 🏗️ Architecture

VANA follows an architecture with a primary agent (Vana) delegating tasks to specialist agents:

```
                    [Vana - Primary Agent]
                    /        |        \
         ┌─────────┐   ┌─────────┐   ┌─────────┐
         │  Rhea   │   │   Max   │   │  Sage   │
         │(Meta-Arch)│   │(Interface)│   │(Platform)│
         └─────────┘   └─────────┘   └─────────┘
         ┌─────────┐   ┌─────────┐
         │   Kai   │   │  Juno   │
         │(Edge Cases)│   │(Test Specialist)│
         └─────────┘   └─────────┘
```

All agents share access to common knowledge sources including Vector Search, Knowledge Graph, and Web Search, enabling comprehensive information access across the agent team.

For detailed architecture information, see [docs/vana-architecture-guide.md](docs/vana-architecture-guide.md).

## 📋 Prerequisites

Before you begin, ensure you have:

- Python 3.9 or higher
- Google Cloud Platform account with billing enabled
- Project ID with Vertex AI API enabled
- Service account with appropriate permissions
- Google ADK installed

### Required GCP Permissions

Your service account needs the following permissions:
- `aiplatform.indexes.list`
- `aiplatform.indexes.create`
- `aiplatform.indexEndpoints.list`
- `aiplatform.indexEndpoints.create`
- `aiplatform.indexEndpoints.deployIndex`

## 🚀 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/NickB03/vana.git
   cd vana
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r adk-setup/requirements.txt

   # Install additional dependencies for enhanced features
   pip install PyPDF2 spacy Pillow pytesseract
   python -m spacy download en_core_web_sm
   ```

## ⚙️ Configuration

1. Set up environment variables using one of the following methods:

   **Option 1: Project Root `.env` (Standard)**
   ```bash
   # Copy the example file
   cp .env.example .env

   # Edit with your favorite text editor
   nano .env
   ```

   **Option 2: Secrets Directory (More Secure, Recommended)**
   ```bash
   # Create the secrets directory if it doesn't exist
   mkdir -p secrets

   # Create and edit the secrets file
   cp .env.example secrets/.env
   nano secrets/.env
   ```

   For detailed information on environment variable setup, see [Environment Setup Guide](docs/environment-setup.md).

2. Create a `secrets` directory and add your service account key:
   ```bash
   mkdir -p secrets
   # Add your service account JSON key to the secrets directory
   ```

3. Run the setup script:
   ```bash
   python setup_vana.py
   ```

   This will:
   - Verify API enablement
   - Check service account permissions
   - Set up Vector Search
   - Populate Vector Search with knowledge documents
   - Test Vector Search integration

## 🖥️ Usage

### Local Development

Start the ADK development server:

```bash
cd adk-setup
adk web
```

This will launch a web interface at http://localhost:8000 where you can interact with your agents.

### Running Individual Agents

To run a specific agent:

```bash
adk run vana.agents.team
```

## 👥 Agent Team

VANA features a team of specialized agents:

- **Vana (Primary Agent)**: Lead Developer, Architect, and Strategist for Project Vana
- **Rhea**: Meta-Architect of Agent Intelligence
- **Max**: Interaction Engineer
- **Sage**: Platform Automator
- **Kai**: Edge Case Hunter
- **Juno**: Test Specialist

Each agent has specific tools and capabilities designed for their role. Vana can delegate tasks to specialist agents based on their expertise, and specialist agents can communicate with each other to collaborate on complex tasks.

## 🧠 Context Management

VANA implements a sophisticated context management system for maintaining conversation state:

1. **Conversation Context Manager**:
   - Manages conversation contexts with different scopes (session, user, global)
   - Provides persistent storage of conversation history
   - Enables context-aware responses based on conversation history
   - Integrates with memory systems for long-term knowledge
   - Implements context summarization for specialist agents

2. **Key Features**:
   - **Context Scoping**: Session-specific, user-specific, or global contexts
   - **Message History**: Tracking of user and assistant messages
   - **Entity Tracking**: Extraction and storage of entities from conversations
   - **Relevance Scoring**: Determining context relevance to queries
   - **Context Summarization**: Generating concise summaries for specialist agents
   - **Memory Integration**: Fetching relevant memory based on context

3. **Implementation**:
   - `adk-setup/vana/context/conversation_context_manager.py` - Main implementation
   - `adk-setup/vana/context/context_manager.py` - Base context management
   - `tests/context/test_conversation_context_manager.py` - Comprehensive tests

4. **Benefits**:
   - Improved conversation coherence across interactions
   - Personalized responses based on user history
   - Efficient information sharing between agents
   - Reduced redundancy in conversations
   - Enhanced reasoning through historical context

For detailed information on the context management architecture, see [Context Management Architecture](docs/context-management-architecture.md).

## 🔌 ADK Integration

VANA integrates seamlessly with Google's Agent Development Kit (ADK):

1. **Components**:
   - **ADKSessionAdapter**: Bridges VANA contexts and ADK sessions
   - **ADKToolAdapter**: Exposes VANA specialist agents as ADK tools
   - **ADKStateManager**: Synchronizes state between VANA and ADK
   - **ADKEventHandler**: Processes ADK events within the VANA ecosystem

2. **Key Features**:
   - **Session Management**: Mapping between VANA contexts and ADK sessions
   - **Tool Registration**: Exposing specialist agents and functions as ADK tools
   - **State Synchronization**: Keeping state consistent across both systems
   - **Event Handling**: Processing ADK events with appropriate actions
   - **Graceful Fallbacks**: Operating when ADK is not available

3. **Implementation**:
   - `adk-setup/vana/adk_integration/adk_session_adapter.py` - Session management
   - `adk-setup/vana/adk_integration/adk_tool_adapter.py` - Tool registration
   - `adk-setup/vana/adk_integration/adk_state_manager.py` - State synchronization
   - `adk-setup/vana/adk_integration/adk_event_handler.py` - Event processing
   - `tests/adk_integration/` - Comprehensive tests for all components

4. **Benefits**:
   - Seamless integration with Google's ADK
   - Consistent state across both systems
   - Tool-based specialist integration
   - Event-driven architecture
   - Robust error handling and fallbacks

For detailed information on the ADK integration, see [ADK Integration Guide](docs/adk-integration-guide.md).

## 🔍 Vector Search Integration

VANA uses Vertex AI Vector Search for knowledge retrieval:

1. The `setup_vector_search.py` script creates and configures the Vector Search index:
   - Creates a Vector Search index with SHARD_SIZE_SMALL configuration
   - Creates a public Vector Search index endpoint
   - Deploys the index to the endpoint using e2-standard-2 machines

2. Knowledge documents are processed and embedded:
   - Text files are stored in the `knowledge_docs` directory
   - The `prepare_embeddings.py` script generates embeddings using Vertex AI's text-embedding-004 model
   - Embeddings are uploaded to Google Cloud Storage in a structured format
   - The `update_index_api.py` script updates the Vector Search index with the embeddings

3. Agents use the `search_knowledge_tool` to query the shared knowledge base:
   - Queries are converted to embeddings using the same model
   - Embedding values are explicitly converted to float to prevent type errors
   - The Vector Search index finds semantically similar documents
   - Results are returned with metadata including source and content

4. Monitoring and maintenance:
   - The `check_operation.py` script monitors long-running operations
   - The `check_deployment.py` script verifies index deployment status
   - The `test_vector_search.py` script tests search functionality
   - The `test_vector_search_fix.py` script verifies embedding type conversion

5. Current status:
   - Vector Search index has been created and configured
   - Knowledge documents have been embedded and uploaded
   - Index update operation has completed successfully
   - Query functionality has been fixed with explicit type conversion for embeddings
   - Enhanced error handling and validation have been implemented
   - The system is now fully functional with proper type handling

6. The system requires a service account with Vertex AI Admin permissions

7. Recent fixes:
   - Fixed the "must be real number, not str" error by implementing explicit type conversion
   - Added validation to ensure all embedding values are proper float types
   - Enhanced error handling with fallback to alternative API methods
   - Added detailed logging to track embedding dimensions and value types
   - Created test scripts to verify Vector Search functionality
   - See [Vector Search Fixes](docs/vector-search-fixes.md) for details

## 🧪 Testing Framework

VANA includes a comprehensive testing framework that allows Juno to act as a human tester:

1. **Testing Modes**:
   - **Structured Testing**: Run predefined test cases with expected results
   - **Autonomous Testing**: Juno decides what to test and adapts based on previous results
   - **Interactive Testing**: Manually ask questions to Vana

2. **Key Features**:
   - **Learning from Previous Results**: Juno analyzes past test runs to focus on problem areas
   - **Comprehensive Coverage**: Tests all capabilities including Vector Search, Knowledge Graph, and Web Search
   - **Detailed Reporting**: Generates comprehensive test reports with actionable insights

3. **Components**:
   - `scripts/test_vana_agent.py`: Direct test runner
   - `scripts/juno_test_agent.py`: Agent-based test runner for structured testing
   - `scripts/juno_autonomous_tester.py`: Autonomous Juno agent for dynamic testing
   - `scripts/vana_test_cases.json`: Collection of predefined test cases
   - `scripts/run_vana_tests.sh`: Bash script to run tests in any mode

4. **Usage**:
   ```bash
   # Run predefined test cases
   ./scripts/run_vana_tests.sh

   # Run in autonomous mode
   ./scripts/run_vana_tests.sh --autonomous

   # Run in interactive mode
   ./scripts/run_vana_tests.sh --interactive
   ```

For detailed information on the testing framework, see [scripts/README-TESTING.md](scripts/README-TESTING.md).

## 🔄 MCP Integration

VANA integrates with the Model Context Protocol (MCP) for enhanced memory management:

1. **MCP Memory Server**:
   - Community-hosted MCP server for Knowledge Graph integration
   - Provides standardized command handling through MCP
   - Enables persistent memory across sessions
   - Supports delta-based updates for efficient synchronization

2. **Memory Commands**:
   - `!memory_search [query]` - Search the persistent memory system
   - `!memory_store [entity] [type] [observation1, observation2, ...]` - Store entity in persistent memory
   - `!memory_relate [entity1] [relation] [entity2]` - Create relationship in persistent memory
   - `!memory_on` - Start buffering new chat turns
   - `!memory_off` - Stop buffering, discard uncommitted memory
   - `!rag` - Save buffered memory permanently into vector store

3. **Setup and Configuration**:
   - Uses community-hosted MCP server by default
   - Configuration stored in environment variables
   - See [Persistent Memory Implementation](docs/persistent-memory-implementation.md) for detailed information
   - See [n8n-mcp-server-setup.md](docs/n8n-mcp-server-setup.md) for self-hosting options

4. **Benefits**:
   - Efficient delta-based synchronization
   - Cross-device state persistence
   - Performance optimization with caching
   - Entity importance scoring
   - Integration with Agent Engine
   - Hybrid search combining Vector Search and Knowledge Graph

5. **Requirements**:
   - Node.js (v18.17.0, v20, or v22 recommended)
   - n8n API key
   - Ragie API key

6. **Environment Setup**:
   - API keys and credentials are stored in environment variables
   - See [Environment Setup Guide](docs/environment-setup.md) for details
   - For security, store sensitive credentials in `secrets/.env`

## 🧠 Knowledge Graph Integration

VANA integrates with a hosted MCP Knowledge Graph for persistent memory and knowledge management:

1. **MCP Knowledge Graph**:
   - Provides persistent memory across sessions
   - Stores structured knowledge as entities and relationships
   - Enables agents to build and query a knowledge base over time
   - Complements Vector Search with structured knowledge representation
   - Implements delta-based updates for efficient synchronization

2. **Key Features**:
   - Entity and relationship storage
   - Semantic search capabilities
   - Metadata and property management
   - Historical conversation tracking
   - Hybrid search combining Knowledge Graph and Vector Search
   - Efficient delta-based synchronization
   - Cross-device state persistence
   - Performance optimization with caching

3. **Enhanced Entity Extraction**:
   - NLP-based entity extraction using spaCy
   - Rule-based pattern matching for domain-specific entities
   - Relationship inference between entities
   - Entity linking with confidence scoring
   - Automated document processing for entity extraction

4. **Integration with Claude**:
   - Import past Claude chat history
   - Automatically extract entities and relationships
   - Make historical knowledge available to agents
   - Enhance agent reasoning with structured knowledge

5. **Knowledge Graph Commands**:
   - `!kg_on` - Enable Knowledge Graph integration
   - `!kg_off` - Disable Knowledge Graph integration
   - `!kg_query <entity_type> <query>` - Search for entities
   - `!kg_store <entity_name> <entity_type> <observation>` - Store new information
   - `!kg_relationship <entity1> <relationship> <entity2>` - Store a relationship
   - `!kg_context` - Show current Knowledge Graph context
   - `!kg_extract <text>` - Extract entities from text
   - `!kg_related <entity_name> <relationship_type>` - Find related entities
   - `!kg_infer <entity_name>` - Infer relationships for an entity

6. **Document Processing**:
   - PDF support with metadata extraction
   - Multi-modal support with image OCR
   - Semantic chunking for better knowledge retrieval
   - Metadata enrichment with keywords and structure analysis
   - Automated entity extraction from documents

7. **Setup and Configuration**:
   - Uses community-hosted MCP server
   - Configuration stored in `augment-config.json`
   - See [Knowledge Graph Integration Guide](docs/knowledge-graph-integration.md) for detailed instructions
   - See [Enhanced Knowledge Graph](docs/enhanced-knowledge-graph.md) for advanced features
   - See [Document Processing Strategy](docs/document-processing-strategy.md) for document processing details
   - See [VANA Command Reference](docs/vana-command-reference.md) for all available commands

8. **Benefits**:
   - No self-hosting required
   - Accessible from any device
   - Persistent knowledge across sessions
   - Structured knowledge representation
   - Enhanced reasoning through hybrid search
   - Automatic entity extraction from conversations
   - Comprehensive document processing pipeline
   - Advanced entity linking and relationship inference

## 🔍 Enhanced Hybrid Search

VANA implements an enhanced hybrid search that combines multiple search methods:

1. **Components**:
   - Vector Search for semantic similarity
   - Knowledge Graph for structured knowledge
   - Web Search for up-to-date information
   - Result Merger for combining and ranking results
   - Feedback System for continuous improvement

2. **Key Features**:
   - Multi-source search in parallel
   - Sophisticated result ranking
   - Source weighting and diversity
   - Query classification and preprocessing
   - Comprehensive result formatting

3. **Optimized Algorithms**:
   - Query classification for optimal source weights
   - Enhanced relevance calculation with proximity analysis
   - Improved result diversity with source balancing
   - Intelligent query preprocessing
   - Performance optimization for reduced latency

4. **Commands**:
   - `!hybrid_search <query>` - Basic hybrid search (Vector Search + Knowledge Graph)
   - `!enhanced_search <query>` - Enhanced hybrid search with web integration
   - `!vector_search <query>` - Search only Vector Search
   - `!kg_search <query>` - Search only Knowledge Graph
   - `!web_search <query>` - Search only the web

5. **Implementation**:
   - `tools/hybrid_search.py` - Basic hybrid search
   - `tools/enhanced_hybrid_search.py` - Enhanced hybrid search with web
   - `tools/enhanced_hybrid_search_optimized.py` - Optimized implementation

6. **Benefits**:
   - More comprehensive search results
   - Up-to-date information from the web
   - Better result quality through sophisticated ranking
   - Improved performance through optimization
   - Continuous improvement through feedback

## 🌐 Web Search Integration

VANA integrates with Google Custom Search API for web search capabilities:

1. **Implementation**:
   - Uses Google's Custom Search API
   - Configurable through environment variables
   - Mock implementation for testing
   - Integration with enhanced hybrid search

2. **Configuration**:
   - Requires Google API Key
   - Requires Custom Search Engine ID
   - Stored in environment variables:
     ```
     GOOGLE_SEARCH_API_KEY=your_google_search_api_key
     GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
     ```
   - See [Web Search Configuration](docs/web-search-configuration.md) for detailed setup instructions

3. **Features**:
   - Up-to-date information from the web
   - Configurable result count
   - Source attribution for web results
   - Error handling and fallback mechanisms
   - Rate limiting and caching

4. **Commands**:
   - `!web_search <query>` - Search the web for information
   - `!enhanced_search <query> include_web=true` - Include web results in hybrid search

5. **Benefits**:
   - Access to real-time information
   - Complement to internal knowledge base
   - Improved response quality for time-sensitive queries
   - Broader knowledge coverage

## 📊 Feedback Collection

VANA includes a comprehensive feedback collection system for search results:

1. **Implementation**:
   - SQLite database for feedback storage
   - Flask API for feedback collection
   - Client library for programmatic feedback submission
   - Command-line interface for manual feedback submission

## 🔒 Security Components

VANA implements robust security components for protecting sensitive operations:

1. **Credential Management**:
   - Secure storage and retrieval of sensitive credentials
   - Encryption of sensitive values
   - Credential caching for performance
   - Masking of sensitive information in logs

2. **Access Control**:
   - Role-based permissions (Guest, User, Agent, Admin)
   - Operation-level access control
   - Entity type restrictions
   - Decorator for securing functions

3. **Audit Logging**:
   - Tamper-evident logs with hash chaining
   - Filtering of sensitive information
   - Comprehensive metadata
   - Log integrity verification

4. **Circuit Breakers**:
   - Protection against cascading failures
   - Automatic circuit opening on failures
   - Half-open state for testing recovery
   - Configurable thresholds and timeouts

5. **Structured Logging**:
   - Standardized logging across components
   - Log level configuration
   - Context-aware logging
   - Performance monitoring

6. **Health Checks**:
   - Component status monitoring
   - Dependency health verification
   - Automatic recovery mechanisms
   - Alert generation for critical issues

7. **Integration with Memory System**:
   - Secure MCP client with credential management
   - Access control for memory operations
   - Audit logging for sensitive operations
   - Circuit breaker protection for external services

8. **Local Development Environment**:
   - Docker-based local MCP server
   - Environment configuration system
   - Test scripts for security verification
   - Documentation for security best practices

For detailed information on security components, see [Security Integration Guide](docs/security-integration-guide.md).

## 🔄 Agent Orchestration Model

VANA implements a lead agent architecture with Vana as the orchestrator for all operations:

1. **Task Routing**:
   - Automatic routing of tasks to the most appropriate agent
   - Keyword-based scoring for agent selection
   - Confidence scoring for routing decisions
   - Fallback to Vana for uncertain tasks

2. **Context Passing**:
   - Shared context between agents for consistent conversation state
   - Context serialization and deserialization
   - Context persistence across sessions
   - Context caching for performance

3. **Result Synthesis**:
   - Combining outputs from multiple agents
   - Result ranking by confidence
   - Source attribution for transparency
   - Formatting for presentation

4. **Agent Specialties**:
   - **Rhea (Meta-Architect)**: Architecture, design, structure, framework
   - **Max (Interaction Engineer)**: Interface, UI, UX, user experience
   - **Sage (Platform Automator)**: Automation, CI, CD, pipeline, workflow
   - **Kai (Edge Case Hunter)**: Edge case, error, exception, bug, issue
   - **Juno (Test Specialist)**: Test, testing, unit test, integration test

5. **Integration with ADK**:
   - Native integration with Google ADK
   - Delegation through sub-agents
   - Tool-based specialist integration
   - Seamless conversation flow

6. **Testing Framework**:
   - Comprehensive test suite for orchestration components
   - Task routing validation
   - Context passing verification
   - Result synthesis testing

7. **Development Tools**:
   - Task simulation for testing
   - Context inspection for debugging
   - Performance monitoring for optimization
   - Logging for troubleshooting

For detailed information on the agent orchestration model, see [Agent Orchestration Model](docs/agent-orchestration-model.md).

## 🤝 Team Coordination System

VANA implements a comprehensive team coordination system for efficient collaboration between specialist agents:

1. **Task Planner**:
   - Decomposes complex tasks into subtasks
   - Identifies dependencies between subtasks
   - Creates optimal execution plans
   - Assigns subtasks to appropriate specialists

2. **Parallel Executor**:
   - Manages concurrent execution of independent subtasks
   - Handles thread management and resource allocation
   - Monitors execution progress
   - Collects results from parallel executions

3. **Result Validator**:
   - Validates results against defined criteria
   - Assigns confidence scores to results
   - Identifies inconsistencies and errors
   - Combines results from multiple specialists

4. **Fallback Manager**:
   - Detects failures in specialist execution
   - Implements retry logic with exponential backoff
   - Provides alternative execution paths
   - Gracefully degrades functionality when needed

5. **Implementation**:
   - `adk-setup/vana/orchestration/task_planner.py` - Task decomposition and planning
   - `adk-setup/vana/orchestration/parallel_executor.py` - Concurrent execution
   - `adk-setup/vana/orchestration/result_validator.py` - Result validation
   - `adk-setup/vana/orchestration/fallback_manager.py` - Failure handling
   - `tests/orchestration/test_team_coordination.py` - Comprehensive tests

6. **Benefits**:
   - Efficient handling of complex tasks
   - Improved performance through parallelization
   - Enhanced result quality through validation
   - Robust error handling and recovery
   - Scalable architecture for adding new specialists

For detailed information on the team coordination system, see [Team Coordination System](docs/team-coordination-system.md).

## 📊 Monitoring Dashboard

VANA implements a comprehensive monitoring dashboard for system visibility and alerting:

1. **Health Checks**:
   - Component-level health monitoring
   - Overall system health status
   - Automatic health check scheduling
   - Health check history tracking
   - Customizable health check thresholds

2. **Metrics Collection**:
   - Performance metrics for all components
   - System resource utilization tracking
   - Request and response metrics
   - Error rate and latency monitoring
   - Historical metrics for trend analysis

3. **Alerting System**:
   - Multi-level alert severity (Info, Warning, Error, Critical)
   - Alert lifecycle management
   - Alert notification channels
   - Alert history and tracking
   - Alert aggregation and correlation

4. **Visualization**:
   - Real-time system health visualization
   - Performance metrics dashboards
   - Historical trend analysis
   - Component relationship mapping
   - Alert and incident visualization

5. **Integration**:
   - Memory system component monitoring
   - Agent performance tracking
   - Security component integration
   - External service health checks
   - API endpoint for dashboard access

6. **Historical Data**:
   - Long-term performance tracking
   - Capacity planning metrics
   - Trend analysis for optimization
   - Incident correlation with metrics
   - Performance regression detection

7. **Testing Tools**:
   - Dashboard component testing
   - Simulated component failures
   - Alert generation and resolution testing
   - Performance benchmark testing
   - Load and stress testing

For detailed information on the monitoring dashboard, see [Monitoring Dashboard](docs/monitoring-dashboard.md).

## 📊 Feedback Collection (continued)

2. **Features**:
   - Overall rating for search results (1-5)
   - Individual result ratings
   - Free-form comments
   - Source tracking (which search implementation was used)
   - Timestamp and query tracking
   - Statistical analysis of feedback

3. **Components**:
   - `tools/feedback_collector.py` - Core feedback collection functionality
   - `tools/feedback_api.py` - Flask API for feedback collection
   - `tools/feedback_client.py` - Client for submitting feedback

4. **Usage**:
   - **API**: Submit feedback via HTTP POST to `/feedback`
   - **Client Library**:
     ```python
     from tools.feedback_client import FeedbackClient

     client = FeedbackClient()
     client.submit_feedback(
         query="What is VANA?",
         rating=4,
         comments="Good results, but missing some information",
         result_ratings=[5, 4, 3, 2, 1]
     )
     ```
   - **Command Line**:
     ```bash
     python -m tools.feedback_client submit --query "What is VANA?" --rating 4 --comments "Good results" --result-ratings "5,4,3,2,1"
     ```

5. **Analysis**:
   - Statistical analysis of feedback by query type, implementation, and result position
   - Identification of problematic queries
   - Comparison of search implementations
   - Position analysis for result relevance
   - Export functionality for further analysis

6. **Benefits**:
   - Continuous improvement of search algorithms
   - Data-driven optimization
   - User satisfaction tracking
   - Identification of knowledge gaps
   - Performance comparison between implementations

## 🔄 Automated Knowledge Base Maintenance

VANA includes automated knowledge base maintenance through GitHub Actions:

1. **Implementation**:
   - GitHub Actions workflow for automatic updates
   - Document processing pipeline for new content
   - Verification scripts for system health
   - Notification system for failures

2. **Workflow**:
   - Triggered on document changes in `docs/` and `knowledge/` directories
   - Runs on a weekly schedule for regular maintenance
   - Can be manually triggered through workflow dispatch
   - Processes changed documents and updates the knowledge base
   - Verifies system health after updates
   - Generates quality reports

3. **Components**:
   - `.github/workflows/knowledge-base-update.yml` - GitHub Actions workflow
   - `scripts/expand_knowledge_base.py` - Document processing script
   - `scripts/verify_vector_search.py` - Vector Search verification script
   - `scripts/test_mcp_connection.py` - MCP Knowledge Graph verification script
   - `scripts/evaluate_search_quality.py` - Search quality evaluation script

4. **Features**:
   - Automatic processing of new documents
   - Semantic chunking for better knowledge retrieval
   - Entity extraction for Knowledge Graph
   - Batch updates to Vector Search
   - Comprehensive verification and testing
   - Quality reporting and monitoring
   - Failure notifications

5. **Benefits**:
   - Consistent knowledge base maintenance
   - Reduced manual effort
   - Regular quality checks
   - Early detection of issues
   - Comprehensive documentation of changes
   - Improved knowledge base quality over time

## 🚀 Deployment

Deploy to Vertex AI Agent Engine:

```bash
python adk-setup/deploy.py
```

This will:
1. Package your agent code
2. Upload it to Vertex AI
3. Create an Agent Engine deployment
4. Provide a URL to access your deployed agent

## 💻 Development

### Project Structure

```
vana/
├── .env                      # Environment variables
├── .gitignore                # Git ignore file
├── adk-setup/                # ADK implementation
│   ├── deploy.py             # Deployment script
│   ├── requirements.txt      # Python dependencies
│   ├── scripts/              # Utility scripts
│   └── vana/                 # Core package
│       ├── agents/           # Agent definitions
│       ├── config/           # Configuration
│       └── tools/            # Agent tools
├── docs/                     # Documentation
│   ├── n8n-mcp-server-setup.md  # n8n MCP server setup guide
│   ├── environment-setup.md     # Environment variable setup guide
│   ├── enhanced-memory-operations.md  # Enhanced memory operations guide
│   ├── knowledge-graph-setup.md # Knowledge Graph setup guide
│   ├── document-processing-strategy.md # Document processing strategy
│   ├── enhanced-knowledge-graph.md # Enhanced Knowledge Graph features
│   ├── vana-command-reference.md # VANA command reference
│   ├── web-search-configuration.md # Web search API configuration
│   └── web-search-integration.md # Web search implementation details
├── knowledge_docs/           # Text files for Vector Search
├── mcp-servers/              # MCP server implementations
│   └── n8n-mcp/              # n8n MCP server
│       ├── build/            # Compiled server code
│       ├── src/              # Source code
│       ├── .env              # Environment variables
│       └── start-mcp-server.sh  # Script to start the MCP server
├── n8n-local/                # Local n8n installation
├── tools/                    # Shared tools
│   ├── search_knowledge_tool.py  # Vector Search tool
│   ├── document_processing/  # Document processing tools
│   │   ├── document_processor.py # Document processor
│   │   └── semantic_chunker.py # Semantic chunker
│   ├── knowledge_graph/      # Knowledge Graph tools
│   │   ├── entity_extractor.py # Entity extractor
│   │   └── knowledge_graph_manager.py # Knowledge Graph manager
│   └── web_search.py         # Web search tool
├── tests/                    # Test scripts
│   ├── test_data/            # Test data
│   ├── test_document_processor.py # Document processor test
│   ├── test_entity_extractor.py # Entity extractor test
│   ├── test_knowledge_graph_manager.py # Knowledge Graph manager test
│   ├── test_semantic_chunking.py # Semantic chunker test
│   ├── test_web_search.py    # Web search test
│   └── evaluate_retrieval.py # Retrieval evaluation framework
├── setup_vana.py             # Main setup script
├── verify_apis.py            # Verify API enablement
├── check_permissions.py      # Check service account permissions
├── setup_vector_search.py    # Vector Search setup
├── populate_vector_search.py # Populate Vector Search with knowledge
├── test_vector_search.py     # Test Vector Search integration
├── launch_vana_with_mcp.sh   # Script to launch VANA with MCP server
├── scripts/                  # Utility scripts
│   ├── import_claude_history.py  # Import Claude chat history to Knowledge Graph
│   └── test_mcp_connection.py    # Test MCP Knowledge Graph connection
├── augment-config.json       # Augment configuration for Knowledge Graph
├── checklist.md              # Project checklist
├── next-steps.md             # Detailed setup guide
├── project_handoff.md        # Comprehensive project status for handoff
└── README.md                 # This file
```

### Adding New Agents

To add a new agent:

1. Create a new agent definition in `adk-setup/vana/agents/`
2. Add any specialized tools in `adk-setup/vana/tools/`
3. Update the agent hierarchy in `adk-setup/vana/agents/team.py`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 📚 Additional Resources

- [Google ADK Documentation](https://github.com/google/adk-docs)
- [Vertex AI Vector Search](https://cloud.google.com/vertex-ai/docs/vector-search/overview)
- [Gemini API Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)

---

## 🛠️ Troubleshooting & Integration Notes

- **Vertex AI Vector Search Integration (April 2025):**
  - The `google-cloud-aiplatform` library must be pinned to version `1.38.0` for compatibility with the current codebase.
  - All code interacting with Vector Search endpoints must use the endpoint resource name string (not an object) and the correct deployed index ID.
  - Embedding values must be explicitly converted to float to prevent the "must be real number, not str" error:
    ```python
    # Explicitly convert embedding values to float
    embedding_values = [float(value) for value in embedding.values]
    ```
  - Example usage:
    ```python
    endpoint_resource_name = "projects/960076421399/locations/us-central1/indexEndpoints/5085685481161621504"
    deployed_index_id = "vanasharedindex"
    endpoint = aiplatform.MatchingEngineIndexEndpoint(index_endpoint_name=endpoint_resource_name)

    # Ensure embedding is a list of floats
    if not all(isinstance(value, float) for value in embedding):
        embedding = [float(value) for value in embedding]

    results = endpoint.find_neighbors(
        deployed_index_id=deployed_index_id,
        queries=[embedding],
        num_neighbors=5
    )
    ```
  - See `test_vector_search.py`, `test_vector_search_fix.py`, and `adk-setup/vana/tools/rag_tools.py` for working reference implementations.
  - If you see errors like `'str' object has no attribute 'resource_name'` or `'MatchingEngineIndexEndpoint' object has no attribute '_public_match_client'`, check your library version and endpoint usage.
  - If you see errors like `must be real number, not str`, ensure all embedding values are explicitly converted to float.

## 📚 Documentation

For detailed documentation on specific aspects of the VANA project, please refer to the following guides:

### Core Documentation
- [Project Status](docs/project-status.md) - Current status and recent updates
- [Vector Search Fixes](docs/vector-search-fixes.md) - Details on the Vector Search integration fixes
- [VANA Architecture Guide](docs/vana-architecture-guide.md) - Comprehensive architecture overview
- [Environment Setup Guide](docs/environment-setup.md) - How to set up environment variables and manage credentials
- [Launch Configuration](docs/launch-configuration.md) - How to configure and launch the VANA environment

### Knowledge Management
- [Vertex AI Transition](docs/vertex-ai-transition.md) - Guide to transitioning from Ragie.ai to Vertex AI Vector Search
- [Knowledge Graph Integration](docs/knowledge-graph-integration.md) - How to set up and use the MCP Knowledge Graph
- [Enhanced Knowledge Graph](docs/enhanced-knowledge-graph.md) - Advanced entity extraction and relationship inference
- [Document Processing Strategy](docs/document-processing-strategy.md) - Comprehensive document processing pipeline

### Search Capabilities
- [Web Search Configuration](docs/web-search-configuration.md) - How to set up Google Custom Search API
- [Web Search Integration](docs/web-search-integration.md) - Implementation details for web search
- [Optimized Search Guide](docs/optimized-search-guide.md) - Guide to the optimized hybrid search implementation
- [Enhanced Knowledge Evaluation](docs/enhanced-knowledge-evaluation.md) - Framework for evaluating knowledge base quality

### Memory and MCP
- [Persistent Memory Implementation](docs/persistent-memory-implementation.md) - Delta-based updates for efficient memory synchronization
- [n8n MCP Server Setup](docs/n8n-mcp-server-setup.md) - How to set up and configure the n8n MCP server
- [Enhanced Memory Operations](docs/enhanced-memory-operations.md) - Advanced memory capabilities
- [VANA Command Reference](docs/vana-command-reference.md) - Complete reference for all VANA commands and tools

### Testing Framework
- [Testing Framework Guide](scripts/README-TESTING.md) - Comprehensive guide to the testing framework
- [Autonomous Testing](docs/autonomous-testing.md) - Guide to using Juno as an autonomous tester

Developed with ❤️ using Google's Agent Development Kit
