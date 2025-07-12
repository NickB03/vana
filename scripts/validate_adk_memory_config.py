#!/usr/bin/env python3
"""
ADK Memory Configuration Validation Script

This script validates the ADK memory configuration and provides migration status.
Use this script to verify your configuration after migrating from MCP to ADK memory.

Usage:
    python scripts/validate_adk_memory_config.py
    python scripts/validate_adk_memory_config.py --detailed
    python scripts/validate_adk_memory_config.py --fix-permissions
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv

from config.environment import EnvironmentConfig
from lib.logging_config import get_logger

logger = get_logger("vana.validate_adk_memory_config")


def print_header(title):
    """Print a formatted header"""
    logger.info("%s", f"\n{'=' * 60}")
    logger.info(f" {title}")
    logger.info("%s", f"{'=' * 60}")


def print_section(title):
    """Print a formatted section header"""
    logger.info("%s", f"\n{'-' * 40}")
    logger.info(f" {title}")
    logger.info("%s", f"{'-' * 40}")


def print_status(status, message):
    """Print a status message with color coding"""
    if status == "success":
        logger.info(f"✅ {message}")
    elif status == "warning":
        logger.info(f"⚠️  {message}")
    elif status == "error":
        logger.info(f"❌ {message}")
    else:
        logger.info(f"ℹ️  {message}")


def validate_environment_file():
    """Validate that environment file exists and is readable"""
    env_files = [".env", ".env.local", ".env.development"]
    found_env = False

    print_section("Environment File Validation")

    for env_file in env_files:
        if os.path.exists(env_file):
            print_status("success", f"Found environment file: {env_file}")
            found_env = True

            # Check file permissions
            if os.access(env_file, os.R_OK):
                print_status("success", f"Environment file is readable: {env_file}")
            else:
                print_status("error", f"Environment file is not readable: {env_file}")
                return False
        else:
            print_status("info", f"Environment file not found: {env_file}")

    if not found_env:
        print_status(
            "warning",
            "No environment file found. Using system environment variables only.",
        )

    return True


def validate_google_cloud_setup():
    """Validate Google Cloud configuration"""
    print_section("Google Cloud Configuration")

    # Check required GCP variables
    gcp_vars = {
        "GOOGLE_CLOUD_PROJECT": "Google Cloud Project ID",
        "GOOGLE_CLOUD_LOCATION": "Google Cloud Location",
        "GOOGLE_APPLICATION_CREDENTIALS": "Service Account Credentials Path",
    }

    all_valid = True
    for var, description in gcp_vars.items():
        value = os.environ.get(var)
        if value:
            print_status("success", f"{description}: {value}")

            # Special validation for credentials file
            if var == "GOOGLE_APPLICATION_CREDENTIALS":
                if os.path.exists(value):
                    print_status("success", f"Credentials file exists: {value}")
                else:
                    print_status("error", f"Credentials file not found: {value}")
                    all_valid = False
        else:
            print_status("error", f"Missing {description} ({var})")
            all_valid = False

    return all_valid


def validate_adk_memory_configuration():
    """Validate ADK memory configuration"""
    print_section("ADK Memory Configuration Validation")

    try:
        validation_results = EnvironmentConfig.validate_adk_memory_config()

        if validation_results["valid"]:
            print_status("success", "ADK Memory configuration is valid")
        else:
            print_status("error", "ADK Memory configuration has errors")

        # Print configuration details
        config = validation_results.get("config", {})
        if config:
            logger.info("\nConfiguration Details:")
            for key, value in config.items():
                logger.info(f"  {key}: {value}")

        # Print errors
        errors = validation_results.get("errors", [])
        if errors:
            logger.error("\nConfiguration Errors:")
            for error in errors:
                print_status("error", error)

        # Print warnings
        warnings = validation_results.get("warnings", [])
        if warnings:
            logger.warning("\nConfiguration Warnings:")
            for warning in warnings:
                print_status("warning", warning)

        return validation_results["valid"]

    except Exception as e:
        print_status("error", f"Failed to validate ADK memory configuration: {e}")
        return False


def check_migration_status():
    """Check migration status from MCP to ADK"""
    print_section("Migration Status")

    try:
        status = EnvironmentConfig.get_migration_status()

        phase = status.get("migration_phase", "unknown")
        logger.info(f"Migration Phase: {phase.upper()}")

        if phase == "complete":
            print_status("success", "Migration to ADK memory is complete")
        elif phase == "in_progress":
            print_status("warning", "Migration to ADK memory is in progress")
        else:
            print_status("info", "Migration to ADK memory is in planning phase")

        # Print status details
        logger.info("\nStatus Details:")
        logger.info(
            "%s",
            f"  ADK Memory Configured: {'✅' if status.get('adk_memory_configured') else '❌'}",
        )
        logger.info(
            "%s",
            f"  MCP Variables Present: {'⚠️' if status.get('mcp_variables_present') else '✅'}",
        )
        logger.info(
            "%s",
            f"  Configuration Valid: {'✅' if status.get('configuration_valid') else '❌'}",
        )

        # Print recommendations
        recommendations = status.get("recommendations", [])
        if recommendations:
            logger.info("\nRecommendations:")
            for rec in recommendations:
                print_status("info", rec)

        return status

    except Exception as e:
        print_status("error", f"Failed to check migration status: {e}")
        return None


def check_deprecated_variables():
    """Check for deprecated MCP variables"""
    print_section("Deprecated Variables Check")

    deprecated_vars = [
        "MCP_ENDPOINT",
        "MCP_NAMESPACE",
        "MCP_API_KEY",
        "USE_LOCAL_MCP",
        "KNOWLEDGE_GRAPH_API_KEY",
        "KNOWLEDGE_GRAPH_SERVER_URL",
        "KNOWLEDGE_GRAPH_NAMESPACE",
    ]

    found_deprecated = []
    for var in deprecated_vars:
        if os.environ.get(var):
            found_deprecated.append(var)
            print_status("warning", f"Deprecated variable found: {var}")

    if found_deprecated:
        print_status("warning", f"Found {len(found_deprecated)} deprecated variables")
        logger.warning("\nTo remove deprecated variables:")
        logger.info("1. Edit your .env file")
        logger.info("2. Remove or comment out the following lines:")
        for var in found_deprecated:
            logger.info(f"   # {var}=...")
    else:
        print_status("success", "No deprecated variables found")

    return len(found_deprecated) == 0


def test_configuration_loading():
    """Test configuration loading"""
    print_section("Configuration Loading Test")

    try:
        # Test ADK memory config
        EnvironmentConfig.get_adk_memory_config()
        print_status("success", "ADK memory configuration loaded successfully")

        # Test memory config
        EnvironmentConfig.get_memory_config()
        print_status("success", "Memory configuration loaded successfully")

        # Test vector search config
        EnvironmentConfig.get_vector_search_config()
        print_status("success", "Vector search configuration loaded successfully")

        # Test environment detection
        env = os.environ.get("VANA_ENV", "development")
        print_status("info", f"Detected environment: {env}")

        return True

    except Exception as e:
        print_status("error", f"Configuration loading failed: {e}")
        return False


def fix_file_permissions():
    """Fix file permissions for configuration files"""
    print_section("File Permissions Fix")

    files_to_fix = [".env", ".env.local", ".env.development"]

    for file_path in files_to_fix:
        if os.path.exists(file_path):
            try:
                # Set file permissions to 600 (read/write for owner only)
                os.chmod(file_path, 0o600)
                print_status("success", f"Fixed permissions for {file_path}")
            except Exception as e:
                print_status("error", f"Failed to fix permissions for {file_path}: {e}")


def generate_summary_report(results):
    """Generate a summary report"""
    print_header("VALIDATION SUMMARY")

    total_checks = len(results)
    passed_checks = sum(1 for result in results.values() if result)

    logger.info(f"Total Checks: {total_checks}")
    logger.info(f"Passed: {passed_checks}")
    logger.error(f"Failed: {total_checks - passed_checks}")
    logger.info(f"Success Rate: {(passed_checks / total_checks) * 100:.1f}%")

    if passed_checks == total_checks:
        print_status("success", "All validation checks passed!")
        logger.info("\n🎉 Your ADK memory configuration is ready for use!")
    else:
        print_status("warning", "Some validation checks failed")
        logger.error("\n📋 Please review the errors above and update your configuration")

    return passed_checks == total_checks


def main():
    """Main validation function"""
    parser = argparse.ArgumentParser(description="Validate ADK Memory Configuration")
    parser.add_argument("--detailed", action="store_true", help="Show detailed configuration")
    parser.add_argument("--fix-permissions", action="store_true", help="Fix file permissions")
    parser.add_argument("--json", action="store_true", help="Output results in JSON format")

    args = parser.parse_args()

    # Load environment variables
    load_dotenv()

    print_header("VANA ADK Memory Configuration Validation")
    logger.info("%s", f"Environment: {os.environ.get('VANA_ENV', 'development')}")
    logger.info(f"Project Root: {project_root}")

    # Fix permissions if requested
    if args.fix_permissions:
        fix_file_permissions()

    # Run validation checks
    results = {}

    results["environment_file"] = validate_environment_file()
    results["google_cloud"] = validate_google_cloud_setup()
    results["adk_memory"] = validate_adk_memory_configuration()
    results["migration_status"] = check_migration_status() is not None
    results["deprecated_vars"] = check_deprecated_variables()
    results["config_loading"] = test_configuration_loading()

    # Generate summary
    all_passed = generate_summary_report(results)

    # Output JSON if requested
    if args.json:
        json_output = {
            "validation_results": results,
            "all_passed": all_passed,
            "environment": os.environ.get("VANA_ENV", "development"),
            "timestamp": str(Path(__file__).stat().st_mtime),
        }
        logger.debug(f"\nJSON Output:\n{json.dumps(json_output, indent=2)}")

    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
