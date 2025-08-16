"""
Context Sanitizer Integration Examples

Demonstrates how to integrate the context sanitization engine
with Claude Code's generation pipeline and various use cases.
"""

import logging
from typing import Any

from .context_sanitizer import (
    ContextSanitizer,
    PlaceholderStyle,
    SanitizationConfig,
    SensitivePattern,
    create_custom_sanitizer,
)
from .pipeline_hooks import HookPriority, register_hook


class SanitizerIntegration:
    """Integration manager for context sanitization"""

    def __init__(self):
        self.sanitizer = ContextSanitizer()
        self.logger = logging.getLogger(__name__)
        self._setup_default_integration()

    def _setup_default_integration(self):
        """Setup default integration with Claude Code pipeline"""
        # Register as high-priority pre-generation hook
        register_hook(
            "pre_generation",
            self._sanitize_context_hook,
            priority=HookPriority.HIGH.value,
        )

        self.logger.info("Context sanitizer integrated with generation pipeline")

    def _sanitize_context_hook(self, context: str, **kwargs) -> str:
        """Hook function for sanitizing context before generation"""
        try:
            sanitized = self.sanitizer.sanitize(context)

            # Log if sensitive data was found and replaced
            if sanitized != context:
                self.logger.info("Sensitive data detected and sanitized in context")

            return sanitized

        except Exception as e:
            self.logger.error(f"Context sanitization failed: {e}")
            # Return original context if sanitization fails
            return context

    def configure_for_project(self, project_config: dict[str, Any]):
        """Configure sanitizer for specific project needs"""
        config = SanitizationConfig(
            enabled_patterns=project_config.get("enabled_patterns"),
            disabled_patterns=project_config.get("disabled_patterns"),
            placeholder_style=PlaceholderStyle(
                project_config.get("placeholder_style", "contextual")
            ),
            performance_mode=project_config.get("performance_mode", False),
        )

        self.sanitizer = ContextSanitizer(config=config)
        self.logger.info("Sanitizer configured for project-specific needs")


def setup_vana_project_sanitization():
    """Setup sanitization specifically for the Vana project"""

    # Vana-specific patterns
    vana_patterns = [
        SensitivePattern(
            name="vana_project_paths",
            pattern=r"/Users/[^/]+/Development/vana[^\s]*",
            placeholder=lambda m, c: m.group(0).replace(
                m.group(0).split("/")[2], "USER"
            ),
            confidence=0.95,
            category="vana_specific",
            description="Vana project file paths",
        ),
        SensitivePattern(
            name="adk_project_id",
            pattern=r"analystai-454200",
            placeholder="your-adk-project-id",
            confidence=1.0,
            category="vana_specific",
            description="Vana ADK project ID",
        ),
        SensitivePattern(
            name="vana_bucket_names",
            pattern=r"vana-(?:logs-data|builds|session-storage)",
            placeholder="your-vana-bucket",
            confidence=0.95,
            category="vana_specific",
            description="Vana Google Cloud Storage buckets",
        ),
    ]

    # Configuration for Vana development
    config = SanitizationConfig(
        enabled_categories=["authentication", "infrastructure", "vana_specific"],
        placeholder_style=PlaceholderStyle.CONTEXTUAL,
        preserve_structure=True,
        performance_mode=False,  # Prioritize accuracy for development
    )

    # Create custom sanitizer
    sanitizer = create_custom_sanitizer(vana_patterns, config)

    # Integrate with pipeline
    integration = SanitizerIntegration()
    integration.sanitizer = sanitizer

    return integration


def demo_sanitization_examples():
    """Demonstrate various sanitization scenarios"""

    sanitizer = ContextSanitizer()

    examples = [
        # Example 1: Environment configuration
        """
        # .env.local configuration
        GOOGLE_CLOUD_PROJECT=analystai-454200
        OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef12345678
        BRAVE_API_KEY=BSA-1234567890
        DATABASE_URL=postgresql://user:password@localhost:5432/vana
        """,
        # Example 2: Code with file paths
        """
        def load_config():
            config_path = "/Users/nick/Development/vana/.env.local"
            with open(config_path) as f:
                return f.read()
        """,
        # Example 3: API integration code
        """
        import openai

        openai.api_key = "sk-abcd1234567890efgh1234567890ijkl1234567890"

        def query_api():
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[{"role": "user", "content": "Hello"}]
            )
            return response
        """,
        # Example 4: Cloud configuration
        """
        PROJECT_ID = "analystai-454200"
        REGION = "us-central1"
        BUCKET_NAME = "vana-logs-data"

        def setup_cloud_client():
            from google.cloud import storage
            client = storage.Client(project=PROJECT_ID)
            bucket = client.bucket(BUCKET_NAME)
            return bucket
        """,
        # Example 5: Docker and deployment
        """
        # Dockerfile
        ENV GOOGLE_CLOUD_PROJECT=analystai-454200
        ENV API_KEY=sk-1234567890abcdef1234567890abcdef12345678

        # Deploy script
        gcloud run deploy vana \\
          --project=analystai-454200 \\
          --region=us-central1 \\
          --source=/Users/nick/Development/vana
        """,
    ]

    print("🔒 Context Sanitization Examples\n")
    print("=" * 50)

    for i, example in enumerate(examples, 1):
        print(f"\n📄 Example {i}: Original")
        print("-" * 30)
        print(example.strip())

        sanitized = sanitizer.sanitize(example)

        print(f"\n🛡️  Example {i}: Sanitized")
        print("-" * 30)
        print(sanitized.strip())
        print("\n" + "=" * 50)


def benchmark_performance():
    """Benchmark sanitization performance"""
    import time

    sanitizer = ContextSanitizer()

    # Generate test contexts of various sizes
    test_sizes = [1024, 10 * 1024, 100 * 1024]  # 1KB, 10KB, 100KB

    for size in test_sizes:
        # Create test context with mixed sensitive data
        context = generate_test_context(size)

        # Measure performance
        start_time = time.time()
        sanitizer.sanitize(context)
        end_time = time.time()

        processing_time = (end_time - start_time) * 1000  # ms

        print(f"📊 Performance: {size // 1024}KB context")
        print(f"   Processing time: {processing_time:.2f}ms")
        print(
            f"   Target: {'✅ PASS' if processing_time < (100 if size <= 10 * 1024 else 1000) else '❌ FAIL'}"
        )
        print()


def generate_test_context(size_bytes: int) -> str:
    """Generate test context with sensitive data patterns"""
    patterns = [
        "GOOGLE_CLOUD_PROJECT=analystai-454200\n",
        "OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef12345678\n",
        "File path: /Users/nick/Development/vana/src/main.py\n",
        "Email: developer@example.com\n",
        "Server: 192.168.1.100:8080\n",
        "Database: postgresql://user:pass@db.example.com:5432/app\n",
        "JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature\n",
        "Normal code line without sensitive data\n",
    ]

    content = ""
    i = 0
    while len(content.encode()) < size_bytes:
        content += patterns[i % len(patterns)]
        i += 1

    return content[:size_bytes]


def validate_integration():
    """Validate that integration is working correctly"""
    from .pipeline_hooks import execute_hooks

    # Test context with sensitive data
    test_context = """
    Project configuration:
    GOOGLE_CLOUD_PROJECT=analystai-454200
    API_KEY=sk-1234567890abcdef1234567890abcdef12345678
    Config path: /Users/nick/Development/vana/.env.local
    """

    # Execute pre-generation hooks (should include sanitization)
    sanitized_context = execute_hooks("pre_generation", test_context)

    # Validate sanitization occurred
    sensitive_patterns = [
        "analystai-454200",
        "sk-1234567890abcdef1234567890abcdef12345678",
        "/Users/nick/",
    ]

    all_sanitized = all(
        pattern not in sanitized_context for pattern in sensitive_patterns
    )

    print(f"🔍 Integration Validation: {'✅ PASS' if all_sanitized else '❌ FAIL'}")

    if not all_sanitized:
        print("❌ Some sensitive patterns were not sanitized:")
        for pattern in sensitive_patterns:
            if pattern in sanitized_context:
                print(f"   - {pattern}")

    return all_sanitized


if __name__ == "__main__":
    # Setup Vana project sanitization
    print("🚀 Setting up Vana project sanitization...")
    integration = setup_vana_project_sanitization()

    # Run demonstrations
    print("\n📋 Running sanitization examples...")
    demo_sanitization_examples()

    print("\n⚡ Running performance benchmarks...")
    benchmark_performance()

    print("\n✅ Validating integration...")
    validate_integration()

    print("\n🎉 Context sanitization setup complete!")

    # Print statistics
    stats = integration.sanitizer.get_statistics()
    print("\n📊 Sanitizer Statistics:")
    print(f"   - Total patterns: {stats['total_patterns']}")
    print(f"   - Enabled patterns: {stats['enabled_patterns']}")
    print(f"   - Categories: {', '.join(stats['categories'])}")
    print(f"   - Configuration: {stats['config']}")
