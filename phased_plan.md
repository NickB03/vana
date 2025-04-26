# Phased Execution Plan for VANA

This file outlines the staged execution progress for Vana with clear phasing, risks, and integration points.
```\n
1. Phase 1: Deploy Single Agent with RAG tool
2. Phase 2: Integrate CI/Knowledge Sync and vector index cicd tokens
3. Phase 3: Modularize and Rout Multi-Agents
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
