# Sandpack Test Artifact Specifications

> **Purpose**: Reference guide for creating high-quality prompts that generate the 20 production-ready test artifacts.
>
> **Target**: Prompt engineers building carousel prompts for artifact generation testing.

---

## Table of Contents

- [Batch 1: APIs + Charts + Animation (1-7)](#batch-1-apis--charts--animation)
- [Batch 2: Complex State + Tables + Forms (8-14)](#batch-2-complex-state--tables--forms)
- [Batch 3: Advanced API Integration (15-20)](#batch-3-advanced-api-integration)
- [Technical Requirements](#technical-requirements)
- [API Endpoints Reference](#api-endpoints-reference)

---

## Batch 1: APIs + Charts + Animation

### 1. Animated Gradient Buttons

**ID**: `animated-buttons`
**Complexity**: Basic
**Category**: UI Components
**Code Length**: ~150 lines

**Description**:
Collection of 6 animated gradient buttons with Framer Motion animations and icon integration.

**Key Features**:
- 6 distinct gradient button variants (Shimmer, Electric, Love, Stellar, Launch, Royal)
- Lucide React icons (Sparkles, Zap, Heart, Star, Rocket, Crown)
- Click animations: scale, rotate, pulse effects
- Gradient backgrounds with hover states
- Dark theme layout (slate-900 background)
- State tracking for clicked button feedback

**Libraries**:
- `framer-motion` - Animation system
- `lucide-react` - Icons

**External APIs**: None

**Important Callouts**:
- ⚠️ Must use Framer Motion `motion` components, not regular divs
- ⚠️ Requires `whileHover`, `whileTap`, and `animate` props
- ⚠️ Icon components must be dynamically rendered from array
- ⚠️ Gradient classes must use Tailwind's `bg-gradient-to-r` patterns

---

### 2. Interactive Mood Tracker

**ID**: `mood-tracker`
**Complexity**: Medium
**Category**: Data Visualization
**Code Length**: ~220 lines

**Description**:
Mood logging application with Recharts bar chart visualization and emoji-based mood selection.

**Key Features**:
- 8 predefined moods with emojis (Amazing, Happy, Energetic, Calm, Tired, Neutral, Stressed, Sad)
- BarChart showing mood frequency distribution
- Sample data: 4 pre-existing mood entries with timestamps
- Add mood with optional notes
- Color-coded mood categories with gradient styling
- Real-time chart updates using useMemo for performance

**Libraries**:
- `framer-motion` - Animations
- `recharts` - Bar chart (BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer)
- `lucide-react` - Mood icons

**External APIs**: None

**Important Callouts**:
- ⚠️ Must include sample data on initial render (never empty state)
- ⚠️ Chart data must be derived using `useMemo` for efficiency
- ⚠️ Requires immutable state updates when adding entries
- ⚠️ Each mood has specific gradient color scheme

---

### 3. Random Dog Gallery

**ID**: `dog-gallery`
**Complexity**: Medium
**Category**: API Integration
**Code Length**: ~170 lines

**Description**:
Dog image gallery fetching random dogs from Dog.ceo API with favorites system and animations.

**Key Features**:
- Fetch random dog images on button click
- Favorites system (add/remove dogs)
- Grid layout for favorites gallery
- Framer Motion card animations
- Loading states during API fetch
- Image display with smooth transitions

**Libraries**:
- `framer-motion` - Card animations
- `lucide-react` - UI icons (Heart, Trash2, RefreshCw)

**External APIs**:
- 🌐 **Dog.ceo API**: `https://dog.ceo/api/breeds/image/random`
  - Method: GET
  - Returns: `{ message: "image-url", status: "success" }`
  - No auth required
  - Free, unlimited

**Important Callouts**:
- ⚠️ Must handle API loading states
- ⚠️ Requires error handling for failed fetches
- ⚠️ Favorites stored in component state (no localStorage)
- ⚠️ Images should have fallback for load failures

---

### 4. Pomodoro Focus Timer

**ID**: `pomodoro-timer`
**Complexity**: Medium
**Category**: Productivity
**Code Length**: ~250 lines

**Description**:
Pomodoro technique timer with work/break cycles, session tracking, and circular progress visualization.

**Key Features**:
- 25-minute work sessions, 5-minute breaks
- Play/Pause/Reset controls
- Session counter tracking completed pomodoros
- SVG circular progress ring
- Auto-switch between work and break modes
- Visual and text status indicators
- Confetti-like animation on session completion

**Libraries**:
- `framer-motion` - Animations
- `lucide-react` - Control icons (Play, Pause, RotateCcw)

**External APIs**: None

**Important Callouts**:
- ⚠️ Must use `setInterval` for countdown timer
- ⚠️ Requires cleanup in useEffect to prevent memory leaks
- ⚠️ SVG circle uses `stroke-dasharray` and `stroke-dashoffset` for progress
- ⚠️ Auto-transition logic between work/break modes

---

### 5. Cat Fact Cards

**ID**: `cat-fact-cards`
**Complexity**: Basic
**Category**: API Integration
**Code Length**: ~160 lines

**Description**:
Display random cat facts with accompanying cat images in animated card layout.

**Key Features**:
- Fetch random cat facts from CatFact.ninja
- Fetch random cat images from TheCatAPI
- Card flip animations on data refresh
- Loading skeleton states
- Refresh button to get new fact and image
- Gradient background design

**Libraries**:
- `framer-motion` - Card animations
- `lucide-react` - Refresh icon

**External APIs**:
- 🌐 **CatFact.ninja**: `https://catfact.ninja/fact`
  - Method: GET
  - Returns: `{ fact: "string", length: number }`
  - No auth required

- 🌐 **TheCatAPI**: `https://api.thecatapi.com/v1/images/search`
  - Method: GET
  - Returns: `[{ url: "image-url", width: number, height: number }]`
  - No auth required

**Important Callouts**:
- ⚠️ Must handle dual API calls (parallel fetch)
- ⚠️ Loading state should show during both fetches
- ⚠️ Error handling for either API failure
- ⚠️ Initial data loaded on component mount

---

### 6. World Explorer Dashboard

**ID**: `world-explorer`
**Complexity**: Advanced
**Category**: API Integration
**Code Length**: ~420 lines

**Description**:
Comprehensive country explorer with REST Countries API integration, search, filtering, and detailed country views with charts.

**Key Features**:
- Search countries by name
- Filter by region (Africa, Americas, Asia, Europe, Oceania)
- Grid display of country cards with flags
- Detailed country view modal with:
  - Population chart (Recharts BarChart)
  - Border countries list
  - Languages and currencies
  - Area and capital information
- Initial load showing popular countries
- Real-time search filtering

**Libraries**:
- `framer-motion` - Animations
- `recharts` - Population visualization
- `lucide-react` - Icons (Search, Globe, Users, MapPin, X)

**External APIs**:
- 🌐 **REST Countries API**: `https://restcountries.com/v3.1/all`
  - Method: GET
  - Returns: Array of country objects with extensive data
  - No auth required
  - Fields: name, flags, population, region, capital, area, borders, languages, currencies

**Important Callouts**:
- ⚠️ Must fetch ALL countries on initial load (~250 countries)
- ⚠️ Search and filter must work on client-side (no API filtering)
- ⚠️ Requires modal/dialog for detailed view
- ⚠️ Flag images from API URLs must be handled
- ⚠️ Border countries need cross-reference logic

---

### 7. Recipe Finder & Meal Planner

**ID**: `recipe-finder`
**Complexity**: Advanced
**Category**: API Integration
**Code Length**: ~480 lines

**Description**:
Recipe search and meal planning app using TheMealDB API with tabs, favorites, and meal scheduling.

**Key Features**:
- Search recipes by name
- Browse by category (Beef, Chicken, Dessert, Seafood, Vegetarian)
- Recipe detail view with:
  - Ingredients list with measurements
  - Step-by-step instructions
  - YouTube video link
  - Meal category and area
- Favorites system
- Weekly meal planner (drag-drop or assign recipes to days)
- Tabbed interface using Radix UI Tabs
- Recipe detail modal using Radix UI Dialog

**Libraries**:
- `framer-motion` - Animations
- `lucide-react` - Icons
- `@radix-ui/react-dialog` - Modal dialogs
- `@radix-ui/react-tabs` - Tab navigation

**External APIs**:
- 🌐 **TheMealDB**:
  - Search: `https://www.themealdb.com/api/json/v1/1/search.php?s={query}`
  - Category: `https://www.themealdb.com/api/json/v1/1/filter.php?c={category}`
  - Details: `https://www.themealdb.com/api/json/v1/1/lookup.php?i={id}`
  - No auth required
  - Free tier available

**Important Callouts**:
- ⚠️ Requires Radix UI components (Dialog, Tabs)
- ⚠️ Must handle ingredients array (strIngredient1...20 + strMeasure1...20)
- ⚠️ YouTube video integration (thumbnail + link)
- ⚠️ Meal planner state management (7 days × meals)
- ⚠️ Multiple API endpoints for different features

---

## Batch 2: Complex State + Tables + Forms

### 8. Kanban Task Board

**ID**: `kanban-board`
**Complexity**: Advanced
**Category**: Productivity
**Code Length**: ~485 lines

**Description**:
Drag-and-drop Kanban board with three columns (To Do, In Progress, Done) using Framer Motion Reorder.

**Key Features**:
- 3 columns with drag-drop reordering within columns
- Add new tasks with title, description, priority (high/medium/low)
- Delete tasks
- Move tasks between columns with arrow buttons
- Priority badges (color-coded)
- Sample tasks pre-loaded
- Visual column indicators (colored left borders)
- Task count badges per column

**Libraries**:
- `framer-motion` - Drag-drop (Reorder.Group, Reorder.Item)
- `lucide-react` - Icons (Plus, Trash2, GripVertical)

**External APIs**: None

**Important Callouts**:
- ⚠️ Must use Framer Motion `Reorder` components (not HTML5 drag-drop)
- ⚠️ Requires controlled state for all 3 columns
- ⚠️ Immutable updates when moving tasks between columns
- ⚠️ Add task form inline (not modal)
- ⚠️ Arrow buttons for cross-column movement

---

### 9. Interactive Data Table

**ID**: `data-table`
**Complexity**: Medium
**Category**: Data Display
**Code Length**: ~420 lines

**Description**:
Feature-rich data table with JSONPlaceholder API integration, sorting, search, pagination, and row selection.

**Key Features**:
- Fetch users from JSONPlaceholder API
- Column sorting (name, email, company) - ascending/descending
- Search filter across all fields
- Pagination (10 items per page)
- Row selection with checkboxes (select all)
- Selected row count indicator
- Bulk actions on selected rows
- Loading skeleton during fetch
- Responsive table layout

**Libraries**:
- `lucide-react` - Icons (Search, ChevronUp, ChevronDown, Check)

**External APIs**:
- 🌐 **JSONPlaceholder**: `https://jsonplaceholder.typicode.com/users`
  - Method: GET
  - Returns: Array of 10 user objects
  - Fields: id, name, username, email, phone, website, address, company
  - No auth required

**Important Callouts**:
- ⚠️ Must implement client-side sorting logic
- ⚠️ Search must filter across multiple fields
- ⚠️ Pagination calculations (page count, slice logic)
- ⚠️ Select all checkbox with indeterminate state
- ⚠️ Table should be responsive (scroll on mobile)

---

### 10. Animated Statistics Dashboard

**ID**: `stats-dashboard`
**Complexity**: Advanced
**Category**: Data Visualization
**Code Length**: ~480 lines

**Description**:
Business metrics dashboard with multiple Recharts visualizations (Area, Line, Bar, Pie charts) and KPI cards.

**Key Features**:
- 4 KPI cards with trend indicators (Revenue, Users, Conversion Rate, Avg Order Value)
- AreaChart: Monthly revenue trend (6 months sample data)
- LineChart: User growth comparison (new vs returning)
- BarChart: Top products by sales
- PieChart: Traffic sources distribution
- Animated number counters on KPI cards
- Time range selector (Last 7 Days, Last 30 Days, Last 90 Days)
- Gradient fills on charts

**Libraries**:
- `framer-motion` - Animations
- `recharts` - Multiple chart types (AreaChart, LineChart, BarChart, PieChart)
- `lucide-react` - Icons (TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart)

**External APIs**: None

**Important Callouts**:
- ⚠️ Must include comprehensive sample data (never empty)
- ⚠️ Multiple chart types in single component
- ⚠️ Gradient definitions for chart fills
- ⚠️ Time range filtering updates all charts
- ⚠️ KPI trend indicators (up/down arrows with colors)

---

### 11. Advanced Memory Card Game

**ID**: `memory-game`
**Complexity**: Medium
**Category**: Games
**Code Length**: ~350 lines

**Description**:
Memory card matching game with themes, difficulty levels, move counter, timer, and best score tracking.

**Key Features**:
- 3 difficulty levels (Easy: 8 cards, Medium: 12, Hard: 16)
- 3 visual themes (Animals, Food, Space) with emojis
- Card flip animations (CSS 3D transforms)
- Move counter
- Timer (starts on first flip)
- Best score tracking per difficulty
- Win celebration screen
- Shuffle algorithm for card placement

**Libraries**:
- `framer-motion` - Card flip animations
- `lucide-react` - Icons (RotateCcw, Trophy, Clock)

**External APIs**: None

**Important Callouts**:
- ⚠️ CSS 3D transforms for card flip (`rotateY`)
- ⚠️ Timer using `setInterval` with cleanup
- ⚠️ Card matching logic (2-card comparison)
- ⚠️ Shuffle algorithm (Fisher-Yates recommended)
- ⚠️ Best score comparison and update logic
- ⚠️ Prevent flipping more than 2 cards at once

---

### 12. Quote Generator with Themes

**ID**: `quote-generator`
**Complexity**: Basic
**Category**: API Integration
**Code Length**: ~320 lines

**Description**:
Random quote generator with 4 visual themes and favorites system using Quotable.io API.

**Key Features**:
- Fetch random quotes from Quotable.io
- 4 visual themes: Minimal, Gradient, Dark, Neon (button toggle)
- Save quotes to favorites
- Display favorites list
- Author name display
- Share button (copy to clipboard)
- New quote button
- Theme-specific styling (backgrounds, fonts, colors)

**Libraries**:
- `framer-motion` - Theme transitions
- `lucide-react` - Icons (RefreshCw, Heart, Share2, Trash2)

**External APIs**:
- 🌐 **Quotable.io**: `https://api.quotable.io/random`
  - Method: GET
  - Returns: `{ content: "string", author: "string", tags: string[] }`
  - No auth required
  - Optional: `?tags=inspirational` for filtering

**Important Callouts**:
- ⚠️ Theme switching must update all visual elements
- ⚠️ Clipboard API for share functionality
- ⚠️ Favorites stored in state (not localStorage)
- ⚠️ Smooth theme transitions using Framer Motion

---

### 13. Color Palette Generator

**ID**: `color-palette`
**Complexity**: Medium
**Category**: Design Tools
**Code Length**: ~390 lines

**Description**:
Generate random or harmonious color palettes with color theory algorithms and CSS export functionality.

**Key Features**:
- Generate random palettes (5 colors)
- Harmonious color schemes (Analogous, Complementary, Triadic, Monochromatic)
- Color format toggle (HEX, RGB, HSL)
- Copy individual colors to clipboard
- Export palette as CSS variables
- Lock/unlock individual colors during regeneration
- Color preview swatches (large display)
- Accessibility contrast checker

**Libraries**:
- `framer-motion` - Animations
- `lucide-react` - Icons (RefreshCw, Lock, Unlock, Copy, Download)

**External APIs**: None

**Important Callouts**:
- ⚠️ Color theory algorithms required (HSL color space)
- ⚠️ HEX ↔ RGB ↔ HSL conversion functions
- ⚠️ Clipboard API for copy functionality
- ⚠️ CSS variable generation format
- ⚠️ Lock state prevents color from changing on regenerate
- ⚠️ Contrast ratio calculation (WCAG standards)

---

### 14. Real-Time Weather Dashboard

**ID**: `weather-dashboard`
**Complexity**: Advanced
**Category**: API Integration
**Code Length**: ~620 lines

**Description**:
Weather dashboard with Open-Meteo API, location search via Geocoding API, hourly and 7-day forecasts with charts.

**Key Features**:
- Location search with autocomplete (Geocoding API)
- Current weather conditions
- Hourly forecast (24 hours) - LineChart showing temperature
- 7-day forecast - cards with daily high/low
- Weather icons based on condition codes
- Temperature unit toggle (°C / °F)
- UV index indicator
- Wind speed and direction
- Precipitation probability
- Humidity and visibility

**Libraries**:
- `recharts` - Temperature charts (LineChart, AreaChart)
- `lucide-react` - Weather icons and UI elements

**External APIs**:
- 🌐 **Open-Meteo Weather**: `https://api.open-meteo.com/v1/forecast`
  - Method: GET
  - Params: `?latitude={lat}&longitude={lon}&current=temperature_2m,weathercode,windspeed_10m&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weathercode`
  - No auth required
  - Free tier unlimited

- 🌐 **Open-Meteo Geocoding**: `https://geocoding-api.open-meteo.com/v1/search`
  - Method: GET
  - Params: `?name={city}&count=5`
  - Returns: Array of locations with lat/lon

**Important Callouts**:
- ⚠️ Requires TWO API calls: Geocoding → Weather
- ⚠️ Weather code mapping to conditions and icons
- ⚠️ Temperature conversion (Celsius ↔ Fahrenheit)
- ⚠️ Time formatting for hourly data
- ⚠️ Default location on load (fallback to geolocation or preset city)
- ⚠️ Chart must handle 24-hour and 7-day data arrays

---

## Batch 3: Advanced API Integration

### 15. Pokemon Team Builder

**ID**: `pokemon-team`
**Complexity**: Advanced
**Category**: API Integration
**Code Length**: ~720 lines

**Description**:
Pokemon team builder with PokeAPI integration, team composition analysis, stat comparison radar charts, and type effectiveness.

**Key Features**:
- Search Pokemon by name
- Browse popular Pokemon (pre-loaded: Pikachu, Charizard, Mewtwo, Lucario, Garchomp, Greninja)
- Add up to 6 Pokemon to team
- Team view with:
  - Pokemon sprites (official artwork)
  - Type badges (18 types, color-coded)
  - Base stats display
  - Remove from team button
- Team stats view with:
  - RadarChart showing average team stats
  - Type distribution chart
  - Total team power calculation
- 3-tab interface (Search, Team, Stats)

**Libraries**:
- `recharts` - RadarChart for stats visualization
- `lucide-react` - Icons (Search, Star, Zap, Trash2, X)

**External APIs**:
- 🌐 **PokeAPI**: `https://pokeapi.co/api/v2/pokemon/{name-or-id}`
  - Method: GET
  - Returns: Comprehensive Pokemon data (stats, types, sprites, abilities)
  - No auth required
  - Free, unlimited
  - Fields: id, name, types, stats (HP, Attack, Defense, Sp.Atk, Sp.Def, Speed), sprites

**Important Callouts**:
- ⚠️ Initial load fetches 6 popular Pokemon (parallel Promise.all)
- ⚠️ Team limit validation (max 6)
- ⚠️ Duplicate Pokemon prevention
- ⚠️ Stats averaging calculation for RadarChart
- ⚠️ Type color mapping (18 Pokemon types)
- ⚠️ Official artwork URL: `sprites.other['official-artwork'].front_default`
- ⚠️ Search error handling with helpful message

---

### 16. Markdown Note Editor

**ID**: `markdown-editor`
**Complexity**: Medium
**Category**: Productivity
**Code Length**: ~450 lines

**Description**:
Split-pane markdown editor with real-time preview, localStorage persistence, and export functionality.

**Key Features**:
- Split view: editor (left) and preview (right)
- Real-time markdown rendering
- localStorage auto-save (debounced)
- Export as:
  - Markdown (.md file)
  - HTML (rendered preview)
  - Plain text
- Word and character count
- Clear button with confirmation
- Syntax highlighting for code blocks in preview
- Sample markdown loaded on first visit

**Libraries**:
- `lucide-react` - Icons (Save, Download, Trash2, Eye, FileText)

**External APIs**: None

**Important Callouts**:
- ⚠️ Markdown parsing library needed (suggest simple regex-based or marked.js pattern)
- ⚠️ localStorage key management
- ⚠️ Debounced save (useEffect with timeout)
- ⚠️ File download using Blob and anchor tag
- ⚠️ Markdown syntax support: headers, bold, italic, links, lists, code blocks
- ⚠️ Prevent XSS in preview (sanitize HTML if using innerHTML)

---

### 17. Habit Tracker

**ID**: `habit-tracker`
**Complexity**: Medium
**Category**: Productivity
**Code Length**: ~500 lines

**Description**:
Daily habit tracking with calendar heat map, streak counter, completion statistics, and visual progress.

**Key Features**:
- Add/edit/delete habits
- Daily check-in (toggle completion for each habit)
- Calendar heat map (30-day view, color intensity = completion rate)
- Streak counter (current streak, longest streak)
- Completion statistics:
  - Today's completion %
  - This week completion %
  - This month completion %
- Habit list with checkboxes
- Sample habits pre-loaded (Exercise, Read, Meditate, Water)
- Motivational messages based on streaks

**Libraries**:
- `framer-motion` - Animations for check-ins
- `lucide-react` - Icons (Plus, Check, Flame, TrendingUp, Calendar)

**External APIs**: None

**Important Callouts**:
- ⚠️ Date handling (current day, week, month calculations)
- ⚠️ Calendar heat map uses CSS Grid (7 columns × 5 rows)
- ⚠️ Heat map color intensity based on completion count
- ⚠️ Streak logic: consecutive days with all habits completed
- ⚠️ Data structure: `{ habitId: string, completions: Date[] }`
- ⚠️ Percentage calculations for stats

---

### 18. Music Visualizer

**ID**: `music-visualizer`
**Complexity**: Advanced
**Category**: Entertainment
**Code Length**: ~550 lines

**Description**:
Audio visualization using Web Audio API with waveform display and frequency bar chart animations.

**Key Features**:
- File upload for audio (MP3, WAV)
- Or use sample audio URLs
- Play/Pause/Stop controls
- Volume slider
- Real-time visualizations:
  - Waveform display (oscilloscope style)
  - Frequency bars (spectrum analyzer, 32-64 bars)
  - Circular visualization option
- Playback progress bar
- Current time / duration display
- Color theme toggle for visualizations

**Libraries**:
- `framer-motion` - UI animations
- `lucide-react` - Control icons (Play, Pause, Square, Volume2, Upload)

**External APIs**: None (uses Web Audio API)

**Important Callouts**:
- ⚠️ Web Audio API: AudioContext, AnalyserNode, createMediaElementSource
- ⚠️ Canvas rendering for visualizations (requestAnimationFrame loop)
- ⚠️ FFT data processing (getByteFrequencyData, getByteTimeDomainData)
- ⚠️ File input handling (FileReader, createObjectURL)
- ⚠️ Audio element with controls sync
- ⚠️ Cleanup: stop animation loop, disconnect audio nodes
- ⚠️ Sample audio URL for initial demo

---

### 19. Dynamic Form Builder

**ID**: `form-builder`
**Complexity**: Advanced
**Category**: Productivity
**Code Length**: ~650 lines

**Description**:
Drag-and-drop form builder with live preview and JSON schema export.

**Key Features**:
- Field palette: Text Input, Email, Number, Textarea, Checkbox, Radio, Select, Date
- Drag fields from palette to form area
- Reorder fields (drag-drop)
- Configure field properties:
  - Label
  - Placeholder
  - Required toggle
  - Options (for select/radio)
- Delete fields
- Live preview mode (toggle between build/preview)
- JSON schema export
- Import from JSON
- Form validation in preview mode

**Libraries**:
- `lucide-react` - Icons (Plus, Trash2, GripVertical, Eye, Code, Download, Upload)

**External APIs**: None

**Important Callouts**:
- ⚠️ Drag-and-drop without Framer Motion (use native HTML5 or simple state)
- ⚠️ Field types enum/object structure
- ⚠️ Dynamic form rendering based on schema
- ⚠️ Validation rules (required, email format, number range)
- ⚠️ JSON export format (schema specification)
- ⚠️ JSON import with validation
- ⚠️ Preview mode must render actual HTML form elements

---

### 20. Investment Portfolio Tracker

**ID**: `portfolio-tracker`
**Complexity**: Advanced
**Category**: Finance
**Code Length**: ~580 lines

**Description**:
Stock portfolio tracker with performance charts, gain/loss calculations, and allocation visualization.

**Key Features**:
- Add stocks with:
  - Ticker symbol
  - Shares owned
  - Purchase price
  - Purchase date
- Portfolio summary cards:
  - Total value
  - Total gain/loss ($ and %)
  - Today's change
  - Best performing stock
- Holdings table:
  - Stock symbol
  - Shares
  - Purchase price
  - Current price (mock data)
  - Gain/loss (color-coded green/red)
- Charts:
  - LineChart: Portfolio value over time (30 days)
  - PieChart: Allocation by stock
  - BarChart: Individual stock performance comparison
- Delete holdings

**Libraries**:
- `recharts` - Multiple chart types
- `lucide-react` - Icons (Plus, Trash2, TrendingUp, TrendingDown, DollarSign)

**External APIs**: None (uses mock stock data)

**Important Callouts**:
- ⚠️ Mock stock price data (realistic daily variations)
- ⚠️ Gain/loss calculations: `(currentPrice - purchasePrice) × shares`
- ⚠️ Percentage gain: `((currentPrice - purchasePrice) / purchasePrice) × 100`
- ⚠️ Portfolio total value: sum of `currentPrice × shares` for all holdings
- ⚠️ Chart data generation (30-day historical mock data)
- ⚠️ Color coding: green for gains, red for losses
- ⚠️ Ticker symbol validation (uppercase, 1-5 letters)
- ⚠️ Note: Production version would use real stock API (Alpha Vantage, Finnhub)

---

## Technical Requirements

All artifacts must follow these constraints for Sandpack compatibility:

### Required Patterns

1. **Default Export**:
   ```tsx
   export default function App() {
     // component code
   }
   ```

2. **React Hook Imports**:
   ```tsx
   import { useState, useEffect, useMemo, useCallback } from 'react';
   ```

3. **Immutable State Updates**:
   ```tsx
   // ✅ Correct
   setItems([...items, newItem]);
   setData({ ...data, key: value });
   setArray(items.map(item => item.id === id ? { ...item, updated: true } : item));

   // ❌ Wrong
   items.push(newItem);
   data.key = value;
   ```

4. **Sample Data Required**:
   - Never show empty states on initial render
   - Include realistic sample data in initial state or useEffect

5. **Tailwind CSS Only**:
   - No CSS modules, no styled-components
   - Use Tailwind utility classes exclusively

### Whitelisted Libraries

**Animation**:
- `framer-motion` - Motion components, animations, drag-drop

**Charts**:
- `recharts` - All chart types (LineChart, BarChart, AreaChart, PieChart, RadarChart, etc.)

**Icons**:
- `lucide-react` - Icon components

**UI Components** (Limited):
- `@radix-ui/react-dialog` - Modals/Dialogs
- `@radix-ui/react-tabs` - Tab navigation
- `@radix-ui/react-select` - Custom selects (rarely needed)

### Forbidden Patterns

❌ **NO** local imports:
```tsx
// These will NOT work in Sandpack
import { Button } from '@/components/ui/button';
import { helper } from './utils';
```

❌ **NO** external CSS files:
```tsx
import './styles.css'; // Will not work
```

❌ **NO** non-whitelisted packages:
```tsx
import axios from 'axios'; // Not available
import lodash from 'lodash'; // Not available
```

---

## API Endpoints Reference

### Public Free APIs Used

| API | Endpoint | Auth Required | Rate Limit | Data Returned |
|-----|----------|---------------|------------|---------------|
| **Dog.ceo** | `https://dog.ceo/api/breeds/image/random` | No | Unlimited | Random dog image URL |
| **CatFact.ninja** | `https://catfact.ninja/fact` | No | Unlimited | Random cat fact text |
| **TheCatAPI** | `https://api.thecatapi.com/v1/images/search` | No | Unlimited | Random cat image |
| **REST Countries** | `https://restcountries.com/v3.1/all` | No | Unlimited | All countries data |
| **TheMealDB** | `https://www.themealdb.com/api/json/v1/1/search.php?s={query}` | No | Unlimited | Recipe data |
| **JSONPlaceholder** | `https://jsonplaceholder.typicode.com/users` | No | Unlimited | Mock user data (10 users) |
| **Quotable.io** | `https://api.quotable.io/random` | No | Unlimited | Random quote + author |
| **Open-Meteo Weather** | `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&...` | No | Unlimited | Weather forecast data |
| **Open-Meteo Geocoding** | `https://geocoding-api.open-meteo.com/v1/search?name={city}` | No | Unlimited | City coordinates |
| **PokeAPI** | `https://pokeapi.co/api/v2/pokemon/{name}` | No | Unlimited | Pokemon data |

### API Error Handling Template

All API calls should follow this pattern:

```tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Failed to fetch');
    const json = await response.json();
    setData(json);
  } catch (err) {
    setError(err.message);
    // Optionally: alert() for user-friendly message
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
}, []);
```

---

## Complexity Breakdown

| Complexity | Count | Criteria |
|------------|-------|----------|
| **Basic** | 3 | Simple state, basic animations, minimal logic |
| **Medium** | 8 | API integration OR moderate state management OR data visualization |
| **Advanced** | 9 | Multiple APIs OR complex state OR drag-drop OR multiple chart types |

**Basic Examples**: Animated Buttons, Cat Fact Cards, Quote Generator
**Medium Examples**: Mood Tracker, Pomodoro Timer, Data Table, Memory Game
**Advanced Examples**: World Explorer, Recipe Finder, Kanban Board, Weather Dashboard, Pokemon Team Builder

---

## Prompt Engineering Guidelines

When creating prompts for these artifacts:

1. **Be Specific About Libraries**:
   - ✅ "Use Framer Motion's `Reorder.Group` for drag-drop"
   - ❌ "Add drag and drop functionality"

2. **Include Sample Data Requirements**:
   - ✅ "Start with 4 pre-existing mood entries with timestamps and notes"
   - ❌ "Create a mood tracker"

3. **Specify API Details**:
   - ✅ "Fetch from `https://api.quotable.io/random` which returns `{ content, author }`"
   - ❌ "Use a quotes API"

4. **Clarify Immutability**:
   - ✅ "Use `.map()` to update the array immutably when toggling favorites"
   - ❌ "Update the favorites array"

5. **Define Visual Requirements**:
   - ✅ "Display in 3-column grid with colored left borders (blue/yellow/green) and task count badges"
   - ❌ "Create a nice layout for the Kanban board"

6. **State Management Details**:
   - ✅ "Store team as array of Pokemon objects, max 6, prevent duplicates by checking `id`"
   - ❌ "Let users build a team"

---

## Example Prompt Structure

```
Build a React artifact using [LIBRARIES]. NO local imports, NO @/ imports.

Context: [CATEGORY] - [HIGH-LEVEL PURPOSE]

Task: Create a [SPECIFIC COMPONENT TYPE] with [KEY FEATURES LIST]

Sample Data: MUST include [SPECIFIC DATA REQUIREMENTS] - never show empty states

Features:
- [FEATURE 1 with implementation detail]
- [FEATURE 2 with implementation detail]
- [FEATURE 3 with implementation detail]

[If API] API:
- Endpoint: [FULL URL]
- Method: [GET/POST]
- Returns: [EXACT RESPONSE STRUCTURE]

[If Charts] Charts:
- [CHART TYPE] showing [DATA] using [RECHARTS COMPONENT]

UI: [LAYOUT DESCRIPTION with Tailwind classes]

State: Use useState for [STATE VARIABLES with types/structures]

Immutability: CRITICAL - [SPECIFIC IMMUTABILITY PATTERNS REQUIRED]

Styling: Tailwind CSS - [COLOR SCHEME], [KEY VISUAL ELEMENTS]

Keep it [simple/working/production-ready] - [CONSTRAINTS TO AVOID OVER-ENGINEERING]
```

---

## Document Version

**Version**: 1.0
**Last Updated**: 2026-01-21
**Maintained By**: Vana Development Team

For questions or updates, see `ARCHITECTURE.md` and `ARTIFACT_SYSTEM.md`.
