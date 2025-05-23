# Dashboard Demo Configuration (Production-like)
# This configuration is intended for demonstration purposes and simulates a production environment.
# For actual production deployment, further security hardening is recommended.

# Flask App settings
DEBUG = False
# Generate a strong random key for production use
# You can use Python to generate one: import secrets; print(secrets.token_hex(32))
SECRET_KEY = '8f42a73054b9c292c9d4ea1d1d089dad56f7c56c1b3f6c82c725e4805c9ae63a'

# API Settings
API_PREFIX = '/api/v1'

# Vector Search Monitoring
VECTOR_SEARCH_MONITOR_INTERVAL = 300  # seconds (5 minutes)

# Authentication
ENABLE_AUTH = True
DEMO_USERNAME = 'admin'
# This is a placeholder password - CHANGE THIS before deployment
# For demo purposes, a more complex default is provided, but should still be changed
DEMO_PASSWORD = 'VANA-Demo-2025!'

# API Security
RATE_LIMIT_ENABLED = True
RATE_LIMIT_PER_MINUTE = 60  # Maximum 60 requests per minute per IP
API_KEY_REQUIRED = True
# Demo API key - CHANGE THIS before deployment
API_KEY = 'vana-api-key-demo-2025'

# HTTPS Configuration
# Uncomment and configure these settings for HTTPS in production
# USE_HTTPS = True
# CERT_FILE = '/path/to/your/cert.pem'
# KEY_FILE = '/path/to/your/key.pem'

# Logging
LOG_LEVEL = 'INFO'
# In a real production environment, ensure this directory exists and has proper permissions
LOG_FILE_PATH = '/var/log/vana/dashboard.log'
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
LOG_ROTATION = True
LOG_MAX_SIZE = 10485760  # 10 MB
LOG_BACKUP_COUNT = 5

# Security Headers
SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
}

# Session Configuration
SESSION_COOKIE_SECURE = True  # Only send cookies over HTTPS
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to cookies
SESSION_COOKIE_SAMESITE = 'Lax'  # Restrict cookie sending to same-site requests
PERMANENT_SESSION_LIFETIME = 3600  # Session timeout in seconds (1 hour)

# Add any other production-like settings here