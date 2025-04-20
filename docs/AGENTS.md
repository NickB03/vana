# Agent Roster

| Agent | Role | Stack | Key Methods |
----------------------------------------------------------------
| Ben    | DevOps Strategist / Action Orchestrator | CrewAI + n8n + Gemini | Orchestrates agent workflows. Key methods: `receive_task`, `log_action` |
| Juno   | Data Capture / Logger                   | Supabase + n8n        | Handles real-time data processing and logging. |
| Kail   | Data / Schema Curator                   | Supabase + Korvus     | Ensures data integrity and schema validation. Key methods: `validate_schema` |
| Max    | Deployment / System Orchestration       | n8n + Cloud Run       | Manages deployment processes and environment validation. Key methods: `schedule_deployment`, `validate_env_vars` |
| Onboard| Onboarding Specialist                   | CrewAI + Gemini       | Manages first-time user interaction flows. |
| Rhea   | Context Retrieval / Memory Manager      | Korvus + Vertex AI    | Retrieves context from vector store (Korvus/Supabase). Key methods: `get_context` |
| Sage   | Response Formatter / Summarizer         | Gemini + Lovable.dev? | Renders and summarizes LLM outputs. Key methods: `reformat`, `render_markdown` |

## Agent Interaction Flow
1. User query �i� Lovable Studio prompt
2. Trigger ⁒ (n8n workflow)
3. Agent selection – Korvus /searth
4. Task execution ⁒ Gemini / Vertex APP
5. Result logging– Supabase + Korvus embed log

## Agent Interaction Flow (Simplified)
1. User query/trigger → n8n workflow initiated.
2. Orchestrator (Ben?) selects appropriate agent(s).
3. Context retrieved via Rhea (using Korvus `/search`).
4. Task executed by relevant agent (using Gemini via Vertex AI).
5. Result formatted/summarized by Sage.
6. Action/result logged via Juno (to Supabase, potentially embedding via Korvus `/embed`).
