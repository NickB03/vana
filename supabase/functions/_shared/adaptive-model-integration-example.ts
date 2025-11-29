// deno-lint-ignore-file no-explicit-any
/**
 * Example Integration: Adaptive Model Selection in Chat Edge Function
 *
 * This file demonstrates how to integrate the adaptive model selection
 * system into the chat Edge Function for cost optimization.
 *
 * DO NOT import this file - it's documentation only.
 */

import { analyzeComplexity } from './complexity-analyzer.ts';
import { selectModel, getCostSavings } from './model-router.ts';
import { createLogger } from './logger.ts';
import { MODELS } from './config.ts';

const logger = createLogger('chat');

/**
 * Example 1: Basic Integration
 *
 * Add to chat/index.ts handler before making API call
 */
async function exampleBasicIntegration(userMessage: string) {
  // Analyze complexity
  const complexity = analyzeComplexity(userMessage);

  // Select optimal model
  const modelSelection = selectModel(complexity, 'chat');

  // Log for monitoring
  logger.info('Model selection', {
    complexity: {
      level: complexity.level,
      score: complexity.score,
    },
    model: modelSelection.model,
    estimatedCost: modelSelection.estimatedCost,
  });

  // Use selected model in API call
  return {
    model: modelSelection.model,
    complexity: complexity.level,
  };
}

/**
 * Example 2: Context-Aware Integration
 *
 * Use conversation history for better complexity analysis
 */
async function exampleContextAwareIntegration(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>
) {
  // Extract recent context (last 3 messages)
  const context = conversationHistory
    .slice(-3)
    .map(msg => msg.content);

  // Analyze with context
  const complexity = analyzeComplexity(userMessage, context);

  // Select model
  const modelSelection = selectModel(complexity, 'chat');

  // Calculate savings
  const savings = getCostSavings(
    modelSelection.model,
    complexity.factors.queryLength,
    complexity.estimatedOutputTokens
  );

  logger.info('Context-aware model selection', {
    contextMessages: context.length,
    complexity: {
      level: complexity.level,
      score: complexity.score,
      factors: complexity.factors,
    },
    selection: {
      model: modelSelection.model,
      reason: modelSelection.reason,
    },
    cost: {
      estimated: modelSelection.estimatedCost,
      saved: savings.saved,
      percentSaved: savings.percentSaved,
    },
  });

  return modelSelection;
}

/**
 * Example 3: Full Chat Handler Integration
 *
 * Complete example with error handling and logging
 */
async function exampleFullChatHandler(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  openrouterClient: any // OpenRouterClient instance
) {
  try {
    // Step 1: Analyze query complexity
    const context = conversationHistory.slice(-3).map(m => m.content);
    const complexity = analyzeComplexity(userMessage, context);

    logger.debug('Complexity analysis', {
      query: userMessage.substring(0, 100),
      level: complexity.level,
      score: complexity.score,
      factors: complexity.factors,
      estimatedOutputTokens: complexity.estimatedOutputTokens,
    });

    // Step 2: Select optimal model
    const modelSelection = selectModel(complexity, 'chat');

    // Step 3: Calculate potential savings
    const savings = getCostSavings(
      modelSelection.model,
      complexity.factors.queryLength,
      complexity.estimatedOutputTokens
    );

    logger.info('Model routing decision', {
      model: modelSelection.model,
      reason: modelSelection.reason,
      complexity: complexity.level,
      score: complexity.score,
      estimatedCost: modelSelection.estimatedCost,
      savings: {
        amount: savings.saved,
        percent: savings.percentSaved,
      },
    });

    // Step 4: Make API call with selected model
    const messages = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    const response = await openrouterClient.chat({
      model: modelSelection.model,
      messages,
      stream: true,
    });

    return {
      response,
      metadata: {
        model: modelSelection.model,
        complexity: complexity.level,
        estimatedCost: modelSelection.estimatedCost,
        savedCost: savings.saved,
      },
    };

  } catch (error) {
    logger.error('Model selection failed', {
      error: error.message,
      query: userMessage.substring(0, 100),
    });
    throw error;
  }
}

/**
 * Example 4: Artifact Generation Integration
 *
 * Show difference between chat and artifact routing
 */
async function exampleArtifactIntegration(
  userMessage: string,
  taskType: 'chat' | 'artifact'
) {
  const complexity = analyzeComplexity(userMessage);

  // Chat uses Gemini Flash (cost-optimized)
  const chatSelection = selectModel(complexity, 'chat');

  // Artifact uses Kimi K2 (reasoning-optimized)
  const artifactSelection = selectModel(complexity, 'artifact');

  logger.info('Chat vs Artifact routing', {
    query: userMessage.substring(0, 100),
    complexity: complexity.level,
    chat: {
      model: chatSelection.model,
      cost: chatSelection.estimatedCost,
    },
    artifact: {
      model: artifactSelection.model,
      cost: artifactSelection.estimatedCost,
      fallback: artifactSelection.fallback,
    },
    costDifference: artifactSelection.estimatedCost - chatSelection.estimatedCost,
  });

  return taskType === 'chat' ? chatSelection : artifactSelection;
}

/**
 * Example 5: Monitoring and Analytics
 *
 * Track model selection metrics over time
 */
interface ModelSelectionMetrics {
  totalRequests: number;
  complexityDistribution: Record<string, number>;
  modelUsage: Record<string, number>;
  totalCost: number;
  totalSavings: number;
}

async function exampleMetricsTracking(
  userMessage: string,
  metrics: ModelSelectionMetrics
) {
  const complexity = analyzeComplexity(userMessage);
  const selection = selectModel(complexity, 'chat');
  const savings = getCostSavings(
    selection.model,
    complexity.factors.queryLength,
    complexity.estimatedOutputTokens
  );

  // Update metrics
  metrics.totalRequests++;
  metrics.complexityDistribution[complexity.level] =
    (metrics.complexityDistribution[complexity.level] || 0) + 1;
  metrics.modelUsage[selection.model] =
    (metrics.modelUsage[selection.model] || 0) + 1;
  metrics.totalCost += selection.estimatedCost;
  metrics.totalSavings += savings.saved;

  // Log summary periodically
  if (metrics.totalRequests % 100 === 0) {
    logger.info('Model selection metrics', {
      totalRequests: metrics.totalRequests,
      complexityDistribution: metrics.complexityDistribution,
      modelUsage: metrics.modelUsage,
      avgCostPerRequest: metrics.totalCost / metrics.totalRequests,
      totalSavings: metrics.totalSavings,
      savingsPercent: (metrics.totalSavings / metrics.totalCost) * 100,
    });
  }

  return selection;
}

/**
 * Example 6: A/B Testing Setup
 *
 * Compare adaptive selection vs fixed model
 */
async function exampleABTesting(
  userMessage: string,
  userId: string
) {
  const complexity = analyzeComplexity(userMessage);

  // 10% of users get fixed model for comparison
  const useAdaptive = Math.random() > 0.1;

  const selection = useAdaptive
    ? selectModel(complexity, 'chat')
    : { model: MODELS.GEMINI_FLASH, reason: 'Control group', estimatedCost: 0 };

  logger.info('A/B test assignment', {
    userId,
    variant: useAdaptive ? 'adaptive' : 'control',
    complexity: complexity.level,
    model: selection.model,
  });

  return selection;
}

/**
 * Example 7: Error Handling and Fallback
 *
 * Handle complexity analysis failures gracefully
 */
async function exampleErrorHandling(userMessage: string) {
  try {
    const complexity = analyzeComplexity(userMessage);
    const selection = selectModel(complexity, 'chat');
    return selection;

  } catch (error) {
    logger.error('Complexity analysis failed, using fallback', {
      error: error.message,
      query: userMessage.substring(0, 100),
    });

    // Fallback to default model
    return {
      model: MODELS.GEMINI_FLASH,
      reason: 'Fallback due to analysis error',
      estimatedCost: 0.0001,
    };
  }
}

/**
 * Example 8: Integration with Rate Limiting
 *
 * Consider rate limits when selecting models
 */
async function exampleRateLimitIntegration(
  userMessage: string,
  isGuestUser: boolean
) {
  const complexity = analyzeComplexity(userMessage);
  const selection = selectModel(complexity, 'chat');

  // Guest users on free tier - log usage carefully
  if (isGuestUser) {
    logger.info('Guest user model selection', {
      complexity: complexity.level,
      model: selection.model,
      estimatedCost: selection.estimatedCost,
      reason: 'Monitoring free tier usage',
    });
  }

  return selection;
}

// Export for documentation purposes only
export {
  exampleBasicIntegration,
  exampleContextAwareIntegration,
  exampleFullChatHandler,
  exampleArtifactIntegration,
  exampleMetricsTracking,
  exampleABTesting,
  exampleErrorHandling,
  exampleRateLimitIntegration,
};
