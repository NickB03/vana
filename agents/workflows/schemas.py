"""
Workflow Schemas for VANA

This module provides Pydantic models for structured data validation
in workflow orchestration and agent coordination.
"""

from pydantic import BaseModel
from typing import List, Optional


class RequirementsSchema(BaseModel):
    """Schema for project requirements definition."""
    functional: List[str]
    non_functional: List[str]
    constraints: List[str]
    success_criteria: List[str]


class ArchDesignSchema(BaseModel):
    """Schema for architecture design specifications."""
    architecture: str
    tech_stack: List[str]
    notes: Optional[str] = None


class UIDesignSchema(BaseModel):
    """Schema for user interface design specifications."""
    overview: str
    technologies: List[str]


class DevOpsStrategySchema(BaseModel):
    """Schema for DevOps strategy and deployment planning."""
    deployment: str
    ci_cd: str
    infrastructure: List[str]


class QAStrategySchema(BaseModel):
    """Schema for quality assurance strategy."""
    strategy: str
    automation_tools: List[str]


class IntegratedPlanSchema(BaseModel):
    """Schema for integrated project planning."""
    summary: str


class AnalysisContextSchema(BaseModel):
    """Schema for analysis context and requirements."""
    requirements: List[str]
    complexity: str


class SpecialistAnalysisSchema(BaseModel):
    """Schema for specialist analysis reports."""
    report: str


class SynthesisSchema(BaseModel):
    """Schema for synthesis and recommendations."""
    recommendations: str


class QualityFeedbackSchema(BaseModel):
    """Schema for quality feedback and assessment."""
    completeness: float
    technical_depth: float
    integration: float
    feasibility: float
    notes: str


class CurrentSolutionSchema(BaseModel):
    """Schema for current solution representation."""
    content: str


__all__ = [
    "RequirementsSchema",
    "ArchDesignSchema", 
    "UIDesignSchema",
    "DevOpsStrategySchema",
    "QAStrategySchema",
    "IntegratedPlanSchema",
    "AnalysisContextSchema",
    "SpecialistAnalysisSchema",
    "SynthesisSchema",
    "QualityFeedbackSchema",
    "CurrentSolutionSchema",
]
