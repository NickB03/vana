#!/bin/bash

# Comprehensive Post-Merge Validation Runner
# Project ID Audit & Deployment Fixes Validation

echo "🧪 VANA Post-Merge Validation Suite"
echo "=================================="
echo "Merge Commit: 774345abf3e265d28ac1f817f9398bacd1488691"
echo "Branch: project-id-audit-deployment-fixes"
echo ""

# Check if we're in the right directory
if [ ! -d "tests" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Create results directory
mkdir -p tests/results

# Check Python dependencies
echo "🔍 Checking dependencies..."
python3 -c "import requests, asyncio, json, os, time, datetime" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Missing required Python packages. Installing..."
    pip install requests asyncio
fi

# Check Playwright
python3 -c "from playwright.async_api import async_playwright" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Playwright not found. Installing..."
    pip install playwright
    playwright install chromium
fi

echo "✅ Dependencies verified"
echo ""

# Change to test directory
cd tests/automated

# Run comprehensive validation
echo "🚀 Starting comprehensive validation..."
python3 master_test_runner.py

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Validation completed successfully!"
    echo "📊 Check tests/results/ for detailed reports"
else
    echo ""
    echo "❌ Validation encountered errors"
    echo "📊 Check tests/results/ for error details"
    exit 1
fi

# Return to project root
cd ../..

echo ""
echo "🎯 Validation Summary:"
echo "- Infrastructure tests completed"
echo "- Multi-agent orchestration tests completed"
echo "- Security validation completed"
echo "- Results saved in tests/results/"
echo ""
echo "📋 Next Steps:"
echo "1. Review detailed results in tests/results/"
echo "2. Address any identified issues"
echo "3. Consider production deployment if all tests pass"
echo ""
