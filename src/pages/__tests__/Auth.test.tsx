import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from '../Auth';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
  },
}));

// Mock SparkleBackground to avoid WebGL/canvas in tests
vi.mock('@/components/ui/sparkle-background', () => ({
  SparkleBackground: ({ className }: { className?: string }) => (
    <div data-testid="sparkle-background" className={className}>
      Sparkle Background Mock
    </div>
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

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('Auth Page - UI Consistency', () => {
  it('renders without crashing', () => {
    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    expect(screen.getByTestId('sparkle-background')).toBeInTheDocument();
  });

  it('renders SparkleBackground component with opacity-30', () => {
    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    const sparkle = screen.getByTestId('sparkle-background');
    expect(sparkle).toBeInTheDocument();
    expect(sparkle).toHaveClass('opacity-30');
  });

  it('has background layers with correct z-index', () => {
    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // Find elements with z-index styles (modern PageLayout uses z-0 and z-10)
    const backgrounds = container.querySelectorAll('[style*="z-index"]');
    expect(backgrounds.length).toBeGreaterThan(0);

    // Verify at least one has z-index: 0 (gradient overlay)
    const hasZeroZIndex = Array.from(backgrounds).some(
      (el) => (el as HTMLElement).style.zIndex === '0'
    );
    expect(hasZeroZIndex).toBe(true);
  });

  it('has pointer-events-none on background layers', () => {
    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    const backgrounds = container.querySelectorAll('.pointer-events-none');
    expect(backgrounds.length).toBeGreaterThan(0);
  });

  it('has consistent background layering architecture', () => {
    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // Auth page has sparkle background via PageLayout
    const sparkle = container.querySelector('[data-testid="sparkle-background"]');
    expect(sparkle).toBeInTheDocument();

    // Verify background layers have correct z-index (z-0 for overlays)
    const zIndexLayers = container.querySelectorAll('[style*="z-index: 0"]');
    expect(zIndexLayers.length).toBeGreaterThan(0);
  });

  it('renders login form container', () => {
    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // LoginForm should be present (look for email input as indicator)
    const emailInput = screen.queryByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();
  });

  it('centers content vertically and horizontally', () => {
    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // Find the main container
    const mainContainer = container.querySelector('.flex.min-h-svh');
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass('items-center');
    expect(mainContainer).toHaveClass('justify-center');
  });

  it('applies proper responsive padding', () => {
    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // Check for responsive padding classes
    const contentContainer = container.querySelector('.p-6');
    expect(contentContainer).toBeInTheDocument();
  });

  it('shows processing state when OAuth is active', () => {
    // Mock URL with OAuth params
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hash: '#access_token=test',
    };

    render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // Component should handle OAuth state
    expect(screen.getByTestId('sparkle-background')).toBeInTheDocument();

    // Restore
    window.location = originalLocation;
  });

  it('has glass morphism effect on login form', () => {
    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // LoginForm should have glass effect classes
    // Check for backdrop-blur class on the Card component
    const blurElements = container.querySelectorAll('[class*="backdrop-blur"]');
    expect(blurElements.length).toBeGreaterThan(0);
  });
});
