"""
Tests for GitHub Server integration.
"""

import pytest
import responses
from unittest.mock import Mock, patch

from lib.mcp.servers.github_server import GitHubServer, Repository, Issue, Comment, PullRequest


@pytest.fixture
def github_server():
    """Create a GitHub server instance for testing."""
    return GitHubServer("test_token", rate_limit=60)


@pytest.fixture
def mock_repo_data():
    """Mock repository data from GitHub API."""
    return {
        "name": "test-repo",
        "full_name": "testuser/test-repo",
        "description": "A test repository",
        "private": False,
        "language": "Python",
        "stargazers_count": 42,
        "forks_count": 7,
        "html_url": "https://github.com/testuser/test-repo",
        "clone_url": "https://github.com/testuser/test-repo.git"
    }


@pytest.fixture
def mock_issue_data():
    """Mock issue data from GitHub API."""
    return {
        "number": 123,
        "title": "Test Issue",
        "body": "This is a test issue",
        "state": "open",
        "user": {"login": "testuser"},
        "assignees": [{"login": "assignee1"}],
        "labels": [{"name": "bug"}, {"name": "priority-high"}],
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-02T00:00:00Z",
        "html_url": "https://github.com/testuser/test-repo/issues/123"
    }


class TestGitHubServer:
    """Test cases for GitHub Server."""
    
    def test_initialization(self, github_server):
        """Test GitHub server initialization."""
        assert github_server.api_token == "test_token"
        assert github_server.rate_limit == 60
        assert github_server.base_url == "https://api.github.com"
        assert "Authorization" in github_server.session.headers
        assert github_server.session.headers["Authorization"] == "token test_token"
    
    @responses.activate
    def test_create_repository_success(self, github_server, mock_repo_data):
        """Test successful repository creation."""
        responses.add(
            responses.POST,
            "https://api.github.com/user/repos",
            json=mock_repo_data,
            status=201
        )
        
        repo = github_server.create_repository(
            name="test-repo",
            description="A test repository",
            private=False
        )
        
        assert isinstance(repo, Repository)
        assert repo.name == "test-repo"
        assert repo.full_name == "testuser/test-repo"
        assert repo.description == "A test repository"
        assert repo.private is False
        assert repo.language == "Python"
        assert repo.stars == 42
        assert repo.forks == 7
    
    @responses.activate
    def test_create_repository_failure(self, github_server):
        """Test repository creation failure."""
        responses.add(
            responses.POST,
            "https://api.github.com/user/repos",
            json={"message": "Repository creation failed"},
            status=422
        )
        
        with pytest.raises(Exception):
            github_server.create_repository("test-repo", "Description")
    
    @patch('subprocess.run')
    def test_clone_repository_success(self, mock_run, github_server):
        """Test successful repository cloning."""
        mock_run.return_value.returncode = 0
        
        result = github_server.clone_repository(
            "https://github.com/testuser/test-repo.git",
            "/tmp/test-repo"
        )
        
        assert result is True
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        assert args == ["git", "clone", "https://github.com/testuser/test-repo.git", "/tmp/test-repo"]
    
    @patch('subprocess.run')
    def test_clone_repository_failure(self, mock_run, github_server):
        """Test repository cloning failure."""
        mock_run.return_value.returncode = 1
        mock_run.return_value.stderr = "Clone failed"
        
        result = github_server.clone_repository(
            "https://github.com/testuser/test-repo.git",
            "/tmp/test-repo"
        )
        
        assert result is False
    
    @responses.activate
    def test_list_repositories(self, github_server, mock_repo_data):
        """Test repository listing."""
        responses.add(
            responses.GET,
            "https://api.github.com/users/testuser/repos",
            json=[mock_repo_data],
            status=200
        )
        
        repos = github_server.list_repositories("testuser", limit=50)
        
        assert len(repos) == 1
        assert isinstance(repos[0], Repository)
        assert repos[0].name == "test-repo"
    
    @responses.activate
    def test_create_issue_success(self, github_server, mock_issue_data):
        """Test successful issue creation."""
        responses.add(
            responses.POST,
            "https://api.github.com/repos/testuser/test-repo/issues",
            json=mock_issue_data,
            status=201
        )
        
        issue = github_server.create_issue(
            repo="testuser/test-repo",
            title="Test Issue",
            body="This is a test issue",
            labels=["bug"]
        )
        
        assert isinstance(issue, Issue)
        assert issue.number == 123
        assert issue.title == "Test Issue"
        assert issue.body == "This is a test issue"
        assert issue.state == "open"
        assert issue.author == "testuser"
        assert "bug" in issue.labels
    
    @responses.activate
    def test_update_issue_success(self, github_server, mock_issue_data):
        """Test successful issue update."""
        updated_data = mock_issue_data.copy()
        updated_data["title"] = "Updated Test Issue"
        updated_data["state"] = "closed"
        
        responses.add(
            responses.PATCH,
            "https://api.github.com/repos/testuser/test-repo/issues/123",
            json=updated_data,
            status=200
        )
        
        issue = github_server.update_issue(
            repo="testuser/test-repo",
            issue_number=123,
            title="Updated Test Issue",
            state="closed"
        )
        
        assert issue.title == "Updated Test Issue"
        assert issue.state == "closed"
    
    @responses.activate
    def test_search_issues(self, github_server, mock_issue_data):
        """Test issue search."""
        search_response = {
            "total_count": 1,
            "items": [mock_issue_data]
        }
        
        responses.add(
            responses.GET,
            "https://api.github.com/search/issues",
            json=search_response,
            status=200
        )
        
        issues = github_server.search_issues("bug", repo="testuser/test-repo")
        
        assert len(issues) == 1
        assert isinstance(issues[0], Issue)
        assert issues[0].number == 123
    
    @responses.activate
    def test_add_comment_success(self, github_server):
        """Test successful comment addition."""
        comment_data = {
            "id": 456,
            "body": "This is a test comment",
            "user": {"login": "testuser"},
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z",
            "html_url": "https://github.com/testuser/test-repo/issues/123#issuecomment-456"
        }
        
        responses.add(
            responses.POST,
            "https://api.github.com/repos/testuser/test-repo/issues/123/comments",
            json=comment_data,
            status=201
        )
        
        comment = github_server.add_comment(
            repo="testuser/test-repo",
            issue_number=123,
            comment="This is a test comment"
        )
        
        assert isinstance(comment, Comment)
        assert comment.id == 456
        assert comment.body == "This is a test comment"
        assert comment.author == "testuser"
    
    @responses.activate
    def test_search_code(self, github_server):
        """Test code search."""
        search_response = {
            "total_count": 1,
            "items": [
                {
                    "name": "test.py",
                    "path": "src/test.py",
                    "repository": {"full_name": "testuser/test-repo"},
                    "html_url": "https://github.com/testuser/test-repo/blob/main/src/test.py",
                    "score": 1.0,
                    "text_matches": [
                        {
                            "fragment": "def test_function():",
                            "matches": [{"text": "test"}]
                        }
                    ]
                }
            ]
        }
        
        responses.add(
            responses.GET,
            "https://api.github.com/search/code",
            json=search_response,
            status=200
        )
        
        results = github_server.search_code("test_function", repo="testuser/test-repo")
        
        assert len(results) == 1
        result = results[0]
        assert result.filename == "test.py"
        assert result.path == "src/test.py"
        assert result.repository == "testuser/test-repo"
        assert result.score == 1.0
    
    @responses.activate
    def test_get_file_content(self, github_server):
        """Test file content retrieval."""
        import base64
        
        content = "print('Hello, World!')"
        encoded_content = base64.b64encode(content.encode()).decode()
        
        file_data = {
            "name": "hello.py",
            "path": "src/hello.py",
            "content": encoded_content,
            "encoding": "base64",
            "size": len(content),
            "sha": "abc123",
            "html_url": "https://github.com/testuser/test-repo/blob/main/src/hello.py"
        }
        
        responses.add(
            responses.GET,
            "https://api.github.com/repos/testuser/test-repo/contents/src/hello.py",
            json=file_data,
            status=200
        )
        
        file_content = github_server.get_file_content(
            repo="testuser/test-repo",
            file_path="src/hello.py"
        )
        
        assert file_content.name == "hello.py"
        assert file_content.path == "src/hello.py"
        assert file_content.content == content
        assert file_content.encoding == "base64"
        assert file_content.size == len(content)
    
    @responses.activate
    def test_create_pull_request(self, github_server):
        """Test pull request creation."""
        pr_data = {
            "number": 789,
            "title": "Test PR",
            "body": "This is a test pull request",
            "state": "open",
            "user": {"login": "testuser"},
            "head": {"ref": "feature-branch"},
            "base": {"ref": "main"},
            "mergeable": True,
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z",
            "html_url": "https://github.com/testuser/test-repo/pull/789"
        }
        
        responses.add(
            responses.POST,
            "https://api.github.com/repos/testuser/test-repo/pulls",
            json=pr_data,
            status=201
        )
        
        pr = github_server.create_pull_request(
            repo="testuser/test-repo",
            title="Test PR",
            body="This is a test pull request",
            head="feature-branch",
            base="main"
        )
        
        assert isinstance(pr, PullRequest)
        assert pr.number == 789
        assert pr.title == "Test PR"
        assert pr.state == "open"
        assert pr.head_branch == "feature-branch"
        assert pr.base_branch == "main"
        assert pr.mergeable is True
    
    @responses.activate
    def test_api_error_handling(self, github_server):
        """Test API error handling."""
        responses.add(
            responses.GET,
            "https://api.github.com/users/testuser/repos",
            json={"message": "Not Found"},
            status=404
        )
        
        with pytest.raises(Exception):
            github_server.list_repositories("testuser")
