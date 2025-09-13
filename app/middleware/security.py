"""Security headers middleware for enhanced application security."""

import logging
import os
import secrets
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    def __init__(
        self,
        app: ASGIApp,
        csp_nonce_header: str = "X-CSP-Nonce",
        enable_hsts: bool = True,
    ):
        super().__init__(app)
        self.csp_nonce_header = csp_nonce_header
        self.enable_hsts = enable_hsts

        # Configurable CSP connect-src domains from environment
        self.csp_connect_domains = self._get_csp_connect_domains()

        logger.info(
            "SecurityHeadersMiddleware initialized with configurable CSP domains"
        )

    def _get_csp_connect_domains(self) -> str:
        """Get CSP connect-src domains from environment variables."""
        # Default secure domains for AI services
        default_domains = [
            "'self'",
            "https://api.google.com",
            "https://generativelanguage.googleapis.com",
        ]

        # Add OpenRouter if enabled
        if os.getenv("USE_OPENROUTER", "false").lower() == "true":
            default_domains.append("https://openrouter.ai")

        # Allow override via environment variable for additional domains
        extra_domains = os.getenv("CSP_EXTRA_CONNECT_DOMAINS", "")
        if extra_domains:
            # Split by comma and sanitize
            additional = [
                domain.strip() for domain in extra_domains.split(",") if domain.strip()
            ]
            default_domains.extend(additional)

        return " ".join(default_domains)

    def _get_csp_policy_for_path(self, path: str, nonce: str, request: Request = None) -> str:
        """Get appropriate CSP policy based on request path."""
        # Strict API-only policy for API endpoints
        if path.startswith("/api/") or path.startswith("/auth/"):
            return (
                "default-src 'none'; "
                "frame-ancestors 'none'; "
                "form-action 'none'; "
                "base-uri 'none'"
            )

        # Check if this is a Google ADK dev-ui request (broader detection)
        is_adk_request = (
            path.startswith("/dev-ui") or 
            path.startswith("/_adk") or 
            path.startswith("/apps/") or
            path.startswith("/list-apps") or
            path.startswith("/debug/") or
            path.startswith("/static/") or  # ADK static assets
            path.endswith(".js") or         # JavaScript files (ADK main files)
            path.endswith(".css") or        # CSS files (ADK styling)
            "dev-ui" in path.lower() or
            "main-" in path or              # ADK main-*.js files
            (request and "google" in request.headers.get("user-agent", "").lower())
        )
        
        if is_adk_request:
            # Completely relaxed CSP for Google ADK dev-ui compatibility
            # Note: Remove nonce to allow 'unsafe-inline' to work (CSP spec requirement)
            return """
                default-src 'self' 'unsafe-inline' 'unsafe-eval';
                script-src 'self' 'unsafe-inline' 'unsafe-eval';
                style-src 'self' 'unsafe-inline' 'unsafe-eval';
                img-src 'self' data: https: blob:;
                font-src 'self' data: https:;
                connect-src 'self' https: wss: ws:;
                frame-src 'self';
                object-src 'self';
                media-src 'self';
                worker-src 'self' blob:;
                child-src 'self' blob:;
                frame-ancestors 'self';
                base-uri 'self';
                form-action 'self';
            """.replace("\n", " ").strip()

        # Web application policy for UI endpoints
        # Secure nonce-based policy without unsafe-inline
        return f"""
            default-src 'self';
            script-src 'self' 'nonce-{nonce}';
            style-src 'self' 'nonce-{nonce}';
            img-src 'self' data: https:;
            font-src 'self' data:;
            connect-src {self.csp_connect_domains};
            frame-ancestors 'none';
            base-uri 'self';
            form-action 'self';
            upgrade-insecure-requests;
        """.replace("\n", " ").strip()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate nonce for CSP
        nonce = secrets.token_urlsafe(16)
        request.state.csp_nonce = nonce

        response = await call_next(request)

        # Determine CSP policy based on path
        csp_policy = self._get_csp_policy_for_path(request.url.path, nonce, request)

        # Security Headers
        security_headers = {
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            # X-XSS-Protection removed - deprecated and ineffective in modern browsers
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            # Content Security Policy (path-aware, secure)
            "Content-Security-Policy": csp_policy,
            # Permissions Policy
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            # Server header obfuscation
            "Server": "Vana/1.0",
            # CSP Nonce for frontend
            self.csp_nonce_header: nonce,
        }

        # HSTS (only in production)
        if self.enable_hsts and request.url.scheme == "https":
            security_headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        for header, value in security_headers.items():
            response.headers[header] = value

        return response
