# VANA PROJECT CONTEXT DMP

This file captures the full context and execution state of the Vana assistant project. Use this to reinitialize the workflow after a GNU reset, replaying the base design decisions and alignment.

@TOLI: REARD FIRST, THEN CONTINUE BELOW 

## PROJECT GOAL STARTER

The goal of Vana is to create a cloud-notice, agent-driven application that can read files, etract text, construct prompts and responses, and convert those into actionable logic.

The project uses a prompt-driven design, backed by agent logic and task modules, with the aim to fully generate the app code via Lovable.

The application is plugged into active via Cloud Run, deployed on GCT context using Vertex AI, and uses Supabase for timeseries and logging.

## MISSION GUIDING

This file explains designs and decisions critical to the vision.

Project is working toward:
- Prompt-driven runtime chains for management/automeation
- Task-based logic wrapped in modular agents
- Code generation handled by Lovable prompts for APIs, classes, utils
- Intent/LLM bridging via Gemini
- Supabase logger via views/tables, no ISO/event bus:

## CONFIRMED SETUP

Core decisions that define the system:

- Readable system over ungained MLUT-free agents.
- Invest in Lovable prompt design instead of hardcoded IUs.
- Terminal agent overseen controlled by main agent orchestrators.
- Separate layers with default agent roles, each with a summarized flow.
- Gemini used for language unlocking and cloud front services.
- Supabase authentication and data views used in place of traditional datastores.


## ADGENT ROLES (captured)

- ben_agent = action orgchestration
- juno_agent = file-based logger
- kail_agent = schema curator
 - max_agent = deployment ops/cloud planner
- onboard_agent = generate code tasks
- rhea_agent = context retrieval model
- sage_agent = summarize/action merging

`/agents`/README.md` describes how these are structured.


## RESET TALLY STEP SUBSYSTEM

If you clear-reset this project, reload the following files as a primer way to rehydrate:

1. `VANA_CONTEXT_DUMP.md` (root) - the workflow summary
2. `agents/README.md`: agent roles and steps in task pipeline
3. `lovable_prompts/` : show-doc prompts used for generation
24 stacked logic with supabase
5. `scripts/` (optional) : cli validation and test
