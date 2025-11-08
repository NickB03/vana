#!/usr/bin/env node
/**
 * Verification Script for Security Fixes
 * Checks if the security fixes documented in CODE_REVIEW_FIXES_SUMMARY.md
 * have been applied to the remote database.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('============================================================================');
console.log('VERIFICATION: Security Fixes Applied');
console.log('============================================================================\n');

async function verifySecurityDefinerFunctions() {
  console.log('1. Checking SECURITY DEFINER functions have search_path set...');
  console.log('----------------------------------------------------------------');
  
  const query = `
    SELECT
      p.proname AS function_name,
      proconfig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prosecdef = true
    ORDER BY p.proname;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { query });
  
  if (error) {
    console.log('⚠️  Cannot verify (requires service_role access)');
    console.log('   Please check manually in Supabase Dashboard → SQL Editor');
    return false;
  }
  
  if (data && data.length > 0) {
    data.forEach(row => {
      const hasSearchPath = row.proconfig && 
        row.proconfig.some(config => config.includes('search_path'));
      console.log(`   ${hasSearchPath ? '✅' : '❌'} ${row.function_name}`);
    });
    return true;
  }
  
  return false;
}

async function verifyGuestRateLimitsTable() {
  console.log('\n2. Checking guest_rate_limits table exists...');
  console.log('----------------------------------------------------------------');
  
  const { data, error } = await supabase
    .from('guest_rate_limits')
    .select('id')
    .limit(0);
  
  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('❌ guest_rate_limits table MISSING');
      return false;
    }
    console.log('⚠️  Cannot verify:', error.message);
    return false;
  }
  
  console.log('✅ guest_rate_limits table EXISTS');
  return true;
}

async function verifyRateLimitFunction() {
  console.log('\n3. Checking check_guest_rate_limit function exists...');
  console.log('----------------------------------------------------------------');
  
  const { data, error } = await supabase.rpc('check_guest_rate_limit', {
    p_identifier: 'test-verification',
    p_max_requests: 10,
    p_window_hours: 24
  });
  
  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('❌ check_guest_rate_limit function MISSING');
      return false;
    }
    console.log('⚠️  Cannot verify:', error.message);
    return false;
  }
  
  console.log('✅ check_guest_rate_limit function EXISTS');
  console.log(`   Response: allowed=${data.allowed}, remaining=${data.remaining}`);
  return true;
}

async function main() {
  try {
    const results = {
      securityDefiner: await verifySecurityDefinerFunctions(),
      rateLimitsTable: await verifyGuestRateLimitsTable(),
      rateLimitFunction: await verifyRateLimitFunction()
    };
    
    console.log('\n============================================================================');
    console.log('VERIFICATION SUMMARY');
    console.log('============================================================================');
    
    const allPassed = Object.values(results).every(r => r === true);
    
    if (allPassed) {
      console.log('✅ All security fixes verified successfully!');
      process.exit(0);
    } else {
      console.log('⚠️  Some verifications could not be completed.');
      console.log('   This may be due to RLS policies or permission restrictions.');
      console.log('   Please verify manually in Supabase Dashboard.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

main();

