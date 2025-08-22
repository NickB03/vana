#!/usr/bin/env python3
"""
Hook Safety Configuration Management
====================================

Comprehensive configuration management for the hook safety system.
Provides graduated enforcement policies, rollback configurations, and
monitoring settings with hot-reload capabilities.
"""

import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any

import yaml


class ConfigurationError(Exception):
    """Configuration-related errors"""

    pass


class EnforcementMode(Enum):
    """Available enforcement modes"""

    MONITOR = "monitor"  # Log only, no blocking
    WARN = "warn"  # Log warnings, no blocking
    SOFT_ENFORCE = "soft"  # Block with override option
    ENFORCE = "enforce"  # Full blocking enforcement
    EMERGENCY_BYPASS = "emergency"  # Emergency mode - bypass all


@dataclass
class GraduatedEnforcementConfig:
    """Configuration for graduated enforcement"""

    enabled: bool = True
    initial_mode: EnforcementMode = EnforcementMode.MONITOR
    escalation_thresholds: dict[str, float] = field(
        default_factory=lambda: {
            "error_rate": 0.1,
            "warning_rate": 0.3,
            "performance_degradation": 0.2,
        }
    )
    escalation_delay_minutes: int = 15
    degradation_recovery_threshold: float = 0.05
    auto_escalation_enabled: bool = True
    max_enforcement_level: EnforcementMode = EnforcementMode.ENFORCE
    cooldown_minutes: int = 30


@dataclass
class RollbackConfig:
    """Configuration for automatic rollback"""

    enabled: bool = True
    triggers: dict[str, Any] = field(
        default_factory=lambda: {
            "error_rate_threshold": 0.5,
            "error_rate_duration_minutes": 5,
            "consecutive_failures": 10,
            "memory_threshold_mb": 1000,
            "execution_time_threshold_ms": 30000,
        }
    )
    auto_rollback_delay_minutes: int = 2
    max_rollback_states: int = 10
    rollback_to_safe_mode: bool = True
    notification_enabled: bool = True


@dataclass
class MonitoringConfig:
    """Configuration for system monitoring"""

    enabled: bool = True
    health_check_interval_seconds: int = 30
    metrics_retention_hours: int = 24
    performance_sampling_rate: float = 1.0
    alert_aggregation_minutes: int = 5
    dashboard_update_interval_seconds: int = 10
    export_metrics: bool = True
    export_format: str = "json"  # json, prometheus, csv


@dataclass
class AlertingConfig:
    """Configuration for alerting system"""

    enabled: bool = True
    notification_channels: list[str] = field(default_factory=lambda: ["log", "file"])
    severity_levels: list[str] = field(
        default_factory=lambda: ["info", "warning", "critical", "emergency"]
    )
    rate_limiting: dict[str, int] = field(
        default_factory=lambda: {
            "max_alerts_per_minute": 10,
            "cooldown_minutes": 30,
            "burst_threshold": 5,
        }
    )
    escalation_rules: dict[str, Any] = field(
        default_factory=lambda: {
            "critical_alert_threshold": 3,
            "emergency_escalation_minutes": 10,
        }
    )


@dataclass
class SecurityConfig:
    """Security configuration for safety system"""

    bypass_code_expiry_hours: int = 24
    max_bypass_uses: int = 10
    audit_logging: bool = True
    secure_bypass_generation: bool = True
    require_reason: bool = True
    administrator_approval: bool = False
    encryption_enabled: bool = True


@dataclass
class PerformanceConfig:
    """Performance tuning configuration"""

    max_validation_time_ms: int = 5000
    concurrent_validations: int = 5
    cache_enabled: bool = True
    cache_ttl_minutes: int = 60
    async_processing: bool = True
    background_cleanup: bool = True
    optimization_enabled: bool = True


class HookSafetyConfigManager:
    """Comprehensive configuration manager for hook safety system"""

    def __init__(self, config_dir: str | None = None):
        self.config_dir = (
            Path(config_dir)
            if config_dir
            else Path.cwd() / ".claude_workspace" / "safety"
        )
        self.config_dir.mkdir(parents=True, exist_ok=True)

        # Configuration files
        self.main_config_file = self.config_dir / "safety-config.yaml"
        self.enforcement_config_file = self.config_dir / "enforcement-config.yaml"
        self.rollback_config_file = self.config_dir / "rollback-config.yaml"
        self.monitoring_config_file = self.config_dir / "monitoring-config.yaml"
        self.alerting_config_file = self.config_dir / "alerting-config.yaml"
        self.security_config_file = self.config_dir / "security-config.yaml"
        self.performance_config_file = self.config_dir / "performance-config.yaml"

        # Configuration objects (initialized in load_all_configurations)
        self.graduated_enforcement: GraduatedEnforcementConfig
        self.rollback: RollbackConfig
        self.monitoring: MonitoringConfig
        self.alerting: AlertingConfig
        self.security: SecurityConfig
        self.performance: PerformanceConfig

        # Hot reload
        self.hot_reload_enabled: bool = True
        self.last_reload: datetime = datetime.now()
        self.config_watchers: dict[str, Any] = {}

        # Logger
        self.logger = logging.getLogger("hook_safety_config")

        # Load initial configuration
        self.load_all_configurations()

    def load_all_configurations(self) -> None:
        """Load all configuration components"""
        try:
            self.graduated_enforcement = self.load_enforcement_config()
            self.rollback = self.load_rollback_config()
            self.monitoring = self.load_monitoring_config()
            self.alerting = self.load_alerting_config()
            self.security = self.load_security_config()
            self.performance = self.load_performance_config()

            self.last_reload = datetime.now()
            self.logger.info("All configurations loaded successfully")

        except Exception as e:
            self.logger.error(f"Failed to load configurations: {e}")
            raise ConfigurationError(f"Configuration loading failed: {e}") from e

    def load_enforcement_config(self) -> GraduatedEnforcementConfig:
        """Load graduated enforcement configuration"""
        config_data = self._load_config_file(
            self.enforcement_config_file, self._get_default_enforcement_config()
        )

        # Convert string enum values
        if "initial_mode" in config_data:
            config_data["initial_mode"] = EnforcementMode(config_data["initial_mode"])
        if "max_enforcement_level" in config_data:
            config_data["max_enforcement_level"] = EnforcementMode(
                config_data["max_enforcement_level"]
            )

        return GraduatedEnforcementConfig(**config_data)

    def load_rollback_config(self) -> RollbackConfig:
        """Load rollback configuration"""
        config_data = self._load_config_file(
            self.rollback_config_file, self._get_default_rollback_config()
        )
        return RollbackConfig(**config_data)

    def load_monitoring_config(self) -> MonitoringConfig:
        """Load monitoring configuration"""
        config_data = self._load_config_file(
            self.monitoring_config_file, self._get_default_monitoring_config()
        )
        return MonitoringConfig(**config_data)

    def load_alerting_config(self) -> AlertingConfig:
        """Load alerting configuration"""
        config_data = self._load_config_file(
            self.alerting_config_file, self._get_default_alerting_config()
        )
        return AlertingConfig(**config_data)

    def load_security_config(self) -> SecurityConfig:
        """Load security configuration"""
        config_data = self._load_config_file(
            self.security_config_file, self._get_default_security_config()
        )
        return SecurityConfig(**config_data)

    def load_performance_config(self) -> PerformanceConfig:
        """Load performance configuration"""
        config_data = self._load_config_file(
            self.performance_config_file, self._get_default_performance_config()
        )
        return PerformanceConfig(**config_data)

    def _load_config_file(
        self, file_path: Path, default_config: dict[str, Any]
    ) -> dict[str, Any]:
        """Load configuration from file with fallback to defaults"""
        try:
            if file_path.exists():
                with open(file_path) as f:
                    if (
                        file_path.suffix.lower() == ".yaml"
                        or file_path.suffix.lower() == ".yml"
                    ):
                        config = yaml.safe_load(f) or {}
                    else:
                        config = json.load(f)

                # Merge with defaults
                merged_config = default_config.copy()
                merged_config.update(config)
                return merged_config
            else:
                # Create default config file
                self._save_config_file(file_path, default_config)
                return default_config

        except Exception as e:
            self.logger.error(f"Failed to load config from {file_path}: {e}")
            return default_config

    def _save_config_file(self, file_path: Path, config: dict[str, Any]) -> None:
        """Save configuration to file"""
        try:
            with open(file_path, "w") as f:
                if (
                    file_path.suffix.lower() == ".yaml"
                    or file_path.suffix.lower() == ".yml"
                ):
                    yaml.dump(config, f, default_flow_style=False, indent=2)
                else:
                    json.dump(config, f, indent=2, default=str)

        except Exception as e:
            self.logger.error(f"Failed to save config to {file_path}: {e}")

    def save_all_configurations(self) -> None:
        """Save all configurations to files"""
        configs = [
            (self.enforcement_config_file, asdict(self.graduated_enforcement)),
            (self.rollback_config_file, asdict(self.rollback)),
            (self.monitoring_config_file, asdict(self.monitoring)),
            (self.alerting_config_file, asdict(self.alerting)),
            (self.security_config_file, asdict(self.security)),
            (self.performance_config_file, asdict(self.performance)),
        ]

        for file_path, config in configs:
            self._save_config_file(file_path, config)

        self.logger.info("All configurations saved successfully")

    def update_enforcement_config(self, updates: dict[str, Any]) -> None:
        """Update enforcement configuration"""
        current_config = asdict(self.graduated_enforcement)
        current_config.update(updates)

        # Handle enum conversions
        if "initial_mode" in current_config and isinstance(
            current_config["initial_mode"], str
        ):
            current_config["initial_mode"] = EnforcementMode(
                current_config["initial_mode"]
            )
        if "max_enforcement_level" in current_config and isinstance(
            current_config["max_enforcement_level"], str
        ):
            current_config["max_enforcement_level"] = EnforcementMode(
                current_config["max_enforcement_level"]
            )

        self.graduated_enforcement = GraduatedEnforcementConfig(**current_config)
        self._save_config_file(
            self.enforcement_config_file, asdict(self.graduated_enforcement)
        )

        self.logger.info(f"Enforcement configuration updated: {updates}")

    def update_rollback_config(self, updates: dict[str, Any]) -> None:
        """Update rollback configuration"""
        current_config = asdict(self.rollback)
        current_config.update(updates)

        self.rollback = RollbackConfig(**current_config)
        self._save_config_file(self.rollback_config_file, asdict(self.rollback))

        self.logger.info(f"Rollback configuration updated: {updates}")

    def update_monitoring_config(self, updates: dict[str, Any]) -> None:
        """Update monitoring configuration"""
        current_config = asdict(self.monitoring)
        current_config.update(updates)

        self.monitoring = MonitoringConfig(**current_config)
        self._save_config_file(self.monitoring_config_file, asdict(self.monitoring))

        self.logger.info(f"Monitoring configuration updated: {updates}")

    def update_alerting_config(self, updates: dict[str, Any]) -> None:
        """Update alerting configuration"""
        current_config = asdict(self.alerting)
        current_config.update(updates)

        self.alerting = AlertingConfig(**current_config)
        self._save_config_file(self.alerting_config_file, asdict(self.alerting))

        self.logger.info(f"Alerting configuration updated: {updates}")

    def get_current_enforcement_mode(self) -> EnforcementMode:
        """Get the current enforcement mode"""
        return self.graduated_enforcement.initial_mode

    def set_enforcement_mode(self, mode: EnforcementMode | str) -> None:
        """Set the enforcement mode"""
        if isinstance(mode, str):
            mode = EnforcementMode(mode)

        self.update_enforcement_config({"initial_mode": mode.value})

    def should_escalate_enforcement(self, metrics: dict[str, float]) -> bool:
        """Check if enforcement should be escalated based on metrics"""
        if not self.graduated_enforcement.auto_escalation_enabled:
            return False

        thresholds = self.graduated_enforcement.escalation_thresholds

        for metric_name, threshold in thresholds.items():
            if metric_name in metrics and metrics[metric_name] > threshold:
                return True

        return False

    def get_escalated_enforcement_mode(
        self, current_mode: EnforcementMode
    ) -> EnforcementMode:
        """Get the next escalated enforcement mode"""
        escalation_order = [
            EnforcementMode.MONITOR,
            EnforcementMode.WARN,
            EnforcementMode.SOFT_ENFORCE,
            EnforcementMode.ENFORCE,
        ]

        try:
            current_index = escalation_order.index(current_mode)
            if current_index < len(escalation_order) - 1:
                next_mode = escalation_order[current_index + 1]

                # Respect maximum enforcement level
                max_level_index = escalation_order.index(
                    self.graduated_enforcement.max_enforcement_level
                )
                if escalation_order.index(next_mode) <= max_level_index:
                    return next_mode

        except ValueError:
            pass

        return current_mode

    def should_trigger_rollback(self, metrics: dict[str, Any]) -> bool:
        """Check if rollback should be triggered based on metrics"""
        if not self.rollback.enabled:
            return False

        triggers = self.rollback.triggers

        # Check error rate threshold
        if "error_rate" in metrics:
            if metrics["error_rate"] >= triggers["error_rate_threshold"]:
                return True

        # Check consecutive failures
        if "consecutive_failures" in metrics:
            if metrics["consecutive_failures"] >= triggers["consecutive_failures"]:
                return True

        # Check memory threshold
        if "memory_usage_mb" in metrics:
            if metrics["memory_usage_mb"] >= triggers["memory_threshold_mb"]:
                return True

        # Check execution time threshold
        if "avg_execution_time_ms" in metrics:
            if (
                metrics["avg_execution_time_ms"]
                >= triggers["execution_time_threshold_ms"]
            ):
                return True

        return False

    def get_alert_configuration(self, alert_type: str) -> dict[str, Any]:
        """Get configuration for specific alert type"""
        base_config = asdict(self.alerting)

        # Add alert-specific configuration if needed
        if alert_type == "performance":
            base_config["thresholds"] = {
                "execution_time_ms": 5000,
                "memory_usage_mb": 500,
                "error_rate": 0.1,
            }
        elif alert_type == "security":
            base_config["thresholds"] = {
                "failed_validations": 10,
                "bypass_usage_rate": 0.2,
            }
        elif alert_type == "health":
            base_config["thresholds"] = {
                "system_availability": 0.95,
                "response_time_ms": 1000,
            }

        return base_config

    def export_configuration(self, format: str = "yaml") -> str:
        """Export complete configuration"""
        complete_config = {
            "graduated_enforcement": asdict(self.graduated_enforcement),
            "rollback": asdict(self.rollback),
            "monitoring": asdict(self.monitoring),
            "alerting": asdict(self.alerting),
            "security": asdict(self.security),
            "performance": asdict(self.performance),
            "exported_at": datetime.now().isoformat(),
            "version": "1.0",
        }

        if format.lower() == "yaml":
            return yaml.dump(complete_config, default_flow_style=False, indent=2)
        elif format.lower() == "json":
            return json.dumps(complete_config, indent=2, default=str)
        else:
            raise ValueError(f"Unsupported export format: {format}")

    def import_configuration(self, config_data: str, format: str = "yaml") -> None:
        """Import configuration from data"""
        try:
            if format.lower() == "yaml":
                config = yaml.safe_load(config_data)
            elif format.lower() == "json":
                config = json.loads(config_data)
            else:
                raise ValueError(f"Unsupported import format: {format}")

            # Update configurations
            if "graduated_enforcement" in config:
                enforcement_data = config["graduated_enforcement"]
                if "initial_mode" in enforcement_data:
                    enforcement_data["initial_mode"] = EnforcementMode(
                        enforcement_data["initial_mode"]
                    )
                if "max_enforcement_level" in enforcement_data:
                    enforcement_data["max_enforcement_level"] = EnforcementMode(
                        enforcement_data["max_enforcement_level"]
                    )
                self.graduated_enforcement = GraduatedEnforcementConfig(
                    **enforcement_data
                )

            if "rollback" in config:
                self.rollback = RollbackConfig(**config["rollback"])

            if "monitoring" in config:
                self.monitoring = MonitoringConfig(**config["monitoring"])

            if "alerting" in config:
                self.alerting = AlertingConfig(**config["alerting"])

            if "security" in config:
                self.security = SecurityConfig(**config["security"])

            if "performance" in config:
                self.performance = PerformanceConfig(**config["performance"])

            # Save all configurations
            self.save_all_configurations()

            self.logger.info("Configuration imported successfully")

        except Exception as e:
            self.logger.error(f"Failed to import configuration: {e}")
            raise ConfigurationError(f"Configuration import failed: {e}") from e

    def validate_configuration(self) -> dict[str, list[str]]:
        """Validate all configurations"""
        issues = {"errors": [], "warnings": [], "suggestions": []}

        # Validate enforcement configuration
        if self.graduated_enforcement.escalation_delay_minutes < 1:
            issues["errors"].append("Escalation delay must be at least 1 minute")

        if self.graduated_enforcement.escalation_delay_minutes > 60:
            issues["warnings"].append(
                "Escalation delay > 60 minutes may delay important responses"
            )

        # Validate rollback configuration
        if self.rollback.auto_rollback_delay_minutes < 1:
            issues["errors"].append("Auto rollback delay must be at least 1 minute")

        rollback_triggers = self.rollback.triggers
        if rollback_triggers.get("error_rate_threshold", 0) > 1.0:
            issues["errors"].append("Error rate threshold cannot be greater than 1.0")

        # Validate monitoring configuration
        if self.monitoring.health_check_interval_seconds < 10:
            issues["warnings"].append(
                "Health check interval < 10 seconds may impact performance"
            )

        if self.monitoring.metrics_retention_hours > 168:  # 7 days
            issues["warnings"].append(
                "Long metrics retention may consume significant storage"
            )

        # Validate alerting configuration
        rate_limits = self.alerting.rate_limiting
        if rate_limits.get("max_alerts_per_minute", 0) > 100:
            issues["warnings"].append(
                "High alert rate limit may cause notification flooding"
            )

        # Validate security configuration
        if self.security.bypass_code_expiry_hours > 168:  # 7 days
            issues["warnings"].append("Long bypass code expiry may pose security risks")

        # Validate performance configuration
        if self.performance.max_validation_time_ms > 30000:  # 30 seconds
            issues["warnings"].append("High validation timeout may block operations")

        if self.performance.concurrent_validations > 20:
            issues["warnings"].append("High concurrency may impact system performance")

        return issues

    def _get_default_enforcement_config(self) -> dict[str, Any]:
        """Get default enforcement configuration"""
        return {
            "enabled": True,
            "initial_mode": "monitor",
            "escalation_thresholds": {
                "error_rate": 0.1,
                "warning_rate": 0.3,
                "performance_degradation": 0.2,
            },
            "escalation_delay_minutes": 15,
            "degradation_recovery_threshold": 0.05,
            "auto_escalation_enabled": True,
            "max_enforcement_level": "enforce",
            "cooldown_minutes": 30,
        }

    def _get_default_rollback_config(self) -> dict[str, Any]:
        """Get default rollback configuration"""
        return {
            "enabled": True,
            "triggers": {
                "error_rate_threshold": 0.5,
                "error_rate_duration_minutes": 5,
                "consecutive_failures": 10,
                "memory_threshold_mb": 1000,
                "execution_time_threshold_ms": 30000,
            },
            "auto_rollback_delay_minutes": 2,
            "max_rollback_states": 10,
            "rollback_to_safe_mode": True,
            "notification_enabled": True,
        }

    def _get_default_monitoring_config(self) -> dict[str, Any]:
        """Get default monitoring configuration"""
        return {
            "enabled": True,
            "health_check_interval_seconds": 30,
            "metrics_retention_hours": 24,
            "performance_sampling_rate": 1.0,
            "alert_aggregation_minutes": 5,
            "dashboard_update_interval_seconds": 10,
            "export_metrics": True,
            "export_format": "json",
        }

    def _get_default_alerting_config(self) -> dict[str, Any]:
        """Get default alerting configuration"""
        return {
            "enabled": True,
            "notification_channels": ["log", "file"],
            "severity_levels": ["info", "warning", "critical", "emergency"],
            "rate_limiting": {
                "max_alerts_per_minute": 10,
                "cooldown_minutes": 30,
                "burst_threshold": 5,
            },
            "escalation_rules": {
                "critical_alert_threshold": 3,
                "emergency_escalation_minutes": 10,
            },
        }

    def _get_default_security_config(self) -> dict[str, Any]:
        """Get default security configuration"""
        return {
            "bypass_code_expiry_hours": 24,
            "max_bypass_uses": 10,
            "audit_logging": True,
            "secure_bypass_generation": True,
            "require_reason": True,
            "administrator_approval": False,
            "encryption_enabled": True,
        }

    def _get_default_performance_config(self) -> dict[str, Any]:
        """Get default performance configuration"""
        return {
            "max_validation_time_ms": 5000,
            "concurrent_validations": 5,
            "cache_enabled": True,
            "cache_ttl_minutes": 60,
            "async_processing": True,
            "background_cleanup": True,
            "optimization_enabled": True,
        }


# Global configuration manager instance
_config_manager_instance = None


def get_config_manager() -> HookSafetyConfigManager:
    """Get or create the global configuration manager instance"""
    global _config_manager_instance
    if _config_manager_instance is None:
        _config_manager_instance = HookSafetyConfigManager()
    return _config_manager_instance


# CLI interface
if __name__ == "__main__":
    import sys

    def main() -> None:
        if len(sys.argv) < 2:
            print("Usage: python hook_safety_config.py <command> [args...]")
            print("Commands:")
            print("  export [yaml|json]      - Export configuration")
            print("  import <file> [yaml|json] - Import configuration")
            print("  validate                - Validate configuration")
            print("  set-mode <mode>         - Set enforcement mode")
            print("  status                  - Show configuration status")
            return

        command = sys.argv[1]
        config_manager = get_config_manager()

        if command == "export":
            format_type = sys.argv[2] if len(sys.argv) > 2 else "yaml"
            exported = config_manager.export_configuration(format_type)
            print(exported)

        elif command == "import" and len(sys.argv) >= 3:
            file_path = sys.argv[2]
            format_type = sys.argv[3] if len(sys.argv) > 3 else "yaml"

            try:
                with open(file_path) as f:
                    config_data = f.read()
                config_manager.import_configuration(config_data, format_type)
                print(f"Configuration imported from {file_path}")
            except Exception as e:
                print(f"Import failed: {e}")

        elif command == "validate":
            issues = config_manager.validate_configuration()
            print(json.dumps(issues, indent=2))

        elif command == "set-mode" and len(sys.argv) >= 3:
            mode = sys.argv[2]
            try:
                config_manager.set_enforcement_mode(mode)
                print(f"Enforcement mode set to: {mode}")
            except ValueError as e:
                print(f"Invalid mode: {e}")

        elif command == "status":
            status = {
                "enforcement_mode": config_manager.get_current_enforcement_mode().value,
                "rollback_enabled": config_manager.rollback.enabled,
                "monitoring_enabled": config_manager.monitoring.enabled,
                "alerting_enabled": config_manager.alerting.enabled,
                "last_reload": config_manager.last_reload.isoformat(),
            }
            print(json.dumps(status, indent=2))

        else:
            print(f"Unknown command: {command}")

    main()
