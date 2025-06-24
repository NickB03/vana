"""
MCP Server Integrations
External MCP server integration implementations.
"""

from .brave_search_server import (
    BraveSearchServer,
    ImageResults,
    LocalResults,
    NewsResults,
    SearchResults,
    VideoResults,
)
from .fetch_server import (
    DownloadResult,
    FetchServer,
    HttpResponse,
    ScrapedContent,
    UrlStatus,
)
from .github_server import (
    CodeResult,
    Comment,
    FileContent,
    GitHubServer,
    Issue,
    PullRequest,
    Repository,
)

__all__ = [
    # Server classes
    "GitHubServer",
    "BraveSearchServer",
    "FetchServer",
    # GitHub data classes
    "Repository",
    "Issue",
    "Comment",
    "PullRequest",
    "CodeResult",
    "FileContent",
    # Brave Search data classes
    "SearchResults",
    "NewsResults",
    "ImageResults",
    "VideoResults",
    "LocalResults",
    # Fetch data classes
    "HttpResponse",
    "ScrapedContent",
    "DownloadResult",
    "UrlStatus",
]
