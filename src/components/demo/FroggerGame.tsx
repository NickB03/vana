import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Pre-built Frogger Game for demo mode
 *
 * This is a fully functional Frogger game that can be instantly rendered
 * without any LLM calls or bundling. Used in the demo flow to showcase
 * artifact capabilities.
 */

interface Position {
  x: number;
  y: number;
}

interface Car {
  x: number;
  y: number;
  width: number;
  speed: number;
  color: string;
}

interface Log {
  x: number;
  y: number;
  width: number;
  speed: number;
}

const GRID_SIZE = 40;
const GAME_WIDTH = 400;
const GAME_HEIGHT = 520;
const FROG_SIZE = 30;

const INITIAL_CARS: Car[] = [
  { x: 50, y: 340, width: 60, speed: 2, color: '#ef4444' },
  { x: 200, y: 340, width: 50, speed: 2, color: '#3b82f6' },
  { x: 350, y: 340, width: 55, speed: 2, color: '#f59e0b' },
  { x: 100, y: 380, width: 70, speed: -2.5, color: '#8b5cf6' },
  { x: 280, y: 380, width: 50, speed: -2.5, color: '#10b981' },
  { x: 30, y: 420, width: 60, speed: 1.5, color: '#ec4899' },
  { x: 180, y: 420, width: 65, speed: 1.5, color: '#06b6d4' },
  { x: 320, y: 420, width: 55, speed: 1.5, color: '#f97316' },
];

const INITIAL_LOGS: Log[] = [
  { x: 20, y: 140, width: 100, speed: 1.5 },
  { x: 200, y: 140, width: 80, speed: 1.5 },
  { x: 50, y: 180, width: 120, speed: -1 },
  { x: 250, y: 180, width: 90, speed: -1 },
  { x: 100, y: 220, width: 100, speed: 2 },
  { x: 300, y: 220, width: 80, speed: 2 },
  { x: 30, y: 260, width: 110, speed: -1.5 },
  { x: 220, y: 260, width: 95, speed: -1.5 },
];

interface FroggerGameProps {
  /** Enable auto-play mode for demo purposes */
  autoPlay?: boolean;
  /** Callback when auto-play completes */
  onAutoPlayComplete?: () => void;
}

export function FroggerGame({ autoPlay = false, onAutoPlayComplete }: FroggerGameProps = {}) {
  const [frog, setFrog] = useState<Position>({ x: 185, y: 480 });
  const [cars, setCars] = useState<Car[]>(INITIAL_CARS);
  const [logs, setLogs] = useState<Log[]>(INITIAL_LOGS);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);
  const autoPlayIndexRef = useRef(0);

  // Reset frog position
  const resetFrog = useCallback(() => {
    setFrog({ x: 185, y: 480 });
  }, []);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameOver || won) return;

    setFrog(prev => {
      let newX = prev.x;
      let newY = prev.y;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          newY = Math.max(0, prev.y - GRID_SIZE);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          newY = Math.min(GAME_HEIGHT - FROG_SIZE, prev.y + GRID_SIZE);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          newX = Math.max(0, prev.x - GRID_SIZE);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          newX = Math.min(GAME_WIDTH - FROG_SIZE, prev.x + GRID_SIZE);
          break;
      }

      return { x: newX, y: newY };
    });
  }, [gameOver, won]);

  // Focus game on mount
  useEffect(() => {
    gameRef.current?.focus();
  }, []);

  // Add keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Auto-play mode: simulate a successful playthrough
  useEffect(() => {
    if (!autoPlay || gameOver || won) return;

    // Scripted moves: Up, Up, Right, Up, Up, Left, Up, Up (reach goal)
    const moves = [
      'ArrowUp',    // Move 1: 480 -> 440
      'ArrowUp',    // Move 2: 440 -> 400 (enter road)
      'ArrowRight', // Move 3: dodge car
      'ArrowUp',    // Move 4: 400 -> 360
      'ArrowUp',    // Move 5: 360 -> 320 (safe zone)
      'ArrowUp',    // Move 6: 320 -> 280 (enter water)
      'ArrowLeft',  // Move 7: position on log
      'ArrowUp',    // Move 8: 280 -> 240
      'ArrowUp',    // Move 9: 240 -> 200
      'ArrowUp',    // Move 10: 200 -> 160
      'ArrowRight', // Move 11: adjust position
      'ArrowUp',    // Move 12: 160 -> 120
      'ArrowUp',    // Move 13: 120 -> 80 (near goal)
      'ArrowUp',    // Move 14: 80 -> 40 (GOAL!)
    ];

    const interval = setInterval(() => {
      if (autoPlayIndexRef.current >= moves.length) {
        clearInterval(interval);
        // Trigger completion callback after reaching goal
        setTimeout(() => {
          onAutoPlayComplete?.();
        }, 1000);
        return;
      }

      const move = moves[autoPlayIndexRef.current];
      const event = new KeyboardEvent('keydown', { key: move });
      handleKeyDown(event);
      autoPlayIndexRef.current++;
    }, 750); // Move every 750ms for smoother, more visible gameplay

    return () => clearInterval(interval);
  }, [autoPlay, gameOver, won, handleKeyDown, onAutoPlayComplete]);

  // Game loop - move cars and logs
  useEffect(() => {
    if (gameOver || won) return;

    const interval = setInterval(() => {
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
    }, 50);

    return () => clearInterval(interval);
  }, [gameOver, won]);

  // Collision detection
  useEffect(() => {
    if (gameOver || won) return;

    const frogRect = {
      left: frog.x,
      right: frog.x + FROG_SIZE,
      top: frog.y,
      bottom: frog.y + FROG_SIZE,
    };

    // Check if reached goal
    if (frog.y < 100) {
      setScore(prev => prev + 100);
      setWon(true);
      return;
    }

    // Check car collision (road area: y 320-460)
    if (frog.y >= 320 && frog.y < 460) {
      for (const car of cars) {
        const carRect = {
          left: car.x,
          right: car.x + car.width,
          top: car.y,
          bottom: car.y + 30,
        };

        if (
          frogRect.left < carRect.right &&
          frogRect.right > carRect.left &&
          frogRect.top < carRect.bottom &&
          frogRect.bottom > carRect.top
        ) {
          // Hit by car
          setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) {
              setGameOver(true);
            } else {
              resetFrog();
            }
            return newLives;
          });
          return;
        }
      }
    }

    // Check water area (y 120-280) - must be on a log
    if (frog.y >= 120 && frog.y < 300) {
      let onLog = false;
      let logSpeed = 0;

      for (const log of logs) {
        const logRect = {
          left: log.x,
          right: log.x + log.width,
          top: log.y,
          bottom: log.y + 30,
        };

        if (
          frogRect.left < logRect.right &&
          frogRect.right > logRect.left &&
          frogRect.top < logRect.bottom &&
          frogRect.bottom > logRect.top
        ) {
          onLog = true;
          logSpeed = log.speed;
          break;
        }
      }

      if (onLog) {
        // Move frog with log
        setFrog(prev => ({
          ...prev,
          x: Math.max(0, Math.min(GAME_WIDTH - FROG_SIZE, prev.x + logSpeed)),
        }));
      } else {
        // Fell in water
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameOver(true);
          } else {
            resetFrog();
          }
          return newLives;
        });
      }
    }
  }, [frog, cars, logs, gameOver, won, resetFrog]);

  const restartGame = () => {
    setFrog({ x: 185, y: 480 });
    setCars(INITIAL_CARS);
    setLogs(INITIAL_LOGS);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setWon(false);
    gameRef.current?.focus();
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3 bg-slate-950 h-full overflow-hidden">
      <div className="flex items-center justify-between text-white" style={{ width: GAME_WIDTH }}>
        <div className="text-sm font-mono">SCORE: {score}</div>
        <div className="text-sm font-mono">LIVES: {'🐸'.repeat(lives)}</div>
      </div>

      <div
        ref={gameRef}
        tabIndex={0}
        className="relative outline-none overflow-hidden"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        {/* Goal zone */}
        <div
          className="absolute left-0 right-0 bg-emerald-700 flex items-center justify-center"
          style={{ top: 0, height: 100 }}
        >
          <span className="text-emerald-300 font-bold text-xl tracking-widest">GOAL</span>
        </div>

        {/* Water zone */}
        <div
          className="absolute left-0 right-0 bg-blue-900"
          style={{ top: 100, height: 200 }}
        />

        {/* Logs */}
        {logs.map((log, i) => (
          <div
            key={`log-${i}`}
            className="absolute bg-amber-700 rounded-sm shadow-md"
            style={{
              left: log.x,
              top: log.y,
              width: log.width,
              height: 30,
            }}
          />
        ))}

        {/* Safe zone (middle) */}
        <div
          className="absolute left-0 right-0 bg-slate-700"
          style={{ top: 300, height: 40 }}
        />

        {/* Road zone */}
        <div
          className="absolute left-0 right-0 bg-slate-800"
          style={{ top: 340, height: 120 }}
        >
          {/* Road markings */}
          <div className="absolute left-0 right-0 flex gap-4 px-4" style={{ top: 55 }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex-1 h-1 bg-yellow-400/70 rounded" />
            ))}
          </div>
        </div>

        {/* Cars */}
        {cars.map((car, i) => (
          <div
            key={`car-${i}`}
            className="absolute rounded-sm shadow-lg"
            style={{
              left: car.x,
              top: car.y,
              width: car.width,
              height: 30,
              backgroundColor: car.color,
            }}
          />
        ))}

        {/* Start zone */}
        <div
          className="absolute left-0 right-0 bottom-0 bg-emerald-800"
          style={{ height: 60 }}
        />

        {/* Frog */}
        <div
          className="absolute rounded-full bg-lime-400 border-2 border-lime-300 shadow-lg transition-all duration-100"
          style={{
            left: frog.x,
            top: frog.y,
            width: FROG_SIZE,
            height: FROG_SIZE,
            boxShadow: '0 0 10px rgba(163, 230, 53, 0.5)',
          }}
        />

        {/* Game Over / Won overlay */}
        {(gameOver || won) && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4">
            <div className="text-3xl font-bold text-white">
              {won ? '🎉 YOU WIN!' : '💀 GAME OVER'}
            </div>
            <div className="text-xl text-white">Score: {score}</div>
            <button
              onClick={restartGame}
              className="px-6 py-2 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-lg transition-colors"
            >
              Play Again
            </button>
          </div>
        )}
      </div>

      <div className="text-slate-400 text-xs">
        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">↑↓←→</kbd> or{' '}
        <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-xs">WASD</kbd> to move
      </div>
    </div>
  );
}
