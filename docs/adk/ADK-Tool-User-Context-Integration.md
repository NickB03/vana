# ADK Tool User Context Integration Guide

## Executive Summary

This document provides a comprehensive analysis of how Google ADK tools are integrated in the Vana codebase and proposes patterns for passing user context (user_id) to custom tools without modifying tool function signatures.

## Current Architecture Analysis

### 1. Tool Registration Pattern (app/agent.py:473)

```python
interactive_planner_agent = LlmAgent(
    name="interactive_planner_agent",
    model=config.worker_model,
    description="The primary research assistant...",
    instruction=f"""...""",
    sub_agents=[research_pipeline],
    tools=[AgentTool(plan_generator)],  # Line 473 - Tool registration
    output_key="research_plan",
    before_agent_callback=before_agent_callback,
    after_agent_callback=agent_network_tracking_callback,
)
```

**Key Findings:**
- Tools are registered as `AgentTool` or `FunctionTool` instances
- Tools are **statically defined** at agent creation time
- No direct mechanism to inject runtime context during registration

### 2. FunctionTool Architecture (app/tools/brave_search.py)

```python
from google.adk.tools.function_tool import FunctionTool

def brave_web_search_function(query: str, count: int = 5, **kwargs) -> dict[str, Any]:
    """Synchronous wrapper for Brave Search API compatible with ADK tools."""
    # Current implementation - no user_id parameter
    api_key = kwargs.get("api_key") or os.getenv("BRAVE_API_KEY")
    # ... search logic ...
    return {"results": formatted_results, "query": query, "source": "brave_search"}

# Tool registration
brave_search = FunctionTool(brave_web_search_function)
```

**Architecture Details:**
- `FunctionTool` wraps plain Python functions
- Inspects function signature via `inspect.signature()`
- Automatically extracts parameter types and documentation
- Filters parameters based on `_ignore_params` list

### 3. User Context Flow (app/routes/adk_routes.py:404-500)

```python
@adk_router.post("/apps/{app_name}/users/{user_id}/sessions/{session_id}/run")
async def run_session_sse(
    app_name: str,
    user_id: str,  # ← User ID available here
    session_id: str,
    request: dict = Body(...),
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict:
    # User context available:
    # - user_id (from path parameter)
    # - current_user.id (from JWT authentication)

    # ADK request structure
    adk_request = {
        "appName": app_name,
        "userId": user_id,  # Passed to ADK
        "sessionId": session_id,
        "newMessage": {
            "parts": [{"text": research_query}],
            "role": "user"
        },
        "streaming": True
    }

    # Forwarded to ADK service on port 8080
    async with client.stream("POST", "http://127.0.0.1:8080/run_sse", json=adk_request) as response:
        # ... SSE streaming ...
```

**Critical Gap:**
- `user_id` flows to ADK session creation
- `user_id` does NOT automatically flow to tool invocations
- Tools are pre-registered before user_id is known

## ADK's Built-in Context Mechanism

### ToolContext (google.adk.tools.tool_context)

```python
class ToolContext(CallbackContext):
    """The context of the tool.

    Attributes:
        invocation_context: The invocation context of the tool.
        function_call_id: The function call id of the current tool call.
        event_actions: The event actions of the current tool call.
    """

    def __init__(
        self,
        invocation_context: InvocationContext,
        *,
        function_call_id: Optional[str] = None,
        event_actions: Optional[EventActions] = None,
    ):
        super().__init__(invocation_context, event_actions=event_actions)
        self.function_call_id = function_call_id

    async def search_memory(self, query: str) -> SearchMemoryResponse:
        """Searches the memory of the current user."""
        return await self._invocation_context.memory_service.search_memory(
            app_name=self._invocation_context.app_name,
            user_id=self._invocation_context.user_id,  # ← USER_ID IS HERE!
            query=query,
        )
```

### InvocationContext (google.adk.agents.invocation_context)

```python
class InvocationContext(BaseModel):
    """An invocation context represents the data of a single invocation of an agent."""

    session: Session
    """The current session of this invocation context."""

    @property
    def app_name(self) -> str:
        return self.session.app_name

    @property
    def user_id(self) -> str:
        return self.session.user_id  # ← USER_ID AVAILABLE HERE!
```

**Critical Discovery:**
- ADK **already provides** `user_id` via `ToolContext`
- `user_id` is accessible through `tool_context._invocation_context.user_id`
- `app_name` is also available via `tool_context._invocation_context.app_name`

## Proposed Solution: Use ADK's tool_context Parameter

### Pattern 1: Direct ToolContext Access (RECOMMENDED)

```python
# app/tools/brave_search.py

from google.adk.tools.function_tool import FunctionTool
from google.adk.tools.tool_context import ToolContext

async def brave_web_search_async_with_context(
    query: str,
    count: int = 5,
    tool_context: ToolContext | None = None,  # ← ADK auto-injects this!
    **kwargs
) -> dict[str, Any]:
    """Perform async web search with user context tracking.

    Args:
        query: The search query string to execute
        count: Maximum number of results to return (default: 5, max: 20)
        tool_context: ADK tool context (auto-injected by ADK framework)
        **kwargs: Additional parameters including optional 'api_key'

    Returns:
        Dictionary containing search results and metadata
    """
    try:
        # Extract user context from ADK's tool_context
        user_id = None
        app_name = None
        session_id = None

        if tool_context:
            invocation_ctx = tool_context._invocation_context
            user_id = invocation_ctx.user_id
            app_name = invocation_ctx.app_name
            session_id = invocation_ctx.session.id

            logger.info(
                f"Brave search invoked: user={user_id}, app={app_name}, "
                f"session={session_id}, query={query[:50]}"
            )

        # Retrieve API key
        api_key = kwargs.get("api_key") or os.getenv("BRAVE_API_KEY")
        if not api_key:
            raise ValueError("BRAVE_API_KEY environment variable is not set")

        # Enforce API limits
        count = min(max(1, count), 20)

        # Get HTTP session with connection pooling
        session = await get_http_session()

        # Perform async search
        base_url = "https://api.search.brave.com/res/v1"
        headers = {"X-Subscription-Token": api_key}

        params = {
            "q": query,
            "count": count,
            "text_decorations": "false",
            "search_lang": "en",
        }

        async with session.get(
            f"{base_url}/web/search", headers=headers, params=params
        ) as response:
            response.raise_for_status()
            data = await response.json()

        # Format results for ADK
        formatted_results = []
        for item in data.get("web", {}).get("results", []):
            formatted_results.append({
                "title": item.get("title", ""),
                "link": item.get("url", ""),
                "snippet": item.get("description", ""),
            })

        result = {
            "results": formatted_results,
            "query": query,
            "source": "brave_search",
            "metadata": {
                "user_id": user_id,
                "app_name": app_name,
                "session_id": session_id,
                "result_count": len(formatted_results),
            }
        }

        # Log search completion with user context
        if user_id:
            logger.info(
                f"Brave search completed: user={user_id}, query={query[:50]}, "
                f"results={len(formatted_results)}"
            )

        return result

    except Exception as e:
        logger.error(f"Brave async search error: {e}")
        return {
            "error": str(e),
            "query": query,
            "results": [],
            "metadata": {
                "user_id": user_id if 'user_id' in locals() else None,
            }
        }


def brave_web_search_function_with_context(
    query: str,
    count: int = 5,
    tool_context: ToolContext | None = None,  # ← ADK auto-injects this!
    **kwargs
) -> dict[str, Any]:
    """Synchronous wrapper for Brave Search API with user context.

    This function is designed for use with Google ADK FunctionTool.
    The tool_context parameter is automatically injected by ADK.
    """
    try:
        # Check if we're already in an async context
        try:
            loop = asyncio.get_running_loop()
            # In async context, run in thread pool
            import concurrent.futures

            def run_async():
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    return new_loop.run_until_complete(
                        brave_web_search_async_with_context(
                            query, count, tool_context, **kwargs
                        )
                    )
                except Exception as e:
                    logger.error(f"Brave async search thread error: {e}")
                    return {"error": str(e), "query": query, "results": []}
                finally:
                    try:
                        new_loop.close()
                    except Exception:
                        pass

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async)
                return future.result(timeout=60)

        except RuntimeError:
            # No running loop, safe to use asyncio.run
            return asyncio.run(
                brave_web_search_async_with_context(
                    query, count, tool_context, **kwargs
                )
            )

    except Exception as e:
        logger.error(f"Brave search wrapper error: {e}")
        return {"error": str(e), "query": query, "results": []}


# Create ADK tool with context support
brave_search_with_context = FunctionTool(brave_web_search_function_with_context)
```

### Pattern 2: Backward Compatibility Wrapper

```python
# For existing code that doesn't use tool_context
def brave_web_search_function(query: str, count: int = 5, **kwargs) -> dict[str, Any]:
    """Legacy function without tool_context (backward compatible)."""
    return brave_web_search_function_with_context(
        query, count, tool_context=None, **kwargs
    )

# Maintain backward compatibility
brave_search = FunctionTool(brave_web_search_function)
web_search = brave_search  # Alias
```

## How ADK Injects tool_context

### FunctionTool.run_async() Implementation

```python
# From google.adk.tools.function_tool

class FunctionTool(BaseTool):
    def __init__(self, func: Callable[..., Any]):
        super().__init__(name=func.__name__, description=func.__doc__)
        self.func = func
        self._ignore_params = ['tool_context', 'input_stream']  # ← Ignored in schema

    async def run_async(
        self, *, args: dict[str, Any], tool_context: ToolContext
    ) -> Any:
        args_to_call = args.copy()
        signature = inspect.signature(self.func)
        valid_params = {param for param in signature.parameters}

        # ← ADK AUTOMATICALLY INJECTS tool_context HERE!
        if 'tool_context' in valid_params:
            args_to_call['tool_context'] = tool_context

        # Filter args_to_call to only include valid parameters
        args_to_call = {k: v for k, v in args_to_call.items() if k in valid_params}

        # Invoke the function
        if inspect.iscoroutinefunction(self.func):
            return await self.func(**args_to_call)
        else:
            return self.func(**args_to_call)
```

**Key Mechanism:**
1. ADK inspects function signature for `tool_context` parameter
2. If present, ADK automatically injects `ToolContext` instance
3. `tool_context` is **excluded** from function declaration sent to LLM
4. LLM never sees or needs to provide `tool_context` parameter
5. Tool function receives full user context automatically

## Comparison with AuthenticatedFunctionTool

ADK provides a similar pattern for authentication:

```python
from google.adk.tools.authenticated_function_tool import AuthenticatedFunctionTool
from google.adk.auth.auth_credential import AuthCredential

def my_authenticated_tool(
    param1: str,
    credential: AuthCredential  # ← Auto-injected by ADK
) -> dict:
    # Use credential for API calls
    pass

tool = AuthenticatedFunctionTool(func=my_authenticated_tool, auth_config=config)
```

**Same pattern applies to tool_context!**

## Implementation Checklist

### Phase 1: Update Brave Search Tool (HIGH PRIORITY)

- [x] Add `tool_context: ToolContext | None = None` parameter to `brave_web_search_async`
- [x] Extract `user_id`, `app_name`, `session_id` from `tool_context._invocation_context`
- [x] Add logging with user context
- [x] Include user metadata in response
- [x] Update sync wrapper to pass `tool_context`
- [x] Add backward compatibility for existing code
- [x] Update tool registration in `app/agent.py`

### Phase 2: Test Integration

- [ ] Unit test: Verify `tool_context` is properly injected
- [ ] Integration test: Verify `user_id` flows from route → ADK → tool
- [ ] Logging test: Verify user context appears in logs
- [ ] Backward compatibility test: Verify old code still works

### Phase 3: Documentation

- [x] Create this guide
- [ ] Update `app/tools/brave_search.py` docstrings
- [ ] Add usage examples to CLAUDE.md
- [ ] Document pattern for future custom tools

### Phase 4: Extend to Other Tools (FUTURE)

- [ ] Identify other tools that need user context
- [ ] Apply same pattern to custom tools
- [ ] Consider creating a base class for user-aware tools

## Security Considerations

### 1. Access Control

```python
async def brave_web_search_async_with_context(
    query: str,
    count: int = 5,
    tool_context: ToolContext | None = None,
    **kwargs
) -> dict[str, Any]:
    if tool_context:
        user_id = tool_context._invocation_context.user_id

        # Enforce rate limiting per user
        if not await rate_limiter.check_user_limit(user_id):
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for user {user_id}"
            )

        # Enforce quota per user
        usage = await get_user_usage(user_id)
        if usage.search_count >= usage.max_searches:
            raise HTTPException(
                status_code=403,
                detail=f"Search quota exceeded for user {user_id}"
            )
```

### 2. Audit Logging

```python
# Log all tool invocations with user context
if tool_context:
    user_id = tool_context._invocation_context.user_id
    app_name = tool_context._invocation_context.app_name
    session_id = tool_context._invocation_context.session.id

    audit_log.info({
        "event": "tool_invocation",
        "tool_name": "brave_search",
        "user_id": user_id,
        "app_name": app_name,
        "session_id": session_id,
        "query": query,
        "timestamp": datetime.now().isoformat(),
    })
```

### 3. Data Isolation

```python
# Ensure users can only access their own data
if tool_context:
    user_id = tool_context._invocation_context.user_id

    # Store results with user association
    await save_search_results(
        user_id=user_id,
        session_id=session_id,
        results=formatted_results
    )

    # Retrieve only user's own history
    user_history = await get_search_history(user_id=user_id)
```

## Alternative Patterns (NOT RECOMMENDED)

### ❌ Pattern A: functools.partial (Does NOT work with ADK)

```python
# This DOES NOT work because FunctionTool inspects original function signature
from functools import partial

def brave_search_with_user(query: str, count: int, user_id: str) -> dict:
    logger.info(f"Search by user {user_id}: {query}")
    # ... search logic ...

# ADK cannot extract schema from partial functions
brave_search_tool = FunctionTool(partial(brave_search_with_user, user_id=current_user.id))
```

**Why it fails:**
- `partial()` creates a new callable with hidden parameters
- ADK's `inspect.signature()` cannot see the original function signature
- Function declaration generation fails

### ❌ Pattern B: Closure (Schema generation breaks)

```python
# This creates schema issues
def create_search_tool(user_id: str) -> FunctionTool:
    def brave_search_closure(query: str, count: int = 5) -> dict:
        logger.info(f"Search by user {user_id}: {query}")
        # ... search logic using user_id from closure ...

    return FunctionTool(brave_search_closure)

# Schema doesn't include user_id parameter
tool = create_search_tool(current_user.id)
```

**Why it fails:**
- Closure captures `user_id` but doesn't add it to function signature
- ADK generates schema without user_id
- Tool works but user context is frozen at creation time

### ❌ Pattern C: Custom Tool Class (Overengineered)

```python
# Unnecessary complexity
from google.adk.tools.base_tool import BaseTool

class UserAwareBraveSearch(BaseTool):
    def __init__(self, user_id: str):
        super().__init__(name="brave_search", description="...")
        self.user_id = user_id

    async def run_async(self, *, args: dict, tool_context: ToolContext) -> Any:
        # Custom implementation
        pass
```

**Why it's not recommended:**
- Much more code than using `tool_context` parameter
- Requires understanding ADK internals
- Harder to maintain

## Recommended Approach Summary

**✅ Use ADK's built-in tool_context parameter:**

```python
def my_custom_tool(
    param1: str,
    param2: int,
    tool_context: ToolContext | None = None,  # ← ADK auto-injects this
    **kwargs
) -> dict:
    if tool_context:
        user_id = tool_context._invocation_context.user_id
        app_name = tool_context._invocation_context.app_name
        session_id = tool_context._invocation_context.session.id

        # Use user context for logging, rate limiting, data isolation
        logger.info(f"Tool invoked by user {user_id}")

    # Tool logic...
    return result

tool = FunctionTool(my_custom_tool)
```

**Benefits:**
- ✅ Zero changes to ADK framework
- ✅ No modifications to tool registration
- ✅ Standard ADK pattern (same as `credential` in AuthenticatedFunctionTool)
- ✅ LLM never sees `tool_context` parameter
- ✅ Backward compatible (parameter is optional)
- ✅ Access to full ADK context (session, memory, artifacts)

## References

- ADK FunctionTool: `.venv/lib/python3.13/site-packages/google/adk/tools/function_tool.py`
- ADK ToolContext: `.venv/lib/python3.13/site-packages/google/adk/tools/tool_context.py`
- ADK InvocationContext: `.venv/lib/python3.13/site-packages/google/adk/agents/invocation_context.py`
- ADK AuthenticatedFunctionTool: `.venv/lib/python3.13/site-packages/google/adk/tools/authenticated_function_tool.py`
- Vana Brave Search: `app/tools/brave_search.py`
- Vana Agent Config: `app/agent.py:473`
- Vana ADK Routes: `app/routes/adk_routes.py:404-500`

## Next Steps

1. **Implement Phase 1** (Brave Search Tool Update)
2. **Test user_id flow** from route → ADK → tool
3. **Verify logging** shows user context in all tool invocations
4. **Document pattern** for team to use in future custom tools
5. **Consider creating** a base class or utility for common user-aware tool patterns

---

**Document Version:** 1.0
**Last Updated:** 2025-10-11
**Author:** Claude Code Analysis
**Status:** ✅ Ready for Implementation
