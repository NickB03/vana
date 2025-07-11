"""
Unit tests for Enhanced Complexity Analyzer (Phase 2)
Tests domain detection, security routing, and enhanced complexity analysis
"""

import pytest
from agents.orchestration.enhanced_complexity_analyzer import (
    EnhancedComplexityAnalyzer,
    TaskComplexity,
    TaskDomain,
    TaskType,
    analyze_task_complexity_enhanced
)


@pytest.mark.unit
class TestEnhancedComplexityAnalyzer:
    """Test the enhanced complexity analyzer"""
    
    @pytest.fixture
    def analyzer(self):
        """Create analyzer instance"""
        return EnhancedComplexityAnalyzer()
        
    def test_simple_task_detection(self, analyzer):
        """Test detection of simple tasks"""
        result = analyzer.analyze_task("What is the difference between REST and GraphQL?")
        
        assert result.complexity == TaskComplexity.SIMPLE
        assert result.task_type == TaskType.ANALYSIS
        assert len(result.required_specialists) <= 1
        assert result.priority_level in ["LOW", "MEDIUM"]
        
    def test_security_task_elevation(self, analyzer):
        """Test that security tasks get elevated complexity"""
        result = analyzer.analyze_task("Scan the codebase for security vulnerabilities")
        
        assert result.complexity == TaskComplexity.CRITICAL
        assert result.primary_domain == TaskDomain.SECURITY
        assert "security_specialist" in result.required_specialists
        assert result.security_relevance >= 0.8
        assert result.priority_level in ["HIGH", "CRITICAL"]
        
    def test_enterprise_task_detection(self, analyzer):
        """Test detection of enterprise-scale tasks"""
        result = analyzer.analyze_task(
            "Design and implement an enterprise-wide microservices migration strategy"
        )
        
        assert result.complexity == TaskComplexity.ENTERPRISE
        assert result.primary_domain in [TaskDomain.ARCHITECTURE, TaskDomain.INFRASTRUCTURE]
        assert len(result.required_specialists) >= 2
        assert result.estimated_effort in ["1 month", "1+ months"]
        
    def test_domain_detection_accuracy(self, analyzer):
        """Test accurate domain detection"""
        test_cases = [
            ("Build a machine learning model for fraud detection", TaskDomain.DATA_SCIENCE),
            ("Create a responsive React dashboard with charts", TaskDomain.USER_INTERFACE),
            ("Set up Kubernetes cluster with auto-scaling", TaskDomain.INFRASTRUCTURE),
            ("Design API architecture for microservices", TaskDomain.ARCHITECTURE),
            ("Write unit tests for the payment module", TaskDomain.QUALITY_ASSURANCE),
            ("Perform OWASP compliance audit", TaskDomain.SECURITY)
        ]
        
        for task, expected_domain in test_cases:
            result = analyzer.analyze_task(task)
            assert result.primary_domain == expected_domain, f"Failed for: {task}"
            
    def test_multiple_domain_detection(self, analyzer):
        """Test detection of multiple domains"""
        result = analyzer.analyze_task(
            "Build a secure ML-powered web application with real-time monitoring"
        )
        
        # Any of these domains could be primary based on scoring
        possible_primary = [TaskDomain.DATA_SCIENCE, TaskDomain.SECURITY, TaskDomain.INFRASTRUCTURE, TaskDomain.USER_INTERFACE]
        assert result.primary_domain in possible_primary
        assert len(result.secondary_domains) >= 1
        # Check that multiple relevant domains are detected
        all_domains = [result.primary_domain] + result.secondary_domains
        # At least 2 of the expected domains should be present
        expected_domains = {TaskDomain.DATA_SCIENCE, TaskDomain.SECURITY, TaskDomain.INFRASTRUCTURE, TaskDomain.USER_INTERFACE}
        detected_domains = set(all_domains)
        assert len(detected_domains.intersection(expected_domains)) >= 2
        
    def test_task_type_classification(self, analyzer):
        """Test task type classification"""
        test_cases = [
            ("Analyze the performance bottlenecks", TaskType.ANALYSIS),
            ("Design a scalable architecture", TaskType.DESIGN),
            ("Implement the payment gateway", TaskType.IMPLEMENTATION),
            ("Optimize database queries", TaskType.OPTIMIZATION),
            ("Debug the authentication issue", TaskType.TROUBLESHOOTING),
            ("Migrate from MySQL to PostgreSQL", TaskType.MIGRATION),
            ("Audit the codebase for vulnerabilities", TaskType.SECURITY_AUDIT),
            ("Document the API endpoints", TaskType.DOCUMENTATION)
        ]
        
        for task, expected_type in test_cases:
            result = analyzer.analyze_task(task)
            assert result.task_type == expected_type, f"Failed for: {task}"
            
    def test_security_relevance_scoring(self, analyzer):
        """Test security relevance scoring"""
        test_cases = [
            ("Fix the vulnerability in user authentication", 0.9),
            ("Implement encryption for sensitive data", 0.8),
            ("Review code for security best practices", 0.6),
            ("Build a todo list application", 0.0),
            ("Analyze system performance metrics", 0.0)
        ]
        
        for task, min_relevance in test_cases:
            result = analyzer.analyze_task(task)
            assert result.security_relevance >= min_relevance, f"Failed for: {task}"
            
    def test_risk_assessment(self, analyzer):
        """Test risk assessment functionality"""
        # High security risk task
        result = analyzer.analyze_task("Fix critical vulnerability CVE-2024-1234")
        assert result.risk_assessment["security_risk"] == "high"
        
        # High complexity risk task
        result = analyzer.analyze_task("Implement enterprise-wide system overhaul")
        assert result.risk_assessment["complexity_risk"] == "high"
        
        # Compliance risk task
        result = analyzer.analyze_task("Ensure GDPR compliance for user data")
        assert result.risk_assessment["compliance_risk"] == "high"
        
    def test_specialist_assignment(self, analyzer):
        """Test specialist assignment logic"""
        # Security critical task
        result = analyzer.analyze_task("Perform penetration testing on the API")
        assert result.required_specialists[0] == "security_specialist"
        
        # Multi-domain complex task
        result = analyzer.analyze_task(
            "Build a secure, scalable ML platform with monitoring"
        )
        assert len(result.required_specialists) >= 3
        assert "security_specialist" in result.required_specialists
        
    def test_priority_calculation(self, analyzer):
        """Test priority level calculation"""
        # Critical priority
        result = analyzer.analyze_task("Fix critical security breach in production")
        assert result.priority_level == "CRITICAL"
        
        # High priority
        result = analyzer.analyze_task("Implement authentication system")
        assert result.priority_level in ["HIGH", "CRITICAL"]
        
        # Low priority
        result = analyzer.analyze_task("Update README documentation")
        assert result.priority_level in ["LOW", "MEDIUM"]
        
    def test_recommended_approach(self, analyzer):
        """Test recommended approach selection"""
        # Security first
        result = analyzer.analyze_task("Audit system for vulnerabilities")
        assert result.recommended_approach == "security_first_workflow"
        
        # Single specialist
        result = analyzer.analyze_task("Explain REST API best practices")
        assert result.recommended_approach == "single_specialist"
        
        # Hierarchical decomposition
        result = analyzer.analyze_task("Plan enterprise cloud migration")
        assert result.recommended_approach == "hierarchical_decomposition"
        
    def test_confidence_scoring(self, analyzer):
        """Test confidence score calculation"""
        # High confidence - clear task
        result = analyzer.analyze_task("Implement user authentication with JWT")
        assert result.confidence_score >= 0.7
        
        # Lower confidence - vague task
        result = analyzer.analyze_task("Make the system better")
        assert result.confidence_score < 0.7  # Adjusted threshold
        
    def test_effort_estimation(self, analyzer):
        """Test effort estimation"""
        test_cases = [
            ("Fix typo in documentation", ["1-2 hours"]),
            ("Implement new API endpoint", ["1 day"]),
            ("Build complete authentication system", ["1 week"]),
            ("Migrate entire platform to microservices", ["1 month", "1+ months"])
        ]
        
        for task, expected_efforts in test_cases:
            result = analyzer.analyze_task(task)
            assert result.estimated_effort in expected_efforts, f"Failed for: {task}. Got {result.estimated_effort}, expected one of {expected_efforts}"
            
    def test_metadata_inclusion(self, analyzer):
        """Test that metadata is properly included"""
        result = analyzer.analyze_task("Build a secure payment system")
        
        assert "domain_scores" in result.metadata
        assert "complexity_confidence" in result.metadata
        assert result.metadata["analysis_version"] == "2.0"
        assert result.metadata["enhanced_routing"] is True


@pytest.mark.unit
class TestBackwardCompatibility:
    """Test backward compatibility wrapper"""
    
    def test_analyze_task_complexity_enhanced(self):
        """Test the backward compatible wrapper function"""
        result = analyze_task_complexity_enhanced("Implement secure API gateway")
        
        # Check that all expected fields are present
        assert "complexity" in result
        assert "primary_domain" in result
        assert "task_type" in result
        assert "required_specialists" in result
        assert "priority_level" in result
        
        # Verify types
        assert isinstance(result["complexity"], TaskComplexity)
        assert isinstance(result["primary_domain"], TaskDomain)
        assert isinstance(result["task_type"], TaskType)
        assert isinstance(result["required_specialists"], list)
        
    def test_context_parameter(self):
        """Test that context parameter is handled"""
        context = {"user_type": "enterprise", "previous_tasks": ["security_audit"]}
        result = analyze_task_complexity_enhanced("Build new feature", context)
        
        assert result is not None
        # Context might influence results but shouldn't break the function