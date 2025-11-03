#!/usr/bin/env node
/**
 * Comprehensive Artifact System Integration Test
 * Tests all components end-to-end without browser automation
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xfwlneedhqealtktaacv.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmd2xuZWVkaHFlYWx0a3RhYWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0MzU0MTUsImV4cCI6MjA0NjAxMTQxNX0.HfTf6-P-LjwLMCOyqc6wEZvDrVo1WXXqMKlWwfKhspM';

const TEST_USER_ID = 'b1144170-7f72-4588-bb10-c8d77dba3c3a';

console.log('🧪 Artifact System Integration Test');
console.log('=====================================\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTests() {
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Database Connection
  console.log('📡 Test 1: Database Connection');
  try {
    const { data, error } = await supabase.from('chat_sessions').select('count').limit(1);
    if (error) throw error;
    console.log('   ✅ PASS - Database connected\n');
    testsPassed++;
  } catch (err) {
    console.log('   ❌ FAIL -', err.message, '\n');
    testsFailed++;
  }

  // Test 2: artifact_versions table exists
  console.log('📊 Test 2: artifact_versions table accessible');
  try {
    const { data, error } = await supabase.from('artifact_versions').select('count').limit(1);
    if (error && error.code === 'PGRST204') {
      throw new Error('Table exists but not in PostgREST cache (PGRST204)');
    }
    if (error) throw error;
    console.log('   ✅ PASS - artifact_versions table accessible\n');
    testsPassed++;
  } catch (err) {
    console.log('   ❌ FAIL -', err.message, '\n');
    testsFailed++;
  }

  // Test 3: Create test chat session
  console.log('💬 Test 3: Create chat session');
  let sessionId;
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: TEST_USER_ID,
        title: 'Test Session - Artifact System',
        first_message: 'Create a test artifact'
      })
      .select()
      .single();

    if (error) throw error;
    sessionId = data.id;
    console.log('   ✅ PASS - Session created:', sessionId, '\n');
    testsPassed++;
  } catch (err) {
    console.log('   ❌ FAIL -', err.message, '\n');
    testsFailed++;
    return { testsPassed, testsFailed };
  }

  // Test 4: Create chat message with artifact_ids
  console.log('📝 Test 4: Create message with artifact_ids column');
  let messageId;
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: '<artifact type="application/vnd.ant.react" title="Test Button">export default function TestButton() { return <button>Click me</button>; }</artifact>',
        artifact_ids: ['artifact-test-button']
      })
      .select()
      .single();

    if (error && error.code === 'PGRST204') {
      throw new Error('artifact_ids column not in schema cache (PGRST204)');
    }
    if (error) throw error;
    messageId = data.id;
    console.log('   ✅ PASS - Message created with artifact_ids:', messageId, '\n');
    testsPassed++;
  } catch (err) {
    console.log('   ❌ FAIL -', err.message, '\n');
    testsFailed++;
  }

  // Test 5: Create artifact version using RPC function
  console.log('🎨 Test 5: Create artifact version (RPC function)');
  try {
    const { data, error } = await supabase.rpc('create_artifact_version_atomic', {
      p_message_id: messageId,
      p_artifact_id: 'artifact-test-button',
      p_artifact_type: 'react',
      p_artifact_title: 'Test Button',
      p_artifact_content: 'export default function TestButton() { return <button>Click me</button>; }',
      p_artifact_language: 'javascript',
      p_content_hash: 'test-hash-' + Date.now()
    });

    if (error && error.code === 'PGRST202') {
      throw new Error('RPC function not in schema cache (PGRST202)');
    }
    if (error) throw error;
    console.log('   ✅ PASS - Artifact version created:', data.version_number, '\n');
    testsPassed++;
  } catch (err) {
    console.log('   ❌ FAIL -', err.message, '\n');
    testsFailed++;
  }

  // Test 6: Query artifact versions
  console.log('📚 Test 6: Query artifact version history');
  try {
    const { data, error } = await supabase
      .from('artifact_versions')
      .select('*')
      .eq('artifact_id', 'artifact-test-button')
      .order('version_number', { ascending: false });

    if (error) throw error;
    console.log('   ✅ PASS - Found', data.length, 'version(s)\n');
    testsPassed++;
  } catch (err) {
    console.log('   ❌ FAIL -', err.message, '\n');
    testsFailed++;
  }

  // Test 7: Cleanup - Delete test session
  console.log('🧹 Test 7: Cleanup test data');
  try {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
    console.log('   ✅ PASS - Test data cleaned up\n');
    testsPassed++;
  } catch (err) {
    console.log('   ⚠️  WARNING - Cleanup failed:', err.message, '\n');
    // Don't count cleanup failures
  }

  return { testsPassed, testsFailed };
}

// Run tests
runTests().then(({ testsPassed, testsFailed }) => {
  console.log('=====================================');
  console.log('📊 Test Results Summary');
  console.log('=====================================');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);

  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED - Artifact system is fully operational!');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Review errors above');
    process.exit(1);
  }
}).catch(err => {
  console.error('💥 Test suite crashed:', err);
  process.exit(1);
});
