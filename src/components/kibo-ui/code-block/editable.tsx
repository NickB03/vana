"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
import { codeToHtml, type BundledLanguage } from "shiki";
import { cn } from "@/lib/utils";

// Map artifact types/languages to Shiki language identifiers
const languageMap: Record<string, BundledLanguage> = {
  javascript: "javascript",
  js: "javascript",
  typescript: "typescript",
  ts: "typescript",
  jsx: "jsx",
  tsx: "tsx",
  html: "html",
  css: "css",
  json: "json",
  python: "python",
  py: "python",
  react: "tsx",
  code: "javascript",
  markdown: "markdown",
  md: "markdown",
  sql: "sql",
  bash: "bash",
  sh: "bash",
  shell: "bash",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  svg: "xml",
  go: "go",
  rust: "rust",
  java: "java",
  cpp: "cpp",
  c: "c",
  csharp: "csharp",
  php: "php",
  ruby: "ruby",
  swift: "swift",
  kotlin: "kotlin",
};

const darkModeClassNames = cn(
  "dark:[&_.shiki]:!text-[var(--shiki-dark)]",
  "dark:[&_.shiki]:![font-style:var(--shiki-dark-font-style)]",
  "dark:[&_.shiki]:![font-weight:var(--shiki-dark-font-weight)]",
  "dark:[&_.shiki]:![text-decoration:var(--shiki-dark-text-decoration)]",
  "dark:[&_.shiki_span]:!text-[var(--shiki-dark)]",
  "dark:[&_.shiki_span]:![font-style:var(--shiki-dark-font-style)]",
  "dark:[&_.shiki_span]:![font-weight:var(--shiki-dark-font-weight)]",
  "dark:[&_.shiki_span]:![text-decoration:var(--shiki-dark-text-decoration)]"
);

const lineNumberClassNames = cn(
  "[&_code]:[counter-reset:line]",
  "[&_code]:[counter-increment:line_0]",
  "[&_.line]:before:content-[counter(line)]",
  "[&_.line]:before:inline-block",
  "[&_.line]:before:[counter-increment:line]",
  "[&_.line]:before:w-8",
  "[&_.line]:before:mr-4",
  "[&_.line]:before:pr-2",
  "[&_.line]:before:text-right",
  "[&_.line]:before:text-muted-foreground/50",
  "[&_.line]:before:select-none"
);

interface EditableCodeBlockProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
  readOnly?: boolean;
}

export const EditableCodeBlock = memo(({
  value,
  onChange,
  language = "javascript",
  showLineNumbers = true,
  className,
  readOnly = false,
}: EditableCodeBlockProps) => {
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the Shiki language from the language prop
  const shikiLanguage = languageMap[language?.toLowerCase()] || "plaintext";

  // Highlight code with Shiki
  useEffect(() => {
    const highlightCode = async () => {
      try {
        // Add an empty line if the code ends with newline to ensure proper rendering
        const codeToHighlight = value || " ";

        const html = await codeToHtml(codeToHighlight, {
          lang: shikiLanguage,
          themes: {
            light: "github-light",
            dark: "github-dark-default",
          },
        });
        setHighlightedHtml(html);
      } catch (error) {
        console.error("Shiki highlighting error:", error);
        // Fallback to plain text
        setHighlightedHtml(`<pre><code>${escapeHtml(value)}</code></pre>`);
      }
    };

    highlightCode();
  }, [value, shikiLanguage]);

  // Sync scroll between textarea and highlighted code
  const syncScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Handle textarea input
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // Handle tab key for indentation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        if (e.shiftKey) {
          // Handle shift+tab (dedent)
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          const linePrefix = value.slice(lineStart, start);
          if (linePrefix.startsWith("  ")) {
            const newValue =
              value.slice(0, lineStart) + value.slice(lineStart + 2);
            onChange(newValue);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = start - 2;
            }, 0);
          }
        } else {
          // Handle tab (indent)
          const newValue = value.slice(0, start) + "  " + value.slice(end);
          onChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + 2;
          }, 0);
        }
      }
    },
    [value, onChange]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden font-mono text-sm",
        className
      )}
    >
      {/* Highlighted code layer (background) */}
      <div
        ref={highlightRef}
        className={cn(
          "absolute inset-0 overflow-auto pointer-events-none",
          "[&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:overflow-visible",
          "[&_.shiki]:!bg-transparent",
          "[&_code]:w-full [&_code]:grid",
          "[&_.line]:px-4 [&_.line]:whitespace-pre-wrap [&_.line]:break-words [&_.line]:w-full",
          "[&_pre]:py-3",
          darkModeClassNames,
          showLineNumbers && lineNumberClassNames
        )}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        aria-hidden="true"
      />

      {/* Editable textarea layer (foreground, invisible text) */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        wrap="soft"
        className={cn(
          "absolute inset-0 w-full h-full",
          "resize-none outline-none",
          "bg-transparent text-transparent caret-foreground",
          "font-mono text-sm leading-normal",
          "py-3 overflow-auto whitespace-pre-wrap break-words",
          // Match the line padding from highlighted code
          showLineNumbers ? "pl-[4.5rem] pr-4" : "px-4",
          "selection:bg-primary/20 selection:text-transparent",
          readOnly && "cursor-default"
        )}
        aria-label="Code editor"
      />
    </div>
  );
});

EditableCodeBlock.displayName = "EditableCodeBlock";

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
