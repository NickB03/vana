"""
Enhanced VANA Orchestrator - Phase 3 Integration
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

# Import specialist agents (Phase 3)
try:
    from agents.specialists.architecture_specialist import architecture_specialist
    from agents.specialists.data_science_specialist import data_science_specialist
    from agents.specialists.devops_specialist import devops_specialist
    from agents.specialists.security_specialist import security_specialist

    SPECIALISTS_AVAILABLE = True
    logger = get_logger("vana.enhanced_orchestrator")
    logger.info("✅ All Phase 3 specialists loaded successfully")
except ImportError as e:
    SPECIALISTS_AVAILABLE = False
    logger = get_logger("vana.enhanced_orchestrator")
    logger.error(f"❌ Failed to import specialists: {e}")
    # Fallback - no specialists
    architecture_specialist = None
    data_science_specialist = None
    security_specialist = None
    devops_specialist = None


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


def analyze_and_route(request: str, context: Dict[str, any] = None) -> str:
    """
    Enhanced task analysis and routing with specialist integration.

    Args:
        request: User request to analyze and route
        context: Optional context dictionary

    Returns:
        Analysis and routing result
    """
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
    result = route_to_specialist(request, task_type, context)

    return f"""## Task Analysis & Routing

**Request**: {request}
**Task Type**: {task_type}
**Routed To**: {task_type.replace('_', ' ').title()} Specialist

### Specialist Response:
{result}"""


# Create the enhanced orchestrator
enhanced_orchestrator = LlmAgent(
    name="enhanced_orchestrator",
    model="gemini-2.0-flash",
    description="Enhanced orchestrator with Phase 3 specialist routing",
    instruction="""You are the Enhanced VANA Orchestrator with integrated specialist routing.

YOUR PRIMARY ROLE:
1. Analyze incoming requests to understand their nature
2. Route to appropriate specialists based on task type
3. Coordinate responses and ensure quality

ROUTING PRIORITY:
🔴 SECURITY: Any security-related query gets IMMEDIATE priority routing
🟡 ARCHITECTURE: Code structure, patterns, and design queries
🟢 DATA SCIENCE: Analysis, ML, statistics, and visualization
🔵 DEVOPS: Deployment, infrastructure, CI/CD, and monitoring

ROUTING PROCESS:
1. Use analyze_and_route for intelligent task routing
2. For file operations, use read_file/write_file/list_directory
3. For knowledge queries, use search_knowledge
4. Always provide clear, structured responses

SPECIALIST CAPABILITIES:
- **Architecture**: Design patterns, code structure, refactoring advice
- **Data Science**: Data analysis, ML guidance, statistical insights  
- **Security**: Vulnerability scanning, security best practices, threat analysis
- **DevOps**: CI/CD pipelines, containerization, infrastructure automation

Remember: Security queries always get priority routing due to their critical nature.""",
    tools=[
        FunctionTool(analyze_and_route),  # Primary routing function
        adk_read_file,
        adk_write_file,
        adk_list_directory,
        adk_search_knowledge,
        adk_analyze_task,  # Direct access for fine-grained control
    ],
    # Include specialists as sub-agents if available
    sub_agents=[
        s
        for s in [architecture_specialist, data_science_specialist, security_specialist, devops_specialist]
        if s is not None
    ],
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
    Cached version of route_to_specialist for common queries.

    Args:
        request: User request
        task_type: Type of task
        context: Optional context

    Returns:
        Cached or fresh specialist response
    """
    # Get metrics instance
    metrics = get_orchestrator_metrics()

    # Create cache key
    cache_key = f"{task_type}:{request[:100]}"  # Limit key length

    # Check cache first
    cached_response = orchestrator_cache.get(cache_key)
    if cached_response:
        logger.info(f"Cache hit for task type: {task_type}")
        metrics.record_cache_hit()
        return f"{cached_response}\n\n*[Cached Response]*"

    # Cache miss
    metrics.record_cache_miss()

    # Get fresh response
    response = route_to_specialist(request, task_type, context)

    # Cache if successful
    if "not available" not in response.lower():
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
