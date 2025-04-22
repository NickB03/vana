# VANA ADK Project Plan: Multi-Agent System Using Agent Development Kit

**Project ID**: analystai-454200  
**Document Type**: Technical Project Plan
**Framework**: Google ADK (Agent Development Kit)

## Executive Summary

This project plan outlines the implementation of VANA using Google's Agent Development Kit (ADK) with a code-first approach. ADK allows for simpler agent definition, native multi-agent support, and faster development compared to the agent-starter-pack approach.

## Phase 1: Environment Setup (1-2 days)

### Tasks:
1. **Set Up ADK Development Environment**
   ```bash
   # Create project directory
   mkdir vana-adk && cd vana-adk
   python -m venv .venv
   source .venv/bin/activate  # For Unix/Mac
   
   # Install Google ADK
   pip install google-adk
   ```

2. **Configure Google Cloud Project**
   ```bash
   # Set project and authenticate
   gcloud config set project analystai-454200
   gcloud auth application-default login
   gcloud auth application-default set-quota-project analystai-454200
   
   # Enable required APIs
   gcloud services enable aiplatform.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```

3. **Create Project Structure**
   ```
   vana-adk/
   ├── .env
   ├── requirements.txt
   ├── vana/
   │   ├── __init__.py
   │   ├── agents/
   │   │   ├── __init__.py
   │   │   ├── team.py
   │   │   ├── ben.py
   │   │   ├── rhea.py
   │   │   ├── max.py
   │   │   ├── sage.py
   │   │   ├── kai.py
   │   │   └── juno.py
   │   ├── tools/
   │   │   ├── __init__.py
   │   │   ├── agent_tools.py
   │   │   └── rag_tools.py
   │   └── config/
   │       ├── __init__.py
   │       └── settings.py
   ```

### Deliverables:
- Working ADK environment
- Configured GCP project
- Basic project structure

## Phase 2: Agent Development (3-4 days)

### Tasks:
1. **Create Base Agent Configuration**
   ```python
   # vana/config/settings.py
   MODEL = "gemini-2.0-flash"
   GOOGLE_CLOUD_PROJECT = "analystai-454200"
   GOOGLE_CLOUD_LOCATION = "us-central1"
   ```

2. **Implement Agent Team**
   - Create Ben (coordinator) with orchestration logic
   - Create specialist agents (Rhea, Max, Sage, Kai, Juno)
   - Define agent hierarchy using `sub_agents` parameter
   - Implement agent-specific tools

3. **Set Up Local Testing**
   ```bash
   # Test using ADK developer UI
   adk web
   ```

### Deliverables:
- Complete agent codebase
- Functioning agent hierarchy
- Working developer UI for testing

## Phase 3: Vector Search Integration (2-3 days)

### Tasks:
1. **Create RAG Tools**
   ```python
   # vana/tools/rag_tools.py
   from google.adk.toolkit import tool
   from google.cloud import aiplatform
   
   @tool
   def search_knowledge(query: str) -> str:
       """Search shared knowledge base."""
       # Implementation for vector search
       pass
   ```

2. **Configure Vector Search Index**
   ```python
   # Initialize Vertex AI Vector Search
   index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
       index_endpoint_name="vana-shared-index"
   )
   ```

3. **Integrate RAG with Agents**
   - Add search_knowledge tool to relevant agents
   - Ensure all agents can access the shared vector store

### Deliverables:
- Functioning RAG tools
- Configured vector search index
- Agents with RAG capabilities

## Phase 4: Deployment to Agent Engine (1 day)

### Tasks:
1. **Prepare Deployment Script**
   ```python
   # deploy.py
   from vertexai import agent_engines
   from vana.agents.team import root_agent
   
   remote_app = agent_engines.create(
       agent_engine=root_agent,
       requirements=[
           "google-cloud-aiplatform[adk,agent_engines]",
       ]
   )
   ```

2. **Deploy to Vertex AI Agent Engine**
   ```bash
   python deploy.py
   ```

3. **Configure Access and Permissions**
   - Set up managed sessions
   - Configure IAM roles

### Deliverables:
- Deployed agent system on Vertex AI
- Configured access and security
- Working production environment

## Phase 5: Testing and Optimization (2 days)

### Tasks:
1. **Create Evaluation Dataset**
   ```json
   {
     "samples": [
       {
         "sample_id": "planning_1",
         "input": "Design an agent architecture for data processing",
         "expected_output": "Architecture with data pipeline and agents"
       }
     ]
   }
   ```

2. **Run Agent Evaluation**
   ```bash
   adk eval vana evaluation_set.json
   ```

3. **Optimize Performance**
   - Analyze evaluation results
   - Fine-tune agent instructions
   - Optimize RAG queries

### Deliverables:
- Evaluation reports
- Performance metrics
- Optimized agent system

## Timeline Summary
- Week 1: Environment setup, agent development
- Week 2: Vector search integration, deployment, testing

## Resource Requirements
- 1 Developer (you with AI assistance)
- GCP resources within $1,000 credit
- Local development machine with Python 3.9+

## Key Advantages of ADK Approach
1. **Faster Development**: Direct Python coding vs template configuration
2. **Built-in UI**: Immediate testing with `adk web`
3. **Native Multi-Agent**: Simple agent hierarchy with `sub_agents`
4. **Code-First**: More control over agent behavior
5. **Simplified Deployment**: One-command deployment to Agent Engine

## Success Metrics
- All six agents successfully deployed
- Shared vector search working across agents
- Response time < 2 seconds
- Successful agent delegation in test scenarios

## Phase 6: Automated GitHub Knowledge Sync (1-2 days)

### Tasks:
1. **Set Up GitHub Trigger**
   - Configure a GitHub Action or webhook to trigger on push/merge to main.
2. **Sync Repo Content**
   - Pull the latest codebase or changed files to a staging area.
3. **Preprocess and Chunk Files**
   - Identify relevant files (e.g., `.py`, `.md`, `.json`), chunk as needed for embedding.
4. **Generate Embeddings**
   - Use the embedding pipeline to create vector representations for new/changed files.
5. **Update Vector Search Index**
   - Upload new embeddings to GCS and update the Vertex AI Vector Search index.
6. **Test End-to-End**
   - Make a change in the repo, trigger the flow, and verify new code is queryable by agents.

### Deliverables:
- Automated pipeline for syncing GitHub repo knowledge to the vector index
- Documentation of the flow in architecture and README
- Checklist items for operational steps

### Rationale:
- Ensures agents always have up-to-date code knowledge
- Enables continuous improvement and rapid iteration
- Reduces manual intervention

---

## Next Steps
1. Create `.env` file with GCP credentials
2. Initialize ADK environment
3. Begin implementing agent team starting with Ben
4. Implement and test the Automated GitHub Knowledge Sync pipeline
