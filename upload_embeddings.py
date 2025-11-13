#!/usr/bin/env python3
"""
Upload locally-generated embeddings to Supabase intent_examples table.

Prerequisites:
1. Run `pip3 install supabase` to install the Supabase Python client
2. Set environment variables:
   - SUPABASE_URL (from .env.local)
   - SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard)
3. Run `python3 create_embeddings.py` first to generate intent_embeddings.json
4. Apply the schema migration: `supabase db push`

Usage:
    export SUPABASE_URL="https://your-project.supabase.co"
    export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
    python3 upload_embeddings.py
"""

import json
import os
from supabase import create_client, Client

# Configuration
EMBEDDINGS_FILE = "intent_embeddings.json"
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def load_embeddings():
    """Load embeddings from JSON file."""
    if not os.path.exists(EMBEDDINGS_FILE):
        raise FileNotFoundError(
            f"{EMBEDDINGS_FILE} not found. Please run: python3 create_embeddings.py"
        )

    with open(EMBEDDINGS_FILE, "r") as f:
        return json.load(f)

def validate_environment():
    """Ensure required environment variables are set."""
    if not SUPABASE_URL:
        raise ValueError("SUPABASE_URL environment variable not set")
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY environment variable not set")

    print(f"✅ Supabase URL: {SUPABASE_URL}")

def clear_existing_data(supabase: Client):
    """Delete all existing records from intent_examples table."""
    print("\n🗑️  Clearing existing intent_examples data...")
    try:
        # Delete all rows (service role key has admin permissions)
        result = supabase.table("intent_examples").delete().neq("id", 0).execute()
        print(f"   Deleted {len(result.data) if result.data else 0} existing records")
    except Exception as e:
        print(f"   Note: {e}")
        print("   (This is expected if the table is empty)")

def upload_embeddings(supabase: Client, embeddings_data: dict):
    """Upload embeddings to Supabase intent_examples table."""
    print("\n📤 Uploading embeddings to Supabase...")

    total_records = sum(len(examples) for examples in embeddings_data.values())
    uploaded_count = 0
    batch_size = 50  # Supabase recommends batching inserts

    for intent, examples in embeddings_data.items():
        print(f"\n   Processing intent: '{intent}' ({len(examples)} examples)")

        # Prepare records for batch insert
        batch = []
        for example in examples:
            batch.append({
                "intent": intent,
                "text": example["text"],
                "embedding": example["embedding"]
            })

            # Insert in batches
            if len(batch) >= batch_size:
                try:
                    supabase.table("intent_examples").insert(batch).execute()
                    uploaded_count += len(batch)
                    print(f"      Uploaded batch ({uploaded_count}/{total_records})")
                    batch = []
                except Exception as e:
                    print(f"      ❌ Error uploading batch: {e}")
                    raise

        # Insert remaining records in final batch
        if batch:
            try:
                supabase.table("intent_examples").insert(batch).execute()
                uploaded_count += len(batch)
                print(f"      Uploaded final batch ({uploaded_count}/{total_records})")
            except Exception as e:
                print(f"      ❌ Error uploading final batch: {e}")
                raise

    return uploaded_count

def verify_upload(supabase: Client, expected_count: int):
    """Verify that all records were uploaded successfully."""
    print("\n🔍 Verifying upload...")
    try:
        result = supabase.table("intent_examples").select("id", count="exact").execute()
        actual_count = result.count

        if actual_count == expected_count:
            print(f"   ✅ SUCCESS! {actual_count} records uploaded and verified")
        else:
            print(f"   ⚠️  WARNING: Expected {expected_count} records, found {actual_count}")

        # Show count by intent
        for intent in ['react', 'image', 'code', 'mermaid', 'markdown', 'chat', 'svg']:
            result = supabase.table("intent_examples").select("id", count="exact").eq("intent", intent).execute()
            print(f"      {intent}: {result.count} examples")

    except Exception as e:
        print(f"   ❌ Verification failed: {e}")

def main():
    print("=" * 60)
    print("🚀 Supabase Intent Embeddings Uploader")
    print("=" * 60)

    try:
        # Step 1: Validate environment
        validate_environment()

        # Step 2: Load embeddings from JSON
        print("\n📂 Loading embeddings from JSON...")
        embeddings_data = load_embeddings()
        total_examples = sum(len(examples) for examples in embeddings_data.values())
        embedding_dim = len(embeddings_data['react'][0]['embedding'])
        print(f"   Loaded {total_examples} examples")
        print(f"   Embedding dimension: {embedding_dim}")
        print(f"   Model: mixedbread-ai/mxbai-embed-large-v1")

        if embedding_dim != 1024:
            print(f"   ⚠️  WARNING: Expected 1024 dimensions, got {embedding_dim}")
            print(f"   Make sure your Supabase schema supports {embedding_dim} dimensions")

        # Step 3: Connect to Supabase
        print("\n🔌 Connecting to Supabase...")
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
        print("   Connected successfully")

        # Step 4: Clear existing data
        clear_existing_data(supabase)

        # Step 5: Upload embeddings
        uploaded_count = upload_embeddings(supabase, embeddings_data)

        # Step 6: Verify upload
        verify_upload(supabase, uploaded_count)

        print("\n" + "=" * 60)
        print("✅ Upload complete!")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Test intent detection in your app")
        print("2. Monitor logs: supabase functions logs chat")
        print("3. The chat function should now use your local embeddings!")

    except FileNotFoundError as e:
        print(f"\n❌ Error: {e}")
        print("\nPlease run: python3 create_embeddings.py")
    except ValueError as e:
        print(f"\n❌ Error: {e}")
        print("\nPlease set environment variables:")
        print('  export SUPABASE_URL="https://your-project.supabase.co"')
        print('  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"')
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
