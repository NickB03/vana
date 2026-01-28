# Template Matching Integration Tests

## Overview

These tests verify that the template matching fix works correctly. The fix ensures that when a user requests a complex artifact (e.g., dashboard, game), the matched template guidance is passed to Gemini 3 Flash's system prompt for better artifact generation.

## Test Coverage

### Unit Tests (Fast, No API Calls)
1. **Dashboard Request Template Matching** - Verifies dashboard requests match the dashboard template
2. **Game Request Template Matching** - Verifies game requests match the game template
3. **Simple Request No Match** - Verifies simple requests don't unnecessarily match complex templates
4. **Unrelated Request No Match** - Verifies non-artifact requests don't match templates
5. **Template Consistency** - Verifies template matching is consistent across multiple calls
6. **System Prompt Integration** - Verifies template guidance is injected into system prompts

### E2E Tests (Require Supabase, Make API Calls)
7. **Dashboard Artifact with Template** - Full E2E test of dashboard generation with template
8. **Simple Artifact without Template** - Verifies simple artifacts work without templates
9. **Game Artifact with Template** - Full E2E test of game generation with template
10. **Backward Compatibility** - Verifies non-templated flow still works

## Running the Tests

### Run Unit Tests Only (Fast)
```bash
deno test --no-check --allow-net --allow-env --allow-read \
  supabase/functions/_shared/__tests__/template-matching-integration.test.ts
```

**Expected output:**
- 6 passed
- 4 ignored (E2E tests require Supabase)
- Duration: ~13ms

### Run All Tests Including E2E (Requires Supabase)

**Prerequisites:**
1. Start Supabase local instance:
   ```bash
   supabase start
   ```

2. Get credentials:
   ```bash
   supabase status
   ```
   Look for:
   - `API URL` (e.g., http://127.0.0.1:54321)
   - `anon key`

3. Run tests with environment variables:
   ```bash
   SUPABASE_URL=http://127.0.0.1:54321 \
   SUPABASE_ANON_KEY=your_anon_key_here \
   deno test --no-check --allow-net --allow-env --allow-read \
     supabase/functions/_shared/__tests__/template-matching-integration.test.ts
   ```

**Expected output:**
- 10 passed
- 0 failed
- 0 ignored
- Duration: ~30-60 seconds (includes Gemini API calls)
- Cost: ~$0.10 (Gemini API usage)

## What the Tests Verify

### Template Matching Flow
1. **Chat Handler** (`tool-calling-chat.ts`)
   - Extracts last user message
   - Calls `getMatchingTemplate(userMessage)`
   - Receives template guidance if match found
   - Passes template to `getSystemInstruction({ matchedTemplate })`

2. **System Prompt** (`system-prompt-inline.ts`)
   - Accepts `matchedTemplate` parameter
   - Injects template guidance via `{{MATCHED_TEMPLATE}}` placeholder
   - System prompt includes template structure and examples

3. **Gemini Artifact Generation**
   - Gemini receives system prompt with template guidance
   - Generates artifact following template structure
   - Complex artifacts (dashboard, game) have better success rate

### Key Assertions
- Templates match for complex requests (dashboard, game, landing page)
- Template guidance is >4000 chars for complex templates
- System prompt increases in size when template is included
- Template matching is deterministic (same input = same output)
- Simple requests work with or without templates
- Backward compatibility maintained for non-templated flow

## Test Output Examples

### Successful Template Match
```
🎯 Testing dashboard template matching...
  Template matched: true
  Template ID: dashboard
  Confidence: 55.07%
  Reason: matched
✓ Dashboard template matching successful
  Template includes 4075 chars of guidance
```

### No Template Match (Expected)
```
🚫 Testing unrelated request (no template expected)...
  Template matched: false
  Reason: no_matches
✓ Unrelated request correctly handled
```

### E2E Artifact Generation
```
📊 Testing dashboard artifact generation with template...
  Endpoint: http://127.0.0.1:54321/functions/v1/chat
  Template pre-check: matched
  Template ID: dashboard
  Confidence: 55.07%
  Total events: 15
  Tool called: {"type":"tool_call_start","toolName":"generate_artifact",...}
  Tool result success: true
  Artifact type: react
  Artifact code length: 3542 chars
  Has reasoning: true
✓ Dashboard artifact generation successful with template
```

## Troubleshooting

### Tests Fail with "SUPABASE_URL not set"
**Solution:** The E2E tests require Supabase. Either:
- Run only unit tests (they'll pass without Supabase)
- Start Supabase and set environment variables

### Tests Timeout or Fail with API Errors
**Possible causes:**
- Gemini API key not set in Supabase secrets
- Rate limiting (wait 60 seconds between runs)
- Supabase edge functions not running

**Solution:**
```bash
# Check Supabase status
supabase status

# Restart Supabase if needed
supabase stop
supabase start

# Verify edge functions are running
supabase functions list
```

### Template Confidence Lower Than Expected
**This is normal.** The confidence threshold is 30%. Tests verify:
- Matched templates have confidence ≥ 30%
- Template guidance is included in system prompt
- Artifacts generate successfully with template

Lower confidence (30-60%) is acceptable as long as the template is relevant.

## Integration with CI/CD

These tests are designed to run in CI/CD pipelines:

```yaml
# .github/workflows/test.yml
- name: Run Template Matching Tests
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  run: |
    deno test --no-check --allow-net --allow-env --allow-read \
      supabase/functions/_shared/__tests__/template-matching-integration.test.ts
```

## Cost Considerations

- **Unit tests only:** $0 (no API calls)
- **Full E2E suite:** ~$0.10 per run (Gemini API usage)
- **Recommended:** Run unit tests on every commit, E2E tests on PR merge

## Related Files

- **Test file:** `template-matching-integration.test.ts`
- **Template matcher:** `../artifact-rules/template-matcher.ts`
- **Chat handler:** `../../chat/handlers/tool-calling-chat.ts`
- **System prompt:** `../system-prompt-inline.ts`
- **Templates:** `../artifact-rules/template-matcher.ts` (ARTIFACT_TEMPLATES)

## Maintenance

When adding new templates:
1. Add template to `ARTIFACT_TEMPLATES` in `template-matcher.ts`
2. Add test case to verify template matches expected requests
3. Run tests to ensure no regressions
4. Update this README if needed
