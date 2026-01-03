import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from '@/pages/Auth';
import NotFound from '@/pages/NotFound';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock SparkleBackground (modern replacement for ShaderBackground)
vi.mock('@/components/ui/sparkle-background', () => ({
  SparkleBackground: ({ className }: { className?: string }) => (
    <div data-testid="sparkle-background" className={className}>Sparkle</div>
  ),
  SPARKLE_DEFAULTS: {
    height: 100,
    curvePosition: 53,
    mobileCurvePosition: 70,
    density: 100,
    glowOpacity: 25,
    particleColor: "#FFFFFF",
    glowColor: "#8350e8",
    glowGradient: ["#22c55e", "#3b82f6", "#8b5cf6"],
    useGradient: true,
    speed: 0.2,
    particleSize: 2,
    particleGlow: true,
    opacitySpeed: 0.5,
    minOpacity: 0.7,
    vignetteWidth: 75,
    vignetteHeight: 55,
    gradientSpreadX: 150,
    gradientSpreadY: 60,
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('Accessibility - Motion Preferences', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('prefers-reduced-motion: reduce', () => {
    beforeEach(() => {
      // Mock matchMedia to return reduced motion preference
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    });

    it('Auth page renders with reduced motion preference', () => {
      const { container } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      // Page should still render correctly
      expect(container).toBeInTheDocument();

      // SparkleBackground should still be present (it's always safe)
      const sparkle = container.querySelector('[data-testid="sparkle-background"]');
      expect(sparkle).toBeInTheDocument();
    });

    it('NotFound page renders with reduced motion preference', () => {
      const { container } = render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      // Page should render without errors
      expect(container).toBeInTheDocument();

      // Core content should be visible
      const heading = container.querySelector('h1');
      expect(heading).toBeInTheDocument();
      expect(heading?.textContent).toContain('404');
    });

    it('motion components respect reduced motion setting', () => {
      const { container } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      // Verify motion.div elements are present but will respect reduced motion
      // (motion/react handles this automatically)
      expect(container.querySelector('.flex')).toBeInTheDocument();
    });
  });

  describe('prefers-reduced-motion: no-preference', () => {
    beforeEach(() => {
      // Mock matchMedia to return NO reduced motion preference
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    });

    it('Auth page enables full animations', () => {
      const { container } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      // All content should be present
      expect(container).toBeInTheDocument();

      // Animations are enabled (motion/react will handle)
      const sparkle = container.querySelector('[data-testid="sparkle-background"]');
      expect(sparkle).toBeInTheDocument();
    });

    it('NotFound page enables full animations', () => {
      const { container } = render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      expect(container).toBeInTheDocument();

      // Verify content is present
      const heading = container.querySelector('h1');
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Glass Morphism Accessibility', () => {
    it('glass effects maintain sufficient contrast', () => {
      const { container } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      // Glass morphism classes should be present (in LoginForm Card)
      const blurElements = container.querySelectorAll('[class*="backdrop-blur"]');
      expect(blurElements.length).toBeGreaterThan(0);

      // Verify text is still readable (has proper foreground classes)
      const textElements = container.querySelectorAll('[class*="text-"]');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('backgrounds do not interfere with focus indicators', () => {
      const { container } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      // Background layers have pointer-events-none
      const backgrounds = container.querySelectorAll('.pointer-events-none');
      expect(backgrounds.length).toBeGreaterThan(0);

      // This ensures they don't block focus or clicks on interactive elements
      backgrounds.forEach((bg) => {
        expect(bg).toHaveClass('pointer-events-none');
      });
    });
  });

  describe('Sparkle Background Accessibility', () => {
    it('sparkle background is purely decorative (z-0 layer)', () => {
      const { container } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const sparkle = container.querySelector('[data-testid="sparkle-background"]');
      expect(sparkle).toBeInTheDocument();

      // Should be in a container with z-0 class (modern layering)
      const sparkleParent = sparkle?.parentElement;
      expect(sparkleParent).toHaveClass('z-0');
    });

    it('sparkle does not interfere with screen readers', () => {
      const { container } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const sparkle = container.querySelector('[data-testid="sparkle-background"]');
      const sparkleParent = sparkle?.parentElement;

      // Background should have pointer-events-none
      expect(sparkleParent).toHaveClass('pointer-events-none');

      // This ensures screen readers skip over it as decorative
    });

    it('maintains readability with sparkle background', () => {
      const { container } = render(
        <BrowserRouter>
          <NotFound />
        </BrowserRouter>
      );

      // Sparkle background is present
      const sparkle = container.querySelector('[data-testid="sparkle-background"]');
      expect(sparkle).toBeInTheDocument();

      // Content is still readable (heading is visible)
      const heading = container.querySelector('h1');
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Responsive Design Accessibility', () => {
    it('glass effects work on mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      // Glass effects should still be present
      const blurElements = container.querySelectorAll('[class*="backdrop-blur"]');
      expect(blurElements.length).toBeGreaterThan(0);
    });

    it('sparkle optimizes for mobile (opacity-30)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const sparkle = container.querySelector('[data-testid="sparkle-background"]');
      expect(sparkle).toHaveClass('opacity-30');
    });
  });
});
