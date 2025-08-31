#!/bin/bash

# Frontend Fix Script
# Addresses Tailwind CSS v4 PostCSS configuration issues and frontend errors

set -e

echo "🔧 Frontend Fix Script - Resolving Tailwind CSS v4 Issues"
echo "=========================================================="

# Change to frontend directory
cd "$(dirname "$0")/../frontend" || exit 1

echo "📁 Working directory: $(pwd)"

# Kill any running dev servers
echo "🔪 Killing any existing dev servers..."
pkill -f "next dev" 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 2

# Clean build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc

# Ensure proper dependencies are installed at root level
echo "📦 Installing required dependencies at root level..."
cd ..
npm install @tailwindcss/postcss@4.1.12 --save-dev
npm install autoprefixer@^10.4.21 --save-dev

# Return to frontend directory
cd frontend

# Fix PostCSS configuration for Tailwind v4
echo "⚙️  Configuring PostCSS for Tailwind CSS v4..."
cat > postcss.config.mjs << 'EOF'
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
EOF

# Ensure globals.css uses correct Tailwind directives
echo "🎨 Updating globals.css with proper Tailwind directives..."
# Check if the file starts with @import
if head -1 src/app/globals.css | grep -q "@import"; then
  sed -i.bak '1s/@import "tailwindcss";/@tailwind base;\
@tailwind components;\
@tailwind utilities;/' src/app/globals.css
  rm -f src/app/globals.css.bak
fi

# Verify Tailwind config
echo "🔧 Verifying Tailwind configuration..."
if ! grep -q "plugins: \[" tailwind.config.ts; then
  echo "❌ Tailwind config missing plugins array"
  exit 1
fi

# Test build
echo "🏗️  Testing build process..."
if npm run build; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed. Check the error messages above."
  exit 1
fi

# Clean up build artifacts again for dev mode
echo "🧹 Cleaning build artifacts for dev mode..."
rm -rf .next

# Test dev server startup
echo "🚀 Testing dev server startup..."
timeout 30 npm run dev &
DEV_PID=$!
sleep 10

# Test if server responds
if curl -f -s http://localhost:5173 > /dev/null; then
  echo "✅ Dev server is responding successfully!"
  SERVER_STATUS="healthy"
else
  echo "⚠️  Dev server may have issues. Check manually."
  SERVER_STATUS="needs_check"
fi

# Kill dev server
kill $DEV_PID 2>/dev/null || true
sleep 2

echo ""
echo "📋 Frontend Fix Summary"
echo "======================"
echo "✅ PostCSS configuration fixed for Tailwind v4"
echo "✅ CSS directives corrected"
echo "✅ Dependencies properly linked"
echo "✅ Build process verified"
echo "📊 Server status: $SERVER_STATUS"

if [ "$SERVER_STATUS" = "healthy" ]; then
  echo ""
  echo "🎉 All frontend issues have been resolved!"
  echo "   You can now run 'npm run dev' to start development."
else
  echo ""
  echo "⚠️  Frontend is building but server needs manual verification."
  echo "   Run 'npm run dev' and check for any runtime errors."
fi

echo ""
echo "🔧 Key fixes applied:"
echo "   • Updated PostCSS config to use @tailwindcss/postcss"
echo "   • Fixed Tailwind CSS directives in globals.css"
echo "   • Ensured proper monorepo dependency linking"
echo "   • Verified build process works correctly"