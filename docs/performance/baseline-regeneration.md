# Performance Baseline Regeneration Guide

This guide explains how to regenerate performance baselines with realistic production characteristics instead of localhost references.

## Overview

The performance baselines were previously generated against localhost (`127.0.0.1:3000`) using HTTP/1.1, which doesn't reflect real-world production characteristics like:

- HTTPS/TLS overhead
- HTTP/2+ protocol features  
- CDN edge server behavior
- Production hosting infrastructure
- Realistic network latency and throughput

## Quick Update (Existing Baselines)

If you have existing baseline files and want to update the URLs without re-running Lighthouse:

```bash
# Update baselines to use your production URL
node scripts/update-baseline-urls.js --url https://your-app.vercel.app

# Or use the npm script
cd frontend && npm run performance:baseline:update -- --url https://your-app.vercel.app
```

This script will:
- Replace all `127.0.0.1:3000` references with your production URL
- Update protocol from `http/1.1` to `h2` for HTTPS URLs
- Change entity from `127.0.0.1` to your production domain
- Apply production-optimized timing characteristics

## Full Regeneration (Recommended)

For completely fresh baselines with real performance data:

```bash
# First, ensure your app is deployed to production
# Then regenerate baselines against the live site
node scripts/regenerate-performance-baselines.js --url https://your-app.vercel.app

# Or use the npm script
cd frontend && npm run performance:baseline:regenerate -- --url https://your-app.vercel.app
```

This script will:
1. Validate the target URL is accessible
2. Run Lighthouse against the production deployment
3. Transform the results to match your production environment
4. Save updated baseline files

## Configuration Examples

### Vercel Deployment
```bash
node scripts/update-baseline-urls.js --url https://vana-frontend.vercel.app
```

### Netlify Deployment  
```bash
node scripts/update-baseline-urls.js --url https://vana-frontend.netlify.app
```

### Custom Domain
```bash
node scripts/update-baseline-urls.js --url https://app.yourdomain.com
```

## Production Characteristics Applied

The updated baselines include realistic production settings:

### Network Protocol
- **HTTPS URLs**: Protocol set to `h2` (HTTP/2)
- **HTTP URLs**: Protocol remains `http/1.1` (not recommended)

### Timing Characteristics
- **RTT**: 40ms (typical CDN edge server latency)
- **Throughput**: 10,240 Kbps (high-speed connection)
- **CPU Throttling**: None (production server performance)

### Entity Configuration
- **Entity Name**: Your production domain
- **Origins**: HTTPS production URLs
- **First Party**: `true` (your domain)
- **Unrecognized**: `false` (known production entity)

## Verification

After updating baselines, verify the changes:

```bash
# Check for localhost references (should return no results)
grep -r "127.0.0.1" docs/performance/baselines/

# Check for HTTP/1.1 in production context (should be minimal)
grep -r '"protocol": "http/1.1"' docs/performance/baselines/

# Verify your production URL is present
grep -r "your-domain.com" docs/performance/baselines/
```

## Integration with CI/CD

Add to your deployment workflow:

```yaml
# .github/workflows/performance.yml
- name: Update Performance Baselines
  run: |
    node scripts/update-baseline-urls.js --url ${{ env.PRODUCTION_URL }}
    
- name: Run Performance Audit
  run: |
    cd frontend && npm run performance:audit:prod
```

## Scripts Reference

### `update-baseline-urls.js`
**Purpose**: Quick update of existing baselines  
**When to use**: You have baselines but need to change URLs  
**Speed**: Fast (no Lighthouse run)

### `regenerate-performance-baselines.js`  
**Purpose**: Complete baseline regeneration  
**When to use**: First time setup or major infrastructure changes  
**Speed**: Slower (runs Lighthouse)

## Troubleshooting

### Target URL Not Accessible
```
Error: Failed to access target URL: fetch failed
```
**Solution**: Ensure your deployment is live and publicly accessible

### Missing Lighthouse
```
Error: Cannot find module 'lighthouse'
```
**Solution**: Install lighthouse: `npm install -g lighthouse`

### Invalid HTTPS Certificate
```
Error: certificate verify failed
```
**Solution**: Check your SSL certificate configuration

## Before vs After

### Before (Localhost)
```json
{
  "url": "http://127.0.0.1:3000/",
  "protocol": "http/1.1", 
  "entity": "127.0.0.1"
}
```

### After (Production)  
```json
{
  "url": "https://your-app.vercel.app/",
  "protocol": "h2",
  "entity": "your-app.vercel.app"  
}
```

## Next Steps

1. **Deploy your application** to a production environment
2. **Update baselines** using the scripts provided  
3. **Run performance audits** against the new baselines
4. **Commit updated baselines** to your repository
5. **Configure CI/CD** to maintain up-to-date baselines

This ensures your performance monitoring reflects real-world user experience rather than idealized localhost conditions.