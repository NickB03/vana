#!/usr/bin/env python3
"""
Hook Safety System Demonstration
================================

Interactive demonstration of the comprehensive safety and rollback system.
Shows emergency bypass, graduated enforcement, health monitoring, and alerting.
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "core"))

from hook_alerting_system import get_alert_manager
from hook_safety_config import EnforcementMode, get_config_manager
from hook_safety_system import EnforcementLevel, get_safety_system


async def demo_basic_operations():
    """Demonstrate basic safety operations"""
    print("🛡️  BASIC SAFETY OPERATIONS DEMO")
    print("=" * 50)

    safety_system = get_safety_system()

    # Show initial status
    status = safety_system.get_system_status()
    print(f"Initial Status: {status['health_status']} | {status['enforcement_level']}")

    # Test basic validation
    print("\n1. Basic File Validation:")
    result = await safety_system.validate_operation("write", "demo.txt", "content")
    print(f"   Validation result: {'✅ PASS' if result['validated'] else '❌ FAIL'}")
    print(f"   Enforcement: {result['safety_metadata']['enforcement_action']}")

    # Test different enforcement levels
    print("\n2. Enforcement Level Changes:")
    for level in [EnforcementLevel.MONITOR, EnforcementLevel.WARN, EnforcementLevel.ENFORCE]:
        safety_system.enforcement_level = level
        result = await safety_system.validate_operation("write", "test.txt", "content")
        print(f"   {level.value.upper():8}: {result['safety_metadata']['enforcement_action']}")

    print("\n✅ Basic operations demo completed\n")


async def demo_emergency_bypass():
    """Demonstrate emergency bypass system"""
    print("🔑 EMERGENCY BYPASS SYSTEM DEMO")
    print("=" * 50)

    safety_system = get_safety_system()

    # Show available bypass codes
    print("1. Available Bypass Codes:")
    for code_id, code_info in safety_system.get_system_status()['bypass_codes'].items():
        print(f"   {code_id:12}: {code_info['uses_remaining']} uses remaining")

    # Generate a new bypass code
    print("\n2. Generating New Bypass Code:")
    result = safety_system.generate_new_bypass_code(
        "demo", "Demonstration purpose", expiry_hours=1, max_uses=3
    )
    print(f"   New code generated: {result['code'][:8]}...")
    print(f"   Purpose: {result['purpose']}")

    # Use the bypass code
    print("\n3. Using Bypass Code:")
    use_result = safety_system.use_bypass_code(result['code'], "Demo emergency")
    if use_result['success']:
        print(f"   ✅ Bypass activated: {use_result['enforcement_level']}")
        print(f"   Duration: {use_result['duration_minutes']} minutes")
    else:
        print(f"   ❌ Bypass failed: {use_result['error']}")

    print("\n✅ Emergency bypass demo completed\n")


async def demo_health_monitoring():
    """Demonstrate health monitoring and alerting"""
    print("📊 HEALTH MONITORING & ALERTING DEMO")
    print("=" * 50)

    safety_system = get_safety_system()
    alert_manager = get_alert_manager()

    # Record some metrics to show monitoring
    print("1. Recording Performance Metrics:")
    metrics = [
        ("execution_time", 150),
        ("memory_usage_mb", 200),
        ("error_rate", 0.05),
        ("execution_time", 250),
        ("memory_usage_mb", 350),
        ("error_rate", 0.15),  # This should trigger alert
    ]

    for metric_name, value in metrics:
        await alert_manager.record_metric(metric_name, value)
        await safety_system._record_metrics(100, {"metric": metric_name, "value": value})
        print(f"   {metric_name}: {value}")

    # Wait for alert processing
    await asyncio.sleep(0.5)

    # Show health status
    print("\n2. Current Health Status:")
    status = safety_system.get_system_status()
    print(f"   Health: {status['health_status']}")
    print(f"   Error Rate: {status['metrics']['recent_error_rate']:.1%}")
    print(f"   Memory: {status['metrics']['avg_memory_usage_mb']:.1f}MB")

    # Show active alerts
    print("\n3. Active Alerts:")
    alert_summary = alert_manager.get_alert_summary()
    if alert_summary['total_active_alerts'] > 0:
        alerts = alert_manager.get_active_alerts()
        for alert in alerts[-3:]:  # Show last 3
            print(f"   🚨 {alert['severity'].upper()}: {alert['name']}")
            print(f"      {alert['message']}")
    else:
        print("   ✅ No active alerts")

    print("\n✅ Health monitoring demo completed\n")


async def demo_config_management():
    """Demonstrate configuration management"""
    print("⚙️ CONFIGURATION MANAGEMENT DEMO")
    print("=" * 50)

    config_manager = get_config_manager()

    # Show current configuration
    print("1. Current Configuration:")
    print(f"   Enforcement Mode: {config_manager.get_current_enforcement_mode().value}")
    print(f"   Rollback Enabled: {config_manager.rollback.enabled}")
    print(f"   Auto Escalation: {config_manager.graduated_enforcement.auto_escalation_enabled}")

    # Test mode changes
    print("\n2. Changing Enforcement Mode:")
    original_mode = config_manager.get_current_enforcement_mode()
    config_manager.set_enforcement_mode(EnforcementMode.WARN)
    print(f"   Changed to: {config_manager.get_current_enforcement_mode().value}")

    # Test escalation logic
    print("\n3. Testing Escalation Logic:")
    test_metrics = {"error_rate": 0.25}  # Above threshold
    should_escalate = config_manager.should_escalate_enforcement(test_metrics)
    print(f"   Error rate 25%: {'Should escalate' if should_escalate else 'No escalation needed'}")

    # Restore original mode
    config_manager.set_enforcement_mode(original_mode)

    print("\n✅ Configuration management demo completed\n")


async def demo_production_scenario():
    """Demonstrate production failure scenario"""
    print("🏭 PRODUCTION FAILURE SCENARIO DEMO")
    print("=" * 50)

    safety_system = get_safety_system()
    alert_manager = get_alert_manager()

    print("1. Simulating High Error Rate...")

    # Simulate increasing error rate
    for i in range(8):
        error_rate = 0.1 + (i * 0.1)  # 10% to 80%
        await alert_manager.record_metric("error_rate", error_rate)
        await safety_system._record_metrics(100, {"error": f"Error {i}"})
        print(f"   Error rate: {error_rate:.1%}")

        if i % 3 == 0:  # Check health every few iterations
            safety_system._perform_health_check()
            status = safety_system.get_system_status()
            print(f"   Health status: {status['health_status']}")

    # Wait for alert processing and emergency triggers
    await asyncio.sleep(1)

    print("\n2. System Response:")
    status = safety_system.get_system_status()
    print(f"   Final Health: {status['health_status']}")
    print(f"   Emergency Mode: {'🆘 ACTIVE' if status['emergency_mode'] else '✅ Normal'}")
    print(f"   Enforcement Level: {status['enforcement_level']}")

    # Show alerts triggered
    alert_summary = alert_manager.get_alert_summary()
    print(f"   Active Alerts: {alert_summary['total_active_alerts']}")

    if alert_summary['total_active_alerts'] > 0:
        alerts = alert_manager.get_active_alerts()
        for alert in alerts[-2:]:  # Show last 2
            severity_emoji = {"warning": "⚠️", "critical": "🔴", "emergency": "🆘"}
            emoji = severity_emoji.get(alert['severity'], "❓")
            print(f"   {emoji} {alert['name']}: {alert['message'][:50]}...")

    print("\n3. Recovery Actions:")
    if status['emergency_mode']:
        print("   🆘 Emergency mode activated automatically")
        print("   📋 Follow emergency procedures")
        print("   🔄 System will auto-recover in 30 minutes")
    else:
        print("   ⚠️ System degraded but operational")
        print("   📊 Continue monitoring metrics")

    print("\n✅ Production scenario demo completed\n")


async def demo_cli_operations():
    """Demonstrate CLI operations"""
    print("💻 CLI OPERATIONS DEMO")
    print("=" * 50)

    # This would normally be done via command line, but we'll simulate
    print("1. Available CLI Commands:")
    commands = [
        "safety_system_cli.py status",
        "safety_system_cli.py bypass <code> <reason>",
        "safety_system_cli.py emergency <reason>",
        "safety_system_cli.py rollback <reason>",
        "safety_system_cli.py monitor --duration 300",
        "safety_system_cli.py alerts list",
        "safety_system_cli.py config set-mode warn",
        "safety_system_cli.py validate write file.txt"
    ]

    for cmd in commands:
        print(f"   {cmd}")

    print("\n2. Example CLI Usage:")
    print("   # Check system status")
    print("   $ python src/core/safety_system_cli.py status")
    print("   Health Status: 🟢 HEALTHY")
    print("   Enforcement Level: 🚫 ENFORCE")
    print("   Emergency Mode: ✅ Normal")
    print()
    print("   # Use emergency bypass")
    print("   $ python src/core/safety_system_cli.py bypass a1b2c3d4 \"Critical deployment\"")
    print("   ✅ Bypass code activated: emergency")
    print("   Duration: 60 minutes")
    print()
    print("   # Monitor system real-time")
    print("   $ python src/core/safety_system_cli.py monitor --interval 5")
    print("   🔍 Real-time Safety System Monitor")
    print("   Health: HEALTHY    | Mode: ENFORCE | Alerts: 0")

    print("\n✅ CLI operations demo completed\n")


async def main():
    """Run complete safety system demonstration"""
    print("🛡️  HOOK SAFETY SYSTEM - COMPREHENSIVE DEMONSTRATION")
    print("=" * 70)
    print("This demo shows all safety system capabilities including:")
    print("• Emergency bypass codes with multiple scenarios")
    print("• Graduated enforcement (monitor → warn → enforce)")
    print("• Real-time health monitoring and alerting")
    print("• Automatic rollback and recovery procedures")
    print("• Configuration management and hot-reload")
    print("• Production failure scenario handling")
    print("• Command-line interface operations")
    print("=" * 70)
    print()

    demos = [
        demo_basic_operations,
        demo_emergency_bypass,
        demo_health_monitoring,
        demo_config_management,
        demo_production_scenario,
        demo_cli_operations
    ]

    for i, demo in enumerate(demos, 1):
        print(f"[{i}/{len(demos)}] ", end="")
        await demo()

        if i < len(demos):
            print("Press Enter to continue to next demo...")
            input()
            print()

    print("🎉 DEMONSTRATION COMPLETE!")
    print("=" * 50)
    print("The Hook Safety System is fully operational with:")
    print("✅ Emergency bypass system (3+ bypass codes)")
    print("✅ Graduated enforcement with auto-escalation")
    print("✅ Real-time health monitoring")
    print("✅ Comprehensive alerting system")
    print("✅ Automatic rollback procedures")
    print("✅ Configuration management")
    print("✅ CLI interface for all operations")
    print("✅ Production-ready deployment")
    print()
    print("📚 Documentation available in:")
    print("   • .claude_workspace/emergency_procedures.md")
    print("   • src/core/safety_system_cli.py --help")
    print("   • scripts/validate_safety_system.py")
    print()
    print("🚨 Emergency Contact Information:")
    print("   • Check emergency_procedures.md for contact details")
    print("   • Use bypass codes only in genuine emergencies")
    print("   • Monitor system health regularly")


if __name__ == "__main__":
    asyncio.run(main())
