"""
Enhanced VANA Orchestrator
Following Google ADK patterns with specialist routing
"""

import os
from typing import Dict, List, Optional

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from lib._shared_libraries.orchestrator_metrics import MetricsTimer, get_orchestrator_metrics

# Import core tools
from lib._tools import adk_analyze_task, adk_list_directory, adk_read_file, adk_search_knowledge, adk_write_file

# Import logging and metrics
from lib.logging_config import get_logger

# Import specialist agents
try:
    from agents.specialists.architecture_specialist import architecture_specialist
    from agents.specialists.data_science_specialist import data_science_specialist
    from agents.specialists.devops_specialist import devops_specialist
    from agents.specialists.security_specialist import security_specialist
    # from agents.specialists.content_creation_specialist import content_creation_specialist  # Missing file
    from agents.specialists.research_specialist import research_specialist

    SPECIALISTS_AVAILABLE = True
    logger = get_logger("vana.enhanced_orchestrator")
    logger.info("✅ Available specialists loaded successfully")
    content_creation_specialist = None  # Not available yet
except ImportError as e:
    SPECIALISTS_AVAILABLE = False
    logger = get_logger("vana.enhanced_orchestrator")
    logger.error(f"❌ Failed to import specialists: {e}")
    # Fallback - no specialists
    architecture_specialist = None
    data_science_specialist = None
    security_specialist = None
    devops_specialist = None
    content_creation_specialist = None
    research_specialist = None


def route_to_specialist(request: str, task_type: str, context: Dict[str, any] = None) -> str:
    """
    Route requests to appropriate specialists based on task type.

    Args:
        request: User request
        task_type: Type of task from analyze_task
        context: Optional context dictionary

    Returns:
        Specialist response or fallback message
    """
    if not SPECIALISTS_AVAILABLE:
        return f"Specialists not available. Task type '{task_type}' identified but cannot route."

    # Get metrics instance
    metrics = get_orchestrator_metrics()

    routing_map = {
        # Architecture patterns
        "architecture_review": architecture_specialist,
        "design_pattern": architecture_specialist,
        "code_structure": architecture_specialist,
        "refactoring": architecture_specialist,
        # Data science patterns
        "data_analysis": data_science_specialist,
        "machine_learning": data_science_specialist,
        "visualization": data_science_specialist,
        "statistics": data_science_specialist,
        # Security patterns - ELEVATED PRIORITY
        "security_scan": security_specialist,
        "vulnerability_check": security_specialist,
        "authentication": security_specialist,
        "encryption": security_specialist,
        "security": security_specialist,  # Catch-all for security
        # DevOps patterns
        "deployment": devops_specialist,
        "ci_cd": devops_specialist,
        "infrastructure": devops_specialist,
        "monitoring": devops_specialist,
        "docker": devops_specialist,
        "kubernetes": devops_specialist,
        # Content creation patterns
        "writing": content_creation_specialist,
        "write": content_creation_specialist,
        "document": content_creation_specialist,
        "report": content_creation_specialist,
        "article": content_creation_specialist,
        "content": content_creation_specialist,
        "edit": content_creation_specialist,
        "format": content_creation_specialist,
        # Research patterns  
        "research": research_specialist,
        "investigate": research_specialist,
        "find_information": research_specialist,
        "search": research_specialist,
        "analyze": research_specialist,
        "fact_check": research_specialist,
        "validate": research_specialist,
        "sources": research_specialist,
    }

    # Check for security keywords first (ELEVATED STATUS)
    security_keywords = [
        "security",
        "vulnerability",
        "exploit",
        "injection",
        "xss",
        "csrf",
        "authentication",
        "authorization",
        "encryption",
        "certificate",
        "ssl",
        "tls",
        "password",
        "secret",
        "token",
        "breach",
        "attack",
    ]

    specialist_name = None
    specialist = None

    if any(keyword in request.lower() for keyword in security_keywords):
        logger.info("🔴 ELEVATED: Routing to security specialist due to security keywords")
        if security_specialist:
            specialist_name = "security_specialist"
            specialist = security_specialist

    # Standard routing if no security match
    if not specialist:
        specialist = routing_map.get(task_type)
        if specialist:
            # Determine specialist name from the mapping
            for pattern, spec in routing_map.items():
                if spec == specialist:
                    specialist_name = spec.name if hasattr(spec, "name") else pattern
                    break

    if specialist and specialist_name:
        logger.info(f"Routing to {specialist_name} for task type: {task_type}")

        # Time the specialist execution
        with MetricsTimer(metrics, task_type, specialist_name):
            return specialist.run(request, context or {})
    else:
        metrics.record_error("routing_failure", f"No specialist for type: {task_type}")
        return f"No specialist available for task type: {task_type}"


def analyze_and_route(request: str, context: Dict[str, any], timeout: float = 30.0) -> str:
    """
    Enhanced task analysis and routing with specialist integration and timeout handling.

    Args:
        request: User request to analyze and route
        context: Optional context dictionary
        timeout: Maximum time in seconds for specialist execution

    Returns:
        Analysis and routing result
    """
    import threading
    from lib._tools.exceptions import TimeoutError
    
    result_container = {"result": None, "error": None}
    
    def execute_with_timeout():
        try:
            # First, use analyze_task to understand the request
            analysis = adk_analyze_task(request)

            # Extract task type from analysis
            # The analyze_task tool returns a structured analysis
            task_type = "unknown"
            if "task_type:" in analysis.lower():
                # Extract task type from the analysis
                for line in analysis.split("\n"):
                    if "task_type:" in line.lower():
                        task_type = line.split(":")[-1].strip().lower()
                        break

            logger.info(f"Task analysis complete. Type: {task_type}")

            # Route to appropriate specialist
            specialist_result = route_to_specialist(request, task_type, context)

            result_container["result"] = f"""## Task Analysis & Routing

**Request**: {request}
**Task Type**: {task_type}
**Routed To**: {task_type.replace('_', ' ').title()} Specialist

### Specialist Response:
{specialist_result}"""
        except Exception as e:
            result_container["error"] = e
    
    # Execute in thread with timeout
    thread = threading.Thread(target=execute_with_timeout)
    thread.daemon = True
    thread.start()
    thread.join(timeout)
    
    if thread.is_alive():
        # Timeout occurred
        metrics.record_error("orchestration_timeout", f"Exceeded {timeout}s timeout")
        return f"Request timed out after {timeout} seconds. Please try a simpler request or break it into smaller parts."
    
    if result_container["error"]:
        raise result_container["error"]
        
    return result_container["result"]


async def analyze_and_route_async(request: str, context: Dict[str, any]) -> str:
    """
    Async version of analyze_and_route for A2A protocol compatibility.
    """
    import asyncio
    
    # Run the synchronous version in a thread pool
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, analyze_and_route, request, context)


async def parallel_route_specialists(request: str, specialists: List[str], context: Dict[str, any] = None) -> str:
    """
    Route request to multiple specialists in parallel using A2A protocol.
    
    Args:
        request: User request
        specialists: List of specialist names to route to
        context: Optional context dictionary
    
    Returns:
        Aggregated results from all specialists
    """
    try:
        # Get A2A protocol and parallel executor
        from agents.protocols.a2a_protocol import get_a2a_protocol
        from agents.protocols.parallel_executor import get_parallel_executor, ParallelTask, ExecutionStrategy, ResultAggregationMethod
        import uuid
        
        a2a_protocol = await get_a2a_protocol()
        parallel_executor = get_parallel_executor(a2a_protocol)
        
        # Create parallel task
        task = ParallelTask(
            task_id=str(uuid.uuid4()),
            task_type="analysis",
            data={"request": request},
            specialists=specialists,
            strategy=ExecutionStrategy.BEST_EFFORT,
            aggregation=ResultAggregationMethod.MERGE,
            timeout=30.0,
            context=context or {}
        )
        
        # Execute in parallel
        result = await parallel_executor.execute_parallel(task)
        
        if result.success:
            return f"""## Parallel Specialist Analysis

**Request**: {request}
**Specialists Consulted**: {', '.join(specialists)}
**Execution Time**: {result.execution_time:.2f}s
**Success Rate**: {result.specialists_succeeded}/{len(specialists)}

### Aggregated Results:
{result.data}

### Individual Specialist Results:
{chr(10).join([
    f"**{r.specialist_name}**: {'✅ Success' if r.success else '❌ Failed'} ({r.execution_time:.2f}s)"
    for r in result.specialist_results
])}"""
        else:
            return f"""## Parallel Execution Failed

**Request**: {request}
**Error**: {result.error}
**Specialists**: {', '.join(specialists)}
**Execution Time**: {result.execution_time:.2f}s"""
    
    except Exception as e:
        logger.error(f"Parallel routing failed: {e}")
        return f"Parallel routing failed: {str(e)}"


def smart_route_with_parallel(request: str, context: Dict[str, any] = None) -> str:
    """
    Smart routing that decides whether to use single specialist or parallel execution.
    """
    import asyncio
    
    # Analyze request complexity
    analysis = adk_analyze_task(request)
    
    # Check if request benefits from multiple perspectives
    parallel_keywords = [
        "compare", "analyze from multiple angles", "comprehensive review",
        "different perspectives", "full analysis", "complete assessment"
    ]
    
    needs_parallel = any(keyword in request.lower() for keyword in parallel_keywords)
    
    if needs_parallel:
        # Determine relevant specialists based on request content
        relevant_specialists = []
        
        if any(word in request.lower() for word in ["code", "architecture", "design", "pattern"]):
            relevant_specialists.append("architecture_specialist")
        
        if any(word in request.lower() for word in ["data", "analysis", "statistics", "ml"]):
            relevant_specialists.append("data_science_specialist")
        
        if any(word in request.lower() for word in ["security", "vulnerability", "threat", "auth"]):
            relevant_specialists.append("security_specialist")
        
        if any(word in request.lower() for word in ["deployment", "devops", "ci", "infrastructure"]):
            relevant_specialists.append("devops_specialist")
        
        if any(word in request.lower() for word in ["test", "qa", "quality", "bug"]):
            relevant_specialists.append("qa_specialist")
        
        if any(word in request.lower() for word in ["ui", "ux", "interface", "user"]):
            relevant_specialists.append("ui_specialist")
        
        if len(relevant_specialists) > 1:
            # Use parallel execution
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(
                    parallel_route_specialists(request, relevant_specialists, context)
                )
                return result
            finally:
                loop.close()
    
    # Use standard single-specialist routing
    return analyze_and_route(request, context or {})


# Initialize Agent-as-Tool pattern (temporarily disabled for Phase 1)
# try:
#     from lib._tools.agent_tools import create_specialist_tools
#     
#     # Create specialist agent list
#     available_specialists = []
#     if security_specialist:
#         available_specialists.append(security_specialist)
#     if architecture_specialist:
#         available_specialists.append(architecture_specialist)
#     if data_science_specialist:
#         available_specialists.append(data_science_specialist)
#     if devops_specialist:
#         available_specialists.append(devops_specialist)
#     
#     # Note: ADK handles agent delegation through the sub_agents mechanism,
#     # not through tools. AgentTool objects should not be added to the tools list.
#     logger.info(f"✅ {len(available_specialists)} specialists will be available as sub-agents")
#     
# except ImportError as e:
#     logger.warning(f"⚠️ Specialist agents not available: {e}")

# Import test specialist for Phase 1 validation
try:
    from agents.test_specialist import test_specialist
    test_specialist_available = True
    logger.info("✅ Test specialist loaded for Phase 1 validation")
except ImportError as e:
    test_specialist_available = False
    test_specialist = None
    logger.warning(f"⚠️ Test specialist not available: {e}")

# Count available specialists
available_specialists = []
if security_specialist:
    available_specialists.append(security_specialist)
if architecture_specialist:
    available_specialists.append(architecture_specialist)
if data_science_specialist:
    available_specialists.append(data_science_specialist)
if devops_specialist:
    available_specialists.append(devops_specialist)
if research_specialist:
    available_specialists.append(research_specialist)

# Add test specialist for Phase 1 validation
if test_specialist_available and test_specialist:
    available_specialists.append(test_specialist)

logger.info(f"✅ {len(available_specialists)} specialists available as sub-agents (including test specialist)")

# Create the enhanced orchestrator
enhanced_orchestrator = LlmAgent(
    name="enhanced_orchestrator",
    model="gemini-2.5-flash",
    description="Enhanced orchestrator with specialist routing and agent-as-tool pattern",
    instruction="""Enhanced VANA Orchestrator - Process all requests and return comprehensive responses.

You are the central orchestrator receiving ALL requests from VANA. Your job is to:
1. Analyze the request
2. Route to appropriate specialists or use direct tools
3. Return a complete, user-friendly response

ROUTING LOGIC:
- Security queries → IMMEDIATE priority to Security Specialist
- Code/Architecture → Architecture Specialist  
- Data analysis → Data Science Specialist
- DevOps/Infrastructure → DevOps Specialist
- General/Simple queries → Handle directly with your tools

DIRECT TOOL ACCESS (Agent-as-Tool Pattern):
- quick_security_scan: Fast security vulnerability check
- architecture_review: Quick architecture and design analysis
- data_stats: Basic statistical analysis and insights
- devops_config: DevOps configuration guidance

IMPORTANT: Always return a complete, natural language response that directly answers the user's question. Never return JSON or technical routing information.

CRITICAL ROUTING RULES:
- NEVER transfer back to 'vana' - you ARE the orchestrator receiving from VANA
- Only transfer to your specialist sub-agents when needed
- If you cannot handle a request, respond with your limitations rather than transferring back

WRITING TASKS:
For writing tasks like reports, essays, or content creation:
1. First check if you have a writing specialist available
2. If not, handle the request yourself by providing a comprehensive outline and content
3. NEVER transfer back to vana - you must provide a response""",
    tools=[
        analyze_and_route,  # ADK auto-wraps as FunctionTool
        adk_read_file,
        adk_write_file,
        adk_list_directory,
        adk_search_knowledge,
        adk_analyze_task,  # Direct access for fine-grained control
    ],  # Specialists are handled via sub_agents, not tools (ADK pattern)
    # Include specialists as sub-agents if available
    sub_agents=available_specialists,
)


# Simple caching for frequently asked questions
class SimpleCache:
    """Basic caching for common queries - follows ADK synchronous patterns"""

    def __init__(self, max_size: int = 100):
        self.cache: Dict[str, str] = {}
        self.max_size = max_size
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        if key in self.cache:
            self.hits += 1
            return self.cache[key]
        self.misses += 1
        return None

    def set(self, key: str, value: str) -> None:
        """Set value in cache with simple LRU eviction"""
        if len(self.cache) >= self.max_size:
            # Remove oldest entry (simple FIFO)
            oldest = next(iter(self.cache))
            del self.cache[oldest]
        self.cache[key] = value

    def get_stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {"hits": self.hits, "misses": self.misses, "size": len(self.cache), "hit_rate": hit_rate}


# Initialize cache
orchestrator_cache = SimpleCache()


def cached_route_to_specialist(request: str, task_type: str, context: Dict[str, any] = None) -> str:
    """
    Context-aware cached version of route_to_specialist for common queries.

    Args:
        request: User request
        task_type: Type of task
        context: Optional context (enhanced with SpecialistContext if available)

    Returns:
        Cached or fresh specialist response with context awareness
    """
    # Get metrics instance
    metrics = get_orchestrator_metrics()

    # Enhanced context awareness
    context_key = ""
    if context and isinstance(context, dict):
        # Extract context-sensitive information for cache key
        user_level = context.get("user_preferences", {}).get("technical_level", "intermediate")
        security_level = context.get("execution_metadata", {}).get("security_level", "public")
        context_key = f":{user_level}:{security_level}"

    # Create context-aware cache key
    cache_key = f"{task_type}:{request[:100]}{context_key}"

    # Check cache first
    cached_response = orchestrator_cache.get(cache_key)
    if cached_response:
        logger.info(f"Context-aware cache hit for task type: {task_type}")
        metrics.record_cache_hit()
        return f"{cached_response}\n\n*[Cached Response - Context-Aware]*"

    # Cache miss
    metrics.record_cache_miss()

    # Get fresh response with context
    response = route_to_specialist(request, task_type, context)

    # Cache if successful (consider context in caching decision)
    should_cache = "not available" not in response.lower()
    
    # Don't cache sensitive responses
    if context and isinstance(context, dict):
        security_level = context.get("execution_metadata", {}).get("security_level", "public")
        if security_level in ["confidential", "secret"]:
            should_cache = False
            logger.info("Skipping cache for sensitive response")

    if should_cache:
        orchestrator_cache.set(cache_key, response)

    return response


def get_orchestrator_stats() -> str:
    """
    Get current orchestrator statistics as a formatted report.

    Returns:
        Formatted statistics report
    """
    metrics = get_orchestrator_metrics()
    summary = metrics.get_summary()
    distribution = metrics.get_specialist_distribution()

    report = f"""## Orchestrator Performance Metrics

### Overview
- **Total Requests**: {summary['total_requests']}
- **Average Response Time**: {summary['average_response_time']}s
- **Most Used Specialist**: {summary['most_used_specialist']}
- **Most Common Task**: {summary['most_common_task']}
- **Security Escalation Rate**: {summary['security_escalation_rate']:.1f}%
- **Cache Hit Rate**: {summary['cache_hit_rate']}%
- **Error Count**: {summary['error_count']}
- **Uptime**: {summary['uptime_hours']} hours

### Specialist Distribution
"""

    for specialist, percentage in distribution.items():
        report += f"- **{specialist}**: {percentage}%\n"

    # Add cache stats
    cache_stats = orchestrator_cache.get_stats()
    report += f"\n### Cache Performance\n"
    report += f"- **Cache Size**: {cache_stats['size']}/{orchestrator_cache.max_size}\n"
    report += f"- **Hit Rate**: {cache_stats['hit_rate']:.1f}%\n"

    return report


# Export the enhanced orchestrator and utilities
__all__ = [
    "enhanced_orchestrator",
    "route_to_specialist",
    "analyze_and_route",
    "orchestrator_cache",
    "cached_route_to_specialist",
    "get_orchestrator_stats",
]
