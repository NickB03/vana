#!/usr/bin/env python3
"""
VANA directory structure validator.
Prevents the recurring directory conflicts that break agent discovery.

This script validates the VANA project's critical directory structure requirements
based on the documented issues in the memory bank:
- Prevents /agent/ vs /agents/ conflicts
- Ensures proper ADK agent structure
- Validates Poetry usage over pip
- Checks for forbidden directory patterns
"""
import sys
from pathlib import Path


def check_directory_structure() -> int:
    """Validate VANA directory structure against known problematic patterns."""
    errors = []
    warnings = []
    project_root = Path.cwd()

    print("🔍 Checking VANA directory structure...")

    # 1. Check for forbidden directories that cause conflicts
    forbidden_dirs = [
        (
            "agent",
            'Should be "agents" - /agent/ vs /agents/ conflict documented in memory bank',
        ),
        ("vana_multi_agent", "Wrong structure - creates import conflicts"),
        ("adk_agents", "Old structure - should use /agents/"),
        ("vana_agent", "Incorrect naming - should be /agents/vana/"),
    ]

    for forbidden, reason in forbidden_dirs:
        forbidden_path = project_root / forbidden
        if forbidden_path.exists():
            errors.append(f"❌ Forbidden directory found: /{forbidden}/")
            errors.append(f"   Reason: {reason}")
            if forbidden == "agent":
                errors.append(
                    "   CRITICAL: This exact conflict has broken VANA deployments"
                )

    # 2. Check for required VANA directories
    required_dirs = [
        ("agents/vana", "Main VANA agent directory"),
        ("lib/_tools", "ADK tools directory"),
        ("deployment", "Cloud Run deployment configs"),
        ("memory-bank", "Project documentation and context"),
    ]

    for required, description in required_dirs:
        required_path = project_root / required
        if not required_path.exists():
            errors.append(f"❌ Required directory missing: /{required}/")
            errors.append(f"   Purpose: {description}")

    # 3. Validate agent structure specifically
    agents_dir = project_root / "agents"
    if agents_dir.exists():
        agent_subdirs = [d for d in agents_dir.iterdir() if d.is_dir()]

        # Check for single agent structure (VANA requirement)
        if len(agent_subdirs) == 0:
            errors.append("❌ No agent found in /agents/ directory")
        elif len(agent_subdirs) > 1:
            agent_names = [d.name for d in agent_subdirs]
            warnings.append(f"⚠️  Multiple agents found: {agent_names}")
            warnings.append("   VANA typically uses single agent structure")
        elif agent_subdirs[0].name != "vana":
            errors.append(
                f"❌ Agent directory should be 'vana', found: {agent_subdirs[0].name}"
            )

        # Check for required agent files
        vana_dir = agents_dir / "vana"
        if vana_dir.exists():
            required_agent_files = ["__init__.py", "agent.py", "team.py"]
            for req_file in required_agent_files:
                if not (vana_dir / req_file).exists():
                    errors.append(f"❌ Missing agent file: /agents/vana/{req_file}")

    # 4. Check for Poetry vs pip usage (critical VANA requirement)
    pyproject_path = project_root / "pyproject.toml"
    requirements_path = project_root / "requirements.txt"

    if not pyproject_path.exists():
        errors.append("❌ Missing pyproject.toml - Poetry required for VANA")
        errors.append("   VANA has documented pip vs Poetry conflicts")

    if requirements_path.exists():
        warnings.append("⚠️  requirements.txt found - VANA uses Poetry (pyproject.toml)")
        warnings.append("   Consider removing requirements.txt to avoid confusion")

    # 5. Check for proper tool structure
    tools_dir = project_root / "lib" / "_tools"
    if tools_dir.exists():
        expected_tool_files = [
            "adk_tools.py",
            "adk_long_running_tools.py",
            "agent_tools.py",
            "adk_mcp_tools.py",
        ]

        missing_tools = []
        for tool_file in expected_tool_files:
            if not (tools_dir / tool_file).exists():
                missing_tools.append(tool_file)

        if missing_tools:
            warnings.append(f"⚠️  Missing tool files: {missing_tools}")

    # 6. Check for deployment structure
    deployment_dir = project_root / "deployment"
    if deployment_dir.exists():
        expected_deployment_files = ["Dockerfile", "cloudbuild.yaml", "deploy.sh"]
        missing_deployment = []

        for dep_file in expected_deployment_files:
            if not (deployment_dir / dep_file).exists():
                missing_deployment.append(dep_file)

        if missing_deployment:
            warnings.append(f"⚠️  Missing deployment files: {missing_deployment}")

    # 7. Check for environment configuration
    env_files = [".env.local", ".env.production", "lib/environment.py"]
    missing_env = []

    for env_file in env_files:
        if not (project_root / env_file).exists():
            missing_env.append(env_file)

    if missing_env:
        warnings.append(f"⚠️  Missing environment files: {missing_env}")
        warnings.append("   VANA requires smart environment detection")

    # 8. Check for test structure
    tests_dir = project_root / "tests"
    if tests_dir.exists():
        if not (tests_dir / "automated").exists():
            warnings.append("⚠️  Missing /tests/automated/ directory")
            warnings.append("   VANA uses automated testing framework")

    # Print results
    if errors:
        print("\n🚨 VANA DIRECTORY STRUCTURE VIOLATIONS:")
        for error in errors:
            print(f"  {error}")

        print("\n💡 FIXES:")
        print("  1. Follow VANA directory conventions documented in memory bank")
        print("  2. Remove conflicting directories (backup first if needed)")
        print("  3. Use Poetry instead of pip for dependency management")
        print("  4. Ensure proper ADK agent structure in /agents/vana/")

        return 1

    if warnings:
        print("\n⚠️  VANA DIRECTORY STRUCTURE WARNINGS:")
        for warning in warnings:
            print(f"  {warning}")

    if not errors and not warnings:
        print("✅ VANA directory structure is correct")
    elif not errors:
        print("✅ VANA directory structure is valid (with warnings)")

    return 0


def main():
    """Main entry point."""
    return check_directory_structure()


if __name__ == "__main__":
    sys.exit(main())
