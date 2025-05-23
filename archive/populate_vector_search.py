#!/usr/bin/env python3
"""
Populate Vector Search Index with knowledge documents.

This script reads text documents from the knowledge_docs directory,
generates embeddings using Vertex AI, and uploads them to the Vector Search index.
"""

import os
import glob
import uuid
from dotenv import load_dotenv
from google.cloud import aiplatform
import vertexai
from vertexai.language_models import TextEmbeddingModel

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")

def get_document_texts(directory: str):
    """Read text documents from a directory."""
    texts = []
    filenames = []
    
    # Create directory if it doesn't exist
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"Created directory: {directory}")
        print("Please add .txt files to this directory and run the script again.")
        return texts, filenames
    
    # Get all .txt files
    for filename in glob.glob(os.path.join(directory, "*.txt")):
        with open(filename, "r") as f:
            text = f.read()
            texts.append(text)
            filenames.append(os.path.basename(filename))
    
    return texts, filenames

def generate_embeddings(texts):
    """Generate embeddings for a list of texts."""
    # Initialize Vertex AI
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    
    # Use the text-embedding-004 model
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")
    
    print(f"Generating embeddings for {len(texts)} texts...")
    embeddings = model.get_embeddings(texts)
    
    return [embedding.values for embedding in embeddings]

def upload_to_vector_search(texts, filenames, embeddings):
    """Upload texts and embeddings to Vector Search."""
    # Initialize Vertex AI
    aiplatform.init(project=PROJECT_ID, location=LOCATION)
    
    # Get the index
    index_name = f"projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{INDEX_NAME}"
    try:
        index = aiplatform.MatchingEngineIndex(index_name=index_name)
        print(f"Found index: {index.display_name}")
    except Exception as e:
        print(f"Error accessing index: {str(e)}")
        return
    
    # Create datapoints for indexing
    datapoints = []
    for i, (text, filename, embedding) in enumerate(zip(texts, filenames, embeddings)):
        datapoint_id = str(uuid.uuid4())
        
        datapoints.append({
            "id": datapoint_id,
            "embedding": embedding,
            "restricts": [{"namespace": "content", "allow": ["document"]}],
            "numeric_restricts": [],
            "crowding_tag": filename,
            "metadata": {
                "title": filename.replace(".txt", "").replace("_", " ").title(),
                "source": filename,
                "text": text[:1000] + "..." if len(text) > 1000 else text  # Truncate long text in metadata
            }
        })
    
    # Upload datapoints in batches
    batch_size = 100
    for i in range(0, len(datapoints), batch_size):
        batch = datapoints[i:i+batch_size]
        try:
            print(f"Uploading batch {i//batch_size + 1}/{(len(datapoints)-1)//batch_size + 1}...")
            index.upsert_datapoints(datapoints=batch)
        except Exception as e:
            print(f"Error uploading batch: {str(e)}")
    
    print(f"Successfully uploaded {len(datapoints)} documents to Vector Search")

def create_sample_documents(directory: str):
    """Create sample knowledge documents if none exist."""
    if not os.path.exists(directory):
        os.makedirs(directory)
    
    # Check if directory is empty
    if len(glob.glob(os.path.join(directory, "*.txt"))) > 0:
        return False
    
    print("Creating sample knowledge documents...")
    
    # Sample documents
    samples = {
        "adk_development_guide.txt": """# ADK Development Guide

The Agent Development Kit (ADK) is a framework for building, testing, and deploying AI agents. This guide provides an overview of the key concepts and components of the ADK.

## Key Concepts

- **Agent**: A software entity that can perceive its environment, make decisions, and take actions.
- **Tool**: A function that an agent can use to interact with its environment.
- **LLM**: A large language model that powers the agent's reasoning capabilities.
- **Runner**: The execution engine that manages the agent's lifecycle.

## Getting Started

To create a new agent using the ADK:

1. Define your agent's tools
2. Create an agent with those tools
3. Run the agent using the ADK runner

## Testing

The ADK provides a web interface for testing your agents:

```bash
adk web
```

This will launch a web interface at http://localhost:8000 where you can interact with your agents.

## Deployment

To deploy your agent to Vertex AI Agent Engine, you can use the agent_engines module.""",
        
        "agent_architecture.txt": """# VANA Agent Architecture

VANA (Versatile Agent Network Architecture) implements a hierarchical agent structure with specialized AI agents led by a coordinator agent.

## Agent Hierarchy

The hierarchy has Ben as the coordinator at the top, with specialist agents below.

## Agent Roles

- **Ben (Coordinator)**: Project Lead & DevOps Strategist
- **Rhea**: Meta-Architect of Agent Intelligence
- **Max**: Interaction Engineer
- **Sage**: Platform Automator
- **Kai**: Edge Case Hunter
- **Juno**: Story Engineer

## Agent Implementation

Each agent is implemented using the ADK Agent class.

## Agent Communication

Agents communicate through delegation:

1. User query → Ben (Coordinator)
2. Ben analyzes and routes to appropriate specialist
3. Specialist agent processes task using tools
4. Specialist returns results to Ben
5. Ben synthesizes and returns final response""",
        
        "agent_tools_reference.txt": """# VANA Agent Tools Reference

This document provides a reference for the tools available to VANA agents.

## Coordinator Tools

### coordinate_task_tool

Assigns tasks to specialist agents.

### conduct_daily_checkin_tool

Reviews and validates tasks, merges PRs, and updates the roadmap.

## Knowledge Tools

### search_knowledge_tool

Searches the shared knowledge base for relevant information.""",
        
        "vana_project_overview.txt": """# VANA Project Overview

VANA (Versatile Agent Network Architecture) is a multi-agent system built using Google's Agent Development Kit (ADK). The system features a hierarchical agent structure with specialized AI agents led by a coordinator agent, all sharing knowledge through Vector Search.

## Project Goals

1. Demonstrate the capabilities of the ADK for building multi-agent systems
2. Implement a hierarchical agent structure with delegation
3. Integrate Vector Search for knowledge retrieval
4. Provide a framework for building specialized agent teams

## Key Components

1. **Agent Hierarchy**: A team of 6 specialized agents led by a coordinator
2. **Vector Search**: A shared knowledge base for all agents
3. **ADK Integration**: Native support for agent delegation and tool usage

## Implementation Details

The project is implemented using Python and the Google ADK. The agent definitions are in the `adk-setup/vana/agents` directory, and the tools are in the `adk-setup/vana/tools` directory.

The Vector Search index is created and configured using the `setup_vector_search.py` script, and knowledge documents are stored in the `knowledge_docs` directory.

## Getting Started

To get started with VANA:

1. Clone the repository
2. Create and activate a virtual environment
3. Install dependencies
4. Set up Vector Search
5. Start the ADK web interface

See the README.md file for detailed instructions.""",
        
        "vector_search_implementation.txt": """# Vector Search Implementation

This document describes the implementation of Vector Search in the VANA project.

## Overview

Vector Search is used to provide a shared knowledge base for all agents in the VANA system. It allows agents to search for relevant information based on semantic similarity rather than keyword matching.

## Setup

The Vector Search index is created and configured using the `setup_vector_search.py` script.

## Knowledge Documents

Knowledge documents are stored in the `knowledge_docs` directory as text files. These documents are processed and embedded using the `populate_vector_search.py` script.

## Search Implementation

The `search_knowledge_tool` function in `rag_tools.py` is used to search the Vector Search index.

## Embedding Generation

Embeddings are generated using the Vertex AI text-embedding-004 model."""
    }
    
    # Write sample documents to files
    for filename, content in samples.items():
        with open(os.path.join(directory, filename), "w") as f:
            f.write(content)
    
    print(f"Created {len(samples)} sample knowledge documents in {directory}")
    return True

def main():
    """Main function."""
    print("🔍 Populating Vector Search Index...")
    
    # Directory containing knowledge documents
    docs_dir = "knowledge_docs"
    
    # Create sample documents if none exist
    created_samples = create_sample_documents(docs_dir)
    
    # Get document texts
    texts, filenames = get_document_texts(docs_dir)
    
    if not texts:
        print("❌ No documents found in the knowledge_docs directory.")
        return
    
    print(f"Found {len(texts)} documents:")
    for filename in filenames:
        print(f"  - {filename}")
    
    # Generate embeddings
    embeddings = generate_embeddings(texts)
    
    # Upload to Vector Search
    upload_to_vector_search(texts, filenames, embeddings)
    
    print("\n✅ Vector Search index populated successfully!")
    print("\nNext steps:")
    print("1. Test the Vector Search functionality with test_vector_search.py")
    print("2. Start the ADK web interface with 'cd adk-setup && adk web'")
    print("3. Test the agent system with Vector Search integration")

if __name__ == "__main__":
    main()
