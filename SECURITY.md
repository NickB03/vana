# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported |
|---------|-----------|
| main branch (latest) | Yes |
| Previous releases | No |

We recommend always using the latest version from the `main` branch for the most up-to-date security patches.

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Option 1: GitHub Security Advisory (Preferred)**

1. Go to the repository's Security tab
2. Click "Report a vulnerability"
3. Fill out the advisory form with details

**Option 2: Email**

Contact the maintainers directly through GitHub with a private message.

### What to Include

Please provide as much of the following information as possible:

- Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
- Location of the affected code (file path, line numbers if known)
- Step-by-step instructions to reproduce the issue
- Proof of concept code (if applicable)
- Potential impact assessment
- Any suggested fixes or mitigations

### Response Timeline

| Phase | Timeline |
|-------|----------|
| Initial acknowledgment | Within 48 hours |
| Status update | Within 7 days |
| Fix timeline determination | Within 14 days |
| Public disclosure | After fix is deployed (coordinated with reporter) |

We appreciate your patience as we work to address security issues thoroughly.

## Security Features Currently Implemented

### Database Security

- **Row Level Security (RLS)**: All database tables have RLS policies enabled
- **SECURITY DEFINER functions**: All use `SET search_path = public, pg_temp` to prevent schema injection
- **JWT Authentication**: Supabase-managed authentication for all protected endpoints

### Rate Limiting

| User Type | Limit | Window |
|-----------|-------|--------|
| Guest users | 20 requests | 5 hours |
| Authenticated users | 100 requests | 5 hours |
| Artifact generation (guest) | 5 requests | 5 hours |
| Artifact generation (auth) | 50 requests | 5 hours |

- Per-tool rate limiting via `user_tool_rate_limits` table
- Fail-closed circuit breaker design
- Graceful degradation on limit exceed

### API Security

- **CORS Whitelist**: Strict origin checking, no wildcard `*` in production
- **Input Validation**: Zod schemas for all API inputs
- **Request Sanitization**: Unicode normalization and pattern filtering

### Prompt Injection Defense (5-Layer Validation)

1. **System Prompt Prevention**: AI receives warnings during generation
2. **Template Examples**: All templates use safe patterns
3. **Pre-Generation Validation**: `artifact-validator.ts` scans for attack patterns
4. **Post-Generation Transformation**: Auto-fixes potentially dangerous patterns
5. **Runtime Validation**: Blocks artifacts with critical errors

Additional defenses:
- Unicode normalization
- SQL pattern detection
- HTML injection pattern detection
- Sandboxed validation for suspicious prompts

### XSS Protection

- **DOMPurify**: HTML sanitization for user-generated content
- **Zod Schemas**: Server-side input validation
- **14 attack scenarios tested**: Comprehensive XSS test coverage

### Tool Security Infrastructure

- **Tool Validator**: Zod schemas, prototype pollution protection, parameter sanitization
- **Execution Tracker**: Resource exhaustion protection (max 3 tools per request)
- **Safe Error Handler**: Error sanitization, no stack traces in production, PII filtering

## Known Limitations

### Monitoring Gaps

The following monitoring capabilities are NOT currently implemented for Edge Functions:

| Issue | Description |
|-------|-------------|
| [#380](https://github.com/NickB03/llm-chat-site/issues/380) | Sentry not integrated with Edge Functions |
| [#381](https://github.com/NickB03/llm-chat-site/issues/381) | ReasoningProvider errors not tracked |
| [#382](https://github.com/NickB03/llm-chat-site/issues/382) | Prompt injection detection not logged to Sentry |

**Current state**: Edge Functions only log to console. Frontend has full Sentry integration.

### Rate Limit Considerations

- Rate limits are based on identifier hashing for guests
- Sophisticated users may potentially circumvent guest rate limits
- Consider authenticated access for production use cases requiring higher limits

## Security Best Practices for Contributors

When contributing to this project, please ensure:

1. **Never commit secrets**: No API keys, passwords, or tokens in code
2. **Use environment variables**: All secrets should be in `.env` files (never committed)
3. **Validate all inputs**: Use Zod schemas for any user-provided data
4. **Follow CORS patterns**: Use `getCorsHeaders()` from `_shared/cors-config.ts`
5. **Use parameterized queries**: Never interpolate user input into SQL
6. **Review artifact code**: Artifacts run in sandboxed iframes but still require validation

## Security Updates

Security-related updates are announced through:

- GitHub Security Advisories
- Release notes for security patches
- Commit messages with `security:` prefix for minor fixes

Thank you for helping keep Vana secure!
