# Database Migration Guide (Optional)

**Status**: ⏸️ NOT REQUIRED for portfolio/demo
**Reason**: Zero production traffic, fresh start is simpler

---

## When You Need This

✅ **Migrate If**:
- You have real user accounts with valuable data
- Chat history needs to be preserved
- User preferences must carry over

❌ **Skip If**:
- Personal portfolio project (you are here ✓)
- No real users yet
- Fresh start is acceptable

---

## Quick Migration Script (If Needed)

```bash
#!/bin/bash
# Migrate users and chat data from Lovable Cloud to vana-dev

# Source database (Lovable Cloud)
SOURCE_URL="https://xfwlneedhqealtktaacv.supabase.co"
SOURCE_KEY="your_service_role_key_here"

# Target database (vana-dev)
TARGET_URL="https://vznhbocnuykdmjvujaka.supabase.co"
TARGET_KEY="your_service_role_key_here"

echo "🔄 Migrating data from Lovable Cloud to vana-dev..."

# Step 1: Export users
curl -X GET "${SOURCE_URL}/rest/v1/auth.users?select=*" \
  -H "apikey: ${SOURCE_KEY}" \
  -H "Authorization: Bearer ${SOURCE_KEY}" \
  > users_export.json

# Step 2: Export chat sessions
curl -X GET "${SOURCE_URL}/rest/v1/chat_sessions?select=*" \
  -H "apikey: ${SOURCE_KEY}" \
  -H "Authorization: Bearer ${SOURCE_KEY}" \
  > sessions_export.json

# Step 3: Export chat messages
curl -X GET "${SOURCE_URL}/rest/v1/chat_messages?select=*" \
  -H "apikey: ${SOURCE_KEY}" \
  -H "Authorization: Bearer ${SOURCE_KEY}" \
  > messages_export.json

# Step 4: Import to vana-dev
# (Requires manual review and user ID mapping)

echo "✅ Data exported. Review and import manually."
```

---

## Alternative: Database Dump & Restore

```bash
# 1. Get connection strings from Supabase dashboard
SOURCE_DB="postgresql://postgres:[password]@db.xfwlneedhqealtktaacv.supabase.co:5432/postgres"
TARGET_DB="postgresql://postgres:[password]@db.vznhbocnuykdmjvujaka.supabase.co:5432/postgres"

# 2. Dump specific tables
pg_dump "${SOURCE_DB}" \
  --table=chat_sessions \
  --table=chat_messages \
  --table=user_preferences \
  --data-only \
  > data_export.sql

# 3. Import to new database
psql "${TARGET_DB}" < data_export.sql
```

---

## Manual Migration Steps

### 1. Export Data from Lovable Cloud

```sql
-- Connect to Lovable Cloud Supabase
-- Dashboard → SQL Editor

-- Export users (copy results)
SELECT * FROM auth.users;

-- Export sessions
SELECT * FROM chat_sessions;

-- Export messages
SELECT * FROM chat_messages;
```

### 2. Import to vana-dev

```sql
-- Connect to vana-dev Supabase
-- Dashboard → SQL Editor

-- Insert users (requires auth.admin privileges)
-- Note: User passwords cannot be migrated (hashed)
-- Users will need to reset passwords

-- Insert sessions
INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
VALUES (...);

-- Insert messages
INSERT INTO chat_messages (id, session_id, role, content, created_at)
VALUES (...);
```

---

## Important Considerations

### ⚠️ Authentication Migration Challenges

1. **Password Hashes**: Cannot be exported/imported
   - **Solution**: Users must reset passwords or use email magic links

2. **User IDs**: May conflict if both databases have users
   - **Solution**: Use UUID mapping table

3. **OAuth Tokens**: Cannot be migrated
   - **Solution**: Users must re-authenticate with Google/GitHub

### 🔒 Security Considerations

1. **Service Role Keys**: Never commit to git
2. **Connection Strings**: Use `.env` variables
3. **Exported Data**: Delete after migration (contains user data)

---

## Recommendation for Your Project

**Skip Migration** ✅

**Why**:
- Portfolio project (no production users)
- Clean slate simplifies demo
- Easier to show new features without legacy data
- No risk of migration bugs during portfolio reviews

**Instead**:
1. Create 2-3 test accounts on vana-dev
2. Generate sample chat conversations
3. Test all features with fresh data
4. Take screenshots for portfolio

---

## If You Decide to Migrate Anyway

**Estimated Time**: 2-4 hours
**Complexity**: Medium
**Risk**: Low (test environment)

**Steps**:
1. Backup both databases (1 hour)
2. Export data from Lovable Cloud (30 min)
3. Transform data if schema changed (30 min)
4. Import to vana-dev (30 min)
5. Verify and test (1 hour)

---

**Recommended Action**: ✅ **Skip migration, fresh start**

**Reason**: Simpler, faster, no risk, perfect for portfolio demos
