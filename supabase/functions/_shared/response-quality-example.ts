/**
 * Example: Response Quality Validation Integration
 *
 * This file demonstrates how to integrate response quality validation
 * into the chat function's streaming handler.
 *
 * IMPORTANT: This is an example only - not production code.
 * Integrate these patterns into your actual handlers as needed.
 */

import { validateResponse, type Message, type QualityCheckResult } from './response-quality.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

/**
 * Example: Validate and log quality metrics during chat streaming
 */
export async function validateAndLogChatResponse(params: {
  response: string;
  userQuery: string;
  conversationHistory: Message[];
  sessionId: string;
  messageId?: string;
  supabaseClient: ReturnType<typeof createClient>;
  requestId: string;
}): Promise<QualityCheckResult> {
  const {
    response,
    userQuery,
    conversationHistory,
    sessionId,
    messageId,
    supabaseClient,
    requestId,
  } = params;

  // Run validation
  const qualityCheck = validateResponse(response, userQuery, conversationHistory);

  // Log metrics with request context
  console.log(`[${requestId}] Quality validation:`, {
    overall: qualityCheck.metrics.overall.toFixed(2),
    recommendation: qualityCheck.recommendation,
    metrics: {
      factuality: qualityCheck.metrics.factuality.toFixed(2),
      consistency: qualityCheck.metrics.consistency.toFixed(2),
      relevance: qualityCheck.metrics.relevance.toFixed(2),
      completeness: qualityCheck.metrics.completeness.toFixed(2),
      safety: qualityCheck.metrics.safety.toFixed(2),
    },
    issueCount: qualityCheck.issues.length,
  });

  // Log high-severity issues
  const criticalIssues = qualityCheck.issues.filter((i) => i.severity === 'high');
  if (criticalIssues.length > 0) {
    console.warn(`[${requestId}] Critical quality issues:`, criticalIssues);
  }

  // Store quality metrics in database for analytics
  try {
    await supabaseClient.from('response_quality_logs').insert({
      session_id: sessionId,
      message_id: messageId || null,
      factuality_score: qualityCheck.metrics.factuality,
      consistency_score: qualityCheck.metrics.consistency,
      relevance_score: qualityCheck.metrics.relevance,
      completeness_score: qualityCheck.metrics.completeness,
      safety_score: qualityCheck.metrics.safety,
      overall_score: qualityCheck.metrics.overall,
      recommendation: qualityCheck.recommendation,
      issues: qualityCheck.issues,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error(`[${requestId}] Failed to log quality metrics:`, error);
  }

  return qualityCheck;
}

/**
 * Example: Handle different quality recommendations
 */
export function getQualityActionPlan(
  qualityCheck: QualityCheckResult,
  requestId: string
): {
  shouldServe: boolean;
  shouldLog: boolean;
  shouldRegenerate: boolean;
  headers: Record<string, string>;
} {
  const baseHeaders = {
    'X-Quality-Score': qualityCheck.metrics.overall.toFixed(2),
    'X-Quality-Recommendation': qualityCheck.recommendation,
  };

  switch (qualityCheck.recommendation) {
    case 'serve':
      console.log(`[${requestId}] ✅ High quality response - serving immediately`);
      return {
        shouldServe: true,
        shouldLog: false,
        shouldRegenerate: false,
        headers: {
          ...baseHeaders,
          'X-Quality-Status': 'optimal',
        },
      };

    case 'warn':
      console.warn(
        `[${requestId}] ⚠️ Medium quality response - serving with warning`,
        qualityCheck.issues.map((i) => i.description)
      );
      return {
        shouldServe: true,
        shouldLog: true,
        shouldRegenerate: false,
        headers: {
          ...baseHeaders,
          'X-Quality-Status': 'acceptable',
          'X-Quality-Issues': qualityCheck.issues.length.toString(),
        },
      };

    case 'regenerate':
      console.error(
        `[${requestId}] ❌ Low quality response - should regenerate`,
        qualityCheck.issues
      );
      return {
        shouldServe: false,
        shouldLog: true,
        shouldRegenerate: true,
        headers: {
          ...baseHeaders,
          'X-Quality-Status': 'rejected',
          'X-Quality-Issues': qualityCheck.issues.length.toString(),
        },
      };

    default:
      return {
        shouldServe: true,
        shouldLog: false,
        shouldRegenerate: false,
        headers: baseHeaders,
      };
  }
}

/**
 * Example: Integration into tool-calling response handler
 *
 * This shows how you might integrate quality validation into the
 * chat function's tool-calling handler (handlers/tool-calling-chat.ts).
 */
export async function exampleStreamingIntegration(params: {
  generatedResponse: string;
  userQuery: string;
  conversationHistory: Message[];
  sessionId: string;
  supabaseClient: ReturnType<typeof createClient>;
  requestId: string;
  onRegenerate?: () => Promise<string>;
}) {
  const {
    generatedResponse,
    userQuery,
    conversationHistory,
    sessionId,
    supabaseClient,
    requestId,
    onRegenerate,
  } = params;

  // Validate response quality
  const qualityCheck = await validateAndLogChatResponse({
    response: generatedResponse,
    userQuery,
    conversationHistory,
    sessionId,
    supabaseClient,
    requestId,
  });

  // Determine action based on quality
  const actionPlan = getQualityActionPlan(qualityCheck, requestId);

  // Handle regeneration if needed
  if (actionPlan.shouldRegenerate && onRegenerate) {
    console.log(`[${requestId}] Regenerating response due to low quality...`);
    try {
      const regeneratedResponse = await onRegenerate();

      // Validate regenerated response (one retry only)
      const retryQualityCheck = await validateAndLogChatResponse({
        response: regeneratedResponse,
        userQuery,
        conversationHistory,
        sessionId,
        supabaseClient,
        requestId: `${requestId}-retry`,
      });

      // If retry is better, use it; otherwise serve original with warning
      if (retryQualityCheck.metrics.overall > qualityCheck.metrics.overall) {
        console.log(`[${requestId}] ✅ Retry improved quality`);
        return {
          response: regeneratedResponse,
          qualityCheck: retryQualityCheck,
          wasRegenerated: true,
        };
      } else {
        console.warn(`[${requestId}] ⚠️ Retry did not improve quality, serving original`);
      }
    } catch (error) {
      console.error(`[${requestId}] Regeneration failed:`, error);
      // Fall through to serve original
    }
  }

  return {
    response: generatedResponse,
    qualityCheck,
    wasRegenerated: false,
  };
}

/**
 * Example: Database migration for quality logging
 *
 * Run this migration to add the response_quality_logs table:
 *
 * ```sql
 * CREATE TABLE IF NOT EXISTS response_quality_logs (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
 *   message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
 *   factuality_score NUMERIC(3,2) NOT NULL CHECK (factuality_score >= 0 AND factuality_score <= 1),
 *   consistency_score NUMERIC(3,2) NOT NULL CHECK (consistency_score >= 0 AND consistency_score <= 1),
 *   relevance_score NUMERIC(3,2) NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
 *   completeness_score NUMERIC(3,2) NOT NULL CHECK (completeness_score >= 0 AND completeness_score <= 1),
 *   safety_score NUMERIC(3,2) NOT NULL CHECK (safety_score >= 0 AND safety_score <= 1),
 *   overall_score NUMERIC(3,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 1),
 *   recommendation TEXT NOT NULL CHECK (recommendation IN ('serve', 'warn', 'regenerate')),
 *   issues JSONB DEFAULT '[]'::jsonb,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   CONSTRAINT valid_scores CHECK (
 *     factuality_score BETWEEN 0 AND 1 AND
 *     consistency_score BETWEEN 0 AND 1 AND
 *     relevance_score BETWEEN 0 AND 1 AND
 *     completeness_score BETWEEN 0 AND 1 AND
 *     safety_score BETWEEN 0 AND 1 AND
 *     overall_score BETWEEN 0 AND 1
 *   )
 * );
 *
 * CREATE INDEX idx_quality_logs_session ON response_quality_logs(session_id);
 * CREATE INDEX idx_quality_logs_overall ON response_quality_logs(overall_score);
 * CREATE INDEX idx_quality_logs_recommendation ON response_quality_logs(recommendation);
 * CREATE INDEX idx_quality_logs_created ON response_quality_logs(created_at DESC);
 * ```
 */

/**
 * Example: Query quality analytics
 *
 * ```sql
 * -- Get average quality scores over time
 * SELECT
 *   DATE(created_at) as date,
 *   ROUND(AVG(overall_score)::numeric, 2) as avg_quality,
 *   ROUND(AVG(factuality_score)::numeric, 2) as avg_factuality,
 *   ROUND(AVG(consistency_score)::numeric, 2) as avg_consistency,
 *   ROUND(AVG(relevance_score)::numeric, 2) as avg_relevance,
 *   COUNT(*) as total_responses,
 *   COUNT(*) FILTER (WHERE recommendation = 'regenerate') as regenerated,
 *   COUNT(*) FILTER (WHERE recommendation = 'warn') as warnings,
 *   COUNT(*) FILTER (WHERE recommendation = 'serve') as served
 * FROM response_quality_logs
 * WHERE created_at >= NOW() - INTERVAL '7 days'
 * GROUP BY DATE(created_at)
 * ORDER BY date DESC;
 *
 * -- Find common quality issues
 * SELECT
 *   issue->>'type' as issue_type,
 *   issue->>'severity' as severity,
 *   COUNT(*) as occurrences,
 *   array_agg(DISTINCT issue->>'description') as descriptions
 * FROM response_quality_logs,
 *   jsonb_array_elements(issues) as issue
 * WHERE created_at >= NOW() - INTERVAL '7 days'
 * GROUP BY issue->>'type', issue->>'severity'
 * ORDER BY occurrences DESC;
 * ```
 */
