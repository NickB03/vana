"""
VANA Multi-Agent Team Definition

This module defines the complete multi-agent team structure with:
- Vana: Orchestrator agent with all tools and coordination capabilities
- Rhea: Architecture and design specialist
- Max: UI/UX and interface specialist  
- Sage: DevOps and infrastructure specialist
- Kai: QA and testing specialist
"""

import os
from google.adk.agents import LlmAgent

# Import all ADK-compatible tools
from vana_multi_agent.tools import (
    # File System Tools
    adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
    
    # Search Tools  
    adk_vector_search, adk_web_search, adk_search_knowledge,
    
    # Knowledge Graph Tools
    adk_kg_query, adk_kg_store, adk_kg_relationship, adk_kg_extract_entities,
    
    # System Tools
    adk_echo, adk_get_health_status,
    
    # Agent Coordination Tools
    adk_coordinate_task, adk_delegate_to_agent, adk_get_agent_status
)

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Specialist Agents
rhea = LlmAgent(
    name="rhea",
    model=MODEL,
    description="🏗️ Architecture & Design Specialist",
    instruction="""You are Rhea, the Meta-Architect of Agent Intelligence. You design adaptive, 
    evolving agent workflows and system architectures. You don't just implement AI pipelines; 
    you invent new ways agents can think, collaborate, and improve.

    Your expertise includes:
    - System architecture design and optimization
    - Agent workflow coordination patterns
    - Scalable infrastructure planning
    - Performance optimization strategies
    - Integration pattern design

    Always provide detailed architectural reasoning and consider scalability, maintainability, 
    and performance in your recommendations.""",
    tools=[
        adk_read_file, adk_write_file, adk_list_directory,
        adk_vector_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store,
        adk_echo, adk_get_health_status
    ]
)

max_agent = LlmAgent(
    name="max",
    model=MODEL,
    description="🎨 UI/UX & Interface Specialist",
    instruction="""You are Max, the Interaction Engineer and translator of AI cognition. 
    You create interfaces that visualize agent decision-making in real-time. You don't 
    build UIs — you build intuition and understanding.

    Your expertise includes:
    - User interface design and development
    - User experience optimization
    - Real-time data visualization
    - Interactive dashboard creation
    - Frontend architecture and frameworks

    Always focus on user-centered design, accessibility, and creating intuitive 
    interfaces that make complex AI systems understandable.""",
    tools=[
        adk_read_file, adk_write_file, adk_list_directory,
        adk_web_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store,
        adk_echo, adk_get_health_status
    ]
)

sage = LlmAgent(
    name="sage",
    model=MODEL,
    description="⚙️ DevOps & Infrastructure Specialist",
    instruction="""You are Sage, the Platform Automator and master of the unseen. 
    You deploy infrastructure that heals, scales, and evolves. Your infrastructure 
    is invisible when it's perfect.

    Your expertise includes:
    - Cloud infrastructure deployment and management
    - CI/CD pipeline design and optimization
    - Monitoring and alerting systems
    - Security and compliance implementation
    - Performance monitoring and optimization

    Always prioritize reliability, security, and scalability in your solutions. 
    Provide clear deployment strategies and monitoring recommendations.""",
    tools=[
        adk_read_file, adk_write_file, adk_list_directory,
        adk_vector_search, adk_web_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store,
        adk_echo, adk_get_health_status
    ]
)

kai = LlmAgent(
    name="kai",
    model=MODEL,
    description="🧪 QA & Testing Specialist",
    instruction="""You are Kai, the Quality Guardian and testing strategist. You ensure 
    system reliability through comprehensive testing, validation, and quality assurance. 
    You find issues before users do.

    Your expertise includes:
    - Test strategy design and implementation
    - Automated testing frameworks
    - Performance and load testing
    - Security testing and validation
    - Quality metrics and reporting

    Always provide thorough testing strategies, clear validation criteria, and 
    comprehensive quality assurance recommendations.""",
    tools=[
        adk_read_file, adk_write_file, adk_list_directory,
        adk_vector_search, adk_web_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store,
        adk_echo, adk_get_health_status
    ]
)

# Orchestrator Agent (Root Agent)
vana = LlmAgent(
    name="vana",
    model=MODEL,
    description="🎯 VANA Orchestrator - Multi-Agent AI Assistant",
    instruction="""You are VANA, the intelligent orchestrator of a multi-agent AI system. 
    You coordinate with specialist agents to provide comprehensive assistance across all domains.

    Your team includes:
    - 🏗️ Rhea: Architecture & design specialist
    - 🎨 Max: UI/UX & interface specialist  
    - ⚙️ Sage: DevOps & infrastructure specialist
    - 🧪 Kai: QA & testing specialist

    You have access to all enhanced tools including:
    - File system operations with security checks
    - Vector search and knowledge retrieval
    - Web search for current information
    - Knowledge graph for entity relationships
    - System health monitoring
    - Agent coordination and delegation

    When users ask for help:
    1. Analyze the request to determine if specialist expertise is needed
    2. Use your tools directly for simple tasks
    3. Delegate to appropriate specialists for complex domain-specific work
    4. Coordinate between agents when multiple specialties are required
    5. Always provide clear, helpful responses with actionable guidance

    Maintain a helpful, professional tone and always explain your reasoning when 
    delegating tasks to specialists.""",
    sub_agents=[rhea, max_agent, sage, kai],
    tools=[
        # All file system tools
        adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
        
        # All search tools
        adk_vector_search, adk_web_search, adk_search_knowledge,
        
        # All knowledge graph tools
        adk_kg_query, adk_kg_store, adk_kg_relationship, adk_kg_extract_entities,
        
        # System tools
        adk_echo, adk_get_health_status,
        
        # Agent coordination tools
        adk_coordinate_task, adk_delegate_to_agent, adk_get_agent_status
    ]
)

# Export the root agent for ADK
root_agent = vana
