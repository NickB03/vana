#!/usr/bin/env python3
"""
ADK Coordination Monitoring Script
Tracks metrics and logs for production rollout
"""

import os
import sys
import json
import time
import re
from datetime import datetime, timedelta
from collections import defaultdict

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class ADKCoordinationMonitor:
    """Monitor ADK coordination metrics and logs."""
    
    def __init__(self):
        self.metrics = defaultdict(lambda: defaultdict(int))
        self.log_patterns = {
            'adk_active': re.compile(r'Using ADK coordination mechanism'),
            'legacy_active': re.compile(r'Using legacy coordination mechanism'),
            'adk_success': re.compile(r'ADK Transfer successful to (\w+)'),
            'adk_error': re.compile(r'ADK Transfer failed: (.+)'),
            'coordination_error': re.compile(r'Coordination error: (.+)')
        }
        self.start_time = datetime.now()
    
    def parse_log_line(self, line):
        """Parse a log line for relevant metrics."""
        for pattern_name, pattern in self.log_patterns.items():
            match = pattern.search(line)
            if match:
                self.metrics['patterns'][pattern_name] += 1
                if pattern_name == 'adk_success':
                    agent_name = match.group(1)
                    self.metrics['agents'][agent_name] += 1
                elif pattern_name in ['adk_error', 'coordination_error']:
                    error_msg = match.group(1)
                    self.metrics['errors'][error_msg] += 1
    
    def calculate_metrics(self):
        """Calculate derived metrics."""
        total_coordinations = (
            self.metrics['patterns']['adk_active'] + 
            self.metrics['patterns']['legacy_active']
        )
        
        adk_coordinations = self.metrics['patterns']['adk_active']
        legacy_coordinations = self.metrics['patterns']['legacy_active']
        
        # Success rate
        total_attempts = adk_coordinations
        successful = self.metrics['patterns']['adk_success']
        errors = self.metrics['patterns']['adk_error']
        
        success_rate = (successful / total_attempts * 100) if total_attempts > 0 else 100
        error_rate = (errors / total_attempts * 100) if total_attempts > 0 else 0
        
        # ADK adoption rate
        adk_adoption_rate = (adk_coordinations / total_coordinations * 100) if total_coordinations > 0 else 0
        
        return {
            'total_coordinations': total_coordinations,
            'adk_coordinations': adk_coordinations,
            'legacy_coordinations': legacy_coordinations,
            'adk_adoption_rate': adk_adoption_rate,
            'success_rate': success_rate,
            'error_rate': error_rate,
            'successful_transfers': successful,
            'errors': errors
        }
    
    def generate_report(self):
        """Generate monitoring report."""
        metrics = self.calculate_metrics()
        runtime = datetime.now() - self.start_time
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'runtime_seconds': runtime.total_seconds(),
            'metrics': metrics,
            'agent_distribution': dict(self.metrics['agents']),
            'error_distribution': dict(self.metrics['errors']),
            'feature_flags': {
                'USE_ADK_COORDINATION': os.getenv('USE_ADK_COORDINATION', 'false'),
                'USE_OFFICIAL_AGENT_TOOL': os.getenv('USE_OFFICIAL_AGENT_TOOL', 'false')
            }
        }
        
        return report
    
    def print_dashboard(self):
        """Print monitoring dashboard."""
        metrics = self.calculate_metrics()
        
        print("\n" + "=" * 60)
        print("📊 ADK Coordination Monitoring Dashboard")
        print("=" * 60)
        
        print(f"\n🕐 Runtime: {datetime.now() - self.start_time}")
        print(f"🌍 Environment: {os.getenv('ENVIRONMENT', 'development')}")
        
        print("\n📈 Coordination Metrics:")
        print(f"  Total Coordinations: {metrics['total_coordinations']}")
        print(f"  ADK Coordinations: {metrics['adk_coordinations']}")
        print(f"  Legacy Coordinations: {metrics['legacy_coordinations']}")
        print(f"  ADK Adoption Rate: {metrics['adk_adoption_rate']:.1f}%")
        
        print("\n✅ Success Metrics:")
        print(f"  Success Rate: {metrics['success_rate']:.1f}%")
        print(f"  Error Rate: {metrics['error_rate']:.1f}%")
        print(f"  Successful Transfers: {metrics['successful_transfers']}")
        print(f"  Errors: {metrics['errors']}")
        
        if self.metrics['agents']:
            print("\n🤖 Agent Distribution:")
            for agent, count in sorted(self.metrics['agents'].items(), key=lambda x: x[1], reverse=True):
                print(f"  {agent}: {count} transfers")
        
        if self.metrics['errors']:
            print("\n⚠️  Error Distribution:")
            for error, count in sorted(self.metrics['errors'].items(), key=lambda x: x[1], reverse=True)[:5]:
                print(f"  {error[:50]}...: {count} occurrences")
        
        # Alerts
        print("\n🚨 Alerts:")
        if metrics['error_rate'] > 0.5:
            print(f"  ⚠️  HIGH ERROR RATE: {metrics['error_rate']:.1f}% (threshold: 0.5%)")
        if metrics['success_rate'] < 99.5:
            print(f"  ⚠️  LOW SUCCESS RATE: {metrics['success_rate']:.1f}% (threshold: 99.5%)")
        if metrics['adk_adoption_rate'] < 100:
            print(f"  ℹ️  PARTIAL ADOPTION: {metrics['adk_adoption_rate']:.1f}% using ADK")
        
        if not any([metrics['error_rate'] > 0.5, metrics['success_rate'] < 99.5]):
            print("  ✅ All metrics within normal range")

def simulate_log_monitoring(monitor, duration_seconds=10):
    """Simulate log monitoring for testing."""
    print(f"\n🔍 Simulating log monitoring for {duration_seconds} seconds...")
    
    # Simulate some log entries
    test_logs = [
        "INFO:lib._tools.real_coordination_tools:Using ADK coordination mechanism",
        "INFO:lib._tools.real_coordination_tools:🚀 ADK Transfer to architecture_specialist: Analyze code structure",
        "INFO:lib._tools.real_coordination_tools:✅ ADK Transfer successful to architecture_specialist",
        "INFO:lib._tools.real_coordination_tools:Using ADK coordination mechanism",
        "INFO:lib._tools.real_coordination_tools:🚀 ADK Transfer to data_science_specialist: Process metrics",
        "INFO:lib._tools.real_coordination_tools:✅ ADK Transfer successful to data_science_specialist",
        "INFO:lib._tools.real_coordination_tools:Using ADK coordination mechanism",
        "INFO:lib._tools.real_coordination_tools:🚀 ADK Transfer to security_specialist: Security audit",
        "INFO:lib._tools.real_coordination_tools:✅ ADK Transfer successful to security_specialist",
    ]
    
    for log in test_logs:
        monitor.parse_log_line(log)
        time.sleep(0.5)

def main():
    """Main monitoring entry point."""
    from dotenv import load_dotenv
    load_dotenv('.env.development')
    
    monitor = ADKCoordinationMonitor()
    
    # For development, simulate some activity
    simulate_log_monitoring(monitor, duration_seconds=5)
    
    # Generate and display report
    monitor.print_dashboard()
    
    # Save report
    report = monitor.generate_report()
    report_path = f".development/reports/adk-monitoring-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Report saved to: {report_path}")
    
    # Check if we should trigger alerts
    metrics = monitor.calculate_metrics()
    if metrics['error_rate'] > 1.0 or metrics['success_rate'] < 99.0:
        print("\n🚨 ALERT: Metrics outside acceptable range!")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())