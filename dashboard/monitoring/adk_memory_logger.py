"""
ADK Memory Logging and Debugging Utilities

This module provides comprehensive logging for ADK memory operations,
session state debugging, trace logging, and troubleshooting utilities.
"""

import datetime
import json
import logging
import os
import threading
import traceback
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class ADKMemoryOperation:
    """Data class for ADK memory operation logging."""

    timestamp: str
    operation_type: str  # query, store, session_create, session_update, etc.
    operation_id: str
    user_id: Optional[str]
    session_id: Optional[str]
    query_text: Optional[str]
    result_count: Optional[int]
    latency_ms: float
    success: bool
    error_message: Optional[str]
    memory_usage_mb: Optional[float]
    cost_estimate_usd: Optional[float]
    metadata: Dict[str, Any]


@dataclass
class ADKSessionStateEvent:
    """Data class for session state events."""

    timestamp: str
    event_type: str  # create, update, persist, restore, delete
    session_id: str
    user_id: str
    state_size_mb: float
    state_keys: List[str]
    persistence_success: bool
    error_message: Optional[str]
    metadata: Dict[str, Any]


class ADKMemoryLogger:
    """Thread-safe logger for ADK memory operations and debugging."""

    def __init__(self, log_dir: str = "logs/adk_memory"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Setup file handlers
        self.operations_log = self.log_dir / "operations.jsonl"
        self.session_log = self.log_dir / "sessions.jsonl"
        self.trace_log = self.log_dir / "traces.jsonl"
        self.error_log = self.log_dir / "errors.jsonl"

        # Setup structured logger
        self.setup_structured_logging()

        # Operation tracking with thread safety
        self.active_operations = {}
        self.session_states = {}

        # Thread safety locks
        self._operations_lock = threading.RLock()
        self._session_lock = threading.RLock()

    def setup_structured_logging(self):
        """Setup structured logging for ADK memory operations."""
        # Create formatters
        json_formatter = logging.Formatter(
            '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": %(message)s}'
        )

        # Create file handlers
        operations_handler = logging.FileHandler(self.operations_log)
        operations_handler.setFormatter(json_formatter)
        operations_handler.setLevel(logging.INFO)

        session_handler = logging.FileHandler(self.session_log)
        session_handler.setFormatter(json_formatter)
        session_handler.setLevel(logging.INFO)

        trace_handler = logging.FileHandler(self.trace_log)
        trace_handler.setFormatter(json_formatter)
        trace_handler.setLevel(logging.DEBUG)

        error_handler = logging.FileHandler(self.error_log)
        error_handler.setFormatter(json_formatter)
        error_handler.setLevel(logging.ERROR)

        # Create loggers
        self.operations_logger = logging.getLogger("adk_memory.operations")
        self.operations_logger.addHandler(operations_handler)
        self.operations_logger.setLevel(logging.INFO)

        self.session_logger = logging.getLogger("adk_memory.sessions")
        self.session_logger.addHandler(session_handler)
        self.session_logger.setLevel(logging.INFO)

        self.trace_logger = logging.getLogger("adk_memory.trace")
        self.trace_logger.addHandler(trace_handler)
        self.trace_logger.setLevel(logging.DEBUG)

        self.error_logger = logging.getLogger("adk_memory.errors")
        self.error_logger.addHandler(error_handler)
        self.error_logger.setLevel(logging.ERROR)

    def log_memory_operation(self, operation: ADKMemoryOperation):
        """Log a memory operation."""
        try:
            operation_data = asdict(operation)
            self.operations_logger.info(json.dumps(operation_data))

            # Also log to trace for debugging
            self.trace_logger.debug(f"Memory operation: {operation.operation_type} - {operation.operation_id}")

        except Exception as e:
            logger.error(f"Error logging memory operation: {e}")

    def log_session_event(self, event: ADKSessionStateEvent):
        """Log a session state event with thread safety."""
        try:
            event_data = asdict(event)
            self.session_logger.info(json.dumps(event_data))

            # Thread-safe update of session state tracking
            with self._session_lock:
                self.session_states[event.session_id] = {
                    "last_event": event.timestamp,
                    "event_type": event.event_type,
                    "state_size_mb": event.state_size_mb,
                    "user_id": event.user_id,
                }

            # Also log to trace
            self.trace_logger.debug(f"Session event: {event.event_type} - {event.session_id}")

        except Exception as e:
            logger.error(f"Error logging session event: {e}")

    def log_error(self, error_type: str, error_message: str, context: Optional[Dict[str, Any]] = None):
        """Log an error with context."""
        try:
            error_data = {
                "timestamp": datetime.datetime.now().isoformat(),
                "error_type": error_type,
                "error_message": error_message,
                "context": context or {},
                "traceback": traceback.format_exc(),
            }

            self.error_logger.error(json.dumps(error_data))

        except Exception as e:
            logger.error(f"Error logging error: {e}")

    def start_operation_trace(self, operation_id: str, operation_type: str, context: Optional[Dict[str, Any]] = None):
        """Start tracing an operation with thread safety."""
        try:
            trace_data = {
                "operation_id": operation_id,
                "operation_type": operation_type,
                "start_time": datetime.datetime.now().isoformat(),
                "context": context or {},
            }

            with self._operations_lock:
                self.active_operations[operation_id] = trace_data

            self.trace_logger.debug(f"Started operation trace: {operation_id} - {operation_type}")

        except Exception as e:
            logger.error(f"Error starting operation trace: {e}")

    def end_operation_trace(self, operation_id: str, success: bool = True, result: Optional[Dict[str, Any]] = None):
        """End tracing an operation with thread safety."""
        try:
            with self._operations_lock:
                if operation_id not in self.active_operations:
                    logger.warning(f"Operation trace not found: {operation_id}")
                    return

                trace_data = self.active_operations[operation_id]
                end_time = datetime.datetime.now()
                start_time = datetime.datetime.fromisoformat(trace_data["start_time"])
                duration_ms = (end_time - start_time).total_seconds() * 1000

                trace_data.update(
                    {
                        "end_time": end_time.isoformat(),
                        "duration_ms": duration_ms,
                        "success": success,
                        "result": result or {},
                    }
                )

                self.trace_logger.debug(f"Completed operation trace: {operation_id} - {duration_ms:.1f}ms")

                # Remove from active operations
                del self.active_operations[operation_id]

        except Exception as e:
            logger.error(f"Error ending operation trace: {e}")

    def get_operation_logs(self, hours: int = 24, operation_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get operation logs for analysis."""
        try:
            cutoff_time = datetime.datetime.now() - datetime.timedelta(hours=hours)
            operations = []

            if self.operations_log.exists():
                with open(self.operations_log, "r") as f:
                    for line in f:
                        try:
                            log_entry = json.loads(line)
                            # Parse the message field which contains the actual operation data
                            if "message" in log_entry:
                                operation_data = json.loads(log_entry["message"])
                                operation_time = datetime.datetime.fromisoformat(operation_data["timestamp"])

                                if operation_time >= cutoff_time:
                                    if operation_type is None or operation_data.get("operation_type") == operation_type:
                                        operations.append(operation_data)
                        except (json.JSONDecodeError, KeyError, ValueError):
                            continue

            return sorted(operations, key=lambda x: x["timestamp"], reverse=True)

        except Exception as e:
            logger.error(f"Error getting operation logs: {e}")
            return []

    def get_session_logs(self, hours: int = 24, session_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get session logs for analysis."""
        try:
            cutoff_time = datetime.datetime.now() - datetime.timedelta(hours=hours)
            sessions = []

            if self.session_log.exists():
                with open(self.session_log, "r") as f:
                    for line in f:
                        try:
                            log_entry = json.loads(line)
                            if "message" in log_entry:
                                session_data = json.loads(log_entry["message"])
                                session_time = datetime.datetime.fromisoformat(session_data["timestamp"])

                                if session_time >= cutoff_time:
                                    if session_id is None or session_data.get("session_id") == session_id:
                                        sessions.append(session_data)
                        except (json.JSONDecodeError, KeyError, ValueError):
                            continue

            return sorted(sessions, key=lambda x: x["timestamp"], reverse=True)

        except Exception as e:
            logger.error(f"Error getting session logs: {e}")
            return []

    def get_error_logs(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get error logs for troubleshooting."""
        try:
            cutoff_time = datetime.datetime.now() - datetime.timedelta(hours=hours)
            errors = []

            if self.error_log.exists():
                with open(self.error_log, "r") as f:
                    for line in f:
                        try:
                            log_entry = json.loads(line)
                            if "message" in log_entry:
                                error_data = json.loads(log_entry["message"])
                                error_time = datetime.datetime.fromisoformat(error_data["timestamp"])

                                if error_time >= cutoff_time:
                                    errors.append(error_data)
                        except (json.JSONDecodeError, KeyError, ValueError):
                            continue

            return sorted(errors, key=lambda x: x["timestamp"], reverse=True)

        except Exception as e:
            logger.error(f"Error getting error logs: {e}")
            return []

    def analyze_performance(self, hours: int = 24) -> Dict[str, Any]:
        """Analyze performance from logs."""
        try:
            operations = self.get_operation_logs(hours)

            if not operations:
                return {"error": "No operation data available"}

            # Calculate metrics
            total_operations = len(operations)
            successful_operations = sum(1 for op in operations if op.get("success", False))
            failed_operations = total_operations - successful_operations

            latencies = [op.get("latency_ms", 0) for op in operations if op.get("latency_ms")]
            avg_latency = sum(latencies) / len(latencies) if latencies else 0

            # Group by operation type
            operation_types = {}
            for op in operations:
                op_type = op.get("operation_type", "unknown")
                if op_type not in operation_types:
                    operation_types[op_type] = {"count": 0, "success_count": 0, "total_latency": 0, "total_cost": 0}

                operation_types[op_type]["count"] += 1
                if op.get("success", False):
                    operation_types[op_type]["success_count"] += 1
                operation_types[op_type]["total_latency"] += op.get("latency_ms", 0)
                operation_types[op_type]["total_cost"] += op.get("cost_estimate_usd", 0)

            # Calculate averages for each operation type
            for op_type, stats in operation_types.items():
                stats["success_rate"] = stats["success_count"] / stats["count"] if stats["count"] > 0 else 0
                stats["avg_latency"] = stats["total_latency"] / stats["count"] if stats["count"] > 0 else 0
                stats["avg_cost"] = stats["total_cost"] / stats["count"] if stats["count"] > 0 else 0

            return {
                "analysis_period_hours": hours,
                "total_operations": total_operations,
                "successful_operations": successful_operations,
                "failed_operations": failed_operations,
                "success_rate": successful_operations / total_operations if total_operations > 0 else 0,
                "average_latency_ms": avg_latency,
                "operation_types": operation_types,
                "timestamp": datetime.datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error analyzing performance: {e}")
            return {"error": f"Performance analysis failed: {str(e)}"}

    def analyze_session_health(self, hours: int = 24) -> Dict[str, Any]:
        """Analyze session health from logs."""
        try:
            sessions = self.get_session_logs(hours)

            if not sessions:
                return {"error": "No session data available"}

            # Analyze session events
            session_ids = set()
            event_types = {}
            persistence_failures = 0
            total_state_size = 0

            for session in sessions:
                session_ids.add(session.get("session_id"))

                event_type = session.get("event_type", "unknown")
                if event_type not in event_types:
                    event_types[event_type] = 0
                event_types[event_type] += 1

                if not session.get("persistence_success", True):
                    persistence_failures += 1

                total_state_size += session.get("state_size_mb", 0)

            total_sessions = len(session_ids)
            total_events = len(sessions)
            avg_state_size = total_state_size / total_events if total_events > 0 else 0
            persistence_success_rate = (total_events - persistence_failures) / total_events if total_events > 0 else 0

            return {
                "analysis_period_hours": hours,
                "unique_sessions": total_sessions,
                "total_events": total_events,
                "event_types": event_types,
                "persistence_failures": persistence_failures,
                "persistence_success_rate": persistence_success_rate,
                "average_state_size_mb": avg_state_size,
                "timestamp": datetime.datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Error analyzing session health: {e}")
            return {"error": f"Session health analysis failed: {str(e)}"}

    def get_troubleshooting_report(self) -> Dict[str, Any]:
        """Generate a comprehensive troubleshooting report."""
        try:
            # Get recent errors
            recent_errors = self.get_error_logs(hours=24)

            # Get performance analysis
            performance = self.analyze_performance(hours=24)

            # Get session health
            session_health = self.analyze_session_health(hours=24)

            # Check active operations
            active_ops = len(self.active_operations)

            # Check log file sizes
            log_sizes = {}
            for log_file in [self.operations_log, self.session_log, self.trace_log, self.error_log]:
                if log_file.exists():
                    log_sizes[log_file.name] = log_file.stat().st_size
                else:
                    log_sizes[log_file.name] = 0

            return {
                "timestamp": datetime.datetime.now().isoformat(),
                "recent_errors": {"count": len(recent_errors), "errors": recent_errors[:10]},  # Last 10 errors
                "performance_analysis": performance,
                "session_health_analysis": session_health,
                "active_operations": active_ops,
                "log_file_sizes": log_sizes,
                "log_directory": str(self.log_dir),
                "recommendations": self._generate_recommendations(recent_errors, performance, session_health),
            }

        except Exception as e:
            logger.error(f"Error generating troubleshooting report: {e}")
            return {
                "error": f"Troubleshooting report generation failed: {str(e)}",
                "timestamp": datetime.datetime.now().isoformat(),
            }

    def _generate_recommendations(self, errors: List[Dict], performance: Dict, session_health: Dict) -> List[str]:
        """Generate troubleshooting recommendations."""
        recommendations = []

        # Check error rate
        if len(errors) > 10:
            recommendations.append("High error rate detected. Check error logs for patterns.")

        # Check performance
        if isinstance(performance, dict) and "success_rate" in performance:
            if performance["success_rate"] < 0.95:
                recommendations.append("Low success rate detected. Investigate failed operations.")

            if performance.get("average_latency_ms", 0) > 500:
                recommendations.append("High average latency detected. Check system resources and network.")

        # Check session health
        if isinstance(session_health, dict) and "persistence_success_rate" in session_health:
            if session_health["persistence_success_rate"] < 0.95:
                recommendations.append("Session persistence issues detected. Check session storage.")

        # Check for specific error patterns
        error_types = {}
        for error in errors:
            error_type = error.get("error_type", "unknown")
            error_types[error_type] = error_types.get(error_type, 0) + 1

        for error_type, count in error_types.items():
            if count > 5:
                recommendations.append(f"Frequent {error_type} errors detected. Investigate root cause.")

        if not recommendations:
            recommendations.append("No issues detected. System appears healthy.")

        return recommendations


# Global instance
adk_memory_logger = ADKMemoryLogger()
