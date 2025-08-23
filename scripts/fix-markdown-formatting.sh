#!/bin/bash
# Fix markdown formatting issues in documentation

echo "🔧 Fixing markdown formatting issues..."

# Fix trailing whitespace in all markdown files
echo "📝 Removing trailing whitespace..."
find docs -name "*.md" -exec sed -i '' 's/[[:space:]]*$//' {} +

echo "✅ Markdown formatting fixes completed!"