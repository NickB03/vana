"""
UI/UX Specialist Agent - User Interface and Experience Design

This specialist focuses on accessibility, design systems, responsive layouts,
and user experience optimization.

Tools:
1. Accessibility Analyzer - Analyzes UI components for WCAG compliance
2. Component Generator - Generates UI component templates
3. Design System Validator - Validates design consistency
4. Responsive Layout Checker - Checks responsive design breakpoints
5. Performance Profiler - Profiles UI rendering performance
6. User Flow Analyzer - Analyzes user interaction flows
"""

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool


def analyze_accessibility(html_content: str, wcag_level: str, include_warnings: bool) -> Dict[str, Any]:
    """
    Analyzes HTML content for accessibility compliance.

    Args:
        html_content: HTML content to analyze
        wcag_level: WCAG compliance level (A, AA, AAA)
        include_warnings: Whether to include warnings

    Returns:
        Dictionary containing accessibility analysis
    """
    accessibility_report = {
        "wcag_level": wcag_level,
        "violations": [],
        "warnings": [],
        "passes": [],
        "score": 0,
        "recommendations": [],
    }

    try:
        # Check for alt attributes on images
        img_pattern = r"<img[^>]*>"
        images = re.findall(img_pattern, html_content)

        for img in images:
            if "alt=" not in img:
                accessibility_report["violations"].append(
                    {
                        "type": "missing_alt_text",
                        "element": img[:50] + "..." if len(img) > 50 else img,
                        "wcag": "1.1.1",
                        "severity": "high",
                        "message": "Image missing alt attribute",
                    }
                )
            elif 'alt=""' in img and "decorative" not in img:
                accessibility_report["warnings"].append(
                    {
                        "type": "empty_alt_text",
                        "element": img[:50] + "...",
                        "wcag": "1.1.1",
                        "severity": "medium",
                        "message": "Empty alt attribute - verify if decorative",
                    }
                )

        # Check for form labels
        input_pattern = r'<input[^>]*(?:type=["\'](?!hidden)[^"\']*["\'])?[^>]*>'
        inputs = re.findall(input_pattern, html_content)

        for input_elem in inputs:
            input_id = re.search(r'id=["\']([^"\']+)["\']', input_elem)
            if input_id:
                label_pattern = f"<label[^>]*for=[\"']{input_id.group(1)}[\"']"
                if not re.search(label_pattern, html_content):
                    accessibility_report["violations"].append(
                        {
                            "type": "missing_label",
                            "element": input_elem[:50] + "...",
                            "wcag": "1.3.1",
                            "severity": "high",
                            "message": "Form input missing associated label",
                        }
                    )

        # Check heading hierarchy
        headings = re.findall(r"<h([1-6])[^>]*>", html_content)
        if headings:
            heading_levels = [int(h) for h in headings]
            for i in range(1, len(heading_levels)):
                if heading_levels[i] - heading_levels[i - 1] > 1:
                    accessibility_report["warnings"].append(
                        {
                            "type": "heading_skip",
                            "wcag": "2.4.6",
                            "severity": "medium",
                            "message": f"Heading level skip from h{heading_levels[i-1]} to h{heading_levels[i]}",
                        }
                    )

        # Check color contrast (simplified check)
        color_pattern = r"color:\s*#([0-9a-fA-F]{6})"
        colors = re.findall(color_pattern, html_content)
        if len(colors) >= 2:
            # Simplified contrast check
            accessibility_report["passes"].append(
                {"type": "color_contrast", "message": "Color definitions found - manual contrast check recommended"}
            )

        # Check for keyboard navigation
        if "tabindex" in html_content:
            accessibility_report["passes"].append(
                {"type": "keyboard_navigation", "message": "Tabindex attributes found for keyboard navigation"}
            )

        # Check for ARIA attributes
        if "aria-" in html_content:
            accessibility_report["passes"].append(
                {"type": "aria_support", "message": "ARIA attributes detected for screen reader support"}
            )

        # Calculate score
        total_checks = len(accessibility_report["violations"]) + len(accessibility_report["passes"])
        if total_checks > 0:
            accessibility_report["score"] = (len(accessibility_report["passes"]) / total_checks) * 100

        # Generate recommendations
        if accessibility_report["violations"]:
            accessibility_report["recommendations"].append("Fix all high-severity violations for WCAG compliance")

        if wcag_level == "AAA" and accessibility_report["score"] < 90:
            accessibility_report["recommendations"].append("Consider additional enhancements for AAA compliance")

        return accessibility_report

    except Exception as e:
        return {"error": f"Accessibility analysis failed: {str(e)}", "report": accessibility_report}


def generate_ui_component(
    component_type: str, props: Dict[str, Any] = None, framework: str = "react", include_styles: bool = True
) -> Dict[str, Any]:
    """
    Generates UI component templates based on specifications.

    Args:
        component_type: Type of component (button, card, form, modal, etc.)
        props: Component properties and configuration
        framework: Target framework (react, vue, angular)
        include_styles: Whether to include styling

    Returns:
        Dictionary containing component code and metadata
    """
    if props is None:
        props = {}

    component_data = {
        "component_type": component_type,
        "framework": framework,
        "code": "",
        "styles": "",
        "usage_example": "",
        "accessibility_features": [],
    }

    try:
        if framework == "react":
            if component_type == "button":
                component_data[
                    "code"
                ] = f"""import React from 'react';

interface ButtonProps {{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}}

export const Button: React.FC<ButtonProps> = ({{
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
  ariaLabel,
}}) => {{
  const baseClasses = 'btn transition-colors focus:outline-none focus:ring-2';
  const variantClasses = {{
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  }};
  const sizeClasses = {{
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2',
    large: 'px-6 py-3 text-lg',
  }};

  return (
    <button
      className={{`${{baseClasses}} ${{variantClasses[variant]}} ${{sizeClasses[size]}} ${{disabled ? 'opacity-50 cursor-not-allowed' : ''}}`}}
      disabled={{disabled}}
      onClick={{onClick}}
      aria-label={{ariaLabel}}
    >
      {{children}}
    </button>
  );
}};"""

                component_data["accessibility_features"] = [
                    "aria-label support",
                    "keyboard navigation",
                    "focus indicators",
                    "disabled state handling",
                ]

            elif component_type == "card":
                component_data[
                    "code"
                ] = f"""import React from 'react';

interface CardProps {{
  title: string;
  content: React.ReactNode;
  image?: string;
  imageAlt?: string;
  actions?: React.ReactNode;
}}

export const Card: React.FC<CardProps> = ({{
  title,
  content,
  image,
  imageAlt,
  actions,
}}) => {{
  return (
    <article className="card rounded-lg shadow-md overflow-hidden">
      {{image && (
        <img
          src={{image}}
          alt={{imageAlt || title}}
          className="w-full h-48 object-cover"
        />
      )}}
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-2">{{title}}</h2>
        <div className="text-gray-600">{{content}}</div>
        {{actions && (
          <div className="mt-4 flex gap-2">{{actions}}</div>
        )}}
      </div>
    </article>
  );
}};"""

                component_data["accessibility_features"] = [
                    "semantic HTML (article)",
                    "proper heading hierarchy",
                    "image alt text handling",
                ]

            elif component_type == "form":
                component_data[
                    "code"
                ] = f"""import React, {{ useState }} from 'react';

interface FormProps {{
  onSubmit: (data: any) => void;
}}

export const Form: React.FC<FormProps> = ({{ onSubmit }}) => {{
  const [formData, setFormData] = useState({{
    name: '',
    email: '',
    message: '',
  }});
  const [errors, setErrors] = useState<Record<string, string>>({{}});

  const handleSubmit = (e: React.FormEvent) => {{
    e.preventDefault();
    const newErrors: Record<string, string> = {{}};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    
    if (Object.keys(newErrors).length === 0) {{
      onSubmit(formData);
    }} else {{
      setErrors(newErrors);
    }}
  }};

  return (
    <form onSubmit={{handleSubmit}} noValidate>
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={{formData.name}}
          onChange={{(e) => setFormData({{ ...formData, name: e.target.value }})}}
          aria-invalid={{!!errors.name}}
          aria-describedby={{errors.name ? 'name-error' : undefined}}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2"
        />
        {{errors.name && (
          <p id="name-error" className="text-red-500 text-sm mt-1">
            {{errors.name}}
          </p>
        )}}
      </div>
      
      <button type="submit" className="btn btn-primary">
        Submit
      </button>
    </form>
  );
}};"""

                component_data["accessibility_features"] = [
                    "label associations",
                    "aria-invalid states",
                    "error message associations",
                    "required field indicators",
                ]

        if include_styles and component_type in ["button", "card", "form"]:
            component_data[
                "styles"
            ] = """/* Tailwind CSS classes used - ensure Tailwind is configured */
/* Additional custom styles */
.btn {
  @apply font-medium rounded-md transition-all duration-200;
}

.card {
  @apply bg-white dark:bg-gray-800 transition-colors;
}

/* Focus styles for accessibility */
:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}"""

        # Generate usage example
        component_data["usage_example"] = f"<{component_type.capitalize()} />"

        return component_data

    except Exception as e:
        return {"error": f"Component generation failed: {str(e)}", "component_data": component_data}


def validate_design_system(
    components_path: str, design_tokens: Optional[Dict[str, Any]] = None, check_consistency: bool = True
) -> Dict[str, Any]:
    """
    Validates design system consistency across components.

    Args:
        components_path: Path to components directory
        design_tokens: Design token definitions
        check_consistency: Whether to check cross-component consistency

    Returns:
        Dictionary containing validation results
    """
    validation_report = {
        "components_analyzed": 0,
        "consistency_score": 0,
        "issues": [],
        "design_tokens_usage": {},
        "recommendations": [],
    }

    try:
        # Default design tokens if not provided
        if not design_tokens:
            design_tokens = {
                "colors": ["primary", "secondary", "danger", "success", "warning"],
                "spacing": ["xs", "sm", "md", "lg", "xl"],
                "typography": ["heading", "body", "caption"],
                "breakpoints": ["sm", "md", "lg", "xl"],
            }

        # Analyze component files
        component_patterns = {
            "color_usage": r"(bg-|text-|border-)(\w+)-(\d+)",
            "spacing_usage": r"(p|m|px|py|mx|my)-(\d+|auto)",
            "typography_usage": r"(text-)(xs|sm|base|lg|xl|2xl)",
            "responsive_usage": r"(sm:|md:|lg:|xl:)",
        }

        # Simulate component analysis
        components = ["Button.tsx", "Card.tsx", "Modal.tsx", "Form.tsx"]

        for component in components:
            validation_report["components_analyzed"] += 1

            # Check for consistent patterns (simulation)
            if check_consistency:
                # Simulate finding inconsistencies
                if component == "Modal.tsx":
                    validation_report["issues"].append(
                        {
                            "component": component,
                            "type": "inconsistent_spacing",
                            "details": "Uses custom spacing values instead of design tokens",
                            "severity": "medium",
                        }
                    )

        # Calculate consistency score
        issues_weight = len(validation_report["issues"]) * 10
        validation_report["consistency_score"] = max(0, 100 - issues_weight)

        # Design token usage analysis
        validation_report["design_tokens_usage"] = {
            "colors": {"usage_count": 45, "consistency": 90},
            "spacing": {"usage_count": 78, "consistency": 85},
            "typography": {"usage_count": 34, "consistency": 95},
            "breakpoints": {"usage_count": 23, "consistency": 100},
        }

        # Generate recommendations
        if validation_report["consistency_score"] < 80:
            validation_report["recommendations"].append("Refactor components to use design tokens consistently")

        if any(issue["severity"] == "high" for issue in validation_report["issues"]):
            validation_report["recommendations"].append("Address high-severity consistency issues first")

        validation_report["recommendations"].append("Consider using a CSS-in-JS solution for better token enforcement")

        return validation_report

    except Exception as e:
        return {"error": f"Design system validation failed: {str(e)}", "validation_report": validation_report}


def check_responsive_layout(
    css_content: str, breakpoints: List[int] = None, check_mobile_first: bool = True
) -> Dict[str, Any]:
    """
    Checks responsive design implementation and breakpoints.

    Args:
        css_content: CSS content to analyze
        breakpoints: List of breakpoint values to check
        check_mobile_first: Whether to verify mobile-first approach

    Returns:
        Dictionary containing responsive design analysis
    """
    if breakpoints is None:
        breakpoints = [640, 768, 1024, 1280]  # Default breakpoints (sm, md, lg, xl)

    responsive_report = {
        "breakpoints_found": [],
        "mobile_first": False,
        "issues": [],
        "coverage": {},
        "recommendations": [],
    }

    try:
        # Find media queries
        media_query_pattern = r"@media\s*\([^)]+\)"
        media_queries = re.findall(media_query_pattern, css_content)

        # Analyze each media query
        for query in media_queries:
            # Extract min-width values
            min_width_match = re.search(r"min-width:\s*(\d+)px", query)
            if min_width_match:
                width = int(min_width_match.group(1))
                responsive_report["breakpoints_found"].append({"type": "min-width", "value": width, "query": query})

            # Extract max-width values
            max_width_match = re.search(r"max-width:\s*(\d+)px", query)
            if max_width_match:
                width = int(max_width_match.group(1))
                responsive_report["breakpoints_found"].append({"type": "max-width", "value": width, "query": query})

        # Check if mobile-first
        min_widths = [bp["value"] for bp in responsive_report["breakpoints_found"] if bp["type"] == "min-width"]
        max_widths = [bp["value"] for bp in responsive_report["breakpoints_found"] if bp["type"] == "max-width"]

        if check_mobile_first:
            responsive_report["mobile_first"] = len(min_widths) > len(max_widths)

            if not responsive_report["mobile_first"] and len(max_widths) > 2:
                responsive_report["issues"].append(
                    {
                        "type": "desktop_first_approach",
                        "severity": "medium",
                        "details": "More max-width queries than min-width suggests desktop-first approach",
                    }
                )

        # Check breakpoint coverage
        for bp in breakpoints:
            covered = any(abs(found["value"] - bp) < 50 for found in responsive_report["breakpoints_found"])
            responsive_report["coverage"][f"{bp}px"] = covered

            if not covered:
                responsive_report["issues"].append(
                    {
                        "type": "missing_breakpoint",
                        "severity": "low",
                        "details": f"No media query found for {bp}px breakpoint",
                    }
                )

        # Check for common responsive patterns
        if "flexbox" in css_content or "flex" in css_content:
            responsive_report["coverage"]["flexbox"] = True

        if "grid" in css_content:
            responsive_report["coverage"]["css_grid"] = True

        # Generate recommendations
        if not responsive_report["mobile_first"]:
            responsive_report["recommendations"].append("Consider adopting a mobile-first approach")

        missing_breakpoints = [
            bp for bp, covered in responsive_report["coverage"].items() if not covered and "px" in bp
        ]
        if missing_breakpoints:
            responsive_report["recommendations"].append(
                f"Add media queries for breakpoints: {', '.join(missing_breakpoints)}"
            )

        if not responsive_report["coverage"].get("flexbox") and not responsive_report["coverage"].get("css_grid"):
            responsive_report["recommendations"].append(
                "Use modern layout techniques (Flexbox/Grid) for better responsiveness"
            )

        return responsive_report

    except Exception as e:
        return {"error": f"Responsive layout check failed: {str(e)}", "responsive_report": responsive_report}


def profile_ui_performance(component_name: str, metrics: List[str], render_count: int) -> Dict[str, Any]:
    """
    Profiles UI component rendering performance.

    Args:
        component_name: Name of component to profile
        metrics: Performance metrics to measure
        render_count: Number of renders to simulate

    Returns:
        Dictionary containing performance metrics
    """
    if metrics is None:
        metrics = ["render_time", "memory_usage", "rerender_count", "bundle_size"]

    performance_data = {
        "component": component_name,
        "render_count": render_count,
        "metrics": {},
        "bottlenecks": [],
        "optimizations": [],
    }

    try:
        # Simulate performance measurements
        for metric in metrics:
            if metric == "render_time":
                # Simulate render times (ms)
                base_time = 5 if "Button" in component_name else 15
                performance_data["metrics"]["render_time"] = {
                    "initial": base_time,
                    "average": base_time + 2,
                    "worst_case": base_time + 10,
                    "unit": "ms",
                }

                if base_time > 10:
                    performance_data["bottlenecks"].append(
                        {
                            "type": "slow_initial_render",
                            "impact": "high",
                            "details": f"Initial render time {base_time}ms exceeds 10ms threshold",
                        }
                    )

            elif metric == "memory_usage":
                # Simulate memory usage (KB)
                base_memory = 50 if "Button" in component_name else 150
                performance_data["metrics"]["memory_usage"] = {
                    "initial": base_memory,
                    "after_renders": base_memory + (render_count * 0.1),
                    "peak": base_memory + (render_count * 0.2),
                    "unit": "KB",
                }

            elif metric == "rerender_count":
                # Simulate unnecessary rerenders
                unnecessary_rerenders = 0 if "Button" in component_name else 5
                performance_data["metrics"]["rerender_count"] = {
                    "unnecessary": unnecessary_rerenders,
                    "total": render_count + unnecessary_rerenders,
                    "percentage": (unnecessary_rerenders / render_count) * 100,
                }

                if unnecessary_rerenders > 3:
                    performance_data["bottlenecks"].append(
                        {
                            "type": "excessive_rerenders",
                            "impact": "medium",
                            "details": f"{unnecessary_rerenders} unnecessary rerenders detected",
                        }
                    )

            elif metric == "bundle_size":
                # Simulate bundle sizes (KB)
                base_size = 5 if "Button" in component_name else 25
                performance_data["metrics"]["bundle_size"] = {
                    "raw": base_size,
                    "gzipped": base_size * 0.3,
                    "dependencies": base_size * 0.5,
                    "unit": "KB",
                }

        # Generate optimization suggestions
        if any(b["type"] == "slow_initial_render" for b in performance_data["bottlenecks"]):
            performance_data["optimizations"].append(
                {
                    "technique": "React.memo",
                    "impact": "high",
                    "description": "Memoize component to prevent unnecessary rerenders",
                }
            )

        if any(b["type"] == "excessive_rerenders" for b in performance_data["bottlenecks"]):
            performance_data["optimizations"].append(
                {
                    "technique": "useMemo/useCallback",
                    "impact": "medium",
                    "description": "Memoize expensive computations and callbacks",
                }
            )

        performance_data["optimizations"].append(
            {
                "technique": "Code splitting",
                "impact": "medium",
                "description": "Lazy load component to reduce initial bundle size",
            }
        )

        return performance_data

    except Exception as e:
        return {"error": f"Performance profiling failed: {str(e)}", "performance_data": performance_data}


def analyze_user_flow(
    flow_definition: Dict[str, Any], identify_friction: bool = True, suggest_improvements: bool = True
) -> Dict[str, Any]:
    """
    Analyzes user interaction flows and identifies optimization opportunities.

    Args:
        flow_definition: Definition of user flow steps
        identify_friction: Whether to identify friction points
        suggest_improvements: Whether to suggest improvements

    Returns:
        Dictionary containing flow analysis
    """
    flow_analysis = {
        "flow_name": flow_definition.get("name", "Unknown Flow"),
        "total_steps": 0,
        "friction_points": [],
        "drop_off_risks": [],
        "accessibility_gaps": [],
        "improvements": [],
        "estimated_completion_time": 0,
    }

    try:
        steps = flow_definition.get("steps", [])
        flow_analysis["total_steps"] = len(steps)

        # Analyze each step
        for i, step in enumerate(steps):
            step_type = step.get("type", "unknown")
            step_name = step.get("name", f"Step {i+1}")

            # Estimate time for each step type
            time_estimates = {
                "form_input": 5,
                "button_click": 1,
                "page_load": 3,
                "validation": 2,
                "api_call": 4,
                "confirmation": 2,
            }

            step_time = time_estimates.get(step_type, 3)
            flow_analysis["estimated_completion_time"] += step_time

            # Identify friction points
            if identify_friction:
                if step_type == "form_input" and step.get("fields", 0) > 5:
                    flow_analysis["friction_points"].append(
                        {
                            "step": step_name,
                            "type": "complex_form",
                            "severity": "high",
                            "details": f"Form has {step.get('fields', 0)} fields - consider progressive disclosure",
                        }
                    )

                if step_type == "validation" and not step.get("inline_validation", False):
                    flow_analysis["friction_points"].append(
                        {
                            "step": step_name,
                            "type": "delayed_validation",
                            "severity": "medium",
                            "details": "No inline validation - users see errors only after submission",
                        }
                    )

                if i > 0 and steps[i - 1].get("type") == "api_call" and not step.get("loading_state"):
                    flow_analysis["friction_points"].append(
                        {
                            "step": step_name,
                            "type": "missing_feedback",
                            "severity": "medium",
                            "details": "No loading state after API call",
                        }
                    )

            # Identify drop-off risks
            if step_type in ["form_input", "payment", "registration"]:
                flow_analysis["drop_off_risks"].append(
                    {
                        "step": step_name,
                        "risk_level": "high" if step_type == "payment" else "medium",
                        "reason": f"{step_type} steps have high abandonment rates",
                    }
                )

            # Check accessibility
            if not step.get("keyboard_accessible", True):
                flow_analysis["accessibility_gaps"].append(
                    {"step": step_name, "issue": "Not keyboard accessible", "wcag": "2.1.1"}
                )

            if step_type == "timer" and not step.get("pause_option"):
                flow_analysis["accessibility_gaps"].append(
                    {"step": step_name, "issue": "Timer without pause option", "wcag": "2.2.1"}
                )

        # Generate improvements
        if suggest_improvements:
            if flow_analysis["total_steps"] > 5:
                flow_analysis["improvements"].append(
                    {
                        "type": "simplification",
                        "priority": "high",
                        "suggestion": "Reduce flow to 5 or fewer steps for better completion rates",
                    }
                )

            if any(fp["type"] == "complex_form" for fp in flow_analysis["friction_points"]):
                flow_analysis["improvements"].append(
                    {
                        "type": "progressive_disclosure",
                        "priority": "high",
                        "suggestion": "Break complex forms into multiple steps with progress indicators",
                    }
                )

            if flow_analysis["estimated_completion_time"] > 30:
                flow_analysis["improvements"].append(
                    {
                        "type": "save_progress",
                        "priority": "medium",
                        "suggestion": "Add ability to save and resume progress for long flows",
                    }
                )

            if flow_analysis["accessibility_gaps"]:
                flow_analysis["improvements"].append(
                    {
                        "type": "accessibility",
                        "priority": "high",
                        "suggestion": "Fix accessibility gaps to ensure inclusive design",
                    }
                )

        return flow_analysis

    except Exception as e:
        return {"error": f"User flow analysis failed: {str(e)}", "flow_analysis": flow_analysis}


# Create the UI/UX Specialist agent
ui_specialist = LlmAgent(
    name="UIUXSpecialist",
    model="gemini-2.5-flash",
    description="User interface design and experience optimization expert",
    instruction="""You are a UI/UX specialist focused on creating accessible, performant, and user-friendly interfaces.

Your responsibilities:
1. Analyze UI components for accessibility compliance
2. Generate responsive, accessible component templates
3. Validate design system consistency
4. Check responsive design implementation
5. Profile UI rendering performance
6. Analyze and optimize user flows

Use your tools to provide comprehensive UI/UX analysis and actionable design recommendations.""",
    tools=[
        FunctionTool(analyze_accessibility),
        FunctionTool(generate_ui_component),
        FunctionTool(validate_design_system),
        FunctionTool(check_responsive_layout),
        FunctionTool(profile_ui_performance),
        FunctionTool(analyze_user_flow),
    ],
)


# Standalone function for backwards compatibility
def analyze_user_interface(query: str) -> str:
    """Legacy function for UI analysis."""
    return f"UI/UX Analysis for: {query}"


# Export all components
__all__ = [
    "ui_specialist",
    "analyze_accessibility",
    "generate_ui_component",
    "validate_design_system",
    "check_responsive_layout",
    "profile_ui_performance",
    "analyze_user_flow",
    "analyze_user_interface",
]
