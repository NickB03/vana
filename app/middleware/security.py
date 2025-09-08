"""Security headers middleware for enhanced application security."""

import logging
import secrets
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    def __init__(self, app, csp_nonce_header: str = "X-CSP-Nonce", enable_hsts: bool = True):
        super().__init__(app)
        self.csp_nonce_header = csp_nonce_header
        self.enable_hsts = enable_hsts
        logger.info("SecurityHeadersMiddleware initialized")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate nonce for CSP
        nonce = secrets.token_urlsafe(16)
        request.state.csp_nonce = nonce

        response = await call_next(request)

        # Security Headers
        security_headers = {
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",

            # Prevent clickjacking
            "X-Frame-Options": "DENY",

            # XSS Protection
            "X-XSS-Protection": "1; mode=block",

            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",

            # Content Security Policy (secure nonce-based, no unsafe-inline)
            "Content-Security-Policy": f"""
                default-src 'self';
                script-src 'self' 'nonce-{nonce}';
                style-src 'self' 'nonce-{nonce}';
                img-src 'self' data: https:;
                font-src 'self' data:;
                connect-src 'self' https://api.google.com https://generativelanguage.googleapis.com https://openrouter.ai;
                frame-ancestors 'none';
                base-uri 'self';
                form-action 'self';
                upgrade-insecure-requests;
            """.replace('\n', ' ').strip(),

            # Permissions Policy
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",

            # Server header obfuscation
            "Server": "Vana/1.0",

            # CSP Nonce for frontend
            self.csp_nonce_header: nonce
        }

        # HSTS (only in production)
        if self.enable_hsts and request.url.scheme == "https":
            security_headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        for header, value in security_headers.items():
            response.headers[header] = value

        return response
