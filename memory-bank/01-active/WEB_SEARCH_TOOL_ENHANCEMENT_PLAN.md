# Web Search Tool Enhancement Implementation Plan
*Created: 2025-06-20*
*Status: Ready for Implementation*
*Priority: CRITICAL - Resolves core agent intelligence issue*

## 🎯 Objective

Enhance the web search tool (`/lib/_tools/adk_tools.py`) to extract rich data fields from Brave Search API responses, enabling the agent to access extractable information for time, weather, and other queries.

## 🔍 Root Cause Analysis

### **Current Implementation Problem**
```python
# Current limited implementation
results.append({
    "title": result.get("title", ""),
    "url": result.get("url", ""),
    "description": result.get("description", ""),  # Only basic snippet
})
```

### **Missing Rich Data Fields**
According to Brave Search API documentation, these fields contain extractable data:
- `infobox` - Structured data for entities (time, weather, etc.)
- `faq` - Frequently asked questions with direct answers
- `qa` - Question/answer data
- `summary` - AI-generated summary (Free AI plan feature)
- `extra_snippets` - Additional detailed excerpts
- `age` - Publication date/freshness
- `profile.score` - Relevance scoring

## 🔧 Implementation Plan

### **Phase 1: Enhanced Data Extraction**

#### **1.1 Modify Web Search Tool**
**File**: `/lib/_tools/adk_tools.py`
**Function**: `web_search()`

**Enhanced Implementation:**
```python
def web_search(query: str, max_results: int = 5) -> str:
    """🌐 Search the web for current information with enhanced data extraction."""
    try:
        import requests

        api_key = os.getenv("BRAVE_API_KEY")
        if not api_key:
            return json.dumps({"error": "Brave API key not configured"}, indent=2)

        url = "https://api.search.brave.com/res/v1/web/search"
        headers = {"X-Subscription-Token": api_key}
        params = {
            "q": query,
            "count": min(max_results, 10),
            "extra_snippets": True,  # Enable additional excerpts
            "summary": True,         # Enable AI summary
            "spellcheck": True,      # Enable spell correction
        }

        response = requests.get(url, headers=headers, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()

            # Extract enhanced results with rich data
            results = []
            web_results = data.get("web", {}).get("results", [])

            for result in web_results[:max_results]:
                enhanced_result = {
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "description": result.get("description", ""),
                    # Rich data fields for extraction
                    "extra_snippets": result.get("extra_snippets", []),
                    "summary": result.get("summary", ""),
                    "age": result.get("age", ""),
                    "relevance_score": result.get("profile", {}).get("score", 0),
                }
                results.append(enhanced_result)

            # Add infobox data if available
            response_data = {
                "query": query,
                "results": results,
                "infobox": data.get("infobox", {}),
                "faq": data.get("faq", {}),
                "summarizer": data.get("summarizer", {}),
            }

            logger.info(f"Enhanced web search completed: {len(results)} results")
            return json.dumps(response_data, indent=2)
        else:
            error_msg = f"Web search failed: HTTP {response.status_code}"
            logger.error(error_msg)
            return json.dumps({"error": error_msg}, indent=2)
    except Exception as e:
        error_msg = f"Web search error: {str(e)}"
        logger.error(error_msg)
        return json.dumps({"error": error_msg}, indent=2)
```

#### **1.2 Add Smart Data Prioritization**
For time/weather queries, prioritize structured data:

```python
def _prioritize_structured_data(query: str, data: dict) -> dict:
    """Prioritize structured data for specific query types."""
    query_lower = query.lower()

    # Time queries - prioritize infobox and direct answers
    if any(word in query_lower for word in ["time", "clock", "hour", "minute"]):
        if "infobox" in data and data["infobox"]:
            # Extract time from infobox if available
            pass

    # Weather queries - prioritize infobox and FAQ
    if any(word in query_lower for word in ["weather", "temperature", "rain", "snow", "forecast"]):
        if "infobox" in data and data["infobox"]:
            # Extract weather from infobox if available
            pass

    return data
```

### **Phase 2: Testing and Validation**

#### **2.1 Test Enhanced Tool**
1. Deploy enhanced tool to vana-dev environment
2. Test with time queries: "what time is it"
3. Test with weather queries: "weather in New York"
4. Verify rich data fields are populated
5. Confirm agent can extract from enhanced data

#### **2.2 Validation Criteria**
- ✅ Tool returns structured data fields
- ✅ Infobox data available for entity queries
- ✅ Extra snippets provide more context
- ✅ Agent can extract actual data instead of URLs

### **Phase 3: Agent Testing**

#### **3.1 Agent Extraction Testing**
Test agent with enhanced tool:
1. "What time is it?" → Should extract actual time
2. "What is the weather in New York?" → Should extract weather data
3. "What is the current Bitcoin price?" → Should extract price data

#### **3.2 Success Metrics**
- **90% success rate** across test cases
- **Actual data extraction** instead of URL references
- **Response time** maintained under 5 seconds

## 📋 Implementation Steps

### **Step 1: Code Enhancement**
1. Backup current `adk_tools.py`
2. Implement enhanced `web_search()` function
3. Add rich data field extraction
4. Include smart data prioritization

### **Step 2: Deployment**
1. Test locally if possible
2. Deploy to vana-dev environment
3. Verify deployment successful
4. Check service health

### **Step 3: Validation**
1. Test enhanced tool directly
2. Verify rich data fields populated
3. Test agent extraction capabilities
4. Document results

### **Step 4: Production**
1. If successful, deploy to production
2. Monitor performance metrics
3. Update documentation
4. Archive old implementation

## 🚨 Risk Assessment

### **Low Risk**
- **Isolated Change**: Only affects web search tool
- **Backward Compatible**: Enhanced data format includes original fields
- **Rollback Ready**: Can revert to original implementation quickly

### **Mitigation Strategies**
- Test in development environment first
- Maintain original tool as backup
- Monitor API rate limits and costs
- Validate response format compatibility

## 📊 Expected Outcomes

### **Immediate Benefits**
- Agent can extract actual time/weather data
- Improved user experience with direct answers
- Reduced "I cannot provide" responses

### **Long-term Impact**
- Foundation for enhanced data extraction capabilities
- Better utilization of Brave Search API features
- Improved agent intelligence and usefulness

## 🎯 Success Criteria

1. **Tool Enhancement**: ✅ Rich data fields extracted from Brave API
2. **Agent Performance**: ✅ 90% success rate on time/weather queries
3. **User Experience**: ✅ Direct answers instead of URL references
4. **System Stability**: ✅ No performance degradation

**Risk Level**: LOW (isolated, reversible change)
**Priority**: CRITICAL (resolves core functionality issue)
