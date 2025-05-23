# Vector Search Environment Configuration

[Home](../../index.md) > [Implementation](../index.md) > Vector Search Environment Configuration

This document details the environment configuration for Vector Search components in VANA, including required environment variables, configuration templates, and setup procedures.

## 1. Overview

Vector Search in VANA relies on several environment variables to configure its behavior, including connection to Vertex AI Vector Search, fallback mechanisms, health checking, and performance monitoring. This document provides a comprehensive guide to these configuration options.

## 2. Environment Variables

### 2.1. Vector Search Connection

These variables are required for connecting to Vertex AI Vector Search:

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID | `analystai-454200` |
| `GOOGLE_CLOUD_LOCATION` | Google Cloud location | `us-central1` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key file | `./secrets/service-account-key.json` |
| `VECTOR_SEARCH_ENDPOINT_ID` | Vertex AI Vector Search endpoint ID | `5085685481161621504` |
| `VECTOR_SEARCH_ENDPOINT_NAME` | Full resource name for the endpoint | `projects/960076421399/locations/us-central1/indexEndpoints/5085685481161621504` |
| `VECTOR_SEARCH_INDEX_ID` | Vector Search index ID | `vana-index` |
| `VECTOR_SEARCH_DEPLOYMENT_ID` | Vector Search deployment ID | `vana-deployment` |
| `VECTOR_SEARCH_CORPUS_NAME` | Vector Search corpus name | `vana-corpus` |
| `VECTOR_SEARCH_NAMESPACE` | Vector Search namespace | `default` |

### 2.2. Vector Search Client Configuration

These variables control the behavior of the Vector Search client:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VECTOR_SEARCH_AUTO_FALLBACK` | Enable auto-fallback to mock implementation | `true` | `true` or `false` |
| `VECTOR_SEARCH_USE_MOCK` | Use mock implementation instead of real service | `false` | `true` or `false` |
| `VECTOR_SEARCH_MAX_RETRIES` | Number of retries for Vector Search operations | `3` | `5` |
| `VECTOR_SEARCH_TIMEOUT` | Timeout for Vector Search operations (in seconds) | `10` | `15` |

### 2.3. Vector Search Health Checker Configuration

These variables configure the Vector Search health checker:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `VECTOR_SEARCH_HEALTH_CHECK_INTERVAL` | Health check interval (in seconds) | `300` | `600` |
| `VECTOR_SEARCH_HEALTH_HISTORY_SIZE` | Health check history size | `100` | `50` |
| `VECTOR_SEARCH_HEALTH_REPORT_PATH` | Health check report path | `./data/vector_search_health_report.json` | `./logs/health_reports/vector_search.json` |

### 2.4. Circuit Breaker Configuration

These variables configure the circuit breaker pattern for Vector Search:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | Failure threshold for circuit breaker | `5` | `3` |
| `CIRCUIT_BREAKER_RECOVERY_TIMEOUT` | Recovery timeout for circuit breaker (in seconds) | `60` | `30` |

### 2.5. Performance Configuration

These variables configure performance tracking for Vector Search:

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `ENABLE_PERFORMANCE_TRACKING` | Enable performance tracking | `true` | `true` or `false` |
| `PERFORMANCE_LOG_PATH` | Performance log path | `./data/performance_logs.json` | `./logs/performance/vector_search.json` |

## 3. Configuration Templates

VANA provides configuration templates for different environments in the `config/templates/` directory:

### 3.1. Demo Environment (`.env.demo`)

The demo environment template (`config/templates/.env.demo`) contains placeholder values for demonstration purposes. It's designed to be used for quick setup and testing without requiring real Google Cloud credentials.

Key features:
- Placeholder values for Google Cloud and Vector Search configuration
- Auto-fallback enabled to use mock implementation when real service is unavailable
- Detailed logging enabled for debugging

### 3.2. Development Environment (`.env.development`)

The development environment template (`config/templates/.env.development`) contains sensible defaults for development environments. It's designed to be used by developers working on VANA.

Key features:
- Default values for Google Cloud and Vector Search configuration
- Auto-fallback enabled to allow working without real service
- Debug logging enabled
- Development-specific features enabled

## 4. Environment Setup Script

VANA includes a script to help set up the environment configuration: `scripts/configure_environment.sh`. This script:

1. Copies a template configuration file to `.env`
2. Allows customization of key values
3. Verifies the configuration for common issues

### 4.1. Usage

```bash
# Create a demo environment configuration
./scripts/configure_environment.sh --env demo

# Create a development environment configuration
./scripts/configure_environment.sh --env development

# Create a configuration with a custom output file
./scripts/configure_environment.sh --env development --output .env.local

# Force overwrite an existing configuration
./scripts/configure_environment.sh --env development --force

# Run in non-interactive mode (no prompts)
./scripts/configure_environment.sh --env development --non-interactive
```

### 4.2. Interactive Mode

In interactive mode, the script will prompt you to customize key configuration values:

- Google Cloud Project ID
- Google Cloud Location
- Path to service account key file
- Vector Search Endpoint ID

The script will also update related values automatically (e.g., updating the endpoint name when you change the project ID and endpoint ID).

## 5. Best Practices

### 5.1. Security

- Never commit `.env` files or service account keys to version control
- Store sensitive files in a `secrets/` directory that is git-ignored
- Use different service accounts for development and production

### 5.2. Configuration Management

- Start with a template configuration and customize it for your environment
- Document any custom environment variables you add
- Validate critical configuration values before using them

### 5.3. Testing

- Use the mock implementation for testing (`VECTOR_SEARCH_USE_MOCK=true`)
- Create a separate test environment configuration (`.env.test`)
- Run performance tests with `RUN_REAL_PERFORMANCE_TESTS=1` to include real service tests

## 6. Troubleshooting

### 6.1. Common Issues

- **Authentication Errors**: Check that `GOOGLE_APPLICATION_CREDENTIALS` points to a valid service account key file with the necessary permissions
- **Endpoint Not Found**: Verify that `VECTOR_SEARCH_ENDPOINT_ID` and `VECTOR_SEARCH_ENDPOINT_NAME` are correct
- **Timeout Errors**: Increase `VECTOR_SEARCH_TIMEOUT` if operations are taking too long

### 6.2. Validation

Use the `scripts/verify_vector_search_configuration.py` script to validate your Vector Search configuration:

```bash
python scripts/verify_vector_search_configuration.py
```

This script will check that all required environment variables are set and that the Vector Search service is accessible.
