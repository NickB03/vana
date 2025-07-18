#!/usr/bin/env python3
"""
Run ADK-based E2E Evaluation for VANA Phase 1.

This script runs comprehensive evaluation of Phase 1 specialists
using ADK's evaluation framework instead of UI testing.
"""

import asyncio
import argparse
import sys
import os
from datetime import datetime
from typing import List, Optional

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from tests.e2e.adk_evaluation_framework import ADKEvaluator, EvaluationResult
from tests.e2e.phase1_evaluation_scenarios import Phase1Scenarios


class EvaluationRunner:
    """Runs and manages ADK-based evaluations."""
    
    def __init__(self):
        self.evaluator = ADKEvaluator()
        self.scenarios = Phase1Scenarios.get_all_scenarios()
    
    async def run_by_category(self, category: str) -> dict:
        """Run evaluation for a specific category."""
        category_scenarios = {
            'content': Phase1Scenarios.get_content_creation_scenarios(),
            'research': Phase1Scenarios.get_research_scenarios(),
            'integration': Phase1Scenarios.get_integration_scenarios(),
            'errors': Phase1Scenarios.get_error_handling_scenarios(),
            'all': self.scenarios
        }
        
        if category not in category_scenarios:
            print(f"Unknown category: {category}")
            print(f"Available categories: {list(category_scenarios.keys())}")
            return {}
        
        # Update evaluator scenarios
        self.evaluator.scenarios = category_scenarios[category]
        
        # Run evaluation
        return await self.evaluator.run_evaluation()
    
    async def run_specific_scenarios(self, scenario_ids: List[str]) -> dict:
        """Run specific scenarios by ID."""
        # Filter scenarios
        selected_scenarios = [s for s in self.scenarios if s.id in scenario_ids]
        
        if not selected_scenarios:
            print(f"No scenarios found with IDs: {scenario_ids}")
            return {}
        
        # Update evaluator scenarios
        self.evaluator.scenarios = selected_scenarios
        
        # Run evaluation
        return await self.evaluator.run_evaluation()
    
    def print_scenario_list(self):
        """Print all available scenarios."""
        print("\nAvailable Evaluation Scenarios:")
        print("="*80)
        
        # Group by category
        content_scenarios = Phase1Scenarios.get_content_creation_scenarios()
        research_scenarios = Phase1Scenarios.get_research_scenarios()
        integration_scenarios = Phase1Scenarios.get_integration_scenarios()
        error_scenarios = Phase1Scenarios.get_error_handling_scenarios()
        
        print("\nContent Creation Scenarios:")
        for s in content_scenarios:
            print(f"  {s.id}: {s.name}")
        
        print("\nResearch Scenarios:")
        for s in research_scenarios:
            print(f"  {s.id}: {s.name}")
        
        print("\nIntegration Scenarios:")
        for s in integration_scenarios:
            print(f"  {s.id}: {s.name}")
        
        print("\nError Handling Scenarios:")
        for s in error_scenarios:
            print(f"  {s.id}: {s.name}")
    
    def print_detailed_results(self, results: dict):
        """Print detailed evaluation results."""
        print("\n" + "="*80)
        print("DETAILED EVALUATION RESULTS")
        print("="*80)
        
        for result in results.get('results', []):
            scenario = next((s for s in self.scenarios if s.id == result.scenario_id), None)
            if not scenario:
                continue
            
            print(f"\n{scenario.name} ({result.scenario_id})")
            print("-" * 40)
            print(f"Status: {'✅ PASS' if result.success else '❌ FAIL'}")
            print(f"Score: {result.score:.1f}%")
            print(f"Execution Time: {result.execution_time:.2f}s")
            print(f"Specialist Used: {result.specialist_used or 'None detected'}")
            
            if result.tools_used:
                print(f"Tools Used: {', '.join(result.tools_used)}")
            
            if result.outputs_found:
                print(f"Outputs Found: {', '.join(result.outputs_found)}")
            
            if result.missing_outputs:
                print(f"Missing Outputs: {', '.join(result.missing_outputs)}")
            
            if result.error:
                print(f"Error: {result.error}")
    
    async def run_smoke_test(self) -> dict:
        """Run a quick smoke test with key scenarios."""
        smoke_scenarios = [
            'cc_doc_001',      # Document creation
            'cc_edit_001',     # Content editing
            'rs_search_001',   # Web search
            'rs_validate_001', # Fact checking
            'int_workflow_001' # Integration
        ]
        
        print("Running smoke test with 5 key scenarios...")
        return await self.run_specific_scenarios(smoke_scenarios)


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description='Run ADK-based evaluation for VANA')
    
    parser.add_argument(
        '--category',
        choices=['content', 'research', 'integration', 'errors', 'all'],
        default='all',
        help='Category of scenarios to run'
    )
    
    parser.add_argument(
        '--scenarios',
        nargs='+',
        help='Specific scenario IDs to run'
    )
    
    parser.add_argument(
        '--list',
        action='store_true',
        help='List all available scenarios'
    )
    
    parser.add_argument(
        '--smoke',
        action='store_true',
        help='Run quick smoke test (5 key scenarios)'
    )
    
    parser.add_argument(
        '--detailed',
        action='store_true',
        help='Show detailed results for each scenario'
    )
    
    parser.add_argument(
        '--output',
        help='Output file for results (JSON format)'
    )
    
    args = parser.parse_args()
    
    runner = EvaluationRunner()
    
    # Handle list command
    if args.list:
        runner.print_scenario_list()
        return
    
    # Run evaluation
    try:
        if args.smoke:
            results = await runner.run_smoke_test()
        elif args.scenarios:
            results = await runner.run_specific_scenarios(args.scenarios)
        else:
            results = await runner.run_by_category(args.category)
        
        # Print summary
        if results:
            summary = results.get('summary', {})
            
            print("\n" + "="*80)
            print("EVALUATION SUMMARY")
            print("="*80)
            print(f"Overall Pass Rate: {summary.get('overall_pass_rate', 0):.1f}%")
            print(f"Average Score: {summary.get('average_score', 0):.1f}%")
            print(f"Scenarios Run: {results.get('scenarios_run', 0)}")
            print(f"Passed: {summary.get('scenarios_passed', 0)}")
            print(f"Failed: {summary.get('scenarios_failed', 0)}")
            
            # Specialist performance
            if summary.get('specialist_performance'):
                print("\nSpecialist Performance:")
                for specialist, data in summary['specialist_performance'].items():
                    print(f"  {specialist}:")
                    print(f"    Pass Rate: {data.get('pass_rate', 0):.1f}%")
                    print(f"    Avg Score: {data.get('avg_score', 0):.1f}%")
            
            # Tool usage
            if summary.get('tool_usage'):
                print("\nTop Tool Usage:")
                for tool, count in list(summary['tool_usage'].items())[:5]:
                    print(f"  {tool}: {count} times")
            
            # Detailed results if requested
            if args.detailed:
                runner.print_detailed_results(results)
            
            # Save results if output specified
            if args.output:
                filename = runner.evaluator.save_results(results, args.output)
                print(f"\nResults saved to: {filename}")
            
            # Exit code based on pass rate
            pass_rate = summary.get('overall_pass_rate', 0)
            if pass_rate >= 80:
                return 0  # Success
            elif pass_rate >= 60:
                return 1  # Partial success
            else:
                return 2  # Failure
                
    except Exception as e:
        print(f"\nError running evaluation: {e}")
        import traceback
        traceback.print_exc()
        return 3


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)