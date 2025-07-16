"""
Phase 1 Evaluation Scenarios for VANA.

Comprehensive test scenarios for Content Creation and Research specialists
using ADK-based evaluation methods.
"""

from typing import List
from tests.e2e.adk_evaluation_framework import EvaluationScenario


class Phase1Scenarios:
    """Complete evaluation scenarios for Phase 1 specialists."""
    
    @staticmethod
    def get_content_creation_scenarios() -> List[EvaluationScenario]:
        """Get all content creation specialist scenarios."""
        return [
            # Document Creation
            EvaluationScenario(
                id="cc_doc_001",
                name="Create Technical Report",
                description="Test full report generation with proper structure",
                request="Create a technical report on API security best practices including executive summary, main findings, and recommendations",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "Executive Summary",
                    "API security",
                    "best practices",
                    "findings",
                    "recommendations"
                ],
                expected_tools=["write_document", "format_markdown"],
                success_criteria={
                    "min_word_count": 500,
                    "has_structure": True,
                    "includes_headers": True,
                    "professional_tone": True
                }
            ),
            
            EvaluationScenario(
                id="cc_doc_002",
                name="Create Business Proposal",
                description="Test proposal generation with persuasive content",
                request="Write a business proposal for implementing a cloud migration strategy for a mid-size company",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "cloud migration",
                    "proposal",
                    "benefits",
                    "implementation",
                    "timeline",
                    "budget"
                ],
                expected_tools=["write_document", "generate_outline"],
                success_criteria={
                    "min_word_count": 600,
                    "persuasive_language": True,
                    "includes_sections": ["problem", "solution", "benefits"],
                    "has_timeline": True
                }
            ),
            
            # Outline Generation
            EvaluationScenario(
                id="cc_outline_001",
                name="Create Course Outline",
                description="Test hierarchical outline generation",
                request="Generate a detailed outline for a 10-week course on machine learning fundamentals",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "machine learning",
                    "week",
                    "fundamentals",
                    "topics",
                    "modules"
                ],
                expected_tools=["generate_outline"],
                success_criteria={
                    "hierarchical_structure": True,
                    "min_sections": 10,
                    "logical_progression": True,
                    "includes_subtopics": True
                }
            ),
            
            EvaluationScenario(
                id="cc_outline_002",
                name="Create Book Outline",
                description="Test complex outline with multiple levels",
                request="Create a comprehensive outline for a book about sustainable software development practices",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "sustainable",
                    "software development",
                    "chapters",
                    "sections"
                ],
                expected_tools=["generate_outline"],
                success_criteria={
                    "depth": 3,  # At least 3 levels deep
                    "min_chapters": 8,
                    "coherent_flow": True
                }
            ),
            
            # Content Editing
            EvaluationScenario(
                id="cc_edit_001",
                name="Improve Technical Writing",
                description="Test content clarity improvement",
                request="Edit this text for clarity: 'The utilization of advanced algorithmic approaches in the context of data processing has demonstrated significant improvements in terms of computational efficiency metrics.'",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "clarity",
                    "improved",
                    "simpler"
                ],
                expected_tools=["edit_content", "improve_clarity"],
                success_criteria={
                    "reduced_complexity": True,
                    "maintains_meaning": True,
                    "shorter_sentences": True
                }
            ),
            
            EvaluationScenario(
                id="cc_edit_002",
                name="Expand Content",
                description="Test content expansion capabilities",
                request="Expand this abstract into a full introduction: 'This paper presents a novel approach to distributed computing that reduces latency.'",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "distributed computing",
                    "latency",
                    "introduction",
                    "expanded"
                ],
                expected_tools=["edit_content"],
                success_criteria={
                    "expanded_content": True,
                    "min_word_increase": 200,
                    "adds_context": True
                }
            ),
            
            # Formatting
            EvaluationScenario(
                id="cc_format_001",
                name="Convert to Markdown",
                description="Test markdown formatting with TOC",
                request="Format this text as markdown with a table of contents: 'Introduction: This is the intro. Main Points: First point. Second point. Conclusion: Final thoughts.'",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "markdown",
                    "table of contents",
                    "formatted"
                ],
                expected_tools=["format_markdown"],
                success_criteria={
                    "valid_markdown": True,
                    "has_toc": True,
                    "proper_headers": True
                }
            ),
            
            # Grammar and Style
            EvaluationScenario(
                id="cc_grammar_001",
                name="Check Academic Writing",
                description="Test grammar checking with style guide",
                request="Check this text for grammar and APA style: 'The researchers has found that participant's responses was significantly different (Smith 2023).'",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "grammar",
                    "corrections",
                    "APA"
                ],
                expected_tools=["check_grammar"],
                success_criteria={
                    "identifies_errors": True,
                    "suggests_corrections": True,
                    "style_compliance": True
                }
            ),
            
            EvaluationScenario(
                id="cc_clarity_001",
                name="Simplify for General Audience",
                description="Test audience-specific clarity improvements",
                request="Rewrite this for a general audience: 'The paradigm shift in quantum computing architectures necessitates a fundamental reconsideration of cryptographic protocols.'",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "simpler",
                    "general audience",
                    "clarity"
                ],
                expected_tools=["improve_clarity"],
                success_criteria={
                    "reduced_jargon": True,
                    "easier_readability": True,
                    "maintains_accuracy": True
                }
            )
        ]
    
    @staticmethod
    def get_research_scenarios() -> List[EvaluationScenario]:
        """Get all research specialist scenarios."""
        return [
            # Web Search
            EvaluationScenario(
                id="rs_search_001",
                name="Academic Research Search",
                description="Test advanced search with filters",
                request="Search for peer-reviewed research on artificial intelligence in healthcare from the last 2 years",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "artificial intelligence",
                    "healthcare",
                    "research",
                    "peer-reviewed"
                ],
                expected_tools=["web_search_advanced"],
                success_criteria={
                    "uses_filters": True,
                    "date_filtered": True,
                    "academic_sources": True,
                    "relevant_results": True
                }
            ),
            
            EvaluationScenario(
                id="rs_search_002",
                name="Technical Documentation Search",
                description="Test domain-specific search",
                request="Find official documentation about Kubernetes pod security policies from kubernetes.io",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "Kubernetes",
                    "pod security",
                    "documentation",
                    "kubernetes.io"
                ],
                expected_tools=["web_search_advanced"],
                success_criteria={
                    "domain_filtering": True,
                    "official_sources": True,
                    "technical_accuracy": True
                }
            ),
            
            # Source Analysis
            EvaluationScenario(
                id="rs_analyze_001",
                name="Credibility Assessment",
                description="Test source credibility analysis",
                request="Analyze the credibility of these sources: nature.com, wikipedia.org, and personal-blog.com for scientific research",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "credibility",
                    "nature.com",
                    "wikipedia",
                    "analysis"
                ],
                expected_tools=["analyze_sources"],
                success_criteria={
                    "credibility_scores": True,
                    "bias_detection": True,
                    "recommendations": True
                }
            ),
            
            EvaluationScenario(
                id="rs_analyze_002",
                name="Multi-Source Comparison",
                description="Test comparative source analysis",
                request="Compare and analyze information from CDC, WHO, and Mayo Clinic about COVID-19 vaccines",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "CDC",
                    "WHO",
                    "Mayo Clinic",
                    "comparison"
                ],
                expected_tools=["analyze_sources", "synthesize_findings"],
                success_criteria={
                    "identifies_commonalities": True,
                    "notes_differences": True,
                    "authority_assessment": True
                }
            ),
            
            # Fact Extraction
            EvaluationScenario(
                id="rs_facts_001",
                name="Statistical Fact Extraction",
                description="Test extraction of statistics and data",
                request="Extract all statistics and numerical facts from this text: 'The study found that 78% of participants showed improvement, with an average increase of 23.5 points over 6 months.'",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "78%",
                    "23.5 points",
                    "6 months",
                    "statistics"
                ],
                expected_tools=["extract_facts"],
                success_criteria={
                    "extracts_all_numbers": True,
                    "provides_context": True,
                    "categorizes_facts": True
                }
            ),
            
            # Synthesis
            EvaluationScenario(
                id="rs_synth_001",
                name="Research Summary Synthesis",
                description="Test synthesis of multiple findings",
                request="Synthesize findings about renewable energy adoption rates from multiple sources into key insights",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "renewable energy",
                    "adoption rates",
                    "synthesis",
                    "insights"
                ],
                expected_tools=["synthesize_findings"],
                success_criteria={
                    "coherent_summary": True,
                    "identifies_patterns": True,
                    "draws_conclusions": True
                }
            ),
            
            # Validation
            EvaluationScenario(
                id="rs_validate_001",
                name="Claim Verification",
                description="Test fact-checking capabilities",
                request="Validate these claims: 'Python is the most popular programming language' and 'Quantum computers can break all encryption'",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "validate",
                    "Python",
                    "quantum computers",
                    "verification"
                ],
                expected_tools=["validate_information", "web_search_advanced"],
                success_criteria={
                    "checks_both_claims": True,
                    "provides_evidence": True,
                    "confidence_scores": True
                }
            ),
            
            # Citations
            EvaluationScenario(
                id="rs_cite_001",
                name="Academic Citation Generation",
                description="Test citation formatting",
                request="Generate APA and MLA citations for a Nature article by Smith et al. (2023) titled 'Advances in Gene Therapy'",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "APA",
                    "MLA",
                    "citation",
                    "Smith et al"
                ],
                expected_tools=["generate_citations"],
                success_criteria={
                    "correct_apa_format": True,
                    "correct_mla_format": True,
                    "includes_all_elements": True
                }
            ),
            
            # Complex Research
            EvaluationScenario(
                id="rs_complex_001",
                name="Comprehensive Research Project",
                description="Test full research workflow",
                request="Research the impact of remote work on productivity, analyze multiple perspectives, and provide citations",
                expected_specialist="research_specialist",
                expected_outputs=[
                    "remote work",
                    "productivity",
                    "research",
                    "analysis",
                    "citations"
                ],
                expected_tools=["web_search_advanced", "analyze_sources", "synthesize_findings", "generate_citations"],
                success_criteria={
                    "comprehensive_search": True,
                    "multiple_perspectives": True,
                    "synthesized_findings": True,
                    "proper_citations": True
                }
            )
        ]
    
    @staticmethod
    def get_integration_scenarios() -> List[EvaluationScenario]:
        """Get integration test scenarios."""
        return [
            EvaluationScenario(
                id="int_workflow_001",
                name="Research and Report Creation",
                description="Test research to document workflow",
                request="Research the benefits of solar energy and create a one-page report with citations",
                expected_specialist="research_specialist",  # Should start here
                expected_outputs=[
                    "solar energy",
                    "benefits",
                    "report",
                    "citations",
                    "research"
                ],
                expected_tools=["web_search_advanced", "synthesize_findings", "write_document", "generate_citations"],
                success_criteria={
                    "research_first": True,
                    "document_created": True,
                    "citations_integrated": True,
                    "logical_flow": True
                }
            ),
            
            EvaluationScenario(
                id="int_workflow_002",
                name="Fact-Check and Edit",
                description="Test validation and editing workflow",
                request="Fact-check this statement and improve its clarity: 'Studies shows that meditation reduce stress by up to 60% in just 8 weeks.'",
                expected_specialist="research_specialist",  # Should validate first
                expected_outputs=[
                    "fact-check",
                    "meditation",
                    "stress",
                    "clarity"
                ],
                expected_tools=["validate_information", "edit_content", "check_grammar"],
                success_criteria={
                    "validates_claim": True,
                    "fixes_grammar": True,
                    "improves_clarity": True
                }
            )
        ]
    
    @staticmethod
    def get_error_handling_scenarios() -> List[EvaluationScenario]:
        """Get error handling test scenarios."""
        return [
            EvaluationScenario(
                id="err_vague_001",
                name="Vague Content Request",
                description="Test handling of unclear requests",
                request="Write something good",
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "clarification",
                    "specific",
                    "help"
                ],
                expected_tools=["analyze_task"],
                success_criteria={
                    "asks_clarification": True,
                    "suggests_options": True,
                    "remains_helpful": True
                }
            ),
            
            EvaluationScenario(
                id="err_invalid_001",
                name="Invalid Format Request",
                description="Test handling of invalid parameters",
                request="Format this as PDF with animations",  # Can't do PDF or animations
                expected_specialist="content_creation_specialist",
                expected_outputs=[
                    "format",
                    "alternative",
                    "suggest"
                ],
                expected_tools=["format_markdown"],  # Should suggest markdown instead
                success_criteria={
                    "explains_limitation": True,
                    "offers_alternative": True,
                    "still_helpful": True
                }
            )
        ]
    
    @staticmethod
    def get_all_scenarios() -> List[EvaluationScenario]:
        """Get all Phase 1 evaluation scenarios."""
        return (
            Phase1Scenarios.get_content_creation_scenarios() +
            Phase1Scenarios.get_research_scenarios() +
            Phase1Scenarios.get_integration_scenarios() +
            Phase1Scenarios.get_error_handling_scenarios()
        )