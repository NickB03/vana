"""
MCP Server Integrations
External MCP server integration implementations.
"""

from .github_server import GitHubServer, Repository, Issue, Comment, PullRequest, CodeResult, FileContent
from .brave_search_server import BraveSearchServer, SearchResults, NewsResults, ImageResults, VideoResults, LocalResults
from .fetch_server import FetchServer, HttpResponse, ScrapedContent, DownloadResult, UrlStatus

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
    "UrlStatus"
]
