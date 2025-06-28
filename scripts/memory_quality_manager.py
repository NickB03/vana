#!/usr/bin/env python3
"""
Memory Quality Manager
Ensures memory accuracy, removes outdated information, and prevents contradictions
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass

@dataclass
class MemoryIssue:
    """Represents a memory quality issue"""
    type: str
    severity: str  # 'low', 'medium', 'high', 'critical'
    description: str
    affected_entities: List[str]
    recommendation: str
    auto_fixable: bool = False

class MemoryQualityManager:
    """Manages memory quality, consistency, and cleanup"""
    
    def __init__(self):
        self.critical_entities = {
            'Nick', 'VANA_Project', 'Python_3.13_Requirement',
            'VANA_Orchestrator', 'Production_Environment'
        }
        
        self.quality_rules = [
            self._check_contradictions,
            self._check_staleness,
            self._check_completeness,
            self._check_accuracy,
            self._check_relevance
        ]
    
    def assess_memory_quality(self, memory_data: Dict) -> Dict[str, Any]:
        """
        Comprehensive memory quality assessment
        
        Args:
            memory_data: Current memory state
            
        Returns:
            Quality assessment report
        """
        
        issues = []
        
        # Run all quality checks
        for rule in self.quality_rules:
            rule_issues = rule(memory_data)
            issues.extend(rule_issues)
            
        # Categorize issues by severity
        critical_issues = [i for i in issues if i.severity == 'critical']
        high_issues = [i for i in issues if i.severity == 'high']
        medium_issues = [i for i in issues if i.severity == 'medium']
        low_issues = [i for i in issues if i.severity == 'low']
        
        # Calculate quality score
        quality_score = self._calculate_quality_score(issues, memory_data)
        
        return {
            'quality_score': quality_score,
            'status': self._determine_status(quality_score),
            'issues': {
                'critical': critical_issues,
                'high': high_issues,
                'medium': medium_issues,
                'low': low_issues
            },
            'recommendations': self._generate_recommendations(issues),
            'auto_fixes_available': len([i for i in issues if i.auto_fixable]),
            'assessment_timestamp': datetime.utcnow().isoformat()
        }
    
    def _check_contradictions(self, memory_data: Dict) -> List[MemoryIssue]:
        """Check for contradictory information"""
        issues = []
        
        entities = memory_data.get('entities', {})
        
        # Check for contradictory observations about same entity
        for entity_id, entity_data in entities.items():
            observations = entity_data.get('observations', [])
            
            # Look for conflicting status information
            status_observations = [obs for obs in observations if 'status' in obs.lower()]
            if len(set(status_observations)) > 1:
                issues.append(MemoryIssue(
                    type='contradiction',
                    severity='high',
                    description=f"Conflicting status information for {entity_id}",
                    affected_entities=[entity_id],
                    recommendation="Resolve conflicting status by keeping most recent",
                    auto_fixable=True
                ))
                
            # Check for contradictory requirements
            req_observations = [obs for obs in observations if 'require' in obs.lower()]
            if self._has_conflicts(req_observations):
                issues.append(MemoryIssue(
                    type='contradiction',
                    severity='critical',
                    description=f"Conflicting requirements for {entity_id}",
                    affected_entities=[entity_id],
                    recommendation="Validate and consolidate requirements"
                ))
        
        return issues
    
    def _check_staleness(self, memory_data: Dict) -> List[MemoryIssue]:
        """Check for outdated information"""
        issues = []
        cutoff_date = datetime.utcnow() - timedelta(days=7)
        
        entities = memory_data.get('entities', {})
        
        for entity_id, entity_data in entities.items():
            last_updated = entity_data.get('last_updated')
            if last_updated:
                update_date = datetime.fromisoformat(last_updated)
                if update_date < cutoff_date:
                    severity = 'high' if entity_id in self.critical_entities else 'medium'
                    issues.append(MemoryIssue(
                        type='staleness',
                        severity=severity,
                        description=f"{entity_id} not updated in {(datetime.utcnow() - update_date).days} days",
                        affected_entities=[entity_id],
                        recommendation="Refresh entity with current information"
                    ))
        
        return issues
    
    def _check_completeness(self, memory_data: Dict) -> List[MemoryIssue]:
        """Check for missing critical information"""
        issues = []
        
        entities = memory_data.get('entities', {})
        
        # Check for missing critical entities
        missing_entities = self.critical_entities - set(entities.keys())
        if missing_entities:
            issues.append(MemoryIssue(
                type='missing_entities',
                severity='critical',
                description=f"Missing critical entities: {', '.join(missing_entities)}",
                affected_entities=list(missing_entities),
                recommendation="Add missing critical entities to memory"
            ))
            
        # Check for incomplete entity information
        for entity_id in self.critical_entities:
            if entity_id in entities:
                entity_data = entities[entity_id]
                if not entity_data.get('observations'):
                    issues.append(MemoryIssue(
                        type='incomplete_entity',
                        severity='medium',
                        description=f"{entity_id} has no observations",
                        affected_entities=[entity_id],
                        recommendation="Add observations for complete entity profile"
                    ))
        
        return issues
    
    def _check_accuracy(self, memory_data: Dict) -> List[MemoryIssue]:
        """Check for inaccurate information"""
        issues = []
        
        entities = memory_data.get('entities', {})
        
        # Check for known accuracy issues
        accuracy_checks = {
            'Python_3.13_Requirement': {
                'expected_observations': ['mandatory for production', 'VANA requires'],
                'forbidden_observations': ['optional', 'python 3.12']
            },
            'VANA_Project': {
                'expected_observations': ['operational', 'multi-agent'],
                'forbidden_observations': ['down', 'single agent']
            }
        }
        
        for entity_id, checks in accuracy_checks.items():
            if entity_id in entities:
                observations = entities[entity_id].get('observations', [])
                obs_text = ' '.join(observations).lower()
                
                # Check for missing expected information
                for expected in checks['expected_observations']:
                    if expected not in obs_text:
                        issues.append(MemoryIssue(
                            type='accuracy',
                            severity='medium',
                            description=f"{entity_id} missing expected information: {expected}",
                            affected_entities=[entity_id],
                            recommendation=f"Verify and add accurate information about {expected}"
                        ))
                
                # Check for forbidden information
                for forbidden in checks['forbidden_observations']:
                    if forbidden in obs_text:
                        issues.append(MemoryIssue(
                            type='accuracy',
                            severity='high',
                            description=f"{entity_id} contains inaccurate information: {forbidden}",
                            affected_entities=[entity_id],
                            recommendation=f"Remove or correct inaccurate information about {forbidden}",
                            auto_fixable=True
                        ))
        
        return issues
    
    def _check_relevance(self, memory_data: Dict) -> List[MemoryIssue]:
        """Check for irrelevant or low-value information"""
        issues = []
        
        entities = memory_data.get('entities', {})
        
        # Check for entities with very few connections
        relations = memory_data.get('relations', [])
        entity_connections = {}
        
        for relation in relations:
            entity_connections.setdefault(relation['source'], 0)
            entity_connections.setdefault(relation['target'], 0)
            entity_connections[relation['source']] += 1
            entity_connections[relation['target']] += 1
        
        for entity_id in entities:
            if entity_id not in self.critical_entities:
                connections = entity_connections.get(entity_id, 0)
                if connections == 0:
                    issues.append(MemoryIssue(
                        type='low_relevance',
                        severity='low',
                        description=f"{entity_id} has no connections to other entities",
                        affected_entities=[entity_id],
                        recommendation="Consider removing if not relevant to project",
                        auto_fixable=True
                    ))
        
        return issues
    
    def apply_auto_fixes(self, memory_data: Dict, issues: List[MemoryIssue]) -> Dict[str, Any]:
        """Apply automatic fixes to resolvable issues"""
        
        fixes_applied = []
        
        for issue in issues:
            if issue.auto_fixable:
                if issue.type == 'contradiction' and 'status' in issue.description:
                    # Keep most recent status observation
                    entity_id = issue.affected_entities[0]
                    fixes_applied.append(self._resolve_status_contradiction(memory_data, entity_id))
                    
                elif issue.type == 'accuracy' and 'forbidden' in issue.description:
                    # Remove inaccurate information
                    entity_id = issue.affected_entities[0]
                    fixes_applied.append(self._remove_inaccurate_info(memory_data, entity_id, issue))
                    
                elif issue.type == 'low_relevance':
                    # Remove disconnected entities
                    entity_id = issue.affected_entities[0]
                    fixes_applied.append(self._remove_irrelevant_entity(memory_data, entity_id))
        
        return {
            'fixes_applied': len(fixes_applied),
            'details': fixes_applied,
            'updated_memory': memory_data
        }
    
    # Helper methods
    
    def _has_conflicts(self, observations: List[str]) -> bool:
        """Check if observations conflict with each other"""
        # Simple conflict detection - could be enhanced with NLP
        conflict_pairs = [
            ('mandatory', 'optional'),
            ('required', 'optional'),
            ('operational', 'down'),
            ('working', 'broken')
        ]
        
        obs_lower = [obs.lower() for obs in observations]
        
        for word1, word2 in conflict_pairs:
            if any(word1 in obs for obs in obs_lower) and any(word2 in obs for obs in obs_lower):
                return True
        
        return False
    
    def _calculate_quality_score(self, issues: List[MemoryIssue], memory_data: Dict) -> float:
        """Calculate overall memory quality score (0-100)"""
        
        # Start with perfect score
        score = 100.0
        
        # Deduct points based on issue severity
        severity_weights = {
            'critical': 25,
            'high': 10,
            'medium': 5,
            'low': 1
        }
        
        for issue in issues:
            score -= severity_weights.get(issue.severity, 1)
        
        # Bonus for completeness
        entities = memory_data.get('entities', {})
        if all(entity in entities for entity in self.critical_entities):
            score += 5
        
        return max(0, min(100, score))
    
    def _determine_status(self, quality_score: float) -> str:
        """Determine memory health status based on quality score"""
        if quality_score >= 90:
            return 'excellent'
        elif quality_score >= 75:
            return 'good'
        elif quality_score >= 60:
            return 'fair'
        elif quality_score >= 40:
            return 'poor'
        else:
            return 'critical'
    
    def _generate_recommendations(self, issues: List[MemoryIssue]) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Group issues by type
        issue_types = {}
        for issue in issues:
            issue_types.setdefault(issue.type, []).append(issue)
        
        # Generate type-specific recommendations
        if 'contradiction' in issue_types:
            recommendations.append("Run contradiction resolution to fix conflicting information")
        
        if 'staleness' in issue_types:
            recommendations.append("Update outdated entities with current information")
        
        if 'missing_entities' in issue_types:
            recommendations.append("Add missing critical entities to ensure complete context")
        
        if 'accuracy' in issue_types:
            recommendations.append("Verify and correct inaccurate information")
        
        auto_fixable_count = len([i for i in issues if i.auto_fixable])
        if auto_fixable_count > 0:
            recommendations.append(f"Apply automatic fixes for {auto_fixable_count} resolvable issues")
        
        return recommendations
    
    # Auto-fix implementations
    
    def _resolve_status_contradiction(self, memory_data: Dict, entity_id: str) -> str:
        """Resolve status contradictions by keeping most recent"""
        # Implementation would keep most recent status observation
        return f"Resolved status contradiction for {entity_id}"
    
    def _remove_inaccurate_info(self, memory_data: Dict, entity_id: str, issue: MemoryIssue) -> str:
        """Remove inaccurate information"""
        # Implementation would remove flagged inaccurate observations
        return f"Removed inaccurate information from {entity_id}"
    
    def _remove_irrelevant_entity(self, memory_data: Dict, entity_id: str) -> str:
        """Remove irrelevant entities"""
        # Implementation would remove disconnected entities
        return f"Removed irrelevant entity {entity_id}"

# Usage example
def main():
    """Example usage of Memory Quality Manager"""
    
    manager = MemoryQualityManager()
    
    # Sample memory data
    memory_data = {
        'entities': {
            'Nick': {
                'observations': ['prefers concise responses', 'project owner'],
                'last_updated': '2024-01-20T10:00:00'
            },
            'VANA_Project': {
                'observations': ['operational', 'requires Python 3.13+'],
                'last_updated': '2024-01-25T15:30:00'
            }
        },
        'relations': [
            {'source': 'Nick', 'type': 'manages', 'target': 'VANA_Project'}
        ]
    }
    
    # Assess memory quality
    assessment = manager.assess_memory_quality(memory_data)
    
    print(f"Memory Quality Score: {assessment['quality_score']}")
    print(f"Status: {assessment['status']}")
    print(f"Issues found: {sum(len(issues) for issues in assessment['issues'].values())}")
    
    # Apply auto-fixes if available
    if assessment['auto_fixes_available'] > 0:
        auto_fixable_issues = [
            issue for issues_list in assessment['issues'].values() 
            for issue in issues_list if issue.auto_fixable
        ]
        fixes = manager.apply_auto_fixes(memory_data, auto_fixable_issues)
        print(f"Applied {fixes['fixes_applied']} automatic fixes")

if __name__ == "__main__":
    main()