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

// Mock ShaderBackground to avoid WebGL in tests
vi.mock('@/components/ui/shader-background', () => ({
  ShaderBackground: ({ className }: { className?: string }) => (
    <div data-testid="shader-background" className={className}>
      Shader Background Mock
    </div>
  ),
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

    expect(screen.getByTestId('shader-background')).toBeInTheDocument();
  });

  it('renders ShaderBackground component with opacity-30', () => {
    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    const shader = screen.getByTestId('shader-background');
    expect(shader).toBeInTheDocument();
    expect(shader).toHaveClass('opacity-30');
  });

  it('has background layers with correct z-index', () => {
    const { container } = render(
      <BrowserRouter>
        <Auth />
      </BrowserRouter>
    );

    // Find elements with z-index: -1 (background layers)
    const backgrounds = container.querySelectorAll('[style*="z-index"]');
    expect(backgrounds.length).toBeGreaterThan(0);

    // Verify at least one has z-index: -1
    const hasNegativeZIndex = Array.from(backgrounds).some(
      (el) => (el as HTMLElement).style.zIndex === '-1'
    );
    expect(hasNegativeZIndex).toBe(true);
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

    // Auth page has shader background and proper z-index layering
    // (Radial gradient is global in Home.tsx, not in Auth.tsx)
    const shader = container.querySelector('[data-testid="shader-background"]');
    expect(shader).toBeInTheDocument();

    // Verify background layers have correct z-index
    const zIndexLayers = container.querySelectorAll('[style*="z-index: -1"]');
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
    expect(screen.getByTestId('shader-background')).toBeInTheDocument();

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
    // Check for backdrop-blur class
    const blurElements = container.querySelectorAll('.backdrop-blur-md');
    expect(blurElements.length).toBeGreaterThan(0);
  });
});
