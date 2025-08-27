#!/usr/bin/env node

/**
 * Error Pattern Learning System
 * Learns from error patterns and successful recovery strategies
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class PatternLearner {
    constructor() {
        this.knowledgeBase = new Map();
        this.successRates = new Map();
        this.patterns = [];
        this.dataDir = path.join(__dirname, 'data');
        this.modelPath = path.join(this.dataDir, 'patterns.json');
        this.metricsPath = path.join(this.dataDir, 'metrics.json');
    }

    /**
     * Initialize the learning system
     */
    async initialize() {
        // Create data directory
        await fs.mkdir(this.dataDir, { recursive: true });
        
        // Load existing patterns
        await this.loadPatterns();
        
        // Load metrics
        await this.loadMetrics();
        
        console.log(`Pattern learner initialized with ${this.patterns.length} patterns`);
    }

    /**
     * Store an error pattern with its recovery strategy
     */
    async storePattern(error, recovery, success = true) {
        const pattern = {
            id: this.generatePatternId(error),
            timestamp: new Date().toISOString(),
            error: {
                type: error.type || this.classifyError(error),
                message: error.message || error.toString(),
                stack: error.stack,
                context: error.context || {}
            },
            recovery: {
                strategy: recovery.strategy,
                actions: recovery.actions || [],
                duration: recovery.duration || 0,
                attempts: recovery.attempts || 1
            },
            success,
            confidence: this.calculateConfidence(error, recovery, success)
        };

        // Add to patterns
        this.patterns.push(pattern);
        
        // Update knowledge base
        const key = this.getPatternKey(error);
        if (!this.knowledgeBase.has(key)) {
            this.knowledgeBase.set(key, []);
        }
        this.knowledgeBase.get(key).push(pattern);
        
        // Update success rates
        this.updateSuccessRate(key, success);
        
        // Save patterns
        await this.savePatterns();
        
        // Train neural patterns (simulated)
        await this.trainNeuralPatterns(pattern);
        
        return pattern;
    }

    /**
     * Predict best recovery strategy for an error
     */
    async predictRecovery(error) {
        const key = this.getPatternKey(error);
        const patterns = this.knowledgeBase.get(key) || [];
        
        if (patterns.length === 0) {
            // Look for similar patterns
            const similar = await this.findSimilarPatterns(error);
            if (similar.length > 0) {
                return this.selectBestStrategy(similar);
            }
            return null;
        }
        
        // Select best strategy from known patterns
        return this.selectBestStrategy(patterns);
    }

    /**
     * Find similar patterns using pattern matching
     */
    async findSimilarPatterns(error) {
        const errorText = (error.message || error.toString()).toLowerCase();
        const similar = [];
        
        for (const pattern of this.patterns) {
            const similarity = this.calculateSimilarity(
                errorText,
                pattern.error.message.toLowerCase()
            );
            
            if (similarity > 0.7) {
                similar.push({
                    ...pattern,
                    similarity
                });
            }
        }
        
        // Sort by similarity and confidence
        similar.sort((a, b) => {
            const scoreA = a.similarity * a.confidence;
            const scoreB = b.similarity * b.confidence;
            return scoreB - scoreA;
        });
        
        return similar.slice(0, 5);
    }

    /**
     * Select best recovery strategy from patterns
     */
    selectBestStrategy(patterns) {
        if (patterns.length === 0) return null;
        
        // Sort by success rate and recency
        const sorted = patterns.sort((a, b) => {
            // Prioritize successful patterns
            if (a.success !== b.success) {
                return b.success ? 1 : -1;
            }
            
            // Then by confidence
            if (a.confidence !== b.confidence) {
                return b.confidence - a.confidence;
            }
            
            // Then by recency
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        const best = sorted[0];
        
        return {
            strategy: best.recovery.strategy,
            actions: best.recovery.actions,
            confidence: best.confidence,
            basedOn: best.id,
            alternatives: sorted.slice(1, 3).map(p => ({
                strategy: p.recovery.strategy,
                confidence: p.confidence
            }))
        };
    }

    /**
     * Calculate similarity between two strings
     */
    calculateSimilarity(str1, str2) {
        const words1 = str1.split(/\s+/);
        const words2 = str2.split(/\s+/);
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    }

    /**
     * Calculate confidence score for a recovery strategy
     */
    calculateConfidence(error, recovery, success) {
        let confidence = success ? 0.8 : 0.2;
        
        // Adjust based on attempts
        if (recovery.attempts === 1 && success) {
            confidence += 0.1;
        } else if (recovery.attempts > 3) {
            confidence -= 0.1;
        }
        
        // Adjust based on recovery duration
        if (recovery.duration < 1000 && success) {
            confidence += 0.05;
        } else if (recovery.duration > 10000) {
            confidence -= 0.05;
        }
        
        // Cap between 0 and 1
        return Math.max(0, Math.min(1, confidence));
    }

    /**
     * Update success rate for a pattern key
     */
    updateSuccessRate(key, success) {
        if (!this.successRates.has(key)) {
            this.successRates.set(key, { successes: 0, total: 0 });
        }
        
        const rate = this.successRates.get(key);
        rate.total++;
        if (success) rate.successes++;
        
        rate.rate = rate.successes / rate.total;
    }

    /**
     * Get pattern key from error
     */
    getPatternKey(error) {
        const type = error.type || this.classifyError(error);
        const message = (error.message || error.toString())
            .replace(/['"]/g, '')
            .replace(/\d+/g, 'N')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
        
        return `${type}:${message.substring(0, 100)}`;
    }

    /**
     * Classify error type
     */
    classifyError(error) {
        const message = (error.message || error.toString()).toLowerCase();
        
        if (message.includes('cannot find module') || message.includes('not found')) {
            return 'dependency';
        } else if (message.includes('syntax') || message.includes('unexpected')) {
            return 'syntax';
        } else if (message.includes('test') || message.includes('assertion')) {
            return 'test';
        } else if (message.includes('permission') || message.includes('access')) {
            return 'permission';
        } else if (message.includes('network') || message.includes('connection')) {
            return 'network';
        } else if (message.includes('timeout')) {
            return 'timeout';
        } else if (message.includes('memory') || message.includes('heap')) {
            return 'memory';
        } else {
            return 'unknown';
        }
    }

    /**
     * Generate unique pattern ID
     */
    generatePatternId(error) {
        const hash = crypto.createHash('sha256');
        hash.update(this.getPatternKey(error));
        hash.update(Date.now().toString());
        return hash.digest('hex').substring(0, 12);
    }

    /**
     * Train neural patterns (simulated)
     */
    async trainNeuralPatterns(pattern) {
        // Simulate neural training with pattern analysis
        const features = this.extractFeatures(pattern);
        
        // Store features for future predictions
        pattern.features = features;
        
        console.log(`Neural training completed for pattern ${pattern.id}`);
        
        return features;
    }

    /**
     * Extract features from pattern for ML
     */
    extractFeatures(pattern) {
        return {
            errorType: pattern.error.type,
            messageLength: pattern.error.message.length,
            hasStack: !!pattern.error.stack,
            recoveryStrategy: pattern.recovery.strategy,
            actionCount: pattern.recovery.actions.length,
            attempts: pattern.recovery.attempts,
            duration: pattern.recovery.duration,
            success: pattern.success,
            confidence: pattern.confidence
        };
    }

    /**
     * Analyze patterns and generate insights
     */
    async analyzePatterns() {
        const analysis = {
            totalPatterns: this.patterns.length,
            successfulPatterns: this.patterns.filter(p => p.success).length,
            errorTypes: {},
            recoveryStrategies: {},
            averageConfidence: 0,
            topPatterns: [],
            recommendations: []
        };
        
        // Count error types
        for (const pattern of this.patterns) {
            const type = pattern.error.type;
            analysis.errorTypes[type] = (analysis.errorTypes[type] || 0) + 1;
        }
        
        // Count recovery strategies
        for (const pattern of this.patterns) {
            const strategy = pattern.recovery.strategy;
            analysis.recoveryStrategies[strategy] = (analysis.recoveryStrategies[strategy] || 0) + 1;
        }
        
        // Calculate average confidence
        const totalConfidence = this.patterns.reduce((sum, p) => sum + p.confidence, 0);
        analysis.averageConfidence = totalConfidence / this.patterns.length;
        
        // Get top patterns by success rate
        const successRateMap = new Map();
        for (const [key, rate] of this.successRates) {
            if (rate.total >= 3) {  // Minimum occurrences
                successRateMap.set(key, rate.rate);
            }
        }
        
        analysis.topPatterns = Array.from(successRateMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([key, rate]) => ({ pattern: key, successRate: rate }));
        
        // Generate recommendations
        analysis.recommendations = this.generateRecommendations(analysis);
        
        return analysis;
    }

    /**
     * Generate recommendations based on analysis
     */
    generateRecommendations(analysis) {
        const recommendations = [];
        
        // Check for low success rates
        if (analysis.averageConfidence < 0.6) {
            recommendations.push({
                type: 'warning',
                message: 'Average confidence is low. Consider reviewing recovery strategies.'
            });
        }
        
        // Check for dominant error types
        const totalErrors = Object.values(analysis.errorTypes).reduce((a, b) => a + b, 0);
        for (const [type, count] of Object.entries(analysis.errorTypes)) {
            if (count / totalErrors > 0.3) {
                recommendations.push({
                    type: 'info',
                    message: `High occurrence of ${type} errors (${Math.round(count / totalErrors * 100)}%). Consider specialized handling.`
                });
            }
        }
        
        // Suggest optimizations
        if (this.patterns.length > 100) {
            recommendations.push({
                type: 'optimization',
                message: 'Pattern database is growing. Consider implementing pattern pruning.'
            });
        }
        
        return recommendations;
    }

    /**
     * Export learning metrics
     */
    async exportMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            patterns: {
                total: this.patterns.length,
                successful: this.patterns.filter(p => p.success).length,
                failed: this.patterns.filter(p => !p.success).length
            },
            successRates: Object.fromEntries(this.successRates),
            knowledgeBase: {
                uniqueErrors: this.knowledgeBase.size,
                totalRecoveries: Array.from(this.knowledgeBase.values()).flat().length
            },
            analysis: await this.analyzePatterns()
        };
        
        await fs.writeFile(this.metricsPath, JSON.stringify(metrics, null, 2));
        
        return metrics;
    }

    /**
     * Load patterns from storage
     */
    async loadPatterns() {
        try {
            const data = await fs.readFile(this.modelPath, 'utf8');
            const stored = JSON.parse(data);
            this.patterns = stored.patterns || [];
            
            // Rebuild knowledge base
            for (const pattern of this.patterns) {
                const key = this.getPatternKey(pattern.error);
                if (!this.knowledgeBase.has(key)) {
                    this.knowledgeBase.set(key, []);
                }
                this.knowledgeBase.get(key).push(pattern);
                this.updateSuccessRate(key, pattern.success);
            }
        } catch (error) {
            // File doesn't exist or is corrupted
            this.patterns = [];
        }
    }

    /**
     * Load metrics from storage
     */
    async loadMetrics() {
        try {
            const data = await fs.readFile(this.metricsPath, 'utf8');
            const metrics = JSON.parse(data);
            
            // Restore success rates
            if (metrics.successRates) {
                this.successRates = new Map(Object.entries(metrics.successRates));
            }
        } catch (error) {
            // File doesn't exist
        }
    }

    /**
     * Save patterns to storage
     */
    async savePatterns() {
        const data = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            patterns: this.patterns
        };
        
        await fs.writeFile(this.modelPath, JSON.stringify(data, null, 2));
    }

    /**
     * Search knowledge base
     */
    async searchKnowledge(query) {
        const results = [];
        const queryLower = query.toLowerCase();
        
        for (const [key, patterns] of this.knowledgeBase) {
            if (key.includes(queryLower)) {
                results.push({
                    key,
                    patterns: patterns.length,
                    successRate: this.successRates.get(key)?.rate || 0,
                    lastSeen: patterns[patterns.length - 1].timestamp
                });
            }
        }
        
        // Sort by relevance (success rate and recency)
        results.sort((a, b) => {
            const scoreA = a.successRate * (1 / (Date.now() - new Date(a.lastSeen)));
            const scoreB = b.successRate * (1 / (Date.now() - new Date(b.lastSeen)));
            return scoreB - scoreA;
        });
        
        return results;
    }

    /**
     * Prune old or low-confidence patterns
     */
    async prunePatterns(options = {}) {
        const {
            maxAge = 30 * 24 * 60 * 60 * 1000,  // 30 days
            minConfidence = 0.3,
            keepMinimum = 100
        } = options;
        
        const now = Date.now();
        const before = this.patterns.length;
        
        // Filter patterns
        this.patterns = this.patterns.filter(pattern => {
            const age = now - new Date(pattern.timestamp);
            return age < maxAge && pattern.confidence >= minConfidence;
        });
        
        // Ensure minimum patterns
        if (this.patterns.length < keepMinimum && before > keepMinimum) {
            // Keep the most recent patterns
            const sorted = this.patterns.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            this.patterns = sorted.slice(0, keepMinimum);
        }
        
        // Rebuild knowledge base
        this.knowledgeBase.clear();
        this.successRates.clear();
        
        for (const pattern of this.patterns) {
            const key = this.getPatternKey(pattern.error);
            if (!this.knowledgeBase.has(key)) {
                this.knowledgeBase.set(key, []);
            }
            this.knowledgeBase.get(key).push(pattern);
            this.updateSuccessRate(key, pattern.success);
        }
        
        // Save pruned patterns
        await this.savePatterns();
        
        const after = this.patterns.length;
        console.log(`Pruned ${before - after} patterns. ${after} patterns remaining.`);
        
        return { before, after, pruned: before - after };
    }
}

// Export for use in other modules
module.exports = PatternLearner;

// CLI interface
if (require.main === module) {
    const learner = new PatternLearner();
    
    async function main() {
        const command = process.argv[2];
        
        await learner.initialize();
        
        switch (command) {
            case 'store': {
                const error = JSON.parse(process.argv[3] || '{}');
                const recovery = JSON.parse(process.argv[4] || '{}');
                const success = process.argv[5] !== 'false';
                
                const pattern = await learner.storePattern(error, recovery, success);
                console.log('Pattern stored:', pattern);
                break;
            }
            
            case 'predict': {
                const error = JSON.parse(process.argv[3] || '{}');
                const prediction = await learner.predictRecovery(error);
                
                if (prediction) {
                    console.log('Predicted recovery:', prediction);
                } else {
                    console.log('No recovery strategy found');
                }
                break;
            }
            
            case 'search': {
                const query = process.argv[3] || '';
                const results = await learner.searchKnowledge(query);
                console.log(`Found ${results.length} results:`, results);
                break;
            }
            
            case 'analyze': {
                const analysis = await learner.analyzePatterns();
                console.log('Pattern analysis:', JSON.stringify(analysis, null, 2));
                break;
            }
            
            case 'metrics': {
                const metrics = await learner.exportMetrics();
                console.log('Metrics exported:', metrics);
                break;
            }
            
            case 'prune': {
                const result = await learner.prunePatterns();
                console.log('Pruning complete:', result);
                break;
            }
            
            default:
                console.log(`
Usage: node pattern-learner.js <command> [args]

Commands:
  store <error> <recovery> <success>  Store a new pattern
  predict <error>                     Predict recovery strategy
  search <query>                      Search knowledge base
  analyze                             Analyze all patterns
  metrics                             Export metrics
  prune                               Prune old patterns

Examples:
  node pattern-learner.js store '{"message":"Cannot find module express"}' '{"strategy":"install","actions":["npm install express"]}' true
  node pattern-learner.js predict '{"message":"Cannot find module lodash"}'
  node pattern-learner.js search "syntax error"
  node pattern-learner.js analyze
                `);
        }
    }
    
    main().catch(console.error);
}