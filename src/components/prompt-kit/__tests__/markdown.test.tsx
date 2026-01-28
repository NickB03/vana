import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Markdown } from '../markdown';

describe('Markdown Component', () => {
  describe('Code Rendering', () => {
    it('renders inline code', () => {
      const markdown = 'This is `inline code` in text.';
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const codeElement = container.querySelector('code');
      expect(codeElement).toBeTruthy();
      expect(codeElement?.textContent).toBe('inline code');
    });

    it('renders code blocks', () => {
      const markdown = '```javascript\nconst hello = "world";\n```';
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const preElement = container.querySelector('pre');
      const codeElement = container.querySelector('pre code');

      expect(preElement).toBeTruthy();
      expect(codeElement).toBeTruthy();
      expect(codeElement?.textContent).toContain('const hello = "world";');
    });

    it('handles mixed code content', () => {
      const markdown = 'Text with `inline` and\n\n```\nblock\n```';
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const codeElements = container.querySelectorAll('code');
      expect(codeElements.length).toBeGreaterThan(0);

      const preElements = container.querySelectorAll('pre');
      expect(preElements.length).toBeGreaterThan(0);
    });
  });

  describe('Link Rendering', () => {
    it('renders links with target="_blank" and rel attributes', () => {
      const markdown = '[Click here](https://example.com)';
      render(<Markdown>{markdown}</Markdown>);

      const link = screen.getByRole('link', { name: 'Click here' });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('applies link styling classes', () => {
      const markdown = '[Link](https://example.com)';
      render(<Markdown>{markdown}</Markdown>);

      const link = screen.getByRole('link');
      expect(link.className).toContain('text-primary');
      expect(link.className).toContain('hover:underline');
    });

    it('renders multiple links correctly', () => {
      const markdown = '[First](https://first.com) and [Second](https://second.com)';
      render(<Markdown>{markdown}</Markdown>);

      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', 'https://first.com');
      expect(links[1]).toHaveAttribute('href', 'https://second.com');
    });
  });

  describe('Paragraph Rendering', () => {
    it('renders paragraphs with proper spacing', () => {
      const markdown = 'First paragraph\n\nSecond paragraph';
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(2);

      paragraphs.forEach((p) => {
        expect(p.className).toContain('mb-4');
        expect(p.className).toContain('last:mb-0');
      });
    });

    it('removes bottom margin from last paragraph', () => {
      const markdown = 'Only paragraph';
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const paragraph = container.querySelector('p');
      expect(paragraph?.className).toContain('last:mb-0');
    });
  });

  describe('List Rendering', () => {
    it('renders unordered lists with proper styling', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const ul = container.querySelector('ul');
      expect(ul).toBeTruthy();
      expect(ul?.className).toContain('my-2');
      expect(ul?.className).toContain('ml-4');
      expect(ul?.className).toContain('list-disc');
      expect(ul?.className).toContain('space-y-1');
    });

    it('renders ordered lists with proper styling', () => {
      const markdown = '1. First\n2. Second\n3. Third';
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const ol = container.querySelector('ol');
      expect(ol).toBeTruthy();
      expect(ol?.className).toContain('my-2');
      expect(ol?.className).toContain('ml-4');
      expect(ol?.className).toContain('list-decimal');
      expect(ol?.className).toContain('space-y-1');
    });

    it('renders list items correctly', () => {
      const markdown = '- Apple\n- Banana\n- Cherry';
      render(<Markdown>{markdown}</Markdown>);

      expect(screen.getByText('Apple')).toBeTruthy();
      expect(screen.getByText('Banana')).toBeTruthy();
      expect(screen.getByText('Cherry')).toBeTruthy();
    });

    it('handles nested lists', () => {
      const markdown = '- Parent\n  - Child 1\n  - Child 2';
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const lists = container.querySelectorAll('ul');
      expect(lists.length).toBeGreaterThan(1); // Parent and nested list
    });
  });

  describe('GFM (GitHub Flavored Markdown)', () => {
    it('renders strikethrough text', () => {
      const markdown = '~~strikethrough~~';
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const del = container.querySelector('del');
      expect(del?.textContent).toBe('strikethrough');
    });

    it('renders tables', () => {
      const markdown = `| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |`;
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const table = container.querySelector('table');
      expect(table).toBeTruthy();
      expect(screen.getByText('Header 1')).toBeTruthy();
      expect(screen.getByText('Cell 1')).toBeTruthy();
    });

    it('renders task lists', () => {
      const markdown = '- [ ] Todo\n- [x] Done';
      const { container } = render(<Markdown>{markdown}</Markdown>);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(2);
    });
  });

  describe('Component Props', () => {
    it('applies custom className', () => {
      const markdown = 'Test content';
      const { container } = render(<Markdown className="custom-class">Test content</Markdown>);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('applies default prose classes', () => {
      const markdown = 'Test content';
      const { container } = render(<Markdown>Test content</Markdown>);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('prose');
      expect(wrapper).toHaveClass('prose-sm');
      expect(wrapper).toHaveClass('max-w-none');
      expect(wrapper).toHaveClass('dark:prose-invert');
    });

    it('merges custom className with default classes', () => {
      const markdown = 'Test content';
      const { container } = render(<Markdown className="my-custom-class">Test content</Markdown>);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('prose');
      expect(wrapper).toHaveClass('my-custom-class');
    });
  });

  describe('Complex Markdown', () => {
    it('renders mixed content correctly', () => {
      const markdown = `# Heading

Paragraph with **bold** and *italic* text.

- List item 1
- List item 2

\`inline code\` and [link](https://example.com)

\`\`\`javascript
const code = "block";
\`\`\``;

      const { container } = render(<Markdown>{markdown}</Markdown>);

      expect(screen.getByText('Heading')).toBeTruthy();
      expect(screen.getByText('bold')).toBeTruthy();
      expect(screen.getByText('italic')).toBeTruthy();
      expect(screen.getByText('inline code')).toBeTruthy();
      expect(screen.getByRole('link')).toBeTruthy();
      expect(container.querySelector('ul')).toBeTruthy();
      expect(container.querySelector('pre')).toBeTruthy();
    });

    it('handles empty content gracefully', () => {
      const { container } = render(<Markdown>{''}</Markdown>);
      expect(container.firstChild).toBeTruthy();
    });

    it('handles whitespace-only content', () => {
      const { container } = render(<Markdown>{'   \n\n   '}</Markdown>);
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe('Memoization', () => {
    it('re-renders when content changes', () => {
      const { rerender, getByText } = render(<Markdown>First</Markdown>);
      expect(getByText('First')).toBeTruthy();

      rerender(<Markdown>Second</Markdown>);
      expect(getByText('Second')).toBeTruthy();
    });

    it('re-renders when className changes', () => {
      const { rerender, container } = render(<Markdown className="class1">Content</Markdown>);
      expect(container.firstChild).toHaveClass('class1');

      rerender(<Markdown className="class2">Content</Markdown>);
      expect(container.firstChild).toHaveClass('class2');
      expect(container.firstChild).not.toHaveClass('class1');
    });
  });
});
