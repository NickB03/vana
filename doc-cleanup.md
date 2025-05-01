# VANA Documentation Reorganization Plan

## Executive Summary

This plan outlines a systematic approach to reorganize the project documentation to improve clarity, reduce redundancy, and ensure better alignment with code implementation. The plan is designed to be executed by Auggie in phases, with clear deliverables and validation steps.

## Phase 1: Documentation Inventory & Analysis (1-2 days)

### Step 1.1: Create Documentation Inventory
```bash
# Create inventory directory
mkdir -p docs/inventory
# Generate a list of all markdown files in the repository
find . -name "*.md" > docs/inventory/all_markdown_files.txt
# Generate a list of documentation topics using grep
grep -h "^# " $(find . -name "*.md") | sort | uniq > docs/inventory/doc_topics.txt
# Generate file sizes to identify major documents
find . -name "*.md" -exec ls -la {} \; | sort -nr -k5 > docs/inventory/doc_sizes.txt
```

### Step 1.2: Analyze Documentation Coverage
Create a document mapping table in `docs/inventory/doc_mapping.md`:

```markdown
# Documentation Mapping

| Component | Implementation Files | Documentation Files | Status | Priority |
|-----------|----------------------|---------------------|--------|----------|
| ADK Integration | [list files here] | [list docs here] | [Complete/Partial/Missing] | [High/Medium/Low] |
| Context Management | ... | ... | ... | ... |
| Vector Search | ... | ... | ... | ... |
| Knowledge Graph | ... | ... | ... | ... |
| MCP Integration | ... | ... | ... | ... |
| n8n Workflows | ... | ... | ... | ... |
| Memory System | ... | ... | ... | ... |
```

### Step 1.3: Identify Redundancies and Gaps
Create a document in `docs/inventory/redundancies_gaps.md`:

```markdown
# Documentation Redundancies and Gaps

## Redundancies
1. [Topic] is covered in:
   - file1.md
   - file2.md
   - file3.md

[Repeat for each redundant topic]

## Gaps
1. [Component/Feature] lacks documentation
2. [Component/Feature] has incomplete documentation
```

## Phase 2: Structure Creation (1 day)

### Step 2.1: Create New Directory Structure
```bash
# Create new directory structure
mkdir -p docs/new_structure/architecture
mkdir -p docs/new_structure/guides
mkdir -p docs/new_structure/implementation
mkdir -p docs/new_structure/integrations
mkdir -p docs/new_structure/integrations/n8n
mkdir -p docs/new_structure/integrations/mcp
mkdir -p docs/new_structure/project
mkdir -p docs/new_structure/project/sprints
mkdir -p docs/new_structure/api
mkdir -p docs/new_structure/troubleshooting
```

### Step 2.2: Define Documentation Templates
Create template files for each major documentation type:

- `docs/new_structure/templates/architecture_template.md`
- `docs/new_structure/templates/guide_template.md`
- `docs/new_structure/templates/implementation_template.md`
- `docs/new_structure/templates/integration_template.md`

Each template should have a consistent structure with sections like:
- Overview/Purpose
- Components/Features
- Dependencies
- Configuration
- Usage Examples
- Troubleshooting
- Related Documents

## Phase 3: Content Migration (2-3 days)

### Step 3.1: Consolidate Similar Documentation
For each topic with redundant documentation:

```bash
# Example for memory system documentation
mkdir -p docs/new_structure/temp/memory
cp docs/memory-architecture.md docs/new_structure/temp/memory/
cp docs/enhanced-memory-operations.md docs/new_structure/temp/memory/
cp docs/persistent-memory-implementation.md docs/new_structure/temp/memory/
cp README-MEMORY.md docs/new_structure/temp/memory/
```

### Step 3.2: Create Consolidated Documents
For each group of related documents, create a consolidated version:

1. Create an outline of the consolidated document
2. Extract relevant sections from each source document
3. Reorganize into a cohesive structure
4. Add cross-references to related documents
5. Update code references if necessary

Example for memory system documentation:
```markdown
# Memory System

## Overview
[Extract from README-MEMORY.md]

## Architecture
[Extract from memory-architecture.md]

## Implementation
[Extract from persistent-memory-implementation.md]

## Operations
[Extract from enhanced-memory-operations.md]

## Integration with Other Components
[Extract from relevant sections]

## Command Reference
[Extract from relevant sections]

## Troubleshooting
[Extract from relevant sections]
```

### Step 3.3: Migrate Project Documentation
```bash
# Move sprint documentation
cp docs/sprint*.md docs/new_structure/project/sprints/
# Move architecture documentation
cp docs/*architecture*.md docs/new_structure/architecture/
# Move guide documentation
cp docs/*guide*.md docs/new_structure/guides/
```

## Phase 4: Implementation Alignment (1-2 days)

### Step 4.1: Create Implementation-Documentation Links
For each implementation file, add a doc header:

```python
"""
Implementation of Memory Manager

Documentation: docs/implementation/memory-manager.md
Architecture: docs/architecture/memory-system.md
Related: 
- docs/integrations/n8n/memory-workflows.md
- docs/guides/memory-commands.md
"""
```

### Step 4.2: Create API Documentation
Extract API documentation from implementation files:

```bash
# Example for Python files
grep -r "def " --include="*.py" adk-setup/ | grep -v "__" > docs/new_structure/temp/api_functions.txt
```

Use this to create API documentation in `docs/new_structure/api/`.

## Phase 5: Navigation Creation (1 day)

### Step 5.1: Create Documentation Index
Create `docs/index.md` with links to all major documentation sections:

```markdown
# VANA Documentation

## Architecture
- [System Overview](architecture/overview.md)
- [ADK Integration](architecture/adk-integration.md)
- [Memory System](architecture/memory-system.md)
- ...

## Implementation
- [Context Manager](implementation/context-manager.md)
- [Vector Search](implementation/vector-search.md)
- ...

## Guides
- [Environment Setup](guides/setup.md)
- [Command Reference](guides/commands.md)
- ...

## Integrations
- [n8n Workflows](integrations/n8n/README.md)
- [MCP Integration](integrations/mcp/README.md)
- ...

## Project
- [Sprint Status](project/sprint-status.md)
- [Roadmap](project/roadmap.md)
- ...
```

### Step 5.2: Add Navigation to Each Document
Add a breadcrumb and table of contents to each document:

```markdown
# Memory System

[Home](../index.md) > [Architecture](./index.md) > Memory System

## Table of Contents
- [Overview](#overview)
- [Components](#components)
- [Configuration](#configuration)
- [Usage](#usage)
- [Related Documents](#related-documents)
```

### Step 5.3: Update README.md
Update the main README.md to reference the new documentation structure:

```markdown
# VANA Project

[... existing content ...]

## Documentation

The project documentation is organized as follows:

- [Architecture](docs/architecture/index.md): System design and component relationships
- [Implementation](docs/implementation/index.md): Implementation details for each component
- [Guides](docs/guides/index.md): User and developer guides
- [Integrations](docs/integrations/index.md): External integrations (n8n, MCP)
- [Project](docs/project/index.md): Project management documentation
```

## Phase 6: Review and Validation (1 day)

### Step 6.1: Verify Documentation Coverage
Check that all components have documentation:

```bash
# Create list of code files
find adk-setup -name "*.py" > docs/new_structure/temp/code_files.txt
# Check that each component has documentation
python scripts/verify_doc_coverage.py
```

### Step 6.2: Check for Broken Links
```bash
# Verify all internal links work
python scripts/check_internal_links.py
```

### Step 6.3: Review and Update
Manually review the reorganized documentation to ensure:
- All content has been migrated
- No critical information was lost
- The structure is consistent
- Navigation works as expected

## Phase 7: Deployment (0.5 day)

### Step 7.1: Back Up Original Documentation
```bash
# Create backup of original docs
mkdir -p docs_backup
cp -r docs/* docs_backup/
cp README*.md docs_backup/
```

### Step 7.2: Replace with New Structure
```bash
# Replace docs with new structure
rm -rf docs
mv docs/new_structure docs
```

### Step 7.3: Commit Changes
```bash
git add docs
git add README.md
git commit -m "Documentation reorganization - resolves #XXX"
git push origin main
```

## Documentation Maintenance Guidelines

1. **Single Source of Truth**: Each component should have one primary document
2. **Consistent Structure**: Use templates for new documentation
3. **Cross-Referencing**: Link related documents
4. **Code-Doc Alignment**: Update documentation when code changes
5. **Regular Reviews**: Schedule quarterly documentation reviews

## Specific Documentation Task Assignment Table

| Task | Current Files | Target Files | Priority | Complexity |
|------|---------------|--------------|----------|------------|
| Consolidate memory system docs | `README-MEMORY.md`, `docs/memory-architecture.md`, `docs/enhanced-memory-operations.md`, `docs/persistent-memory-implementation.md` | `docs/architecture/memory-system.md`, `docs/implementation/memory-implementation.md`, `docs/guides/memory-commands.md` | High | Medium |
| Consolidate ADK integration docs | `docs/adk-integration-guide.md`, `docs/context-management-architecture.md` | `docs/architecture/adk-integration.md`, `docs/implementation/context-management.md` | High | Medium |
| Organize MCP docs | `docs/n8n-mcp-server-setup.md`, `docs/n8n-mcp-integration.md`, `mcp_key_knowledge.md` | `docs/integrations/mcp/setup.md`, `docs/integrations/mcp/integration.md` | High | Low |
| Organize n8n workflows | `n8n-workflows/README.md`, related files | `docs/integrations/n8n/README.md`, `docs/integrations/n8n/memory-workflows.md` | Medium | Medium |
| Consolidate vector search docs | `docs/vector-search-fixes.md`, `docs/vector-search-implementation.md` | `docs/implementation/vector-search.md` | Medium | Low |
| Organize sprint documentation | `docs/sprint-status.md`, `docs/sprint*-implementation.md` | `docs/project/sprints/sprint-1.md`, `docs/project/sprints/sprint-2.md` | Low | Low |

## Implementation Script

To automate parts of this process, here's a Python script that can be created in `scripts/doc_reorganize.py`:

```python
#!/usr/bin/env python3
"""
Documentation reorganization script for VANA project.

This script helps automate the reorganization of project documentation
according to the documented plan.
"""

import os
import shutil
import re
import sys
from pathlib import Path

def create_directory_structure():
    """Create the new documentation directory structure."""
    base_dirs = [
        "docs/new_structure/architecture",
        "docs/new_structure/guides",
        "docs/new_structure/implementation",
        "docs/new_structure/integrations/n8n",
        "docs/new_structure/integrations/mcp",
        "docs/new_structure/project/sprints",
        "docs/new_structure/api",
        "docs/new_structure/troubleshooting",
        "docs/new_structure/templates",
        "docs/inventory",
        "docs/new_structure/temp"
    ]
    
    for directory in base_dirs:
        os.makedirs(directory, exist_ok=True)
        print(f"Created directory: {directory}")

def create_inventory():
    """Create inventory of documentation files."""
    # Find all markdown files
    os.system("find . -name '*.md' > docs/inventory/all_markdown_files.txt")
    
    # Extract topics
    os.system("grep -h '^# ' $(find . -name '*.md') | sort | uniq > docs/inventory/doc_topics.txt")
    
    # Get file sizes
    os.system("find . -name '*.md' -exec ls -la {} \; | sort -nr -k5 > docs/inventory/doc_sizes.txt")
    
    print("Created documentation inventory")

def create_templates():
    """Create documentation templates."""
    templates = {
        "architecture_template.md": """# [Component] Architecture
        
[Home](../../index.md) > [Architecture](./index.md) > [Component]

## Overview
[Brief description of the component and its purpose]

## Design Principles
[Key design principles]

## Components
[List and description of sub-components]

## Interactions
[How this component interacts with other components]

## Configuration
[Configuration options]

## Related Documents
- [Implementation](../implementation/[component].md)
- [Guide](../guides/[component].md)
""",
        "guide_template.md": """# [Component] Guide
        
[Home](../../index.md) > [Guides](./index.md) > [Component]

## Overview
[Brief description of what this guide covers]

## Prerequisites
[Prerequisites for using this component]

## Setup
[Setup instructions]

## Usage
[Usage examples]

## Command Reference
[List of commands and their descriptions]

## Troubleshooting
[Common issues and solutions]

## Related Documents
- [Architecture](../architecture/[component].md)
- [Implementation](../implementation/[component].md)
"""
    }
    
    for template_name, content in templates.items():
        template_path = f"docs/new_structure/templates/{template_name}"
        with open(template_path, "w") as f:
            f.write(content)
        print(f"Created template: {template_path}")

def copy_files_to_temp_dirs():
    """Copy files to temporary directories for consolidation."""
    copy_tasks = [
        {
            "name": "memory",
            "files": [
                "docs/memory-architecture.md", 
                "docs/enhanced-memory-operations.md", 
                "docs/persistent-memory-implementation.md", 
                "README-MEMORY.md"
            ]
        },
        {
            "name": "adk",
            "files": [
                "docs/adk-integration-guide.md", 
                "docs/context-management-architecture.md"
            ]
        },
        {
            "name": "mcp",
            "files": [
                "docs/n8n-mcp-server-setup.md", 
                "docs/n8n-mcp-integration.md", 
                "mcp_key_knowledge.md"
            ]
        }
    ]
    
    for task in copy_tasks:
        task_dir = f"docs/new_structure/temp/{task['name']}"
        os.makedirs(task_dir, exist_ok=True)
        
        for file in task['files']:
            if os.path.exists(file):
                shutil.copy(file, task_dir)
                print(f"Copied {file} to {task_dir}")
            else:
                print(f"Warning: File not found - {file}")

def create_index_file():
    """Create main documentation index file."""
    index_content = """# VANA Documentation

## Architecture
- [System Overview](architecture/overview.md)
- [ADK Integration](architecture/adk-integration.md)
- [Memory System](architecture/memory-system.md)

## Implementation
- [Context Manager](implementation/context-manager.md)
- [Vector Search](implementation/vector-search.md)
- [Knowledge Graph](implementation/knowledge-graph.md)

## Guides
- [Environment Setup](guides/setup.md)
- [Command Reference](guides/commands.md)
- [Memory Commands](guides/memory-commands.md)

## Integrations
- [n8n Workflows](integrations/n8n/README.md)
- [MCP Integration](integrations/mcp/README.md)

## Project
- [Sprint Status](project/sprint-status.md)
- [Roadmap](project/roadmap.md)

## API Documentation
- [API Reference](api/index.md)

## Troubleshooting
- [Common Issues](troubleshooting/common-issues.md)
- [Vector Search Issues](troubleshooting/vector-search-issues.md)
"""
    
    with open("docs/new_structure/index.md", "w") as f:
        f.write(index_content)
    
    print("Created documentation index file")

def main():
    """Main execution function."""
    if len(sys.argv) < 2:
        print("Usage: python doc_reorganize.py [phase]")
        print("Phases: structure, inventory, templates, copy, index, all")
        return
    
    phase = sys.argv[1]
    
    if phase == "structure" or phase == "all":
        create_directory_structure()
    
    if phase == "inventory" or phase == "all":
        create_inventory()
    
    if phase == "templates" or phase == "all":
        create_templates()
    
    if phase == "copy" or phase == "all":
        copy_files_to_temp_dirs()
    
    if phase == "index" or phase == "all":
        create_index_file()
    
    print(f"Completed phase: {phase}")

if __name__ == "__main__":
    main()
```

This plan provides a structured approach to reorganizing the VANA project documentation with clear phases, specific tasks, and validation steps. The detailed timeline gives Auggie a roadmap for execution, while the automation scripts help streamline repetitive tasks.