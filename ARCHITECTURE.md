# VANA Architecture Plan

**Project ID**: analystai-454200  
**Document Type**: Technical Architecture Reference

## 1. System Overview

VANA is a multi-agent AI system deployed on Google Cloud Platform that executes agent-type tasks, collects data, and generates responses. The system leverages a shared vector database to store embeddings and provide context to all agents, enabling consistent knowledge retrieval across the agent team.

## 2. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        Google Cloud Platform                       │
│                                                                   │
│  ┌───────────────┐         ┌───────────────────────────┐          │
│  │ Client Access │         │     Vertex AI Agent       │          │
│  │   Layer       │◄────────┤          Engine           │          │
│  └───────┬───────┘         └─────────────┬─────────────┘          │
│          │                               │                        │
│          ▼                               ▼                        │
│  ┌───────────────┐         ┌───────────────────────────┐          │
│  │   API Layer   │         │      Agent Framework       │          │
│  │  (Cloud Run)  │◄────────┤   (agent-starter-pack)    │          │
│  └───────┬───────┘         └─────────────┬─────────────┘          │
│          │                               │                        │
│          │                               │                        │
│          │                               ▼                        │
│          │                 ┌───────────────────────────┐          │
│          └────────────────►│       Agent Team          │          │
│                            │                           │          │
│                            │  ┌─────────┐ ┌─────────┐  │          │
│                            │  │   Ben   │ │  Rhea   │  │          │
│                            │  └─────────┘ └─────────┘  │          │
│                            │  ┌─────────┐ ┌─────────┐  │          │
│                            │  │   Max   │ │   Sage  │  │          │
│                            │  └─────────┘ └─────────┘  │          │
│                            │  ┌─────────┐ ┌─────────┐  │          │
│                            │  │   Kai   │ │   Juno  │  │          │
│                            │  └─────────┘ └─────────┘  │          │
│                            └──────────┬────────────────┘          │
│                                       │                           │
│                                       ▼                           │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Shared Knowledge Layer                   │   │
│  │                                                            │   │
│  │  ┌────────────────┐  ┌────────────────┐ ┌──────────────┐   │   │
│  │  │ Vertex AI      │  │ Cloud Storage  │ │ Vertex AI    │   │   │
│  │  │ Vector Search  │  │ (Source Docs)  │ │ Embeddings   │   │   │
│  │  └────────────────┘  └────────────────┘ └──────────────┘   │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## 3. Component Details

### 3.1. Client Access Layer

- **Cloud Run Frontend**: Serves as the entry point for user requests
- **API Gateway**: Manages API access, authentication, and routing
- **Load Balancing**: Distributes traffic across service instances

### 3.2. Agent Engine Layer

- **Vertex AI Agent Engine**: Managed runtime for agent deployment and orchestration
- **Agent Management**: Handles agent lifecycle, scaling, and monitoring
- **Session Management**: Maintains conversation state and context

### 3.3. Agent Framework

- **Agent Starter Pack**: Google Cloud's framework for building and deploying AI agents
- **Agentic RAG Template**: Specializes in retrieval-augmented generation (RAG)
- **Agent Development Kit (ADK)**: Core library for agent definition and behavior

### 3.4. Agent Team

Each specialized agent has a focused role:

- **Ben (Project Lead)**: Orchestrates other agents, manages task priorities
- **Rhea (Meta-Architect)**: Designs adaptive workflows and agent collaboration patterns
- **Max (Interaction Engineer)**: Creates interfaces that visualize decision-making
- **Sage (Platform Automator)**: Manages infrastructure and scalability
- **Kai (Edge Case Hunter)**: Identifies potential issues and runs simulations
- **Juno (Story Engineer)**: Handles documentation and knowledge organization

### 3.5. Shared Knowledge Layer

- **Vertex AI Vector Search**: Stores and retrieves vector embeddings
- **Cloud Storage**: Maintains source documents and raw data
- **Vertex AI Embeddings**: Generates embeddings from content

## 4. Data Flow

### 4.1. Knowledge Ingestion Flow

1. Documents are uploaded to Cloud Storage
2. Documents are processed and chunked
3. Chunks are embedded using Vertex AI Embeddings API
4. Embeddings are indexed in Vertex AI Vector Search
5. Metadata is stored for context retrieval

### 4.2. Query Flow

1. User submits query through API
2. Primary agent (Ben) receives query
3. Ben routes query to appropriate specialist agent
4. Specialist agent generates embedding for query
5. Agent retrieves relevant context from shared Vector Search
6. Agent generates response using context and Gemini model
7. Response is returned to user

## 5. Technology Stack

### 5.1. Core Services

- **Gemini Model**: Primary LLM for agent reasoning and generation
- **Vertex AI Agent Engine**: Hosting and management of deployed agents
- **Vertex AI Vector Search**: Vector database for embeddings
- **Cloud Storage**: Document and artifact storage
- **Cloud Run**: API and service hosting

### 5.2. Development Tools

- **Agent Starter Pack**: CLI for agent project scaffolding and deployment
- **Terraform**: Infrastructure as Code for GCP resource management
- **Cloud Build**: CI/CD pipeline for automated deployment
- **Cloud Logging**: Centralized logging for all components
- **Cloud Monitoring**: System performance and health monitoring

## 6. Deployment Architecture

### 6.1. Terraform Configuration

The deployment is managed through Terraform with the following component organization:

```
terraform/
├── main.tf              # Main configuration file
├── variables.tf         # Variable definitions
├── outputs.tf           # Output definitions
├── modules/
│   ├── agent-engine/    # Agent deployment configuration
│   ├── vector-search/   # Vector search configuration
│   └── storage/         # Storage configuration
└── environments/
    ├── dev/             # Development environment
    ├── staging/         # Staging environment
    └── prod/            # Production environment
```

### 6.2. Shared Vector Storage Configuration

```hcl
# Example Terraform snippet for shared vector storage
resource "google_vertex_ai_index" "vana_shared_index" {
  name          = "vana-shared-vector-index"
  project       = "analystai-454200"
  region        = "us-central1"
  display_name  = "VANA Shared Knowledge Index"
  description   = "Shared vector index for all VANA agents"
  
  metadata {
    contents_delta_uri = "gs://vana-vector-data"
    config {
      dimensions         = 768
      approximate_neighbors_count = 150
      distance_measure_type = "DOT_PRODUCT_DISTANCE"
      algorithm_config {
        tree_ah_config {
          leaf_node_embedding_count = 500
          leaf_nodes_to_search_percent = 10
        }
      }
    }
  }
}
```

### 6.3. Agent Deployment Configuration

```hcl
# Example Terraform snippet for multi-agent deployment
resource "google_vertex_ai_agent" "ben_agent" {
  name        = "ben-agent"
  project     = "analystai-454200"
  region      = "us-central1"
  display_name = "Ben - Project Lead"
  
  agent_resources {
    vector_search_index = google_vertex_ai_index.vana_shared_index.id
  }
  
  # Agent-specific configuration
}

# Similar configurations for other agents
resource "google_vertex_ai_agent" "rhea_agent" {
  # Configuration for Rhea
}
```

## 7. Security Architecture

### 7.1. Authentication & Authorization

- **IAM Roles**: Fine-grained access control for all GCP resources
- **Service Accounts**: Dedicated service accounts for each component
- **API Keys**: Managed API keys for external integrations

### 7.2. Data Security

- **At Rest**: All data encrypted in Cloud Storage and Vector Search
- **In Transit**: All communication secured with TLS
- **Access Control**: Least privilege access for all components

### 7.3. Network Security

- **VPC**: Private network for all components
- **Firewall Rules**: Restricted access between components
- **Private Google Access**: For accessing Google APIs without public IP

## 8. Monitoring & Observability

### 8.1. Logging

- **Cloud Logging**: Centralized logging for all components
- **Log-based Metrics**: Custom metrics derived from logs
- **Error Tracking**: Automated error detection and alerting

### 8.2. Monitoring

- **Cloud Monitoring**: System performance and health monitoring
- **Custom Dashboards**: Visual representation of key metrics
- **Alerting**: Automated alerts for critical issues

### 8.3. Performance Metrics

- **Query Latency**: Response time for vector queries
- **Agent Response Time**: End-to-end response generation time
- **Cost Metrics**: Usage-based cost tracking

## 9. Scaling Approach

### 9.1. Vertical Scaling

- **Agent Runtime**: Configurable memory and CPU allocation
- **Vector Search**: Adjustable machine types for index serving

### 9.2. Horizontal Scaling

- **Multiple Agents**: Parallel processing across multiple agents
- **Index Partitioning**: Vector index sharding for increased throughput
- **Replica Count**: Multiple replicas for high availability

## 10. Implementation Plan Integration

This architecture aligns with the project plan phases:

- **Phase 1**: Environment setup and basic infrastructure
- **Phase 2**: Shared vector storage implementation
- **Phase 3**: Agent team development
- **Phase 4**: Shared vector integration
- **Phase 5-7**: Testing, deployment, and optimization

## Appendices

### Appendix A: GCP Resource List

| Resource Type | Purpose | Configuration Notes |
|---------------|---------|---------------------|
| Vertex AI Agent Engine | Agent deployment | Multi-agent deployment |
| Vertex AI Vector Search | Vector storage | Shared across all agents |
| Cloud Storage | Document storage | Multi-regional bucket |
| Cloud Run | API endpoints | Autoscaling configuration |
| Cloud Build | CI/CD pipeline | GitHub integration |
| IAM | Access control | Custom roles for agents |
| Monitoring | System monitoring | Custom dashboards |
| Secret Manager | Credential storage | API keys and secrets |

### Appendix B: Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Google Cloud Platform                     │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     VPC Network                        │  │
│  │                                                       │  │
│  │  ┌─────────────────┐         ┌─────────────────────┐  │  │
│  │  │  Agent Subnet   │         │  Service Subnet     │  │  │
│  │  │                 │         │                     │  │  │
│  │  │  - Agent Engine │         │  - Cloud Run        │  │  │
│  │  │  - Vector Search│         │  - API Gateway      │  │  │
│  │  └─────────────────┘         └─────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌─────────────────┐         ┌─────────────────────┐  │  │
│  │  │  Storage Subnet │         │  Monitoring Subnet  │  │  │
│  │  │                 │         │                     │  │  │
│  │  │  - Cloud Storage│         │  - Log Analytics    │  │  │
│  │  │  - Data Pipeline│         │  - Monitoring       │  │  │
│  │  └─────────────────┘         └─────────────────────┘  │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```