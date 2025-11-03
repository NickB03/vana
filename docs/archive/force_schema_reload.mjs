/**
 * Force PostgREST schema cache reload via API endpoint
 * This is the recommended approach per PostgREST documentation
 */

const SUPABASE_URL = 'https://xfwlneedhqealtktaacv.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.log('\nPlease set it with:');
  console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

console.log('Attempting to reload PostgREST schema cache...\n');

try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'schema-reload'
    }
  });

  console.log('Response status:', response.status);
  console.log('Response headers:');
  for (const [key, value] of response.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  if (response.ok || response.status === 204) {
    console.log('\n✅ Schema cache reload triggered successfully!');
    console.log('   PostgREST should now see the artifact_versions table.');
  } else {
    const text = await response.text();
    console.log('\n⚠️  Response body:', text);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
