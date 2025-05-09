# Vector Search Health Checker

The Vector Search Health Checker provides comprehensive health monitoring, metrics collection, and actionable recommendations for the Vector Search system in VANA.

## Overview

The health checker performs a series of tests to verify the proper functioning of the Vector Search integration, including:

- Environment variable configuration
- Authentication status
- Embedding generation
- Search functionality

Based on these checks, it provides:

- Overall health status
- Detailed metrics
- Historical trend analysis
- Actionable recommendations

## Usage

### Basic Usage

```python
from tools.vector_search.health_checker import VectorSearchHealthChecker

# Create health checker
checker = VectorSearchHealthChecker()

# Perform health check
result = checker.check_health()
print(f"Health status: {result['status']}")

# Get recommendations
recommendations = checker.get_recommendations(result)
for rec in recommendations:
    print(f"[{rec['priority']}] {rec['title']}: {rec['action']}")
```

### With Existing Client

```python
from tools.vector_search.vector_search_client import VectorSearchClient
from tools.vector_search.health_checker import VectorSearchHealthChecker

# Create client
client = VectorSearchClient()

# Create health checker with existing client
checker = VectorSearchHealthChecker(vector_search_client=client)
```

### Generate and Save Report

```python
# Generate report
report = checker.generate_report()

# Save report to file
checker.save_report_to_file("vector_search_health_report.json")
```

## Command-Line Tool

The health checker comes with a command-line tool for easy testing and monitoring:

```bash
python scripts/test_vector_search_health.py --mode basic --verbose
```

### Command-Line Options

- `--mode`: Test mode (`basic`, `detailed`, or `monitor`)
- `--verbose`: Enable detailed output
- `--report-file`: Path to save the health report
- `--interval`: Interval between checks in monitor mode (seconds)
- `--count`: Number of checks to perform in monitor mode
- `--client`: Vector Search client to use (`auto`, `basic`, `enhanced`, or `mock`)
- `--output-format`: Output format (`text` or `json`)

### Examples

Basic health check:
```bash
python scripts/test_vector_search_health.py
```

Detailed health check with verbose output:
```bash
python scripts/test_vector_search_health.py --mode detailed --verbose
```

Continuous monitoring:
```bash
python scripts/test_vector_search_health.py --mode monitor --interval 60 --count 0
```

## Health Check Results

The health check results include:

- `status`: Overall health status (`ok`, `warn`, `error`, or `critical`)
- `checks`: Individual check results
- `metrics`: Performance metrics
- `issues`: List of detected issues

### Example Result

```json
{
  "timestamp": "2023-05-15T12:34:56.789012",
  "status": "warn",
  "checks": {
    "environment": {
      "status": "ok",
      "details": {
        "missing_vars": []
      }
    },
    "authentication": {
      "status": "ok",
      "details": {
        "has_token": true
      }
    },
    "embedding": {
      "status": "ok",
      "details": {
        "dimensions": 768,
        "response_time": 0.456,
        "is_mock": false
      }
    },
    "search": {
      "status": "warn",
      "details": {
        "result_count": 0,
        "response_time": 0.123,
        "message": "No search results returned - this may be expected if the index is empty"
      }
    }
  },
  "metrics": {
    "response_time": 0.789,
    "success_rate": 75.0
  }
}
```

## Recommendations

The health checker provides actionable recommendations based on the health check results. Each recommendation includes:

- `priority`: Priority level (`high`, `medium`, or `low`)
- `category`: Category of the recommendation
- `title`: Short title describing the issue
- `action`: Detailed action to resolve the issue

### Example Recommendations

```json
[
  {
    "priority": "high",
    "category": "authentication",
    "title": "Authentication issues with Vector Search",
    "action": "Verify that GOOGLE_APPLICATION_CREDENTIALS points to a valid service account key file with appropriate permissions."
  },
  {
    "priority": "medium",
    "category": "data",
    "title": "No search results",
    "action": "Verify that your Vector Search index contains data. You may need to upload content first."
  }
]
```

## Integration with Monitoring Systems

The health checker can be integrated with monitoring systems by:

1. Running the health checker on a schedule
2. Saving reports to a designated location
3. Generating alerts based on health status
4. Visualizing metrics and trends

## Troubleshooting

If the health checker reports issues, follow these steps:

1. Check the recommendations provided by the health checker
2. Verify environment variables are correctly set
3. Ensure the service account has appropriate permissions
4. Check that the Vector Search endpoint and deployed index exist
5. Verify that the index contains data

For more detailed troubleshooting, run the health checker in verbose mode:

```bash
python scripts/test_vector_search_health.py --verbose
```
