# Debug Tools

This directory contains ad-hoc debug and test scripts that are not part of the main CI/CD pipeline. These are utility scripts used for manual testing, debugging, and development exploration.

## Purpose

These scripts were created during development to:
- Test specific edge function flows
- Debug mobile UI components
- Verify responsive design behavior
- Inspect backend integration points
- Analyze DOM rendering

## Usage

These scripts are **not** meant to be run as part of automated testing. They are development utilities for manual debugging sessions.

## Organization

- `test-backend-flow.js` - Tests backend API flow and integration
- `test-edge-function-logs.js` - Debug edge function logging behavior
- `test-image-regeneration.js` - Tests image generation retry logic
- `test-mobile-*.js` - Mobile UI component debugging scripts
- `test-final-mobile-menu.js` - Final mobile menu implementation test
- `test-simple-mobile-menu.js` - Simple mobile menu test
- `check-actual-rendering.js` - DOM rendering verification
- `check-responsive-badges.js` - Responsive badge behavior check
- `verify-badge-placement.js` - Badge placement verification
- `test-artifacts/` - Directory containing test artifact files

## Note

These scripts may have dependencies on specific local development setups and might not work in all environments. They are preserved for reference and future debugging needs.
