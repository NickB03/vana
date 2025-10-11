#!/usr/bin/env python3
"""
Create comprehensive official Google ADK training dataset.

This combines ALL official sources:
- 22 Python sample agents from google/adk-samples
- 2 Java sample agents
- 5 Agent Starter Pack templates
- Agent Starter Pack architecture patterns
- Official documentation patterns
"""

import json
from pathlib import Path
from datetime import datetime
from typing import Any


def create_comprehensive_sample_catalog() -> dict[str, Any]:
    """Catalog all 24 official ADK sample projects."""

    samples = {
        "python_samples": [
            {
                "name": "academic_research",
                "category": "research",
                "description": "Research-oriented agent with RAG for academic papers",
                "patterns": ["RAG", "document_retrieval", "citation_management"],
                "use_cases": ["Literature review", "Research synthesis", "Citation tracking"],
                "adk_features": ["LlmAgent", "document grounding", "citation callbacks"]
            },
            {
                "name": "blog_writer",
                "category": "content_generation",
                "description": "Automated blog post generation with SEO optimization",
                "patterns": ["content_generation", "structured_output", "SEO"],
                "use_cases": ["Content marketing", "Blog automation", "SEO writing"],
                "adk_features": ["LlmAgent", "structured outputs", "tool integration"]
            },
            {
                "name": "brand_search_optimization",
                "category": "marketing",
                "description": "Brand monitoring and search optimization agent",
                "patterns": ["web_search", "brand_monitoring", "analytics"],
                "use_cases": ["Brand reputation", "SEO strategy", "Competitive analysis"],
                "adk_features": ["LlmAgent", "search tools", "data analysis"]
            },
            {
                "name": "camel",
                "category": "multi_agent",
                "description": "CAMEL multi-agent collaboration framework",
                "patterns": ["multi_agent", "role_playing", "collaborative_problem_solving"],
                "use_cases": ["Complex problem solving", "Multi-perspective analysis"],
                "adk_features": ["Multiple LlmAgents", "agent coordination", "role assignment"]
            },
            {
                "name": "customer_service",
                "category": "conversational",
                "description": "Conversational customer support agent with context",
                "patterns": ["ReAct", "conversation_management", "context_tracking"],
                "use_cases": ["Customer support", "FAQ automation", "Ticket routing"],
                "adk_features": ["LlmAgent", "conversation state", "tool integration"]
            },
            {
                "name": "data_engineering",
                "category": "technical",
                "description": "Data pipeline design and optimization agent",
                "patterns": ["technical_workflow", "code_generation", "architecture_design"],
                "use_cases": ["Pipeline design", "Data transformation", "ETL automation"],
                "adk_features": ["LlmAgent", "code generation", "technical tools"]
            },
            {
                "name": "data_science",
                "category": "technical",
                "description": "Data analysis and modeling agent",
                "patterns": ["data_analysis", "visualization", "statistical_modeling"],
                "use_cases": ["Exploratory analysis", "Model building", "Data insights"],
                "adk_features": ["LlmAgent", "Python tools", "data processing"]
            },
            {
                "name": "financial_advisor",
                "category": "analysis",
                "description": "Financial analysis and investment recommendations",
                "patterns": ["multi_step_reasoning", "data_analysis", "risk_assessment"],
                "use_cases": ["Portfolio analysis", "Investment strategy", "Risk management"],
                "adk_features": ["LlmAgent", "financial APIs", "decision support"]
            },
            {
                "name": "fomc_research",
                "category": "research",
                "description": "Federal Open Market Committee meeting analysis",
                "patterns": ["document_analysis", "economic_research", "trend_analysis"],
                "use_cases": ["Economic analysis", "Policy research", "Market insights"],
                "adk_features": ["LlmAgent", "document processing", "time series"]
            },
            {
                "name": "gemini_fullstack",
                "category": "integration",
                "description": "Full-stack application with Gemini integration",
                "patterns": ["fullstack_integration", "UI_backend", "real_time_updates"],
                "use_cases": ["Complete applications", "Interactive UIs", "Real-time agents"],
                "adk_features": ["LlmAgent", "web integration", "streaming"]
            },
            {
                "name": "google_trends_agent",
                "category": "analytics",
                "description": "Google Trends data analysis and insights",
                "patterns": ["trend_analysis", "web_scraping", "data_visualization"],
                "use_cases": ["Market research", "Trend forecasting", "Topic analysis"],
                "adk_features": ["LlmAgent", "external APIs", "data analysis"]
            },
            {
                "name": "image_scoring",
                "category": "multimodal",
                "description": "Image quality assessment and scoring",
                "patterns": ["multimodal", "image_analysis", "scoring_systems"],
                "use_cases": ["Quality control", "Image ranking", "Content moderation"],
                "adk_features": ["LlmAgent", "multimodal inputs", "scoring logic"]
            },
            {
                "name": "llm_auditor",
                "category": "evaluation",
                "description": "LLM output quality auditing and evaluation",
                "patterns": ["evaluation", "quality_assessment", "bias_detection"],
                "use_cases": ["Model evaluation", "Quality assurance", "Safety testing"],
                "adk_features": ["LlmAgent", "evaluation frameworks", "metrics"]
            },
            {
                "name": "machine_learning_engineering",
                "category": "technical",
                "description": "ML workflow automation and experiment tracking",
                "patterns": ["workflow_automation", "experiment_tracking", "model_management"],
                "use_cases": ["MLOps", "Experiment management", "Model deployment"],
                "adk_features": ["SequentialAgent", "workflow orchestration", "tool integration"]
            },
            {
                "name": "marketing_agency",
                "category": "multi_agent",
                "description": "Multi-agent marketing team collaboration",
                "patterns": ["multi_agent", "specialist_delegation", "collaborative_workflow"],
                "use_cases": ["Marketing campaigns", "Content strategy", "Brand management"],
                "adk_features": ["Multiple LlmAgents", "AgentTool delegation", "team coordination"]
            },
            {
                "name": "medical_pre_authorization",
                "category": "healthcare",
                "description": "Medical insurance pre-authorization processing",
                "patterns": ["document_processing", "rule_based_decision", "workflow_automation"],
                "use_cases": ["Healthcare automation", "Claims processing", "Decision support"],
                "adk_features": ["LlmAgent", "structured outputs", "rule engines"]
            },
            {
                "name": "personalized_shopping",
                "category": "recommendation",
                "description": "Personalized product recommendation agent",
                "patterns": ["recommendation", "user_profiling", "preference_learning"],
                "use_cases": ["E-commerce", "Product discovery", "Personalization"],
                "adk_features": ["LlmAgent", "user context", "recommendation algorithms"]
            },
            {
                "name": "rag",
                "category": "rag",
                "description": "Retrieval-Augmented Generation implementation",
                "patterns": ["RAG", "vector_search", "document_retrieval"],
                "use_cases": ["Question answering", "Knowledge bases", "Document chat"],
                "adk_features": ["LlmAgent", "Vertex AI Search", "grounding"]
            },
            {
                "name": "realtime_conversational_agent",
                "category": "realtime",
                "description": "Real-time conversational agent with streaming",
                "patterns": ["streaming", "real_time_processing", "conversation"],
                "use_cases": ["Live chat", "Voice assistants", "Interactive applications"],
                "adk_features": ["LlmAgent", "streaming API", "real-time state"]
            },
            {
                "name": "safety_plugins",
                "category": "safety",
                "description": "Safety and content moderation plugins",
                "patterns": ["safety_checks", "content_moderation", "policy_enforcement"],
                "use_cases": ["Content safety", "Policy compliance", "Harm prevention"],
                "adk_features": ["LlmAgent", "safety callbacks", "filtering"]
            },
            {
                "name": "software_bug_assistant",
                "category": "technical",
                "description": "Software debugging and issue resolution",
                "patterns": ["problem_solving", "code_analysis", "debugging_workflow"],
                "use_cases": ["Bug diagnosis", "Code fixes", "Technical support"],
                "adk_features": ["LlmAgent", "code tools", "technical reasoning"]
            },
            {
                "name": "travel_concierge",
                "category": "recommendation",
                "description": "Personalized travel planning and recommendations",
                "patterns": ["recommendation", "context_awareness", "personalization"],
                "use_cases": ["Travel planning", "Itinerary creation", "Recommendations"],
                "adk_features": ["LlmAgent", "context management", "external APIs"]
            }
        ],
        "java_samples": [
            {
                "name": "software_bug_assistant",
                "category": "technical",
                "language": "java",
                "description": "Java implementation of bug diagnosis agent",
                "patterns": ["problem_solving", "code_analysis", "java_integration"],
                "use_cases": ["Java debugging", "Enterprise support", "Technical analysis"],
                "adk_features": ["Java ADK", "code tools", "debugging workflows"]
            },
            {
                "name": "time_series_forecasting",
                "category": "analytics",
                "language": "java",
                "description": "Time series analysis and forecasting",
                "patterns": ["forecasting", "statistical_modeling", "data_analysis"],
                "use_cases": ["Demand forecasting", "Trend prediction", "Business analytics"],
                "adk_features": ["Java ADK", "statistical tools", "prediction models"]
            }
        ],
        "agent_starter_pack_templates": [
            {
                "name": "adk_base",
                "category": "template",
                "description": "Base ReAct agent template for Google Cloud",
                "patterns": ["ReAct", "production_deployment", "cloud_run"],
                "use_cases": ["Production agents", "Cloud deployment", "Scalable services"],
                "features": ["CI/CD", "Terraform", "Monitoring", "Cloud Run deployment"]
            },
            {
                "name": "adk_live",
                "category": "template",
                "description": "Real-time multimodal RAG agent with Gemini Live",
                "patterns": ["multimodal_RAG", "real_time", "streaming"],
                "use_cases": ["Voice interfaces", "Video analysis", "Real-time interactions"],
                "features": ["Gemini Live API", "Multimodal inputs", "Streaming", "RAG"]
            },
            {
                "name": "agentic_rag",
                "category": "template",
                "description": "Agentic RAG with Vertex AI Search integration",
                "patterns": ["agentic_RAG", "vertex_ai_search", "document_retrieval"],
                "use_cases": ["Document QA", "Knowledge management", "Enterprise search"],
                "features": ["Vertex AI Search", "Vector Search", "Production RAG"]
            },
            {
                "name": "langgraph_base_react",
                "category": "template",
                "description": "LangGraph-based ReAct agent template",
                "patterns": ["ReAct", "langgraph", "state_machines"],
                "use_cases": ["Complex workflows", "State management", "LangGraph integration"],
                "features": ["LangGraph", "State graphs", "Workflow orchestration"]
            },
            {
                "name": "crewai_coding_crew",
                "category": "template",
                "description": "CrewAI multi-agent coding team",
                "patterns": ["multi_agent", "crewai", "coding_automation"],
                "use_cases": ["Code generation", "Team collaboration", "Development automation"],
                "features": ["CrewAI", "Multi-agent", "Coding tasks"]
            }
        ],
        "metadata": {
            "total_samples": 24,
            "python_samples": 22,
            "java_samples": 2,
            "templates": 5,
            "total_patterns": 29,
            "source": "google/adk-samples + agent-starter-pack",
            "extracted_at": datetime.now().isoformat()
        }
    }

    return samples


def create_pattern_library() -> dict[str, Any]:
    """Create comprehensive pattern library from all official sources."""

    patterns = {
        "core_agent_patterns": [
            {
                "name": "ReAct_Agent",
                "source": "official_adk_samples",
                "description": "Reasoning and Acting agent pattern",
                "implementations": ["customer_service", "adk_base", "langgraph_base_react"],
                "key_features": [
                    "Iterative reasoning",
                    "Action execution",
                    "Observation processing",
                    "Tool usage"
                ],
                "best_for": ["Interactive problem solving", "Multi-step tasks", "Tool-augmented agents"]
            },
            {
                "name": "RAG_Pattern",
                "source": "official_adk_samples",
                "description": "Retrieval-Augmented Generation for knowledge grounding",
                "implementations": ["academic_research", "rag", "adk_live", "agentic_rag"],
                "key_features": [
                    "Document retrieval",
                    "Context injection",
                    "Grounded responses",
                    "Citation tracking"
                ],
                "best_for": ["Question answering", "Knowledge bases", "Document-grounded agents"]
            },
            {
                "name": "Multi_Agent_Collaboration",
                "source": "official_adk_samples",
                "description": "Multiple specialized agents working together",
                "implementations": ["marketing_agency", "camel", "crewai_coding_crew"],
                "key_features": [
                    "Agent specialization",
                    "Task delegation",
                    "Collaborative problem solving",
                    "Result synthesis"
                ],
                "best_for": ["Complex workflows", "Team simulations", "Multi-perspective analysis"]
            },
            {
                "name": "Sequential_Orchestration",
                "source": "official_adk_samples",
                "description": "Sequential agent execution with state passing",
                "implementations": ["machine_learning_engineering", "data_engineering"],
                "key_features": [
                    "Ordered execution",
                    "State management",
                    "Output chaining",
                    "Dependency handling"
                ],
                "best_for": ["Workflows", "Pipelines", "Multi-stage processing"]
            },
            {
                "name": "Multimodal_Agent",
                "source": "official_adk_samples",
                "description": "Agent handling multiple input modalities",
                "implementations": ["image_scoring", "adk_live", "realtime_conversational_agent"],
                "key_features": [
                    "Image understanding",
                    "Audio processing",
                    "Video analysis",
                    "Cross-modal reasoning"
                ],
                "best_for": ["Rich media applications", "Voice interfaces", "Visual AI"]
            }
        ],
        "integration_patterns": [
            {
                "name": "Vertex_AI_Search_Integration",
                "source": "agent-starter-pack",
                "description": "Integration with Vertex AI Search for RAG",
                "pattern": "agentic_rag template",
                "configuration": ["Search engine setup", "Index configuration", "Query optimization"],
                "best_practices": ["Index structure", "Query formulation", "Result ranking"]
            },
            {
                "name": "Cloud_Run_Deployment",
                "source": "agent-starter-pack",
                "description": "Serverless deployment on Cloud Run",
                "pattern": "adk_base template",
                "components": ["Docker containerization", "CI/CD pipeline", "Terraform IaC"],
                "best_practices": ["Resource optimization", "Auto-scaling", "Cost management"]
            },
            {
                "name": "Gemini_Live_API",
                "source": "agent-starter-pack",
                "description": "Real-time multimodal interaction with Gemini",
                "pattern": "adk_live template",
                "features": ["Streaming audio/video", "Real-time processing", "Multimodal inputs"],
                "best_practices": ["Latency optimization", "Error handling", "State management"]
            }
        ],
        "metadata": {
            "pattern_count": 8,
            "source": "comprehensive_official_catalog",
            "version": "2.0",
            "extracted_at": datetime.now().isoformat()
        }
    }

    return patterns


def main():
    """Generate comprehensive official training dataset."""

    print("🚀 Creating Comprehensive Official ADK Dataset")
    print("=" * 70)

    output_dir = Path("training_data")
    output_dir.mkdir(exist_ok=True)

    # Create sample catalog
    print("\n📚 Cataloging 24 official sample projects...")
    samples = create_comprehensive_sample_catalog()

    samples_file = output_dir / "official_comprehensive_samples.json"
    samples_file.write_text(json.dumps(samples, indent=2))
    print(f"✅ Saved: {samples_file}")
    print(f"   - 22 Python samples")
    print(f"   - 2 Java samples")
    print(f"   - 5 Agent Starter Pack templates")
    print(f"   - Total: 29 sample projects")

    # Create pattern library
    print("\n🎨 Creating pattern library...")
    patterns = create_pattern_library()

    patterns_file = output_dir / "official_pattern_library.json"
    patterns_file.write_text(json.dumps(patterns, indent=2))
    print(f"✅ Saved: {patterns_file}")
    print(f"   - {len(patterns['core_agent_patterns'])} core agent patterns")
    print(f"   - {len(patterns['integration_patterns'])} integration patterns")

    # Summary
    print("\n" + "=" * 70)
    print("✨ COMPREHENSIVE OFFICIAL DATASET CREATED")
    print("=" * 70)
    print(f"\n📊 Coverage:")
    print(f"   Official Sample Projects: 24")
    print(f"   Agent Templates: 5")
    print(f"   Core Patterns: 5")
    print(f"   Integration Patterns: 3")
    print(f"   Total Training Examples: 37+")
    print(f"\n📁 Files:")
    print(f"   {samples_file.name}")
    print(f"   {patterns_file.name}")
    print(f"\n🎯 Ready for neural training!")


if __name__ == "__main__":
    main()
