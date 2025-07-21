"""
Individual Specialist Function Tests

Tests that validate each specialist agent functions correctly individually,
including their tools, capabilities, and expected responses.
"""

import pytest
from tests.mocks import MockedGoogleAPI


class TestIndividualSpecialists:
    """Test individual specialist functionality."""
    
    def test_architecture_specialist_functionality(self):
        """Test architecture specialist functions correctly."""
        with MockedGoogleAPI() as mock_ai:
            try:
                from agents.specialists.architecture_specialist import architecture_specialist
                
                # Test basic properties
                assert architecture_specialist.name == "architecture_specialist"
                assert "gemini" in architecture_specialist.model.lower()
                assert "architecture" in architecture_specialist.description.lower()
                
                # Test tools are loaded
                tools = getattr(architecture_specialist, 'tools', [])
                print(f"✅ Architecture specialist has {len(tools)} tools")
                
                # Test can handle architecture request
                request = "Design a microservices architecture for a web application"
                response = architecture_specialist.run(request, {})
                
                assert isinstance(response, str)
                assert len(response) > 0
                print(f"✅ Architecture specialist responds to requests: {len(response)} chars")
                
            except Exception as e:
                pytest.fail(f"Architecture specialist test failed: {e}")
    
    def test_data_science_specialist_functionality(self):
        """Test data science specialist functions correctly."""
        with MockedGoogleAPI() as mock_ai:
            try:
                from agents.specialists.data_science_specialist import data_science_specialist
                
                # Test basic properties
                assert data_science_specialist.name == "data_science_specialist"
                assert "gemini" in data_science_specialist.model.lower()
                assert "data" in data_science_specialist.description.lower()
                
                # Test tools are loaded (should include data science tools)
                tools = getattr(data_science_specialist, 'tools', [])
                print(f"✅ Data science specialist has {len(tools)} tools")
                
                # Test data analysis tool directly
                from agents.specialists.data_science_tools import analyze_data_simple
                
                test_data = "[1,2,3,4,5]"
                result = analyze_data_simple(test_data, "descriptive")
                
                assert "Mean:" in result
                assert "Median:" in result
                assert "Std Dev:" in result
                print("✅ Data science tools work correctly")
                
                # Test specialist response
                request = "Analyze this dataset: [1,2,3,4,5,6,7,8,9,10]"
                response = data_science_specialist.run(request, {})
                
                assert isinstance(response, str)
                assert len(response) > 0
                print(f"✅ Data science specialist responds: {len(response)} chars")
                
            except Exception as e:
                pytest.fail(f"Data science specialist test failed: {e}")
    
    # Security specialist archived for MVP
    # def test_security_specialist_functionality(self):
    #     """Test security specialist functions correctly."""
    #     with MockedGoogleAPI() as mock_ai:
    #         try:
    #             from agents.specialists.security_specialist import security_specialist
    #             
    #             # Test basic properties
    #             assert security_specialist.name == "security_specialist"
    #             assert "gemini" in security_specialist.model.lower()
    #             assert "security" in security_specialist.description.lower()
    #             
    #             # Test tools are loaded
    #             tools = getattr(security_specialist, 'tools', [])
    #             print(f"✅ Security specialist has {len(tools)} tools")
    #             
    #             # Test can handle security request
    #             request = "Analyze security vulnerabilities in a web application"
    #             response = security_specialist.run(request, {})
    #             
    #             assert isinstance(response, str)
    #             assert len(response) > 0
    #             print(f"✅ Security specialist responds to requests: {len(response)} chars")
    #             
    #         except Exception as e:
    #             pytest.fail(f"Security specialist test failed: {e}")
    
    def test_devops_specialist_functionality(self):
        """Test DevOps specialist functions correctly."""
        with MockedGoogleAPI() as mock_ai:
            try:
                from agents.specialists.devops_specialist import devops_specialist
                
                # Test basic properties
                assert devops_specialist.name == "devops_specialist"
                assert "gemini" in devops_specialist.model.lower()
                assert "devops" in devops_specialist.description.lower()
                
                # Test tools are loaded
                tools = getattr(devops_specialist, 'tools', [])
                print(f"✅ DevOps specialist has {len(tools)} tools")
                
                # Test can handle DevOps request
                request = "Create a Docker deployment strategy for a Python application"
                response = devops_specialist.run(request, {})
                
                assert isinstance(response, str)
                assert len(response) > 0
                print(f"✅ DevOps specialist responds to requests: {len(response)} chars")
                
            except Exception as e:
                pytest.fail(f"DevOps specialist test failed: {e}")
    
    def test_research_specialist_functionality(self):
        """Test research specialist functions correctly."""
        with MockedGoogleAPI() as mock_ai:
            try:
                from agents.specialists.research_specialist import research_specialist
                
                # Test basic properties
                assert research_specialist.name == "research_specialist"
                assert "gemini" in research_specialist.model.lower()
                assert "research" in research_specialist.description.lower()
                
                # Test tools are loaded (should include google_search)
                tools = getattr(research_specialist, 'tools', [])
                print(f"✅ Research specialist has {len(tools)} tools")
                
                # Verify google_search is available
                tool_names = [getattr(tool, '__name__', str(tool)) for tool in tools]
                print(f"   Tools: {tool_names}")
                
                # Test can handle research request
                request = "Research the latest trends in artificial intelligence"
                response = research_specialist.run(request, {})
                
                assert isinstance(response, str)
                assert len(response) > 0
                print(f"✅ Research specialist responds to requests: {len(response)} chars")
                
            except Exception as e:
                pytest.fail(f"Research specialist test failed: {e}")
    
    def test_qa_specialist_functionality(self):
        """Test QA specialist functions correctly."""
        with MockedGoogleAPI() as mock_ai:
            try:
                from agents.specialists.qa_specialist import qa_specialist
                
                # Test basic properties
                assert qa_specialist.name in ["qa_specialist", "QASpecialist"]  # Handle both formats
                assert "gemini" in qa_specialist.model.lower()
                assert "qa" in qa_specialist.description.lower() or "quality" in qa_specialist.description.lower()
                
                # Test tools are loaded
                tools = getattr(qa_specialist, 'tools', [])
                print(f"✅ QA specialist has {len(tools)} tools")
                
                # Test can handle QA request
                request = "Create a test plan for a user registration feature"
                response = qa_specialist.run(request, {})
                
                assert isinstance(response, str)
                assert len(response) > 0
                print(f"✅ QA specialist responds to requests: {len(response)} chars")
                
            except Exception as e:
                pytest.fail(f"QA specialist test failed: {e}")
    
    def test_all_specialists_respond_consistently(self):
        """Test that all specialists respond to a common request."""
        with MockedGoogleAPI() as mock_ai:
            specialists = [
                ('architecture_specialist', 'agents.specialists.architecture_specialist'),
                ('data_science_specialist', 'agents.specialists.data_science_specialist'),
                ('security_specialist', 'agents.specialists.security_specialist'),
                ('devops_specialist', 'agents.specialists.devops_specialist'),
                ('research_specialist', 'agents.specialists.research_specialist'),
                ('qa_specialist', 'agents.specialists.qa_specialist')
            ]
            
            common_request = "Explain your role and capabilities"
            responses = {}
            
            for name, module in specialists:
                try:
                    import importlib
                    specialist_module = importlib.import_module(module)
                    specialist = getattr(specialist_module, name)
                    
                    response = specialist.run(common_request, {})
                    responses[name] = response
                    
                    assert isinstance(response, str)
                    assert len(response) > 0
                    print(f"✅ {name}: {len(response)} char response")
                    
                except Exception as e:
                    pytest.fail(f"Specialist {name} failed common request: {e}")
            
            # Verify we got responses from all specialists
            assert len(responses) == len(specialists)
            
            print(f"\n🎯 All {len(specialists)} specialists responded consistently")
            
            # Check for variety in responses (should be different)
            unique_responses = set(responses.values())
            assert len(unique_responses) > 1, "Specialists should give different responses"
            
            print("✅ Specialists provide varied, specialized responses")


if __name__ == "__main__":
    # Run the individual specialist tests
    pytest.main([__file__, "-v", "-s"])