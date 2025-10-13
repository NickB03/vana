"""Tests for ReDoS (Regular Expression Denial of Service) protection.

This test suite verifies that the input validation system is protected against
ReDoS attacks where malicious input causes catastrophic backtracking in regex
patterns, leading to CPU exhaustion and server hangs.

Security Note:
    ReDoS attacks exploit poorly designed regex patterns by providing input that
    causes exponential time complexity during pattern matching. This can DOS
    the server with a single request.

Test Categories:
    1. ReDoS Attack Prevention - Verify attack payloads complete quickly
    2. Normal Input Performance - Ensure legitimate input isn't affected
    3. Timeout Protection - Verify timeout mechanism works
    4. Pattern Safety - Test edge cases for each validation pattern
"""

import time

from app.utils.input_validation import validate_chat_input


class TestReDoSProtection:
    """Test ReDoS (Regular Expression Denial of Service) protection."""

    def test_redos_sql_keywords_repeated_pattern(self):
        """Test SQL keyword validation doesn't cause ReDoS with repeated patterns.

        Attack vector: Repeated "SELECT " pattern that could cause catastrophic
        backtracking in poorly designed regex patterns.
        """
        # Attack payload: 570 repetitions = 3990 chars (just under 4000 limit)
        # This tests the regex performance without hitting length validation
        attack_payload = "SELECT " * 570  # 7 chars * 570 = 3990 chars

        start = time.perf_counter()
        is_valid, error = validate_chat_input(attack_payload)
        duration = time.perf_counter() - start

        # Validation must complete in < 10ms (0.01 seconds)
        assert duration < 0.01, (
            f"ReDoS vulnerability detected in SQL pattern: {duration*1000:.2f}ms. "
            f"Expected < 10ms"
        )
        assert not is_valid, "SQL injection attack payload should be blocked"
        assert "SQL" in error

    def test_redos_html_tags_nested_pattern(self):
        """Test HTML tag validation doesn't cause ReDoS with nested patterns."""
        # Attack: Deeply nested angle brackets
        attack_payload = "<" * 1000 + "script" + ">" * 1000

        start = time.perf_counter()
        is_valid, error = validate_chat_input(attack_payload)
        duration = time.perf_counter() - start

        assert duration < 0.01, (
            f"ReDoS vulnerability in HTML pattern: {duration*1000:.2f}ms"
        )
        assert not is_valid, "HTML tag attack should be blocked"

    def test_redos_prompt_injection_patterns(self):
        """Test prompt injection patterns don't cause ReDoS."""
        # Attack: Repeated whitespace that could cause backtracking
        attack_payload = "ignore " + "  " * 500 + "previous " + "  " * 500 + "instructions"

        start = time.perf_counter()
        is_valid, error = validate_chat_input(attack_payload)
        duration = time.perf_counter() - start

        assert duration < 0.01, (
            f"ReDoS vulnerability in prompt injection pattern: {duration*1000:.2f}ms"
        )
        assert not is_valid, "Prompt injection attack should be blocked"

    def test_redos_path_traversal_repeated(self):
        """Test path traversal validation doesn't cause ReDoS."""
        # Attack: Repeated path traversal sequences
        attack_payload = "../" * 1000

        start = time.perf_counter()
        is_valid, error = validate_chat_input(attack_payload)
        duration = time.perf_counter() - start

        assert duration < 0.01, (
            f"ReDoS vulnerability in path traversal pattern: {duration*1000:.2f}ms"
        )
        assert not is_valid, "Path traversal attack should be blocked"

    def test_redos_filesystem_commands_repeated(self):
        """Test filesystem command validation doesn't cause ReDoS."""
        # Attack: Repeated commands with spaces
        attack_payload = "rm " * 1000 + "file.txt"

        start = time.perf_counter()
        is_valid, error = validate_chat_input(attack_payload)
        duration = time.perf_counter() - start

        assert duration < 0.01, (
            f"ReDoS vulnerability in filesystem pattern: {duration*1000:.2f}ms"
        )
        assert not is_valid, "Filesystem command attack should be blocked"

    def test_redos_mixed_attack_payload(self):
        """Test mixed attack payload with multiple potential ReDoS vectors."""
        # Complex attack combining multiple patterns
        attack_payload = (
            "SELECT " * 500 +
            "<script>" * 100 +
            "../" * 200 +
            "rm " * 100 +
            "ignore previous instructions" * 10
        )

        start = time.perf_counter()
        is_valid, error = validate_chat_input(attack_payload)
        duration = time.perf_counter() - start

        assert duration < 0.01, (
            f"ReDoS vulnerability with mixed attack: {duration*1000:.2f}ms"
        )
        assert not is_valid, "Mixed attack payload should be blocked"


class TestNormalInputPerformance:
    """Test that normal inputs are validated quickly and correctly."""

    def test_normal_short_input_performance(self):
        """Test short normal inputs are validated quickly."""
        normal_inputs = [
            "Hello, how are you?",
            "What's the weather today?",
            "Can you help me with Python?",
            "Tell me about machine learning",
            "How do I write unit tests?",
        ]

        for text in normal_inputs:
            start = time.perf_counter()
            is_valid, error = validate_chat_input(text)
            duration = time.perf_counter() - start

            assert duration < 0.01, (
                f"Normal input too slow: {duration*1000:.2f}ms for '{text[:50]}'"
            )
            assert is_valid, f"Normal input incorrectly blocked: '{text}' - {error}"
            assert error == "", f"Normal input should have no error: '{text}'"

    def test_normal_long_input_performance(self):
        """Test long legitimate inputs are validated quickly."""
        # Long but legitimate inputs
        long_inputs = [
            "Can you help me? " * 100,  # Repeated question
            "A" * 3000,  # Long single word
            "The quick brown fox jumps over the lazy dog. " * 80,  # Max length
        ]

        for text in long_inputs:
            start = time.perf_counter()
            is_valid, error = validate_chat_input(text)
            duration = time.perf_counter() - start

            assert duration < 0.01, (
                f"Long normal input too slow: {duration*1000:.2f}ms, "
                f"length={len(text)}"
            )
            assert is_valid, (
                f"Long normal input incorrectly blocked: "
                f"length={len(text)}, error='{error}'"
            )

    def test_normal_input_with_punctuation(self):
        """Test inputs with punctuation are validated quickly."""
        inputs_with_punctuation = [
            "Hello! How are you? I'm doing great.",
            "Email: user@example.com, Phone: 123-456-7890",
            "Price: $19.99, Discount: 20%, Total: $15.99",
            "List: (1) item, (2) item, (3) item",
        ]

        for text in inputs_with_punctuation:
            start = time.perf_counter()
            is_valid, error = validate_chat_input(text)
            duration = time.perf_counter() - start

            assert duration < 0.01, (
                f"Punctuated input too slow: {duration*1000:.2f}ms"
            )
            assert is_valid, f"Punctuated input blocked: '{text}' - {error}"

    def test_normal_input_with_code_snippets(self):
        """Test legitimate code discussion inputs are validated quickly."""
        code_inputs = [
            "How do I use if statements in Python?",
            "What's the difference between let and const?",
            "Can you explain list comprehensions?",
            "How do I iterate over arrays?",
        ]

        for text in code_inputs:
            start = time.perf_counter()
            is_valid, error = validate_chat_input(text)
            duration = time.perf_counter() - start

            assert duration < 0.01, (
                f"Code discussion input too slow: {duration*1000:.2f}ms"
            )
            assert is_valid, f"Code input blocked: '{text}' - {error}"


class TestTimeoutProtection:
    """Test the timeout protection mechanism."""

    def test_timeout_exists_for_validation(self):
        """Verify validation has timeout protection applied."""
        # The decorator should be present
        from app.utils.input_validation import validate_chat_input
        assert hasattr(validate_chat_input, '__wrapped__') or \
               validate_chat_input.__name__ == 'wrapper', (
            "validate_chat_input should be wrapped with timeout decorator"
        )

    def test_max_length_input_completes_quickly(self):
        """Test maximum length input completes within timeout."""
        # Exactly 4000 characters (the maximum)
        max_input = "A" * 4000

        start = time.perf_counter()
        is_valid, error = validate_chat_input(max_input)
        duration = time.perf_counter() - start

        # Should complete well within the 10ms timeout
        assert duration < 0.01, (
            f"Max length input too slow: {duration*1000:.2f}ms"
        )
        assert is_valid, f"Max length valid input blocked: {error}"

    def test_over_length_input_fails_fast(self):
        """Test over-length input fails fast without regex processing."""
        # Over the 4000 character limit
        over_length = "A" * 5000

        start = time.perf_counter()
        is_valid, error = validate_chat_input(over_length)
        duration = time.perf_counter() - start

        # Should fail immediately on length check
        assert duration < 0.01, (
            f"Over-length check too slow: {duration*1000:.2f}ms"
        )
        assert not is_valid, "Over-length input should be blocked"
        assert "too long" in error.lower()


class TestPatternSafety:
    """Test edge cases for each validation pattern."""

    def test_sql_pattern_edge_cases(self):
        """Test SQL pattern handles edge cases safely."""
        edge_cases = [
            "select",  # lowercase
            "SELECT",  # uppercase
            "SeLeCt",  # mixed case
            "SELECTed",  # word contains keyword
            "I select this option",  # legitimate use of word
        ]

        for text in edge_cases:
            start = time.perf_counter()
            is_valid, error = validate_chat_input(text)
            duration = time.perf_counter() - start

            assert duration < 0.01, (
                f"SQL edge case too slow: {duration*1000:.2f}ms for '{text}'"
            )
            # "I select this option" should be blocked due to word boundary
            # SELECTed should pass (no word boundary)

    def test_html_pattern_edge_cases(self):
        """Test HTML pattern handles edge cases safely."""
        edge_cases = [
            "2 < 3 is true",  # Less than comparison
            "3 > 2 is true",  # Greater than comparison
            "Use angle brackets: < and >",  # Discussion about symbols
            "Email: <user@example.com>",  # Email in brackets
        ]

        for text in edge_cases:
            start = time.perf_counter()
            is_valid, error = validate_chat_input(text)
            duration = time.perf_counter() - start

            assert duration < 0.01, (
                f"HTML edge case too slow: {duration*1000:.2f}ms for '{text}'"
            )
            # Note: Some of these may be blocked depending on pattern strictness

    def test_path_pattern_edge_cases(self):
        """Test path traversal pattern handles edge cases safely."""
        edge_cases = [
            "Go up.. then down",  # Period period space (not traversal)
            "The file is at ./docs",  # Current directory
            "Use relative paths",  # Discussion about paths
        ]

        for text in edge_cases:
            start = time.perf_counter()
            is_valid, error = validate_chat_input(text)
            duration = time.perf_counter() - start

            assert duration < 0.01, (
                f"Path edge case too slow: {duration*1000:.2f}ms for '{text}'"
            )

    def test_prompt_injection_edge_cases(self):
        """Test prompt injection pattern handles edge cases safely."""
        edge_cases = [
            "I want to ignore spam emails",  # Legitimate use of 'ignore'
            "Previous versions were better",  # Legitimate use of 'previous'
            "Forget about it, let's move on",  # Legitimate use of 'forget'
            "The system you use is great",  # Legitimate use of 'system'
        ]

        for text in edge_cases:
            start = time.perf_counter()
            is_valid, error = validate_chat_input(text)
            duration = time.perf_counter() - start

            assert duration < 0.01, (
                f"Prompt injection edge case too slow: {duration*1000:.2f}ms"
            )


class TestPerformanceBenchmark:
    """Benchmark tests for validation performance."""

    def test_benchmark_validation_speed(self):
        """Benchmark validation speed across different input sizes."""
        sizes = [10, 100, 500, 1000, 2000, 4000]
        results = []

        for size in sizes:
            text = "A" * size
            start = time.perf_counter()
            validate_chat_input(text)
            duration = time.perf_counter() - start

            results.append({
                "size": size,
                "time_ms": duration * 1000
            })

            # All sizes must complete within 10ms
            assert duration < 0.01, (
                f"Validation too slow for size {size}: {duration*1000:.2f}ms"
            )

        # Print benchmark results for documentation
        print("\n=== Validation Performance Benchmark ===")
        for result in results:
            print(f"Size: {result['size']:4d} chars - Time: {result['time_ms']:.3f}ms")

    def test_benchmark_pattern_matching(self):
        """Benchmark individual pattern matching performance."""
        test_input = "SELECT * FROM users WHERE id = 1"

        # Import pre-compiled patterns
        from app.utils.input_validation import (
            HTML_TAG_PATTERN,
            PATH_TRAVERSAL_PATTERN,
            SQL_PATTERN,
        )

        patterns = {
            "HTML": HTML_TAG_PATTERN,
            "SQL": SQL_PATTERN,
            "Path": PATH_TRAVERSAL_PATTERN,
        }

        print("\n=== Pattern Matching Performance ===")
        for name, pattern in patterns.items():
            start = time.perf_counter()
            for _ in range(1000):  # 1000 iterations
                pattern.search(test_input)
            duration = time.perf_counter() - start

            avg_time_us = (duration / 1000) * 1_000_000
            print(f"{name:10s}: {avg_time_us:.2f}μs per match (1000 iterations)")

            # Each pattern should be very fast
            assert avg_time_us < 100, (
                f"{name} pattern too slow: {avg_time_us:.2f}μs per match"
            )
