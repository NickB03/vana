# n8n workflow – agent prompt
---

Type: workflow
name: trigger_on_agent_prompt
description: "Embed user prompt to vector; retrieves top k- context from agent logs or docs"
trigger_type: client
condition: lovable form submission
steps:
  - Node: Get agent prompt
  - Tool: HTTP request to Korvus /search
  - State Route: Return top k context chunks
  - FORMAT: Inject into gemini prompt

inputs:
  user_id: UUID
  agent_id: ben | rhea | sage
  prompt: User text input

## Korvus Request
- URL: https://korvus.api/v1/search
- Method: POST
- Headers: Auth: Mock JWT
output:
  - List of top k retrieved context chanks for the agent.
