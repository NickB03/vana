# Agent Modules

This directory contains modular agent classes for each tasktype and role in the Vana generative framework. These are designed to follow CrewAI methodology, and workflow atomically with n8n and Korvus.

They are not direct subclasses of the CrewAI package, but follow a common lifecycle.

Every agent:
- Accepts a task

- Retrieves relevant memory from Korvus
- Assembles the LLM prompt
- Runs the Gemini LLM via Vertex AI
- Logs output to Supabase

## Interface Methods

You can expect all agents to support the following methods:

- `receive_task(task)`: term command or system request
- get_context(): calls Korvus vector search
- run_llm(): generates output via Gemini
- reformat(): cleans up response
- log_action(): submits to Supabase


## Important Clarifications

- These agents do NOT use Lovable prompts - they are controlled fully by system context.
 - Model injection with Gcloud Renderer (Vertex AI) currently; future models (openrouter/ollama) integrated with config.
- Each agent is modular and can be called individually or composed into blocks.

## Agent List

- ben_agent.py - Dev Ops strategy, orchestrates other agents
- juno_agent.py - Data capture, file logging
- kail_agent.py - Schema curator + validation
- max_agent.py - System deploy logic + env tests
- onboard_agent.py - Generative code, customized
- rhea_agent.py - Retrieve from stored memories
- sage_agent.py - Rendering/summarization

