# Plan: Automated Knowledge Base Synchronization

This document outlines the step-by-step plan to implement an automated knowledge base synchronization system for the VANA project. This system will use Ollama for local model serving, RAGFlow for data ingestion, and Mage.ai for workflow orchestration.

## Phase 1: Prerequisites

1.  **Install Docker Desktop:** Ensure Docker Desktop is installed and running on the M1/M3 MacBook Air.
2.  **Install Homebrew:** If not already installed, run the following command:
    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ```

## Phase 2: Ollama Setup (Local LLM Server)

1.  **Install Ollama:**
    ```bash
    brew install ollama
    ```
2.  **Start Ollama Service:**
    ```bash
    ollama serve
    ```
    *(Note: This will run in the foreground. It's recommended to run this in a separate, dedicated terminal window.)*

3.  **Pull Required Models:**
    ```bash
    # Pull the recommended generative model
    ollama pull llama3:8b-instruct

    # Pull the recommended embedding model
    ollama pull nomic-embed-text
    ```

## Phase 3: RAGFlow Setup (Data Ingestion Engine)

1.  **Clone the RAGFlow Repository:**
    ```bash
    git clone https://github.com/infiniflow/ragflow.git
    cd ragflow/docker
    ```
2.  **Configure for macOS:** RAGFlow provides a specific Docker Compose file for macOS.
3.  **Launch RAGFlow:**
    ```bash
    docker compose -f docker-compose-macos.yml up -d
    ```
4.  **Configure RAGFlow:**
    *   Open a web browser to `http://localhost:9380`.
    *   In the RAGFlow UI, configure the LLM and embedding models to point to your local Ollama server:
        *   **LLM Base URL:** `http://host.docker.internal:11434`
        *   **LLM Model:** `llama3:8b-instruct`
        *   **Embedding Model Base URL:** `http://host.docker.internal:11434`
        *   **Embedding Model:** `nomic-embed-text`

## Phase 4: Mage.ai Setup (Workflow Orchestrator)

1.  **Create Project Directory:** In a separate terminal, navigate back to the root of the VANA project.
    ```bash
    mkdir vana-mage-pipeline
    cd vana-mage-pipeline
    ```
2.  **Create `docker-compose.yml`:** Create a `docker-compose.yml` file with the following content:
    ```yaml
    version: '3'
    services:
      mage:
        image: mageai/mageai:latest
        container_name: vana-mage-service
        ports:
          - 6789:6789
        volumes:
          - .:/home/src
        restart: always
    ```
3.  **Launch Mage.ai:**
    ```bash
    docker compose up -d
    ```

## Phase 5: Pipeline Creation in Mage

1.  **Access Mage UI:** Open a web browser to `http://localhost:6789`.
2.  **Create a New Pipeline:**
    *   In the Mage UI, create a new "Standard (batch)" pipeline.
    *   Name it `sync_vana_knowledge_base`.
3.  **Verify Container Communication:**
    *   Before creating the pipeline, let's ensure the Mage container can communicate with the RAGFlow and Ollama containers.
    ```bash
    # Shell into the Mage container
    docker exec -it vana-mage-service /bin/bash

    # From inside the Mage container, try to curl Ollama
    curl http://host.docker.internal:11434

    # Then, try to curl RAGFlow
    curl http://host.docker.internal:9380
    ```
    *   If both commands return a successful response, you can proceed. If not, we may need to adjust the Docker networking configuration.

4.  **Create a "Data Loader" Block (Python):**
    *   Create a new "Data Loader" block with the following Python code. This block will be responsible for triggering the RAGFlow sync.
    ```python
    import requests

    @data_loader
    def trigger_ragflow_sync(*args, **kwargs):
        """
        Triggers the RAGFlow synchronization pipeline via its API.
        """
        ragflow_api_url = "http://host.docker.internal:9380/api/v1/sync" # Assuming RAGFlow is accessible from the Mage container
        
        try:
            response = requests.post(ragflow_api_url, json={"source": "all"})
            response.raise_for_status() # Raises an exception for bad status codes (4xx or 5xx)
            
            print("Successfully triggered RAGFlow sync.")
            return {"status": "success", "response": response.json()}
        
        except requests.exceptions.RequestException as e:
            print(f"Error triggering RAGFlow sync: {e}")
            raise
    ```
5.  **Configure Notifications:**
    *   In the Mage UI, configure the pipeline to send a notification on success or failure. This can be a Slack message, email, or other integration that Mage supports.

## Phase 6: Final Integration

1.  **Create the "Smart Sync" Script:** Create a new script `scripts/smart_sync.sh` in the VANA project with the "Resilient Smart Sync" logic we designed, but modify it to trigger the Mage pipeline instead of RAGFlow directly.
    ```bash
    #!/bin/bash
    MAGE_PIPELINE_NAME="sync_vana_knowledge_base"
    MAGE_API_URL="http://localhost:6789/api/pipelines/${MAGE_PIPELINE_NAME}/pipeline_runs"

    # ... (The logic to check .last_sync file remains the same) ...

    # Trigger the Mage pipeline
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$MAGE_API_URL")

    # ... (The logic to check HTTP_STATUS and notify remains the same) ...
    ```
2.  **Update Startup Script:** Add a call to `scripts/smart_sync.sh` at the beginning of your main `launch_all_agents.sh` script.

This plan provides a complete, end-to-end solution for creating a robust, automated knowledge base synchronization system using pre-built, professional-grade open-source tools.
