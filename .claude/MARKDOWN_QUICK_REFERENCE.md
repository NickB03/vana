# Markdown Component - Quick Reference

## Basic Usage

```tsx
import { Markdown } from "@/components/ui/markdown";

<Markdown
  id={message.id}
  className="prose prose-sm max-w-none dark:prose-invert"
>
  {content}
</Markdown>
```

## Props

| Prop | Required | Example |
|------|----------|---------|
| `children` | ✅ | `{message.content}` |
| `id` | ⚠️ Recommended | `{message.id}` |
| `className` | ❌ | `"prose dark:prose-invert"` |
| `components` | ❌ | `{{ a: CustomLink }}` |

## Recommended Classes

```tsx
// Chat messages (compact, full-width)
className="prose prose-sm max-w-none dark:prose-invert"

// Documentation (larger, centered)
className="prose prose-base dark:prose-invert mx-auto"

// Full customization
className="prose-sm max-w-none [&>p]:mb-2"
```

## Performance Tips

1. ✅ **Always provide `id` for streaming chat**
2. ✅ Use memoization for custom components
3. ✅ Keep prose classes on `<Markdown>`, not wrapper
4. ❌ Don't use random/changing IDs

## Common Mistakes

```tsx
// ❌ Wrong - prose on wrapper
<div className="prose">
  <Markdown>{content}</Markdown>
</div>

// ✅ Correct - prose on component
<Markdown className="prose">{content}</Markdown>

// ❌ Wrong - no dark mode
<Markdown className="prose">{content}</Markdown>

// ✅ Correct - dark mode support
<Markdown className="prose dark:prose-invert">{content}</Markdown>
```

## Supported Features

- ✅ GitHub Flavored Markdown (tables, strikethrough, task lists)
- ✅ Syntax highlighting with Shiki (150+ languages)
- ✅ Block-level memoization for streaming
- ✅ Theme-aware typography
- ✅ Custom component overrides

## Documentation

- Full docs: `.claude/PROMPT_KIT_MARKDOWN_CONFIG.md`
- Official docs: https://www.prompt-kit.com/docs/markdown
