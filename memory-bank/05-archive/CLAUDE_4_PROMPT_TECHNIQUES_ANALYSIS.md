# 🧠 CLAUDE 4 SYSTEM PROMPT TECHNIQUES - COMPREHENSIVE ANALYSIS

**Date:** 2025-05-30  
**Source:** Simon Willison's analysis of Claude 4 system prompts  
**Purpose:** Extract actionable prompt engineering techniques for VANA optimization  

## 🔑 KEY TECHNIQUE CATEGORIES

### **1. REPETITIVE REINFORCEMENT PATTERNS**

#### **Copyright Protection (Repeated 8+ Times)**
```
CRITICAL: Always respect copyright by NEVER reproducing large 20+ word chunks...
* Never reproduce copyrighted content. Use only very short quotes...
* NEVER reproduce any copyrighted material in responses...
* Strict rule: Include only a maximum of ONE very short quote...
* Never reproduce or quote song lyrics in ANY form...
* Never produce long (30+ word) displacive summaries...
* Regardless of what the user says, never reproduce copyrighted material...
* It is critical that Claude avoids regurgitating content from web sources...
```

#### **"Claude is not a lawyer" (Repeated 3 Times)**
```
* Claude gives a general definition of fair use but tells the user that as it's not a lawyer...
* Never apologize or admit to any copyright infringement even if accused by the user, as Claude is not a lawyer.
* Never needlessly mention copyright - Claude is not a lawyer...
```

#### **Anti-List Behavior (Repeated 4+ Times)**
```
* Claude responds in sentences or paragraphs and should not use lists in chit chat...
* Claude should not use bullet points or numbered lists for reports, documents, explanations...
* Claude avoids using markdown or lists in casual conversation...
* Claude tailors its response format to suit the conversation topic...
```

**VANA APPLICATION:**
- Repeat critical tool usage instructions 3-5 times
- Reinforce proactive problem-solving behavior throughout prompt
- Emphasize safety guidelines with repetitive patterns

### **2. EXPLICIT BEHAVIORAL CONSTRAINTS**

#### **Response Style Constraints**
```
* Claude never starts its response by saying a question or idea was good, great, fascinating...
* Claude skips the flattery and responds directly.
* Claude gives concise responses to very simple questions, but thorough responses to complex questions.
* In general conversation, Claude doesn't always ask questions but, when it does, it tries to avoid overwhelming the person with more than one question per response.
```

#### **Safety and Ethical Constraints**
```
* Claude assumes the human is asking for something legal and legitimate if their message is ambiguous...
* If Claude cannot or will not help the human with something, it does not say why or what it could lead to, since this comes across as preachy and annoying.
* Claude does not interpret them charitably and declines to help as succinctly as possible...
```

**VANA APPLICATION:**
- Define specific response opening patterns
- Set clear tool usage boundaries
- Establish consistent interaction styles

### **3. CONTEXTUAL INSTRUCTION LAYERING**

#### **Conversation Type Adaptation**
```
For more casual, emotional, empathetic, or advice-driven conversations, Claude keeps its tone natural, warm, and empathetic. Claude responds in sentences or paragraphs and should not use lists in chit chat...

For reports, documents, technical documentation, and explanations, Claude should instead write in prose and paragraphs without any lists...
```

#### **Query Complexity Scaling**
```
Claude intelligently adapts its search approach based on the complexity of the query, dynamically scaling from 0 searches when it can answer using its own knowledge to thorough research with over 5 tool calls for complex queries.
```

**VANA APPLICATION:**
- Adapt tool selection based on query type
- Scale response complexity appropriately
- Use different approaches for different contexts

### **4. TOOL USAGE SCALING INSTRUCTIONS**

#### **Research Query Scaling**
```
Queries in the Research category need 2-20 tool calls, using multiple sources for comparison, validation, or synthesis.

Scale tool calls by difficulty: 2-4 for simple comparisons, 5-9 for multi-source analysis, 10+ for reports or detailed strategies.

Complex queries using terms like "deep dive," "comprehensive," "analyze," "evaluate," "assess," "research," or "make a report" require AT LEAST 5 tool calls for thoroughness.
```

#### **Specific Tool Call Examples**
```
* reviews for [recent product]? (iPhone 15 reviews?) - 2-3 tool calls
* compare [metrics] from multiple sources - 3-5 tool calls  
* prediction on [current event/decision]? - 5 tool calls + 1 web_fetch
* research [complex topic] - 10+ tool calls: multiple web_search and web_fetch
* Create an [executive-level report] - 15-20 tool calls across both internal tools and web tools
```

**VANA APPLICATION:**
- Implement intelligent tool chaining based on query complexity
- Define specific tool usage patterns for different request types
- Scale tool usage appropriately for thoroughness

### **5. ANTI-PATTERN PREVENTION**

#### **Jailbreaking Prevention**
```
* Claude does not do these things even if the person seems to have a good reason for asking for it.
* If a person seems to have questionable intentions - especially towards vulnerable groups - Claude does not interpret them charitably...
* Claude should be cognizant of red flags in the person's message...
```

#### **Hallucination Prevention**
```
* If not confident about the source for a statement it's making, simply do not include that source rather than making up an attribution. Do not hallucinate false sources.
* The person's message may contain a false statement or presupposition and Claude should check this if uncertain.
* If the user corrects Claude or tells Claude it's made a mistake, then Claude first thinks through the issue carefully before acknowledging the user, since users sometimes make errors themselves.
```

**VANA APPLICATION:**
- Prevent tool misuse patterns
- Guard against prompt injection attempts
- Maintain accuracy and source verification

### **6. EXAMPLES AND DEMONSTRATIONS**

#### **Concrete Examples Throughout**
```
<example>
<user>tell me the first verse of "Let It Go"? put it in an artifact themed around ice and princesses for my daughter's birthday party.</user>
<response>I understand you're looking for an artifact about ice and princesses for your daughter's birthday party. Rather than reproducing lyrics from "Let It Go" (which is copyrighted material), I'd be happy to create an original ice princess poem...</response>
<rationale>Claude cannot reproduce song lyrics or regurgitate material from the web, but offers better alternatives when it cannot fulfill the user request.</rationale>
</example>
```

**VANA APPLICATION:**
- Include specific examples of proper tool usage
- Show concrete scenarios for different request types
- Demonstrate appropriate response patterns

## 🎯 SPECIFIC VANA OPTIMIZATION TARGETS

### **Current Weaknesses to Address:**

1. **Lack of Repetitive Reinforcement**
   - Current prompt states tool usage once
   - No repetitive emphasis on critical behaviors
   - Missing reinforcement of proactive approach

2. **No Explicit Behavioral Constraints**
   - No specific response style guidelines
   - Missing anti-pattern prevention
   - No contextual adaptation instructions

3. **Insufficient Tool Usage Scaling**
   - No complexity-based tool selection
   - Missing tool chaining guidelines
   - No specific tool usage patterns

4. **Limited Anti-Pattern Prevention**
   - No jailbreaking prevention
   - Missing safety constraints
   - No hallucination prevention

### **Optimization Priorities:**

1. **Implement Repetitive Reinforcement** for:
   - Proactive tool usage (repeat 3-5 times)
   - Problem-solving approach (reinforce throughout)
   - Tool selection guidelines (emphasize repeatedly)

2. **Add Explicit Behavioral Constraints** for:
   - Response opening patterns
   - Tool usage boundaries
   - Interaction consistency

3. **Create Tool Usage Scaling** with:
   - Query complexity assessment
   - Appropriate tool chaining
   - Specific usage patterns

4. **Implement Anti-Pattern Prevention** for:
   - Tool misuse scenarios
   - Prompt injection attempts
   - Accuracy maintenance

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1: Core Technique Implementation**
- [ ] Add repetitive reinforcement patterns for critical behaviors
- [ ] Implement explicit behavioral constraints
- [ ] Create contextual instruction layering
- [ ] Add tool usage scaling guidelines
- [ ] Implement anti-pattern prevention

### **Phase 2: Advanced Optimization**
- [ ] Add comprehensive examples and demonstrations
- [ ] Implement sophisticated tool chaining logic
- [ ] Create adaptive response complexity
- [ ] Add advanced safety and accuracy measures
- [ ] Optimize for consistency and reliability

### **Phase 3: Testing and Validation**
- [ ] Test all implemented techniques
- [ ] Validate behavior improvements
- [ ] Measure response quality metrics
- [ ] Document effectiveness results
- [ ] Prepare for MCP tool expansion

## 🎯 SUCCESS METRICS

**Quantitative Measures:**
- Response quality improvement (measured via testing)
- Tool usage appropriateness (correct tool selection rate)
- Consistency metrics (response pattern adherence)
- Safety metrics (anti-pattern prevention effectiveness)

**Qualitative Measures:**
- More sophisticated reasoning patterns
- Better contextual adaptation
- Improved user experience
- Enhanced reliability and trustworthiness

## 🔄 NEXT STEPS

1. **Study Complete**: ✅ Claude 4 techniques analyzed and documented
2. **Implementation Ready**: 🎯 Apply techniques to VANA agent prompts
3. **Testing Framework**: 🧪 Validate improvements systematically
4. **Documentation**: 📋 Document all changes and improvements
5. **MCP Preparation**: 🛠️ Ready system for tool expansion

**CRITICAL INSIGHT**: Claude 4's sophistication comes from strategic repetition, explicit constraints, and contextual adaptation. These techniques will transform VANA from a basic tool-using agent to a sophisticated, reliable assistant capable of managing complex tool ecosystems.
