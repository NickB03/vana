#!/usr/bin/env python3
"""
Validation script for Phase 1 Implementation

Verifies that all required components for Phase 1 specialists are correctly implemented
and follow ADK patterns.
"""

import os
import sys
import ast
from pathlib import Path
from typing import Dict, List, Set, Tuple

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


class Phase1Validator:
    """Validates Phase 1 implementation against requirements"""
    
    def __init__(self):
        self.project_root = PROJECT_ROOT
        self.validation_results = {
            'tools': {},
            'specialists': {},
            'integration': {},
            'adk_compliance': {},
            'errors': []
        }
    
    def validate_all(self) -> bool:
        """Run all validations"""
        print("🔍 Validating Phase 1 Implementation")
        print("=" * 60)
        
        # Validate tools
        self.validate_content_creation_tools()
        self.validate_research_tools()
        
        # Validate specialists
        self.validate_content_specialist()
        self.validate_research_specialist()
        
        # Validate integration
        self.validate_orchestrator_integration()
        
        # Generate report
        return self.generate_validation_report()
    
    def validate_content_creation_tools(self):
        """Validate content creation tools implementation"""
        print("\n📋 Validating Content Creation Tools...")
        
        tools_file = self.project_root / "lib" / "_tools" / "content_creation_tools.py"
        if not tools_file.exists():
            self.validation_results['errors'].append("content_creation_tools.py not found")
            return
        
        required_tools = [
            'write_document',
            'generate_outline',
            'edit_content',
            'format_markdown',
            'check_grammar',
            'improve_clarity'
        ]
        
        wrapped_tools = [
            'adk_write_document',
            'adk_generate_outline',
            'adk_edit_content',
            'adk_format_markdown',
            'adk_check_grammar',
            'adk_improve_clarity'
        ]
        
        validation = self._validate_tools_file(tools_file, required_tools, wrapped_tools)
        self.validation_results['tools']['content_creation'] = validation
        
        if validation['all_valid']:
            print("✅ All content creation tools validated")
        else:
            print("❌ Content creation tools validation failed")
    
    def validate_research_tools(self):
        """Validate research tools implementation"""
        print("\n📋 Validating Research Tools...")
        
        tools_file = self.project_root / "lib" / "_tools" / "research_tools.py"
        if not tools_file.exists():
            self.validation_results['errors'].append("research_tools.py not found")
            return
        
        required_tools = [
            'web_search_advanced',
            'analyze_sources',
            'extract_facts',
            'synthesize_findings',
            'validate_information',
            'generate_citations'
        ]
        
        wrapped_tools = [
            'adk_web_search_advanced',
            'adk_analyze_sources',
            'adk_extract_facts',
            'adk_synthesize_findings',
            'adk_validate_information',
            'adk_generate_citations'
        ]
        
        validation = self._validate_tools_file(tools_file, required_tools, wrapped_tools)
        self.validation_results['tools']['research'] = validation
        
        if validation['all_valid']:
            print("✅ All research tools validated")
        else:
            print("❌ Research tools validation failed")
    
    def validate_content_specialist(self):
        """Validate content creation specialist"""
        print("\n📋 Validating Content Creation Specialist...")
        
        specialist_file = self.project_root / "agents" / "specialists" / "content_creation_specialist.py"
        if not specialist_file.exists():
            self.validation_results['errors'].append("content_creation_specialist.py not found")
            return
        
        validation = self._validate_specialist_file(specialist_file, "content_creation_specialist")
        self.validation_results['specialists']['content_creation'] = validation
        
        if validation['valid']:
            print("✅ Content creation specialist validated")
        else:
            print("❌ Content creation specialist validation failed")
    
    def validate_research_specialist(self):
        """Validate research specialist"""
        print("\n📋 Validating Research Specialist...")
        
        specialist_file = self.project_root / "agents" / "specialists" / "research_specialist.py"
        if not specialist_file.exists():
            self.validation_results['errors'].append("research_specialist.py not found")
            return
        
        validation = self._validate_specialist_file(specialist_file, "research_specialist")
        self.validation_results['specialists']['research'] = validation
        
        if validation['valid']:
            print("✅ Research specialist validated")
        else:
            print("❌ Research specialist validation failed")
    
    def validate_orchestrator_integration(self):
        """Validate enhanced orchestrator integration"""
        print("\n📋 Validating Orchestrator Integration...")
        
        orchestrator_file = self.project_root / "agents" / "vana" / "enhanced_orchestrator.py"
        if not orchestrator_file.exists():
            self.validation_results['errors'].append("enhanced_orchestrator.py not found")
            return
        
        with open(orchestrator_file, 'r') as f:
            content = f.read()
        
        # Check for specialist imports (more flexible pattern)
        has_content_import = "content_creation_specialist import content_creation_specialist" in content or \
                           "from agents.specialists.content_creation_specialist import" in content
        has_research_import = "research_specialist import research_specialist" in content or \
                           "from agents.specialists.research_specialist import" in content
        
        # Check for routing patterns (both single and double quotes)
        has_content_routing = any(pattern in content for pattern in ["'write'", "'document'", "'content'", "'edit'", 
                                                                    '"write"', '"document"', '"content"', '"edit"'])
        has_research_routing = any(pattern in content for pattern in ["'research'", "'investigate'", "'find_information'",
                                                                     '"research"', '"investigate"', '"find_information"'])
        
        validation = {
            'imports_present': has_content_import and has_research_import,
            'routing_configured': has_content_routing and has_research_routing,
            'valid': all([has_content_import, has_research_import, has_content_routing, has_research_routing]),
            'details': {
                'has_content_import': has_content_import,
                'has_research_import': has_research_import,
                'has_content_routing': has_content_routing,
                'has_research_routing': has_research_routing
            }
        }
        
        self.validation_results['integration']['orchestrator'] = validation
        
        if validation['valid']:
            print("✅ Orchestrator integration validated")
        else:
            print("❌ Orchestrator integration validation failed")
            print(f"   Details: {validation['details']}")
    
    def _validate_tools_file(self, file_path: Path, required_tools: List[str], wrapped_tools: List[str]) -> Dict:
        """Validate a tools file for ADK compliance"""
        with open(file_path, 'r') as f:
            content = f.read()
        
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            return {'all_valid': False, 'error': f"Syntax error: {e}"}
        
        # Find all function definitions
        functions = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions[node.name] = node
        
        validation_results = {
            'tools': {},
            'wrappers': {},
            'all_valid': True
        }
        
        # Validate each required tool
        for tool_name in required_tools:
            if tool_name not in functions:
                validation_results['tools'][tool_name] = {'exists': False}
                validation_results['all_valid'] = False
                continue
            
            func = functions[tool_name]
            
            # Check for ToolContext parameter
            has_tool_context = any(
                arg.arg == 'tool_context' for arg in func.args.args
            )
            
            # Check return type annotation
            returns_dict = False
            if func.returns:
                returns_dict = 'Dict' in ast.unparse(func.returns)
            
            validation_results['tools'][tool_name] = {
                'exists': True,
                'has_tool_context': has_tool_context,
                'returns_dict': returns_dict,
                'valid': has_tool_context and returns_dict
            }
            
            if not validation_results['tools'][tool_name]['valid']:
                validation_results['all_valid'] = False
        
        # Check for FunctionTool wrappers
        for wrapper_name in wrapped_tools:
            validation_results['wrappers'][wrapper_name] = wrapper_name in content
            if not validation_results['wrappers'][wrapper_name]:
                validation_results['all_valid'] = False
        
        return validation_results
    
    def _validate_specialist_file(self, file_path: Path, specialist_name: str) -> Dict:
        """Validate a specialist file"""
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Count unique tool references in the tools list
        import re
        tools_pattern = r'tools=\[(.*?)\]'
        tools_match = re.search(tools_pattern, content, re.DOTALL)
        tools_count = 0
        if tools_match:
            tools_content = tools_match.group(1)
            # Count adk_ tool references
            tools_count = len(re.findall(r'adk_\w+', tools_content))
        
        validation = {
            'has_llm_agent': 'LlmAgent' in content,
            'has_correct_name': f'name="{specialist_name}"' in content,
            'has_model': 'model=' in content,
            'has_instruction': 'instruction=' in content,
            'has_tools': 'tools=[' in content,
            'tools_count': tools_count,
            'valid': True
        }
        
        # All checks must pass
        validation['valid'] = all([
            validation['has_llm_agent'],
            validation['has_correct_name'],
            validation['has_model'],
            validation['has_instruction'],
            validation['has_tools'],
            validation['tools_count'] == 6  # Exactly 6 tools
        ])
        
        return validation
    
    def generate_validation_report(self) -> bool:
        """Generate validation report"""
        print("\n" + "=" * 60)
        print("📊 VALIDATION SUMMARY")
        print("=" * 60)
        
        all_valid = True
        
        # Tools validation
        print("\n🔧 Tools Validation:")
        for tool_type, validation in self.validation_results['tools'].items():
            if validation.get('all_valid', False):
                print(f"  ✅ {tool_type}: All 6 tools valid")
            else:
                print(f"  ❌ {tool_type}: Validation failed")
                all_valid = False
        
        # Specialists validation
        print("\n🤖 Specialists Validation:")
        for specialist, validation in self.validation_results['specialists'].items():
            if validation.get('valid', False):
                print(f"  ✅ {specialist}: Valid ADK agent")
            else:
                print(f"  ❌ {specialist}: Validation failed")
                all_valid = False
        
        # Integration validation
        print("\n🔗 Integration Validation:")
        for component, validation in self.validation_results['integration'].items():
            if validation.get('valid', False):
                print(f"  ✅ {component}: Properly integrated")
            else:
                print(f"  ❌ {component}: Integration failed")
                all_valid = False
        
        # Errors
        if self.validation_results['errors']:
            print("\n❌ Errors:")
            for error in self.validation_results['errors']:
                print(f"  - {error}")
            all_valid = False
        
        print("\n" + "=" * 60)
        if all_valid:
            print("✅ PHASE 1 IMPLEMENTATION VALID")
            print("All components follow ADK patterns correctly")
        else:
            print("❌ PHASE 1 IMPLEMENTATION INVALID")
            print("Please fix the issues above")
        print("=" * 60)
        
        return all_valid


def main():
    """Main validation execution"""
    validator = Phase1Validator()
    is_valid = validator.validate_all()
    
    return 0 if is_valid else 1


if __name__ == "__main__":
    sys.exit(main())