# 🗂️ Domain Orchestrators

VANA now organizes agents in a tree-of-agents structure. The root `vana` agent delegates
requests to domain orchestrators when specialized workflows are required.

## Structure

```
vana
├── TravelOrchestrator
│   ├── ItineraryPlanner
│   ├── HotelFinder
│   ├── FlightFinder
│   └── BookingAssistant
└── DevelopmentOrchestrator
    ├── CodeGenerator
    ├── TestingSpecialist
    ├── DocumentationWriter
    └── SecurityAuditor
```

Each orchestrator is responsible for routing tasks in its domain and specifying
when to delegate to its children. The root agent keeps a high level prompt that
mentions these orchestrators.

All orchestrators use the model defined in the `VANA_MODEL_NAME` environment
variable, defaulting to `gemini-2.0-flash`.

## Session State Keys

Agent workflows share information through standardized session state keys:

- `draft` – work in progress content
- `critique` – feedback from evaluators
- `final_answer` – output ready for the user

These keys are referenced in workflow modules and by the `CoordinationManager`.

## Output Schemas

Workflow agents that produce structured data define `pydantic` models in
`agents/workflows/schemas.py`. Models such as `RequirementsSchema` and
`ArchDesignSchema` are attached to `LlmAgent` definitions using the
`output_schema` parameter so that downstream agents can validate data.

## Guardrails

`main.py` registers `before_tool_callback` and `after_model_callback` with the
ADK FastAPI app. Tool calls are validated (for example, preventing path
traversal) and model responses are lightly checked for policy violations before
being returned to the user.

Breadcrumb events from each tool are emitted via `emit_tool_breadcrumb` to the
ADK event stream for easier troubleshooting.

Tools are wrapped with a lightweight `safe_tool` helper that catches exceptions
and returns an error message instead of raising, preventing orchestrator
failures when individual tools malfunction.
