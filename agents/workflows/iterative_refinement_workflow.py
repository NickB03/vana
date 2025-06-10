"""
Iterative Refinement Workflow - Quality-Driven Improvement
Implements Google ADK LoopAgent pattern for iterative specialist refinement.
"""

import os
import sys
from typing import AsyncGenerator

from .schemas import QualityFeedbackSchema, CurrentSolutionSchema

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from google.adk.agents import LoopAgent, LlmAgent, BaseAgent
from google.adk.events import Event, EventActions
from google.adk.agents.invocation_context import InvocationContext
from google.adk.tools import FunctionTool

# Import specialist functions
from agents.specialists.architecture_specialist import analyze_system_architecture
from agents.specialists.ui_specialist import analyze_user_interface
from agents.specialists.devops_specialist import analyze_infrastructure
from agents.specialists.qa_specialist import analyze_testing_strategy

class QualityGateAgent(BaseAgent):
    """Custom agent to evaluate quality and control loop continuation."""

    def __init__(self, name: str = "QualityGate"):
        super().__init__(name=name)
        # Store quality threshold in session state instead of as instance variable
        self._quality_threshold = 0.8
    
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        """Evaluate current solution quality and decide whether to continue refinement."""
        
        # Get current solution and quality metrics from state
        draft = ctx.session.state.get("draft", "")
        quality_score = ctx.session.state.get("quality_score", 0.0)
        iteration_count = ctx.session.state.get("iteration_count", 0)
        
        # Evaluate quality criteria
        quality_criteria = {
            "completeness": self._evaluate_completeness(draft),
            "technical_depth": self._evaluate_technical_depth(draft), 
            "integration": self._evaluate_integration(draft),
            "feasibility": self._evaluate_feasibility(draft)
        }
        
        # Calculate overall quality score
        overall_quality = sum(quality_criteria.values()) / len(quality_criteria)
        
        # Update state with quality metrics
        state_update = {
            "quality_score": overall_quality,
            "quality_criteria": quality_criteria,
            "iteration_count": iteration_count + 1
        }
        
        # Determine if quality threshold is met
        should_stop = (overall_quality >= self._quality_threshold) or (iteration_count >= 5)

        # Create quality assessment content
        quality_report = f"""
Quality Assessment (Iteration {iteration_count + 1}):
- Overall Quality Score: {overall_quality:.2f} (Threshold: {self._quality_threshold})
- Completeness: {quality_criteria['completeness']:.2f}
- Technical Depth: {quality_criteria['technical_depth']:.2f}
- Integration: {quality_criteria['integration']:.2f}
- Feasibility: {quality_criteria['feasibility']:.2f}

Decision: {'APPROVED - Quality threshold met' if should_stop else 'CONTINUE - Refinement needed'}
"""
        
        # Yield quality assessment event
        from google.genai import types
        yield Event(
            author=self.name,
            content=types.Content(parts=[types.Part(text=quality_report)]),
            actions=EventActions(
                state_delta=state_update,
                escalate=should_stop  # Stop loop if quality is sufficient
            )
        )
    
    def _evaluate_completeness(self, solution: str) -> float:
        """Evaluate solution completeness (0.0 to 1.0)."""
        required_sections = [
            "architecture", "ui", "devops", "testing", 
            "implementation", "timeline", "resources"
        ]
        
        found_sections = sum(1 for section in required_sections 
                           if section.lower() in solution.lower())
        return found_sections / len(required_sections)
    
    def _evaluate_technical_depth(self, solution: str) -> float:
        """Evaluate technical depth and detail (0.0 to 1.0)."""
        technical_indicators = [
            "technology stack", "database", "api", "framework",
            "deployment", "monitoring", "security", "performance"
        ]
        
        found_indicators = sum(1 for indicator in technical_indicators
                             if indicator.lower() in solution.lower())
        return min(found_indicators / len(technical_indicators), 1.0)
    
    def _evaluate_integration(self, solution: str) -> float:
        """Evaluate cross-domain integration (0.0 to 1.0)."""
        integration_keywords = [
            "integration", "workflow", "pipeline", "coordination",
            "dependencies", "interfaces", "communication"
        ]
        
        found_keywords = sum(1 for keyword in integration_keywords
                           if keyword.lower() in solution.lower())
        return min(found_keywords / len(integration_keywords), 1.0)
    
    def _evaluate_feasibility(self, solution: str) -> float:
        """Evaluate implementation feasibility (0.0 to 1.0)."""
        feasibility_indicators = [
            "timeline", "budget", "resources", "risk", "milestone",
            "deliverable", "constraint", "assumption"
        ]
        
        found_indicators = sum(1 for indicator in feasibility_indicators
                             if indicator.lower() in solution.lower())
        return min(found_indicators / len(feasibility_indicators), 1.0)

def create_iterative_refinement_workflow(max_iterations: int = 5, quality_threshold: float = 0.8) -> LoopAgent:
    """
    Create an iterative refinement workflow for solution improvement.
    
    Pattern: Generate → Evaluate → Refine → Quality Gate → Repeat until quality threshold met
    """
    
    # Solution Generator/Refiner
    solution_refiner = LlmAgent(
        name="SolutionRefiner",
        model="gemini-2.0-flash",
        instruction="""You are a Solution Refiner. Your task is to create or improve a comprehensive solution.

If this is the first iteration (no 'draft' in state):
- Create an initial comprehensive solution based on the user's requirements
- Include architecture, UI/UX, DevOps, and QA considerations

If refining an existing solution (state['draft'] exists):
- Review the current solution and quality feedback in state['quality_criteria']
- Focus on improving areas with low quality scores
- Enhance completeness, technical depth, integration, and feasibility
- Build upon existing strengths while addressing weaknesses

Use specialist tools as needed for detailed analysis and recommendations.
Save the improved solution for quality evaluation.""",
        tools=[
            FunctionTool(analyze_system_architecture),
            FunctionTool(analyze_user_interface),
            FunctionTool(analyze_infrastructure),
            FunctionTool(analyze_testing_strategy)
        ],
        output_key="draft",
        output_schema=CurrentSolutionSchema
    )
    
    # Quality Evaluator
    quality_evaluator = LlmAgent(
        name="QualityEvaluator",
        model="gemini-2.0-flash",
        instruction="""Evaluate the current solution in state['draft'] for:

1. **Completeness** (0.0-1.0): Does it cover all required aspects?
   - Architecture design and technology choices
   - UI/UX design and user experience
   - DevOps strategy and deployment approach
   - Testing strategy and quality assurance
   - Implementation plan and timeline
   - Resource requirements and constraints

2. **Technical Depth** (0.0-1.0): Is the technical detail sufficient?
   - Specific technology recommendations
   - Detailed implementation approaches
   - Performance and scalability considerations
   - Security and compliance aspects

3. **Integration** (0.0-1.0): Are all components well-integrated?
   - Cross-domain coordination
   - Workflow and process alignment
   - Interface and communication design
   - Dependency management

4. **Feasibility** (0.0-1.0): Is the solution realistic and achievable?
   - Timeline and milestone planning
   - Resource and budget considerations
   - Risk assessment and mitigation
   - Constraint acknowledgment

Provide specific feedback for improvement in each area.""",
        output_key="critique",
        output_schema=QualityFeedbackSchema
    )
    
    # Quality Gate Controller
    quality_gate = QualityGateAgent(
        name="QualityGate"
    )
    
    # Create the iterative refinement loop
    refinement_loop = LoopAgent(
        name="IterativeRefinementWorkflow",
        description="Iterative solution refinement with quality gates",
        max_iterations=max_iterations,
        sub_agents=[
            solution_refiner,
            quality_evaluator, 
            quality_gate
        ]
    )
    
    return refinement_loop

# Export for VANA integration
iterative_refinement_workflow = create_iterative_refinement_workflow()

__all__ = ["create_iterative_refinement_workflow", "iterative_refinement_workflow", "QualityGateAgent"]
