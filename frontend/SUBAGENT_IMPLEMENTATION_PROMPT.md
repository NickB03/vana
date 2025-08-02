# Vana Frontend Rebuild - Subagent Implementation Prompt

## Project Context

We are rebuilding the Vana frontend from scratch to properly integrate with the ADK (Agent Development Kit) backend. The current implementation has technical debt from fighting React StrictMode and using global state workarounds. This rebuild will follow React best practices with proper SSE integration from the ground up.

## Project Documentation

The following documentation has been prepared:
- **UI_SPECIFICATIONS.md** - Complete UI/UX specifications including design system, components, and user flows
- **FRONTEND_REBUILD_PLAN.md** - 4-week phased implementation plan with technical stack and architecture
- **ADK_INTEGRATION_ARCHITECTURE.md** - Detailed ADK service layer design and SSE integration patterns
- **ADK_ARCHITECTURE_DIAGRAMS.md** - Visual diagrams of system architecture and data flows
- **ADK_INTEGRATION_EXAMPLES.md** - Code examples for ADK integration
- **REACT_ARCHITECTURE_PLAN.md** - React-specific architecture with Context API patterns

## Implementation Requirements

### Phase 1: Foundation (Week 1)
Using the **spec-requirements** → **spec-design** → **spec-judge** workflow:

1. **Create detailed specifications** for:
   - Project setup with Vite, React 18, TypeScript
   - Core Context provider architecture
   - ADK service layer implementation
   - Routing structure with React Router v6
   - Component library integration (shadcn/ui + kibo-ui)

2. **Design the architecture** for:
   - State management with Context API (no global variables)
   - SSE client with proper lifecycle management
   - Session persistence and recovery
   - Error boundaries and recovery strategies

3. **Break down into implementation tasks** using **spec-tasks**

### Phase 2: Core Implementation
Using **frontend-api-specialist** + **adk-multi-agent-engineer** in parallel:

1. **Build the ADK integration layer**:
   - ADKManager as service coordinator
   - Event processor for agent activities
   - Message transformation pipeline
   - Session management with caching

2. **Implement React components**:
   - Landing page with hero section
   - Chat interface with kibo-ui AIInput
   - Message list with virtual scrolling
   - Agent thinking panel with timeline
   - Connection status indicator

3. **Ensure StrictMode compatibility**:
   - No global state outside React
   - Proper effect cleanup
   - Cancellation tokens for async operations

### Phase 3: Testing & Documentation
Using **spec-test** + **github-docs-architect**:

1. **Create comprehensive test suite**:
   - Unit tests for all components (80% coverage)
   - Integration tests for ADK communication
   - E2E tests for critical user flows
   - Performance benchmarks

2. **Write documentation**:
   - README with setup instructions
   - Architecture decision records (ADRs)
   - Component API documentation
   - Deployment guide

## Key Technical Constraints

1. **Must use React patterns** - Context API, not global variables
2. **StrictMode compatible** - Handle double mounting properly
3. **Type safety** - 100% TypeScript, no `any` types
4. **Performance targets** - Lighthouse score > 90
5. **SSE implementation** - Per-message connections following ADK pattern
6. **Component libraries** - Use existing kibo-ui for AI components

## Expected Deliverables

### From spec-requirements:
- Detailed requirement documents for each phase
- User stories with acceptance criteria
- Technical constraints and dependencies

### From spec-design:
- Component architecture diagrams
- State management design
- API integration specifications
- Performance optimization strategies

### From frontend-api-specialist:
- React component implementations
- Custom hooks for state management
- SSE client with error handling
- Performance optimizations

### From adk-multi-agent-engineer:
- ADK service layer implementation
- Event processing pipeline
- Session management system
- Agent activity tracking

### From spec-test:
- Test specifications and plans
- Unit test implementations
- Integration test suite
- E2E test scenarios

### From github-docs-architect:
- Comprehensive README
- API documentation
- Setup and deployment guides
- Contributing guidelines

## Success Criteria

1. **No duplicate messages** - Proper SSE event handling
2. **Clean architecture** - No workarounds or global state
3. **Maintainable code** - Clear structure, well-tested
4. **ADK compatibility** - Seamless integration with backend
5. **UI/UX preserved** - Matches current design specifications
6. **Performance met** - All targets achieved

## Collaboration Instructions

1. **Start with requirements** - spec-requirements agent creates detailed specs
2. **Design review** - spec-judge validates the design
3. **Parallel implementation** - Frontend and ADK specialists work together
4. **Continuous testing** - spec-test creates tests alongside implementation
5. **Documentation throughout** - github-docs-architect documents as we build

Begin by analyzing the provided documentation and creating the Phase 1 foundation specifications. Focus on building a clean, maintainable architecture that properly integrates with ADK while following React best practices.