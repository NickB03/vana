# VANA End-to-End Testing Framework

This directory contains the end-to-end testing framework for the VANA system. The framework provides a structured way to test the entire VANA system from a user's perspective.

## Directory Structure

- `framework/`: Core testing framework components
  - `test_runner.py`: Main test runner for executing test scenarios
  - `test_case.py`: Base class for test cases
  - `agent_client.py`: Client for interacting with VANA agents
- `scenarios/`: Test scenarios
  - `basic_conversation.py`: Basic conversation test scenario
  - `memory_retrieval.py`: Memory retrieval test scenario
- `config/`: Configuration files
  - `test_config.json`: Main test configuration file
- `data/`: Test data files
- `logs/`: Test logs
- `results/`: Test results

## Usage

To run all test scenarios:

```bash
python -m tests.e2e.framework.test_runner
```

To run with a specific configuration file:

```bash
python -m tests.e2e.framework.test_runner --config path/to/config.json
```

To save results to a specific file:

```bash
python -m tests.e2e.framework.test_runner --output path/to/results.json
```

## Creating Test Scenarios

To create a new test scenario:

1. Create a new Python file in the `scenarios` directory
2. Implement a test case class that extends `TestCase`
3. Implement the `setup()`, `_run()`, and `teardown()` methods
4. Export `setup()`, `run()`, and `teardown()` functions

Example:

```python
from tests.e2e.framework.test_case import TestCase

class MyTestCase(TestCase):
    def __init__(self):
        super().__init__(
            name="my_test",
            description="My test scenario"
        )

    def setup(self):
        # Set up the test case
        pass

    def _run(self):
        # Run the test case
        self.step("step1", "Step 1 description")
        self.execute_step(self.some_function)

        self.step("step2", "Step 2 description")
        self.execute_step(self.some_other_function)

    def teardown(self):
        # Clean up after the test case
        pass

# Create an instance of the test case
test_case = MyTestCase()

def setup():
    test_case.setup()

def run():
    return test_case.run()

def teardown():
    test_case.teardown()
```

## Configuration

The test configuration file (`test_config.json`) supports the following options:

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

## Test Results

Test results are saved as JSON files in the `results` directory. Each result file contains:

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
