# CHANGELOG

## 2025-04-18T
- Added /replay/:run_id endpoint for rerunning agent prompts
- Supabase schema: added replay_ref_id to agent_action_log
- FastAPI: mounted `/replay`/[run_id]`, returns complete run with current memory
- Lovable: added SageCard.csx + lovable_admin_panel.zip
 - Kits user view panel with responses history