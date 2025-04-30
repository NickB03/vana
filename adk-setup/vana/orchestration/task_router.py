"""
Task Router for VANA

This module provides task routing functionality for the VANA project,
including task classification, agent selection, and delegation.
"""

import logging
import re
from typing import Dict, Any, List, Optional, Tuple

# Set up logging
logger = logging.getLogger(__name__)

class TaskRouter:
    """Router for delegating tasks to appropriate agents."""
    
    def __init__(self):
        """Initialize a task router."""
        # Define agent specialties
        self.agent_specialties = {
            "rhea": [
                "architecture", "design", "structure", "framework", "pattern",
                "system design", "component", "module", "layer", "service",
                "microservice", "monolith", "serverless", "event-driven",
                "domain-driven", "model", "schema", "database", "storage",
                "cache", "queue", "message", "event", "stream", "batch",
                "real-time", "async", "sync", "distributed", "centralized",
                "scalability", "reliability", "availability", "performance",
                "throughput", "latency", "consistency", "partition", "sharding",
                "replication", "backup", "recovery", "failover", "rollback",
                "transaction", "acid", "base", "cap theorem", "eventual consistency"
            ],
            "max": [
                "interface", "ui", "ux", "user experience", "user interface",
                "frontend", "client", "web", "mobile", "desktop", "responsive",
                "adaptive", "layout", "design", "wireframe", "mockup", "prototype",
                "usability", "accessibility", "a11y", "i18n", "l10n", "rtl",
                "ltr", "color", "typography", "icon", "image", "animation",
                "transition", "interaction", "feedback", "form", "input",
                "validation", "error", "success", "warning", "notification",
                "toast", "modal", "dialog", "popup", "dropdown", "menu",
                "navigation", "sidebar", "header", "footer", "card", "list",
                "grid", "table", "chart", "graph", "dashboard", "report",
                "analytics", "visualization", "theme", "style", "css", "sass",
                "less", "stylus", "tailwind", "bootstrap", "material", "fluent",
                "human interface", "design system", "component library"
            ],
            "sage": [
                "automation", "ci", "cd", "pipeline", "workflow", "build",
                "deploy", "release", "version", "tag", "branch", "merge",
                "pull request", "pr", "commit", "push", "fetch", "clone",
                "repository", "repo", "git", "github", "gitlab", "bitbucket",
                "jenkins", "travis", "circle", "github actions", "gitlab ci",
                "azure pipelines", "aws codepipeline", "gcp cloud build",
                "terraform", "ansible", "puppet", "chef", "salt", "kubernetes",
                "k8s", "docker", "container", "pod", "service", "deployment",
                "statefulset", "daemonset", "job", "cronjob", "ingress",
                "egress", "network policy", "service mesh", "istio", "linkerd",
                "consul", "envoy", "proxy", "sidecar", "ambassador", "gateway",
                "api gateway", "load balancer", "reverse proxy", "nginx",
                "apache", "haproxy", "traefik", "caddy", "monitoring", "logging",
                "tracing", "metrics", "prometheus", "grafana", "kibana",
                "elasticsearch", "fluentd", "logstash", "jaeger", "zipkin",
                "opentelemetry", "opentracing", "openmetrics", "alerting",
                "notification", "pagerduty", "opsgenie", "slack", "email",
                "sms", "webhook", "script", "shell", "bash", "powershell",
                "python", "ruby", "node", "javascript", "typescript", "go",
                "rust", "java", "kotlin", "scala", "clojure", "groovy",
                "infrastructure", "iaas", "paas", "saas", "faas", "serverless",
                "cloud", "aws", "azure", "gcp", "alibaba", "oracle", "ibm",
                "digitalocean", "linode", "vultr", "heroku", "netlify", "vercel",
                "cloudflare", "akamai", "fastly", "cdn", "edge", "function",
                "lambda", "cloud function", "azure function", "cloud run"
            ],
            "kai": [
                "edge case", "error", "exception", "bug", "issue", "problem",
                "failure", "crash", "hang", "freeze", "deadlock", "race condition",
                "memory leak", "resource leak", "null pointer", "null reference",
                "undefined", "nan", "infinity", "overflow", "underflow", "division by zero",
                "boundary", "limit", "constraint", "validation", "sanitization",
                "escape", "injection", "xss", "csrf", "sqli", "command injection",
                "path traversal", "file inclusion", "deserialization", "xxe",
                "ssrf", "idor", "broken authentication", "broken access control",
                "security misconfiguration", "insecure deserialization", "using components with known vulnerabilities",
                "insufficient logging and monitoring", "sensitive data exposure",
                "man-in-the-middle", "replay attack", "timing attack", "side-channel attack",
                "denial of service", "dos", "ddos", "resource exhaustion",
                "brute force", "dictionary attack", "rainbow table", "phishing",
                "social engineering", "spear phishing", "whaling", "vishing",
                "smishing", "baiting", "quid pro quo", "pretexting", "tailgating",
                "dumpster diving", "shoulder surfing", "reverse engineering",
                "decompilation", "disassembly", "debugging", "fuzzing", "mutation testing",
                "chaos engineering", "fault injection", "stress testing", "load testing",
                "performance testing", "penetration testing", "pen testing", "red teaming",
                "blue teaming", "purple teaming", "security testing", "vulnerability assessment",
                "threat modeling", "risk assessment", "impact analysis", "root cause analysis",
                "post-mortem", "incident response", "disaster recovery", "business continuity",
                "backup", "restore", "failover", "fallback", "degraded mode", "graceful degradation",
                "circuit breaker", "bulkhead", "retry", "timeout", "backoff", "jitter",
                "rate limiting", "throttling", "debounce", "idempotency", "compensation",
                "saga", "outbox", "inbox", "dead letter queue", "poison message",
                "quarantine", "isolation", "sandbox", "container", "virtual machine",
                "hypervisor", "firewall", "waf", "ids", "ips", "siem", "soar",
                "edr", "xdr", "mdr", "soc", "noc", "csirt", "cert", "psirt"
            ],
            "juno": [
                "test", "testing", "unit test", "integration test", "system test",
                "acceptance test", "smoke test", "regression test", "performance test",
                "load test", "stress test", "endurance test", "scalability test",
                "security test", "penetration test", "vulnerability test", "usability test",
                "accessibility test", "compatibility test", "interoperability test",
                "recovery test", "failover test", "disaster recovery test", "backup test",
                "restore test", "migration test", "upgrade test", "downgrade test",
                "installation test", "uninstallation test", "configuration test",
                "localization test", "internationalization test", "globalization test",
                "verification", "validation", "quality assurance", "qa", "qc",
                "quality control", "quality engineering", "test case", "test suite",
                "test plan", "test strategy", "test approach", "test methodology",
                "test framework", "test harness", "test fixture", "test data",
                "test environment", "test bed", "test lab", "test automation",
                "automated testing", "manual testing", "exploratory testing",
                "ad-hoc testing", "monkey testing", "gorilla testing", "session-based testing",
                "scenario testing", "use case testing", "user story testing",
                "behavior-driven development", "bdd", "test-driven development", "tdd",
                "acceptance test-driven development", "atdd", "specification by example",
                "given-when-then", "arrange-act-assert", "setup-exercise-verify-teardown",
                "mock", "stub", "fake", "spy", "dummy", "test double", "dependency injection",
                "inversion of control", "ioc", "service locator", "factory", "builder",
                "fluent interface", "method chaining", "assertion", "expectation",
                "matcher", "predicate", "constraint", "validator", "verifier",
                "coverage", "line coverage", "branch coverage", "path coverage",
                "function coverage", "statement coverage", "condition coverage",
                "mutation testing", "property-based testing", "fuzz testing",
                "chaos testing", "a/b testing", "split testing", "canary testing",
                "blue-green deployment", "feature flag", "feature toggle", "dark launch",
                "silent launch", "soft launch", "beta testing", "alpha testing",
                "dogfooding", "user acceptance testing", "uat", "production testing",
                "synthetic monitoring", "real user monitoring", "rum", "apm",
                "application performance monitoring", "error tracking", "crash reporting",
                "log analysis", "metrics collection", "tracing", "profiling",
                "benchmarking", "continuous testing", "continuous integration", "ci",
                "continuous delivery", "cd", "continuous deployment", "continuous monitoring",
                "continuous feedback", "continuous improvement", "devops", "devsecops",
                "gitops", "mlops", "aiops", "dataops", "testops", "qualityops"
            ]
        }
    
    def route_task(self, task: str) -> Tuple[str, float]:
        """
        Route a task to the appropriate agent.
        
        Args:
            task: Task description
            
        Returns:
            Tuple of (agent_id, confidence)
        """
        # Normalize task
        normalized_task = task.lower()
        
        # Calculate scores for each agent
        scores = {}
        
        for agent, keywords in self.agent_specialties.items():
            score = self._calculate_score(normalized_task, keywords)
            scores[agent] = score
        
        # Get agent with highest score
        best_agent = max(scores.items(), key=lambda x: x[1])
        
        logger.debug(f"Task routing scores: {scores}")
        logger.info(f"Routing task to {best_agent[0]} with confidence {best_agent[1]:.2f}")
        
        return best_agent
    
    def _calculate_score(self, task: str, keywords: List[str]) -> float:
        """
        Calculate score for an agent based on keyword matches.
        
        Args:
            task: Normalized task description
            keywords: List of keywords for the agent
            
        Returns:
            Score between 0 and 1
        """
        score = 0.0
        
        for keyword in keywords:
            # Check for exact match
            if keyword in task:
                # Longer keywords are more specific
                weight = len(keyword) / 10.0
                score += weight
                
                # Check if it's a standalone word
                if re.search(r'\b' + re.escape(keyword) + r'\b', task):
                    score += weight * 2.0
        
        # Normalize score
        return min(score / 10.0, 1.0)
    
    def get_agent_specialties(self) -> Dict[str, List[str]]:
        """
        Get agent specialties.
        
        Returns:
            Dictionary of agent specialties
        """
        return self.agent_specialties
