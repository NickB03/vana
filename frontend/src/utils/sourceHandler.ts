/**
 * Research Source Handler
 * Processes and manages research sources as they're discovered by Google ADK agents
 */

import { ResponseSource } from '../types/chat';

// ===== INTERFACES =====

export interface RawSource {
  id?: string;
  url: string;
  title: string;
  excerpt: string;
  relevance?: number;
  credibility?: number;
  accessedAt?: string;
  agentId?: string;
  searchQuery?: string;
  domain?: string;
  author?: string;
  publishDate?: string;
  contentType?: string;
  language?: string;
  wordCount?: number;
  metadata?: Record<string, any>;
}

export interface ProcessedSource extends ResponseSource {
  agentId?: string;
  searchQuery?: string;
  domain: string;
  contentType: string;
  language: string;
  wordCount: number;
  duplicates: string[];
  qualityMetrics: {
    contentQuality: number;
    authorityScore: number;
    freshnessScore: number;
    relevanceScore: number;
    trustScore: number;
  };
  tags: string[];
  category: SourceCategory;
}

export type SourceCategory = 
  | 'academic'
  | 'news'
  | 'blog'
  | 'government'
  | 'commercial'
  | 'reference'
  | 'social'
  | 'unknown';

export interface SourceStatistics {
  totalSources: number;
  uniqueDomains: number;
  averageRelevance: number;
  averageCredibility: number;
  categoryCounts: Record<SourceCategory, number>;
  topDomains: Array<{ domain: string; count: number; avgQuality: number }>;
  languageDistribution: Record<string, number>;
  qualityDistribution: {
    high: number;    // > 0.8
    medium: number;  // 0.5-0.8
    low: number;     // < 0.5
  };
}

// ===== DOMAIN AUTHORITY DATABASE =====

const DOMAIN_AUTHORITY: Record<string, number> = {
  // Academic institutions
  'edu': 0.95,
  'ac.uk': 0.95,
  'harvard.edu': 0.98,
  'mit.edu': 0.98,
  'stanford.edu': 0.98,
  'oxfordjournals.org': 0.95,
  'nature.com': 0.97,
  'science.org': 0.97,
  'pubmed.ncbi.nlm.nih.gov': 0.95,
  'jstor.org': 0.92,
  'scholar.google.com': 0.90,
  'researchgate.net': 0.85,
  'arxiv.org': 0.88,

  // Government sources
  'gov': 0.93,
  'gov.uk': 0.93,
  'europa.eu': 0.90,
  'who.int': 0.95,
  'cdc.gov': 0.94,
  'fda.gov': 0.92,
  'census.gov': 0.91,

  // News organizations
  'reuters.com': 0.88,
  'bbc.com': 0.87,
  'apnews.com': 0.86,
  'nytimes.com': 0.85,
  'washingtonpost.com': 0.84,
  'wsj.com': 0.84,
  'economist.com': 0.85,
  'ft.com': 0.84,
  'guardian.com': 0.82,
  'npr.org': 0.83,

  // Reference sources
  'wikipedia.org': 0.78,
  'britannica.com': 0.85,
  'merriam-webster.com': 0.80,
  'dictionary.com': 0.75,

  // Tech sources
  'stackoverflow.com': 0.82,
  'github.com': 0.80,
  'techcrunch.com': 0.75,
  'arstechnica.com': 0.78,
  'wired.com': 0.76,

  // Business sources
  'mckinsey.com': 0.85,
  'bcg.com': 0.84,
  'deloitte.com': 0.82,
  'pwc.com': 0.82,
  'bloomberg.com': 0.83,
  'forbes.com': 0.78,

  // Default fallbacks
  'blog': 0.45,
  'wordpress.com': 0.40,
  'medium.com': 0.55,
  'linkedin.com': 0.60,
  'reddit.com': 0.50
};

// ===== SOURCE QUALITY ANALYZERS =====

class ContentQualityAnalyzer {
  static analyze(source: RawSource): number {
    let score = 0.5; // Base score

    // Title quality
    if (source.title) {
      score += this.analyzeTitleQuality(source.title) * 0.2;
    }

    // Excerpt quality
    if (source.excerpt) {
      score += this.analyzeExcerptQuality(source.excerpt) * 0.3;
    }

    // Content length indicator
    if (source.wordCount) {
      score += this.analyzeContentLength(source.wordCount) * 0.1;
    }

    // URL structure
    score += this.analyzeUrlStructure(source.url) * 0.1;

    // Author presence
    if (source.author) {
      score += 0.1;
    }

    // Publish date recency
    if (source.publishDate) {
      score += this.analyzeFreshness(source.publishDate) * 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private static analyzeTitleQuality(title: string): number {
    let score = 0.5;
    
    // Length check (optimal 30-60 characters)
    const length = title.length;
    if (length >= 30 && length <= 60) score += 0.2;
    else if (length >= 20 && length <= 80) score += 0.1;

    // Check for clickbait indicators
    const clickbaitWords = ['shocking', 'amazing', 'unbelievable', 'you wont believe'];
    const hasClickbait = clickbaitWords.some(word => 
      title.toLowerCase().includes(word)
    );
    if (hasClickbait) score -= 0.3;

    // Check for professional indicators
    const professionalWords = ['study', 'research', 'analysis', 'report', 'findings'];
    const hasProfessional = professionalWords.some(word => 
      title.toLowerCase().includes(word)
    );
    if (hasProfessional) score += 0.2;

    // Capitalization check
    if (this.hasProperCapitalization(title)) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private static analyzeExcerptQuality(excerpt: string): number {
    let score = 0.5;

    // Length check (optimal 100-300 characters)
    const length = excerpt.length;
    if (length >= 100 && length <= 300) score += 0.2;
    else if (length >= 50 && length <= 400) score += 0.1;

    // Sentence structure
    const sentences = excerpt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 2 && sentences.length <= 4) score += 0.1;

    // Grammar indicators (simple heuristics)
    if (this.hasGoodGrammar(excerpt)) score += 0.1;

    // Information density
    if (this.hasInformationDensity(excerpt)) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private static analyzeContentLength(wordCount: number): number {
    // Prefer longer, more comprehensive content
    if (wordCount >= 1000) return 1.0;
    if (wordCount >= 500) return 0.8;
    if (wordCount >= 200) return 0.6;
    if (wordCount >= 100) return 0.4;
    return 0.2;
  }

  private static analyzeUrlStructure(url: string): number {
    let score = 0.5;

    // HTTPS check
    if (url.startsWith('https://')) score += 0.2;

    // Path depth (prefer moderate depth)
    const pathDepth = (url.split('/').length - 3);
    if (pathDepth >= 1 && pathDepth <= 3) score += 0.1;

    // Query parameters (too many can indicate dynamic/low-quality content)
    const queryParams = (url.split('?')[1]?.split('&') || []).length;
    if (queryParams === 0) score += 0.1;
    else if (queryParams <= 2) score += 0.05;
    else score -= 0.1;

    // File extension check
    if (url.match(/\.(pdf|doc|docx)$/i)) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  private static analyzeFreshness(publishDate: string): number {
    try {
      const date = new Date(publishDate);
      const now = new Date();
      const ageInDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

      // Fresher content gets higher scores
      if (ageInDays <= 30) return 1.0;
      if (ageInDays <= 90) return 0.8;
      if (ageInDays <= 365) return 0.6;
      if (ageInDays <= 1095) return 0.4; // 3 years
      return 0.2;
    } catch {
      return 0.5; // Default if date parsing fails
    }
  }

  private static hasProperCapitalization(text: string): boolean {
    // Check if title case or sentence case
    const words = text.split(' ');
    const capitalizedWords = words.filter(word => 
      word.length > 0 && word[0] === word[0].toUpperCase()
    );
    return capitalizedWords.length / words.length >= 0.5;
  }

  private static hasGoodGrammar(text: string): boolean {
    // Simple grammar heuristics
    const indicators = [
      /^[A-Z]/, // Starts with capital
      /[.!?]$/, // Ends with punctuation
      /\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/i, // Common words
    ];
    return indicators.filter(pattern => pattern.test(text)).length >= 2;
  }

  private static hasInformationDensity(text: string): boolean {
    // Check for numbers, dates, specific terms
    const infoPatterns = [
      /\d+/, // Numbers
      /\b\d{4}\b/, // Years
      /\b(study|research|according|data|results|findings)\b/i,
      /\b(Dr\.|Prof\.|PhD|University|Institute)\b/i
    ];
    return infoPatterns.some(pattern => pattern.test(text));
  }
}

class DomainAnalyzer {
  static getDomainAuthority(url: string): number {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      // Check exact domain match
      if (DOMAIN_AUTHORITY[domain]) {
        return DOMAIN_AUTHORITY[domain];
      }

      // Check TLD patterns
      for (const [pattern, score] of Object.entries(DOMAIN_AUTHORITY)) {
        if (domain.endsWith(pattern)) {
          return score;
        }
      }

      // Domain heuristics
      let score = 0.5;

      // Educational institutions
      if (domain.includes('.edu') || domain.includes('.ac.')) score = 0.9;
      // Government sites
      else if (domain.includes('.gov') || domain.includes('.mil')) score = 0.85;
      // Organizations
      else if (domain.includes('.org')) score = 0.7;
      // Commercial sites
      else if (domain.includes('.com') || domain.includes('.co.')) score = 0.6;
      // Personal blogs
      else if (domain.includes('blogspot') || domain.includes('wordpress')) score = 0.4;

      return score;
    } catch {
      return 0.5; // Default for invalid URLs
    }
  }

  static categorizeSource(url: string, title?: string, excerpt?: string): SourceCategory {
    const domain = new URL(url).hostname.toLowerCase();
    const content = `${title || ''} ${excerpt || ''}`.toLowerCase();

    // Academic
    if (domain.includes('.edu') || domain.includes('.ac.') || 
        domain.includes('scholar') || domain.includes('pubmed') ||
        content.includes('research') || content.includes('study')) {
      return 'academic';
    }

    // Government
    if (domain.includes('.gov') || domain.includes('.mil') ||
        domain.includes('europa.eu')) {
      return 'government';
    }

    // News
    if (domain.includes('news') || ['bbc.com', 'cnn.com', 'reuters.com', 'ap.org'].some(d => domain.includes(d))) {
      return 'news';
    }

    // Reference
    if (domain.includes('wikipedia') || domain.includes('britannica') ||
        domain.includes('dictionary') || domain.includes('reference')) {
      return 'reference';
    }

    // Blog
    if (domain.includes('blog') || domain.includes('medium.com') ||
        domain.includes('wordpress') || domain.includes('blogspot')) {
      return 'blog';
    }

    // Social
    if (domain.includes('twitter') || domain.includes('facebook') ||
        domain.includes('linkedin') || domain.includes('reddit')) {
      return 'social';
    }

    // Commercial (default for .com domains)
    if (domain.includes('.com') || domain.includes('.co.')) {
      return 'commercial';
    }

    return 'unknown';
  }
}

// ===== MAIN SOURCE HANDLER CLASS =====

export class ResearchSourceHandler {
  private sources = new Map<string, ProcessedSource>();
  private domainCache = new Map<string, number>();
  private duplicateThreshold = 0.85; // Similarity threshold for duplicate detection
  private debugMode = false;

  constructor(options?: { 
    duplicateThreshold?: number; 
    debugMode?: boolean;
  }) {
    this.duplicateThreshold = options?.duplicateThreshold ?? 0.85;
    this.debugMode = options?.debugMode ?? false;
  }

  // ===== MAIN PROCESSING METHODS =====

  /**
   * Process and add a new source
   */
  addSource(rawSource: RawSource): ProcessedSource {
    const processedSource = this.processSource(rawSource);
    
    // Check for duplicates
    const duplicateId = this.findDuplicate(processedSource);
    if (duplicateId) {
      return this.mergeDuplicate(duplicateId, processedSource);
    }

    // Add new source
    this.sources.set(processedSource.id, processedSource);

    if (this.debugMode) {
      console.log(`Added new source: ${processedSource.title} (${processedSource.domain})`);
    }

    return processedSource;
  }

  /**
   * Batch process multiple sources
   */
  addSources(rawSources: RawSource[]): ProcessedSource[] {
    return rawSources.map(source => this.addSource(source));
  }

  /**
   * Get all sources sorted by relevance
   */
  getSources(options?: {
    sortBy?: 'relevance' | 'credibility' | 'date' | 'quality';
    category?: SourceCategory;
    minQuality?: number;
    limit?: number;
  }): ProcessedSource[] {
    let sources = Array.from(this.sources.values());

    // Apply filters
    if (options?.category) {
      sources = sources.filter(s => s.category === options.category);
    }

    if (options?.minQuality) {
      sources = sources.filter(s => s.qualityMetrics.contentQuality >= options.minQuality);
    }

    // Sort sources
    const sortBy = options?.sortBy || 'relevance';
    sources.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'credibility':
          return b.credibilityScore - a.credibilityScore;
        case 'date':
          return b.accessedAt.getTime() - a.accessedAt.getTime();
        case 'quality':
          return b.qualityMetrics.contentQuality - a.qualityMetrics.contentQuality;
        default:
          return 0;
      }
    });

    // Apply limit
    if (options?.limit) {
      sources = sources.slice(0, options.limit);
    }

    return sources;
  }

  /**
   * Get sources by search query
   */
  getSourcesByQuery(searchQuery: string): ProcessedSource[] {
    return Array.from(this.sources.values())
      .filter(source => source.searchQuery?.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get statistics about all sources
   */
  getStatistics(): SourceStatistics {
    const sources = Array.from(this.sources.values());
    const domains = new Map<string, { count: number; totalQuality: number }>();
    const categories: Record<SourceCategory, number> = {
      academic: 0, news: 0, blog: 0, government: 0, commercial: 0,
      reference: 0, social: 0, unknown: 0
    };
    const languages: Record<string, number> = {};
    let qualityHigh = 0, qualityMedium = 0, qualityLow = 0;

    for (const source of sources) {
      // Domain statistics
      const domainStats = domains.get(source.domain) || { count: 0, totalQuality: 0 };
      domainStats.count++;
      domainStats.totalQuality += source.qualityMetrics.contentQuality;
      domains.set(source.domain, domainStats);

      // Category counts
      categories[source.category]++;

      // Language distribution
      languages[source.language] = (languages[source.language] || 0) + 1;

      // Quality distribution
      const quality = source.qualityMetrics.contentQuality;
      if (quality > 0.8) qualityHigh++;
      else if (quality >= 0.5) qualityMedium++;
      else qualityLow++;
    }

    // Top domains
    const topDomains = Array.from(domains.entries())
      .map(([domain, stats]) => ({
        domain,
        count: stats.count,
        avgQuality: stats.totalQuality / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalSources: sources.length,
      uniqueDomains: domains.size,
      averageRelevance: sources.reduce((sum, s) => sum + s.relevanceScore, 0) / sources.length || 0,
      averageCredibility: sources.reduce((sum, s) => sum + s.credibilityScore, 0) / sources.length || 0,
      categoryCounts: categories,
      topDomains,
      languageDistribution: languages,
      qualityDistribution: {
        high: qualityHigh,
        medium: qualityMedium,
        low: qualityLow
      }
    };
  }

  // ===== PRIVATE PROCESSING METHODS =====

  private processSource(rawSource: RawSource): ProcessedSource {
    const id = rawSource.id || this.generateSourceId(rawSource.url);
    const domain = this.extractDomain(rawSource.url);
    
    // Calculate quality metrics
    const qualityMetrics = {
      contentQuality: ContentQualityAnalyzer.analyze(rawSource),
      authorityScore: DomainAnalyzer.getDomainAuthority(rawSource.url),
      freshnessScore: rawSource.publishDate ? this.calculateFreshnessScore(rawSource.publishDate) : 0.5,
      relevanceScore: rawSource.relevance || 0.5,
      trustScore: this.calculateTrustScore(rawSource)
    };

    // Generate tags
    const tags = this.generateTags(rawSource);

    const processedSource: ProcessedSource = {
      id,
      url: rawSource.url,
      title: rawSource.title || 'Untitled',
      excerpt: rawSource.excerpt || '',
      relevanceScore: rawSource.relevance || qualityMetrics.relevanceScore,
      credibilityScore: rawSource.credibility || qualityMetrics.authorityScore,
      accessedAt: rawSource.accessedAt ? new Date(rawSource.accessedAt) : new Date(),
      agentId: rawSource.agentId,
      searchQuery: rawSource.searchQuery,
      domain,
      contentType: this.detectContentType(rawSource.url, rawSource.contentType),
      language: rawSource.language || this.detectLanguage(rawSource.title, rawSource.excerpt),
      wordCount: rawSource.wordCount || this.estimateWordCount(rawSource.excerpt),
      duplicates: [],
      qualityMetrics,
      tags,
      category: DomainAnalyzer.categorizeSource(rawSource.url, rawSource.title, rawSource.excerpt)
    };

    return processedSource;
  }

  private generateSourceId(url: string): string {
    // Create a stable ID based on URL
    return `source-${Buffer.from(url).toString('base64').replace(/[+/=]/g, '').slice(0, 12)}`;
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return 'unknown-domain';
    }
  }

  private calculateFreshnessScore(publishDate: string): number {
    try {
      const date = new Date(publishDate);
      const ageInDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
      
      if (ageInDays <= 7) return 1.0;
      if (ageInDays <= 30) return 0.9;
      if (ageInDays <= 90) return 0.7;
      if (ageInDays <= 365) return 0.5;
      return 0.3;
    } catch {
      return 0.5;
    }
  }

  private calculateTrustScore(source: RawSource): number {
    let score = 0.5;

    // Domain authority contributes heavily
    const domainAuthority = DomainAnalyzer.getDomainAuthority(source.url);
    score += domainAuthority * 0.4;

    // Author presence
    if (source.author) score += 0.1;

    // Content indicators
    if (source.excerpt && source.excerpt.length > 100) score += 0.1;

    // URL structure
    if (source.url.startsWith('https://')) score += 0.05;

    return Math.max(0, Math.min(1, score));
  }

  private generateTags(source: RawSource): string[] {
    const tags: string[] = [];
    const text = `${source.title} ${source.excerpt}`.toLowerCase();

    // Topic tags based on content
    const topicPatterns: Record<string, RegExp[]> = {
      'research': [/research|study|findings|data|analysis/],
      'business': [/business|company|market|industry|economy/],
      'technology': [/technology|tech|software|digital|ai|artificial intelligence/],
      'health': [/health|medical|medicine|healthcare|disease/],
      'science': [/science|scientific|experiment|hypothesis/],
      'education': [/education|learning|school|university|student/],
      'government': [/government|policy|political|legislation/],
      'finance': [/finance|financial|money|investment|bank/]
    };

    for (const [tag, patterns] of Object.entries(topicPatterns)) {
      if (patterns.some(pattern => pattern.test(text))) {
        tags.push(tag);
      }
    }

    // Quality tags
    if (source.credibility && source.credibility > 0.8) tags.push('high-credibility');
    if (source.relevance && source.relevance > 0.8) tags.push('highly-relevant');

    // Source type tags
    tags.push(DomainAnalyzer.categorizeSource(source.url, source.title, source.excerpt));

    return tags;
  }

  private detectContentType(url: string, providedType?: string): string {
    if (providedType) return providedType;

    // Detect from URL extension
    if (url.match(/\.pdf$/i)) return 'application/pdf';
    if (url.match(/\.(doc|docx)$/i)) return 'application/document';
    if (url.match(/\.(jpg|jpeg|png|gif)$/i)) return 'image';
    if (url.match(/\.(mp4|avi|mov)$/i)) return 'video';
    
    return 'text/html';
  }

  private detectLanguage(title?: string, excerpt?: string): string {
    // Simple language detection heuristics
    const text = `${title || ''} ${excerpt || ''}`.toLowerCase();
    
    // English indicators
    const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const englishCount = englishWords.filter(word => text.includes(` ${word} `)).length;
    
    if (englishCount >= 3) return 'en';
    
    // Could add more language detection here
    return 'unknown';
  }

  private estimateWordCount(excerpt?: string): number {
    if (!excerpt) return 0;
    return excerpt.split(/\s+/).filter(word => word.length > 0).length * 5; // Estimate full content
  }

  private findDuplicate(source: ProcessedSource): string | null {
    for (const [id, existingSource] of this.sources.entries()) {
      const similarity = this.calculateSimilarity(source, existingSource);
      if (similarity > this.duplicateThreshold) {
        return id;
      }
    }
    return null;
  }

  private calculateSimilarity(source1: ProcessedSource, source2: ProcessedSource): number {
    // URL similarity (highest weight)
    if (source1.url === source2.url) return 1.0;
    
    // Domain similarity
    const domainMatch = source1.domain === source2.domain ? 0.3 : 0.0;
    
    // Title similarity
    const titleSimilarity = this.stringSimilarity(
      source1.title.toLowerCase(),
      source2.title.toLowerCase()
    ) * 0.4;
    
    // Excerpt similarity
    const excerptSimilarity = this.stringSimilarity(
      source1.excerpt.toLowerCase(),
      source2.excerpt.toLowerCase()
    ) * 0.3;
    
    return domainMatch + titleSimilarity + excerptSimilarity;
  }

  private stringSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private mergeDuplicate(existingId: string, newSource: ProcessedSource): ProcessedSource {
    const existing = this.sources.get(existingId)!;
    
    // Keep the source with higher quality
    const keepNew = newSource.qualityMetrics.contentQuality > existing.qualityMetrics.contentQuality;
    
    if (keepNew) {
      // Replace existing with new source
      newSource.duplicates = [...existing.duplicates, existing.id];
      this.sources.set(existingId, newSource);
      return newSource;
    } else {
      // Keep existing, add new as duplicate
      existing.duplicates.push(newSource.id);
      this.sources.set(existingId, existing);
      return existing;
    }
  }

  // ===== PUBLIC API METHODS =====

  getSourceById(id: string): ProcessedSource | undefined {
    return this.sources.get(id);
  }

  getSourcesByDomain(domain: string): ProcessedSource[] {
    return Array.from(this.sources.values())
      .filter(source => source.domain === domain);
  }

  getSourcesByCategory(category: SourceCategory): ProcessedSource[] {
    return Array.from(this.sources.values())
      .filter(source => source.category === category);
  }

  removeSource(id: string): boolean {
    return this.sources.delete(id);
  }

  clear(): void {
    this.sources.clear();
    this.domainCache.clear();
  }

  getSourceCount(): number {
    return this.sources.size;
  }
}

// ===== SINGLETON INSTANCE =====

export const researchSourceHandler = new ResearchSourceHandler({
  duplicateThreshold: 0.85,
  debugMode: process.env.NODE_ENV === 'development'
});

export default ResearchSourceHandler;