# Admin Dashboard Deployment Guide

**Created**: November 12, 2025
**Purpose**: Monitor Kimi K2 & Gemini API usage, costs, and performance

---

## 🎯 Overview

The admin dashboard provides real-time monitoring of:
- ✅ **API Usage**: Request volumes by function and provider
- ✅ **Cost Tracking**: Daily/monthly spending with projections
- ✅ **Performance Metrics**: Latency, success rates, error patterns
- ✅ **Real-Time Updates**: Auto-refresh every 30 seconds
- ✅ **Visual Analytics**: Charts and graphs for trend analysis

---

## 📦 What Was Created

### Database Layer
1. **`ai_usage_logs` table** - Stores all API call metadata
2. **Analytics views** - Pre-computed aggregations for fast queries
3. **`get_usage_overview()` function** - Dashboard summary data

### Backend
4. **`admin-analytics` Edge Function** - API endpoint for dashboard data
5. **Auto-logging in `openrouter-client.ts`** - Logs every Kimi K2 call

### Frontend
6. **`AdminDashboard.tsx`** - React component with charts
7. **Route at `/admin`** - Added to App.tsx

---

## 🚀 Deployment Steps

### Step 1: Run Database Migrations

```bash
# Apply all migrations
supabase db push

# Verify tables were created
supabase db diff

# Expected tables:
# - ai_usage_logs
# - ai_usage_daily_summary (view)
# - ai_usage_hourly_summary (view)
# - ai_cost_by_function (view)
# - ai_error_analysis (view)
# - ai_performance_trends (view)
```

### Step 2: Configure Admin Access

**Option A: Email-based (Quick Setup)**

Edit `supabase/migrations/20251112000001_create_ai_usage_tracking.sql`:

```sql
-- Find this line (around line 61):
AND (auth.users.raw_user_meta_data->>'role' = 'admin'
     OR auth.users.email IN (
       'your-admin-email@example.com' -- Replace with YOUR email
     ))
```

**Replace with your actual admin email**, then re-run migrations:
```bash
supabase db reset  # WARNING: Resets database
# OR manually update the policy
```

**Option B: Role-based (Production Setup)**

Set admin role in user metadata:
```sql
-- Set yourself as admin
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'your-email@example.com';
```

### Step 3: Deploy Edge Functions

```bash
# Deploy the admin analytics endpoint
supabase functions deploy admin-analytics

# Verify deployment
supabase functions list
# Should show: admin-analytics

# Check logs
supabase functions logs admin-analytics
```

### Step 4: Update Frontend

The route is already added to `App.tsx`, so just build:

```bash
# Build frontend
npm run build

# Deploy to your hosting (Vercel/Netlify/etc)
# OR test locally
npm run dev
```

### Step 5: Test the Dashboard

```bash
# 1. Start local dev server
npm run dev

# 2. Login with your admin account
open http://localhost:8080/auth

# 3. Navigate to admin dashboard
open http://localhost:8080/admin

# 4. Verify you see:
# - Overview cards (Total Requests, Total Cost, etc.)
# - Charts for cost breakdown
# - Usage trends graph
# - Performance metrics
```

---

## 🔑 Admin Access Configuration

### Current Setup

**File**: `supabase/functions/admin-analytics/index.ts` (lines 27-30)

```typescript
const isAdmin = user.email?.endsWith('@yourdomain.com') || // CHANGE THIS
                user.user_metadata?.role === 'admin';
```

### Update This Line

**Before:**
```typescript
user.email?.endsWith('@yourdomain.com')
```

**After (Option 1 - Single Admin):**
```typescript
user.email === 'your-actual-email@gmail.com'
```

**After (Option 2 - Multiple Admins):**
```typescript
['admin1@gmail.com', 'admin2@gmail.com'].includes(user.email || '')
```

**After (Option 3 - Domain-based):**
```typescript
user.email?.endsWith('@your-company.com')
```

Then redeploy:
```bash
supabase functions deploy admin-analytics
```

---

## 📊 Dashboard Features

### 1. Overview Cards

- **Total Requests**: All-time + today's count
- **Total Cost**: Cumulative spending + today
- **Success Rate**: Percentage of successful API calls
- **Avg Latency**: Response time performance

### 2. Cost Breakdown Tab

- **Pie Chart**: Cost by provider (Kimi K2 vs Gemini)
- **Bar Chart**: Cost by function (artifacts vs chat vs images)

### 3. Usage Trends Tab

- **Line Chart**: Daily request volume
  - Green line: Successful requests
  - Red line: Failed requests

### 4. Performance Tab

- **List View**: Each function with:
  - Request count
  - Average latency
  - Total cost

### 5. Time Range Selector

- Last 7 days
- Last 30 days (default)
- Last 90 days

### 6. Auto-Refresh

- Toggle button to enable/disable
- Refreshes every 30 seconds when enabled
- Useful for real-time monitoring

---

## 🔍 Verifying Data Collection

### Check if Usage is Being Logged

```bash
# View recent logs
supabase db psql

# Run query
SELECT
  created_at,
  function_name,
  provider,
  model,
  total_tokens,
  estimated_cost::decimal(10,4) as cost,
  status_code
FROM ai_usage_logs
ORDER BY created_at DESC
LIMIT 10;
```

**Expected output:**
```
created_at             | function_name         | provider    | model                      | total_tokens | cost    | status_code
-----------------------+-----------------------+-------------+----------------------------+--------------+---------+-------------
2025-11-12 15:30:45    | generate-artifact     | openrouter  | moonshotai/kimi-k2-thinking| 1801         | 0.0018  | 200
2025-11-12 15:25:30    | generate-artifact-fix | openrouter  | moonshotai/kimi-k2-thinking| 1200         | 0.0013  | 200
```

**If empty:**
- Check Supabase logs: `supabase functions logs generate-artifact | grep "📊 Usage logged"`
- Verify table exists: `\dt ai_usage_logs`
- Check RLS policies: `\d+ ai_usage_logs`

### Manual Test Query

```sql
-- Insert test data
INSERT INTO ai_usage_logs (
  request_id, function_name, provider, model,
  user_id, is_guest, input_tokens, output_tokens,
  total_tokens, latency_ms, status_code, estimated_cost
) VALUES (
  'test-123', 'generate-artifact', 'openrouter',
  'moonshotai/kimi-k2-thinking', NULL, true,
  1000, 500, 1500, 3000, 200, 0.0014
);

-- Verify it appears in dashboard view
SELECT * FROM ai_usage_daily_summary ORDER BY day DESC LIMIT 1;
```

---

## 🐛 Troubleshooting

### Issue: "Admin access required" error

**Cause**: Your user is not marked as admin

**Solution:**
```bash
# Option 1: Update admin-analytics function
# Edit: supabase/functions/admin-analytics/index.ts
# Change line 27-30 to match your email
supabase functions deploy admin-analytics

# Option 2: Set admin role in database
supabase db psql
UPDATE auth.users SET raw_user_meta_data =
  jsonb_set(raw_user_meta_data, '{role}', '"admin"')
WHERE email = 'your-email@example.com';
```

### Issue: Dashboard shows "No data"

**Cause**: No usage data logged yet OR time range too narrow

**Solutions:**
1. Generate a test artifact to create usage data
2. Check database: `SELECT COUNT(*) FROM ai_usage_logs;`
3. Extend time range to 90 days
4. Check browser console for API errors

### Issue: Charts not rendering

**Cause**: Missing Recharts library OR data format issue

**Solutions:**
```bash
# Verify Recharts is installed
npm list recharts

# If missing, install
npm install recharts

# Check browser console for errors
```

### Issue: "Failed to load analytics data"

**Cause**: API endpoint error

**Solutions:**
```bash
# Check function logs
supabase functions logs admin-analytics

# Verify function is deployed
supabase functions list | grep admin-analytics

# Test endpoint directly
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/admin-analytics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"metric": "overview", "days": 30}'
```

---

## 📈 Cost Projections

### Estimated Dashboard Costs

**Database Storage:**
- 100 requests/day × 365 days = 36,500 rows/year
- ~5KB per row = ~180MB/year
- Cost: Included in Supabase free tier

**Function Invocations:**
- Dashboard loads: ~10/day × 30 days = 300/month
- Auto-refresh: ~100/hour × 8 hours × 30 = 24,000/month
- Total: ~24,300/month
- Cost: Well within Supabase free tier (2M invocations)

**Total Cost: $0** (within free tier limits)

---

## 🎨 Customization

### Change Color Theme

Edit `src/pages/AdminDashboard.tsx`:

```typescript
// Line 18
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Change to your brand colors:
const COLORS = ['#your-color-1', '#your-color-2', ...];
```

### Add More Metrics

Add to analytics endpoint (`admin-analytics/index.ts`):

```typescript
case "custom-metric":
  const { data: custom } = await supabase
    .from("ai_usage_logs")
    .select("*")
    .gte("created_at", ...)
    .custom_aggregation();
  data = custom;
  break;
```

Then add UI in `AdminDashboard.tsx`.

### Export Data Feature

Add button handler:

```typescript
const exportData = async () => {
  const csv = dailyData.map(row =>
    `${row.day},${row.total_requests},${row.total_cost}`
  ).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `usage-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
};
```

---

## ✅ Post-Deployment Checklist

- [ ] Migrations applied successfully
- [ ] Admin email/role configured
- [ ] `admin-analytics` function deployed
- [ ] Can access `/admin` route
- [ ] Overview cards show data
- [ ] Charts render correctly
- [ ] Time range selector works
- [ ] Auto-refresh functions
- [ ] Export button works (if implemented)
- [ ] Mobile responsive (test on phone)

---

## 🔐 Security Best Practices

1. **Never expose admin dashboard publicly**
   - Requires authentication
   - Admin-only access enforced

2. **Use HTTPS only**
   - Supabase enforces this by default

3. **Rotate admin access regularly**
   - Review admin users quarterly
   - Remove inactive admins

4. **Monitor dashboard access**
   ```sql
   -- Track who accessed admin dashboard
   SELECT user_id, created_at
   FROM auth.audit_log_entries
   WHERE payload->>'path' LIKE '%admin%'
   ORDER BY created_at DESC;
   ```

5. **Set spending alerts**
   - Monitor `ai_usage_logs` daily costs
   - Alert if daily cost > $X threshold

---

## 📚 Additional Resources

- **Dashboard**: `http://your-domain.com/admin`
- **API Docs**: `.claude/KIMI_K2_MIGRATION_PLAN.md`
- **Database Schema**: `supabase/migrations/20251112000001_*`
- **Analytics Views**: `supabase/migrations/20251112000002_*`

---

**Dashboard Ready!** 🎉

Access it at: `http://localhost:8080/admin` (local) or `https://your-domain.com/admin` (production)

For questions or issues, check the troubleshooting section above.
