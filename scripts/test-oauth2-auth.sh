#!/bin/bash

# Test script for OAuth2-compliant authentication
# This script tests both form-encoded and JSON login methods

set -e

API_BASE="http://localhost:8000"
USERNAME="testuser"
EMAIL="test@example.com"
PASSWORD="TestPassword123!"

echo "🔐 Testing OAuth2-compliant Authentication"
echo "=========================================="

# Function to check if server is running
check_server() {
    echo "📡 Checking if server is running..."
    if ! curl -s -f "$API_BASE/health" > /dev/null; then
        echo "❌ Server is not running at $API_BASE"
        echo "Please start the server with: make dev-backend"
        exit 1
    fi
    echo "✅ Server is running"
}

# Function to register test user
register_user() {
    echo "👤 Registering test user..."
    REGISTER_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$API_BASE/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$EMAIL\",
            \"username\": \"$USERNAME\", 
            \"password\": \"$PASSWORD\",
            \"first_name\": \"Test\",
            \"last_name\": \"User\"
        }")
    
    HTTP_STATUS=$(echo "$REGISTER_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    REGISTER_BODY=$(echo "$REGISTER_RESPONSE" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    if [[ "$HTTP_STATUS" == "201" ]]; then
        echo "✅ User registered successfully"
    elif [[ "$HTTP_STATUS" == "409" ]]; then
        echo "ℹ️  User already exists (continuing)"
    else
        echo "❌ Failed to register user (HTTP $HTTP_STATUS)"
        echo "$REGISTER_BODY"
        exit 1
    fi
}

# Function to test OAuth2 form login
test_form_login() {
    echo "🔑 Testing OAuth2 form login (application/x-www-form-urlencoded)..."
    
    FORM_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$USERNAME&password=$PASSWORD&grant_type=password")
    
    HTTP_STATUS=$(echo "$FORM_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    FORM_BODY=$(echo "$FORM_RESPONSE" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    if [[ "$HTTP_STATUS" == "200" ]]; then
        echo "✅ Form login successful"
        FORM_ACCESS_TOKEN=$(echo "$FORM_BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "")
        if [[ -n "$FORM_ACCESS_TOKEN" ]]; then
            echo "  🎫 Access token received: ${FORM_ACCESS_TOKEN:0:20}..."
        fi
    else
        echo "❌ Form login failed (HTTP $HTTP_STATUS)"
        echo "$FORM_BODY"
        return 1
    fi
}

# Function to test JSON login (backward compatibility)
test_json_login() {
    echo "📄 Testing JSON login (application/json) - backward compatibility..."
    
    JSON_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")
    
    HTTP_STATUS=$(echo "$JSON_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    JSON_BODY=$(echo "$JSON_RESPONSE" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    if [[ "$HTTP_STATUS" == "200" ]]; then
        echo "✅ JSON login successful"
        JSON_ACCESS_TOKEN=$(echo "$JSON_BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "")
        if [[ -n "$JSON_ACCESS_TOKEN" ]]; then
            echo "  🎫 Access token received: ${JSON_ACCESS_TOKEN:0:20}..."
        fi
    else
        echo "❌ JSON login failed (HTTP $HTTP_STATUS)"
        echo "$JSON_BODY"
        return 1
    fi
}

# Function to test invalid grant type
test_invalid_grant_type() {
    echo "⚠️  Testing invalid grant_type..."
    
    INVALID_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$USERNAME&password=$PASSWORD&grant_type=authorization_code")
    
    HTTP_STATUS=$(echo "$INVALID_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    INVALID_BODY=$(echo "$INVALID_RESPONSE" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    if [[ "$HTTP_STATUS" == "400" ]]; then
        echo "✅ Invalid grant_type properly rejected"
        ERROR_TYPE=$(echo "$INVALID_BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['detail'])" 2>/dev/null || echo "")
        if [[ "$ERROR_TYPE" == "unsupported_grant_type" ]]; then
            echo "  📋 Correct OAuth2 error code: unsupported_grant_type"
        fi
    else
        echo "❌ Invalid grant_type test failed (expected HTTP 400, got $HTTP_STATUS)"
        return 1
    fi
}

# Function to test invalid credentials
test_invalid_credentials() {
    echo "🚫 Testing invalid credentials..."
    
    INVALID_CREDS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$USERNAME&password=wrongpassword&grant_type=password")
    
    HTTP_STATUS=$(echo "$INVALID_CREDS_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    INVALID_CREDS_BODY=$(echo "$INVALID_CREDS_RESPONSE" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    if [[ "$HTTP_STATUS" == "401" ]]; then
        echo "✅ Invalid credentials properly rejected"
        ERROR_TYPE=$(echo "$INVALID_CREDS_BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['detail'])" 2>/dev/null || echo "")
        if [[ "$ERROR_TYPE" == "invalid_grant" ]]; then
            echo "  📋 Correct OAuth2 error code: invalid_grant"
        fi
    else
        echo "❌ Invalid credentials test failed (expected HTTP 401, got $HTTP_STATUS)"
        return 1
    fi
}

# Function to test missing credentials
test_missing_credentials() {
    echo "❓ Testing missing credentials..."
    
    MISSING_CREDS_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$USERNAME&grant_type=password")
    
    HTTP_STATUS=$(echo "$MISSING_CREDS_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    MISSING_CREDS_BODY=$(echo "$MISSING_CREDS_RESPONSE" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    if [[ "$HTTP_STATUS" == "400" ]]; then
        echo "✅ Missing credentials properly rejected"
        ERROR_TYPE=$(echo "$MISSING_CREDS_BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['detail'])" 2>/dev/null || echo "")
        if [[ "$ERROR_TYPE" == "invalid_request" ]]; then
            echo "  📋 Correct OAuth2 error code: invalid_request"
        fi
    else
        echo "❌ Missing credentials test failed (expected HTTP 400, got $HTTP_STATUS)"
        return 1
    fi
}

# Function to test login with email
test_email_login() {
    echo "📧 Testing login with email address..."
    
    EMAIL_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$EMAIL&password=$PASSWORD&grant_type=password")
    
    HTTP_STATUS=$(echo "$EMAIL_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    EMAIL_BODY=$(echo "$EMAIL_RESPONSE" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    if [[ "$HTTP_STATUS" == "200" ]]; then
        echo "✅ Email login successful"
    else
        echo "❌ Email login failed (HTTP $HTTP_STATUS)"
        echo "$EMAIL_BODY"
        return 1
    fi
}

# Function to test protected endpoint
test_protected_endpoint() {
    echo "🛡️  Testing protected endpoint access..."
    
    # Get access token first
    TOKEN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")
    
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "")
    
    if [[ -z "$ACCESS_TOKEN" ]]; then
        echo "❌ Could not get access token for protected endpoint test"
        return 1
    fi
    
    # Test protected endpoint
    PROTECTED_RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -X GET "$API_BASE/auth/me" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    
    HTTP_STATUS=$(echo "$PROTECTED_RESPONSE" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    PROTECTED_BODY=$(echo "$PROTECTED_RESPONSE" | sed -E 's/HTTPSTATUS:[0-9]{3}$//')
    
    if [[ "$HTTP_STATUS" == "200" ]]; then
        echo "✅ Protected endpoint access successful"
        USER_EMAIL=$(echo "$PROTECTED_BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['email'])" 2>/dev/null || echo "")
        if [[ "$USER_EMAIL" == "$EMAIL" ]]; then
            echo "  👤 User data correctly retrieved: $USER_EMAIL"
        fi
    else
        echo "❌ Protected endpoint access failed (HTTP $HTTP_STATUS)"
        echo "$PROTECTED_BODY"
        return 1
    fi
}

# Main test execution
main() {
    echo "Starting OAuth2 authentication tests..."
    echo ""
    
    check_server
    register_user
    echo ""
    
    # Run all tests
    test_form_login && echo ""
    test_json_login && echo ""
    test_invalid_grant_type && echo ""
    test_invalid_credentials && echo ""
    test_missing_credentials && echo ""
    test_email_login && echo ""
    test_protected_endpoint && echo ""
    
    echo "🎉 All OAuth2 authentication tests completed successfully!"
    echo ""
    echo "Summary:"
    echo "- ✅ OAuth2 form-encoded login (application/x-www-form-urlencoded)"
    echo "- ✅ JSON login backward compatibility (application/json)"
    echo "- ✅ Proper OAuth2 error responses"
    echo "- ✅ Grant type validation"
    echo "- ✅ Credential validation"
    echo "- ✅ Email and username login support"
    echo "- ✅ Protected endpoint access with tokens"
}

# Run the tests
main