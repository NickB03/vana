# VANA Comprehensive Evaluation Plan
*Following Google ADK Evaluation Standards*

## Executive Summary

This document outlines a comprehensive evaluation strategy for VANA's multi-agent system following Google ADK best practices. The plan ensures systematic testing of agent behaviors, tool usage, and response quality through automated evaluation pipelines.

## 1. Test Organization Structure

```
tests/
├── unit/                              # Fast, isolated tests
│   ├── agents/
│   │   ├── orchestrator.test.json
│   │   ├── data_analyst.test.json
│   │   └── security_analyst.test.json
│   ├── tools/
│   │   ├── file_operations.test.json
│   │   └── analysis_tools.test.json
│   └── test_config.json              # Strict metrics for unit tests
├── integration/                       # Multi-agent interactions
│   ├── routing.evalset.json
│   ├── multi_agent_collab.evalset.json
│   └── test_config.json              # Balanced metrics
├── e2e/                              # End-to-end workflows
│   ├── complete_workflows.evalset.json
│   └── test_config.json              # Production-like metrics
├── performance/                       # Performance benchmarks
│   └── response_time.test.json
└── README.md                         # Testing guide

```

## 2. Evaluation Metrics Configuration

### 2.1 Unit Test Configuration
```json
{
  "criteria": {
    "tool_trajectory_avg_score": 1.0,    // Exact tool usage match
    "response_match_score": 0.8          // 80% response similarity
  },
  "options": {
    "continue_on_failure": false,
    "verbose_output": true,
    "timeout_seconds": 30
  }
}
```

### 2.2 Integration Test Configuration
```json
{
  "criteria": {
    "tool_trajectory_avg_score": 0.95,   // Allow minor variations
    "response_match_score": 0.75         // More flexible responses
  },
  "options": {
    "continue_on_failure": true,
    "verbose_output": false,
    "timeout_seconds": 60
  }
}
```

### 2.3 Production Configuration
```json
{
  "criteria": {
    "tool_trajectory_avg_score": 0.9,    // Production flexibility
    "response_match_score": 0.7          // Natural language variations
  }
}
```

## 3. Agent-Specific Test Plans

### 3.1 Enhanced Orchestrator Tests

#### Unit Test: orchestrator.test.json
```json
{
  "eval_set_id": "enhanced_orchestrator_unit_tests",
  "eval_cases": [
    {
      "eval_id": "route_to_security_specialist",
      "description": "Test security routing based on keywords",
      "conversation": [{
        "user_content": {
          "parts": [{"text": "Check for SQL injection vulnerabilities in my code"}]
        },
        "final_response": {
          "parts": [{"text": "I'll route this security concern to our security specialist for a thorough vulnerability assessment."}]
        },
        "intermediate_data": {
          "tool_uses": [{
            "name": "analyze_and_route",
            "args": {
              "request": "Check for SQL injection vulnerabilities in my code",
              "context": {}
            }
          }]
        }
      }]
    },
    {
      "eval_id": "handle_unavailable_specialist",
      "description": "Test graceful handling when specialists unavailable",
      "conversation": [{
        "user_content": {
          "parts": [{"text": "Create a marketing campaign"}]
        },
        "final_response": {
          "parts": [{"text": "I apologize, but our content creation specialist is not currently available. I can help you outline the basic structure of a marketing campaign instead."}]
        },
        "intermediate_data": {
          "tool_uses": [{
            "name": "analyze_and_route",
            "args": {
              "request": "Create a marketing campaign",
              "context": {}
            }
          }]
        }
      }]
    }
  ]
}
```

#### Integration Test: routing.evalset.json
```json
{
  "eval_set_id": "orchestrator_routing_integration",
  "description": "Test complex routing scenarios and multi-turn interactions",
  "eval_cases": [
    {
      "eval_id": "multi_specialist_workflow",
      "description": "Test routing to multiple specialists in sequence",
      "conversation": [
        {
          "user_content": {
            "parts": [{"text": "Analyze our sales data for security risks"}]
          },
          "final_response": {
            "parts": [{"text": "I'll coordinate with both our data analyst and security specialist to provide a comprehensive analysis."}]
          },
          "intermediate_data": {
            "tool_uses": [
              {
                "name": "analyze_and_route",
                "args": {
                  "request": "Analyze our sales data for security risks",
                  "context": {"multi_specialist": true}
                }
              }
            ]
          }
        },
        {
          "user_content": {
            "parts": [{"text": "What specific vulnerabilities did you find?"}]
          },
          "final_response": {
            "parts": [{"text": "Based on the analysis, here are the key findings: [security analysis results]"}]
          },
          "intermediate_data": {
            "tool_uses": []
          }
        }
      ]
    }
  ]
}
```

### 3.2 Data Analyst Specialist Tests

```json
{
  "eval_set_id": "data_analyst_specialist_tests",
  "eval_cases": [
    {
      "eval_id": "sql_generation_basic",
      "conversation": [{
        "user_content": {
          "parts": [{"text": "Show me total sales by month for 2024"}]
        },
        "final_response": {
          "parts": [{"text": "Here's the SQL query to get total sales by month:\n```sql\nSELECT \n  DATE_TRUNC('month', sale_date) as month,\n  SUM(amount) as total_sales\nFROM sales\nWHERE YEAR(sale_date) = 2024\nGROUP BY month\nORDER BY month;\n```"}]
        },
        "intermediate_data": {
          "tool_uses": [
            {
              "name": "generate_sql_query",
              "args": {
                "request": "total sales by month for 2024",
                "schema_context": "sales_db"
              }
            }
          ]
        }
      }]
    }
  ]
}
```

### 3.3 Security Analyst Tests

```json
{
  "eval_set_id": "security_analyst_tests",
  "eval_cases": [
    {
      "eval_id": "vulnerability_detection",
      "conversation": [{
        "user_content": {
          "parts": [{"text": "Review this code: user_input = request.args.get('query'); db.execute(f'SELECT * FROM users WHERE name = {user_input}')"}]
        },
        "final_response": {
          "parts": [{"text": "⚠️ CRITICAL SECURITY VULNERABILITY DETECTED:\n\nSQL Injection vulnerability found. The code directly interpolates user input into the SQL query without sanitization.\n\nRecommended fix:\n```python\nuser_input = request.args.get('query')\ndb.execute('SELECT * FROM users WHERE name = ?', (user_input,))\n```\nUse parameterized queries to prevent SQL injection attacks."}]
        },
        "intermediate_data": {
          "tool_uses": [
            {
              "name": "analyze_code_security",
              "args": {
                "code": "user_input = request.args.get('query'); db.execute(f'SELECT * FROM users WHERE name = {user_input}')",
                "language": "python"
              }
            }
          ]
        }
      }]
    }
  ]
}
```

## 4. Tool Testing Strategy

### 4.1 File Operations Tools
```json
{
  "eval_set_id": "file_operations_tools",
  "eval_cases": [
    {
      "eval_id": "read_write_cycle",
      "conversation": [{
        "user_content": {
          "parts": [{"text": "Create a config file with API settings"}]
        },
        "final_response": {
          "parts": [{"text": "I've created the config file with API settings at config/api_settings.json"}]
        },
        "intermediate_data": {
          "tool_uses": [
            {
              "name": "adk_write_file",
              "args": {
                "path": "config/api_settings.json",
                "content": "{\"api_key\": \"placeholder\", \"timeout\": 30}"
              }
            }
          ]
        }
      }]
    }
  ]
}
```

## 5. CI/CD Integration

### 5.1 GitHub Actions Workflow
```yaml
name: ADK Agent Evaluation

on: [push, pull_request]

jobs:
  evaluate-agents:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.13'
    
    - name: Install dependencies
      run: |
        pip install google-adk
        pip install -r requirements.txt
    
    - name: Run Unit Tests
      run: |
        adk eval agents/vana tests/unit --config_file_path=tests/unit/test_config.json
    
    - name: Run Integration Tests
      run: |
        adk eval agents/vana tests/integration --config_file_path=tests/integration/test_config.json
    
    - name: Generate Evaluation Report
      run: |
        adk eval agents/vana tests/e2e --print_detailed_results > evaluation_report.txt
    
    - name: Upload Evaluation Results
      uses: actions/upload-artifact@v3
      with:
        name: evaluation-results
        path: evaluation_report.txt
```

### 5.2 Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running ADK agent evaluations..."

# Run critical unit tests
adk eval agents/vana/enhanced_orchestrator tests/unit/agents/orchestrator.test.json

if [ $? -ne 0 ]; then
    echo "❌ Orchestrator evaluation failed. Please fix before committing."
    exit 1
fi

echo "✅ All evaluations passed!"
```

## 6. Pytest Integration

```python
# tests/test_adk_evaluation.py
import asyncio
import pytest
from pathlib import Path
from google.adk.evaluation.agent_evaluator import AgentEvaluator

class TestVANAAgents:
    """ADK-based evaluation tests for VANA agents."""
    
    @pytest.fixture
    def test_data_dir(self):
        return Path(__file__).parent
    
    @pytest.mark.asyncio
    async def test_orchestrator_unit(self, test_data_dir):
        """Test orchestrator basic functionality."""
        result = await AgentEvaluator.evaluate(
            agent_module="agents.vana.enhanced_orchestrator",
            eval_dataset_file_path_or_dir=str(test_data_dir / "unit/agents/orchestrator.test.json"),
            config_file_path=str(test_data_dir / "unit/test_config.json")
        )
        assert result.passed
        assert result.tool_trajectory_avg_score == 1.0
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_multi_agent_routing(self, test_data_dir):
        """Test multi-agent routing scenarios."""
        result = await AgentEvaluator.evaluate(
            agent_module="agents.vana.enhanced_orchestrator",
            eval_dataset_file_path_or_dir=str(test_data_dir / "integration/routing.evalset.json"),
            config_file_path=str(test_data_dir / "integration/test_config.json")
        )
        assert result.passed
        assert result.tool_trajectory_avg_score >= 0.95
    
    @pytest.mark.asyncio
    @pytest.mark.parametrize("agent_name,test_file", [
        ("data_analyst", "data_analyst.test.json"),
        ("security_analyst", "security_analyst.test.json"),
        ("financial_advisor", "financial_advisor.test.json")
    ])
    async def test_specialist_agents(self, test_data_dir, agent_name, test_file):
        """Parameterized tests for all specialist agents."""
        result = await AgentEvaluator.evaluate(
            agent_module=f"agents.specialists.{agent_name}",
            eval_dataset_file_path_or_dir=str(test_data_dir / f"unit/agents/{test_file}")
        )
        assert result.passed
```

## 7. Migration Strategy

### Phase 1: Assessment (Week 1)
1. Inventory existing pytest tests
2. Identify test categories (unit, integration, e2e)
3. Map current tests to ADK evaluation patterns

### Phase 2: Test Creation (Week 2-3)
1. Create test.json files for critical paths
2. Develop evalset.json for complex scenarios
3. Use ADK migration tool for existing tests:
   ```python
   from google.adk.evaluation.agent_evaluator import AgentEvaluator
   
   # Migrate existing test
   AgentEvaluator.migrate_eval_data_to_new_schema(
       old_test_file="tests/old_format/test_orchestrator.py",
       output_file="tests/unit/agents/orchestrator.test.json"
   )
   ```

### Phase 3: Integration (Week 4)
1. Set up CI/CD pipeline
2. Configure pre-commit hooks
3. Train team on ADK evaluation

### Phase 4: Optimization
1. Analyze evaluation results
2. Adjust metrics thresholds
3. Expand test coverage

## 8. Best Practices

### 8.1 Test Design
- **Start Small**: Begin with simple unit tests
- **Be Flexible**: Allow for LLM response variations
- **Focus on Intent**: Test what the agent should do, not exact wording
- **Mock External Services**: Use predictable responses for external APIs

### 8.2 Debugging Failed Tests
1. Use ADK Web UI for visual debugging:
   ```bash
   adk web agents/vana
   ```
2. Check trace tab for execution flow
3. Verify tool arguments match expectations
4. Review response similarity scores

### 8.3 Continuous Improvement
- Collect production interactions
- Convert real scenarios to test cases
- Regular test suite reviews
- Update tests as agents evolve

## 9. Monitoring and Reporting

### 9.1 Evaluation Dashboard
Create a dashboard tracking:
- Pass/fail rates by agent
- Average trajectory scores
- Response match scores
- Test execution times
- Coverage metrics

### 9.2 Regular Reviews
- Weekly: Review failed tests
- Monthly: Coverage analysis
- Quarterly: Comprehensive test suite audit

## 10. Next Steps

1. **Immediate Actions**:
   - Create initial test files for orchestrator
   - Set up basic CI/CD pipeline
   - Train team on ADK testing

2. **Short Term** (2-4 weeks):
   - Complete migration of existing tests
   - Achieve 80% coverage of critical paths
   - Implement automated reporting

3. **Long Term** (2-3 months):
   - Full test coverage for all agents
   - Performance benchmarking suite
   - Production feedback loop

## Appendix: Tool Trajectory Evaluation Methods

### Exact Match
```python
expected = ["tool1", "tool2", "tool3"]
actual = ["tool1", "tool2", "tool3"]
# Score: 1.0 (perfect match)
```

### In-Order Match
```python
expected = ["tool1", "tool2"]
actual = ["tool1", "extra_tool", "tool2", "another_tool"]
# Score: 1.0 (expected tools in correct order)
```

### Any-Order Match
```python
expected = ["tool1", "tool2"]
actual = ["tool2", "tool1"]
# Score: 1.0 (all expected tools present)
```

### Precision/Recall
```python
expected = ["tool1", "tool2", "tool3"]
actual = ["tool1", "tool2", "tool4"]
# Precision: 2/3 = 0.67
# Recall: 2/3 = 0.67
```

---

*This evaluation plan follows Google ADK best practices and provides a foundation for comprehensive agent testing in VANA.*