# Initial Feature Request

## FEATURE:
VANA - Multi-Domain AI Agent System built on Google's Agent Development Kit (ADK)

VANA is an advanced hierarchical multi-agent orchestration system that extends beyond traditional coding/enterprise use cases to provide comprehensive AI assistance across multiple domains:

- **Core Platform Agents**: Root orchestrator, authentication manager, session management, error handling
- **Personal Assistant Suite**: Email management (Gmail API), calendar scheduling, task management, shopping lists, inbox cleaning
- **Creative Content Agents**: Content creation pipelines, code generation, multimedia workflows, writing assistance
- **Research & Analysis**: Web research aggregation, academic search, data analysis, document Q&A (RAG pattern)
- **Integration Capabilities**: 
  - OpenAPIToolset for rapid API integration
  - MCP (Model Context Protocol) client/server support for external tool integration
  - Dynamic tool discovery and routing from MCP servers
  - Future iOS app bridge
  - Third-party service connectors (Gmail, Calendar, Slack, GitHub, etc.)

The system leverages ADK's native patterns:
- Multi-agent composition via `sub_agents` parameter
- Workflow agents (Sequential, Parallel, Loop) for deterministic orchestration
- AgentTool wrapper for using agents as tools
- Session state management for context persistence
- ToolContext for flow control and state management 

## EXAMPLES:

Reference the `examples/` folder for ADK patterns and best practices:

- **`examples/7-multi-agent/`** - Template for multi-agent systems with proper delegation patterns
- **`examples/10-sequential-agent/`** - Sequential workflow implementation for pipelines
- **`examples/11-parallel-agent/`** - Parallel execution patterns for concurrent operations
- **`examples/12-loop-agent/`** - Iterative refinement with exit conditions
- **`examples/5-sessions-and-state/`** - State management and session persistence
- **`examples/vana-patterns/orchestrator_pattern.py`** - VANA's enhanced orchestrator implementation
- **`lib/mcp/example_usage.py`** - MCP integration examples and patterns
- **`.claude_workspace/mcp_integration_design.md`** - Detailed MCP-ADK integration design

Study these examples for best practices in:
- ADK agent creation with proper naming and descriptions
- Tool integration with automatic FunctionTool wrapping
- Multi-agent delegation using `sub_agents` parameter
- AgentTool wrapper for using agents as tools
- ToolContext usage for state management
- Workflow agent patterns (Sequential, Parallel, Loop)

## DOCUMENTATION:

### Local ADK References
- **ADK Examples README**: `examples/ADK_EXAMPLES_README.md` - Overview of all 12 ADK patterns
- **ChromaDB Knowledge Base**: Query collection `adk_complete_docs` for ADK patterns and documentation
- **VANA Patterns**: `examples/vana-patterns/orchestrator_pattern.py` - Enhanced orchestrator implementation
- **Research Document**: `.claude_workspace/vana_agent_system_map_CORRECTED.md` - Comprehensive agent system design
- **LiteLLM Documentation**: ADK natively supports LiteLLM via `google.adk.models.lite_llm.LiteLlm`

### Key Local Examples to Study
- **Multi-Agent Pattern**: `examples/7-multi-agent/` - Delegation via sub_agents
- **Sequential Workflow**: `examples/10-sequential-agent/` - Pipeline patterns
- **Parallel Execution**: `examples/11-parallel-agent/` - Concurrent operations
- **Loop Pattern**: `examples/12-loop-agent/linkedin_post_agent/` - Iterative refinement with exit conditions
- **State Management**: `examples/5-sessions-and-state/question_answering_agent/` - Session persistence

### Existing VANA Components
- **Agent Definitions**: `agents/` - Current agent implementations to validate
- **Tool Library**: `lib/_tools/` - Existing tools following ADK patterns
- **Shared Services**: `lib/_shared_libraries/` - Core services (memory, auth)
- **MCP Integration**: 
  - `lib/mcp/core/` - MCP client, manager, and registry implementations
  - `lib/mcp/servers/` - Example MCP servers (GitHub, Brave Search, Fetch)
  - `lib/mcp/config/servers.json` - MCP server configurations

### Configuration Files
- **Environment Template**: `.env.example` - Required API keys and settings
- **Claude Config**: `CLAUDE.md` - Development guidelines and ADK compliance rules
- **MCP Config**: `.mcp.json` - VS Code MCP server configurations


## OTHER CONSIDERATIONS:

### Configuration & Environment
- Maintain existing `.env.example` with all required API keys:
  - `GOOGLE_API_KEY` for Gemini models
  - `OPENROUTER_API_KEY` for OpenRouter/LiteLLM integration
  - Gmail API credentials for email assistant
  - Google Calendar API for scheduling
  - Additional service credentials as needed
- Use `python-dotenv` with `load_dotenv()` for environment management
- Python 3.13+ is MANDATORY for ADK compatibility
- **LiteLLM Configuration** (ADK Native Support):
  ```python
  # Example .env for OpenRouter
  OPENROUTER_API_KEY=your_key_here
  
  # Using ADK's native LiteLLM support
  from google.adk.models.lite_llm import LiteLlm
  
  # Configure agent with OpenRouter model
  agent = LlmAgent(
      model=LiteLlm(
          model="openrouter/meta-llama/llama-3-8b-instruct",
          api_base="https://openrouter.ai/api/v1",
          api_key=os.getenv("OPENROUTER_API_KEY")
      ),
      name="my_agent",
      # ... other configuration
  )
  ```

### Project Structure
- Preserve existing modular architecture:
  - `agents/` - All agent definitions following ADK patterns
  - `lib/_tools/` - Tool implementations with proper docstrings
  - `lib/_shared_libraries/` - Core services (memory, auth, etc.)
  - `examples/` - ADK pattern references and VANA examples
- Maintain clear separation between agent types (platform, personal, creative, research)

### Implementation Priorities (ITERATIVE CHUNKS REQUIRED)

**Each phase MUST be broken into testable chunks - NO complete phase implementations**

1. **Phase 1**: Validate existing ADK-compliant orchestrator pattern
   - Chunk 1.1: Test current orchestrator with simple tool
   - Chunk 1.2: Verify sub_agents delegation works
   - Chunk 1.3: Document validation results

2. **Phase 2**: Implement MCP-ADK integration bridge
   - Chunk 2.1: MCPToolWrapper class only (test with mock)
   - Chunk 2.2: Basic MCPEnabledAgent without discovery
   - Chunk 2.3: Add single MCP server integration (GitHub)
   - Chunk 2.4: Add tool discovery for single server
   - Chunk 2.5: Test with real GitHub API calls
   - Chunk 2.6: Add second MCP server (Brave Search)

3. **Phase 3**: Model Flexibility with ADK's LiteLLM
   - Chunk 3.1: Test ADK's native LiteLLM with OpenRouter
   - Chunk 3.2: Create model selection utility using `google.adk.models.lite_llm`
   - Chunk 3.3: Implement cost-optimized agent example
   - Chunk 3.4: Add model routing based on task complexity

4. **Phase 4**: Personal Assistant Agents
   - Chunk 4.1: Email assistant with single tool (read_inbox)
   - Chunk 4.2: Add send_email capability
   - Chunk 4.3: Calendar agent with list_events only
   - Chunk 4.4: Add create_event capability
   - Each chunk deployed and tested before next

5. **Phase 5**: Creative Content Pipeline
   - Chunk 5.1: Basic content drafter agent
   - Chunk 5.2: Add single refinement loop
   - Chunk 5.3: Integrate quality scoring
   - Small, testable increments only

6. **Phase 6**: Research Aggregation
   - Chunk 6.1: Single source web search
   - Chunk 6.2: Add parallel search capability
   - Chunk 6.3: Implement result synthesis
   - Test each search source individually first

### Critical ADK Compliance Rules
- ALWAYS use `sub_agents` for delegation (NOT `transfer_to_agent`)
- ALWAYS wrap agents with AgentTool when adding to tools list
- NEVER use LLMs in workflow agents (Sequential/Parallel/Loop)
- ALWAYS include comprehensive docstrings for tools
- ALWAYS verify patterns against ChromaDB knowledge base

### Model Flexibility Requirements
- **OpenRouter API Support**: Use ADK's native LiteLLM support for model routing flexibility
  - Not all agents require the same model - adjust per agent needs
  - Support for OpenRouter's 100+ models (Claude, GPT-4, Llama, Kimi, etc.)
  - Cost optimization by using appropriate models for each task
  - Example: Simple tasks use fast/cheap models, complex reasoning uses premium models
- **ADK LiteLLM Integration Pattern** (Python only):
  ```python
  from google.adk.agents import LlmAgent
  from google.adk.models.lite_llm import LiteLlm
  
  # Simple tasks - use cheaper model
  simple_agent = LlmAgent(
      model=LiteLlm(
          model="openrouter/meta-llama/llama-3-8b-instruct",
          api_base="https://openrouter.ai/api/v1",
          api_key=os.getenv("OPENROUTER_API_KEY")
      ),
      name="cost_optimized_agent",
      instruction="Handle simple queries efficiently"
  )
  
  # Complex tasks - use premium model
  complex_agent = LlmAgent(
      model=LiteLlm(
          model="openrouter/anthropic/claude-3-opus",
          api_base="https://openrouter.ai/api/v1",
          api_key=os.getenv("OPENROUTER_API_KEY")
      ),
      name="reasoning_agent",
      instruction="Handle complex reasoning tasks"
  )
  ```

### MCP Integration Requirements
- **MCP Tool Wrapper**: Convert MCP tools to ADK-compatible functions
- **Async Support**: Handle MCP's async operations within ADK's sync/async model
- **Tool Discovery**: Dynamic discovery of tools from MCP servers at runtime
- **Performance Routing**: Route tools to best-performing MCP server
- **Error Handling**: Graceful degradation when MCP servers are unavailable
- **Security**: Secure credential management for MCP server authentication

### Iterative Development Requirements (MANDATORY)
**CRITICAL: All development MUST follow this iterative process - NO EXCEPTIONS**

#### Development Workflow
1. **Chunk Size**: Maximum 1-2 features or 200-300 lines of code per chunk
2. **Local Testing**: EVERY chunk must be tested locally before proceeding
3. **Dev Environment Testing**: Deploy and test in vana-dev after local success
4. **Production Ready**: Only after vana-dev validation can code be considered complete

#### Enforcement Pattern
```bash
# REQUIRED workflow for EVERY development chunk:
1. Implement small chunk (1-2 features max)
2. Run local tests: make test
3. Verify locally: python main.py
4. Deploy to dev: gcloud run deploy vana-dev --source .
5. Test in dev environment thoroughly
6. Document test results
7. ONLY THEN proceed to next chunk
```

#### Chunk Examples
- **Good Chunk**: Implement MCPToolWrapper class + unit tests
- **Bad Chunk**: Implement entire MCP integration phase
- **Good Chunk**: Add email_assistant agent with basic Gmail tool
- **Bad Chunk**: Implement all personal assistant agents at once

#### Validation Gates
- **Local Gate**: All tests pass, manual verification complete
- **Dev Gate**: Deployed successfully, integration tests pass
- **Chunk Gate**: Previous chunk fully validated before starting next

### Testing & Validation
- Test each agent in isolation before integration
- Verify delegation patterns work correctly
- Ensure session state persists across agent interactions
- Validate tool execution and error handling
- Benchmark performance with metrics tracking
- **MANDATORY**: Follow iterative chunk workflow for ALL changes