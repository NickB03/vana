# PR 571 Critical Fix #1: SSE Warning Events for Skill Degradation

## Overview
Implemented SSE warning events to notify users when skill detection/resolution fails or when the circuit breaker opens. Previously, users experienced degraded functionality silently without any notification.

## Changes Made

### 1. Extended `SkillDetectionResult` Type (detector.ts)
**File**: `supabase/functions/_shared/skills/detector.ts`

Added optional `warning` field to `SkillDetectionResult` interface:

```typescript
export interface SkillDetectionResult {
  /** Detected skill ID, or null if no skill applies */
  skillId: SkillId | null;
  /** Confidence level from the classifier */
  confidence: 'high' | 'medium' | 'low';
  /** Brief reasoning for the classification */
  reason: string;
  /** Time taken for classification in ms */
  latencyMs: number;
  /** Optional warning to display to user (e.g., circuit breaker opened) */
  warning?: {
    message: string;
    errorId: string;
  };
}
```

### 2. Circuit Breaker Warning (detector.ts)
**Location**: Lines 172-201 (circuit breaker code)

**Before**:
```typescript
// TODO: Send user-visible warning event through chat stream
// sendEvent({
//   type: 'warning',
//   message: `Automatic skill detection temporarily unavailable. Retrying in ${backoffSeconds}s.`
// });
```

**After**:
```typescript
return {
  skillId: null,
  confidence: 'low',
  reason: `Skill detection temporarily unavailable (recovering in ${backoffSeconds}s)`,
  latencyMs: 0,
  warning: {
    message: `Skill system temporarily degraded (will retry in ${backoffSeconds}s)`,
    errorId: ERROR_IDS.SKILL_DETECTION_UNAVAILABLE,
  },
};
```

### 3. Skill Detection Error Tracking (tool-calling-chat.ts)
**File**: `supabase/functions/chat/handlers/tool-calling-chat.ts`

**Added tracking variable** (line ~331):
```typescript
let skillSystemWarning: { message: string; errorId: string } | null = null;
```

**Track circuit breaker warning** (lines ~360-364):
```typescript
// Track warning from circuit breaker (if any)
if (detection.warning) {
  skillSystemWarning = detection.warning;
  console.warn(`${logPrefix} ⚠️ [ERROR_ID: ${detection.warning.errorId}] ${detection.warning.message}`);
}
```

**Track skill detection/resolution errors** (lines ~410-416):
```typescript
console.error(`${logPrefix} ❌ Skill detection/resolution failed:`, errorMessage);
console.warn(`${logPrefix} ⚠️ [ERROR_ID: SKILL_SYSTEM_ERROR] Chat will continue in degraded mode without skill context`);
// Track error for SSE warning event (sent after stream creation)
skillSystemWarning = {
  message: 'Advanced features temporarily unavailable',
  errorId: ERROR_IDS.SKILL_SYSTEM_ERROR,
};
```

### 4. SSE Warning Event Emission (tool-calling-chat.ts)
**Location**: Lines ~827-833 (inside ReadableStream start method)

**Added after skill activation event**:
```typescript
// Emit warning if skill detection/resolution failed
if (skillSystemWarning) {
  sendEvent({
    type: 'warning',
    message: skillSystemWarning.message,
    errorId: skillSystemWarning.errorId,
    timestamp: Date.now(),
  });
}
```

## Error IDs Used
Both error scenarios use existing error IDs from `src/constants/errorIds.ts`:

1. **Circuit Breaker**: `ERROR_IDS.SKILL_DETECTION_UNAVAILABLE`
   - Message: "Skill system temporarily degraded (will retry in {N}s)"
   - Triggered when consecutive failures exceed threshold

2. **Skill Detection/Resolution Error**: `ERROR_IDS.SKILL_SYSTEM_ERROR`
   - Message: "Advanced features temporarily unavailable"
   - Triggered when skill detection or resolution throws an exception

## User Experience
When skill degradation occurs, users now see:

1. **Visual Notification**: SSE warning event displayed in the chat UI
2. **Error Tracking**: Error ID included for observability
3. **Graceful Degradation**: Chat continues working without throwing errors
4. **Timing Information**: Circuit breaker warnings include retry countdown

## Testing Notes

### Manual Testing
To verify the warnings work correctly:

1. **Circuit Breaker Warning**:
   - Mock OpenRouter API failures to trigger circuit breaker
   - Verify warning event is sent with correct backoff time
   - Check that warning appears after consecutive failures

2. **Skill Detection Error**:
   - Cause skill detection to throw an exception
   - Verify warning event is sent
   - Confirm chat continues without interruption

### Automated Testing
- Circuit breaker tests pass: ✅ 16/16 tests passing
- Build succeeds with no TypeScript errors: ✅

## Implementation Details

### Why Not Send Event During Detection?
The skill detection happens **before** the SSE stream is created. The `sendEvent()` function only exists within the ReadableStream's start method. Therefore, we:

1. Track the warning during detection/resolution
2. Send the SSE event after stream creation
3. Emit it before the initial "Analyzing your request..." status

### Warning Message Guidelines
- **User-friendly**: No technical jargon
- **Actionable**: Includes timing information when available
- **Non-blocking**: Doesn't prevent chat from continuing
- **Tracked**: Includes error ID for observability

## Related Files
- `supabase/functions/_shared/skills/detector.ts` (circuit breaker)
- `supabase/functions/_shared/skills/resolver.ts` (resolution errors)
- `supabase/functions/chat/handlers/tool-calling-chat.ts` (SSE emission)
- `src/constants/errorIds.ts` (error ID constants)

## TODO Comments Removed
- ✅ Line 412 in tool-calling-chat.ts
- ✅ Lines 172-174 in detector.ts (circuit breaker)

## Verification Checklist
- [x] Extended SkillDetectionResult type with optional warning field
- [x] Circuit breaker returns warning with backoff time
- [x] Skill detection errors tracked for SSE emission
- [x] SSE warning event sent inside stream start method
- [x] TODO comments removed
- [x] Error IDs properly imported and used
- [x] Build succeeds with no TypeScript errors
- [x] Circuit breaker tests pass
- [x] User-friendly warning messages (no technical jargon)

## Next Steps
1. Test in production to verify warnings display correctly
2. Monitor error IDs in observability dashboard
3. Consider adding frontend toast notifications for warnings
4. Document warning event format in API documentation
