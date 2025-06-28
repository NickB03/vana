#!/usr/bin/env python3
"""
Test Vector DB Update Mechanisms
Verifies proper file updates prevent conflicting information
"""

import sys
import tempfile
from pathlib import Path
from datetime import datetime

# Add the scripts directory to the path to import our modules
sys.path.insert(0, str(Path(__file__).parent))

try:
    from local_memory_server import VanaLocalMemory
    from vector_db_update_strategy import VectorUpdateManager
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Run from VANA root directory: python scripts/test_vector_update.py")
    exit(1)

def test_file_update_prevents_conflicts():
    """Test that file updates properly remove old chunks before adding new ones"""
    
    print("🧪 Testing Vector DB Update Mechanisms")
    print("=" * 50)
    
    # Create temporary memory database for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_db_path = Path(temp_dir) / "test_memory"
        
        print(f"📁 Using temporary database: {temp_db_path}")
        
        # Initialize memory system
        memory = VanaLocalMemory(str(temp_db_path))
        update_manager = VectorUpdateManager(memory)
        
        # Test file path
        test_file = Path(temp_dir) / "test_file.md"
        
        # Step 1: Create initial file content
        initial_content = """# Test Configuration
        
## Database Settings
- Host: localhost
- Port: 5432
- Username: admin

## Performance Settings
- Max connections: 100
- Timeout: 30 seconds
"""
        
        test_file.write_text(initial_content)
        print(f"📝 Created test file with initial content")
        
        # Step 2: Index the initial content
        print("\n🔄 Indexing initial content...")
        result1 = update_manager.update_file_embeddings(test_file, initial_content)
        
        print(f"   ✅ Initial indexing: +{result1['new_chunks_added']} chunks")
        
        # Step 3: Search for initial content
        search_results = memory.search("database host localhost", n_results=5)
        initial_results_count = len([r for r in search_results if "localhost" in r['content']])
        print(f"   🔍 Search found {initial_results_count} chunks with 'localhost'")
        
        # Step 4: Update file with conflicting information
        updated_content = """# Test Configuration
        
## Database Settings  
- Host: production-server.com
- Port: 5432
- Username: prod_admin

## Performance Settings
- Max connections: 200
- Timeout: 60 seconds

## Security Settings
- SSL: enabled
- Encryption: AES-256
"""
        
        test_file.write_text(updated_content)
        print(f"\n🔄 Updating file with new content...")
        result2 = update_manager.update_file_embeddings(test_file, updated_content)
        
        print(f"   🗑️ Removed old chunks: {result2['old_chunks_removed']}")
        print(f"   ✅ Added new chunks: {result2['new_chunks_added']}")
        
        # Step 5: Verify no conflicting information
        print(f"\n🧪 Testing for conflicting information...")
        
        # Search for old information (should not be found)
        old_search = memory.search("database host localhost", n_results=10)
        old_results_count = len([r for r in old_search if "localhost" in r['content']])
        
        # Search for new information (should be found)
        new_search = memory.search("database host production", n_results=10)
        new_results_count = len([r for r in new_search if "production-server.com" in r['content']])
        
        print(f"   🔍 Old content ('localhost'): {old_results_count} results")
        print(f"   🔍 New content ('production-server.com'): {new_results_count} results")
        
        # Step 6: Validate results
        test_passed = True
        issues = []
        
        if old_results_count > 0:
            test_passed = False
            issues.append(f"❌ Found {old_results_count} stale chunks with old content")
        
        if new_results_count == 0:
            test_passed = False
            issues.append("❌ New content not found in search results")
        
        if result2['old_chunks_removed'] == 0:
            test_passed = False
            issues.append("❌ No old chunks were removed during update")
        
        if result2['new_chunks_added'] == 0:
            test_passed = False
            issues.append("❌ No new chunks were added during update")
        
        # Step 7: Report results
        print(f"\n📊 Test Results:")
        print(f"=" * 30)
        
        if test_passed:
            print("✅ ALL TESTS PASSED")
            print("   ✓ Old chunks properly removed")
            print("   ✓ New chunks successfully added")
            print("   ✓ No conflicting information found")
            print("   ✓ Search results accurate and up-to-date")
        else:
            print("❌ TEST FAILURES DETECTED")
            for issue in issues:
                print(f"   {issue}")
        
        # Step 8: Show detailed search results for verification
        print(f"\n🔍 Detailed Search Results:")
        print(f"   Query: 'database host localhost' (old content)")
        for i, result in enumerate(old_search[:3], 1):
            content_preview = result['content'][:100] + "..." if len(result['content']) > 100 else result['content']
            print(f"     {i}. Similarity: {result['similarity_score']} - {content_preview}")
        
        print(f"\n   Query: 'database host production' (new content)")
        for i, result in enumerate(new_search[:3], 1):
            content_preview = result['content'][:100] + "..." if len(result['content']) > 100 else result['content']
            print(f"     {i}. Similarity: {result['similarity_score']} - {content_preview}")
        
        assert test_passed, f"Test failed: {'; '.join(issues)}"

def test_content_change_detection():
    """Test content change detection to avoid unnecessary updates"""
    
    print(f"\n🧪 Testing Content Change Detection")
    print("=" * 40)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_db_path = Path(temp_dir) / "test_memory2"
        
        memory = VanaLocalMemory(str(temp_db_path))
        update_manager = VectorUpdateManager(memory)
        
        test_file = Path(temp_dir) / "test_change.py"
        
        # Initial content
        content = '''def hello_world():
    """Simple hello world function"""
    print("Hello, World!")
    return "success"
'''
        
        test_file.write_text(content)
        
        # First update
        result1 = update_manager.update_file_embeddings(test_file, content)
        print(f"📝 Initial update: +{result1['new_chunks_added']} chunks")
        
        # Test unchanged content
        has_changed = update_manager.detect_content_changes(test_file, content)
        print(f"🔍 Content changed (same content): {has_changed}")
        
        # Test changed content
        new_content = content + '\n\nprint("Updated code!")'
        has_changed2 = update_manager.detect_content_changes(test_file, new_content)
        print(f"🔍 Content changed (modified content): {has_changed2}")
        
        # Validate
        change_detection_passed = not has_changed and has_changed2
        
        if change_detection_passed:
            print("✅ Content change detection working correctly")
        else:
            print("❌ Content change detection failed")
            
        assert change_detection_passed, "Content change detection failed"

def test_orphaned_chunk_cleanup():
    """Test cleanup of chunks for deleted files"""
    
    print(f"\n🧪 Testing Orphaned Chunk Cleanup")
    print("=" * 40)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_db_path = Path(temp_dir) / "test_memory3"
        
        memory = VanaLocalMemory(str(temp_db_path))
        update_manager = VectorUpdateManager(memory)
        
        # Create multiple test files
        files_content = {
            'file1.md': '# File 1\nThis is the first test file.',
            'file2.md': '# File 2\nThis is the second test file.',
            'file3.md': '# File 3\nThis is the third test file.'
        }
        
        test_files = []
        for filename, content in files_content.items():
            file_path = Path(temp_dir) / filename
            file_path.write_text(content)
            test_files.append(file_path)
            
            # Index each file
            update_manager.update_file_embeddings(file_path, content)
            print(f"📝 Indexed {filename}")
        
        # Verify all files are indexed
        total_chunks_before = memory.get_collection("vana_memory").count()
        print(f"📊 Total chunks before deletion: {total_chunks_before}")
        
        # Delete two files (simulating file deletion)
        files_to_delete = test_files[:2]
        for file_path in files_to_delete:
            file_path.unlink()
            print(f"🗑️ Deleted {file_path.name}")
        
        # Run cleanup
        cleanup_results = update_manager.cleanup_orphaned_chunks()
        
        total_chunks_after = memory.get_collection("vana_memory").count()
        print(f"📊 Total chunks after cleanup: {total_chunks_after}")
        print(f"🧹 Orphaned chunks removed: {cleanup_results['orphaned_removed']}")
        
        # Validate cleanup
        cleanup_passed = cleanup_results['orphaned_removed'] > 0 and total_chunks_after < total_chunks_before
        
        if cleanup_passed:
            print("✅ Orphaned chunk cleanup working correctly")
        else:
            print("❌ Orphaned chunk cleanup failed")
            
        assert cleanup_passed, "Orphaned chunk cleanup failed"

def main():
    """Run all vector DB update tests"""
    
    print("🚀 VANA Vector DB Update Test Suite")
    print("=" * 60)
    print(f"⏰ Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tests = [
        ("File Update Conflict Prevention", test_file_update_prevents_conflicts),
        ("Content Change Detection", test_content_change_detection),
        ("Orphaned Chunk Cleanup", test_orphaned_chunk_cleanup)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            print(f"\n" + "=" * 60)
            results[test_name] = test_func()
        except Exception as e:
            print(f"❌ Test '{test_name}' failed with error: {e}")
            results[test_name] = False
    
    # Final report
    print(f"\n" + "=" * 60)
    print("📋 FINAL TEST REPORT")
    print("=" * 60)
    
    passed_tests = sum(1 for result in results.values() if result)
    total_tests = len(results)
    
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"   {test_name}: {status}")
    
    print(f"\n📊 Overall Results: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED - Vector DB update mechanisms working correctly!")
        print("✅ The system properly prevents conflicting information")
        print("✅ Old chunks are removed before adding new ones")
        print("✅ Content change detection avoids unnecessary updates")
        print("✅ Orphaned chunks are cleaned up properly")
    else:
        print("⚠️ Some tests failed - review the implementation")
        
    print(f"\n⏰ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()