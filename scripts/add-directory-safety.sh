#!/bin/bash
# Script to add directory safety checks to deployment scripts

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Directory safety check template
read -r -d '' SAFETY_CHECK << 'EOF' || true
# Directory Safety Check
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
if [[ "$SCRIPT_DIR" == *"/vana-ui"* ]]; then
    # Script is in vana-ui subdirectory, go up two levels
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
else
    # Script is in project root or scripts directory
    PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

# Navigate to project root
cd "$PROJECT_ROOT"

# Validate we're in the correct directory
if [ ! -f "main.py" ] || [ ! -d "vana-ui" ] || [ ! -f "pyproject.toml" ]; then
    echo "❌ ERROR: This script must be run from the VANA project root"
    echo "   Current directory: $(pwd)"
    echo "   Expected markers: main.py, vana-ui/, pyproject.toml"
    echo ""
    echo "   To fix: cd to the project root and try again"
    exit 1
fi

# Optional: Show directory confirmation
echo "✅ Running from correct directory: $(pwd)"
echo "   Files found: $(find . -type f -name "*.py" -o -name "*.ts" | grep -v node_modules | grep -v venv | wc -l | tr -d ' ') source files"
echo ""
EOF

# Function to add safety check to a script
add_safety_to_script() {
    local script_path="$1"
    local script_name=$(basename "$script_path")
    
    # Check if script exists
    if [ ! -f "$script_path" ]; then
        echo -e "${RED}❌ Script not found: $script_path${NC}"
        return 1
    fi
    
    # Check if safety check already exists
    if grep -q "Directory Safety Check" "$script_path"; then
        echo -e "${YELLOW}⚠️  Script already has safety check: $script_name${NC}"
        return 0
    fi
    
    # Create backup
    cp "$script_path" "${script_path}.backup"
    
    # Create temporary file with safety check
    {
        # Get the shebang line
        head -n 1 "$script_path"
        echo ""
        echo "$SAFETY_CHECK"
        echo ""
        # Get the rest of the script (skip shebang and any initial comments)
        tail -n +2 "$script_path"
    } > "${script_path}.tmp"
    
    # Replace original with updated version
    mv "${script_path}.tmp" "$script_path"
    chmod +x "$script_path"
    
    echo -e "${GREEN}✅ Added safety check to: $script_name${NC}"
    return 0
}

# Main execution
echo -e "${GREEN}🔐 Adding Directory Safety Checks to Deployment Scripts${NC}"
echo "=================================================="

# Find all deployment scripts
DEPLOY_SCRIPTS=(
    "./deploy-staging.sh"
    "./deploy-staging-debug.sh"
    "./deploy-staging-adk.sh"
    "./deployment/deploy.sh"
    "./deployment/deploy-dev.sh"
    "./deployment/deploy-prod.sh"
    "./deployment/deploy-enhanced-dev.sh"
    "./deployment/deploy-enhanced-prod.sh"
    "./scripts/deploy_local.sh"
    "./scripts/quick_deploy_local.sh"
)

# Process each script
updated_count=0
for script in "${DEPLOY_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if add_safety_to_script "$script"; then
            ((updated_count++))
        fi
    else
        echo -e "${YELLOW}⚠️  Script not found: $script${NC}"
    fi
done

echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  Updated: $updated_count scripts"
echo "  Backups created with .backup extension"
echo ""
echo -e "${YELLOW}Note:${NC} Review the updated scripts and test before deployment"
echo "  To restore: mv script.sh.backup script.sh"

# Create a validation script
cat > "./scripts/validate-directory.sh" << 'VALIDATION_EOF'
#!/bin/bash
# Quick directory validation script

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check current directory
if [ -f "main.py" ] && [ -d "vana-ui" ] && [ -f "pyproject.toml" ]; then
    echo -e "${GREEN}✅ You are in the VANA project root${NC}"
    echo "   Path: $(pwd)"
    echo "   Files: $(find . -type f -name "*.py" -o -name "*.ts" | grep -v node_modules | grep -v venv | wc -l | tr -d ' ') source files"
else
    echo -e "${RED}❌ You are NOT in the VANA project root${NC}"
    echo "   Current: $(pwd)"
    echo ""
    echo "   To fix:"
    echo "   cd /Users/nick/Development/vana"
    exit 1
fi
VALIDATION_EOF

chmod +x "./scripts/validate-directory.sh"
echo -e "${GREEN}✅ Created validation script: ./scripts/validate-directory.sh${NC}"

echo ""
echo "🎯 Quick validation commands:"
echo "  ./scripts/validate-directory.sh  # Check if in correct directory"
echo "  make deploy                      # Safe deployment with checks"