# Vana Project Checklist — Lovable + Supabase + Korvus RAG

## ✅ Completed

### Scaffold + Runtime
- [x] Initialize monorepo structure
- [x] Add BenAgent + agent team scaffolds (Rhea, Max, Sage, Juno, Kail)
- [x] Add `korvus_client.py` for vector memory ops
- [x] Add `n8n_logger.py` for agent logging

### n8n Integration
- [x] Scaffold `trigger_on_agent_prompt.md`
- [x] Scaffold `log_agent_action.md`
- [x] Commit `trigger_on_agent_prompt.json` for n8n import
- [x] Commit `log_agent_action.json` for n8n import

### CHANGELOG + History
- [x] Create `CHANGELOG.md` and keep synced with commits

## ゠ In Progress

### Supabase Integration
- [x] Here: Supabase schema committed: `supabase_schema/agent_action_log.sql`
- [ ] Integrate pgvector for memory (initial version)
- [ ] Connect to Korvus-compatible embedding workflow

### Lovable UI Prep
- [ ] Define UI flows for:
  - Upload doc
  - Chat with agent
  - Admin config panel
- [ ] Scaffold prompt group for agents (CLEAR)
- [ ] Include chunking options in prompt (deferred toggle)

### Korvus RAG Config
- [ ] Optional: Define `korvus_config.yaml` or ENV loader
- [ ] Tag/metadata filtering in query

## 🚀 Launch Prep

- [ ] Build minimal frontend with Lovable
- [ ] Validate file → embed → context → chat loop
- [ ] Capture + summarize feedback loop from agents
- [ ] Mark admin endpoints as gated/not live
- [ ] Prepare 30s demo or screen loop