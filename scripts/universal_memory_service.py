#!/usr/bin/env python3
"""
Universal Memory Service
Global memory system that works across all projects and coding agents
"""

import asyncio
import json
import hashlib
import aiohttp
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from aiohttp import web
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ProjectInfo:
    """Information about a detected project"""
    id: str
    name: str
    type: str  # 'git', 'package', 'directory'
    root: str
    tech_stack: List[str]
    last_accessed: str
    memory_collection: str

class ProjectDetector:
    """Detects and manages project information"""
    
    def __init__(self):
        self.known_projects = {}
        self.projects_file = Path.home() / ".ai-memory" / "config" / "projects.json"
        self._load_known_projects()
    
    def _load_known_projects(self):
        """Load known projects from disk"""
        if self.projects_file.exists():
            try:
                with open(self.projects_file) as f:
                    data = json.load(f)
                    self.known_projects = {
                        pid: ProjectInfo(**pinfo) for pid, pinfo in data.items()
                    }
            except Exception as e:
                logger.error(f"Error loading projects: {e}")
    
    def _save_known_projects(self):
        """Save known projects to disk"""
        self.projects_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.projects_file, 'w') as f:
            json.dump({
                pid: asdict(pinfo) for pid, pinfo in self.known_projects.items()
            }, f, indent=2)
    
    def detect_project(self, file_path: str) -> ProjectInfo:
        """Detect project information from file path"""
        
        current_dir = Path(file_path).resolve().parent
        
        # Check if we already know about this project
        for project in self.known_projects.values():
            if str(current_dir).startswith(project.root):
                project.last_accessed = datetime.utcnow().isoformat()
                self._save_known_projects()
                return project
        
        # Walk up directory tree to find project root
        for parent in [current_dir] + list(current_dir.parents):
            
            # Git repository
            if (parent / '.git').exists():
                project = self._create_project_info(parent, 'git')
                break
            
            # Package-based projects
            package_files = {
                'package.json': 'node',
                'pyproject.toml': 'python',
                'Cargo.toml': 'rust',
                'go.mod': 'go',
                'pom.xml': 'java'
            }
            
            for package_file, tech in package_files.items():
                if (parent / package_file).exists():
                    project = self._create_project_info(parent, 'package', [tech])
                    break
            else:
                continue
            break
        else:
            # Fallback: directory-based project
            project = self._create_project_info(current_dir, 'directory')
        
        # Register new project
        self.known_projects[project.id] = project
        self._save_known_projects()
        
        return project
    
    def _create_project_info(self, root: Path, project_type: str, tech_stack: List[str] = None) -> ProjectInfo:
        """Create project info from directory"""
        
        project_id = hashlib.md5(str(root).encode()).hexdigest()[:12]
        
        if tech_stack is None:
            tech_stack = self._detect_tech_stack(root)
        
        return ProjectInfo(
            id=project_id,
            name=root.name,
            type=project_type,
            root=str(root),
            tech_stack=tech_stack,
            last_accessed=datetime.utcnow().isoformat(),
            memory_collection=f"project_{project_id}"
        )
    
    def _detect_tech_stack(self, root: Path) -> List[str]:
        """Detect technology stack from project files"""
        
        tech_stack = []
        
        # File-based detection
        tech_indicators = {
            'package.json': 'javascript',
            'pyproject.toml': 'python',
            'requirements.txt': 'python', 
            'Cargo.toml': 'rust',
            'go.mod': 'go',
            'pom.xml': 'java',
            'Gemfile': 'ruby',
            'composer.json': 'php'
        }
        
        for file, tech in tech_indicators.items():
            if (root / file).exists():
                tech_stack.append(tech)
        
        # Directory-based detection
        if (root / 'src').exists():
            tech_stack.append('src-based')
        
        if (root / 'docs').exists():
            tech_stack.append('documented')
        
        # Framework detection
        if (root / 'next.config.js').exists():
            tech_stack.append('nextjs')
        elif (root / 'nuxt.config.js').exists():
            tech_stack.append('nuxtjs')
        elif (root / 'angular.json').exists():
            tech_stack.append('angular')
        
        return tech_stack or ['unknown']

class UniversalMemoryService:
    """Global memory service that works across all projects"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = str(Path.home() / ".ai-memory" / "database")
        
        self.db_path = Path(db_path)
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize components
        self.project_detector = ProjectDetector()
        self.memory_backends = {}  # Will hold different memory backends
        
        # Initialize vector database
        self._init_vector_database()
        
        # Memory scopes
        self.memory_scopes = {
            'current_project': self._search_current_project,
            'related_projects': self._search_related_projects,
            'global_knowledge': self._search_global_knowledge,
            'auto_scope': self._search_intelligent_scope
        }
    
    def _init_vector_database(self):
        """Initialize vector database backends"""
        try:
            import chromadb
            from sentence_transformers import SentenceTransformer
            
            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(path=str(self.db_path))
            self.model = SentenceTransformer("all-MiniLM-L6-v2")
            
            # Global collections
            self.global_collection = self.client.get_or_create_collection(
                "global_knowledge",
                metadata={"hnsw:space": "cosine"}
            )
            
            self.user_collection = self.client.get_or_create_collection(
                "user_preferences", 
                metadata={"hnsw:space": "cosine"}
            )
            
            logger.info("Vector database initialized successfully")
            
        except ImportError:
            logger.error("ChromaDB or sentence-transformers not installed")
            raise
    
    def get_project_collection(self, project_id: str):
        """Get or create collection for specific project"""
        collection_name = f"project_{project_id}"
        
        if collection_name not in self.memory_backends:
            self.memory_backends[collection_name] = self.client.get_or_create_collection(
                collection_name,
                metadata={"hnsw:space": "cosine", "project_id": project_id}
            )
        
        return self.memory_backends[collection_name]
    
    async def store_memory(self, content: str, metadata: Dict[str, Any], project_path: str = None) -> str:
        """Store memory with automatic project detection and scoping"""
        
        # Detect project if path provided
        project_info = None
        if project_path:
            project_info = self.project_detector.detect_project(project_path)
        
        # Enhance metadata
        enhanced_metadata = {
            **metadata,
            "timestamp": datetime.utcnow().isoformat(),
            "content_hash": hashlib.md5(content.encode()).hexdigest()[:12],
            "content_length": len(content)
        }
        
        if project_info:
            enhanced_metadata.update({
                "project_id": project_info.id,
                "project_name": project_info.name,
                "tech_stack": project_info.tech_stack
            })
        
        # Generate unique ID
        chunk_id = f"{enhanced_metadata['content_hash']}_{int(datetime.utcnow().timestamp())}"
        
        # Determine storage scope
        memory_type = metadata.get('memory_type', 'project')
        
        if memory_type == 'user_preference':
            # Store in user collection
            collection = self.user_collection
        elif memory_type == 'global_pattern':
            # Store in global collection
            collection = self.global_collection
        elif project_info:
            # Store in project-specific collection
            collection = self.get_project_collection(project_info.id)
        else:
            # Fallback to global collection
            collection = self.global_collection
        
        # Store in vector database
        try:
            collection.add(
                documents=[content],
                metadatas=[enhanced_metadata],
                ids=[chunk_id]
            )
            
            logger.info(f"Stored memory chunk: {chunk_id}")
            return chunk_id
            
        except Exception as e:
            logger.error(f"Error storing memory: {e}")
            return ""
    
    async def search_memory(self, query: str, project_path: str = None, scope: str = "auto_scope", max_results: int = 5) -> List[Dict]:
        """Search memory with intelligent scoping"""
        
        # Detect current project
        current_project = None
        if project_path:
            current_project = self.project_detector.detect_project(project_path)
        
        # Route to appropriate search method
        search_method = self.memory_scopes.get(scope, self._search_intelligent_scope)
        
        try:
            results = await search_method(query, current_project, max_results)
            
            # Enhance results with relevance scoring
            enhanced_results = []
            for result in results:
                enhanced_result = {
                    **result,
                    'relevance_score': self._calculate_relevance(result, query, current_project),
                    'scope_source': scope,
                    'current_project': current_project.id if current_project else None
                }
                enhanced_results.append(enhanced_result)
            
            # Sort by relevance
            enhanced_results.sort(key=lambda x: x['relevance_score'], reverse=True)
            
            return enhanced_results
            
        except Exception as e:
            logger.error(f"Error searching memory: {e}")
            return []
    
    async def _search_current_project(self, query: str, project: ProjectInfo, max_results: int) -> List[Dict]:
        """Search only current project memory"""
        if not project:
            return []
        
        collection = self.get_project_collection(project.id)
        return await self._search_collection(collection, query, max_results)
    
    async def _search_related_projects(self, query: str, project: ProjectInfo, max_results: int) -> List[Dict]:
        """Search projects with similar tech stack"""
        results = []
        
        # Include current project
        if project:
            current_results = await self._search_current_project(query, project, max_results // 2)
            results.extend(current_results)
        
        # Find related projects
        if project:
            for other_project in self.project_detector.known_projects.values():
                if (other_project.id != project.id and 
                    any(tech in project.tech_stack for tech in other_project.tech_stack)):
                    
                    related_results = await self._search_current_project(query, other_project, 2)
                    results.extend(related_results)
        
        return results[:max_results]
    
    async def _search_global_knowledge(self, query: str, project: ProjectInfo, max_results: int) -> List[Dict]:
        """Search global patterns and user preferences"""
        results = []
        
        # Search global patterns
        global_results = await self._search_collection(self.global_collection, query, max_results // 2)
        results.extend(global_results)
        
        # Search user preferences
        user_results = await self._search_collection(self.user_collection, query, max_results // 2)
        results.extend(user_results)
        
        return results[:max_results]
    
    async def _search_intelligent_scope(self, query: str, project: ProjectInfo, max_results: int) -> List[Dict]:
        """Intelligently decide search scope based on query"""
        
        # Analyze query to determine best scope
        query_lower = query.lower()
        
        # User preference queries
        if any(term in query_lower for term in ['prefer', 'like', 'style', 'communication', 'workflow']):
            return await self._search_global_knowledge(query, project, max_results)
        
        # Technical pattern queries
        elif any(term in query_lower for term in ['pattern', 'best practice', 'how to', 'example']):
            return await self._search_related_projects(query, project, max_results)
        
        # Project-specific queries
        elif any(term in query_lower for term in ['current', 'this project', 'status', 'recent']):
            return await self._search_current_project(query, project, max_results)
        
        # Default: mixed approach
        else:
            results = []
            
            # 50% current project
            if project:
                current_results = await self._search_current_project(query, project, max_results // 2)
                results.extend(current_results)
            
            # 30% related projects
            related_results = await self._search_related_projects(query, project, max_results // 3)
            results.extend(related_results)
            
            # 20% global knowledge
            global_results = await self._search_global_knowledge(query, project, max_results // 5)
            results.extend(global_results)
            
            return results[:max_results]
    
    async def _search_collection(self, collection, query: str, max_results: int) -> List[Dict]:
        """Search a specific collection"""
        try:
            results = collection.query(
                query_texts=[query],
                n_results=max_results,
                include=["documents", "metadatas", "distances"]
            )
            
            formatted_results = []
            for i in range(len(results['documents'][0])):
                formatted_results.append({
                    'content': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'similarity_score': 1 - results['distances'][0][i],
                    'collection': collection.name
                })
            
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching collection {collection.name}: {e}")
            return []
    
    def _calculate_relevance(self, result: Dict, query: str, current_project: ProjectInfo) -> float:
        """Calculate relevance score considering multiple factors"""
        
        base_score = result.get('similarity_score', 0)
        
        # Boost for current project
        if (current_project and 
            result.get('metadata', {}).get('project_id') == current_project.id):
            base_score += 0.2
        
        # Boost for recent content
        timestamp_str = result.get('metadata', {}).get('timestamp')
        if timestamp_str:
            try:
                timestamp = datetime.fromisoformat(timestamp_str)
                age_days = (datetime.utcnow() - timestamp).days
                freshness_boost = max(0, 0.1 * (1 - age_days / 30))  # Decay over 30 days
                base_score += freshness_boost
            except Exception:
                pass
        
        # Boost for matching tech stack
        if current_project:
            content_tech = result.get('metadata', {}).get('tech_stack', [])
            if any(tech in current_project.tech_stack for tech in content_tech):
                base_score += 0.1
        
        return min(1.0, base_score)  # Cap at 1.0

# HTTP API Server
async def create_app():
    """Create aiohttp web application"""
    
    memory_service = UniversalMemoryService()
    app = web.Application()
    
    async def search_handler(request):
        data = await request.json()
        
        query = data.get('query', '')
        project_path = data.get('project_path')
        scope = data.get('scope', 'auto_scope')
        max_results = data.get('max_results', 5)
        
        results = await memory_service.search_memory(query, project_path, scope, max_results)
        
        return web.json_response({
            'query': query,
            'results': results,
            'total_found': len(results),
            'scope': scope
        })
    
    async def store_handler(request):
        data = await request.json()
        
        content = data.get('content', '')
        metadata = data.get('metadata', {})
        project_path = data.get('project_path')
        
        chunk_id = await memory_service.store_memory(content, metadata, project_path)
        
        return web.json_response({
            'chunk_id': chunk_id,
            'status': 'stored' if chunk_id else 'error'
        })
    
    async def projects_handler(request):
        projects = {
            pid: asdict(pinfo) 
            for pid, pinfo in memory_service.project_detector.known_projects.items()
        }
        
        return web.json_response({
            'projects': projects,
            'total': len(projects)
        })
    
    # Routes
    app.router.add_post('/api/v1/search', search_handler)
    app.router.add_post('/api/v1/store', store_handler)
    app.router.add_get('/api/v1/projects', projects_handler)
    
    # Health check
    app.router.add_get('/health', lambda r: web.json_response({'status': 'healthy'}))
    
    return app

async def main():
    """Main service entry point"""
    
    # Create memory service
    memory_service = UniversalMemoryService()
    logger.info("Universal memory service initialized")
    
    # Create and start web server
    app = await create_app()
    
    # Start server
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(runner, 'localhost', 8765)
    await site.start()
    
    logger.info("Universal memory service running on http://localhost:8765")
    logger.info("Health check: http://localhost:8765/health")
    
    try:
        # Run forever
        await asyncio.Future()  # Run until interrupted
    except KeyboardInterrupt:
        logger.info("Shutting down universal memory service")
    finally:
        await runner.cleanup()

if __name__ == "__main__":
    asyncio.run(main())