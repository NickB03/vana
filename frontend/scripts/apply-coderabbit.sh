#!/bin/bash
# Quick CodeRabbit suggestion applier for PR #104

echo "🐰 Fetching CodeRabbit suggestions from PR #104..."

# Get PR comments from CodeRabbit
gh api repos/NickB03/vana/pulls/104/comments | jq -r '.[] | select(.user.login == "coderabbitai") | .body' > /tmp/cr-suggestions.txt

if [ -s /tmp/cr-suggestions.txt ]; then
    echo "✅ Found CodeRabbit suggestions"
    echo "---"
    cat /tmp/cr-suggestions.txt | head -50
    echo "---"
    echo "📝 Please review and apply suggestions manually"
else
    echo "⚠️ No CodeRabbit suggestions found yet"
    echo "Request a review with: gh pr comment 104 --body '@coderabbitai review'"
fi
