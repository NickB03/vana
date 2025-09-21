"""Environment variable migration utilities.

This module provides utilities to help migrate from ENVIRONMENT/ENV to NODE_ENV
while maintaining backwards compatibility and providing clear migration status.
"""

import logging
import os
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class MigrationPhase(Enum):
    """Enumeration of environment variable migration phases.

    Tracks the current state of migration from legacy environment variables
    (ENVIRONMENT/ENV) to the standardized NODE_ENV variable.

    Values:
        NOT_STARTED: Only legacy variables are set, NODE_ENV not present
        IN_PROGRESS: Both NODE_ENV and legacy variables exist with same values
        COMPLETED: Only NODE_ENV is set, legacy variables removed
        CONFLICTED: Variables exist with conflicting values requiring resolution
    """

    NOT_STARTED = "not_started"  # Using legacy variables only
    IN_PROGRESS = "in_progress"  # Using both NODE_ENV and legacy
    COMPLETED = "completed"  # Using NODE_ENV only
    CONFLICTED = "conflicted"  # Variables have different values


@dataclass
class MigrationStatus:
    """Comprehensive status information for environment variable migration.

    Contains detailed information about the current migration state including
    detected environment values, source analysis, conflict detection, and
    actionable recommendations for completing the migration.

    Attributes:
        current_env: The currently active environment value (normalized to lowercase)
        source: Which environment variable is being used (NODE_ENV, ENVIRONMENT, ENV, or default)
        phase: Current migration phase from MigrationPhase enum
        conflicts: List of detected conflicts between environment variables
        recommendations: List of suggested actions to complete migration
        migration_complete: Boolean indicating if migration is fully complete

    Example:
        >>> status = EnvironmentMigrationHelper.get_migration_status()
        >>> if status.phase == MigrationPhase.CONFLICTED:
        ...     print("Conflicts found:", status.conflicts)
        >>> if not status.migration_complete:
        ...     for rec in status.recommendations:
        ...         print("Action needed:", rec)
    """

    current_env: str
    source: str
    phase: MigrationPhase
    conflicts: list[str]
    recommendations: list[str]
    migration_complete: bool

    def to_dict(self) -> dict[str, any]:
        """Convert migration status to dictionary format for JSON serialization.

        Returns:
            Dictionary representation of the migration status with all fields
            serialized to JSON-compatible types. Enum values are converted to
            their string representations.

        Example:
            >>> status = EnvironmentMigrationHelper.get_migration_status()
            >>> json_data = status.to_dict()
            >>> import json
            >>> print(json.dumps(json_data, indent=2))
        """
        return {
            "current_env": self.current_env,
            "source": self.source,
            "phase": self.phase.value,
            "conflicts": self.conflicts,
            "recommendations": self.recommendations,
            "migration_complete": self.migration_complete,
        }


class EnvironmentMigrationHelper:
    """Comprehensive utility class for managing environment variable migration.

    Provides tools and utilities to safely migrate from legacy environment variables
    (ENVIRONMENT, ENV) to the standardized NODE_ENV variable while maintaining
    backward compatibility and providing clear migration guidance.

    Key Features:
        - Automatic conflict detection between environment variables
        - Phase-based migration tracking with detailed status reporting
        - Validation of environment values against standard options
        - Actionable recommendations for completing migration
        - Safe environment value retrieval with fallback logic
        - Comprehensive logging and monitoring capabilities

    Standard Environment Values:
        - development: Local development environment
        - testing: Automated testing environment
        - staging: Pre-production testing environment
        - production: Live production environment
        - local: Local development (alias for development)

    Example:
        >>> # Check current migration status
        >>> status = EnvironmentMigrationHelper.get_migration_status()
        >>> print(f"Current: {status.current_env} from {status.source}")
        >>>
        >>> # Validate and log status
        >>> if EnvironmentMigrationHelper.validate_migration():
        ...     print("Migration validation passed")
        >>>
        >>> # Get normalized environment value
        >>> env = EnvironmentMigrationHelper.get_normalized_environment()
        >>> print(f"Using environment: {env}")
    """

    # Standard environment values we expect
    VALID_ENVIRONMENTS = {"development", "testing", "staging", "production", "local"}

    @staticmethod
    def get_migration_status() -> MigrationStatus:
        """Analyze and return comprehensive migration status information.

        Performs complete analysis of current environment variable configuration,
        including conflict detection, phase determination, and recommendation
        generation for safe migration completion.

        Returns:
            MigrationStatus object containing:
                - Current active environment value and source
                - Migration phase assessment
                - List of any detected conflicts
                - Actionable recommendations for next steps
                - Boolean flag indicating if migration is complete

        Example:
            >>> status = EnvironmentMigrationHelper.get_migration_status()
            >>> print(f"Environment: {status.current_env}")
            >>> print(f"Source: {status.source}")
            >>> print(f"Phase: {status.phase.value}")
            >>> if status.conflicts:
            ...     print("Conflicts detected:")
            ...     for conflict in status.conflicts:
            ...         print(f"  - {conflict}")
            >>> if status.recommendations:
            ...     print("Recommended actions:")
            ...     for rec in status.recommendations:
            ...         print(f"  - {rec}")
        """
        node_env = os.environ.get("NODE_ENV")
        environment = os.environ.get("ENVIRONMENT")
        env = os.environ.get("ENV")

        # Determine current environment and source based on priority
        current_env, source = EnvironmentMigrationHelper._determine_current_env(
            node_env, environment, env
        )

        # Analyze migration phase
        phase = EnvironmentMigrationHelper._determine_migration_phase(
            node_env, environment, env
        )

        # Check for conflicts
        conflicts = EnvironmentMigrationHelper._detect_conflicts(
            node_env, environment, env
        )

        # Generate recommendations
        recommendations = EnvironmentMigrationHelper._generate_recommendations(
            node_env, environment, env, conflicts
        )

        migration_complete = phase == MigrationPhase.COMPLETED

        return MigrationStatus(
            current_env=current_env,
            source=source,
            phase=phase,
            conflicts=conflicts,
            recommendations=recommendations,
            migration_complete=migration_complete,
        )

    @staticmethod
    def _determine_current_env(
        node_env: str | None, environment: str | None, env: str | None
    ) -> tuple[str, str]:
        """Determine current environment value and source."""
        # Priority order: NODE_ENV → ENVIRONMENT → ENV → default
        if node_env:
            return node_env.lower(), "NODE_ENV"
        elif environment:
            return environment.lower(), "ENVIRONMENT"
        elif env:
            return env.lower(), "ENV"
        else:
            return "development", "default"

    @staticmethod
    def _determine_migration_phase(
        node_env: str | None, environment: str | None, env: str | None
    ) -> MigrationPhase:
        """Determine which migration phase we're in."""
        # Check for conflicts first
        if (
            (node_env and environment and node_env.lower() != environment.lower())
            or (node_env and env and node_env.lower() != env.lower())
            or (environment and env and environment.lower() != env.lower())
        ):
            return MigrationPhase.CONFLICTED

        # Migration complete: NODE_ENV set, no legacy vars
        if node_env and not environment and not env:
            return MigrationPhase.COMPLETED

        # Migration in progress: NODE_ENV + legacy vars (but same values)
        if node_env and (environment or env):
            return MigrationPhase.IN_PROGRESS

        # Not started: Only legacy vars or no vars
        if (environment or env) and not node_env:
            return MigrationPhase.NOT_STARTED

        # Default state (no env vars set)
        return MigrationPhase.NOT_STARTED

    @staticmethod
    def _detect_conflicts(
        node_env: str | None, environment: str | None, env: str | None
    ) -> list[str]:
        """Detect conflicts between environment variables."""
        conflicts = []

        if node_env and environment:
            if node_env.lower() != environment.lower():
                conflicts.append(
                    f"NODE_ENV ({node_env}) != ENVIRONMENT ({environment})"
                )

        if node_env and env:
            if node_env.lower() != env.lower():
                conflicts.append(f"NODE_ENV ({node_env}) != ENV ({env})")

        if environment and env:
            if environment.lower() != env.lower():
                conflicts.append(f"ENVIRONMENT ({environment}) != ENV ({env})")

        return conflicts

    @staticmethod
    def _generate_recommendations(
        node_env: str | None,
        environment: str | None,
        env: str | None,
        conflicts: list[str],
    ) -> list[str]:
        """Generate migration recommendations."""
        recommendations = []

        # If there are conflicts, that's the priority
        if conflicts:
            recommendations.append(
                "🚨 CRITICAL: Resolve environment variable conflicts immediately"
            )
            recommendations.append(
                "Set all environment variables to the same value or remove conflicting ones"
            )
            return recommendations

        # Migration recommendations based on current state
        if environment and not node_env:
            recommendations.append(f"📝 Set NODE_ENV={environment}")
            recommendations.append(
                "💡 After setting NODE_ENV, you can remove ENVIRONMENT"
            )

        if env and not node_env:
            recommendations.append(f"📝 Set NODE_ENV={env}")
            recommendations.append("💡 After setting NODE_ENV, you can remove ENV")

        if node_env and (environment or env):
            if environment:
                recommendations.append(
                    "✅ Remove ENVIRONMENT variable (NODE_ENV is now primary)"
                )
            if env:
                recommendations.append(
                    "✅ Remove ENV variable (NODE_ENV is now primary)"
                )

        if not any([node_env, environment, env]):
            recommendations.append(
                "📝 Set NODE_ENV=development (or your desired environment)"
            )

        # Validate environment value
        current_env = (node_env or environment or env or "development").lower()
        if current_env not in EnvironmentMigrationHelper.VALID_ENVIRONMENTS:
            recommendations.append(
                f"⚠️ Environment '{current_env}' is not standard. Consider using: {', '.join(EnvironmentMigrationHelper.VALID_ENVIRONMENTS)}"
            )

        return recommendations

    @staticmethod
    def validate_migration() -> bool:
        """Validate that migration is safe to proceed."""
        status = EnvironmentMigrationHelper.get_migration_status()

        if status.phase == MigrationPhase.CONFLICTED:
            logger.error(f"Migration validation failed: {status.conflicts}")
            for conflict in status.conflicts:
                logger.error(f"  - {conflict}")
            return False

        if status.current_env not in EnvironmentMigrationHelper.VALID_ENVIRONMENTS:
            logger.warning(f"Unusual environment value: {status.current_env}")

        logger.info(
            f"Migration validation passed: {status.source}={status.current_env} ({status.phase.value})"
        )
        return True

    @staticmethod
    def log_migration_status() -> None:
        """Log detailed migration status for monitoring."""
        status = EnvironmentMigrationHelper.get_migration_status()

        # Choose appropriate log level based on status
        if status.phase == MigrationPhase.CONFLICTED:
            logger.error("🚨 Environment variable conflicts detected!")
            for conflict in status.conflicts:
                logger.error(f"   {conflict}")
        elif status.phase == MigrationPhase.COMPLETED:
            logger.info(
                f"✅ Environment migration complete: NODE_ENV={status.current_env}"
            )
        elif status.phase == MigrationPhase.IN_PROGRESS:
            logger.info(
                f"⚠️ Environment migration in progress: {status.source}={status.current_env}"
            )
            for rec in status.recommendations:
                logger.info(f"   {rec}")
        else:  # NOT_STARTED
            logger.warning(
                f"🔄 Environment migration not started: {status.source}={status.current_env}"
            )
            for rec in status.recommendations:
                logger.warning(f"   {rec}")

    @staticmethod
    def get_normalized_environment() -> str:
        """Get current environment value with migration-aware fallback logic.

        Returns the current environment value using the migration priority order:
        NODE_ENV (preferred) → ENVIRONMENT → ENV → \"development\" (default).
        Automatically logs usage of legacy variables to encourage migration.

        Returns:
            Normalized environment string in lowercase. Always returns a valid
            environment value, defaulting to \"development\" if no variables are set.

        Example:
            >>> # With NODE_ENV set
            >>> os.environ[\"NODE_ENV\"] = \"production\"
            >>> env = EnvironmentMigrationHelper.get_normalized_environment()
            >>> print(env)  # \"production\"
            >>>
            >>> # With only legacy ENVIRONMENT set
            >>> del os.environ[\"NODE_ENV\"]
            >>> os.environ[\"ENVIRONMENT\"] = \"staging\"
            >>> env = EnvironmentMigrationHelper.get_normalized_environment()
            >>> print(env)  # \"staging\" (with migration warning logged)

        Note:
            This method provides informational logging when legacy variables
            are used to help track migration progress.
        """
        node_env = os.environ.get("NODE_ENV")
        environment = os.environ.get("ENVIRONMENT")
        env = os.environ.get("ENV")

        # Use NODE_ENV if available, fallback to legacy vars
        result = (node_env or environment or env or "development").lower()

        # Log if we're using a legacy variable
        if not node_env and (environment or env):
            source = "ENVIRONMENT" if environment else "ENV"
            logger.info(
                f"Using legacy {source}={result}. Consider setting NODE_ENV={result}"
            )

        return result

    @staticmethod
    def set_recommended_environment() -> bool:
        """Set NODE_ENV based on current environment detection.

        This is a utility function for scripts that want to normalize
        the environment variables programmatically.

        Returns:
            bool: True if NODE_ENV was set or already correct, False if conflicts exist
        """
        status = EnvironmentMigrationHelper.get_migration_status()

        if status.phase == MigrationPhase.CONFLICTED:
            logger.error(
                "Cannot auto-set NODE_ENV due to conflicts. Manual intervention required."
            )
            return False

        if status.phase == MigrationPhase.COMPLETED:
            logger.info(f"NODE_ENV already set correctly to {status.current_env}")
            return True

        # Set NODE_ENV to the current detected value
        os.environ["NODE_ENV"] = status.current_env
        logger.info(f"Set NODE_ENV={status.current_env} (was using {status.source})")

        return True

    @classmethod
    def create_migration_report(cls) -> dict[str, any]:
        """Create a comprehensive migration report for monitoring/debugging."""
        status = cls.get_migration_status()

        # Gather all environment variables for context
        all_env_vars = {
            "NODE_ENV": os.environ.get("NODE_ENV"),
            "ENVIRONMENT": os.environ.get("ENVIRONMENT"),
            "ENV": os.environ.get("ENV"),
        }

        # Filter out None values
        set_env_vars = {k: v for k, v in all_env_vars.items() if v is not None}

        return {
            "timestamp": str(os.times()),
            "migration_status": status.to_dict(),
            "environment_variables": all_env_vars,
            "set_variables": set_env_vars,
            "variable_count": len(set_env_vars),
            "ready_for_cleanup": status.phase == MigrationPhase.COMPLETED,
            "requires_attention": status.phase
            in [MigrationPhase.CONFLICTED, MigrationPhase.NOT_STARTED],
        }


# Convenience functions for easy importing
def get_environment() -> str:
    """Get the current environment with migration-aware fallback logic.

    Convenience wrapper around EnvironmentMigrationHelper.get_normalized_environment()
    that returns the current environment value using NODE_ENV preference.

    Returns:
        Current environment string (development, testing, staging, production, local)

    Example:
        >>> from app.utils.migration_helper import get_environment
        >>> current_env = get_environment()
        >>> if current_env == "production":
        ...     print("Running in production mode")
    """
    return EnvironmentMigrationHelper.get_normalized_environment()


def is_migration_complete() -> bool:
    """Check if environment variable migration to NODE_ENV is complete.

    Convenience function to quickly determine if the migration from legacy
    environment variables (ENVIRONMENT, ENV) to NODE_ENV is finished.

    Returns:
        True if only NODE_ENV is set and no legacy variables remain,
        False if migration is incomplete or conflicts exist

    Example:
        >>> from app.utils.migration_helper import is_migration_complete
        >>> if not is_migration_complete():
        ...     print("Migration to NODE_ENV not yet complete")
        ...     # Display migration recommendations
    """
    return EnvironmentMigrationHelper.get_migration_status().migration_complete


def validate_environment_config() -> bool:
    """Validate current environment variable configuration for conflicts.

    Convenience wrapper around EnvironmentMigrationHelper.validate_migration()
    that performs comprehensive validation of environment variable setup.

    Returns:
        True if environment configuration is valid and conflict-free,
        False if conflicts exist that require manual resolution

    Example:
        >>> from app.utils.migration_helper import validate_environment_config
        >>> if not validate_environment_config():
        ...     print("Environment configuration has conflicts!")
        ...     # Handle configuration errors
    """
    return EnvironmentMigrationHelper.validate_migration()


# Initialize logging when module is imported
if __name__ != "__main__":
    EnvironmentMigrationHelper.log_migration_status()
