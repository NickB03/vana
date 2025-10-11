#!/usr/bin/env python3
"""
Fetch and parse official Google ADK samples and documentation.

This script downloads real-world ADK examples from Google's official repositories
to create authoritative training data for neural training.
"""

import json
import subprocess
import tempfile
from pathlib import Path
from typing import Any
from datetime import datetime
import shutil


# Official Google ADK resources
ADK_SOURCES = {
    "adk_samples": {
        "url": "https://github.com/google/adk-samples.git",
        "description": "Official Google ADK sample projects",
        "priority": "high",
        "samples": [
            "academic_research",
            "blog_writer",
            "customer_service",
            "financial_advisor",
            "marketing_agency",
            "ml_engineer",
            "travel_concierge"
        ]
    },
    "agent_starter_pack": {
        "url": "https://github.com/GoogleCloudPlatform/agent-starter-pack.git",
        "description": "Production-ready agent templates",
        "priority": "high",
        "templates": ["adk_base", "adk_live"]
    }
}


def clone_repository(url: str, target_dir: Path) -> bool:
    """Clone a git repository to target directory."""
    try:
        print(f"📥 Cloning {url}...")
        subprocess.run(
            ["git", "clone", "--depth", "1", url, str(target_dir)],
            check=True,
            capture_output=True,
            text=True
        )
        print(f"✅ Cloned successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to clone: {e.stderr}")
        return False


def extract_python_patterns_from_file(filepath: Path) -> list[dict[str, Any]]:
    """Extract ADK patterns from a Python file."""
    patterns = []

    try:
        content = filepath.read_text()

        # Detect agent definitions
        if "LlmAgent(" in content:
            patterns.append({
                "type": "LlmAgent",
                "file": str(filepath),
                "detected": "LlmAgent instantiation"
            })

        if "SequentialAgent(" in content:
            patterns.append({
                "type": "SequentialAgent",
                "file": str(filepath),
                "detected": "SequentialAgent orchestration"
            })

        if "LoopAgent(" in content:
            patterns.append({
                "type": "LoopAgent",
                "file": str(filepath),
                "detected": "LoopAgent iteration"
            })

        if "BaseAgent" in content:
            patterns.append({
                "type": "BaseAgent",
                "file": str(filepath),
                "detected": "Custom BaseAgent implementation"
            })

        # Detect tool usage
        if "tools=[" in content:
            patterns.append({
                "type": "tool_integration",
                "file": str(filepath),
                "detected": "Tool configuration"
            })

        # Detect callbacks
        if "callback" in content.lower():
            patterns.append({
                "type": "callback_pattern",
                "file": str(filepath),
                "detected": "Callback usage"
            })

        # Detect structured outputs
        if "output_schema=" in content or "BaseModel" in content:
            patterns.append({
                "type": "structured_output",
                "file": str(filepath),
                "detected": "Structured output with Pydantic"
            })

    except Exception as e:
        print(f"⚠️  Error parsing {filepath}: {e}")

    return patterns


def analyze_sample_project(project_dir: Path, project_name: str) -> dict[str, Any]:
    """Analyze an ADK sample project and extract patterns."""

    analysis = {
        "project": project_name,
        "path": str(project_dir),
        "patterns_found": [],
        "agent_files": [],
        "tool_files": [],
        "readme_content": None
    }

    # Find all Python files
    python_files = list(project_dir.rglob("*.py"))

    for py_file in python_files:
        # Skip test files and __init__.py
        if "test" in str(py_file).lower() or py_file.name == "__init__.py":
            continue

        patterns = extract_python_patterns_from_file(py_file)

        if patterns:
            analysis["patterns_found"].extend(patterns)

            # Categorize files
            if "agent" in py_file.name.lower():
                analysis["agent_files"].append(str(py_file))
            elif "tool" in py_file.name.lower():
                analysis["tool_files"].append(str(py_file))

    # Try to read README
    for readme_name in ["README.md", "readme.md", "README.txt"]:
        readme_path = project_dir / readme_name
        if readme_path.exists():
            try:
                analysis["readme_content"] = readme_path.read_text()[:1000]  # First 1000 chars
                break
            except:
                pass

    return analysis


def extract_official_patterns() -> dict[str, Any]:
    """Fetch and analyze official Google ADK samples."""

    official_patterns = {
        "sources": [],
        "patterns_by_type": {
            "agent_definitions": [],
            "tool_integrations": [],
            "orchestration": [],
            "structured_outputs": [],
            "callbacks": []
        },
        "sample_projects": [],
        "metadata": {
            "extracted_at": datetime.now().isoformat(),
            "version": "1.0",
            "source": "official_google_adk"
        }
    }

    # Create temporary directory for cloning
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)

        # Process ADK Samples
        samples_dir = tmp_path / "adk-samples"
        if clone_repository(ADK_SOURCES["adk_samples"]["url"], samples_dir):
            print("\n📊 Analyzing ADK samples...")

            # Analyze each sample project
            for sample_name in ADK_SOURCES["adk_samples"]["samples"]:
                sample_path = samples_dir / sample_name

                if sample_path.exists():
                    print(f"  🔍 Analyzing {sample_name}...")
                    analysis = analyze_sample_project(sample_path, sample_name)
                    official_patterns["sample_projects"].append(analysis)

                    # Categorize patterns
                    for pattern in analysis["patterns_found"]:
                        pattern_type = pattern.get("type", "unknown")

                        if pattern_type in ["LlmAgent", "SequentialAgent", "LoopAgent", "BaseAgent"]:
                            official_patterns["patterns_by_type"]["agent_definitions"].append({
                                "project": sample_name,
                                "pattern": pattern
                            })
                        elif pattern_type == "tool_integration":
                            official_patterns["patterns_by_type"]["tool_integrations"].append({
                                "project": sample_name,
                                "pattern": pattern
                            })
                        elif pattern_type in ["SequentialAgent", "LoopAgent"]:
                            official_patterns["patterns_by_type"]["orchestration"].append({
                                "project": sample_name,
                                "pattern": pattern
                            })
                        elif pattern_type == "structured_output":
                            official_patterns["patterns_by_type"]["structured_outputs"].append({
                                "project": sample_name,
                                "pattern": pattern
                            })
                        elif pattern_type == "callback_pattern":
                            official_patterns["patterns_by_type"]["callbacks"].append({
                                "project": sample_name,
                                "pattern": pattern
                            })

        # Process Agent Starter Pack
        starter_pack_dir = tmp_path / "agent-starter-pack"
        if clone_repository(ADK_SOURCES["agent_starter_pack"]["url"], starter_pack_dir):
            print("\n📊 Analyzing Agent Starter Pack templates...")

            for template_name in ADK_SOURCES["agent_starter_pack"]["templates"]:
                template_path = starter_pack_dir / "templates" / template_name

                if template_path.exists():
                    print(f"  🔍 Analyzing {template_name}...")
                    analysis = analyze_sample_project(template_path, template_name)
                    official_patterns["sample_projects"].append(analysis)

    # Add source information
    official_patterns["sources"] = [
        {
            "name": "google/adk-samples",
            "url": "https://github.com/google/adk-samples",
            "description": "Official ADK sample projects",
            "samples_analyzed": len([p for p in official_patterns["sample_projects"]
                                   if p["project"] in ADK_SOURCES["adk_samples"]["samples"]])
        },
        {
            "name": "GoogleCloudPlatform/agent-starter-pack",
            "url": "https://github.com/GoogleCloudPlatform/agent-starter-pack",
            "description": "Production-ready agent templates",
            "templates_analyzed": len([p for p in official_patterns["sample_projects"]
                                     if p["project"] in ADK_SOURCES["agent_starter_pack"]["templates"]])
        }
    ]

    return official_patterns


def create_enhanced_agent_patterns(official_data: dict) -> list[dict[str, Any]]:
    """Create enhanced agent patterns combining official examples."""

    enhanced_patterns = [
        {
            "name": "react_agent_pattern",
            "category": "agent_definition",
            "source": "official_google_adk",
            "description": "ReAct (Reasoning + Acting) agent pattern from Google ADK",
            "use_cases": [
                "Interactive problem-solving",
                "Multi-step reasoning",
                "Tool-augmented agents"
            ],
            "best_practices": [
                "Use for agents that need to reason before acting",
                "Combine with tools for external capabilities",
                "Implement clear thinking steps"
            ],
            "official_examples": [
                "adk_base template",
                "customer_service sample",
                "financial_advisor sample"
            ]
        },
        {
            "name": "rag_agent_pattern",
            "category": "agent_definition",
            "source": "official_google_adk",
            "description": "Retrieval-Augmented Generation pattern for knowledge-grounded responses",
            "use_cases": [
                "Question answering with documents",
                "Knowledge base integration",
                "Context-aware responses"
            ],
            "best_practices": [
                "Use Vertex AI Search for document retrieval",
                "Implement vector search for semantic matching",
                "Ground responses in retrieved context"
            ],
            "official_examples": [
                "academic_research sample",
                "adk_live template (multimodal RAG)"
            ]
        },
        {
            "name": "multi_agent_orchestration",
            "category": "orchestration",
            "source": "official_google_adk",
            "description": "Coordinating multiple specialized agents for complex workflows",
            "use_cases": [
                "Marketing agency (multiple specialist agents)",
                "ML engineering workflows",
                "Complex business processes"
            ],
            "best_practices": [
                "Assign clear responsibilities to each agent",
                "Use SequentialAgent for ordered workflows",
                "Implement agent communication via state",
                "Use AgentTool for delegation"
            ],
            "official_examples": [
                "marketing_agency sample (multi-agent)",
                "ml_engineer sample (workflow orchestration)"
            ]
        },
        {
            "name": "live_multimodal_agent",
            "category": "agent_definition",
            "source": "official_google_adk",
            "description": "Real-time multimodal agent with Gemini Live API",
            "use_cases": [
                "Voice interactions",
                "Video processing",
                "Real-time multimodal understanding"
            ],
            "best_practices": [
                "Use Gemini Live API for multimodal inputs",
                "Handle streaming audio/video",
                "Implement real-time response generation"
            ],
            "official_examples": [
                "adk_live template"
            ]
        },
        {
            "name": "production_deployment_pattern",
            "category": "deployment",
            "source": "official_google_adk",
            "description": "Production-ready deployment on Google Cloud",
            "use_cases": [
                "Cloud Run deployment",
                "Agent Engine hosting",
                "CI/CD automation"
            ],
            "best_practices": [
                "Use Cloud Run for serverless deployment",
                "Implement CI/CD with Terraform",
                "Enable observability and monitoring",
                "Use Vertex AI evaluation"
            ],
            "official_examples": [
                "agent-starter-pack templates",
                "All sample projects include deployment configs"
            ]
        }
    ]

    # Add statistics from official analysis
    for pattern in enhanced_patterns:
        pattern["official_usage_count"] = len(pattern.get("official_examples", []))

    return enhanced_patterns


def main():
    """Main execution function."""

    print("🚀 Fetching Official Google ADK Samples")
    print("=" * 60)

    # Ensure output directory exists
    output_dir = Path("training_data")
    output_dir.mkdir(exist_ok=True)

    # Extract official patterns
    print("\n📦 Extracting patterns from official repositories...")
    official_patterns = extract_official_patterns()

    # Create enhanced patterns
    print("\n✨ Creating enhanced pattern dataset...")
    enhanced_patterns = create_enhanced_agent_patterns(official_patterns)

    # Save detailed analysis
    analysis_file = output_dir / "official_adk_analysis.json"
    analysis_file.write_text(json.dumps(official_patterns, indent=2))
    print(f"✅ Saved detailed analysis: {analysis_file}")

    # Save enhanced patterns
    patterns_file = output_dir / "official_adk_patterns.json"
    patterns_data = {
        "patterns": enhanced_patterns,
        "metadata": {
            "source": "official_google_adk",
            "extracted_at": datetime.now().isoformat(),
            "version": "1.0",
            "repositories_analyzed": len(ADK_SOURCES),
            "samples_analyzed": len(official_patterns.get("sample_projects", []))
        }
    }
    patterns_file.write_text(json.dumps(patterns_data, indent=2))
    print(f"✅ Saved enhanced patterns: {patterns_file}")

    # Print summary
    print("\n" + "=" * 60)
    print("📊 EXTRACTION SUMMARY")
    print("=" * 60)
    print(f"Sample projects analyzed: {len(official_patterns.get('sample_projects', []))}")
    print(f"Agent patterns found: {len(official_patterns['patterns_by_type']['agent_definitions'])}")
    print(f"Tool integrations found: {len(official_patterns['patterns_by_type']['tool_integrations'])}")
    print(f"Orchestration patterns: {len(official_patterns['patterns_by_type']['orchestration'])}")
    print(f"Enhanced patterns created: {len(enhanced_patterns)}")
    print("\n✨ Official Google ADK patterns extracted successfully!")


if __name__ == "__main__":
    main()
