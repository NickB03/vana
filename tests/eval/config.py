#!/usr/bin/env python3
"""
VANA Evaluation Framework Configuration
Centralized configuration management for the ADK-style evaluation framework

Provides environment-specific settings, performance targets, and UI selectors
"""

import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

@dataclass
class PerformanceTargets:
    """Performance target configuration"""
    response_time: float = 5.0  # seconds
    tool_accuracy: float = 0.9  # 90%
    response_quality: float = 0.8  # 80%
    success_rate: float = 0.95  # 95%

@dataclass
class UISelectors:
    """UI selector configuration for browser automation"""
    agent_select: str = "mat-select"
    agent_option: str = "mat-option"
    textarea: str = "textarea"
    response: str = "p"  # Updated based on actual UI structure
    vana_option: str = "mat-option:has-text('vana')"

@dataclass
class EvaluationConfig:
    """Main evaluation configuration"""
    # Environment URLs
    dev_url: str = "https://vana-dev-960076421399.us-central1.run.app"
    prod_url: str = "https://vana-qqugqgsbcq-uc.a.run.app"

    # Performance targets
    performance_targets: PerformanceTargets = field(default_factory=PerformanceTargets)

    # UI selectors
    ui_selectors: UISelectors = field(default_factory=UISelectors)
    
    # Browser configuration
    browser_headless: bool = True
    browser_timeout: int = 30000
    
    # Test configuration
    baseline_iterations: int = 10
    load_test_iterations: int = 5
    concurrent_users: Optional[List[int]] = None
    
    # Results configuration
    results_dir: str = "tests/results"
    evalsets_dir: str = "tests/eval/evalsets"
    
    def __post_init__(self):
        if self.concurrent_users is None:
            self.concurrent_users = [1, 5, 10]

class ConfigManager:
    """Configuration manager for the evaluation framework"""
    
    def __init__(self):
        self.config = EvaluationConfig()
        self._load_environment_config()
        
    def _load_environment_config(self):
        """Load environment-specific configuration"""
        # Override with environment variables if present
        if os.getenv("VANA_DEV_URL"):
            self.config.dev_url = os.getenv("VANA_DEV_URL")
            
        if os.getenv("VANA_PROD_URL"):
            self.config.prod_url = os.getenv("VANA_PROD_URL")
            
        if os.getenv("VANA_BROWSER_HEADLESS"):
            self.config.browser_headless = os.getenv("VANA_BROWSER_HEADLESS").lower() == "true"
            
        if os.getenv("VANA_BROWSER_TIMEOUT"):
            self.config.browser_timeout = int(os.getenv("VANA_BROWSER_TIMEOUT"))
            
        # Performance targets
        if os.getenv("VANA_RESPONSE_TIME_TARGET"):
            self.config.performance_targets.response_time = float(os.getenv("VANA_RESPONSE_TIME_TARGET"))
            
        if os.getenv("VANA_TOOL_ACCURACY_TARGET"):
            self.config.performance_targets.tool_accuracy = float(os.getenv("VANA_TOOL_ACCURACY_TARGET"))
            
        if os.getenv("VANA_SUCCESS_RATE_TARGET"):
            self.config.performance_targets.success_rate = float(os.getenv("VANA_SUCCESS_RATE_TARGET"))
    
    def get_base_url(self, environment: str = "dev") -> str:
        """Get base URL for specified environment"""
        if environment.lower() == "prod":
            return self.config.prod_url
        return self.config.dev_url
    
    def get_performance_targets(self) -> Dict[str, float]:
        """Get performance targets as dictionary"""
        return {
            "response_time": self.config.performance_targets.response_time,
            "tool_accuracy": self.config.performance_targets.tool_accuracy,
            "response_quality": self.config.performance_targets.response_quality,
            "success_rate": self.config.performance_targets.success_rate
        }
    
    def get_ui_selectors(self) -> Dict[str, str]:
        """Get UI selectors as dictionary"""
        return {
            "agent_select": self.config.ui_selectors.agent_select,
            "agent_option": self.config.ui_selectors.agent_option,
            "textarea": self.config.ui_selectors.textarea,
            "response": self.config.ui_selectors.response,
            "vana_option": self.config.ui_selectors.vana_option
        }
    
    def get_browser_config(self) -> Dict[str, Any]:
        """Get browser configuration"""
        return {
            "headless": self.config.browser_headless,
            "timeout": self.config.browser_timeout
        }
    
    def get_test_config(self) -> Dict[str, Any]:
        """Get test configuration"""
        return {
            "baseline_iterations": self.config.baseline_iterations,
            "load_test_iterations": self.config.load_test_iterations,
            "concurrent_users": self.config.concurrent_users
        }
    
    def get_paths(self) -> Dict[str, str]:
        """Get file paths configuration"""
        return {
            "results_dir": self.config.results_dir,
            "evalsets_dir": self.config.evalsets_dir
        }

# Global configuration instance
config_manager = ConfigManager()

# Convenience functions for easy access
def get_base_url(environment: str = "dev") -> str:
    """Get base URL for specified environment"""
    return config_manager.get_base_url(environment)

def get_performance_targets() -> Dict[str, float]:
    """Get performance targets"""
    return config_manager.get_performance_targets()

def get_ui_selectors() -> Dict[str, str]:
    """Get UI selectors"""
    return config_manager.get_ui_selectors()

def get_browser_config() -> Dict[str, Any]:
    """Get browser configuration"""
    return config_manager.get_browser_config()

def get_test_config() -> Dict[str, Any]:
    """Get test configuration"""
    return config_manager.get_test_config()

def get_paths() -> Dict[str, str]:
    """Get file paths"""
    return config_manager.get_paths()

# Tool patterns for enhanced detection
TOOL_PATTERNS = {
    "architecture_tool_func": [
        "architecture", "system design", "microservices", "api gateway",
        "*using architecture_tool*", "architecture specialist", "design pattern"
    ],
    "ui_tool_func": [
        "ui", "user interface", "dashboard", "design system", "dark mode",
        "*using ui_tool*", "ui specialist", "user experience"
    ],
    "devops_tool_func": [
        "devops", "deployment", "infrastructure", "kubernetes", "docker",
        "*using devops_tool*", "devops specialist", "ci/cd"
    ],
    "qa_tool_func": [
        "qa", "testing", "quality assurance", "test strategy", "validation",
        "*using qa_tool*", "qa specialist", "test plan"
    ],
    "search_knowledge": [
        "search", "knowledge", "information", "capabilities", "documentation",
        "*using search_knowledge*", "knowledge base", "searching knowledge"
    ],
    "vector_search": [
        "vector", "documentation", "technical", "search", "embedding",
        "*using vector_search*", "vector database", "semantic search"
    ],
    "web_search": [
        "web search", "weather", "current", "latest", "internet",
        "*using web_search*", "searching the web", "online search"
    ],
    "load_memory": [
        "memory", "remember", "stored", "preferences", "recall",
        "*using load_memory*", "loading memory", "retrieving memory"
    ],
    "get_health_status": [
        "health", "status", "system health", "operational", "monitoring",
        "*using get_health_status*", "health check", "system status"
    ],
    "echo": [
        "echo", "repeat", "message back", "echoing",
        "*using echo*", "echo back", "repeating"
    ],
    "coordinate_task": [
        "coordinate", "workflow", "specialists", "team", "orchestrate",
        "*using coordinate_task*", "coordinating", "task coordination"
    ],
    "get_agent_status": [
        "agent status", "available agents", "agent capabilities", "agent list",
        "*using get_agent_status*", "checking agents", "agent information"
    ]
}

# Memory component patterns for detection
MEMORY_PATTERNS = {
    "session_memory": ["remember", "stored", "memory", "session", "preference"],
    "knowledge_base": ["knowledge", "search", "found", "database", "information"],
    "vector_search": ["vector", "search", "documentation", "embedding", "semantic"],
    "rag_corpus": ["corpus", "rag", "retrieval", "augmented", "generation"],
    "memory_persistence": ["earlier", "previous", "discussed", "persistent", "saved"]
}

# Performance test scenarios
PERFORMANCE_SCENARIOS = {
    "simple_query": {
        "description": "Simple agent query performance",
        "query": "What is the current time?",
        "expected_response_time": 3.0,
        "concurrent_users": [1, 5, 10]
    },
    "complex_query": {
        "description": "Complex multi-agent workflow performance", 
        "query": "Design a comprehensive system architecture for a social media platform",
        "expected_response_time": 8.0,
        "concurrent_users": [1, 3, 5]
    },
    "memory_query": {
        "description": "Memory system search performance",
        "query": "Search for information about VANA system capabilities",
        "expected_response_time": 2.0,
        "concurrent_users": [1, 5, 10]
    },
    "tool_execution": {
        "description": "Tool execution performance",
        "query": "Check the system health status",
        "expected_response_time": 2.0,
        "concurrent_users": [1, 10, 20]
    }
}
