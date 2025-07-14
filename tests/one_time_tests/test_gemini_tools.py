#!/usr/bin/env python3
"""Test Gemini with tools directly to debug MALFORMED_FUNCTION_CALL"""

import os
import sys

from dotenv import load_dotenv

# Add the project root to the Python path
project_root = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, project_root)

# Load environment variables
dotenv_path = os.path.join(project_root, '.env.local')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path, override=True)

import google.generativeai as genai

# Configure genai
api_key = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

def test_simple_tool():
    """Test with a simple tool to isolate the issue"""
    
    # Define a simple function
    def get_current_time(location: str) -> str:
        """Get the current time for a location.
        
        Args:
            location: The city or location to get time for
            
        Returns:
            A string with the current time information
        """
        return f"I would need to search for the current time in {location}. This is a test response."
    
    def multiply(a: float, b: float) -> float:
        """Multiply two numbers.
        
        Args:
            a: First number
            b: Second number
            
        Returns:
            The product of a and b
        """
        return a * b
    
    # Create model with tools
    model = genai.GenerativeModel(
        'gemini-2.5-flash',
        tools=[get_current_time, multiply]
    )
    
    # Test queries
    test_queries = [
        "What is 5 times 7?",
        "What time is it in Dallas?",
        "Hello, how are you?"
    ]
    
    for query in test_queries:
        print(f"\n📤 Query: {query}")
        try:
            response = model.generate_content(query)
            
            # Check if there were function calls
            if response.candidates and response.candidates[0].content.parts:
                for part in response.candidates[0].content.parts:
                    if part.function_call:
                        print(f"   🔧 Function Call: {part.function_call.name}")
                        print(f"      Args: {part.function_call.args}")
                        
                        # Execute the function
                        if part.function_call.name == "multiply":
                            result = multiply(**part.function_call.args)
                            print(f"      Result: {result}")
                        elif part.function_call.name == "get_current_time":
                            result = get_current_time(**part.function_call.args)
                            print(f"      Result: {result}")
                    else:
                        print(f"   📥 Response: {part.text}")
            else:
                print(f"   ❌ No valid response or function call")
                if hasattr(response, 'prompt_feedback'):
                    print(f"   Feedback: {response.prompt_feedback}")
                    
        except Exception as e:
            print(f"   ❌ Error: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    test_simple_tool()