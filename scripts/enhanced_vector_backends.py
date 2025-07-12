#!/usr/bin/env python3
"""
Enhanced Vector Database Backends
Multiple backend options for different performance needs
"""

import json
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Dict, List, Optional


class VectorBackend(ABC):
    """Abstract base class for vector database backends"""

    @abstractmethod
    async def store_vectors(
        self, documents: List[str], embeddings: List[List[float]], metadata: List[Dict]
    ) -> List[str]:
        """Store vectors with metadata"""
        pass

    @abstractmethod
    async def search_vectors(self, query_embedding: List[float], n_results: int = 5) -> List[Dict]:
        """Search for similar vectors"""
        pass

    @abstractmethod
    async def delete_vectors(self, ids: List[str]) -> bool:
        """Delete vectors by IDs"""
        pass


class ChromaDBBackend(VectorBackend):
    """ChromaDB backend - default lightweight option"""

    def __init__(self, db_path: str = ".memory_db"):
        import chromadb

        self.client = chromadb.PersistentClient(path=db_path)
        self.collection = self.client.get_or_create_collection("vana_memory", metadata={"hnsw:space": "cosine"})

    async def store_vectors(
        self, documents: List[str], embeddings: List[List[float]], metadata: List[Dict]
    ) -> List[str]:
        import hashlib
        from datetime import datetime

        ids = []
        for i, doc in enumerate(documents):
            doc_id = f"{hashlib.md5(doc.encode()).hexdigest()[:12]}_{int(datetime.utcnow().timestamp())}"
            ids.append(doc_id)

        self.collection.add(documents=documents, embeddings=embeddings, metadatas=metadata, ids=ids)

        return ids

    async def search_vectors(self, query_embedding: List[float], n_results: int = 5) -> List[Dict]:
        results = self.collection.query(
            query_embeddings=[query_embedding], n_results=n_results, include=["documents", "metadatas", "distances"]
        )

        formatted_results = []
        for i in range(len(results["documents"][0])):
            formatted_results.append(
                {
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "similarity_score": 1 - results["distances"][0][i],
                    "id": results["ids"][0][i] if "ids" in results else f"result_{i}",
                }
            )

        return formatted_results

    async def delete_vectors(self, ids: List[str]) -> bool:
        try:
            self.collection.delete(ids=ids)
            return True
        except Exception:
            return False


class PostgresVectorBackend(VectorBackend):
    """PostgreSQL with pgvector extension - for SQL familiarity"""

    def __init__(self, connection_string: str = None):
        try:
            import numpy as np
            import psycopg2
        except ImportError:
            raise ImportError("Install psycopg2-binary and numpy for Postgres backend")

        if not connection_string:
            connection_string = os.getenv(
                "POSTGRES_CONNECTION", "postgresql://user:password@localhost:5432/vana_memory"
            )

        self.connection_string = connection_string
        self._setup_tables()

    def _setup_tables(self):
        """Setup vector tables with pgvector extension"""
        import psycopg2

        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cur:
                # Enable vector extension
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

                # Create memory table
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS vana_memory (
                        id VARCHAR PRIMARY KEY,
                        content TEXT NOT NULL,
                        embedding vector(384),
                        metadata JSONB,
                        created_at TIMESTAMP DEFAULT NOW()
                    );
                """
                )

                # Create index for vector similarity search
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS vana_memory_embedding_idx 
                    ON vana_memory USING ivfflat (embedding vector_cosine_ops)
                    WITH (lists = 100);
                """
                )

                conn.commit()

    async def store_vectors(
        self, documents: List[str], embeddings: List[List[float]], metadata: List[Dict]
    ) -> List[str]:
        import hashlib
        from datetime import datetime

        import psycopg2

        ids = []
        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cur:
                for i, (doc, embedding, meta) in enumerate(zip(documents, embeddings, metadata)):
                    doc_id = f"{hashlib.md5(doc.encode()).hexdigest()[:12]}_{int(datetime.utcnow().timestamp())}"
                    ids.append(doc_id)

                    cur.execute(
                        """
                        INSERT INTO vana_memory (id, content, embedding, metadata)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (id) DO UPDATE SET
                            content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            metadata = EXCLUDED.metadata;
                    """,
                        (doc_id, doc, embedding, json.dumps(meta)),
                    )

                conn.commit()

        return ids

    async def search_vectors(self, query_embedding: List[float], n_results: int = 5) -> List[Dict]:
        import psycopg2

        with psycopg2.connect(self.connection_string) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id, content, metadata, 
                           1 - (embedding <=> %s::vector) as similarity_score
                    FROM vana_memory
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s;
                """,
                    (query_embedding, query_embedding, n_results),
                )

                results = []
                for row in cur.fetchall():
                    results.append(
                        {
                            "id": row[0],
                            "content": row[1],
                            "metadata": json.loads(row[2]) if row[2] else {},
                            "similarity_score": float(row[3]),
                        }
                    )

                return results

    async def delete_vectors(self, ids: List[str]) -> bool:
        import psycopg2

        try:
            with psycopg2.connect(self.connection_string) as conn:
                with conn.cursor() as cur:
                    cur.execute("DELETE FROM vana_memory WHERE id = ANY(%s);", (ids,))
                    conn.commit()
            return True
        except Exception:
            return False


class LanceDBBackend(VectorBackend):
    """LanceDB backend - high performance option"""

    def __init__(self, db_path: str = ".lance_db"):
        try:
            import lancedb
            import pyarrow as pa
        except ImportError:
            raise ImportError("Install lancedb and pyarrow for LanceDB backend")

        self.db = lancedb.connect(db_path)

        # Define schema
        self.schema = pa.schema(
            [
                pa.field("id", pa.string()),
                pa.field("content", pa.string()),
                pa.field("vector", pa.list_(pa.float32(), 384)),
                pa.field("metadata", pa.string()),  # JSON string
            ]
        )

        # Create table if it doesn't exist
        try:
            self.table = self.db.open_table("vana_memory")
        except Exception:
            # Create table with empty data
            import pyarrow as pa

            empty_data = pa.table({"id": [], "content": [], "vector": [], "metadata": []}, schema=self.schema)
            self.table = self.db.create_table("vana_memory", empty_data)

    async def store_vectors(
        self, documents: List[str], embeddings: List[List[float]], metadata: List[Dict]
    ) -> List[str]:
        import hashlib
        from datetime import datetime

        import pyarrow as pa

        ids = []
        data_rows = []

        for doc, embedding, meta in zip(documents, embeddings, metadata):
            doc_id = f"{hashlib.md5(doc.encode()).hexdigest()[:12]}_{int(datetime.utcnow().timestamp())}"
            ids.append(doc_id)

            data_rows.append({"id": doc_id, "content": doc, "vector": embedding, "metadata": json.dumps(meta)})

        # Convert to PyArrow table
        new_data = pa.table(data_rows, schema=self.schema)

        # Add to LanceDB
        self.table.add(new_data)

        return ids

    async def search_vectors(self, query_embedding: List[float], n_results: int = 5) -> List[Dict]:
        results = self.table.search(query_embedding).limit(n_results).to_pandas()

        formatted_results = []
        for _, row in results.iterrows():
            formatted_results.append(
                {
                    "id": row["id"],
                    "content": row["content"],
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
                    "similarity_score": 1 - row["_distance"],  # Convert distance to similarity
                }
            )

        return formatted_results

    async def delete_vectors(self, ids: List[str]) -> bool:
        try:
            # LanceDB delete by condition
            for doc_id in ids:
                self.table.delete(f"id = '{doc_id}'")
            return True
        except Exception:
            return False


class VectorBackendFactory:
    """Factory for creating vector backends"""

    @staticmethod
    def create_backend(backend_type: str = "chromadb", **kwargs) -> VectorBackend:
        """Create vector backend based on type"""

        if backend_type.lower() == "chromadb":
            return ChromaDBBackend(kwargs.get("db_path", ".memory_db"))

        elif backend_type.lower() == "postgres":
            return PostgresVectorBackend(kwargs.get("connection_string"))

        elif backend_type.lower() == "lancedb":
            return LanceDBBackend(kwargs.get("db_path", ".lance_db"))

        else:
            raise ValueError(f"Unsupported backend type: {backend_type}")

    @staticmethod
    def get_recommended_backend() -> str:
        """Get recommended backend based on environment"""

        # Check if Postgres is available
        postgres_available = os.getenv("POSTGRES_CONNECTION") is not None

        # Check if user has SQL experience (could be detected or configured)
        sql_experience = os.getenv("USER_SQL_EXPERIENCE", "false").lower() == "true"

        # Check for performance requirements
        high_performance_needed = os.getenv("HIGH_PERFORMANCE_MEMORY", "false").lower() == "true"

        if postgres_available and sql_experience:
            return "postgres"
        elif high_performance_needed:
            return "lancedb"
        else:
            return "chromadb"  # Default lightweight option


# Usage example
async def example_usage():
    """Example of using different backends"""

    # Get recommended backend
    backend_type = VectorBackendFactory.get_recommended_backend()
    backend = VectorBackendFactory.create_backend(backend_type)

    # Test storage and search
    documents = ["VANA requires Python 3.13+", "Deploy to Google Cloud Run"]
    embeddings = [[0.1] * 384, [0.2] * 384]  # Dummy embeddings
    metadata = [{"type": "requirement"}, {"type": "deployment"}]

    # Store
    ids = await backend.store_vectors(documents, embeddings, metadata)
    print(f"Stored {len(ids)} vectors")

    # Search
    query_embedding = [0.15] * 384  # Dummy query embedding
    results = await backend.search_vectors(query_embedding, n_results=2)
    print(f"Found {len(results)} similar vectors")


if __name__ == "__main__":
    import asyncio

    asyncio.run(example_usage())
