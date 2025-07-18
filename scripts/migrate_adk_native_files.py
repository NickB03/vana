#!/usr/bin/env python3
"""
Migrate only ADK-native and essential files to new repository.
Creates documentation about what's excluded and why.
"""

import os
import shutil
from pathlib import Path
import sys

# Source directory
SOURCE_DIR = Path("/Users/nick/Development/vana")

# Files that follow ADK patterns or are essential
ADK_NATIVE_FILES = {
    # Core agent that uses ADK patterns
    "agents/vana/team.py": "Uses ADK Agent class - needs simplification",
    
    # Specialists that use ADK LlmAgent
    "agents/specialists/architecture_specialist.py": "Uses LlmAgent - ADK pattern",
    "agents/specialists/data_science_specialist.py": "Uses LlmAgent - ADK pattern",
    "agents/specialists/security_specialist.py": "Uses LlmAgent - ADK pattern",
    "agents/specialists/devops_specialist.py": "Uses LlmAgent - ADK pattern",
    "agents/specialists/content_creation_specialist.py": "Uses LlmAgent - ADK pattern",
    "agents/specialists/research_specialist.py": "Uses LlmAgent - ADK pattern",
    
    # Essential tools (need simplification but required)
    "agents/specialists/architecture_tools.py": "Tool implementations - need consolidation",
    "agents/specialists/data_science_tools.py": "Tool implementations - need consolidation",
    "agents/specialists/security_tools.py": "Tool implementations - need consolidation",
    "agents/specialists/devops_tools.py": "Tool implementations - need consolidation",
    
    # Web search is valuable
    "lib/_tools/google_search_v2.py": "Essential functionality - keep",
    
    # Project configuration
    "pyproject.toml": "Project dependencies",
    "poetry.lock": "Locked dependencies",
    ".env.example": "Environment template",
    ".gitignore": "Git ignore patterns",
    
    # Empty init files for package structure
    "agents/__init__.py": "Package init",
    "agents/vana/__init__.py": "Package init",
    "agents/specialists/__init__.py": "Package init",
}

# What we're excluding and why
EXCLUDED_PATTERNS = {
    "main.py": "FastAPI integration - will rebuild with clean separation",
    "main_agentic.py": "Custom entry point - not ADK standard",
    "api/": "Web API layer - will rebuild if needed",
    "agents/base_agents.py": "Anti-pattern - use direct root_agent",
    "agents/vana/enhanced_orchestrator.py": "Custom routing - use ADK SequentialAgent",
    "lib/_tools/adk_tools.py": "Over-engineered - needs simplification",
    "lib/_tools/adk_mcp_tools.py": "MCP integration - VS Code only",
    "lib/_shared_libraries/": "All custom implementations - use ADK natives",
    "lib/context/": "Over-complicated - use simple state",
    "lib/adk_integration/": "Not needed with proper ADK usage",
    "lib/logging_config.py": "Custom logging - use standard Python logging",
    "lib/response_formatter.py": "API specific - not needed for ADK",
    "tests/": "All tests - will write new ones",
    "scripts/": "All scripts - not core functionality",
    "docs/": "All documentation - starting fresh",
    "dashboard/": "Not core functionality",
    ".development/": "Development artifacts",
}

def create_migration_docs(dest_dir: Path) -> str:
    """Create documentation about the migration."""
    return """# VANA ADK-Native Migration

This repository contains only the files that follow Google ADK patterns or are essential for functionality.

## Migration Status

### ✅ Included Files (ADK-Native or Essential)

1. **Core Agent** (`agents/vana/team.py`)
   - Uses ADK `Agent` class
   - TODO: Simplify and remove custom logic

2. **Specialists** (6 files in `agents/specialists/`)
   - All use ADK `LlmAgent` class properly
   - Follow ADK patterns for agent definition
   - TODO: Ensure each has ≤6 tools

3. **Specialist Tools** (4 files)
   - Essential functionality for specialists
   - TODO: Consolidate to respect 6-tool limit
   - TODO: Simplify implementations

4. **Web Search** (`lib/_tools/google_search_v2.py`)
   - Essential functionality
   - TODO: Simplify async wrapper

5. **Configuration**
   - `pyproject.toml`, `poetry.lock` - Dependencies
   - `.env.example` - Environment template
   - `.gitignore` - Git configuration

### ❌ Excluded Files (Not ADK-Native)

1. **Custom Entry Points**
   - `main.py` - FastAPI integration (rebuild separately if needed)
   - `main_agentic.py` - Custom experimental entry point

2. **Custom Orchestration**
   - `enhanced_orchestrator.py` - Replace with ADK SequentialAgent
   - `base_agents.py` - Anti-pattern, use direct root_agent

3. **Custom Libraries**
   - `orchestrator_metrics.py` - Use ADK callbacks instead
   - `adk_memory_service.py` - Use ADK SessionService
   - `specialist_context.py` - Over-complicated
   - All integration layers - Not needed

4. **Over-Engineered Tools**
   - `adk_tools.py` - Needs complete simplification
   - Other tool wrappers - Unnecessary complexity

## Next Steps

### 1. Create ADK-Native Orchestrator
```python
# vana.py - Simple ADK pattern
from google.adk.agents import Agent, SequentialAgent
from agents.specialists import router

orchestrator = SequentialAgent(
    name="vana",
    sub_agents=[router, ...]  # Dynamic routing via callbacks
)

root_agent = orchestrator
```

### 2. Simplify Tools
- Remove async wrappers
- Direct, simple implementations
- Consolidate to meet 6-tool limit

### 3. Create Clean Entry Point
```python
# run.py - ADK Runner
from google.adk.runners import Runner
from agents.vana import root_agent

runner = Runner(agent=root_agent)
runner.run("Your query here")
```

### 4. Optional: Web API Layer
If web access needed, create separate `api/` directory with clean FastAPI integration.

## Architecture Goals

1. **Pure ADK patterns** - No custom orchestration
2. **Simple tools** - Direct implementations
3. **Clear separation** - ADK logic vs web layer
4. **Minimal code** - ~20-25 files total

## Missing Functionality to Rebuild

1. **Routing Logic** → Use ADK callbacks with SequentialAgent
2. **Metrics** → Use ADK before_model/after_tool callbacks  
3. **Memory** → Use ADK SessionService
4. **API Layer** → Separate FastAPI app if needed
5. **Integration Tests** → New test suite

This migration creates a clean foundation aligned with ADK best practices.
"""

def migrate_files(dest_dir: Path):
    """Migrate ADK-native files to new repository."""
    if not dest_dir.exists():
        dest_dir.mkdir(parents=True)
    
    copied_files = []
    
    # Copy ADK-native files
    for file_path, description in ADK_NATIVE_FILES.items():
        src = SOURCE_DIR / file_path
        dst = dest_dir / file_path
        
        if src.exists():
            # Create parent directories
            dst.parent.mkdir(parents=True, exist_ok=True)
            
            # Copy file
            shutil.copy2(src, dst)
            copied_files.append(f"✓ {file_path} - {description}")
            print(f"✓ Copied: {file_path}")
        else:
            # Create empty __init__.py files if they don't exist
            if file_path.endswith("__init__.py"):
                dst.parent.mkdir(parents=True, exist_ok=True)
                dst.touch()
                copied_files.append(f"✓ {file_path} - Created empty")
                print(f"✓ Created: {file_path}")
            else:
                print(f"⚠️  Not found: {file_path}")
    
    # Create README
    readme_content = create_migration_docs(dest_dir)
    readme_path = dest_dir / "MIGRATION_README.md"
    readme_path.write_text(readme_content)
    print(f"\n✓ Created: MIGRATION_README.md")
    
    # Create initial directory structure
    for dir_name in ["tools", "api", "config"]:
        (dest_dir / dir_name).mkdir(exist_ok=True)
        (dest_dir / dir_name / "__init__.py").touch()
    
    print(f"\n📊 Migration Summary:")
    print(f"- Copied {len(copied_files)} ADK-native files")
    print(f"- Created migration documentation")
    print(f"- Created directory structure")
    
    return copied_files

def main():
    if len(sys.argv) != 2:
        print("Usage: python migrate_adk_native_files.py <destination_directory>")
        sys.exit(1)
    
    dest_dir = Path(sys.argv[1])
    
    # Confirm if directory exists
    if dest_dir.exists() and any(dest_dir.iterdir()):
        response = input(f"⚠️  {dest_dir} is not empty. Continue? (y/N): ")
        if response.lower() != 'y':
            print("Aborted.")
            sys.exit(0)
    
    print(f"\n🚀 Migrating ADK-native files to {dest_dir}")
    print("=" * 60)
    
    migrate_files(dest_dir)
    
    print("\n✅ Migration complete!")
    print("\n📋 Next steps:")
    print("1. cd " + str(dest_dir))
    print("2. git init")
    print("3. Review MIGRATION_README.md")
    print("4. Create simplified vana.py orchestrator")
    print("5. Simplify tool implementations")
    print("6. Run: poetry install")

if __name__ == "__main__":
    main()