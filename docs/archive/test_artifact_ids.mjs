import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xfwlneedhqealtktaacv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmd2xuZWVkaHFlYWx0a3RhYWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzU0OTUsImV4cCI6MjA3NjM1MTQ5NX0.eS3pqmFbQvmLhPdjzceUKqTzLx7jEErTz3B_AJku4rU'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Testing artifact_ids column access...\n')

// Test 1: Check if column exists via query
console.log('Test 1: Querying chat_messages with artifact_ids select')
const { data: selectData, error: selectError } = await supabase
  .from('chat_messages')
  .select('id, artifact_ids')
  .limit(1)

if (selectError) {
  console.error('❌ SELECT failed:', selectError.code, selectError.message)
} else {
  console.log('✓ SELECT successful')
}

// Test 2: Try to insert with artifact_ids
console.log('\nTest 2: Get a test session')
const { data: sessions } = await supabase
  .from('chat_sessions')
  .select('id')
  .limit(1)

if (sessions && sessions.length > 0) {
  console.log('Test 3: Inserting message with artifact_ids')
  const { data: insertData, error: insertError } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessions[0].id,
      role: 'user',
      content: 'Test message for schema verification',
      artifact_ids: ['test-1', 'test-2']
    })
    .select()

  if (insertError) {
    console.error('❌ INSERT failed:', insertError.code, insertError.message)
    console.error('Full error:', JSON.stringify(insertError, null, 2))
  } else {
    console.log('✓ INSERT successful with artifact_ids:', insertData[0].artifact_ids)

    // Clean up
    await supabase.from('chat_messages').delete().eq('id', insertData[0].id)
    console.log('✓ Test message cleaned up')
  }
}

process.exit(0)
