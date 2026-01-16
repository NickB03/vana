/**
 * Pixi.js Game Patterns
 *
 * Prescriptive patterns for creating 2D games with pixi.js in artifacts.
 * These patterns ensure proper DOM mounting, event handling, and rendering.
 *
 * Usage: Include when user requests games, canvas graphics, or pixi.js
 */

export const PIXI_PATTERNS = `## PIXI.JS GAME PATTERNS

When creating 2D games with pixi.js, follow these patterns EXACTLY:

### 1. PROPER DOM MOUNTING (CRITICAL)

ALWAYS mount pixi.js to a container element - never rely on automatic mounting:

\`\`\`jsx
const containerRef = useRef(null);

useEffect(() => {
  let app;
  
  async function initPixi() {
    app = new PIXI.Application();
    await app.init({ 
      background: '#1099bb',
      resizeTo: containerRef.current,
      preference: 'webgpu'
    });
    
    // CRITICAL: Append canvas to DOM
    containerRef.current.appendChild(app.canvas);
    
    // Create game objects here
    const frog = new PIXI.Graphics()
      .rect(0, 0, 30, 30)
      .fill(0x00ff00);
    frog.x = 100;
    frog.y = 300;
    app.stage.addChild(frog);
    
    // Start game loop
    app.ticker.add((ticker) => {
      // Game logic here
    });
  }
  
  initPixi();
  
  return () => {
    if (app) {
      app.destroy(true, { children: true });
    }
  };
}, []);

return (
  <div 
    ref={containerRef} 
    className="w-full h-96 bg-gray-900 rounded-lg overflow-hidden"
  />
);
\`\`\`

Key points:
- Use \`containerRef.current.appendChild(app.canvas)\` to mount canvas
- Set \`resizeTo: containerRef.current\` for proper sizing
- Clean up with \`app.destroy(true, { children: true })\` in cleanup

### 2. KEYBOARD EVENTS (NO POINTER EVENTS)

Pixi.js pointer events won't work in the sandbox. Use window keyboard events:

\`\`\`jsx
const [keys, setKeys] = useState({});

useEffect(() => {
  const handleKeyDown = (e) => {
    setKeys(prev => ({ ...prev, [e.key]: true }));
  };
  
  const handleKeyUp = (e) => {
    setKeys(prev => ({ ...prev, [e.key]: false }));
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, []);

useEffect(() => {
  // In game loop
  if (keys['ArrowUp']) frog.y -= speed;
  if (keys['ArrowDown']) frog.y += speed;
  if (keys['ArrowLeft']) frog.x -= speed;
  if (keys['ArrowRight']) frog.x += speed;
}, [keys]);
\`\`\`

### 3. USE PIXI.TEXT FOR UI

DOM elements won't render inside pixi.js canvas. Use PIXI.Text:

\`\`\`jsx
const scoreText = new PIXI.Text({
  text: 'Score: 0',
  style: {
    fontFamily: 'Arial',
    fontSize: 24,
    fill: 0xffffff,
  }
});
scoreText.x = 10;
scoreText.y = 10;
app.stage.addChild(scoreText);

// Update score
scoreText.text = \`Score: \${score}\`;
\`\`\`

### 4. COMPLETE FROGGER PATTERN

\`\`\`jsx
const { useState, useEffect, useRef } = React;

export default function Frogger() {
  const containerRef = useRef(null);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  
  useEffect(() => {
    let app;
    let frog;
    let cars = [];
    let gameLoop;
    let scoreVal = 0;
    let livesVal = 3;
    const keys = {};
    
    async function initGame() {
      app = new PIXI.Application();
      await app.init({ 
        background: '#228b22',
        resizeTo: containerRef.current,
        preference: 'webgpu'
      });
      
      containerRef.current.appendChild(app.canvas);
      
      // Create frog
      frog = new PIXI.Graphics()
        .rect(0, 0, 30, 30)
        .fill(0x00ff00);
      frog.x = 200;
      frog.y = 500;
      app.stage.addChild(frog);
      
      // Create score text
      const scoreText = new PIXI.Text({
        text: 'Score: 0',
        style: { fontSize: 20, fill: 0xffffff }
      });
      scoreText.x = 10;
      scoreText.y = 10;
      app.stage.addChild(scoreText);
      
      // Create lives text
      const livesText = new PIXI.Text({
        text: 'Lives: 3',
        style: { fontSize: 20, fill: 0xffffff }
      });
      livesText.x = 10;
      livesText.y = 35;
      app.stage.addChild(livesText);
      
      // Create cars
      for (let i = 0; i < 4; i++) {
        const car = new PIXI.Graphics()
          .rect(0, 0, 60, 30)
          .fill(0xff0000);
        car.x = i * 150;
        car.y = 400 - i * 80;
        app.stage.addChild(car);
        cars.push({ sprite: car, speed: 2 + i * 0.5 });
      }
      
      // Keyboard handlers
      const handleKeyDown = (e) => { keys[e.key] = true; };
      const handleKeyUp = (e) => { keys[e.key] = false; };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      
      // Game loop
      app.ticker.add((ticker) => {
        // Move frog
        if (keys['ArrowUp']) frog.y -= 3;
        if (keys['ArrowDown']) frog.y += 3;
        if (keys['ArrowLeft']) frog.x -= 3;
        if (keys['ArrowRight']) frog.x += 3;
        
        // Clamp frog position
        frog.x = Math.max(0, Math.min(400, frog.x));
        frog.y = Math.max(0, Math.min(550, frog.y));
        
        // Move cars
        cars.forEach(car => {
          car.sprite.x += car.speed;
          if (car.sprite.x > 450) car.sprite.x = -60;
          
          // Collision check
          if (Math.abs(car.sprite.x - frog.x) < 50 && 
              Math.abs(car.sprite.y - frog.y) < 30) {
            frog.x = 200;
            frog.y = 500;
            livesVal--;
            livesText.text = \`Lives: \${livesVal}\`;
            if (livesVal <= 0) {
              setGameOver(true);
              app.destroy();
            }
          }
        });
      });
    }
    
    initGame();
    
    return () => {
      window.removeEventListener('keydown', () => {});
      window.removeEventListener('keyup', () => {});
      if (app) app.destroy(true, { children: true });
    };
  }, []);
  
  return (
    <div className="flex flex-col items-center">
      <div 
        ref={containerRef} 
        className="w-[450px] h-[600px] rounded-lg overflow-hidden"
      />
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <p className="mb-4">Final Score: {score}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
\`\`\`

### 5. PIXI.JS CHECKLIST

Before finalizing pixi.js artifacts, verify:

✓ Used \`containerRef.current.appendChild(app.canvas)\`
✓ Set \`resizeTo: containerRef.current\`
✓ Used window keyboard events (no pointer events)
✓ Used PIXI.Text for UI (no DOM elements inside canvas)
✓ Cleaned up with \`app.destroy(true, { children: true })\`
`;

export const PIXI_PATTERNS_REMINDER = `[PIXI.JS VERIFICATION]

Verify your pixi.js artifact has ALL of these:

✓ Proper DOM mounting: \`containerRef.current.appendChild(app.canvas)\`
✓ Resize configured: \`resizeTo: containerRef.current\`
✓ Keyboard events: \`window.addEventListener("keydown", ...)\`
✓ PIXI.Text for score/lives (not DOM elements)
✓ Cleanup on unmount: \`app.destroy(true, { children: true })\`
`;
