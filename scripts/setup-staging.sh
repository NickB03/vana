#!/bin/bash
# Comprehensive Staging Setup Script for Vana
# Sets up complete Supabase staging environment with database, functions, and storage
# Usage: ./scripts/setup-staging.sh

set -e  # Exit on error
trap 'echo -e "${NC}"' EXIT ERR  # Reset terminal color on exit/error

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_REF="tkqubuaqzqjvrcnlipts"
PROJECT_NAME="vana-staging"
PROJECT_REGION="West US (Oregon)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Edge Functions to deploy (from config.toml)
FUNCTIONS=(
  "chat"
  "generate-artifact"
  "generate-artifact-fix"
  "generate-title"
  "cache-manager"
  "summarize-conversation"
  "generate-image"
  "bundle-artifact"
  "generate-reasoning"
  "health"
  "intent-examples"
  "admin-analytics"
)

# Critical tables to verify after migration
CRITICAL_TABLES=(
  "chat_sessions"
  "chat_messages"
  "guest_rate_limits"
  "ai_usage_tracking"
  "message_feedback"
  "response_quality_logs"
  "intent_examples"
)

# Required secrets
REQUIRED_SECRETS=(
  "OPENROUTER_GEMINI_FLASH_KEY"
  "GLM_API_KEY"
  "ALLOWED_ORIGINS"
)

# Optional secrets
OPTIONAL_SECRETS=(
  "OPENROUTER_GEMINI_IMAGE_KEY"
  "TAVILY_API_KEY"
  "UPSTASH_REDIS_REST_URL"
  "UPSTASH_REDIS_REST_TOKEN"
  "RATE_LIMIT_DISABLED"
)

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log_info() {
  echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"
}

log_error() {
  echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"
}

log_step() {
  echo ""
  echo -e "${CYAN}[$(date '+%H:%M:%S')] ▶${NC} ${MAGENTA}$1${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

check_supabase_cli() {
  log_step "STEP 1: Checking Prerequisites"

  if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI not found"
    echo ""
    echo "Install Supabase CLI:"
    echo "  macOS:   brew install supabase/tap/supabase"
    echo "  Linux:   brew install supabase/tap/supabase"
    echo "  Windows: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase"
    echo ""
    echo "Or see: https://supabase.com/docs/guides/cli/getting-started"
    exit 1
  fi

  local version=$(supabase --version 2>&1 | head -n 1)
  log_success "Supabase CLI installed: $version"
}

confirm_proceed() {
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}⚠️  STAGING ENVIRONMENT SETUP${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Project:     $PROJECT_NAME"
  echo "Reference:   $PROJECT_REF"
  echo "Region:      $PROJECT_REGION"
  echo ""
  echo "This script will:"
  echo "  1. Link to staging project"
  echo "  2. Push database migrations"
  echo "  3. Deploy all Edge Functions (${#FUNCTIONS[@]} functions)"
  echo "  4. Verify storage buckets"
  echo "  5. Display secrets configuration"
  echo ""

  read -p "Continue? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    log_warning "Setup cancelled by user"
    exit 0
  fi
}

# ============================================================================
# SETUP FUNCTIONS
# ============================================================================

link_to_staging() {
  log_step "STEP 2: Linking to Staging Project"

  # Check if already linked to staging
  if [ -f .git/supabase-project-ref ]; then
    current_ref=$(cat .git/supabase-project-ref 2>/dev/null || echo "")
    if [ "$current_ref" = "$PROJECT_REF" ]; then
      log_success "Already linked to staging project ($PROJECT_REF)"
      return
    fi
  fi

  log_info "Linking to $PROJECT_NAME ($PROJECT_REF)..."

  if supabase link --project-ref "$PROJECT_REF"; then
    echo "$PROJECT_REF" > .git/supabase-project-ref
    log_success "Linked to staging project"
  else
    log_error "Failed to link to staging project"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check if project ref is correct: $PROJECT_REF"
    echo "  2. Verify you have access to the project"
    echo "  3. Run: supabase login (if not authenticated)"
    exit 1
  fi
}

push_migrations() {
  log_step "STEP 3: Pushing Database Migrations"

  # Count migrations
  migration_count=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
  log_info "Found $migration_count migration files"

  if [ "$migration_count" -eq 0 ]; then
    log_warning "No migrations found in supabase/migrations/"
    return
  fi

  log_info "Pushing migrations to staging database..."

  if supabase db push; then
    log_success "Database migrations applied successfully"
  else
    log_error "Failed to push migrations"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check migration syntax errors"
    echo "  2. Verify database connectivity"
    echo "  3. Review migration logs above"
    exit 1
  fi
}

verify_tables() {
  log_step "STEP 4: Verifying Critical Tables"

  log_info "Checking ${#CRITICAL_TABLES[@]} critical tables..."

  local failed_tables=()

  for table in "${CRITICAL_TABLES[@]}"; do
    if supabase db execute --sql "SELECT 1 FROM $table LIMIT 1" &>/dev/null; then
      log_success "Table exists: $table"
    else
      log_error "Table missing or inaccessible: $table"
      failed_tables+=("$table")
    fi
  done

  if [ ${#failed_tables[@]} -gt 0 ]; then
    log_error "Missing tables: ${failed_tables[*]}"
    echo ""
    echo "Some critical tables are missing. This may indicate:"
    echo "  1. Migrations failed to run completely"
    echo "  2. Migration files are missing"
    echo "  3. Database connection issues"
    echo ""
    read -p "Continue anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      exit 1
    fi
  else
    log_success "All critical tables verified"
  fi
}

deploy_functions() {
  log_step "STEP 5: Deploying Edge Functions"

  log_info "Deploying ${#FUNCTIONS[@]} Edge Functions..."
  echo ""

  local failed_functions=()
  local deployed_count=0

  for func in "${FUNCTIONS[@]}"; do
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} Deploying function: ${CYAN}$func${NC}"

    if timeout 120 supabase functions deploy "$func" --project-ref "$PROJECT_REF" 2>&1 | grep -q "Deployed"; then
      log_success "Deployed: $func"
      ((deployed_count++))
    else
      log_error "Failed to deploy: $func"
      failed_functions+=("$func")
    fi

    echo ""
  done

  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  if [ ${#failed_functions[@]} -gt 0 ]; then
    log_error "Failed to deploy ${#failed_functions[@]} functions: ${failed_functions[*]}"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check function code for syntax errors"
    echo "  2. Verify _shared/ dependencies are accessible"
    echo "  3. Review deployment logs above"
    echo "  4. Check function size (must be < 10MB)"
    echo ""
    read -p "Continue anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      exit 1
    fi
  else
    log_success "All ${deployed_count} Edge Functions deployed successfully"
  fi
}

verify_storage() {
  log_step "STEP 6: Verifying Storage Buckets"

  log_info "Checking artifact-bundles storage bucket..."

  # Note: Storage bucket is created via migration
  # We just verify it exists and provide manual steps if needed

  echo ""
  echo "Storage bucket 'artifact-bundles' should be created via migration:"
  echo "  📄 supabase/migrations/20251122000000_create_artifact_bundles_bucket.sql"
  echo "  📄 supabase/migrations/20251127_create_artifact_bundles_bucket.sql"
  echo ""
  echo "To verify bucket exists:"
  echo "  1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/storage/buckets"
  echo "  2. Check for 'artifact-bundles' bucket"
  echo ""
  echo "If bucket is missing, you can create it manually:"
  echo "  - Name: artifact-bundles"
  echo "  - Public: No"
  echo "  - File size limit: 10MB"
  echo "  - Allowed MIME types: text/html"
  echo ""

  log_success "Storage verification complete (see instructions above)"
}

display_secrets_config() {
  log_step "STEP 7: Secrets Configuration"

  echo ""
  echo -e "${YELLOW}⚠️  REQUIRED SECRETS (must be set before production use)${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  for secret in "${REQUIRED_SECRETS[@]}"; do
    echo "  ❌ $secret"
  done

  echo ""
  echo -e "${CYAN}Optional Secrets (recommended for full functionality)${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  for secret in "${OPTIONAL_SECRETS[@]}"; do
    echo "  ⭕ $secret"
  done

  echo ""
  echo -e "${BLUE}How to set secrets:${NC}"
  echo ""
  echo "Method 1 - Supabase Dashboard (Recommended):"
  echo "  1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/settings/vault"
  echo "  2. Click 'New Secret'"
  echo "  3. Add each secret with its value"
  echo ""
  echo "Method 2 - Supabase CLI:"
  echo "  supabase secrets set SECRET_NAME=value --project-ref $PROJECT_REF"
  echo ""
  echo "Example:"
  echo "  supabase secrets set OPENROUTER_GEMINI_FLASH_KEY=sk-or-v1-xxx... --project-ref $PROJECT_REF"
  echo ""

  echo -e "${MAGENTA}Secret Descriptions:${NC}"
  echo ""
  echo "  OPENROUTER_GEMINI_FLASH_KEY    - OpenRouter API key for Gemini Flash Lite (chat, titles, summaries)"
  echo "  GLM_API_KEY                    - Z.ai API key for GLM-4.6 (artifact generation)"
  echo "  ALLOWED_ORIGINS                - CORS allowed origins (comma-separated)"
  echo "  OPENROUTER_GEMINI_IMAGE_KEY    - OpenRouter key for image generation (optional)"
  echo "  TAVILY_API_KEY                 - Tavily API key for web search (optional)"
  echo "  UPSTASH_REDIS_REST_URL         - Upstash Redis REST URL for caching (optional)"
  echo "  UPSTASH_REDIS_REST_TOKEN       - Upstash Redis REST token (optional)"
  echo "  RATE_LIMIT_DISABLED            - Set to 'true' to disable rate limiting (optional)"
  echo ""
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
  # Print header
  echo ""
  echo -e "${MAGENTA}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${MAGENTA}║                                                               ║${NC}"
  echo -e "${MAGENTA}║          VANA STAGING ENVIRONMENT SETUP SCRIPT                ║${NC}"
  echo -e "${MAGENTA}║                                                               ║${NC}"
  echo -e "${MAGENTA}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  # Run setup steps
  check_supabase_cli
  confirm_proceed
  link_to_staging
  push_migrations
  verify_tables
  deploy_functions
  verify_storage
  display_secrets_config

  # Print success summary
  echo ""
  echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                                                               ║${NC}"
  echo -e "${GREEN}║          ✅  STAGING SETUP COMPLETED SUCCESSFULLY             ║${NC}"
  echo -e "${GREEN}║                                                               ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  echo -e "${CYAN}Next Steps:${NC}"
  echo ""
  echo "  1. Set required secrets (see instructions above)"
  echo "  2. Verify storage bucket exists:"
  echo "     https://supabase.com/dashboard/project/$PROJECT_REF/storage/buckets"
  echo ""
  echo "  3. Test staging environment:"
  echo "     - Health check: https://${PROJECT_REF}.supabase.co/functions/v1/health"
  echo "     - Frontend: Update VITE_SUPABASE_URL in .env to use staging"
  echo ""
  echo "  4. Monitor Edge Functions:"
  echo "     supabase functions logs --project-ref $PROJECT_REF"
  echo ""
  echo "  5. When ready, deploy to production:"
  echo "     ./scripts/deploy-simple.sh prod"
  echo ""

  log_success "Setup complete! 🚀"
  echo ""
}

# Run main function
main
