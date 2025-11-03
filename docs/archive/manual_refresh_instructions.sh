#!/bin/bash

# PostgREST Schema Cache Manual Refresh Instructions
# This script provides copy-paste ready commands to refresh the cache

echo "================================================================"
echo "PostgREST Schema Cache Manual Refresh"
echo "================================================================"
echo ""
echo "STEP 1: Open Supabase SQL Editor"
echo "----------------"
echo "Opening browser to SQL Editor..."
echo ""

# Open the SQL Editor in browser
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open "https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/sql/new"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  xdg-open "https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/sql/new" 2>/dev/null || \
  sensible-browser "https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/sql/new" 2>/dev/null || \
  echo "Please manually open: https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/sql/new"
else
  echo "Please manually open: https://supabase.com/dashboard/project/xfwlneedhqealtktaacv/sql/new"
fi

echo ""
echo "STEP 2: Copy and paste this SQL in the editor"
echo "----------------"
echo ""

cat << 'EOF'
-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Verify the column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'chat_messages' AND column_name = 'artifact_ids';
EOF

echo ""
echo "STEP 3: Click 'Run' button"
echo "----------------"
echo "Wait 5-10 seconds after execution"
echo ""
echo "STEP 4: Verify the fix"
echo "----------------"
echo "Run in terminal:"
echo "  node test_artifact_ids.mjs"
echo ""
echo "Expected output:"
echo "  ✓ SELECT successful"
echo "  ✓ INSERT successful with artifact_ids: [ 'test-1', 'test-2' ]"
echo ""
echo "================================================================"
echo "Alternative: Monitor automatically"
echo "================================================================"
echo "Run this command to check every 30 seconds:"
echo "  node monitor_schema_refresh.mjs"
echo ""
echo "Or wait 10-15 minutes for automatic refresh"
echo "================================================================"
