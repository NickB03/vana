# Google ADK Integration Documentation

This directory contains documentation specific to Google Agent Development Kit (ADK) integration patterns and best practices for the Vana project.

## Quick Links

- **[ADK Event Extraction Guide](./ADK-Event-Extraction-Guide.md)** ⚠️ **START HERE**
  - **CRITICAL**: How to properly extract content from ADK events
  - Common bugs and how to avoid them
  - Required for anyone working with ADK event processing

- **[ADK API Reference](../adk-api-reference.md)**
  - Complete API endpoint documentation
  - Event structure definitions
  - Integration patterns

## Why This Documentation Matters

**The #1 recurring bug in ADK integration**: Only extracting from `text` parts and missing `functionResponse` parts, causing research plans and agent tool outputs to disappear.

If you're working on ADK event processing, read the [Event Extraction Guide](./ADK-Event-Extraction-Guide.md) first.

## Quick Reference

### Correct ADK Content Extraction Pattern

```python
# ✅ CORRECT - Extracts from BOTH text and functionResponse
for part in content.get("parts", []):
    # Extract text parts
    text = part.get("text")
    if text:
        accumulated_content.append(text)

    # Extract functionResponse parts (CRITICAL!)
    function_response = part.get("functionResponse")
    if function_response and isinstance(function_response, dict):
        result = function_response.get("response", {}).get("result")
        if result:
            accumulated_content.append(result)
```

## Common Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Research plans not showing | "Does this research plan look good?" appears without the actual plan | Extract from `functionResponse` parts - see [guide](./ADK-Event-Extraction-Guide.md#the-1-mistake) |
| Agent tool outputs missing | Tool calls succeed but results don't display | Check `functionResponse` extraction |
| Incomplete event processing | Some events work, others don't | Ensure all part types are handled |

## Development Checklist

When working with ADK events:

- [ ] Read the [Event Extraction Guide](./ADK-Event-Extraction-Guide.md)
- [ ] Extract from **both** `text` and `functionResponse` parts
- [ ] Use defensive `.get()` calls for nested structures
- [ ] Add logging for extracted content
- [ ] Test with real ADK responses (especially `plan_generator`)
- [ ] Add regression tests for content extraction

## Related Documentation

- [SSE Implementation Guide](../sse/SSE-Implementation-Guide.md) - SSE streaming patterns
- [SSE Quick Reference](../frontend/sse-quick-reference.md) - Frontend SSE integration
- [Main API Documentation](../API.md) - General API reference

## External Resources

- [ADK Official Docs](https://googlecloudplatform.github.io/agent-starter-pack/)
- [ADK Samples](https://github.com/google/adk-samples)
- [ADK GitHub](https://github.com/googlecloudplatform/agent-starter-pack)
