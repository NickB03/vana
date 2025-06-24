"""
GitHub Server Integration
GitHub API integration for repository and issue management.

This module provides comprehensive GitHub API integration including repository
management, issue tracking, code search, and pull request operations.
"""

import logging
import subprocess
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


@dataclass
class Repository:
    """GitHub repository information"""

    name: str
    full_name: str
    description: Optional[str]
    private: bool
    language: Optional[str]
    stars: int
    forks: int
    url: str
    clone_url: str


@dataclass
class Issue:
    """GitHub issue information"""

    number: int
    title: str
    body: str
    state: str
    author: str
    assignees: List[str]
    labels: List[str]
    created_at: str
    updated_at: str
    url: str


@dataclass
class Comment:
    """GitHub comment information"""

    id: int
    body: str
    author: str
    created_at: str
    updated_at: str
    url: str


@dataclass
class PullRequest:
    """GitHub pull request information"""

    number: int
    title: str
    body: str
    state: str
    author: str
    head_branch: str
    base_branch: str
    mergeable: Optional[bool]
    created_at: str
    updated_at: str
    url: str


@dataclass
class CodeResult:
    """GitHub code search result"""

    filename: str
    path: str
    repository: str
    url: str
    score: float
    matches: List[Dict[str, Any]]


@dataclass
class FileContent:
    """GitHub file content"""

    name: str
    path: str
    content: str
    encoding: str
    size: int
    sha: str
    url: str


class GitHubServer:
    """GitHub API integration for repository and issue management."""

    def __init__(self, api_token: str, rate_limit: int = 60):
        """Initialize with GitHub API token."""
        self.api_token = api_token
        self.rate_limit = rate_limit
        self.base_url = "https://api.github.com"
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"token {api_token}",
                "Accept": "application/vnd.github.v3+json",
                "User-Agent": "VANA-MCP-GitHub/1.0",
            }
        )

    # Repository Management
    def create_repository(
        self, name: str, description: str, private: bool = False
    ) -> Repository:
        """Create a new GitHub repository."""
        try:
            data = {
                "name": name,
                "description": description,
                "private": private,
                "auto_init": True,
            }

            response = self.session.post(f"{self.base_url}/user/repos", json=data)
            response.raise_for_status()

            repo_data = response.json()
            return self._parse_repository(repo_data)

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to create repository {name}: {e}")
            raise

    def clone_repository(self, repo_url: str, local_path: str) -> bool:
        """Clone repository to local path."""
        try:
            # Use git command to clone
            cmd = ["git", "clone", repo_url, local_path]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            if result.returncode == 0:
                logger.info(f"Successfully cloned {repo_url} to {local_path}")
                return True
            else:
                logger.error(f"Failed to clone repository: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            logger.error(f"Clone operation timed out for {repo_url}")
            return False
        except Exception as e:
            logger.error(f"Error cloning repository: {e}")
            return False

    def list_repositories(self, user: str, limit: int = 50) -> List[Repository]:
        """List user repositories."""
        try:
            params = {
                "per_page": min(limit, 100),
                "sort": "updated",
                "direction": "desc",
            }

            response = self.session.get(
                f"{self.base_url}/users/{user}/repos", params=params
            )
            response.raise_for_status()

            repos_data = response.json()
            return [self._parse_repository(repo) for repo in repos_data]

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to list repositories for {user}: {e}")
            raise

    # Issue Management
    def create_issue(
        self, repo: str, title: str, body: str, labels: List[str] = None
    ) -> Issue:
        """Create a new issue."""
        try:
            data = {"title": title, "body": body}

            if labels:
                data["labels"] = labels

            response = self.session.post(
                f"{self.base_url}/repos/{repo}/issues", json=data
            )
            response.raise_for_status()

            issue_data = response.json()
            return self._parse_issue(issue_data)

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to create issue in {repo}: {e}")
            raise

    def update_issue(self, repo: str, issue_number: int, **kwargs) -> Issue:
        """Update an existing issue."""
        try:
            # Filter valid update fields
            valid_fields = ["title", "body", "state", "labels", "assignees"]
            data = {k: v for k, v in kwargs.items() if k in valid_fields}

            response = self.session.patch(
                f"{self.base_url}/repos/{repo}/issues/{issue_number}", json=data
            )
            response.raise_for_status()

            issue_data = response.json()
            return self._parse_issue(issue_data)

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to update issue {issue_number} in {repo}: {e}")
            raise

    def search_issues(self, query: str, repo: str = None) -> List[Issue]:
        """Search issues with query."""
        try:
            search_query = query
            if repo:
                search_query = f"repo:{repo} {query}"

            params = {
                "q": search_query,
                "sort": "updated",
                "order": "desc",
                "per_page": 50,
            }

            response = self.session.get(f"{self.base_url}/search/issues", params=params)
            response.raise_for_status()

            search_data = response.json()
            return [self._parse_issue(issue) for issue in search_data.get("items", [])]

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to search issues: {e}")
            raise

    def add_comment(self, repo: str, issue_number: int, comment: str) -> Comment:
        """Add comment to issue."""
        try:
            data = {"body": comment}

            response = self.session.post(
                f"{self.base_url}/repos/{repo}/issues/{issue_number}/comments",
                json=data,
            )
            response.raise_for_status()

            comment_data = response.json()
            return self._parse_comment(comment_data)

        except requests.exceptions.RequestException as e:
            logger.error(
                f"Failed to add comment to issue {issue_number} in {repo}: {e}"
            )
            raise

    # Code Operations
    def search_code(
        self, query: str, repo: str = None, language: str = None
    ) -> List[CodeResult]:
        """Search code in repositories."""
        try:
            search_query = query
            if repo:
                search_query = f"repo:{repo} {query}"
            if language:
                search_query = f"{search_query} language:{language}"

            params = {
                "q": search_query,
                "sort": "indexed",
                "order": "desc",
                "per_page": 30,
            }

            response = self.session.get(f"{self.base_url}/search/code", params=params)
            response.raise_for_status()

            search_data = response.json()
            return [
                self._parse_code_result(result)
                for result in search_data.get("items", [])
            ]

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to search code: {e}")
            raise

    def get_file_content(
        self, repo: str, file_path: str, ref: str = "main"
    ) -> FileContent:
        """Get file content from repository."""
        try:
            params = {"ref": ref}

            response = self.session.get(
                f"{self.base_url}/repos/{repo}/contents/{file_path}", params=params
            )
            response.raise_for_status()

            file_data = response.json()
            return self._parse_file_content(file_data)

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to get file content {file_path} from {repo}: {e}")
            raise

    def create_pull_request(
        self, repo: str, title: str, body: str, head: str, base: str
    ) -> PullRequest:
        """Create a pull request."""
        try:
            data = {"title": title, "body": body, "head": head, "base": base}

            response = self.session.post(
                f"{self.base_url}/repos/{repo}/pulls", json=data
            )
            response.raise_for_status()

            pr_data = response.json()
            return self._parse_pull_request(pr_data)

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to create pull request in {repo}: {e}")
            raise

    # Helper methods for parsing API responses
    def _parse_repository(self, repo_data: Dict[str, Any]) -> Repository:
        """Parse repository data from API response."""
        return Repository(
            name=repo_data.get("name", ""),
            full_name=repo_data.get("full_name", ""),
            description=repo_data.get("description"),
            private=repo_data.get("private", False),
            language=repo_data.get("language"),
            stars=repo_data.get("stargazers_count", 0),
            forks=repo_data.get("forks_count", 0),
            url=repo_data.get("html_url", ""),
            clone_url=repo_data.get("clone_url", ""),
        )

    def _parse_issue(self, issue_data: Dict[str, Any]) -> Issue:
        """Parse issue data from API response."""
        return Issue(
            number=issue_data.get("number", 0),
            title=issue_data.get("title", ""),
            body=issue_data.get("body", ""),
            state=issue_data.get("state", ""),
            author=issue_data.get("user", {}).get("login", ""),
            assignees=[
                assignee.get("login", "")
                for assignee in issue_data.get("assignees", [])
            ],
            labels=[label.get("name", "") for label in issue_data.get("labels", [])],
            created_at=issue_data.get("created_at", ""),
            updated_at=issue_data.get("updated_at", ""),
            url=issue_data.get("html_url", ""),
        )

    def _parse_comment(self, comment_data: Dict[str, Any]) -> Comment:
        """Parse comment data from API response."""
        return Comment(
            id=comment_data.get("id", 0),
            body=comment_data.get("body", ""),
            author=comment_data.get("user", {}).get("login", ""),
            created_at=comment_data.get("created_at", ""),
            updated_at=comment_data.get("updated_at", ""),
            url=comment_data.get("html_url", ""),
        )

    def _parse_pull_request(self, pr_data: Dict[str, Any]) -> PullRequest:
        """Parse pull request data from API response."""
        return PullRequest(
            number=pr_data.get("number", 0),
            title=pr_data.get("title", ""),
            body=pr_data.get("body", ""),
            state=pr_data.get("state", ""),
            author=pr_data.get("user", {}).get("login", ""),
            head_branch=pr_data.get("head", {}).get("ref", ""),
            base_branch=pr_data.get("base", {}).get("ref", ""),
            mergeable=pr_data.get("mergeable"),
            created_at=pr_data.get("created_at", ""),
            updated_at=pr_data.get("updated_at", ""),
            url=pr_data.get("html_url", ""),
        )

    def _parse_code_result(self, result_data: Dict[str, Any]) -> CodeResult:
        """Parse code search result from API response."""
        return CodeResult(
            filename=result_data.get("name", ""),
            path=result_data.get("path", ""),
            repository=result_data.get("repository", {}).get("full_name", ""),
            url=result_data.get("html_url", ""),
            score=result_data.get("score", 0.0),
            matches=result_data.get("text_matches", []),
        )

    def _parse_file_content(self, file_data: Dict[str, Any]) -> FileContent:
        """Parse file content from API response."""
        import base64

        content = ""
        encoding = file_data.get("encoding", "")

        if encoding == "base64":
            try:
                content = base64.b64decode(file_data.get("content", "")).decode("utf-8")
            except Exception as e:
                logger.warning(f"Failed to decode base64 content: {e}")
                content = file_data.get("content", "")
        else:
            content = file_data.get("content", "")

        return FileContent(
            name=file_data.get("name", ""),
            path=file_data.get("path", ""),
            content=content,
            encoding=encoding,
            size=file_data.get("size", 0),
            sha=file_data.get("sha", ""),
            url=file_data.get("html_url", ""),
        )
