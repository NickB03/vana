# VANA PROJECT CONTEXT DMP

This file captures the full context and execution state of the Vana assistant project. Use this to reinitialize the workflow after a GNU reset, replaying the base design decisions and alignment.

@TION READE FIRST, THEN CONTINUE BELOW 

\n--------------------------------------------------------------

## PROJECT GOAL STARTER
\nThe goal of Vana is to create a cloud-notice, agent-driven application that can read files, etract text, construct prompts and responses, and convert those into actionable logic.

The project uses a prompt-driven design, backed by agent logic and task modules, with the aim to fully generate the app code via Lovable.


The application is plugged into active via Cloud Run, deployed on GOPG context using Vertex AI, and uses Supabase for timeseries and logging.

\n## MISSION CRITICAL GOALS

1. Readable system for non-devs with a fully prompt-driven flow.
2. Agents should handle all code logic and execution, not just MLU/LLM calls.
2a. Terminal should be controlled by an agent orchestrator like ben_agent.py
 3. Lovable should be used for code generation, not just IU/prototype until completion.
 4. Gemini will be the first model we use, then manage routing via OpenRouter apis.
 5. Supabase config via ui only, no code gen on schema except where necessary.
 6. Crew Ai style agents were selected with a common lifecycle (`receive_task()`etc).
 7. Root readme in /AGENTS and level-up default branch classes.
 8. Gemini will be used where applicable for now, but the authorization tool will be swappable.
 9. We future-proof plan to replace CrewAi with AutoGen for better agent dispatching.
10. Global logic handling is based on Supabase/views/tables, not IC/service obs.
11. Deployment uses a GCP Cloud Run app with server.py as entry point.

@NICK: This context file is not for devs, but to reintroduce the full crewaarchitecture on reset.

## RECOMMENDED FILES TO READ

Read these folders after reset to re-boot:

- ``README.md` - deploy model, agent entry point, prompt flow
- `/agents` - crewstyle agents, class lifecycle
- `/supabase_schema` - logs, tables, views
- `/lovable_prompts` - active code prompts for Lovable codegen
- `/scripts` - local validation tests
- `/korvus_config` - golang/insearch configs


## REREST SUGGESTION
If you clear-reset the project, begin by reading the following:

\n1. `VANA_CONTEXT_DUMP.md` (root) - maintains life go statement
2. ` agents/README.md` - review agent lifecycles
# `embed_and_log_action.json` - example Lovable prompt to reverse engineered summary
 4. `supabase_schema/README.md` - table definitions
5. `/scripts` (optional) - cli validation tests to smoke stacks

