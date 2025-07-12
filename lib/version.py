"""
VANA Version Management
Provides version tracking for deployments and runtime information
"""

import json
import os
import subprocess
from datetime import datetime
from typing import Any, Dict, Optional


def get_git_commit_info() -> Dict[str, str]:
    """Get current git commit information"""
    try:
        # Get current commit hash
        commit_hash = (
            subprocess.check_output(["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL).decode("utf-8").strip()
        )

        # Get current branch
        branch = (
            subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], stderr=subprocess.DEVNULL)
            .decode("utf-8")
            .strip()
        )

        # Get commit message
        commit_message = (
            subprocess.check_output(["git", "log", "-1", "--pretty=%B"], stderr=subprocess.DEVNULL)
            .decode("utf-8")
            .strip()
        )

        # Get commit timestamp
        commit_timestamp = (
            subprocess.check_output(["git", "log", "-1", "--pretty=%cI"], stderr=subprocess.DEVNULL)
            .decode("utf-8")
            .strip()
        )

        return {
            "commit_hash": commit_hash,
            "commit_short": commit_hash[:8],
            "branch": branch,
            "commit_message": commit_message,
            "commit_timestamp": commit_timestamp,
        }
    except (subprocess.CalledProcessError, FileNotFoundError):
        return {
            "commit_hash": "unknown",
            "commit_short": "unknown",
            "branch": "unknown",
            "commit_message": "Git information not available",
            "commit_timestamp": "unknown",
        }


def get_build_info() -> Dict[str, Any]:
    """Get build information from environment or defaults"""
    return {
        "build_id": os.environ.get("BUILD_ID", "local"),
        "build_number": os.environ.get("BUILD_NUMBER", "0"),
        "build_timestamp": os.environ.get("BUILD_TIMESTAMP", datetime.now().isoformat()),
        "builder": os.environ.get("BUILDER", "local"),
        "project_id": os.environ.get("GOOGLE_CLOUD_PROJECT", "unknown"),
        "region": os.environ.get("GOOGLE_CLOUD_REGION", "unknown"),
        "environment": os.environ.get("ENVIRONMENT", "development"),
    }


def get_version_info() -> Dict[str, Any]:
    """Get comprehensive version information"""
    git_info = get_git_commit_info()
    build_info = get_build_info()

    # Generate semantic version from git info
    base_version = "1.0.0"
    if git_info["commit_short"] != "unknown":
        version = f"{base_version}-{git_info['commit_short']}"
    else:
        version = f"{base_version}-local"

    return {
        "version": version,
        "base_version": base_version,
        "git": git_info,
        "build": build_info,
        "deployment": {
            "timestamp": datetime.now().isoformat(),
            "environment": build_info["environment"],
            "region": build_info["region"],
        },
    }


def save_version_manifest(file_path: str = "/tmp/version_manifest.json") -> None:
    """Save version information to a manifest file"""
    try:
        version_info = get_version_info()
        with open(file_path, "w") as f:
            json.dump(version_info, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save version manifest: {e}")


def load_version_manifest(
    file_path: str = "/tmp/version_manifest.json",
) -> Optional[Dict[str, Any]]:
    """Load version information from manifest file"""
    try:
        with open(file_path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def get_runtime_version_info() -> Dict[str, Any]:
    """Get version info for runtime (prefers manifest, falls back to live detection)"""
    # Try to load from saved manifest first (for deployed environments)
    manifest_info = load_version_manifest()
    if manifest_info:
        return manifest_info

    # Fall back to live detection (for development)
    return get_version_info()


# Pre-generate version info at module import for efficiency
_VERSION_INFO = get_version_info()

# Export commonly used values
VERSION = _VERSION_INFO["version"]
BUILD_ID = _VERSION_INFO["build"]["build_id"]
COMMIT_HASH = _VERSION_INFO["git"]["commit_hash"]
COMMIT_SHORT = _VERSION_INFO["git"]["commit_short"]
ENVIRONMENT = _VERSION_INFO["build"]["environment"]


def get_version_summary() -> str:
    """Get a concise version summary string"""
    info = get_runtime_version_info()
    return f"VANA {info['version']} (build {info['build']['build_id']}) on {info['build']['environment']}"


if __name__ == "__main__":
    # CLI usage: python -m lib.version
    info = get_version_info()
    print(json.dumps(info, indent=2))
