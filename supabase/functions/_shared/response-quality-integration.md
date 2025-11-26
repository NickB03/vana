# Response Quality Validation Integration Guide

## Overview

The response quality validation system provides pattern-based quality checks for AI responses without requiring external API calls. This guide shows how to integrate it into Edge Functions.

## Basic Usage

### In Chat Function

```typescript
import { validateResponse, type Message } from '../_shared/response-quality.ts';

// After receiving AI response but before streaming to user
const qualityCheck = validateResponse(
  aiResponse,
  userQuery,
  conversationHistory
);

// Log quality metrics
console.log('Quality metrics:', qualityCheck.metrics);
console.log('Issues found:', qualityCheck.issues);

// Handle based on recommendation
switch (qualityCheck.recommendation) {
  case 'serve':
    // High quality - stream response to user
    await streamResponse(aiResponse);
    break;

  case 'warn':
    // Medium quality - serve but log for monitoring
    console.warn('Response quality below optimal:', {
      overall: qualityCheck.metrics.overall,
      issues: qualityCheck.issues.map(i => i.description)
    });
    await streamResponse(aiResponse);
    break;

  case 'regenerate':
    // Low quality - regenerate with different parameters
    console.error('Response quality too low, regenerating:', {
      overall: qualityCheck.metrics.overall,
      issues: qualityCheck.issues
    });
    // Retry with temperature adjustment or different model
    const retryResponse = await generateResponse(userQuery, {
      temperature: 0.7,
      maxRetries: 1
    });
    await streamResponse(retryResponse);
    break;
}
```

### Logging Quality Metrics to Database

```typescript
// After validation, log metrics for analytics
await supabase.from('response_quality_logs').insert({
  session_id: sessionId,
  message_id: messageId,
  factuality_score: qualityCheck.metrics.factuality,
  consistency_score: qualityCheck.metrics.consistency,
  relevance_score: qualityCheck.metrics.relevance,
  completeness_score: qualityCheck.metrics.completeness,
  safety_score: qualityCheck.metrics.safety,
  overall_score: qualityCheck.metrics.overall,
  recommendation: qualityCheck.recommendation,
  issues: qualityCheck.issues,
  created_at: new Date().toISOString()
});
```

## Integration Points

### 1. Chat Function (`supabase/functions/chat/index.ts`)

```typescript
import { validateResponse } from '../_shared/response-quality.ts';

// After AI generates response
const response = await openRouterClient.chat({
  model: MODELS.GEMINI_FLASH,
  messages: conversationHistory,
});

// Validate before streaming
const qualityCheck = validateResponse(
  response.content,
  lastUserMessage.content,
  conversationHistory
);

// Add quality metadata to response headers
const headers = {
  ...corsHeaders,
  'X-Quality-Score': qualityCheck.metrics.overall.toFixed(2),
  'X-Quality-Recommendation': qualityCheck.recommendation,
};

if (qualityCheck.recommendation === 'regenerate') {
  // Implement retry logic
  console.log('Regenerating due to low quality...');
}
```

### 2. Generate Artifact Function

```typescript
import { validateResponse } from '../_shared/response-quality.ts';

// After artifact generation
const qualityCheck = validateResponse(
  generatedArtifact,
  userPrompt,
  [] // Artifacts don't have conversation history
);

// Check if artifact code is complete
if (qualityCheck.metrics.completeness < 0.6) {
  console.warn('Generated artifact may be incomplete');
  // Consider adding completion prompt
}
```

### 3. Summarize Conversation Function

```typescript
import { validateResponse } from '../_shared/response-quality.ts';

// After summary generation
const qualityCheck = validateResponse(
  summary,
  'Summarize the conversation', // Generic query
  conversationHistory
);

// Ensure summary is consistent with conversation
if (qualityCheck.metrics.consistency < 0.7) {
  console.error('Summary inconsistent with conversation');
  // Regenerate with stricter prompt
}
```

## Database Schema Addition

Add quality logging table:

```sql
CREATE TABLE IF NOT EXISTS response_quality_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  factuality_score NUMERIC(3,2) NOT NULL CHECK (factuality_score >= 0 AND factuality_score <= 1),
  consistency_score NUMERIC(3,2) NOT NULL CHECK (consistency_score >= 0 AND consistency_score <= 1),
  relevance_score NUMERIC(3,2) NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
  completeness_score NUMERIC(3,2) NOT NULL CHECK (completeness_score >= 0 AND completeness_score <= 1),
  safety_score NUMERIC(3,2) NOT NULL CHECK (safety_score >= 0 AND safety_score <= 1),
  overall_score NUMERIC(3,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('serve', 'warn', 'regenerate')),
  issues JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quality_logs_session ON response_quality_logs(session_id);
CREATE INDEX idx_quality_logs_overall ON response_quality_logs(overall_score);
CREATE INDEX idx_quality_logs_recommendation ON response_quality_logs(recommendation);
```

## Configuration Options

### Customizing Thresholds

```typescript
// In response-quality.ts, you can adjust:
const THRESHOLDS = {
  SERVE: 0.7,      // High quality threshold
  WARN: 0.4,       // Medium quality threshold
  REGENERATE: 0.4, // Low quality threshold (below this)
};
```

### Customizing Weights

```typescript
// Adjust importance of each metric:
const WEIGHTS = {
  factuality: 0.25,    // How much to weight factual accuracy
  consistency: 0.20,   // How much to weight conversation consistency
  relevance: 0.25,     // How much to weight query relevance
  completeness: 0.20,  // How much to weight answer completeness
  safety: 0.10,        // How much to weight safety
};
```

## Monitoring Quality Trends

Query quality metrics over time:

```sql
-- Average quality scores by day
SELECT
  DATE(created_at) as date,
  AVG(overall_score) as avg_quality,
  AVG(factuality_score) as avg_factuality,
  AVG(consistency_score) as avg_consistency,
  AVG(relevance_score) as avg_relevance,
  COUNT(*) as total_responses,
  COUNT(*) FILTER (WHERE recommendation = 'regenerate') as regenerated
FROM response_quality_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Performance Considerations

- **Latency**: Pattern matching adds ~5-10ms per response
- **Memory**: Minimal (no external API calls or large models)
- **Scaling**: Fully serverless, scales with Edge Function concurrency
- **Cost**: Zero additional cost (no API calls)

## Best Practices

1. **Always validate before streaming**: Catch quality issues before user sees them
2. **Log all metrics**: Track quality trends over time
3. **Monitor regeneration rate**: High rates indicate prompt tuning needed
4. **Review 'warn' cases**: Improve patterns based on false positives
5. **Safety is critical**: Always regenerate on safety violations

## Testing

Run tests with:

```bash
cd supabase/functions
deno task test _shared/__tests__/response-quality.test.ts
```

Coverage target: 90%+ (213 total assertions across all test cases)

## Future Enhancements

Potential improvements:

1. **LLM-based validation**: Use lightweight model for semantic checks
2. **User feedback integration**: Improve patterns based on thumbs up/down
3. **A/B testing**: Compare quality scores across model versions
4. **Real-time alerting**: Notify when quality drops below threshold
5. **Custom patterns**: Allow per-function pattern customization
