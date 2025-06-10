from pydantic import BaseModel
from typing import List, Optional


class RequirementsSchema(BaseModel):
    functional: List[str]
    non_functional: List[str]
    constraints: List[str]
    success_criteria: List[str]


class ArchDesignSchema(BaseModel):
    architecture: str
    tech_stack: List[str]
    notes: Optional[str] = None


class UIDesignSchema(BaseModel):
    overview: str
    technologies: List[str]


class DevOpsStrategySchema(BaseModel):
    deployment: str
    ci_cd: str
    infrastructure: List[str]


class QAStrategySchema(BaseModel):
    strategy: str
    automation_tools: List[str]


class IntegratedPlanSchema(BaseModel):
    summary: str


class AnalysisContextSchema(BaseModel):
    requirements: List[str]
    complexity: str


class SpecialistAnalysisSchema(BaseModel):
    report: str


class SynthesisSchema(BaseModel):
    recommendations: str


class QualityFeedbackSchema(BaseModel):
    completeness: float
    technical_depth: float
    integration: float
    feasibility: float
    notes: str


class CurrentSolutionSchema(BaseModel):
    content: str
