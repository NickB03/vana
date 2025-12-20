# Phase 4 3D & WebGL Test Artifacts

This directory contains test artifacts to verify that the Phase 4 3D & WebGL packages are working correctly with the prebuilt bundle system.

## Packages Tested

These artifacts test the following prebuilt bundles:

1. **three** (v0.170.0) - Core 3D library
2. **@react-three/fiber** (v8.17.10) - React renderer for three.js
3. **@react-three/drei** (v9.117.3) - Helpers and abstractions for react-three-fiber
4. **@react-spring/three** (v9.7.5) - Animation library for Three.js
5. **@react-three/rapier** (v1.5.0) - Physics engine for 3D
6. **three-stdlib** (v2.35.12) - Standard library for three.js
7. **@types/three** (v0.170.0) - TypeScript definitions
8. **@react-three/postprocessing** (v2.16.3) - Post-processing effects

## Test Artifacts

### 1. Basic 3D Scene (`01-basic-3d-scene.xml`)
- **Purpose**: Tests basic three.js integration with React Three Fiber
- **Features**: Rotating cube with OrbitControls
- **Packages**: three, @react-three/fiber, @react-three/drei, @types/three

### 2. Interactive 3D (`02-interactive-3d.xml`)
- **Purpose**: Tests mouse/touch interactions and animations
- **Features**: Clickable and hoverable shapes with spring animations
- **Packages**: three, @react-three/fiber, @react-three/drei, @react-spring/three

### 3. Physics Simulation (`03-physics-simulation.xml`)
- **Purpose**: Tests physics simulation with gravity and collisions
- **Features**: Falling boxes, bouncing ball, random impulses
- **Packages**: three, @react-three/fiber, @react-three/rapier, three-stdlib

## How to Test

### Option 1: Using the Chat Interface
1. Start the dev server: `npm run dev`
2. Open the chat interface in your browser
3. Copy and paste the XML content from any artifact file
4. The artifact should render immediately using the prebuilt bundles

### Option 2: Quick Verification
1. Run the verification script: `npx tsx verify-phase4-bundles.ts`
2. This will confirm all packages are in the prebuilt bundles

### Option 3: Visual Test Page
1. Open `test-phase4-3d-artifacts.html` in your browser
2. This shows all three artifacts with copy-paste ready XML

## Expected Results

All artifacts should:
- Load in 2-5 seconds (using prebuilt bundles)
- Show no console errors
- Have smooth 60fps animations
- Support mouse/touch interactions
- Display the 3D content correctly

## Performance Benefits

Using prebuilt bundles for these packages provides:
- **5-10x faster loading** compared to CDN fetching
- **~9.2 seconds saved** on initial load (based on fetch times)
- **Better offline support** with cached bundles
- **Reliable loading** without CDN dependencies

## Troubleshooting

If an artifact doesn't work:
1. Check the console for errors (look for "useRef null" or module import errors)
2. Verify the dev server is running on port 8080
3. Ensure Chrome DevTools MCP is running: `npx chrome-devtools-mcp start`
4. Check that all packages are in the prebuilt bundles

## Notes

- These artifacts use TypeScript types from `@types/three`
- All imports use npm packages (no local `@/` imports)
- Artifacts are fully self-contained and sandboxed
- The physics simulation might take a moment to initialize Rapier