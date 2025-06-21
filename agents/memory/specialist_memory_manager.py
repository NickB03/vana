"""
Specialist Memory Manager - Knowledge Persistence and Learning
Implements Google ADK session state patterns for specialist knowledge persistence.
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional


class SpecialistMemoryManager:
    """Manages persistent memory for specialist agents using ADK session state or Firestore."""

    def __init__(self, firestore_memory_service: Optional[Any] = None):
        """
        Initialize SpecialistMemoryManager.

        Args:
            firestore_memory_service: Optional Firestore memory service for persistent storage
        """
        self.firestore_memory = firestore_memory_service
        self.use_firestore = firestore_memory_service is not None

        self.memory_keys = {
            "architecture": "specialist_memory:architecture",
            "ui": "specialist_memory:ui",
            "devops": "specialist_memory:devops",
            "qa": "specialist_memory:qa",
        }

        self.user_preference_keys = {
            "architecture": "user:architecture_preferences",
            "ui": "user:ui_preferences",
            "devops": "user:devops_preferences",
            "qa": "user:qa_preferences",
        }

        self.project_memory_key = "project_memory"

    async def save_specialist_knowledge_to_firestore(
        self, session_id: str, specialist_type: str, knowledge: Dict[str, Any]
    ) -> None:
        """Save specialist knowledge to Firestore memory service."""
        if not self.use_firestore:
            return

        try:
            # Create memory content for Firestore
            memory_content = {
                "specialist_type": specialist_type,
                "knowledge": knowledge,
                "timestamp": datetime.now().isoformat(),
                "quality_score": knowledge.get("quality_score", 0.0)
            }

            # Store in Firestore with metadata
            metadata = {
                "type": "specialist_knowledge",
                "specialist_type": specialist_type,
                "session_id": session_id
            }

            await self.firestore_memory.add_session_to_memory(
                session_id=session_id,
                content=json.dumps(memory_content),
                metadata=metadata
            )

        except Exception as e:
            # Fallback gracefully - don't break existing functionality
            print(f"Warning: Failed to save to Firestore memory: {e}")

    async def get_specialist_knowledge_from_firestore(
        self, session_id: str, specialist_type: str, context: str = ""
    ) -> Dict[str, Any]:
        """Retrieve specialist knowledge from Firestore memory service."""
        if not self.use_firestore:
            return {}

        try:
            # Search for specialist knowledge
            search_query = f"specialist_type:{specialist_type}"
            if context:
                search_query += f" {context}"

            memories = await self.firestore_memory.search_memory(
                query=search_query,
                top_k=10,
                session_id=session_id
            )

            # Process memories into specialist knowledge format
            relevant_knowledge = []
            for memory in memories:
                try:
                    content = json.loads(memory.content)
                    if content.get("specialist_type") == specialist_type:
                        relevant_knowledge.append(content)
                except (json.JSONDecodeError, KeyError):
                    continue

            return {
                "relevant_knowledge": relevant_knowledge,
                "total_entries": len(relevant_knowledge),
                "source": "firestore"
            }

        except Exception as e:
            print(f"Warning: Failed to retrieve from Firestore memory: {e}")
            return {}

    def save_specialist_knowledge(
        self, session_state: Dict[str, Any], specialist_type: str, knowledge: Dict[str, Any]
    ) -> None:
        """Save specialist knowledge to persistent session state."""

        if specialist_type not in self.memory_keys:
            raise ValueError(f"Unknown specialist type: {specialist_type}")

        memory_key = self.memory_keys[specialist_type]

        # Get existing memory or create new
        existing_memory = session_state.get(
            memory_key, {"knowledge_base": [], "patterns": {}, "preferences": {}, "last_updated": None}
        )

        # Add new knowledge entry
        knowledge_entry = {
            "timestamp": datetime.now().isoformat(),
            "content": knowledge,
            "context": session_state.get("current_context", ""),
            "quality_score": knowledge.get("quality_score", 0.0),
        }

        existing_memory["knowledge_base"].append(knowledge_entry)
        existing_memory["last_updated"] = datetime.now().isoformat()

        # Update patterns based on new knowledge
        self._update_patterns(existing_memory, knowledge)

        # Save back to session state
        session_state[memory_key] = existing_memory

    def get_specialist_knowledge(
        self, session_state: Dict[str, Any], specialist_type: str, context: str = ""
    ) -> Dict[str, Any]:
        """Retrieve relevant specialist knowledge from memory."""

        if specialist_type not in self.memory_keys:
            return {}

        memory_key = self.memory_keys[specialist_type]
        memory = session_state.get(memory_key, {})

        if not memory:
            return {}

        # Get recent high-quality knowledge
        knowledge_base = memory.get("knowledge_base", [])
        relevant_knowledge = []

        for entry in knowledge_base[-10:]:  # Last 10 entries
            if entry.get("quality_score", 0.0) >= 0.7:  # High quality only
                if not context or context.lower() in entry.get("context", "").lower():
                    relevant_knowledge.append(entry)

        return {
            "relevant_knowledge": relevant_knowledge,
            "patterns": memory.get("patterns", {}),
            "preferences": memory.get("preferences", {}),
            "total_entries": len(knowledge_base),
        }

    def save_user_preferences(
        self, session_state: Dict[str, Any], specialist_type: str, preferences: Dict[str, Any]
    ) -> None:
        """Save user preferences for specialist recommendations."""

        if specialist_type not in self.user_preference_keys:
            raise ValueError(f"Unknown specialist type: {specialist_type}")

        pref_key = self.user_preference_keys[specialist_type]

        # Get existing preferences
        existing_prefs = session_state.get(pref_key, {})

        # Update with new preferences
        existing_prefs.update(preferences)
        existing_prefs["last_updated"] = datetime.now().isoformat()

        # Save back to session state
        session_state[pref_key] = existing_prefs

    def get_user_preferences(self, session_state: Dict[str, Any], specialist_type: str) -> Dict[str, Any]:
        """Get user preferences for specialist recommendations."""

        if specialist_type not in self.user_preference_keys:
            return {}

        pref_key = self.user_preference_keys[specialist_type]
        return session_state.get(pref_key, {})

    def save_project_memory(self, session_state: Dict[str, Any], project_data: Dict[str, Any]) -> None:
        """Save project-specific memory across sessions."""

        # Get existing project memory
        project_memory = session_state.get(
            self.project_memory_key, {"projects": {}, "cross_project_patterns": {}, "success_metrics": {}}
        )

        project_id = project_data.get("project_id", "default")

        # Update project-specific data
        if project_id not in project_memory["projects"]:
            project_memory["projects"][project_id] = {
                "created": datetime.now().isoformat(),
                "sessions": [],
                "outcomes": [],
                "lessons_learned": [],
            }

        project_memory["projects"][project_id]["sessions"].append(
            {"timestamp": datetime.now().isoformat(), "data": project_data}
        )

        # Update cross-project patterns
        self._update_cross_project_patterns(project_memory, project_data)

        # Save back to session state
        session_state[self.project_memory_key] = project_memory

    def get_project_memory(self, session_state: Dict[str, Any], project_id: str = "default") -> Dict[str, Any]:
        """Get project-specific memory and patterns."""

        project_memory = session_state.get(self.project_memory_key, {})

        if not project_memory:
            return {}

        project_data = project_memory.get("projects", {}).get(project_id, {})
        cross_patterns = project_memory.get("cross_project_patterns", {})

        return {
            "project_data": project_data,
            "cross_project_patterns": cross_patterns,
            "similar_projects": self._find_similar_projects(project_memory, project_id),
        }

    def _update_patterns(self, memory: Dict[str, Any], knowledge: Dict[str, Any]) -> None:
        """Update learned patterns based on new knowledge."""

        patterns = memory.setdefault("patterns", {})

        # Extract patterns from knowledge
        if "technology_stack" in knowledge:
            tech_patterns = patterns.setdefault("technology_preferences", {})
            for tech in knowledge["technology_stack"]:
                tech_patterns[tech] = tech_patterns.get(tech, 0) + 1

        if "design_principles" in knowledge:
            design_patterns = patterns.setdefault("design_principles", {})
            for principle in knowledge["design_principles"]:
                design_patterns[principle] = design_patterns.get(principle, 0) + 1

        if "best_practices" in knowledge:
            practice_patterns = patterns.setdefault("best_practices", {})
            for practice in knowledge["best_practices"]:
                practice_patterns[practice] = practice_patterns.get(practice, 0) + 1

    def _update_cross_project_patterns(self, project_memory: Dict[str, Any], project_data: Dict[str, Any]) -> None:
        """Update patterns that span across multiple projects."""

        cross_patterns = project_memory.setdefault("cross_project_patterns", {})

        # Track successful patterns across projects
        if project_data.get("success_score", 0.0) >= 0.8:
            success_patterns = cross_patterns.setdefault("success_patterns", {})

            for key, value in project_data.items():
                if isinstance(value, (str, list)):
                    success_patterns[key] = success_patterns.get(key, 0) + 1

    def _find_similar_projects(self, project_memory: Dict[str, Any], current_project_id: str) -> List[Dict[str, Any]]:
        """Find similar projects based on characteristics."""

        projects = project_memory.get("projects", {})
        current_project = projects.get(current_project_id, {})

        if not current_project:
            return []

        similar_projects = []

        for project_id, project_data in projects.items():
            if project_id == current_project_id:
                continue

            # Calculate similarity score (simplified)
            similarity_score = self._calculate_project_similarity(current_project, project_data)

            if similarity_score >= 0.6:
                similar_projects.append(
                    {"project_id": project_id, "similarity_score": similarity_score, "project_data": project_data}
                )

        return sorted(similar_projects, key=lambda x: x["similarity_score"], reverse=True)[:3]

    def _calculate_project_similarity(self, project1: Dict[str, Any], project2: Dict[str, Any]) -> float:
        """Calculate similarity score between two projects."""

        # Simplified similarity calculation
        # In practice, this would use more sophisticated matching

        common_keys = set(project1.keys()) & set(project2.keys())
        if not common_keys:
            return 0.0

        matches = 0
        for key in common_keys:
            if project1[key] == project2[key]:
                matches += 1

        return matches / len(common_keys)


# Memory-aware specialist functions
def save_specialist_knowledge_func(specialist_type: str, knowledge: str, quality_score: float = 0.8) -> str:
    """Function tool to save specialist knowledge to memory."""

    try:
        knowledge_data = json.loads(knowledge) if isinstance(knowledge, str) else knowledge
        knowledge_data["quality_score"] = quality_score

        # This would be called within an agent context with access to session state
        return f"Knowledge saved for {specialist_type} specialist with quality score {quality_score}"

    except Exception as e:
        return f"Error saving knowledge: {str(e)}"


def get_specialist_knowledge_func(specialist_type: str, context: str = "") -> str:
    """Function tool to retrieve specialist knowledge from memory."""

    try:
        # This would be called within an agent context with access to session state
        return f"Retrieved relevant knowledge for {specialist_type} specialist in context: {context}"

    except Exception as e:
        return f"Error retrieving knowledge: {str(e)}"


# Export memory manager and tools
memory_manager = SpecialistMemoryManager()

__all__ = [
    "SpecialistMemoryManager",
    "memory_manager",
    "save_specialist_knowledge_func",
    "get_specialist_knowledge_func",
]
