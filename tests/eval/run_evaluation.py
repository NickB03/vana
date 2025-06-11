#!/usr/bin/env python3
"""
VANA Evaluation Framework Execution Script
Easy-to-use script for running comprehensive system evaluation

Usage:
    python tests/eval/run_evaluation.py --help
    python tests/eval/run_evaluation.py --agents-only
    python tests/eval/run_evaluation.py --full
    python tests/eval/run_evaluation.py --performance-only
"""

import asyncio
import argparse
import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.append(str(project_root))

# Set working directory to project root
os.chdir(project_root)

from tests.eval.agent_evaluator import VANASystemEvaluator
from tests.eval.performance_benchmarks import VANAPerformanceBenchmarks
from tests.eval.test_evaluation import ComprehensiveEvaluationRunner

async def run_agents_only(environment: str = "dev"):
    """Run only agent evaluation"""
    print("🧪 Running Agent Evaluation Only")
    print("=" * 60)
    
    evaluator = VANASystemEvaluator(environment=environment)
    results = await evaluator.evaluate_all_agents()
    
    print("\n✅ Agent evaluation completed successfully!")
    return results

async def run_performance_only(environment: str = "dev"):
    """Run only performance benchmarking"""
    print("⚡ Running Performance Benchmarking Only")
    print("=" * 60)
    
    benchmarks = VANAPerformanceBenchmarks()
    results = await benchmarks.run_comprehensive_benchmarks()
    
    print("\n✅ Performance benchmarking completed successfully!")
    return results

async def run_full_evaluation(environment: str = "dev", skip_discovery: bool = False, skip_performance: bool = False):
    """Run comprehensive evaluation"""
    print("🎯 Running Comprehensive VANA System Evaluation")
    print("=" * 80)
    
    runner = ComprehensiveEvaluationRunner()
    results = await runner.run_full_evaluation(
        include_discovery=not skip_discovery,
        include_performance=not skip_performance
    )
    
    print("\n✅ Comprehensive evaluation completed successfully!")
    return results

def print_usage_examples():
    """Print usage examples"""
    print("\n📋 USAGE EXAMPLES:")
    print("=" * 50)
    print("# Quick agent evaluation (recommended for first run)")
    print("python tests/eval/run_evaluation.py --agents-only")
    print()
    print("# Performance benchmarking only")
    print("python tests/eval/run_evaluation.py --performance-only")
    print()
    print("# Full comprehensive evaluation")
    print("python tests/eval/run_evaluation.py --full")
    print()
    print("# Full evaluation without system discovery")
    print("python tests/eval/run_evaluation.py --full --skip-discovery")
    print()
    print("# Run against production environment")
    print("python tests/eval/run_evaluation.py --agents-only --env prod")
    print()
    print("# Environment variables for configuration:")
    print("export VANA_DEV_URL='https://your-dev-url.com'")
    print("export VANA_BROWSER_HEADLESS='false'  # Show browser")
    print("export VANA_RESPONSE_TIME_TARGET='3.0'  # 3 second target")
    print("=" * 50)

def validate_environment():
    """Validate that the environment is set up correctly"""
    print("🔍 Validating Environment...")
    
    # Check if we're in the right directory
    if not Path("agents").exists() or not Path("tests").exists():
        print("❌ Error: Please run this script from the VANA project root directory")
        print("   Current directory:", os.getcwd())
        print("   Expected files: agents/, tests/, pyproject.toml")
        return False
    
    # Check if required directories exist
    required_dirs = [
        "tests/eval/evalsets",
        "tests/results"
    ]
    
    for dir_path in required_dirs:
        if not Path(dir_path).exists():
            print(f"📁 Creating missing directory: {dir_path}")
            Path(dir_path).mkdir(parents=True, exist_ok=True)
    
    # Check if evalsets exist
    evalsets_dir = Path("tests/eval/evalsets")
    evalset_files = list(evalsets_dir.glob("*.json"))
    
    if not evalset_files:
        print("❌ Error: No evaluation sets found in tests/eval/evalsets/")
        print("   Expected files: vana_agent_evalset.json, architecture_specialist_evalset.json, etc.")
        return False
    
    print(f"✅ Found {len(evalset_files)} evaluation sets")
    print("✅ Environment validation passed")
    return True

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="VANA System Comprehensive Evaluation Framework",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --agents-only              # Quick agent evaluation
  %(prog)s --performance-only         # Performance benchmarking only  
  %(prog)s --full                     # Complete evaluation
  %(prog)s --full --skip-discovery    # Skip system discovery phase
  %(prog)s --agents-only --env prod   # Test production environment
        """
    )
    
    # Execution mode (mutually exclusive)
    mode_group = parser.add_mutually_exclusive_group(required=True)
    mode_group.add_argument("--agents-only", action="store_true", 
                           help="Run only agent evaluation (recommended for first run)")
    mode_group.add_argument("--performance-only", action="store_true",
                           help="Run only performance benchmarking")
    mode_group.add_argument("--full", action="store_true",
                           help="Run comprehensive evaluation")
    mode_group.add_argument("--examples", action="store_true",
                           help="Show usage examples and exit")
    
    # Configuration options
    parser.add_argument("--env", choices=["dev", "prod"], default="dev",
                       help="Environment to test (default: dev)")
    parser.add_argument("--skip-discovery", action="store_true",
                       help="Skip system discovery phase (only with --full)")
    parser.add_argument("--skip-performance", action="store_true", 
                       help="Skip performance benchmarking (only with --full)")
    parser.add_argument("--headless", action="store_true",
                       help="Force headless browser mode")
    parser.add_argument("--show-browser", action="store_true",
                       help="Show browser during testing (non-headless)")
    
    args = parser.parse_args()
    
    # Show examples and exit
    if args.examples:
        print_usage_examples()
        return
    
    # Set browser mode if specified
    if args.headless:
        os.environ["VANA_BROWSER_HEADLESS"] = "true"
    elif args.show_browser:
        os.environ["VANA_BROWSER_HEADLESS"] = "false"
    
    # Validate environment
    if not validate_environment():
        sys.exit(1)
    
    try:
        # Execute based on mode
        if args.agents_only:
            results = await run_agents_only(args.env)
        elif args.performance_only:
            results = await run_performance_only(args.env)
        elif args.full:
            results = await run_full_evaluation(
                environment=args.env,
                skip_discovery=args.skip_discovery,
                skip_performance=args.skip_performance
            )
        
        print(f"\n🎉 Evaluation completed successfully!")
        print(f"📊 Results saved in: tests/results/")
        
        # Print quick summary
        if isinstance(results, dict):
            if "overall_metrics" in results:
                metrics = results["overall_metrics"]
                print(f"\n📈 QUICK SUMMARY:")
                print(f"   Success Rate: {metrics.get('overall_success_rate', 0):.1%}")
                print(f"   Avg Response Time: {metrics.get('average_response_time', 0):.2f}s")
                print(f"   Performance Grade: {metrics.get('performance_grade', 'N/A')}")
        
        return 0
        
    except KeyboardInterrupt:
        print("\n⚠️ Evaluation interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Evaluation failed: {str(e)}")
        print(f"💡 Try running with --examples to see usage examples")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
