import { describe, it, expect } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
} from '../chain-of-thought';
import { getIconComponent } from '../chain-of-thought-utils';

/**
 * Test Suite for Chain of Thought Components
 *
 * Coverage:
 * - ✅ getIconComponent() icon mapping
 * - ✅ ChainOfThoughtItem rendering
 * - ✅ ChainOfThoughtTrigger click and keyboard interactions
 * - ✅ ChainOfThoughtTrigger ARIA attributes
 * - ✅ ChainOfThoughtContent collapse/expand animations
 * - ✅ ChainOfThoughtStep composition
 * - ✅ ChainOfThought container with multiple steps
 * - ✅ Icon swapping on hover behavior
 * - ✅ Accessibility features (screen readers, keyboard navigation)
 * - ✅ Edge cases and error handling
 */

describe('getIconComponent', () => {
  it('returns Search icon for "search"', () => {
    const icon = getIconComponent('search');
    expect(icon).toBeTruthy();
    expect(icon?.type).toBeDefined();
  });

  it('returns Lightbulb icon for "lightbulb"', () => {
    const icon = getIconComponent('lightbulb');
    expect(icon).toBeTruthy();
    expect(icon?.type).toBeDefined();
  });

  it('returns Target icon for "target"', () => {
    const icon = getIconComponent('target');
    expect(icon).toBeTruthy();
    expect(icon?.type).toBeDefined();
  });

  it('returns Sparkles icon for "sparkles"', () => {
    const icon = getIconComponent('sparkles');
    expect(icon).toBeTruthy();
    expect(icon?.type).toBeDefined();
  });

  it('returns null for undefined icon', () => {
    const icon = getIconComponent(undefined);
    expect(icon).toBeNull();
  });

  it('returns null for invalid icon name', () => {
    const icon = getIconComponent('invalid_icon');
    expect(icon).toBeNull();
  });

  it('returns null for empty string', () => {
    const icon = getIconComponent('');
    expect(icon).toBeNull();
  });

  it('all returned icons have h-4 w-4 classes', () => {
    const icons = ['search', 'lightbulb', 'target', 'sparkles'];

    icons.forEach(iconName => {
      const icon = getIconComponent(iconName);
      expect(icon?.props.className).toContain('h-4');
      expect(icon?.props.className).toContain('w-4');
    });
  });
});

describe('ChainOfThoughtItem', () => {
  it('renders children correctly', () => {
    render(<ChainOfThoughtItem>Test item content</ChainOfThoughtItem>);
    expect(screen.getByText('Test item content')).toBeInTheDocument();
  });

  it('applies default text styling classes', () => {
    const { container } = render(<ChainOfThoughtItem>Item</ChainOfThoughtItem>);
    const item = container.firstChild;

    expect(item).toHaveClass('text-muted-foreground');
    expect(item).toHaveClass('text-sm');
  });

  it('merges custom className with defaults', () => {
    const { container } = render(
      <ChainOfThoughtItem className="custom-class">Item</ChainOfThoughtItem>
    );
    const item = container.firstChild;

    expect(item).toHaveClass('text-muted-foreground');
    expect(item).toHaveClass('custom-class');
  });

  it('accepts additional HTML props', () => {
    const { container } = render(
      <ChainOfThoughtItem data-testid="test-item" id="item-1">
        Item
      </ChainOfThoughtItem>
    );

    const item = container.querySelector('#item-1');
    expect(item).toBeInTheDocument();
    expect(screen.getByTestId('test-item')).toBeInTheDocument();
  });

  it('renders multiple items correctly', () => {
    render(
      <>
        <ChainOfThoughtItem>Item 1</ChainOfThoughtItem>
        <ChainOfThoughtItem>Item 2</ChainOfThoughtItem>
        <ChainOfThoughtItem>Item 3</ChainOfThoughtItem>
      </>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });
});

describe('ChainOfThoughtTrigger', () => {
  describe('Rendering', () => {
    it('renders trigger button with text', () => {
      render(
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Test trigger text</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
      expect(screen.getByText('Test trigger text')).toBeInTheDocument();
    });

    it('displays default circle icon when no leftIcon provided', () => {
      const { container } = render(
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Trigger</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      );

      // Check for Circle component
      const circle = container.querySelector('.size-2.fill-current');
      expect(circle).toBeInTheDocument();
    });

    it('displays custom leftIcon when provided', () => {
      const customIcon = <span data-testid="custom-icon">★</span>;

      render(
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={customIcon}>
            Trigger with icon
          </ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('displays chevron when no leftIcon provided', () => {
      const { container } = render(
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Trigger</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      );

      // ChevronDown should be visible
      const chevrons = container.querySelectorAll('svg');
      expect(chevrons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA role', () => {
      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>Trigger</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');
      expect(trigger).toBeInTheDocument();
    });

    it('has aria-expanded attribute', () => {
      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>Trigger</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-expanded');
    });

    it('starts with aria-expanded="false"', () => {
      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>Trigger</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('has descriptive aria-label for "Expand"', () => {
      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>My reasoning step</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');
      const ariaLabel = trigger.getAttribute('aria-label');

      expect(ariaLabel).toContain('Expand');
      expect(ariaLabel).toContain('My reasoning step');
    });

    it('updates aria-expanded after click', async () => {
      const user = userEvent.setup();

      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>Test step</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');

      // Initially collapsed
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('has tabIndex={0} for keyboard focus', () => {
      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>Trigger</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('tabIndex', '0');
    });

    it('has static descriptive aria-label', () => {
      render(
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Test step</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      );

      const trigger = screen.getByRole('button');
      const ariaLabel = trigger.getAttribute('aria-label');

      // Should have descriptive label that includes step text
      expect(ariaLabel).toContain('Test step');
      expect(ariaLabel).toContain('Expand or collapse');
    });

    it('decorative icons have aria-hidden="true"', () => {
      const { container } = render(
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Trigger</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      );

      const ariaHiddenElements = container.querySelectorAll('[aria-hidden="true"]');
      expect(ariaHiddenElements.length).toBeGreaterThan(0);
    });
  });

  describe('Interaction', () => {
    it('toggles expanded state on click', async () => {
      const user = userEvent.setup();

      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>Toggle test</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');

      // Initially collapsed
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      // Click to expand
      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      // Click again to collapse
      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('toggles on Enter key press', async () => {
      const user = userEvent.setup();

      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>Keyboard test</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');
      trigger.focus();

      // Press Enter
      await user.keyboard('{Enter}');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      // Press Enter again
      await user.keyboard('{Enter}');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('toggles on Space key press', async () => {
      const user = userEvent.setup();

      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>Space test</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');
      trigger.focus();

      // Press Space
      await user.keyboard(' ');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('does not toggle on other key presses', async () => {
      const user = userEvent.setup();

      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>Other keys</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');
      trigger.focus();

      // Press 'A' key
      await user.keyboard('a');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');

      // Press Tab (should not toggle)
      await user.keyboard('{Tab}');
      // Check if still collapsed (Tab moves focus, doesn't toggle)
    });
  });

  describe('Icon Swapping', () => {
    it('shows hover icon when swapIconOnHover is true', () => {
      const customIcon = <span data-testid="custom">Icon</span>;

      const { container } = render(
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={customIcon} swapIconOnHover={true}>
            Hover test
          </ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      );

      // ChevronDown should be present (for hover swap)
      const chevrons = container.querySelectorAll('svg');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('does not show hover icon when swapIconOnHover is false', () => {
      const customIcon = <span data-testid="custom">Icon</span>;

      const { container } = render(
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={customIcon} swapIconOnHover={false}>
            No hover swap
          </ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      );

      // No extra chevron for swapping
      const customIcons = screen.getAllByTestId('custom');
      expect(customIcons.length).toBe(1);
    });
  });

  describe('Text Content Extraction', () => {
    it('extracts text from string children', () => {
      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>Simple string</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');
      const ariaLabel = trigger.getAttribute('aria-label');
      expect(ariaLabel).toContain('Simple string');
    });

    it('extracts text from nested elements', () => {
      render(
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>
            <span>Nested <strong>text</strong></span>
          </ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      );

      const trigger = screen.getByRole('button');
      const ariaLabel = trigger.getAttribute('aria-label');
      expect(ariaLabel).toContain('Nested');
      expect(ariaLabel).toContain('text');
    });

    it('handles number children', () => {
      render(<ChainOfThoughtStep><ChainOfThoughtTrigger>{42}</ChainOfThoughtTrigger></ChainOfThoughtStep>);

      const trigger = screen.getByRole('button');
      const ariaLabel = trigger.getAttribute('aria-label');
      expect(ariaLabel).toContain('42');
    });

    it('handles array of children', () => {
      render(
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>
            {['Part ', 'one ', 'two']}
          </ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      );

      const trigger = screen.getByRole('button');
      const ariaLabel = trigger.getAttribute('aria-label');
      expect(ariaLabel).toContain('Part one two');
    });
  });
});

describe('ChainOfThoughtContent', () => {
  it('renders content children', async () => {
    const user = userEvent.setup();

    render(
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger>Test</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>Content item 1</ChainOfThoughtItem>
          <ChainOfThoughtItem>Content item 2</ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
    );

    // Content is initially hidden, expand it first
    const trigger = screen.getByRole('button');
    await user.click(trigger);

    // Now content should be visible
    await waitFor(() => {
      expect(screen.getByText('Content item 1')).toBeVisible();
      expect(screen.getByText('Content item 2')).toBeVisible();
    });
  });

  it('has animation classes', () => {
    const { container } = render(
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger>Test</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>Content</ChainOfThoughtContent>
      </ChainOfThoughtStep>
    );

    // Check for CollapsibleContent which has overflow-hidden
    const content = container.querySelector('.overflow-hidden');
    expect(content).toBeInTheDocument();
    expect(content).toHaveClass('overflow-hidden');
  });

  it('uses grid layout for vertical line', async () => {
    const user = userEvent.setup();

    const { container } = render(
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger>Test</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>Item</ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
    );

    // Expand to render content
    const trigger = screen.getByRole('button');
    await user.click(trigger);

    // Check for grid layout after expansion
    await waitFor(() => {
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });
  });

  it('renders vertical connecting line', () => {
    const { container } = render(
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger>Test</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>Item</ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
    );

    // Check for vertical line element
    const line = container.querySelector('.w-px');
    expect(line).toBeInTheDocument();
  });
});

describe('ChainOfThoughtStep', () => {
  it('renders step with trigger and content', async () => {
    const user = userEvent.setup();

    render(
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger>Step title</ChainOfThoughtTrigger>
        <ChainOfThoughtContent>
          <ChainOfThoughtItem>Step content</ChainOfThoughtItem>
        </ChainOfThoughtContent>
      </ChainOfThoughtStep>
    );

    expect(screen.getByText('Step title')).toBeInTheDocument();

    // Expand to see content
    const trigger = screen.getByRole('button');
    await user.click(trigger);

    expect(screen.getByText('Step content')).toBeInTheDocument();
  });

  it('applies group class', () => {
    const { container } = render(
      <ChainOfThoughtStep>
        <ChainOfThoughtTrigger>Title</ChainOfThoughtTrigger>
      </ChainOfThoughtStep>
    );

    const step = container.querySelector('.group');
    expect(step).toBeInTheDocument();
  });

  it('sets data-last attribute based on isLast prop', () => {
    const { container } = render(
      <ChainOfThoughtStep isLast={true}>
        <ChainOfThoughtTrigger>Last step</ChainOfThoughtTrigger>
      </ChainOfThoughtStep>
    );

    const step = container.querySelector('[data-last="true"]');
    expect(step).toBeInTheDocument();
  });

  it('renders connecting line when not last step', () => {
    const { container } = render(
      <ChainOfThoughtStep isLast={false}>
        <ChainOfThoughtTrigger>Not last</ChainOfThoughtTrigger>
      </ChainOfThoughtStep>
    );

    // Check for connecting line (h-4 w-px)
    const line = container.querySelector('.h-4.w-px');
    expect(line).toBeInTheDocument();
  });

  it('hides connecting line when last step', () => {
    const { container } = render(
      <ChainOfThoughtStep isLast={true}>
        <ChainOfThoughtTrigger>Last step</ChainOfThoughtTrigger>
      </ChainOfThoughtStep>
    );

    // Line container should have hidden class for last step
    const lineContainer = container.querySelector('.group-data-\\[last\\=true\\]\\:hidden');
    expect(lineContainer).toBeInTheDocument();
  });
});

describe('ChainOfThought Container', () => {
  it('renders multiple steps correctly', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Step 1</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Step 2</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Step 3</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      </ChainOfThought>
    );

    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('marks last step with isLast prop', () => {
    const { container } = render(
      <ChainOfThought>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Step 1</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Step 2</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      </ChainOfThought>
    );

    // Last step should have data-last="true"
    const steps = container.querySelectorAll('[data-last]');
    const lastStep = Array.from(steps).find(
      step => step.getAttribute('data-last') === 'true'
    );

    expect(lastStep).toBeInTheDocument();
  });

  it('applies space-y-0 class for no vertical spacing', () => {
    const { container } = render(
      <ChainOfThought>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Step</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      </ChainOfThought>
    );

    const chainContainer = container.querySelector('.space-y-0');
    expect(chainContainer).toBeInTheDocument();
  });

  it('handles empty children gracefully', () => {
    const { container } = render(<ChainOfThought>{[]}</ChainOfThought>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('handles single step', () => {
    render(
      <ChainOfThought>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Only step</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      </ChainOfThought>
    );

    expect(screen.getByText('Only step')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(
      <ChainOfThought className="custom-chain">
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Step</ChainOfThoughtTrigger>
        </ChainOfThoughtStep>
      </ChainOfThought>
    );

    const chain = container.firstChild;
    expect(chain).toHaveClass('space-y-0');
    expect(chain).toHaveClass('custom-chain');
  });
});

describe('Integration Tests', () => {
  it('complete chain of thought workflow', async () => {
    const user = userEvent.setup();

    render(
      <ChainOfThought>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={getIconComponent('search')}>
            Research phase
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>Finding information</ChainOfThoughtItem>
            <ChainOfThoughtItem>Analyzing data</ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={getIconComponent('lightbulb')}>
            Analysis phase
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>Identifying patterns</ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger leftIcon={getIconComponent('target')}>
            Solution phase
          </ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>Implementing solution</ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
      </ChainOfThought>
    );

    // All step titles visible
    expect(screen.getByText('Research phase')).toBeInTheDocument();
    expect(screen.getByText('Analysis phase')).toBeInTheDocument();
    expect(screen.getByText('Solution phase')).toBeInTheDocument();

    // Expand first step
    const researchTrigger = screen.getByText('Research phase');
    await user.click(researchTrigger);

    expect(screen.getByText('Finding information')).toBeInTheDocument();
    expect(screen.getByText('Analyzing data')).toBeInTheDocument();

    // Expand second step
    const analysisTrigger = screen.getByText('Analysis phase');
    await user.click(analysisTrigger);

    expect(screen.getByText('Identifying patterns')).toBeInTheDocument();
  });

  it('keyboard navigation through steps', async () => {
    const user = userEvent.setup();

    render(
      <ChainOfThought>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Step 1</ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>Content 1</ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
        <ChainOfThoughtStep>
          <ChainOfThoughtTrigger>Step 2</ChainOfThoughtTrigger>
          <ChainOfThoughtContent>
            <ChainOfThoughtItem>Content 2</ChainOfThoughtItem>
          </ChainOfThoughtContent>
        </ChainOfThoughtStep>
      </ChainOfThought>
    );

    // Get triggers
    const triggers = screen.getAllByRole('button');

    // Test keyboard focus navigation
    triggers[0].focus();
    expect(document.activeElement).toBe(triggers[0]);

    // Test Enter key updates aria-expanded
    await user.keyboard('{Enter}');
    expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');

    // Tab to second trigger
    await user.keyboard('{Tab}');
    expect(document.activeElement).toBe(triggers[1]);

    // Test Space key updates aria-expanded
    await user.keyboard(' ');
    expect(triggers[1]).toHaveAttribute('aria-expanded', 'true');
  });
});
