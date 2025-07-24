# Diverse Memory Test Scenarios

## Beyond Basic Name Recall

### 1. Technical Preference Memory
**Test Input**: "I prefer TypeScript over JavaScript for large projects"
**Expected Memory**: 
- `user:tech_preference = "TypeScript over JavaScript"`
- Context: Large projects

**Follow-up Test**: "Can you show me a code example?"
**Expected Behavior**: Agent provides TypeScript example without being asked

### 2. Work Style Recognition
**Test Input**: "I usually work late nights and my timezone is PST"
**Expected Memory**:
- `user:work_style = "late nights"`
- `user:timezone = "PST"`

**Follow-up Test**: "Schedule a reminder for me"
**Expected Behavior**: Agent considers PST timezone and late night preference

### 3. Challenge Tracking
**Test Input**: "I'm struggling with React performance optimization"
**Expected Memory**:
- `user:current_challenge = "React performance optimization"`

**Follow-up Test**: "What should I read about today?"
**Expected Behavior**: Agent suggests performance-related resources

### 4. Success Pattern Recognition
**Test Input**: "Thanks! That useMemo approach worked perfectly for my issue"
**Expected Memory**:
- `user:successful_approach = "useMemo approach"`

**Future Test**: "I have another performance issue"
**Expected Behavior**: Agent references useMemo success and suggests similar patterns

### 5. Expertise Evolution
**Test Input**: "I have 5 years experience in Python and just started learning Rust"
**Expected Memory**:
- `user:experience = "5 years in Python"`
- `user:expertise_areas = "Python"`
- `user:goals = "learning Rust"` (inferred)

**Follow-up Test**: "Explain memory management"
**Expected Behavior**: Agent explains Rust memory management with Python comparisons

### 6. Project Context Continuity
**Test Input**: "We're building a real-time collaboration tool using WebSockets"
**Expected Memory**:
- `user:current_projects = "real-time collaboration tool"`
- `user:tech_stack = "WebSockets"`

**Follow-up Test**: "How should I handle state?"
**Expected Behavior**: Agent provides state management solutions specific to real-time collaboration

### 7. Team Context
**Test Input**: "My team uses agile and we have daily standups at 9am"
**Expected Memory**:
- `user:work_style = "agile"`
- Context about daily standups

**Follow-up Test**: "What's a good architecture pattern?"
**Expected Behavior**: Agent suggests patterns that work well with agile teams

### 8. Communication Style Adaptation
**Test Input**: "Can you explain that in simpler terms? I'm new to backend development"
**Expected Memory**:
- `user:experience_level = "beginner in backend"`
- `user:preferred_detail_level = "simple explanations"`

**Follow-up Test**: "How do APIs work?"
**Expected Behavior**: Agent provides beginner-friendly API explanation

### 9. Multi-Session Learning
**Session 1**: "I'm working on a React Native app"
**Session 2**: "The navigation is causing issues"
**Expected Behavior**: Agent remembers React Native context and provides specific navigation solutions

### 10. Preference Evolution
**Week 1**: "I like detailed explanations"
**Week 2**: "Just give me the quick answer"
**Expected Behavior**: Agent adapts to preference change

## Testing Protocol

### Phase 1: Initial Memory Creation
1. Input diverse information types
2. Verify memory storage with check_user_context
3. Check state contains all expected keys

### Phase 2: Same Session Recall
1. Ask related questions without repeating context
2. Verify agents use stored memory proactively
3. Check for personalized responses

### Phase 3: Cross-Session Persistence
1. Start new session
2. Ask questions that require previous context
3. Verify memory persists and is used

### Phase 4: Contextual Intelligence
1. Present new problems related to stored challenges
2. Ask for recommendations based on past success
3. Test if agents connect past and present context

### Phase 5: Behavioral Adaptation
1. Test if communication style matches user preference
2. Verify technical depth matches expertise
3. Check if examples use user's tech stack

## Success Metrics

1. **Memory Diversity**: Captures >10 different information types
2. **Proactive Usage**: Uses memory without explicit prompting >80% of time
3. **Context Connection**: Links new queries to past interactions
4. **Personalization**: Responses reflect user's full context
5. **Evolution Tracking**: Updates understanding as user changes

## Red Flags to Avoid

❌ Only remembering when explicitly told "remember this"
❌ Only recalling names, ignoring other context
❌ Generic responses despite rich user context
❌ Not connecting related information across sessions
❌ Treating each interaction as isolated