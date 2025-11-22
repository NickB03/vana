#!/bin/bash
# Database backup script with integrity verification
# Usage: ./scripts/backup-db.sh [production|staging]

set -e

ENV=${1:-production}

# Configuration
if [ "$ENV" = "production" ]; then
  REF="${SUPABASE_PRODUCTION_REF:-vznhbocnuykdmjvujaka}"
elif [ "$ENV" = "staging" ]; then
  REF="${STAGING_REF:-<YOUR-STAGING-REF>}"
else
  echo "Usage: $0 [production|staging]"
  exit 1
fi

BACKUP_DIR="backups"
BACKUP_FILE="$BACKUP_DIR/${ENV}-backup-$(date +%Y%m%d-%H%M%S).sql"

echo "📦 Creating $ENV database backup..."
mkdir -p "$BACKUP_DIR"

# Create backup
if supabase db dump --project-ref "$REF" > "$BACKUP_FILE" 2>&1; then
  # Verify backup is not empty
  if [ ! -s "$BACKUP_FILE" ]; then
    echo "❌ Backup file is empty!"
    rm "$BACKUP_FILE"
    exit 1
  fi

  # Verify it's valid SQL (basic check for PostgreSQL header)
  if ! grep -q "PostgreSQL" "$BACKUP_FILE" 2>/dev/null; then
    echo "⚠️  Warning: Backup file may be invalid (missing PostgreSQL header)"
    echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
    read -p "Keep backup anyway? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
      rm "$BACKUP_FILE"
      exit 1
    fi
  fi

  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo "✅ Backup created and verified: $BACKUP_FILE ($BACKUP_SIZE)"
  echo ""
  echo "To restore:"
  echo "  supabase db reset --project-ref $REF"
  echo "  psql \$DATABASE_URL < $BACKUP_FILE"
else
  echo "❌ Backup failed!"
  [ -f "$BACKUP_FILE" ] && rm "$BACKUP_FILE"
  exit 1
fi
