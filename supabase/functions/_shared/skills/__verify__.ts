/**
 * Verification script for Skills System v2
 *
 * Run with: deno run --allow-read supabase/functions/_shared/skills/__verify__.ts
 *
 * This script verifies that all skills are properly registered and can be resolved.
 */

import { SKILL_REGISTRY, getSkill, resolveSkill } from './index.ts';
import type { SkillId } from './types.ts';

console.log('=== Skills System v2 Verification ===\n');

// 1. Verify all skills are registered
console.log('1. Checking skill registration...');
const expectedSkills: SkillId[] = ['web-search', 'code-assistant', 'data-viz'];
const registeredSkills = Object.keys(SKILL_REGISTRY) as SkillId[];

console.log(`   Expected: ${expectedSkills.join(', ')}`);
console.log(`   Registered: ${registeredSkills.join(', ')}`);

if (expectedSkills.every(id => registeredSkills.includes(id))) {
  console.log('   ✓ All skills registered\n');
} else {
  console.error('   ✗ Missing skills!\n');
  Deno.exit(1);
}

// 2. Verify each skill can be retrieved
console.log('2. Testing skill retrieval...');
for (const skillId of expectedSkills) {
  const skill = getSkill(skillId);
  if (skill) {
    console.log(`   ✓ ${skillId}: ${skill.displayName}`);
  } else {
    console.error(`   ✗ ${skillId}: Failed to retrieve`);
    Deno.exit(1);
  }
}
console.log();

// 3. Test skill resolution
console.log('3. Testing skill resolution...');
const testContext = {
  sessionId: 'test-session',
  conversationHistory: [],
  requestId: 'test-request',
};

for (const skillId of expectedSkills) {
  try {
    const resolved = await resolveSkill(skillId, testContext);
    const hasContent = resolved.content.length > 0;
    const placeholdersResolved = !resolved.content.includes('{{');

    if (hasContent && placeholdersResolved) {
      console.log(`   ✓ ${skillId}: Resolved (${resolved.content.length} chars, ${resolved.loadedReferences.length} refs)`);
    } else {
      console.error(`   ✗ ${skillId}: Resolution incomplete`);
      Deno.exit(1);
    }
  } catch (error) {
    console.error(`   ✗ ${skillId}: ${error.message}`);
    Deno.exit(1);
  }
}
console.log();

// 4. Summary
console.log('=== Verification Complete ===');
console.log('All skills registered and functional!');
console.log('\nSkills System v2 is ready for integration.');
