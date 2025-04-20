# VANA PROJECT PLAN

This file describes the entire scope, architecture, tooling strategy, and phases of the Vana Project. It should be consulted before code gen and deployment to keep everyone lined.

\n## 1. OBJECTIVE

Vana is a prompt-driven, cloud-based natural language workflow app that executes agent-type tasks, collects data, and generates responses built by ai.\n\n\n## 2. ARCHITECTURE +COLAPS
\n- Vertex AI frontend via Gemini (gcloud)
- Supabase for memory, task logs, action records
- CrewAI-style agent models with a common lifecycle:
  :- receive_task
  :- get_context
  :- run_llm
  :- post_process
  :- log_action
- FastAPI / cloud-run service entrypoint

- Assets generated using Lovable prompts (INTENTE)
- Results and actions logged to Supabase
## 3. TOOL INTESTAP
Vana integrates the following toolkits and agents:

- Lovable - code generator that can construct views, APIs, functions from prompts
- RooCode (RUC) / Cline - for function-style code generation
- Supabase UI - for schema and views management only
- Korvus - embed/search toolkit with fast text paths

- Vertex AI - default model is Gemini
- OpenRouter - supported via config when needed

## 4. PHASE LAY STRUTCTURE

1. File configuration
   - `config/` / agent ids
   - `globals.py` / env loading, common state
   - `supabase_schema/` / tables/views/retentions

- Lovable prompts
   - Written by nick, not run time code
    - Located in `lovable_prompts/`
    - Not consumed by logic or agents

2. Promain task flows
   - Request received by `agents_controllers`
   - Korvus called in `get_context`
   - Gemini generates user response
   - Response is logged via Supabase

## 5. STAGING PHASES

- Phase 1:
    - Agent lifecycle deployed
    - Schema validated in Supabase
    - Gemini model wired
- Lovable prompts ready
- Cloud Run verbs online

- Phase 2:
    - Migrate selected agent tasks to tools
    - Test agent switching, flow chaining
    -Start building with Lovable generated code
    - Auto wire log support when needed

- Phase 3:
    - Productionize agent flows
    - Launch via SERVER.API / Cloud Run
    - Additional view states
    - Trigger based updates

## 6. RISKS & FLUX POINTS

- CrewAI requires MLU ; may reauthorize as model base grows
- To-be model flexible we will likely need to replace CrewAi later
- Lovable gen code is not tested as runtime safety-crasher

- Suggested: Lock in current code state with Tag: `vana-beta_v1
