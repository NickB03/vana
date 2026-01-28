/**
 * Web Search Skill
 *
 * Enhances the assistant with advanced web search capabilities including
 * query formulation strategies, multi-query patterns, source evaluation,
 * and synthesis techniques for accurate, well-sourced responses.
 */

import { Skill, SkillContext, ContextProvider } from '../types.ts';
import { registerSkill } from '../registry.ts';
import { createLogger } from '../../logger.ts';

/**
 * Context provider for recent user searches
 * Fetches the user's recent search queries to provide continuity
 */
const recentSearchesProvider: ContextProvider = {
  id: 'recent-searches',
  name: 'Recent Searches',
  placeholder: '{{recent_searches}}',
  provider: async (context: SkillContext): Promise<string> => {
    const logger = createLogger({
      requestId: context.requestId,
      functionName: 'web-search-skill'
    });

    try {
      // Recent searches feature not yet implemented.
      // When implemented, this should query ai_usage_logs for recent Tavily searches.
      return 'No recent searches available.';
    } catch (error) {
      logger.error('recent_searches_failed', new Error(String(error)));
      return '';
    }
  },
};

/**
 * Web Search Skill Definition
 *
 * Provides comprehensive guidance for effective web searching,
 * including query formulation, source evaluation, and synthesis patterns.
 */
export const WEB_SEARCH_SKILL: Skill = {
  id: 'web-search',
  displayName: 'Web Search',
  description: 'Advanced web search with query optimization and source synthesis',
  content: `# WEB SEARCH SKILL ACTIVE

You have web search capabilities through the browser.search tool. Use this skill to find accurate, current information.

## Recent Search Context
{{recent_searches}}

## QUERY FORMULATION STRATEGIES

### Query Type Decision Tree
Before searching, classify the query:

| Query Type | Strategy | Example Transform |
|------------|----------|-------------------|
| **Factual** | Direct, specific terms | "Who won 2024 NBA Finals" → same |
| **Comparative** | Include comparison terms | "React vs Vue" → "React vs Vue comparison 2024" |
| **How-to** | Add context + "guide" or "tutorial" | "deploy Next.js" → "deploy Next.js Vercel guide" |
| **Current events** | Add time qualifiers | "AI regulations" → "AI regulations 2024 latest" |
| **Technical** | Include version + official | "useState" → "React useState hook official docs" |

### Query Expansion Patterns

**For broad topics**, expand with synonyms:
\`\`\`
User: "best databases"
Search 1: "best SQL databases 2024 comparison"
Search 2: "top NoSQL databases performance benchmark"
\`\`\`

**For specific answers**, narrow with constraints:
\`\`\`
User: "Python memory issue"
Search: "Python memory leak debugging high RAM usage fix"
\`\`\`

**For recent information**, add time markers:
\`\`\`
User: "OpenAI news"
Search: "OpenAI announcements January 2024" (use current month/year)
\`\`\`

### Query Optimization for Complex Questions
For complex questions, combine key concepts into a single comprehensive search query:

\`\`\`
User: "Should I use Kubernetes or Docker Swarm for a startup?"

Optimized query: "Kubernetes vs Docker Swarm startup comparison overhead 2024"
\`\`\`

**IMPORTANT**: Start with a comprehensive search. If significant gaps remain after analyzing
the initial results, conduct one targeted follow-up search to address the most critical
missing information.

**Technical Note**: The system supports up to 2 sequential searches (1 initial + 1 follow-up).
Make each search count by using comprehensive, well-crafted queries that maximize coverage.
The search tool returns up to 10 results per query.

## SOURCE TYPE SELECTION

### When to Use Each Source Type

| Need | Source Type | Look For |
|------|------------|----------|
| **Facts/Stats** | Official sites, Wikipedia, .gov | Data with citations |
| **Current events** | News outlets, press releases | Recent publication dates |
| **Technical docs** | Official documentation | Version-specific pages |
| **How-to guides** | Dev blogs, Stack Overflow | Working code examples |
| **Academic/Research** | arXiv, journals, .edu | Peer review, citations |
| **Product info** | Official product pages | Pricing, features |
| **Opinions/Reviews** | Tech blogs, forums | Multiple perspectives |

### Source Priority Order
1. **Official documentation** (highest authority for technical topics)
2. **Primary sources** (original research, press releases)
3. **Reputable news** (established outlets with editorial standards)
4. **Expert analysis** (known experts with credentials)
5. **Community sources** (Stack Overflow, forums - verify accuracy)

## TIME-SENSITIVE VS EVERGREEN QUERIES

### Time-Sensitive (add date qualifiers)
- Current events, news, announcements
- Pricing, availability, stock info
- Sports scores, election results
- Software versions, API changes
- Regulations, policies in flux

**Pattern**: Add "2024" or "latest" or current month

### Evergreen (focus on authority)
- Scientific concepts, math formulas
- Historical facts, biographies
- Programming fundamentals
- Best practices (though check recency)

**Pattern**: Prioritize official docs and educational sources

## HANDLING CONFLICTING SOURCES

### Synthesis Pattern
When sources disagree:

1. **Identify the conflict explicitly**
   - "Source A claims X, while Source B argues Y"

2. **Evaluate source quality**
   - Which has better credentials/citations?
   - Which is more recent?
   - Are there conflicts of interest?

3. **Find common ground**
   - "Both sources agree that Z"

4. **Present with confidence indicators**
   - High confidence: Multiple authoritative sources agree
   - Medium confidence: Expert consensus but some debate
   - Low confidence: Limited or conflicting data

### Example Synthesis
\`\`\`
"The optimal batch size for fine-tuning varies by model. According to [HuggingFace docs](url),
8-32 is typical for most models. [Research paper](url) found 16 optimal for BERT-base.
However, [this benchmark](url) suggests starting with 8 and scaling up based on GPU memory.

**Recommendation**: Start with batch size 16, adjust based on your hardware constraints."
\`\`\`

## CITATION REQUIREMENTS

### Inline Citation Format
- **Standard**: "According to [Source Name](url), ..."
- **Multiple sources**: "[Source 1](url1) and [Source 2](url2) both indicate..."
- **Direct quotes**: As stated in [Article](url): "exact quote here"
- **Paraphrased**: The documentation [explains](url) that...

### When to Cite
- **Always cite**: Statistics, quotes, specific claims, controversial statements
- **Usually cite**: Technical specifications, best practices, recommendations
- **Optional**: Common knowledge, basic facts, definitions

## SEARCH QUALITY CHECKLIST

Before presenting results:
- [ ] Query matched user intent (factual vs exploratory vs how-to)
- [ ] Multiple sources consulted for important claims
- [ ] Source recency appropriate for the topic
- [ ] Conflicts or uncertainties acknowledged
- [ ] All claims are properly cited
- [ ] Time-sensitive info includes publication dates

## COMMON PITFALLS TO AVOID

❌ **DON'T:**
- Use a single source for controversial claims
- Trust outdated technical documentation
- Ignore publication dates on time-sensitive topics
- Present search results without synthesis
- Mix up official docs with community tutorials

✅ **DO:**
- Cross-reference important claims
- Note when information might be outdated
- Synthesize findings into coherent answers
- Acknowledge when data is limited or uncertain
- Prefer primary sources over summaries`,
  contextProviders: [recentSearchesProvider],
  actions: [],
  references: [
    {
      id: 'query-patterns',
      name: 'Query Formulation Quick Reference',
      content: `# Query Formulation Patterns

## Expansion (Broader Results)
- Add synonyms: "machine learning" OR "ML" OR "deep learning"
- Remove constraints: Drop specific versions or dates
- Use general terms: "database" instead of "PostgreSQL"

## Narrowing (Specific Results)
- Add qualifiers: "Python 3.12 asyncio tutorial beginner"
- Include domain: site:docs.python.org asyncio
- Add exclusions: "JavaScript frameworks -jQuery"

## Time Qualifiers
- Recent: "2024", "latest", "new"
- Historical: "history of", "evolution", "timeline"
- Version-specific: "React 18", "Node.js 20"

## Intent Patterns
- Factual: Direct question keywords
- Comparison: "vs", "comparison", "difference between"
- Tutorial: "how to", "guide", "tutorial", "step by step"
- Troubleshooting: "error", "fix", "not working", "issue"`,
    },
    {
      id: 'source-evaluation',
      name: 'Source Credibility Assessment',
      content: `# Evaluating Source Credibility

## CRAAP Framework
- **Currency**: When was it published/updated?
- **Relevance**: Does it address the specific question?
- **Authority**: Who authored it? What are their credentials?
- **Accuracy**: Is it supported by evidence? Can claims be verified?
- **Purpose**: Why does this content exist? (inform, sell, persuade?)

## Red Flags
- No author or publication date
- Extreme bias or inflammatory language
- Claims without citations
- Conflicts of interest undisclosed
- Outdated info presented as current

## Source Hierarchy (Technical Topics)
1. Official documentation
2. Peer-reviewed papers/RFCs
3. Core maintainer blog posts
4. Reputable tech publications
5. Stack Overflow (with votes + recent)
6. Personal blogs (verify independently)`,
    },
  ],
};

// Self-register on import
registerSkill(WEB_SEARCH_SKILL);
