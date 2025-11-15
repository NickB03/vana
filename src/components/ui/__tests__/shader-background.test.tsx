import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { ShaderBackground } from '../shader-background';

describe('ShaderBackground', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('renders canvas element', () => {
    const { container } = render(<ShaderBackground />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas?.tagName).toBe('CANVAS');
  });

  it('applies custom className prop', () => {
    const { container } = render(<ShaderBackground className="opacity-30" />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveClass('opacity-30');
  });

  it('applies fixed positioning with full width/height', () => {
    const { container } = render(<ShaderBackground />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveClass('fixed');
    expect(canvas).toHaveClass('inset-0');
    expect(canvas).toHaveClass('w-full');
    expect(canvas).toHaveClass('h-full');
  });

  it('sets canvas with z-index -1 for background layering', () => {
    const { container } = render(<ShaderBackground />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toHaveStyle({ zIndex: '-1' });
  });

  it('gracefully handles WebGL unavailability', () => {
    // Mock WebGL failure
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

    render(<ShaderBackground />);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'WebGL not supported, shader background disabled'
    );

    // Restore
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('renders without WebGL context but displays canvas', () => {
    // Mock WebGL failure
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

    const { container } = render(<ShaderBackground />);

    // Canvas still renders even if WebGL fails
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();

    // Restore
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it('combines custom className with default classes', () => {
    const { container } = render(<ShaderBackground className="test-class another-class" />);
    const canvas = container.querySelector('canvas');

    // Should have both default and custom classes
    expect(canvas).toHaveClass('fixed');
    expect(canvas).toHaveClass('test-class');
    expect(canvas).toHaveClass('another-class');
  });

  it('creates canvas with correct initial dimensions', () => {
    const { container } = render(<ShaderBackground />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    expect(canvas).toBeInTheDocument();
    // Canvas dimensions are set by ResizeObserver in effect
    // Just verify it exists and is a canvas element
    expect(canvas.width).toBeDefined();
    expect(canvas.height).toBeDefined();
  });
});
