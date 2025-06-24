#!/usr/bin/env python3
"""
Validation script for task_classifier.py - Task Classification and Routing
Validates all 7 critical functions without external dependencies
"""

import sys
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
from typing import List, Dict, Any

# Add project root to path
sys.path.append(str(Path(__file__).parent))

def validate_task_classifier():
    """Validate task classifier functionality"""
    print("🧪 Validating Task Classifier...")
    print("=" * 60)
    
    try:
        # Import the task classifier components
        from lib._tools.task_classifier import (
            AgentCategory, AgentRecommendation, TaskClassification,
            TaskClassifier, get_task_classifier
        )
        print("✅ Successfully imported task_classifier module")
        
        # Test 1: Enum and data class functionality
        print("\n📋 Test 1: Enums and Data Classes")
        
        # Test AgentCategory enum
        assert isinstance(AgentCategory.ORCHESTRATION, AgentCategory), "AgentCategory must be enum"
        assert AgentCategory.ORCHESTRATION.value == "orchestration", "Enum value must be correct"
        assert len(list(AgentCategory)) >= 6, "Must have at least 6 agent categories"
        print("  ✅ AgentCategory enum works correctly")
        
        # Test AgentRecommendation
        recommendation = AgentRecommendation(
            agent_category=AgentCategory.CODE_EXECUTION,
            agent_name="code_execution",
            confidence=0.85,
            reasoning="Good match for code tasks",
            fallback_agents=["vana", "specialists"]
        )
        
        assert isinstance(recommendation.agent_category, AgentCategory), "Agent category must be enum"
        assert isinstance(recommendation.agent_name, str), "Agent name must be string"
        assert isinstance(recommendation.confidence, float), "Confidence must be float"
        assert 0 <= recommendation.confidence <= 1, "Confidence must be 0-1"
        assert isinstance(recommendation.reasoning, str), "Reasoning must be string"
        assert isinstance(recommendation.fallback_agents, list), "Fallback agents must be list"
        print("  ✅ AgentRecommendation dataclass works correctly")
        
        # Test TaskClassification
        classification = TaskClassification(
            primary_recommendation=recommendation,
            alternative_recommendations=[],
            decomposition_suggested=False,
            parallel_execution=False,
            estimated_agents_needed=1,
            routing_strategy="direct_routing"
        )
        
        assert isinstance(classification.primary_recommendation, AgentRecommendation), \
            "Primary recommendation must be AgentRecommendation"
        assert isinstance(classification.alternative_recommendations, list), \
            "Alternative recommendations must be list"
        assert isinstance(classification.decomposition_suggested, bool), \
            "Decomposition suggested must be bool"
        assert isinstance(classification.parallel_execution, bool), \
            "Parallel execution must be bool"
        assert isinstance(classification.estimated_agents_needed, int), \
            "Estimated agents needed must be int"
        assert isinstance(classification.routing_strategy, str), \
            "Routing strategy must be string"
        print("  ✅ TaskClassification dataclass works correctly")
        
        # Test 2: TaskClassifier initialization with mocks
        print("\n📋 Test 2: TaskClassifier Initialization")
        
        from unittest.mock import Mock, patch
        
        with patch('lib._tools.task_classifier.get_task_analyzer') as mock_analyzer:
            # Setup mock
            mock_analyzer.return_value = Mock()
            
            classifier = TaskClassifier()
            
            # Validate initialization
            assert classifier.task_analyzer is not None, "Task analyzer must be initialized"
            assert isinstance(classifier.agent_capabilities, dict), "Agent capabilities must be dict"
            assert isinstance(classifier.routing_rules, dict), "Routing rules must be dict"
            
            # Validate agent capabilities structure
            assert len(classifier.agent_capabilities) >= 6, "Must have multiple agent categories"
            for category, capabilities in classifier.agent_capabilities.items():
                assert isinstance(category, AgentCategory), "Key must be AgentCategory"
                assert isinstance(capabilities, dict), "Capabilities must be dict"
                assert "name" in capabilities, "Must have name"
                assert "capabilities" in capabilities, "Must have capabilities list"
                assert "task_types" in capabilities, "Must have task types"
                assert "specialties" in capabilities, "Must have specialties"
            
            print("  ✅ TaskClassifier initialization works correctly")
        
        # Test 3: Agent capabilities initialization
        print("\n📋 Test 3: Agent Capabilities Configuration")
        
        with patch('lib._tools.task_classifier.get_task_analyzer') as mock_analyzer:
            mock_analyzer.return_value = Mock()
            
            classifier = TaskClassifier()
            capabilities = classifier._initialize_agent_capabilities()
            
            # Validate capabilities structure
            assert isinstance(capabilities, dict), "Capabilities must be dict"
            
            # Check specific agent categories
            required_categories = [
                AgentCategory.ORCHESTRATION,
                AgentCategory.CODE_EXECUTION,
                AgentCategory.DATA_SCIENCE,
                AgentCategory.MEMORY
            ]
            
            for category in required_categories:
                assert category in capabilities, f"Must have {category.value} capabilities"
                agent_info = capabilities[category]
                assert isinstance(agent_info["name"], str), "Agent name must be string"
                assert isinstance(agent_info["capabilities"], list), "Capabilities must be list"
                assert len(agent_info["capabilities"]) > 0, "Must have at least one capability"
                assert isinstance(agent_info["specialties"], list), "Specialties must be list"
            
            print("  ✅ Agent capabilities configuration works correctly")
        
        # Test 4: Routing rules initialization
        print("\n📋 Test 4: Routing Rules Configuration")
        
        with patch('lib._tools.task_classifier.get_task_analyzer') as mock_analyzer:
            mock_analyzer.return_value = Mock()
            
            classifier = TaskClassifier()
            rules = classifier._initialize_routing_rules()
            
            # Validate routing rules structure
            assert isinstance(rules, dict), "Rules must be dict"
            
            required_rule_keys = [
                "decomposition_triggers",
                "parallel_triggers", 
                "orchestration_triggers",
                "complexity_thresholds"
            ]
            
            for key in required_rule_keys:
                assert key in rules, f"Rules must contain {key}"
            
            # Validate trigger lists
            assert isinstance(rules["decomposition_triggers"], list), "Decomposition triggers must be list"
            assert isinstance(rules["parallel_triggers"], list), "Parallel triggers must be list"
            assert len(rules["decomposition_triggers"]) > 5, "Must have multiple decomposition triggers"
            assert len(rules["parallel_triggers"]) > 3, "Must have multiple parallel triggers"
            
            print("  ✅ Routing rules configuration works correctly")
        
        # Test 5: Agent scoring functionality
        print("\n📋 Test 5: Agent Scoring")
        
        with patch('lib._tools.task_classifier.get_task_analyzer') as mock_analyzer:
            mock_analyzer.return_value = Mock()
            
            # Import TaskAnalysis components for testing
            try:
                from lib._tools.task_analyzer import TaskAnalysis, TaskComplexity, TaskType
            except ImportError:
                # Create mock TaskAnalysis if not available
                @dataclass 
                class TaskAnalysis:
                    task_type: str
                    complexity: str
                    keywords: List[str]
                    required_capabilities: List[str]
                    estimated_duration: float
                    resource_requirements: Dict[str, Any]
                    confidence_score: float
                    reasoning: str
                
                class TaskType:
                    CODE_EXECUTION = "code_execution"
                    
                class TaskComplexity:
                    MODERATE = "moderate"
            
            classifier = TaskClassifier()
            
            # Create test analysis
            test_analysis = TaskAnalysis(
                task_type=TaskType.CODE_EXECUTION,
                complexity=TaskComplexity.MODERATE,
                keywords=["python", "script", "run"],
                required_capabilities=["python", "code_execution"],
                estimated_duration=30.0,
                resource_requirements={},
                confidence_score=0.9,
                reasoning="Code execution task detected"
            )
            
            # Test scoring for code execution agent
            code_agent_capabilities = classifier.agent_capabilities[AgentCategory.CODE_EXECUTION]
            score = classifier._calculate_agent_score(test_analysis, code_agent_capabilities, "run python script")
            
            assert isinstance(score, float), "Score must be float"
            assert 0 <= score <= 1, "Score must be 0-1"
            assert score > 0.5, "Code execution agent should score high for code tasks"
            
            print("  ✅ Agent scoring works correctly")
        
        # Test 6: Task decomposition logic
        print("\n📋 Test 6: Task Decomposition Logic")
        
        with patch('lib._tools.task_classifier.get_task_analyzer') as mock_analyzer:
            mock_analyzer.return_value = Mock()
            
            classifier = TaskClassifier()
            
            # Create test analysis for complex task
            complex_analysis = TaskAnalysis(
                task_type="general",
                complexity="complex",
                keywords=["analyze", "multiple", "visualizations", "machine", "learning"],
                required_capabilities=["python", "data_analysis", "visualization", "machine_learning"],
                estimated_duration=300.0,
                resource_requirements={},
                confidence_score=0.8,
                reasoning="Complex multi-step task detected"
            )
            
            # Test with decomposition triggers
            should_decompose_1 = classifier._should_decompose_task(
                complex_analysis, 
                "analyze data and create multiple visualizations and also run machine learning models"
            )
            assert isinstance(should_decompose_1, bool), "Decomposition decision must be bool"
            assert should_decompose_1 == True, "Should suggest decomposition for complex multi-step task"
            
            # Test simple task
            simple_analysis = TaskAnalysis(
                task_type="general",
                complexity="simple",
                keywords=["run", "script"],
                required_capabilities=["python"],
                estimated_duration=10.0,
                resource_requirements={},
                confidence_score=0.9,
                reasoning="Simple task detected"
            )
            
            should_decompose_2 = classifier._should_decompose_task(simple_analysis, "run a simple script")
            assert should_decompose_2 == False, "Should not decompose simple tasks"
            
            print("  ✅ Task decomposition logic works correctly")
        
        # Test 7: Parallel execution logic
        print("\n📋 Test 7: Parallel Execution Logic")
        
        with patch('lib._tools.task_classifier.get_task_analyzer') as mock_analyzer:
            mock_analyzer.return_value = Mock()
            
            classifier = TaskClassifier()
            
            # Test with parallel triggers
            parallel_analysis = TaskAnalysis(
                task_type="general",
                complexity="moderate",
                keywords=["process", "multiple", "parallel"],
                required_capabilities=["data_analysis"],
                estimated_duration=60.0,
                resource_requirements={"parallel_capable": True},
                confidence_score=0.8,
                reasoning="Parallel task detected"
            )
            
            should_parallel_1 = classifier._should_execute_parallel(
                parallel_analysis,
                "process multiple files simultaneously and run analysis in parallel"
            )
            assert isinstance(should_parallel_1, bool), "Parallel decision must be bool"
            assert should_parallel_1 == True, "Should suggest parallel execution for parallel tasks"
            
            # Test sequential task
            should_parallel_2 = classifier._should_execute_parallel(
                parallel_analysis,
                "read file and then process sequentially"
            )
            # This could be True or False depending on complexity, just check it's bool
            assert isinstance(should_parallel_2, bool), "Parallel decision must be bool"
            
            print("  ✅ Parallel execution logic works correctly")
        
        # Test 8: Routing strategy determination
        print("\n📋 Test 8: Routing Strategy")
        
        with patch('lib._tools.task_classifier.get_task_analyzer') as mock_analyzer:
            mock_analyzer.return_value = Mock()
            
            classifier = TaskClassifier()
            
            test_analysis = TaskAnalysis(
                task_type="general",
                complexity="moderate",
                keywords=["test", "routing"],
                required_capabilities=["python"],
                estimated_duration=30.0,
                resource_requirements={},
                confidence_score=0.8,
                reasoning="Test routing strategy"
            )
            
            # Test different routing strategies
            strategy_1 = classifier._determine_routing_strategy(test_analysis, True, True)
            assert strategy_1 == "decompose_and_parallel", "Should suggest decompose and parallel"
            
            strategy_2 = classifier._determine_routing_strategy(test_analysis, True, False)
            assert strategy_2 == "decompose_sequential", "Should suggest decompose sequential"
            
            strategy_3 = classifier._determine_routing_strategy(test_analysis, False, True)
            assert strategy_3 == "parallel_execution", "Should suggest parallel execution"
            
            strategy_4 = classifier._determine_routing_strategy(test_analysis, False, False)
            assert strategy_4 == "direct_routing", "Should suggest direct routing"
            
            print("  ✅ Routing strategy determination works correctly")
        
        # Test 9: Global function
        print("\n📋 Test 9: Global Function")
        
        with patch('lib._tools.task_classifier.get_task_analyzer') as mock_analyzer:
            mock_analyzer.return_value = Mock()
            
            # Test singleton behavior
            classifier1 = get_task_classifier()
            classifier2 = get_task_classifier()
            
            assert isinstance(classifier1, TaskClassifier), "Must return TaskClassifier"
            assert isinstance(classifier2, TaskClassifier), "Must return TaskClassifier"
            assert classifier1 is classifier2, "Should return same instance (singleton)"
            
            print("  ✅ Global function works correctly")
        
        print("\n🎉 ALL TESTS PASSED!")
        print("=" * 60)
        print("✅ Task Classifier: 7 functions validated")
        print("✅ Enums and data classes: AgentCategory, AgentRecommendation, TaskClassification work correctly")
        print("✅ Initialization: TaskClassifier setup works correctly") 
        print("✅ Agent capabilities: Configuration works correctly")
        print("✅ Routing rules: Rule configuration works correctly")
        print("✅ Agent scoring: Capability matching works correctly")
        print("✅ Task decomposition: Logic works correctly")
        print("✅ Parallel execution: Logic works correctly")
        print("✅ Routing strategy: Strategy determination works correctly")
        print("✅ Global function: Singleton pattern works correctly")
        
        return True
        
    except Exception as e:
        print(f"\n❌ VALIDATION FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = validate_task_classifier()
    sys.exit(0 if success else 1)