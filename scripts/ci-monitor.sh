#!/bin/bash
set -euo pipefail

# CI Pipeline Monitoring Script
# Usage: ./scripts/ci-monitor.sh [timeframe]
# Timeframe: 1d, 7d, 30d (default: 7d)

TIMEFRAME="${1:-7d}"
REPO_OWNER="${GITHUB_REPOSITORY_OWNER:-NickB03}"
REPO_NAME="${GITHUB_REPOSITORY_NAME:-vana}"

echo "🔍 CI Pipeline Usage Report - Last $TIMEFRAME"
echo "=================================================="

# Function to convert duration to minutes
duration_to_minutes() {
    local duration="$1"
    if [[ "$duration" =~ ^PT([0-9]+)M([0-9]+)S$ ]]; then
        local minutes="${BASH_REMATCH[1]}"
        local seconds="${BASH_REMATCH[2]}"
        echo $((minutes + (seconds + 30) / 60))  # Round to nearest minute
    elif [[ "$duration" =~ ^PT([0-9]+)S$ ]]; then
        local seconds="${BASH_REMATCH[1]}"
        echo $(((seconds + 30) / 60))  # Round to nearest minute
    else
        echo "0"
    fi
}

# Calculate date range
case "$TIMEFRAME" in
    "1d")
        SINCE_DATE=$(date -d '1 day ago' -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -v -1d -u +"%Y-%m-%dT%H:%M:%SZ")
        ;;
    "7d")
        SINCE_DATE=$(date -d '7 days ago' -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -v -7d -u +"%Y-%m-%dT%H:%M:%SZ")
        ;;
    "30d")
        SINCE_DATE=$(date -d '30 days ago' -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -v -30d -u +"%Y-%m-%dT%H:%M:%SZ")
        ;;
    *)
        echo "❌ Invalid timeframe. Use: 1d, 7d, or 30d"
        exit 1
        ;;
esac

echo "📅 Date Range: Since $SINCE_DATE"
echo ""

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is required but not installed"
    echo "   Install: https://cli.github.com/"
    exit 1
fi

# Check authentication
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI not authenticated"
    echo "   Run: gh auth login"
    exit 1
fi

# Get workflow runs
echo "🔄 Fetching workflow runs..."
WORKFLOW_DATA=$(gh run list \
    --repo "$REPO_OWNER/$REPO_NAME" \
    --limit 100 \
    --json status,conclusion,name,createdAt,updatedAt,url,headBranch,event \
    --jq ".[] | select(.createdAt >= \"$SINCE_DATE\")")

if [ -z "$WORKFLOW_DATA" ]; then
    echo "📭 No workflow runs found in the specified timeframe"
    exit 0
fi

# Parse and analyze data
TOTAL_RUNS=0
SUCCESSFUL_RUNS=0
FAILED_RUNS=0
CANCELLED_RUNS=0
TOTAL_DURATION_MINUTES=0
CI_RUNS=0
DEPLOY_RUNS=0
OTHER_RUNS=0

# Process each run
echo "$WORKFLOW_DATA" | while IFS= read -r run; do
    STATUS=$(echo "$run" | jq -r '.status')
    CONCLUSION=$(echo "$run" | jq -r '.conclusion')
    NAME=$(echo "$run" | jq -r '.name')
    CREATED=$(echo "$run" | jq -r '.createdAt')
    UPDATED=$(echo "$run" | jq -r '.updatedAt')
    BRANCH=$(echo "$run" | jq -r '.headBranch')
    EVENT=$(echo "$run" | jq -r '.event')
    
    TOTAL_RUNS=$((TOTAL_RUNS + 1))
    
    # Calculate duration
    CREATED_TS=$(date -d "$CREATED" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$CREATED" +%s)
    UPDATED_TS=$(date -d "$UPDATED" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$UPDATED" +%s)
    DURATION_SECONDS=$((UPDATED_TS - CREATED_TS))
    DURATION_MINUTES=$((DURATION_SECONDS / 60))
    
    TOTAL_DURATION_MINUTES=$((TOTAL_DURATION_MINUTES + DURATION_MINUTES))
    
    # Count by conclusion
    case "$CONCLUSION" in
        "success") SUCCESSFUL_RUNS=$((SUCCESSFUL_RUNS + 1)) ;;
        "failure") FAILED_RUNS=$((FAILED_RUNS + 1)) ;;
        "cancelled") CANCELLED_RUNS=$((CANCELLED_RUNS + 1)) ;;
    esac
    
    # Count by workflow type
    case "$NAME" in
        *"CI"*|*"ci"*) CI_RUNS=$((CI_RUNS + 1)) ;;
        *"Deploy"*|*"deploy"*) DEPLOY_RUNS=$((DEPLOY_RUNS + 1)) ;;
        *) OTHER_RUNS=$((OTHER_RUNS + 1)) ;;
    esac
    
    # Show individual run info (optional - comment out for summary only)
    # printf "%-20s %-10s %-12s %4d min %-15s %s\n" \
    #     "$(echo "$NAME" | cut -c1-19)" \
    #     "$STATUS" \
    #     "$CONCLUSION" \
    #     "$DURATION_MINUTES" \
    #     "$BRANCH" \
    #     "$EVENT"
    
done

# Calculate statistics
if [ $TOTAL_RUNS -gt 0 ]; then
    SUCCESS_RATE=$((SUCCESSFUL_RUNS * 100 / TOTAL_RUNS))
    FAILURE_RATE=$((FAILED_RUNS * 100 / TOTAL_RUNS))
    CANCELLATION_RATE=$((CANCELLED_RUNS * 100 / TOTAL_RUNS))
    AVG_DURATION=$((TOTAL_DURATION_MINUTES / TOTAL_RUNS))
else
    SUCCESS_RATE=0
    FAILURE_RATE=0
    CANCELLATION_RATE=0
    AVG_DURATION=0
fi

# Estimate monthly usage (extrapolate)
case "$TIMEFRAME" in
    "1d") MONTHLY_ESTIMATE=$((TOTAL_DURATION_MINUTES * 30)) ;;
    "7d") MONTHLY_ESTIMATE=$((TOTAL_DURATION_MINUTES * 30 / 7)) ;;
    "30d") MONTHLY_ESTIMATE=$TOTAL_DURATION_MINUTES ;;
esac

# Display summary
echo ""
echo "📊 Summary Statistics"
echo "===================="
printf "Total Runs:           %d\n" $TOTAL_RUNS
printf "Successful:           %d (%d%%)\n" $SUCCESSFUL_RUNS $SUCCESS_RATE
printf "Failed:               %d (%d%%)\n" $FAILED_RUNS $FAILURE_RATE
printf "Cancelled:            %d (%d%%)\n" $CANCELLED_RUNS $CANCELLATION_RATE

echo ""
echo "⏱️ Duration Analysis"
echo "==================="
printf "Total Minutes:        %d\n" $TOTAL_DURATION_MINUTES
printf "Average Duration:     %d minutes\n" $AVG_DURATION
printf "Monthly Estimate:     %d minutes\n" $MONTHLY_ESTIMATE

echo ""
echo "🔧 Workflow Breakdown"
echo "===================="
printf "CI Workflows:         %d\n" $CI_RUNS
printf "Deploy Workflows:     %d\n" $DEPLOY_RUNS
printf "Other Workflows:      %d\n" $OTHER_RUNS

echo ""
echo "💰 Cost Analysis"
echo "================"
COST_PER_MINUTE=0.008
PERIOD_COST=$(echo "scale=2; $TOTAL_DURATION_MINUTES * $COST_PER_MINUTE" | bc 2>/dev/null || python3 -c "print(f'{$TOTAL_DURATION_MINUTES * $COST_PER_MINUTE:.2f}')")
MONTHLY_COST=$(echo "scale=2; $MONTHLY_ESTIMATE * $COST_PER_MINUTE" | bc 2>/dev/null || python3 -c "print(f'{$MONTHLY_ESTIMATE * $COST_PER_MINUTE:.2f}')")

printf "Current Period Cost:  \$%s\n" "$PERIOD_COST"
printf "Monthly Estimate:     \$%s\n" "$MONTHLY_COST"

# Performance assessment
echo ""
echo "🎯 Performance Assessment"
echo "========================="

# Target thresholds
TARGET_MONTHLY_MINUTES=200
TARGET_AVG_DURATION=15
TARGET_SUCCESS_RATE=95

if [ $MONTHLY_ESTIMATE -le $TARGET_MONTHLY_MINUTES ]; then
    echo "✅ Monthly usage: ON TARGET ($MONTHLY_ESTIMATE ≤ $TARGET_MONTHLY_MINUTES minutes)"
else
    echo "⚠️ Monthly usage: OVER TARGET ($MONTHLY_ESTIMATE > $TARGET_MONTHLY_MINUTES minutes)"
fi

if [ $AVG_DURATION -le $TARGET_AVG_DURATION ]; then
    echo "✅ Average duration: ON TARGET ($AVG_DURATION ≤ $TARGET_AVG_DURATION minutes)"
else
    echo "⚠️ Average duration: OVER TARGET ($AVG_DURATION > $TARGET_AVG_DURATION minutes)"
fi

if [ $SUCCESS_RATE -ge $TARGET_SUCCESS_RATE ]; then
    echo "✅ Success rate: ON TARGET ($SUCCESS_RATE% ≥ $TARGET_SUCCESS_RATE%)"
else
    echo "⚠️ Success rate: BELOW TARGET ($SUCCESS_RATE% < $TARGET_SUCCESS_RATE%)"
fi

# Recommendations
echo ""
echo "💡 Recommendations"
echo "=================="

if [ $MONTHLY_ESTIMATE -gt $TARGET_MONTHLY_MINUTES ]; then
    echo "• Consider enabling more aggressive path filtering"
    echo "• Review if all test jobs are necessary"
    echo "• Check for cache hit rate improvements"
fi

if [ $AVG_DURATION -gt $TARGET_AVG_DURATION ]; then
    echo "• Investigate slow-running jobs"
    echo "• Consider parallel execution optimizations"
    echo "• Review dependency installation times"
fi

if [ $FAILURE_RATE -gt 5 ]; then
    echo "• Review failed runs for common issues"
    echo "• Consider improving test stability"
    echo "• Check for flaky tests"
fi

if [ $CANCELLATION_RATE -gt 10 ]; then
    echo "• High cancellation rate detected"
    echo "• Review concurrency settings"
    echo "• Consider PR draft detection"
fi

echo ""
echo "🔗 Useful Commands"
echo "=================="
echo "View recent runs:     gh run list --limit 10"
echo "View run details:     gh run view [run-id]"
echo "Download logs:        gh run download [run-id]"
echo "Check cache usage:    gh api repos/$REPO_OWNER/$REPO_NAME/actions/cache/usage"
echo ""

# Export data for further analysis (optional)
if [ "${EXPORT_DATA:-false}" = "true" ]; then
    EXPORT_FILE="ci-metrics-$(date +%Y%m%d).json"
    cat > "$EXPORT_FILE" << EOF
{
    "timeframe": "$TIMEFRAME",
    "since_date": "$SINCE_DATE",
    "total_runs": $TOTAL_RUNS,
    "successful_runs": $SUCCESSFUL_RUNS,
    "failed_runs": $FAILED_RUNS,
    "cancelled_runs": $CANCELLED_RUNS,
    "success_rate": $SUCCESS_RATE,
    "failure_rate": $FAILURE_RATE,
    "total_duration_minutes": $TOTAL_DURATION_MINUTES,
    "average_duration": $AVG_DURATION,
    "monthly_estimate": $MONTHLY_ESTIMATE,
    "cost_estimate": $MONTHLY_COST,
    "ci_runs": $CI_RUNS,
    "deploy_runs": $DEPLOY_RUNS,
    "other_runs": $OTHER_RUNS
}
EOF
    echo "📄 Data exported to: $EXPORT_FILE"
fi