import { useState, useEffect, useRef } from 'react';

interface FroggerDemoVideoProps {
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  poster?: string;
  onVideoEnd?: () => void;
}

/**
 * FroggerDemoVideo - Video player component for Hero demo
 *
 * Plays a combined MP4 video featuring the Frogger game (sped up 10%)
 * and dashboard demo with a crossfade transition, looping continuously
 * inside a browser chrome frame for landing page showcase.
 *
 * Features:
 * - Lazy loading with intersection observer
 * - Respects prefers-reduced-motion
 * - Poster image support
 * - Auto-pause when out of viewport
 */
export function FroggerDemoVideo({
  autoPlay = true,
  muted = true,
  loop = true,
  poster = '/Demos/hero-demo-poster.jpg',
  onVideoEnd
}: FroggerDemoVideoProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches && videoRef.current) {
        videoRef.current.pause();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Intersection observer for lazy loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);

        if (entry.isIntersecting && autoPlay && !prefersReducedMotion && videoRef.current) {
          videoRef.current.play().catch(err => {
            console.log('Auto-play was prevented:', err);
          });
        } else if (!entry.isIntersecting && videoRef.current) {
          videoRef.current.pause();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [autoPlay, prefersReducedMotion]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setIsLoaded(true);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onVideoEnd?.();
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onVideoEnd]);

  // If user prefers reduced motion, show static poster instead
  if (prefersReducedMotion) {
    return (
      <div ref={containerRef} className="flex items-center justify-center bg-neutral-900 h-full overflow-hidden">
        <img
          src={poster}
          alt="Vana demo preview"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to neutral background if poster fails to load
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex items-center justify-center bg-neutral-900 h-full overflow-hidden">
      {/* Video container fills entire space */}
      <div className="relative w-full h-full rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src="/Demos/hero-demo-combined.mp4"
          poster={poster}
          muted={muted}
          loop={loop}
          playsInline
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>

        {/* Loading indicator */}
        {!isLoaded && isInView && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
              <div className="text-slate-400 text-sm">Loading demo...</div>
            </div>
          </div>
        )}

        {/* Play/Pause overlay for user interaction */}
        {isLoaded && !isPlaying && !autoPlay && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
               onClick={() => videoRef.current?.play()}>
            <div className="text-white text-4xl">▶</div>
          </div>
        )}
      </div>
    </div>
  );
}
