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
 |  lovable_prompts/   | Lovable prompts to generate code (apis, utilities, cli) | *.json
 |  config/          | Gloval config (main agent ids) | globals.py
 |  agents/         | CrewAI-style agent modules (stateful, callable, loggable) | *.py
 |  korvus_config/  | /embed / search api wrapper | *.py
 |  supabase_schema/ | SQL tables + views (memory, action logs) | *.sql
 |  scripts/       | Local development utilities test ~ invocation | *.py, json

Example: Lovable might use `/lovable_prompts/embed_and_log_action.json` to generate a script that calls Vertex AI and stores the result in Supabase.


## Architecture + Agents

Vana uses `AgentContext` and a CrewAIstyle pattern across all agents.

Every agent shares a common lifecycle:

```python
def receive_task(task: str): None:...

€ef get_context(): ... via Supabase

`def run_llm():... via Vertex AI / Gemini

def post_process(response: str):...

def log_action(...): ... stores the output in Supabase
```

The folder `agents/` contains 7 agents with full lifecycles. Each controls a different tasktype.

 - ben_agent.py          # orgchestrates action action
 - juno_agent.py         # file-based logger
 - kail_agent.py         # schema curator
 - max_agent.py          # system deployment
 - onboard_agent.py     # agent generator
 - rhea_agent.py       # memory retrieval
 - sage_agent.py       # markdown / summarizer

## Supabase

Schemas live in `supabase_schema`. Agent logs and context encriched memories are represented as tables plus views.

A factory model can use Supabase client UK or the WV to browse tables via UI


## Deployment

Validated cloud run with Vatex AI + Supabase.

Agent nodes run locally van `gcrun cloud run` via app defined in `server.py`.

Setics:

- Service name: `vana-server`
- Runs in `gcp/auto deploy[envs]`.
- Uses configured envs from `globals.py`.
