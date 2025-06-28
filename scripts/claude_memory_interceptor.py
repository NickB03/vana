#!/usr/bin/env python3
"""
Claude Memory Interceptor
Automatically injects relevant memory context into Claude conversations
"""

import re
import asyncio
from typing import List, Dict, Any
from datetime import datetime

class ClaudeMemoryInterceptor:
    """Intercepts Claude queries and automatically injects relevant memory context"""
    
    def __init__(self, memory_manager):
        self.memory_manager = memory_manager
        
        # Patterns that trigger automatic memory search
        self.auto_search_patterns = [
            # Questions about the project
            r'what.*(?:is|are).*(?:vana|project|system)',
            r'how.*(?:does|do).*(?:vana|work|function)',
            r'tell me about.*(?:vana|project|architecture)',
            
            # Status inquiries
            r'(?:current|what).*status',
            r'what.*(?:working on|building|developing)',
            r'where.*(?:are we|stand)',
            
            # Technical questions
            r'(?:python|requirements|dependencies)',
            r'(?:deployment|deploy|cloud|production)',
            r'(?:test|testing|validation)',
            r'(?:memory|remember|context)',
            
            # Implementation questions
            r'how.*(?:implement|build|create|add)',
            r'what.*(?:need|require|should)',
            r'(?:best|recommended).*(?:way|approach|practice)',
            
            # User preferences
            r'(?:nick|user).*(?:prefer|like|want)',
            r'communication.*(?:style|pattern|preference)'
        ]
        
        # Compile patterns for performance
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.auto_search_patterns]
    
    def should_auto_search(self, query: str) -> bool:
        """Determine if query should trigger automatic memory search"""
        
        # Always search for direct questions
        question_words = ['what', 'how', 'why', 'when', 'where', 'who', 'which']
        if any(word in query.lower().split()[:3] for word in question_words):
            return True
        
        # Check against specific patterns
        for pattern in self.compiled_patterns:
            if pattern.search(query):
                return True
        
        # Search for VANA-specific terms
        vana_terms = ['vana', 'python', 'deployment', 'agent', 'memory', 'nick', 'status', 'requirements']
        if any(term in query.lower() for term in vana_terms):
            return True
        
        return False
    
    async def enhance_query_with_context(self, original_query: str) -> str:
        """Enhance query with automatic memory context"""
        
        if not self.should_auto_search(original_query):
            return original_query
        
        # Get relevant memory context
        memory_results = await self.memory_manager.auto_search_context(original_query)
        
        if not memory_results:
            return original_query
        
        # Build enhanced query with context
        context_section = "\n\n**Relevant Memory Context:**\n"
        
        for result in memory_results[:3]:  # Limit to top 3 results
            source = result['file_source']
            section = result['context_type'] 
            content = result['content'][:300] + "..." if len(result['content']) > 300 else result['content']
            
            context_section += f"\n*From {source} → {section}:*\n{content}\n"
        
        context_section += "\n**Original Query:** " + original_query
        
        return context_section
    
    def extract_query_intent(self, query: str) -> Dict[str, Any]:
        """Extract intent and key terms from query"""
        
        intent_patterns = {
            'status_inquiry': r'(?:status|current|where.*stand|progress)',
            'how_to_question': r'how.*(?:do|does|can|should)',
            'what_is_question': r'what.*(?:is|are)',
            'implementation': r'(?:implement|build|create|add|develop)',
            'troubleshooting': r'(?:error|problem|issue|fix|debug)',
            'preference': r'(?:prefer|like|want|should.*use)',
            'requirement': r'(?:need|require|must|should)'
        }
        
        detected_intents = []
        for intent, pattern in intent_patterns.items():
            if re.search(pattern, query, re.IGNORECASE):
                detected_intents.append(intent)
        
        # Extract key entities
        vana_entities = {
            'project': ['vana', 'project', 'system'],
            'technical': ['python', 'deployment', 'test', 'code'],
            'user': ['nick', 'user', 'preference'],
            'architecture': ['agent', 'memory', 'mcp', 'orchestrator']
        }
        
        detected_entities = []
        query_lower = query.lower()
        for entity_type, terms in vana_entities.items():
            if any(term in query_lower for term in terms):
                detected_entities.append(entity_type)
        
        return {
            'intents': detected_intents,
            'entities': detected_entities,
            'requires_memory': len(detected_intents) > 0 or len(detected_entities) > 0
        }

class SmartMemoryRouter:
    """Routes queries to appropriate memory search strategies"""
    
    def __init__(self, memory_manager):
        self.memory_manager = memory_manager
        self.interceptor = ClaudeMemoryInterceptor(memory_manager)
        
        # Query routing strategies
        self.routing_strategies = {
            'status_inquiry': self._search_status_memory,
            'technical': self._search_technical_memory,
            'user': self._search_user_preferences,
            'implementation': self._search_implementation_guides
        }
    
    async def route_query(self, query: str) -> List[Dict]:
        """Route query to appropriate memory search strategy"""
        
        intent_analysis = self.interceptor.extract_query_intent(query)
        
        if not intent_analysis['requires_memory']:
            return []
        
        all_results = []
        
        # Route based on detected entities
        for entity_type in intent_analysis['entities']:
            if entity_type in self.routing_strategies:
                strategy_results = await self.routing_strategies[entity_type](query)
                all_results.extend(strategy_results)
        
        # Deduplicate and rank results
        return self._deduplicate_and_rank(all_results)
    
    async def _search_status_memory(self, query: str) -> List[Dict]:
        """Search for status-related information"""
        status_queries = [
            "project status current operational",
            "recent achievements completed work",
            "active work in progress priorities",
            "next steps immediate tasks"
        ]
        
        results = []
        for status_query in status_queries:
            memory_results = await self.memory_manager.search_memory(status_query, n_results=2)
            results.extend(memory_results)
        
        return results
    
    async def _search_technical_memory(self, query: str) -> List[Dict]:
        """Search for technical information"""
        technical_queries = [
            "python 3.13 requirements dependencies",
            "deployment google cloud run production",
            "testing production parity framework",
            "architecture multi-agent system"
        ]
        
        results = []
        for tech_query in technical_queries:
            memory_results = await self.memory_manager.search_memory(tech_query, n_results=2)
            results.extend(memory_results)
        
        return results
    
    async def _search_user_preferences(self, query: str) -> List[Dict]:
        """Search for user preferences and patterns"""
        user_queries = [
            "nick preferences communication style",
            "user workflow patterns",
            "feedback preferences concise responses"
        ]
        
        results = []
        for user_query in user_queries:
            memory_results = await self.memory_manager.search_memory(user_query, n_results=2)
            results.extend(memory_results)
        
        return results
    
    async def _search_implementation_guides(self, query: str) -> List[Dict]:
        """Search for implementation guidance"""
        impl_queries = [
            "development guidelines best practices",
            "coding standards patterns",
            "workflow commands tools usage",
            "testing deployment procedures"
        ]
        
        results = []
        for impl_query in impl_queries:
            memory_results = await self.memory_manager.search_memory(impl_query, n_results=2)
            results.extend(impl_query)
        
        return results
    
    def _deduplicate_and_rank(self, results: List[Dict]) -> List[Dict]:
        """Remove duplicates and rank by relevance"""
        
        # Deduplicate by content hash
        seen_hashes = set()
        unique_results = []
        
        for result in results:
            content_hash = result['metadata'].get('content_hash', '')
            if content_hash not in seen_hashes:
                seen_hashes.add(content_hash)
                unique_results.append(result)
        
        # Sort by relevance score
        return sorted(unique_results, key=lambda x: x['similarity_score'], reverse=True)[:5]

# Integration with existing MCP server
async def enhance_claude_queries():
    """Main function to enhance Claude queries with automatic memory"""
    
    from auto_memory_integration import EnhancedVanaMemory
    
    # Initialize enhanced memory system
    memory = EnhancedVanaMemory()
    router = SmartMemoryRouter(memory)
    
    print("🧠 Claude Memory Interceptor active")
    print("📡 Automatic context injection enabled")
    
    # Start file watching
    await memory.start_file_watching()
    
    return router

if __name__ == "__main__":
    asyncio.run(enhance_claude_queries())