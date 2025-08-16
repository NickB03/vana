#!/usr/bin/env python3
"""
Hook Safety System CLI
======================

Command-line interface for managing the hook safety system.
Provides emergency controls, monitoring, and system management.
"""

import argparse
import asyncio
import json
import logging
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from hook_alerting_system import AlertSeverity, get_alert_manager
from hook_safety_config import get_config_manager

# Import safety system components
from hook_safety_system import get_safety_system


class SafetySystemCLI:
    """Command-line interface for safety system management"""

    def __init__(self):
        self.safety_system = get_safety_system()
        self.config_manager = get_config_manager()
        self.alert_manager = get_alert_manager()

        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger("safety_cli")

    def create_parser(self) -> argparse.ArgumentParser:
        """Create the argument parser"""
        parser = argparse.ArgumentParser(
            description="Hook Safety System Management CLI",
            formatter_class=argparse.RawDescriptionHelpFormatter,
            epilog="""
Examples:
  %(prog)s status                                    # Show system status
  %(prog)s bypass emergency "Critical deployment"    # Use emergency bypass
  %(prog)s rollback "System instability"             # Emergency rollback
  %(prog)s monitor --duration 300                    # Monitor for 5 minutes
  %(prog)s alerts list                               # List active alerts
  %(prog)s config set-mode warn                      # Set enforcement mode
            """
        )

        subparsers = parser.add_subparsers(dest='command', help='Available commands')

        # Status command
        status_parser = subparsers.add_parser('status', help='Show system status')
        status_parser.add_argument('--format', choices=['json', 'table'], default='table',
                                 help='Output format')

        # Bypass command
        bypass_parser = subparsers.add_parser('bypass', help='Use emergency bypass')
        bypass_parser.add_argument('code', help='Bypass code')
        bypass_parser.add_argument('reason', help='Reason for bypass')

        # Generate bypass command
        generate_parser = subparsers.add_parser('generate', help='Generate new bypass code')
        generate_parser.add_argument('type', help='Code type (emergency, hotfix, maintenance)')
        generate_parser.add_argument('purpose', help='Purpose of the bypass code')
        generate_parser.add_argument('--expiry-hours', type=int, default=24,
                                   help='Code expiry in hours')
        generate_parser.add_argument('--max-uses', type=int, default=5,
                                   help='Maximum number of uses')
        generate_parser.add_argument('--created-by', default='cli',
                                   help='Who created the code')

        # Emergency command
        emergency_parser = subparsers.add_parser('emergency', help='Trigger emergency mode')
        emergency_parser.add_argument('reason', help='Reason for emergency mode')

        # Rollback command
        rollback_parser = subparsers.add_parser('rollback', help='Emergency rollback')
        rollback_parser.add_argument('reason', help='Reason for rollback')

        # Monitor command
        monitor_parser = subparsers.add_parser('monitor', help='Monitor system in real-time')
        monitor_parser.add_argument('--duration', type=int, default=0,
                                  help='Duration in seconds (0 = infinite)')
        monitor_parser.add_argument('--interval', type=int, default=5,
                                  help='Update interval in seconds')

        # Alerts command
        alerts_parser = subparsers.add_parser('alerts', help='Manage alerts')
        alerts_subparsers = alerts_parser.add_subparsers(dest='alerts_action')

        # Alert subcommands
        alerts_subparsers.add_parser('list', help='List active alerts')
        alerts_subparsers.add_parser('summary', help='Show alert summary')

        ack_parser = alerts_subparsers.add_parser('ack', help='Acknowledge alert')
        ack_parser.add_argument('alert_id', help='Alert ID')
        ack_parser.add_argument('--user', default='cli', help='Acknowledging user')

        resolve_parser = alerts_subparsers.add_parser('resolve', help='Resolve alert')
        resolve_parser.add_argument('alert_id', help='Alert ID')

        suppress_parser = alerts_subparsers.add_parser('suppress', help='Suppress alert')
        suppress_parser.add_argument('alert_id', help='Alert ID')
        suppress_parser.add_argument('duration', type=int, help='Duration in minutes')

        test_alert_parser = alerts_subparsers.add_parser('test', help='Trigger test alert')
        test_alert_parser.add_argument('--severity', choices=['info', 'warning', 'critical', 'emergency'],
                                     default='warning', help='Alert severity')

        # Config command
        config_parser = subparsers.add_parser('config', help='Configuration management')
        config_subparsers = config_parser.add_subparsers(dest='config_action')

        # Config subcommands
        config_subparsers.add_parser('show', help='Show current configuration')
        config_subparsers.add_parser('validate', help='Validate configuration')

        mode_parser = config_subparsers.add_parser('set-mode', help='Set enforcement mode')
        mode_parser.add_argument('mode', choices=['monitor', 'warn', 'soft', 'enforce'],
                               help='Enforcement mode')

        export_parser = config_subparsers.add_parser('export', help='Export configuration')
        export_parser.add_argument('--format', choices=['yaml', 'json'], default='yaml',
                                 help='Export format')
        export_parser.add_argument('--file', help='Output file (stdout if not specified)')

        import_parser = config_subparsers.add_parser('import', help='Import configuration')
        import_parser.add_argument('file', help='Configuration file to import')
        import_parser.add_argument('--format', choices=['yaml', 'json'], default='yaml',
                                 help='Import format')

        # Metrics command
        metrics_parser = subparsers.add_parser('metrics', help='Metrics and statistics')
        metrics_subparsers = metrics_parser.add_subparsers(dest='metrics_action')

        record_parser = metrics_subparsers.add_parser('record', help='Record a metric')
        record_parser.add_argument('name', help='Metric name')
        record_parser.add_argument('value', type=float, help='Metric value')

        stats_parser = metrics_subparsers.add_parser('stats', help='Show metric statistics')
        stats_parser.add_argument('name', help='Metric name')
        stats_parser.add_argument('--hours', type=int, default=24, help='Time range in hours')

        # Test command
        test_parser = subparsers.add_parser('test', help='Run safety system tests')
        test_parser.add_argument('--category', choices=['safety', 'config', 'alerts', 'production', 'stress'],
                               help='Test category to run')
        test_parser.add_argument('--verbose', action='store_true', help='Verbose output')

        # Health command
        health_parser = subparsers.add_parser('health', help='Health check commands')
        health_subparsers = health_parser.add_subparsers(dest='health_action')

        health_subparsers.add_parser('check', help='Perform health check')
        health_subparsers.add_parser('history', help='Show health history')

        # Validate command
        validate_parser = subparsers.add_parser('validate', help='Validate file operation')
        validate_parser.add_argument('operation', choices=['write', 'edit', 'delete'],
                                   help='Operation type')
        validate_parser.add_argument('file_path', help='File path')
        validate_parser.add_argument('--content', help='File content (for write/edit)')
        validate_parser.add_argument('--content-file', help='File containing content')

        return parser

    async def execute_command(self, args) -> int:
        """Execute the specified command"""
        try:
            if args.command == 'status':
                return await self.cmd_status(args)
            elif args.command == 'bypass':
                return await self.cmd_bypass(args)
            elif args.command == 'generate':
                return await self.cmd_generate(args)
            elif args.command == 'emergency':
                return await self.cmd_emergency(args)
            elif args.command == 'rollback':
                return await self.cmd_rollback(args)
            elif args.command == 'monitor':
                return await self.cmd_monitor(args)
            elif args.command == 'alerts':
                return await self.cmd_alerts(args)
            elif args.command == 'config':
                return await self.cmd_config(args)
            elif args.command == 'metrics':
                return await self.cmd_metrics(args)
            elif args.command == 'test':
                return await self.cmd_test(args)
            elif args.command == 'health':
                return await self.cmd_health(args)
            elif args.command == 'validate':
                return await self.cmd_validate(args)
            else:
                print("No command specified. Use --help for usage information.")
                return 1

        except Exception as e:
            self.logger.error(f"Command execution failed: {e}")
            print(f"Error: {e}")
            return 1

    async def cmd_status(self, args) -> int:
        """Show system status"""
        status = self.safety_system.get_system_status()

        if args.format == 'json':
            print(json.dumps(status, indent=2, default=str))
        else:
            self._print_status_table(status)

        return 0

    def _print_status_table(self, status: dict[str, Any]):
        """Print status in table format"""
        print("🛡️  Hook Safety System Status")
        print("=" * 50)

        # Basic status
        health_emoji = {
            "healthy": "🟢",
            "degraded": "🟡",
            "failing": "🟠",
            "critical": "🔴",
            "emergency": "🆘"
        }

        enforcement_emoji = {
            "monitor": "👁️",
            "warn": "⚠️",
            "soft": "🛑",
            "enforce": "🚫",
            "emergency": "🆘"
        }

        print(f"Health Status:     {health_emoji.get(status['health_status'], '❓')} {status['health_status'].upper()}")
        print(f"Enforcement Level: {enforcement_emoji.get(status['enforcement_level'], '❓')} {status['enforcement_level'].upper()}")
        print(f"Emergency Mode:    {'🆘 ACTIVE' if status['emergency_mode'] else '✅ Normal'}")
        print(f"Monitoring:        {'✅ Active' if status['monitoring_active'] else '❌ Inactive'}")
        print(f"Last Health Check: {status['last_health_check']}")
        print()

        # Metrics
        metrics = status['metrics']
        print("📊 Recent Metrics")
        print("-" * 30)
        print(f"Total Operations:  {metrics['total_operations']}")
        print(f"Error Rate:        {metrics['recent_error_rate']:.1%}")
        print(f"Avg Exec Time:     {metrics['avg_execution_time_ms']:.1f}ms")
        print(f"Memory Usage:      {metrics['avg_memory_usage_mb']:.1f}MB")
        print()

        # Bypass codes
        print("🔑 Available Bypass Codes")
        print("-" * 30)
        for code_id, code_info in status['bypass_codes'].items():
            expiry = code_info['expiry']
            expiry_str = expiry.split('T')[0] if expiry else "No expiry"
            print(f"{code_id:12} | {code_info['uses_remaining']:2} uses | Expires: {expiry_str}")
        print()

        # Alerts
        if status['active_alerts'] > 0:
            print(f"🚨 Active Alerts: {status['active_alerts']}")
        else:
            print("✅ No Active Alerts")

    async def cmd_bypass(self, args) -> int:
        """Use emergency bypass"""
        result = self.safety_system.use_bypass_code(args.code, args.reason)

        if result['success']:
            print(f"✅ Bypass code activated: {result['code_id']}")
            print(f"   Purpose: {result['purpose']}")
            print(f"   Uses remaining: {result['uses_remaining']}")
            print(f"   Enforcement level: {result['enforcement_level']}")
            print(f"   Duration: {result['duration_minutes']} minutes")
        else:
            print(f"❌ Bypass failed: {result['error']}")
            return 1

        return 0

    async def cmd_generate(self, args) -> int:
        """Generate new bypass code"""
        result = self.safety_system.generate_new_bypass_code(
            args.type, args.purpose, args.expiry_hours, args.max_uses, args.created_by
        )

        print("✅ New bypass code generated")
        print(f"   Type: {result['code_type']}")
        print(f"   Code: {result['code']}")
        print(f"   Purpose: {result['purpose']}")
        print(f"   Expiry: {result['expiry']}")
        print(f"   Max uses: {result['max_uses']}")
        print(f"   Created by: {result['created_by']}")
        print()
        print("⚠️  IMPORTANT: Store this code securely!")

        return 0

    async def cmd_emergency(self, args) -> int:
        """Trigger emergency mode"""
        await self.safety_system._trigger_emergency_mode(args.reason)
        print(f"🆘 Emergency mode activated: {args.reason}")
        print("   All validations will be bypassed")
        print("   System will automatically recover in 30 minutes")

        return 0

    async def cmd_rollback(self, args) -> int:
        """Emergency rollback"""
        await self.safety_system.emergency_rollback(args.reason)
        print(f"🔄 Emergency rollback completed: {args.reason}")
        print("   System set to safe monitor mode")
        print("   Review logs and restore manually when safe")

        return 0

    async def cmd_monitor(self, args) -> int:
        """Monitor system in real-time"""
        print("🔍 Real-time Safety System Monitor")
        print("Press Ctrl+C to stop")
        print("=" * 50)

        start_time = time.time()
        try:
            while True:
                status = self.safety_system.get_system_status()
                alert_summary = self.alert_manager.get_alert_summary()

                # Clear screen and show status
                print("\033[2J\033[H")  # Clear screen
                print(f"🛡️  Safety Monitor - {datetime.now().strftime('%H:%M:%S')}")
                print("=" * 50)

                # Key metrics
                metrics = status['metrics']
                print(f"Health: {status['health_status'].upper():<10} | "
                      f"Mode: {status['enforcement_level'].upper():<8} | "
                      f"Alerts: {alert_summary['total_active_alerts']}")
                print(f"Error Rate: {metrics['recent_error_rate']:.1%:<8} | "
                      f"Exec Time: {metrics['avg_execution_time_ms']:.0f}ms | "
                      f"Memory: {metrics['avg_memory_usage_mb']:.0f}MB")
                print("-" * 50)

                # Recent alerts
                if alert_summary['total_active_alerts'] > 0:
                    alerts = self.alert_manager.get_active_alerts()
                    print("🚨 Active Alerts:")
                    for alert in alerts[-5:]:  # Show last 5
                        severity_emoji = {"info": "ℹ️", "warning": "⚠️", "critical": "🔴", "emergency": "🆘"}
                        emoji = severity_emoji.get(alert['severity'], "❓")
                        print(f"   {emoji} {alert['name']} - {alert['message'][:60]}")

                await asyncio.sleep(args.interval)

                # Check duration
                if args.duration > 0 and time.time() - start_time > args.duration:
                    break

        except KeyboardInterrupt:
            print("\n\n✅ Monitoring stopped")

        return 0

    async def cmd_alerts(self, args) -> int:
        """Manage alerts"""
        if args.alerts_action == 'list':
            alerts = self.alert_manager.get_active_alerts()
            if not alerts:
                print("✅ No active alerts")
                return 0

            print("🚨 Active Alerts")
            print("=" * 80)
            for alert in alerts:
                severity_emoji = {"info": "ℹ️", "warning": "⚠️", "critical": "🔴", "emergency": "🆘"}
                emoji = severity_emoji.get(alert['severity'], "❓")
                triggered = alert['triggered_at'][:19]  # Remove microseconds
                print(f"{emoji} {alert['id'][:12]}... | {alert['severity'].upper():<8} | {triggered}")
                print(f"   {alert['name']}: {alert['message']}")
                print()

        elif args.alerts_action == 'summary':
            summary = self.alert_manager.get_alert_summary()
            print(json.dumps(summary, indent=2))

        elif args.alerts_action == 'ack':
            success = await self.alert_manager.acknowledge_alert(args.alert_id, args.user)
            if success:
                print(f"✅ Alert acknowledged: {args.alert_id}")
            else:
                print(f"❌ Alert not found: {args.alert_id}")
                return 1

        elif args.alerts_action == 'resolve':
            success = await self.alert_manager.resolve_alert(args.alert_id)
            if success:
                print(f"✅ Alert resolved: {args.alert_id}")
            else:
                print(f"❌ Alert not found: {args.alert_id}")
                return 1

        elif args.alerts_action == 'suppress':
            success = await self.alert_manager.suppress_alert(args.alert_id, args.duration)
            if success:
                print(f"✅ Alert suppressed for {args.duration} minutes: {args.alert_id}")
            else:
                print(f"❌ Alert not found: {args.alert_id}")
                return 1

        elif args.alerts_action == 'test':
            severity = AlertSeverity(args.severity)
            alert_id = await self.alert_manager.trigger_alert(
                "cli_test_alert", severity, "Test alert from CLI",
                {"source": "cli", "test": True}, ["test", "cli"]
            )
            print(f"✅ Test alert triggered: {alert_id}")

        return 0

    async def cmd_config(self, args) -> int:
        """Configuration management"""
        if args.config_action == 'show':
            status = {
                "enforcement_mode": self.config_manager.get_current_enforcement_mode().value,
                "rollback_enabled": self.config_manager.rollback.enabled,
                "monitoring_enabled": self.config_manager.monitoring.enabled,
                "alerting_enabled": self.config_manager.alerting.enabled
            }
            print(json.dumps(status, indent=2))

        elif args.config_action == 'validate':
            issues = self.config_manager.validate_configuration()
            if issues['errors']:
                print("❌ Configuration Errors:")
                for error in issues['errors']:
                    print(f"   • {error}")

            if issues['warnings']:
                print("⚠️  Configuration Warnings:")
                for warning in issues['warnings']:
                    print(f"   • {warning}")

            if issues['suggestions']:
                print("💡 Suggestions:")
                for suggestion in issues['suggestions']:
                    print(f"   • {suggestion}")

            if not any(issues.values()):
                print("✅ Configuration is valid")

        elif args.config_action == 'set-mode':
            self.config_manager.set_enforcement_mode(args.mode)
            print(f"✅ Enforcement mode set to: {args.mode}")

        elif args.config_action == 'export':
            exported = self.config_manager.export_configuration(args.format)
            if args.file:
                with open(args.file, 'w') as f:
                    f.write(exported)
                print(f"✅ Configuration exported to: {args.file}")
            else:
                print(exported)

        elif args.config_action == 'import':
            try:
                with open(args.file) as f:
                    config_data = f.read()
                self.config_manager.import_configuration(config_data, args.format)
                print(f"✅ Configuration imported from: {args.file}")
            except Exception as e:
                print(f"❌ Import failed: {e}")
                return 1

        return 0

    async def cmd_metrics(self, args) -> int:
        """Metrics and statistics"""
        if args.metrics_action == 'record':
            await self.alert_manager.record_metric(args.name, args.value)
            print(f"✅ Metric recorded: {args.name} = {args.value}")

        elif args.metrics_action == 'stats':
            stats = self.alert_manager.get_metric_statistics(args.name, args.hours)
            if 'error' in stats:
                print(f"❌ {stats['error']}")
                return 1
            else:
                print(json.dumps(stats, indent=2))

        return 0

    async def cmd_test(self, args) -> int:
        """Run safety system tests"""
        import subprocess

        test_file = Path(__file__).parent.parent.parent / "tests" / "safety" / "test_hook_safety_system.py"

        if not test_file.exists():
            print(f"❌ Test file not found: {test_file}")
            return 1

        cmd = ["python", "-m", "pytest"]

        if args.category:
            cmd.extend(["-k", f"Test{args.category.title()}"])

        if args.verbose:
            cmd.append("-v")
        else:
            cmd.append("-q")

        cmd.append(str(test_file))

        print("🧪 Running safety system tests...")
        result = subprocess.run(cmd, cwd=Path.cwd())

        return result.returncode

    async def cmd_health(self, args) -> int:
        """Health check commands"""
        if args.health_action == 'check':
            self.safety_system._perform_health_check()
            status = self.safety_system.get_system_status()

            health_status = status['health_status']
            if health_status == 'healthy':
                print("✅ System is healthy")
            elif health_status == 'degraded':
                print("⚠️  System health is degraded")
            elif health_status == 'failing':
                print("🔴 System is failing")
            elif health_status == 'critical':
                print("🆘 System health is critical")
            else:
                print(f"❓ Unknown health status: {health_status}")

            print(f"   Last check: {status['last_health_check']}")
            print(f"   Error rate: {status['metrics']['recent_error_rate']:.1%}")
            print(f"   Memory usage: {status['metrics']['avg_memory_usage_mb']:.1f}MB")

        elif args.health_action == 'history':
            # Show recent health metrics
            metrics = self.safety_system.metrics_history[-20:] if self.safety_system.metrics_history else []
            if not metrics:
                print("📊 No health history available")
                return 0

            print("📊 Recent Health History")
            print("=" * 60)
            for metric in metrics:
                timestamp = metric.timestamp.strftime('%H:%M:%S')
                health = metric.health_status.value
                error_count = metric.error_count
                exec_time = metric.hook_execution_time_ms
                print(f"{timestamp} | {health:<10} | Errors: {error_count} | Time: {exec_time:.0f}ms")

        return 0

    async def cmd_validate(self, args) -> int:
        """Validate file operation"""
        content = None

        if args.content:
            content = args.content
        elif args.content_file:
            try:
                with open(args.content_file) as f:
                    content = f.read()
            except Exception as e:
                print(f"❌ Failed to read content file: {e}")
                return 1

        result = await self.safety_system.validate_operation(args.operation, args.file_path, content)

        if result.get('validated', True):
            print("✅ Validation passed")
        else:
            print("❌ Validation failed")

        # Show details
        if result.get('violations'):
            print("\n🚫 Violations:")
            for violation in result['violations']:
                print(f"   • {violation}")

        if result.get('warnings'):
            print("\n⚠️  Warnings:")
            for warning in result['warnings']:
                print(f"   • {warning}")

        if result.get('suggestions'):
            print("\n💡 Suggestions:")
            for suggestion in result['suggestions']:
                print(f"   • {suggestion}")

        # Show safety metadata
        if args.operation == 'validate' and 'safety_metadata' in result:
            metadata = result['safety_metadata']
            print("\n📊 Safety Info:")
            print(f"   Enforcement: {metadata.get('enforcement_action', 'unknown')}")
            print(f"   Health: {metadata.get('health_status', 'unknown')}")
            if metadata.get('bypass_available'):
                print(f"   Bypass codes available: {len(result.get('bypass_codes', {}))}")

        return 0 if result.get('validated', True) else 1


async def main():
    """Main CLI entry point"""
    cli = SafetySystemCLI()
    parser = cli.create_parser()
    args = parser.parse_args()

    return await cli.execute_command(args)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
