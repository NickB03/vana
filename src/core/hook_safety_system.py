#!/usr/bin/env python3
"""
Hook Safety and Rollback System
================================

Comprehensive safety and rollback mechanisms for the hook validation system.
Provides emergency bypass, graduated enforcement, health monitoring, and alerting.

Features:
- Emergency bypass system with multiple codes
- Graduated enforcement (monitor → warn → enforce)
- Real-time health monitoring
- Automated rollback procedures
- Comprehensive alerting system
- Configuration management
"""

import asyncio
import hashlib
import json
import logging
import threading
import time
import traceback
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any

import psutil


class EnforcementLevel(Enum):
    """Hook enforcement levels for graduated enforcement"""

    MONITOR = "monitor"  # Log only, no blocking
    WARN = "warn"  # Log warnings, no blocking
    SOFT = "soft"  # Block with override option
    ENFORCE = "enforce"  # Full blocking enforcement
    EMERGENCY = "emergency"  # Emergency mode - bypass all


class HealthStatus(Enum):
    """System health status levels"""

    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILING = "failing"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


@dataclass
class BypassCode:
    """Emergency bypass code configuration"""

    code: str
    purpose: str
    expiry: datetime | None
    max_uses: int
    uses_remaining: int
    created_by: str
    reason: str


@dataclass
class SafetyMetrics:
    """Safety system performance metrics"""

    timestamp: datetime
    hook_execution_time_ms: float
    memory_usage_mb: float
    cpu_usage_percent: float
    error_count: int
    warning_count: int
    bypass_count: int
    enforcement_level: EnforcementLevel
    health_status: HealthStatus


@dataclass
class AlertRule:
    """Alert rule configuration"""

    name: str
    condition: str
    threshold: float
    duration_minutes: int
    severity: str
    enabled: bool
    cooldown_minutes: int = 30


class HookSafetySystem:
    """Comprehensive safety and rollback system for hooks"""

    def __init__(self, config_path: str | None = None):
        if config_path:
            self.config_path = Path(config_path)
        else:
            self.config_path = (
                Path.cwd() / ".claude_workspace" / "hook-safety-config.json"
            )
        self.metrics_path = (
            Path.cwd() / ".claude_workspace" / "hook-safety-metrics.json"
        )
        self.alerts_path = Path.cwd() / ".claude_workspace" / "hook-safety-alerts.json"

        # Setup logging first
        self._setup_logging()

        # Core state
        self.config = self._load_config()
        self.bypass_codes = self._load_bypass_codes()
        self.metrics_history = []
        self.active_alerts = []
        self.enforcement_level = EnforcementLevel(
            self.config.get("enforcement_level", "enforce")
        )
        self.health_status = HealthStatus.HEALTHY

        # Monitoring
        self.monitoring_thread = None
        self.monitoring_active = False
        self.last_health_check = datetime.now()

        # Rollback state
        self.rollback_stack = []
        self.emergency_mode = False

        # Initialize monitoring
        self.start_monitoring()

    def _setup_logging(self):
        """Setup comprehensive logging"""
        try:
            log_dir = Path.cwd() / ".claude_workspace" / "logs"
            log_dir.mkdir(parents=True, exist_ok=True)

            # Safety system logger
            self.logger = logging.getLogger("hook_safety")
            self.logger.setLevel(logging.INFO)

            # File handler
            file_handler = logging.FileHandler(log_dir / "hook-safety.log")
            file_handler.setLevel(logging.INFO)

            # Console handler for emergency situations
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.WARNING)

            # Formatter
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            file_handler.setFormatter(formatter)
            console_handler.setFormatter(formatter)

            self.logger.addHandler(file_handler)
            self.logger.addHandler(console_handler)
        except Exception as e:
            # Fallback to basic logging
            self.logger = logging.getLogger("hook_safety")
            print(f"Warning: Failed to setup logging: {e}")

    def _load_config(self) -> dict[str, Any]:
        """Load safety system configuration"""
        default_config = {
            "enforcement_level": "enforce",
            "health_check_interval_seconds": 30,
            "metrics_retention_hours": 24,
            "auto_rollback_enabled": True,
            "emergency_threshold_error_rate": 0.5,
            "emergency_threshold_duration_minutes": 5,
            "graduated_enforcement": {
                "enabled": True,
                "escalation_delay_minutes": 10,
                "degradation_threshold": 0.3,
                "recovery_threshold": 0.1,
            },
            "alert_rules": [
                {
                    "name": "high_error_rate",
                    "condition": "error_rate > threshold",
                    "threshold": 0.2,
                    "duration_minutes": 5,
                    "severity": "warning",
                    "enabled": True,
                },
                {
                    "name": "critical_error_rate",
                    "condition": "error_rate > threshold",
                    "threshold": 0.5,
                    "duration_minutes": 2,
                    "severity": "critical",
                    "enabled": True,
                },
                {
                    "name": "high_memory_usage",
                    "condition": "memory_usage_mb > threshold",
                    "threshold": 500.0,
                    "duration_minutes": 10,
                    "severity": "warning",
                    "enabled": True,
                },
                {
                    "name": "slow_hook_execution",
                    "condition": "avg_execution_time_ms > threshold",
                    "threshold": 5000.0,
                    "duration_minutes": 5,
                    "severity": "warning",
                    "enabled": True,
                },
            ],
        }

        try:
            if self.config_path.exists():
                with open(self.config_path) as f:
                    config = json.load(f)
                    # Merge with defaults
                    for key, value in default_config.items():
                        if key not in config:
                            config[key] = value
                    return config
            else:
                self._save_config(default_config)
                return default_config
        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")
            return default_config

    def _save_config(self, config: dict[str, Any]):
        """Save configuration to file"""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w") as f:
                json.dump(config, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Failed to save config: {e}")

    def _load_bypass_codes(self) -> dict[str, BypassCode]:
        """Load emergency bypass codes"""
        codes_path = self.config_path.parent / "bypass-codes.json"

        try:
            if codes_path.exists():
                with open(codes_path) as f:
                    codes_data = json.load(f)
                    codes = {}
                    for code_id, data in codes_data.items():
                        if data.get("expiry"):
                            data["expiry"] = datetime.fromisoformat(data["expiry"])
                        codes[code_id] = BypassCode(**data)
                    return codes
        except Exception as e:
            self.logger.error(f"Failed to load bypass codes: {e}")

        # Generate default emergency bypass codes
        return self._generate_default_bypass_codes()

    def _generate_default_bypass_codes(self) -> dict[str, BypassCode]:
        """Generate default emergency bypass codes"""
        codes = {}

        # Emergency bypass code
        emergency_code = hashlib.sha256(
            f"emergency_{int(time.time())}".encode()
        ).hexdigest()[:12]
        codes["emergency"] = BypassCode(
            code=emergency_code,
            purpose="Emergency system bypass for critical issues",
            expiry=datetime.now() + timedelta(days=7),
            max_uses=10,
            uses_remaining=10,
            created_by="system",
            reason="Default emergency bypass",
        )

        # Hotfix bypass code
        hotfix_code = hashlib.sha256(f"hotfix_{int(time.time())}".encode()).hexdigest()[
            :12
        ]
        codes["hotfix"] = BypassCode(
            code=hotfix_code,
            purpose="Hotfix deployment bypass",
            expiry=datetime.now() + timedelta(hours=24),
            max_uses=5,
            uses_remaining=5,
            created_by="system",
            reason="Default hotfix bypass",
        )

        # Maintenance bypass code
        maintenance_code = hashlib.sha256(
            f"maintenance_{int(time.time())}".encode()
        ).hexdigest()[:12]
        codes["maintenance"] = BypassCode(
            code=maintenance_code,
            purpose="Maintenance window bypass",
            expiry=datetime.now() + timedelta(hours=12),
            max_uses=20,
            uses_remaining=20,
            created_by="system",
            reason="Default maintenance bypass",
        )

        self._save_bypass_codes(codes)
        return codes

    def _save_bypass_codes(self, codes: dict[str, BypassCode]):
        """Save bypass codes to file"""
        codes_path = self.config_path.parent / "bypass-codes.json"

        try:
            codes_data = {}
            for code_id, code in codes.items():
                codes_data[code_id] = asdict(code)

            with open(codes_path, "w") as f:
                json.dump(codes_data, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Failed to save bypass codes: {e}")

    async def validate_operation(
        self, operation: str, file_path: str, content: str | None = None
    ) -> dict[str, Any]:
        """
        Main validation entry point with safety checks

        Returns:
            Dict containing validation result with safety metadata
        """
        start_time = time.time()

        try:
            # Check for emergency mode
            if self.emergency_mode:
                return self._emergency_bypass_result(
                    operation, file_path, "Emergency mode active"
                )

            # Check enforcement level
            if self.enforcement_level == EnforcementLevel.EMERGENCY:
                return self._emergency_bypass_result(
                    operation, file_path, "Emergency enforcement level"
                )

            # Health check
            if not self._is_system_healthy():
                return await self._handle_unhealthy_system(operation, file_path)

            # Perform validation based on enforcement level
            result = await self._perform_validation(operation, file_path, content)

            # Record metrics
            execution_time = (time.time() - start_time) * 1000
            await self._record_metrics(execution_time, result)

            # Check for auto-rollback conditions
            if self.config.get("auto_rollback_enabled", True):
                await self._check_rollback_conditions()

            return result

        except Exception as e:
            self.logger.error(f"Validation error: {e}")
            self.logger.error(traceback.format_exc())

            # Record error metrics
            execution_time = (time.time() - start_time) * 1000
            await self._record_metrics(execution_time, {"error": str(e)})

            # Return safe default based on enforcement level
            return self._safe_default_result(operation, file_path, str(e))

    async def _perform_validation(
        self, operation: str, file_path: str, content: str
    ) -> dict[str, Any]:
        """Perform actual validation with enforcement level consideration"""

        # Mock validation for now - replace with actual hook validation
        validation_result = {
            "validated": True,
            "violations": [],
            "warnings": [],
            "suggestions": [],
            "compliance_score": 95,
            "operation": operation,
            "file_path": file_path,
            "timestamp": datetime.now().isoformat(),
            "enforcement_level": self.enforcement_level.value,
            "safety_metadata": {
                "health_status": self.health_status.value,
                "bypass_available": len(self.bypass_codes) > 0,
                "monitoring_active": self.monitoring_active,
            },
        }

        # Apply enforcement level logic
        if self.enforcement_level == EnforcementLevel.MONITOR:
            # Log only, always allow
            validation_result["validated"] = True
            validation_result["safety_metadata"]["enforcement_action"] = "monitor_only"

        elif self.enforcement_level == EnforcementLevel.WARN:
            # Warn but allow
            validation_result["validated"] = True
            if validation_result["violations"]:
                validation_result["warnings"].extend(validation_result["violations"])
                validation_result["violations"] = []
            validation_result["safety_metadata"]["enforcement_action"] = "warn_only"

        elif self.enforcement_level == EnforcementLevel.SOFT:
            # Allow with override option
            if validation_result["violations"]:
                validation_result["safety_metadata"]["override_available"] = True
                validation_result["safety_metadata"]["override_codes"] = list(
                    self.bypass_codes.keys()
                )
            validation_result["safety_metadata"]["enforcement_action"] = "soft_enforce"

        elif self.enforcement_level == EnforcementLevel.ENFORCE:
            # Full enforcement
            validation_result["safety_metadata"]["enforcement_action"] = "full_enforce"

        return validation_result

    def _emergency_bypass_result(
        self, operation: str, file_path: str, reason: str
    ) -> dict[str, Any]:
        """Generate emergency bypass result"""
        return {
            "validated": True,
            "bypassed": True,
            "bypass_reason": reason,
            "bypass_type": "emergency",
            "operation": operation,
            "file_path": file_path,
            "timestamp": datetime.now().isoformat(),
            "warnings": [f"⚠️ EMERGENCY BYPASS ACTIVE: {reason}"],
            "suggestions": [
                "Contact system administrator to resolve emergency conditions"
            ],
            "safety_metadata": {
                "emergency_mode": True,
                "enforcement_level": self.enforcement_level.value,
                "health_status": self.health_status.value,
            },
        }

    def _safe_default_result(
        self, operation: str, file_path: str, error: str
    ) -> dict[str, Any]:
        """Generate safe default result for errors"""
        # Default to allowing operation in case of safety system failure
        return {
            "validated": True,
            "safety_system_error": True,
            "error": error,
            "operation": operation,
            "file_path": file_path,
            "timestamp": datetime.now().isoformat(),
            "warnings": [f"⚠️ Safety system error: {error}"],
            "suggestions": ["Check safety system logs and configuration"],
            "safety_metadata": {
                "safe_default": True,
                "enforcement_level": self.enforcement_level.value,
                "health_status": self.health_status.value,
            },
        }

    async def _handle_unhealthy_system(
        self, operation: str, file_path: str
    ) -> dict[str, Any]:
        """Handle validation when system is unhealthy"""
        if self.health_status in [HealthStatus.CRITICAL, HealthStatus.EMERGENCY]:
            # Auto-rollback or emergency mode
            await self._trigger_emergency_mode("System health critical")
            return self._emergency_bypass_result(
                operation, file_path, "System health critical"
            )

        elif self.health_status == HealthStatus.FAILING:
            # Degraded enforcement
            self._degrade_enforcement_level()
            return await self._perform_validation(operation, file_path, None)

        else:
            # Continue with validation but add health warnings
            result = await self._perform_validation(operation, file_path, None)
            result["warnings"].append(
                f"⚠️ System health degraded: {self.health_status.value}"
            )
            return result

    def use_bypass_code(self, code: str, reason: str) -> dict[str, Any]:
        """Use an emergency bypass code"""

        # Find matching bypass code
        matching_code = None
        code_id = None

        for bypass_id, bypass_code in self.bypass_codes.items():
            if bypass_code.code == code:
                matching_code = bypass_code
                code_id = bypass_id
                break

        if not matching_code:
            self.logger.warning(f"Invalid bypass code attempted: {code[:8]}...")
            return {
                "success": False,
                "error": "Invalid bypass code",
                "timestamp": datetime.now().isoformat(),
            }

        # Check expiry
        if matching_code.expiry and datetime.now() > matching_code.expiry:
            self.logger.warning(f"Expired bypass code attempted: {code_id}")
            return {
                "success": False,
                "error": "Bypass code expired",
                "expiry": matching_code.expiry.isoformat(),
                "timestamp": datetime.now().isoformat(),
            }

        # Check usage limit
        if matching_code.uses_remaining <= 0:
            self.logger.warning(f"Bypass code usage limit exceeded: {code_id}")
            return {
                "success": False,
                "error": "Bypass code usage limit exceeded",
                "timestamp": datetime.now().isoformat(),
            }

        # Use the code
        matching_code.uses_remaining -= 1
        self._save_bypass_codes(self.bypass_codes)

        # Log usage
        self.logger.info(f"Bypass code used: {code_id} - Reason: {reason}")

        # Set temporary enforcement level
        if code_id == "emergency":
            self.enforcement_level = EnforcementLevel.EMERGENCY
            duration = 60  # 60 minutes
        elif code_id == "hotfix":
            self.enforcement_level = EnforcementLevel.WARN
            duration = 30  # 30 minutes
        elif code_id == "maintenance":
            self.enforcement_level = EnforcementLevel.MONITOR
            duration = 120  # 120 minutes
        else:
            duration = 15  # Default 15 minutes

        # Schedule return to normal enforcement
        threading.Timer(duration * 60, self._restore_enforcement_level).start()

        return {
            "success": True,
            "code_id": code_id,
            "purpose": matching_code.purpose,
            "uses_remaining": matching_code.uses_remaining,
            "enforcement_level": self.enforcement_level.value,
            "duration_minutes": duration,
            "reason": reason,
            "timestamp": datetime.now().isoformat(),
        }

    def generate_new_bypass_code(
        self,
        code_type: str,
        purpose: str,
        expiry_hours: int = 24,
        max_uses: int = 5,
        created_by: str = "admin",
    ) -> dict[str, Any]:
        """Generate a new emergency bypass code"""

        # Generate secure code
        code = hashlib.sha256(
            f"{code_type}_{purpose}_{int(time.time())}".encode()
        ).hexdigest()[:16]

        # Create bypass code object
        bypass_code = BypassCode(
            code=code,
            purpose=purpose,
            expiry=datetime.now() + timedelta(hours=expiry_hours),
            max_uses=max_uses,
            uses_remaining=max_uses,
            created_by=created_by,
            reason=f"Generated bypass for {purpose}",
        )

        # Store the code
        self.bypass_codes[code_type] = bypass_code
        self._save_bypass_codes(self.bypass_codes)

        self.logger.info(f"New bypass code generated: {code_type} by {created_by}")

        return {
            "code_type": code_type,
            "code": code,
            "purpose": purpose,
            "expiry": bypass_code.expiry.isoformat(),
            "max_uses": max_uses,
            "created_by": created_by,
            "timestamp": datetime.now().isoformat(),
        }

    async def _record_metrics(self, execution_time_ms: float, result: dict[str, Any]):
        """Record performance and result metrics"""

        # Get system metrics
        process = psutil.Process()
        memory_usage = process.memory_info().rss / (1024 * 1024)  # MB
        cpu_usage = process.cpu_percent()

        # Count errors and warnings
        error_count = (
            1 if result.get("error") or result.get("safety_system_error") else 0
        )
        warning_count = len(result.get("warnings", []))
        bypass_count = 1 if result.get("bypassed") else 0

        # Create metrics entry
        metrics = SafetyMetrics(
            timestamp=datetime.now(),
            hook_execution_time_ms=execution_time_ms,
            memory_usage_mb=memory_usage,
            cpu_usage_percent=cpu_usage,
            error_count=error_count,
            warning_count=warning_count,
            bypass_count=bypass_count,
            enforcement_level=self.enforcement_level,
            health_status=self.health_status,
        )

        # Add to history
        self.metrics_history.append(metrics)

        # Cleanup old metrics
        cutoff_time = datetime.now() - timedelta(
            hours=self.config.get("metrics_retention_hours", 24)
        )
        self.metrics_history = [
            m for m in self.metrics_history if m.timestamp > cutoff_time
        ]

        # Save metrics to file
        await self._save_metrics()

        # Check alert conditions
        await self._check_alert_conditions()

    async def _save_metrics(self):
        """Save metrics to file"""
        try:
            metrics_data = [
                asdict(m) for m in self.metrics_history[-100:]
            ]  # Keep last 100 entries
            with open(self.metrics_path, "w") as f:
                json.dump(metrics_data, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Failed to save metrics: {e}")

    async def _check_alert_conditions(self):
        """Check if any alert conditions are met"""
        if len(self.metrics_history) < 5:  # Need minimum data
            return

        alert_rules = self.config.get("alert_rules", [])

        for rule_config in alert_rules:
            if not rule_config.get("enabled", True):
                continue

            rule = AlertRule(**rule_config)

            # Check if alert condition is met
            if await self._evaluate_alert_condition(rule):
                await self._trigger_alert(rule)

    async def _evaluate_alert_condition(self, rule: AlertRule) -> bool:
        """Evaluate if an alert condition is met"""

        # Get recent metrics within the rule duration
        cutoff_time = datetime.now() - timedelta(minutes=rule.duration_minutes)
        recent_metrics = [m for m in self.metrics_history if m.timestamp > cutoff_time]

        if len(recent_metrics) == 0:
            return False

        # Calculate condition values
        if "error_rate" in rule.condition:
            total_operations = len(recent_metrics)
            error_operations = sum(1 for m in recent_metrics if m.error_count > 0)
            error_rate = (
                error_operations / total_operations if total_operations > 0 else 0
            )
            return error_rate > rule.threshold

        elif "memory_usage_mb" in rule.condition:
            avg_memory = sum(m.memory_usage_mb for m in recent_metrics) / len(
                recent_metrics
            )
            return avg_memory > rule.threshold

        elif "avg_execution_time_ms" in rule.condition:
            avg_execution_time = sum(
                m.hook_execution_time_ms for m in recent_metrics
            ) / len(recent_metrics)
            return avg_execution_time > rule.threshold

        return False

    async def _trigger_alert(self, rule: AlertRule):
        """Trigger an alert"""

        # Check cooldown
        alert_id = f"{rule.name}_{rule.severity}"

        # Check if alert is already active
        for alert in self.active_alerts:
            if alert["id"] == alert_id:
                last_triggered = datetime.fromisoformat(alert["last_triggered"])
                if datetime.now() - last_triggered < timedelta(
                    minutes=rule.cooldown_minutes
                ):
                    return  # Still in cooldown

        # Create alert
        alert = {
            "id": alert_id,
            "name": rule.name,
            "severity": rule.severity,
            "condition": rule.condition,
            "threshold": rule.threshold,
            "message": f"Alert: {rule.name} - {rule.condition} exceeded threshold {rule.threshold}",
            "triggered": datetime.now().isoformat(),
            "last_triggered": datetime.now().isoformat(),
            "count": 1,
        }

        # Update or add alert
        existing_alert = None
        for i, existing in enumerate(self.active_alerts):
            if existing["id"] == alert_id:
                existing_alert = i
                break

        if existing_alert is not None:
            self.active_alerts[existing_alert]["last_triggered"] = alert[
                "last_triggered"
            ]
            self.active_alerts[existing_alert]["count"] += 1
        else:
            self.active_alerts.append(alert)

        # Log alert
        self.logger.warning(f"Alert triggered: {alert['message']}")

        # Take action based on severity
        if rule.severity == "critical":
            await self._handle_critical_alert(rule, alert)

        # Save alerts
        await self._save_alerts()

    async def _handle_critical_alert(self, rule: AlertRule, alert: dict[str, Any]):
        """Handle critical alerts with automatic actions"""

        if rule.name == "critical_error_rate":
            # High error rate - consider emergency mode
            await self._trigger_emergency_mode(
                f"Critical error rate: {alert['message']}"
            )

        elif rule.name == "system_failure":
            # System failure - immediate rollback
            await self.emergency_rollback("System failure detected")

    async def _save_alerts(self):
        """Save active alerts to file"""
        try:
            with open(self.alerts_path, "w") as f:
                json.dump(self.active_alerts, f, indent=2, default=str)
        except Exception as e:
            self.logger.error(f"Failed to save alerts: {e}")

    def _is_system_healthy(self) -> bool:
        """Check if the system is healthy"""
        return self.health_status in [HealthStatus.HEALTHY, HealthStatus.DEGRADED]

    def start_monitoring(self):
        """Start the monitoring thread"""
        if self.monitoring_active:
            return

        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(
            target=self._monitoring_loop, daemon=True
        )
        self.monitoring_thread.start()
        self.logger.info("Safety monitoring started")

    def stop_monitoring(self):
        """Stop the monitoring thread"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        self.logger.info("Safety monitoring stopped")

    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                self._perform_health_check()
                time.sleep(self.config.get("health_check_interval_seconds", 30))
            except Exception as e:
                self.logger.error(f"Monitoring error: {e}")
                time.sleep(60)  # Wait longer after error

    def _perform_health_check(self):
        """Perform system health check"""

        # Check recent metrics for health indicators
        if len(self.metrics_history) >= 10:
            recent_metrics = self.metrics_history[-10:]

            # Calculate health metrics
            error_rate = sum(1 for m in recent_metrics if m.error_count > 0) / len(
                recent_metrics
            )
            avg_execution_time = sum(
                m.hook_execution_time_ms for m in recent_metrics
            ) / len(recent_metrics)
            avg_memory = sum(m.memory_usage_mb for m in recent_metrics) / len(
                recent_metrics
            )

            # Determine health status
            if error_rate > 0.8:
                self.health_status = HealthStatus.CRITICAL
            elif error_rate > 0.5:
                self.health_status = HealthStatus.FAILING
            elif error_rate > 0.2 or avg_execution_time > 10000 or avg_memory > 1000:
                self.health_status = HealthStatus.DEGRADED
            else:
                self.health_status = HealthStatus.HEALTHY

        self.last_health_check = datetime.now()

    def _degrade_enforcement_level(self):
        """Automatically degrade enforcement level due to health issues"""
        if self.enforcement_level == EnforcementLevel.ENFORCE:
            self.enforcement_level = EnforcementLevel.SOFT
            self.logger.warning(
                "Enforcement level degraded to SOFT due to health issues"
            )
        elif self.enforcement_level == EnforcementLevel.SOFT:
            self.enforcement_level = EnforcementLevel.WARN
            self.logger.warning(
                "Enforcement level degraded to WARN due to health issues"
            )

    def _restore_enforcement_level(self):
        """Restore normal enforcement level"""
        self.enforcement_level = EnforcementLevel(
            self.config.get("enforcement_level", "enforce")
        )
        self.logger.info(
            f"Enforcement level restored to {self.enforcement_level.value}"
        )

    async def _trigger_emergency_mode(self, reason: str):
        """Trigger emergency mode"""
        self.emergency_mode = True
        self.enforcement_level = EnforcementLevel.EMERGENCY
        self.health_status = HealthStatus.EMERGENCY

        self.logger.critical(f"Emergency mode activated: {reason}")

        # Schedule automatic recovery
        recovery_delay = self.config.get("emergency_recovery_minutes", 30)
        threading.Timer(recovery_delay * 60, self._recover_from_emergency).start()

    def _recover_from_emergency(self):
        """Recover from emergency mode"""
        self.emergency_mode = False
        self._restore_enforcement_level()
        self.health_status = (
            HealthStatus.DEGRADED
        )  # Start degraded and let health checks improve

        self.logger.info("Recovered from emergency mode")

    async def _check_rollback_conditions(self):
        """Check if rollback conditions are met"""
        if not self.config.get("auto_rollback_enabled", True):
            return

        # Check emergency threshold
        emergency_threshold = self.config.get("emergency_threshold_error_rate", 0.5)
        emergency_duration = self.config.get("emergency_threshold_duration_minutes", 5)

        cutoff_time = datetime.now() - timedelta(minutes=emergency_duration)
        recent_metrics = [m for m in self.metrics_history if m.timestamp > cutoff_time]

        if len(recent_metrics) >= 5:
            error_rate = sum(1 for m in recent_metrics if m.error_count > 0) / len(
                recent_metrics
            )

            if error_rate >= emergency_threshold:
                await self.emergency_rollback(f"High error rate: {error_rate:.2%}")

    async def emergency_rollback(self, reason: str):
        """Perform emergency rollback"""
        self.logger.critical(f"Emergency rollback triggered: {reason}")

        # Save current state to rollback stack
        current_state = {
            "enforcement_level": self.enforcement_level.value,
            "config": self.config.copy(),
            "timestamp": datetime.now().isoformat(),
            "reason": reason,
        }
        self.rollback_stack.append(current_state)

        # Set to safe defaults
        self.enforcement_level = EnforcementLevel.MONITOR
        self.config["enforcement_level"] = "monitor"
        self._save_config(self.config)

        # Clear problematic alerts
        self.active_alerts = []
        await self._save_alerts()

        self.logger.info("Emergency rollback completed - system set to monitor mode")

    def get_system_status(self) -> dict[str, Any]:
        """Get comprehensive system status"""

        # Calculate recent metrics
        recent_metrics = self.metrics_history[-10:] if self.metrics_history else []

        if recent_metrics:
            error_rate = sum(1 for m in recent_metrics if m.error_count > 0) / len(
                recent_metrics
            )
            avg_execution_time = sum(
                m.hook_execution_time_ms for m in recent_metrics
            ) / len(recent_metrics)
            avg_memory = sum(m.memory_usage_mb for m in recent_metrics) / len(
                recent_metrics
            )
        else:
            error_rate = 0
            avg_execution_time = 0
            avg_memory = 0

        return {
            "timestamp": datetime.now().isoformat(),
            "health_status": self.health_status.value,
            "enforcement_level": self.enforcement_level.value,
            "emergency_mode": self.emergency_mode,
            "monitoring_active": self.monitoring_active,
            "last_health_check": self.last_health_check.isoformat(),
            "metrics": {
                "total_operations": len(self.metrics_history),
                "recent_error_rate": error_rate,
                "avg_execution_time_ms": avg_execution_time,
                "avg_memory_usage_mb": avg_memory,
            },
            "bypass_codes": {
                code_id: {
                    "purpose": code.purpose,
                    "uses_remaining": code.uses_remaining,
                    "expiry": code.expiry.isoformat() if code.expiry else None,
                }
                for code_id, code in self.bypass_codes.items()
            },
            "active_alerts": len(self.active_alerts),
            "rollback_states_available": len(self.rollback_stack),
        }


# Global safety system instance
_safety_system_instance = None


def get_safety_system() -> HookSafetySystem:
    """Get or create the global safety system instance"""
    global _safety_system_instance
    if _safety_system_instance is None:
        _safety_system_instance = HookSafetySystem()
    return _safety_system_instance


# CLI interface
if __name__ == "__main__":
    import asyncio
    import sys

    async def main():
        if len(sys.argv) < 2:
            print("Usage: python hook_safety_system.py <command> [args...]")
            print("Commands:")
            print("  status                    - Get system status")
            print("  bypass <code> <reason>    - Use bypass code")
            print("  generate <type> <purpose> - Generate new bypass code")
            print("  emergency <reason>        - Trigger emergency mode")
            print("  rollback <reason>         - Perform emergency rollback")
            print("  monitor                   - Start monitoring")
            return

        command = sys.argv[1]
        safety_system = get_safety_system()

        if command == "status":
            status = safety_system.get_system_status()
            print(json.dumps(status, indent=2))

        elif command == "bypass" and len(sys.argv) >= 4:
            code = sys.argv[2]
            reason = " ".join(sys.argv[3:])
            result = safety_system.use_bypass_code(code, reason)
            print(json.dumps(result, indent=2))

        elif command == "generate" and len(sys.argv) >= 4:
            code_type = sys.argv[2]
            purpose = " ".join(sys.argv[3:])
            result = safety_system.generate_new_bypass_code(code_type, purpose)
            print(json.dumps(result, indent=2))

        elif command == "emergency" and len(sys.argv) >= 3:
            reason = " ".join(sys.argv[2:])
            await safety_system._trigger_emergency_mode(reason)
            print(f"Emergency mode triggered: {reason}")

        elif command == "rollback" and len(sys.argv) >= 3:
            reason = " ".join(sys.argv[2:])
            await safety_system.emergency_rollback(reason)
            print(f"Emergency rollback completed: {reason}")

        elif command == "monitor":
            print("Starting safety monitoring...")
            safety_system.start_monitoring()
            try:
                while True:
                    await asyncio.sleep(60)
                    status = safety_system.get_system_status()
                    print(
                        f"Health: {status['health_status']}, Alerts: {status['active_alerts']}"
                    )
            except KeyboardInterrupt:
                safety_system.stop_monitoring()
                print("Monitoring stopped")

        else:
            print(f"Unknown command: {command}")

    asyncio.run(main())
