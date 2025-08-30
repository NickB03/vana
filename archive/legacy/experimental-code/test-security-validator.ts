/**
 * Simple test runner for security validator
 * Run with: npx tsx src/test-security-validator.ts
 */

import { validateInput, validateURL, detectFieldType, normalizeInput } from './lib/security-validator';

// Color output helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(green('✓') + ' ' + message);
    passed++;
  } else {
    console.log(red('✗') + ' ' + message);
    failed++;
  }
}

console.log(blue('\n=== Security Validator Tests ===\n'));

// Test 1: Legitimate phrases should not trigger false positives
console.log(yellow('Test Group: Legitimate Natural Language'));

const legitimatePhrases = [
  'Please select items from menu',
  'Select your favorite items from the dropdown menu',
  'This is an echo chamber',
  'The echo chamber effect in social media',
  'Please update your profile information',
  'Delete old messages from inbox',
  'Drop me a message when you can',
  'Create a new account',
  'Execute the plan tomorrow',
  'The script for the play'
];

legitimatePhrases.forEach(phrase => {
  const result = validateInput(phrase, { fieldType: 'comment' });
  assert(result.isValid && result.violations.length === 0, 
    `"${phrase.substring(0, 40)}..." should be valid`);
});

// Test 2: Search queries should be allowed
console.log(yellow('\nTest Group: Search Queries'));

const searchQueries = [
  'select the best laptop',
  'how to delete files',
  'javascript onclick event',
  'drop shadow css',
  'create react app'
];

searchQueries.forEach(query => {
  const result = validateInput(query, { fieldType: 'search' });
  assert(result.isValid && result.violations.length === 0,
    `Search: "${query}" should be valid`);
});

// Test 3: Actual SQL injection should be caught in code fields
console.log(yellow('\nTest Group: SQL Injection Detection'));

const sqlInjections = [
  "'; DROP TABLE users; --",
  "1' UNION SELECT * FROM passwords--",
  "admin'--"
];

sqlInjections.forEach(injection => {
  const result = validateInput(injection, { fieldType: 'code' });
  assert(!result.isValid && result.violations.length > 0,
    `SQL injection "${injection.substring(0, 20)}..." should be caught`);
});

// Test 4: URL validation
console.log(yellow('\nTest Group: URL Validation'));

const goodUrls = [
  'https://example.com/search?q=select+items',
  'https://api.example.com/users?filter=active&sort=name',
  'https://example.com/page?action=delete&confirm=true'
];

goodUrls.forEach(url => {
  const result = validateURL(url);
  assert(result.isValid, `URL "${url.substring(0, 40)}..." should be valid`);
});

const badUrls = [
  'javascript:alert(1)',
  'file:///etc/passwd'
];

badUrls.forEach(url => {
  const result = validateURL(url);
  assert(!result.isValid || result.riskScore > 50,
    `Dangerous URL "${url}" should be flagged`);
});

// Test 5: Field type detection
console.log(yellow('\nTest Group: Field Type Detection'));

assert(detectFieldType('user@example.com') === 'email', 'Should detect email');
assert(detectFieldType('https://example.com') === 'url', 'Should detect URL');
assert(detectFieldType('{"key": "value"}') === 'json', 'Should detect JSON');
assert(detectFieldType('<div>Hello</div>') === 'html', 'Should detect HTML');
assert(detectFieldType('regular text') === 'general', 'Should detect general text');

// Test 6: Input normalization
console.log(yellow('\nTest Group: Input Normalization'));

assert(normalizeInput('  trim  spaces  ') === 'trim spaces', 'Should trim and collapse spaces');
assert(normalizeInput('&lt;div&gt;') === '<div>', 'Should decode HTML entities');
assert(normalizeInput('%20space') === ' space', 'Should decode URL encoding');

// Test 7: E-commerce use cases
console.log(yellow('\nTest Group: E-commerce Search'));

const ecommerceSearches = [
  'laptop under $1000',
  'shoes size 10.5',
  'iPhone 15 Pro (256GB)',
  'furniture > 50% off',
  "women's clothing | dresses"
];

ecommerceSearches.forEach(search => {
  const result = validateInput(search, { fieldType: 'search' });
  assert(result.isValid && result.violations.length === 0,
    `E-commerce search "${search}" should be valid`);
});

// Test 8: User comments
console.log(yellow('\nTest Group: User Comments'));

const comments = [
  "Great product! Would definitely select this again from your store.",
  "Please update the delivery address and delete the old one.",
  "The installation script didn't execute properly.",
  "Can you drop the price by 10%?"
];

comments.forEach(comment => {
  const result = validateInput(comment, { fieldType: 'comment' });
  assert(result.isValid && result.violations.length === 0,
    `Comment should be valid: "${comment.substring(0, 40)}..."`);
});

// Test 9: Special characters and Unicode
console.log(yellow('\nTest Group: Special Characters'));

const specialInputs = [
  'The price is < $50',
  'Use angle brackets <like this>',
  '5 < 10 and 10 > 5',
  'Café résumé naïve',
  '🚀 Launch the application 🎉',
  'Math: x² = ∫f(x)dx'
];

specialInputs.forEach(input => {
  const result = validateInput(input, { fieldType: 'general' });
  assert(result.isValid,
    `Special chars: "${input.substring(0, 30)}..." should be valid`);
});

// Test 10: Context-aware validation
console.log(yellow('\nTest Group: Context Awareness'));

// Same input, different contexts
const testInput = "SELECT * FROM products";

const codeResult = validateInput(testInput, { fieldType: 'code' });
const commentResult = validateInput(testInput, { fieldType: 'comment' });
const searchResult = validateInput(testInput, { fieldType: 'search' });

assert(!codeResult.isValid || codeResult.riskScore > 0, 
  'SQL in code field should raise concerns');
assert(commentResult.isValid && commentResult.violations.length === 0,
  'SQL keywords in comments should be allowed');
assert(searchResult.isValid && searchResult.violations.length === 0,
  'SQL keywords in search should be allowed');

// Print summary
console.log(blue('\n=== Test Summary ==='));
console.log(`${green('Passed:')} ${passed}`);
console.log(`${red('Failed:')} ${failed}`);
console.log(`${yellow('Total:')} ${passed + failed}`);

if (failed === 0) {
  console.log(green('\n✅ All tests passed! No false positives detected.'));
} else {
  console.log(red(`\n❌ ${failed} tests failed. Please review the implementation.`));
  process.exit(1);
}

// Additional validation examples
console.log(blue('\n=== Example Validations ===\n'));

const examples = [
  { input: 'select items from menu', context: { fieldType: 'search' as const } },
  { input: "'; DROP TABLE users; --", context: { fieldType: 'code' as const } },
  { input: 'echo chamber discussion', context: { fieldType: 'comment' as const } },
  { input: '<script>alert(1)</script>', context: { fieldType: 'html' as const } },
  { input: 'Update profile settings', context: { fieldType: 'general' as const } }
];

examples.forEach(({ input, context }) => {
  const result = validateInput(input, context);
  console.log(`Input: "${input}"`);
  console.log(`  Field Type: ${context.fieldType}`);
  console.log(`  Valid: ${result.isValid ? green('Yes') : red('No')}`);
  console.log(`  Risk Score: ${result.riskScore}`);
  if (result.violations.length > 0) {
    console.log(`  Violations: ${result.violations.map(v => v.rule).join(', ')}`);
  }
  console.log('');
});