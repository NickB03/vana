// Simple React Markdown implementation placeholder
// Replace with react-markdown in production
import React from 'react'

interface ReactMarkdownProps {
  children: string
  components?: any
}

export default function ReactMarkdown({ children, components }: ReactMarkdownProps) {
  // Simple markdown parser - replace with proper library in production
  const parseMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br />')
  }

  return (
    <div 
      className="prose prose-sm max-w-none dark:prose-invert"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(children) }}
    />
  )
}