"""
Context Sanitization Engine

A comprehensive system for detecting and sanitizing sensitive data patterns
in code contexts to prevent CodeRabbit security warnings and protect sensitive information.

Features:
- High-performance pattern detection and replacement
- Extensible pattern registry system
- Contextually appropriate placeholder generation
- Pipeline integration for pre-generation sanitization
- Configurable sanitization rules and categories

Performance targets:
- <100ms for 10KB contexts
- <1000ms for 100KB contexts
- Memory efficient processing
"""

import logging
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from re import Pattern


class SanitizationError(Exception):
    """Custom exception for sanitization errors"""

    pass


class PlaceholderStyle(Enum):
    """Placeholder generation styles"""

    MASKED = "masked"  # e.g., sk-***KEY***
    GENERIC = "generic"  # e.g., API_KEY
    CONTEXTUAL = "contextual"  # e.g., your-project-id


@dataclass
class SensitivePattern:
    """Definition of a sensitive data pattern"""

    name: str
    pattern: str  # Regex pattern
    placeholder: str | Callable[..., str]  # Static placeholder or generator function
    confidence: float = 0.8
    category: str = "general"
    preserve_structure: bool = True
    description: str = ""

    def __post_init__(self) -> None:
        """Validate pattern on creation"""
        try:
            re.compile(self.pattern)
        except re.error as e:
            raise SanitizationError(
                f"Invalid regex pattern '{self.pattern}': {e}"
            ) from e


@dataclass
class SanitizationConfig:
    """Configuration for sanitization behavior"""

    enabled_patterns: list[str] | None = None
    disabled_patterns: list[str] | None = None
    enabled_categories: list[str] | None = None
    disabled_categories: list[str] | None = None
    placeholder_style: PlaceholderStyle = PlaceholderStyle.CONTEXTUAL
    preserve_structure: bool = True
    max_context_size: int = 1024 * 1024  # 1MB default limit
    performance_mode: bool = False  # Enable optimizations for large contexts
    logging_enabled: bool = True


class PlaceholderGenerator:
    """Generates contextually appropriate placeholders"""

    @staticmethod
    def generate_project_id_placeholder(match_obj: re.Match, context: str) -> str:
        """Generate appropriate project ID placeholder based on context"""
        original = match_obj.group(0)

        # Preserve format for environment variables
        if "=" in context[: match_obj.start()] + context[match_obj.end() :]:
            return "your-project-id"

        # Preserve format for CLI arguments
        if "--project=" in original:
            return "--project=YOUR_PROJECT_ID"

        # Default generic placeholder
        return "PROJECT_ID"

    @staticmethod
    def generate_path_placeholder(match_obj: re.Match, context: str) -> str:
        """Generate path placeholder preserving directory structure"""
        original_path = match_obj.group(0)

        # Replace username but preserve structure
        if "/Users/" in original_path:
            user_match = re.search(r"/Users/([^/]+)", original_path)
            if user_match:
                return original_path.replace(user_match.group(1), "USER")
        elif "C:\\Users\\" in original_path or "C:/Users/" in original_path:
            # Handle both forward and backward slashes
            return re.sub(
                r"C:[\\/]Users[\\/][^\\/]+", r"C:\\Users\\USER", original_path
            )
        elif "/home/" in original_path:
            return re.sub(r"/home/[^/]+", "/home/USER", original_path)
        elif original_path.startswith("~/"):
            return "~/Documents/PROJECT"

        return original_path

    @staticmethod
    def generate_api_key_placeholder(match_obj: re.Match, context: str) -> str:
        """Generate API key placeholder preserving format"""
        original = match_obj.group(0)

        # Preserve prefix for OpenAI keys
        if original.startswith("sk-"):
            return "sk-***API_KEY***"
        elif original.startswith("BSA-"):
            return "BSA-***API_KEY***"
        elif original.startswith("ghp_"):
            return "ghp_***TOKEN***"
        elif original.startswith("AIzaSy"):
            return "AIzaSy***GOOGLE_API_KEY***"

        return "***API_KEY***"

    @staticmethod
    def generate_email_placeholder(match_obj: re.Match, context: str) -> str:
        """Generate email placeholder"""
        return "user@example.com"

    @staticmethod
    def generate_ip_placeholder(match_obj: re.Match, context: str) -> str:
        """Generate IP address placeholder"""
        original = match_obj.group(0)

        # Preserve port if present
        if ":" in original:
            ip, port = original.split(":", 1)
            return f"0.0.0.0:{port}"

        return "0.0.0.0"


class PatternRegistry:
    """Registry for managing sensitive data patterns"""

    def __init__(self) -> None:
        self.patterns: dict[str, SensitivePattern] = {}
        self.categories: dict[str, list[str]] = {}
        self.compiled_patterns: dict[str, Pattern] = {}
        self._load_default_patterns()

    def _load_default_patterns(self):
        """Load default sensitive data patterns"""
        default_patterns = [
            # Google Cloud Project IDs
            SensitivePattern(
                name="google_project_id",
                pattern=r"\b[a-z][a-z0-9-]{4,28}[a-z0-9]\b(?=[\s\'\"=]|$)",
                placeholder=PlaceholderGenerator.generate_project_id_placeholder,
                confidence=0.9,
                category="infrastructure",
                description="Google Cloud project IDs",
            ),
            # Google Cloud Storage bucket names
            SensitivePattern(
                name="gcs_bucket_name",
                pattern=r"gs://[a-z0-9][a-z0-9\-_.]*[a-z0-9]",
                placeholder="gs://your-bucket-name",
                confidence=0.95,
                category="infrastructure",
                description="Google Cloud Storage bucket URLs",
            ),
            # File paths with usernames
            SensitivePattern(
                name="user_file_path",
                pattern=r"(?:/Users/[^/\s]+|C:[\\/]Users[\\/][^\\/\s]+|/home/[^/\s]+|~/[^/\s]+)[^\s]*",
                placeholder=PlaceholderGenerator.generate_path_placeholder,
                confidence=0.95,
                category="filesystem",
                description="File paths containing usernames",
            ),
            # API Keys (OpenAI, Google, etc.)
            SensitivePattern(
                name="openai_api_key",
                pattern=r"sk-[a-zA-Z0-9]{48}",
                placeholder=PlaceholderGenerator.generate_api_key_placeholder,
                confidence=0.98,
                category="authentication",
                description="OpenAI API keys",
            ),
            SensitivePattern(
                name="google_api_key",
                pattern=r"AIzaSy[a-zA-Z0-9_-]{35}",
                placeholder=PlaceholderGenerator.generate_api_key_placeholder,
                confidence=0.98,
                category="authentication",
                description="Google API keys",
            ),
            SensitivePattern(
                name="github_token",
                pattern=r"ghp_[a-zA-Z0-9]{36}",
                placeholder=PlaceholderGenerator.generate_api_key_placeholder,
                confidence=0.98,
                category="authentication",
                description="GitHub personal access tokens",
            ),
            SensitivePattern(
                name="brave_api_key",
                pattern=r"BSA-[a-zA-Z0-9]{10,}",
                placeholder=PlaceholderGenerator.generate_api_key_placeholder,
                confidence=0.95,
                category="authentication",
                description="Brave Search API keys",
            ),
            # Generic API key patterns
            SensitivePattern(
                name="generic_api_key",
                pattern=r"(?:api[_-]?key|token|secret)[\"'\s]*[:=][\"'\s]*[a-zA-Z0-9_-]{16,}",
                placeholder="API_KEY_VALUE",
                confidence=0.7,
                category="authentication",
                description="Generic API key patterns",
            ),
            # JWT Tokens
            SensitivePattern(
                name="jwt_token",
                pattern=r"eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*",
                placeholder="***JWT_TOKEN***",
                confidence=0.95,
                category="authentication",
                description="JWT tokens",
            ),
            # Email addresses
            SensitivePattern(
                name="email_address",
                pattern=r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
                placeholder=PlaceholderGenerator.generate_email_placeholder,
                confidence=0.9,
                category="personal",
                description="Email addresses",
            ),
            # IP Addresses with ports
            SensitivePattern(
                name="ip_address",
                pattern=r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?::[0-9]{1,5})?\b",
                placeholder=PlaceholderGenerator.generate_ip_placeholder,
                confidence=0.85,
                category="network",
                description="IP addresses with optional ports",
            ),
            # Database connection strings
            SensitivePattern(
                name="database_url",
                pattern=r"(?:postgresql|mysql|redis)://[^:\s]+:[^@\s]+@[^\s/]+(?:/[^\s]*)?",
                placeholder="database://user:***PASSWORD***@host/db",
                confidence=0.95,
                category="database",
                description="Database connection URLs with credentials",
            ),
            # Environment variable assignments with sensitive values
            SensitivePattern(
                name="env_var_sensitive",
                pattern=r"(?:SECRET|PASSWORD|KEY|TOKEN)[\w]*\s*[:=]\s*[\"']?[a-zA-Z0-9_-]{8,}[\"']?",
                placeholder=lambda m,
                c: f"{m.group(0).split('=')[0] if '=' in m.group(0) else m.group(0).split(':')[0]}=***VALUE***",
                confidence=0.8,
                category="configuration",
                description="Environment variables with sensitive values",
            ),
        ]

        for pattern in default_patterns:
            self.add_pattern(pattern)

    def add_pattern(self, pattern: SensitivePattern):
        """Add a pattern to the registry"""
        try:
            compiled = re.compile(pattern.pattern, re.IGNORECASE)
            self.patterns[pattern.name] = pattern
            self.compiled_patterns[pattern.name] = compiled

            # Add to category
            if pattern.category not in self.categories:
                self.categories[pattern.category] = []
            self.categories[pattern.category].append(pattern.name)

        except re.error as e:
            raise SanitizationError(
                f"Failed to compile pattern '{pattern.name}': {e}"
            ) from e

    def add_pattern_to_category(self, category: str, pattern: SensitivePattern):
        """Add a pattern to a specific category"""
        pattern.category = category
        self.add_pattern(pattern)

    def get_patterns_by_category(self, category: str) -> list[SensitivePattern]:
        """Get all patterns in a category"""
        pattern_names = self.categories.get(category, [])
        return [self.patterns[name] for name in pattern_names]

    def get_enabled_patterns(
        self, config: SanitizationConfig
    ) -> list[tuple[str, SensitivePattern, Pattern]]:
        """Get enabled patterns based on configuration"""
        enabled_patterns = []

        for name, pattern in self.patterns.items():
            # Check if pattern is explicitly disabled
            if config.disabled_patterns and name in config.disabled_patterns:
                continue

            # Check if category is disabled
            if (
                config.disabled_categories
                and pattern.category in config.disabled_categories
            ):
                continue

            # Check if only specific patterns are enabled
            if config.enabled_patterns and name not in config.enabled_patterns:
                continue

            # Check if only specific categories are enabled
            if (
                config.enabled_categories
                and pattern.category not in config.enabled_categories
            ):
                continue

            enabled_patterns.append((name, pattern, self.compiled_patterns[name]))

        # Sort by confidence (highest first)
        enabled_patterns.sort(key=lambda x: x[1].confidence, reverse=True)
        return enabled_patterns


class ContextSanitizer:
    """Main context sanitization engine"""

    def __init__(
        self,
        pattern_registry: PatternRegistry | None = None,
        config: SanitizationConfig | None = None,
    ) -> None:
        self.pattern_registry = pattern_registry or PatternRegistry()
        self.config = config or SanitizationConfig()
        self.logger = logging.getLogger(__name__)

        if self.config.logging_enabled:
            self.logger.setLevel(logging.INFO)

    def sanitize(self, context: str) -> str:
        """
        Sanitize a single context string

        Args:
            context: The input context to sanitize

        Returns:
            Sanitized context with sensitive data replaced
        """
        if not context:
            return context or ""

        if len(context) > self.config.max_context_size:
            self.logger.warning(
                f"Context size {len(context)} exceeds limit {self.config.max_context_size}"
            )
            context = context[: self.config.max_context_size]

        start_time = time.time()

        try:
            result = self._perform_sanitization(context)

            processing_time = (time.time() - start_time) * 1000
            if self.config.logging_enabled:
                self.logger.info(f"Sanitized context in {processing_time:.2f}ms")

            return result

        except Exception as e:
            self.logger.error(f"Sanitization failed: {e}")
            raise SanitizationError(f"Failed to sanitize context: {e}") from e

    def _perform_sanitization(self, context: str) -> str:
        """Perform the actual sanitization logic"""
        enabled_patterns = self.pattern_registry.get_enabled_patterns(self.config)

        # Track replacements to avoid overlapping matches
        replacements = []

        for _name, pattern, compiled_pattern in enabled_patterns:
            for match in compiled_pattern.finditer(context):
                # Check for overlaps with existing replacements
                if not self._has_overlap(match.span(), replacements):
                    placeholder = self._generate_placeholder(pattern, match, context)
                    replacements.append((match.span(), placeholder))

        # Sort by position (reverse order to maintain indices)
        replacements.sort(key=lambda x: x[0][0], reverse=True)

        # Apply replacements
        result = context
        for (start, end), placeholder in replacements:
            result = result[:start] + placeholder + result[end:]

        return result

    def _has_overlap(self, span: tuple[int, int], existing_replacements: list) -> bool:
        """Check if a span overlaps with existing replacements"""
        start, end = span
        for (existing_start, existing_end), _ in existing_replacements:
            if not (end <= existing_start or start >= existing_end):
                return True
        return False

    def _generate_placeholder(
        self, pattern: SensitivePattern, match: re.Match, context: str
    ) -> str:
        """Generate appropriate placeholder for a match"""
        if callable(pattern.placeholder):
            return pattern.placeholder(match, context)
        else:
            return pattern.placeholder

    def sanitize_batch(self, contexts: list[str]) -> list[str]:
        """
        Sanitize multiple contexts efficiently

        Args:
            contexts: List of context strings to sanitize

        Returns:
            List of sanitized contexts
        """
        if self.config.performance_mode:
            # Optimize for batch processing
            return [self._fast_sanitize(context) for context in contexts]
        else:
            return [self.sanitize(context) for context in contexts]

    def _fast_sanitize(self, context: str) -> str:
        """Fast sanitization for performance mode"""
        # Use simplified patterns for better performance
        # This is a trade-off between speed and accuracy
        simple_patterns = [
            (r"sk-[a-zA-Z0-9]{48}", "sk-***API_KEY***"),
            (r"/Users/[^/\s]+", "/Users/USER"),
            (r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Z|a-z]{2,}", "user@example.com"),
            (r"\b[a-z][a-z0-9-]{4,28}[a-z0-9]\b", "PROJECT_ID"),
        ]

        result = context
        for pattern, replacement in simple_patterns:
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

        return result

    def register_as_hook(self):
        """Register sanitizer as a pre-generation pipeline hook"""
        try:
            from src.utils.pipeline_hooks import register_hook

            register_hook("pre_generation", self.sanitize, priority=100)
            self.logger.info("Registered sanitizer as pre-generation hook")
        except ImportError:
            self.logger.warning("Pipeline hooks module not available")

    def get_statistics(self) -> dict:
        """Get sanitization statistics"""
        return {
            "total_patterns": len(self.pattern_registry.patterns),
            "enabled_patterns": len(
                self.pattern_registry.get_enabled_patterns(self.config)
            ),
            "categories": list(self.pattern_registry.categories.keys()),
            "config": {
                "placeholder_style": self.config.placeholder_style.value,
                "preserve_structure": self.config.preserve_structure,
                "performance_mode": self.config.performance_mode,
            },
        }


# Convenience functions for common use cases
def sanitize_context(context: str, config: SanitizationConfig | None = None) -> str:
    """Quick sanitization function"""
    sanitizer = ContextSanitizer(config=config)
    return sanitizer.sanitize(context)


def create_custom_sanitizer(
    additional_patterns: list[SensitivePattern] | None = None,
    config: SanitizationConfig | None = None,
) -> ContextSanitizer:
    """Create a custom sanitizer with additional patterns"""
    registry = PatternRegistry()

    if additional_patterns:
        for pattern in additional_patterns:
            registry.add_pattern(pattern)

    return ContextSanitizer(pattern_registry=registry, config=config)


# Export main classes and functions
__all__ = [
    "ContextSanitizer",
    "PatternRegistry",
    "PlaceholderGenerator",
    "PlaceholderStyle",
    "SanitizationConfig",
    "SanitizationError",
    "SensitivePattern",
    "create_custom_sanitizer",
    "sanitize_context",
]
