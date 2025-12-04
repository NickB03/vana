import { useState, useEffect, useRef } from 'react';

interface FroggerDemoVideoProps {
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onVideoEnd?: () => void;
}

/**
 * FroggerDemoVideo - Video player component for Hero demo
 *
 * Plays a combined MP4 video featuring the Frogger game (sped up 10%)
 * and dashboard demo with a crossfade transition, looping continuously
 * inside a browser chrome frame for landing page showcase.
 */
export function FroggerDemoVideo({ 
  autoPlay = true, 
  muted = true, 
  loop = true,
  onVideoEnd 
}: FroggerDemoVideoProps = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      setIsLoaded(true);
      if (autoPlay) {
        video.play().catch(err => {
          console.log('Auto-play was prevented:', err);
        });
      }
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
  }, [autoPlay, onVideoEnd]);

  return (
    <div className="flex items-center justify-center bg-neutral-900 h-full overflow-hidden">
      {/* Video container fills entire space */}
      <div className="relative w-full h-full rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src="/Demos/hero-demo-combined.mp4"
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          playsInline
        >
          Your browser does not support the video tag.
        </video>

        {/* Loading indicator */}
        {!isLoaded && (
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
