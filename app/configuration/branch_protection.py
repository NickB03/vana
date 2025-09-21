"""Branch protection rules and Git workflow configuration."""

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class ProtectionLevel(Enum):
    """Branch protection levels.

    Defines different levels of branch protection with increasing security.

    Attributes:
        NONE: No protection, allows all operations.
        BASIC: Basic protection with minimal restrictions.
        STANDARD: Standard protection suitable for most projects.
        STRICT: Strict protection for critical branches.
        ENTERPRISE: Maximum protection for enterprise environments.
    """

    NONE = "none"
    BASIC = "basic"
    STANDARD = "standard"
    STRICT = "strict"
    ENTERPRISE = "enterprise"


class ReviewRequirement(Enum):
    """Code review requirements.

    Defines different levels of code review requirements for pull requests.

    Attributes:
        NONE: No review required.
        OPTIONAL: Reviews are optional but encouraged.
        REQUIRED: Reviews are required before merging.
        REQUIRED_FROM_CODEOWNERS: Reviews required from designated code owners.
    """

    NONE = "none"
    OPTIONAL = "optional"
    REQUIRED = "required"
    REQUIRED_FROM_CODEOWNERS = "required_from_codeowners"


@dataclass
class StatusCheck:
    """Required status check configuration.

    Represents a required status check that must pass before merging.

    Attributes:
        context: Status check context name (e.g., 'ci/tests').
        description: Human-readable description of the check.
        required: Whether this check is required for merging.
        strict: Whether branches must be up-to-date before merging.
    """

    context: str
    description: str
    required: bool = True
    strict: bool = True  # Require branches to be up-to-date


@dataclass
class BranchProtectionRule:
    """Branch protection rule configuration.

    Comprehensive configuration for Git branch protection rules including
    pull request requirements, status checks, push restrictions, and
    administrative settings.

    Attributes:
        name: Unique rule identifier.
        pattern: Branch name pattern (glob or regex).
        protection_level: Overall protection level.
        require_pull_request: Whether pull requests are required.
        required_reviewers: Number of required reviewers.
        dismiss_stale_reviews: Whether to dismiss stale reviews on new commits.
        require_code_owner_reviews: Whether code owner reviews are required.
        require_last_push_approval: Whether approval after last push is required.
        required_status_checks: List of required status checks.
        require_branches_up_to_date: Whether branches must be current.
        restrict_pushes: Whether to restrict direct pushes.
        allowed_push_users: Users allowed to push directly.
        allowed_push_teams: Teams allowed to push directly.
        enforce_admins: Whether rules apply to administrators.
        allow_force_pushes: Whether force pushes are allowed.
        allow_deletions: Whether branch deletions are allowed.
        allow_auto_merge: Whether auto-merge is enabled.
        delete_branch_on_merge: Whether to delete branches after merge.
        required_linear_history: Whether linear history is required.
        required_conversation_resolution: Whether conversations must be resolved.
        custom_hooks: List of custom hook identifiers.
        created_at: Rule creation timestamp.
    """

    name: str
    pattern: str  # Branch name pattern (glob or regex)
    protection_level: ProtectionLevel

    # Pull Request Requirements
    require_pull_request: bool = True
    required_reviewers: int = 1
    dismiss_stale_reviews: bool = True
    require_code_owner_reviews: bool = False
    require_last_push_approval: bool = True

    # Status Checks
    required_status_checks: list[StatusCheck] = field(default_factory=list)
    require_branches_up_to_date: bool = True

    # Push Restrictions
    restrict_pushes: bool = True
    allowed_push_users: list[str] = field(default_factory=list)
    allowed_push_teams: list[str] = field(default_factory=list)

    # Admin Settings
    enforce_admins: bool = True
    allow_force_pushes: bool = False
    allow_deletions: bool = False

    # Auto-merge Settings
    allow_auto_merge: bool = False
    delete_branch_on_merge: bool = True

    # Advanced Settings
    required_linear_history: bool = False
    required_conversation_resolution: bool = True

    # Custom Checks
    custom_hooks: list[str] = field(default_factory=list)

    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_github_config(self) -> dict[str, Any]:
        """Convert to GitHub API format.

        Transforms the rule configuration into the format expected by
        the GitHub branch protection API.

        Returns:
            Dictionary formatted for GitHub API consumption.
        """
        config = {
            "required_status_checks": {
                "strict": self.require_branches_up_to_date,
                "contexts": [
                    check.context
                    for check in self.required_status_checks
                    if check.required
                ],
            }
            if self.required_status_checks
            else None,
            "enforce_admins": self.enforce_admins,
            "allow_force_pushes": self.allow_force_pushes,
            "allow_deletions": self.allow_deletions,
            "required_linear_history": self.required_linear_history,
            "restrictions": {
                "users": self.allowed_push_users,
                "teams": self.allowed_push_teams,
            }
            if self.restrict_pushes
            else None,
        }

        if self.require_pull_request:
            config["required_pull_request_reviews"] = {
                "required_approving_review_count": self.required_reviewers,
                "dismiss_stale_reviews": self.dismiss_stale_reviews,
                "require_code_owner_reviews": self.require_code_owner_reviews,
                "require_last_push_approval": self.require_last_push_approval,
            }

        return config


class BranchProtectionManager:
    """Manager for branch protection rules and Git workflows.

    Provides comprehensive management of Git branch protection rules including
    creation, validation, template-based generation, and GitHub API integration.

    Attributes:
        rules: Dictionary of active protection rules by name.
        templates: Dictionary of rule templates for common scenarios.
    """

    def __init__(self, config_file: str | None = None):
        """Initialize the branch protection manager.

        Args:
            config_file: Optional configuration file to load rules from.
        """
        self.rules: dict[str, BranchProtectionRule] = {}
        self.templates: dict[str, BranchProtectionRule] = {}

        # Load default templates
        self._create_default_templates()

        # Load from config file if provided
        if config_file:
            self.load_config(config_file)

    def add_rule(self, rule: BranchProtectionRule) -> None:
        """Add a branch protection rule.

        Args:
            rule: BranchProtectionRule instance to add.
        """
        self.rules[rule.name] = rule
        logger.info(f"Added branch protection rule: {rule.name}")

    def remove_rule(self, rule_name: str) -> bool:
        """Remove a branch protection rule."""
        if rule_name in self.rules:
            del self.rules[rule_name]
            logger.info(f"Removed branch protection rule: {rule_name}")
            return True
        return False

    def get_rule(self, rule_name: str) -> BranchProtectionRule | None:
        """Get a specific rule."""
        return self.rules.get(rule_name)

    def get_rules_for_branch(self, branch_name: str) -> list[BranchProtectionRule]:
        """Get all rules that apply to a branch.

        Matches branch name against rule patterns using glob and regex.

        Args:
            branch_name: Name of the branch to check.

        Returns:
            List of applicable BranchProtectionRule instances.
        """
        import fnmatch
        import re

        matching_rules = []
        for rule in self.rules.values():
            # Check glob pattern
            if fnmatch.fnmatch(branch_name, rule.pattern):
                matching_rules.append(rule)
            # Check regex pattern
            elif rule.pattern.startswith("^") or rule.pattern.endswith("$"):
                try:
                    if re.match(rule.pattern, branch_name):
                        matching_rules.append(rule)
                except re.error:
                    logger.warning(
                        f"Invalid regex pattern in rule {rule.name}: {rule.pattern}"
                    )

        return matching_rules

    def create_from_template(
        self, template_name: str, rule_name: str, pattern: str, **overrides
    ) -> BranchProtectionRule | None:
        """Create a rule from a template."""
        if template_name not in self.templates:
            logger.error(f"Template not found: {template_name}")
            return None

        template = self.templates[template_name]

        # Create new rule from template
        rule_data = {
            "name": rule_name,
            "pattern": pattern,
            "protection_level": template.protection_level,
            "require_pull_request": template.require_pull_request,
            "required_reviewers": template.required_reviewers,
            "dismiss_stale_reviews": template.dismiss_stale_reviews,
            "require_code_owner_reviews": template.require_code_owner_reviews,
            "require_last_push_approval": template.require_last_push_approval,
            "required_status_checks": template.required_status_checks.copy(),
            "require_branches_up_to_date": template.require_branches_up_to_date,
            "restrict_pushes": template.restrict_pushes,
            "allowed_push_users": template.allowed_push_users.copy(),
            "allowed_push_teams": template.allowed_push_teams.copy(),
            "enforce_admins": template.enforce_admins,
            "allow_force_pushes": template.allow_force_pushes,
            "allow_deletions": template.allow_deletions,
            "allow_auto_merge": template.allow_auto_merge,
            "delete_branch_on_merge": template.delete_branch_on_merge,
            "required_linear_history": template.required_linear_history,
            "required_conversation_resolution": template.required_conversation_resolution,
            "custom_hooks": template.custom_hooks.copy(),
        }

        # Apply overrides
        rule_data.update(overrides)

        rule = BranchProtectionRule(**rule_data)
        self.add_rule(rule)
        return rule

    def validate_rule(self, rule: BranchProtectionRule) -> list[str]:
        """Validate a protection rule and return any issues.

        Checks for configuration conflicts, missing required settings,
        and invalid patterns.

        Args:
            rule: BranchProtectionRule to validate.

        Returns:
            List of validation issue descriptions.
        """
        issues = []

        # Check for conflicting settings
        if rule.allow_force_pushes and rule.protection_level in [
            ProtectionLevel.STRICT,
            ProtectionLevel.ENTERPRISE,
        ]:
            issues.append(
                "Force pushes should not be allowed for strict protection levels"
            )

        if rule.required_reviewers == 0 and rule.require_pull_request:
            issues.append("Pull requests required but no reviewers specified")

        if rule.allow_auto_merge and not rule.required_status_checks:
            issues.append("Auto-merge enabled but no status checks required")

        # Validate status checks
        for check in rule.required_status_checks:
            if not check.context:
                issues.append("Status check missing context name")

        # Check pattern validity
        if not rule.pattern:
            issues.append("Branch pattern is required")
        elif rule.pattern.startswith("^") or rule.pattern.endswith("$"):
            try:
                import re

                re.compile(rule.pattern)
            except re.error as e:
                issues.append(f"Invalid regex pattern: {e}")

        return issues

    def export_github_config(self, rule_name: str) -> dict[str, Any] | None:
        """Export rule as GitHub API configuration."""
        rule = self.get_rule(rule_name)
        if not rule:
            return None

        issues = self.validate_rule(rule)
        if issues:
            logger.warning(f"Rule validation issues for {rule_name}: {issues}")

        return rule.to_github_config()

    def load_config(self, config_file: str) -> None:
        """Load configuration from file."""
        try:
            with open(config_file) as f:
                config = json.load(f)

            # Load rules
            for rule_config in config.get("rules", []):
                rule = self._rule_from_config(rule_config)
                self.add_rule(rule)

            # Load templates
            for template_config in config.get("templates", []):
                template = self._rule_from_config(template_config)
                self.templates[template.name] = template

            logger.info(f"Loaded branch protection config from {config_file}")

        except Exception as e:
            logger.error(f"Failed to load config: {e}")

    def save_config(self, config_file: str) -> None:
        """Save configuration to file."""
        try:
            config = {
                "rules": [self._rule_to_config(rule) for rule in self.rules.values()],
                "templates": [
                    self._rule_to_config(template)
                    for template in self.templates.values()
                ],
            }

            with open(config_file, "w") as f:
                json.dump(config, f, indent=2, default=str)

            logger.info(f"Saved branch protection config to {config_file}")

        except Exception as e:
            logger.error(f"Failed to save config: {e}")

    def get_protection_summary(self) -> dict[str, Any]:
        """Get summary of protection rules."""
        summary = {
            "total_rules": len(self.rules),
            "protection_levels": {},
            "common_patterns": {},
            "validation_issues": 0,
        }

        for rule in self.rules.values():
            # Count by protection level
            level = rule.protection_level.value
            summary["protection_levels"][level] = (
                summary["protection_levels"].get(level, 0) + 1
            )

            # Count common patterns
            pattern = rule.pattern
            summary["common_patterns"][pattern] = (
                summary["common_patterns"].get(pattern, 0) + 1
            )

            # Count validation issues
            issues = self.validate_rule(rule)
            summary["validation_issues"] += len(issues)

        return summary

    def _create_default_templates(self) -> None:
        """Create default protection templates."""
        # Main/Master branch template
        main_template = BranchProtectionRule(
            name="main_branch",
            pattern="main",
            protection_level=ProtectionLevel.STRICT,
            require_pull_request=True,
            required_reviewers=2,
            dismiss_stale_reviews=True,
            require_code_owner_reviews=True,
            require_last_push_approval=True,
            required_status_checks=[
                StatusCheck("ci/tests", "All tests must pass"),
                StatusCheck("ci/lint", "Code must pass linting"),
                StatusCheck("ci/security", "Security scan must pass"),
            ],
            require_branches_up_to_date=True,
            restrict_pushes=True,
            enforce_admins=True,
            allow_force_pushes=False,
            allow_deletions=False,
            required_linear_history=True,
            required_conversation_resolution=True,
        )

        # Release branch template
        release_template = BranchProtectionRule(
            name="release_branch",
            pattern="release/*",
            protection_level=ProtectionLevel.STANDARD,
            require_pull_request=True,
            required_reviewers=1,
            dismiss_stale_reviews=True,
            require_code_owner_reviews=False,
            require_last_push_approval=True,
            required_status_checks=[
                StatusCheck("ci/tests", "Tests must pass"),
                StatusCheck("ci/build", "Build must succeed"),
            ],
            require_branches_up_to_date=True,
            restrict_pushes=True,
            enforce_admins=False,
            allow_force_pushes=False,
            allow_deletions=False,
        )

        # Feature branch template
        feature_template = BranchProtectionRule(
            name="feature_branch",
            pattern="feature/*",
            protection_level=ProtectionLevel.BASIC,
            require_pull_request=True,
            required_reviewers=1,
            dismiss_stale_reviews=False,
            require_code_owner_reviews=False,
            require_last_push_approval=False,
            required_status_checks=[StatusCheck("ci/tests", "Tests should pass")],
            require_branches_up_to_date=False,
            restrict_pushes=False,
            enforce_admins=False,
            allow_force_pushes=True,
            allow_deletions=True,
            delete_branch_on_merge=True,
        )

        # Development branch template
        develop_template = BranchProtectionRule(
            name="develop_branch",
            pattern="develop",
            protection_level=ProtectionLevel.STANDARD,
            require_pull_request=True,
            required_reviewers=1,
            dismiss_stale_reviews=True,
            require_code_owner_reviews=False,
            require_last_push_approval=False,
            required_status_checks=[
                StatusCheck("ci/tests", "Tests must pass"),
                StatusCheck("ci/lint", "Linting must pass"),
            ],
            require_branches_up_to_date=True,
            restrict_pushes=True,
            enforce_admins=False,
            allow_force_pushes=False,
            allow_deletions=False,
        )

        self.templates.update(
            {
                "main_branch": main_template,
                "release_branch": release_template,
                "feature_branch": feature_template,
                "develop_branch": develop_template,
            }
        )

    def _rule_from_config(self, config: dict[str, Any]) -> BranchProtectionRule:
        """Create rule from configuration dictionary."""
        # Parse status checks
        status_checks = []
        for check_config in config.get("required_status_checks", []):
            status_check = StatusCheck(
                context=check_config["context"],
                description=check_config.get("description", ""),
                required=check_config.get("required", True),
                strict=check_config.get("strict", True),
            )
            status_checks.append(status_check)

        return BranchProtectionRule(
            name=config["name"],
            pattern=config["pattern"],
            protection_level=ProtectionLevel(config.get("protection_level", "basic")),
            require_pull_request=config.get("require_pull_request", True),
            required_reviewers=config.get("required_reviewers", 1),
            dismiss_stale_reviews=config.get("dismiss_stale_reviews", True),
            require_code_owner_reviews=config.get("require_code_owner_reviews", False),
            require_last_push_approval=config.get("require_last_push_approval", True),
            required_status_checks=status_checks,
            require_branches_up_to_date=config.get("require_branches_up_to_date", True),
            restrict_pushes=config.get("restrict_pushes", True),
            allowed_push_users=config.get("allowed_push_users", []),
            allowed_push_teams=config.get("allowed_push_teams", []),
            enforce_admins=config.get("enforce_admins", True),
            allow_force_pushes=config.get("allow_force_pushes", False),
            allow_deletions=config.get("allow_deletions", False),
            allow_auto_merge=config.get("allow_auto_merge", False),
            delete_branch_on_merge=config.get("delete_branch_on_merge", True),
            required_linear_history=config.get("required_linear_history", False),
            required_conversation_resolution=config.get(
                "required_conversation_resolution", True
            ),
            custom_hooks=config.get("custom_hooks", []),
        )

    def _rule_to_config(self, rule: BranchProtectionRule) -> dict[str, Any]:
        """Convert rule to configuration dictionary."""
        return {
            "name": rule.name,
            "pattern": rule.pattern,
            "protection_level": rule.protection_level.value,
            "require_pull_request": rule.require_pull_request,
            "required_reviewers": rule.required_reviewers,
            "dismiss_stale_reviews": rule.dismiss_stale_reviews,
            "require_code_owner_reviews": rule.require_code_owner_reviews,
            "require_last_push_approval": rule.require_last_push_approval,
            "required_status_checks": [
                {
                    "context": check.context,
                    "description": check.description,
                    "required": check.required,
                    "strict": check.strict,
                }
                for check in rule.required_status_checks
            ],
            "require_branches_up_to_date": rule.require_branches_up_to_date,
            "restrict_pushes": rule.restrict_pushes,
            "allowed_push_users": rule.allowed_push_users,
            "allowed_push_teams": rule.allowed_push_teams,
            "enforce_admins": rule.enforce_admins,
            "allow_force_pushes": rule.allow_force_pushes,
            "allow_deletions": rule.allow_deletions,
            "allow_auto_merge": rule.allow_auto_merge,
            "delete_branch_on_merge": rule.delete_branch_on_merge,
            "required_linear_history": rule.required_linear_history,
            "required_conversation_resolution": rule.required_conversation_resolution,
            "custom_hooks": rule.custom_hooks,
            "created_at": rule.created_at.isoformat(),
        }


# Global instance
_branch_protection_manager: BranchProtectionManager | None = None


def get_branch_protection_manager() -> BranchProtectionManager:
    """Get the global branch protection manager singleton.

    Returns:
        The global BranchProtectionManager instance, creating it if needed.
    """
    global _branch_protection_manager
    if _branch_protection_manager is None:
        _branch_protection_manager = BranchProtectionManager()
    return _branch_protection_manager
