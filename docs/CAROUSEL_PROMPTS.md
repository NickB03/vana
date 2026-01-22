# Carousel Prompts for Artifact Generation

> **Purpose**: Production-ready prompts optimized for the Vana artifact generation system.
>
> **Usage**: Click a card → prompt loads → session begins with artifact generation.

---

## Quick Reference

| ID | Name | Category | Complexity |
|----|------|----------|------------|
| 1 | Animated Gradient Buttons | UI Components | Basic |
| 2 | Interactive Mood Tracker | Data Visualization | Medium |
| 3 | Random Dog Gallery | API Integration | Medium |
| 4 | Pomodoro Focus Timer | Productivity | Medium |
| 5 | Cat Fact Cards | API Integration | Basic |
| 6 | World Explorer Dashboard | API Integration | Advanced |
| 7 | Recipe Finder & Meal Planner | API Integration | Advanced |
| 8 | Kanban Task Board | Productivity | Advanced |
| 9 | Interactive Data Table | Data Display | Medium |
| 10 | Animated Statistics Dashboard | Data Visualization | Advanced |
| 11 | Advanced Memory Card Game | Games | Medium |
| 12 | Quote Generator with Themes | API Integration | Basic |
| 13 | Color Palette Generator | Design Tools | Medium |
| 14 | Real-Time Weather Dashboard | API Integration | Advanced |
| 15 | Pokemon Team Builder | API Integration | Advanced |
| 16 | Markdown Note Editor | Productivity | Medium |
| 17 | Habit Tracker | Productivity | Medium |
| 18 | Music Visualizer | Entertainment | Advanced |
| 19 | Dynamic Form Builder | Productivity | Advanced |
| 20 | Investment Portfolio Tracker | Finance | Advanced |

---

## Batch 1: APIs + Charts + Animation (1-7)

### 1. Animated Gradient Buttons

**Card Title**: ✨ Gradient Button Collection

**Prompt**:
```
Create a collection of 6 animated gradient buttons using Framer Motion and Lucide React icons.

Buttons: Shimmer (Sparkles), Electric (Zap), Love (Heart), Stellar (Star), Launch (Rocket), Royal (Crown)

Each button needs:
- Unique gradient background (e.g., from-purple-500 to-pink-500)
- Framer Motion whileHover scale and whileTap animations
- Icon from lucide-react
- Click feedback showing which button was pressed

Use useState to track the last clicked button. Dark slate-900 background with centered grid layout.
```

---

### 2. Interactive Mood Tracker

**Card Title**: 😊 Mood Tracker

**Prompt**:
```
Build a mood tracking app with Recharts visualization.

8 moods with emojis: Amazing 🌟, Happy 😊, Energetic ⚡, Calm 😌, Tired 😴, Neutral 😐, Stressed 😰, Sad 😢

Features:
- Click a mood to log it with timestamp
- Optional notes input
- BarChart showing mood frequency using Recharts (BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer)
- Color-coded mood buttons with gradients

Start with 4 sample entries already logged. Use useMemo to calculate chart data from entries array. Framer Motion for button animations.
```

---

### 3. Random Dog Gallery

**Card Title**: 🐕 Dog Gallery

**Prompt**:
```
Create a dog image gallery that fetches from the Dog.ceo API.

API: GET https://dog.ceo/api/breeds/image/random
Returns: { message: "image-url", status: "success" }

Features:
- "Get Random Dog" button fetches new image
- Heart button adds current dog to favorites
- Grid of favorite dogs with remove button
- Loading state while fetching
- Framer Motion card animations

Use useState for: currentDog, favorites array, loading state. Icons: Heart, Trash2, RefreshCw from lucide-react.
```

---

### 4. Pomodoro Focus Timer

**Card Title**: 🍅 Pomodoro Timer

**Prompt**:
```
Build a Pomodoro timer with 25-minute work sessions and 5-minute breaks.

Features:
- SVG circular progress ring (use stroke-dasharray/stroke-dashoffset)
- Play/Pause/Reset controls with lucide-react icons (Play, Pause, RotateCcw)
- Session counter tracking completed pomodoros
- Auto-switch between work and break modes
- Visual state indicators (colors change for work vs break)

Use setInterval for countdown. CRITICAL: cleanup interval in useEffect return function. Calculate progress percentage for SVG ring. Framer Motion for control button animations.
```

---

### 5. Cat Fact Cards

**Card Title**: 🐱 Cat Facts

**Prompt**:
```
Display random cat facts with cat images in animated cards.

APIs (fetch both in parallel):
- Cat fact: GET https://catfact.ninja/fact → { fact: "text", length: number }
- Cat image: GET https://api.thecatapi.com/v1/images/search → [{ url: "image-url" }]

Features:
- Card showing cat image and fact text
- Refresh button fetches new fact + image
- Loading skeleton during fetch
- Framer Motion card flip animation on refresh

Load initial data on mount with useEffect. Handle loading and error states for both APIs.
```

---

### 6. World Explorer Dashboard

**Card Title**: 🌍 World Explorer

**Prompt**:
```
Build a country explorer with REST Countries API.

API: GET https://restcountries.com/v3.1/all
Returns: Array of country objects with name, flags, population, region, capital, area, languages, currencies

Features:
- Search countries by name (client-side filter)
- Filter by region dropdown (Africa, Americas, Asia, Europe, Oceania)
- Grid of country cards showing flag, name, population, region
- Click card for detail modal with:
  - Population bar chart (single bar using Recharts BarChart)
  - Languages and currencies list
  - Capital and area info

Fetch all countries on mount. Use useState for: countries, searchTerm, regionFilter, selectedCountry. Radix Dialog for modal (@radix-ui/react-dialog).
```

---

### 7. Recipe Finder & Meal Planner

**Card Title**: 🍳 Recipe Finder

**Prompt**:
```
Create a recipe search app using TheMealDB API.

APIs:
- Search: GET https://www.themealdb.com/api/json/v1/1/search.php?s={query}
- Details: GET https://www.themealdb.com/api/json/v1/1/lookup.php?i={id}

Features:
- Search recipes by name
- Category filter buttons (Beef, Chicken, Dessert, Seafood, Vegetarian)
- Recipe cards in grid layout
- Click card for detail modal showing:
  - Recipe image
  - Ingredients list (strIngredient1-20 + strMeasure1-20)
  - Instructions
  - YouTube link if available
- Favorites tab to save recipes
- Weekly meal planner (7 days)

Use Radix Tabs (@radix-ui/react-tabs) for Search/Favorites/Planner tabs. Radix Dialog for recipe detail modal. Store favorites and meal plan in useState arrays.
```

---

## Batch 2: Complex State + Tables + Forms (8-14)

### 8. Kanban Task Board

**Card Title**: 📋 Kanban Board

**Prompt**:
```
Build a Kanban board with 3 columns using Framer Motion drag-drop.

Columns: To Do (blue), In Progress (yellow), Done (green) - colored left borders

Features:
- Drag-drop reorder within columns using Framer Motion Reorder.Group and Reorder.Item
- Add task form with: title (required), description, priority (high/medium/low)
- Priority badges color-coded (red/yellow/green)
- Delete task button
- Arrow buttons to move tasks between columns
- Task count badge on each column header

Start with 6 sample tasks spread across columns. State structure: { todo: Task[], inProgress: Task[], done: Task[] }. Use immutable updates when moving tasks between columns.
```

---

### 9. Interactive Data Table

**Card Title**: 📊 Data Table

**Prompt**:
```
Create a feature-rich data table with JSONPlaceholder API.

API: GET https://jsonplaceholder.typicode.com/users
Returns: 10 user objects with id, name, email, phone, company.name, website

Features:
- Sortable columns (name, email, company) - click header to toggle asc/desc
- Search filter across all fields
- Pagination (5 items per page)
- Row selection with checkboxes
- Select all checkbox (with indeterminate state when partial)
- Selected count indicator
- Loading skeleton during fetch

Icons: Search, ChevronUp, ChevronDown from lucide-react. Client-side sorting and filtering. Calculate page count and slice data for pagination.
```

---

### 10. Animated Statistics Dashboard

**Card Title**: 📈 Stats Dashboard

**Prompt**:
```
Build a business metrics dashboard with multiple Recharts visualizations.

Charts (all with sample data - never empty):
- 4 KPI cards: Revenue ($124,500, +12%), Users (8,234, +5%), Conversion (3.2%, -0.3%), Avg Order ($85, +8%)
- AreaChart: 6-month revenue trend
- LineChart: User growth (new vs returning users)
- BarChart: Top 5 products by sales
- PieChart: Traffic sources (Direct, Organic, Social, Referral, Email)

Features:
- Time range selector (7d, 30d, 90d) - filters update all charts
- KPI cards with trend arrows (up green, down red)
- Gradient fills on AreaChart
- Responsive grid layout

Use useMemo to filter data by time range. Icons: TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart from lucide-react.
```

---

### 11. Advanced Memory Card Game

**Card Title**: 🎮 Memory Game

**Prompt**:
```
Create a memory card matching game with difficulty levels.

Difficulties: Easy (8 cards/4 pairs), Medium (12/6), Hard (16/8)
Themes with emojis: Animals (🐶🐱🐸🦁🐯🐼🐨🐵), Food (🍕🍔🍟🌮🍣🍩🍪🎂), Space (🚀🌙⭐🪐🛸👽🌌☄️)

Features:
- Card flip animation (CSS 3D transform with rotateY)
- Move counter
- Timer (starts on first flip, use setInterval with cleanup)
- Best score tracking per difficulty
- Win celebration when all matched
- New game button shuffles cards

Use Fisher-Yates shuffle. Game logic: max 2 cards flipped at once, check match after 2nd flip, unflip if no match after delay. Store cards as: { id, emoji, isFlipped, isMatched }.
```

---

### 12. Quote Generator with Themes

**Card Title**: 💬 Quote Generator

**Prompt**:
```
Build a quote generator with visual themes using Quotable.io API.

API: GET https://api.quotable.io/random
Returns: { content: "quote text", author: "author name" }

4 Themes (button toggle):
- Minimal: white bg, black text, simple border
- Gradient: colorful gradient background, white text
- Dark: slate-900 bg, white text, subtle glow
- Neon: black bg, cyan/pink neon text with shadow effects

Features:
- New quote button fetches random quote
- Save to favorites (stored in state)
- Share button (copy to clipboard using navigator.clipboard)
- Favorites list view
- Smooth theme transitions with Framer Motion

Icons: RefreshCw, Heart, Share2, Trash2 from lucide-react. Load initial quote on mount.
```

---

### 13. Color Palette Generator

**Card Title**: 🎨 Color Palette

**Prompt**:
```
Create a color palette generator with color theory algorithms.

Palette Modes:
- Random: 5 random colors
- Analogous: colors near base hue (±30°)
- Complementary: base + opposite (180°)
- Triadic: 3 colors 120° apart
- Monochromatic: same hue, varying saturation/lightness

Features:
- Large color swatches (5 colors)
- Format toggle: HEX / RGB / HSL
- Click swatch to copy color value
- Lock individual colors (won't change on regenerate)
- Export as CSS variables button
- Contrast checker (shows if text readable on color)

Color math: Work in HSL space, convert to HEX/RGB for display. Include conversion functions. Icons: RefreshCw, Lock, Unlock, Copy, Download from lucide-react.
```

---

### 14. Real-Time Weather Dashboard

**Card Title**: 🌤️ Weather Dashboard

**Prompt**:
```
Build a weather dashboard with Open-Meteo APIs.

APIs:
- Geocoding: GET https://geocoding-api.open-meteo.com/v1/search?name={city}&count=5
- Weather: GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto

Features:
- Location search with autocomplete dropdown
- Current conditions: temp, weather icon, wind, humidity
- Hourly forecast LineChart (24 hours) using Recharts
- 7-day forecast cards with high/low temps
- Temperature unit toggle (°C/°F)
- Weather code → icon mapping (sunny, cloudy, rainy, etc.)

Default to "New York" on load. Fetch flow: geocoding → get lat/lon → weather API. Icons from lucide-react: Search, Droplets, Wind, Sun, Cloud, CloudRain.
```

---

## Batch 3: Advanced API Integration (15-20)

### 15. Pokemon Team Builder

**Card Title**: ⚡ Pokemon Team Builder

**Prompt**:
```
Create a Pokemon team builder with PokeAPI.

API: GET https://pokeapi.co/api/v2/pokemon/{name-or-id}
Returns: id, name, types, stats (HP, Attack, Defense, Sp.Atk, Sp.Def, Speed), sprites

Features:
- Search Pokemon by name
- Initial load: fetch 6 popular Pokemon (Pikachu, Charizard, Mewtwo, Lucario, Garchomp, Greninja) using Promise.all
- Browse results as cards with official artwork (sprites.other['official-artwork'].front_default)
- Type badges color-coded (18 Pokemon types)
- Add to team button (max 6, prevent duplicates)
- Team view showing selected Pokemon
- Stats tab with RadarChart showing average team stats (Recharts RadarChart)

3 tabs: Search, My Team, Team Stats. Store team as array of Pokemon objects. Calculate average stats across team for radar chart.
```

---

### 16. Markdown Note Editor

**Card Title**: 📝 Markdown Editor

**Prompt**:
```
Build a split-pane markdown editor with live preview.

Features:
- Split view: textarea (left), rendered preview (right)
- Real-time markdown rendering as you type
- Word and character count
- Export buttons: Download as .md, .html, .txt
- Clear button with confirmation
- Auto-save to localStorage (debounced 1 second)

Markdown support (simple regex parsing):
- Headers: # ## ###
- Bold: **text**
- Italic: *text*
- Links: [text](url)
- Lists: - item
- Code blocks: \`\`\`code\`\`\`

Start with sample markdown loaded. Use dangerouslySetInnerHTML for preview (sanitize by escaping script tags). Icons: Save, Download, Trash2, Eye from lucide-react.
```

---

### 17. Habit Tracker

**Card Title**: ✅ Habit Tracker

**Prompt**:
```
Create a daily habit tracker with calendar heat map and streaks.

Features:
- Add/edit/delete habits
- Daily check-in: toggle completion for each habit
- Calendar heat map (30 days, CSS Grid 7 columns)
  - Color intensity based on completion rate that day
- Streak counter: current streak, longest streak
- Statistics:
  - Today's completion %
  - This week completion %
  - This month completion %

Start with 4 sample habits: Exercise, Read 30 min, Meditate, Drink 8 glasses water - with some pre-existing completions for past 2 weeks.

Data structure: habits array with { id, name, completions: Date[] }. Streak = consecutive days with ALL habits completed. Icons: Plus, Check, Flame, TrendingUp, Calendar from lucide-react. Framer Motion for check animations.
```

---

### 18. Music Visualizer

**Card Title**: 🎵 Music Visualizer

**Prompt**:
```
Build an audio visualizer using Web Audio API.

Features:
- File upload for MP3/WAV audio
- Play/Pause/Stop controls
- Volume slider
- Playback progress bar with current time / duration
- Real-time visualizations:
  - Frequency bars (32 bars, spectrum analyzer style)
  - Waveform display (oscilloscope)
- Color theme toggle (blue, purple, rainbow)

Web Audio API setup:
- AudioContext
- createMediaElementSource for audio element
- AnalyserNode for FFT data
- getByteFrequencyData for bars
- getByteTimeDomainData for waveform

Canvas rendering with requestAnimationFrame loop. CRITICAL: cleanup animation frame and disconnect audio nodes in useEffect return. Icons: Play, Pause, Square, Volume2, Upload from lucide-react.
```

---

### 19. Dynamic Form Builder

**Card Title**: 📋 Form Builder

**Prompt**:
```
Create a drag-and-drop form builder with live preview.

Field Types: Text, Email, Number, Textarea, Checkbox, Radio, Select, Date

Features:
- Field palette on left (drag to add)
- Form canvas in center (reorder by drag)
- Field properties panel on right:
  - Label, Placeholder, Required toggle
  - Options list (for Select/Radio)
- Delete field button
- Preview mode toggle (switches to functional form)
- Form validation in preview (required fields, email format)
- Export as JSON schema button
- Import from JSON

Use HTML5 drag-drop (simpler than libraries) or state-based drag simulation. Schema structure: { fields: [{ type, label, placeholder, required, options }] }. Icons: Plus, Trash2, GripVertical, Eye, Code, Download, Upload from lucide-react.
```

---

### 20. Investment Portfolio Tracker

**Card Title**: 💰 Portfolio Tracker

**Prompt**:
```
Build a stock portfolio tracker with charts and gain/loss calculations.

Features:
- Add holding form: ticker symbol (1-5 uppercase letters), shares, purchase price, purchase date
- Holdings table showing:
  - Symbol, Shares, Purchase Price, Current Price (mock), Gain/Loss $, Gain/Loss %
  - Green for gains, red for losses
  - Delete button
- Portfolio summary cards:
  - Total Value, Total Gain/Loss, Today's Change, Best Performer
- Charts (Recharts):
  - LineChart: 30-day portfolio value trend
  - PieChart: Allocation by stock
  - BarChart: Individual stock performance comparison

Generate mock current prices (purchase price ± 20% random). Generate 30-day historical data by adding daily variations. Calculate: gain = (current - purchase) × shares, gain% = ((current - purchase) / purchase) × 100.

Start with 4 sample holdings: AAPL, GOOGL, MSFT, TSLA. Icons: Plus, Trash2, TrendingUp, TrendingDown, DollarSign from lucide-react.
```

---

## Technical Notes

### Sandpack Constraints

All prompts are optimized for Sandpack's whitelisted packages:

| Category | Packages |
|----------|----------|
| Animation | `framer-motion` |
| Charts | `recharts` |
| Icons | `lucide-react` |
| UI | `@radix-ui/react-dialog`, `@radix-ui/react-tabs` |

### Anti-Patterns Avoided

- ❌ No `@/components/ui/*` imports
- ❌ No empty initial states
- ❌ No mutation of state arrays
- ❌ No unlisted npm packages
- ❌ No CSS modules or styled-components

### Prompt Design Principles

1. **Specificity**: Exact API endpoints, response shapes, and data structures
2. **Sample Data**: Every prompt mandates initial data - never empty states
3. **Library Precision**: Named components from whitelisted packages
4. **State Architecture**: Explicit state variable names and types
5. **Immutability Hints**: Critical reminders about array/object updates
6. **Visual Requirements**: Specific Tailwind classes and layout patterns

---

## Document Version

**Version**: 1.0
**Last Updated**: 2026-01-21
**Maintained By**: Vana Development Team
