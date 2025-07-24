"""
Memory Detection Patterns for VANA

This module provides patterns and utilities to detect important information
worth remembering from conversations. It identifies user identity, preferences,
goals, and other memorable facts using pattern matching and importance scoring.

Follows ADK patterns and integrates with callbacks for proactive memory saving.
"""

import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
from lib.logging_config import get_logger

logger = get_logger("vana.memory_detection")


class MemoryType(str, Enum):
    """Types of memories that can be detected and stored"""
    USER_IDENTITY = "user_identity"
    USER_PREFERENCE = "user_preference"
    USER_GOAL = "user_goal"
    USER_CONTEXT = "user_context"
    IMPORTANT_FACT = "important_fact"
    RELATIONSHIP = "relationship"
    RECURRING_TOPIC = "recurring_topic"
    TECHNICAL_PREFERENCE = "technical_preference"
    WORK_STYLE = "work_style"
    CHALLENGE = "challenge"
    SUCCESS_PATTERN = "success_pattern"
    EXPERTISE = "expertise"


@dataclass
class DetectedMemory:
    """Represents a detected piece of memorable information"""
    key: str  # Storage key (e.g., "name", "favorite_color")
    value: Any  # The actual value to remember
    memory_type: MemoryType
    importance_score: float  # 0.0 to 1.0
    context: Optional[str] = None  # Additional context
    confidence: float = 1.0  # How confident we are in the detection


class MemoryDetectionPatterns:
    """
    Detects important information from text using pattern matching.
    
    This class provides the core logic for identifying memorable information
    in conversations, scoring its importance, and structuring it for storage.
    """
    
    def __init__(self):
        """Initialize detection patterns"""
        # Compile regex patterns for efficiency
        self._compile_patterns()
        logger.info("✅ Memory detection patterns initialized")
    
    def _compile_patterns(self):
        """Compile regex patterns for various memory types"""
        
        # User Identity Patterns
        self.identity_patterns = {
            "name": [
                re.compile(r"my name is ([A-Za-z][A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s+and|\s*\.|\s*,|\s*$)", re.IGNORECASE),
                re.compile(r"call me ([A-Za-z][A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s+and|\s*\.|\s*,|\s*$|\s+but)", re.IGNORECASE),
                re.compile(r"i go by ([A-Za-z][A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s+and|\s*\.|\s*,|\s*$)", re.IGNORECASE),
                re.compile(r"(?:i am|i'm) called ([A-Za-z][A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s+and|\s*\.|\s*,|\s*$)", re.IGNORECASE),
                re.compile(r"they call me ([A-Za-z][A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s+and|\s*\.|\s*,|\s*$)", re.IGNORECASE),
                re.compile(r"everyone calls me ([A-Za-z][A-Za-z]+(?:\s+[A-Za-z]+)*)(?=\s+and|\s*\.|\s*,|\s*$)", re.IGNORECASE),
                # Special patterns for "I'm X" variations
                re.compile(r"(?:hi,?\s+)?i'?m ([A-Z][a-z]{2,})(?=\s+and|\s*\.|\s*,|\s*$|\s+from|\s+in|\s+but)", re.IGNORECASE),
            ],
            "occupation": [
                re.compile(r"i(?:'m| am) (?:a|an) ([a-zA-Z][a-zA-Z\s]+?[a-zA-Z])(?:\.|,|$|\s*and)", re.IGNORECASE),
                re.compile(r"i work as (?:a|an) ([a-zA-Z][a-zA-Z\s]+?[a-zA-Z])(?:\.|,|$|\s*and)", re.IGNORECASE),
                re.compile(r"my job is ([a-zA-Z][a-zA-Z\s]+?[a-zA-Z])(?:\.|,|$|\s*and)", re.IGNORECASE),
                re.compile(r"i(?:'m| am) working as (?:a|an) ([a-zA-Z][a-zA-Z\s]+?[a-zA-Z])(?:\.|,|$|\s*and)", re.IGNORECASE),
            ],
            "location": [
                re.compile(r"i live in ([A-Z][a-zA-Z\s,]+?)(?:\.|,|$|\s*and)", re.IGNORECASE),
                re.compile(r"i'?m from ([A-Z][a-zA-Z\s,]+?)(?:\.|,|$|\s*and)", re.IGNORECASE),
                re.compile(r"i'?m based in ([A-Z][a-zA-Z\s,]+?)(?:\.|,|$|\s*and)", re.IGNORECASE),
                re.compile(r"i'?m located in ([A-Z][a-zA-Z\s,]+?)(?:\.|,|$|\s*and)", re.IGNORECASE),
            ]
        }
        
        # Preference Patterns
        self.preference_patterns = {
            "likes": [
                re.compile(r"i (?:really )?(?:like|love|enjoy) ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
                re.compile(r"my favorite (\w+) is ([a-zA-Z][a-zA-Z\s]*?)(?:\.|,|$|\s*and)", re.IGNORECASE),
                re.compile(r"i prefer ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
            ],
            "dislikes": [
                re.compile(r"i (?:don't|do not|hate|dislike) (?:like )?([a-zA-Z][a-zA-Z\s]*?)(?:\.|,|$|\s*and)", re.IGNORECASE),
                re.compile(r"i'?m not (?:a fan of|into) ([a-zA-Z][a-zA-Z\s]*?)(?:\.|,|$|\s*and)", re.IGNORECASE),
            ]
        }
        
        # Goal Patterns
        self.goal_patterns = [
            re.compile(r"i want to ([a-zA-Z][a-zA-Z\s]+?[a-zA-Z])(?:\.|,|$|\s*and)", re.IGNORECASE),
            re.compile(r"i'?m (?:trying|planning|hoping|looking) to ([a-zA-Z][a-zA-Z\s]+?[a-zA-Z])(?:\.|,|$|\s*and)", re.IGNORECASE),
            re.compile(r"my goal is to ([a-zA-Z][a-zA-Z\s]+?[a-zA-Z])(?:\.|,|$|\s*and)", re.IGNORECASE),
            re.compile(r"i need (?:to|help with) ([a-zA-Z][a-zA-Z\s]+?[a-zA-Z])(?:\.|,|$|\s*and)", re.IGNORECASE),
        ]
        
        # Context/Situation Patterns
        self.context_patterns = [
            re.compile(r"i have (?:a|an) ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"i'?m (?:currently|now) ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"i just ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
        ]
        
        # Technical Preference Patterns
        self.tech_preference_patterns = [
            re.compile(r"i (?:prefer|like using|always use|usually use) ([a-zA-Z0-9\.\-\+\#]+) (?:over|instead of|rather than) ([a-zA-Z0-9\.\-\+\#]+)", re.IGNORECASE),
            re.compile(r"i (?:code|develop|program|work) (?:in|with|using) ([a-zA-Z0-9\.\-\+\#\s,]+?)(?:\.|,|$|\s+and)", re.IGNORECASE),
            re.compile(r"(?:we|our team|my team) (?:use|uses) ([a-zA-Z0-9\.\-\+\#\s,]+?)(?:\.|,|$|\s+for)", re.IGNORECASE),
            re.compile(r"i'?m (?:a|an) ([a-zA-Z0-9\.\-\+\#]+) (?:developer|engineer|programmer)", re.IGNORECASE),
        ]
        
        # Work Style Patterns
        self.work_style_patterns = [
            re.compile(r"i (?:usually|typically|always|often) work ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"i (?:prefer|like) (?:to work|working) ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"i'?m (?:most productive|at my best) ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"my (?:time zone|timezone) is ([A-Z]{2,4}|[A-Za-z\s/]+?)(?:\.|,|$)", re.IGNORECASE),
        ]
        
        # Challenge Patterns
        self.challenge_patterns = [
            re.compile(r"(?:i'?m|we'?re) (?:struggling|having issues|having problems) with ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"(?:the|our|my) (?:challenge|problem|issue) is ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"i (?:can't|cannot|couldn't) (?:get|make|figure out) ([a-zA-Z\s]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"([a-zA-Z\s]+?) (?:isn't|is not|won't|will not) working", re.IGNORECASE),
        ]
        
        # Success Pattern
        self.success_patterns = [
            re.compile(r"([a-zA-Z\s]+?) (?:worked|works) (?:great|well|perfectly)", re.IGNORECASE),
            re.compile(r"(?:that|this) ([a-zA-Z\s]+?) (?:helped|solved|fixed)", re.IGNORECASE),
            re.compile(r"thanks,? ([a-zA-Z\s]+?) (?:was|is) (?:helpful|useful|exactly what)", re.IGNORECASE),
        ]
        
        # Expertise Patterns
        self.expertise_patterns = [
            re.compile(r"i (?:have|'ve) ([0-9]+) years? (?:of experience|experience) (?:in|with) ([a-zA-Z\s,]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"i'?m (?:experienced|skilled|proficient) (?:in|with|at) ([a-zA-Z\s,]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"i (?:specialize|focus) (?:in|on) ([a-zA-Z\s,]+?)(?:\.|,|$)", re.IGNORECASE),
            re.compile(r"my (?:expertise|specialty|focus) is ([a-zA-Z\s,]+?)(?:\.|,|$)", re.IGNORECASE),
        ]
    
    def detect_memories(self, text: str) -> List[DetectedMemory]:
        """
        Detect all memorable information from a piece of text.
        
        Args:
            text: The text to analyze (user message or agent response)
            
        Returns:
            List of detected memories with importance scores
        """
        memories = []
        
        # Check for user identity
        memories.extend(self._detect_identity(text))
        
        # Check for preferences
        memories.extend(self._detect_preferences(text))
        
        # Check for goals
        memories.extend(self._detect_goals(text))
        
        # Check for context
        memories.extend(self._detect_context(text))
        
        # Check for technical preferences
        memories.extend(self._detect_technical_preferences(text))
        
        # Check for work style
        memories.extend(self._detect_work_style(text))
        
        # Check for challenges
        memories.extend(self._detect_challenges(text))
        
        # Check for success patterns
        memories.extend(self._detect_success_patterns(text))
        
        # Check for expertise
        memories.extend(self._detect_expertise(text))
        
        # Sort by importance score
        memories.sort(key=lambda m: m.importance_score, reverse=True)
        
        logger.debug(f"Detected {len(memories)} potential memories from text")
        return memories
    
    def _detect_identity(self, text: str) -> List[DetectedMemory]:
        """Detect user identity information"""
        memories = []
        
        # Check name patterns
        for pattern in self.identity_patterns["name"]:
            match = pattern.search(text)
            if match:
                name = match.group(1).strip()
                # Validate it's a proper name (not a common word)
                if self._is_valid_name(name):
                    # High importance for names
                    memories.append(DetectedMemory(
                        key="name",
                        value=name,
                        memory_type=MemoryType.USER_IDENTITY,
                        importance_score=0.95,
                        context=f"User introduced themselves as {name}"
                    ))
                    break  # Only capture first name match
        
        # Check occupation patterns
        for pattern in self.identity_patterns["occupation"]:
            match = pattern.search(text)
            if match:
                occupation = match.group(1).strip()
                memories.append(DetectedMemory(
                    key="occupation",
                    value=occupation,
                    memory_type=MemoryType.USER_IDENTITY,
                    importance_score=0.8,
                    context=f"User works as {occupation}"
                ))
                break
        
        # Check location patterns
        for pattern in self.identity_patterns["location"]:
            match = pattern.search(text)
            if match:
                location = match.group(1).strip()
                memories.append(DetectedMemory(
                    key="location",
                    value=location,
                    memory_type=MemoryType.USER_IDENTITY,
                    importance_score=0.7,
                    context=f"User is from/lives in {location}"
                ))
                break
        
        return memories
    
    def _detect_preferences(self, text: str) -> List[DetectedMemory]:
        """Detect user preferences"""
        memories = []
        
        # Check likes
        for pattern in self.preference_patterns["likes"]:
            matches = pattern.findall(text)
            for match in matches:
                if isinstance(match, tuple):
                    # For "my favorite X is Y" pattern
                    category, item = match
                    key = f"favorite_{category.lower()}"
                    value = item.strip()
                else:
                    # For simple likes
                    key = "likes"
                    value = match.strip()
                
                # Skip if value is too short or invalid
                if len(value) > 2:
                    memories.append(DetectedMemory(
                        key=key,
                        value=value,
                        memory_type=MemoryType.USER_PREFERENCE,
                        importance_score=0.6,
                        context=f"User likes/prefers {value}"
                    ))
        
        # Check dislikes
        for pattern in self.preference_patterns["dislikes"]:
            matches = pattern.findall(text)
            for match in matches:
                value = match.strip()
                # Skip if value is too short
                if len(value) > 2:
                    memories.append(DetectedMemory(
                        key="dislikes",
                        value=value,
                        memory_type=MemoryType.USER_PREFERENCE,
                        importance_score=0.5,
                        context=f"User dislikes {value}"
                    ))
        
        return memories
    
    def _detect_goals(self, text: str) -> List[DetectedMemory]:
        """Detect user goals and objectives"""
        memories = []
        
        for pattern in self.goal_patterns:
            matches = pattern.findall(text)
            for match in matches:
                goal = match.strip()
                memories.append(DetectedMemory(
                    key="goal",
                    value=goal,
                    memory_type=MemoryType.USER_GOAL,
                    importance_score=0.75,
                    context=f"User wants to {goal}"
                ))
        
        return memories
    
    def _detect_context(self, text: str) -> List[DetectedMemory]:
        """Detect contextual information about user's situation"""
        memories = []
        
        for pattern in self.context_patterns:
            matches = pattern.findall(text)
            for match in matches:
                context_info = match.strip()
                memories.append(DetectedMemory(
                    key="context",
                    value=context_info,
                    memory_type=MemoryType.USER_CONTEXT,
                    importance_score=0.4,
                    context=f"User mentioned: {context_info}"
                ))
        
        return memories
    
    def _detect_technical_preferences(self, text: str) -> List[DetectedMemory]:
        """Detect technical preferences and stack choices"""
        memories = []
        
        for i, pattern in enumerate(self.tech_preference_patterns):
            if i == 0:  # Preference comparison pattern
                match = pattern.search(text)
                if match:
                    preferred = match.group(1).strip()
                    over = match.group(2).strip()
                    memories.append(DetectedMemory(
                        key="tech_preference",
                        value=f"{preferred} over {over}",
                        memory_type=MemoryType.TECHNICAL_PREFERENCE,
                        importance_score=0.8,
                        context=f"User prefers {preferred} over {over}"
                    ))
            else:
                matches = pattern.findall(text)
                for match in matches:
                    tech = match.strip()
                    if len(tech) > 1:  # Skip single characters
                        memories.append(DetectedMemory(
                            key="tech_stack",
                            value=tech,
                            memory_type=MemoryType.TECHNICAL_PREFERENCE,
                            importance_score=0.75,
                            context=f"User works with {tech}"
                        ))
        
        return memories
    
    def _detect_work_style(self, text: str) -> List[DetectedMemory]:
        """Detect work style and habits"""
        memories = []
        
        for pattern in self.work_style_patterns:
            matches = pattern.findall(text)
            for match in matches:
                style = match.strip()
                if "timezone" in pattern.pattern or "time zone" in pattern.pattern:
                    memories.append(DetectedMemory(
                        key="timezone",
                        value=style,
                        memory_type=MemoryType.WORK_STYLE,
                        importance_score=0.7,
                        context=f"User's timezone is {style}"
                    ))
                else:
                    memories.append(DetectedMemory(
                        key="work_style",
                        value=style,
                        memory_type=MemoryType.WORK_STYLE,
                        importance_score=0.6,
                        context=f"User work style: {style}"
                    ))
        
        return memories
    
    def _detect_challenges(self, text: str) -> List[DetectedMemory]:
        """Detect challenges and problems user is facing"""
        memories = []
        
        for pattern in self.challenge_patterns:
            matches = pattern.findall(text)
            for match in matches:
                challenge = match.strip()
                if len(challenge) > 3:  # Skip very short matches
                    memories.append(DetectedMemory(
                        key="current_challenge",
                        value=challenge,
                        memory_type=MemoryType.CHALLENGE,
                        importance_score=0.85,  # High importance for challenges
                        context=f"User is struggling with {challenge}"
                    ))
        
        return memories
    
    def _detect_success_patterns(self, text: str) -> List[DetectedMemory]:
        """Detect what works well for the user"""
        memories = []
        
        for pattern in self.success_patterns:
            matches = pattern.findall(text)
            for match in matches:
                success = match.strip()
                if len(success) > 3:
                    memories.append(DetectedMemory(
                        key="successful_approach",
                        value=success,
                        memory_type=MemoryType.SUCCESS_PATTERN,
                        importance_score=0.8,
                        context=f"This worked well: {success}"
                    ))
        
        return memories
    
    def _detect_expertise(self, text: str) -> List[DetectedMemory]:
        """Detect user's expertise and experience"""
        memories = []
        
        for i, pattern in enumerate(self.expertise_patterns):
            if i == 0:  # Years of experience pattern
                match = pattern.search(text)
                if match:
                    years = match.group(1)
                    area = match.group(2).strip()
                    memories.append(DetectedMemory(
                        key="experience",
                        value=f"{years} years in {area}",
                        memory_type=MemoryType.EXPERTISE,
                        importance_score=0.9,
                        context=f"User has {years} years experience in {area}"
                    ))
                    memories.append(DetectedMemory(
                        key="expertise_areas",
                        value=area,
                        memory_type=MemoryType.EXPERTISE,
                        importance_score=0.85,
                        context=f"User is experienced in {area}"
                    ))
            else:
                matches = pattern.findall(text)
                for match in matches:
                    expertise = match.strip()
                    memories.append(DetectedMemory(
                        key="expertise_areas",
                        value=expertise,
                        memory_type=MemoryType.EXPERTISE,
                        importance_score=0.85,
                        context=f"User expertise: {expertise}"
                    ))
        
        return memories
    
    def _is_valid_name(self, name: str) -> bool:
        """
        Validate if a string is likely to be a proper name.
        
        Args:
            name: The potential name to validate
            
        Returns:
            True if likely a valid name, False otherwise
        """
        # Common words that shouldn't be names
        invalid_names = {
            'a', 'an', 'the', 'is', 'are', 'was', 'were', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'could', 'not', 'no',
            'trying', 'going', 'doing', 'making', 'taking', 'getting', 'having',
            'wanting', 'needing', 'looking', 'working', 'thinking', 'feeling',
            'knowing', 'saying', 'telling', 'asking', 'talking', 'walking'
        }
        
        name_lower = name.lower()
        
        # Reject if it's a common word
        if name_lower in invalid_names:
            return False
        
        # Reject if too short (unless it's a known short name)
        short_names = {'al', 'jo', 'bo', 'ty', 'cy', 'ed', 'max', 'sam', 'ben', 'tom', 'jim'}
        if len(name) < 2 or (len(name) == 2 and name_lower not in short_names):
            return False
        
        # Reject if it contains numbers
        if any(char.isdigit() for char in name):
            return False
        
        # Accept if it starts with a capital letter (common for names)
        if name[0].isupper():
            return True
        
        # Otherwise accept names that are at least 3 characters
        return len(name) >= 3
    
    def score_importance(self, memory: DetectedMemory, existing_memories: Dict[str, Any]) -> float:
        """
        Score the importance of a memory considering existing memories.
        
        Args:
            memory: The detected memory to score
            existing_memories: Dictionary of already stored memories
            
        Returns:
            Adjusted importance score (0.0 to 1.0)
        """
        score = memory.importance_score
        
        # Boost score if this updates existing information
        if memory.key in existing_memories:
            score *= 1.2  # 20% boost for updates
        
        # Boost score for identity information if we don't have much
        if memory.memory_type == MemoryType.USER_IDENTITY:
            identity_count = sum(1 for k in existing_memories.keys() 
                               if k in ["name", "occupation", "location"])
            if identity_count < 2:
                score *= 1.3  # 30% boost if we have little identity info
        
        # Cap at 1.0
        return min(score, 1.0)
    
    def filter_memories(self, memories: List[DetectedMemory], threshold: float = 0.5) -> List[DetectedMemory]:
        """
        Filter memories by importance threshold.
        
        Args:
            memories: List of detected memories
            threshold: Minimum importance score to keep (0.0 to 1.0)
            
        Returns:
            Filtered list of important memories
        """
        return [m for m in memories if m.importance_score >= threshold]


# Factory function following issue #53 pattern
def create_memory_detector() -> MemoryDetectionPatterns:
    """
    Factory function to create a fresh MemoryDetectionPatterns instance.
    
    This prevents singleton issues in multi-agent systems.
    
    Returns:
        MemoryDetectionPatterns: Fresh instance for memory detection
    """
    return MemoryDetectionPatterns()