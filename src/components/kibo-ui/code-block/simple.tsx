/**
 * SimpleCodeBlock - Simplified wrapper for Kibo UI code-block
 *
 * Provides a simple single-file interface for the complex multi-file Kibo UI code-block.
 * Perfect for markdown rendering and basic code display needs.
 *
 * @example
 * ```tsx
 * <SimpleCodeBlock
 *   code="const hello = 'world';"
 *   language="typescript"
 * />
 * ```
 */

import { useMemo } from "react";
import {
  CodeBlock,
  CodeBlockHeader,
  CodeBlockBody,
  CodeBlockItem,
  CodeBlockContent,
  CodeBlockCopyButton,
  type BundledLanguage,
} from "./index";

export interface SimpleCodeBlockProps {
  /** The code string to display */
  code: string;
  /** Programming language for syntax highlighting (defaults to "plaintext") */
  language?: string;
  /** Show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Show header with language label and copy button (default: true) */
  showHeader?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SimpleCodeBlock - A simplified wrapper around Kibo UI's code-block
 *
 * Wraps the complex multi-file Kibo UI code-block API into a simple single-file interface.
 * Automatically handles:
 * - Dark mode support (built into Kibo UI)
 * - Copy to clipboard functionality
 * - Line numbers
 * - Language label in header
 * - Syntax highlighting via Shiki
 *
 * Edge cases handled:
 * - Empty code string (shows empty block)
 * - Unknown language (defaults to "plaintext")
 * - Very long code (scrollable with overflow)
 */
export function SimpleCodeBlock({
  code,
  language = "plaintext",
  showLineNumbers = true,
  showHeader = true,
  className,
}: SimpleCodeBlockProps) {
  // Normalize empty code to prevent rendering issues
  const normalizedCode = code || "";

  // Normalize language to handle edge cases
  const normalizedLanguage = language || "plaintext";

  // Create data array in the format expected by Kibo UI CodeBlock
  // Uses language as the unique identifier (value) for the data item
  const data = useMemo(
    () => [
      {
        language: normalizedLanguage,
        filename: normalizedLanguage, // Use language as filename for simplicity
        code: normalizedCode,
      },
    ],
    [normalizedCode, normalizedLanguage]
  );

  return (
    <CodeBlock
      data={data}
      defaultValue={normalizedLanguage}
      className={className}
    >
      {showHeader && (
        <CodeBlockHeader>
          {/* Language label */}
          <div className="flex-1 px-3 py-1 text-xs text-muted-foreground">
            {normalizedLanguage}
          </div>

          {/* Copy button */}
          <CodeBlockCopyButton />
        </CodeBlockHeader>
      )}

      <CodeBlockBody>
        {(item) => (
          <CodeBlockItem
            key={item.language}
            value={item.language}
            lineNumbers={showLineNumbers}
          >
            <CodeBlockContent
              language={normalizedLanguage as BundledLanguage}
              syntaxHighlighting={true}
            >
              {item.code}
            </CodeBlockContent>
          </CodeBlockItem>
        )}
      </CodeBlockBody>
    </CodeBlock>
  );
}
