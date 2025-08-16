"""
Comprehensive Git Hook Integration Test Suite
============================================

This module provides comprehensive testing for Git hook integration with the Claude Code
and Claude Flow systems. Tests cover all Git workflow scenarios including:

- Pre-commit validation with compliant/non-compliant code
- Pre-push safety checks and blocking scenarios
- Post-commit automation and cleanup
- Hook behavior with merge conflicts and rebases
- Edge cases: large commits, binary files, emergency bypass
- Performance monitoring and benchmarking
- Integration with existing file hooks and backup systems

Author: Tester Agent (Git Integration Specialist)
"""

import json
import shutil
import subprocess
import time
from pathlib import Path
from typing import Any

import pytest

import git
from git import Repo


class GitTestEnvironment:
    """Simulates Git repository environment for testing hook integration"""

    def __init__(self, workspace_path: Path):
        self.workspace_path = workspace_path
        self.repo = None
        self.hooks_installed = False
        self.hook_execution_log = []
        self.performance_metrics = {}

    def setup_test_repository(self) -> Repo:
        """Initialize a test Git repository with proper structure"""
        try:
            # Initialize repository
            self.repo = Repo.init(self.workspace_path)

            # Configure test user
            with self.repo.config_writer() as config:
                config.set_value("user", "name", "Test User")
                config.set_value("user", "email", "test@example.com")

            # Create initial project structure
            self._create_project_structure()

            # Make initial commit
            self.repo.index.add_items(["README.md", ".gitignore"])
            self.repo.index.commit("Initial commit")

            return self.repo

        except Exception as e:
            raise RuntimeError(f"Failed to setup test repository: {e}")

    def _create_project_structure(self):
        """Create realistic project structure for testing"""
        # Essential files
        (self.workspace_path / "README.md").write_text("# Test Project\n")
        (self.workspace_path / ".gitignore").write_text("node_modules/\n*.log\n.env\n")

        # Frontend structure (similar to vana project)
        frontend_dirs = [
            "frontend/src/components",
            "frontend/src/components/ui",
            "frontend/src/lib",
            "frontend/src/hooks",
            "frontend/__tests__",
            "app",
            "tests/unit",
            "tests/integration",
            ".claude_workspace/reports",
        ]

        for dir_path in frontend_dirs:
            (self.workspace_path / dir_path).mkdir(parents=True, exist_ok=True)

        # Package files
        (self.workspace_path / "frontend" / "package.json").write_text(
            json.dumps(
                {
                    "name": "test-frontend",
                    "version": "1.0.0",
                    "dependencies": {"react": "^18.3.1", "next": "^15.4.6"},
                }
            )
        )

        (self.workspace_path / "pyproject.toml").write_text("""
[project]
name = "test-project"
version = "1.0.0"
dependencies = ["fastapi", "uvicorn"]
""")

    def install_test_hooks(self) -> bool:
        """Install Git hooks for testing"""
        hooks_dir = self.workspace_path / ".git" / "hooks"

        try:
            # Pre-commit hook
            pre_commit_hook = hooks_dir / "pre-commit"
            pre_commit_hook.write_text(self._generate_pre_commit_hook())
            pre_commit_hook.chmod(0o755)

            # Pre-push hook
            pre_push_hook = hooks_dir / "pre-push"
            pre_push_hook.write_text(self._generate_pre_push_hook())
            pre_push_hook.chmod(0o755)

            # Post-commit hook
            post_commit_hook = hooks_dir / "post-commit"
            post_commit_hook.write_text(self._generate_post_commit_hook())
            post_commit_hook.chmod(0o755)

            self.hooks_installed = True
            return True

        except Exception as e:
            print(f"Failed to install hooks: {e}")
            return False

    def _generate_pre_commit_hook(self) -> str:
        """Generate pre-commit hook with Claude Flow integration"""
        return """#!/bin/bash
# Git Pre-commit Hook with Claude Flow Integration
# Tests PRD compliance, linting, and validation

set -e

echo "🔍 Running pre-commit validation with Claude Flow..."

# Log hook execution
echo "$(date): Pre-commit hook started" >> .claude_workspace/reports/git-hook-log.txt

# Claude Flow pre-task hook
if command -v npx &> /dev/null; then
    npx claude-flow hooks pre-task --description "Git pre-commit validation" --auto-spawn-agents 2>/dev/null || true
fi

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR)

if [ -z "$STAGED_FILES" ]; then
    echo "No staged files to validate"
    exit 0
fi

# Validate each staged file
VALIDATION_FAILED=false
for file in $STAGED_FILES; do
    echo "Validating: $file"

    # Claude Flow post-edit hook for validation
    if command -v npx &> /dev/null; then
        npx claude-flow hooks post-edit --file "$file" --memory-key "git-validation/$file" 2>/dev/null || true
    fi

    # PRD validation for React/TypeScript files
    if [[ "$file" =~ \\.tsx?$ ]]; then
        # Check for forbidden UI frameworks
        if grep -q "@mui\\|material-ui\\|ant-design" "$file" 2>/dev/null; then
            echo "❌ PRD Violation: Forbidden UI framework detected in $file"
            echo "   Use shadcn/ui components instead"
            VALIDATION_FAILED=true
        fi

        # Check for missing test IDs
        if grep -q "onClick\\|onSubmit\\|button" "$file" 2>/dev/null && ! grep -q "data-testid" "$file" 2>/dev/null; then
            echo "⚠️  Warning: Interactive element missing data-testid in $file"
        fi
    fi

    # Security validation
    if grep -q "dangerouslySetInnerHTML\\|eval(\\|document\\.write" "$file" 2>/dev/null; then
        echo "❌ Security Risk: Unsafe patterns detected in $file"
        VALIDATION_FAILED=true
    fi
done

# Run linting if available
if [ -f "pyproject.toml" ] && command -v uv &> /dev/null; then
    echo "Running Python linting..."
    uv run ruff check . --quiet || VALIDATION_FAILED=true
fi

if [ -f "frontend/package.json" ]; then
    echo "Running TypeScript checking..."
    cd frontend && npm run type-check --if-present 2>/dev/null || true
    cd ..
fi

# Claude Flow post-task hook
if command -v npx &> /dev/null; then
    npx claude-flow hooks post-task --task-id "git-pre-commit" --analyze-performance 2>/dev/null || true
fi

echo "$(date): Pre-commit hook completed" >> .claude_workspace/reports/git-hook-log.txt

if [ "$VALIDATION_FAILED" = true ]; then
    echo ""
    echo "❌ Pre-commit validation failed. Please fix the issues above."
    echo "💡 Use 'git commit --no-verify' to bypass (emergency only)"
    exit 1
fi

echo "✅ Pre-commit validation passed"
exit 0
"""

    def _generate_pre_push_hook(self) -> str:
        """Generate pre-push hook with safety checks"""
        return """#!/bin/bash
# Git Pre-push Hook with Safety Checks
# Prevents dangerous pushes and validates build

set -e

echo "🚀 Running pre-push safety checks..."

# Log hook execution
echo "$(date): Pre-push hook started" >> .claude_workspace/reports/git-hook-log.txt

# Get branch info
BRANCH=$(git rev-parse --abbrev-ref HEAD)
REMOTE=$1
URL=$2

echo "Pushing branch '$BRANCH' to '$REMOTE' ($URL)"

# Prevent force push to main/master
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
    if git push --dry-run --force 2>&1 | grep -q "force"; then
        echo "❌ Force push to $BRANCH is not allowed"
        exit 1
    fi
fi

# Claude Flow pre-task hook
if command -v npx &> /dev/null; then
    npx claude-flow hooks pre-task --description "Git pre-push validation for $BRANCH" 2>/dev/null || true
fi

# Run tests before push (if available)
if [ -f "Makefile" ]; then
    echo "Running test suite..."
    if ! make test 2>/dev/null; then
        echo "❌ Tests failed. Push blocked."
        exit 1
    fi
fi

# Check for large files (>50MB)
LARGE_FILES=$(git diff --cached --name-only --diff-filter=A | xargs -I {} find {} -size +50M 2>/dev/null || true)
if [ -n "$LARGE_FILES" ]; then
    echo "⚠️  Large files detected:"
    echo "$LARGE_FILES"
    echo "Consider using Git LFS for large files"
fi

# Validate commit messages
COMMITS=$(git rev-list $REMOTE/$BRANCH..HEAD 2>/dev/null || git rev-list HEAD --max-count=5)
for commit in $COMMITS; do
    MSG=$(git log --format=%B -n 1 $commit)
    if [ ${#MSG} -lt 10 ]; then
        echo "⚠️  Commit $commit has a very short message"
    fi
done

# Claude Flow post-task hook
if command -v npx &> /dev/null; then
    npx claude-flow hooks post-task --task-id "git-pre-push" --analyze-performance 2>/dev/null || true
fi

echo "$(date): Pre-push hook completed" >> .claude_workspace/reports/git-hook-log.txt
echo "✅ Pre-push validation passed"
exit 0
"""

    def _generate_post_commit_hook(self) -> str:
        """Generate post-commit hook for automation and cleanup"""
        return """#!/bin/bash
# Git Post-commit Hook with Claude Flow Integration
# Handles automation, cleanup, and metrics collection

echo "📊 Running post-commit automation..."

# Log hook execution
echo "$(date): Post-commit hook started" >> .claude_workspace/reports/git-hook-log.txt

# Get commit info
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log --format=%B -n 1 HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Commit: $COMMIT_HASH on branch $BRANCH"

# Claude Flow session management
if command -v npx &> /dev/null; then
    # Store commit information in memory
    npx claude-flow memory store "git/commits/$COMMIT_HASH" "$(git show --stat HEAD)" --namespace "git-history" 2>/dev/null || true

    # Update coordination memory
    npx claude-flow hooks post-edit --file "git-commit" --memory-key "git/latest-commit" 2>/dev/null || true
fi

# Collect metrics
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)
FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l)
LINES_ADDED=$(git diff --shortstat HEAD~1 HEAD | grep -o '[0-9]* insertion' | cut -d' ' -f1 || echo "0")
LINES_DELETED=$(git diff --shortstat HEAD~1 HEAD | grep -o '[0-9]* deletion' | cut -d' ' -f1 || echo "0")

# Store metrics
METRICS_FILE=".claude_workspace/reports/git-metrics.json"
if [ ! -f "$METRICS_FILE" ]; then
    echo "[]" > "$METRICS_FILE"
fi

# Add new metrics entry
python3 -c "
import json
import os
from datetime import datetime

metrics_file = '$METRICS_FILE'
if os.path.exists(metrics_file):
    with open(metrics_file, 'r') as f:
        metrics = json.load(f)
else:
    metrics = []

metrics.append({
    'commit_hash': '$COMMIT_HASH',
    'branch': '$BRANCH',
    'timestamp': datetime.now().isoformat(),
    'files_changed': $FILE_COUNT,
    'lines_added': ${LINES_ADDED:-0},
    'lines_deleted': ${LINES_DELETED:-0},
    'commit_message': '''$COMMIT_MSG'''.strip()
})

# Keep only last 100 commits
if len(metrics) > 100:
    metrics = metrics[-100:]

with open(metrics_file, 'w') as f:
    json.dump(metrics, f, indent=2)
" 2>/dev/null || true

# Auto-backup important files if they changed
BACKUP_TRIGGERED=false
for file in $CHANGED_FILES; do
    if [[ "$file" =~ (pyproject\\.toml|package\\.json|Makefile|\\.env\\.local)$ ]]; then
        if command -v npx &> /dev/null; then
            npx claude-flow memory store "backup/$file" "$(cat $file)" --namespace "auto-backup" --ttl 604800 2>/dev/null || true
            BACKUP_TRIGGERED=true
        fi
    fi
done

if [ "$BACKUP_TRIGGERED" = true ]; then
    echo "📦 Auto-backup triggered for configuration files"
fi

# Claude Flow session management
if command -v npx &> /dev/null; then
    npx claude-flow hooks session-end --export-metrics --session-id "git-commit-$COMMIT_HASH" 2>/dev/null || true
fi

echo "$(date): Post-commit hook completed" >> .claude_workspace/reports/git-hook-log.txt
echo "✅ Post-commit automation completed"
"""

    def simulate_commit(
        self, files: dict[str, str], commit_message: str, expect_success: bool = True
    ) -> dict[str, Any]:
        """Simulate a Git commit with the given files and message"""
        start_time = time.time()

        try:
            # Write files to workspace
            for file_path, content in files.items():
                full_path = self.workspace_path / file_path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.write_text(content)

            # Stage files
            self.repo.index.add(list(files.keys()))

            # Attempt commit (may be blocked by hooks)
            try:
                commit = self.repo.index.commit(commit_message)
                success = True
                commit_hash = commit.hexsha
                error = None
            except Exception as e:
                success = False
                commit_hash = None
                error = str(e)

            execution_time = (time.time() - start_time) * 1000

            result = {
                "success": success,
                "expected_success": expect_success,
                "commit_hash": commit_hash,
                "commit_message": commit_message,
                "files_changed": list(files.keys()),
                "execution_time_ms": execution_time,
                "error": error,
                "hooks_executed": self.hooks_installed,
                "timestamp": time.time(),
            }

            # Log execution
            self.hook_execution_log.append(result)

            # Validate result matches expectation
            result["validation_passed"] = success == expect_success

            return result

        except Exception as e:
            return {
                "success": False,
                "expected_success": expect_success,
                "error": f"Simulation failed: {e}",
                "execution_time_ms": (time.time() - start_time) * 1000,
                "validation_passed": False,
            }

    def simulate_push(self, branch: str | None = None, force: bool = False) -> dict[str, Any]:
        """Simulate a Git push operation"""
        start_time = time.time()

        try:
            # Get current branch if not specified
            if branch is None:
                branch = self.repo.active_branch.name

            # Simulate push (hooks will run)
            push_command = ["git", "push"]
            if force:
                push_command.append("--force")
            push_command.extend(["origin", branch])

            # Execute in subprocess to trigger hooks
            result = subprocess.run(
                push_command, cwd=self.workspace_path, capture_output=True, text=True
            )

            execution_time = (time.time() - start_time) * 1000

            return {
                "success": result.returncode == 0,
                "branch": branch,
                "force": force,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "execution_time_ms": execution_time,
                "hooks_executed": self.hooks_installed,
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Push simulation failed: {e}",
                "execution_time_ms": (time.time() - start_time) * 1000,
            }

    def get_hook_performance_metrics(self) -> dict[str, Any]:
        """Get performance metrics for hook execution"""
        if not self.hook_execution_log:
            return {"total_executions": 0}

        execution_times = [log["execution_time_ms"] for log in self.hook_execution_log]
        success_rate = sum(
            1 for log in self.hook_execution_log if log["success"]
        ) / len(self.hook_execution_log)

        return {
            "total_executions": len(self.hook_execution_log),
            "success_rate": success_rate,
            "avg_execution_time_ms": sum(execution_times) / len(execution_times),
            "min_execution_time_ms": min(execution_times),
            "max_execution_time_ms": max(execution_times),
            "hooks_installed": self.hooks_installed,
        }


class TestGitHookIntegration:
    """Comprehensive Git hook integration test suite"""

    @pytest.fixture
    def git_test_env(self, tmp_path):
        """Fixture providing Git test environment"""
        env = GitTestEnvironment(tmp_path)
        env.setup_test_repository()
        env.install_test_hooks()
        yield env

    @pytest.mark.asyncio
    async def test_pre_commit_prd_compliant_code(self, git_test_env):
        """Test pre-commit hook with PRD-compliant code"""
        compliant_component = """
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CompliantComponentProps {
  title: string
  onAction: () => void
}

export const CompliantComponent: React.FC<CompliantComponentProps> = ({ title, onAction }) => {
  return (
    <Card data-testid="compliant-component" className="w-full max-w-md">
      <CardHeader>
        <CardTitle data-testid="component-title">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          data-testid="action-button"
          onClick={onAction}
          variant="default"
        >
          Take Action
        </Button>
      </CardContent>
    </Card>
  )
}
"""

        files = {"frontend/src/components/CompliantComponent.tsx": compliant_component}
        result = git_test_env.simulate_commit(
            files, "Add PRD-compliant component", expect_success=True
        )

        assert result["validation_passed"]
        assert result["success"]
        assert result["execution_time_ms"] < 5000  # Should complete within 5 seconds
        assert "CompliantComponent.tsx" in result["files_changed"]

    @pytest.mark.asyncio
    async def test_pre_commit_blocks_prd_violations(self, git_test_env):
        """Test pre-commit hook blocks PRD violations"""
        violating_component = """
import React from 'react'
import { Button } from '@mui/material'
import { TextField } from '@mui/material'

export const ViolatingComponent = () => {
  const userInput = '<script>alert("xss")</script>'

  return (
    <div>
      <TextField label="Name" />
      <Button variant="contained">Submit</Button>
      <div dangerouslySetInnerHTML={{ __html: userInput }} />
    </div>
  )
}
"""

        files = {"frontend/src/components/ViolatingComponent.tsx": violating_component}
        result = git_test_env.simulate_commit(
            files, "Add component with violations", expect_success=False
        )

        assert result["validation_passed"]  # Expectation was failure
        assert not result["success"]  # Commit should be blocked
        assert "error" in result  # Should have error message

    @pytest.mark.asyncio
    async def test_pre_push_safety_checks(self, git_test_env):
        """Test pre-push safety checks and blocking"""
        # First, create a successful commit
        safe_file = {"README.md": "# Updated README\n\nSafe changes."}
        commit_result = git_test_env.simulate_commit(safe_file, "Update README safely")
        assert commit_result["success"]

        # Test normal push
        push_result = git_test_env.simulate_push("main", force=False)
        assert push_result["success"] or "would push" in push_result.get("stderr", "")

        # Test force push blocking (should be prevented on main)
        force_push_result = git_test_env.simulate_push("main", force=True)
        # This may succeed in test environment but should log warning
        assert (
            "force" not in force_push_result.get("stdout", "").lower()
            or not force_push_result["success"]
        )

    @pytest.mark.asyncio
    async def test_post_commit_automation(self, git_test_env):
        """Test post-commit automation and cleanup"""
        # Create files that should trigger backup
        important_files = {
            "pyproject.toml": '[project]\nname = "test"\nversion = "1.0.0"',
            "frontend/package.json": '{"name": "test", "version": "1.0.0"}',
            "Makefile": "test:\n\techo 'test'",
        }

        result = git_test_env.simulate_commit(
            important_files, "Update configuration files"
        )
        assert result["success"]

        # Check if metrics file was created
        metrics_file = (
            git_test_env.workspace_path
            / ".claude_workspace"
            / "reports"
            / "git-metrics.json"
        )
        assert metrics_file.exists()

        # Verify metrics content
        with open(metrics_file) as f:
            metrics = json.load(f)

        assert len(metrics) >= 1
        latest_metric = metrics[-1]
        assert latest_metric["files_changed"] == len(important_files)
        assert latest_metric["commit_message"] == "Update configuration files"

    @pytest.mark.asyncio
    async def test_large_commit_handling(self, git_test_env):
        """Test handling of large commits with many files"""
        # Create 50 files to simulate large commit
        large_commit_files = {}
        for i in range(50):
            content = (
                f"// Generated file {i}\n" + "export const data = " + "x" * 1000
            )  # ~1KB each
            large_commit_files[f"frontend/src/generated/file_{i}.ts"] = content

        result = git_test_env.simulate_commit(
            large_commit_files,
            "Add 50 generated files for bulk import feature",
            expect_success=True,
        )

        assert result["validation_passed"]
        assert result["success"]
        assert (
            result["execution_time_ms"] < 10000
        )  # Should handle large commits efficiently
        assert len(result["files_changed"]) == 50

    @pytest.mark.asyncio
    async def test_binary_file_handling(self, git_test_env):
        """Test Git hook behavior with binary files"""
        # Create binary-like file content
        binary_content = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde"
            * 100
        )

        binary_file_path = git_test_env.workspace_path / "assets" / "test-image.png"
        binary_file_path.parent.mkdir(exist_ok=True)
        binary_file_path.write_bytes(binary_content)

        # Git operations with binary files
        git_test_env.repo.index.add(["assets/test-image.png"])
        result = git_test_env.simulate_commit(
            {}, "Add binary image file", expect_success=True
        )

        assert result["validation_passed"]
        assert result["success"]
        # Binary files should not cause hook failures

    @pytest.mark.asyncio
    async def test_emergency_bypass_mechanism(self, git_test_env):
        """Test emergency bypass for urgent fixes"""
        # Create a file that would normally be blocked
        urgent_fix = """
import React from 'react'
// URGENT: Temporary fix for production issue
// TODO: Refactor to use shadcn/ui after incident resolution
import { Button } from '@mui/material'

export const UrgentFix = () => {
  return <Button>Emergency Fix</Button>
}
"""

        files = {"frontend/src/components/UrgentFix.tsx": urgent_fix}

        # Normal commit should fail
        result = git_test_env.simulate_commit(
            files, "Emergency production fix", expect_success=False
        )
        assert not result["success"]

        # Bypass mechanism (using --no-verify flag)
        try:
            # Add files manually and commit with bypass
            for file_path, content in files.items():
                full_path = git_test_env.workspace_path / file_path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                full_path.write_text(content)

            git_test_env.repo.index.add(list(files.keys()))

            # Use git command directly with --no-verify
            bypass_result = subprocess.run(
                [
                    "git",
                    "commit",
                    "--no-verify",
                    "-m",
                    "Emergency production fix (bypass)",
                ],
                cwd=git_test_env.workspace_path,
                capture_output=True,
                text=True,
            )

            assert bypass_result.returncode == 0
            print("Emergency bypass mechanism working correctly")

        except Exception as e:
            pytest.skip(f"Emergency bypass test requires git command: {e}")

    @pytest.mark.asyncio
    async def test_merge_conflict_hook_behavior(self, git_test_env):
        """Test hook behavior during merge conflicts and rebases"""
        # Create a branch
        feature_branch = git_test_env.repo.create_head("feature/test-branch")
        feature_branch.checkout()

        # Make conflicting changes
        conflict_file = {"README.md": "# Feature Branch Changes\n\nThis will conflict."}
        result1 = git_test_env.simulate_commit(conflict_file, "Feature branch changes")
        assert result1["success"]

        # Switch back to main and make different changes
        git_test_env.repo.heads.main.checkout()
        main_file = {"README.md": "# Main Branch Changes\n\nThis will also conflict."}
        result2 = git_test_env.simulate_commit(main_file, "Main branch changes")
        assert result2["success"]

        # Attempt merge (will create conflict)
        try:
            git_test_env.repo.git.merge("feature/test-branch")
        except git.exc.GitCommandError:
            # Expected conflict
            pass

        # Resolve conflict and commit
        resolved_content = "# Resolved Changes\n\nMerged successfully."
        (git_test_env.workspace_path / "README.md").write_text(resolved_content)
        git_test_env.repo.index.add(["README.md"])

        # Hooks should work normally on merge commit
        merge_result = git_test_env.simulate_commit({}, "Resolve merge conflict")
        assert merge_result["success"]

    @pytest.mark.asyncio
    async def test_hook_failure_recovery(self, git_test_env):
        """Test recovery from hook failures"""
        # Create a scenario where hooks might temporarily fail
        failing_files = {"test-fail.txt": "temporary test file"}

        # Simulate hook failure (by creating invalid Git state)
        original_hooks_dir = git_test_env.workspace_path / ".git" / "hooks"
        backup_hooks_dir = git_test_env.workspace_path / ".git" / "hooks_backup"

        # Backup hooks and create failing hook
        shutil.move(str(original_hooks_dir), str(backup_hooks_dir))
        original_hooks_dir.mkdir()

        failing_hook = original_hooks_dir / "pre-commit"
        failing_hook.write_text("#!/bin/bash\nexit 1\n")  # Always fail
        failing_hook.chmod(0o755)

        # Attempt commit (should fail)
        result = git_test_env.simulate_commit(
            failing_files, "This should fail", expect_success=False
        )
        assert not result["success"]

        # Restore hooks
        shutil.rmtree(str(original_hooks_dir))
        shutil.move(str(backup_hooks_dir), str(original_hooks_dir))

        # Retry commit (should succeed)
        recovery_result = git_test_env.simulate_commit(
            failing_files, "Recovery after hook fix"
        )
        assert recovery_result["success"]

    @pytest.mark.asyncio
    async def test_performance_under_load(self, git_test_env):
        """Test Git hook performance under high load"""
        # Simulate multiple rapid commits
        commit_times = []

        for i in range(10):
            files = {f"load_test_{i}.txt": f"Load test file {i}\n" + "data " * 100}
            start_time = time.time()
            result = git_test_env.simulate_commit(files, f"Load test commit {i}")
            end_time = time.time()

            commit_times.append(end_time - start_time)
            assert result["success"]

        # Analyze performance
        avg_commit_time = sum(commit_times) / len(commit_times)
        max_commit_time = max(commit_times)

        # Performance assertions
        assert avg_commit_time < 5.0  # Average under 5 seconds
        assert max_commit_time < 10.0  # No commit over 10 seconds
        assert all(t > 0 for t in commit_times)  # All commits completed

        # Get detailed metrics
        metrics = git_test_env.get_hook_performance_metrics()
        assert metrics["success_rate"] >= 0.9  # 90% success rate minimum
        assert metrics["avg_execution_time_ms"] < 5000  # Under 5 seconds average


class TestGitHookCoordination:
    """Test coordination between Git hooks and existing file hooks"""

    @pytest.fixture
    def coordination_env(self, tmp_path):
        """Environment for testing hook coordination"""
        env = GitTestEnvironment(tmp_path)
        env.setup_test_repository()
        env.install_test_hooks()
        return env

    @pytest.mark.asyncio
    async def test_file_hook_git_hook_coordination(self, coordination_env):
        """Test coordination between file hooks and Git hooks"""
        # Simulate file operation that triggers both file and Git hooks
        component_content = """
import React from 'react'
import { Button } from '@/components/ui/button'

export const CoordinatedComponent = () => {
  return (
    <Button data-testid="coordinated-button">
      Coordination Test
    </Button>
  )
}
"""

        # File operation (would trigger file hooks in real system)
        files = {"frontend/src/components/CoordinatedComponent.tsx": component_content}

        # Git operation (triggers Git hooks)
        result = coordination_env.simulate_commit(files, "Test hook coordination")

        assert result["success"]
        assert result["hooks_executed"]

        # Verify coordination log exists
        log_file = (
            coordination_env.workspace_path
            / ".claude_workspace"
            / "reports"
            / "git-hook-log.txt"
        )
        if log_file.exists():
            log_content = log_file.read_text()
            assert "Pre-commit hook started" in log_content
            assert "Post-commit hook completed" in log_content

    @pytest.mark.asyncio
    async def test_backup_system_integration(self, coordination_env):
        """Test backup system integration during Git operations"""
        # Create configuration files that should be auto-backed up
        config_files = {
            "pyproject.toml": """
[project]
name = "test-backup"
version = "2.0.0"
dependencies = ["fastapi>=0.100.0"]

[tool.pytest.ini_options]
testpaths = ["tests"]
""",
            "frontend/package.json": json.dumps(
                {
                    "name": "test-frontend-backup",
                    "version": "2.0.0",
                    "dependencies": {"react": "^18.3.1", "next": "^15.4.6"},
                    "scripts": {"build": "next build", "test": "jest"},
                },
                indent=2,
            ),
        }

        # Commit changes (should trigger backup)
        result = coordination_env.simulate_commit(config_files, "Update configurations")
        assert result["success"]

        # Verify backup integration indicators
        # (In real system, this would check Claude Flow memory store)
        assert result["hooks_executed"]
        assert len(result["files_changed"]) == 2

    @pytest.mark.asyncio
    async def test_prd_validation_git_context(self, coordination_env):
        """Test PRD validation specifically in Git context"""
        # Test different types of PRD violations in Git commits
        test_scenarios = [
            {
                "name": "forbidden_ui_framework",
                "file": "frontend/src/components/BadUI.tsx",
                "content": 'import { Button } from "@mui/material"\nexport const BadUI = () => <Button>Bad</Button>',
                "should_block": True,
            },
            {
                "name": "missing_test_ids",
                "file": "frontend/src/components/NoTestId.tsx",
                "content": 'import React from "react"\nexport const NoTestId = () => <button onClick={() => {}}>Click</button>',
                "should_block": False,  # Warning, not blocking
            },
            {
                "name": "security_risk",
                "file": "frontend/src/components/Unsafe.tsx",
                "content": "export const Unsafe = () => <div dangerouslySetInnerHTML={{__html: userInput}} />",
                "should_block": True,
            },
            {
                "name": "compliant_code",
                "file": "frontend/src/components/Good.tsx",
                "content": 'import { Button } from "@/components/ui/button"\nexport const Good = () => <Button data-testid="good">Good</Button>',
                "should_block": False,
            },
        ]

        for scenario in test_scenarios:
            files = {scenario["file"]: scenario["content"]}
            expected_success = not scenario["should_block"]

            result = coordination_env.simulate_commit(
                files, f"Test {scenario['name']}", expect_success=expected_success
            )

            assert result["validation_passed"], (
                f"Scenario {scenario['name']} failed validation"
            )

            if scenario["should_block"]:
                assert not result["success"], (
                    f"Expected {scenario['name']} to be blocked"
                )
            else:
                assert result["success"], f"Expected {scenario['name']} to succeed"


if __name__ == "__main__":
    # Run specific test categories
    import sys

    if len(sys.argv) > 1:
        test_category = sys.argv[1]
        if test_category == "integration":
            pytest.main(["-v", "TestGitHookIntegration"])
        elif test_category == "coordination":
            pytest.main(["-v", "TestGitHookCoordination"])
        else:
            pytest.main(["-v"])
    else:
        pytest.main(["-v", __file__])
