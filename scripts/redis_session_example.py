#!/usr/bin/env python3
"""Example script demonstrating Redis session store usage.

This script shows how to integrate the Redis session store into your application
and use all its features including cross-session memory and persistence.

Usage:
    python scripts/redis_session_example.py

Requirements:
    - Redis server running on localhost:6379 (or configure REDIS_URL)
    - Redis Python client installed: pip install redis>=5.0.0
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to the Python path
app_dir = Path(__file__).parent.parent / "app"
sys.path.insert(0, str(app_dir))

# Set environment variables for demo
os.environ["REDIS_ENABLED"] = "true"
os.environ["REDIS_URL"] = "redis://localhost:6379"
os.environ["REDIS_DB"] = "0"
os.environ["ENVIRONMENT"] = "development"

from app.utils import (
    create_session_store,
    get_session_store,
    get_session_store_stats,
    shutdown_session_store,
    store_user_context,
    get_user_context,
    store_agent_memory,
    get_agent_memory,
    get_session_history,
    REDIS_COMPONENTS_AVAILABLE,
)


async def demonstrate_basic_session_operations():
    """Demonstrate basic session operations."""
    print("\n=== Basic Session Operations ===")

    store = get_session_store()
    session_id = "example_session_001"
    user_id = 12345

    # Create a session
    print(f"Creating session: {session_id}")

    if hasattr(store, 'ensure_session_async'):
        session = await store.ensure_session_async(
            session_id,
            user_id=user_id,
            title="Example Research Session",
            status="active",
            client_ip="127.0.0.1",
            user_agent="ExampleClient/1.0"
        )
    else:
        session = store.ensure_session(
            session_id,
            user_id=user_id,
            title="Example Research Session",
            status="active",
            client_ip="127.0.0.1",
            user_agent="ExampleClient/1.0"
        )

    print(f"Session created: {session.id}")
    print(f"Session user: {session.user_id}")
    print(f"Session title: {session.title}")

    # Add some messages
    messages = [
        {"role": "user", "content": "What are the latest developments in AI?"},
        {"role": "assistant", "content": "I'll research the latest AI developments for you..."},
        {"role": "system", "content": "Starting comprehensive AI research..."},
        {"role": "assistant", "content": "Here are the key developments I found: ..."},
    ]

    for i, message_data in enumerate(messages):
        message_data["id"] = f"msg_{i+1}"

        if hasattr(store, 'add_message_async'):
            message = await store.add_message_async(session_id, message_data)
        else:
            message = store.add_message(session_id, message_data)

        print(f"Added message: {message.role} - {message.content[:50]}...")

    # Retrieve the session
    print("\nRetrieving session...")

    if hasattr(store, 'get_session_async'):
        session_data = await store.get_session_async(session_id, user_id=user_id)
    else:
        session_data = store.get_session(session_id, user_id=user_id)

    if session_data:
        print(f"Retrieved session with {len(session_data['messages'])} messages")
        print(f"Session status: {session_data['status']}")
    else:
        print("Session not found!")


async def demonstrate_cross_session_memory():
    """Demonstrate cross-session memory features."""
    print("\n=== Cross-Session Memory ===")

    user_id = 12345
    agent_id = "research_agent_v2"

    # Store user context that persists across sessions
    print("Storing user context...")
    user_preferences = {
        "research_depth": "comprehensive",
        "preferred_sources": ["academic_papers", "industry_reports"],
        "output_format": "detailed_with_citations",
        "language": "english",
        "expertise_level": "expert"
    }

    success = await store_user_context(user_id, "research_preferences", user_preferences)
    if success:
        print("✓ User preferences stored successfully")
    else:
        print("✗ User preferences storage not available (using in-memory store)")

    # Store agent memory
    print("Storing agent memory...")
    agent_learning = {
        "user_interaction_patterns": {
            "prefers_detailed_explanations": True,
            "asks_follow_up_questions": True,
            "research_topics_of_interest": ["AI", "machine_learning", "data_science"]
        },
        "successful_research_strategies": [
            "Start with recent academic papers",
            "Include industry perspective",
            "Provide concrete examples"
        ],
        "knowledge_gaps_identified": [
            "quantum_computing_applications",
            "edge_ai_implementations"
        ]
    }

    success = await store_agent_memory(agent_id, "user_interactions", agent_learning)
    if success:
        print("✓ Agent memory stored successfully")
    else:
        print("✗ Agent memory storage not available (using in-memory store)")

    # Retrieve stored data
    print("\nRetrieving stored data...")

    retrieved_preferences = await get_user_context(user_id, "research_preferences")
    if retrieved_preferences:
        print(f"✓ Retrieved user preferences: {retrieved_preferences['research_depth']}")
    else:
        print("✗ No user preferences found")

    retrieved_memory = await get_agent_memory(agent_id, "user_interactions")
    if retrieved_memory:
        patterns = retrieved_memory["user_interaction_patterns"]
        print(f"✓ Retrieved agent memory: {len(patterns)} interaction patterns")
    else:
        print("✗ No agent memory found")


async def demonstrate_session_history():
    """Demonstrate session history tracking."""
    print("\n=== Session History ===")

    user_id = 12345

    # Get session history for the user
    history = await get_session_history(user_id, limit=5)

    if history:
        print(f"Found {len(history)} sessions in history:")
        for session in history:
            print(f"  - Session {session['session_id'][:8]}... "
                  f"({session['event_count']} events, "
                  f"last activity: {session['last_activity']})")
    else:
        print("No session history available (using in-memory store or no history)")


async def demonstrate_persistence_across_restarts():
    """Demonstrate data persistence across application restarts."""
    print("\n=== Persistence Across Restarts ===")

    store = get_session_store()

    if hasattr(store, 'get_redis_stats'):
        redis_stats = store.get_redis_stats()
        if redis_stats.get('redis_available'):
            print("✓ Using Redis - data will persist across restarts")
            print(f"Redis URL: {redis_stats.get('redis_url')}")
            print(f"Connection retries: {redis_stats.get('connection_retries', 0)}")
        else:
            print("✗ Redis not available - data will not persist")
    else:
        print("✗ Using in-memory store - data will not persist across restarts")


async def demonstrate_security_features():
    """Demonstrate security features."""
    print("\n=== Security Features ===")

    store = get_session_store()

    # Show security configuration
    if hasattr(store, '_config'):
        config = store._config
        print("Security configuration:")
        print(f"  - Session validation: {config.enable_session_validation}")
        print(f"  - User binding: {config.enable_user_binding}")
        print(f"  - Tampering detection: {config.enable_tampering_detection}")
        print(f"  - Max failed attempts: {config.max_failed_attempts}")

    # Get security statistics
    if hasattr(store, 'get_security_stats'):
        security_stats = store.get_security_stats()
        print("\nSecurity statistics:")
        print(f"  - Total sessions: {security_stats.get('total_sessions', 0)}")
        print(f"  - Flagged sessions: {security_stats.get('flagged_sessions', 0)}")
        print(f"  - Failed attempts: {security_stats.get('total_failed_attempts', 0)}")


async def show_system_statistics():
    """Show comprehensive system statistics."""
    print("\n=== System Statistics ===")

    stats = get_session_store_stats()

    print(f"Store type: {stats.get('store_type', 'unknown')}")
    print(f"Total sessions: {stats.get('total_sessions', 0)}")
    print(f"Total messages: {stats.get('total_messages', 0)}")

    if 'avg_messages_per_session' in stats:
        print(f"Avg messages per session: {stats['avg_messages_per_session']:.1f}")

    if 'redis' in stats:
        redis_info = stats['redis']
        print(f"\nRedis information:")
        print(f"  - Available: {redis_info.get('redis_available', False)}")
        if redis_info.get('redis_available'):
            print(f"  - URL: {redis_info.get('redis_url', 'unknown')}")
            print(f"  - Retries: {redis_info.get('connection_retries', 0)}")

    if 'config' in stats:
        config_info = stats['config']
        print(f"\nConfiguration:")
        print(f"  - Max sessions: {config_info.get('max_sessions', 'unlimited')}")
        print(f"  - Session TTL: {config_info.get('session_ttl_hours', 'unknown')} hours")
        print(f"  - Cleanup interval: {config_info.get('cleanup_interval_minutes', 'unknown')} minutes")


async def main():
    """Main demonstration function."""
    print("🚀 Redis Session Store Demonstration")
    print("=" * 50)

    # Check if Redis components are available
    if not REDIS_COMPONENTS_AVAILABLE:
        print("⚠️  Redis components not available - will use in-memory store")
        print("   To install Redis support: pip install redis>=5.0.0")
    else:
        print("✓ Redis components available")

    try:
        # Run all demonstrations
        await demonstrate_basic_session_operations()
        await demonstrate_cross_session_memory()
        await demonstrate_session_history()
        await demonstrate_persistence_across_restarts()
        await demonstrate_security_features()
        await show_system_statistics()

        print("\n" + "=" * 50)
        print("✅ All demonstrations completed successfully!")

    except KeyboardInterrupt:
        print("\n\n⚠️  Demonstration interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Error during demonstration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Always clean up
        print("\n🧹 Cleaning up...")
        try:
            await shutdown_session_store()
            print("✓ Session store shutdown complete")
        except Exception as e:
            print(f"⚠️  Error during cleanup: {e}")


if __name__ == "__main__":
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ This script requires Python 3.8 or higher")
        sys.exit(1)

    # Check if Redis is likely available
    try:
        import redis
        print("✓ Redis client is installed")
    except ImportError:
        print("⚠️  Redis client not installed. Install with: pip install redis>=5.0.0")
        print("   The demonstration will use in-memory storage instead.")

    # Run the demonstration
    asyncio.run(main())