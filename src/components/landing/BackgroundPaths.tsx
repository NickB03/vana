import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTheme } from "@/components/ThemeProvider";

/**
 * Animated SVG background paths that flow across the viewport
 *
 * Features:
 * - 18 curved bezier paths with independent animations
 * - Theme-aware gradient strokes (blue/purple hues)
 * - GPU-accelerated transforms
 * - Reduced motion support
 * - Performance optimized with memo and lazy rendering
 */

interface PathConfig {
  d: string;
  duration: number;
  delay: number;
  opacity: [number, number];
}

const BackgroundPaths = () => {
  const { themeMode } = useTheme();
  const [isInView, setIsInView] = useState(false);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lazy render - only animate when in viewport
  useEffect(() => {
    setIsInView(true);
  }, []);

  // Don't render animations if reduced motion is preferred
  if (prefersReducedMotion) {
    return null;
  }

  // Generate curved paths across viewport
  const generatePaths = (): PathConfig[] => {
    const paths: PathConfig[] = [];
    const numPaths = 18; // Reduced from 36 for better performance

    for (let i = 0; i < numPaths; i++) {
      // Randomize start/end points and control points for bezier curves
      const startX = Math.random() * 100;
      const startY = Math.random() * 100;
      const endX = Math.random() * 100;
      const endY = Math.random() * 100;

      // Control points create the curve
      const cp1X = Math.random() * 100;
      const cp1Y = Math.random() * 100;
      const cp2X = Math.random() * 100;
      const cp2Y = Math.random() * 100;

      // SVG path using cubic bezier (C command)
      const d = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

      paths.push({
        d,
        duration: 25 + Math.random() * 10, // 25-35 seconds
        delay: Math.random() * 5, // 0-5s stagger
        opacity: [0.2, 0.4], // Subtle opacity cycle
      });
    }

    return paths;
  };

  // Memoize paths to prevent regeneration on re-renders
  const [paths] = useState(() => generatePaths());

  // Theme-aware gradient colors
  const gradientColors = themeMode === "dark"
    ? ["#3b82f6", "#8b5cf6", "#ec4899"] // Blue -> Purple -> Pink
    : ["#60a5fa", "#a78bfa", "#f472b6"]; // Lighter variants for light mode

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        zIndex: 1,
        willChange: 'transform',
        transform: 'translateZ(0)', // Force GPU layer
      }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Define gradients for path strokes */}
        <defs>
          <linearGradient id="pathGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={gradientColors[0]} stopOpacity="0.6" />
            <stop offset="50%" stopColor={gradientColors[1]} stopOpacity="0.4" />
            <stop offset="100%" stopColor={gradientColors[2]} stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="pathGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={gradientColors[2]} stopOpacity="0.6" />
            <stop offset="50%" stopColor={gradientColors[1]} stopOpacity="0.4" />
            <stop offset="100%" stopColor={gradientColors[0]} stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Render animated paths */}
        {isInView && paths.map((path, index) => (
          <motion.path
            key={index}
            d={path.d}
            fill="none"
            stroke={index % 2 === 0 ? "url(#pathGradient1)" : "url(#pathGradient2)"}
            strokeWidth="0.15"
            strokeLinecap="round"
            initial={{
              pathLength: 0.3,
              opacity: path.opacity[0],
              pathOffset: 0,
            }}
            animate={{
              pathLength: [0.3, 1, 0.3],
              opacity: path.opacity,
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: path.duration,
              delay: path.delay,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              willChange: 'opacity, stroke-dashoffset',
              transform: 'translateZ(0)',
            }}
          />
        ))}
      </svg>
    </div>
  );
};

export default BackgroundPaths;
