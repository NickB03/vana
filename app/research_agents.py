# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""
Multi-Agent Research System for Real-time Streaming

This module provides a comprehensive multi-agent research system that orchestrates
specialized AI agents to conduct thorough research tasks with real-time progress updates.
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, List, Optional

import google.generativeai as genai
from pydantic import BaseModel, Field


class AgentStatus(BaseModel):
    """Status model for individual agents"""
    agent_id: str
    agent_type: str
    name: str
    status: str = Field(description="current, waiting, completed, error")
    progress: float = Field(default=0.0, description="Progress percentage 0.0-1.0")
    current_task: Optional[str] = None
    results: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ResearchProgress(BaseModel):
    """Overall research progress model"""
    session_id: str
    status: str = Field(description="initializing, running, completed, error")
    overall_progress: float = Field(default=0.0, description="Overall progress 0.0-1.0")
    current_phase: str
    agents: List[AgentStatus] = Field(default_factory=list)
    partial_results: Optional[Dict[str, Any]] = None
    final_report: Optional[str] = None
    error: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


class MultiAgentResearchOrchestrator:
    """
    Orchestrates multiple AI agents for comprehensive research tasks
    """
    
    AGENT_TYPES = [
        "team_leader",
        "plan_generator", 
        "section_planner",
        "researcher",
        "evaluator",
        "report_writer"
    ]
    
    def __init__(self, api_key: str):
        """Initialize the orchestrator with Google API key"""
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self.active_sessions: Dict[str, ResearchProgress] = {}
    
    def create_agent_status(self, agent_type: str) -> AgentStatus:
        """Create initial agent status"""
        agent_names = {
            "team_leader": "Research Team Leader",
            "plan_generator": "Research Plan Generator", 
            "section_planner": "Section Planning Specialist",
            "researcher": "Primary Research Agent",
            "evaluator": "Content Quality Evaluator",
            "report_writer": "Report Synthesis Writer"
        }
        
        return AgentStatus(
            agent_id=str(uuid.uuid4()),
            agent_type=agent_type,
            name=agent_names.get(agent_type, f"{agent_type.title()} Agent"),
            status="waiting",
            started_at=datetime.now()
        )
    
    async def start_research_session(self, session_id: str, research_query: str) -> ResearchProgress:
        """Start a new multi-agent research session"""
        
        # Create agents
        agents = [self.create_agent_status(agent_type) for agent_type in self.AGENT_TYPES]
        
        # Initialize research progress
        progress = ResearchProgress(
            session_id=session_id,
            status="initializing",
            current_phase="Team Assembly",
            agents=agents
        )
        
        self.active_sessions[session_id] = progress
        
        # Start research orchestration
        asyncio.create_task(self._orchestrate_research(session_id, research_query))
        
        return progress
    
    async def _orchestrate_research(self, session_id: str, research_query: str):
        """Main orchestration logic for research workflow"""
        try:
            progress = self.active_sessions[session_id]
            progress.status = "running"
            progress.current_phase = "Research Planning"
            
            # Phase 1: Team Leader Analysis
            await self._execute_agent_phase(
                session_id, 
                "team_leader",
                f"Analyze this research request and create a comprehensive research strategy: {research_query}"
            )
            
            # Phase 2: Plan Generation
            await self._execute_agent_phase(
                session_id,
                "plan_generator", 
                f"Create a detailed research plan based on the query: {research_query}"
            )
            
            # Phase 3: Section Planning
            progress.current_phase = "Content Structure Planning"
            await self._execute_agent_phase(
                session_id,
                "section_planner",
                "Break down the research plan into structured sections and subsections"
            )
            
            # Phase 4: Primary Research
            progress.current_phase = "Active Research"
            await self._execute_agent_phase(
                session_id,
                "researcher", 
                f"Conduct comprehensive research on: {research_query}"
            )
            
            # Phase 5: Quality Evaluation
            progress.current_phase = "Quality Assessment"
            await self._execute_agent_phase(
                session_id,
                "evaluator",
                "Evaluate the research findings for completeness, accuracy, and relevance"
            )
            
            # Phase 6: Report Writing
            progress.current_phase = "Report Synthesis"
            await self._execute_agent_phase(
                session_id,
                "report_writer",
                "Synthesize all research findings into a comprehensive, well-structured report"
            )
            
            # Complete the session
            progress.status = "completed"
            progress.current_phase = "Research Complete"
            progress.overall_progress = 1.0
            progress.updated_at = datetime.now()
            
            # Generate final report
            final_agent = next((a for a in progress.agents if a.agent_type == "report_writer"), None)
            if final_agent and final_agent.results:
                progress.final_report = final_agent.results.get("report", "Research completed successfully.")
            
        except Exception as e:
            progress.status = "error"
            progress.error = str(e)
            progress.updated_at = datetime.now()
    
    async def _execute_agent_phase(self, session_id: str, agent_type: str, prompt: str):
        """Execute a specific agent phase"""
        progress = self.active_sessions[session_id]
        agent = next((a for a in progress.agents if a.agent_type == agent_type), None)
        
        if not agent:
            raise ValueError(f"Agent {agent_type} not found")
        
        try:
            # Update agent status
            agent.status = "current"
            agent.current_task = f"Processing {agent_type} phase"
            progress.updated_at = datetime.now()
            
            # Simulate progressive work with Gemini model
            model = genai.GenerativeModel("gemini-2.5-flash")
            
            # Generate content with progress simulation
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    top_p=0.8,
                    top_k=40,
                    max_output_tokens=1500,
                )
            )
            
            # Simulate progress updates
            for i in range(5):
                agent.progress = (i + 1) * 0.2
                progress.overall_progress = self._calculate_overall_progress(progress.agents)
                progress.updated_at = datetime.now()
                await asyncio.sleep(1)  # Simulate work time
            
            # Complete agent
            agent.status = "completed"
            agent.progress = 1.0
            agent.completed_at = datetime.now()
            agent.results = {
                "content": response.text,
                "agent_type": agent_type,
                "completed_at": agent.completed_at.isoformat()
            }
            
            # Update partial results
            if not progress.partial_results:
                progress.partial_results = {}
            progress.partial_results[agent_type] = agent.results
            
            progress.overall_progress = self._calculate_overall_progress(progress.agents)
            progress.updated_at = datetime.now()
            
        except Exception as e:
            agent.status = "error"
            agent.error = str(e)
            progress.updated_at = datetime.now()
            raise
    
    def _calculate_overall_progress(self, agents: List[AgentStatus]) -> float:
        """Calculate overall progress across all agents"""
        if not agents:
            return 0.0
        
        total_progress = sum(agent.progress for agent in agents)
        return total_progress / len(agents)
    
    async def get_research_progress(self, session_id: str) -> Optional[ResearchProgress]:
        """Get current research progress"""
        return self.active_sessions.get(session_id)
    
    async def stream_research_progress(self, session_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream real-time research progress updates"""
        
        # Send initial connection
        yield {
            "type": "connection",
            "status": "connected", 
            "sessionId": session_id,
            "timestamp": datetime.now().isoformat()
        }
        
        last_update = None
        
        while session_id in self.active_sessions:
            progress = self.active_sessions[session_id]
            
            # Only send updates when something changes
            if last_update != progress.updated_at:
                yield {
                    "type": "research_progress",
                    "sessionId": session_id,
                    "status": progress.status,
                    "overall_progress": progress.overall_progress,
                    "current_phase": progress.current_phase,
                    "agents": [
                        {
                            "agent_id": agent.agent_id,
                            "agent_type": agent.agent_type,
                            "name": agent.name,
                            "status": agent.status,
                            "progress": agent.progress,
                            "current_task": agent.current_task,
                            "error": agent.error
                        }
                        for agent in progress.agents
                    ],
                    "partial_results": progress.partial_results,
                    "timestamp": progress.updated_at.isoformat()
                }
                last_update = progress.updated_at
            
            # If research is complete or error, send final message and exit
            if progress.status in ["completed", "error"]:
                yield {
                    "type": "research_complete",
                    "sessionId": session_id,
                    "status": progress.status,
                    "final_report": progress.final_report,
                    "error": progress.error,
                    "timestamp": progress.updated_at.isoformat()
                }
                break
            
            # Wait before checking again
            await asyncio.sleep(0.5)
        
        # Send disconnection event
        yield {
            "type": "connection",
            "status": "disconnected",
            "sessionId": session_id,
            "timestamp": datetime.now().isoformat()
        }


# Global orchestrator instance
research_orchestrator: Optional[MultiAgentResearchOrchestrator] = None


def get_research_orchestrator() -> MultiAgentResearchOrchestrator:
    """Get or create research orchestrator instance"""
    global research_orchestrator
    
    if not research_orchestrator:
        import os
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not configured")
        research_orchestrator = MultiAgentResearchOrchestrator(api_key)
    
    return research_orchestrator