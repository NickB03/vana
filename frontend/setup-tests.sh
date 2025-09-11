#!/bin/bash

# Setup Tests for Vana Frontend
# This script installs all testing dependencies and sets up the test environment

set -e

echo "🚀 Setting up Vana Frontend Testing Environment..."

# Check if we're in the frontend directory
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: package.json not found. Please run this script from the frontend directory."
    exit 1
fi

echo "📦 Installing test dependencies..."

# Install testing dependencies
npm install --save-dev \
    @testing-library/react@^16.1.0 \
    @testing-library/jest-dom@^6.6.3 \
    @testing-library/user-event@^14.5.2 \
    @playwright/test@^1.51.0 \
    jest@^29.7.0 \
    jest-environment-jsdom@^29.7.0 \
    msw@^2.6.5 \
    @types/jest@^29.5.14 \
    ts-jest@^29.2.5 \
    jest-fetch-mock@^3.0.3

echo "✅ Test dependencies installed successfully!"

echo "🎭 Installing Playwright browsers..."
npx playwright install

echo "✅ Playwright browsers installed!"

echo "🧪 Running initial test to verify setup..."
npm test -- --passWithNoTests --verbose

echo "🎉 Test environment setup complete!"
echo ""
echo "📋 Available test commands:"
echo "  npm test                    # Run all tests"
echo "  npm run test:watch          # Run tests in watch mode"
echo "  npm run test:coverage       # Run tests with coverage"
echo "  npm run test:integration    # Run integration tests only"
echo "  npm run test:unit          # Run unit tests only"
echo "  npm run test:e2e           # Run end-to-end tests"
echo ""
echo "📚 Documentation:"
echo "  See __tests__/README.md for detailed testing guide"
echo ""
echo "🚀 Ready to test! Happy coding!"