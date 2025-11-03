import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xfwlneedhqealtktaacv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmd2xuZWVkaHFlYWx0a3RhYWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzU0OTUsImV4cCI6MjA3NjM1MTQ5NX0.eS3pqmFbQvmLhPdjzceUKqTzLx7jEErTz3B_AJku4rU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Testing artifact_versions table access...\n');

// Test 1: Try to select from artifact_versions table
console.log('Test 1: Attempting to query artifact_versions table...');
const { data, error } = await supabase
  .from('artifact_versions')
  .select('*')
  .limit(1);

if (error) {
  console.log('❌ ERROR:', error);
  console.log('   Code:', error.code);
  console.log('   Message:', error.message);
  console.log('   Details:', error.details);
  console.log('   Hint:', error.hint);
  
  // Check if it's a schema cache issue
  if (error.code === '42P01' || error.message.includes('does not exist')) {
    console.log('\n⚠️  DIAGNOSIS: PostgREST schema cache has NOT been refreshed!');
    console.log('   The artifact_versions table exists in Postgres but PostgREST cannot see it.');
  }
} else {
  console.log('✅ SUCCESS: Table is accessible');
  console.log('   Data:', data);
}

console.log('\n' + '='.repeat(60) + '\n');

// Test 2: Try to call the RPC function
console.log('Test 2: Attempting to call create_artifact_version_atomic...');
const { data: rpcData, error: rpcError } = await supabase.rpc('create_artifact_version_atomic', {
  p_message_id: '00000000-0000-0000-0000-000000000000',
  p_artifact_id: 'test-artifact-id',
  p_artifact_type: 'code',
  p_artifact_title: 'Test Artifact',
  p_artifact_content: 'console.log("test");',
  p_artifact_language: 'javascript',
  p_content_hash: 'test-hash-123'
});

if (rpcError) {
  console.log('❌ RPC ERROR:', rpcError);
  console.log('   Code:', rpcError.code);
  console.log('   Message:', rpcError.message);
  
  if (rpcError.code === '42883' || rpcError.message.includes('does not exist')) {
    console.log('\n⚠️  DIAGNOSIS: PostgREST schema cache has NOT been refreshed!');
    console.log('   The RPC function exists in Postgres but PostgREST cannot see it.');
  }
} else {
  console.log('✅ RPC SUCCESS');
  console.log('   Data:', rpcData);
}

console.log('\n' + '='.repeat(60));
console.log('\nSUMMARY:');
console.log('--------');
if (error || rpcError) {
  console.log('❌ PostgREST schema cache is STALE - needs manual refresh');
  console.log('   Solution: Use Supabase Dashboard to reload schema cache');
} else {
  console.log('✅ PostgREST schema cache is UP-TO-DATE');
  console.log('   Artifact version system is ready to use!');
}

process.exit(0);
