# ReasoningProvider Rollback Guide

Quick reference guide for rolling back the ReasoningProvider feature if issues arise in production.

## Decision Matrix

| Scenario | Action | Downtime | Data Loss | Restoration |
|----------|--------|----------|-----------|-------------|
| **Production emergency** | Option 1: Disable | ~0s | None | No status updates |
| **Feature regression** | Option 2: Full Rollback | ~2-3min | None | Full [STATUS:] system |
| **Performance issue** | Option 1: Disable | ~0s | None | Monitor & decide |

## Option 1: Disable Status Updates (Emergency)

**Use when**: Immediate action needed, production is impacted

**Impact**: Status updates disabled entirely, shows "Thinking..." only

**Command**:
```bash
supabase secrets set USE_REASONING_PROVIDER=false
```

**Recovery time**: ~0 seconds (immediate)

**What happens**:
- ✅ ReasoningProvider stops making GLM-4.5-Air calls
- ✅ No additional API costs
- ⚠️ Users see generic "Thinking..." instead of status updates
- ❌ Does NOT restore the old [STATUS:] marker system

**Re-enable**:
```bash
supabase secrets set USE_REASONING_PROVIDER=true
```

## Option 2: Full Rollback (Planned)

**Use when**: Need to restore the old [STATUS:] marker parsing system

**Impact**: Full restoration of legacy status update system

**Steps**:

1. **Identify the commit to revert**:
   ```bash
   # Find the ReasoningProvider activation commit
   git log --oneline --grep="ReasoningProvider" | head -5
   ```

2. **Create revert commit**:
   ```bash
   git revert <commit-hash>
   ```

3. **Test locally**:
   ```bash
   npm run test
   cd supabase/functions && deno task test
   ```

4. **Deploy to production**:
   ```bash
   ./scripts/deploy-simple.sh prod
   ```

5. **Verify in production**:
   - Generate an artifact
   - Confirm [STATUS:] markers appear in console logs
   - Verify status updates work correctly

**Recovery time**: ~2-3 minutes (deployment + propagation)

**What gets restored**:
- ✅ `parseStatusMarker()` logic in `glm-client.ts`
- ✅ [STATUS:] marker parsing in `generate-artifact/`
- ✅ Original status update system
- ✅ No additional GLM-4.5-Air API costs

## Monitoring Post-Rollback

### Key Metrics to Watch

1. **Status Update Frequency**:
   ```bash
   # Check Edge Function logs
   supabase functions logs generate-artifact --tail
   ```

2. **Error Rates**:
   ```sql
   -- Query error logs
   SELECT COUNT(*), error_message
   FROM ai_usage_logs
   WHERE function_name = 'generate-artifact'
     AND created_at > NOW() - INTERVAL '1 hour'
     AND error_message IS NOT NULL
   GROUP BY error_message;
   ```

3. **API Costs** (if Option 1):
   ```sql
   -- Verify GLM-4.5-Air calls stopped
   SELECT COUNT(*), model
   FROM ai_usage_logs
   WHERE created_at > NOW() - INTERVAL '1 hour'
     AND model = 'zhipu/glm-4.5-air'
   GROUP BY model;
   ```

## Troubleshooting

### Option 1 doesn't work

**Symptom**: Status updates still appear after setting `USE_REASONING_PROVIDER=false`

**Cause**: Environment variable not loaded

**Fix**:
```bash
# Verify the secret is set
supabase secrets list | grep USE_REASONING_PROVIDER

# Force Edge Function restart (kills cache)
supabase functions deploy generate-artifact --no-verify-jwt
```

### Option 2 causes test failures

**Symptom**: Tests fail after reverting the commit

**Cause**: Test snapshots expect ReasoningProvider behavior

**Fix**:
```bash
# Update test snapshots to match reverted behavior
cd supabase/functions
deno task test -- --update-snapshots

# Commit the snapshot updates
git add .
git commit -m "test: update snapshots for ReasoningProvider rollback"
```

### [STATUS:] markers not appearing (Option 2)

**Symptom**: After full rollback, no status updates in console

**Cause**: GLM system prompt missing [STATUS:] instructions

**Fix**:
1. Check `supabase/functions/_shared/system-prompt.txt` has marker definitions
2. Verify `glm-client.ts` includes `parseStatusMarker()` function
3. Confirm `generate-artifact/index.ts` uses marker parsing logic

## Communication Plan

### User-Facing Message (Option 1)

```
We've temporarily disabled status updates during artifact generation to ensure optimal performance. You'll see "Thinking..." instead of detailed progress. Artifacts will continue to generate normally. We're working on improvements and will re-enable status updates soon.
```

### User-Facing Message (Option 2)

```
We've rolled back to our previous status update system to ensure the best user experience. You may notice slightly different phrasing in status messages, but all functionality remains unchanged.
```

## Related Documentation

- **Implementation Plan**: `.claude/plans/reasoning-provider-activation.md`
- **Feature Flag Config**: `supabase/functions/_shared/config.ts` (lines 57-82)
- **ReasoningProvider Code**: `supabase/functions/_shared/reasoning-provider.ts`
- **GLM Client**: `supabase/functions/_shared/glm-client.ts`

## Contact

For assistance with rollback procedures, contact the backend team or refer to:
- CLAUDE.md → "Troubleshooting" section
- Supabase Dashboard → Edge Function Logs
- GitHub Issues → Tag with `reasoning-provider` label
