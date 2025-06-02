from datetime import datetime
from typing import Any


class EntityScorer:
    """Scores entities based on importance and recency."""

    def __init__(self):
        # Default importance weights by entity type
        self.type_weights = {
            "Person": 0.9,
            "Organization": 0.8,
            "Project": 0.7,
            "Task": 0.6,
            "Preference": 0.9,
            "Conversation": 0.5,
            "Fact": 0.7,
            "Default": 0.5,
        }

        # Time decay settings
        self.half_life_days = 30  # Importance halves every 30 days

    def score_entity(self, entity: dict[str, Any]) -> float:
        """Calculate an importance score for an entity."""
        # Base score by type
        entity_type = entity.get("type", "Default")
        base_score = self.type_weights.get(entity_type, self.type_weights["Default"])

        # Recency factor (time decay)
        recency_factor = self._calculate_recency_factor(entity)

        # Access frequency factor
        access_count = entity.get("accessCount", 0)
        frequency_factor = min(1.5, 1.0 + (access_count / 20))

        # Calculate final score
        final_score = base_score * recency_factor * frequency_factor

        # Scale to 0-10 range for easier interpretation
        return min(10.0, final_score * 10)

    def _calculate_recency_factor(self, entity: dict[str, Any]) -> float:
        """Calculate time decay factor based on entity age."""
        # Get the most recent timestamp (creation or update)
        last_updated = entity.get("updatedAt", entity.get("createdAt"))
        if not last_updated:
            return 1.0  # No timestamp, assume not stale

        try:
            # Parse the timestamp
            if isinstance(last_updated, str):
                last_update_time = datetime.fromisoformat(
                    last_updated.replace("Z", "+00:00")
                )
            else:
                last_update_time = last_updated

            # Calculate age in days
            now = datetime.now()
            age_days = (now - last_update_time).days

            # Calculate decay factor (exponential decay)
            decay_factor = 2 ** (-age_days / self.half_life_days)

            # Ensure the factor is between 0.1 and 1.0
            return max(0.1, min(1.0, decay_factor))
        except Exception:
            # If any parsing error, default to 1.0 (no decay)
            return 1.0
