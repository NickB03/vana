#!/usr/bin/env python3
"""
VS Code Native Integration for VANA Memory System
Provides hooks for VS Code extensions and workspace integration
"""

import asyncio
import json
from pathlib import Path
from typing import Any, Dict, List


class VSCodeMemoryIntegration:
    """Integration layer for VS Code workspace and extensions"""

    def __init__(self, memory_manager):
        self.memory_manager = memory_manager
        self.workspace_config = {}
        self.active_files = set()

    async def initialize_workspace(self, workspace_path: str):
        """Initialize memory system for VS Code workspace"""

        workspace = Path(workspace_path)

        # Load workspace configuration
        vscode_settings = workspace / ".vscode" / "settings.json"
        if vscode_settings.exists():
            with open(vscode_settings) as f:
                self.workspace_config = json.load(f)

        # Setup memory-specific workspace settings
        await self._setup_memory_workspace_config(workspace)

        # Index existing workspace files
        await self._index_workspace_files(workspace)

        print(f"🚀 VS Code workspace initialized: {workspace}")

    async def _setup_memory_workspace_config(self, workspace: Path):
        """Setup VS Code workspace configuration for memory integration"""

        vscode_dir = workspace / ".vscode"
        vscode_dir.mkdir(exist_ok=True)

        # Memory-specific settings
        memory_settings = {
            "vana.memory.autoIndex": True,
            "vana.memory.watchPatterns": ["**/*.md", "**/*.py", "**/*.js", "**/*.ts", "**/CLAUDE.md", "**/.claude/**"],
            "vana.memory.excludePatterns": [
                "**/node_modules/**",
                "**/.git/**",
                "**/__pycache__/**",
                "**/dist/**",
                "**/build/**",
            ],
            "vana.memory.chunkSize": 1000,
            "vana.memory.chunkOverlap": 200,
        }

        # Update or create settings.json
        settings_file = vscode_dir / "settings.json"
        if settings_file.exists():
            with open(settings_file) as f:
                existing_settings = json.load(f)
            existing_settings.update(memory_settings)
        else:
            existing_settings = memory_settings

        with open(settings_file, "w") as f:
            json.dump(existing_settings, f, indent=2)

        print(f"⚙️ Updated VS Code settings with memory configuration")

    async def _index_workspace_files(self, workspace: Path):
        """Index relevant files in the workspace"""

        watch_patterns = self.workspace_config.get(
            "vana.memory.watchPatterns", ["**/*.md", "**/*.py", "**/*.js", "**/*.ts"]
        )

        exclude_patterns = self.workspace_config.get(
            "vana.memory.excludePatterns", ["**/node_modules/**", "**/.git/**"]
        )

        indexed_count = 0

        for pattern in watch_patterns:
            for file_path in workspace.glob(pattern):
                if file_path.is_file() and not self._should_exclude(file_path, exclude_patterns):
                    try:
                        await self.memory_manager.reindex_file(file_path)
                        indexed_count += 1
                    except Exception as e:
                        print(f"❌ Error indexing {file_path}: {e}")

        print(f"📚 Indexed {indexed_count} workspace files")

    def _should_exclude(self, file_path: Path, exclude_patterns: List[str]) -> bool:
        """Check if file should be excluded from indexing"""

        file_str = str(file_path)

        for pattern in exclude_patterns:
            # Simple pattern matching (could be enhanced with fnmatch)
            pattern_clean = pattern.replace("**/", "").replace("/**", "")
            if pattern_clean in file_str:
                return True

        return False

    async def handle_file_change(self, file_path: str, change_type: str):
        """Handle file changes from VS Code"""

        path = Path(file_path)

        if change_type in ["created", "modified"]:
            # Re-index the changed file
            await self.memory_manager.reindex_file(path)
            self.active_files.add(str(path))
            print(f"🔄 Updated memory for: {path.name}")

        elif change_type == "deleted":
            # Remove from memory
            await self.memory_manager.remove_file_from_memory(path)
            self.active_files.discard(str(path))
            print(f"🗑️ Removed memory for: {path.name}")

    async def get_context_for_file(self, file_path: str) -> Dict[str, Any]:
        """Get relevant memory context for a specific file"""

        path = Path(file_path)

        # Search for related context
        search_terms = [
            path.stem,  # Filename without extension
            path.suffix[1:] if path.suffix else "",  # File type
        ]

        # Add file-specific terms
        if path.suffix == ".py":
            search_terms.extend(["python", "function", "class", "import"])
        elif path.suffix in [".js", ".ts"]:
            search_terms.extend(["javascript", "function", "component", "export"])
        elif path.suffix == ".md":
            search_terms.extend(["documentation", "guide", "instructions"])

        # Search memory for relevant context
        relevant_context = []
        for term in search_terms[:3]:  # Limit to avoid too many searches
            results = await self.memory_manager.search_memory(term, n_results=2)
            relevant_context.extend(results)

        # Deduplicate and rank
        unique_context = []
        seen_hashes = set()

        for context in relevant_context:
            content_hash = context["metadata"].get("content_hash", "")
            if content_hash not in seen_hashes:
                seen_hashes.add(content_hash)
                unique_context.append(context)

        return {
            "file_path": str(path),
            "relevant_context": unique_context[:5],  # Top 5 most relevant
            "context_summary": self._generate_context_summary(unique_context[:5]),
        }

    def _generate_context_summary(self, context_items: List[Dict]) -> str:
        """Generate a summary of relevant context"""

        if not context_items:
            return "No relevant context found."

        summary_parts = []

        for item in context_items:
            source = item["metadata"].get("file_name", "unknown")
            section = item["metadata"].get("section", "unknown")
            content_preview = item["content"][:100] + "..." if len(item["content"]) > 100 else item["content"]

            summary_parts.append(f"**{source}** → {section}: {content_preview}")

        return "\n".join(summary_parts)

    async def suggest_related_files(self, current_file: str) -> List[str]:
        """Suggest related files based on memory content"""

        current_path = Path(current_file)

        # Get context for current file
        context = await self.get_context_for_file(current_file)

        # Extract related file paths from context
        related_files = set()

        for context_item in context["relevant_context"]:
            related_file = context_item["metadata"].get("file_path")
            if related_file and related_file != current_file:
                related_files.add(related_file)

        return list(related_files)[:10]  # Limit to 10 suggestions

    def generate_vscode_extension_manifest(self) -> Dict[str, Any]:
        """Generate VS Code extension manifest for memory integration"""

        manifest = {
            "name": "vana-memory-integration",
            "displayName": "VANA Memory Integration",
            "description": "Automatic memory management and context retrieval for VANA project",
            "version": "1.0.0",
            "engines": {"vscode": "^1.60.0"},
            "categories": ["Other"],
            "contributes": {
                "commands": [
                    {"command": "vana.memory.indexCurrentFile", "title": "Index Current File in Memory"},
                    {"command": "vana.memory.searchMemory", "title": "Search Memory"},
                    {"command": "vana.memory.getFileContext", "title": "Get Context for Current File"},
                    {"command": "vana.memory.suggestRelatedFiles", "title": "Suggest Related Files"},
                ],
                "keybindings": [
                    {"command": "vana.memory.searchMemory", "key": "ctrl+shift+m", "mac": "cmd+shift+m"},
                    {"command": "vana.memory.getFileContext", "key": "ctrl+shift+c", "mac": "cmd+shift+c"},
                ],
                "configuration": {
                    "title": "VANA Memory",
                    "properties": {
                        "vana.memory.autoIndex": {
                            "type": "boolean",
                            "default": True,
                            "description": "Automatically index files when they change",
                        },
                        "vana.memory.chunkSize": {
                            "type": "number",
                            "default": 1000,
                            "description": "Size of text chunks for memory indexing",
                        },
                    },
                },
            },
        }

        return manifest


# VS Code Extension JavaScript Template
VSCODE_EXTENSION_TEMPLATE = """
const vscode = require('vscode');
const { spawn } = require('child_process');

function activate(context) {
    // Register commands
    let disposable = vscode.commands.registerCommand('vana.memory.indexCurrentFile', async () => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const filePath = activeEditor.document.fileName;
            await indexFile(filePath);
            vscode.window.showInformationMessage(`Indexed ${filePath} in memory`);
        }
    });
    
    context.subscriptions.push(disposable);
    
    // Watch for file changes
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{md,py,js,ts}');
    
    watcher.onDidChange(async (uri) => {
        const config = vscode.workspace.getConfiguration('vana.memory');
        if (config.get('autoIndex')) {
            await handleFileChange(uri.fsPath, 'modified');
        }
    });
    
    watcher.onDidCreate(async (uri) => {
        const config = vscode.workspace.getConfiguration('vana.memory');
        if (config.get('autoIndex')) {
            await handleFileChange(uri.fsPath, 'created');
        }
    });
    
    watcher.onDidDelete(async (uri) => {
        await handleFileChange(uri.fsPath, 'deleted');
    });
    
    context.subscriptions.push(watcher);
}

async function indexFile(filePath) {
    return new Promise((resolve, reject) => {
        const python = spawn('python', ['scripts/auto_memory_integration.py', '--index-file', filePath]);
        
        python.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Memory indexing failed with code ${code}`));
            }
        });
    });
}

async function handleFileChange(filePath, changeType) {
    return new Promise((resolve, reject) => {
        const python = spawn('python', ['scripts/vscode_integration.py', '--file-change', filePath, changeType]);
        
        python.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`File change handling failed with code ${code}`));
            }
        });
    });
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
"""


async def main():
    """Example usage of VS Code integration"""

    from auto_memory_integration import EnhancedVanaMemory

    # Initialize memory manager
    memory = EnhancedVanaMemory()

    # Initialize VS Code integration
    vscode_integration = VSCodeMemoryIntegration(memory)

    # Setup workspace
    await vscode_integration.initialize_workspace(".")

    # Example file context
    context = await vscode_integration.get_context_for_file("CLAUDE.md")
    print(f"Context for CLAUDE.md: {len(context['relevant_context'])} items")


if __name__ == "__main__":
    asyncio.run(main())
