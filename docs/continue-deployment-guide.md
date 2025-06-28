# Continue Deployment Guide for VANA Project

## 🎯 Quick Installation (10 minutes)

### Step 1: Install Continue Extension
```bash
# In VS Code
code --install-extension Continue.continue

# In Cursor  
cursor --install-extension Continue.continue
```

### Step 2: Configure Claude API
1. Open Continue (Ctrl/Cmd + I)
2. Click gear icon → "Configuration" 
3. Add Claude configuration:

```json
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "your-anthropic-api-key"
    }
  ],
  "tabAutocompleteModel": {
    "title": "Claude 3.5 Haiku", 
    "provider": "anthropic",
    "model": "claude-3-5-haiku-20241022",
    "apiKey": "your-anthropic-api-key"
  }
}
```

### Step 3: Enable Codebase Context
Continue automatically indexes your codebase with:
- **@codebase** - Reference entire codebase
- **@folder** - Reference specific folders
- **@file** - Reference specific files

## 🧠 Continue Memory Features

### Automatic Codebase Indexing
- **Vector Database**: Built-in ChromaDB with all-MiniLM-L6-v2 embeddings
- **Smart Chunking**: Automatic code-aware chunking
- **Real-time Updates**: Updates as you edit files
- **Cross-Project**: Maintains separate indexes per project

### Usage Examples
```
# Automatic context - just ask naturally
"How do I deploy this application?"
→ Continue automatically searches codebase for deployment patterns

# Explicit context references  
"@codebase How is authentication implemented?"
→ Searches entire codebase for auth patterns

# Folder-specific context
"@folder src How are components structured?"
→ Focuses on src folder patterns
```

## 🔧 VANA-Specific Configuration

### Enhanced Continue Config for VANA
```json
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet",
      "provider": "anthropic", 
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "your-api-key",
      "systemMessage": "You are working on the VANA project - an advanced multi-agent AI system built on Google's Agent Development Kit. Always consider Python 3.13+ requirements, production parity testing, and Google Cloud Run deployment patterns."
    }
  ],
  "contextProviders": [
    {
      "name": "codebase",
      "params": {
        "nRetrieve": 25,
        "nFinal": 5,
        "useReranking": true
      }
    },
    {
      "name": "folder",
      "params": {
        "folders": [".claude", "docs", "agents", "lib"]
      }
    }
  ],
  "embeddingsProvider": {
    "provider": "transformers.js",
    "model": "Xenova/all-MiniLM-L6-v2"
  }
}
```

### Custom Context for VANA Files
Continue will automatically index:
- **`.claude/` folder** - All project instructions and memory files
- **`agents/` folder** - Agent implementations  
- **`lib/` folder** - Core libraries and tools
- **`docs/` folder** - Documentation
- **`tests/` folder** - Testing frameworks

## 🚀 Integration with Existing VANA Setup

### Keep What Works
- **✅ Enhanced CLAUDE.md** - Continue respects system messages and context
- **✅ Workflow commands** - `/finish-feature`, `/deploy-prep` still valuable
- **✅ Memory MCP** - Can run alongside Continue for additional context
- **✅ Pieces Desktop** - Continue complements, doesn't replace

### Enhanced Workflow
```
You: "How do I add a new agent to VANA?"

Continue automatically:
1. Searches @codebase for existing agent patterns
2. Finds agent implementations in agents/ folder  
3. References documentation in docs/architecture/
4. Considers .claude/ instructions about agent development
5. Provides contextual answer with code examples
```

## 📊 Performance Expectations

### Search Performance
- **Initial indexing**: 30-60 seconds for VANA codebase
- **Query response**: ~100-200ms for context retrieval
- **Real-time updates**: File changes indexed within seconds
- **Memory usage**: ~200MB for VANA-sized project

### Context Quality
- **Code-aware chunking**: Understands function/class boundaries
- **Semantic search**: Finds related concepts, not just keywords
- **Relevance ranking**: Best matches appear first
- **Cross-file understanding**: Connects related code across files

## 🔄 Migration from Current Setup

### Day 1: Install and Test
1. Install Continue extension
2. Configure Claude API
3. Test with simple queries: "What is VANA?" 
4. Verify codebase indexing works

### Day 2: Enhanced Usage
1. Test @codebase queries
2. Try complex questions about architecture
3. Compare responses with/without Continue context
4. Optimize configuration if needed

### Day 3: Full Integration
1. Update development workflow to use Continue
2. Keep existing CLAUDE.md optimizations
3. Train muscle memory for @codebase, @folder patterns
4. Document what works best

## 🎯 Expected Benefits

### Immediate (Day 1)
- **Automatic codebase context** in all Claude conversations
- **No manual memory management** required
- **Faster development** with relevant code examples

### Short-term (Week 1)
- **Better architectural decisions** based on existing patterns
- **Consistent code style** following project conventions
- **Reduced context switching** between files and documentation

### Long-term (Month 1)
- **Accumulated project knowledge** improves over time
- **Cross-project patterns** when working on multiple codebases
- **Enhanced debugging** with full codebase awareness

## 🆘 Troubleshooting

### Common Issues
- **Slow indexing**: Large codebases take time initially
- **API rate limits**: Configure appropriate delays in settings
- **Context overflow**: Use @folder for focused searches

### Performance Optimization
```json
{
  "contextProviders": [
    {
      "name": "codebase",
      "params": {
        "nRetrieve": 15,  // Reduce for faster response
        "nFinal": 3,      // Focus on top matches
        "ignore": ["node_modules", "*.log", "dist"]
      }
    }
  ]
}
```

## ✅ Success Metrics

You'll know Continue is working well when:
- **Questions about VANA** automatically include relevant code context
- **"How is X implemented?"** queries return specific code examples
- **Architecture questions** reference actual project structure
- **Development velocity** increases due to better context

## 🎉 Next Steps After Installation

1. **Test basic functionality** with VANA-specific questions
2. **Compare with current workflow** to measure improvement
3. **Optimize configuration** based on usage patterns
4. **Consider keeping Pieces** for cross-project historical context
5. **Update CLAUDE.md** to mention Continue integration