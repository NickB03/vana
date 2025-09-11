# AuthGuard Redirect Loop Prevention - Testing Guide

## Overview

This guide documents the comprehensive test suite created to validate the AuthGuard redirect loop fixes. The tests ensure that authentication state stabilization, redirect loop prevention, memoized function dependencies, and edge case handling all work correctly.

## Test Files Created

### 1. `auth-guard-redirect-loop-prevention.test.tsx`
**Purpose**: Core functionality testing for AuthGuard redirect loop prevention

**Key Test Categories**:
- Authentication State Stabilization
- Redirect Loop Prevention
- Redirect Target Validation
- Memoized Function Dependencies
- Edge Cases
- Regression Prevention
- Performance and Memory

**Critical Tests**:
- ✅ Wait for stable auth state before redirect decisions
- ✅ Redirect once auth state stabilizes as unauthenticated
- ✅ Prevent rapid state transitions from causing multiple redirects
- ✅ Prevent redirect loops using history tracking
- ✅ Track redirect history with timestamps
- ✅ Validate redirect targets before redirecting
- ✅ Maintain stable references for memoized functions
- ✅ Handle rapid authentication state changes
- ✅ Handle permission changes during stable state
- ✅ Handle multiple protected routes correctly
- ✅ Maintain backward compatibility with existing props

### 2. `use-auth-stabilization.test.ts`
**Purpose**: Hook-level testing for auth stabilization functionality

**Key Test Categories**:
- Debounced State Stabilization
- Redirect Loop Prevention
- Safe Redirect Conditions
- History Management
- Edge Cases and Cross-Tab Simulation
- Memory Management and Cleanup

**Critical Tests**:
- ✅ Debounce rapid auth state changes
- ✅ Reset debounce timer on each state change
- ✅ Handle initial stabilization on mount
- ✅ Detect redirect loops within time window
- ✅ Allow redirects after time window expires
- ✅ Limit redirect history size
- ✅ Cleanup old entries automatically
- ✅ Only allow safe redirects when stable
- ✅ Handle rapid authentication changes from external sources
- ✅ Cleanup timers on unmount

### 3. `auth-guard-integration-scenarios.test.tsx`
**Purpose**: Real-world integration scenario testing

**Key Test Categories**:
- Cross-Tab Authentication Synchronization
- Network Interruption Recovery
- Session Timeout Handling
- Multi-Step Authentication Flows
- Permission Changes During Active Sessions
- Performance Under Load

**Critical Tests**:
- ✅ Handle login in another tab
- ✅ Handle logout in another tab
- ✅ Handle network interruption during auth check
- ✅ Handle intermittent connectivity
- ✅ Handle gradual session expiration
- ✅ Handle 2FA authentication flow
- ✅ Handle role changes during active session
- ✅ Handle permission revocation during active session
- ✅ Handle many rapid state changes efficiently

## Running the Tests

### Method 1: Use the Comprehensive Test Runner
```bash
# Navigate to the project root
cd /Users/nick/Development/vana

# Run the comprehensive test suite
./tests/run-auth-tests.js
```

### Method 2: Run Individual Test Files
```bash
# Navigate to frontend directory
cd /Users/nick/Development/vana/frontend

# Run specific test files
npm test tests/auth-guard-redirect-loop-prevention.test.tsx
npm test tests/use-auth-stabilization.test.ts
npm test tests/auth-guard-integration-scenarios.test.tsx

# Run existing auth tests (regression check)
npm test __tests__/auth/auth-guard-integration.test.tsx
```

### Method 3: Run All Auth Tests
```bash
cd /Users/nick/Development/vana/frontend
npm test -- --testPathPattern="auth" --verbose
```

## Test Results Interpretation

### Success Criteria
All tests must pass for the redirect loop fixes to be considered validated:

1. **Authentication State Stabilization**: ✅
   - Auth state waits for stabilization before redirect decisions
   - Rapid state changes don't cause multiple redirects
   - Loading states are handled properly

2. **Redirect Loop Prevention**: ✅
   - History tracking prevents redirect loops
   - Time-based loop detection works correctly
   - Safe redirect validation functions properly

3. **Memoized Function Dependencies**: ✅
   - Callbacks are properly memoized to prevent infinite re-renders
   - Function references remain stable across renders
   - Performance remains acceptable under load

4. **Debounced Storage Handlers**: ✅
   - State changes are debounced to prevent oscillation
   - Timer cleanup prevents memory leaks
   - Cross-tab changes are handled gracefully

5. **Redirect Target Validation**: ✅
   - Invalid redirect targets are rejected
   - Path validation prevents security issues
   - Current path loops are prevented

6. **Edge Case Handling**: ✅
   - Cross-tab authentication sync works
   - Network interruption recovery works
   - Rapid auth state changes are handled
   - Multiple protected routes work correctly

7. **Regression Prevention**: ✅
   - Existing functionality remains intact
   - Backward compatibility is maintained
   - All legacy props continue to work

## Performance Benchmarks

The tests validate performance criteria:
- Render time under load: < 1000ms for 50 rapid state changes
- Memory usage: No memory leaks on repeated mount/unmount
- Permission checks: < 100ms for large role/permission sets

## Test Coverage Areas

### Authentication Flows
- [ ] Initial page load authentication
- [ ] Login/logout state transitions
- [ ] Token refresh scenarios
- [ ] Session timeout handling
- [ ] 2FA authentication flows

### Cross-Tab Synchronization
- [ ] Login in another tab
- [ ] Logout in another tab
- [ ] Permission changes from other tabs
- [ ] Session sync across multiple tabs

### Network Scenarios
- [ ] Network interruption during auth
- [ ] Intermittent connectivity
- [ ] API timeout handling
- [ ] Auth service unavailability

### Permission Management
- [ ] Role-based access control
- [ ] Permission-based access control
- [ ] Dynamic permission changes
- [ ] Custom permission logic

### Edge Cases
- [ ] Rapid state oscillation
- [ ] Component mount/unmount cycles
- [ ] Multiple AuthGuard instances
- [ ] Deep component hierarchies

## Common Issues and Solutions

### Test Failures

**Issue**: Tests timeout or hang
**Solution**: Check timer mocking with `jest.useFakeTimers()` and `jest.advanceTimersByTime()`

**Issue**: AuthGuard doesn't redirect
**Solution**: Verify stabilization state is properly mocked in test setup

**Issue**: Infinite re-render detection
**Solution**: Ensure memoized functions are properly tested with stable references

**Issue**: Cross-tab tests fail
**Solution**: Simulate localStorage events and auth context changes correctly

### Mock Setup Issues

**Issue**: Auth context not properly mocked
**Solution**: Use `jest.mock('@/contexts/auth-context')` at module level

**Issue**: Navigation mocks not working
**Solution**: Mock both `useRouter` and `usePathname` from `next/navigation`

**Issue**: Timer-based tests flaky
**Solution**: Use `act()` wrapper around timer advances and state changes

## Integration with CI/CD

The test runner creates a JSON report at `/Users/nick/Development/vana/tests/auth-test-results.json` that can be used in CI/CD pipelines:

```json
{
  "timestamp": "2025-09-11T18:00:00.000Z",
  "summary": {
    "total": 4,
    "executed": 4,
    "passed": 4,
    "failed": 0,
    "skipped": 0,
    "successRate": 100.0,
    "totalDuration": 1250
  },
  "validationChecks": [...],
  "details": [...]
}
```

## Future Enhancements

### Additional Test Scenarios
- [ ] WebSocket connection auth
- [ ] OAuth provider integration
- [ ] Mobile app authentication
- [ ] Server-side rendering scenarios

### Performance Testing
- [ ] Load testing with many concurrent users
- [ ] Memory leak detection over extended periods
- [ ] Bundle size impact analysis

### Security Testing
- [ ] XSS prevention validation
- [ ] CSRF protection testing
- [ ] Token security verification

## Troubleshooting

### Common Mock Issues
1. Ensure all async operations use `waitFor()` or `act()`
2. Mock all external dependencies at module level
3. Use fake timers consistently throughout tests
4. Clear all mocks between tests

### Performance Issues
1. Use `performance.now()` for timing measurements
2. Limit test complexity for performance tests
3. Use `jest.advanceTimersByTime()` instead of real delays

### Integration Issues
1. Test with actual component hierarchy when possible
2. Use realistic user data structures
3. Simulate real browser behaviors (storage events, etc.)

---

This comprehensive test suite ensures the AuthGuard redirect loop fixes are thoroughly validated and will continue to work correctly as the codebase evolves.