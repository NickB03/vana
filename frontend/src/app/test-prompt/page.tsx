'use client'

import { useState, useCallback } from 'react'
import { PromptInput, PromptInputTextarea, PromptInputActions } from '@/components/prompt-kit/prompt-input'
import { Markdown } from '@/components/prompt-kit/markdown'

export default function TestPromptPage() {
  const [value, setValue] = useState('')

  const handleSubmit = useCallback(() => {
    // Test submission - use proper logger if needed
  }, [value])

  const markdownExample = `# Theme Contrast Test

Testing inline code with different theme badges:

\`RESEARCH\` Identify effective content distribution channels and tactics for successful creators and organizations.

\`RESEARCH\` Examine key performance indicators for measuring content effectiveness and return on investment (ROI).

\`DELIVERABLE\`\`[IMPLIED]\` Create a comprehensive guide outlining the fundamental principles of modern content creation strategies and their core principles.

\`DELIVERABLE\`\`[IMPLIED]\` Compile a best practices document for creating engaging content across multiple platforms.

Regular text with \`inline code\` should have proper contrast in both light and dark modes.

## Code Block Test

\`\`\`typescript
function test() {
  return "This should work too";
}
\`\`\``

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Theme Contrast Test</h1>

      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Markdown Rendering</h2>
        <Markdown id="test-markdown">
          {markdownExample}
        </Markdown>
      </div>

      <div className="w-full max-w-md mt-8">
        <h2 className="text-xl font-semibold mb-4">PromptInput Test</h2>
        <PromptInput
          value={value}
          onValueChange={setValue}
          onSubmit={handleSubmit}
        >
          <PromptInputTextarea placeholder="Test input..." />
          <PromptInputActions>
            <button onClick={handleSubmit}>Submit</button>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  )
}