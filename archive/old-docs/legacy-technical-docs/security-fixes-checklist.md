# Security Fixes Implementation Checklist - PR #122

## Current State Verification ✅
- [x] Branch: `fix/security-critical-patches-v2` 
- [x] Commit: `12d032a4` (clean state)
- [x] Backup created: `fix/security-critical-patches-v2-backup`
- [x] All 5 security files present and verified

## Fix Implementation Checklist

### Fix 1: Rate Limiter Environment Variables (HIGH PRIORITY) ⏳
- **File**: `frontend/src/lib/rate-limiter-config.ts`
- **Line Numbers Confirmed**: 
  - Line 29: Add helper function `getDefaultRateLimits()`
  - Line 103-105: Update limits configuration with env fallbacks
- **Status**: Ready for implementation
- [ ] Add `getDefaultRateLimits()` helper function
- [ ] Update hardcoded limits to use environment variables
- [ ] Test with environment variables set

### Fix 2: SQL Injection Pattern (MEDIUM) ⏳
- **File**: `frontend/src/lib/security-patterns.ts`  
- **Line Numbers Confirmed**: Line 17 (confirmed exact match)
- **Status**: Ready for implementation
- [ ] Update SQL injection pattern to be more context-aware

### Fix 3: Command Injection Pattern (MEDIUM) ⏳
- **File**: `frontend/src/lib/security-patterns.ts`
- **Line Numbers Confirmed**: Line 26 (confirmed exact match)
- **Status**: Ready for implementation  
- [ ] Update command injection pattern to require command context

### Fix 4: Type Safety Fix (LOW) ⏳
- **File**: `frontend/src/lib/security-patterns.ts`
- **Line Numbers Confirmed**: Line 332 (confirmed exact match)
- **Status**: Ready for implementation
- [ ] Remove unsafe 'as any' cast with proper type union

### Fix 5: XSS Pattern Context (MEDIUM) ⏳
- **File**: `frontend/src/components/editor/monaco-sandbox.tsx`
- **Line Numbers Confirmed**: Line 166-176 (confirmed exact match)
- **Status**: Ready for implementation
- [ ] Add language context check before XSS detection
- [ ] Make XSS patterns conditional based on language

### Fix 6: Monaco Integrity Hash (LOW) ⏳
- **File**: `frontend/src/components/editor/monaco-sandbox.tsx`
- **Line Numbers Confirmed**: Line 150-151 (confirmed placeholder integrity)
- **Status**: Ready for implementation
- [ ] Remove placeholder integrity attribute for now
- [ ] Document option to add real hash in future

### Fix 7: SSE Heartbeat Configuration (LOW) ⏳
- **File**: `frontend/src/app/api/sse/route.ts`
- **Line Numbers Confirmed**: Line 136 (confirmed hardcoded 30000)
- **Status**: Ready for implementation
- [ ] Replace hardcoded 30000 with environment variable

### Fix 8: File Validation Constants (LOW) ⏳
- **File**: `frontend/src/components/chat/chat-interface.tsx`
- **Line Numbers Confirmed**: 
  - Line 20: Add constants at top of file
  - Line 374-381: Replace hardcoded values (confirmed exact match)
- **Status**: Ready for implementation
- [ ] Add MAX_FILE_SIZE and ALLOWED_FILE_TYPES constants
- [ ] Update hardcoded values to use constants

### Fix 9: .env.example Creation ⏳
- **File**: `.env.example` (create new)
- **Status**: File does not exist - needs creation
- [ ] Create .env.example with all rate limiting variables
- [ ] Add SSE heartbeat interval variable
- [ ] Add Redis configuration variables

## Implementation Notes

### Line Number Verification Results:
✅ **All line numbers from plan are EXACT matches**
- Rate limiter config: Lines 29, 103-105 confirmed
- Security patterns: Lines 17, 26, 332 confirmed  
- Monaco sandbox: Lines 150-151, 166-176 confirmed
- SSE route: Line 136 confirmed
- Chat interface: Lines 20 (for constants), 374-381 confirmed

### No Discrepancies Found:
- All files are present at expected locations
- Line numbers match exactly with plan specifications
- Current code content matches expected patterns for fixes

## Ready Status: ✅ READY FOR IMPLEMENTATION

All files verified, line numbers confirmed exact matches, backup branch created.
Implementation can proceed according to the 9-fix plan.

## Next Phase: Code Implementation
- Execute all 9 fixes in single atomic commit
- Use exact line numbers as verified above
- Test each change before committing
- Create single commit with message: "fix: address CodeRabbit security review (9 items)"