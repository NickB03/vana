import { useState, useEffect } from 'react';
import { Download, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * InlineImageDemo - Simulated AI inline image for chat demo
 *
 * Features:
 * - Progressive image reveal animation (like real AI generation)
 * - Loading shimmer effect
 * - Smooth fade-in transition
 * - Click to expand (simulated)
 * - Download button on hover
 */

interface InlineImageDemoProps {
  onImageRevealed?: () => void;
}

// Path to the actual generated image
const PIKACHU_IMAGE_URL = '/Demos/Pikachu_on_a_surfboard_wearing_a_tuxedo.png';

export function InlineImageDemo({ onImageRevealed }: InlineImageDemoProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealProgress, setRevealProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Preload the image
  useEffect(() => {
    const img = new Image();
    img.src = PIKACHU_IMAGE_URL;
    img.onload = () => setImageLoaded(true);
  }, []);

  useEffect(() => {
    // Start revealing after image is loaded and a short delay
    if (!imageLoaded) return;

    const startTimer = setTimeout(() => {
      setIsRevealing(true);
    }, 300);

    return () => clearTimeout(startTimer);
  }, [imageLoaded]);

  useEffect(() => {
    if (!isRevealing) return;

    // Simulate progressive image generation (0-100%)
    const progressInterval = setInterval(() => {
      setRevealProgress(prev => {
        const next = prev + 2.5;
        if (next >= 100) {
          clearInterval(progressInterval);
          setIsComplete(true);
          onImageRevealed?.();
          return 100;
        }
        return next;
      });
    }, 40); // Total duration: ~1.6 seconds

    return () => clearInterval(progressInterval);
  }, [isRevealing, onImageRevealed]);

  return (
    <div className="my-3">
      <div
        className={cn(
          "relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-300 max-w-md shadow-sm",
          isComplete ? "border-border hover:border-primary hover:shadow-md" : "border-border/50"
        )}
      >
        {/* Container with fixed aspect ratio matching the image */}
        <div className="relative aspect-square w-full max-w-md bg-muted">
          {/* Loading shimmer background */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted transition-opacity duration-500 z-10",
              isComplete ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            {/* Animated shimmer */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                animation: 'shimmer 1.5s infinite',
              }}
            />
            {/* Loading indicator in center */}
            {!isComplete && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="relative">
                  <Sparkles className="h-8 w-8 text-primary/60 animate-pulse" />
                </div>
                <div className="text-sm text-muted-foreground font-medium">
                  Generating image...
                </div>
                <div className="w-32 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-100"
                    style={{ width: `${revealProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actual generated image with reveal effect */}
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-300",
              revealProgress > 5 ? "opacity-100" : "opacity-0"
            )}
          >
            {/* The actual Pikachu image */}
            <img
              src={PIKACHU_IMAGE_URL}
              alt="Pikachu on a surfboard wearing a tuxedo"
              className="w-full h-full object-cover"
              loading="eager"
            />

            {/* Progressive reveal mask - reveals from top to bottom */}
            <div
              className="absolute inset-0 bg-muted"
              style={{
                clipPath: `inset(${revealProgress}% 0 0 0)`,
                transition: 'clip-path 0.04s linear'
              }}
            />
          </div>

          {/* Subtle hover darkening */}
          {isComplete && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none z-20" />
          )}

          {/* Download button on hover */}
          {isComplete && (
            <button
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 backdrop-blur-sm p-2 rounded-full z-30"
              aria-label="Download image"
            >
              <Download className="h-4 w-4 text-white" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
