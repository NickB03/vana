# VANA End-to-End Testing Guide

This guide provides information on how to use the VANA end-to-end testing framework to test the entire VANA system from a user's perspective.

## Overview

The VANA end-to-end testing framework is designed to test the entire VANA system, including:

- Agent interactions
- Memory operations
- Knowledge retrieval
- System health
- Task execution

The framework provides a structured way to define test scenarios, execute them, and report results.

## Directory Structure

- `tests/e2e/framework/`: Core testing framework components
  - `test_runner.py`: Main test runner for executing test scenarios
  - `test_case.py`: Base class for test cases
  - `agent_client.py`: Client for interacting with VANA agents
- `tests/e2e/scenarios/`: Test scenarios
  - `basic_conversation.py`: Basic conversation test scenario
  - `memory_retrieval.py`: Memory retrieval test scenario
- `tests/e2e/config/`: Configuration files
  - `test_config.json`: Main test configuration file
- `tests/e2e/data/`: Test data files
- `tests/e2e/logs/`: Test logs
- `tests/e2e/results/`: Test results

## Running Tests

### Using the Script

The easiest way to run the tests is using the provided script:

```bash
./run_e2e_tests.sh
```

This script will:
1. Set up a virtual environment if it doesn't exist
2. Install the required dependencies
3. Run the test runner with the default configuration

### Command Line Options

You can pass additional options to the test runner:

```bash
./run_e2e_tests.sh --config path/to/config.json --output path/to/results.json
```

Or run the test runner directly:

```bash
python -m tests.e2e.framework.test_runner --config path/to/config.json --output path/to/results.json
```

### Configuration

The test configuration file (`tests/e2e/config/test_config.json`) supports the following options:

- `test_scenarios_path`: Path to the test scenarios directory
- `test_data_path`: Path to the test data directory
- `timeout`: Default timeout for test operations in seconds
- `retry_count`: Number of times to retry failed operations
- `retry_delay`: Delay between retries in seconds
- `parallel`: Whether to run test scenarios in parallel
- `scenarios`: List of test scenarios to run (if empty, all scenarios will be run)
- `agent_config`: Configuration for the agent client
  - `base_url`: Base URL for the agent API
  - `timeout`: Timeout for API requests in seconds

## Creating Test Scenarios

### Basic Structure

A test scenario consists of a test case class that extends `TestCase` and implements the following methods:

- `setup()`: Set up the test case
- `_run()`: Run the test case
- `teardown()`: Clean up after the test case

The test case class should also export the following functions:

- `setup()`: Set up the test scenario
- `run()`: Run the test scenario
- `teardown()`: Clean up after the test scenario

### Example

Here's a simple example of a test scenario:

```python
from tests.e2e.framework.test_case import TestCase
from tests.e2e.framework.agent_client import AgentClient

class MyTestCase(TestCase):
    def __init__(self):
        super().__init__(
            name="my_test",
            description="My test scenario"
        )
        self.agent_client = None
        self.session_id = None

    def setup(self):
        self.agent_client = AgentClient()
        self.session_id = self.agent_client.create_session()

    def _run(self):
        # Step 1: Send a message to the agent
        self.step("step1", "Send a message to the agent")
        response = self.execute_step(
            self.agent_client.send_message,
            "vana",
            "Hello, how are you?",
            self.session_id
        )

        # Wait for the agent's response
        agent_response = self.agent_client.wait_for_agent_response("vana", self.session_id)
        self.assert_true(agent_response is not None, "Agent did not respond")

    def teardown(self):
        if self.session_id:
            self.agent_client.end_session(self.session_id)

# Create an instance of the test case
test_case = MyTestCase()

def setup():
    test_case.setup()

def run():
    return test_case.run()

def teardown():
    test_case.teardown()
```

### Test Steps

Test steps are defined using the `step()` method and executed using the `execute_step()` method:

```python
self.step("step_name", "Step description")
result = self.execute_step(function, arg1, arg2, kwarg1=value1)
```

### Assertions

The `TestCase` class provides several assertion methods:

- `assert_true(condition, message=None)`: Assert that a condition is true
- `assert_false(condition, message=None)`: Assert that a condition is false
- `assert_equal(expected, actual, message=None)`: Assert that two values are equal
- `assert_not_equal(expected, actual, message=None)`: Assert that two values are not equal
- `assert_in(item, container, message=None)`: Assert that an item is in a container
- `assert_not_in(item, container, message=None)`: Assert that an item is not in a container

### Agent Client

The `AgentClient` class provides methods for interacting with VANA agents:

- `send_message(agent_id, message, session_id=None)`: Send a message to an agent
- `get_agent_status(agent_id)`: Get the status of an agent
- `get_conversation_history(session_id)`: Get the conversation history for a session
- `create_session()`: Create a new session
- `end_session(session_id)`: End a session
- `wait_for_agent_response(agent_id, session_id, timeout=60, poll_interval=1)`: Wait for an agent to respond
- `simulate_conversation(agent_id, messages, session_id=None, wait_for_response=True)`: Simulate a conversation with an agent

## Test Results

Test results are saved as JSON files in the `tests/e2e/results` directory. Each result file contains:

- Overall test run statistics (passed, failed, skipped, total)
- Timing information (start time, end time, duration)
- Detailed results for each test scenario
  - Test name and description
  - Test status (passed, failed, skipped)
  - Error message (if failed)
  - Detailed step information
    - Step name and description
    - Step status (passed, failed, skipped)
    - Timing information
    - Error message (if failed)

## Best Practices

- **Keep tests independent**: Each test should be independent of other tests
- **Clean up after tests**: Always clean up resources in the `teardown()` method
- **Use descriptive names**: Use descriptive names for test cases and steps
- **Handle timeouts**: Set appropriate timeouts for operations that may take time
- **Add assertions**: Add assertions to verify expected behavior
- **Log important information**: Log important information for debugging
- **Use test data**: Use test data files for complex test scenarios
