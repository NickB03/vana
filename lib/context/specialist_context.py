"""
Enhanced Context Management for VANA
Rich context objects with conversation history, user preferences, and execution metadata.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum

from lib.logging_config import get_logger
from lib._shared_libraries.adk_memory_service import get_adk_memory_service
from lib._shared_libraries.session_manager import get_adk_session_manager

logger = get_logger("vana.context")


class SecurityLevel(Enum):
    """Security levels for context handling"""
    PUBLIC = "public"
    RESTRICTED = "restricted"
    CONFIDENTIAL = "confidential"
    SECRET = "secret"


class ContextPriority(Enum):
    """Priority levels for context processing"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class ExecutionMetadata:
    """Metadata about the current execution context"""
    timestamp: datetime = field(default_factory=datetime.now)
    request_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    parent_agents: List[str] = field(default_factory=list)
    routing_path: List[str] = field(default_factory=list)
    execution_depth: int = 0
    priority: ContextPriority = ContextPriority.MEDIUM
    security_level: SecurityLevel = SecurityLevel.PUBLIC
    performance_targets: Dict[str, float] = field(default_factory=dict)
    
    def add_routing_step(self, agent_name: str):
        """Add an agent to the routing path"""
        self.routing_path.append(f"{agent_name}@{datetime.now().isoformat()}")
        self.execution_depth += 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "timestamp": self.timestamp.isoformat(),
            "request_id": self.request_id,
            "session_id": self.session_id,
            "user_id": self.user_id,
            "parent_agents": self.parent_agents,
            "routing_path": self.routing_path,
            "execution_depth": self.execution_depth,
            "priority": self.priority.value,
            "security_level": self.security_level.value,
            "performance_targets": self.performance_targets
        }


@dataclass
class ConversationHistory:
    """Rich conversation history with analysis capabilities"""
    messages: List[Dict[str, Any]] = field(default_factory=list)
    topics: List[str] = field(default_factory=list)
    sentiment_trend: List[float] = field(default_factory=list)
    specialist_usage: Dict[str, int] = field(default_factory=dict)
    pattern_frequency: Dict[str, int] = field(default_factory=dict)
    session_duration: float = 0.0
    
    def add_message(self, role: str, content: str, specialist: Optional[str] = None,
                   analysis: Optional[Dict[str, Any]] = None):
        """Add a message to conversation history"""
        message = {
            "timestamp": datetime.now().isoformat(),
            "role": role,
            "content": content,
            "specialist": specialist,
            "analysis": analysis or {},
            "message_id": str(uuid.uuid4())
        }
        self.messages.append(message)
        
        # Update specialist usage
        if specialist:
            self.specialist_usage[specialist] = self.specialist_usage.get(specialist, 0) + 1
        
        # Update session duration
        if len(self.messages) > 1:
            first_msg = datetime.fromisoformat(self.messages[0]["timestamp"])
            last_msg = datetime.fromisoformat(self.messages[-1]["timestamp"])
            self.session_duration = (last_msg - first_msg).total_seconds()
    
    def get_recent_context(self, max_messages: int = 5, 
                          time_window_minutes: int = 30) -> List[Dict[str, Any]]:
        """Get recent conversation context within time window"""
        cutoff_time = datetime.now() - timedelta(minutes=time_window_minutes)
        
        recent_messages = []
        for msg in reversed(self.messages[-max_messages:]):
            msg_time = datetime.fromisoformat(msg["timestamp"])
            if msg_time >= cutoff_time:
                recent_messages.append(msg)
        
        return list(reversed(recent_messages))
    
    def extract_topics(self) -> List[str]:
        """Extract key topics from conversation"""
        # Simple keyword extraction - can be enhanced with NLP
        topic_keywords = []
        for msg in self.messages:
            content = msg["content"].lower()
            # Look for technical terms and domains
            for keyword in ["security", "architecture", "data", "api", "docker", 
                          "testing", "ui", "database", "performance", "deployment"]:
                if keyword in content and keyword not in topic_keywords:
                    topic_keywords.append(keyword)
        
        self.topics = topic_keywords
        return self.topics
    
    def analyze_pattern_usage(self) -> Dict[str, int]:
        """Analyze pattern usage in conversation"""
        patterns = {
            "code_review": 0,
            "architecture_discussion": 0,
            "security_analysis": 0,
            "performance_optimization": 0,
            "deployment_planning": 0,
            "ui_enhancement": 0
        }
        
        for msg in self.messages:
            content = msg["content"].lower()
            if any(word in content for word in ["code", "review", "refactor"]):
                patterns["code_review"] += 1
            if any(word in content for word in ["architecture", "design", "pattern"]):
                patterns["architecture_discussion"] += 1
            if any(word in content for word in ["security", "vulnerability", "auth"]):
                patterns["security_analysis"] += 1
            if any(word in content for word in ["performance", "optimization", "speed"]):
                patterns["performance_optimization"] += 1
            if any(word in content for word in ["deploy", "production", "release"]):
                patterns["deployment_planning"] += 1
            if any(word in content for word in ["ui", "interface", "user", "design"]):
                patterns["ui_enhancement"] += 1
        
        self.pattern_frequency = patterns
        return patterns


@dataclass
class UserPreferences:
    """Comprehensive user preferences and behavior patterns"""
    preferred_specialists: List[str] = field(default_factory=list)
    communication_style: str = "balanced"  # concise, detailed, balanced
    technical_level: str = "intermediate"  # beginner, intermediate, expert
    preferred_languages: List[str] = field(default_factory=lambda: ["python"])
    frameworks: List[str] = field(default_factory=list)
    security_requirements: SecurityLevel = SecurityLevel.PUBLIC
    response_format: str = "markdown"  # markdown, json, plain
    timezone: str = "UTC"
    notification_preferences: Dict[str, bool] = field(default_factory=dict)
    performance_preferences: Dict[str, Any] = field(default_factory=dict)
    
    def update_from_usage(self, specialist_usage: Dict[str, int]):
        """Update preferences based on usage patterns"""
        # Update preferred specialists based on usage
        sorted_specialists = sorted(specialist_usage.items(), 
                                  key=lambda x: x[1], reverse=True)
        self.preferred_specialists = [name for name, _ in sorted_specialists[:3]]
    
    def get_response_style_prompt(self) -> str:
        """Get prompt addition for response style"""
        style_prompts = {
            "concise": "Provide concise, to-the-point responses.",
            "detailed": "Provide comprehensive, detailed explanations.",
            "balanced": "Provide balanced responses with appropriate detail."
        }
        
        level_prompts = {
            "beginner": "Explain concepts in simple terms with examples.",
            "intermediate": "Use standard technical terminology with context.",
            "expert": "Use advanced technical terminology and assume deep knowledge."
        }
        
        return f"{style_prompts.get(self.communication_style, '')} " \
               f"{level_prompts.get(self.technical_level, '')}"


class SpecialistContext:
    """
    Enhanced context object for specialist agents with rich context management.
    Integrates with existing ADK memory and session services.
    """
    
    def __init__(self, request: str, session_data: Optional[Dict[str, Any]] = None,
                 user_id: Optional[str] = None, session_id: Optional[str] = None):
        
        # Core request data
        self.request = request
        self.original_request = request
        
        # Initialize metadata
        self.execution_metadata = ExecutionMetadata(
            session_id=session_id,
            user_id=user_id
        )
        
        # Initialize conversation history
        self.conversation_history = ConversationHistory()
        
        # Initialize user preferences
        self.user_preferences = UserPreferences()
        
        # Previous analyses cache
        self.previous_analyses: Dict[str, Any] = {}
        
        # Cross-specialist context
        self.specialist_insights: Dict[str, Dict[str, Any]] = {}
        
        # Performance tracking
        self.performance_metrics: Dict[str, float] = {}
        
        # Initialize from session data if provided
        if session_data:
            self._load_from_session_data(session_data)
        
        # Services
        self._memory_service = None
        self._session_service = None
        
        logger.info(f"SpecialistContext initialized for request: {request[:100]}...")
    
    async def initialize_services(self):
        """Initialize memory and session services"""
        try:
            self._memory_service = get_adk_memory_service()
            self._session_service = get_adk_session_manager()
            logger.info("Context services initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize context services: {e}")
    
    def _load_from_session_data(self, session_data: Dict[str, Any]):
        """Load context from session data"""
        # Load conversation history
        if "conversation_history" in session_data:
            hist_data = session_data["conversation_history"]
            self.conversation_history.messages = hist_data.get("messages", [])
            self.conversation_history.topics = hist_data.get("topics", [])
            self.conversation_history.specialist_usage = hist_data.get("specialist_usage", {})
        
        # Load user preferences
        if "user_preferences" in session_data:
            prefs = session_data["user_preferences"]
            self.user_preferences.preferred_specialists = prefs.get("preferred_specialists", [])
            self.user_preferences.communication_style = prefs.get("communication_style", "balanced")
            self.user_preferences.technical_level = prefs.get("technical_level", "intermediate")
            self.user_preferences.preferred_languages = prefs.get("preferred_languages", ["python"])
            self.user_preferences.security_requirements = SecurityLevel(
                prefs.get("security_requirements", "public")
            )
        
        # Load previous analyses
        self.previous_analyses = session_data.get("previous_analyses", {})
        
        # Load specialist insights
        self.specialist_insights = session_data.get("specialist_insights", {})
        
        # Update metadata
        if "security_level" in session_data:
            self.execution_metadata.security_level = SecurityLevel(session_data["security_level"])
        
        if "priority" in session_data:
            self.execution_metadata.priority = ContextPriority(session_data["priority"])
    
    def add_specialist_insight(self, specialist_name: str, insight: Dict[str, Any]):
        """Add insight from a specialist"""
        if specialist_name not in self.specialist_insights:
            self.specialist_insights[specialist_name] = []
        
        insight_with_metadata = {
            **insight,
            "timestamp": datetime.now().isoformat(),
            "request_id": self.execution_metadata.request_id
        }
        
        self.specialist_insights[specialist_name].append(insight_with_metadata)
        
        # Update conversation history
        self.conversation_history.add_message(
            role="assistant",
            content=str(insight.get("result", insight)),
            specialist=specialist_name,
            analysis=insight
        )
    
    def get_relevant_context(self, specialist_name: Optional[str] = None,
                           max_items: int = 5) -> Dict[str, Any]:
        """Get relevant context for current request"""
        context = {
            "recent_conversation": self.conversation_history.get_recent_context(max_items),
            "user_preferences": self.user_preferences.__dict__,
            "execution_metadata": self.execution_metadata.to_dict(),
            "previous_analyses": self.previous_analyses
        }
        
        # Add specialist-specific context
        if specialist_name and specialist_name in self.specialist_insights:
            recent_insights = self.specialist_insights[specialist_name][-max_items:]
            context["specialist_history"] = recent_insights
        
        # Add cross-specialist insights
        context["cross_specialist_insights"] = {
            name: insights[-2:] for name, insights in self.specialist_insights.items()
            if name != specialist_name
        }
        
        return context
    
    def update_security_level(self, level: SecurityLevel):
        """Update security level based on request content"""
        self.execution_metadata.security_level = level
        self.user_preferences.security_requirements = level
        
        # Log security level changes
        logger.info(f"Security level updated to: {level.value}")
    
    def add_performance_metric(self, metric_name: str, value: float):
        """Add performance metric"""
        self.performance_metrics[metric_name] = value
        
        # Update execution metadata performance targets
        if metric_name not in self.execution_metadata.performance_targets:
            self.execution_metadata.performance_targets[metric_name] = value
    
    async def save_to_memory(self):
        """Save context to persistent memory"""
        if not self._memory_service:
            await self.initialize_services()
        
        if self._memory_service:
            try:
                context_data = {
                    "conversation_history": self.conversation_history.__dict__,
                    "user_preferences": self.user_preferences.__dict__,
                    "specialist_insights": self.specialist_insights,
                    "previous_analyses": self.previous_analyses,
                    "execution_metadata": self.execution_metadata.to_dict(),
                    "performance_metrics": self.performance_metrics
                }
                
                # Save to memory with searchable content
                searchable_content = f"{self.request} {' '.join(self.conversation_history.topics)}"
                
                await self._memory_service.add_session_to_memory(
                    session_id=self.execution_metadata.session_id or self.execution_metadata.request_id,
                    content=searchable_content,
                    metadata=context_data
                )
                
                logger.info("Context saved to memory successfully")
            except Exception as e:
                logger.error(f"Failed to save context to memory: {e}")
    
    async def load_from_memory(self, query: str, max_results: int = 3):
        """Load relevant context from memory"""
        if not self._memory_service:
            await self.initialize_services()
        
        if self._memory_service:
            try:
                results = await self._memory_service.search_memory(
                    query=query,
                    max_results=max_results
                )
                
                for result in results:
                    if "metadata" in result:
                        metadata = result["metadata"]
                        # Merge relevant insights
                        if "specialist_insights" in metadata:
                            for specialist, insights in metadata["specialist_insights"].items():
                                if specialist not in self.specialist_insights:
                                    self.specialist_insights[specialist] = []
                                # Add only recent insights to avoid overwhelming context
                                self.specialist_insights[specialist].extend(insights[-2:])
                        
                        # Merge previous analyses
                        if "previous_analyses" in metadata:
                            self.previous_analyses.update(metadata["previous_analyses"])
                
                logger.info(f"Loaded {len(results)} relevant contexts from memory")
            except Exception as e:
                logger.error(f"Failed to load context from memory: {e}")
    
    def to_session_data(self) -> Dict[str, Any]:
        """Convert context to session data for persistence"""
        return {
            "conversation_history": self.conversation_history.__dict__,
            "user_preferences": self.user_preferences.__dict__,
            "specialist_insights": self.specialist_insights,
            "previous_analyses": self.previous_analyses,
            "execution_metadata": self.execution_metadata.to_dict(),
            "performance_metrics": self.performance_metrics,
            "security_level": self.execution_metadata.security_level.value,
            "priority": self.execution_metadata.priority.value
        }
    
    def get_context_summary(self) -> str:
        """Get a summary of current context for logging/debugging"""
        return f"""
Context Summary:
- Request: {self.request[:100]}...
- Session ID: {self.execution_metadata.session_id}
- User ID: {self.execution_metadata.user_id}
- Security Level: {self.execution_metadata.security_level.value}
- Priority: {self.execution_metadata.priority.value}
- Conversation Messages: {len(self.conversation_history.messages)}
- Specialist Insights: {len(self.specialist_insights)}
- Previous Analyses: {len(self.previous_analyses)}
- Performance Metrics: {len(self.performance_metrics)}
- Recent Topics: {', '.join(self.conversation_history.topics[-5:])}
        """.strip()


# Utility functions for context management

async def create_specialist_context(request: str, session_data: Optional[Dict[str, Any]] = None,
                                  user_id: Optional[str] = None, 
                                  session_id: Optional[str] = None) -> SpecialistContext:
    """Create and initialize a specialist context"""
    context = SpecialistContext(request, session_data, user_id, session_id)
    await context.initialize_services()
    
    # Load relevant context from memory
    await context.load_from_memory(request)
    
    return context


def enhance_request_with_context(request: str, context: SpecialistContext,
                                specialist_name: Optional[str] = None) -> str:
    """Enhance request with relevant context information"""
    relevant_context = context.get_relevant_context(specialist_name)
    
    # Get user preference styling
    style_prompt = context.user_preferences.get_response_style_prompt()
    
    # Build enhanced request
    enhanced_request = f"""
{request}

CONTEXT INFORMATION:
{style_prompt}

Recent conversation topics: {', '.join(context.conversation_history.topics[-3:])}
Security level: {context.execution_metadata.security_level.value}
Technical level: {context.user_preferences.technical_level}
Preferred languages: {', '.join(context.user_preferences.preferred_languages)}
"""
    
    # Add specialist-specific context if available
    if specialist_name and specialist_name in context.specialist_insights:
        recent_insights = context.specialist_insights[specialist_name][-2:]
        if recent_insights:
            enhanced_request += f"\nRecent {specialist_name} insights: {json.dumps(recent_insights, indent=2)}"
    
    return enhanced_request.strip()


# Export main classes and functions
__all__ = [
    "SpecialistContext",
    "ExecutionMetadata", 
    "ConversationHistory",
    "UserPreferences",
    "SecurityLevel",
    "ContextPriority",
    "create_specialist_context",
    "enhance_request_with_context"
]