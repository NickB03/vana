"""
Enhanced Complexity Analyzer with Domain Detection (Phase 2)
Implements advanced task analysis with domain-specific routing and security considerations
"""

from enum import Enum
from typing import Dict, List, Any, Optional, Tuple
import re
from dataclasses import dataclass
from collections import defaultdict


class TaskComplexity(Enum):
    """Enhanced task complexity levels for orchestration decisions."""
    SIMPLE = "simple"  # Single specialist can handle
    MODERATE = "moderate"  # Multiple specialists needed
    COMPLEX = "complex"  # Full workflow required
    ENTERPRISE = "enterprise"  # Hierarchical decomposition needed
    CRITICAL = "critical"  # Security or compliance critical tasks


class TaskDomain(Enum):
    """Task domains for specialized routing"""
    SECURITY = "security"
    ARCHITECTURE = "architecture"
    INFRASTRUCTURE = "infrastructure"
    DATA_SCIENCE = "data_science"
    USER_INTERFACE = "user_interface"
    QUALITY_ASSURANCE = "quality_assurance"
    COMPLIANCE = "compliance"
    PERFORMANCE = "performance"
    INTEGRATION = "integration"
    GENERAL = "general"


class TaskType(Enum):
    """Enhanced task types for specialist routing."""
    ANALYSIS = "analysis"
    DESIGN = "design"
    IMPLEMENTATION = "implementation"
    OPTIMIZATION = "optimization"
    TROUBLESHOOTING = "troubleshooting"
    SECURITY_AUDIT = "security_audit"
    REVIEW = "review"
    MIGRATION = "migration"
    DOCUMENTATION = "documentation"


@dataclass
class TaskAnalysisResult:
    """Comprehensive task analysis result"""
    complexity: TaskComplexity
    primary_domain: TaskDomain
    secondary_domains: List[TaskDomain]
    task_type: TaskType
    confidence_score: float
    security_relevance: float
    recommended_approach: str
    required_specialists: List[str]
    estimated_effort: str
    priority_level: str
    risk_assessment: Dict[str, Any]
    metadata: Dict[str, Any]


class EnhancedComplexityAnalyzer:
    """
    Enhanced complexity analyzer with domain detection capabilities
    Implements Phase 2 improvements for better task routing
    """
    
    def __init__(self):
        # Enhanced complexity indicators with weights
        self.complexity_patterns = {
            TaskComplexity.SIMPLE: {
                "patterns": ["what is", "how to", "explain", "show me", "list", "describe"],
                "weight": 1.0
            },
            TaskComplexity.MODERATE: {
                "patterns": ["design", "plan", "compare", "evaluate", "recommend", "analyze"],
                "weight": 2.0
            },
            TaskComplexity.COMPLEX: {
                "patterns": ["implement", "build", "create system", "develop platform", "architect"],
                "weight": 3.0
            },
            TaskComplexity.ENTERPRISE: {
                "patterns": ["enterprise", "large-scale", "organization-wide", "multi-team", "company-wide", 
                           "migrate entire", "platform migration", "system migration"],
                "weight": 4.0
            },
            TaskComplexity.CRITICAL: {
                "patterns": ["security", "vulnerability", "compliance", "audit", "penetration test", "breach"],
                "weight": 5.0
            }
        }
        
        # Domain-specific patterns with confidence scores
        self.domain_patterns = {
            TaskDomain.SECURITY: {
                "patterns": [
                    "security", "vulnerability", "exploit", "authentication", "authorization",
                    "encryption", "ssl", "tls", "firewall", "penetration", "audit",
                    "compliance", "gdpr", "pci", "hipaa", "owasp", "cve"
                ],
                "specialist": "security_specialist",
                "priority_boost": 2.0
            },
            TaskDomain.ARCHITECTURE: {
                "patterns": [
                    "architecture", "design pattern", "microservice", "monolith", "scalability",
                    "system design", "api design", "database design", "cloud architecture",
                    "distributed system", "event-driven", "service mesh"
                ],
                "specialist": "architecture_specialist",
                "priority_boost": 1.5
            },
            TaskDomain.INFRASTRUCTURE: {
                "patterns": [
                    "deployment", "kubernetes", "docker", "ci/cd", "pipeline", "terraform",
                    "aws", "azure", "gcp", "monitoring", "logging", "metrics",
                    "infrastructure", "devops", "automation"
                ],
                "specialist": "devops_specialist",
                "priority_boost": 1.3
            },
            TaskDomain.DATA_SCIENCE: {
                "patterns": [
                    "machine learning", "ml", "ai", "neural network", "data analysis",
                    "statistics", "prediction", "classification", "regression", "clustering",
                    "nlp", "computer vision", "deep learning", "tensorflow", "pytorch"
                ],
                "specialist": "data_science_specialist",
                "priority_boost": 1.4
            },
            TaskDomain.USER_INTERFACE: {
                "patterns": [
                    "ui", "ux", "user interface", "user experience", "frontend", "design",
                    "react", "vue", "angular", "css", "responsive", "accessibility",
                    "component", "layout", "wireframe", "prototype"
                ],
                "specialist": "ui_specialist",
                "priority_boost": 1.1
            },
            TaskDomain.QUALITY_ASSURANCE: {
                "patterns": [
                    "test", "testing", "qa", "quality", "unit test", "integration test",
                    "e2e", "automation test", "test coverage", "bug", "defect",
                    "regression", "performance test", "load test"
                ],
                "specialist": "qa_specialist",
                "priority_boost": 1.2
            }
        }
        
        # Task type patterns
        self.task_type_patterns = {
            TaskType.SECURITY_AUDIT: ["audit", "scan", "penetration test", "vulnerability assessment"],
            TaskType.ANALYSIS: ["analyze", "evaluate", "assess", "review", "examine", "investigate"],
            TaskType.DESIGN: ["design", "architect", "plan", "blueprint", "model"],
            TaskType.IMPLEMENTATION: ["implement", "build", "develop", "code", "create"],
            TaskType.OPTIMIZATION: ["optimize", "improve", "enhance", "speed up", "scale"],
            TaskType.TROUBLESHOOTING: ["fix", "debug", "resolve", "troubleshoot", "solve"],
            TaskType.REVIEW: ["review", "check", "validate", "verify", "inspect"],
            TaskType.MIGRATION: ["migrate", "port", "transfer", "upgrade", "move"],
            TaskType.DOCUMENTATION: ["document", "write docs", "api docs", "readme"]
        }
        
    def analyze_task(self, task_description: str, context: Optional[Dict[str, Any]] = None) -> TaskAnalysisResult:
        """
        Perform comprehensive task analysis with domain detection
        
        Args:
            task_description: The task to analyze
            context: Optional context information (user history, project type, etc.)
            
        Returns:
            TaskAnalysisResult with detailed analysis
        """
        task_lower = task_description.lower()
        
        # Analyze complexity
        complexity, complexity_confidence = self._analyze_complexity(task_lower)
        
        # Detect domains
        primary_domain, secondary_domains, domain_scores = self._detect_domains(task_lower)
        
        # Determine task type
        task_type = self._determine_task_type(task_lower)
        
        # Security relevance check
        security_relevance = self._calculate_security_relevance(task_lower, primary_domain)
        
        # Risk assessment
        risk_assessment = self._assess_risks(task_lower, complexity, primary_domain)
        
        # Determine required specialists
        required_specialists = self._determine_required_specialists(
            complexity, primary_domain, secondary_domains, task_type, security_relevance
        )
        
        # Calculate priority
        priority_level = self._calculate_priority(
            complexity, primary_domain, security_relevance, risk_assessment
        )
        
        # Estimate effort
        estimated_effort = self._estimate_effort(complexity, len(required_specialists))
        
        # Determine recommended approach
        recommended_approach = self._get_recommended_approach(
            complexity, task_type, primary_domain, len(required_specialists)
        )
        
        # Overall confidence score
        confidence_score = self._calculate_confidence(
            complexity_confidence, domain_scores, task_type
        )
        
        return TaskAnalysisResult(
            complexity=complexity,
            primary_domain=primary_domain,
            secondary_domains=secondary_domains,
            task_type=task_type,
            confidence_score=confidence_score,
            security_relevance=security_relevance,
            recommended_approach=recommended_approach,
            required_specialists=required_specialists,
            estimated_effort=estimated_effort,
            priority_level=priority_level,
            risk_assessment=risk_assessment,
            metadata={
                "domain_scores": domain_scores,
                "complexity_confidence": complexity_confidence,
                "analysis_version": "2.0",
                "enhanced_routing": True
            }
        )
        
    def _analyze_complexity(self, task_description: str) -> Tuple[TaskComplexity, float]:
        """Analyze task complexity with confidence scoring"""
        scores = defaultdict(float)
        
        for complexity, config in self.complexity_patterns.items():
            for pattern in config["patterns"]:
                if pattern in task_description:
                    scores[complexity] += config["weight"]
                    
        # Check for security/compliance which automatically elevates complexity
        if any(term in task_description for term in ["security", "vulnerability", "compliance", "audit"]):
            scores[TaskComplexity.CRITICAL] += 5.0
            
        if not scores:
            return TaskComplexity.SIMPLE, 0.8
            
        # Get the complexity with highest score
        max_complexity = max(scores.items(), key=lambda x: x[1])
        total_score = sum(scores.values())
        confidence = max_complexity[1] / total_score if total_score > 0 else 0.5
        
        return max_complexity[0], confidence
        
    def _detect_domains(self, task_description: str) -> Tuple[TaskDomain, List[TaskDomain], Dict[TaskDomain, float]]:
        """Detect primary and secondary domains with scoring"""
        domain_scores = defaultdict(float)
        
        for domain, config in self.domain_patterns.items():
            for pattern in config["patterns"]:
                if pattern in task_description:
                    # Longer patterns get higher weight
                    weight = len(pattern.split()) * 1.5 if ' ' in pattern else 1.0
                    domain_scores[domain] += weight
                    
        if not domain_scores:
            return TaskDomain.GENERAL, [], {}
            
        # Sort domains by score
        sorted_domains = sorted(domain_scores.items(), key=lambda x: x[1], reverse=True)
        
        primary_domain = sorted_domains[0][0]
        secondary_domains = [d[0] for d in sorted_domains[1:] if d[1] > 0]
        
        return primary_domain, secondary_domains, dict(domain_scores)
        
    def _determine_task_type(self, task_description: str) -> TaskType:
        """Determine the task type"""
        type_scores = defaultdict(float)
        
        for task_type, patterns in self.task_type_patterns.items():
            for pattern in patterns:
                if pattern in task_description:
                    type_scores[task_type] += 1
                    
        if not type_scores:
            return TaskType.ANALYSIS  # Default
            
        return max(type_scores.items(), key=lambda x: x[1])[0]
        
    def _calculate_security_relevance(self, task_description: str, primary_domain: TaskDomain) -> float:
        """Calculate security relevance score (0.0 to 1.0)"""
        score = 0.0
        
        # Domain-based scoring
        if primary_domain == TaskDomain.SECURITY:
            score = 0.9
        elif primary_domain == TaskDomain.COMPLIANCE:
            score = 0.8
            
        # Keyword-based scoring
        security_keywords = [
            ("vulnerability", 0.9), ("exploit", 0.9), ("breach", 0.95),
            ("authentication", 0.7), ("authorization", 0.7), ("encryption", 0.8),
            ("audit", 0.6), ("compliance", 0.7), ("penetration", 0.85),
            ("secure", 0.6), ("security", 0.7)
        ]
        
        for keyword, weight in security_keywords:
            if keyword in task_description:
                score = max(score, weight)
                
        return min(score, 1.0)
        
    def _assess_risks(self, task_description: str, complexity: TaskComplexity, 
                     domain: TaskDomain) -> Dict[str, Any]:
        """Assess risks associated with the task"""
        risks = {
            "security_risk": "low",
            "complexity_risk": "low",
            "resource_risk": "low",
            "compliance_risk": "low"
        }
        
        # Security risk
        if domain == TaskDomain.SECURITY or "vulnerability" in task_description:
            risks["security_risk"] = "high"
        elif "authentication" in task_description or "authorization" in task_description:
            risks["security_risk"] = "medium"
            
        # Complexity risk
        if complexity in [TaskComplexity.ENTERPRISE, TaskComplexity.CRITICAL]:
            risks["complexity_risk"] = "high"
        elif complexity == TaskComplexity.COMPLEX:
            risks["complexity_risk"] = "medium"
            
        # Resource risk
        if complexity == TaskComplexity.ENTERPRISE:
            risks["resource_risk"] = "high"
        elif complexity in [TaskComplexity.COMPLEX, TaskComplexity.CRITICAL]:
            risks["resource_risk"] = "medium"
            
        # Compliance risk
        compliance_terms = ["gdpr", "pci", "hipaa", "sox", "compliance", "regulation"]
        if any(term in task_description for term in compliance_terms):
            risks["compliance_risk"] = "high"
            
        return risks
        
    def _determine_required_specialists(self, complexity: TaskComplexity, 
                                      primary_domain: TaskDomain,
                                      secondary_domains: List[TaskDomain],
                                      task_type: TaskType,
                                      security_relevance: float) -> List[str]:
        """Determine which specialists are required"""
        specialists = []
        
        # Always include security specialist for critical tasks or high security relevance
        if (complexity == TaskComplexity.CRITICAL or 
            primary_domain == TaskDomain.SECURITY or 
            security_relevance >= 0.6):
            specialists.append("security_specialist")
            
        # Add primary domain specialist
        if primary_domain in self.domain_patterns:
            specialist = self.domain_patterns[primary_domain]["specialist"]
            if specialist not in specialists:
                specialists.append(specialist)
                
        # Add secondary domain specialists for complex tasks
        if complexity in [TaskComplexity.COMPLEX, TaskComplexity.ENTERPRISE]:
            for domain in secondary_domains[:2]:  # Limit to 2 secondary specialists
                if domain in self.domain_patterns:
                    specialist = self.domain_patterns[domain]["specialist"]
                    if specialist not in specialists:
                        specialists.append(specialist)
                        
        # Special cases based on task type
        if task_type == TaskType.MIGRATION and "devops_specialist" not in specialists:
            specialists.append("devops_specialist")
        elif task_type == TaskType.SECURITY_AUDIT and "security_specialist" not in specialists:
            specialists.insert(0, "security_specialist")  # Security first
            
        return specialists
        
    def _calculate_priority(self, complexity: TaskComplexity, domain: TaskDomain,
                          security_relevance: float, risk_assessment: Dict[str, Any]) -> str:
        """Calculate task priority level"""
        priority_score = 0.0
        
        # Complexity contribution
        complexity_scores = {
            TaskComplexity.SIMPLE: 1.0,
            TaskComplexity.MODERATE: 2.0,
            TaskComplexity.COMPLEX: 3.0,
            TaskComplexity.ENTERPRISE: 4.0,
            TaskComplexity.CRITICAL: 5.0
        }
        priority_score += complexity_scores.get(complexity, 1.0)
        
        # Domain priority boost
        if domain in self.domain_patterns:
            priority_score *= self.domain_patterns[domain].get("priority_boost", 1.0)
            
        # Security relevance boost
        priority_score += security_relevance * 2.0
        
        # Risk assessment contribution
        risk_multipliers = {"high": 1.5, "medium": 1.2, "low": 1.0}
        for risk_type, level in risk_assessment.items():
            priority_score *= risk_multipliers.get(level, 1.0)
            
        # Determine priority level
        if priority_score >= 8.0:
            return "CRITICAL"
        elif priority_score >= 5.0:
            return "HIGH"
        elif priority_score >= 3.0:
            return "MEDIUM"
        else:
            return "LOW"
            
    def _estimate_effort(self, complexity: TaskComplexity, num_specialists: int) -> str:
        """Estimate effort required for the task"""
        base_efforts = {
            TaskComplexity.SIMPLE: 1,
            TaskComplexity.MODERATE: 4,
            TaskComplexity.COMPLEX: 10,
            TaskComplexity.ENTERPRISE: 40,
            TaskComplexity.CRITICAL: 8
        }
        
        base_effort = base_efforts.get(complexity, 4)
        total_effort = base_effort * (1 + (num_specialists - 1) * 0.5)
        
        if total_effort <= 2:
            return "1-2 hours"
        elif total_effort <= 8:
            return "1 day"
        elif total_effort <= 40:
            return "1 week"
        elif total_effort <= 160:
            return "1 month"
        else:
            return "1+ months"
            
    def _get_recommended_approach(self, complexity: TaskComplexity, task_type: TaskType,
                                domain: TaskDomain, num_specialists: int) -> str:
        """Get recommended orchestration approach"""
        # Security tasks always get special handling
        if domain == TaskDomain.SECURITY or complexity == TaskComplexity.CRITICAL:
            return "security_first_workflow"
            
        # Simple tasks
        if complexity == TaskComplexity.SIMPLE:
            return "single_specialist"
            
        # Moderate complexity
        if complexity == TaskComplexity.MODERATE:
            if num_specialists > 1:
                return "parallel_specialist_analysis"
            else:
                return "sequential_workflow"
                
        # Complex tasks
        if complexity == TaskComplexity.COMPLEX:
            if task_type in [TaskType.ANALYSIS, TaskType.TROUBLESHOOTING]:
                return "parallel_analysis_workflow"
            else:
                return "phased_project_workflow"
                
        # Enterprise tasks
        if complexity == TaskComplexity.ENTERPRISE:
            return "hierarchical_decomposition"
            
        return "adaptive_workflow"
        
    def _calculate_confidence(self, complexity_confidence: float, 
                            domain_scores: Dict[TaskDomain, float],
                            task_type: TaskType) -> float:
        """Calculate overall analysis confidence"""
        # Base confidence from complexity analysis
        confidence = complexity_confidence * 0.4
        
        # Domain detection confidence
        if domain_scores:
            max_score = max(domain_scores.values())
            total_score = sum(domain_scores.values())
            domain_confidence = max_score / total_score if total_score > 0 else 0.5
            confidence += domain_confidence * 0.4
        else:
            confidence += 0.2  # Low confidence if no domain detected
            
        # Task type confidence (simple binary for now)
        confidence += 0.2 if task_type != TaskType.ANALYSIS else 0.1
        
        return min(confidence, 0.95)  # Cap at 95% confidence


# Factory function for backward compatibility
def analyze_task_complexity_enhanced(task_description: str, 
                                   context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Enhanced task complexity analysis with domain detection
    Backward compatible wrapper for the new analyzer
    """
    analyzer = EnhancedComplexityAnalyzer()
    result = analyzer.analyze_task(task_description, context)
    
    # Convert to dictionary format for compatibility
    return {
        "complexity": result.complexity,
        "primary_domain": result.primary_domain,
        "secondary_domains": result.secondary_domains,
        "task_type": result.task_type,
        "confidence_score": result.confidence_score,
        "security_relevance": result.security_relevance,
        "recommended_approach": result.recommended_approach,
        "required_specialists": result.required_specialists,
        "estimated_effort": result.estimated_effort,
        "priority_level": result.priority_level,
        "risk_assessment": result.risk_assessment,
        "metadata": result.metadata
    }