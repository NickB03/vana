"""
Fetch Server Integration
HTTP client for web requests and content fetching.

This module provides comprehensive HTTP client functionality including GET/POST/PUT/DELETE
requests, web scraping, file downloads, and URL status checking.
"""

import os
import json
import logging
import requests
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass
from urllib.parse import urlparse, urljoin
import time
from pathlib import Path

logger = logging.getLogger(__name__)


@dataclass
class HttpResponse:
    """HTTP response information"""
    status_code: int
    headers: Dict[str, str]
    content: str
    encoding: str
    url: str
    elapsed: float
    size: int


@dataclass
class ScrapedContent:
    """Scraped web content"""
    url: str
    title: Optional[str]
    content: str
    links: List[str]
    images: List[str]
    metadata: Dict[str, Any]
    status_code: int
    scraped_at: str


@dataclass
class DownloadResult:
    """File download result"""
    url: str
    local_path: str
    size: int
    content_type: str
    success: bool
    elapsed: float
    error_message: Optional[str] = None


@dataclass
class UrlStatus:
    """URL status check result"""
    url: str
    status_code: int
    accessible: bool
    response_time: float
    content_type: Optional[str]
    content_length: Optional[int]
    redirect_url: Optional[str]
    error_message: Optional[str] = None


class FetchServer:
    """HTTP client for web requests and content fetching."""
    
    def __init__(self, timeout: int = 30, max_size: int = 10485760):
        """Initialize with timeout and size limits."""
        self.timeout = timeout
        self.max_size = max_size  # 10MB default
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "VANA-MCP-Fetch/1.0 (Web Content Fetcher)"
        })
    
    def http_get(self, url: str, headers: Dict[str, str] = None, params: Dict[str, Any] = None) -> HttpResponse:
        """Perform HTTP GET request."""
        try:
            start_time = time.time()
            
            # Merge custom headers
            request_headers = self.session.headers.copy()
            if headers:
                request_headers.update(headers)
            
            response = self.session.get(
                url, 
                headers=request_headers, 
                params=params, 
                timeout=self.timeout,
                stream=True
            )
            
            # Check content size
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) > self.max_size:
                raise ValueError(f"Content too large: {content_length} bytes (max: {self.max_size})")
            
            # Read content with size limit
            content = ""
            size = 0
            for chunk in response.iter_content(chunk_size=8192, decode_unicode=True):
                if chunk:
                    size += len(chunk.encode('utf-8'))
                    if size > self.max_size:
                        raise ValueError(f"Content too large: {size} bytes (max: {self.max_size})")
                    content += chunk
            
            elapsed = time.time() - start_time
            
            return HttpResponse(
                status_code=response.status_code,
                headers=dict(response.headers),
                content=content,
                encoding=response.encoding or 'utf-8',
                url=response.url,
                elapsed=elapsed,
                size=size
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP GET failed for {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error in HTTP GET: {e}")
            raise
    
    def http_post(self, url: str, data: Dict[str, Any] = None, json: Dict[str, Any] = None, 
                  headers: Dict[str, str] = None) -> HttpResponse:
        """Perform HTTP POST request."""
        try:
            start_time = time.time()
            
            # Merge custom headers
            request_headers = self.session.headers.copy()
            if headers:
                request_headers.update(headers)
            
            # Set content type for JSON
            if json and 'Content-Type' not in request_headers:
                request_headers['Content-Type'] = 'application/json'
            
            response = self.session.post(
                url, 
                headers=request_headers, 
                data=data,
                json=json,
                timeout=self.timeout
            )
            
            elapsed = time.time() - start_time
            content = response.text
            
            return HttpResponse(
                status_code=response.status_code,
                headers=dict(response.headers),
                content=content,
                encoding=response.encoding or 'utf-8',
                url=response.url,
                elapsed=elapsed,
                size=len(content.encode('utf-8'))
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP POST failed for {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error in HTTP POST: {e}")
            raise
    
    def http_put(self, url: str, data: Dict[str, Any] = None, json: Dict[str, Any] = None, 
                 headers: Dict[str, str] = None) -> HttpResponse:
        """Perform HTTP PUT request."""
        try:
            start_time = time.time()
            
            # Merge custom headers
            request_headers = self.session.headers.copy()
            if headers:
                request_headers.update(headers)
            
            # Set content type for JSON
            if json and 'Content-Type' not in request_headers:
                request_headers['Content-Type'] = 'application/json'
            
            response = self.session.put(
                url, 
                headers=request_headers, 
                data=data,
                json=json,
                timeout=self.timeout
            )
            
            elapsed = time.time() - start_time
            content = response.text
            
            return HttpResponse(
                status_code=response.status_code,
                headers=dict(response.headers),
                content=content,
                encoding=response.encoding or 'utf-8',
                url=response.url,
                elapsed=elapsed,
                size=len(content.encode('utf-8'))
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP PUT failed for {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error in HTTP PUT: {e}")
            raise
    
    def http_delete(self, url: str, headers: Dict[str, str] = None) -> HttpResponse:
        """Perform HTTP DELETE request."""
        try:
            start_time = time.time()
            
            # Merge custom headers
            request_headers = self.session.headers.copy()
            if headers:
                request_headers.update(headers)
            
            response = self.session.delete(
                url, 
                headers=request_headers, 
                timeout=self.timeout
            )
            
            elapsed = time.time() - start_time
            content = response.text
            
            return HttpResponse(
                status_code=response.status_code,
                headers=dict(response.headers),
                content=content,
                encoding=response.encoding or 'utf-8',
                url=response.url,
                elapsed=elapsed,
                size=len(content.encode('utf-8'))
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP DELETE failed for {url}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error in HTTP DELETE: {e}")
            raise
    
    def scrape_content(self, url: str, selector: str = None) -> ScrapedContent:
        """Scrape web content with optional CSS selector."""
        try:
            from datetime import datetime
            
            # Get the page content
            response = self.http_get(url)
            
            if response.status_code != 200:
                raise ValueError(f"HTTP {response.status_code}: Cannot scrape content")
            
            # Parse HTML content
            try:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(response.content, 'html.parser')
                
                # Extract title
                title_tag = soup.find('title')
                title = title_tag.get_text().strip() if title_tag else None
                
                # Extract content based on selector or default
                if selector:
                    content_elements = soup.select(selector)
                    content = '\n'.join([elem.get_text().strip() for elem in content_elements])
                else:
                    # Remove script and style elements
                    for script in soup(["script", "style"]):
                        script.decompose()
                    content = soup.get_text()
                
                # Clean up content
                lines = (line.strip() for line in content.splitlines())
                content = '\n'.join(line for line in lines if line)
                
                # Extract links
                links = []
                for link in soup.find_all('a', href=True):
                    href = link['href']
                    if href.startswith('http'):
                        links.append(href)
                    elif href.startswith('/'):
                        links.append(urljoin(url, href))
                
                # Extract images
                images = []
                for img in soup.find_all('img', src=True):
                    src = img['src']
                    if src.startswith('http'):
                        images.append(src)
                    elif src.startswith('/'):
                        images.append(urljoin(url, src))
                
                # Extract metadata
                metadata = {}
                for meta in soup.find_all('meta'):
                    name = meta.get('name') or meta.get('property')
                    content = meta.get('content')
                    if name and content:
                        metadata[name] = content
                
            except ImportError:
                # Fallback without BeautifulSoup
                content = response.content
                title = None
                links = []
                images = []
                metadata = {}
                logger.warning("BeautifulSoup not available, returning raw content")
            
            return ScrapedContent(
                url=url,
                title=title,
                content=content,
                links=links,
                images=images,
                metadata=metadata,
                status_code=response.status_code,
                scraped_at=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Content scraping failed for {url}: {e}")
            raise
    
    def download_file(self, url: str, local_path: str, 
                      progress_callback: Callable[[int, int], None] = None) -> DownloadResult:
        """Download file with progress tracking."""
        try:
            start_time = time.time()
            
            # Create directory if needed
            Path(local_path).parent.mkdir(parents=True, exist_ok=True)
            
            response = self.session.get(url, stream=True, timeout=self.timeout)
            response.raise_for_status()
            
            content_type = response.headers.get('content-type', 'application/octet-stream')
            content_length = response.headers.get('content-length')
            total_size = int(content_length) if content_length else None
            
            # Check size limit
            if total_size and total_size > self.max_size:
                raise ValueError(f"File too large: {total_size} bytes (max: {self.max_size})")
            
            downloaded = 0
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        # Check size limit during download
                        if downloaded > self.max_size:
                            os.remove(local_path)
                            raise ValueError(f"File too large: {downloaded} bytes (max: {self.max_size})")
                        
                        # Progress callback
                        if progress_callback and total_size:
                            progress_callback(downloaded, total_size)
            
            elapsed = time.time() - start_time
            
            return DownloadResult(
                url=url,
                local_path=local_path,
                size=downloaded,
                content_type=content_type,
                success=True,
                elapsed=elapsed
            )
            
        except Exception as e:
            logger.error(f"File download failed for {url}: {e}")
            return DownloadResult(
                url=url,
                local_path=local_path,
                size=0,
                content_type="",
                success=False,
                elapsed=time.time() - start_time,
                error_message=str(e)
            )
    
    def check_url_status(self, url: str) -> UrlStatus:
        """Check URL status and accessibility."""
        try:
            start_time = time.time()
            
            response = self.session.head(url, timeout=self.timeout, allow_redirects=True)
            elapsed = time.time() - start_time
            
            return UrlStatus(
                url=url,
                status_code=response.status_code,
                accessible=200 <= response.status_code < 400,
                response_time=elapsed,
                content_type=response.headers.get('content-type'),
                content_length=int(response.headers.get('content-length', 0)) or None,
                redirect_url=response.url if response.url != url else None
            )
            
        except requests.exceptions.RequestException as e:
            elapsed = time.time() - start_time
            logger.error(f"URL status check failed for {url}: {e}")
            
            return UrlStatus(
                url=url,
                status_code=0,
                accessible=False,
                response_time=elapsed,
                content_type=None,
                content_length=None,
                redirect_url=None,
                error_message=str(e)
            )
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"Error checking URL status: {e}")
            
            return UrlStatus(
                url=url,
                status_code=0,
                accessible=False,
                response_time=elapsed,
                content_type=None,
                content_length=None,
                redirect_url=None,
                error_message=str(e)
            )
