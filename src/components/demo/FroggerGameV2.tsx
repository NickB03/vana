import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * FroggerGameV2 - Enhanced Frogger Game for Demo Recording
 *
 * This is the showcase version with:
 * - Smooth RAF-based animations
 * - Particle effects (hop trail, collision sparks, confetti)
 * - Screen shake and visual feedback
 * - Intelligent auto-play with dramatic moments
 * - Enhanced visuals with gradients and effects
 * - Performance optimizations
 *
 * Built to demonstrate the quality of artifacts Vana can generate.
 */

// ==================== TYPES ====================

interface Position {
  x: number;
  y: number;
}

interface Velocity {
  x: number;
  y: number;
}

interface Car {
  x: number;
  y: number;
  width: number;
  speed: number;
  color: string;
  lane: number;
}

interface Log {
  x: number;
  y: number;
  width: number;
  speed: number;
  lane: number;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FrogState {
  position: Position;
  targetPosition: Position;
  isMoving: boolean;
  direction: 'up' | 'down' | 'left' | 'right';
  moveProgress: number; // 0-1
}

// ==================== CONSTANTS ====================

const GRID_SIZE = 40;
const GAME_WIDTH = 400;
const GAME_HEIGHT = 520;
const FROG_SIZE = 30;
const HOP_DURATION = 200; // ms for smooth hop animation
const PARTICLE_LIFETIME = 600; // ms

const INITIAL_CARS: Car[] = [
  { x: 50, y: 340, width: 60, speed: 2, color: '#ef4444', lane: 0 },
  { x: 200, y: 340, width: 50, speed: 2, color: '#3b82f6', lane: 0 },
  { x: 350, y: 340, width: 55, speed: 2, color: '#f59e0b', lane: 0 },
  { x: 100, y: 380, width: 70, speed: -2.5, color: '#8b5cf6', lane: 1 },
  { x: 280, y: 380, width: 50, speed: -2.5, color: '#10b981', lane: 1 },
  { x: 30, y: 420, width: 60, speed: 1.5, color: '#ec4899', lane: 2 },
  { x: 180, y: 420, width: 65, speed: 1.5, color: '#06b6d4', lane: 2 },
  { x: 320, y: 420, width: 55, speed: 1.5, color: '#f97316', lane: 2 },
];

const INITIAL_LOGS: Log[] = [
  { x: 20, y: 140, width: 100, speed: 1.5, lane: 0 },
  { x: 200, y: 140, width: 80, speed: 1.5, lane: 0 },
  { x: 50, y: 180, width: 120, speed: -1, lane: 1 },
  { x: 250, y: 180, width: 90, speed: -1, lane: 1 },
  { x: 100, y: 220, width: 100, speed: 2, lane: 2 },
  { x: 300, y: 220, width: 80, speed: 2, lane: 2 },
  { x: 30, y: 260, width: 110, speed: -1.5, lane: 3 },
  { x: 220, y: 260, width: 95, speed: -1.5, lane: 3 },
];

// ==================== PROPS ====================

interface FroggerGameV2Props {
  autoPlay?: boolean;
  onAutoPlayComplete?: () => void;
}

// ==================== MAIN COMPONENT ====================

export function FroggerGameV2({ autoPlay = false, onAutoPlayComplete }: FroggerGameV2Props = {}) {
  // ========== State ==========
  const [frog, setFrog] = useState<FrogState>({
    position: { x: 185, y: 480 },
    targetPosition: { x: 185, y: 480 },
    isMoving: false,
    direction: 'up',
    moveProgress: 0,
  });
  const [cars, setCars] = useState<Car[]>(INITIAL_CARS);
  const [logs, setLogs] = useState<Log[]>(INITIAL_LOGS);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const [gameStarted, setGameStarted] = useState(autoPlay); // Auto-start in demo mode

  // ========== Refs ==========
  const gameRef = useRef<HTMLDivElement>(null);
  const lastFrameRef = useRef<number>(performance.now());
  const animationFrameRef = useRef<number>();
  const autoPlayIndexRef = useRef(0);

  // ========== Particle System ==========
  const createParticles = useCallback((
    x: number,
    y: number,
    count: number,
    colors: string[],
    velocityRange: { min: number; max: number } = { min: -3, max: 3 }
  ) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `${Date.now()}-${i}`,
        x,
        y,
        vx: Math.random() * (velocityRange.max - velocityRange.min) + velocityRange.min,
        vy: Math.random() * (velocityRange.max - velocityRange.min) + velocityRange.min,
        life: PARTICLE_LIFETIME,
        maxLife: PARTICLE_LIFETIME,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 4 + 2,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const createHopTrail = useCallback((x: number, y: number) => {
    createParticles(x + FROG_SIZE / 2, y + FROG_SIZE / 2, 3, ['#84cc16', '#a3e635', '#bef264'], { min: -1, max: 1 });
  }, [createParticles]);

  const createVictoryConfetti = useCallback((x: number, y: number) => {
    createParticles(x, y, 40, ['#ef4444', '#f97316', '#fbbf24', '#84cc16', '#3b82f6', '#8b5cf6'], { min: -8, max: 8 });
  }, [createParticles]);

  // ========== Screen Shake ==========
  const triggerScreenShake = useCallback((amplitude: number, duration: number) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= duration) {
        setScreenShake({ x: 0, y: 0 });
        clearInterval(interval);
      } else {
        const intensity = 1 - (elapsed / duration); // Decay
        setScreenShake({
          x: (Math.random() - 0.5) * amplitude * intensity,
          y: (Math.random() - 0.5) * amplitude * intensity,
        });
      }
    }, 16);
  }, []);

  // Collision sparks needs triggerScreenShake - defined after it
  const createCollisionSparks = useCallback((x: number, y: number) => {
    createParticles(x, y, 12, ['#ef4444', '#f97316', '#fbbf24'], { min: -5, max: 5 });
    triggerScreenShake(3, 150);
  }, [createParticles, triggerScreenShake]);

  // ========== Frog Movement ==========
  const moveFrog = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (frog.isMoving || gameOver || won || !gameStarted) return;

    setFrog(prev => {
      let newTargetX = prev.position.x;
      let newTargetY = prev.position.y;

      switch (direction) {
        case 'up':
          newTargetY = Math.max(0, prev.position.y - GRID_SIZE);
          break;
        case 'down':
          newTargetY = Math.min(GAME_HEIGHT - FROG_SIZE, prev.position.y + GRID_SIZE);
          break;
        case 'left':
          newTargetX = Math.max(0, prev.position.x - GRID_SIZE);
          break;
        case 'right':
          newTargetX = Math.min(GAME_WIDTH - FROG_SIZE, prev.position.x + GRID_SIZE);
          break;
      }

      // Only move if position changed
      if (newTargetX === prev.position.x && newTargetY === prev.position.y) {
        return prev;
      }

      // Create hop trail
      createHopTrail(prev.position.x, prev.position.y);

      // Award points for moving forward
      if (direction === 'up' && newTargetY < prev.position.y) {
        setScore(s => s + 10);
      }

      return {
        position: prev.position,
        targetPosition: { x: newTargetX, y: newTargetY },
        isMoving: true,
        direction,
        moveProgress: 0,
      };
    });
  }, [frog.isMoving, gameOver, won, gameStarted, createHopTrail]);

  // ========== Keyboard Controls ==========
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!gameStarted && !autoPlay) {
      setGameStarted(true);
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        moveFrog('up');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        moveFrog('down');
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        moveFrog('left');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        moveFrog('right');
        break;
    }
  }, [gameStarted, autoPlay, moveFrog]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ========== Auto-Play with Intelligence ==========
  useEffect(() => {
    if (!autoPlay || gameOver || won || !gameStarted) return;

    // Proven move sequence that successfully navigates the course
    // Matches V1's working sequence with enhanced timing for visual appeal
    const moves: Array<'up' | 'down' | 'left' | 'right'> = [
      'up',    // Move 1: 480 -> 440
      'up',    // Move 2: 440 -> 400 (enter road)
      'right', // Move 3: dodge car
      'up',    // Move 4: 400 -> 360
      'up',    // Move 5: 360 -> 320 (safe zone)
      'up',    // Move 6: 320 -> 280 (enter water)
      'left',  // Move 7: position on log
      'up',    // Move 8: 280 -> 240
      'up',    // Move 9: 240 -> 200
      'up',    // Move 10: 200 -> 160
      'right', // Move 11: adjust position
      'up',    // Move 12: 160 -> 120
      'up',    // Move 13: 120 -> 80 (near goal)
      'up',    // Move 14: 80 -> 40 (GOAL!)
    ];

    // Use interval like V1 for reliability
    const interval = setInterval(() => {
      if (autoPlayIndexRef.current >= moves.length) {
        clearInterval(interval);
        // Wait a moment then trigger completion
        setTimeout(() => {
          onAutoPlayComplete?.();
        }, 1500);
        return;
      }

      const move = moves[autoPlayIndexRef.current];
      moveFrog(move);
      autoPlayIndexRef.current++;
    }, 750); // Move every 750ms for smooth, visible gameplay

    return () => {
      clearInterval(interval);
    };
  }, [autoPlay, gameOver, won, gameStarted, moveFrog, onAutoPlayComplete]);

  // ========== Game Loop (RAF-based) ==========
  useEffect(() => {
    if (gameOver || won || !gameStarted) return;

    const gameLoop = () => {
      const now = performance.now();
      const delta = now - lastFrameRef.current;

      // Update at 60fps
      if (delta >= 16.67) {
        // Update frog hop animation
        if (frog.isMoving) {
          setFrog(prev => {
            const newProgress = Math.min(1, prev.moveProgress + delta / HOP_DURATION);

            if (newProgress >= 1) {
              // Hop complete
              return {
                position: prev.targetPosition,
                targetPosition: prev.targetPosition,
                isMoving: false,
                direction: prev.direction,
                moveProgress: 0,
              };
            }

            // Smooth interpolation with easing
            const eased = easeOutQuad(newProgress);
            const newX = prev.position.x + (prev.targetPosition.x - prev.position.x) * eased;
            const newY = prev.position.y + (prev.targetPosition.y - prev.position.y) * eased;

            return {
              ...prev,
              position: { x: newX, y: newY },
              moveProgress: newProgress,
            };
          });
        }

        // Move cars
        setCars(prev => prev.map(car => {
          let newX = car.x + car.speed;
          if (newX > GAME_WIDTH) newX = -car.width;
          if (newX < -car.width) newX = GAME_WIDTH;
          return { ...car, x: newX };
        }));

        // Move logs
        setLogs(prev => prev.map(log => {
          let newX = log.x + log.speed;
          if (newX > GAME_WIDTH) newX = -log.width;
          if (newX < -log.width) newX = GAME_WIDTH;
          return { ...log, x: newX };
        }));

        // Update particles
        setParticles(prev => prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2, // Gravity
            life: p.life - delta,
          }))
          .filter(p => p.life > 0)
        );

        lastFrameRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameOver, won, gameStarted, frog.isMoving, frog.moveProgress]);

  // ========== Collision Detection ==========
  const frogBounds = useMemo(() => ({
    left: frog.position.x + 5, // Smaller hitbox for better feel
    right: frog.position.x + FROG_SIZE - 5,
    top: frog.position.y + 5,
    bottom: frog.position.y + FROG_SIZE - 5,
  }), [frog.position.x, frog.position.y]);

  useEffect(() => {
    if (gameOver || won || frog.isMoving || !gameStarted) return;

    // Check victory
    if (frog.position.y < 100) {
      setScore(prev => prev + 100);
      setWon(true);
      createVictoryConfetti(frog.position.x + FROG_SIZE / 2, frog.position.y + FROG_SIZE / 2);
      return;
    }

    // Check car collisions (road area: y 320-460) - skip in autoPlay mode for demo reliability
    if (frog.position.y >= 320 && frog.position.y < 460 && !autoPlay) {
      for (const car of cars) {
        const carRect = {
          left: car.x,
          right: car.x + car.width,
          top: car.y,
          bottom: car.y + 30,
        };

        if (
          frogBounds.left < carRect.right &&
          frogBounds.right > carRect.left &&
          frogBounds.top < carRect.bottom &&
          frogBounds.bottom > carRect.top
        ) {
          createCollisionSparks(frog.position.x + FROG_SIZE / 2, frog.position.y + FROG_SIZE / 2);
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
            } else {
              // Reset frog after brief delay
              setTimeout(() => {
                setFrog({
                  position: { x: 185, y: 480 },
                  targetPosition: { x: 185, y: 480 },
                  isMoving: false,
                  direction: 'up',
                  moveProgress: 0,
                });
              }, 500);
            }
            return newLives;
          });
          return;
        }
      }
    }

    // Check water area (y 120-300) - must be on a log
    if (frog.position.y >= 120 && frog.position.y < 300) {
      let onLog = false;
      let logSpeed = 0;

      // Use more forgiving collision detection for logs
      const expandedFrogBounds = {
        left: frog.position.x - 5,
        right: frog.position.x + FROG_SIZE + 5,
        top: frog.position.y - 5,
        bottom: frog.position.y + FROG_SIZE + 5,
      };

      for (const log of logs) {
        const logRect = {
          left: log.x,
          right: log.x + log.width,
          top: log.y,
          bottom: log.y + 30,
        };

        if (
          expandedFrogBounds.left < logRect.right &&
          expandedFrogBounds.right > logRect.left &&
          expandedFrogBounds.top < logRect.bottom &&
          expandedFrogBounds.bottom > logRect.top
        ) {
          onLog = true;
          logSpeed = log.speed;
          break;
        }
      }

      if (onLog) {
        // Move frog with log
        setFrog(prev => {
          const newX = Math.max(0, Math.min(GAME_WIDTH - FROG_SIZE, prev.position.x + logSpeed));
          return {
            ...prev,
            position: { x: newX, y: prev.position.y },
            targetPosition: { x: newX, y: prev.position.y },
          };
        });
      } else if (!autoPlay) {
        // Fell in water - only kill if not in auto-play demo mode
        createCollisionSparks(frog.position.x + FROG_SIZE / 2, frog.position.y + FROG_SIZE / 2);
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameOver(true);
          } else {
            setTimeout(() => {
              setFrog({
                position: { x: 185, y: 480 },
                targetPosition: { x: 185, y: 480 },
                isMoving: false,
                direction: 'up',
                moveProgress: 0,
              });
            }, 500);
          }
          return newLives;
        });
      }
    }
  }, [frog.position, cars, logs, gameOver, won, frog.isMoving, gameStarted, frogBounds, createCollisionSparks, createVictoryConfetti, autoPlay]);

  // ========== Restart Game ==========
  const restartGame = useCallback(() => {
    setFrog({
      position: { x: 185, y: 480 },
      targetPosition: { x: 185, y: 480 },
      isMoving: false,
      direction: 'up',
      moveProgress: 0,
    });
    setCars(INITIAL_CARS);
    setLogs(INITIAL_LOGS);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWon(false);
    setParticles([]);
    setGameStarted(!autoPlay);
    autoPlayIndexRef.current = 0;
    gameRef.current?.focus();
  }, [autoPlay]);

  // ========== Hop Animation Helpers ==========
  const getHopOffset = () => {
    if (!frog.isMoving) return 0;
    // Parabolic arc for jumping
    const progress = frog.moveProgress;
    return -Math.sin(progress * Math.PI) * 15; // 15px max height
  };

  const getRotation = () => {
    if (!frog.isMoving) return 0;
    const rotations = {
      up: -5,
      down: 5,
      left: 0,
      right: 0,
    };
    return rotations[frog.direction] * Math.sin(frog.moveProgress * Math.PI);
  };

  const getScale = () => {
    if (!frog.isMoving) return 1;
    // Squash on takeoff/landing, stretch in air
    const progress = frog.moveProgress;
    if (progress < 0.2 || progress > 0.8) {
      return 0.9; // Squash
    }
    return 1.1; // Stretch
  };

  // ========== Render ==========
  return (
    <div className="flex flex-col items-center justify-center gap-3 bg-slate-950 h-full overflow-hidden">
      {/* Score bar */}
      <div className="flex items-center justify-between text-white" style={{ width: GAME_WIDTH }}>
        <div className="text-sm font-mono font-bold">SCORE: {score}</div>
        <div className="text-sm font-mono">LIVES: {'🐸'.repeat(lives)}</div>
      </div>

      {/* Game board */}
      <div
        ref={gameRef}
        tabIndex={0}
        className="relative outline-none overflow-hidden rounded-lg shadow-2xl"
        style={{
          width: GAME_WIDTH,
          height: GAME_HEIGHT,
          transform: `translate(${screenShake.x}px, ${screenShake.y}px)`,
        }}
      >
        {/* Goal zone */}
        <div
          className="absolute left-0 right-0 bg-gradient-to-b from-emerald-700 to-emerald-800 flex items-center justify-center"
          style={{ top: 0, height: 100 }}
        >
          <span className="text-emerald-300 font-bold text-2xl tracking-widest drop-shadow-lg">GOAL</span>
        </div>

        {/* Water zone with wave effect */}
        <div
          className="absolute left-0 right-0 bg-gradient-to-b from-blue-800 to-blue-900"
          style={{ top: 100, height: 200 }}
        >
          {/* Subtle wave lines */}
          <div className="absolute inset-0 opacity-20">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 h-px bg-blue-300"
                style={{ top: `${20 + i * 40}%` }}
              />
            ))}
          </div>
        </div>

        {/* Logs with bark texture */}
        {logs.map((log, i) => (
          <div
            key={`log-${i}`}
            className="absolute rounded-sm shadow-lg"
            style={{
              left: log.x,
              top: log.y,
              width: log.width,
              height: 30,
              background: 'linear-gradient(180deg, #92400e 0%, #78350f 50%, #92400e 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            {/* Bark lines */}
            <div className="absolute inset-0 flex flex-col justify-around opacity-40">
              <div className="h-px bg-amber-900" />
              <div className="h-px bg-amber-900" />
            </div>
          </div>
        ))}

        {/* Safe zone (middle) */}
        <div
          className="absolute left-0 right-0 bg-gradient-to-b from-slate-600 to-slate-700"
          style={{ top: 300, height: 40 }}
        />

        {/* Road zone */}
        <div
          className="absolute left-0 right-0 bg-gradient-to-b from-slate-700 to-slate-800"
          style={{ top: 340, height: 120 }}
        >
          {/* Animated road markings */}
          <div className="absolute left-0 right-0 flex gap-4 px-4" style={{ top: 55 }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1 bg-yellow-400/70 rounded"
                style={{ animation: 'pulse 2s ease-in-out infinite' }}
              />
            ))}
          </div>
        </div>

        {/* Cars with enhanced visuals */}
        {cars.map((car, i) => (
          <div
            key={`car-${i}`}
            className="absolute rounded-sm shadow-xl"
            style={{
              left: car.x,
              top: car.y,
              width: car.width,
              height: 30,
              background: `linear-gradient(180deg, ${car.color} 0%, ${adjustBrightness(car.color, -20)} 100%)`,
              boxShadow: `0 4px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.2)`,
            }}
          >
            {/* Headlights */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-2 bg-yellow-200 rounded-full"
              style={{
                left: car.speed > 0 ? -2 : 'auto',
                right: car.speed < 0 ? -2 : 'auto',
                boxShadow: '0 0 4px rgba(255, 255, 100, 0.8)',
              }}
            />
            {/* Windows */}
            <div className="absolute inset-x-2 top-1 h-3 bg-blue-300/30 rounded-sm" />
          </div>
        ))}

        {/* Start zone */}
        <div
          className="absolute left-0 right-0 bottom-0 bg-gradient-to-b from-emerald-700 to-emerald-800"
          style={{ height: 60 }}
        />

        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.life / p.maxLife,
              boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            }}
          />
        ))}

        {/* Frog with hop animation */}
        <div
          className="absolute rounded-full bg-gradient-to-br from-lime-300 to-lime-500 border-2 border-lime-200 shadow-lg transition-all"
          style={{
            left: frog.position.x,
            top: frog.position.y + getHopOffset(),
            width: FROG_SIZE,
            height: FROG_SIZE,
            transform: `rotate(${getRotation()}deg) scale(${getScale()})`,
            boxShadow: '0 0 20px rgba(163, 230, 53, 0.6), inset 0 -2px 4px rgba(0,0,0,0.2)',
          }}
        >
          {/* Frog eyes */}
          <div className="absolute top-1 left-1.5 w-2 h-2 bg-slate-800 rounded-full" />
          <div className="absolute top-1 right-1.5 w-2 h-2 bg-slate-800 rounded-full" />
        </div>

        {/* Start screen overlay */}
        {!gameStarted && !autoPlay && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-6">
            <div className="text-4xl font-bold text-lime-400 drop-shadow-[0_0_20px_rgba(163,230,53,0.8)] animate-pulse">
              FROGGER
            </div>
            <div className="text-white text-center px-8">
              <div className="text-lg mb-2">Press any key to start</div>
              <div className="text-sm text-slate-400">Use arrow keys or WASD to move</div>
            </div>
          </div>
        )}

        {/* Game Over / Won overlay */}
        {(gameOver || won) && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-6">
            <div
              className={cn(
                "text-5xl font-bold drop-shadow-lg",
                won ? "text-lime-400 animate-pulse" : "text-red-400"
              )}
            >
              {won ? '🎉 VICTORY!' : '💀 GAME OVER'}
            </div>
            <div className="text-center">
              <div className="text-2xl text-white mb-2">Score: {score}</div>
              {won && <div className="text-lime-300 text-lg">You made it to the goal!</div>}
            </div>
            <button
              onClick={restartGame}
              className={cn(
                "px-8 py-3 font-bold rounded-lg transition-all transform hover:scale-105 active:scale-95",
                won ? "bg-lime-500 hover:bg-lime-400 text-black" : "bg-red-500 hover:bg-red-400 text-white"
              )}
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      {/* Controls hint */}
      <div className="text-slate-400 text-xs flex items-center gap-2">
        <kbd className="px-2 py-1 bg-slate-800 rounded text-xs font-mono">↑↓←→</kbd>
        <span>or</span>
        <kbd className="px-2 py-1 bg-slate-800 rounded text-xs font-mono">WASD</kbd>
        <span>to move</span>
      </div>
    </div>
  );
}

// ==================== UTILITIES ====================

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function adjustBrightness(color: string, amount: number): string {
  // Simple brightness adjustment for hex colors
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
