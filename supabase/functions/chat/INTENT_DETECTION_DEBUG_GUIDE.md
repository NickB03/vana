# Intent Detection Debug Guide

Quick reference for debugging intent detection issues in production.

## Log Patterns to Search For

### Intent Detection Flow
```bash
# Search for intent detection start
grep "🔍 Starting intent detection" logs

# Search for final routing decisions
grep "🎯 INTENT:" logs

# Search for medium confidence warnings
grep "⚠️ MEDIUM confidence" logs
```

### Specific Intent Types
```bash
# Image generation
grep "🔍 \[shouldGenerateImage\]" logs

# Artifact generation
grep "🔍 \[shouldGenerateArtifact\]" logs

# Negative pattern matches
grep "Question/clarification pattern detected" logs
```

## Expected Log Flow

### Successful Image Detection
```
🔍 Starting intent detection for: generate an image of a sunset...
🔍 [shouldGenerateImage] Analyzing prompt: generate an image of a sunset...
🔍 [shouldGenerateImage] Intent result: {"type":"image","confidence":"high","reasoning":"..."}
🔍 [shouldGenerateImage] Final decision: true (type=image, confidence=high)
🎯 INTENT: Image generation detected (high confidence)
```

### Successful Artifact Detection
```
🔍 Starting intent detection for: create a react app for...
🔍 [shouldGenerateArtifact] Analyzing prompt: create a react app for...
🔍 [shouldGenerateArtifact] Intent result: {"type":"react","confidence":"high","reasoning":"..."}
🔍 [shouldGenerateArtifact] Final decision: true (type=react, confidence=high)
🎯 INTENT: Artifact generation detected (type: react)
```

### Negative Pattern Match (Question → Chat)
```
🔍 Starting intent detection for: What is a react component?
🔍 [shouldGenerateImage] Analyzing prompt: What is a react component?
🔍 [shouldGenerateImage] Intent result: {"type":"chat","confidence":"high","reasoning":"Question/clarification pattern detected..."}
🔍 [shouldGenerateImage] Final decision: false (type=chat, confidence=high)
🔍 [shouldGenerateArtifact] Analyzing prompt: What is a react component?
🔍 [shouldGenerateArtifact] Intent result: {"type":"chat","confidence":"high","reasoning":"Question/clarification pattern detected..."}
🔍 [shouldGenerateArtifact] Final decision: false (type=chat, confidence=high)
🎯 INTENT: Regular chat (no artifact/image intent detected)
```

### Medium Confidence Detection
```
🔍 Starting intent detection for: I want a dashboard
🔍 [shouldGenerateArtifact] Analyzing prompt: I want a dashboard
🔍 [shouldGenerateArtifact] Intent result: {"type":"react","confidence":"medium","reasoning":"Detected 'react' with score 15..."}
⚠️ MEDIUM confidence artifact detection (react) - routing anyway but logging for analysis
🔍 [shouldGenerateArtifact] Final decision: true (type=react, confidence=medium)
🎯 INTENT: Artifact generation detected (type: react)
```

### Force Mode Override
```
🎯 FORCE ARTIFACT MODE - skipping intent detection
🎯 INTENT: Artifact generation detected (type: react)
```

## Common Issues & Solutions

### Issue 1: False Positive (Question routed to artifact)
**Symptom**: Questions like "What is react?" generate artifacts
**Log Pattern**: No "Question/clarification pattern detected" in logs
**Solution**: Check if question matches NEGATIVE_PATTERNS in `intent-detector.ts`
**Fix**: Add missing negative pattern

### Issue 2: False Negative (Creation request defaulted to chat)
**Symptom**: "create a react app" results in chat response
**Log Pattern**: `Final decision: false` for both image and artifact checks
**Solution**: Check prompt against HIGH_CONFIDENCE_PATTERNS
**Fix**: Adjust pattern regex or add new pattern

### Issue 3: Medium Confidence Too Frequent
**Symptom**: Too many `⚠️ MEDIUM confidence` warnings in logs
**Log Pattern**: >30% of detections are medium confidence
**Solution**: Review medium confidence prompts and adjust patterns
**Fix**: Add more HIGH_CONFIDENCE_PATTERNS for common cases

### Issue 4: Intent Detection Not Running
**Symptom**: No intent detection logs at all
**Log Pattern**: Missing "🔍 Starting intent detection" in logs
**Solution**: Check if force modes are enabled or if handler is disabled
**Fix**: Verify `handlers/intent.ts` is calling detection functions

### Issue 5: Errors in Intent Detection
**Symptom**: `❌ [shouldGenerateImage] Error detecting intent` in logs
**Log Pattern**: Error stack traces in logs
**Solution**: Check for missing dependencies or API failures
**Fix**: Verify Supabase connection, OpenRouter API key, etc.

## Testing in Production

### Quick Manual Tests
```bash
# Test high confidence image
curl -X POST <edge-function-url> -d '{"message": "generate an image of a sunset"}'

# Test high confidence artifact
curl -X POST <edge-function-url> -d '{"message": "create a react app"}'

# Test negative pattern (question)
curl -X POST <edge-function-url> -d '{"message": "What is a react component?"}'
```

### Monitoring Confidence Distribution
```bash
# Count high confidence detections
grep "confidence\":\"high\"" logs | wc -l

# Count medium confidence detections
grep "confidence\":\"medium\"" logs | wc -l

# Count low confidence detections
grep "confidence\":\"low\"" logs | wc -l
```

## Pattern Reference

### HIGH_CONFIDENCE_PATTERNS (score: 30)
```typescript
// React
/^(create|build|make|generate)\s+(a|an|me)?\s*(react|interactive|web)\s*(app|component|application|interface|dashboard)/i

// Mermaid
/^(draw|create|generate|make)\s+(a|an|me)?\s*(mermaid|flowchart|sequence|class|state)\s*(diagram|chart)/i

// SVG
/^(generate|create|make|draw)\s+(a|an|me)?\s*(svg|vector|icon|logo)/i

// Image
/^(generate|create|draw|paint|make)\s+(a|an|me)?\s*(image|picture|photo|artwork|illustration)\s+(of|showing|depicting)/i
```

### NEGATIVE_PATTERNS (checked first)
```typescript
// Questions
/^(what|how|why|when|where|who)\s+/i
/^(explain|tell me about|describe|define)\s+/i
/^(can you|could you|would you)\s+(explain|tell|describe|help me understand)/i

// Clarifications
/\?$/  // Ends with question mark
/^(is it|are there|does it|do they)\s+/i
```

## Confidence Thresholds

| Score Range | Confidence | Action |
|------------|------------|--------|
| >= 25 | High | Auto-route to artifact/image |
| 15-24 | Medium | Route with warning log |
| < 15 | Low | Default to chat |

## Useful Supabase CLI Commands

```bash
# View recent logs
supabase functions logs chat --project-ref <ref>

# Follow logs in real-time
supabase functions logs chat --project-ref <ref> --tail

# Filter logs by pattern
supabase functions logs chat --project-ref <ref> | grep "🔍"

# View specific time range
supabase functions logs chat --project-ref <ref> --since="2025-11-26 12:00:00"
```

## Rollback Commands

### Disable Intent Detection (Quick Fix)
Edit `/supabase/functions/chat/handlers/intent.ts` lines 51-77:
```typescript
const isImageRequest = false; // forceImageMode only
const isArtifactRequest = false; // forceArtifactMode only
```

Then redeploy:
```bash
supabase functions deploy chat --project-ref <ref>
```

### Revert Git Commit
```bash
git log --oneline  # Find commit hash
git revert <commit-hash>
git push origin main
supabase functions deploy chat --project-ref <ref>
```

## Contact & Escalation

If you need to disable intent detection immediately:
1. Use force modes in UI (artifact/image toggle buttons)
2. Deploy rollback (see above)
3. File GitHub issue with logs attached

---

**Last Updated**: 2025-11-26
**Related Issue**: #126
**Documentation**: `.github/ISSUE_126_IMPLEMENTATION_SUMMARY.md`
