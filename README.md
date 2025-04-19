
# 🧠 | Project Vana (Virtual Autonomous Neural Agents)

Project Vana is a fully functional, cloud-ready AI agent team designed to support and accelerate software development and creative projects.
This is a highly synthetic product platform + portfolio package that can scale interiors.

Current features:

- CrewAI-based agents with defined personas, goals, and background.
- n8n for orchestration and external API integrations.
- Supabase as backend (auth, DB, storage).
- Lovable.dev for generating the real frontend UI -- no mocks, real logic.
- Extensible RAG memory (Korvus + Vertex AI on GCP).

## Supplement System Details

This project includes:
- Context-aware memory and response encoding
- Repromptable run and precision repay
```\prompt
//run
/replay/:run_id / / get json of run
/run / / post rerun request
```

- Lovable features: `SageCard` + `AdminPanel` + `PromptDebug`.
- Logged agent actions via Supabase
- Injects memory context via Korvus (Supabase PGVector)
- Responses generated via Vertex AI 
- schema sync = `agent_action_log` + view_agent_activity_recent
