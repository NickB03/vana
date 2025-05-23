# Dashboard Demo Configuration (Production-like)

# Flask App settings
DEBUG = False
SECRET_KEY = 'your_strong_secret_key_here'  # CHANGE THIS IN A REAL PRODUCTION ENVIRONMENT

# API Settings
API_PREFIX = '/api/v1'

# Vector Search Monitoring
VECTOR_SEARCH_MONITOR_INTERVAL = 300  # seconds

# Authentication (Example - replace with a more robust solution for real production)
ENABLE_AUTH = True
DEMO_USERNAME = 'admin'
DEMO_PASSWORD = 'password' # CHANGE THIS

# HTTPS Configuration (Example for self-signed certs, use proper certs in production)
# USE_HTTPS = True
# CERT_FILE = 'path/to/your/cert.pem'
# KEY_FILE = 'path/to/your/key.pem'

# Logging
LOG_LEVEL = 'INFO'
LOG_FILE_PATH = '/var/log/vana/dashboard.log' # Ensure this path is writable by the service user

# Add any other production-like settings here