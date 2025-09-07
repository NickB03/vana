# BrightData MCP Server Troubleshooting Guide

## Overview

This comprehensive guide documents common issues with BrightData's MCP (Model Context Protocol) server and provides detailed solutions based on research findings and analysis of configuration files.

## Common Issues and Solutions

### 1. API Token Authentication Issues

#### Problem: Invalid or Expired API Token
**Symptoms:**
- Authentication errors when making requests
- 401 Unauthorized responses
- MCP server connection failures

**Root Causes:**
- API token not properly configured
- Token expired or revoked
- Incorrect token permissions
- Missing environment variables

**Solutions:**

1. **Generate New API Token:**
   - Visit Bright Data dashboard → Settings → API Tokens
   - Create new token with appropriate permissions
   - Note: Once created, you cannot view the token again

2. **Configure Token Correctly:**
   ```json
   {
     "mcpServers": {
       "brightdata": {
         "command": "npx",
         "args": ["@brightdata/mcp"],
         "env": {
           "API_TOKEN": "<your-actual-api-token-here>",
           "BRIGHTDATA_API_KEY": "<your-api-token>"
         }
       }
     }
   }
   ```

3. **Token Permission Types:**
   - **Admin**: Full access (recommended for MCP)
   - **Finance**: Billing only
   - **Ops**: Zone/product configurations
   - **Limit**: Zone passwords and IP allowlists
   - **User**: API usage only

4. **Troubleshooting Steps:**
   - Verify token exists in environment variables
   - Check token hasn't expired (configurable expiration)
   - Ensure correct token format (no extra characters/spaces)

### 2. Rate Limiting Issues (5000 Requests/Month)

#### Problem: Free Tier Rate Limits
**Symptoms:**
- 429 Too Many Requests errors
- Requests failing after initial success
- Empty responses during high usage periods

**Free Tier Details:**
- **Limit**: 5,000 requests per month
- **Duration**: First 3 months free
- **Coverage**: Rapid mode (search results + scrape as Markdown)
- **Upgrade**: Credit card required after 3 months

**Solutions:**

1. **Monitor Usage:**
   ```bash
   # Check current usage in dashboard
   # Implement request counting in your application
   ```

2. **Optimize Request Patterns:**
   - Cache responses when possible
   - Batch multiple operations
   - Use targeted scraping vs broad searches
   - Implement exponential backoff for retries

3. **Configure Rate Limiting:**
   ```json
   {
     "env": {
       "RATE_LIMIT": "50",
       "PRO_MODE": "true"
     }
   }
   ```

4. **Upgrade Options:**
   - Pro mode for additional features
   - Pay-as-you-go after free tier
   - Additional tools (browser control, structured JSON)

### 3. Empty Response Problems

#### Problem: Receiving Empty or No Content
**Symptoms:**
- Empty response bodies
- Missing scraped content
- Partial data extraction

**Common Causes:**

1. **Dynamic Content Loading:**
   - JavaScript-rendered content
   - AJAX-loaded data
   - Single Page Applications (SPAs)

2. **Anti-Scraping Measures:**
   - Bot detection systems
   - CAPTCHA challenges
   - IP-based blocking

3. **Server-Side Issues:**
   - 500 Internal Server Error
   - 504 Gateway Timeout (>120 seconds)
   - Target website downtime

**Solutions:**

1. **Use Browser API for Dynamic Content:**
   ```json
   {
     "env": {
       "BROWSER_ZONE": "your-browser-zone-name"
     }
   }
   ```

2. **Implement Proper Error Handling:**
   - Check response status codes
   - Verify content-length headers
   - Implement retry logic with delays

3. **Debugging Tools:**
   - Use Chrome DevTools for target analysis
   - Monitor network requests
   - Check for JavaScript requirements

4. **Configuration Optimization:**
   - Increase timeout values
   - Use appropriate selectors
   - Enable JavaScript rendering

### 4. WEB_UNLOCKER_ZONE Configuration

#### Problem: Zone Configuration Issues
**Symptoms:**
- Default zone limitations
- Geographic restrictions
- Insufficient unlocking capabilities

**Configuration Requirements:**

1. **Default Setup:**
   ```json
   {
     "env": {
       "WEB_UNLOCKER_ZONE": "mcp_unlocker",
       "API_TOKEN": "<your-token>"
     }
   }
   ```

2. **Custom Zone Creation:**
   - Navigate to "My Proxies" in dashboard
   - Select "Web Unlocker"
   - Configure proxy name and password
   - Whitelist specific domains (optional)

3. **Zone Features:**
   - Automatic browser fingerprinting bypass
   - CAPTCHA solving
   - IP rotation
   - Retry logic (near 100% success rate)

**Breaking Changes:**
- `BROWSER_AUTH` replaced with `BROWSER_ZONE`
- Only zone name specification required

### 5. Region and IP Requirements

#### Problem: Geographic Limitations
**Symptoms:**
- Geo-restricted content access
- Regional blocking
- IP-based restrictions

**Capabilities:**
- **Global Network**: 195 countries supported
- **Geo-bypassing**: Automatic geo-restriction bypassing
- **IP Rotation**: Global IP network for avoiding blocks

**Solutions:**

1. **Country Targeting:**
   - Create custom zones in Control Panel
   - Configure geolocation targeting
   - Specify custom zone in MCP config

2. **Advanced Targeting:**
   - ASN/ZIP level targeting
   - Region-specific proxy selection
   - Automatic User-Agent rotation

3. **MCP Configuration:**
   ```json
   {
     "env": {
       "WEB_UNLOCKER_ZONE": "custom-geo-zone",
       "BRIGHTDATA_ZONE": "datacenter_proxy1"
     }
   }
   ```

## Configuration Analysis

### Current Project Configuration

Based on analysis of `/Users/nick/Development/vana/config/mcp-config.json`:

**Issues Identified:**
1. **Inconsistent Environment Variable:** Using `BRAVE_API_KEY` instead of standard `API_TOKEN`
2. **Proxy Configuration:** Manual proxy endpoint specification
3. **Zone Naming:** Using custom zone name `datacenter_proxy1`

**Recommended Fixes:**
```json
{
  "brightdata": {
    "command": "npx",
    "args": ["@brightdata/mcp"],
    "env": {
      "API_TOKEN": "${BRIGHTDATA_API_TOKEN}",
      "WEB_UNLOCKER_ZONE": "mcp_unlocker",
      "RATE_LIMIT": "50",
      "PRO_MODE": "true"
    },
    "enabled": true,
    "timeout": 45000,
    "retries": 5
  }
}
```

## Best Practices

### 1. Error Handling
```javascript
// Implement comprehensive error handling
try {
  const response = await brightDataScrape(url);
  if (!response || !response.content) {
    throw new Error('Empty response received');
  }
  return response;
} catch (error) {
  if (error.status === 429) {
    // Rate limit hit - implement backoff
    await delay(exponentialBackoff);
    return retry();
  }
  throw error;
}
```

### 2. Request Optimization
- Cache frequently accessed content
- Use specific CSS selectors
- Minimize concurrent requests
- Implement request queuing

### 3. Monitoring and Logging
- Track API usage against limits
- Log response times and success rates
- Monitor for pattern changes in target sites
- Set up alerts for quota approaching

### 4. Security Considerations
- Store API tokens securely
- Use environment variables
- Regularly rotate tokens
- Monitor for unauthorized usage

## Environment Variables Reference

```bash
# Required
API_TOKEN=your_brightdata_api_token

# Optional Web Unlocker
WEB_UNLOCKER_ZONE=your_custom_zone

# Optional Browser API
BROWSER_ZONE=your_browser_zone

# Performance Tuning
RATE_LIMIT=50
PRO_MODE=true

# Legacy (deprecated)
BROWSER_AUTH=replaced_by_BROWSER_ZONE
```

## Support Resources

- **Documentation**: [BrightData MCP Docs](https://docs.brightdata.com/api-reference/mcp-faqs)
- **GitHub**: [brightdata/brightdata-mcp](https://github.com/brightdata/brightdata-mcp)
- **Support**: BrightData dashboard support tickets
- **Community**: Join BrightData Slack/Discord channels

## Conclusion

Most BrightData MCP issues stem from:
1. Incorrect API token configuration
2. Free tier rate limiting
3. Inadequate handling of dynamic content
4. Improper zone configuration
5. Geographic/IP restrictions

By following this guide and implementing the recommended solutions, most common issues can be resolved. Regular monitoring and proper error handling are key to maintaining reliable BrightData MCP integration.