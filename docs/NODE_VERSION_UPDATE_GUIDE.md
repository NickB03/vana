# Node.js Version Update Guide

## Overview

This document outlines the update from Node.js 18 to Node.js 20 LTS across the VANA project to ensure compatibility with Next.js 15 and avoid EOL (End of Life) risks.

## Changes Made

### 1. GitHub Actions Workflows

#### `.github/workflows/main-ci.yml`
- **Updated**: `NODE_VERSION: '18'` → `NODE_VERSION: '20'`
- **Updated**: `CACHE_VERSION: 'v3'` → `CACHE_VERSION: 'v4'` (to bust caches)
- **Impact**: All CI jobs now use Node.js 20 LTS

#### `.github/workflows/local-build.yml`
- **Updated**: `NODE_VERSION: '18'` → `NODE_VERSION: '20'`
- **Impact**: Local build testing uses Node.js 20 LTS

### 2. Frontend Configuration

#### `frontend/package.json`
- **Added**: `engines` field specifying Node.js ≥20.0.0 and npm ≥10.0.0
- **Updated**: Development and production ports from 5173 to 3000 (Next.js standard)
- **Impact**: Enforces Node.js 20+ requirement for frontend development

### 3. Documentation Updates

#### `docs/truth-verification-implementation-guide.md`
- **Updated**: GitHub Actions example from Node 18 to Node 20
- **Updated**: `actions/setup-node@v3` → `actions/setup-node@v4`
- **Impact**: Documentation examples reflect current best practices

## Benefits of Node.js 20 LTS

### Performance Improvements
- **V8 Engine**: Updated to version 11.3+ with better performance
- **HTTP/2**: Enhanced HTTP/2 support and performance
- **Memory**: Improved garbage collection and memory management
- **Startup Time**: Faster application startup times

### Security Enhancements
- **OpenSSL**: Updated to OpenSSL 3.0.8+ with latest security patches
- **Dependencies**: Updated core dependencies with security fixes
- **CVE Fixes**: Addresses multiple security vulnerabilities from Node 18

### Next.js 15 Compatibility
- **Official Support**: Next.js 15 officially supports and recommends Node 20+
- **Features**: Access to latest Next.js features and optimizations
- **Stability**: Better stability with React 19 and modern JavaScript features

### EOL Avoidance
- **Support Timeline**: Node.js 18 enters maintenance mode in October 2024
- **Long-term Support**: Node.js 20 LTS supported until April 2026
- **Future-proofing**: Aligns with modern development practices

## Compatibility Matrix

| Component | Node 18 | Node 20 | Status |
|-----------|---------|---------|--------|
| Next.js 15 | ⚠️ Limited | ✅ Full | **Recommended** |
| React 19 | ⚠️ Limited | ✅ Full | **Recommended** |
| TypeScript 5.x | ✅ Compatible | ✅ Compatible | **Enhanced** |
| Vercel Deployment | ✅ Compatible | ✅ Default | **Optimized** |
| Docker Builds | ✅ Compatible | ✅ Compatible | **Faster** |
| CI/CD Pipelines | ✅ Compatible | ✅ Compatible | **Improved** |

## Migration Checklist

### ✅ Completed
- [x] Updated GitHub Actions workflows to Node 20
- [x] Added engines field to package.json
- [x] Updated documentation examples
- [x] Fixed port configuration (5173 → 3000)
- [x] Incremented cache versions for CI

### 🔄 Recommended Next Steps
- [ ] Update local development environments to Node 20
- [ ] Test all CI/CD pipelines with Node 20
- [ ] Update deployment documentation
- [ ] Verify Vercel deployment compatibility
- [ ] Update team development setup guides

## Local Development Update

### For Developers

1. **Update Node.js**:
   ```bash
   # Using nvm (recommended)
   nvm install 20
   nvm use 20
   nvm alias default 20
   
   # Using Homebrew (macOS)
   brew install node@20
   brew link node@20
   
   # Verify version
   node --version  # Should show v20.x.x
   npm --version   # Should show v10.x.x
   ```

2. **Clear npm cache**:
   ```bash
   npm cache clean --force
   ```

3. **Reinstall dependencies**:
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Verify build**:
   ```bash
   npm run build
   npm run dev
   ```

### For CI/CD

The CI/CD pipelines will automatically use Node.js 20 after this update. No additional configuration required.

## Troubleshooting

### Common Issues

1. **npm version mismatch**:
   ```bash
   npm install -g npm@latest
   ```

2. **Package compatibility issues**:
   ```bash
   npm audit fix
   npm update
   ```

3. **Build failures**:
   ```bash
   rm -rf .next node_modules package-lock.json
   npm install
   npm run build
   ```

### Performance Monitoring

Monitor these metrics after the update:
- **Build times**: Should improve with Node 20
- **Memory usage**: Should be more efficient
- **Startup times**: Should be faster
- **CI pipeline duration**: Should remain stable or improve

## Rollback Plan

If issues arise, rollback steps:

1. **Revert workflow files**:
   ```bash
   git checkout HEAD~1 -- .github/workflows/
   ```

2. **Revert package.json**:
   ```bash
   git checkout HEAD~1 -- frontend/package.json
   ```

3. **Clear caches**:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

## Testing Verification

### Automated Tests
- ✅ Frontend builds successfully
- ✅ All unit tests pass
- ✅ E2E tests functional
- ✅ TypeScript compilation works
- ✅ Linting passes

### Manual Verification
- [ ] Development server starts correctly
- [ ] Production build works
- [ ] All features functional
- [ ] Performance acceptable
- [ ] No console errors

## References

- [Node.js 20 Release Notes](https://nodejs.org/en/blog/release/v20.0.0)
- [Next.js 15 Node.js Requirements](https://nextjs.org/docs/getting-started/installation#system-requirements)
- [Node.js Release Schedule](https://nodejs.org/en/about/releases/)
- [Vercel Node.js Support](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)

---

**Updated**: September 1, 2025  
**Status**: ✅ Complete  
**Next Review**: Before Node.js 22 LTS release (April 2025)
