# Security Validation Documentation

## Overview

The security validation system provides context-aware input validation that minimizes false positives while maintaining robust protection against common attack vectors. The system uses field-type awareness, pattern specificity, and configurable rules to accurately identify malicious inputs.

## Key Features

### 1. Context-Aware Validation

The validator considers the context of each input:
- **Field Type**: Different validation rules apply to different types of fields
- **Content Type**: HTTP content-type headers influence validation
- **Field Names**: Automatic detection based on common naming patterns
- **Input Length**: Minimum length requirements prevent short phrases from triggering

### 2. Field Types

The system recognizes the following field types:

| Field Type | Description | Applied Rules |
|------------|-------------|---------------|
| `general` | General text input | Basic XSS and injection patterns |
| `code` | Code snippets, queries | SQL injection, command injection |
| `html` | HTML/markup content | XSS patterns, script tags |
| `email` | Email addresses | Email format validation |
| `url` | URLs | Path traversal, protocol validation |
| `filename` | File names/paths | Path traversal, absolute paths |
| `json` | JSON data | NoSQL injection patterns |
| `search` | Search queries | Relaxed validation, common phrases allowed |
| `comment` | User comments/feedback | Very relaxed validation |
| `username` | Usernames | LDAP injection patterns |
| `password` | Passwords | No pattern validation (skip all) |

### 3. Refined Pattern Matching

All patterns use:
- **Word boundaries** (`\b`) to avoid matching partial words
- **Specific contexts** (e.g., SQL patterns require SELECT after UNION)
- **Minimum length checks** to avoid flagging short phrases
- **Anchors and delimiters** for precise matching

## Configuration

### Basic Configuration

```typescript
import { configureSecurityValidator } from '@/lib/security-validator';

configureSecurityValidator({
  // Minimum entropy threshold (0-1)
  minEntropyThreshold: 0.6,
  
  // Maximum risk score (default: 100)
  maxRiskScore: 100,
  
  // Disable specific rules
  disabledRules: ['high_entropy'],
  
  // Enable only specific rules (overrides disabled)
  enabledRules: ['sql_injection_union', 'xss_script_tag'],
  
  // Custom field type mappings
  fieldTypeMapping: {
    'q': 'search',
    'query': 'search',
    'message': 'comment'
  }
});
```

### Custom Rules

Add application-specific validation rules:

```typescript
configureSecurityValidator({
  customRules: [{
    name: 'api_key_exposure',
    pattern: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/i,
    fieldTypes: ['general', 'comment'],
    minLength: 40,
    severity: 'high',
    description: 'Potential API key exposure'
  }]
});
```

## Usage Examples

### Basic Validation

```typescript
import { validateInput } from '@/lib/security-validator';

// Validate with auto-detected field type
const result = validateInput(userInput);

// Validate with specific field type
const result = validateInput(searchQuery, { 
  fieldType: 'search' 
});

// Validate with context
const result = validateInput(userComment, {
  fieldType: 'comment',
  minLength: 3,
  maxLength: 1000,
  normalize: true
});
```

### Skip Specific Patterns

```typescript
// Allow SQL keywords in search fields
const result = validateInput(searchQuery, {
  fieldType: 'search',
  skipPatterns: ['sql_injection_union', 'sql_injection_drop']
});
```

### Batch Validation

```typescript
import { validateBatch } from '@/lib/security-validator';

const inputs = {
  email: 'user@example.com',
  search: 'select best products',
  comment: 'Great product!'
};

const contexts = {
  email: { fieldType: 'email' },
  search: { fieldType: 'search' },
  comment: { fieldType: 'comment' }
};

const result = validateBatch(inputs, contexts);

if (result.highRiskFields.length > 0) {
  console.error('High risk fields:', result.highRiskFields);
}
```

## Validation Rules Reference

### SQL Injection Patterns

| Rule Name | Pattern | Field Types | Min Length |
|-----------|---------|--------------|------------|
| `sql_injection_union` | `UNION SELECT` with word boundaries | code, json | 15 |
| `sql_injection_drop` | `DROP TABLE/DATABASE` | code, json | 10 |
| `sql_injection_exec` | `EXEC(...)` patterns | code | 8 |
| `sql_injection_comment` | SQL comments with commands | code, json | 5 |

### XSS Patterns

| Rule Name | Pattern | Field Types | Notes |
|-----------|---------|--------------|-------|
| `xss_script_tag` | `<script>` tags | html | Full tag match required |
| `xss_event_handler` | `onclick=` etc. | html | In attributes only |
| `xss_javascript_protocol` | `javascript:` URLs | html, url | In href/src attributes |
| `xss_data_uri` | Dangerous data URIs | html, url | HTML/JS content types |

### Path Traversal Patterns

| Rule Name | Pattern | Field Types | Description |
|-----------|---------|--------------|-------------|
| `path_traversal_dots` | `../` or `..\` | filename, url | Directory traversal |
| `path_traversal_absolute` | System paths | filename | `/etc/`, `C:\` etc. |

### Command Injection Patterns

| Rule Name | Pattern | Field Types | Min Length |
|-----------|---------|--------------|------------|
| `command_injection_pipe` | Command piping | code | 5 |
| `command_injection_backtick` | Backtick substitution | code | - |
| `command_injection_dollar` | `$()` substitution | code | - |

## False Positive Prevention

### Common Legitimate Phrases Allowed

The system correctly handles:
- "Select items from menu" (not SQL injection)
- "Echo chamber" (not command injection)
- "Delete old messages" (not SQL injection)
- "Update your profile" (not SQL injection)
- "The price is < $50" (not XSS)

### Search Query Handling

Search fields have relaxed validation:
- SQL keywords allowed in natural language
- Special characters permitted
- Common search operators supported

### Context-Based Validation

- **Code fields**: Strict validation for actual code
- **Comment fields**: Very relaxed, natural language expected
- **Search fields**: Balanced approach
- **Password fields**: No pattern validation

## Risk Scoring

The system calculates risk scores:
- **High severity**: +40 points
- **Medium severity**: +20 points
- **Low severity**: +10 points

Risk levels:
- **0-40**: Low risk
- **41-80**: Medium risk
- **81-100**: High risk

## Input Normalization

Before validation, inputs are:
1. Trimmed of whitespace
2. Multiple spaces collapsed to single
3. HTML entities decoded
4. URL encoding decoded

## Entropy Detection

The system can detect:
- Base64 encoded data
- Hex encoded data
- Random/high-entropy strings

This helps identify:
- Encoded payloads
- Obfuscated attacks
- Binary data in text fields

## Middleware Integration

The middleware uses the validator as follows:

```typescript
// In middleware-working.ts
import securityValidator from '@/lib/security-validator';

function validateRequest(request: NextRequest) {
  // Validate URL path
  const pathValidation = securityValidator.validateInput(
    pathname, 
    { fieldType: 'url' }
  );
  
  // Validate query parameters with context
  for (const [key, value] of searchParams.entries()) {
    const fieldType = detectFieldTypeFromParam(key);
    const result = securityValidator.validateInput(value, {
      fieldType,
      fieldName: key,
      skipPatterns: getSkipPatternsForField(fieldType)
    });
  }
}
```

## Testing

Run the comprehensive test suite:

```bash
npm test security-validator.test.ts
```

The test suite includes:
- False positive prevention tests
- Legitimate input validation
- Edge case handling
- Configuration testing
- Real-world use cases

## Best Practices

1. **Always specify field type** when known
2. **Use skipPatterns** for known safe contexts
3. **Configure minimum lengths** to avoid short phrase matches
4. **Normalize inputs** for consistent validation
5. **Monitor risk scores** rather than just blocking
6. **Test with real user data** to identify false positives
7. **Document custom rules** for team understanding

## Migration from Old Patterns

### Before (Overly Broad)
```typescript
const SECURITY_PATTERNS = {
  sqlInjection: /(union|select|insert|update|delete)/i,
  xss: /<script|javascript:|on\w+=/i
};
```

### After (Context-Aware)
```typescript
const result = validateInput(input, {
  fieldType: detectFieldType(input, fieldName),
  minLength: 10,
  skipPatterns: fieldType === 'search' ? ['sql_injection_union'] : []
});
```

## Performance Considerations

- Pattern matching is optimized with early returns
- Field type detection uses simple heuristics
- Normalization is cached per request
- Batch validation processes in parallel

## Security Notes

- This validator is one layer of defense
- Always use parameterized queries for SQL
- Implement CSP headers for XSS protection
- Use proper encoding for output
- Validate on both client and server
- Log security incidents for monitoring