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
- [x] Supabase schema committed: `supabase_schema/agent_action_log.sql`
- [x] Test row injected for schema validation
- [x] View `view_agent_activity_recent` committed
- [ ] Integrate pgvector for memory (initial version)
- [ ] Connect to Korvus-compatible embedding workflow
- [x] RAG recall committed: `korvus_config/searcher.py`
- [x] Run agent with memory injection: `agent_bridge.py`
