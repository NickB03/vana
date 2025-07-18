#\!/bin/bash
# Start backend with proper environment loading

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

echo "Starting VANA backend..."
echo "GOOGLE_API_KEY: ${GOOGLE_API_KEY:0:10}..."
echo "VANA_MODEL: $VANA_MODEL"

poetry run python main.py
EOF < /dev/null