#!/usr/bin/env python3
"""
Documentation Reorganization Script

This script automates the reorganization of the VANA project documentation
according to the plan outlined in doc-cleanup.md.
"""

import os
import shutil
import glob
import re
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('doc_reorganize.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Constants
DOCS_DIR = 'docs'
NEW_STRUCTURE_DIR = os.path.join(DOCS_DIR, 'new_structure')
BACKUP_DIR = os.path.join(DOCS_DIR, 'backup', datetime.now().strftime('%Y%m%d_%H%M%S'))
INVENTORY_DIR = os.path.join(DOCS_DIR, 'inventory')

# Directory structure
DIRECTORIES = [
    os.path.join(NEW_STRUCTURE_DIR, 'architecture'),
    os.path.join(NEW_STRUCTURE_DIR, 'guides'),
    os.path.join(NEW_STRUCTURE_DIR, 'implementation'),
    os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'n8n'),
    os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'mcp'),
    os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'vertex-ai'),
    os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'agent-engine'),
    os.path.join(NEW_STRUCTURE_DIR, 'project', 'sprints'),
    os.path.join(NEW_STRUCTURE_DIR, 'api'),
    os.path.join(NEW_STRUCTURE_DIR, 'troubleshooting'),
]

# Document mapping
DOCUMENT_MAPPING = {
    # Memory System
    'docs/memory-architecture.md': os.path.join(NEW_STRUCTURE_DIR, 'architecture', 'memory-system.md'),
    'docs/enhanced-memory-operations.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'memory-implementation.md'),
    'docs/persistent-memory-implementation.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'memory-implementation.md'),
    'docs/enhanced-memory-architecture.md': os.path.join(NEW_STRUCTURE_DIR, 'architecture', 'memory-system.md'),
    'docs/memory-integration.md': os.path.join(NEW_STRUCTURE_DIR, 'guides', 'memory-commands.md'),
    'README-MEMORY.md': os.path.join(NEW_STRUCTURE_DIR, 'guides', 'memory-commands.md'),

    # ADK Integration
    'docs/adk-integration-guide.md': os.path.join(NEW_STRUCTURE_DIR, 'guides', 'adk-integration-guide.md'),
    'docs/context-management-architecture.md': os.path.join(NEW_STRUCTURE_DIR, 'architecture', 'adk-integration.md'),
    'docs/adk-tool-adapter.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'adk-implementation.md'),

    # MCP Integration
    'docs/n8n-mcp-server-setup.md': os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'mcp', 'setup.md'),
    'docs/n8n-mcp-integration.md': os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'mcp', 'integration.md'),
    'docs/n8n-mcp-checklist.md': os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'mcp', 'checklist.md'),
    'mcp_key_knowledge.md': os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'mcp', 'key-knowledge.md'),

    # Vector Search
    'docs/vector-search-fixes.md': os.path.join(NEW_STRUCTURE_DIR, 'troubleshooting', 'vector-search-issues.md'),
    'docs/vector-search-implementation.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'vector-search.md'),
    'docs/vertex-ai-transition.md': os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'vertex-ai', 'transition.md'),

    # Knowledge Graph
    'docs/knowledge-graph-integration.md': os.path.join(NEW_STRUCTURE_DIR, 'architecture', 'knowledge-graph.md'),
    'docs/knowledge-graph-commands.md': os.path.join(NEW_STRUCTURE_DIR, 'guides', 'knowledge-graph-commands.md'),
    'docs/knowledge-graph-setup.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'knowledge-graph.md'),
    'docs/enhanced-knowledge-graph.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'knowledge-graph.md'),

    # Web Search
    'docs/web-search-integration.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'web-search.md'),
    'docs/web-search-configuration.md': os.path.join(NEW_STRUCTURE_DIR, 'guides', 'web-search-configuration.md'),
    'knowledge_docs/web_search_integration.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'web-search.md'),

    # Project Status
    'docs/sprint-status.md': os.path.join(NEW_STRUCTURE_DIR, 'project', 'sprint-status.md'),
    'docs/sprint1-implementation.md': os.path.join(NEW_STRUCTURE_DIR, 'project', 'sprints', 'sprint-1.md'),
    'docs/sprint2-implementation.md': os.path.join(NEW_STRUCTURE_DIR, 'project', 'sprints', 'sprint-2.md'),
    'docs/project-status.md': os.path.join(NEW_STRUCTURE_DIR, 'project', 'index.md'),
    'docs/implementation-roadmap.md': os.path.join(NEW_STRUCTURE_DIR, 'project', 'roadmap.md'),

    # n8n Workflows
    'docs/n8n-workflow-implementation.md': os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'n8n', 'implementation.md'),
    'docs/n8n-workflow-implementation-summary.md': os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'n8n', 'summary.md'),
    'n8n-workflows/README.md': os.path.join(NEW_STRUCTURE_DIR, 'integrations', 'n8n', 'README.md'),

    # Team Coordination
    'docs/team-coordination-system.md': os.path.join(NEW_STRUCTURE_DIR, 'architecture', 'agent-orchestration.md'),
    'docs/team-coordination-guide.md': os.path.join(NEW_STRUCTURE_DIR, 'guides', 'team-coordination.md'),
    'docs/agent-orchestration-model.md': os.path.join(NEW_STRUCTURE_DIR, 'architecture', 'agent-orchestration.md'),

    # Security
    'docs/security-components.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'security-components.md'),
    'docs/security-implementation-results.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'security-components.md'),
    'docs/security-integration-guide.md': os.path.join(NEW_STRUCTURE_DIR, 'guides', 'security-integration.md'),
    'docs/security-implementation-summary.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'security-components.md'),

    # Environment Setup
    'docs/environment-setup.md': os.path.join(NEW_STRUCTURE_DIR, 'guides', 'environment-setup.md'),
    'docs/environment-changes-summary.md': os.path.join(NEW_STRUCTURE_DIR, 'guides', 'environment-setup.md'),
    'docs/launch-configuration.md': os.path.join(NEW_STRUCTURE_DIR, 'guides', 'environment-setup.md'),

    # Troubleshooting
    'docs/troubleshooting.md': os.path.join(NEW_STRUCTURE_DIR, 'troubleshooting', 'common-issues.md'),

    # Document Processing
    'docs/document-processing-strategy.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'document-processing.md'),
    'knowledge_docs/advanced_document_processing.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'document-processing.md'),

    # Monitoring
    'docs/monitoring-dashboard.md': os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'monitoring.md'),

    # Command Reference
    'docs/vana-command-reference.md': os.path.join(NEW_STRUCTURE_DIR, 'api', 'command-reference.md'),

    # Architecture Overview
    'docs/vana-architecture-guide.md': os.path.join(NEW_STRUCTURE_DIR, 'architecture', 'overview.md'),
}

def create_directories():
    """Create the directory structure for the new documentation."""
    logger.info("Creating directory structure...")

    for directory in DIRECTORIES:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"Created directory: {directory}")

def backup_existing_docs():
    """Backup existing documentation."""
    logger.info(f"Backing up existing documentation to {BACKUP_DIR}...")

    os.makedirs(BACKUP_DIR, exist_ok=True)

    # Copy all markdown files from docs directory
    for md_file in glob.glob(os.path.join(DOCS_DIR, '*.md')):
        shutil.copy2(md_file, os.path.join(BACKUP_DIR, os.path.basename(md_file)))
        logger.info(f"Backed up: {md_file}")

    # Copy README.md
    if os.path.exists('README.md'):
        shutil.copy2('README.md', os.path.join(BACKUP_DIR, 'README.md'))
        logger.info("Backed up: README.md")

    # Copy README-MEMORY.md
    if os.path.exists('README-MEMORY.md'):
        shutil.copy2('README-MEMORY.md', os.path.join(BACKUP_DIR, 'README-MEMORY.md'))
        logger.info("Backed up: README-MEMORY.md")

def migrate_content():
    """Migrate content to the new structure."""
    logger.info("Migrating content to new structure...")

    for source, destination in DOCUMENT_MAPPING.items():
        if os.path.exists(source):
            # Create destination directory if it doesn't exist
            os.makedirs(os.path.dirname(destination), exist_ok=True)

            # Copy the file
            shutil.copy2(source, destination)
            logger.info(f"Migrated: {source} -> {destination}")
        else:
            logger.warning(f"Source file not found: {source}")

def update_links():
    """Update links in the documentation to point to the new structure."""
    logger.info("Updating links in documentation...")

    # Create a reverse mapping for link updates
    reverse_mapping = {}
    for source, destination in DOCUMENT_MAPPING.items():
        reverse_mapping[os.path.basename(source)] = os.path.relpath(destination, NEW_STRUCTURE_DIR)

    # Update links in all markdown files in the new structure
    for md_file in glob.glob(os.path.join(NEW_STRUCTURE_DIR, '**/*.md'), recursive=True):
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Update links
        for old_name, new_path in reverse_mapping.items():
            # Match markdown links: [text](old_name)
            content = re.sub(r'\[([^\]]+)\]\((?:\.\.\/)*' + re.escape(old_name) + r'\)', r'[\1](' + new_path + r')', content)

        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(content)

        logger.info(f"Updated links in: {md_file}")

def create_index_files():
    """Create index files for each section."""
    logger.info("Creating index files...")

    # Architecture index
    if not os.path.exists(os.path.join(NEW_STRUCTURE_DIR, 'architecture', 'index.md')):
        with open(os.path.join(NEW_STRUCTURE_DIR, 'architecture', 'index.md'), 'w', encoding='utf-8') as f:
            f.write("# Architecture Documentation\n\n")
            f.write("[Home](../index.md) > Architecture\n\n")
            f.write("This section contains architecture documentation for the VANA system.\n\n")
            f.write("## Contents\n\n")
            f.write("- [System Overview](overview.md)\n")
            f.write("- [ADK Integration](adk-integration.md)\n")
            f.write("- [Memory System](memory-system.md)\n")
            f.write("- [Vector Search](vector-search.md)\n")
            f.write("- [Knowledge Graph](knowledge-graph.md)\n")
            f.write("- [Agent Orchestration](agent-orchestration.md)\n")
        logger.info("Created architecture index file")

    # Implementation index
    if not os.path.exists(os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'index.md')):
        with open(os.path.join(NEW_STRUCTURE_DIR, 'implementation', 'index.md'), 'w', encoding='utf-8') as f:
            f.write("# Implementation Documentation\n\n")
            f.write("[Home](../index.md) > Implementation\n\n")
            f.write("This section contains implementation documentation for the VANA system.\n\n")
            f.write("## Contents\n\n")
            f.write("- [ADK Implementation](adk-implementation.md)\n")
            f.write("- [Memory Implementation](memory-implementation.md)\n")
            f.write("- [Vector Search](vector-search.md)\n")
            f.write("- [Knowledge Graph](knowledge-graph.md)\n")
            f.write("- [Web Search](web-search.md)\n")
            f.write("- [Document Processing](document-processing.md)\n")
            f.write("- [Security Components](security-components.md)\n")
        logger.info("Created implementation index file")

    # Guides index
    if not os.path.exists(os.path.join(NEW_STRUCTURE_DIR, 'guides', 'index.md')):
        with open(os.path.join(NEW_STRUCTURE_DIR, 'guides', 'index.md'), 'w', encoding='utf-8') as f:
            f.write("# User and Developer Guides\n\n")
            f.write("[Home](../index.md) > Guides\n\n")
            f.write("This section contains user and developer guides for the VANA system.\n\n")
            f.write("## Contents\n\n")
            f.write("- [Environment Setup](environment-setup.md)\n")
            f.write("- [ADK Integration Guide](adk-integration-guide.md)\n")
            f.write("- [Memory Commands](memory-commands.md)\n")
            f.write("- [Knowledge Graph Commands](knowledge-graph-commands.md)\n")
            f.write("- [Vector Search Usage](vector-search-usage.md)\n")
            f.write("- [Web Search Configuration](web-search-configuration.md)\n")
            f.write("- [Troubleshooting Guide](troubleshooting-guide.md)\n")
        logger.info("Created guides index file")

    # Main index
    if not os.path.exists(os.path.join(NEW_STRUCTURE_DIR, 'index.md')):
        with open(os.path.join(NEW_STRUCTURE_DIR, 'index.md'), 'w', encoding='utf-8') as f:
            f.write("# VANA Documentation\n\n")
            f.write("## Architecture\n")
            f.write("- [System Overview](architecture/overview.md)\n")
            f.write("- [ADK Integration](architecture/adk-integration.md)\n")
            f.write("- [Memory System](architecture/memory-system.md)\n")
            f.write("- [Vector Search](architecture/vector-search.md)\n")
            f.write("- [Knowledge Graph](architecture/knowledge-graph.md)\n")
            f.write("- [Agent Orchestration](architecture/agent-orchestration.md)\n\n")
            f.write("## Implementation\n")
            f.write("- [ADK Implementation](implementation/adk-implementation.md)\n")
            f.write("- [Memory Implementation](implementation/memory-implementation.md)\n")
            f.write("- [Vector Search](implementation/vector-search.md)\n")
            f.write("- [Knowledge Graph](implementation/knowledge-graph.md)\n")
            f.write("- [Web Search](implementation/web-search.md)\n")
            f.write("- [Document Processing](implementation/document-processing.md)\n")
            f.write("- [Security Components](implementation/security-components.md)\n\n")
            f.write("## Guides\n")
            f.write("- [Environment Setup](guides/environment-setup.md)\n")
            f.write("- [ADK Integration Guide](guides/adk-integration-guide.md)\n")
            f.write("- [Memory Commands](guides/memory-commands.md)\n")
            f.write("- [Knowledge Graph Commands](guides/knowledge-graph-commands.md)\n")
            f.write("- [Vector Search Usage](guides/vector-search-usage.md)\n")
            f.write("- [Web Search Configuration](guides/web-search-configuration.md)\n")
            f.write("- [Troubleshooting Guide](guides/troubleshooting-guide.md)\n\n")
            f.write("## Integrations\n")
            f.write("- [n8n Workflows](integrations/n8n/README.md)\n")
            f.write("- [MCP Integration](integrations/mcp/README.md)\n")
            f.write("- [Vertex AI Integration](integrations/vertex-ai/README.md)\n")
            f.write("- [Agent Engine Integration](integrations/agent-engine/README.md)\n\n")
            f.write("## Project\n")
            f.write("- [Sprint Status](project/sprint-status.md)\n")
            f.write("- [Roadmap](project/roadmap.md)\n")
            f.write("- [Sprint 1 Implementation](project/sprints/sprint-1.md)\n")
            f.write("- [Sprint 2 Implementation](project/sprints/sprint-2.md)\n\n")
            f.write("## API Documentation\n")
            f.write("- [API Reference](api/index.md)\n")
            f.write("- [Memory API](api/memory-api.md)\n")
            f.write("- [Knowledge Graph API](api/knowledge-graph-api.md)\n")
            f.write("- [Vector Search API](api/vector-search-api.md)\n\n")
            f.write("## Troubleshooting\n")
            f.write("- [Common Issues](troubleshooting/common-issues.md)\n")
            f.write("- [Vector Search Issues](troubleshooting/vector-search-issues.md)\n")
            f.write("- [Memory System Issues](troubleshooting/memory-system-issues.md)\n")
            f.write("- [ADK Integration Issues](troubleshooting/adk-integration-issues.md)\n")
        logger.info("Created main index file")

def deploy_new_structure():
    """Deploy the new structure to replace the old one."""
    logger.info("Deploying new structure...")

    # Move files from new_structure to docs
    for item in os.listdir(NEW_STRUCTURE_DIR):
        source = os.path.join(NEW_STRUCTURE_DIR, item)
        destination = os.path.join(DOCS_DIR, item)

        if os.path.isdir(source):
            # If the destination directory exists, remove it
            if os.path.exists(destination):
                shutil.rmtree(destination)

            # Copy the directory
            shutil.copytree(source, destination)
            logger.info(f"Deployed directory: {item}")
        else:
            # If the destination file exists, remove it
            if os.path.exists(destination):
                os.remove(destination)

            # Copy the file
            shutil.copy2(source, destination)
            logger.info(f"Deployed file: {item}")

    # Remove the new_structure directory
    shutil.rmtree(NEW_STRUCTURE_DIR)
    logger.info("Removed temporary new_structure directory")

def main():
    """Main function to execute the documentation reorganization."""
    logger.info("Starting documentation reorganization...")

    try:
        # Create directories
        create_directories()

        # Backup existing docs
        backup_existing_docs()

        # Migrate content
        migrate_content()

        # Update links
        update_links()

        # Create index files
        create_index_files()

        # Deploy new structure
        deploy_new_structure()

        logger.info("Documentation reorganization completed successfully!")
        print("\nDocumentation reorganization completed successfully!")
        print(f"The new structure is available in {NEW_STRUCTURE_DIR}")
        print("Review the changes and then run the script again with deploy_new_structure() uncommented to deploy the changes.")

    except Exception as e:
        logger.error(f"Error during documentation reorganization: {str(e)}")
        print(f"\nError during documentation reorganization: {str(e)}")
        print("Check the log file for details.")

if __name__ == "__main__":
    main()
