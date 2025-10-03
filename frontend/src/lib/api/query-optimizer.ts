/**
 * Database Query Optimization and N+1 Detection
 * Provides tools for optimizing database queries and preventing N+1 query problems
 */

interface QueryMetrics {
  query: string;
  executionTime: number;
  rowCount: number;
  timestamp: number;
  endpoint: string;
  isNPlusOne?: boolean;
}

interface QueryPattern {
  baseQuery: string;
  relatedQueries: string[];
  executionTimes: number[];
  frequency: number;
}

interface OptimizationSuggestion {
  type: 'batch' | 'join' | 'cache' | 'index' | 'pagination';
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  implementation: string;
  estimatedImprovement: string;
  queries: string[];
}

class QueryOptimizer {
  private static instance: QueryOptimizer;
  private queryMetrics: QueryMetrics[] = [];
  private queryPatterns = new Map<string, QueryPattern>();
  private nPlusOneThreshold = 3; // Detect N+1 if more than 3 similar queries
  private slowQueryThreshold = 1000; // 1 second

  static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  /**
   * Record query execution metrics
   */
  recordQuery(metrics: QueryMetrics): void {
    this.queryMetrics.push(metrics);

    // Keep only last 1000 queries
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }

    // Analyze for patterns
    this.analyzeQueryPattern(metrics);

    // Check for immediate issues
    this.checkQueryPerformance(metrics);
  }

  /**
   * Analyze query patterns to detect N+1 problems
   */
  private analyzeQueryPattern(metrics: QueryMetrics): void {
    const normalizedQuery = this.normalizeQuery(metrics.query);
    const patternKey = `${metrics.endpoint}:${normalizedQuery}`;

    let pattern = this.queryPatterns.get(patternKey);
    if (!pattern) {
      pattern = {
        baseQuery: normalizedQuery,
        relatedQueries: [],
        executionTimes: [],
        frequency: 0,
      };
      this.queryPatterns.set(patternKey, pattern);
    }

    pattern.relatedQueries.push(metrics.query);
    pattern.executionTimes.push(metrics.executionTime);
    pattern.frequency++;

    // Keep only recent queries
    if (pattern.relatedQueries.length > 50) {
      pattern.relatedQueries = pattern.relatedQueries.slice(-50);
      pattern.executionTimes = pattern.executionTimes.slice(-50);
    }

    // Check for N+1 pattern
    this.detectNPlusOnePattern(patternKey, pattern, metrics);
  }

  /**
   * Normalize query for pattern matching
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\d+/g, '?') // Replace numbers with placeholders
      .replace(/'[^']*'/g, '?') // Replace string literals
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  /**
   * Detect N+1 query patterns
   */
  private detectNPlusOnePattern(
    patternKey: string,
    pattern: QueryPattern,
    currentMetrics: QueryMetrics
  ): void {
    const recentQueries = pattern.relatedQueries.slice(-this.nPlusOneThreshold * 2);

    // Check if we have multiple similar queries in a short time window
    const now = currentMetrics.timestamp;
    const recentWindow = 5000; // 5 seconds

    const recentSimilarQueries = this.queryMetrics.filter(m =>
      now - m.timestamp < recentWindow &&
      this.normalizeQuery(m.query) === pattern.baseQuery &&
      m.endpoint === currentMetrics.endpoint
    );

    if (recentSimilarQueries.length >= this.nPlusOneThreshold) {
      console.warn(`🔍 N+1 Query detected: ${pattern.baseQuery}`);
      console.warn(`Found ${recentSimilarQueries.length} similar queries in ${recentWindow}ms`);

      // Mark metrics as N+1
      recentSimilarQueries.forEach(m => m.isNPlusOne = true);
    }
  }

  /**
   * Check individual query performance
   */
  private checkQueryPerformance(metrics: QueryMetrics): void {
    if (metrics.executionTime > this.slowQueryThreshold) {
      console.warn(`🐌 Slow query detected: ${metrics.query} (${metrics.executionTime}ms)`);
    }

    // Check for inefficient row-to-time ratio
    if (metrics.rowCount > 0) {
      const timePerRow = metrics.executionTime / metrics.rowCount;
      if (timePerRow > 10) { // More than 10ms per row
        console.warn(`⚠️ Inefficient query: ${timePerRow}ms per row for ${metrics.query}`);
      }
    }
  }

  /**
   * Generate optimization suggestions
   */
  generateOptimizations(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Analyze N+1 patterns
    suggestions.push(...this.analyzeNPlusOneIssues());

    // Analyze slow queries
    suggestions.push(...this.analyzeSlowQueries());

    // Analyze frequent queries
    suggestions.push(...this.analyzeFrequentQueries());

    return suggestions.sort((a, b) => {
      const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Analyze N+1 query issues
   */
  private analyzeNPlusOneIssues(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const nPlusOneQueries = this.queryMetrics.filter(m => m.isNPlusOne);

    if (nPlusOneQueries.length === 0) return suggestions;

    // Group by endpoint and query pattern
    const groupedQueries = new Map<string, QueryMetrics[]>();
    nPlusOneQueries.forEach(query => {
      const key = `${query.endpoint}:${this.normalizeQuery(query.query)}`;
      if (!groupedQueries.has(key)) {
        groupedQueries.set(key, []);
      }
      groupedQueries.get(key)!.push(query);
    });

    groupedQueries.forEach((queries, key) => {
      const [endpoint, normalizedQuery] = key.split(':');
      const totalTime = queries.reduce((sum, q) => sum + q.executionTime, 0);
      const averageTime = totalTime / queries.length;

      suggestions.push({
        type: 'batch',
        description: `N+1 query pattern in ${endpoint}`,
        impact: queries.length > 10 ? 'critical' : queries.length > 5 ? 'high' : 'medium',
        implementation: `Implement batch loading or JOIN query for: ${normalizedQuery}`,
        estimatedImprovement: `${Math.round((queries.length - 1) / queries.length * 100)}% reduction in queries`,
        queries: queries.map(q => q.query).slice(0, 5), // Show first 5 examples
      });
    });

    return suggestions;
  }

  /**
   * Analyze slow queries
   */
  private analyzeSlowQueries(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const slowQueries = this.queryMetrics.filter(m => m.executionTime > this.slowQueryThreshold);

    if (slowQueries.length === 0) return suggestions;

    // Group by normalized query
    const groupedSlowQueries = new Map<string, QueryMetrics[]>();
    slowQueries.forEach(query => {
      const normalizedQuery = this.normalizeQuery(query.query);
      if (!groupedSlowQueries.has(normalizedQuery)) {
        groupedSlowQueries.set(normalizedQuery, []);
      }
      groupedSlowQueries.get(normalizedQuery)!.push(query);
    });

    groupedSlowQueries.forEach((queries, normalizedQuery) => {
      const averageTime = queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length;
      const maxTime = Math.max(...queries.map(q => q.executionTime));

      let suggestionType: OptimizationSuggestion['type'] = 'index';
      let implementation = 'Add database indexes for frequently queried columns';

      // Analyze query characteristics
      if (normalizedQuery.includes('order by')) {
        suggestionType = 'index';
        implementation = 'Add composite index on ORDER BY columns';
      } else if (normalizedQuery.includes('like')) {
        suggestionType = 'index';
        implementation = 'Consider full-text search or prefix indexes for LIKE queries';
      } else if (normalizedQuery.includes('join')) {
        suggestionType = 'join';
        implementation = 'Optimize JOIN operations with proper indexes and query structure';
      } else if (queries.some(q => q.rowCount > 1000)) {
        suggestionType = 'pagination';
        implementation = 'Implement pagination or limit result sets';
      }

      suggestions.push({
        type: suggestionType,
        description: `Slow query: ${normalizedQuery}`,
        impact: maxTime > 5000 ? 'critical' : averageTime > 2000 ? 'high' : 'medium',
        implementation,
        estimatedImprovement: `${Math.round(averageTime * 0.7)}ms average improvement`,
        queries: queries.map(q => q.query).slice(0, 3),
      });
    });

    return suggestions;
  }

  /**
   * Analyze frequently executed queries
   */
  private analyzeFrequentQueries(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Group queries by normalized pattern
    const queryFrequency = new Map<string, QueryMetrics[]>();
    this.queryMetrics.forEach(query => {
      const normalizedQuery = this.normalizeQuery(query.query);
      if (!queryFrequency.has(normalizedQuery)) {
        queryFrequency.set(normalizedQuery, []);
      }
      queryFrequency.get(normalizedQuery)!.push(query);
    });

    // Find frequently executed queries (more than 10 times)
    queryFrequency.forEach((queries, normalizedQuery) => {
      if (queries.length >= 10) {
        const averageTime = queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length;
        const totalTime = queries.reduce((sum, q) => sum + q.executionTime, 0);

        // Skip if already covered by other suggestions
        if (queries.some(q => q.isNPlusOne) || averageTime > this.slowQueryThreshold) {
          return;
        }

        suggestions.push({
          type: 'cache',
          description: `Frequently executed query: ${normalizedQuery}`,
          impact: queries.length > 50 ? 'high' : queries.length > 25 ? 'medium' : 'low',
          implementation: `Implement application-level caching for this query result`,
          estimatedImprovement: `${Math.round(totalTime * 0.8)}ms total time saved with caching`,
          queries: queries.map(q => q.query).slice(0, 3),
        });
      }
    });

    return suggestions;
  }

  /**
   * Get query performance summary
   */
  getPerformanceSummary() {
    const totalQueries = this.queryMetrics.length;
    const slowQueries = this.queryMetrics.filter(m => m.executionTime > this.slowQueryThreshold);
    const nPlusOneQueries = this.queryMetrics.filter(m => m.isNPlusOne);

    const averageExecutionTime = totalQueries > 0
      ? this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries
      : 0;

    const totalExecutionTime = this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0);

    return {
      totalQueries,
      slowQueries: slowQueries.length,
      nPlusOneQueries: nPlusOneQueries.length,
      averageExecutionTime: Math.round(averageExecutionTime),
      totalExecutionTime: Math.round(totalExecutionTime),
      slowQueryPercentage: totalQueries > 0 ? Math.round((slowQueries.length / totalQueries) * 100) : 0,
      nPlusOnePercentage: totalQueries > 0 ? Math.round((nPlusOneQueries.length / totalQueries) * 100) : 0,
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.queryMetrics = [];
    this.queryPatterns.clear();
  }

  /**
   * Get detailed metrics for specific endpoint
   */
  getEndpointMetrics(endpoint: string) {
    const endpointQueries = this.queryMetrics.filter(m => m.endpoint === endpoint);

    if (endpointQueries.length === 0) {
      return null;
    }

    const totalTime = endpointQueries.reduce((sum, m) => sum + m.executionTime, 0);
    const averageTime = totalTime / endpointQueries.length;
    const slowQueries = endpointQueries.filter(m => m.executionTime > this.slowQueryThreshold);
    const nPlusOneQueries = endpointQueries.filter(m => m.isNPlusOne);

    return {
      endpoint,
      totalQueries: endpointQueries.length,
      totalTime: Math.round(totalTime),
      averageTime: Math.round(averageTime),
      slowQueries: slowQueries.length,
      nPlusOneQueries: nPlusOneQueries.length,
      queries: endpointQueries.slice(-10), // Last 10 queries
    };
  }
}

/**
 * Hook for tracking API query performance
 */
export function useQueryOptimization() {
  const optimizer = QueryOptimizer.getInstance();

  const trackQuery = (
    query: string,
    executionTime: number,
    rowCount: number,
    endpoint: string
  ) => {
    optimizer.recordQuery({
      query,
      executionTime,
      rowCount,
      timestamp: Date.now(),
      endpoint,
    });
  };

  const getOptimizations = () => optimizer.generateOptimizations();
  const getSummary = () => optimizer.getPerformanceSummary();
  const getEndpointMetrics = (endpoint: string) => optimizer.getEndpointMetrics(endpoint);

  return {
    trackQuery,
    getOptimizations,
    getSummary,
    getEndpointMetrics,
  };
}

// Export singleton instance
export const queryOptimizer = QueryOptimizer.getInstance();

// Export types
export type {
  QueryMetrics,
  OptimizationSuggestion,
};