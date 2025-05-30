# VANA Testing Framework

This directory contains scripts for automated testing of the VANA agent system.

## Overview

The testing framework allows Juno (the Test Specialist agent) to act as a human tester, asking questions to Vana and analyzing the responses. This provides a more automated approach to testing the system's capabilities.

The framework offers three testing modes:
1. **Structured Testing**: Run predefined test cases with expected results
2. **Autonomous Testing**: Let Juno decide what to test and how to test it
3. **Interactive Testing**: Manually ask questions to Vana

## Components

1. **test_vana_agent.py**: A direct test runner that sends questions to Vana and analyzes responses
2. **juno_test_agent.py**: An agent-based test runner where Juno executes predefined test cases
3. **juno_autonomous_tester.py**: A fully autonomous Juno agent that designs and executes tests
4. **vana_test_cases.json**: A collection of predefined test cases with expected results
5. **run_vana_tests.sh**: A bash script to easily run the tests in any mode

## Test Cases

Test cases are defined in `vana_test_cases.json` and include:

- **TC001**: Basic Agent Interaction Test
- **TC002**: Knowledge Retrieval Test - Vector Search
- **TC003**: Knowledge Retrieval Test - Knowledge Graph
- **TC004**: Knowledge Retrieval Test - Web Search
- **TC005**: Hybrid Search Test
- **TC006**: Document Processing Test
- **TC007**: Agent Capabilities Test
- **TC008**: Technical Implementation Test
- **TC009**: Project Goals Test
- **TC010**: Error Handling Test

Each test case includes:
- A unique ID
- A description
- A question to ask Vana
- Expected keywords that should appear in the response
- Expected sources that should be cited

## Running Tests

### Using the Bash Script

```bash
# Run predefined test cases
./scripts/run_vana_tests.sh

# Run in autonomous mode (Juno decides what to test)
./scripts/run_vana_tests.sh --autonomous

# Run in autonomous mode with a specific number of tests
./scripts/run_vana_tests.sh --autonomous --max-tests 15

# Run in autonomous mode while ignoring previous test results
./scripts/run_vana_tests.sh --autonomous --ignore-previous

# Run in autonomous mode with a specific previous results directory
./scripts/run_vana_tests.sh --autonomous --previous-results path/to/previous/results

# Run in autonomous mode with a specific output directory
./scripts/run_vana_tests.sh --autonomous --output-dir path/to/output

# Run a single test from predefined test cases
./scripts/run_vana_tests.sh --single-test TC002

# Run in interactive mode
./scripts/run_vana_tests.sh --interactive

# Specify custom test cases file
./scripts/run_vana_tests.sh --test-cases path/to/custom_tests.json

# Specify custom output file
./scripts/run_vana_tests.sh --output path/to/output.json
```

### Using Python Directly

```bash
# Run all predefined tests with Juno as the tester
python scripts/juno_test_agent.py --test-cases scripts/vana_test_cases.json

# Run Juno in autonomous testing mode
python scripts/juno_autonomous_tester.py --max-tests 10

# Run a single test with Juno
python scripts/juno_test_agent.py --test-cases scripts/vana_test_cases.json --single-test TC002

# Run in interactive mode
python scripts/test_vana_agent.py --interactive
```

## Test Reports

Test reports are generated in JSON format and include:

- Summary statistics (total tests, passed, failed, errors, pass rate)
- Detailed results for each test case
- Juno's analysis of Vana's performance

Reports are saved to the `test_results` directory with a timestamp in the filename.

## Creating Custom Test Cases

You can create custom test cases by following the format in `vana_test_cases.json`:

```json
{
  "id": "TC011",
  "description": "Custom Test Case",
  "question": "Your question here",
  "expected_keywords": ["keyword1", "keyword2"],
  "expected_sources": ["source1", "source2"]
}
```

## Testing Modes

### 1. Structured Testing

This mode uses predefined test cases from `vana_test_cases.json`. Each test case specifies:
- A question to ask Vana
- Expected keywords in the response
- Expected sources to be cited

Juno executes these tests and evaluates Vana's responses against the predefined criteria.

### 2. Autonomous Testing

In this mode, Juno has complete autonomy to:
- Decide what aspects of Vana to test
- Generate appropriate test questions
- Analyze responses and determine next steps
- Adapt the testing strategy based on previous results

Juno will test all of Vana's capabilities, including Vector Search, Knowledge Graph, Web Search, Hybrid Search, and Document Processing.

#### Learning from Previous Test Results

A key feature of autonomous testing is Juno's ability to access and learn from previous test results:

- Juno automatically loads and analyzes results from previous test runs
- Test strategies are adapted based on identified weaknesses or gaps
- Juno can focus on areas that previously showed issues
- Progress and improvements can be tracked across multiple test sessions

This creates a continuous improvement cycle where each test session builds on the knowledge from previous sessions.

### 3. Interactive Testing

This mode allows you to manually ask questions to Vana and see the responses. It's useful for exploratory testing and debugging.

## Extending the Framework

The testing framework can be extended in several ways:

1. **Add more test cases**: Create additional test cases in the JSON file
2. **Enhance Juno's autonomous testing**: Modify the autonomous tester to test more aspects of Vana
3. **Add more analysis criteria**: Modify the analysis logic in the test runners
4. **Add more test types**: Implement new types of tests beyond simple Q&A
5. **Integrate with CI/CD**: Run tests automatically as part of a CI/CD pipeline
6. **Add performance metrics**: Track response times and other performance indicators
