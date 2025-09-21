'use client'

import { useState, useCallback } from 'react'
import { PromptInput, PromptInputTextarea, PromptInputActions } from '@/components/ui/prompt-input'

export default function TestPromptPage() {
  const [value, setValue] = useState('')

  const handleSubmit = useCallback(() => {
    console.log('Submitted:', value)
  }, [value])

  return (
    <div className="p-8">
      <h1>Isolated PromptInput Test</h1>
      <div className="w-full max-w-md mt-4">
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