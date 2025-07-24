# VANA Phase 2B - Comprehensive ADK Evaluation Plan

**Date**: January 21, 2025  
**Version**: 1.0  
**Status**: Planning

## 🎯 Executive Summary

This document outlines a comprehensive evaluation strategy for VANA's multi-agent system using Google ADK's evaluation framework. Unlike traditional software testing, we focus on both trajectory (agent decision-making process) and response quality (final outputs).

## 📊 Evaluation Objectives

### Primary Goals
1. **Validate Agent Behavior**: Ensure agents follow expected decision paths
2. **Verify Tool Usage**: Confirm correct tool selection and parameter passing
3. **Test Delegation Patterns**: Validate pure delegation orchestration
4. **Measure Response Quality**: Ensure outputs meet quality standards
5. **Establish Performance Baselines**: Create metrics for future optimization

### Success Criteria
- `tool_trajectory_avg_score`: ≥ 0.95 (95% trajectory accuracy)
- `response_match_score`: ≥ 0.80 (80% response similarity)
- All critical paths passing
- No delegation failures
- Response time < 5 seconds for simple queries

## 🧪 Test Structure

### 1. Unit Tests (.test.json) - Quick Development Tests
Location: `/tests/unit/`
- Individual specialist testing
- Single tool validation
- Basic routing decisions
- Error handling

### 2. Integration Tests (.evalset.json) - Comprehensive Validation  
Location: `/tests/integration/`
- Multi-agent orchestration
- Complex workflows
- State management
- End-to-end scenarios

### 3. Performance Tests
Location: `/tests/performance/`
- Response time benchmarks
- Concurrent request handling
- Resource utilization

## 📁 Test Organization

```
tests/
├── test_config.json           # Global evaluation criteria
├── unit/
│   ├── orchestrator/
│   │   ├── basic_routing.test.json
│   │   ├── delegation_patterns.test.json
│   │   └── error_handling.test.json
│   ├── specialists/
│   │   ├── simple_search.test.json
│   │   ├── research_specialist.test.json
│   │   ├── architecture_specialist.test.json
│   │   ├── data_science_specialist.test.json
│   │   └── devops_specialist.test.json
│   └── tools/
│       ├── google_search_tool.test.json
│       └── tool_error_handling.test.json
├── integration/
│   ├── multi_agent_workflows.evalset.json
│   ├── complex_queries.evalset.json
│   ├── state_management.evalset.json
│   └── production_scenarios.evalset.json
├── performance/
│   └── response_benchmarks.test.json
└── regression/
    └── known_issues.evalset.json
```

## 🔬 Detailed Test Cases

### A. Orchestrator Evaluation

#### 1. Basic Routing (basic_routing.test.json)
```json
{
  "eval_id": "orchestrator_simple_query_routing",
  "conversation": [
    {
      "user_content": {
        "parts": [{"text": "What's the weather in Paris?"}]
      },
      "agent_intermediate_responses": [
        {
          "tool_uses": [
            {
              "tool_name": "simple_search_agent",
              "tool_input": {
                "query": "What's the weather in Paris?"
              }
            }
          ]
        }
      ],
      "final_response": {
        "parts": [{"text": "The current weather in Paris"}]
      }
    }
  ]
}
```

#### 2. Delegation Patterns (delegation_patterns.test.json)
```json
{
  "eval_id": "pure_delegation_agenttool_usage",
  "conversation": [
    {
      "user_content": {
        "parts": [{"text": "Analyze the architecture of a microservices system"}]
      },
      "agent_intermediate_responses": [
        {
          "tool_uses": [
            {
              "tool_name": "architecture_specialist_agent",
              "tool_input": {
                "query": "Analyze the architecture of a microservices system"
              }
            }
          ]
        }
      ],
      "final_response": {
        "parts": [{"text": "A microservices architecture consists of"}]
      }
    }
  ]
}
```

### B. Specialist Evaluation

#### 1. Simple Search Agent (simple_search.test.json)
```json
{
  "eval_id": "simple_search_weather_query",
  "conversation": [
    {
      "user_content": {
        "parts": [{"text": "What is the capital of Japan?"}]
      },
      "agent_intermediate_responses": [],
      "final_response": {
        "parts": [{"text": "The capital of Japan is Tokyo"}]
      }
    }
  ]
}
```

#### 2. Research Specialist (research_specialist.test.json)
```json
{
  "eval_id": "research_complex_topic",
  "conversation": [
    {
      "user_content": {
        "parts": [{"text": "What are the latest breakthroughs in quantum computing?"}]
      },
      "agent_intermediate_responses": [
        {
          "tool_uses": [
            {
              "tool_name": "google_search",
              "tool_input": {
                "query": "quantum computing breakthroughs 2024 2025"
              }
            }
          ]
        }
      ],
      "final_response": {
        "parts": [{"text": "Recent breakthroughs in quantum computing include"}]
      }
    }
  ]
}
```

### C. Multi-Agent Integration Tests

#### 1. Complex Workflows (multi_agent_workflows.evalset.json)
```json
{
  "eval_set_id": "vana_multi_agent_integration",
  "eval_cases": [
    {
      "eval_id": "research_then_architecture_analysis",
      "conversation": [
        {
          "user_content": {
            "parts": [{"text": "Research microservices patterns and analyze their architecture"}]
          },
          "agent_intermediate_responses": [
            {
              "sub_agent_responses": [
                {
                  "agent_name": "research_specialist",
                  "response": {"parts": [{"text": "Found information on microservices patterns"}]}
                },
                {
                  "agent_name": "architecture_specialist",
                  "response": {"parts": [{"text": "Analyzing the architectural patterns"}]}
                }
              ]
            }
          ],
          "final_response": {
            "parts": [{"text": "Based on research and architectural analysis"}]
          }
        }
      ]
    },
    {
      "eval_id": "data_analysis_with_devops_deployment",
      "conversation": [
        {
          "user_content": {
            "parts": [{"text": "Analyze this dataset and suggest deployment strategy"}]
          },
          "agent_intermediate_responses": [
            {
              "sub_agent_responses": [
                {
                  "agent_name": "data_science_specialist",
                  "response": {"parts": [{"text": "Dataset analysis reveals"}]}
                },
                {
                  "agent_name": "devops_specialist",
                  "response": {"parts": [{"text": "Recommended deployment strategy"}]}
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### D. Tool Usage Evaluation

#### 1. Google Search Tool (google_search_tool.test.json)
```json
{
  "eval_id": "google_search_tool_usage",
  "conversation": [
    {
      "user_content": {
        "parts": [{"text": "Find information about AI trends in 2025"}]
      },
      "agent_intermediate_responses": [
        {
          "tool_uses": [
            {
              "tool_name": "google_search",
              "tool_input": {
                "query": "AI trends 2025",
                "num_results": 5
              }
            }
          ]
        }
      ]
    }
  ]
}
```

## 🎯 Evaluation Criteria Configuration

### test_config.json
```json
{
  "criteria": {
    "tool_trajectory_avg_score": 0.95,
    "response_match_score": 0.80
  },
  "evaluation_method": "in_order",
  "timeout_seconds": 30,
  "retry_on_failure": true,
  "max_retries": 2
}
```

## 🔄 Test Execution Strategy

### Phase 1: Unit Test Development (Days 1-2)
1. Create basic routing tests
2. Develop individual specialist tests
3. Implement tool usage tests
4. Add error handling scenarios

### Phase 2: Integration Testing (Days 3-4)
1. Multi-agent workflow tests
2. State management validation
3. Complex query scenarios
4. Production use case simulation

### Phase 3: Performance Baseline (Day 5)
1. Response time measurements
2. Concurrent request testing
3. Resource utilization monitoring
4. Optimization recommendations

## 🚀 Execution Commands

### Running Unit Tests
```bash
# Test individual components
adk eval agents/vana tests/unit/orchestrator/basic_routing.test.json

# Test all specialists
adk eval agents/vana tests/unit/specialists --print_detailed_results

# With custom config
adk eval agents/vana tests/unit --config_file_path=tests/test_config.json
```

### Running Integration Tests
```bash
# Full integration suite
adk eval agents/vana tests/integration/multi_agent_workflows.evalset.json

# Specific test cases
adk eval agents/vana tests/integration/complex_queries.evalset.json:research_then_architecture
```

### Programmatic Testing (pytest)
```python
# tests/test_vana_evaluation.py
import asyncio
from google.adk.evaluation.agent_evaluator import AgentEvaluator
import pytest

@pytest.mark.asyncio
async def test_orchestrator_routing():
    """Test orchestrator routes queries correctly."""
    result = await AgentEvaluator.evaluate(
        agent_module="agents/vana",
        eval_dataset_file_path_or_dir="tests/unit/orchestrator/basic_routing.test.json",
        config_file_path="tests/test_config.json"
    )
    assert result.passed
    assert result.tool_trajectory_avg_score >= 0.95

@pytest.mark.asyncio
async def test_multi_agent_workflows():
    """Test complex multi-agent interactions."""
    result = await AgentEvaluator.evaluate(
        agent_module="agents/vana",
        eval_dataset_file_path_or_dir="tests/integration/multi_agent_workflows.evalset.json"
    )
    assert result.passed
    assert result.response_match_score >= 0.80
```

## 📊 Expected Outcomes

### Metrics to Track
1. **Trajectory Accuracy**: How often agents choose correct tools/paths
2. **Response Quality**: Semantic similarity to expected outputs
3. **Delegation Success Rate**: Successful AgentTool invocations
4. **Error Recovery**: Graceful handling of failures
5. **Performance Baselines**: Response times per query type

### Success Indicators
- ✅ 95%+ trajectory accuracy for simple queries
- ✅ 80%+ response quality score
- ✅ Zero delegation failures
- ✅ <5s response time for basic queries
- ✅ <10s for complex multi-agent workflows

## 🔍 Debugging Strategy

### Using ADK Web UI
```bash
adk web agents/vana
```
- Navigate to Evaluation tab
- Import test cases
- Visual debugging with trace inspection
- Export results for CI/CD

### Common Issues to Test
1. **Tool Name Mismatches**: Agent uses wrong tool name
2. **Parameter Variations**: Different parameter formats
3. **Context Loss**: Multi-turn conversation state
4. **Timeout Handling**: Long-running operations
5. **Error Propagation**: Specialist failures

## 📈 Next Steps

1. **Implement Test Cases**: Create all JSON test files
2. **Run Baseline**: Establish current performance metrics
3. **Iterate**: Fix issues and optimize
4. **CI/CD Integration**: Add to GitHub Actions
5. **Monitor**: Track metrics over time

This comprehensive evaluation plan ensures VANA meets ADK standards for production-ready multi-agent systems.