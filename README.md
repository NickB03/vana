# VANA - Multi-Agent System Using Google ADK

![VANA Logo](https://img.shields.io/badge/VANA-Agent%20Development%20Kit-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.9%2B-blue)
![Status](https://img.shields.io/badge/status-development-orange)

VANA is a sophisticated multi-agent system built using Google's Agent Development Kit (ADK). It implements a hierarchical agent structure with specialized AI agents led by a coordinator agent, providing a powerful framework for complex AI tasks.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Agent Team](#agent-team)
- [Vector Search Integration](#vector-search-integration)
- [Deployment](#deployment)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## 🔍 Overview

VANA (Versatile Agent Network Architecture) is a code-first implementation of a multi-agent system using Google's Agent Development Kit. The system features a hierarchical agent structure with Ben as the coordinator and specialist agents for specific tasks, all sharing knowledge through Vector Search.

This project demonstrates how to build, configure, and deploy a team of specialized AI agents that can collaborate to solve complex problems, with each agent having specific responsibilities and capabilities.

## ✨ Features

- **Hierarchical Agent Structure**: 6 specialized AI agents led by Ben (Project Lead)
- **Shared Knowledge Base**: Vector storage via Vertex AI Vector Search
- **Native Multi-Agent Support**: Built-in delegation through ADK
- **Development UI**: Built-in developer UI for testing
- **Cloud Deployment**: Seamless deployment to Vertex AI Agent Engine

## 🏗️ Architecture

VANA follows a hierarchical architecture with a coordinator agent (Ben) delegating tasks to specialist agents:

```
                    [Ben - Coordinator]
                    /        |        \
         ┌─────────┐   ┌─────────┐   ┌─────────┐
         │  Rhea   │   │   Max   │   │  Sage   │
         │(Meta-Arch)│   │(Interface)│   │(Platform)│
         └─────────┘   └─────────┘   └─────────┘
         ┌─────────┐   ┌─────────┐
         │   Kai   │   │  Juno   │
         │(Edge Cases)│   │(Story)│
         └─────────┘   └─────────┘
```

All agents share access to a common Vector Search index for knowledge retrieval, enabling consistent information access across the agent team.

For detailed architecture information, see [vana-adk-architecture.md](vana-adk-architecture.md).

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
   ```

## ⚙️ Configuration

1. Create a `.env` file based on the following template:
   ```
   # Google Cloud Project Details
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_STORAGE_BUCKET=your-storage-bucket
   GOOGLE_APPLICATION_CREDENTIALS=./secrets/your-credentials.json

   # ADK Configuration
   GOOGLE_GENAI_USE_VERTEXAI=True
   MODEL=gemini-2.0-flash
   VECTOR_SEARCH_INDEX_NAME=vana-shared-index
   VECTOR_SEARCH_DIMENSIONS=768
   ```

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

- **Ben (Coordinator)**: Project Lead & DevOps Strategist
- **Rhea**: Meta-Architect of Agent Intelligence
- **Max**: Interaction Engineer
- **Sage**: Platform Automator
- **Kai**: Edge Case Hunter
- **Juno**: Story Engineer

Each agent has specific tools and capabilities designed for their role.

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
   - The Vector Search index finds semantically similar documents
   - Results are returned with metadata including source and content

4. Monitoring and maintenance:
   - The `check_operation.py` script monitors long-running operations
   - The `check_deployment.py` script verifies index deployment status
   - The `test_vector_search.py` script tests search functionality

5. Current status:
   - Vector Search index has been created and configured
   - Knowledge documents have been embedded and uploaded
   - Index update operation has completed successfully
   - Query functionality has been fixed based on GCP engineer recommendations
   - The system is now fully functional

6. The system requires a service account with Vertex AI Admin permissions

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
├── knowledge_docs/           # Text files for Vector Search
├── tools/                    # Shared tools
│   └── search_knowledge_tool.py  # Vector Search tool
├── setup_vana.py             # Main setup script
├── verify_apis.py            # Verify API enablement
├── check_permissions.py      # Check service account permissions
├── setup_vector_search.py    # Vector Search setup
├── populate_vector_search.py # Populate Vector Search with knowledge
├── test_vector_search.py     # Test Vector Search integration
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
  - Example usage:
    ```python
    endpoint_resource_name = "projects/960076421399/locations/us-central1/indexEndpoints/5085685481161621504"
    deployed_index_id = "vanasharedindex"
    endpoint = aiplatform.MatchingEngineIndexEndpoint(index_endpoint_name=endpoint_resource_name)
    results = endpoint.find_neighbors(
        deployed_index_id=deployed_index_id,
        queries=[embedding],
        num_neighbors=5
    )
    ```
  - See `test_vector_search.py` and `adk-setup/vana/tools/rag_tools.py` for working reference implementations.
  - If you see errors like `'str' object has no attribute 'resource_name'` or `'MatchingEngineIndexEndpoint' object has no attribute '_public_match_client'`, check your library version and endpoint usage.

Developed with ❤️ using Google's Agent Development Kit
