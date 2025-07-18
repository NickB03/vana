#!/bin/bash
# Install pre-commit hook for documentation validation

echo "Installing documentation validation pre-commit hook..."

cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/bash
# Pre-commit hook to validate documentation

echo "🔍 Validating documentation..."

# Run documentation tests
python tests/documentation/test_documentation_accuracy.py

if [ $? -ne 0 ]; then
    echo "❌ Documentation validation failed!"
    echo "Please fix documentation issues before committing."
    exit 1
fi

echo "✅ Documentation validation passed!"
HOOK

chmod +x .git/hooks/pre-commit
echo "✅ Pre-commit hook installed!"
