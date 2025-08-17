"""Configuration templates and template engine for advanced configuration management."""

import json
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Optional, Union

import yaml
from jinja2 import Environment, FileSystemLoader, Template, TemplateError

logger = logging.getLogger(__name__)


class TemplateFormat(Enum):
    """Template file formats."""
    JSON = "json"
    YAML = "yaml"
    TOML = "toml"
    INI = "ini"
    ENV = "env"


@dataclass
class ConfigTemplate:
    """Configuration template definition."""
    name: str
    description: str
    template_path: str
    output_format: TemplateFormat
    required_variables: list[str] = field(default_factory=list)
    optional_variables: dict[str, Any] = field(default_factory=dict)
    validation_schema: dict[str, Any] | None = None
    tags: list[str] = field(default_factory=list)
    version: str = "1.0.0"
    author: str = "system"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def validate_variables(self, variables: dict[str, Any]) -> list[str]:
        """Validate that all required variables are provided."""
        missing = []
        for var in self.required_variables:
            if var not in variables:
                missing.append(var)
        return missing


class TemplateEngine:
    """Advanced template engine with Jinja2 backend."""

    def __init__(self, template_dirs: list[str] | None = None):
        self.template_dirs = template_dirs or ["templates", "config/templates"]
        self.environment = self._create_environment()

    def _create_environment(self) -> Environment:
        """Create Jinja2 environment with custom filters and functions."""
        # Find existing template directories
        existing_dirs = []
        for template_dir in self.template_dirs:
            if os.path.exists(template_dir):
                existing_dirs.append(template_dir)

        if not existing_dirs:
            # Create default template directory
            os.makedirs("templates", exist_ok=True)
            existing_dirs.append("templates")

        env = Environment(
            loader=FileSystemLoader(existing_dirs),
            trim_blocks=True,
            lstrip_blocks=True
        )

        # Add custom filters
        env.filters.update({
            'to_json': self._to_json_filter,
            'to_yaml': self._to_yaml_filter,
            'env_var': self._env_var_filter,
            'default_if_none': self._default_if_none_filter,
            'quote_if_spaces': self._quote_if_spaces_filter,
            'snake_case': self._snake_case_filter,
            'camel_case': self._camel_case_filter,
            'kebab_case': self._kebab_case_filter
        })

        # Add custom global functions
        env.globals.update({
            'now': lambda: datetime.now(timezone.utc),
            'env': os.environ.get,
            'file_exists': os.path.exists,
            'read_file': self._read_file_function
        })

        return env

    def render_template(self, template_path: str, variables: dict[str, Any]) -> str:
        """Render a template with provided variables."""
        try:
            template = self.environment.get_template(template_path)
            return template.render(**variables)
        except TemplateError as e:
            logger.error(f"Template rendering error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error rendering template: {e}")
            raise

    def render_string(self, template_string: str, variables: dict[str, Any]) -> str:
        """Render a template string with provided variables."""
        try:
            template = self.environment.from_string(template_string)
            return template.render(**variables)
        except TemplateError as e:
            logger.error(f"String template rendering error: {e}")
            raise

    def validate_template(self, template_path: str) -> list[str]:
        """Validate template syntax and return any issues."""
        issues = []
        try:
            template = self.environment.get_template(template_path)
            # Try to render with dummy variables to check for issues
            dummy_vars = {"dummy": "value"}
            template.render(**dummy_vars)
        except TemplateError as e:
            issues.append(f"Template syntax error: {e}")
        except Exception as e:
            issues.append(f"Template validation error: {e}")

        return issues

    def get_template_variables(self, template_path: str) -> list[str]:
        """Extract variables used in a template."""
        try:
            template = self.environment.get_template(template_path)
            # Parse template to find undefined variables
            from jinja2.meta import find_undeclared_variables
            source = self.environment.loader.get_source(self.environment, template_path)[0]
            parsed = self.environment.parse(source)
            variables = find_undeclared_variables(parsed)
            return list(variables)
        except Exception as e:
            logger.error(f"Error extracting template variables: {e}")
            return []

    # Custom filters
    def _to_json_filter(self, value: Any, indent: int = 2) -> str:
        """Convert value to JSON string."""
        return json.dumps(value, indent=indent, default=str)

    def _to_yaml_filter(self, value: Any) -> str:
        """Convert value to YAML string."""
        return yaml.dump(value, default_flow_style=False)

    def _env_var_filter(self, var_name: str, default: str = "") -> str:
        """Get environment variable with default."""
        return os.environ.get(var_name, default)

    def _default_if_none_filter(self, value: Any, default: Any) -> Any:
        """Return default if value is None."""
        return default if value is None else value

    def _quote_if_spaces_filter(self, value: str) -> str:
        """Quote string if it contains spaces."""
        return f'"{value}"' if ' ' in str(value) else str(value)

    def _snake_case_filter(self, value: str) -> str:
        """Convert string to snake_case."""
        return re.sub(r'[^a-zA-Z0-9]', '_', str(value)).lower()

    def _camel_case_filter(self, value: str) -> str:
        """Convert string to camelCase."""
        words = re.findall(r'\w+', str(value))
        return words[0].lower() + ''.join(word.capitalize() for word in words[1:])

    def _kebab_case_filter(self, value: str) -> str:
        """Convert string to kebab-case."""
        return re.sub(r'[^a-zA-Z0-9]', '-', str(value)).lower()

    # Custom global functions
    def _read_file_function(self, file_path: str) -> str:
        """Read file content."""
        try:
            with open(file_path) as f:
                return f.read()
        except Exception:
            return ""


class ConfigTemplateManager:
    """Manager for configuration templates."""

    def __init__(self, templates_dir: str = "config/templates"):
        self.templates_dir = Path(templates_dir)
        self.templates_dir.mkdir(parents=True, exist_ok=True)

        self.templates: dict[str, ConfigTemplate] = {}
        self.template_engine = TemplateEngine([str(self.templates_dir)])

        # Load existing templates
        self._load_templates()

        # Create default templates
        self._create_default_templates()

    def create_template(self, template: ConfigTemplate, content: str) -> None:
        """Create a new configuration template."""
        template_file = self.templates_dir / f"{template.name}.j2"

        # Write template content
        with open(template_file, 'w') as f:
            f.write(content)

        # Update template path
        template.template_path = f"{template.name}.j2"

        # Store template metadata
        self.templates[template.name] = template
        self._save_template_metadata(template)

        logger.info(f"Created template: {template.name}")

    def get_template(self, name: str) -> ConfigTemplate | None:
        """Get template by name."""
        return self.templates.get(name)

    def list_templates(self, tags: list[str] | None = None) -> list[ConfigTemplate]:
        """List available templates, optionally filtered by tags."""
        templates = list(self.templates.values())

        if tags:
            templates = [
                t for t in templates
                if any(tag in t.tags for tag in tags)
            ]

        return sorted(templates, key=lambda t: t.name)

    def render_template(self, template_name: str, variables: dict[str, Any],
                       output_file: str | None = None) -> str:
        """Render a template with variables."""
        template = self.get_template(template_name)
        if not template:
            raise ValueError(f"Template not found: {template_name}")

        # Validate required variables
        missing = template.validate_variables(variables)
        if missing:
            raise ValueError(f"Missing required variables: {missing}")

        # Merge with optional variables
        merged_vars = {**template.optional_variables, **variables}

        # Render template
        content = self.template_engine.render_template(template.template_path, merged_vars)

        # Format output based on template format
        formatted_content = self._format_output(content, template.output_format)

        # Write to file if specified
        if output_file:
            with open(output_file, 'w') as f:
                f.write(formatted_content)
            logger.info(f"Generated config file: {output_file}")

        return formatted_content

    def validate_template(self, template_name: str) -> list[str]:
        """Validate a template."""
        template = self.get_template(template_name)
        if not template:
            return [f"Template not found: {template_name}"]

        issues = []

        # Check template file exists
        template_file = self.templates_dir / template.template_path
        if not template_file.exists():
            issues.append(f"Template file not found: {template.template_path}")
            return issues

        # Validate template syntax
        syntax_issues = self.template_engine.validate_template(template.template_path)
        issues.extend(syntax_issues)

        return issues

    def delete_template(self, template_name: str) -> bool:
        """Delete a template."""
        template = self.get_template(template_name)
        if not template:
            return False

        # Remove template file
        template_file = self.templates_dir / template.template_path
        if template_file.exists():
            template_file.unlink()

        # Remove metadata file
        metadata_file = self.templates_dir / f"{template_name}.meta.json"
        if metadata_file.exists():
            metadata_file.unlink()

        # Remove from memory
        del self.templates[template_name]

        logger.info(f"Deleted template: {template_name}")
        return True

    def export_template(self, template_name: str, export_dir: str) -> bool:
        """Export a template to a directory."""
        template = self.get_template(template_name)
        if not template:
            return False

        export_path = Path(export_dir)
        export_path.mkdir(parents=True, exist_ok=True)

        # Copy template file
        template_file = self.templates_dir / template.template_path
        if template_file.exists():
            import shutil
            shutil.copy2(template_file, export_path / template.template_path)

        # Copy metadata
        metadata_file = self.templates_dir / f"{template_name}.meta.json"
        if metadata_file.exists():
            import shutil
            shutil.copy2(metadata_file, export_path / f"{template_name}.meta.json")

        logger.info(f"Exported template {template_name} to {export_dir}")
        return True

    def import_template(self, import_dir: str, template_name: str) -> bool:
        """Import a template from a directory."""
        import_path = Path(import_dir)

        # Load metadata
        metadata_file = import_path / f"{template_name}.meta.json"
        if not metadata_file.exists():
            logger.error(f"Template metadata not found: {metadata_file}")
            return False

        try:
            with open(metadata_file) as f:
                metadata = json.load(f)

            template = ConfigTemplate(
                name=metadata["name"],
                description=metadata["description"],
                template_path=metadata["template_path"],
                output_format=TemplateFormat(metadata["output_format"]),
                required_variables=metadata.get("required_variables", []),
                optional_variables=metadata.get("optional_variables", {}),
                validation_schema=metadata.get("validation_schema"),
                tags=metadata.get("tags", []),
                version=metadata.get("version", "1.0.0"),
                author=metadata.get("author", "imported")
            )

            # Copy template file
            template_file = import_path / template.template_path
            if template_file.exists():
                import shutil
                shutil.copy2(template_file, self.templates_dir / template.template_path)

            # Store template
            self.templates[template.name] = template
            self._save_template_metadata(template)

            logger.info(f"Imported template: {template_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to import template: {e}")
            return False

    def _load_templates(self) -> None:
        """Load existing templates from disk."""
        for meta_file in self.templates_dir.glob("*.meta.json"):
            try:
                with open(meta_file) as f:
                    metadata = json.load(f)

                template = ConfigTemplate(
                    name=metadata["name"],
                    description=metadata["description"],
                    template_path=metadata["template_path"],
                    output_format=TemplateFormat(metadata["output_format"]),
                    required_variables=metadata.get("required_variables", []),
                    optional_variables=metadata.get("optional_variables", {}),
                    validation_schema=metadata.get("validation_schema"),
                    tags=metadata.get("tags", []),
                    version=metadata.get("version", "1.0.0"),
                    author=metadata.get("author", "system")
                )

                self.templates[template.name] = template

            except Exception as e:
                logger.error(f"Failed to load template metadata from {meta_file}: {e}")

    def _save_template_metadata(self, template: ConfigTemplate) -> None:
        """Save template metadata to disk."""
        metadata_file = self.templates_dir / f"{template.name}.meta.json"

        metadata = {
            "name": template.name,
            "description": template.description,
            "template_path": template.template_path,
            "output_format": template.output_format.value,
            "required_variables": template.required_variables,
            "optional_variables": template.optional_variables,
            "validation_schema": template.validation_schema,
            "tags": template.tags,
            "version": template.version,
            "author": template.author,
            "created_at": template.created_at.isoformat()
        }

        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)

    def _format_output(self, content: str, format: TemplateFormat) -> str:
        """Format output content based on specified format."""
        if format == TemplateFormat.JSON:
            # Try to parse and reformat JSON for validation
            try:
                parsed = json.loads(content)
                return json.dumps(parsed, indent=2)
            except json.JSONDecodeError:
                return content

        elif format == TemplateFormat.YAML:
            # Try to parse and reformat YAML for validation
            try:
                parsed = yaml.safe_load(content)
                return yaml.dump(parsed, default_flow_style=False)
            except yaml.YAMLError:
                return content

        return content

    def _create_default_templates(self) -> None:
        """Create default configuration templates."""
        # Docker Compose template
        if "docker_compose" not in self.templates:
            docker_compose_template = ConfigTemplate(
                name="docker_compose",
                description="Docker Compose configuration for Vana application",
                template_path="docker_compose.j2",
                output_format=TemplateFormat.YAML,
                required_variables=["app_name", "app_port"],
                optional_variables={
                    "redis_enabled": True,
                    "postgres_enabled": True,
                    "environment": "development"
                },
                tags=["docker", "deployment", "infrastructure"]
            )

            docker_compose_content = """version: '3.8'

services:
  {{ app_name }}:
    build: .
    ports:
      - "{{ app_port }}:{{ app_port }}"
    environment:
      - ENV={{ environment }}
      - PORT={{ app_port }}
    {% if redis_enabled %}
    depends_on:
      - redis
    {% endif %}
    {% if postgres_enabled %}
      - postgres
    {% endif %}

{% if redis_enabled %}
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
{% endif %}

{% if postgres_enabled %}
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB={{ app_name }}_{{ environment }}
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
{% endif %}

volumes:
{% if redis_enabled %}
  redis_data:
{% endif %}
{% if postgres_enabled %}
  postgres_data:
{% endif %}
"""

            self.create_template(docker_compose_template, docker_compose_content)

        # GitHub Actions CI template
        if "github_actions_ci" not in self.templates:
            github_ci_template = ConfigTemplate(
                name="github_actions_ci",
                description="GitHub Actions CI/CD workflow",
                template_path="github_actions_ci.j2",
                output_format=TemplateFormat.YAML,
                required_variables=["python_version"],
                optional_variables={
                    "node_version": "18",
                    "run_tests": True,
                    "run_lint": True,
                    "deploy_enabled": False
                },
                tags=["github", "ci", "automation"]
            )

            github_ci_content = """name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python {{ python_version }}
      uses: actions/setup-python@v4
      with:
        python-version: {{ python_version }}
        
    {% if node_version %}
    - name: Set up Node.js {{ node_version }}
      uses: actions/setup-node@v4
      with:
        node-version: {{ node_version }}
    {% endif %}
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        
    {% if run_lint %}
    - name: Lint with flake8
      run: |
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
        flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics
    {% endif %}
    
    {% if run_tests %}
    - name: Test with pytest
      run: |
        pytest --cov=./ --cov-report=xml
        
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage.xml
    {% endif %}
    
  {% if deploy_enabled %}
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Deploy to production
      run: |
        echo "Deploy to production"
        # Add deployment steps here
  {% endif %}
"""

            self.create_template(github_ci_template, github_ci_content)


# Global instance
_template_manager: ConfigTemplateManager | None = None


def get_template_manager() -> ConfigTemplateManager:
    """Get the global template manager."""
    global _template_manager
    if _template_manager is None:
        _template_manager = ConfigTemplateManager()
    return _template_manager
