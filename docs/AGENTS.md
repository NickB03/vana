# Agent Roster

| Agent | Role | Tech Stack | Key Methods |
|-------|------|------------|-------------|
| Ben   | DevOps Strategist | CrewAI + n8n | receive_task, retrieve_context, assemble_prompt, run_llm, log_action |
| Rhea  | AI Architect | Korvus + PGVector | generate_agent_blueprint, optimize_embeddings |
| Max   | System Orchestration | n8n + Cloud Run | schedule_deployment, validate_env_vars |
| Kail  | Data Curator | Supabase + Korvus | clean_data_stream, validate_schema |
| Sage  | User Experience Designer | Lovable UI | render_markdown, format_response |

## Agent Interaction Flow
1. User query → Lovable Studio
2. Trigger → n8n workflow
3. Agent selection → Korvus memory search
4. Task execution → Gemini API
5. Result logging → Supabase + Korvus

## Specialized Agents
- **Onboard Agent**: Handles new user onboarding flows
- **Juno Agent**: Specializes in real-time data processing
- **Rhea Agent**: Manages system-wide memory indexing
