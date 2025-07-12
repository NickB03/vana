"""
Architecture Specialist Tools - ADK Aligned Implementation

Simple, synchronous tools for architecture analysis following Google ADK patterns.
No async, no complex base classes - just direct functionality.
"""

import ast
import json
import os
from pathlib import Path
from typing import Dict, List, Tuple


def analyze_codebase_structure(path: str) -> str:
    """
    Analyze and return codebase structure insights.

    Args:
        path: Path to the codebase to analyze

    Returns:
        Formatted analysis with metrics and insights
    """
    try:
        project_path = Path(path)
        if not project_path.exists():
            return f"Error: Path {path} does not exist"

        # Gather metrics
        file_count = 0
        total_lines = 0
        language_dist = {}
        largest_files = []

        for root, dirs, files in os.walk(project_path):
            # Skip hidden and cache directories
            dirs[:] = [d for d in dirs if not d.startswith(".") and d != "__pycache__"]

            for file in files:
                if file.endswith((".py", ".js", ".ts", ".go", ".java")):
                    file_path = Path(root) / file
                    try:
                        lines = file_path.read_text().count("\n")
                        file_count += 1
                        total_lines += lines

                        ext = file_path.suffix
                        language_dist[ext] = language_dist.get(ext, 0) + 1

                        largest_files.append((str(file_path.relative_to(project_path)), lines))
                    except:
                        continue

        # Sort and get top 5 largest files
        largest_files.sort(key=lambda x: x[1], reverse=True)
        largest_files = largest_files[:5]

        # Generate analysis
        analysis = f"""## Codebase Structure Analysis

**Project**: {project_path.name}
**Total Files**: {file_count}
**Total Lines**: {total_lines:,}

### Language Distribution
"""
        for ext, count in sorted(language_dist.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / file_count * 100) if file_count > 0 else 0
            analysis += f"- {ext}: {count} files ({percentage:.1f}%)\n"

        analysis += "\n### Largest Files\n"
        for file_path, lines in largest_files:
            analysis += f"- {file_path}: {lines:,} lines\n"

        # Architecture insights
        if ".py" in language_dist and language_dist[".py"] > 10:
            analysis += "\n### Architecture Insights\n"
            analysis += "- Python-based project, likely backend/API focused\n"

            # Check for common patterns
            if (project_path / "requirements.txt").exists() or (project_path / "pyproject.toml").exists():
                analysis += "- Dependency management detected\n"

            if (project_path / "tests").exists():
                analysis += "- Test directory found - good practice\n"

            if (project_path / "docker-compose.yml").exists():
                analysis += "- Docker compose setup - containerized architecture\n"

            if (project_path / "main.py").exists() or (project_path / "app.py").exists():
                analysis += "- Main entry point detected\n"

            if (project_path / "api").exists() or (project_path / "routes").exists():
                analysis += "- API/routes structure detected - likely REST API\n"

        return analysis

    except Exception as e:
        return f"Error analyzing codebase: {str(e)}"


def detect_design_patterns(code_path: str) -> str:
    """
    Detect common design patterns in Python code.

    Args:
        code_path: Path to Python file to analyze

    Returns:
        Description of detected patterns
    """
    try:
        patterns_found = []

        with open(code_path, "r") as f:
            content = f.read()
            tree = ast.parse(content)

        # Check for Singleton pattern
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                has_instance = any(
                    isinstance(n, ast.Assign)
                    and any(target.id == "_instance" for target in n.targets if isinstance(target, ast.Name))
                    for n in node.body
                    if isinstance(n, ast.Assign)
                )
                has_new = any(isinstance(n, ast.FunctionDef) and n.name == "__new__" for n in node.body)

                if has_instance and has_new:
                    patterns_found.append(f"Singleton: {node.name}")

                # Check for Factory pattern
                methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
                if any("create" in m or "factory" in m for m in methods):
                    patterns_found.append(f"Factory: {node.name}")

                # Check for Observer pattern
                if any(m in ["attach", "detach", "notify"] for m in methods):
                    patterns_found.append(f"Observer: {node.name}")

                # Check for Strategy pattern
                if any(m in ["execute", "algorithm"] for m in methods) and len(methods) <= 3:
                    patterns_found.append(f"Strategy: {node.name}")

        if patterns_found:
            return "Design Patterns Detected:\n" + "\n".join(f"- {p}" for p in patterns_found)
        else:
            return "No common design patterns detected in this file."

    except Exception as e:
        return f"Error detecting patterns: {str(e)}"


def analyze_dependencies(project_path: str) -> str:
    """
    Analyze project dependencies and their relationships.

    Args:
        project_path: Path to project root

    Returns:
        Dependency analysis report
    """
    try:
        path = Path(project_path)
        analysis = "## Dependency Analysis\n\n"

        # Python dependencies
        requirements_file = path / "requirements.txt"
        pyproject_file = path / "pyproject.toml"

        if requirements_file.exists():
            deps = requirements_file.read_text().strip().split("\n")
            deps = [d.strip() for d in deps if d.strip() and not d.startswith("#")]

            analysis += f"### Python Dependencies (requirements.txt)\n"
            analysis += f"**Total**: {len(deps)} dependencies\n\n"

            # Categorize common dependencies
            categories = {
                "web": ["flask", "django", "fastapi", "aiohttp"],
                "data": ["pandas", "numpy", "scipy", "scikit-learn"],
                "database": ["sqlalchemy", "pymongo", "redis", "psycopg2"],
                "testing": ["pytest", "unittest", "mock", "coverage"],
                "ai/ml": ["tensorflow", "torch", "transformers", "openai"],
            }

            for category, keywords in categories.items():
                found = [d for d in deps if any(kw in d.lower() for kw in keywords)]
                if found:
                    analysis += f"**{category.title()}**: {', '.join(found[:5])}\n"

        # JavaScript dependencies
        package_json = path / "package.json"
        if package_json.exists():
            with open(package_json, "r") as f:
                package_data = json.load(f)

            deps = package_data.get("dependencies", {})
            dev_deps = package_data.get("devDependencies", {})

            analysis += f"\n### JavaScript Dependencies\n"
            analysis += f"**Production**: {len(deps)} dependencies\n"
            analysis += f"**Development**: {len(dev_deps)} dependencies\n"

            # Check for common frameworks
            if "react" in deps:
                analysis += "- React-based frontend\n"
            if "vue" in deps:
                analysis += "- Vue.js frontend\n"
            if "express" in deps:
                analysis += "- Express.js backend\n"

        return analysis

    except Exception as e:
        return f"Error analyzing dependencies: {str(e)}"


def evaluate_architecture_quality(project_path: str) -> str:
    """
    Evaluate architecture quality and provide recommendations.

    Args:
        project_path: Path to project root

    Returns:
        Quality assessment with scores and recommendations
    """
    try:
        path = Path(project_path)
        scores = {}
        recommendations = []

        # Check for documentation
        if (path / "README.md").exists() or (path / "README.rst").exists():
            scores["documentation"] = 1.0
        else:
            scores["documentation"] = 0.0
            recommendations.append("Add README.md with project overview")

        # Check for tests
        test_dirs = ["tests", "test", "__tests__", "spec"]
        if any((path / test_dir).exists() for test_dir in test_dirs):
            scores["testing"] = 1.0
        else:
            scores["testing"] = 0.0
            recommendations.append("Add test directory with unit tests")

        # Check for configuration management
        config_files = [".env.example", "config.py", "settings.py", "config/"]
        if any((path / cf).exists() for cf in config_files):
            scores["configuration"] = 1.0
        else:
            scores["configuration"] = 0.5
            recommendations.append("Consider centralized configuration management")

        # Check for containerization
        if (path / "Dockerfile").exists() or (path / "docker-compose.yml").exists():
            scores["containerization"] = 1.0
        else:
            scores["containerization"] = 0.0
            recommendations.append("Consider containerizing the application")

        # Check for CI/CD
        ci_files = [".github/workflows", ".gitlab-ci.yml", "Jenkinsfile", ".circleci"]
        if any((path / cf).exists() for cf in ci_files):
            scores["ci_cd"] = 1.0
        else:
            scores["ci_cd"] = 0.0
            recommendations.append("Implement CI/CD pipeline")

        # Calculate overall score
        overall_score = sum(scores.values()) / len(scores) if scores else 0

        # Generate report
        report = f"""## Architecture Quality Assessment

**Overall Score**: {overall_score:.1%}

### Category Scores
"""
        for category, score in scores.items():
            status = "✅" if score >= 0.8 else "⚠️" if score >= 0.5 else "❌"
            report += f"- {category.replace('_', ' ').title()}: {status} {score:.0%}\n"

        if recommendations:
            report += "\n### Recommendations\n"
            for rec in recommendations:
                report += f"- {rec}\n"

        report += "\n### Architecture Strengths\n"
        if scores.get("testing", 0) > 0.5:
            report += "- Test infrastructure in place\n"
        if scores.get("containerization", 0) > 0.5:
            report += "- Container-ready architecture\n"
        if overall_score > 0.7:
            report += "- Well-structured project\n"

        return report

    except Exception as e:
        return f"Error evaluating architecture: {str(e)}"
