# VANA Rebuild Plan - Basic Operational Model

## Current Issues
1. **Agent delegation not working properly** - getting stuck or not responding
2. **Circular transfer loops** between VANA and orchestrator
3. **Deployment issues** - Node.js errors suggesting wrong runtime detection
4. **Complex multi-layer architecture** causing handoff problems

## ADK Best Practices Analysis

### From ADK Samples:
1. **Simple is better** - Start with basic agent → sub-agent delegation
2. **No custom transfer tools** - ADK provides transfer_to_agent automatically
3. **Clear agent descriptions** - Critical for LLM routing decisions
4. **Single parent rule** - Each agent can only have one parent
5. **Sub-agents, not tools** - Specialists should be sub_agents, not tools

### Current Architecture Problems:
1. Too many layers (VANA → orchestrator → specialists)
2. Custom transfer_to_agent tool conflicts with ADK's built-in
3. Instructions too complex with conflicting rules
4. Gemini 2.5 Flash thinking may be overriding instructions

## Proposed Simple Architecture

### Option 1: Direct Specialist Access
```
VANA (root agent)
├── writing_specialist
├── code_specialist
├── data_specialist
└── general_assistant
```

### Option 2: Simple Orchestrator
```
VANA (root agent)
└── simple_orchestrator
    ├── writing_specialist
    ├── code_specialist
    └── data_specialist
```

## Implementation Steps

### Phase 1: Minimal Working System
1. Create simple VANA with clear instruction: "Transfer all requests to orchestrator"
2. Create simple orchestrator that:
   - Has 2-3 basic specialists as sub_agents
   - Handles requests directly if no specialist matches
   - NEVER transfers back to parent
3. No custom tools, no complex routing logic
4. Test locally with ADK runner

### Phase 2: Add Basic Specialists
1. Writing specialist - for reports, content creation
2. Code specialist - for programming questions
3. Data specialist - for analysis questions
4. Each with simple, clear descriptions

### Phase 3: Enhance Instructions
1. Add specific routing rules to orchestrator
2. Keep VANA instruction minimal
3. Test edge cases and refine

## Key Design Principles
1. **VANA is just a gateway** - minimal logic, just transfers
2. **Orchestrator owns routing** - all decisions made here
3. **Specialists are leaf nodes** - they don't transfer
4. **No circular paths** - clear hierarchy
5. **Simple instructions** - avoid complex conditional logic

## Testing Strategy
1. Unit tests for each agent
2. Integration tests for handoffs
3. Edge case tests (empty requests, unclear routing)
4. Performance tests (prevent loops)

## Deployment Strategy
1. Fix Dockerfile to ensure Python runtime
2. Minimize dependencies
3. Clear health checks
4. Proper error handling

## Success Criteria
1. Simple "Hello" → Direct response from VANA
2. "Write a report" → VANA → Orchestrator → Writing Specialist
3. No loops, timeouts, or stuck requests
4. Clear, helpful responses
5. Fast response times (<5 seconds)