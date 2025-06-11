#!/usr/bin/env python3
"""
VANA System Evaluation Test Runner
Comprehensive test runner for ADK-style evaluation framework

Orchestrates agent evaluation, performance benchmarking, and system validation
Provides unified interface for running all evaluation components
"""

import asyncio
import sys
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

# Add project root to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from tests.eval.agent_evaluator import VANASystemEvaluator
from tests.eval.performance_benchmarks import VANAPerformanceBenchmarks
from tests.discovery.system_discovery_framework import VANASystemDiscovery

class ComprehensiveEvaluationRunner:
    """Comprehensive evaluation runner for VANA system"""
    
    def __init__(self):
        self.results_dir = Path("tests/results")
        self.results_dir.mkdir(exist_ok=True)
        
        # Initialize evaluation components
        self.system_evaluator = VANASystemEvaluator()
        self.performance_benchmarks = VANAPerformanceBenchmarks()
        self.system_discovery = VANASystemDiscovery()
        
    async def run_full_evaluation(self, include_discovery: bool = True, include_performance: bool = True) -> Dict[str, Any]:
        """Run complete system evaluation"""
        print("🧪 Starting Comprehensive VANA System Evaluation")
        print("=" * 80)
        print(f"Timestamp: {datetime.now().isoformat()}")
        print("=" * 80)
        
        evaluation_results = {
            "evaluation_timestamp": datetime.now().isoformat(),
            "evaluation_components": [],
            "system_discovery": {},
            "agent_evaluation": {},
            "performance_benchmarks": {},
            "overall_assessment": {},
            "recommendations": []
        }
        
        try:
            # Phase 1: System Discovery (Optional)
            if include_discovery:
                print("\n🔍 Phase 1: System Discovery & Capability Inventory")
                print("-" * 60)
                evaluation_results["evaluation_components"].append("system_discovery")
                
                discovery_results = await self.system_discovery.run_comprehensive_discovery()
                evaluation_results["system_discovery"] = discovery_results
                
                print("✅ System discovery completed")
            
            # Phase 2: Agent Evaluation (Core)
            print("\n🧪 Phase 2: Agent Evaluation & Validation")
            print("-" * 60)
            evaluation_results["evaluation_components"].append("agent_evaluation")
            
            agent_results = await self.system_evaluator.evaluate_all_agents()
            evaluation_results["agent_evaluation"] = agent_results
            
            print("✅ Agent evaluation completed")
            
            # Phase 3: Performance Benchmarking (Optional)
            if include_performance:
                print("\n⚡ Phase 3: Performance Benchmarking")
                print("-" * 60)
                evaluation_results["evaluation_components"].append("performance_benchmarks")
                
                performance_results = await self.performance_benchmarks.run_comprehensive_benchmarks()
                evaluation_results["performance_benchmarks"] = performance_results
                
                print("✅ Performance benchmarking completed")
            
            # Phase 4: Overall Assessment
            print("\n📊 Phase 4: Overall Assessment & Recommendations")
            print("-" * 60)
            
            overall_assessment = self.generate_overall_assessment(evaluation_results)
            evaluation_results["overall_assessment"] = overall_assessment
            
            recommendations = self.generate_comprehensive_recommendations(evaluation_results)
            evaluation_results["recommendations"] = recommendations
            
            print("✅ Overall assessment completed")
            
            # Save comprehensive results
            self.save_comprehensive_results(evaluation_results)
            
            # Print final summary
            self.print_comprehensive_summary(evaluation_results)
            
        except Exception as e:
            print(f"❌ Evaluation failed: {e}")
            evaluation_results["error"] = str(e)
            
        return evaluation_results
        
    def generate_overall_assessment(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate overall system assessment"""
        assessment = {
            "system_health": "unknown",
            "capability_coverage": "unknown",
            "performance_grade": "unknown",
            "production_readiness": "unknown",
            "confidence_score": 0.0,
            "key_findings": []
        }
        
        # Assess system health from discovery
        discovery = results.get("system_discovery", {})
        if discovery:
            system_health = discovery.get("system_health", {})
            health_endpoint = system_health.get("health_endpoint", {})
            
            if health_endpoint.get("available"):
                assessment["system_health"] = "healthy"
                assessment["key_findings"].append("✅ System health endpoints operational")
            else:
                assessment["system_health"] = "unhealthy"
                assessment["key_findings"].append("❌ System health endpoints not responding")
                
        # Assess capability coverage from agent evaluation
        agent_eval = results.get("agent_evaluation", {})
        if agent_eval:
            overall_metrics = agent_eval.get("overall_metrics", {})
            success_rate = overall_metrics.get("overall_success_rate", 0.0)
            
            if success_rate >= 0.95:
                assessment["capability_coverage"] = "excellent"
            elif success_rate >= 0.80:
                assessment["capability_coverage"] = "good"
            elif success_rate >= 0.60:
                assessment["capability_coverage"] = "acceptable"
            else:
                assessment["capability_coverage"] = "poor"
                
            assessment["key_findings"].append(
                f"🧪 Agent evaluation success rate: {success_rate:.1%}"
            )
            
        # Assess performance from benchmarks
        performance = results.get("performance_benchmarks", {})
        if performance:
            perf_analysis = performance.get("performance_analysis", {})
            scalability = perf_analysis.get("scalability_assessment", {})
            
            assessment["performance_grade"] = scalability.get("scalability_rating", "unknown").lower()
            assessment["key_findings"].append(
                f"⚡ Performance grade: {scalability.get('scalability_rating', 'Unknown')}"
            )
            
        # Calculate overall confidence score
        confidence_factors = []
        
        if assessment["system_health"] == "healthy":
            confidence_factors.append(0.3)
        elif assessment["system_health"] == "unhealthy":
            confidence_factors.append(0.0)
            
        if assessment["capability_coverage"] == "excellent":
            confidence_factors.append(0.4)
        elif assessment["capability_coverage"] == "good":
            confidence_factors.append(0.3)
        elif assessment["capability_coverage"] == "acceptable":
            confidence_factors.append(0.2)
        else:
            confidence_factors.append(0.1)
            
        if assessment["performance_grade"] == "excellent":
            confidence_factors.append(0.3)
        elif assessment["performance_grade"] == "good":
            confidence_factors.append(0.2)
        elif assessment["performance_grade"] == "acceptable":
            confidence_factors.append(0.1)
        else:
            confidence_factors.append(0.05)
            
        assessment["confidence_score"] = sum(confidence_factors)
        
        # Determine production readiness
        if assessment["confidence_score"] >= 0.8:
            assessment["production_readiness"] = "ready"
        elif assessment["confidence_score"] >= 0.6:
            assessment["production_readiness"] = "ready_with_monitoring"
        elif assessment["confidence_score"] >= 0.4:
            assessment["production_readiness"] = "needs_improvement"
        else:
            assessment["production_readiness"] = "not_ready"
            
        return assessment
        
    def generate_comprehensive_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """Generate comprehensive recommendations from all evaluation components"""
        recommendations = []
        
        # Add component-specific recommendations
        agent_eval = results.get("agent_evaluation", {})
        if agent_eval and "recommendations" in agent_eval:
            recommendations.extend(agent_eval["recommendations"])
            
        performance = results.get("performance_benchmarks", {})
        if performance and "recommendations" in performance:
            recommendations.extend(performance["recommendations"])
            
        discovery = results.get("system_discovery", {})
        if discovery and "gap_analysis" in discovery:
            gap_recommendations = discovery["gap_analysis"].get("recommendations", [])
            recommendations.extend(gap_recommendations)
            
        # Add overall recommendations based on assessment
        overall_assessment = results.get("overall_assessment", {})
        production_readiness = overall_assessment.get("production_readiness", "unknown")
        
        if production_readiness == "ready":
            recommendations.append("🚀 System ready for production deployment")
        elif production_readiness == "ready_with_monitoring":
            recommendations.append("⚠️ System ready for production with enhanced monitoring")
        elif production_readiness == "needs_improvement":
            recommendations.append("🔧 System needs improvement before production deployment")
        else:
            recommendations.append("❌ System not ready for production - address critical issues")
            
        # Add strategic recommendations
        recommendations.extend([
            "📊 Implement continuous evaluation pipeline",
            "🔄 Schedule regular performance benchmarking",
            "📈 Monitor key metrics in production",
            "🧪 Expand test coverage for edge cases"
        ])
        
        return recommendations
        
    def save_comprehensive_results(self, results: Dict[str, Any]):
        """Save comprehensive evaluation results"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"comprehensive_evaluation_results_{timestamp}.json"
        filepath = self.results_dir / filename
        
        # Make results JSON serializable
        serializable_results = self.make_serializable(results)
        
        import json
        with open(filepath, 'w') as f:
            json.dump(serializable_results, f, indent=2, default=str)
            
        print(f"💾 Comprehensive results saved: {filepath}")
        
    def make_serializable(self, obj):
        """Convert objects to JSON-serializable format"""
        if isinstance(obj, dict):
            return {k: self.make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.make_serializable(item) for item in obj]
        elif hasattr(obj, '__dict__'):
            return self.make_serializable(obj.__dict__)
        else:
            return obj
            
    def print_comprehensive_summary(self, results: Dict[str, Any]):
        """Print comprehensive evaluation summary"""
        print("\n" + "=" * 100)
        print("🎯 COMPREHENSIVE VANA SYSTEM EVALUATION SUMMARY")
        print("=" * 100)
        
        overall_assessment = results.get("overall_assessment", {})
        
        print(f"\n📊 OVERALL ASSESSMENT:")
        print(f"   System Health: {overall_assessment.get('system_health', 'Unknown').upper()}")
        print(f"   Capability Coverage: {overall_assessment.get('capability_coverage', 'Unknown').upper()}")
        print(f"   Performance Grade: {overall_assessment.get('performance_grade', 'Unknown').upper()}")
        print(f"   Production Readiness: {overall_assessment.get('production_readiness', 'Unknown').upper()}")
        print(f"   Confidence Score: {overall_assessment.get('confidence_score', 0):.1%}")
        
        # Key findings
        key_findings = overall_assessment.get("key_findings", [])
        if key_findings:
            print(f"\n🔍 KEY FINDINGS:")
            for finding in key_findings:
                print(f"   {finding}")
                
        # Recommendations
        recommendations = results.get("recommendations", [])
        if recommendations:
            print(f"\n💡 COMPREHENSIVE RECOMMENDATIONS:")
            for i, rec in enumerate(recommendations[:10], 1):  # Show top 10
                print(f"   {i}. {rec}")
                
            if len(recommendations) > 10:
                print(f"   ... and {len(recommendations) - 10} more recommendations")
                
        print("=" * 100)

async def main():
    """Main entry point for evaluation runner"""
    parser = argparse.ArgumentParser(description="VANA System Comprehensive Evaluation")
    parser.add_argument("--skip-discovery", action="store_true", help="Skip system discovery phase")
    parser.add_argument("--skip-performance", action="store_true", help="Skip performance benchmarking")
    parser.add_argument("--agents-only", action="store_true", help="Run only agent evaluation")
    
    args = parser.parse_args()
    
    runner = ComprehensiveEvaluationRunner()
    
    if args.agents_only:
        # Run only agent evaluation
        print("🧪 Running Agent Evaluation Only")
        results = await runner.system_evaluator.evaluate_all_agents()
    else:
        # Run comprehensive evaluation
        include_discovery = not args.skip_discovery
        include_performance = not args.skip_performance
        
        results = await runner.run_full_evaluation(
            include_discovery=include_discovery,
            include_performance=include_performance
        )
    
    return results

if __name__ == "__main__":
    asyncio.run(main())
