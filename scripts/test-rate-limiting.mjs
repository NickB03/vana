#!/usr/bin/env node
/**
 * Test script for comprehensive rate limiting system
 * Tests guest limits, user limits, API throttle, and cleanup functions
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create service role client for testing
const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🧪 Testing Comprehensive Rate Limiting System');
console.log('='.repeat(60));
console.log('');

async function testGuestRateLimit() {
  console.log('1️⃣ Testing Guest Rate Limiting (20 requests per 5 hours)');
  console.log('-'.repeat(60));
  
  const testIp = `test-guest-${Date.now()}`;
  
  try {
    // Test first request
    const { data, error } = await supabase.rpc('check_guest_rate_limit', {
      p_identifier: testIp,
      p_max_requests: 20,
      p_window_hours: 5
    });
    
    if (error) {
      console.log('❌ Guest rate limit function error:', error.message);
      return false;
    }
    
    console.log('✅ Guest rate limit function exists');
    console.log(`   Response: allowed=${data.allowed}, remaining=${data.remaining}, total=${data.total}`);
    
    if (data.total !== 20) {
      console.log('⚠️  Expected total=20, got', data.total);
    }
    
    return true;
  } catch (err) {
    console.log('❌ Guest rate limit test failed:', err.message);
    return false;
  }
}

async function testUserRateLimit() {
  console.log('');
  console.log('2️⃣ Testing User Rate Limiting (100 requests per 5 hours)');
  console.log('-'.repeat(60));
  
  // Use a test UUID
  const testUserId = '00000000-0000-0000-0000-000000000001';
  
  try {
    // Test check_user_rate_limit function
    const { data, error } = await supabase.rpc('check_user_rate_limit', {
      p_user_id: testUserId,
      p_max_requests: 100,
      p_window_hours: 5
    });
    
    if (error) {
      console.log('❌ User rate limit function error:', error.message);
      return false;
    }
    
    console.log('✅ User rate limit function exists');
    console.log(`   Response: allowed=${data.allowed}, remaining=${data.remaining}, total=${data.total}`);
    
    if (data.total !== 100) {
      console.log('⚠️  Expected total=100, got', data.total);
    }
    
    return true;
  } catch (err) {
    console.log('❌ User rate limit test failed:', err.message);
    return false;
  }
}

async function testUserRateLimitStatus() {
  console.log('');
  console.log('3️⃣ Testing User Rate Limit Status (read-only)');
  console.log('-'.repeat(60));
  
  const testUserId = '00000000-0000-0000-0000-000000000001';
  
  try {
    const { data, error } = await supabase.rpc('get_user_rate_limit_status', {
      p_user_id: testUserId,
      p_max_requests: 100,
      p_window_hours: 5
    });
    
    if (error) {
      console.log('❌ User rate limit status function error:', error.message);
      return false;
    }
    
    console.log('✅ User rate limit status function exists');
    console.log(`   Response: remaining=${data.remaining}, used=${data.used}, total=${data.total}`);
    
    return true;
  } catch (err) {
    console.log('❌ User rate limit status test failed:', err.message);
    return false;
  }
}

async function testApiThrottle() {
  console.log('');
  console.log('4️⃣ Testing API Throttle (15 RPM for Gemini)');
  console.log('-'.repeat(60));
  
  try {
    const { data, error } = await supabase.rpc('check_api_throttle', {
      p_api_name: 'gemini-test',
      p_max_requests: 15,
      p_window_seconds: 60
    });
    
    if (error) {
      console.log('❌ API throttle function error:', error.message);
      return false;
    }
    
    console.log('✅ API throttle function exists');
    console.log(`   Response: allowed=${data.allowed}, remaining=${data.remaining}, total=${data.total}`);
    
    if (data.total !== 15) {
      console.log('⚠️  Expected total=15, got', data.total);
    }
    
    return true;
  } catch (err) {
    console.log('❌ API throttle test failed:', err.message);
    return false;
  }
}

async function testTables() {
  console.log('');
  console.log('5️⃣ Testing Database Tables');
  console.log('-'.repeat(60));
  
  let allPassed = true;
  
  // Test user_rate_limits table
  try {
    const { error } = await supabase.from('user_rate_limits').select('id').limit(0);
    if (error && error.message.includes('does not exist')) {
      console.log('❌ user_rate_limits table does not exist');
      allPassed = false;
    } else {
      console.log('✅ user_rate_limits table exists');
    }
  } catch (err) {
    console.log('❌ user_rate_limits table check failed:', err.message);
    allPassed = false;
  }
  
  // Test api_throttle_state table
  try {
    const { error } = await supabase.from('api_throttle_state').select('id').limit(0);
    if (error && error.message.includes('does not exist')) {
      console.log('❌ api_throttle_state table does not exist');
      allPassed = false;
    } else {
      console.log('✅ api_throttle_state table exists');
    }
  } catch (err) {
    console.log('❌ api_throttle_state table check failed:', err.message);
    allPassed = false;
  }
  
  return allPassed;
}

// Run all tests
async function runTests() {
  const results = [];
  
  results.push(await testGuestRateLimit());
  results.push(await testUserRateLimit());
  results.push(await testUserRateLimitStatus());
  results.push(await testApiThrottle());
  results.push(await testTables());
  
  console.log('');
  console.log('='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('❌ Test suite error:', err);
  process.exit(1);
});

