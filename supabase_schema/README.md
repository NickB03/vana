# Supabase Schema

This folder contains the definition and management sql scripts for Supabase tables and views used by vana flows.

These schemas support logging, memory, and replicatable vector storage for agents.

Supabase Ingregration is performed via the Supabase UI. Sqlites here should not be executed via Lovable.dev or codegen, but can be referenced for infra by CLI agents.

## Scripts

- `agent_action_log.sql`
  - Primary log table with timestamp, user_id, agent_id, embedding text snapshot and vector field.
  - Used by `embed_and_log_action` to store LLM output with metatadata.
  
- `test_insert_agent_action.sql`
  - Test manual insert statement for return checks. Not used in prod.

- `view_agent_activity_recent.sql`
  - View to quickly fetch last 10 actions by agent id and timestamp.

## Authorization
- Supabase Service Role token used for CLI access 
- RSS applied using Supabase UI tables GIP
- No code generation on schema directly (except test)