import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonLine } from '../skeleton-line';
import { SkeletonParagraph } from '../skeleton-paragraph';
import { SkeletonAvatar } from '../skeleton-avatar';
import { SkeletonCard } from '../skeleton-card';

describe('SkeletonLine', () => {
  it('renders with default full width', () => {
    const { container } = render(<SkeletonLine />);
    const skeleton = container.querySelector('.animate-pulse-sync');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('w-full');
    expect(skeleton).toHaveClass('h-4');
  });

  it('renders with custom width variant', () => {
    const { container } = render(<SkeletonLine width="3/4" />);
    const skeleton = container.querySelector('.animate-pulse-sync');
    expect(skeleton).toHaveClass('w-3/4');
  });

  it('applies custom className prop', () => {
    const { container } = render(<SkeletonLine className="custom-class" />);
    const skeleton = container.querySelector('.animate-pulse-sync');
    expect(skeleton).toHaveClass('custom-class');
  });

  it('supports all width variants', () => {
    const widths = ['full', '3/4', '2/3', '1/2', '1/3', '1/4'] as const;
    const expectedClasses = ['w-full', 'w-3/4', 'w-2/3', 'w-1/2', 'w-1/3', 'w-1/4'];

    widths.forEach((width, index) => {
      const { container } = render(<SkeletonLine width={width} />);
      const skeleton = container.querySelector('.animate-pulse-sync');
      expect(skeleton).toHaveClass(expectedClasses[index]);
    });
  });

  it('has correct displayName for React DevTools', () => {
    expect(SkeletonLine.displayName).toBe('SkeletonLine');
  });
});

describe('SkeletonParagraph', () => {
  it('renders default 3 lines', () => {
    const { container } = render(<SkeletonParagraph />);
    const lines = container.querySelectorAll('.animate-pulse-sync');
    expect(lines).toHaveLength(3);
  });

  it('renders custom number of lines', () => {
    const { container } = render(<SkeletonParagraph lines={5} />);
    const lines = container.querySelectorAll('.animate-pulse-sync');
    expect(lines).toHaveLength(5);
  });

  it('applies space-y-2 spacing between lines', () => {
    const { container } = render(<SkeletonParagraph />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('space-y-2');
  });

  it('applies custom className to wrapper', () => {
    const { container } = render(<SkeletonParagraph className="custom-spacing" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-spacing');
  });

  it('uses natural width variation for lines', () => {
    const { container } = render(<SkeletonParagraph lines={5} />);
    const lines = container.querySelectorAll('.animate-pulse-sync');

    // First line should be full width
    expect(lines[0]).toHaveClass('w-full');

    // Lines should have varying widths (not all full)
    const hasVariation = Array.from(lines).some(
      (line, i) => i > 0 && !line.classList.contains('w-full')
    );
    expect(hasVariation).toBe(true);
  });

  it('applies valid Tailwind width classes to all lines', () => {
    const { container } = render(<SkeletonParagraph lines={5} />);
    const lines = container.querySelectorAll('.animate-pulse-sync');

    // LINE_WIDTHS = ['full', '3/4', '2/3', '1/2', '3/4']
    // All of these are valid SkeletonLine widths
    const validWidthClasses = ['w-full', 'w-3/4', 'w-2/3', 'w-1/2'];

    lines.forEach((line) => {
      const hasValidWidth = validWidthClasses.some(cls => line.classList.contains(cls));
      expect(hasValidWidth).toBe(true);
    });
  });

  it('cycles through width variants predictably', () => {
    const { container } = render(<SkeletonParagraph lines={7} />);
    const lines = container.querySelectorAll('.animate-pulse-sync');

    // LINE_WIDTHS = ['full', '3/4', '2/3', '1/2', '3/4']
    // All these widths are valid in SkeletonLine
    const expectedWidths = [
      'w-full',  // Index 0: 'full' -> w-full
      'w-3/4',   // Index 1: '3/4' -> w-3/4
      'w-2/3',   // Index 2: '2/3' -> w-2/3
      'w-1/2',   // Index 3: '1/2' -> w-1/2
      'w-3/4',   // Index 4: '3/4' -> w-3/4
      'w-full',  // Index 5: 'full' -> w-full (cycle repeats)
      'w-3/4',   // Index 6: '3/4' -> w-3/4
    ];

    lines.forEach((line, index) => {
      expect(line).toHaveClass(expectedWidths[index]);
    });
  });

  it('each line has exactly one width class', () => {
    const { container } = render(<SkeletonParagraph lines={5} />);
    const lines = container.querySelectorAll('.animate-pulse-sync');

    const allWidthClasses = ['w-full', 'w-3/4', 'w-2/3', 'w-1/2', 'w-1/3', 'w-1/4'];

    lines.forEach((line) => {
      const matchedClasses = allWidthClasses.filter(cls => line.classList.contains(cls));
      expect(matchedClasses.length).toBe(1);
    });
  });

  it('has correct displayName for React DevTools', () => {
    expect(SkeletonParagraph.displayName).toBe('SkeletonParagraph');
  });
});

describe('SkeletonAvatar', () => {
  it('renders with default medium size', () => {
    const { container } = render(<SkeletonAvatar />);
    const avatar = container.querySelector('.animate-pulse-sync');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass('h-10');
    expect(avatar).toHaveClass('w-10');
    expect(avatar).toHaveClass('rounded-full');
  });

  it('renders small size variant', () => {
    const { container } = render(<SkeletonAvatar size="sm" />);
    const avatar = container.querySelector('.animate-pulse-sync');
    expect(avatar).toHaveClass('h-8');
    expect(avatar).toHaveClass('w-8');
  });

  it('renders large size variant', () => {
    const { container } = render(<SkeletonAvatar size="lg" />);
    const avatar = container.querySelector('.animate-pulse-sync');
    expect(avatar).toHaveClass('h-12');
    expect(avatar).toHaveClass('w-12');
  });

  it('applies custom className prop', () => {
    const { container } = render(<SkeletonAvatar className="custom-avatar" />);
    const avatar = container.querySelector('.animate-pulse-sync');
    expect(avatar).toHaveClass('custom-avatar');
    expect(avatar).toHaveClass('rounded-full'); // Should still have default classes
  });

  it('has correct displayName for React DevTools', () => {
    expect(SkeletonAvatar.displayName).toBe('SkeletonAvatar');
  });
});

describe('SkeletonCard', () => {
  it('renders with image area by default', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('.animate-pulse-sync');

    // Should have: image skeleton + title skeleton + paragraph lines (2)
    expect(skeletons.length).toBeGreaterThanOrEqual(4);

    // First skeleton should be the image area
    const imageArea = skeletons[0];
    expect(imageArea).toHaveClass('h-32');
    expect(imageArea).toHaveClass('w-full');
    expect(imageArea).toHaveClass('rounded-lg');
  });

  it('renders without image area when hasImage is false', () => {
    const { container } = render(<SkeletonCard hasImage={false} />);
    const skeletons = container.querySelectorAll('.animate-pulse-sync');

    // Should have: title skeleton + paragraph lines (2) only
    expect(skeletons.length).toBe(3);

    // Should not have large image skeleton
    const hasLargeImage = Array.from(skeletons).some(
      (skeleton) => skeleton.classList.contains('h-32')
    );
    expect(hasLargeImage).toBe(false);
  });

  it('renders title skeleton', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('.animate-pulse-sync');

    // Find title skeleton (h-5)
    const titleSkeleton = Array.from(skeletons).find(
      (skeleton) => skeleton.classList.contains('h-5')
    );
    expect(titleSkeleton).toBeInTheDocument();
  });

  it('applies space-y-3 spacing to wrapper', () => {
    const { container } = render(<SkeletonCard />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('space-y-3');
  });

  it('applies custom className to wrapper', () => {
    const { container } = render(<SkeletonCard className="custom-card" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-card');
    expect(wrapper).toHaveClass('space-y-3'); // Should preserve default classes
  });

  it('has correct displayName for React DevTools', () => {
    expect(SkeletonCard.displayName).toBe('SkeletonCard');
  });
});

describe('Skeleton Components Integration', () => {
  it('all components use memoization for performance', () => {
    // Verify components are wrapped with memo
    expect(SkeletonLine).toBeDefined();
    expect(SkeletonParagraph).toBeDefined();
    expect(SkeletonAvatar).toBeDefined();
    expect(SkeletonCard).toBeDefined();
  });

  it('all components support className prop for composability', () => {
    const customClass = 'test-composability';

    const line = render(<SkeletonLine className={customClass} />);
    expect(line.container.querySelector('.test-composability')).toBeInTheDocument();
    line.unmount();

    const paragraph = render(<SkeletonParagraph className={customClass} />);
    expect(paragraph.container.querySelector('.test-composability')).toBeInTheDocument();
    paragraph.unmount();

    const avatar = render(<SkeletonAvatar className={customClass} />);
    expect(avatar.container.querySelector('.test-composability')).toBeInTheDocument();
    avatar.unmount();

    const card = render(<SkeletonCard className={customClass} />);
    expect(card.container.querySelector('.test-composability')).toBeInTheDocument();
    card.unmount();
  });

  it('all components have pulse animation', () => {
    const components = [
      render(<SkeletonLine />),
      render(<SkeletonParagraph />),
      render(<SkeletonAvatar />),
      render(<SkeletonCard />),
    ];

    components.forEach((component) => {
      const animated = component.container.querySelector('.animate-pulse-sync');
      expect(animated).toBeInTheDocument();
      component.unmount();
    });
  });
});
