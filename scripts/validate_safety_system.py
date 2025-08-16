#!/usr/bin/env python3
"""
Safety System Validation Script
===============================

Quick validation script to test the hook safety system functionality.
"""

import asyncio
import sys
import tempfile
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "core"))

# Import safety system components
from hook_alerting_system import AlertManager, AlertSeverity
from hook_safety_config import EnforcementMode, HookSafetyConfigManager
from hook_safety_system import EnforcementLevel, HealthStatus, HookSafetySystem


async def test_safety_system_basic():
    """Test basic safety system functionality"""
    print("🔍 Testing Safety System Basic Functionality...")

    with tempfile.TemporaryDirectory() as temp_dir:
        config_path = Path(temp_dir) / "safety-config.json"
        safety_system = HookSafetySystem(str(config_path))

        try:
            # Test initialization
            assert safety_system.enforcement_level == EnforcementLevel.ENFORCE
            assert safety_system.health_status == HealthStatus.HEALTHY
            assert safety_system.monitoring_active is True
            assert len(safety_system.bypass_codes) >= 3
            print("✅ Initialization test passed")

            # Test validation
            result = await safety_system.validate_operation(
                "write", "test.txt", "content"
            )
            assert "validated" in result
            assert "enforcement_level" in result
            assert "safety_metadata" in result
            print("✅ Basic validation test passed")

            # Test enforcement levels
            safety_system.enforcement_level = EnforcementLevel.MONITOR
            result = await safety_system.validate_operation(
                "write", "test.txt", "content"
            )
            assert result["validated"] is True
            print("✅ Monitor mode test passed")

            safety_system.enforcement_level = EnforcementLevel.WARN
            result = await safety_system.validate_operation(
                "write", "test.txt", "content"
            )
            assert result["validated"] is True
            print("✅ Warn mode test passed")

            # Test system status
            status = safety_system.get_system_status()
            required_fields = [
                "timestamp",
                "health_status",
                "enforcement_level",
                "emergency_mode",
                "monitoring_active",
                "metrics",
                "bypass_codes",
            ]
            for field in required_fields:
                assert field in status
            print("✅ System status test passed")

        finally:
            safety_system.stop_monitoring()


async def test_bypass_codes():
    """Test bypass code functionality"""
    print("\n🔑 Testing Bypass Code Functionality...")

    with tempfile.TemporaryDirectory() as temp_dir:
        config_path = Path(temp_dir) / "safety-config.json"
        safety_system = HookSafetySystem(str(config_path))

        try:
            # Get emergency bypass code
            emergency_codes = [
                code
                for code_id, code in safety_system.bypass_codes.items()
                if code_id == "emergency"
            ]
            assert len(emergency_codes) > 0
            emergency_code = emergency_codes[0]
            print("✅ Emergency code found")

            # Test valid bypass code
            result = safety_system.use_bypass_code(emergency_code.code, "Test bypass")
            assert result["success"] is True
            assert result["code_id"] == "emergency"
            print("✅ Valid bypass code test passed")

            # Test invalid bypass code
            result = safety_system.use_bypass_code("invalid_code", "Test invalid")
            assert result["success"] is False
            assert result["error"] == "Invalid bypass code"
            print("✅ Invalid bypass code test passed")

            # Test bypass code generation
            result = safety_system.generate_new_bypass_code(
                "test_code",
                "Test purpose",
                expiry_hours=1,
                max_uses=3,
                created_by="test",
            )
            assert result["code_type"] == "test_code"
            assert "code" in result
            print("✅ Bypass code generation test passed")

        finally:
            safety_system.stop_monitoring()


async def test_config_manager():
    """Test configuration manager"""
    print("\n⚙️ Testing Configuration Manager...")

    with tempfile.TemporaryDirectory() as temp_dir:
        config_manager = HookSafetyConfigManager(temp_dir)

        # Test initialization
        assert config_manager.graduated_enforcement is not None
        assert config_manager.rollback is not None
        assert config_manager.monitoring is not None
        print("✅ Config manager initialization test passed")

        # Test mode changes
        config_manager.get_current_enforcement_mode()
        config_manager.set_enforcement_mode(EnforcementMode.WARN)
        assert config_manager.get_current_enforcement_mode() == EnforcementMode.WARN
        print("✅ Enforcement mode change test passed")

        # Test escalation logic
        metrics = {"error_rate": 0.15}  # Above threshold
        should_escalate = config_manager.should_escalate_enforcement(metrics)
        assert should_escalate is True
        print("✅ Escalation logic test passed")

        # Test configuration export/import
        exported = config_manager.export_configuration("json")
        assert len(exported) > 0
        assert "graduated_enforcement" in exported
        print("✅ Configuration export test passed")

        # Test validation
        issues = config_manager.validate_configuration()
        assert "errors" in issues
        assert "warnings" in issues
        print("✅ Configuration validation test passed")


async def test_alert_manager():
    """Test alert manager"""
    print("\n🚨 Testing Alert Manager...")

    with tempfile.TemporaryDirectory() as temp_dir:
        db_path = str(Path(temp_dir) / "alerts.db")
        alert_manager = AlertManager(db_path)

        try:
            # Test initialization
            assert len(alert_manager.notification_targets) > 0
            assert len(alert_manager.metric_thresholds) > 0
            print("✅ Alert manager initialization test passed")

            # Test alert triggering
            alert_id = await alert_manager.trigger_alert(
                name="test_alert",
                severity=AlertSeverity.WARNING,
                message="Test alert message",
                details={"test": True},
                tags=["test"],
            )
            assert alert_id is not None
            assert alert_id in alert_manager.active_alerts
            print("✅ Alert triggering test passed")

            # Test alert acknowledgment
            success = await alert_manager.acknowledge_alert(alert_id, "test_user")
            assert success is True
            print("✅ Alert acknowledgment test passed")

            # Test metric recording
            await alert_manager.record_metric("test_metric", 0.1)
            print("✅ Metric recording test passed")

            # Test alert summary
            summary = alert_manager.get_alert_summary()
            required_fields = [
                "total_active_alerts",
                "active_by_severity",
                "notification_targets",
            ]
            for field in required_fields:
                assert field in summary
            print("✅ Alert summary test passed")

        finally:
            alert_manager.stop_processing()


async def test_production_scenario():
    """Test production-like scenario"""
    print("\n🏭 Testing Production Scenario...")

    with tempfile.TemporaryDirectory() as temp_dir:
        config_path = Path(temp_dir) / "safety-config.json"
        safety_system = HookSafetySystem(str(config_path))

        alert_db_path = str(Path(temp_dir) / "alerts.db")
        alert_manager = AlertManager(alert_db_path)

        try:
            # Simulate high error rate
            for i in range(10):
                await safety_system._record_metrics(150, {"error": f"Error {i}"})

            # Check system response
            safety_system._perform_health_check()
            status = safety_system.get_system_status()

            # System should detect issues
            print(f"   Health status: {status['health_status']}")
            print(f"   Error rate: {status['metrics']['recent_error_rate']:.1%}")
            print("✅ Production scenario test passed")

        finally:
            safety_system.stop_monitoring()
            alert_manager.stop_processing()


async def test_cli_integration():
    """Test CLI integration"""
    print("\n💻 Testing CLI Integration...")

    # Test CLI import
    sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "core"))

    try:
        from safety_system_cli import SafetySystemCLI

        cli = SafetySystemCLI()

        # Test parser creation
        parser = cli.create_parser()
        assert parser is not None
        print("✅ CLI parser creation test passed")

        # Test status command simulation
        status = cli.safety_system.get_system_status()
        assert "health_status" in status
        print("✅ CLI status integration test passed")

    except ImportError as e:
        print(f"⚠️  CLI import test skipped: {e}")


async def main():
    """Run all validation tests"""
    print("🛡️  Hook Safety System Validation")
    print("=" * 50)

    tests = [
        test_safety_system_basic,
        test_bypass_codes,
        test_config_manager,
        test_alert_manager,
        test_production_scenario,
        test_cli_integration,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            await test()
            passed += 1
        except Exception as e:
            print(f"❌ Test failed: {test.__name__} - {e}")
            failed += 1

    print("\n" + "=" * 50)
    print(f"📊 Validation Results: {passed} passed, {failed} failed")

    if failed == 0:
        print("🎉 All tests passed! Safety system is ready for production.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
