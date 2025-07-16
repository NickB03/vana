"""
ADK-Based End-to-End Evaluation Framework for VANA.

This framework provides comprehensive E2E testing using ADK's built-in
evaluation capabilities, avoiding the need for UI-specific testing tools.
"""

from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import json
import time
from google.adk.agents import LlmAgent
from google.adk.tools import ToolContext
import asyncio

# Import VANA components
from agents.vana.enhanced_orchestrator import analyze_and_route
from lib._tools.unified_tools import get_all_unified_tools


@dataclass
class EvaluationScenario:
    """Represents a test scenario for evaluation."""
    id: str
    name: str
    description: str
    request: str
    expected_specialist: str
    expected_outputs: List[str]  # Key phrases/concepts that should appear
    expected_tools: List[str]  # Tools that should be used
    success_criteria: Dict[str, Any]
    context: Dict[str, Any] = field(default_factory=dict)
    timeout: float = 30.0


@dataclass
class EvaluationResult:
    """Results from evaluating a scenario."""
    scenario_id: str
    success: bool
    execution_time: float
    specialist_used: Optional[str]
    tools_used: List[str]
    outputs_found: List[str]
    missing_outputs: List[str]
    score: float
    details: Dict[str, Any]
    error: Optional[str] = None


class ADKEvaluator:
    """Evaluates VANA system using ADK's evaluation capabilities."""
    
    def __init__(self):
        self.scenarios = self._load_scenarios()
        self.results = []
        
        # Create evaluation agent for judging outputs
        self.evaluator_agent = LlmAgent(
            name="vana_evaluator",
            model="gemini-1.5-flash",
            description="Expert evaluator for VANA system outputs",
            instruction="""You are an expert evaluator for the VANA multi-agent system.
            
Your role is to:
1. Analyze system outputs against expected criteria
2. Score the quality and completeness of responses
3. Identify which tools and specialists were used
4. Provide detailed feedback on performance

When evaluating, consider:
- Correctness: Does the output meet the requirements?
- Completeness: Are all expected elements present?
- Quality: Is the output well-structured and professional?
- Efficiency: Were appropriate tools and specialists used?

Provide scores from 0-100 and detailed justification."""
        )
    
    def _load_scenarios(self) -> List[EvaluationScenario]:
        """Load evaluation scenarios for Phase 1 specialists."""
        return [
            # Content Creation Scenarios
            EvaluationScenario(
                id="cc_001",
                name="Technical Report Generation",
                description="Test content creation specialist's ability to generate structured reports",
                request="Write a technical report about cloud security best practices with executive summary",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "Executive Summary",
                    "cloud security",
                    "best practices",
                    "recommendations"
                ],
                expected_tools=["write_document", "format_markdown"],
                success_criteria={
                    "min_word_count": 300,
                    "has_structure": True,
                    "includes_headers": True
                }
            ),
            
            EvaluationScenario(
                id="cc_002",
                name="Content Editing",
                description="Test content editing and improvement capabilities",
                request="Edit this text for clarity: 'The implementation of the system which was designed to handle requests has shown improvements in performance metrics.'",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "improved",
                    "clarity",
                    "performance"
                ],
                expected_tools=["edit_content", "improve_clarity"],
                success_criteria={
                    "text_improved": True,
                    "maintains_meaning": True,
                    "reduced_wordiness": True
                }
            ),
            
            EvaluationScenario(
                id="cc_003",
                name="Document Outlining",
                description="Test outline generation for complex topics",
                request="Generate a detailed outline for a white paper on AI ethics in healthcare",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "AI ethics",
                    "healthcare",
                    "sections",
                    "introduction",
                    "conclusion"
                ],
                expected_tools=["generate_outline"],
                success_criteria={
                    "hierarchical_structure": True,
                    "min_sections": 5,
                    "logical_flow": True
                }
            ),
            
            # Research Scenarios
            EvaluationScenario(
                id="rs_001",
                name="Advanced Web Search",
                description="Test research specialist's search capabilities",
                request="Research the latest developments in quantum computing error correction from the last year",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "quantum computing",
                    "error correction",
                    "developments",
                    "research"
                ],
                expected_tools=["web_search_advanced", "analyze_sources"],
                success_criteria={
                    "relevant_results": True,
                    "date_filtering": True,
                    "source_credibility": True
                }
            ),
            
            EvaluationScenario(
                id="rs_002",
                name="Fact Validation",
                description="Test fact-checking and validation capabilities",
                request="Validate this claim: 'The global electric vehicle market grew by 50% in 2023'",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "validation",
                    "electric vehicle",
                    "market growth",
                    "2023"
                ],
                expected_tools=["validate_information", "extract_facts"],
                success_criteria={
                    "validation_performed": True,
                    "sources_cited": True,
                    "confidence_score": True
                }
            ),
            
            EvaluationScenario(
                id="rs_003",
                name="Research Synthesis",
                description="Test ability to synthesize multiple findings",
                request="Research and synthesize information about the environmental impact of data centers",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "environmental impact",
                    "data centers",
                    "synthesis",
                    "findings"
                ],
                expected_tools=["web_search_advanced", "synthesize_findings", "generate_citations"],
                success_criteria={
                    "comprehensive_analysis": True,
                    "multiple_perspectives": True,
                    "cited_sources": True
                }
            ),
            
            # Integration Scenarios
            EvaluationScenario(
                id="int_001",
                name="Research to Document",
                description="Test integration between research and content creation",
                request="Research renewable energy benefits and create a short report with citations",
                expected_specialist="research_specialist",  # Should route here first
                expected_outputs=[
                    "renewable energy",
                    "benefits",
                    "report",
                    "citations"
                ],
                expected_tools=["web_search_advanced", "write_document", "generate_citations"],
                success_criteria={
                    "research_conducted": True,
                    "document_created": True,
                    "citations_included": True
                }
            ),
            
            # Error Handling
            EvaluationScenario(
                id="err_001",
                name="Ambiguous Request",
                description="Test handling of vague or ambiguous requests",
                request="Do the thing with the stuff",
                expected_specialist="content_creation_specialist",  # Default routing
                expected_outputs=[
                    "clarification",
                    "specific",
                    "help"
                ],
                expected_tools=["analyze_task"],
                success_criteria={
                    "asks_clarification": True,
                    "helpful_response": True,
                    "no_errors": True
                }
            )
        ]
    
    async def evaluate_scenario(self, scenario: EvaluationScenario) -> EvaluationResult:
        """Evaluate a single scenario."""
        start_time = time.time()
        
        try:
            # Track tool usage
            tools_used = []
            original_tools = get_all_unified_tools()
            
            # Wrap tools to track usage
            for tool_name, tool in original_tools.items():
                original_func = tool._original_func if hasattr(tool, '_original_func') else tool
                
                def make_tracker(name, func):
                    def tracked_func(*args, **kwargs):
                        tools_used.append(name)
                        return func(*args, **kwargs)
                    return tracked_func
                
                tool._original_func = make_tracker(tool_name, original_func)
            
            # Execute scenario
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    analyze_and_route,
                    scenario.request,
                    scenario.context,
                    scenario.timeout
                ),
                timeout=scenario.timeout
            )
            
            execution_time = time.time() - start_time
            
            # Analyze response
            analysis = await self._analyze_response(scenario, response, tools_used)
            
            # Calculate score
            score = self._calculate_score(scenario, analysis)
            
            return EvaluationResult(
                scenario_id=scenario.id,
                success=score >= 70,  # 70% threshold
                execution_time=execution_time,
                specialist_used=analysis.get('specialist_used'),
                tools_used=tools_used,
                outputs_found=analysis.get('outputs_found', []),
                missing_outputs=analysis.get('missing_outputs', []),
                score=score,
                details=analysis
            )
            
        except asyncio.TimeoutError:
            return EvaluationResult(
                scenario_id=scenario.id,
                success=False,
                execution_time=scenario.timeout,
                specialist_used=None,
                tools_used=tools_used,
                outputs_found=[],
                missing_outputs=scenario.expected_outputs,
                score=0,
                details={"timeout": True},
                error=f"Scenario timed out after {scenario.timeout} seconds"
            )
        except Exception as e:
            return EvaluationResult(
                scenario_id=scenario.id,
                success=False,
                execution_time=time.time() - start_time,
                specialist_used=None,
                tools_used=tools_used,
                outputs_found=[],
                missing_outputs=scenario.expected_outputs,
                score=0,
                details={"exception": str(e)},
                error=str(e)
            )
    
    async def _analyze_response(self, scenario: EvaluationScenario, response: str, tools_used: List[str]) -> Dict[str, Any]:
        """Analyze response using evaluator agent."""
        analysis_prompt = f"""Analyze this VANA system response for scenario: {scenario.name}

Request: {scenario.request}
Response: {response}

Expected outputs: {scenario.expected_outputs}
Expected tools: {scenario.expected_tools}
Tools actually used: {tools_used}

Analyze:
1. Which specialist handled the request?
2. Which expected outputs are present?
3. Which expected outputs are missing?
4. Overall quality and completeness
5. Any issues or improvements needed?

Provide structured analysis."""

        evaluator_response = self.evaluator_agent.run(analysis_prompt, {})
        
        # Parse response to extract key information
        response_lower = response.lower()
        
        # Detect specialist
        specialist_used = None
        if "content creation specialist" in response_lower:
            specialist_used = "content_creation_specialist"
        elif "research specialist" in response_lower:
            specialist_used = "research_specialist"
        
        # Check for expected outputs
        outputs_found = []
        missing_outputs = []
        
        for expected in scenario.expected_outputs:
            if expected.lower() in response_lower:
                outputs_found.append(expected)
            else:
                missing_outputs.append(expected)
        
        return {
            "specialist_used": specialist_used,
            "outputs_found": outputs_found,
            "missing_outputs": missing_outputs,
            "evaluator_analysis": evaluator_response,
            "response_length": len(response),
            "tools_coverage": len(set(tools_used) & set(scenario.expected_tools)) / len(scenario.expected_tools) if scenario.expected_tools else 1.0
        }
    
    def _calculate_score(self, scenario: EvaluationScenario, analysis: Dict[str, Any]) -> float:
        """Calculate overall score for scenario."""
        score = 0.0
        
        # Specialist routing (20%)
        if analysis.get('specialist_used') == scenario.expected_specialist:
            score += 20
        
        # Output coverage (40%)
        if scenario.expected_outputs:
            output_coverage = len(analysis.get('outputs_found', [])) / len(scenario.expected_outputs)
            score += output_coverage * 40
        
        # Tool usage (20%)
        tool_coverage = analysis.get('tools_coverage', 0)
        score += tool_coverage * 20
        
        # Success criteria (20%)
        criteria_met = 0
        criteria_total = len(scenario.success_criteria)
        
        for criterion, expected in scenario.success_criteria.items():
            if criterion == "min_word_count":
                if analysis.get('response_length', 0) >= expected * 5:  # Approximate chars
                    criteria_met += 1
            elif criterion == "has_structure":
                if any(header in analysis.get('evaluator_analysis', '') for header in ['#', 'section', 'structure']):
                    criteria_met += 1
            else:
                # Generic criteria check
                criteria_met += 0.5  # Partial credit
        
        if criteria_total > 0:
            score += (criteria_met / criteria_total) * 20
        
        return min(100, score)
    
    async def run_evaluation(self, scenario_ids: Optional[List[str]] = None) -> Dict[str, Any]:
        """Run evaluation on specified scenarios or all scenarios."""
        scenarios_to_run = self.scenarios
        
        if scenario_ids:
            scenarios_to_run = [s for s in self.scenarios if s.id in scenario_ids]
        
        print(f"Running evaluation on {len(scenarios_to_run)} scenarios...")
        
        results = []
        for scenario in scenarios_to_run:
            print(f"\nEvaluating: {scenario.name} ({scenario.id})")
            result = await self.evaluate_scenario(scenario)
            results.append(result)
            
            print(f"  Result: {'PASS' if result.success else 'FAIL'} (Score: {result.score:.1f}%)")
            if result.error:
                print(f"  Error: {result.error}")
        
        # Generate summary
        summary = self._generate_summary(results)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "scenarios_run": len(results),
            "results": results,
            "summary": summary
        }
    
    def _generate_summary(self, results: List[EvaluationResult]) -> Dict[str, Any]:
        """Generate evaluation summary."""
        total_scenarios = len(results)
        passed_scenarios = sum(1 for r in results if r.success)
        
        avg_score = sum(r.score for r in results) / total_scenarios if total_scenarios > 0 else 0
        avg_execution_time = sum(r.execution_time for r in results) / total_scenarios if total_scenarios > 0 else 0
        
        # Group by specialist
        specialist_performance = {}
        for result in results:
            specialist = result.specialist_used or 'unknown'
            if specialist not in specialist_performance:
                specialist_performance[specialist] = {
                    'scenarios': 0,
                    'passed': 0,
                    'total_score': 0
                }
            
            specialist_performance[specialist]['scenarios'] += 1
            if result.success:
                specialist_performance[specialist]['passed'] += 1
            specialist_performance[specialist]['total_score'] += result.score
        
        # Calculate specialist averages
        for specialist, data in specialist_performance.items():
            data['avg_score'] = data['total_score'] / data['scenarios']
            data['pass_rate'] = (data['passed'] / data['scenarios']) * 100
        
        # Most used tools
        all_tools = []
        for result in results:
            all_tools.extend(result.tools_used)
        
        tool_usage = {}
        for tool in all_tools:
            tool_usage[tool] = tool_usage.get(tool, 0) + 1
        
        return {
            "overall_pass_rate": (passed_scenarios / total_scenarios) * 100 if total_scenarios > 0 else 0,
            "average_score": avg_score,
            "average_execution_time": avg_execution_time,
            "scenarios_passed": passed_scenarios,
            "scenarios_failed": total_scenarios - passed_scenarios,
            "specialist_performance": specialist_performance,
            "tool_usage": dict(sorted(tool_usage.items(), key=lambda x: x[1], reverse=True)[:10])
        }
    
    def save_results(self, results: Dict[str, Any], filename: str = None) -> str:
        """Save evaluation results to file."""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"evaluation_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        return filename


# Convenience function for running evaluations
async def run_phase1_evaluation():
    """Run complete Phase 1 evaluation."""
    evaluator = ADKEvaluator()
    results = await evaluator.run_evaluation()
    
    # Print summary
    print("\n" + "="*80)
    print("EVALUATION SUMMARY")
    print("="*80)
    
    summary = results['summary']
    print(f"Overall Pass Rate: {summary['overall_pass_rate']:.1f}%")
    print(f"Average Score: {summary['average_score']:.1f}%")
    print(f"Average Execution Time: {summary['average_execution_time']:.2f}s")
    print(f"Scenarios Passed: {summary['scenarios_passed']}/{summary['scenarios_passed'] + summary['scenarios_failed']}")
    
    print("\nSpecialist Performance:")
    for specialist, data in summary['specialist_performance'].items():
        print(f"  {specialist}: {data['pass_rate']:.1f}% pass rate, {data['avg_score']:.1f}% avg score")
    
    print("\nTop Tool Usage:")
    for tool, count in list(summary['tool_usage'].items())[:5]:
        print(f"  {tool}: {count} times")
    
    # Save results
    filename = evaluator.save_results(results)
    print(f"\nDetailed results saved to: {filename}")
    
    return results


if __name__ == "__main__":
    # Run evaluation when executed directly
    asyncio.run(run_phase1_evaluation())