"""
Enhanced VANA Orchestrator V2 - Phase 4 Integration
Integrates workflow managers, advanced routing, and performance optimizations
"""

import os
import time
from collections import defaultdict
from functools import lru_cache
from typing import Any, Dict, List, Optional, Tuple

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from agents.workflows.loop_workflow_manager import LoopWorkflowManager
from agents.workflows.parallel_workflow_manager import ParallelWorkflowManager

# Import workflow managers (Phase 4)
from agents.workflows.sequential_workflow_manager import SequentialWorkflowManager
from lib._shared_libraries.orchestrator_metrics import MetricsTimer, get_orchestrator_metrics

# Import Redis caching service
from lib._shared_libraries.redis_cache_service import get_redis_cache, redis_cache

# Import core tools
from lib._tools import adk_analyze_task, adk_list_directory, adk_read_file, adk_search_knowledge, adk_write_file

# Import logging and metrics
from lib.logging_config import get_logger

# Initialize workflow managers
sequential_workflow_manager = SequentialWorkflowManager()
parallel_workflow_manager = ParallelWorkflowManager()
loop_workflow_manager = LoopWorkflowManager()

# Import specialist agents (Phase 3 & 4)
try:
    from agents.specialists.architecture_specialist import architecture_specialist
    from agents.specialists.data_science_specialist import data_science_specialist
    from agents.specialists.devops_specialist import devops_specialist
    from agents.specialists.qa_specialist import qa_specialist
    from agents.specialists.security_specialist import security_specialist
    from agents.specialists.ui_specialist import ui_specialist

    SPECIALISTS_AVAILABLE = True
    logger = get_logger("vana.enhanced_orchestrator_v2")
    logger.info("✅ All Phase 3 & 4 specialists loaded successfully")
except ImportError as e:
    SPECIALISTS_AVAILABLE = False
    logger = get_logger("vana.enhanced_orchestrator_v2")
    logger.error(f"❌ Failed to import specialists: {e}")
    # Fallback - no specialists
    architecture_specialist = None
    data_science_specialist = None
    security_specialist = None
    devops_specialist = None
    qa_specialist = None
    ui_specialist = None


class AdvancedRouter:
    """Advanced routing logic with multi-criteria selection"""

    def __init__(self):
        self.logger = get_logger("vana.advanced_router")
        self.routing_history = defaultdict(list)
        self.specialist_performance = defaultdict(lambda: {"success": 0, "total": 0})

        # Define routing rules with priorities
        self.routing_rules = {
            # Security patterns - HIGHEST PRIORITY (priority=10)
            "security": {
                "keywords": [
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
                ],
                "patterns": ["security_scan", "vulnerability_check", "authentication", "encryption"],
                "specialist": "security",
                "priority": 10,
                "confidence_threshold": 0.3,  # Lower threshold for security
            },
            # Architecture patterns (priority=7)
            "architecture": {
                "keywords": [
                    "architecture",
                    "design",
                    "pattern",
                    "structure",
                    "refactor",
                    "dependency",
                    "coupling",
                    "cohesion",
                    "solid",
                    "clean code",
                    "best practices",
                ],
                "patterns": ["architecture_review", "design_pattern", "code_structure", "refactoring"],
                "specialist": "architecture",
                "priority": 7,
                "confidence_threshold": 0.5,
            },
            # QA patterns (priority=8) - Higher than normal for quality
            "qa": {
                "keywords": [
                    "test",
                    "testing",
                    "quality",
                    "qa",
                    "coverage",
                    "regression",
                    "bug",
                    "performance",
                    "benchmark",
                    "validation",
                    "assertion",
                    "pytest",
                    "unit test",
                ],
                "patterns": ["test_generation", "coverage_analysis", "performance_testing", "bug_detection"],
                "specialist": "qa",
                "priority": 8,
                "confidence_threshold": 0.5,
            },
            # UI/UX patterns (priority=6)
            "ui": {
                "keywords": [
                    "ui",
                    "ux",
                    "user interface",
                    "design",
                    "accessibility",
                    "responsive",
                    "component",
                    "layout",
                    "style",
                    "css",
                    "react",
                    "frontend",
                    "wcag",
                ],
                "patterns": ["ui_design", "accessibility_check", "component_generation", "responsive_design"],
                "specialist": "ui",
                "priority": 6,
                "confidence_threshold": 0.5,
            },
            # Data science patterns (priority=5)
            "data_science": {
                "keywords": [
                    "data",
                    "analysis",
                    "statistics",
                    "machine learning",
                    "ml",
                    "ai",
                    "visualization",
                    "pandas",
                    "numpy",
                    "plot",
                    "correlation",
                    "regression",
                ],
                "patterns": ["data_analysis", "machine_learning", "visualization", "statistics"],
                "specialist": "data_science",
                "priority": 5,
                "confidence_threshold": 0.5,
            },
            # DevOps patterns (priority=6)
            "devops": {
                "keywords": [
                    "deploy",
                    "deployment",
                    "docker",
                    "kubernetes",
                    "ci",
                    "cd",
                    "pipeline",
                    "infrastructure",
                    "monitoring",
                    "container",
                    "cloud",
                    "aws",
                    "gcp",
                ],
                "patterns": ["deployment", "ci_cd", "infrastructure", "monitoring", "containerization"],
                "specialist": "devops",
                "priority": 6,
                "confidence_threshold": 0.5,
            },
        }

        # Workflow detection patterns
        self.workflow_patterns = {
            "sequential": ["then", "after", "next", "followed by", "step by step", "in order"],
            "parallel": ["simultaneously", "concurrently", "at the same time", "in parallel", "together"],
            "loop": ["for each", "iterate", "repeat", "while", "until", "loop through", "process all"],
        }

    def calculate_confidence(self, request: str, rule: Dict[str, Any]) -> float:
        """Calculate confidence score for a routing rule"""
        request_lower = request.lower()
        score = 0.0

        # Keyword matching (40% weight)
        keyword_matches = sum(1 for kw in rule["keywords"] if kw in request_lower)
        keyword_score = min(keyword_matches / 3, 1.0) * 0.4

        # Pattern matching (30% weight)
        pattern_matches = sum(1 for pattern in rule["patterns"] if pattern in request_lower)
        pattern_score = min(pattern_matches / 2, 1.0) * 0.3

        # Historical performance (20% weight)
        specialist = rule["specialist"]
        perf = self.specialist_performance[specialist]
        if perf["total"] > 0:
            success_rate = perf["success"] / perf["total"]
            history_score = success_rate * 0.2
        else:
            history_score = 0.1  # Default score for new specialists

        # Priority bonus (10% weight)
        priority_score = (rule["priority"] / 10) * 0.1

        total_score = keyword_score + pattern_score + history_score + priority_score
        return total_score

    def detect_workflow_type(self, request: str) -> Optional[str]:
        """Detect if request needs a workflow manager"""
        request_lower = request.lower()

        for workflow_type, patterns in self.workflow_patterns.items():
            if any(pattern in request_lower for pattern in patterns):
                return workflow_type

        # Check for multiple tasks (numbered lists, bullet points)
        if any(marker in request for marker in ["1.", "2.", "•", "-", "*"]):
            # Multiple tasks default to sequential
            return "sequential"

        return None

    def route_request(self, request: str, task_type: str, context: Dict[str, Any] = None) -> Tuple[str, str]:
        """
        Route request to appropriate specialist or workflow

        Returns:
            Tuple of (specialist_name, workflow_type)
        """
        # First check for workflow needs
        workflow_type = self.detect_workflow_type(request)

        # Calculate confidence scores for each specialist
        scores = {}
        for category, rule in self.routing_rules.items():
            confidence = self.calculate_confidence(request, rule)
            scores[category] = (confidence, rule["priority"])

        # Sort by confidence * priority
        sorted_specialists = sorted(
            scores.items(), key=lambda x: x[1][0] * x[1][1], reverse=True  # confidence * priority
        )

        # Get best match
        if sorted_specialists:
            best_match, (confidence, priority) = sorted_specialists[0]
            rule = self.routing_rules[best_match]

            # Check confidence threshold
            if confidence >= rule["confidence_threshold"]:
                specialist_name = rule["specialist"]
                self.logger.info(f"Routing to {specialist_name} (confidence: {confidence:.2f}, priority: {priority})")
                return specialist_name, workflow_type

        # Fallback to task_type mapping
        type_mapping = {
            "architecture_review": "architecture",
            "data_analysis": "data_science",
            "security_scan": "security",
            "deployment": "devops",
            "test_generation": "qa",
            "ui_design": "ui",
        }

        specialist = type_mapping.get(task_type, "architecture")  # Default to architecture
        return specialist, workflow_type

    def record_result(self, specialist: str, success: bool):
        """Record routing result for learning"""
        self.specialist_performance[specialist]["total"] += 1
        if success:
            self.specialist_performance[specialist]["success"] += 1


class RequestBatcher:
    """Batch similar requests for efficient processing"""

    def __init__(self, max_batch_size: int = 5, timeout_ms: int = 100):
        self.batches = defaultdict(list)
        self.max_batch_size = max_batch_size
        self.timeout_ms = timeout_ms
        self.last_flush = time.time()

    def add_request(self, request: str, category: str) -> Optional[List[str]]:
        """Add request to batch, return batch if ready"""
        self.batches[category].append(request)

        # Check if batch is ready
        if len(self.batches[category]) >= self.max_batch_size:
            batch = self.batches[category]
            self.batches[category] = []
            return batch

        # Check timeout
        if (time.time() - self.last_flush) * 1000 > self.timeout_ms:
            return self.flush_category(category)

        return None

    def flush_category(self, category: str) -> Optional[List[str]]:
        """Flush all requests for a category"""
        if self.batches[category]:
            batch = self.batches[category]
            self.batches[category] = []
            self.last_flush = time.time()
            return batch
        return None

    def flush_all(self) -> Dict[str, List[str]]:
        """Flush all batches"""
        all_batches = dict(self.batches)
        self.batches.clear()
        self.last_flush = time.time()
        return all_batches


# Initialize components
advanced_router = AdvancedRouter()
request_batcher = RequestBatcher()
redis_cache_service = get_redis_cache()


# Enhanced LRU cache with TTL
@lru_cache(maxsize=256)
def cached_specialist_response(request_hash: int, specialist: str) -> str:
    """Cache decorator for specialist responses"""
    # This is a placeholder - actual implementation would call the specialist
    return f"Cached response for {specialist}"


def route_with_workflow(request: str, context: Dict[str, Any] = None) -> str:
    """
    Enhanced routing with workflow management integration

    Args:
        request: User request
        context: Optional context

    Returns:
        Processed response
    """
    metrics = get_orchestrator_metrics()

    # Check Redis cache first
    cached_response = redis_cache_service.get_orchestrator_response(request, "auto")
    if cached_response:
        logger.info(f"Cache hit for request: {request[:50]}...")
        metrics.record_cache_hit()
        return cached_response["response"]

    # Analyze task
    analysis = adk_analyze_task(request)
    task_type = extract_task_type(analysis)

    # Get routing decision
    specialist_name, workflow_type = advanced_router.route_request(request, task_type, context)

    # Check Redis cache for specialist-specific response
    cached_response = redis_cache_service.get_orchestrator_response(request, specialist_name)
    if cached_response:
        logger.info(f"Cache hit for {specialist_name} request: {request[:50]}...")
        metrics.record_cache_hit()
        return cached_response["response"]

    # Map specialist names to actual agents
    specialist_map = {
        "architecture": architecture_specialist,
        "data_science": data_science_specialist,
        "security": security_specialist,
        "devops": devops_specialist,
        "qa": qa_specialist,
        "ui": ui_specialist,
    }

    specialist = specialist_map.get(specialist_name)

    if not specialist:
        return f"Specialist '{specialist_name}' not available"

    # Handle workflow routing
    if workflow_type:
        logger.info(f"Using {workflow_type} workflow for {specialist_name}")

        if workflow_type == "sequential":
            # Create sequential workflow
            workflow = sequential_workflow_manager.create_sequential_workflow(
                task_chain=[
                    {"agent": specialist, "task": request},
                    {"agent": qa_specialist, "task": "Validate the above work"},
                ],
                workflow_name=f"{specialist_name}_sequential",
            )
            with MetricsTimer(metrics, f"{workflow_type}_workflow", specialist_name):
                result = workflow.run(request, context or {})

        elif workflow_type == "parallel":
            # Create parallel workflow for multi-aspect analysis
            workflow = parallel_workflow_manager.create_parallel_workflow(
                agents=[specialist, qa_specialist], workflow_name=f"{specialist_name}_parallel"
            )
            with MetricsTimer(metrics, f"{workflow_type}_workflow", specialist_name):
                result = workflow.run(request, context or {})

        elif workflow_type == "loop":
            # Create loop workflow for iterative improvement
            def should_continue(step: int, results: List[Any]) -> bool:
                # Continue for 3 iterations or until quality threshold met
                return step < 3

            workflow = loop_workflow_manager.create_loop_workflow(
                specialist,
                loop_type="conditional",
                condition_fn=should_continue,
                workflow_name=f"{specialist_name}_loop",
            )
            with MetricsTimer(metrics, f"{workflow_type}_workflow", specialist_name):
                result = workflow.run(request, context or {})
    else:
        # Direct specialist routing
        with MetricsTimer(metrics, task_type, specialist_name):
            result = specialist.run(request, context or {})

    # Record routing result
    success = "error" not in str(result).lower()
    advanced_router.record_result(specialist_name, success)

    # Format response
    formatted_response = format_response(request, specialist_name, workflow_type, result)

    # Cache the response if successful
    if success:
        # Cache with different TTLs based on specialist
        ttl_map = {
            "security": 600,  # 10 minutes for security (changes frequently)
            "qa": 1800,  # 30 minutes for QA results
            "architecture": 3600,  # 1 hour for architecture analysis
            "data_science": 3600,  # 1 hour for data analysis
            "devops": 1800,  # 30 minutes for DevOps
            "ui": 3600,  # 1 hour for UI analysis
        }

        ttl = ttl_map.get(specialist_name, 3600)
        redis_cache_service.cache_orchestrator_response(request, specialist_name, formatted_response, ttl)
        logger.info(f"Cached response for {specialist_name} (TTL: {ttl}s)")

    return formatted_response


def extract_task_type(analysis: str) -> str:
    """Extract task type from analysis"""
    task_type = "unknown"
    if "task_type:" in analysis.lower():
        for line in analysis.split("\n"):
            if "task_type:" in line.lower():
                task_type = line.split(":")[-1].strip().lower()
                break
    return task_type


def format_response(request: str, specialist: str, workflow: Optional[str], result: str) -> str:
    """Format the response with routing information"""
    workflow_info = f"\n**Workflow**: {workflow.title()} execution" if workflow else ""

    return f"""## Task Analysis & Routing V2

**Request**: {request}
**Routed To**: {specialist.replace('_', ' ').title()} Specialist{workflow_info}

### Response:
{result}

---
*Enhanced Orchestrator V2 with Workflow Management*"""


def batch_process_requests(requests: List[str], category: str) -> List[str]:
    """Process a batch of similar requests"""
    logger.info(f"Batch processing {len(requests)} {category} requests")

    # Get appropriate specialist
    specialist_map = {
        "architecture": architecture_specialist,
        "data_science": data_science_specialist,
        "security": security_specialist,
        "devops": devops_specialist,
        "qa": qa_specialist,
        "ui": ui_specialist,
    }

    specialist = specialist_map.get(category)
    if not specialist:
        return [f"Specialist '{category}' not available" for _ in requests]

    # Process requests in parallel workflow
    workflow = parallel_workflow_manager.create_parallel_workflow(
        agents=[specialist] * len(requests), workflow_name=f"{category}_batch"
    )

    # Combine requests
    combined_request = "\n\n".join([f"Task {i+1}: {req}" for i, req in enumerate(requests)])
    result = workflow.run(combined_request, {})

    # Split results (simplified - in practice would parse properly)
    return [result] * len(requests)


def get_orchestrator_v2_stats() -> str:
    """Get enhanced orchestrator statistics"""
    metrics = get_orchestrator_metrics()
    summary = metrics.get_summary()

    # Get Redis cache stats
    redis_stats = redis_cache_service.get_stats()

    # Add V2-specific stats
    router_stats = {
        "routing_decisions": len(advanced_router.routing_history),
        "specialist_performance": dict(advanced_router.specialist_performance),
        "active_workflows": {"sequential": 0, "parallel": 0, "loop": 0},  # Would track active workflows
    }

    report = f"""## Enhanced Orchestrator V2 Performance Metrics

### Overview
- **Total Requests**: {summary['total_requests']}
- **Average Response Time**: {summary['average_response_time']}s
- **Cache Hit Rate**: {summary['cache_hit_rate']}%
- **Error Rate**: {summary['error_count'] / max(summary['total_requests'], 1) * 100:.1f}%

### Redis Cache Performance
- **Status**: {'✅ Connected' if redis_stats['available'] else '❌ Fallback Mode'}
- **Host**: {redis_stats['host']}:{redis_stats['port']}
"""

    if redis_stats["available"]:
        report += f"""- **Memory Usage**: {redis_stats.get('used_memory', 'N/A')}
- **Connected Clients**: {redis_stats.get('connected_clients', 0)}
- **Commands Processed**: {redis_stats.get('total_commands_processed', 0):,}
- **Cache Hit Rate**: {redis_stats.get('hit_rate', 0):.1f}%
"""
    else:
        report += f"""- **Cached Items**: {redis_stats.get('cached_items', 0)}
- **Mode**: In-memory fallback
"""

    report += f"""
### Routing Intelligence
- **Total Routing Decisions**: {router_stats['routing_decisions']}
- **Multi-Criteria Routing**: Enabled
- **Workflow Detection**: Active

### Specialist Performance
"""

    for specialist, perf in router_stats["specialist_performance"].items():
        if perf["total"] > 0:
            success_rate = perf["success"] / perf["total"] * 100
            report += f"- **{specialist}**: {success_rate:.1f}% success rate ({perf['total']} requests)\n"

    report += "\n### Workflow Usage\n"
    for workflow_type, count in router_stats["active_workflows"].items():
        report += f"- **{workflow_type.title()}**: {count} active\n"

    return report


# Create the Enhanced Orchestrator V2
enhanced_orchestrator_v2 = LlmAgent(
    name="enhanced_orchestrator_v2",
    model="gemini-2.0-flash",
    description="Enhanced orchestrator with workflow management and advanced routing",
    instruction="""You are the Enhanced VANA Orchestrator V2 with integrated workflow management.

YOUR ENHANCED CAPABILITIES:
1. **Multi-Criteria Routing**: Analyze requests using keywords, patterns, history, and priority
2. **Workflow Management**: Automatically detect and use Sequential, Parallel, or Loop workflows
3. **Intelligent Batching**: Group similar requests for efficient processing
4. **Performance Optimization**: LRU caching, request batching, and metric tracking

ROUTING PRIORITIES:
🔴 SECURITY (Priority 10): Immediate routing for any security concerns
🟡 QA/TESTING (Priority 8): High priority for quality assurance
🟢 ARCHITECTURE (Priority 7): Code structure and design patterns
🔵 DEVOPS (Priority 6): Deployment and infrastructure
⚪ UI/UX (Priority 6): User interface and experience
⚫ DATA SCIENCE (Priority 5): Analysis and ML tasks

WORKFLOW DETECTION:
- **Sequential**: Tasks with "then", "after", "followed by"
- **Parallel**: Tasks with "simultaneously", "at the same time"
- **Loop**: Tasks with "for each", "iterate", "repeat"

ADVANCED FEATURES:
1. **Request Batching**: Automatically batch similar requests
2. **Performance Learning**: Track specialist success rates
3. **Confidence Scoring**: Multi-factor routing decisions
4. **Workflow Composition**: Combine specialists in workflows

Use route_with_workflow for intelligent task routing with workflow management.""",
    tools=[
        FunctionTool(route_with_workflow),  # Primary V2 routing
        FunctionTool(get_orchestrator_v2_stats),  # V2 statistics
        adk_read_file,
        adk_write_file,
        adk_list_directory,
        adk_search_knowledge,
        adk_analyze_task,
    ],
)


# Export all V2 components
__all__ = [
    "enhanced_orchestrator_v2",
    "route_with_workflow",
    "advanced_router",
    "request_batcher",
    "batch_process_requests",
    "get_orchestrator_v2_stats",
]
