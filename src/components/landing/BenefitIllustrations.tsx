/**
 * Benefit Section SVG Illustrations
 *
 * Lightweight, animated SVG graphics for the Benefits section.
 * Each illustration is optimized for performance (<5KB) and uses
 * GPU-accelerated animations that pause when off-screen.
 *
 * Performance optimizations:
 * - will-change CSS property for GPU acceleration
 * - IntersectionObserver to pause when not visible
 * - Reduced animation complexity
 */

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Streaming Code Generation Illustration
 * Represents real-time code streaming with animated cursor and code lines
 */
export const StreamingCodeIllustration = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-gradient-to-br from-card via-muted/50 to-card rounded-lg border border-border/50 overflow-hidden p-8 flex items-center justify-center"
    >
      <svg
        viewBox="0 0 400 300"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ willChange: isVisible ? 'transform' : 'auto' }}
      >
        {/* Code editor window */}
        <rect
          x="20"
          y="30"
          width="360"
          height="240"
          rx="8"
          className="fill-muted/30 stroke-primary/20"
          strokeWidth="2"
        />

        {/* Window controls */}
        <circle cx="40" cy="50" r="4" className="fill-red-500/60" />
        <circle cx="55" cy="50" r="4" className="fill-yellow-500/60" />
        <circle cx="70" cy="50" r="4" className="fill-green-500/60" />

        {/* Code lines with stagger animation - only animate when visible */}
        {[0, 1, 2, 3, 4].map((index) => (
          <motion.g
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
            transition={{
              delay: index * 0.2,
              duration: 0.4,
              repeat: isVisible ? Infinity : 0,
              repeatDelay: 2,
            }}
          >
            {/* Line of code */}
            <rect
              x="40"
              y={80 + index * 35}
              width={Math.random() * 200 + 100}
              height="8"
              rx="4"
              className="fill-primary/40"
            />
            {/* Syntax highlight accent */}
            <rect
              x={150 + Math.random() * 50}
              y={80 + index * 35}
              width={Math.random() * 60 + 40}
              height="8"
              rx="4"
              className="fill-cyan-400/60"
            />
          </motion.g>
        ))}

        {/* Blinking cursor - only animate when visible */}
        <motion.rect
          x="160"
          y="255"
          width="3"
          height="12"
          className="fill-primary"
          initial={{ opacity: 1 }}
          animate={isVisible ? { opacity: [1, 0, 1] } : { opacity: 1 }}
          transition={{
            duration: 1,
            repeat: isVisible ? Infinity : 0,
            ease: "easeInOut",
          }}
        />

        {/* Streaming particles - only animate when visible */}
        {[0, 1, 2].map((index) => (
          <motion.circle
            key={`particle-${index}`}
            cx="350"
            cy="150"
            r="3"
            className="fill-cyan-400/80"
            initial={{ x: 0, y: 0, opacity: 0 }}
            animate={isVisible ? {
              x: [-30, -60, -90],
              y: [0, -20, -40],
              opacity: [0, 1, 0],
            } : { x: 0, y: 0, opacity: 0 }}
            transition={{
              delay: index * 0.4,
              duration: 1.2,
              repeat: isVisible ? Infinity : 0,
              repeatDelay: 0.6,
            }}
          />
        ))}
      </svg>
    </div>
  );
};

/**
 * Interactive Artifacts Illustration
 * Shows component rendering with live preview
 */
export const InteractiveArtifactsIllustration = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-gradient-to-br from-card via-muted/50 to-card rounded-lg border border-border/50 overflow-hidden p-8 flex items-center justify-center"
    >
      <svg
        viewBox="0 0 400 300"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ willChange: isVisible ? 'transform' : 'auto' }}
      >
        {/* Split view - Code and Preview */}
        <defs>
          <linearGradient id="artifactGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(147, 51, 234)" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Code panel */}
        <rect
          x="20"
          y="40"
          width="160"
          height="220"
          rx="8"
          className="fill-muted/30 stroke-primary/30"
          strokeWidth="2"
        />

        {/* Code brackets */}
        <text x="40" y="80" className="fill-primary/60 text-2xl font-mono">&lt;/&gt;</text>

        {/* Code lines */}
        {[0, 1, 2, 3].map((index) => (
          <rect
            key={index}
            x="40"
            y={100 + index * 25}
            width={100 - index * 10}
            height="6"
            rx="3"
            className="fill-primary/40"
          />
        ))}

        {/* Arrow indicating transformation */}
        <motion.g
          animate={isVisible ? { x: [0, 5, 0] } : { x: 0 }}
          transition={{ duration: 1.5, repeat: isVisible ? Infinity : 0 }}
        >
          <path
            d="M 190 150 L 210 150 L 205 145 M 210 150 L 205 155"
            className="stroke-cyan-400 stroke-2 fill-none"
          />
        </motion.g>

        {/* Preview panel */}
        <rect
          x="220"
          y="40"
          width="160"
          height="220"
          rx="8"
          fill="url(#artifactGradient)"
          className="stroke-purple-500/30"
          strokeWidth="2"
        />

        {/* Interactive UI elements in preview */}
        <motion.g
          initial={{ scale: 0.8, opacity: 0 }}
          animate={isVisible ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
          transition={{
            duration: 0.6,
            repeat: isVisible ? Infinity : 0,
            repeatDelay: 2,
          }}
        >
          {/* Button */}
          <rect
            x="245"
            y="80"
            width="110"
            height="35"
            rx="18"
            className="fill-primary/60 stroke-primary"
            strokeWidth="2"
          />

          {/* Card */}
          <rect
            x="245"
            y="130"
            width="110"
            height="70"
            rx="8"
            className="fill-muted/50 stroke-primary/40"
            strokeWidth="2"
          />

          {/* Chart bars */}
          {[0, 1, 2].map((index) => (
            <motion.rect
              key={index}
              x={255 + index * 30}
              y={180 - index * 15}
              width="20"
              height={20 + index * 15}
              rx="4"
              className="fill-cyan-400/60"
              initial={{ scaleY: 0 }}
              animate={isVisible ? { scaleY: 1 } : { scaleY: 0 }}
              transition={{
                delay: index * 0.2 + 0.5,
                duration: 0.4,
                repeat: isVisible ? Infinity : 0,
                repeatDelay: 2,
              }}
              style={{ transformOrigin: "bottom" }}
            />
          ))}
        </motion.g>

        {/* Sparkles */}
        {[0, 1].map((index) => (
          <motion.circle
            key={`sparkle-${index}`}
            cx={250 + index * 80}
            cy={60 + index * 20}
            r="2"
            className="fill-yellow-400"
            initial={{ scale: 0, opacity: 0 }}
            animate={isVisible ? {
              scale: [0, 1.5, 0],
              opacity: [0, 1, 0],
            } : { scale: 0, opacity: 0 }}
            transition={{
              delay: index * 0.5,
              duration: 1,
              repeat: isVisible ? Infinity : 0,
              repeatDelay: 1.5,
            }}
          />
        ))}
      </svg>
    </div>
  );
};

/**
 * Security Illustration
 * Shows shield with lock and encryption symbols
 */
export const SecurityIllustration = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-gradient-to-br from-card via-muted/50 to-card rounded-lg border border-border/50 overflow-hidden p-8 flex items-center justify-center"
    >
      <svg
        viewBox="0 0 400 300"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ willChange: isVisible ? 'transform' : 'auto' }}
      >
        <defs>
          <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Shield shape */}
        <motion.path
          d="M 200 50 L 280 90 L 280 170 Q 280 220 200 250 Q 120 220 120 170 L 120 90 Z"
          fill="url(#shieldGradient)"
          className="stroke-green-500/60"
          strokeWidth="3"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={isVisible ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
        />

        {/* Lock icon */}
        <g className="fill-green-500/80">
          {/* Lock body */}
          <rect
            x="180"
            y="150"
            width="40"
            height="45"
            rx="6"
            className="fill-green-600/80"
          />

          {/* Lock shackle */}
          <path
            d="M 185 150 L 185 135 Q 185 120 200 120 Q 215 120 215 135 L 215 150"
            className="stroke-green-600/80 fill-none"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Keyhole */}
          <circle cx="200" cy="170" r="5" className="fill-green-400/60" />
          <rect x="197" y="170" width="6" height="12" rx="3" className="fill-green-400/60" />
        </g>

        {/* Encryption particles orbiting shield */}
        {[0, 1, 2, 3].map((index) => {
          const angle = (index / 4) * Math.PI * 2;
          return (
            <motion.g
              key={`orbit-${index}`}
              animate={isVisible ? {
                rotate: 360,
              } : { rotate: 0 }}
              transition={{
                duration: 8,
                repeat: isVisible ? Infinity : 0,
                ease: "linear",
                delay: index * 0.5,
              }}
              style={{
                transformOrigin: "200px 150px",
              }}
            >
              <circle
                cx={200 + Math.cos(angle) * 80}
                cy={150 + Math.sin(angle) * 80}
                r="4"
                className="fill-cyan-400/80"
              />
            </motion.g>
          );
        })}

        {/* Binary code flowing */}
        {[0, 1, 2].map((index) => (
          <motion.text
            key={`binary-${index}`}
            x="140"
            y={80 + index * 15}
            className="fill-primary/30 text-xs font-mono"
            initial={{ x: 140, opacity: 0 }}
            animate={isVisible ? { x: 100, opacity: [0, 0.6, 0] } : { x: 140, opacity: 0 }}
            transition={{
              delay: index * 0.3,
              duration: 2,
              repeat: isVisible ? Infinity : 0,
              repeatDelay: 1,
            }}
          >
            {index % 2 === 0 ? "1010" : "0101"}
          </motion.text>
        ))}

        {/* Checkmark pulse animation */}
        <motion.g
          initial={{ scale: 1, opacity: 0.8 }}
          animate={isVisible ? {
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          } : { scale: 1, opacity: 0.8 }}
          transition={{
            duration: 2,
            repeat: isVisible ? Infinity : 0,
          }}
        >
          <path
            d="M 190 165 L 197 175 L 213 155"
            className="stroke-white fill-none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
      </svg>
    </div>
  );
};
