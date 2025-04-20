# Vana

Vana is a cloud-state system for applications requiring agent-led prompts, cloud embedding, structured logging, natural language processing, and code generation.

- Target users: Frameworks, Researchers, Management
- Deployment: GCP Cloud Run + Vertex AI + Supabase
- Code: Prompt-driven via Lovable, using agents and scripts to build.


## Components

The system is organized as a generative prompt platform, based on activatable agents using CrewAI patterns.

These reside in module-level folders with direct structure and devdoc-triggers.

| Folder         | Role | Primary Files |
 |----------------|-----------------------------------|
 |  lovable_prompts/   | Lovable prompts [Nick-used only] to instruct the code generator | *.json
 |  config/          | Global config (main agent ids) | globals.py
 |  agents/         | CrewAI-style agent modules (stateful, callable, loggable) | *.py
 |  korvus_config/  | embed/search api wrapper | *.py
 |  supabase_schema/ | SQL tables + views (memory, action logs) | *.sql
 |  scripts/       | local development utilities test * / invocation | *.py, json
Note: Lovable prompts are not part of runtime code; they are nick_only blueprints to instruct the code generator.

## Architecture + Agents

Vana uses `AgentContext` and a CrewAIstyle pattern for agents.

every agent has the lifecycle:

 - receive_task(task)
 - get_context(client)
 - run_llm(prompt)
 - post_process(response)
 - log_action(action, summary)

View `embed_and_log_action.json` as an example Lovable prompt for code generation.

See `/VANA_CONTEXT_DUMP.md` for full system rehydration.

## Supabase Set up
- Supabase configured via user interface only
- No code generation on schema itself

## Model usage

- Default: Vertex AI (ia Gemini)
- Upgradeable: future-state models load via OpenRouter

## Setup/deploy
 - GCP Cloud Run + Supabase + FastAPI
- Environment handled in `server.py`

