"""
Unit tests for UI/UX Specialist

Tests all 6 UI/UX tools and the specialist agent configuration.
"""

import os
from unittest.mock import Mock, mock_open, patch

import pytest

from agents.specialists.ui_specialist import (
    analyze_accessibility,
    analyze_user_flow,
    check_responsive_layout,
    generate_ui_component,
    profile_ui_performance,
    ui_specialist,
    validate_design_system,
)


class TestAnalyzeAccessibility:
    """Test suite for accessibility analyzer."""

    @pytest.fixture
    def sample_html(self):
        """Sample HTML for testing."""
        return """
<html>
<body>
    <img src="logo.png" alt="Company Logo">
    <img src="banner.jpg">
    <form>
        <label for="name">Name:</label>
        <input type="text" id="name">
        <input type="email" id="email">
        <input type="hidden" id="token">
    </form>
    <h1>Main Title</h1>
    <h3>Subsection</h3>
    <div tabindex="0" aria-label="Interactive element">Content</div>
</body>
</html>
"""

    def test_analyze_accessibility_success(self, sample_html):
        """Test successful accessibility analysis."""
        result = analyze_accessibility(sample_html)

        assert "violations" in result
        assert "warnings" in result
        assert "passes" in result
        assert "score" in result

        # Should find missing alt text
        violations = result["violations"]
        assert any(v["type"] == "missing_alt_text" for v in violations)

        # Should find missing label
        assert any(v["type"] == "missing_label" for v in violations)

        # Should find heading skip warning
        warnings = result["warnings"]
        assert any(w["type"] == "heading_skip" for w in warnings)

        # Should find keyboard navigation
        passes = result["passes"]
        assert any(p["type"] == "keyboard_navigation" for p in passes)
        assert any(p["type"] == "aria_support" for p in passes)

    def test_analyze_accessibility_wcag_levels(self):
        """Test different WCAG compliance levels."""
        simple_html = '<img src="test.jpg" alt="Test">'

        # Test AA level
        result_aa = analyze_accessibility(simple_html, wcag_level="AA")
        assert result_aa["wcag_level"] == "AA"

        # Test AAA level
        result_aaa = analyze_accessibility(simple_html, wcag_level="AAA")
        assert result_aaa["wcag_level"] == "AAA"
        if result_aaa["score"] < 90:
            assert any("AAA compliance" in rec for rec in result_aaa["recommendations"])

    def test_analyze_accessibility_empty_content(self):
        """Test accessibility analysis with empty content."""
        result = analyze_accessibility("")

        assert result["score"] == 0
        assert len(result["violations"]) == 0
        assert len(result["passes"]) == 0


class TestGenerateUIComponent:
    """Test suite for UI component generator."""

    def test_generate_button_component(self):
        """Test button component generation."""
        result = generate_ui_component("button")

        assert result["component_type"] == "button"
        assert result["framework"] == "react"
        assert "Button" in result["code"]
        assert "interface ButtonProps" in result["code"]
        assert "aria-label" in result["code"]
        assert len(result["accessibility_features"]) > 0
        assert "aria-label support" in result["accessibility_features"]

    def test_generate_card_component(self):
        """Test card component generation."""
        result = generate_ui_component("card", framework="react")

        assert result["component_type"] == "card"
        assert "Card" in result["code"]
        assert "<article" in result["code"]  # Semantic HTML
        assert "imageAlt" in result["code"]  # Alt text handling
        assert "semantic HTML" in str(result["accessibility_features"])

    def test_generate_form_component(self):
        """Test form component generation."""
        result = generate_ui_component("form", include_styles=True)

        assert result["component_type"] == "form"
        assert "Form" in result["code"]
        assert "htmlFor=" in result["code"]  # Label associations
        assert "aria-invalid" in result["code"]
        assert "aria-describedby" in result["code"]
        assert result["styles"] != ""

        # Check accessibility features
        assert "label associations" in result["accessibility_features"]
        assert "aria-invalid states" in result["accessibility_features"]

    def test_generate_component_with_props(self):
        """Test component generation with custom props."""
        props = {"variant": "primary", "size": "large"}
        result = generate_ui_component("button", props=props)

        assert result["usage_example"] == "<Button />"

    def test_generate_unknown_component(self):
        """Test handling of unknown component type."""
        result = generate_ui_component("unknown_component")

        # Should return basic structure even for unknown types
        assert result["component_type"] == "unknown_component"
        assert result["code"] == ""  # No code generated for unknown type


class TestValidateDesignSystem:
    """Test suite for design system validator."""

    @patch("os.walk")
    def test_validate_design_system_success(self, mock_walk):
        """Test successful design system validation."""
        mock_walk.return_value = [("/components", [], ["Button.tsx", "Card.tsx", "Modal.tsx", "Form.tsx"])]

        result = validate_design_system("/components")

        assert result["components_analyzed"] == 4
        assert "consistency_score" in result
        assert "design_tokens_usage" in result
        assert "colors" in result["design_tokens_usage"]
        assert len(result["recommendations"]) > 0

    def test_validate_design_system_with_custom_tokens(self):
        """Test validation with custom design tokens."""
        custom_tokens = {"colors": ["brand-primary", "brand-secondary"], "spacing": ["space-1", "space-2", "space-3"]}

        result = validate_design_system("/components", design_tokens=custom_tokens)

        assert "consistency_score" in result
        assert result["consistency_score"] >= 0

    def test_validate_design_system_consistency_check(self):
        """Test consistency checking."""
        result = validate_design_system("/components", check_consistency=True)

        # Should find some simulated issues
        if result["issues"]:
            assert any(issue["type"] == "inconsistent_spacing" for issue in result["issues"])
            assert result["consistency_score"] < 100


class TestCheckResponsiveLayout:
    """Test suite for responsive layout checker."""

    @pytest.fixture
    def mobile_first_css(self):
        """Mobile-first CSS sample."""
        return """
.container {
    width: 100%;
    padding: 1rem;
}

@media (min-width: 640px) {
    .container { padding: 2rem; }
}

@media (min-width: 768px) {
    .container { max-width: 768px; }
}

@media (min-width: 1024px) {
    .container { 
        max-width: 1024px;
        display: flex;
    }
}
"""

    @pytest.fixture
    def desktop_first_css(self):
        """Desktop-first CSS sample."""
        return """
.container {
    max-width: 1200px;
    display: grid;
}

@media (max-width: 1024px) {
    .container { max-width: 100%; }
}

@media (max-width: 768px) {
    .container { display: block; }
}

@media (max-width: 640px) {
    .container { padding: 1rem; }
}
"""

    def test_check_responsive_mobile_first(self, mobile_first_css):
        """Test mobile-first approach detection."""
        result = check_responsive_layout(mobile_first_css)

        assert result["mobile_first"] is True
        assert len(result["breakpoints_found"]) > 0

        # Check breakpoint types
        min_widths = [bp for bp in result["breakpoints_found"] if bp["type"] == "min-width"]
        assert len(min_widths) >= 3

    def test_check_responsive_desktop_first(self, desktop_first_css):
        """Test desktop-first approach detection."""
        result = check_responsive_layout(desktop_first_css)

        assert result["mobile_first"] is False
        assert any(issue["type"] == "desktop_first_approach" for issue in result["issues"])
        assert "mobile-first approach" in " ".join(result["recommendations"])

    def test_check_responsive_custom_breakpoints(self):
        """Test custom breakpoint checking."""
        css = "@media (min-width: 500px) { }"
        custom_breakpoints = [500, 800, 1200]

        result = check_responsive_layout(css, breakpoints=custom_breakpoints)

        assert result["coverage"]["500px"] is True
        assert result["coverage"]["800px"] is False
        assert result["coverage"]["1200px"] is False

    def test_check_responsive_modern_techniques(self, mobile_first_css):
        """Test detection of modern layout techniques."""
        result = check_responsive_layout(mobile_first_css)

        assert result["coverage"].get("flexbox") is True
        # Grid not in sample
        assert result["coverage"].get("css_grid") is None or False


class TestProfileUIPerformance:
    """Test suite for UI performance profiler."""

    def test_profile_button_performance(self):
        """Test profiling button component performance."""
        result = profile_ui_performance("Button", render_count=100)

        assert result["component"] == "Button"
        assert result["render_count"] == 100
        assert "metrics" in result

        # Check render time metrics
        assert "render_time" in result["metrics"]
        render_time = result["metrics"]["render_time"]
        assert render_time["initial"] <= 10  # Button should be fast
        assert render_time["unit"] == "ms"

        # Should not have bottlenecks for simple button
        slow_renders = [b for b in result["bottlenecks"] if b["type"] == "slow_initial_render"]
        assert len(slow_renders) == 0

    def test_profile_complex_component_performance(self):
        """Test profiling complex component performance."""
        result = profile_ui_performance("ComplexDataTable", metrics=["render_time", "rerender_count"])

        # Complex component should have higher metrics
        render_time = result["metrics"]["render_time"]
        assert render_time["initial"] > 10

        # Should detect bottlenecks
        assert len(result["bottlenecks"]) > 0
        assert any(b["type"] == "slow_initial_render" for b in result["bottlenecks"])

        # Should have optimization suggestions
        assert len(result["optimizations"]) > 0
        assert any(opt["technique"] == "React.memo" for opt in result["optimizations"])

    def test_profile_custom_metrics(self):
        """Test profiling with custom metrics."""
        custom_metrics = ["bundle_size", "memory_usage"]
        result = profile_ui_performance("Card", metrics=custom_metrics, render_count=50)

        assert "bundle_size" in result["metrics"]
        assert "memory_usage" in result["metrics"]
        assert "render_time" not in result["metrics"]

        # Check bundle size metrics
        bundle = result["metrics"]["bundle_size"]
        assert bundle["gzipped"] < bundle["raw"]

    def test_profile_memory_leaks(self):
        """Test memory usage profiling."""
        result = profile_ui_performance("LeakyComponent", metrics=["memory_usage"], render_count=1000)

        memory = result["metrics"]["memory_usage"]
        assert memory["peak"] > memory["initial"]
        assert memory["after_renders"] > memory["initial"]


class TestAnalyzeUserFlow:
    """Test suite for user flow analyzer."""

    @pytest.fixture
    def simple_flow(self):
        """Simple user flow definition."""
        return {
            "name": "Login Flow",
            "steps": [
                {"name": "Enter Email", "type": "form_input", "fields": 1},
                {"name": "Enter Password", "type": "form_input", "fields": 1},
                {"name": "Submit", "type": "button_click"},
                {"name": "Validate", "type": "validation"},
                {"name": "Load Dashboard", "type": "page_load"},
            ],
        }

    @pytest.fixture
    def complex_flow(self):
        """Complex user flow with friction points."""
        return {
            "name": "Registration Flow",
            "steps": [
                {"name": "Personal Info", "type": "form_input", "fields": 8},
                {"name": "Verify Email", "type": "api_call"},
                {"name": "Wait", "type": "page_load"},
                {"name": "Payment Info", "type": "payment"},
                {"name": "Review", "type": "form_input", "fields": 3},
                {"name": "Submit", "type": "button_click"},
                {"name": "Process", "type": "api_call"},
                {"name": "Confirm", "type": "confirmation"},
            ],
        }

    def test_analyze_simple_flow(self, simple_flow):
        """Test analysis of simple user flow."""
        result = analyze_user_flow(simple_flow)

        assert result["flow_name"] == "Login Flow"
        assert result["total_steps"] == 5
        assert result["estimated_completion_time"] > 0

        # Simple flow should have minimal friction
        assert len(result["friction_points"]) == 0 or len(result["friction_points"]) <= 1

    def test_analyze_complex_flow_friction(self, complex_flow):
        """Test friction point identification."""
        result = analyze_user_flow(complex_flow, identify_friction=True)

        # Should identify complex form
        friction_points = result["friction_points"]
        assert any(fp["type"] == "complex_form" for fp in friction_points)
        assert any(fp["severity"] == "high" for fp in friction_points)

        # Should identify missing feedback
        assert any(fp["type"] == "missing_feedback" for fp in friction_points)

    def test_analyze_flow_drop_off_risks(self, complex_flow):
        """Test drop-off risk identification."""
        result = analyze_user_flow(complex_flow)

        drop_offs = result["drop_off_risks"]
        assert len(drop_offs) > 0

        # Payment step should be high risk
        payment_risks = [r for r in drop_offs if "Payment" in r["step"]]
        assert len(payment_risks) > 0
        assert payment_risks[0]["risk_level"] == "high"

    def test_analyze_flow_improvements(self, complex_flow):
        """Test improvement suggestions."""
        result = analyze_user_flow(complex_flow, suggest_improvements=True)

        improvements = result["improvements"]
        assert len(improvements) > 0

        # Should suggest simplification for 8 steps
        assert any(imp["type"] == "simplification" for imp in improvements)

        # Should suggest progressive disclosure for complex form
        assert any(imp["type"] == "progressive_disclosure" for imp in improvements)

    def test_analyze_flow_accessibility(self):
        """Test accessibility gap detection."""
        flow = {
            "name": "Timer Flow",
            "steps": [
                {"name": "Start", "type": "button_click"},
                {"name": "Timer", "type": "timer", "pause_option": False},
                {"name": "Submit", "type": "button_click", "keyboard_accessible": False},
            ],
        }

        result = analyze_user_flow(flow)

        accessibility_gaps = result["accessibility_gaps"]
        assert len(accessibility_gaps) >= 2
        assert any(gap["wcag"] == "2.2.1" for gap in accessibility_gaps)  # Timer
        assert any(gap["wcag"] == "2.1.1" for gap in accessibility_gaps)  # Keyboard


class TestUIUXSpecialistAgent:
    """Test suite for UI/UX specialist agent configuration."""

    def test_ui_specialist_configuration(self):
        """Test UI/UX specialist agent is properly configured."""
        assert ui_specialist.name == "UIUXSpecialist"
        assert ui_specialist.model == "gemini-2.0-flash"
        assert len(ui_specialist.tools) == 6

        # Check all tools are present
        tool_names = [tool.func.__name__ for tool in ui_specialist.tools]
        expected_tools = [
            "analyze_accessibility",
            "generate_ui_component",
            "validate_design_system",
            "check_responsive_layout",
            "profile_ui_performance",
            "analyze_user_flow",
        ]

        for expected in expected_tools:
            assert expected in tool_names

    def test_ui_specialist_instruction(self):
        """Test UI/UX specialist has appropriate instruction."""
        assert "UI/UX specialist" in ui_specialist.instruction
        assert "accessible" in ui_specialist.instruction
        assert "user-friendly interfaces" in ui_specialist.instruction


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
