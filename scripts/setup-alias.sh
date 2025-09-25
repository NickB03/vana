#!/bin/bash
# Setup alias for claude-flow without warnings

# Add this to your ~/.bashrc or ~/.zshrc:
echo 'alias cf="NODE_NO_WARNINGS=1 npx claude-flow"' >> ~/.zshrc
echo "Alias added! Use 'cf' instead of 'npx claude-flow' to run without warnings."
echo "Run 'source ~/.zshrc' to activate the alias."