"""
Pydantic models for structured agent communication in VANA.

These models ensure type-safe data exchange between agents and enable
ADK's structured output features.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict, List, Any
from datetime import datetime


class TaskAnalysis(BaseModel):
    """Structured output from task analyzer agent."""
    task_type: Literal[
        "research", "security", "architecture", "ui", 
        "data_science", "qa", "devops", "general"
    ] = Field(description="Category of the task")
    complexity: Literal["simple", "moderate", "complex"] = Field(
        description="Estimated complexity level"
    )
    confidence: float = Field(
        ge=0.0, le=1.0, 
        description="Confidence in task classification (0-1)"
    )
    reasoning: str = Field(
        description="Explanation of task classification"
    )
    required_capabilities: List[str] = Field(
        default_factory=list,
        description="Specific capabilities needed for the task"
    )
    context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context for specialist"
    )
    estimated_time: Optional[str] = Field(
        default=None,
        description="Estimated time to complete (e.g., '5 minutes', '1 hour')"
    )


class TaskResult(BaseModel):
    """Structured output from specialist agents."""
    status: Literal["success", "partial", "failed"] = Field(
        description="Task completion status"
    )
    result: str = Field(
        description="Main result content or response"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence in the result (0-1)"
    )
    sources: List[str] = Field(
        default_factory=list,
        description="Sources used to generate the result"
    )
    artifacts: Dict[str, Any] = Field(
        default_factory=dict,
        description="Generated artifacts (code, diagrams, etc.)"
    )
    next_steps: Optional[List[str]] = Field(
        default=None,
        description="Suggested follow-up actions"
    )
    execution_time: Optional[float] = Field(
        default=None,
        description="Time taken to execute in seconds"
    )
    specialist_name: Optional[str] = Field(
        default=None,
        description="Name of the specialist that generated this result"
    )


class QualityAssessment(BaseModel):
    """Quality assessment for iterative refinement."""
    meets_quality: bool = Field(
        description="Whether the result meets quality standards"
    )
    confidence_score: float = Field(
        ge=0.0, le=1.0,
        description="Quality confidence score (0-1)"
    )
    improvement_suggestions: List[str] = Field(
        default_factory=list,
        description="Specific suggestions for improvement"
    )
    strengths: List[str] = Field(
        default_factory=list,
        description="Identified strengths in the result"
    )
    iteration_count: int = Field(
        ge=1,
        description="Current iteration number"
    )


class FormattedResponse(BaseModel):
    """Final formatted response for the user."""
    content: str = Field(
        description="Main response content"
    )
    summary: Optional[str] = Field(
        default=None,
        description="Brief summary of the response"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Response metadata (timing, sources, etc.)"
    )
    follow_up_suggestions: Optional[List[str]] = Field(
        default=None,
        description="Suggested follow-up questions or actions"
    )


class AgentTransferDecision(BaseModel):
    """Decision model for agent transfers."""
    should_transfer: bool = Field(
        description="Whether to transfer to another agent"
    )
    target_agent: Optional[str] = Field(
        default=None,
        description="Name of the agent to transfer to"
    )
    reason: str = Field(
        description="Explanation for the transfer decision"
    )
    context_to_pass: Dict[str, Any] = Field(
        default_factory=dict,
        description="Context to pass to the target agent"
    )