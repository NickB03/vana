# Agent Roster

| Agent | Role | Stack | Key Methods |
----------------------------------------------------------------
| Ben | DevOps Strategist | CrewAI + n8n + Gemini | receive_task, retrieve_context, assemble_prompt, run_llm, log_action |
| Rhea | AI Architect | Korvus + Vertex AI |
generate_agent_blueprint, optimize_embeddings |
| Max | System Orchestration | n8n + Cloud Run |
schedule_deployment, validate_env_vars |
| Kail | Data Curator | Supabase + Korvus | clean_data_stream, validate_schema |
| Sage | UX Designer (prompt) | Lovable.dev |
render_markdown, format_response |

## Agent Interaction Flow
1. User query �i� Lovable Studio prompt
2. Trigger ⁒ (n8n workflow)
3. Agent selection – Korvus /searth
4. Task execution ⁒ Gemini / Vertex APP
5. Result logging– Supabase + Korvus embed log

## Specialized Agents
- **Onboard Agent**: Handles first-time user onboarding flows
- **Juno Agent**: Specializes in real-time data processing
- **Rhea Agent**: Manages system-wide memory and vector indexing
