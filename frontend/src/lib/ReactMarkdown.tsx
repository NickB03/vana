// Secure React Markdown implementation with XSS prevention
import React from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'

interface ReactMarkdownProps {
  children: string
  components?: any
}

/**
 * ========================================================================
 * SECURITY IMPLEMENTATION - XSS Prevention in Markdown Rendering
 * ========================================================================
 * 
 * VULNERABILITY FIXED: XSS Injection via dangerouslySetInnerHTML
 * 
 * BEFORE (VULNERABLE):
 * - Custom regex-based markdown parsing with dangerouslySetInnerHTML
 * - No HTML sanitization - could execute malicious scripts
 * - Vulnerable to: <script>alert('XSS')</script>, <img onerror="...">
 * 
 * AFTER (SECURE):
 * - react-markdown with proper AST-based parsing
 * - rehype-sanitize with strict whitelist approach
 * - Blocks all script execution and event handlers
 * - Allows safe HTML: headings, paragraphs, lists, links, emphasis
 * 
 * SECURITY CONTROLS:
 * - skipHtml: true - Blocks raw HTML input
 * - rehype-sanitize - Whitelist-based HTML sanitization
 * - remarkGfm - GitHub Flavored Markdown support
 * - No dangerouslySetInnerHTML usage
 * 
 * MALICIOUS EXAMPLES BLOCKED:
 * - <script>alert('XSS')</script> → Removed completely
 * - <img src="x" onerror="alert('XSS')"> → Event handler stripped
 * - <a href="javascript:alert('XSS')">Link</a> → javascript: protocol blocked
 * - <iframe src="evil.com"></iframe> → iframe tag removed
 * 
 * COMPLIANCE:
 * - OWASP A03 (Injection) - Prevents XSS injection
 * - Content Security Policy compatible
 * - Enterprise security standards
 * ========================================================================
 */
export default function ReactMarkdown({ children, components }: ReactMarkdownProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <Markdown
        skipHtml={true}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {children}
      </Markdown>
    </div>
  )
}