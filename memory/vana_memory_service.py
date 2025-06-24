"""VANA Memory Service stub for testing."""


class VertexAiRagMemoryService:
    def __init__(self, rag_corpus, similarity_top_k=5, vector_distance_threshold=0.7):
        self.rag_corpus = rag_corpus
        self.similarity_top_k = similarity_top_k
        self.vector_distance_threshold = vector_distance_threshold

    def is_available(self):
        return True

    def add_session_to_memory(self, session):
        return {"status": "success"}

    def search_memory(self, query, limit=5):
        return {"results": []}

    def get_memory_stats(self):
        return {
            "total_sessions": 0,
            "total_documents": 0,
            "memory_usage_mb": 0,
            "last_updated": "2025-01-01T00:00:00Z",
            "rag_corpus": self.rag_corpus,
        }


# Alias for backward compatibility
VanaMemoryService = VertexAiRagMemoryService
