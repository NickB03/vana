// Monitor PostgREST schema cache refresh status
// Runs tests every 30 seconds until schema is available

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xfwlneedhqealtktaacv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhmd2xuZWVkaHFlYWx0a3RhYWN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NzU0OTUsImV4cCI6MjA3NjM1MTQ5NX0.eS3pqmFbQvmLhPdjzceUKqTzLx7jEErTz3B_AJku4rU'

const supabase = createClient(supabaseUrl, supabaseKey)

let testCount = 0
const startTime = Date.now()

async function testSchemaCache() {
  testCount++
  const elapsed = Math.floor((Date.now() - startTime) / 1000)

  console.log(`\n[${'='.repeat(60)}]`)
  console.log(`Test #${testCount} - Elapsed: ${elapsed}s (${Math.floor(elapsed/60)}m ${elapsed%60}s)`)
  console.log(`[${'='.repeat(60)}]\n`)

  // Test SELECT
  console.log('1. Testing SELECT with artifact_ids...')
  const { data: selectData, error: selectError } = await supabase
    .from('chat_messages')
    .select('id, artifact_ids')
    .limit(1)

  if (selectError) {
    console.log(`   ❌ SELECT failed: ${selectError.code} - ${selectError.message}`)
  } else {
    console.log('   ✅ SELECT successful!')
  }

  // Test INSERT
  console.log('\n2. Testing INSERT with artifact_ids...')
  const { data: sessions } = await supabase
    .from('chat_sessions')
    .select('id')
    .limit(1)

  if (sessions && sessions.length > 0) {
    const { data: insertData, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessions[0].id,
        role: 'user',
        content: `Schema cache test #${testCount}`,
        artifact_ids: ['test-1', 'test-2']
      })
      .select()

    if (insertError) {
      console.log(`   ❌ INSERT failed: ${insertError.code} - ${insertError.message}`)
    } else {
      console.log('   ✅ INSERT successful!')
      console.log(`   ✅ artifact_ids value: ${JSON.stringify(insertData[0].artifact_ids)}`)

      // Clean up
      await supabase.from('chat_messages').delete().eq('id', insertData[0].id)
      console.log('   ✅ Test message cleaned up')

      // SUCCESS! Schema cache is refreshed
      console.log('\n' + '🎉'.repeat(30))
      console.log('SUCCESS! PostgREST schema cache has been refreshed!')
      console.log('🎉'.repeat(30))
      console.log(`\nTime to refresh: ${Math.floor(elapsed/60)} minutes ${elapsed%60} seconds`)
      console.log('\nNext steps:')
      console.log('1. Remove retry workaround from src/hooks/useChatMessages.tsx')
      console.log('2. Lines to remove: 94-114 (the WORKAROUND section)')
      console.log('3. Test the app to ensure artifact_ids are being saved')
      console.log('\nMonitoring stopped.')
      process.exit(0)
    }
  }

  // Still waiting
  if (!selectError && !insertError) {
    return // Already handled success above
  }

  console.log('\n⏳ Schema cache not yet refreshed. Waiting 30 seconds...')
  console.log('   Typical refresh time: 10-15 minutes')
  console.log('   You can also manually refresh via Supabase Dashboard SQL Editor')
  console.log('   Run: NOTIFY pgrst, \'reload schema\';')
}

// Run first test immediately
console.log('PostgREST Schema Cache Monitor')
console.log('Testing artifact_ids column availability...')
console.log('Press Ctrl+C to stop monitoring\n')

await testSchemaCache()

// Then run every 30 seconds
const interval = setInterval(async () => {
  await testSchemaCache()
}, 30000)

// Keep process alive
process.stdin.resume()
