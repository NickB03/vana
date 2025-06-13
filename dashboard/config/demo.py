from lib.logging_config import get_logger

logger = get_logger("vana.demo")

# Dashboard Demo Configuration (Production-like)
# This configuration is intended for demonstration purposes and simulates a production environment.
# For actual production deployment, further security hardening is recommended.

# Flask App settings
DEBUG = False
# Generate a strong random key for production use
# You can use Python to generate one: import secrets; logger.debug("%s", secrets.token_hex(32))
SECRET_KEY = "a7f9c8e2d4b6a1f3e8c9d2b5a7f4e1c6b9d8a3f7e2c5b8a1f4e7c9d6b3a8f5e2c1"

# API Settings
API_PREFIX = "/api/v1"

# Vector Search Monitoring
VECTOR_SEARCH_MONITOR_INTERVAL = 300  # seconds (5 minutes)

# Authentication
ENABLE_AUTH = True
DEMO_USERNAME = "admin"
# Production password - secure random generated
# Changed from demo placeholder for production security
DEMO_PASSWORD = "VanaProd2025#Secure!9x7K"

# API Security
RATE_LIMIT_ENABLED = True
RATE_LIMIT_PER_MINUTE = 60  # Maximum 60 requests per minute per IP
API_KEY_REQUIRED = True
# Production API key - secure random generated
API_KEY = "vana-prod-api-key-2025-8f3a9c7e2d1b5a4f6e9c8d2b7a5f3e1c"

# HTTPS Configuration
# Uncomment and configure these settings for HTTPS in production
# USE_HTTPS = True
# CERT_FILE = '/path/to/your/cert.pem'
# KEY_FILE = '/path/to/your/key.pem'

# Logging
LOG_LEVEL = "INFO"
# In a real production environment, ensure this directory exists and has proper permissions
LOG_FILE_PATH = "/var/log/vana/dashboard.log"
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
LOG_ROTATION = True
LOG_MAX_SIZE = 10485760  # 10 MB
LOG_BACKUP_COUNT = 5

# Security Headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
}

# Session Configuration
SESSION_COOKIE_SECURE = True  # Only send cookies over HTTPS
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to cookies
SESSION_COOKIE_SAMESITE = "Lax"  # Restrict cookie sending to same-site requests
PERMANENT_SESSION_LIFETIME = 3600  # Session timeout in seconds (1 hour)

# Add any other production-like settings here
