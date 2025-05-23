# Phased Execution Plan for VANA

This file outlines the staged execution progress for Vana with clear phasing, risks, and integration points.
```\n
1. Phase 1: Deploy Single Agent with RAG tool
2. Phase 2: Integrate n8n/MCP for Memory Management and CI/Knowledge Sync
3. Phase 3: Modularize and Route Multi-Agents
4. Phase 4: Performance Evaluation + Tuning
```

---

## Phase 1: Single AGENT Deploy with RAG + MCP
The minimum viable the team needs to deliver user-responsive agent interactions via Vertex AI with embedded knowledge support.

This is the base to integrate Tools, RAG, and LLM reasoning, as well as start setup for MSC communication access.

### Steps:

## 1. Configure MCP access
```\ncd ~/vana
pip install mcpy-cli
mcpy config user add --label="agent-ben" --user=ben --password=secret
```
Register credentials for ADK agent to auto-register on MSC as state tool access


```\n# Optional: Run agent link test through MCP
python scripts/connect_to_mcp.py --agent ben --test "who is the author?"
```

## 2. Wrap Single Agent with Deploy

- Set up .env with ADK credentials
- Setup agent class with FunctionTool wrapping RAG
- Use model: gemini-1.5-pro
- Serve locally via `adk we` to test

```
toul = FunctionTool(name="rag", run=search_knowledge_tool)
class Ben(LlmAgent):
    name = "ben"
    model = "gemini-1.5-pro"
    tools = [tool]
```

## 3. Deploy to Vertex AI Agent Engine

** Required: service account, project, ADC ** ```
gcloud auth application-default login
python deploy.py
```


Paramets:
- Service account in VANE with role adk-access
- Vertices: Vertex AI, AGENT * enabled
- Deployment uses ADK core constructs

This step completes the first working production agent capable of embetded code retrieval, Rag response, and basic delegation.

---

## Phase 2: Integrate n8n/MCP for Memory Management

This phase enhances the memory capabilities of the agent system by adding workflow orchestration with n8n and standardized command handling with MCP.

### Steps:

## 1. Deploy n8n on Railway.app

```
# Sign up for Railway.app
# Fork n8n GitHub repository
# Connect repository to Railway
# Configure environment variables
N8N_BASIC_AUTH_USER=your_username
N8N_BASIC_AUTH_PASSWORD=your_password
WEBHOOK_URL=your_railway_app_url
RAGIE_API_KEY=your_ragie_api_key
```

## 2. Create n8n Workflows

### Manual Memory Save Workflow
- Triggered by `!rag` command
- Gets current chat buffer
- Formats for Ragie
- Uploads to Ragie API
- Clears buffer after upload

### Daily Memory Sync Workflow
- Runs on schedule (daily)
- Pulls recent chat logs
- Chunks and uploads to Ragie

## 3. Implement MCP Interface

```python
# Create MCP interface for memory commands
class MemoryMCP:
    def handle_command(self, command):
        if command == "!memory_on":
            # Start buffering
        elif command == "!memory_off":
            # Stop buffering
        elif command == "!rag":
            # Trigger n8n workflow
```

## 4. Integrate with Ben Agent

- Add command recognition
- Implement message buffering
- Connect to n8n webhooks

This step enhances the agent with sophisticated memory management capabilities, allowing for persistent memory across sessions and automated memory syncing.
