# Model Configuration Stability Tests

## 🎯 Purpose

**Prevent accidental changes to production model names** during development.

These tests use a **"golden snapshot"** pattern to ensure AI assistants (or developers) don't accidentally change critical model configuration values.

## 🚨 Why This Matters

Changing a model name can break production **even if the new model exists** because:
- Different models have different capabilities
- Pricing varies between models
- Rate limits differ per model
- Context lengths may be incompatible
- Response formats might change

## 🏗️ How It Works

### 1. Golden Snapshot
```json
{
  "version": "2025-12-23",
  "models": {
    "GEMINI_FLASH": "google/gemini-2.5-flash-lite",
    "GLM_4_6": "zhipu/glm-4.6",
    "GLM_4_5_AIR": "zhipu/glm-4.5-air",
    "GEMINI_FLASH_IMAGE": "google/gemini-2.5-flash-image"
  }
}
```

### 2. Test Validation
Tests compare `config.ts` models against the snapshot:
- ✅ **PASS**: Models match snapshot (no changes)
- ❌ **FAIL**: Models differ from snapshot (alert developer)

### 3. Developer Workflow

**If Tests Fail:**

```
⚠️  MODEL CONFIGURATION HAS CHANGED!

Differences found:
   ❌ GEMINI_FLASH: Changed from "google/gemini-2.5-flash-lite" to "google/gemini-3.0-pro"

🔧 HOW TO FIX:

1️⃣  If this change was ACCIDENTAL:
   → Revert your changes to config.ts

2️⃣  If this change was INTENTIONAL:
   → Update model-config.snapshot.json to match
   → Update the 'version' field to today's date
   → Document the reason in your commit message
```

## 📁 Files

```
_shared/
├── config.ts                                   # Source of truth
└── __tests__/
    ├── model-config.snapshot.json              # Golden snapshot
    ├── model-config.test.ts                    # Stability tests
    └── MODEL_CONFIG_TESTS.md                   # This file
```

## 🚀 Running Tests

### Local Development

```bash
# Run all Edge Function tests (includes model config tests)
cd supabase/functions
deno task test

# Run only model config tests
deno test --allow-read --allow-env _shared/__tests__/model-config.test.ts

# Watch mode
deno task test:watch
```

### CI/CD

Tests run automatically on:
- Every commit to `main`
- Every pull request
- Pre-deployment checks

See `.github/workflows/edge-functions-tests.yml`

## 🔄 Updating Model Names (Intentional Changes)

When you **deliberately** want to change a model:

1. **Update config.ts**
   ```typescript
   export const MODELS = {
     GEMINI_FLASH: 'google/new-model-name',  // Changed
     // ...
   }
   ```

2. **Update snapshot** (`model-config.snapshot.json`)
   ```json
   {
     "version": "2025-11-16",  // ← Update date
     "models": {
       "GEMINI_FLASH": "google/new-model-name"  // ← Match config
     }
   }
   ```

3. **Run tests to verify**
   ```bash
   cd supabase/functions
   deno task test
   ```

4. **Commit with clear message**
   ```bash
   git add supabase/functions/_shared/config.ts
   git add supabase/functions/_shared/__tests__/model-config.snapshot.json
   git commit -m "chore: upgrade GEMINI_FLASH model to new-model-name

   Reason: Better performance and lower cost
   Impact: All chat/reasoning endpoints
   Tested: Verified with test suite"
   ```

## 📊 Test Coverage

| Test | Purpose | Prevents |
|------|---------|----------|
| **Snapshot Match** | Models match golden snapshot | Accidental model changes |
| **No Hardcoded Names** | All code uses `MODELS.*` | Config drift |
| **Snapshot Validation** | Snapshot file is valid JSON | Corruption |
| **Required Keys** | All expected keys exist | Missing models |

## 🔍 Additional Protections

### Hardcoded Model Scanner

Tests also scan for hardcoded model names like:
```typescript
// ❌ BAD - Hardcoded
const model = "google/gemini-2.5-flash-lite";

// ✅ GOOD - Using config
import { MODELS } from '../_shared/config.ts';
const model = MODELS.GEMINI_FLASH;
```

This ensures all model names go through centralized configuration.

## 🎓 Best Practices

### DO ✅
- Always use `MODELS.*` constants from config.ts
- Update snapshot when intentionally changing models
- Document reason for model changes in commits
- Test locally before pushing

### DON'T ❌
- Hardcode model names in function code
- Change models without updating snapshot
- Skip model config tests
- Use temporary/preview model names in production

## 🐛 Troubleshooting

### Test fails but I didn't change anything
- Someone else may have changed models in a recent commit
- Check `git log` to see who changed config.ts
- Verify snapshot version matches expected configuration

### I need to revert a model change
```bash
# Revert both files together
git checkout HEAD -- supabase/functions/_shared/config.ts
git checkout HEAD -- supabase/functions/_shared/__tests__/model-config.snapshot.json
```

### Tests pass locally but fail in CI
- Ensure both config.ts and snapshot are committed
- Check git status: `git status supabase/functions/_shared/`
- Verify snapshot version is updated

## 📚 Related Documentation

- [REFACTORING_TEST_PLAN.md](../../../../.claude/REFACTORING_TEST_PLAN.md) - Overall testing strategy
- [TESTING_QUICK_REFERENCE.md](../../../../.claude/TESTING_QUICK_REFERENCE.md) - Test commands
- [config.ts](../config.ts) - Model configuration source

---

**Last Updated:** 2025-11-15
**Test Version:** 1.0.0
**Maintainer:** Development Team
