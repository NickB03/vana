/**
 * Result Formatter
 * Transforms final research reports for chat display with structured content and quality formatting
 */

import { ResearchResult, Citation, QualityMetrics } from '../types/chat';

// ===== INTERFACES =====

export interface RawResearchResult {
  resultId: string;
  queryId?: string;
  title?: string;
  summary: string;
  content?: {
    sections?: Array<{
      id: string;
      title: string;
      content: string;
      order: number;
      agentContributions?: string[];
      confidence?: number;
    }>;
    keyFindings?: string[];
    recommendations?: string[];
    limitations?: string[];
    methodology?: string;
    rawText?: string;
  };
  citations?: Array<{
    id?: string;
    url: string;
    title: string;
    authors?: string[];
    publishDate?: string;
    accessDate?: string;
    excerpt: string;
    usageContext?: string;
  }>;
  qualityMetrics?: {
    overallScore?: number;
    completeness?: number;
    accuracy?: number;
    relevance?: number;
    sourceQuality?: number;
    coherence?: number;
  };
  wordCount?: number;
  readingTimeMinutes?: number;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface FormattedResult extends ResearchResult {
  displaySections: DisplaySection[];
  qualityReport: QualityReport;
  readabilityMetrics: ReadabilityMetrics;
  citationSummary: CitationSummary;
  contentStructure: ContentStructure;
  exportFormats: ExportFormat[];
}

export interface DisplaySection {
  id: string;
  title: string;
  content: string;
  formattedContent: FormattedContent;
  order: number;
  wordCount: number;
  readingTime: number;
  agentContributions: AgentContribution[];
  confidence: number;
  qualityScore: number;
}

export interface FormattedContent {
  html: string;
  markdown: string;
  plainText: string;
  summary: string;
  keyPoints: string[];
  highlights: TextHighlight[];
}

export interface AgentContribution {
  agentId: string;
  agentType: string;
  contribution: string;
  confidence: number;
  timestamp: Date;
}

export interface TextHighlight {
  text: string;
  type: 'important' | 'statistic' | 'quote' | 'finding' | 'recommendation';
  context: string;
  sourceId?: string;
}

export interface QualityReport {
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  detailedScores: {
    content: number;
    sources: number;
    structure: number;
    accuracy: number;
    completeness: number;
    coherence: number;
  };
  reliability: 'high' | 'medium' | 'low';
}

export interface ReadabilityMetrics {
  fleschKincaidGrade: number;
  readingEase: number;
  averageSentenceLength: number;
  syllableCount: number;
  complexWords: number;
  readingLevel: 'elementary' | 'middle' | 'high_school' | 'college' | 'graduate';
  estimatedReadingTime: number;
}

export interface CitationSummary {
  totalCitations: number;
  uniqueDomains: number;
  sourceTypes: Record<string, number>;
  credibilityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  mostCitedSources: Array<{
    title: string;
    url: string;
    citationCount: number;
  }>;
}

export interface ContentStructure {
  hierarchy: StructureNode[];
  wordDistribution: Record<string, number>;
  topicCoverage: TopicCoverage[];
  coherenceScore: number;
  logicalFlow: FlowAnalysis;
}

export interface StructureNode {
  level: number;
  title: string;
  wordCount: number;
  children: StructureNode[];
  importance: number;
}

export interface TopicCoverage {
  topic: string;
  coverage: number;
  sections: string[];
  keywords: string[];
}

export interface FlowAnalysis {
  transitionQuality: number;
  argumentStructure: string;
  logicalGaps: string[];
  strengthOfConclusions: number;
}

export interface ExportFormat {
  format: 'pdf' | 'docx' | 'html' | 'markdown' | 'json';
  name: string;
  description: string;
  size: string;
  generateUrl: () => Promise<string>;
}

// ===== CONTENT ANALYZERS =====

class ContentAnalyzer {
  static analyzeReadability(text: string): ReadabilityMetrics {
    const sentences = this.countSentences(text);
    const words = this.countWords(text);
    const syllables = this.countSyllables(text);
    const complexWords = this.countComplexWords(text);

    const avgSentenceLength = sentences > 0 ? words / sentences : 0;
    const avgSyllablesPerWord = words > 0 ? syllables / words : 0;

    // Flesch-Kincaid Grade Level
    const fleschKincaidGrade = sentences > 0 && words > 0 
      ? 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59
      : 0;

    // Flesch Reading Ease
    const readingEase = sentences > 0 && words > 0
      ? 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord
      : 0;

    // Estimated reading time (average 200 WPM)
    const estimatedReadingTime = Math.ceil(words / 200);

    const readingLevel = this.determineReadingLevel(fleschKincaidGrade);

    return {
      fleschKincaidGrade: Math.max(0, fleschKincaidGrade),
      readingEase: Math.max(0, Math.min(100, readingEase)),
      averageSentenceLength: avgSentenceLength,
      syllableCount: syllables,
      complexWords,
      readingLevel,
      estimatedReadingTime
    };
  }

  private static countSentences(text: string): number {
    return (text.match(/[.!?]+/g) || []).length;
  }

  private static countWords(text: string): number {
    return (text.match(/\b\w+\b/g) || []).length;
  }

  private static countSyllables(text: string): number {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    return words.reduce((total, word) => total + this.syllablesInWord(word), 0);
  }

  private static syllablesInWord(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const syllables = (word.match(/[aeiouy]{1,2}/g) || []).length;
    
    return syllables || 1;
  }

  private static countComplexWords(text: string): number {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    return words.filter(word => this.syllablesInWord(word) >= 3).length;
  }

  private static determineReadingLevel(grade: number): ReadabilityMetrics['readingLevel'] {
    if (grade <= 6) return 'elementary';
    if (grade <= 8) return 'middle';
    if (grade <= 12) return 'high_school';
    if (grade <= 16) return 'college';
    return 'graduate';
  }

  static identifyHighlights(text: string, citations: Citation[]): TextHighlight[] {
    const highlights: TextHighlight[] = [];

    // Find statistics and numbers
    const statisticMatches = text.match(/\d+(\.\d+)?%|\d+(\,\d{3})*(\.\d+)?|\$\d+(\.\d{2})?/g) || [];
    for (const match of statisticMatches) {
      highlights.push({
        text: match,
        type: 'statistic',
        context: this.getContext(text, match, 50)
      });
    }

    // Find quotes (text in quotation marks)
    const quoteMatches = text.match(/"([^"]+)"/g) || [];
    for (const match of quoteMatches) {
      highlights.push({
        text: match,
        type: 'quote',
        context: this.getContext(text, match, 100)
      });
    }

    // Find key findings (sentences with specific patterns)
    const findingPatterns = [
      /\b(found|discovered|revealed|shows|indicates|demonstrates|confirms)\s+that\s+[^.]+\./gi,
      /\b(research|study|analysis|data|results)\s+(shows|indicates|suggests|reveals)\s+[^.]+\./gi
    ];

    for (const pattern of findingPatterns) {
      const matches = text.match(pattern) || [];
      for (const match of matches) {
        highlights.push({
          text: match,
          type: 'finding',
          context: this.getContext(text, match, 100)
        });
      }
    }

    // Find recommendations
    const recommendationPatterns = [
      /\b(should|must|need to|ought to|recommended|suggest)\s+[^.]+\./gi,
      /\b(recommendation|advice|proposal|solution)\s*:\s*[^.]+\./gi
    ];

    for (const pattern of recommendationPatterns) {
      const matches = text.match(pattern) || [];
      for (const match of matches) {
        highlights.push({
          text: match,
          type: 'recommendation',
          context: this.getContext(text, match, 100)
        });
      }
    }

    // Limit to top 20 highlights
    return highlights.slice(0, 20);
  }

  private static getContext(text: string, match: string, contextLength: number): string {
    const index = text.indexOf(match);
    if (index === -1) return '';
    
    const start = Math.max(0, index - contextLength);
    const end = Math.min(text.length, index + match.length + contextLength);
    
    return text.substring(start, end).trim();
  }

  static analyzeStructure(content: RawResearchResult['content']): ContentStructure {
    const sections = content?.sections || [];
    
    // Build hierarchy
    const hierarchy = sections.map(section => ({
      level: 1, // All sections are level 1 for now
      title: section.title,
      wordCount: this.countWords(section.content),
      children: [],
      importance: section.confidence || 0.5
    })).sort((a, b) => a.importance - b.importance);

    // Word distribution across sections
    const wordDistribution: Record<string, number> = {};
    for (const section of sections) {
      wordDistribution[section.title] = this.countWords(section.content);
    }

    // Topic coverage analysis
    const topicCoverage = this.analyzeTopicCoverage(sections);

    // Coherence analysis
    const coherenceScore = this.calculateCoherenceScore(sections);

    // Flow analysis
    const logicalFlow = this.analyzeLogicalFlow(sections);

    return {
      hierarchy,
      wordDistribution,
      topicCoverage,
      coherenceScore,
      logicalFlow
    };
  }

  private static analyzeTopicCoverage(sections: any[]): TopicCoverage[] {
    const topics: Record<string, { sections: string[], keywords: Set<string> }> = {};
    
    // Simple topic detection based on common keywords
    const topicKeywords = {
      'Technology': ['technology', 'digital', 'software', 'ai', 'artificial intelligence', 'computer'],
      'Business': ['business', 'market', 'company', 'revenue', 'profit', 'industry'],
      'Health': ['health', 'medical', 'healthcare', 'treatment', 'patient', 'disease'],
      'Science': ['research', 'study', 'experiment', 'data', 'analysis', 'hypothesis'],
      'Education': ['education', 'learning', 'student', 'school', 'university', 'academic'],
      'Environment': ['environment', 'climate', 'sustainability', 'green', 'renewable', 'pollution']
    };

    for (const section of sections) {
      const text = `${section.title} ${section.content}`.toLowerCase();
      
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        const matches = keywords.filter(keyword => text.includes(keyword));
        
        if (matches.length > 0) {
          if (!topics[topic]) {
            topics[topic] = { sections: [], keywords: new Set() };
          }
          
          topics[topic].sections.push(section.title);
          matches.forEach(match => topics[topic].keywords.add(match));
        }
      }
    }

    return Object.entries(topics).map(([topic, data]) => ({
      topic,
      coverage: data.sections.length / sections.length,
      sections: data.sections,
      keywords: Array.from(data.keywords)
    }));
  }

  private static calculateCoherenceScore(sections: any[]): number {
    if (sections.length <= 1) return 1.0;

    let coherenceSum = 0;
    let comparisons = 0;

    for (let i = 0; i < sections.length - 1; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        const similarity = this.calculateTextSimilarity(
          sections[i].content,
          sections[j].content
        );
        coherenceSum += similarity;
        comparisons++;
      }
    }

    return comparisons > 0 ? coherenceSum / comparisons : 0;
  }

  private static calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
    const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private static analyzeLogicalFlow(sections: any[]): FlowAnalysis {
    // Simple heuristic-based flow analysis
    const transitionWords = [
      'however', 'therefore', 'furthermore', 'moreover', 'additionally',
      'consequently', 'in contrast', 'similarly', 'finally', 'in conclusion'
    ];

    let transitionCount = 0;
    let totalSections = sections.length;

    for (const section of sections) {
      const text = section.content.toLowerCase();
      const hasTransitions = transitionWords.some(word => text.includes(word));
      if (hasTransitions) transitionCount++;
    }

    const transitionQuality = totalSections > 0 ? transitionCount / totalSections : 0;

    return {
      transitionQuality,
      argumentStructure: this.detectArgumentStructure(sections),
      logicalGaps: this.identifyLogicalGaps(sections),
      strengthOfConclusions: this.assessConclusionStrength(sections)
    };
  }

  private static detectArgumentStructure(sections: any[]): string {
    // Simple structure detection
    const titles = sections.map(s => s.title.toLowerCase());
    
    if (titles.some(t => t.includes('introduction')) && 
        titles.some(t => t.includes('conclusion'))) {
      return 'classic';
    }
    
    if (titles.some(t => t.includes('background')) && 
        titles.some(t => t.includes('methodology'))) {
      return 'research';
    }
    
    return 'informal';
  }

  private static identifyLogicalGaps(sections: any[]): string[] {
    const gaps: string[] = [];
    
    // Check for missing transitions
    if (sections.length > 2) {
      const hasIntro = sections.some(s => s.title.toLowerCase().includes('introduction'));
      const hasConclusion = sections.some(s => s.title.toLowerCase().includes('conclusion'));
      
      if (!hasIntro) gaps.push('Missing introduction section');
      if (!hasConclusion) gaps.push('Missing conclusion section');
    }

    return gaps;
  }

  private static assessConclusionStrength(sections: any[]): number {
    const conclusionSection = sections.find(s => 
      s.title.toLowerCase().includes('conclusion') ||
      s.title.toLowerCase().includes('summary')
    );

    if (!conclusionSection) return 0.3;

    const content = conclusionSection.content.toLowerCase();
    const strongWords = ['therefore', 'thus', 'in conclusion', 'clearly', 'definitively'];
    const strongWordCount = strongWords.filter(word => content.includes(word)).length;

    return Math.min(1.0, 0.5 + (strongWordCount * 0.1));
  }
}

// ===== MAIN FORMATTER CLASS =====

export class ResearchResultFormatter {
  private debugMode = false;

  constructor(options?: { debugMode?: boolean }) {
    this.debugMode = options?.debugMode ?? false;
  }

  // ===== MAIN FORMATTING METHOD =====

  formatResult(rawResult: RawResearchResult): FormattedResult {
    const startTime = performance.now();

    // Generate base result structure
    const baseResult = this.generateBaseResult(rawResult);

    // Format display sections
    const displaySections = this.formatSections(rawResult.content?.sections || []);

    // Generate quality report
    const qualityReport = this.generateQualityReport(rawResult);

    // Calculate readability metrics
    const fullText = this.extractFullText(rawResult);
    const readabilityMetrics = ContentAnalyzer.analyzeReadability(fullText);

    // Generate citation summary
    const citationSummary = this.generateCitationSummary(rawResult.citations || []);

    // Analyze content structure
    const contentStructure = ContentAnalyzer.analyzeStructure(rawResult.content);

    // Generate export formats
    const exportFormats = this.generateExportFormats(baseResult);

    const formattedResult: FormattedResult = {
      ...baseResult,
      displaySections,
      qualityReport,
      readabilityMetrics,
      citationSummary,
      contentStructure,
      exportFormats
    };

    if (this.debugMode) {
      const processingTime = performance.now() - startTime;
      console.log(`Result formatted in ${processingTime.toFixed(2)}ms:`, formattedResult);
    }

    return formattedResult;
  }

  // ===== FORMATTING METHODS =====

  private generateBaseResult(rawResult: RawResearchResult): ResearchResult {
    const processedCitations = this.processCitations(rawResult.citations || []);
    const qualityMetrics = this.processQualityMetrics(rawResult.qualityMetrics);
    
    return {
      id: rawResult.resultId,
      queryId: rawResult.queryId || 'unknown',
      title: rawResult.title || 'Research Results',
      summary: rawResult.summary,
      content: {
        sections: rawResult.content?.sections?.map(section => ({
          id: section.id,
          title: section.title,
          content: section.content,
          order: section.order,
          agentContributions: section.agentContributions || [],
          confidence: section.confidence || 0.8
        })) || [],
        keyFindings: rawResult.content?.keyFindings || [],
        recommendations: rawResult.content?.recommendations || [],
        limitations: rawResult.content?.limitations || [],
        methodology: rawResult.content?.methodology || 'Multi-agent research approach'
      },
      status: 'completed',
      quality: qualityMetrics,
      citations: processedCitations,
      generatedAt: rawResult.timestamp ? new Date(rawResult.timestamp) : new Date(),
      wordCount: rawResult.wordCount || this.calculateWordCount(rawResult),
      readingTimeMinutes: rawResult.readingTimeMinutes || Math.ceil((rawResult.wordCount || 0) / 200),
      format: {
        structure: 'business',
        includeCharts: false,
        includeTables: false,
        citationStyle: 'APA'
      }
    };
  }

  private formatSections(sections: any[]): DisplaySection[] {
    return sections.map((section, index) => {
      const content = section.content || '';
      const wordCount = ContentAnalyzer.countWords(content);
      const readingTime = Math.ceil(wordCount / 200);

      return {
        id: section.id || `section-${index}`,
        title: section.title || `Section ${index + 1}`,
        content,
        formattedContent: this.formatContent(content),
        order: section.order !== undefined ? section.order : index,
        wordCount,
        readingTime,
        agentContributions: this.processAgentContributions(section.agentContributions || []),
        confidence: section.confidence || 0.8,
        qualityScore: this.assessSectionQuality(section)
      };
    }).sort((a, b) => a.order - b.order);
  }

  private formatContent(content: string): FormattedContent {
    const plainText = content.replace(/<[^>]*>/g, ''); // Strip HTML
    const markdown = this.convertToMarkdown(content);
    const html = this.convertToHtml(content);
    const summary = this.generateSummary(plainText);
    const keyPoints = this.extractKeyPoints(plainText);
    const highlights = ContentAnalyzer.identifyHighlights(plainText, []);

    return {
      html,
      markdown,
      plainText,
      summary,
      keyPoints,
      highlights
    };
  }

  private convertToMarkdown(content: string): string {
    // Simple HTML to Markdown conversion
    let markdown = content;
    
    // Headers
    markdown = markdown.replace(/<h([1-6])>(.*?)<\/h[1-6]>/g, (match, level, text) => {
      return '#'.repeat(parseInt(level)) + ' ' + text + '\n\n';
    });
    
    // Bold
    markdown = markdown.replace(/<(strong|b)>(.*?)<\/(strong|b)>/g, '**$2**');
    
    // Italic
    markdown = markdown.replace(/<(em|i)>(.*?)<\/(em|i)>/g, '*$2*');
    
    // Links
    markdown = markdown.replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');
    
    // Lists
    markdown = markdown.replace(/<li>(.*?)<\/li>/g, '- $1\n');
    markdown = markdown.replace(/<\/?[uo]l>/g, '\n');
    
    // Paragraphs
    markdown = markdown.replace(/<p>(.*?)<\/p>/g, '$1\n\n');
    
    // Remove remaining HTML tags
    markdown = markdown.replace(/<[^>]*>/g, '');
    
    return markdown.trim();
  }

  private convertToHtml(content: string): string {
    // If already HTML, return as-is
    if (content.includes('<')) return content;
    
    // Convert plain text to HTML
    let html = content;
    
    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    // Bold (markdown style)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic (markdown style)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return html;
  }

  private generateSummary(text: string, maxLength: number = 200): string {
    // Simple extractive summarization
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) return '';
    if (sentences.length <= 2) return sentences.join('. ').trim() + '.';
    
    // Score sentences based on position and keywords
    const scored = sentences.map((sentence, index) => {
      let score = 0;
      
      // Position scoring (first and last sentences are important)
      if (index === 0 || index === sentences.length - 1) score += 2;
      if (index < sentences.length * 0.3) score += 1; // First third
      
      // Keyword scoring
      const keywords = ['important', 'significant', 'key', 'main', 'primary', 'research', 'found', 'shows'];
      keywords.forEach(keyword => {
        if (sentence.toLowerCase().includes(keyword)) score += 1;
      });
      
      // Length scoring (prefer medium-length sentences)
      const words = sentence.trim().split(/\s+/).length;
      if (words >= 8 && words <= 25) score += 1;
      
      return { sentence: sentence.trim(), score, index };
    });
    
    // Select top sentences
    const topSentences = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .sort((a, b) => a.index - b.index);
    
    let summary = topSentences.map(s => s.sentence).join('. ');
    if (!summary.endsWith('.')) summary += '.';
    
    // Truncate if too long
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }
    
    return summary;
  }

  private extractKeyPoints(text: string): string[] {
    // Extract bullet points and numbered lists
    const bulletPoints = text.match(/^[-*•]\s+(.+)$/gm) || [];
    const numberedPoints = text.match(/^\d+\.\s+(.+)$/gm) || [];
    
    const allPoints = [...bulletPoints, ...numberedPoints]
      .map(point => point.replace(/^[-*•\d.]\s+/, '').trim())
      .filter(point => point.length > 10); // Filter out short points
    
    // If no explicit points found, extract important sentences
    if (allPoints.length === 0) {
      const importantSentences = text.match(/[^.!?]*\b(key|important|significant|main|primary|crucial)[^.!?]*[.!?]/gi) || [];
      return importantSentences.slice(0, 5).map(s => s.trim());
    }
    
    return allPoints.slice(0, 10); // Limit to 10 key points
  }

  private processAgentContributions(contributions: string[]): AgentContribution[] {
    return contributions.map((agentId, index) => ({
      agentId,
      agentType: this.inferAgentType(agentId),
      contribution: 'Content research and analysis',
      confidence: 0.8,
      timestamp: new Date()
    }));
  }

  private inferAgentType(agentId: string): string {
    // Simple agent type inference based on ID patterns
    if (agentId.includes('researcher')) return 'section_researcher';
    if (agentId.includes('search')) return 'enhanced_search';
    if (agentId.includes('evaluator')) return 'research_evaluator';
    if (agentId.includes('writer')) return 'report_writer';
    return 'section_researcher';
  }

  private assessSectionQuality(section: any): number {
    let score = 0.7; // Base score

    const content = section.content || '';
    const wordCount = ContentAnalyzer.countWords(content);

    // Length scoring
    if (wordCount >= 100 && wordCount <= 800) score += 0.1;
    else if (wordCount >= 50) score += 0.05;

    // Structure scoring
    if (section.title && section.title.length > 0) score += 0.1;
    if (content.includes('\n') || content.includes('<br>')) score += 0.05; // Has paragraphs

    // Content quality indicators
    if (content.match(/\b(research|study|analysis|data|findings)\b/gi)) score += 0.05;
    if (content.match(/\d+%|\d+\.\d+/)) score += 0.05; // Contains statistics
    
    // Agent confidence
    if (section.confidence) {
      score = score * 0.8 + section.confidence * 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  private generateQualityReport(rawResult: RawResearchResult): QualityReport {
    const metrics = rawResult.qualityMetrics || {};
    const overallScore = metrics.overallScore || 0.8;
    
    // Convert to letter grade
    const overallGrade = this.scoreToGrade(overallScore);
    
    // Generate strengths and weaknesses
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    if ((metrics.completeness || 0.8) > 0.8) {
      strengths.push('Comprehensive coverage of the topic');
    } else {
      weaknesses.push('Some aspects of the topic could be explored more thoroughly');
      recommendations.push('Consider expanding on key subtopics');
    }

    if ((metrics.accuracy || 0.8) > 0.85) {
      strengths.push('High accuracy and factual reliability');
    } else {
      weaknesses.push('Some claims could benefit from additional verification');
      recommendations.push('Cross-reference key facts with multiple sources');
    }

    if ((metrics.sourceQuality || 0.8) > 0.8) {
      strengths.push('High-quality, credible sources');
    } else {
      weaknesses.push('Source diversity could be improved');
      recommendations.push('Include more authoritative and recent sources');
    }

    const detailedScores = {
      content: metrics.completeness || 0.8,
      sources: metrics.sourceQuality || 0.8,
      structure: metrics.coherence || 0.8,
      accuracy: metrics.accuracy || 0.8,
      completeness: metrics.completeness || 0.8,
      coherence: metrics.coherence || 0.8
    };

    const reliability = overallScore > 0.85 ? 'high' : overallScore > 0.7 ? 'medium' : 'low';

    return {
      overallGrade,
      strengths,
      weaknesses,
      recommendations,
      detailedScores,
      reliability
    };
  }

  private scoreToGrade(score: number): QualityReport['overallGrade'] {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    if (score >= 0.6) return 'D';
    return 'F';
  }

  private generateCitationSummary(citations: any[]): CitationSummary {
    const uniqueDomains = new Set<string>();
    const sourceTypes: Record<string, number> = {};
    let high = 0, medium = 0, low = 0;
    
    const citationCounts: Record<string, number> = {};

    for (const citation of citations) {
      try {
        const domain = new URL(citation.url).hostname;
        uniqueDomains.add(domain);
        
        // Count citations per source
        const key = `${citation.title}-${citation.url}`;
        citationCounts[key] = (citationCounts[key] || 0) + 1;
        
        // Determine source type
        const sourceType = this.determineSourceType(citation);
        sourceTypes[sourceType] = (sourceTypes[sourceType] || 0) + 1;
        
        // Assess credibility (simplified)
        const credibility = this.assessCitationCredibility(citation);
        if (credibility > 0.8) high++;
        else if (credibility > 0.5) medium++;
        else low++;
      } catch {
        sourceTypes['unknown'] = (sourceTypes['unknown'] || 0) + 1;
        low++;
      }
    }

    // Find most cited sources
    const mostCitedSources = Object.entries(citationCounts)
      .map(([key, count]) => {
        const citation = citations.find(c => `${c.title}-${c.url}` === key);
        return {
          title: citation?.title || 'Unknown',
          url: citation?.url || '',
          citationCount: count
        };
      })
      .sort((a, b) => b.citationCount - a.citationCount)
      .slice(0, 5);

    return {
      totalCitations: citations.length,
      uniqueDomains: uniqueDomains.size,
      sourceTypes,
      credibilityDistribution: { high, medium, low },
      mostCitedSources
    };
  }

  private determineSourceType(citation: any): string {
    const url = citation.url?.toLowerCase() || '';
    const title = citation.title?.toLowerCase() || '';
    
    if (url.includes('.edu') || url.includes('scholar.google') || 
        title.includes('research') || title.includes('study')) {
      return 'academic';
    }
    
    if (url.includes('.gov') || url.includes('.mil')) {
      return 'government';
    }
    
    if (url.includes('news') || url.includes('bbc') || url.includes('reuters')) {
      return 'news';
    }
    
    if (url.includes('blog') || url.includes('medium.com')) {
      return 'blog';
    }
    
    return 'web';
  }

  private assessCitationCredibility(citation: any): number {
    // Simple credibility assessment based on domain and content
    const url = citation.url?.toLowerCase() || '';
    
    if (url.includes('.edu') || url.includes('.gov')) return 0.9;
    if (url.includes('scholar.google') || url.includes('pubmed')) return 0.85;
    if (url.includes('reuters') || url.includes('bbc')) return 0.8;
    if (url.includes('wikipedia')) return 0.7;
    
    return 0.6;
  }

  private processCitations(citations: any[]): Citation[] {
    return citations.map((citation, index) => ({
      id: citation.id || `citation-${index}`,
      url: citation.url,
      title: citation.title || 'Unknown Title',
      authors: citation.authors || [],
      publishDate: citation.publishDate ? new Date(citation.publishDate) : undefined,
      accessDate: citation.accessDate ? new Date(citation.accessDate) : new Date(),
      excerpt: citation.excerpt || '',
      usageContext: citation.usageContext || 'Referenced for research support'
    }));
  }

  private processQualityMetrics(metrics: any = {}): QualityMetrics {
    return {
      overallScore: metrics.overallScore || 0.85,
      completeness: metrics.completeness || 0.8,
      accuracy: metrics.accuracy || 0.85,
      relevance: metrics.relevance || 0.9,
      sourceQuality: metrics.sourceQuality || 0.8,
      coherence: metrics.coherence || 0.85
    };
  }

  private generateExportFormats(result: ResearchResult): ExportFormat[] {
    return [
      {
        format: 'pdf',
        name: 'PDF Report',
        description: 'Professional PDF document with formatting and citations',
        size: '~500KB',
        generateUrl: async () => `/api/export/pdf/${result.id}`
      },
      {
        format: 'docx',
        name: 'Word Document',
        description: 'Microsoft Word document with editable formatting',
        size: '~300KB',
        generateUrl: async () => `/api/export/docx/${result.id}`
      },
      {
        format: 'html',
        name: 'HTML Page',
        description: 'Web page format with interactive elements',
        size: '~200KB',
        generateUrl: async () => `/api/export/html/${result.id}`
      },
      {
        format: 'markdown',
        name: 'Markdown File',
        description: 'Plain text format with markdown syntax',
        size: '~50KB',
        generateUrl: async () => `/api/export/markdown/${result.id}`
      },
      {
        format: 'json',
        name: 'JSON Data',
        description: 'Structured data format for developers',
        size: '~100KB',
        generateUrl: async () => `/api/export/json/${result.id}`
      }
    ];
  }

  // ===== UTILITY METHODS =====

  private extractFullText(rawResult: RawResearchResult): string {
    const parts: string[] = [];
    
    if (rawResult.title) parts.push(rawResult.title);
    if (rawResult.summary) parts.push(rawResult.summary);
    
    if (rawResult.content?.sections) {
      for (const section of rawResult.content.sections) {
        if (section.title) parts.push(section.title);
        if (section.content) parts.push(section.content);
      }
    }
    
    if (rawResult.content?.keyFindings) {
      parts.push(...rawResult.content.keyFindings);
    }
    
    if (rawResult.content?.recommendations) {
      parts.push(...rawResult.content.recommendations);
    }
    
    return parts.join('\n\n');
  }

  private calculateWordCount(rawResult: RawResearchResult): number {
    const fullText = this.extractFullText(rawResult);
    return ContentAnalyzer.countWords(fullText);
  }
}

// ===== SINGLETON INSTANCE =====

export const researchResultFormatter = new ResearchResultFormatter({
  debugMode: process.env.NODE_ENV === 'development'
});

export default ResearchResultFormatter;