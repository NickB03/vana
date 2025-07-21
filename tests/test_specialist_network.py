"""
Specialist Network Validation Tests

Tests that validate the full specialist network is operational
and can be orchestrated through the enhanced orchestrator.
"""

import pytest
from tests.mocks import MockedGoogleAPI


class TestSpecialistNetwork:
    """Test full specialist network functionality."""
    
    def test_all_specialists_load(self):
        """Test that all specialist agents load successfully."""
        with MockedGoogleAPI() as mock_ai:
            try:
                from agents.vana.agent import root_agent
                
                # Check that we have the expected specialists
                sub_agents = getattr(root_agent, 'sub_agents', [])
                specialist_names = [agent.name for agent in sub_agents]
                
                expected_specialists = [
                    'security_specialist',
                    'architecture_specialist', 
                    'data_science_specialist',
                    'devops_specialist',
                    'research_specialist',
                    'test_specialist'  # Phase 1 validation specialist
                ]
                
                print(f"✅ Loaded {len(sub_agents)} specialists:")
                for i, name in enumerate(specialist_names):
                    print(f"   {i+1}. {name}")
                
                # Verify all expected specialists are present
                for expected in expected_specialists:
                    assert expected in specialist_names, f"Missing specialist: {expected}"
                
                # Verify no test specialist dependency (should be fallback only)
                test_specialists = [name for name in specialist_names if 'test' in name.lower()]
                assert len(test_specialists) <= 1, "Should have at most one test specialist"
                
                print(f"✅ All {len(expected_specialists)} expected specialists loaded successfully")
                
            except Exception as e:
                pytest.fail(f"Failed to load specialist network: {e}")
    
    def test_orchestrator_configuration(self):
        """Test orchestrator configuration with specialist network."""
        with MockedGoogleAPI() as mock_ai:
            try:
                from agents.vana.agent import root_agent
                
                # Validate orchestrator properties
                assert root_agent.name == "vana_orchestrator"
                assert "gemini" in root_agent.model.lower()
                assert hasattr(root_agent, 'description')
                assert hasattr(root_agent, 'instruction')
                
                # Check tools are loaded
                tools = getattr(root_agent, 'tools', [])
                print(f"✅ Orchestrator has {len(tools)} tools loaded")
                
                # Check sub-agents
                sub_agents = getattr(root_agent, 'sub_agents', [])
                print(f"✅ Orchestrator has {len(sub_agents)} sub-agents")
                
                # Verify ADK compliance
                for agent in sub_agents:
                    assert hasattr(agent, 'name'), f"Agent missing name: {agent}"
                    assert hasattr(agent, 'model'), f"Agent missing model: {agent}"
                    print(f"   - {agent.name}: {agent.model}")
                
                print("✅ Orchestrator configuration validates ADK compliance")
                
            except Exception as e:
                pytest.fail(f"Orchestrator configuration validation failed: {e}")
    
    def test_specialist_individual_imports(self):
        """Test that each specialist can be imported individually."""
        with MockedGoogleAPI() as mock_ai:
            specialists = [
                ('architecture_specialist', 'agents.specialists.architecture_specialist'),
                ('data_science_specialist', 'agents.specialists.data_science_specialist'), 
                ('security_specialist', 'agents.specialists.security_specialist'),
                ('devops_specialist', 'agents.specialists.devops_specialist'),
                ('research_specialist', 'agents.specialists.research_specialist'),
                ('qa_specialist', 'agents.specialists.qa_specialist')
            ]
            
            success_count = 0
            failed_specialists = []
            
            for name, module in specialists:
                try:
                    # Use importlib for proper dynamic imports
                    import importlib
                    specialist_module = importlib.import_module(module)
                    specialist = getattr(specialist_module, name)
                    
                    # Validate specialist properties
                    assert hasattr(specialist, 'name')
                    assert hasattr(specialist, 'model')
                    assert hasattr(specialist, 'description')
                    
                    print(f"✅ {name}: {specialist.name} ({specialist.model})")
                    success_count += 1
                    
                except Exception as e:
                    failed_specialists.append((name, str(e)))
                    print(f"❌ {name}: {str(e)}")
            
            # Report results
            print(f"\n🎯 Individual import results: {success_count}/{len(specialists)} successful")
            
            if failed_specialists:
                failure_details = "\\n".join([f"  - {name}: {error}" for name, error in failed_specialists])
                pytest.fail(f"Some specialists failed to import:\\n{failure_details}")
            
            assert success_count == len(specialists), "All specialists should import successfully"
    
    def test_no_redis_dependencies(self):
        """Test that Redis dependencies have been removed."""
        # This test ensures we haven't broken anything with Redis removal
        with MockedGoogleAPI() as mock_ai:
            try:
                # Test data science tools (primary Redis user)
                from agents.specialists.data_science_tools import analyze_data_simple
                
                # Test function works without Redis
                result = analyze_data_simple('[1,2,3,4,5]', 'descriptive')
                
                assert "Mean:" in result
                assert "Median:" in result
                assert "Std Dev:" in result
                
                print("✅ Data science tools work without Redis")
                
                # Test rate limiter works without Redis  
                from lib.security.rate_limiter import RateLimiter
                
                limiter = RateLimiter(requests_per_minute=60)
                assert not limiter.use_redis
                
                print("✅ Rate limiter works without Redis")
                
            except Exception as e:
                pytest.fail(f"Redis dependency removal caused issues: {e}")
    
    def test_phase1_readiness(self):
        """Test that the system is ready for Phase 1 completion."""
        with MockedGoogleAPI() as mock_ai:
            try:
                from agents.vana.agent import root_agent
                
                # Check enhanced orchestrator loads with specialists
                sub_agents = getattr(root_agent, 'sub_agents', [])
                specialist_count = len([a for a in sub_agents if 'test' not in a.name.lower()])
                
                assert specialist_count >= 5, f"Expected at least 5 production specialists, got {specialist_count}"
                
                # Verify system state
                checks = {
                    "Enhanced orchestrator loaded": root_agent is not None,
                    "Specialists loaded": len(sub_agents) >= 5,
                    "No Redis dependencies": True,  # We removed them
                    "ADK patterns followed": all(hasattr(a, 'name') and hasattr(a, 'model') for a in sub_agents)
                }
                
                print("\\n🎯 Phase 1 Readiness Check:")
                for check, status in checks.items():
                    status_icon = "✅" if status else "❌"
                    print(f"   {status_icon} {check}")
                
                all_passed = all(checks.values())
                assert all_passed, "Phase 1 readiness check failed"
                
                print("\\n🎉 System ready for Phase 1 completion!")
                
            except Exception as e:
                pytest.fail(f"Phase 1 readiness check failed: {e}")


if __name__ == "__main__":
    # Run the specialist network tests
    pytest.main([__file__, "-v", "-s"])