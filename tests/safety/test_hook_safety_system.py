#!/usr/bin/env python3
"""
Comprehensive Safety System Tests
=================================

Complete test suite for the hook safety and rollback system.
Tests emergency bypass, graduated enforcement, health monitoring,
alerting, and production scenarios.
"""

import asyncio

# Import safety system components
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).parent.parent.parent / "src" / "core"))

from hook_alerting_system import AlertManager, AlertSeverity
from hook_safety_config import EnforcementMode, HookSafetyConfigManager
from hook_safety_system import (
    BypassCode,
    EnforcementLevel,
    HealthStatus,
    HookSafetySystem,
)


class TestHookSafetySystem:
    """Test the core safety system functionality"""

    @pytest.fixture
    def safety_system(self):
        """Create a test safety system"""
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "safety-config.json"
            system = HookSafetySystem(str(config_path))
            yield system
            system.stop_monitoring()

    @pytest.mark.asyncio
    async def test_safety_system_initialization(self, safety_system):
        """Test safety system initializes correctly"""
        assert safety_system.enforcement_level == EnforcementLevel.ENFORCE
        assert safety_system.health_status == HealthStatus.HEALTHY
        assert safety_system.monitoring_active is True
        assert len(safety_system.bypass_codes) >= 3  # Default codes
        assert not safety_system.emergency_mode

    @pytest.mark.asyncio
    async def test_basic_validation_flow(self, safety_system):
        """Test basic validation workflow"""
        result = await safety_system.validate_operation("write", "test.txt", "content")

        assert "validated" in result
        assert "enforcement_level" in result
        assert "safety_metadata" in result
        assert result["safety_metadata"]["health_status"] == "healthy"
        assert result["safety_metadata"]["monitoring_active"] is True

    @pytest.mark.asyncio
    async def test_enforcement_levels(self, safety_system):
        """Test different enforcement levels"""

        # Test MONITOR mode
        safety_system.enforcement_level = EnforcementLevel.MONITOR
        result = await safety_system.validate_operation("write", "test.txt", "content")
        assert result["validated"] is True
        assert result["safety_metadata"]["enforcement_action"] == "monitor_only"

        # Test WARN mode
        safety_system.enforcement_level = EnforcementLevel.WARN
        result = await safety_system.validate_operation("write", "test.txt", "content")
        assert result["validated"] is True
        assert result["safety_metadata"]["enforcement_action"] == "warn_only"

        # Test SOFT mode
        safety_system.enforcement_level = EnforcementLevel.SOFT
        result = await safety_system.validate_operation("write", "test.txt", "content")
        assert result["safety_metadata"]["enforcement_action"] == "soft_enforce"

        # Test ENFORCE mode
        safety_system.enforcement_level = EnforcementLevel.ENFORCE
        result = await safety_system.validate_operation("write", "test.txt", "content")
        assert result["safety_metadata"]["enforcement_action"] == "full_enforce"

    @pytest.mark.asyncio
    async def test_emergency_bypass_codes(self, safety_system):
        """Test emergency bypass code functionality"""

        # Get an emergency bypass code
        emergency_codes = [code for code_id, code in safety_system.bypass_codes.items()
                          if code_id == "emergency"]
        assert len(emergency_codes) > 0

        emergency_code = emergency_codes[0]

        # Use the bypass code
        result = safety_system.use_bypass_code(emergency_code.code, "Test emergency")

        assert result["success"] is True
        assert result["code_id"] == "emergency"
        assert safety_system.enforcement_level == EnforcementLevel.EMERGENCY
        assert emergency_code.uses_remaining == 9  # Started with 10

    @pytest.mark.asyncio
    async def test_invalid_bypass_code(self, safety_system):
        """Test invalid bypass code handling"""
        result = safety_system.use_bypass_code("invalid_code", "Test invalid")

        assert result["success"] is False
        assert result["error"] == "Invalid bypass code"

    @pytest.mark.asyncio
    async def test_expired_bypass_code(self, safety_system):
        """Test expired bypass code handling"""

        # Create an expired code
        expired_code = BypassCode(
            code="expired_test_code",
            purpose="Test expired code",
            expiry=datetime.now() - timedelta(hours=1),
            max_uses=5,
            uses_remaining=5,
            created_by="test",
            reason="Test expiry"
        )
        safety_system.bypass_codes["test_expired"] = expired_code

        result = safety_system.use_bypass_code("expired_test_code", "Test expired")

        assert result["success"] is False
        assert result["error"] == "Bypass code expired"

    @pytest.mark.asyncio
    async def test_new_bypass_code_generation(self, safety_system):
        """Test new bypass code generation"""
        result = safety_system.generate_new_bypass_code(
            "test_code", "Test purpose", expiry_hours=1, max_uses=3, created_by="test_user"
        )

        assert result["code_type"] == "test_code"
        assert "code" in result
        assert result["purpose"] == "Test purpose"
        assert result["max_uses"] == 3
        assert result["created_by"] == "test_user"

        # Verify code was stored
        assert "test_code" in safety_system.bypass_codes

    @pytest.mark.asyncio
    async def test_health_monitoring(self, safety_system):
        """Test health monitoring functionality"""

        # Initially healthy
        assert safety_system.health_status == HealthStatus.HEALTHY

        # Simulate some errors to degrade health
        for _ in range(10):
            await safety_system._record_metrics(100, {"error": "test error"})

        # Trigger health check
        safety_system._perform_health_check()

        # Health should have degraded
        assert safety_system.health_status in [HealthStatus.DEGRADED, HealthStatus.FAILING, HealthStatus.CRITICAL]

    @pytest.mark.asyncio
    async def test_emergency_mode_trigger(self, safety_system):
        """Test emergency mode triggering"""

        # Trigger emergency mode
        await safety_system._trigger_emergency_mode("Test emergency")

        assert safety_system.emergency_mode is True
        assert safety_system.enforcement_level == EnforcementLevel.EMERGENCY
        assert safety_system.health_status == HealthStatus.EMERGENCY

        # Test validation in emergency mode
        result = await safety_system.validate_operation("write", "test.txt", "content")
        assert result["bypassed"] is True
        assert result["bypass_type"] == "emergency"

    @pytest.mark.asyncio
    async def test_emergency_rollback(self, safety_system):
        """Test emergency rollback functionality"""

        # Store current state
        original_enforcement = safety_system.enforcement_level

        # Trigger rollback
        await safety_system.emergency_rollback("Test rollback")

        # Check rollback effects
        assert safety_system.enforcement_level == EnforcementLevel.MONITOR
        assert len(safety_system.rollback_stack) > 0

        # Verify rollback state was saved
        rollback_state = safety_system.rollback_stack[-1]
        assert rollback_state["enforcement_level"] == original_enforcement.value
        assert rollback_state["reason"] == "Test rollback"

    @pytest.mark.asyncio
    async def test_performance_metrics_recording(self, safety_system):
        """Test performance metrics recording"""

        initial_count = len(safety_system.metrics_history)

        # Record some metrics
        await safety_system._record_metrics(150, {"validated": True})
        await safety_system._record_metrics(200, {"validated": False, "error": "test"})
        await safety_system._record_metrics(100, {"validated": True})

        # Check metrics were recorded
        assert len(safety_system.metrics_history) == initial_count + 3

        # Check latest metric
        latest_metric = safety_system.metrics_history[-1]
        assert latest_metric.hook_execution_time_ms == 100
        assert latest_metric.error_count == 0

    @pytest.mark.asyncio
    async def test_system_status_reporting(self, safety_system):
        """Test system status reporting"""
        status = safety_system.get_system_status()

        required_fields = [
            "timestamp", "health_status", "enforcement_level", "emergency_mode",
            "monitoring_active", "last_health_check", "metrics", "bypass_codes",
            "active_alerts", "rollback_states_available"
        ]

        for field in required_fields:
            assert field in status

        assert status["health_status"] in ["healthy", "degraded", "failing", "critical", "emergency"]
        assert status["enforcement_level"] in ["monitor", "warn", "soft", "enforce", "emergency"]
        assert isinstance(status["emergency_mode"], bool)
        assert isinstance(status["monitoring_active"], bool)


class TestHookSafetyConfigManager:
    """Test the configuration management system"""

    @pytest.fixture
    def config_manager(self):
        """Create a test configuration manager"""
        with tempfile.TemporaryDirectory() as temp_dir:
            manager = HookSafetyConfigManager(temp_dir)
            yield manager

    def test_config_manager_initialization(self, config_manager):
        """Test configuration manager initialization"""
        assert config_manager.graduated_enforcement is not None
        assert config_manager.rollback is not None
        assert config_manager.monitoring is not None
        assert config_manager.alerting is not None
        assert config_manager.security is not None
        assert config_manager.performance is not None

    def test_enforcement_config_updates(self, config_manager):
        """Test enforcement configuration updates"""

        # Update enforcement config
        updates = {
            "auto_escalation_enabled": False,
            "escalation_delay_minutes": 30
        }
        config_manager.update_enforcement_config(updates)

        assert config_manager.graduated_enforcement.auto_escalation_enabled is False
        assert config_manager.graduated_enforcement.escalation_delay_minutes == 30

    def test_enforcement_mode_changes(self, config_manager):
        """Test enforcement mode changes"""

        # Change to WARN mode
        config_manager.set_enforcement_mode(EnforcementMode.WARN)
        assert config_manager.get_current_enforcement_mode() == EnforcementMode.WARN

        # Change to MONITOR mode
        config_manager.set_enforcement_mode("monitor")
        assert config_manager.get_current_enforcement_mode() == EnforcementMode.MONITOR

    def test_escalation_logic(self, config_manager):
        """Test enforcement escalation logic"""

        # Test escalation condition
        metrics = {"error_rate": 0.15}  # Above threshold of 0.1
        should_escalate = config_manager.should_escalate_enforcement(metrics)
        assert should_escalate is True

        # Test no escalation
        metrics = {"error_rate": 0.05}  # Below threshold
        should_escalate = config_manager.should_escalate_enforcement(metrics)
        assert should_escalate is False

    def test_rollback_triggers(self, config_manager):
        """Test rollback trigger conditions"""

        # Test error rate trigger
        metrics = {"error_rate": 0.6}  # Above threshold of 0.5
        should_rollback = config_manager.should_trigger_rollback(metrics)
        assert should_rollback is True

        # Test memory trigger
        metrics = {"memory_usage_mb": 1500}  # Above threshold of 1000
        should_rollback = config_manager.should_trigger_rollback(metrics)
        assert should_rollback is True

        # Test no trigger
        metrics = {"error_rate": 0.1, "memory_usage_mb": 200}
        should_rollback = config_manager.should_trigger_rollback(metrics)
        assert should_rollback is False

    def test_configuration_export_import(self, config_manager):
        """Test configuration export and import"""

        # Export configuration
        exported_yaml = config_manager.export_configuration("yaml")
        exported_json = config_manager.export_configuration("json")

        assert len(exported_yaml) > 0
        assert len(exported_json) > 0
        assert "graduated_enforcement" in exported_yaml
        assert "graduated_enforcement" in exported_json

        # Test import
        config_manager.import_configuration(exported_yaml, "yaml")
        config_manager.import_configuration(exported_json, "json")

    def test_configuration_validation(self, config_manager):
        """Test configuration validation"""
        issues = config_manager.validate_configuration()

        assert "errors" in issues
        assert "warnings" in issues
        assert "suggestions" in issues
        assert isinstance(issues["errors"], list)
        assert isinstance(issues["warnings"], list)
        assert isinstance(issues["suggestions"], list)


class TestAlertManager:
    """Test the alerting system"""

    @pytest.fixture
    def alert_manager(self):
        """Create a test alert manager"""
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = str(Path(temp_dir) / "test_alerts.db")
            manager = AlertManager(db_path)
            yield manager
            manager.stop_processing()

    @pytest.mark.asyncio
    async def test_alert_manager_initialization(self, alert_manager):
        """Test alert manager initialization"""
        assert len(alert_manager.notification_targets) > 0
        assert len(alert_manager.metric_thresholds) > 0
        assert alert_manager.processing_active is True

    @pytest.mark.asyncio
    async def test_alert_triggering(self, alert_manager):
        """Test alert triggering"""

        alert_id = await alert_manager.trigger_alert(
            name="test_alert",
            severity=AlertSeverity.WARNING,
            message="Test alert message",
            details={"test": True},
            tags=["test"]
        )

        assert alert_id is not None
        assert alert_id in alert_manager.active_alerts

        alert = alert_manager.active_alerts[alert_id]
        assert alert.name == "test_alert"
        assert alert.severity == AlertSeverity.WARNING
        assert alert.message == "Test alert message"
        assert alert.details["test"] is True
        assert "test" in alert.tags

    @pytest.mark.asyncio
    async def test_alert_acknowledgment(self, alert_manager):
        """Test alert acknowledgment"""

        # Trigger alert
        alert_id = await alert_manager.trigger_alert(
            "test_ack", AlertSeverity.CRITICAL, "Test acknowledgment"
        )

        # Acknowledge alert
        success = await alert_manager.acknowledge_alert(alert_id, "test_user")
        assert success is True

        alert = alert_manager.active_alerts[alert_id]
        assert alert.acknowledged_by == "test_user"
        assert alert.acknowledged_at is not None

    @pytest.mark.asyncio
    async def test_alert_resolution(self, alert_manager):
        """Test alert resolution"""

        # Trigger alert
        alert_id = await alert_manager.trigger_alert(
            "test_resolve", AlertSeverity.WARNING, "Test resolution"
        )

        # Resolve alert
        success = await alert_manager.resolve_alert(alert_id)
        assert success is True

        # Alert should be removed from active alerts
        assert alert_id not in alert_manager.active_alerts

    @pytest.mark.asyncio
    async def test_alert_suppression(self, alert_manager):
        """Test alert suppression"""

        # Trigger alert
        alert_id = await alert_manager.trigger_alert(
            "test_suppress", AlertSeverity.INFO, "Test suppression"
        )

        # Suppress alert
        success = await alert_manager.suppress_alert(alert_id, 30)  # 30 minutes
        assert success is True

        alert = alert_manager.active_alerts[alert_id]
        assert alert.suppressed_until is not None
        assert alert.suppressed_until > datetime.now()

    @pytest.mark.asyncio
    async def test_metric_recording_and_thresholds(self, alert_manager):
        """Test metric recording and threshold checking"""

        # Record metrics below threshold
        await alert_manager.record_metric("test_metric", 0.1)
        await alert_manager.record_metric("test_metric", 0.15)

        # Record metric above threshold (should trigger alert)
        await alert_manager.record_metric("error_rate", 0.25)  # Above 0.2 threshold

        # Give time for threshold checking
        await asyncio.sleep(0.1)

        # Check if alert was triggered
        error_alerts = [alert for alert in alert_manager.active_alerts.values()
                       if "error_rate" in alert.name]
        assert len(error_alerts) > 0

    @pytest.mark.asyncio
    async def test_rate_limiting(self, alert_manager):
        """Test alert rate limiting"""

        # Trigger many alerts rapidly
        alert_ids = []
        for i in range(25):  # Above rate limit of 20
            alert_id = await alert_manager.trigger_alert(
                "rate_limit_test", AlertSeverity.INFO, f"Rate limit test {i}"
            )
            alert_ids.append(alert_id)

        # Some alerts should be rate limited (None)
        rate_limited_count = sum(1 for aid in alert_ids if aid is None)
        assert rate_limited_count > 0

    def test_alert_summary(self, alert_manager):
        """Test alert summary generation"""
        summary = alert_manager.get_alert_summary()

        required_fields = [
            "total_active_alerts", "active_by_severity", "total_historical_alerts",
            "recent_alert_rate_per_hour", "notification_targets", "metric_thresholds"
        ]

        for field in required_fields:
            assert field in summary


class TestProductionScenarios:
    """Test production-like scenarios"""

    @pytest.fixture
    def integrated_system(self):
        """Create integrated safety system for production testing"""
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "safety-config.json"

            # Create safety system
            safety_system = HookSafetySystem(str(config_path))

            # Create alert manager
            alert_db_path = str(Path(temp_dir) / "alerts.db")
            alert_manager = AlertManager(alert_db_path)

            # Create config manager
            config_manager = HookSafetyConfigManager(str(Path(temp_dir) / "config"))

            yield {
                "safety_system": safety_system,
                "alert_manager": alert_manager,
                "config_manager": config_manager
            }

            # Cleanup
            safety_system.stop_monitoring()
            alert_manager.stop_processing()

    @pytest.mark.asyncio
    async def test_high_error_rate_scenario(self, integrated_system):
        """Test high error rate production scenario"""
        safety_system = integrated_system["safety_system"]
        alert_manager = integrated_system["alert_manager"]

        # Simulate high error rate
        for i in range(20):
            await safety_system._record_metrics(150, {"error": f"Error {i}"})
            await alert_manager.record_metric("error_rate", 0.7)  # High error rate

        # Check system response
        safety_system._perform_health_check()

        # System should degrade enforcement or trigger emergency mode
        assert safety_system.health_status in [HealthStatus.FAILING, HealthStatus.CRITICAL]

        # Check if alerts were triggered
        await asyncio.sleep(0.1)
        error_alerts = [alert for alert in alert_manager.active_alerts.values()
                       if "error" in alert.name.lower()]
        assert len(error_alerts) > 0

    @pytest.mark.asyncio
    async def test_memory_pressure_scenario(self, integrated_system):
        """Test memory pressure scenario"""
        safety_system = integrated_system["safety_system"]
        alert_manager = integrated_system["alert_manager"]

        # Simulate memory pressure
        for i in range(10):
            await safety_system._record_metrics(100, {"validated": True})
            await alert_manager.record_metric("memory_usage_mb", 800 + (i * 50))  # Increasing memory

        # Check alerts
        await asyncio.sleep(0.1)
        memory_alerts = [alert for alert in alert_manager.active_alerts.values()
                        if "memory" in alert.name.lower()]
        assert len(memory_alerts) > 0

    @pytest.mark.asyncio
    async def test_performance_degradation_scenario(self, integrated_system):
        """Test performance degradation scenario"""
        safety_system = integrated_system["safety_system"]
        alert_manager = integrated_system["alert_manager"]

        # Simulate slow performance
        for i in range(15):
            slow_time = 2000 + (i * 500)  # Increasingly slow
            await safety_system._record_metrics(slow_time, {"validated": True})
            await alert_manager.record_metric("avg_execution_time_ms", slow_time)

        # Check for performance alerts
        await asyncio.sleep(0.1)
        perf_alerts = [alert for alert in alert_manager.active_alerts.values()
                      if "execution" in alert.name.lower() or "slow" in alert.name.lower()]
        assert len(perf_alerts) > 0

    @pytest.mark.asyncio
    async def test_emergency_recovery_scenario(self, integrated_system):
        """Test emergency and recovery scenario"""
        safety_system = integrated_system["safety_system"]
        config_manager = integrated_system["config_manager"]

        # Trigger emergency
        await safety_system._trigger_emergency_mode("Simulated emergency")

        assert safety_system.emergency_mode is True
        assert safety_system.enforcement_level == EnforcementLevel.EMERGENCY

        # Simulate recovery
        safety_system._recover_from_emergency()

        assert safety_system.emergency_mode is False
        assert safety_system.health_status == HealthStatus.DEGRADED  # Starts degraded

    @pytest.mark.asyncio
    async def test_configuration_hot_reload_scenario(self, integrated_system):
        """Test configuration hot reload scenario"""
        config_manager = integrated_system["config_manager"]

        # Change configuration
        original_mode = config_manager.get_current_enforcement_mode()
        new_mode = EnforcementMode.WARN if original_mode != EnforcementMode.WARN else EnforcementMode.MONITOR

        config_manager.set_enforcement_mode(new_mode)

        # Verify change
        assert config_manager.get_current_enforcement_mode() == new_mode

        # Test metrics trigger configuration
        metrics = {"error_rate": 0.15}
        should_escalate = config_manager.should_escalate_enforcement(metrics)
        assert isinstance(should_escalate, bool)

    @pytest.mark.asyncio
    async def test_bypass_code_lifecycle_scenario(self, integrated_system):
        """Test complete bypass code lifecycle"""
        safety_system = integrated_system["safety_system"]

        # Generate new bypass code
        result = safety_system.generate_new_bypass_code(
            "maintenance", "Scheduled maintenance",
            expiry_hours=2, max_uses=5, created_by="admin"
        )

        assert result["success"] is True
        code = result["code"]

        # Use the bypass code
        use_result = safety_system.use_bypass_code(code, "Emergency maintenance")
        assert use_result["success"] is True

        # Verify enforcement level changed
        assert safety_system.enforcement_level == EnforcementLevel.MONITOR

        # Use code multiple times
        for i in range(4):  # Use remaining uses
            use_result = safety_system.use_bypass_code(code, f"Use {i+2}")
            assert use_result["success"] is True

        # Should be exhausted now
        use_result = safety_system.use_bypass_code(code, "Should fail")
        assert use_result["success"] is False
        assert "usage limit exceeded" in use_result["error"]


class TestLoadAndStress:
    """Load and stress testing for safety systems"""

    @pytest.fixture
    def stress_safety_system(self):
        """Create safety system for stress testing"""
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "stress-config.json"
            system = HookSafetySystem(str(config_path))
            yield system
            system.stop_monitoring()

    @pytest.mark.asyncio
    async def test_concurrent_validations(self, stress_safety_system):
        """Test concurrent validation requests"""

        async def validate_operation(i):
            return await stress_safety_system.validate_operation(
                "write", f"test_{i}.txt", f"content_{i}"
            )

        # Run 50 concurrent validations
        tasks = [validate_operation(i) for i in range(50)]
        results = await asyncio.gather(*tasks)

        # All should complete successfully
        assert len(results) == 50
        assert all("validated" in result for result in results)

    @pytest.mark.asyncio
    async def test_high_volume_metrics(self, stress_safety_system):
        """Test high volume metrics recording"""

        # Record 1000 metrics rapidly
        for i in range(1000):
            await stress_safety_system._record_metrics(
                100 + (i % 50),
                {"validated": i % 10 != 0, "operation": f"test_{i}"}
            )

        # Check metrics were recorded
        assert len(stress_safety_system.metrics_history) > 0

        # Performance should still be acceptable
        status = stress_safety_system.get_system_status()
        assert status["health_status"] in ["healthy", "degraded"]  # Not failing/critical

    @pytest.mark.asyncio
    async def test_alert_storm_handling(self):
        """Test handling of alert storms"""
        with tempfile.TemporaryDirectory() as temp_dir:
            alert_manager = AlertManager(str(Path(temp_dir) / "storm_alerts.db"))

            try:
                # Trigger alert storm
                alert_ids = []
                for i in range(100):
                    alert_id = await alert_manager.trigger_alert(
                        f"storm_alert_{i % 5}",  # 5 different alert types
                        AlertSeverity.WARNING,
                        f"Storm alert {i}"
                    )
                    alert_ids.append(alert_id)

                # Many should be rate limited
                successful_alerts = [aid for aid in alert_ids if aid is not None]
                rate_limited_alerts = [aid for aid in alert_ids if aid is None]

                assert len(rate_limited_alerts) > 0
                assert len(successful_alerts) <= alert_manager.max_alerts_per_window

            finally:
                alert_manager.stop_processing()

    @pytest.mark.asyncio
    async def test_memory_usage_under_load(self, stress_safety_system):
        """Test memory usage under sustained load"""
        import gc

        import psutil

        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Run sustained operations
        for batch in range(10):
            tasks = []
            for i in range(100):
                task = stress_safety_system.validate_operation(
                    "write", f"load_test_{batch}_{i}.txt", f"content_{i}"
                )
                tasks.append(task)

            await asyncio.gather(*tasks)

            # Force garbage collection
            gc.collect()

        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_growth = final_memory - initial_memory

        # Memory growth should be reasonable (< 50MB)
        assert memory_growth < 50, f"Memory growth too high: {memory_growth:.1f}MB"


if __name__ == "__main__":
    # Run specific test categories
    import sys

    if len(sys.argv) > 1:
        test_category = sys.argv[1]

        if test_category == "safety":
            pytest.main(["-v", "TestHookSafetySystem"])
        elif test_category == "config":
            pytest.main(["-v", "TestHookSafetyConfigManager"])
        elif test_category == "alerts":
            pytest.main(["-v", "TestAlertManager"])
        elif test_category == "production":
            pytest.main(["-v", "TestProductionScenarios"])
        elif test_category == "stress":
            pytest.main(["-v", "TestLoadAndStress"])
        else:
            print(f"Unknown test category: {test_category}")
            print("Available categories: safety, config, alerts, production, stress")
    else:
        # Run all tests
        pytest.main(["-v", __file__])
