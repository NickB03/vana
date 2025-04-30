"""
Result Synthesizer for VANA

This module provides result synthesis functionality for the VANA project,
including result ranking, formatting, and combining outputs from multiple tools.
"""

import logging
from typing import Dict, Any, List, Optional

# Set up logging
logger = logging.getLogger(__name__)

class ResultSynthesizer:
    """Synthesizer for combining outputs from multiple tools."""
    
    def __init__(self):
        """Initialize a result synthesizer."""
        pass
    
    def synthesize(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Synthesize results from multiple tools.
        
        Args:
            results: List of results from tools
            
        Returns:
            Synthesized result
        """
        if not results:
            return {"content": "", "sources": []}
        
        # Rank results
        ranked_results = self.rank(results)
        
        # Combine results
        combined_content = self._combine_content(ranked_results)
        
        # Extract sources
        sources = self._extract_sources(ranked_results)
        
        return {
            "content": combined_content,
            "sources": sources,
            "results": ranked_results
        }
    
    def rank(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Rank results by confidence.
        
        Args:
            results: List of results from tools
            
        Returns:
            Ranked results
        """
        # Sort by confidence (descending)
        return sorted(results, key=lambda r: r.get("confidence", 0.0), reverse=True)
    
    def format(self, synthesized: Dict[str, Any]) -> str:
        """
        Format synthesized result for presentation.
        
        Args:
            synthesized: Synthesized result
            
        Returns:
            Formatted result
        """
        content = synthesized["content"]
        sources = synthesized["sources"]
        
        if not sources:
            return content
        
        # Add sources
        formatted = content + "\n\nSources:\n"
        
        for i, source in enumerate(sources):
            formatted += f"{i+1}. {source}\n"
        
        return formatted
    
    def _combine_content(self, ranked_results: List[Dict[str, Any]]) -> str:
        """
        Combine content from ranked results.
        
        Args:
            ranked_results: Ranked results
            
        Returns:
            Combined content
        """
        # Simple concatenation for now
        combined = ""
        
        for result in ranked_results:
            if "content" in result:
                if combined:
                    combined += "\n\n"
                combined += result["content"]
        
        return combined
    
    def _extract_sources(self, ranked_results: List[Dict[str, Any]]) -> List[str]:
        """
        Extract sources from ranked results.
        
        Args:
            ranked_results: Ranked results
            
        Returns:
            List of sources
        """
        sources = []
        
        for result in ranked_results:
            if "source" in result:
                sources.append(result["source"])
            elif "sources" in result and isinstance(result["sources"], list):
                sources.extend(result["sources"])
            elif "agent" in result:
                sources.append(f"Agent: {result['agent']}")
        
        # Remove duplicates
        return list(dict.fromkeys(sources))
