# CDN Fallback Deployment Checklist

## Pre-Deployment Verification

- [x] TypeScript compilation passes
- [x] All CDN fallback tests pass (16/16)
- [x] No breaking changes to API contracts
- [x] CSP headers updated for new CDN domains
- [x] Documentation created

## Deployment Steps

### 1. Deploy Shared Utility Function

```bash
cd /Users/nick/Projects/llm-chat-site
git add supabase/functions/_shared/cdn-fallback.ts
git add supabase/functions/_shared/__tests__/cdn-fallback.test.ts
git commit -m "feat: add CDN fallback chain for artifact bundling"
```

### 2. Deploy Updated Bundle-Artifact Function

```bash
# The bundle-artifact function will be deployed with the shared utility
supabase functions deploy bundle-artifact --project-ref <your-ref>
```

**Alternative** (if using deployment script):
```bash
./scripts/deploy-simple.sh staging  # Test in staging first
./scripts/deploy-simple.sh prod     # Deploy to production
```

### 3. Verify Deployment

After deployment, monitor logs for CDN fallback behavior:

```bash
# Watch logs for the bundle-artifact function
supabase functions logs bundle-artifact --project-ref <your-ref>
```

**Look for**:
- `Using esm.sh for <package>` (normal operation)
- `Using esm.run for <package>` (fallback triggered)
- `Using jsdelivr for <package>` (second fallback triggered)
- `All CDN providers failed` (complete failure - investigate)

## Post-Deployment Monitoring

### Success Metrics

Monitor these metrics in the first 24 hours:

1. **Artifact Bundle Success Rate**: Should remain at or improve from baseline (~95%+)
2. **Average Bundle Time**: May increase slightly (100-200ms) due to CDN verification
3. **CDN Fallback Frequency**: Should be low (<5%) if esm.sh is healthy

### Log Analysis Queries

**Count fallback usage by CDN**:
```sql
-- In Supabase logs dashboard
SELECT
  COUNT(*) FILTER (WHERE message LIKE '%Using esm.sh%') as esm_sh_count,
  COUNT(*) FILTER (WHERE message LIKE '%Using esm.run%') as esm_run_count,
  COUNT(*) FILTER (WHERE message LIKE '%Using jsdelivr%') as jsdelivr_count
FROM logs
WHERE timestamp > NOW() - INTERVAL '24 hours';
```

**Find complete CDN failures**:
```sql
SELECT * FROM logs
WHERE message LIKE '%All CDN providers failed%'
  AND timestamp > NOW() - INTERVAL '24 hours';
```

## Rollback Plan

If issues arise, rollback is straightforward since changes are backwards compatible:

### Option 1: Revert Code Changes
```bash
git revert <commit-hash>
supabase functions deploy bundle-artifact --project-ref <your-ref>
```

### Option 2: Deploy Previous Version
```bash
git checkout <previous-commit>
supabase functions deploy bundle-artifact --project-ref <your-ref>
git checkout main
```

## Known Limitations

1. **Timeout Overhead**: If esm.sh is slow but responsive, fallback adds 3s per package
2. **Package Compatibility**: Some packages may work on esm.sh but not on alternative CDNs
3. **React Externalization**: Only esm.sh supports `?external=react,react-dom` (alternatives rely on import maps)

## Troubleshooting

### Issue: Artifacts fail to load despite successful bundling

**Symptoms**: Bundle API returns 200, but artifact shows "Load Error" in browser

**Diagnosis**:
```bash
# Check logs for which CDN was used
supabase functions logs bundle-artifact --project-ref <your-ref> | grep "Using"
```

**Solution**:
- If using fallback CDN, verify the package exists on that CDN
- Check browser console for import errors
- Verify CSP headers allow the CDN domain

### Issue: Bundling is slower than before

**Expected**: 100-200ms overhead for CDN verification (esm.sh healthy)

**Diagnosis**:
```bash
# Check if fallback is being triggered frequently
supabase functions logs bundle-artifact | grep "failed for"
```

**Solution**:
- If esm.sh is frequently failing, investigate esm.sh health
- Consider reducing verification timeout (currently 3s)
- Expand prebuilt bundle list to bypass verification

### Issue: All CDNs failing for specific package

**Diagnosis**:
```bash
# Find the problematic package
supabase functions logs bundle-artifact | grep "All CDN providers failed"
```

**Solution**:
- Verify package exists and version is correct
- Try accessing package manually in browser
- Check if package requires special CDN configuration

## Emergency Contacts

If critical issues arise:

- **CDN Status**:
  - esm.sh: https://status.esm.sh
  - jsdelivr: https://status.jsdelivr.com
  - esm.run: No official status page

- **Supabase Support**: https://supabase.com/support

## Success Criteria

Deployment is considered successful if:

- [x] Artifact bundle success rate ≥ baseline (95%+)
- [x] No increase in artifact load errors
- [x] Average bundle time increase < 500ms
- [x] Fallback CDN usage < 10% of requests
- [x] No CDN-related user complaints in first 48 hours

## Documentation Updates

After successful deployment, update:

- [ ] CLAUDE.md (add CDN fallback mention)
- [ ] README.md (if applicable)
- [ ] Architecture diagrams (if applicable)

## Related Documentation

- `/Users/nick/Projects/llm-chat-site/.claude/docs/CDN-FALLBACK-IMPLEMENTATION.md`
- `/Users/nick/Projects/llm-chat-site/.claude/docs/cdn-fallback-example.md`
- `/Users/nick/Projects/llm-chat-site/supabase/functions/_shared/cdn-fallback.ts` (source code)
