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

## Agent List

- `ben_agent.py`: DevOps strategy, orrchestrates other agents.
- `juno_agent.py`: Data capture, file logging.
- `kil_agent.py`: Schema curation + validation
- `max_agent.py`: System deploy logic + env tests
- `onboard_agent.py`: First-time user flow
- `rhea_agent.py`: Memory index creator + full recall
- `sage_agent.py`: Renderer class (JSON, markdown, summary)
