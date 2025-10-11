#!/usr/bin/env python3
"""
Extract Agent Starter Pack architecture patterns from CLAUDE.md.

This extracts the official Google ADK Agent Starter Pack guidance
that was added to CLAUDE.md for neural training.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Any


def extract_starter_pack_patterns() -> dict[str, Any]:
    """Extract Agent Starter Pack patterns from CLAUDE.md."""

    patterns = {
        "architecture_patterns": [
            {
                "name": "templating_pipeline",
                "category": "architecture",
                "source": "agent-starter-pack",
                "description": "Cookiecutter variable substitution and Jinja2 logic execution for project generation",
                "components": [
                    "Cookiecutter variable substitution",
                    "Jinja2 logic execution",
                    "Templated file/directory names"
                ],
                "critical_rules": [
                    "Any failure in substitution, logic, or naming breaks project generation",
                    "Close every {% if %}, {% for %}, and {% raw %} block",
                    "Use {{ }} for substitutions and {% %} for control flow"
                ],
                "best_practices": [
                    "Trim whitespace with {%- / -%} to avoid extra newlines",
                    "Test Jinja blocks for balance",
                    "Validate variable spelling before rendering"
                ]
            },
            {
                "name": "four_layer_architecture",
                "category": "architecture",
                "source": "agent-starter-pack",
                "description": "Hierarchical template layer system for configuration inheritance",
                "layers": [
                    {
                        "name": "base_template",
                        "path": "src/base_template/",
                        "purpose": "Global defaults for all projects",
                        "priority": 1
                    },
                    {
                        "name": "deployment_target",
                        "path": "src/deployment_targets/",
                        "purpose": "Environment-specific overrides (cloud_run, agent_engine)",
                        "priority": 2
                    },
                    {
                        "name": "frontend_type",
                        "purpose": "Frontend-specific configurations",
                        "priority": 3
                    },
                    {
                        "name": "agent_template",
                        "path": "agents/",
                        "purpose": "Self-contained agent templates with templateconfig.yaml",
                        "priority": 4
                    }
                ],
                "override_rules": [
                    "Place edits in the minimal layer",
                    "Propagate overrides where necessary",
                    "Respect layer priority order"
                ],
                "best_practices": [
                    "Coordinate updates across templateconfig.yaml, cookiecutter.json, and CI/CD",
                    "Wrap agent/target-specific logic in conditionals",
                    "Example: {% if cookiecutter.agent_name == 'adk_live' %}"
                ]
            },
            {
                "name": "template_processing_flow",
                "category": "architecture",
                "source": "agent-starter-pack",
                "description": "Sequential template processing and overlay system",
                "flow": [
                    {
                        "step": 1,
                        "action": "Copy base template",
                        "module": "src/cli/utils/template.py"
                    },
                    {
                        "step": 2,
                        "action": "Overlay deployment target files",
                        "source": "src/deployment_targets/"
                    },
                    {
                        "step": 3,
                        "action": "Apply agent-specific files",
                        "source": "agents/"
                    }
                ],
                "critical_files": [
                    "src/cli/utils/template.py",
                    "src/base_template/",
                    "src/deployment_targets/",
                    "agents/.template/templateconfig.yaml"
                ]
            }
        ],
        "deployment_patterns": [
            {
                "name": "service_account_pattern",
                "category": "deployment",
                "source": "agent-starter-pack",
                "description": "Single app_sa service account with role-based permissions",
                "pattern": {
                    "service_account": "app_sa",
                    "role_assignment": "app_sa_roles",
                    "consistency": "Reference the same account across all deployment targets"
                },
                "best_practices": [
                    "Maintain single app_sa across all targets",
                    "Assign roles via app_sa_roles list",
                    "Never create duplicate service accounts per target"
                ]
            },
            {
                "name": "cicd_sync_pattern",
                "category": "deployment",
                "source": "agent-starter-pack",
                "description": "Synchronized GitHub Actions and Cloud Build workflows",
                "components": {
                    "github_actions": {
                        "path": ".github/workflows/",
                        "variable_syntax": "${{ vars.X }}"
                    },
                    "cloud_build": {
                        "path": ".cloudbuild/",
                        "variable_syntax": "${_X}"
                    }
                },
                "sync_requirements": [
                    "Keep workflow steps synchronized",
                    "Match variable naming (account for different syntax)",
                    "Terraform-managed secrets must match in both",
                    "Test both CI/CD paths before deployment"
                ],
                "critical_rule": "Changes to one workflow must be mirrored in the other"
            },
            {
                "name": "deployment_targets",
                "category": "deployment",
                "source": "agent-starter-pack",
                "description": "Multiple deployment target support with environment-specific configs",
                "targets": [
                    {
                        "name": "cloud_run",
                        "description": "Serverless container deployment on Cloud Run",
                        "use_case": "Scalable, serverless AI agents"
                    },
                    {
                        "name": "agent_engine",
                        "description": "Vertex AI Agent Engine deployment",
                        "use_case": "Managed agent infrastructure"
                    }
                ],
                "configuration": {
                    "override_directory": "src/deployment_targets/[target]/",
                    "template_variables": "cookiecutter.deployment_target",
                    "conditional_rendering": "{% if cookiecutter.deployment_target == 'cloud_run' %}"
                }
            }
        ],
        "development_patterns": [
            {
                "name": "cli_creation_pattern",
                "category": "development",
                "source": "agent-starter-pack",
                "description": "Agent project creation via CLI",
                "command": "uv run agent-starter-pack create <project-name>",
                "options": {
                    "output_dir": "target directory for generated project",
                    "agent_template": "adk_base, adk_live, etc.",
                    "deployment_target": "cloud_run, agent_engine",
                    "features": "data_ingestion, frontend options"
                },
                "example": "uv run agent-starter-pack create myagent-$(date +%s) --output-dir target",
                "best_practices": [
                    "Test multiple combinations of templates and targets",
                    "Validate generated project structure",
                    "Check for hardcoded URLs or missing conditionals"
                ]
            },
            {
                "name": "cicd_setup_pattern",
                "category": "development",
                "source": "agent-starter-pack",
                "description": "Automated CI/CD pipeline setup",
                "command": "agent-starter-pack setup_cicd",
                "entry_point": "src/cli/commands/setup_cicd.py",
                "configures": [
                    "GitHub Actions workflows",
                    "Cloud Build triggers",
                    "Terraform backend",
                    "Secret management"
                ]
            },
            {
                "name": "testing_combinations",
                "category": "development",
                "source": "agent-starter-pack",
                "description": "Multi-dimensional testing strategy",
                "test_matrix": {
                    "agent_types": ["adk_live", "adk_base"],
                    "deployment_targets": ["cloud_run", "agent_engine"],
                    "features": ["data_ingestion", "frontend_options"]
                },
                "validation_points": [
                    "Hardcoded URLs removed",
                    "Conditionals present for all variants",
                    "Dependencies match extras requirements",
                    "All Jinja blocks balanced"
                ]
            }
        ],
        "jinja2_patterns": [
            {
                "name": "control_flow_blocks",
                "category": "templating",
                "source": "agent-starter-pack",
                "syntax": {
                    "if_block": "{% if condition %} ... {% endif %}",
                    "for_loop": "{% for item in list %} ... {% endfor %}",
                    "raw_block": "{% raw %} ... {% endraw %}"
                },
                "critical_rules": [
                    "ALWAYS close every block",
                    "Failure to close causes generation errors",
                    "Validate block nesting and balance"
                ]
            },
            {
                "name": "variable_substitution",
                "category": "templating",
                "source": "agent-starter-pack",
                "syntax": {
                    "substitution": "{{ variable_name }}",
                    "control_flow": "{% logic %}"
                },
                "examples": [
                    "{{ cookiecutter.project_name }}",
                    "{{ cookiecutter.agent_name }}",
                    "{{ cookiecutter.deployment_target }}"
                ]
            },
            {
                "name": "whitespace_control",
                "category": "templating",
                "source": "agent-starter-pack",
                "description": "Trim whitespace in rendered output",
                "syntax": {
                    "trim_left": "{%-",
                    "trim_right": "-%}",
                    "trim_both": "{%- ... -%}"
                },
                "use_case": "Prevent extra newlines in generated files",
                "example": "{%- if condition -%} content {%- endif -%}"
            }
        ],
        "metadata": {
            "source": "agent-starter-pack-official-guidance",
            "extracted_from": "CLAUDE.md",
            "extracted_at": datetime.now().isoformat(),
            "version": "1.0",
            "pattern_count": 12
        }
    }

    return patterns


def create_official_best_practices() -> dict[str, Any]:
    """Create official best practices from Agent Starter Pack."""

    best_practices = {
        "practices": [
            {
                "category": "code_modification",
                "principle": "Minimal change principle",
                "description": "Modify only code tied to the requested change",
                "rules": [
                    "Keep surrounding structure intact",
                    "Preserve existing comments",
                    "Maintain original formatting",
                    "Don't refactor unrelated code"
                ]
            },
            {
                "category": "pattern_matching",
                "principle": "Mirror existing patterns",
                "description": "Match repository's existing patterns before introducing new logic",
                "process": [
                    "Inspect nearby modules first",
                    "Match naming conventions",
                    "Follow templating patterns",
                    "Respect directory placement conventions"
                ],
                "search_locations": [
                    "src/base_template/",
                    "src/deployment_targets/",
                    ".github/",
                    ".cloudbuild/",
                    "docs/"
                ]
            },
            {
                "category": "cross_file_coordination",
                "principle": "Maintain configuration alignment",
                "description": "Keep config, CI/CD, and docs synchronized",
                "files_to_coordinate": [
                    "templateconfig.yaml",
                    "cookiecutter.json",
                    "Rendered templates",
                    "CI/CD manifests (GitHub Actions + Cloud Build)",
                    "Documentation"
                ],
                "validation": "Changes to one must propagate to related files"
            },
            {
                "category": "layer_management",
                "principle": "Respect four-layer hierarchy",
                "description": "Place edits in minimal layer and propagate overrides",
                "layer_order": [
                    "base template (lowest priority)",
                    "deployment target",
                    "frontend type",
                    "agent template (highest priority)"
                ],
                "rules": [
                    "Higher layers override lower layers",
                    "Don't duplicate logic across layers",
                    "Use conditionals for variant-specific code"
                ]
            },
            {
                "category": "testing",
                "principle": "Multi-combination validation",
                "description": "Test across agent types, targets, and features",
                "test_matrix": {
                    "dimensions": ["agent_types", "deployment_targets", "feature_flags"],
                    "minimum_coverage": "Test all primary combinations",
                    "watch_for": [
                        "Hardcoded URLs",
                        "Missing conditionals",
                        "Dependency mismatches"
                    ]
                }
            }
        ],
        "pre_submit_checklist": [
            {
                "item": "Jinja blocks balanced",
                "validation": "All {% if %}, {% for %}, {% raw %} properly closed"
            },
            {
                "item": "Variables spelled correctly",
                "validation": "No typos in cookiecutter.variable_name references"
            },
            {
                "item": "Deployment overrides reviewed",
                "validation": "Check src/deployment_targets/ for conflicts"
            },
            {
                "item": "CI/CD synchronization",
                "validation": "GitHub Actions and Cloud Build workflows match"
            },
            {
                "item": "Representative testing",
                "validation": "Tested across agent and feature combinations"
            }
        ],
        "metadata": {
            "source": "agent-starter-pack-official-guidance",
            "version": "1.0",
            "extracted_at": datetime.now().isoformat()
        }
    }

    return best_practices


def main():
    """Generate expanded official patterns dataset."""

    print("🚀 Extracting Agent Starter Pack Patterns")
    print("=" * 60)

    output_dir = Path("training_data")
    output_dir.mkdir(exist_ok=True)

    # Extract architecture patterns
    print("\n📦 Extracting architecture patterns...")
    patterns = extract_starter_pack_patterns()

    patterns_file = output_dir / "agent_starter_pack_patterns.json"
    patterns_file.write_text(json.dumps(patterns, indent=2))
    print(f"✅ Saved: {patterns_file}")
    print(f"   - {len(patterns['architecture_patterns'])} architecture patterns")
    print(f"   - {len(patterns['deployment_patterns'])} deployment patterns")
    print(f"   - {len(patterns['development_patterns'])} development patterns")
    print(f"   - {len(patterns['jinja2_patterns'])} Jinja2 patterns")

    # Extract best practices
    print("\n📋 Extracting best practices...")
    best_practices = create_official_best_practices()

    practices_file = output_dir / "agent_starter_pack_best_practices.json"
    practices_file.write_text(json.dumps(best_practices, indent=2))
    print(f"✅ Saved: {practices_file}")
    print(f"   - {len(best_practices['practices'])} practice categories")
    print(f"   - {len(best_practices['pre_submit_checklist'])} checklist items")

    print("\n✨ Agent Starter Pack patterns extracted successfully!")


if __name__ == "__main__":
    main()
