# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Hook Orchestration System for Claude Code Tool Execution Pipeline

This module provides seamless integration with Claude Code's tool execution pipeline,
intercepting Write, MultiEdit, and Bash operations for validation and security scanning.
"""

import asyncio
import logging
import threading
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List

from .config.hook_config import HookConfig, ValidationLevel
from .feedback.realtime_feedback import RealtimeFeedback
from .monitors.performance_monitor import PerformanceMonitor
from .validators.context_sanitizer import ContextSanitizer
from .validators.enhanced_error_context import EnhancedErrorContextCapture
from .validators.security_scanner import SecurityScanner
from .validators.shell_validator import ShellValidator

logger = logging.getLogger(__name__)


class ToolType(Enum):
    """Supported tool types for interception."""

    WRITE = "write"
    MULTI_EDIT = "multi_edit"
    BASH = "bash"
    READ = "read"
    EDIT = "edit"


class ValidationResult(Enum):
    """Validation result status."""

    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    BYPASSED = "bypassed"
    ERROR = "error"


@dataclass
class ToolCall:
    """Represents a tool call to be validated."""

    tool_type: ToolType
    parameters: dict[str, Any]
    metadata: dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    session_id: str | None = None
    agent_id: str | None = None


@dataclass
class ValidationReport:
    """Comprehensive validation report."""

    tool_call: ToolCall
    validation_result: ValidationResult
    execution_time: float
    validator_results: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    bypassed_validators: list[str] = field(default_factory=list)
    security_score: float = 0.0
    performance_impact: float = 0.0
    recommendations: list[str] = field(default_factory=list)


class HookOrchestrator:
    """
    Main orchestrator for hook system integration with Claude Code tool pipeline.

    Features:
    - Tool call interception and validation
    - Real-time feedback integration
    - Performance monitoring and metrics
    - Dynamic configuration management
    - Graceful error handling and degradation
    """

    def __init__(self, config_path: str | None = None):
        """Initialize the hook orchestrator."""
        self.config = HookConfig.load(config_path)
        self.is_enabled = self.config.enabled
        self.validation_level = self.config.validation_level

        # Initialize validators
        self.context_sanitizer = ContextSanitizer(self.config.context_sanitizer)
        self.shell_validator = ShellValidator(self.config.shell_validator)
        self.security_scanner = SecurityScanner(self.config.security_scanner)
        
        # Initialize enhanced error capture
        self.error_capture = EnhancedErrorContextCapture()

        # Initialize monitoring and feedback
        self.performance_monitor = PerformanceMonitor()
        self.feedback = RealtimeFeedback()

        # Validation pipeline
        self.validators = {
            ToolType.WRITE: [self.context_sanitizer, self.security_scanner],
            ToolType.MULTI_EDIT: [self.context_sanitizer, self.security_scanner],
            ToolType.BASH: [self.shell_validator, self.security_scanner],
            ToolType.READ: [self.context_sanitizer],
            ToolType.EDIT: [self.context_sanitizer, self.security_scanner],
        }
        
        # Enhanced error tracking
        self.error_session_id = f"session_{int(time.time())}"
        self.current_errors = []

        # Metrics storage
        self.validation_metrics = {
            "total_validations": 0,
            "passed_validations": 0,
            "failed_validations": 0,
            "bypassed_validations": 0,
            "average_execution_time": 0.0,
            "validator_performance": {},
            "security_incidents": 0,
            "performance_improvements": 0,
            "typescript_errors": 0,
            "error_reports_generated": 0,
        }

        # Thread safety
        self._lock = threading.RLock()
        
        # Start error cleanup task
        asyncio.create_task(self._periodic_error_cleanup())

        logger.info(
            "Hook orchestrator initialized with validation level: %s",
            self.validation_level.value,
        )

    async def intercept_tool_call(
        self,
        tool_type: str,
        parameters: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> tuple[bool, ValidationReport]:
        """
        Intercept and validate a tool call before execution.

        Args:
            tool_type: Type of tool being called
            parameters: Tool parameters
            metadata: Optional metadata for context

        Returns:
            Tuple of (should_proceed, validation_report)
        """
        if not self.is_enabled:
            return True, self._create_bypassed_report(tool_type, parameters)

        start_time = time.time()

        try:
            # Create tool call object
            tool_call = ToolCall(
                tool_type=ToolType(tool_type.lower()),
                parameters=parameters,
                metadata=metadata or {},
                session_id=metadata.get("session_id") if metadata else None,
                agent_id=metadata.get("agent_id") if metadata else None,
            )

            # Run validation pipeline
            validation_report = await self._run_validation_pipeline(tool_call)

            # Update metrics
            execution_time = time.time() - start_time
            await self._update_metrics(validation_report, execution_time)

            # Capture and analyze errors if validation failed
            if validation_report.validation_result == ValidationResult.FAILED:
                await self._capture_enhanced_errors(tool_call, validation_report)
            
            # Send real-time feedback
            await self.feedback.send_validation_update(validation_report)

            # Determine if execution should proceed
            should_proceed = self._should_proceed(validation_report)

            logger.info(
                "Tool call validation completed: %s -> %s (%.3fs)",
                tool_type,
                validation_report.validation_result.value,
                execution_time,
            )

            return should_proceed, validation_report

        except Exception as e:
            logger.error("Error during tool call validation: %s", str(e))

            # Create error report
            error_report = ValidationReport(
                tool_call=ToolCall(ToolType(tool_type.lower()), parameters),
                validation_result=ValidationResult.ERROR,
                execution_time=time.time() - start_time,
                errors=[f"Validation error: {e!s}"],
            )

            # In case of error, proceed if graceful degradation is enabled
            should_proceed = self.config.graceful_degradation
            return should_proceed, error_report

    async def _run_validation_pipeline(self, tool_call: ToolCall) -> ValidationReport:
        """Run the validation pipeline for a tool call."""
        validators = self.validators.get(tool_call.tool_type, [])

        validation_report = ValidationReport(
            tool_call=tool_call,
            validation_result=ValidationResult.PASSED,
            execution_time=0.0,
        )

        # Skip validation if level is set to NONE
        if self.validation_level == ValidationLevel.NONE:
            validation_report.validation_result = ValidationResult.BYPASSED
            validation_report.bypassed_validators = ["ALL"]
            return validation_report

        # Run validators based on validation level
        validators_to_run = self._filter_validators_by_level(validators)

        start_time = time.time()
        validation_tasks = []

        for validator in validators_to_run:
            if self._should_run_validator(validator, tool_call):
                task = asyncio.create_task(
                    self._run_single_validator(validator, tool_call)
                )
                validation_tasks.append((validator.__class__.__name__, task))

        # Wait for all validators to complete
        validator_results = {}
        for validator_name, task in validation_tasks:
            try:
                result = await task
                validator_results[validator_name] = result

                # Update validation report based on result
                self._process_validator_result(
                    validation_report, validator_name, result
                )

            except Exception as e:
                logger.error("Validator %s failed: %s", validator_name, str(e))
                validation_report.errors.append(f"{validator_name}: {e!s}")

                if self.validation_level == ValidationLevel.STRICT:
                    validation_report.validation_result = ValidationResult.FAILED

        validation_report.execution_time = time.time() - start_time
        validation_report.validator_results = validator_results

        # Calculate overall security score
        validation_report.security_score = self._calculate_security_score(
            validator_results
        )

        return validation_report

    async def _run_single_validator(
        self, validator, tool_call: ToolCall
    ) -> dict[str, Any]:
        """Run a single validator and return its result."""
        try:
            if hasattr(validator, "validate_async"):
                return await validator.validate_async(tool_call)
            else:
                # Run sync validator in thread pool
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, validator.validate, tool_call)
        except Exception as e:
            logger.error("Validator %s error: %s", validator.__class__.__name__, str(e))
            return {"status": "error", "error": str(e), "passed": False}

    def _filter_validators_by_level(self, validators: list) -> list:
        """Filter validators based on current validation level."""
        if self.validation_level == ValidationLevel.BASIC:
            # Only run essential validators
            return [v for v in validators if getattr(v, "essential", False)]
        elif self.validation_level == ValidationLevel.STANDARD:
            # Run most validators except performance-heavy ones
            return [v for v in validators if not getattr(v, "performance_heavy", False)]
        else:  # STRICT
            # Run all validators
            return validators

    def _should_run_validator(self, validator, tool_call: ToolCall) -> bool:
        """Determine if a validator should run for this tool call."""
        # Check if validator is disabled for this tool type
        validator_name = validator.__class__.__name__
        disabled_validators = self.config.disabled_validators.get(
            tool_call.tool_type.value, []
        )

        if validator_name in disabled_validators:
            return False

        # Check bypass conditions
        bypass_conditions = getattr(validator, "bypass_conditions", [])
        for condition in bypass_conditions:
            if condition(tool_call):
                return False

        return True

    def _process_validator_result(
        self, report: ValidationReport, validator_name: str, result: dict[str, Any]
    ):
        """Process a single validator result and update the report."""
        if not result.get("passed", True):
            if result.get("severity", "error") == "warning":
                report.warnings.append(f"{validator_name}: {result.get('message', '')}")
                if report.validation_result == ValidationResult.PASSED:
                    report.validation_result = ValidationResult.WARNING
            else:
                report.errors.append(f"{validator_name}: {result.get('message', '')}")
                report.validation_result = ValidationResult.FAILED

        # Add recommendations
        if "recommendations" in result:
            report.recommendations.extend(result["recommendations"])

    def _calculate_security_score(self, validator_results: dict[str, Any]) -> float:
        """Calculate overall security score from validator results."""
        if not validator_results:
            return 1.0

        total_score = 0.0
        total_weight = 0.0

        for _validator_name, result in validator_results.items():
            weight = result.get("weight", 1.0)
            score = result.get(
                "security_score", 1.0 if result.get("passed", True) else 0.0
            )

            total_score += score * weight
            total_weight += weight

        return total_score / total_weight if total_weight > 0 else 1.0

    def _should_proceed(self, report: ValidationReport) -> bool:
        """Determine if tool execution should proceed based on validation report."""
        if report.validation_result == ValidationResult.BYPASSED:
            return True
        elif report.validation_result == ValidationResult.PASSED:
            return True
        elif report.validation_result == ValidationResult.WARNING:
            return self.config.proceed_on_warnings
        elif report.validation_result == ValidationResult.FAILED:
            return False
        else:  # ERROR
            return self.config.graceful_degradation

    async def _update_metrics(self, report: ValidationReport, execution_time: float):
        """Update validation metrics."""
        with self._lock:
            self.validation_metrics["total_validations"] += 1

            if report.validation_result == ValidationResult.PASSED:
                self.validation_metrics["passed_validations"] += 1
            elif report.validation_result == ValidationResult.FAILED:
                self.validation_metrics["failed_validations"] += 1
            elif report.validation_result == ValidationResult.BYPASSED:
                self.validation_metrics["bypassed_validations"] += 1

            # Update average execution time
            total = self.validation_metrics["total_validations"]
            current_avg = self.validation_metrics["average_execution_time"]
            self.validation_metrics["average_execution_time"] = (
                current_avg * (total - 1) + execution_time
            ) / total

            # Update validator performance metrics
            for validator_name, result in report.validator_results.items():
                if (
                    validator_name
                    not in self.validation_metrics["validator_performance"]
                ):
                    self.validation_metrics["validator_performance"][validator_name] = {
                        "total_runs": 0,
                        "total_time": 0.0,
                        "errors": 0,
                        "average_time": 0.0,
                    }

                perf = self.validation_metrics["validator_performance"][validator_name]
                perf["total_runs"] += 1
                validator_time = result.get("execution_time", 0.0)
                perf["total_time"] += validator_time
                perf["average_time"] = perf["total_time"] / perf["total_runs"]

                if not result.get("passed", True):
                    perf["errors"] += 1

            # Track security incidents
            if report.security_score < 0.7:
                self.validation_metrics["security_incidents"] += 1

    def _create_bypassed_report(
        self, tool_type: str, parameters: dict[str, Any]
    ) -> ValidationReport:
        """Create a validation report for bypassed validation."""
        return ValidationReport(
            tool_call=ToolCall(ToolType(tool_type.lower()), parameters),
            validation_result=ValidationResult.BYPASSED,
            execution_time=0.0,
            bypassed_validators=["ALL - System Disabled"],
        )

    # Configuration Management Methods

    def enable_hooks(self):
        """Enable the hook system."""
        self.is_enabled = True
        logger.info("Hook system enabled")

    def disable_hooks(self):
        """Disable the hook system."""
        self.is_enabled = False
        logger.info("Hook system disabled")

    def set_validation_level(self, level: ValidationLevel):
        """Set the validation level."""
        self.validation_level = level
        self.config.validation_level = level
        logger.info("Validation level set to: %s", level.value)

    def update_config(self, config_updates: dict[str, Any]):
        """Update configuration dynamically."""
        self.config.update(config_updates)
        logger.info("Configuration updated: %s", config_updates.keys())

    # Monitoring and Reporting Methods

    def get_metrics(self) -> dict[str, Any]:
        """Get current validation metrics."""
        with self._lock:
            return self.validation_metrics.copy()

    async def get_realtime_status(self) -> dict[str, Any]:
        """Get real-time system status."""
        return {
            "enabled": self.is_enabled,
            "validation_level": self.validation_level.value,
            "metrics": self.get_metrics(),
            "active_validators": len(
                [v for validators in self.validators.values() for v in validators]
            ),
            "performance_monitor": await self.performance_monitor.get_status(),
            "feedback_system": await self.feedback.get_status(),
        }

    async def generate_report(self, timeframe: str = "24h") -> dict[str, Any]:
        """Generate comprehensive validation report."""
        metrics = self.get_metrics()
        performance_data = await self.performance_monitor.get_performance_report(
            timeframe
        )

        return {
            "timestamp": datetime.now().isoformat(),
            "timeframe": timeframe,
            "summary": {
                "total_validations": metrics["total_validations"],
                "success_rate": (
                    metrics["passed_validations"]
                    / max(metrics["total_validations"], 1)
                    * 100
                ),
                "average_execution_time": metrics["average_execution_time"],
                "security_incidents": metrics["security_incidents"],
            },
            "validator_performance": metrics["validator_performance"],
            "performance_impact": performance_data,
            "recommendations": self._generate_recommendations(metrics),
        }

    def _generate_recommendations(self, metrics: dict[str, Any]) -> list[str]:
        """Generate recommendations based on metrics."""
        recommendations = []

        total_validations = metrics["total_validations"]
        if total_validations == 0:
            return ["No validations performed yet"]

        success_rate = metrics["passed_validations"] / total_validations * 100

        if success_rate < 80:
            recommendations.append(
                "Low success rate detected. Consider reviewing validation rules."
            )

        if metrics["average_execution_time"] > 0.5:
            recommendations.append(
                "High validation overhead detected. Consider optimizing validators."
            )

        if metrics["security_incidents"] > 0:
            recommendations.append(
                f"Security incidents detected: {metrics['security_incidents']}. "
                "Review security policies."
            )

        # Validator-specific recommendations
        for validator_name, perf in metrics["validator_performance"].items():
            if perf["errors"] / max(perf["total_runs"], 1) > 0.1:
                recommendations.append(
                    f"High error rate for {validator_name}. Consider investigation."
                )

        return recommendations
    
    async def _capture_enhanced_errors(
        self,
        tool_call: ToolCall,
        validation_report: ValidationReport
    ) -> None:
        """Capture enhanced error context for failed validations."""
        try:
            # For file operations, capture TypeScript errors
            if tool_call.tool_type in [ToolType.WRITE, ToolType.MULTI_EDIT, ToolType.EDIT]:
                file_path = tool_call.parameters.get("file_path")
                if file_path and (file_path.endswith(".ts") or file_path.endswith(".tsx")):
                    # Capture TypeScript errors for this file
                    error_contexts = await self.error_capture.capture_typescript_errors()
                    
                    if error_contexts:
                        self.current_errors.extend(error_contexts)
                        self.validation_metrics["typescript_errors"] += len(error_contexts)
                        
                        # Generate enhanced report
                        enhanced_report = await self.error_capture.generate_comprehensive_report(
                            self.error_session_id,
                            error_contexts
                        )
                        
                        self.validation_metrics["error_reports_generated"] += 1
                        
                        # Add enhanced error context to validation report
                        validation_report.recommendations.extend([
                            "🔍 Enhanced Error Analysis Available",
                            f"Found {len(error_contexts)} TypeScript compilation errors",
                            f"Estimated resolution time: {enhanced_report.resolution_time_estimate}",
                            "Run enhanced error capture for detailed fixing instructions"
                        ])
                        
                        logger.info(
                            f"Captured {len(error_contexts)} enhanced errors for {file_path}"
                        )
        
        except Exception as e:
            logger.error(f"Failed to capture enhanced errors: {e}")
    
    async def _periodic_error_cleanup(self) -> None:
        """Periodically clean up old error reports."""
        while True:
            try:
                await asyncio.sleep(3600)  # Run every hour
                cleaned_count = await self.error_capture.cleanup_old_error_reports()
                if cleaned_count > 0:
                    logger.info(f"Cleaned up {cleaned_count} old error reports")
            except Exception as e:
                logger.error(f"Error during periodic cleanup: {e}")
                await asyncio.sleep(3600)  # Wait an hour before retrying
    
    async def get_sparc_error_summary(self) -> Dict[str, Any]:
        """Get SPARC-optimized error summary."""
        try:
            return await self.error_capture.get_error_summary_for_sparc(self.error_session_id)
        except Exception as e:
            logger.error(f"Failed to get SPARC error summary: {e}")
            return {"error": "Failed to generate error summary", "details": str(e)}
    
    async def capture_current_typescript_errors(self) -> List[Any]:
        """Capture current TypeScript errors for immediate analysis."""
        try:
            return await self.error_capture.capture_typescript_errors()
        except Exception as e:
            logger.error(f"Failed to capture TypeScript errors: {e}")
            return []
    
    async def generate_actionable_error_report(self) -> Dict[str, Any]:
        """Generate an actionable error report for SPARC agents."""
        try:
            # Capture latest TypeScript errors
            error_contexts = await self.error_capture.capture_typescript_errors()
            
            if not error_contexts:
                return {
                    "status": "no_errors",
                    "message": "No TypeScript compilation errors found",
                    "sparc_actions": ["Task('Validation Complete', 'All validations passed', 'validator')"]
                }
            
            # Generate comprehensive report
            report = await self.error_capture.generate_comprehensive_report(
                f"actionable_{int(time.time())}",
                error_contexts
            )
            
            # Format for SPARC agents
            actionable_report = {
                "status": "errors_found",
                "total_errors": report.total_errors,
                "critical_errors": report.errors_by_severity.get("critical", 0),
                "compilation_blocked": not report.compilation_successful,
                "resolution_time_estimate": report.resolution_time_estimate,
                "actionable_summary": report.actionable_summary,
                "next_steps": report.next_steps,
                "sparc_command_sequence": self.error_capture._generate_sparc_command_sequence(error_contexts),
                "priority_files": self.error_capture._get_priority_files(error_contexts),
                "error_categories": report.errors_by_category,
                "dependency_issues": report.dependency_issues,
                "timestamp": report.timestamp.isoformat()
            }
            
            self.validation_metrics["error_reports_generated"] += 1
            
            return actionable_report
            
        except Exception as e:
            logger.error(f"Failed to generate actionable error report: {e}")
            return {
                "status": "error",
                "message": "Failed to generate error report",
                "error": str(e)
            }

    # Context manager for temporary configuration changes

    @asynccontextmanager
    async def temporary_config(self, **config_changes):
        """Temporarily modify configuration."""
        original_config = {}

        # Store original values
        for key, value in config_changes.items():
            if hasattr(self, key):
                original_config[key] = getattr(self, key)
                setattr(self, key, value)

        try:
            yield
        finally:
            # Restore original values
            for key, value in original_config.items():
                setattr(self, key, value)


# Global orchestrator instance
_global_orchestrator: HookOrchestrator | None = None


def get_orchestrator(config_path: str | None = None) -> HookOrchestrator:
    """Get or create the global hook orchestrator instance."""
    global _global_orchestrator

    if _global_orchestrator is None:
        _global_orchestrator = HookOrchestrator(config_path)

    return _global_orchestrator


def reset_orchestrator():
    """Reset the global orchestrator instance (for testing)."""
    global _global_orchestrator
    _global_orchestrator = None


# Convenience functions for tool interception


async def intercept_write(
    file_path: str, content: str, **metadata
) -> tuple[bool, ValidationReport]:
    """Intercept Write tool call."""
    orchestrator = get_orchestrator()
    return await orchestrator.intercept_tool_call(
        "write", {"file_path": file_path, "content": content}, metadata
    )


async def intercept_multi_edit(
    file_path: str, edits: list[dict], **metadata
) -> tuple[bool, ValidationReport]:
    """Intercept MultiEdit tool call."""
    orchestrator = get_orchestrator()
    return await orchestrator.intercept_tool_call(
        "multi_edit", {"file_path": file_path, "edits": edits}, metadata
    )


async def intercept_bash(command: str, **metadata) -> tuple[bool, ValidationReport]:
    """Intercept Bash tool call."""
    orchestrator = get_orchestrator()
    return await orchestrator.intercept_tool_call(
        "bash", {"command": command}, metadata
    )
