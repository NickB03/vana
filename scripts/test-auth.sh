#!/bin/bash
# Test authentication endpoint with JWT token

TOKEN="${1:-$JWT_TOKEN}"

if [ -z "$TOKEN" ]; then
    echo "Usage: $0 <token>"
    echo "Or set JWT_TOKEN environment variable"
    exit 1
fi

curl -X GET http://localhost:8000/auth/me \
    -H "Authorization: Bearer $TOKEN"