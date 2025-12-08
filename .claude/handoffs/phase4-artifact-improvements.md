# Phase 4 Handoff: Artifact Improvements

## Current State

**Phase 3 Complete** ✅ - PR #238 created: https://github.com/NickB03/llm-chat-site/pull/238

### Phase 3 Summary
Phase 3 added 9 new games & interactive packages to the prebuilt bundles system:
- **2D Canvas**: konva, react-konva
- **Physics**: matter-js
- **Gestures**: @use-gesture/react
- **Animation**: gsap
- **Audio**: howler
- **Drag & Drop**: @dnd-kit/core, sortable, utilities

Total packages: 53 (up from 44)

## Prebuilt Bundles System Overview

The prebuilt bundles system enables instant artifact loading by pre-generating esm.sh URLs for popular npm packages. This eliminates bundling delays when artifacts use these libraries.

### Key Files
- `scripts/build-prebuilt-bundles.ts` - Main build script for generating the manifest
- `supabase/functions/_shared/prebuilt-bundles.json` - Runtime manifest used by Edge Functions

### Package Categories
1. **Pure packages**: Use `?bundle&external=react,react-dom` for single-file optimization
2. **React packages**: Use standard `?external=react,react-dom` to preserve hooks

### Current Phases Completed
- **Phase 1**: Core state, forms, UI essentials (zustand, react-hook-form, zod, sonner, etc.)
- **Phase 2**: Data visualization (@xyflow/react, @nivo/*, chart.js)
- **Phase 3**: Games & Interactive (canvas, physics, gestures, audio)

## Phase 4: Suggested Focus Areas

### Option 1: 3D & WebGL Libraries
- **Three.js** (`three`, `@react-three/fiber`, `@react-three/drei`)
- **Babylon.js** (`@babylonjs/core`, `@babylonjs/react`)
- **A-Frame** (`aframe`) for WebVR
- **PlayCanvas** (`playcanvas`)

### Option 2: Advanced Graphics & Shaders
- **PixiJS** (`pixi.js`, `@pixi/react`)
- **P5.js** (`p5`)
- **Shader Libraries** (`glslify`, `three/examples/jsm/shaders/`)

### Option 3: Media & Streaming
- **Video Processing** (`ffmpeg.wasm`, `hls.js`)
- **WebRTC** (`simple-peer`, `@twilio/video`)
- **Image Processing** (`sharp`, `jimp`)

### Option 4: Machine Learning & AI
- **TensorFlow.js** (`@tensorflow/tfjs`)
- **Brain.js** (`brain.js`)
- **ML5.js** (`ml5`)

## Technical Considerations

### Adding New Packages

1. **Update `scripts/build-prebuilt-bundles.ts`**:
   ```typescript
   // Add to PREBUILT_PACKAGES array
   {
     name: "three",
     version: "0.170.0",
     compatibleVersions: ["^0.160.0"],
     pure: true  // or false if uses React hooks
   }
   ```

2. **Determine purity**:
   - `pure: true` = No React dependencies = uses `?bundle` optimization
   - `pure: false` = Uses React hooks = standard esm.sh URL

3. **Run build script**:
   ```bash
   deno run -A scripts/build-prebuilt-bundles.ts
   ```

4. **Verify in manifest**:
   Check that new packages appear in `supabase/functions/_shared/prebuilt-bundles.json`

5. **Test artifacts**:
   - Create test artifacts using new packages
   - Verify instant loading (no bundling delays)
   - Check Chrome DevTools for any runtime errors

### Version Selection Strategy
- Use stable, recent versions
- Check compatibility with existing artifact patterns
- Consider bundle sizes (some 3D libraries can be very large)
- Verify esm.sh supports the package

### Performance Considerations
- Large packages (3D libraries) might need special handling
- Consider lazy loading strategies for very large bundles
- Monitor CDN performance for geographic distribution

## Project Context

### Repository Structure
- Main codebase: `/Users/nick/Projects/llm-chat-site`
- Edge Functions: `supabase/functions/`
- Shared utilities: `supabase/functions/_shared/`
- Build scripts: `scripts/`

### Development Workflow
1. Create branch: `git checkout -b feat/prebuilt-phase4-[category]`
2. Update build script with new packages
3. Run build script to generate manifest
4. Test with sample artifacts
5. Commit with detailed message
6. Create PR following established pattern

### Testing Strategy
- All packages must be accessible via esm.sh
- Verify artifacts can import and use the packages
- Check for runtime errors in Chrome DevTools
- Ensure bundle sizes are reasonable

### Important Notes
- Never hardcode model names in Edge Functions - always use `MODELS.*` from `config.ts`
- Use Chrome DevTools MCP for verification after changes
- Test with `npm run dev` on port 8080
- The manifest version should be incremented when adding new packages

## Next Steps

1. **Choose Phase 4 focus** based on project priorities
2. **Research package popularity** and compatibility with artifact patterns
3. **Start with 5-10 packages** for Phase 4 (similar to previous phases)
4. **Follow the established workflow** for adding and testing packages

## Current Active Branch
You're on branch `main` with Phase 3 PR pending review. Create a new branch for Phase 4 work.

## Contact Points
If you need clarification:
- Check recent commits: `git log --oneline -10`
- Review Phase 3 PR: #238
- Check CLAUDE.md for project guidelines and patterns

Good luck with Phase 4! 🚀