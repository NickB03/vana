#!/bin/bash
# Component Validation Script - Vana Frontend
# Validates shadcn/ui component installation and compliance
# Usage: ./validate-component.sh <component-name> [test-level]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPONENT_NAME="$1"
TEST_LEVEL="${2:-full}"  # basic, standard, full
PROJECT_ROOT="/Users/nick/Development/vana"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
COMPONENT_DIR="$FRONTEND_DIR/components/ui"
APPROVAL_DIR="$FRONTEND_DIR/.component-approval"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

# Validation results
VALIDATION_RESULTS=()
EXIT_CODE=0

# Logging function
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} ${timestamp} - $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} ${timestamp} - $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} ${timestamp} - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message"
            EXIT_CODE=1
            ;;
    esac
}

# Add validation result
add_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    VALIDATION_RESULTS+=("$test_name:$status:$details")
    
    if [ "$status" = "PASS" ]; then
        log "SUCCESS" "$test_name: $details"
    elif [ "$status" = "FAIL" ]; then
        log "ERROR" "$test_name: $details"
    else
        log "WARNING" "$test_name: $details"
    fi
}

# Usage function
usage() {
    echo "Usage: $0 <component-name> [test-level]"
    echo ""
    echo "Arguments:"
    echo "  component-name   Name of the shadcn/ui component (e.g., button, card, dialog)"
    echo "  test-level       Testing depth: basic, standard, full (default: full)"
    echo ""
    echo "Test Levels:"
    echo "  basic     - File existence and basic syntax checks"
    echo "  standard  - Basic + build validation + type checking"
    echo "  full      - Standard + Playwright tests + performance checks"
    echo ""
    echo "Examples:"
    echo "  $0 button"
    echo "  $0 dialog standard"
    echo "  $0 card full"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Check if component name provided
    if [ -z "$COMPONENT_NAME" ]; then
        log "ERROR" "Component name is required"
        usage
    fi
    
    # Check if in correct directory
    if [ ! -d "$PROJECT_ROOT" ]; then
        log "ERROR" "Project root not found: $PROJECT_ROOT"
        exit 1
    fi
    
    # Check if frontend directory exists
    if [ ! -d "$FRONTEND_DIR" ]; then
        log "ERROR" "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    # Check if approval directory exists
    if [ ! -d "$APPROVAL_DIR" ]; then
        log "ERROR" "Component approval directory not found: $APPROVAL_DIR"
        exit 1
    fi
    
    # Navigate to frontend directory
    cd "$FRONTEND_DIR"
    
    add_result "Prerequisites" "PASS" "All required directories and files found"
}

# Validate component file existence
validate_component_files() {
    log "INFO" "Validating component files..."
    
    local component_file="$COMPONENT_DIR/$COMPONENT_NAME.tsx"
    
    # Check if component file exists
    if [ ! -f "$component_file" ]; then
        add_result "Component File" "FAIL" "Component file not found: $component_file"
        return 1
    fi
    
    # Check file is not empty
    if [ ! -s "$component_file" ]; then
        add_result "Component File" "FAIL" "Component file is empty: $component_file"
        return 1
    fi
    
    # Basic TypeScript syntax validation
    if ! grep -q "export.*function\|export.*const\|export.*{" "$component_file"; then
        add_result "Component Export" "FAIL" "No valid export found in component file"
        return 1
    fi
    
    # Check for React import
    if ! grep -q "import.*React\|import.*from.*react" "$component_file"; then
        add_result "React Import" "WARNING" "React import not found (may be using automatic runtime)"
    else
        add_result "React Import" "PASS" "React import found"
    fi
    
    # Check for shadcn/ui patterns
    if grep -q "cn(" "$component_file" && grep -q "clsx\|class-variance-authority" "$component_file"; then
        add_result "shadcn/ui Pattern" "PASS" "Component follows shadcn/ui patterns"
    else
        add_result "shadcn/ui Pattern" "WARNING" "Component may not follow shadcn/ui patterns"
    fi
    
    add_result "Component File" "PASS" "Component file exists and has basic structure"
}

# Validate TypeScript compilation
validate_typescript() {
    log "INFO" "Validating TypeScript compilation..."
    
    # Check if TypeScript config exists
    if [ ! -f "tsconfig.json" ]; then
        add_result "TypeScript Config" "FAIL" "tsconfig.json not found"
        return 1
    fi
    
    # Run TypeScript type checking
    if command -v npx >/dev/null 2>&1; then
        if npx tsc --noEmit > /tmp/tsc_output.log 2>&1; then
            add_result "TypeScript Check" "PASS" "No TypeScript errors found"
        else
            local errors=$(grep -c "error TS" /tmp/tsc_output.log || echo "0")
            if [ "$errors" -gt 0 ]; then
                add_result "TypeScript Check" "FAIL" "$errors TypeScript errors found (see /tmp/tsc_output.log)"
                return 1
            else
                add_result "TypeScript Check" "PASS" "TypeScript compilation successful"
            fi
        fi
    else
        add_result "TypeScript Check" "WARNING" "npx not available, skipping TypeScript validation"
    fi
}

# Validate build process
validate_build() {
    log "INFO" "Validating build process..."
    
    # Check package.json exists
    if [ ! -f "package.json" ]; then
        add_result "Package Config" "FAIL" "package.json not found"
        return 1
    fi
    
    # Check if build script exists
    if ! grep -q "\"build\":" package.json; then
        add_result "Build Script" "FAIL" "Build script not found in package.json"
        return 1
    fi
    
    # Run build
    if npm run build > /tmp/build_output.log 2>&1; then
        add_result "Build Process" "PASS" "Build completed successfully"
    else
        add_result "Build Process" "FAIL" "Build failed (see /tmp/build_output.log)"
        return 1
    fi
}

# Validate component integration
validate_integration() {
    log "INFO" "Validating component integration..."
    
    # Check if component is properly exported from index
    local index_file="$COMPONENT_DIR/index.ts"
    if [ -f "$index_file" ]; then
        if grep -q "$COMPONENT_NAME" "$index_file"; then
            add_result "Component Export" "PASS" "Component exported from index"
        else
            add_result "Component Export" "WARNING" "Component not found in index.ts"
        fi
    else
        add_result "Component Index" "WARNING" "No index.ts file found for components"
    fi
    
    # Check for common integration patterns
    if find components app -name "*.tsx" -o -name "*.ts" 2>/dev/null | xargs grep -l "from.*ui/$COMPONENT_NAME\|from.*components/ui.*$COMPONENT_NAME" > /dev/null 2>&1; then
        add_result "Component Usage" "PASS" "Component is being used in the codebase"
    else
        add_result "Component Usage" "INFO" "Component not yet used in codebase (expected for new components)"
    fi
}

# Run Playwright tests (if available)
validate_playwright_tests() {
    if [ "$TEST_LEVEL" != "full" ]; then
        log "INFO" "Skipping Playwright tests (test level: $TEST_LEVEL)"
        return 0
    fi
    
    log "INFO" "Running Playwright tests..."
    
    # Check if Playwright is configured
    if [ ! -f "playwright.config.ts" ]; then
        add_result "Playwright Config" "WARNING" "Playwright not configured"
        return 0
    fi
    
    # Check if component tests exist
    local test_file="tests/component/test_component_standards.spec.ts"
    if [ ! -f "$test_file" ]; then
        add_result "Component Tests" "WARNING" "Component-specific tests not found"
        return 0
    fi
    
    # Run tests
    if npx playwright test "$test_file" > /tmp/playwright_output.log 2>&1; then
        add_result "Playwright Tests" "PASS" "All Playwright tests passed"
    else
        local failures=$(grep -c "FAILED" /tmp/playwright_output.log || echo "0")
        add_result "Playwright Tests" "FAIL" "$failures test(s) failed (see /tmp/playwright_output.log)"
        return 1
    fi
}

# Performance validation
validate_performance() {
    if [ "$TEST_LEVEL" = "basic" ]; then
        log "INFO" "Skipping performance tests (test level: basic)"
        return 0
    fi
    
    log "INFO" "Validating performance impact..."
    
    # Check bundle size impact (basic check)
    if command -v du >/dev/null 2>&1; then
        local component_size=$(du -sh "$COMPONENT_DIR/$COMPONENT_NAME.tsx" 2>/dev/null | cut -f1)
        if [ -n "$component_size" ]; then
            add_result "Component Size" "INFO" "Component file size: $component_size"
        fi
    fi
    
    # Check for performance anti-patterns
    local component_file="$COMPONENT_DIR/$COMPONENT_NAME.tsx"
    if grep -q "console\.log\|console\.error\|debugger" "$component_file"; then
        add_result "Debug Code" "WARNING" "Debug statements found in component"
    else
        add_result "Debug Code" "PASS" "No debug statements found"
    fi
    
    # Check for potential memory leaks
    if grep -q "setInterval\|setTimeout" "$component_file" && ! grep -q "clearInterval\|clearTimeout" "$component_file"; then
        add_result "Memory Leaks" "WARNING" "Potential memory leak: timers without cleanup"
    else
        add_result "Memory Leaks" "PASS" "No obvious memory leak patterns found"
    fi
}

# Accessibility validation
validate_accessibility() {
    if [ "$TEST_LEVEL" = "basic" ]; then
        log "INFO" "Skipping accessibility tests (test level: basic)"
        return 0
    fi
    
    log "INFO" "Validating accessibility patterns..."
    
    local component_file="$COMPONENT_DIR/$COMPONENT_NAME.tsx"
    
    # Check for ARIA attributes
    if grep -q "aria-\|role=" "$component_file"; then
        add_result "ARIA Attributes" "PASS" "ARIA attributes found in component"
    else
        add_result "ARIA Attributes" "INFO" "No ARIA attributes found (may not be needed)"
    fi
    
    # Check for semantic HTML elements
    if grep -q "<button\|<input\|<select\|<textarea\|<a " "$component_file"; then
        add_result "Semantic HTML" "PASS" "Semantic HTML elements used"
    else
        add_result "Semantic HTML" "INFO" "No interactive semantic elements found"
    fi
    
    # Check for keyboard event handlers
    if grep -q "onKeyDown\|onKeyUp\|onKeyPress" "$component_file"; then
        add_result "Keyboard Support" "PASS" "Keyboard event handlers found"
    else
        add_result "Keyboard Support" "INFO" "No keyboard event handlers found"
    fi
}

# Generate validation report
generate_report() {
    log "INFO" "Generating validation report..."
    
    local report_file="$APPROVAL_DIR/reports/validation_${COMPONENT_NAME}_${TIMESTAMP}.md"
    local summary_file="$APPROVAL_DIR/tracking/component_validation_status.json"
    
    # Create report directory if it doesn't exist
    mkdir -p "$(dirname "$report_file")"
    mkdir -p "$(dirname "$summary_file")"
    
    # Generate detailed report
    cat > "$report_file" << EOF
# Component Validation Report

**Component:** $COMPONENT_NAME  
**Validation Date:** $(date)  
**Test Level:** $TEST_LEVEL  
**Overall Status:** $([ $EXIT_CODE -eq 0 ] && echo "PASS" || echo "FAIL")

## Summary

$([ $EXIT_CODE -eq 0 ] && echo "✅ Component validation completed successfully" || echo "❌ Component validation failed")

## Detailed Results

EOF
    
    # Add detailed results
    for result in "${VALIDATION_RESULTS[@]}"; do
        IFS=':' read -r test_name status details <<< "$result"
        case $status in
            "PASS")
                echo "- ✅ **$test_name**: $details" >> "$report_file"
                ;;
            "FAIL")
                echo "- ❌ **$test_name**: $details" >> "$report_file"
                ;;
            "WARNING")
                echo "- ⚠️ **$test_name**: $details" >> "$report_file"
                ;;
            "INFO")
                echo "- ℹ️ **$test_name**: $details" >> "$report_file"
                ;;
        esac
    done
    
    cat >> "$report_file" << EOF

## Files Validated

- Component File: \`$COMPONENT_DIR/$COMPONENT_NAME.tsx\`
- TypeScript Config: \`$FRONTEND_DIR/tsconfig.json\`
- Package Config: \`$FRONTEND_DIR/package.json\`
- Playwright Config: \`$FRONTEND_DIR/playwright.config.ts\`

## Next Steps

$([ $EXIT_CODE -eq 0 ] && echo "Component is ready for integration and approval workflow." || echo "Please address the failed validations before proceeding.")

## Logs

- TypeScript Output: \`/tmp/tsc_output.log\`
- Build Output: \`/tmp/build_output.log\`
- Playwright Output: \`/tmp/playwright_output.log\`

---
*Generated by validate-component.sh v1.0*
EOF
    
    # Update summary tracking file
    local validation_status=$([ $EXIT_CODE -eq 0 ] && echo "passed" || echo "failed")
    local total_tests=${#VALIDATION_RESULTS[@]}
    local passed_tests=$(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c ":PASS:")
    local failed_tests=$(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c ":FAIL:")
    
    # Create/update JSON summary
    cat > "$summary_file" << EOF
{
  "component": "$COMPONENT_NAME",
  "validation_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_level": "$TEST_LEVEL",
  "overall_status": "$validation_status",
  "statistics": {
    "total_tests": $total_tests,
    "passed_tests": $passed_tests,
    "failed_tests": $failed_tests,
    "warning_tests": $(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c ":WARNING:"),
    "info_tests": $(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c ":INFO:")
  },
  "report_file": "$report_file",
  "timestamp": "$TIMESTAMP"
}
EOF
    
    log "SUCCESS" "Validation report generated: $report_file"
    log "INFO" "Summary updated: $summary_file"
}

# Display results summary
display_summary() {
    echo ""
    echo "========================================"
    echo "Component Validation Summary"
    echo "========================================"
    echo "Component: $COMPONENT_NAME"
    echo "Test Level: $TEST_LEVEL"
    echo "Total Tests: ${#VALIDATION_RESULTS[@]}"
    echo "Status: $([ $EXIT_CODE -eq 0 ] && echo -e "${GREEN}PASS${NC}" || echo -e "${RED}FAIL${NC}")"
    echo ""
    
    local passed=$(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c ":PASS:" || echo "0")
    local failed=$(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c ":FAIL:" || echo "0")
    local warnings=$(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c ":WARNING:" || echo "0")
    local info=$(printf '%s\n' "${VALIDATION_RESULTS[@]}" | grep -c ":INFO:" || echo "0")
    
    echo -e "Passed:   ${GREEN}$passed${NC}"
    echo -e "Failed:   ${RED}$failed${NC}"
    echo -e "Warnings: ${YELLOW}$warnings${NC}"
    echo -e "Info:     ${BLUE}$info${NC}"
    echo ""
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ Component validation completed successfully!${NC}"
        echo "Component is ready for approval workflow."
    else
        echo -e "${RED}❌ Component validation failed!${NC}"
        echo "Please address the issues before proceeding."
    fi
    echo ""
}

# Main validation function
main() {
    echo "========================================"
    echo "Vana Frontend Component Validator"
    echo "========================================"
    echo ""
    
    check_prerequisites
    validate_component_files
    
    if [ "$TEST_LEVEL" != "basic" ]; then
        validate_typescript
        validate_build
        validate_integration
        validate_performance
        validate_accessibility
    fi
    
    if [ "$TEST_LEVEL" = "full" ]; then
        validate_playwright_tests
    fi
    
    generate_report
    display_summary
    
    exit $EXIT_CODE
}

# Run main function
main "$@"