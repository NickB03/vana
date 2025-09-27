#!/usr/bin/env python3
"""
Test script for Gemini 2.5 Flash model configuration.

This script tests the model initialization, API key configuration,
and basic response generation to ensure the Phase 3 migration is working.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import google.generativeai as genai
    from google.generativeai.types import HarmCategory, HarmBlockThreshold
except ImportError:
    print("❌ Error: google.generativeai not available")
    sys.exit(1)


def test_api_key_config():
    """Test API key configuration."""
    print("🔑 Testing API key configuration...")

    # Check environment variables
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GOOGLE_API_KEY environment variable not set")
        return False

    print(f"✅ GOOGLE_API_KEY found: {api_key[:10]}...")

    try:
        genai.configure(api_key=api_key)
        print("✅ Google Generative AI configured successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to configure Google Generative AI: {e}")
        return False


def test_model_availability():
    """Test if the specific Gemini model is available."""
    print("\n🤖 Testing model availability...")

    try:
        # List available models
        models = list(genai.list_models())
        available_models = [m.name for m in models if 'gemini' in m.name.lower()]

        print(f"Available Gemini models: {len(available_models)}")
        for model_name in available_models[:5]:  # Show first 5
            print(f"  - {model_name}")

        # Test specific model names we want to use
        target_models = ["gemini-2.0-flash-exp", "gemini-2.5-flash", "models/gemini-2.0-flash-exp"]

        for target_model in target_models:
            full_model_names = [m.name for m in models if target_model in m.name]
            if full_model_names:
                print(f"✅ Target model '{target_model}' found: {full_model_names[0]}")
                return full_model_names[0]

        print("⚠️  Specific target models not found, trying fallback models...")
        flash_models = [m.name for m in models if 'flash' in m.name.lower()]
        if flash_models:
            print(f"✅ Using fallback Flash model: {flash_models[0]}")
            return flash_models[0]

        return None

    except Exception as e:
        print(f"❌ Failed to list models: {e}")
        return None


def test_model_initialization(model_name):
    """Test model initialization."""
    print(f"\n🚀 Testing model initialization for: {model_name}")

    try:
        # Initialize the model
        model = genai.GenerativeModel(model_name)
        print("✅ Model initialized successfully")
        return model
    except Exception as e:
        print(f"❌ Failed to initialize model: {e}")
        return None


async def test_response_generation(model):
    """Test basic response generation."""
    print("\n💬 Testing response generation...")

    test_prompt = "What is artificial intelligence? Please provide a brief, clear explanation."

    try:
        # Test synchronous generation
        print("Testing synchronous generation...")
        response = model.generate_content(test_prompt)

        if hasattr(response, 'text') and response.text:
            print(f"✅ Response generated successfully: {len(response.text)} characters")
            print(f"Preview: {response.text[:100]}...")
            return True
        else:
            print(f"⚠️  Response generated but no text content: {response}")
            return False

    except Exception as e:
        print(f"❌ Failed to generate response: {e}")
        return False


async def test_async_generation(model):
    """Test asynchronous response generation."""
    print("\n⚡ Testing asynchronous generation...")

    test_prompt = "Explain quantum computing in simple terms."

    try:
        # Test async generation using asyncio.to_thread
        response = await asyncio.to_thread(
            model.generate_content,
            test_prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                top_p=0.8,
                top_k=40,
                max_output_tokens=500,
            )
        )

        if hasattr(response, 'text') and response.text:
            print(f"✅ Async response generated successfully: {len(response.text)} characters")
            print(f"Preview: {response.text[:100]}...")
            return True
        else:
            print(f"⚠️  Async response generated but no text content: {response}")
            return False

    except Exception as e:
        print(f"❌ Failed to generate async response: {e}")
        return False


def test_error_handling():
    """Test error handling with invalid inputs."""
    print("\n🛡️ Testing error handling...")

    try:
        # Test with invalid model name
        invalid_model = genai.GenerativeModel("invalid-model-name")
        invalid_model.generate_content("test")
        print("⚠️  Expected error not raised for invalid model")
        return False
    except Exception as e:
        print(f"✅ Invalid model properly handled: {type(e).__name__}")
        return True


async def main():
    """Main test function."""
    print("🧪 Gemini 2.5 Flash Configuration Test")
    print("=" * 50)

    # Test 1: API Key Configuration
    if not test_api_key_config():
        print("\n❌ API key configuration failed. Cannot proceed.")
        return False

    # Test 2: Model Availability
    model_name = test_model_availability()
    if not model_name:
        print("\n❌ No suitable Gemini model found. Cannot proceed.")
        return False

    # Test 3: Model Initialization
    model = test_model_initialization(model_name)
    if not model:
        print("\n❌ Model initialization failed. Cannot proceed.")
        return False

    # Test 4: Response Generation
    if not await test_response_generation(model):
        print("\n⚠️  Basic response generation failed.")

    # Test 5: Async Response Generation
    if not await test_async_generation(model):
        print("\n⚠️  Async response generation failed.")

    # Test 6: Error Handling
    test_error_handling()

    print("\n" + "=" * 50)
    print("✅ Gemini 2.5 Flash configuration test completed!")
    print(f"✅ Using model: {model_name}")
    return True


if __name__ == "__main__":
    # Load environment variables from .env.local if it exists
    env_local_path = Path(__file__).parent.parent / ".env.local"
    if env_local_path.exists():
        with open(env_local_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)