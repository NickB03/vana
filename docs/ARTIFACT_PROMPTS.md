# Artifact Generation Prompts

> **Complete prompt library for generating artifacts via the carousel cards.**
>
> These prompts are designed to produce high-quality, working artifacts when sent to the LLM. Each prompt includes specific constraints for Sandpack compatibility.

---

## Table of Contents

1. [React Games (5)](#react-games)
2. [React Data Visualizations (5)](#react-data-visualizations)
3. [React Web Applications (5)](#react-web-applications)
4. [Image Generation (5)](#image-generation)
5. [HTML Artifacts (5)](#html-artifacts)
6. [Markdown Documents (5)](#markdown-documents)
7. [SVG Graphics (5)](#svg-graphics)
8. [Code Snippets (5)](#code-snippets)
9. [Mermaid Diagrams (5)](#mermaid-diagrams)

---

## React Games

### 1. Frogger Game
**ID:** `game-1`

**Summary:** React Frogger with HTML5 Canvas: arrow keys, traffic lanes, lily pads, collision detection, lives, progressive difficulty

**Prompt:**
```
Build a React artifact game using useState for all state. NO external libraries or npm imports (instant rendering). Context: Classic arcade Frogger remake. Rendering: HTML5 Canvas for game graphics (600x400px). Controls: Arrow keys for movement (up/down/left/right). Game Mechanics: Player frog starts at bottom, must cross 3 traffic lanes with cars moving at different speeds (use setInterval for animation loop at 60fps), then hop across water on lily pads to reach goal at top. Collision: Hit by car OR fall in water = lose 1 life, player respawns at start. Lives: Start with 3 hearts displayed as '♥' symbols, game over when all lost. Scoring: +10 points per row advanced, +50 bonus for reaching goal. Progression: Each level increases car speed by 20%. Visual: Retro pixel art using filled rectangles - green frog (#22C55E), gray road (#374151), blue water (#3B82F6), brown lily pads (#92400E), colorful cars (red/blue/yellow). UI: Score, lives, and level displayed in fixed header div above canvas. Game Over: When lives=0, show centered overlay div with final score, 'Game Over!' text, and 'Restart' button that resets all state. State Management: Use useState for: position, lives, score, level, gameOver, cars array (with x, y, speed, color properties). Immutability: CRITICAL - when updating cars array, use .map() to return new array, never mutate existing array directly. Sample Data: Start with 6 cars at varied positions.
```

---

### 2. Snake Game
**ID:** `game-2`

**Summary:** React Snake game: WASD/arrow controls, food collection grows snake, collision detection, score tracking, neon aesthetic

**Prompt:**
```
Build a React artifact game using Canvas API and useState. NO npm imports (instant rendering). Context: Classic Snake game. Rendering: HTML5 Canvas (400x400px) with 20x20 grid (20px cells). Controls: Arrow keys for direction (up/down/left/right). Game Loop: Use setInterval at 150ms for snake movement. Mechanics: Snake starts as 3-segment line, moves continuously in current direction, eating food (randomly placed red square) adds 1 segment to tail, collision with wall edges OR own body = game over. Scoring: +10 points per food eaten. Speed: Decrease interval by 10ms every 5 foods (faster gameplay). Visual: Dark background (#0F172A), neon green snake (#22C55E) with lighter head (#4ADE80), bright red food (#EF4444), grid lines (#1E293B). UI: Score counter and 'Game Over' overlay with Restart button displayed above canvas. State: Use useState for snake array (array of {x,y} positions), food position {x,y}, direction ('up'/'down'/'left'/'right'), score, gameOver boolean. Immutability: When growing snake, use spread operator to create new array [...snake, newSegment]. Sample Setup: Snake starts at center moving right, food at random position. Keep it simple - no high score persistence, no pause, no particles.
```

---

### 3. Memory Match
**ID:** `game-3`

**Summary:** React memory game: CSS flip animations, emoji cards, difficulty levels, move counter, timer, win celebration

**Prompt:**
```
Build a React artifact game using useState and CSS animations. NO external animation libraries. Context: Memory card matching game. Layout: 4x4 grid of cards (16 cards, 8 pairs) using CSS Grid. Content: 8 colorful emoji pairs (🎨🎮🎵🎯🚀🌟💎🔥 - each appears twice). Card Flip: Use CSS transform rotateY(180deg) with transition (transition-transform duration-500), card has front (gradient background) and back (emoji). Game State: Track flipped cards, matched pairs, moves, time. Mechanics: Click card → flip to show emoji, if 2 flipped and match → keep visible + add success border, if no match → flip both back after 1s delay, increment move counter each pair attempt. Difficulty Buttons: 3 buttons at top (Easy/Medium/Hard) that reset game with Easy=8 cards (4 pairs), Medium=16 cards (8 pairs), Hard=24 cards (12 pairs). Timer: Start on first click, display elapsed seconds. Win Condition: All pairs matched → show overlay with 'You Won!', moves taken, time, and Restart button. Styling: Cards as squares (w-24 h-24) with gradient backs (bg-gradient-to-br from-purple-500 to-pink-500), matched cards get green border, hover effect (scale-105). State: Use useState for cards array (id, emoji, isFlipped, isMatched), selected cards, moves, seconds, gameWon. Immutability: Use .map() to create new cards array when flipping. Sample Setup: Shuffle emoji pairs randomly on start.
```

---

### 4. Trivia Quiz
**ID:** `game-4`

**Summary:** React trivia game: 10 built-in questions, multiple choice, visual feedback, timer, 50/50 lifeline, results screen

**Prompt:**
```
Build a React artifact game using useState and CSS transitions. NO external libraries, NO Framer Motion. Context: Interactive trivia quiz. Task: Create a 10-question multiple choice quiz with visual feedback. Sample Data: MUST include these 10 trivia questions with answers in the component: 1) What planet is known as the Red Planet? (Mars, Venus, Jupiter, Saturn) - Mars, 2) Who painted the Mona Lisa? (Picasso, Da Vinci, Van Gogh, Monet) - Da Vinci, 3) What is the largest ocean on Earth? (Atlantic, Indian, Arctic, Pacific) - Pacific, 4) In what year did the Titanic sink? (1905, 1912, 1920, 1931) - 1912, 5) What is the chemical symbol for gold? (Go, Gd, Au, Ag) - Au, 6) Which country hosted the 2016 Olympics? (China, UK, Brazil, Japan) - Brazil, 7) What is the capital of Australia? (Sydney, Melbourne, Canberra, Perth) - Canberra, 8) How many bones are in the adult human body? (186, 206, 226, 246) - 206, 9) Who wrote Romeo and Juliet? (Dickens, Shakespeare, Austen, Hemingway) - Shakespeare, 10) What is the smallest prime number? (0, 1, 2, 3) - 2. Features: Display question text and 4 answer buttons in 2x2 grid, correct answer turns green (bg-green-500) with CSS transition, wrong turns red (bg-red-500), 1s pause before auto-advancing, progress bar showing question X of 10, score counter, 15-second countdown timer per question (auto-advance when expired), 50/50 button (removes 2 wrong answers, usable once per game), Skip button (moves to next, counts as wrong). Results screen shows score (7/10), percentage (70%), letter grade (A=90+, B=80+, C=70+, D=60+, F<60), Play Again button. UI: Question card centered, 4 answer buttons grid-cols-2, timer bar at top shrinking, progress dots, score display. Styling: Tailwind CSS - cards shadow-lg rounded-xl p-6, buttons hover:scale-105 transition-transform, timer bar with transition-all duration-1000. State: Use useState for currentQuestion (number), score (number), selectedAnswer (string|null), showResult (boolean), timeLeft (number), usedFiftyFifty (boolean), availableAnswers (string[]). Immutability: When updating answers for 50/50, use .filter() to create new array. Keep it simple - CSS transitions only, no confetti, no sound effects, no localStorage.
```

---

### 5. Tic Tac Toe AI
**ID:** `game-5`

**Summary:** React Tic Tac Toe: minimax AI opponent, 3 difficulty levels, win detection, multi-round scoring, CSS animations

**Prompt:**
```
Build a React artifact game using useState and CSS transitions. NO external libraries, NO Framer Motion. Context: Tic-tac-toe with AI opponent. Task: Create a playable game with minimax AI and difficulty selection. Sample Data: Start with empty 9-cell board (array of 9 empty strings), scores initialized to {wins: 0, losses: 0, draws: 0}. Board: 3x3 grid using CSS Grid (grid-cols-3 gap-2), each cell is button (w-20 h-20 text-4xl font-bold border-2 rounded-lg). Players: User is X (text-blue-500), AI is O (text-red-500). AI Logic: Implement minimax algorithm - Easy mode returns random empty cell, Medium mode has 50% chance of optimal move vs random, Impossible mode always uses full minimax (unbeatable). Features: 3 difficulty buttons at top (Easy/Medium/Impossible) that reset game on change, win detection checks 8 conditions (3 rows, 3 columns, 2 diagonals) after each move, draw detection when board full with no winner, score tracking (Wins/Losses/Draws) persists across rounds in state, Reset button starts new round. Game Flow: User clicks empty cell to place X, check for win/draw, if game continues AI calculates and places O after 300ms delay (setTimeout), check for win/draw, repeat until game ends. Win Display: Winning line cells get bg-green-200, show centered overlay div with message ('You Win!' / 'AI Wins!' / 'Draw!') and New Game button. UI: Title 'Tic Tac Toe', difficulty buttons row, 3x3 board centered, score cards row (grid-cols-3) showing Wins/Losses/Draws, Reset button. Styling: Tailwind CSS - cells bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors, winning cells bg-green-200, active difficulty button bg-blue-500 text-white, inactive bg-gray-200. State: Use useState for board (string[] of 9), winner (string|null), difficulty (string), scores ({wins, losses, draws}), gameActive (boolean). Immutability: CRITICAL - use board.map((cell, i) => i === index ? player : cell) to update board, never mutate directly. Keep it working - CSS transitions only, no confetti, no sound effects.
```

---

## React Data Visualizations

### 6. Sales Dashboard
**ID:** `data-viz-1`

**Summary:** React sales analytics: Recharts multi-line revenue trends, donut chart by category, top products bar chart, KPI cards

**Prompt:**
```
Build a React artifact using Recharts (pre-loaded CDN library, instant rendering). Context: Business intelligence dashboard. Task: Create a sales analytics visualization with sample data. Library: Use Recharts exclusively for all charts (import from 'recharts'). Charts: 1) LineChart with 2 lines showing monthly revenue trends for 2024 and 2025 (12 months each with realistic sample data), 2) PieChart showing sales distribution across 5 product categories (Electronics 35%, Clothing 25%, Food 20%, Books 12%, Other 8%), 3) BarChart showing top 5 products with sales values. KPIs: 4 stat cards in grid showing total revenue ($2.4M), growth (+15.3% with green ↑), avg order ($85), total orders (28,235). Interactions: 3 button toggle group for time range (Monthly/Quarterly/Yearly) that updates LineChart data, Recharts built-in tooltips on all charts. Styling: Professional dashboard with Tailwind CSS - cards with white bg, subtle shadows (shadow-md), rounded corners (rounded-lg), gradient accent colors (#3B82F6 to #8B5CF6). Layout: CSS Grid with 4 KPI cards at top (grid-cols-4), then 3 charts in row below (grid-cols-3). State: Use useState for time range selection. Sample Data: MUST include realistic monthly data arrays, never show empty states. Immutability: When filtering/transforming data, use .map()/.filter() to create new arrays.
```

---

### 7. Weather Dashboard
**ID:** `data-viz-2`

**Summary:** React weather viz: Recharts 7-day temp/precipitation charts, tooltips, UV gauge, dynamic gradient background

**Prompt:**
```
Build a React artifact using Recharts (pre-loaded CDN library, instant rendering) and Tailwind CSS. Context: Weather forecast visualization with sample data. Task: Create an interactive weather dashboard. Library: Recharts for all charts (import from 'recharts'). Sample Data: MUST include 7 days of weather data with realistic temperatures (°F), precipitation (inches), and conditions. Charts: 1) AreaChart showing 7-day temperature forecast with high/low values (gradient fill from #FCD34D to #F59E0B), 2) BarChart for daily precipitation (blue bars #3B82F6), 3) Simple radial progress indicator for UV index (0-11 scale, color-coded: 0-2 green, 3-5 yellow, 6-7 orange, 8+ red). Data Structure: Array of 7 objects with {day, high, low, precipitation, condition, uvIndex}. Interactions: Recharts built-in tooltips showing detailed info on hover, click day card to highlight (border change). Visual: Dynamic gradient background using Tailwind classes based on current condition - Sunny: bg-gradient-to-br from-yellow-400 to-orange-500, Rainy: from-blue-400 to-gray-600, Cloudy: from-gray-400 to-gray-600. Weather icons: Use Unicode symbols (☀️ sunny, ☁️ cloudy, 🌧️ rain). Layout: Header with city name 'San Francisco' and current temp, 3 charts in grid below (grid-cols-3), day cards at bottom showing week summary. State: Use useState for selected day. Immutability: When updating, use spread operator for new objects. Keep it working - no external icon libraries.
```

---

### 8. Stock Portfolio
**ID:** `data-viz-3`

**Summary:** React stock tracker: Recharts price charts, allocation pie, multi-stock comparison, gain/loss indicators, button tabs

**Prompt:**
```
Build a React artifact using Recharts (import from 'recharts'). NO local imports, NO @/ imports, NO Radix UI. Context: Investment portfolio tracking dashboard. Task: Create a stock portfolio visualization with sample data. Sample Data: MUST include 5 stocks (AAPL at $178, GOOGL at $141, MSFT at $378, AMZN at $178, NVDA at $495) with 30 days of historical price data each, shares owned (50, 30, 25, 40, 20), and purchase prices ($150, $120, $320, $145, $380) - never show empty states. Features: Portfolio summary cards showing total value ($52,450), daily change (+$856 / +1.65%), holdings table with stock symbol, shares, avg cost, current price, gain/loss amount, gain % (color coded green/red), 3 button group to switch views. Charts: 1) Recharts ComposedChart with bars for daily volume and line for closing price for selected stock, 2) Recharts LineChart comparing all 5 stocks normalized to % change over 30 days, 3) Recharts PieChart showing portfolio allocation by stock with percentages. UI: Button group at top (Overview/Performance/Allocation) - active button has bg-blue-600 text-white, inactive has bg-gray-100 text-gray-700. State: Use useState for activeView string ('overview'|'performance'|'allocation'), selectedStock string for chart detail. Immutability: CRITICAL - when updating any data, use .map() to create new arrays, never mutate directly. Styling: Tailwind CSS - financial dark theme bg-slate-900 text-white, cards bg-slate-800 rounded-lg p-4, text-green-400 for gains, text-red-400 for losses, grid-cols-5 for stock summary cards. Layout: Header with portfolio value, button group, main chart area, holdings table below. Keep it simple - no Radix UI Tabs, no animated counters, no setInterval updates, no localStorage.
```

---

### 9. Habit Tracker
**ID:** `data-viz-4`

**Summary:** React habit tracker: calendar heat map, Recharts progress charts, streak counter, completion stats

**Prompt:**
```
Build a React artifact using Recharts (import from 'recharts') and Tailwind CSS. NO D3, NO local imports. Context: Personal habit tracking with sample data. Task: Create a habit visualization dashboard. Sample Data: MUST include 30 days of habit completion data for 3 habits (Exercise, Read, Meditate) with realistic completion patterns. Visualizations: 1) Simple calendar heat map using CSS Grid - 7 columns (days of week), 5 rows (weeks), each cell colored based on habits completed that day (0=gray, 1=light green, 2=green, 3=dark green). Build this with divs, NOT D3. 2) RadialBarChart from Recharts showing completion rate % for each of 3 habits, 3) BarChart showing weekly completion totals. Features: Streak counter showing current streak with 🔥 emoji (e.g., '7🔥 Day Streak!'), habit checklist for today with checkboxes to mark complete, completion stats cards (Total: 45, Best Streak: 12, This Week: 18). Interactions: Click calendar day to highlight, check habit to update today's data. Layout: Header with stats cards in row (grid-cols-3), calendar heat map in center, charts below (grid-cols-2), today's checklist sidebar. Styling: Motivational green/blue color scheme, cards with shadows. State: Use useState for habits array and completions object. Data Structure: completions = {'2024-01-01': ['Exercise', 'Read'], '2024-01-02': ['Exercise', 'Meditate', 'Read']}. Immutability: Use spread to update completions. Keep it working - CSS Grid calendar, no complex D3.
```

---

### 10. Analytics Dashboard
**ID:** `data-viz-5`

**Summary:** React web analytics: Recharts visitor traffic area, conversion funnel bar, device breakdown pie, KPI cards, time filters

**Prompt:**
```
Build a React artifact using Recharts (import from 'recharts') and Tailwind CSS. NO D3, NO geographic maps, NO local imports. Context: Website analytics dashboard. Task: Create a web analytics visualization with traffic, conversion, and device data. Sample Data: MUST include - 30 days of daily data: array of objects {date: 'Jan 1', visitors: 1250, pageViews: 3200, bounceRate: 42}, {date: 'Jan 2', visitors: 1340, pageViews: 3450, bounceRate: 38}... with realistic variation; Conversion funnel: {views: 10000, clicks: 3500, signups: 890, purchases: 234}; Device breakdown: [{device: 'Desktop', value: 58, color: '#3B82F6'}, {device: 'Mobile', value: 35, color: '#8B5CF6'}, {device: 'Tablet', value: 7, color: '#EC4899'}]; Engagement: {avgTimeOnSite: '2:45', pagesPerSession: 3.2, returningVisitors: 34} - never show empty states. Charts (Recharts only): 1) AreaChart for visitor traffic over 30 days with gradient fill (linearGradient from #3B82F6 to transparent), 2) BarChart showing conversion funnel (4 horizontal bars: Views 10K, Clicks 3.5K, Signups 890, Purchases 234 with decreasing widths), 3) PieChart for device breakdown with percentage labels. Features: 4 time range filter buttons (Today/Week/Month/Year) that filter the area chart data, 4 KPI cards at top showing Total Visitors (32,450), Page Views (89,200), Bounce Rate (41% with down arrow in green), Avg Session (2:45). UI: Header with 'Analytics Dashboard' title, time filter buttons row, KPI cards (grid-cols-4), AreaChart full width, BarChart and PieChart side by side (grid-cols-2). Styling: Tailwind CSS - cards bg-white shadow-md rounded-xl p-4, blue/purple color scheme (#3B82F6, #8B5CF6), trend arrows (text-green-500 for positive, text-red-500 for negative), active filter button bg-blue-500 text-white. State: Use useState for timeRange (string), derive filtered data based on selection. Immutability: When filtering data, use .filter()/.slice() to create new arrays. Keep it simple - no real-time updates, no sparklines, no geographic heat maps, no complex animations.
```

---

## React Web Applications

### 11. Todo List App
**ID:** `web-app-1`

**Summary:** React todo app: add/edit/delete tasks, priority badges, category filters, completion tracking, clean interface

**Prompt:**
```
Build a React artifact using Tailwind CSS only (instant rendering). NO npm imports. Context: Personal productivity tool. Task: Create a modern todo list application with sample tasks. Features: Add new tasks via input field + button, click task text to mark complete (line-through text, gray color), delete button (× symbol) per task, 3 priority levels with colored badges (High=red bg, Medium=yellow bg, Low=green bg shown as pills), 3 category filter buttons at top (All/Work/Personal) to show/hide tasks. Sample Data: START with 5 sample tasks already in list covering different priorities and categories. UI Layout: Header with 'My Tasks' title, category filter buttons in row, add task form (input + priority select + Add button), task list below. Each task card shows: checkbox for complete, task text, priority badge, category label, delete button. Styling: Clean modern UI with Tailwind - white cards (bg-white), shadows (shadow-sm), rounded corners (rounded-lg), hover effects (hover:shadow-md). State Management: Use useState for tasks array (each task: {id, text, priority, category, completed}). Immutability: When updating tasks, ALWAYS create new array using .map()/.filter(), never mutate directly. NO drag-and-drop, NO date picker, NO external libraries - keep it simple and working.
```

---

### 12. Nutrition Tracker
**ID:** `web-app-2`

**Summary:** React protein/macro tracker: meal logging, SVG progress rings, text search, Recharts weekly trends

**Prompt:**
```
Build a React artifact using Recharts (import from 'recharts'). NO local imports, NO @/ imports. Context: Fitness and nutrition tracking application. Task: Create a protein and macro nutrition tracker. Sample Data: MUST include 8 sample meals across 3 days with realistic data (e.g., 'Grilled Chicken Breast' 165 cal, 31g protein, 3.6g fat, 0g carbs; 'Greek Yogurt' 100 cal, 17g protein, 0.7g fat, 6g carbs) - never show empty states. Features: Inline meal logging form (name input, protein/carbs/fats number inputs, Add button), macro breakdown showing daily totals vs goals (Protein: 150g, Carbs: 200g, Fats: 65g), meal history list with meal name, macros, and delete button (× symbol), simple text filter to search meals by name. UI: Circular progress rings built with SVG circles (stroke-dasharray for progress), Recharts LineChart showing 7-day protein intake trends. Charts: Recharts LineChart with days on X-axis, protein grams on Y-axis, single line with dot markers. State: Use useState for meals array ({id, name, protein, carbs, fats, date}), goals object ({protein: 150, carbs: 200, fats: 65}), searchQuery string. Immutability: CRITICAL - when updating meals array, use .filter() to delete, spread operator to add, never mutate directly. Styling: Tailwind CSS - cards with bg-white shadow-md rounded-lg p-4, progress rings with gradient strokes (protein=#22C55E green, carbs=#3B82F6 blue, fats=#F59E0B amber), grid-cols-3 for macro cards. Keep it simple and working - no localStorage, no complex animations, no external food API.
```

---

### 13. Budget Tracker
**ID:** `web-app-3`

**Summary:** React finance tracker: expense entry form, spending categories, visual budgets, Recharts pie chart, transaction list

**Prompt:**
```
Build a React artifact using Recharts (import from 'recharts') and Tailwind CSS. NO local imports. Context: Personal finance management with sample data. Task: Create a budget tracking application. Sample Data: MUST include 10 sample transactions across 4 categories (Food, Transport, Entertainment, Bills) with dates, amounts, descriptions. Features: Inline expense entry form (amount input, category dropdown using native <select>, description, Add button), categorized spending with monthly budget limits (Food: $500, Transport: $300, Entertainment: $200, Bills: $800), visual progress bars showing spent/remaining for each category (use div with width percentage, green when under budget, red when over), transaction history table with columns (Date, Category, Amount, Description, Delete button). Charts: Recharts PieChart showing spending breakdown by category with percentages. Download: Simple button that creates CSV string and triggers download using anchor tag with data URI. Styling: Professional dashboard - white cards, shadows, rounded corners, color-coded categories (Food=orange, Transport=blue, Entertainment=purple, Bills=gray). Layout: Header with total budget card, add form, category progress cards grid (grid-cols-2), pie chart, transaction table. State: Use useState for transactions array and budgets object. Immutability: Use .filter() to delete, spread to add new transactions. Keep it simple - inline form, native select, no complex modals.
```

---

### 14. Recipe Manager
**ID:** `web-app-4`

**Summary:** React recipe book: inline add form, ingredient checklists, serving calculator, cuisine filters, expandable cards

**Prompt:**
```
Build a React artifact using Tailwind CSS only. NO local imports, NO @/ imports, NO Radix UI, NO npm packages except React. Context: Digital cookbook application. Task: Create a recipe management system with sample data. Sample Data: MUST include 6 sample recipes with full details - 'Spaghetti Carbonara' (Italian, 4 servings, 30min, ingredients: 400g spaghetti, 200g pancetta, 4 eggs, 100g parmesan, black pepper; steps: boil pasta, fry pancetta, mix eggs and cheese, combine), 'Chicken Tacos' (Mexican, 4 servings), 'Pad Thai' (Asian, 2 servings), 'Classic Burger' (American, 4 servings), 'Margherita Pizza' (Italian, 2 servings), 'Beef Stir Fry' (Asian, 3 servings) - never show empty states. Features: Recipe cards in grid showing name, cuisine badge, servings, cook time, and image placeholder (colored div with food emoji 🍝🌮🍜🍔🍕🥘), inline add recipe form (shown/hidden with toggle button, NOT modal) with name, cuisine select, servings, ingredients textarea, steps textarea, cuisine filter buttons (All/Italian/Mexican/Asian/American), click recipe card to expand showing ingredients with checkboxes and numbered steps, serving adjuster (+/- buttons) that multiplies ingredient quantities. UI: Cuisine filter as button group (active=bg-orange-500 text-white), collapsible add form div, expanded recipe as card section. State: Use useState for recipes array ({id, name, cuisine, servings, cookTime, ingredients: string[], steps: string[]}), selectedRecipeId, filterCuisine, showAddForm, servingMultiplier. Immutability: CRITICAL - use .filter() to delete, .map() to update, spread to add recipes. Styling: Tailwind CSS - warm palette bg-orange-50 page, cards bg-white shadow-md rounded-lg hover:shadow-lg transition-shadow, cuisine colors (Italian=#EF4444, Mexican=#22C55E, Asian=#F59E0B, American=#3B82F6), grid-cols-3 for recipe cards. Keep it simple - no Radix Dialog, no audio alerts, no countdown timer, no localStorage, no external images.
```

---

### 15. Workout Logger
**ID:** `web-app-5`

**Summary:** React workout tracker: inline exercise form, muscle group filters, sets/reps/weight inputs, Recharts progress chart

**Prompt:**
```
Build a React artifact using Recharts (import from 'recharts') and Tailwind CSS. NO Radix UI, NO Framer Motion, NO localStorage. Context: Gym workout tracking application. Task: Create a simple workout logger with exercise tracking and progress visualization. Sample Data: MUST include 5 sample workout sessions: Jan 1 - Bench Press (3x10x135lb), Squats (3x8x185lb), Rows (3x10x95lb); Jan 3 - Deadlift (3x5x225lb), Overhead Press (3x8x85lb), Pullups (3x8xBW); Jan 5 - Bench Press (3x10x140lb), Squats (3x8x195lb), Lunges (3x10x50lb); Jan 8 - Deadlift (3x5x235lb), Overhead Press (3x8x90lb), Chin-ups (3x10xBW); Jan 10 - Bench Press (3x10x145lb), Squats (3x8x205lb), Rows (3x12x100lb) - never show empty states. Features: Inline add workout form (date input, exercise name, sets/reps/weight number inputs, Add button), workout history list grouped by date, filter buttons for muscle groups (All/Push/Pull/Legs), delete entry button (× symbol). Charts: Recharts LineChart showing weight progression for selected exercise over time, native HTML <select> dropdown to choose which exercise to chart. UI: Header with 'Workout Logger' title, inline form row at top, muscle group filter buttons (active=bg-blue-500 text-white), workout history cards, chart at bottom. Styling: Tailwind CSS - cards bg-white shadow-md rounded-lg p-4, form inputs border rounded px-3 py-2, hover effects on cards. State: Use useState for workouts array ({id, date, exercise, sets, reps, weight, muscleGroup}), selectedExercise (string), activeFilter (string). Immutability: CRITICAL - use .filter() to delete, spread operator to add new workouts, .map() for any updates. Keep it simple - no PR tracking, no achievement badges, no rest timer, no calendar view, no Radix UI.
```

---

## Image Generation

### 16. Retro Character Art
**ID:** `img-gen-1`

**Summary:** Pixel art image: Pikachu in banana costume on tropical beach with palm trees, 16-bit aesthetic, yellow/orange palette

**Prompt:**
```
Generate an image. Context: Creating retro gaming fan art. Task: Pikachu character wearing a full banana costume. Setting: Sunny tropical beach with palm trees and coconuts in background. Style: 16-bit pixel art aesthetic. Colors: Bright yellow and orange dominant palette. Quality: Crisp pixel definition, nostalgic gaming feel.
```

---

### 17. Cyberpunk Cityscape
**ID:** `img-gen-2`

**Summary:** Futuristic city at sunset: neon skyscrapers, flying cars with light trails, holographic ads, rain-slicked streets

**Prompt:**
```
Generate an image. Context: Concept art for cyberpunk game. Task: Create a breathtaking city scene. Time: Golden hour sunset. Elements: Neon-lit skyscrapers, flying cars leaving light trails, holographic billboards, rain-slicked streets reflecting lights. Colors: Purple and pink neon dominance. Composition: Cinematic wide angle. Mood: Dystopian but beautiful.
```

---

### 18. Fantasy Warrior
**ID:** `img-gen-3`

**Summary:** Elven warrior in glowing silver armor with runes, enchanted forest with bioluminescent plants, ethereal atmosphere

**Prompt:**
```
Generate an image. Context: Fantasy RPG character portrait. Task: Female elven warrior in mystical forest. Armor: Luminescent silver with ancient glowing runes. Environment: Enchanted forest with bioluminescent plants, magical fireflies, ethereal mist. Lighting: Dramatic rim lighting from behind. Style: Photorealistic fantasy art. Atmosphere: Magical and mysterious.
```

---

### 19. Sci-Fi Movie Poster
**ID:** `img-gen-4`

**Summary:** Movie poster 'Silicon Awakening': massive AI computer core with glowing circuits, human silhouettes, storm clouds

**Prompt:**
```
Generate an image. Context: Promotional poster for AI thriller movie. Title: 'Silicon Awakening'. Main Element: Massive quantum computer core with glowing blue circuits. Foreground: Silhouettes of people looking up. Background: Ominous storm clouds. Typography: Bold, futuristic title treatment. Color Grading: Dark moody tones with electric blue accents. Style: Professional movie poster aesthetic.
```

---

### 20. Product Photography
**ID:** `img-gen-5`

**Summary:** Premium smartwatch with holographic display showing health data, titanium/rose gold, floating with studio lighting

**Prompt:**
```
Generate an image. Context: Luxury tech product advertisement. Product: Modern smartwatch with holographic transparent display. Display Content: Health metrics and vital signs. Materials: Curved sapphire glass, titanium body, rose gold accents. Presentation: Floating in space (no background). Lighting: Soft professional studio lighting. Quality: 8K resolution, premium product photography aesthetic. Mood: Futuristic and luxurious.
```

---

## HTML Artifacts

### 21. Parallax Landing Page
**ID:** `html-1`

**Summary:** HTML landing page: parallax scrolling hero, CSS keyframe animations, floating CTA buttons, gradient sections, smooth scroll navigation

**Prompt:**
```
Build an HTML artifact. Context: Modern SaaS product landing page. Structure: Hero section with parallax background layers (CSS transform on scroll), feature cards grid, testimonial carousel, pricing section, footer with newsletter signup. Features: Smooth scroll navigation anchors, floating call-to-action button with pulse animation, animated counter stats on scroll into view, mobile hamburger menu toggle. Styling: CSS Grid and Flexbox layout, gradient backgrounds (purple to blue), glassmorphism cards with backdrop-filter, CSS @keyframes for fade-in and slide-up animations on section entry, custom CSS variables for theming. Interactions: Vanilla JavaScript scroll event listeners for parallax effect, IntersectionObserver for scroll-triggered animations. NO external dependencies - use only vanilla HTML, CSS, JavaScript.
```

---

### 22. Animated Survey Form
**ID:** `html-2`

**Summary:** HTML multi-step form: CSS transitions between steps, progress indicator, validation states, confetti celebration on submit

**Prompt:**
```
Build an HTML artifact. Context: User onboarding survey form. Structure: 4-step wizard (Personal Info, Preferences, Experience, Confirmation) with step indicator dots at top. Features: Form field validation with real-time feedback (red borders for errors, green checkmarks for valid), character counters for text areas, animated progress bar filling as user advances, smooth CSS transitions between steps (slide left/right), keyboard navigation support (Enter to advance). Validation: Required field checks, email format validation, minimum length checks. Styling: Modern card-based form centered on page, soft shadow, rounded inputs with focus glow effect, CSS transitions for all state changes (0.3s ease), gradient submit button with hover scale effect. Final Step: Confetti animation using CSS particles on successful submission, summary of all entered data. NO external dependencies - use only vanilla HTML, CSS, JavaScript.
```

---

### 23. CSS Art Gallery
**ID:** `html-3`

**Summary:** HTML gallery: pure CSS artwork cards, 3D hover flip effects, lightbox modal, masonry grid, animated gradient borders

**Prompt:**
```
Build an HTML artifact. Context: Portfolio showcase for digital artwork. Structure: Masonry-style grid gallery using CSS columns, header with filter buttons by category (Abstract, Nature, Geometric), lightbox modal for enlarged view. Cards: Each artwork card has 3D flip effect on hover revealing artwork description (CSS perspective and rotateY transform), animated gradient borders using CSS background-clip, subtle floating animation using CSS keyframes. Lightbox: Full-screen overlay modal with fade-in animation, close button, navigation arrows for next/previous, keyboard support (Escape to close, arrows to navigate). Artworks: Use CSS gradients and shapes to create 6 abstract art pieces directly in CSS (conic-gradient, radial-gradient, clip-path shapes). Styling: Dark theme with neon accent colors, smooth transitions throughout, focus states for accessibility. NO external dependencies - use only vanilla HTML, CSS, JavaScript.
```

---

### 24. Dynamic Pricing Table
**ID:** `html-4`

**Summary:** HTML pricing table: animated monthly/yearly toggle with savings badge, hover card lift effects, feature comparison tooltips, CTA pulse

**Prompt:**
```
Build an HTML artifact. Context: SaaS subscription pricing page. Structure: Toggle switch for Monthly/Yearly billing (yearly shows savings percentage), 3 pricing tiers (Starter, Pro, Enterprise) as cards, feature comparison matrix below. Cards: Staggered entrance animation on page load using CSS animation-delay, hover effect lifts card with increased shadow (transform: translateY and box-shadow), popular tier has glowing border animation, feature list with checkmarks and X marks. Toggle: Smooth sliding pill animation between Monthly/Yearly, price counter animation when switching (numbers roll up/down effect). Features: Tooltip popups on hover over feature names explaining each feature, sticky header on scroll, responsive design collapsing to vertical on mobile. Styling: Clean white cards on subtle gradient background, accent color for CTAs with pulse animation, CSS custom properties for easy theming, smooth 0.3s transitions. NO external dependencies - use only vanilla HTML, CSS, JavaScript.
```

---

### 25. Interactive Timeline
**ID:** `html-5`

**Summary:** HTML timeline: scroll-triggered milestone animations, alternating layout, progress line fill, expandable details, responsive design

**Prompt:**
```
Build an HTML artifact. Context: Company history or project roadmap timeline. Structure: Vertical timeline with central line, alternating left/right milestone cards, year markers, expandable detail sections. Scroll Animations: Timeline progress line fills as user scrolls (CSS clip-path or scaleY), milestone dots pulse when entering viewport, cards slide in from left or right using IntersectionObserver and CSS transforms, staggered animation timing. Milestones: 8 events with dates, titles, descriptions, and icons (using CSS shapes or Unicode symbols). Interactions: Click milestone to expand showing additional details with smooth height transition, active state highlighting current milestone based on scroll position. Styling: Modern design with subtle gradient background, connecting line with gradient fill, glassmorphism cards with backdrop-filter blur, responsive layout stacking vertically on mobile with all cards aligned left. Accessibility: Focus states, reduced motion media query support. NO external dependencies - use only vanilla HTML, CSS, JavaScript.
```

---

## Markdown Documents

### 26. Project README
**ID:** `markdown-1`

**Summary:** Markdown doc: comprehensive README with badges, installation, usage, API docs, contributing guidelines

**Prompt:**
```
Build a markdown artifact. Context: Open-source project documentation for a TypeScript library. Document Type: Comprehensive README.md. Structure: Start with project name as H1, then shields.io badges row (npm version, build status, coverage, license). Sections: H2 Overview with one-paragraph description, H2 Features as bullet list with emoji icons, H2 Installation with npm/yarn/pnpm code blocks, H2 Quick Start with minimal usage example, H2 API Reference with function signatures in code blocks and parameter tables (Name | Type | Default | Description), H2 Configuration with options table, H2 Examples with multiple code blocks showing common use cases, H2 Contributing with setup steps as numbered list, H2 License. Formatting: Use syntax-highlighted code blocks for all code, tables for structured data, blockquotes for important notes, horizontal rules between major sections. Tone: Professional but approachable, developer-focused.
```

---

### 27. Technical RFC
**ID:** `markdown-2`

**Summary:** Markdown doc: Request for Comments with problem statement, proposed solution, alternatives, risks, timeline

**Prompt:**
```
Build a markdown artifact. Context: Engineering team decision-making document for a new authentication system. Document Type: Technical RFC (Request for Comments). Structure: H1 title with RFC number, metadata table (Author, Status, Created, Updated), H2 Summary with 2-3 sentence overview. Sections: H2 Problem Statement describing current pain points with bullet list, H2 Goals with numbered success criteria, H2 Non-Goals explicitly listing out-of-scope items, H2 Proposed Solution with detailed technical approach using nested H3 subsections and architecture diagram placeholder, H2 Alternatives Considered with pros/cons tables for each option, H2 Security Considerations as bullet list, H2 Risks and Mitigations as two-column table, H2 Implementation Timeline with task list checkboxes and estimated dates, H2 Open Questions as numbered list. Formatting: Use blockquotes for key decisions, code blocks for technical snippets, task lists for action items. Tone: Formal technical writing, objective analysis.
```

---

### 28. Meeting Notes
**ID:** `markdown-3`

**Summary:** Markdown doc: structured meeting notes with attendees, agenda, decisions, action items, follow-ups

**Prompt:**
```
Build a markdown artifact. Context: Weekly engineering team sync meeting documentation. Document Type: Meeting notes template. Structure: H1 with meeting title and date, metadata section with Meeting Type, Duration, and Location. Sections: H2 Attendees with present/absent columns using table format and role annotations, H2 Agenda Items as numbered list with time allocations, H2 Discussion Notes with H3 subsections for each agenda topic containing key points as bullets, H2 Decisions Made as bold statements with rationale in blockquotes, H2 Action Items using task list checkboxes with assignee in brackets and due date, H2 Parking Lot for deferred topics as bullet list, H2 Next Steps with upcoming meeting date and preliminary agenda, H2 Resources/Links as bullet list with markdown links. Formatting: Use tables for structured data, task lists for trackable items, bold for emphasis on owners, blockquotes for direct quotes or key decisions. Tone: Concise and scannable, action-oriented, professional.
```

---

### 29. API Documentation
**ID:** `markdown-4`

**Summary:** Markdown doc: REST API docs with endpoints, parameters, responses, examples, error codes

**Prompt:**
```
Build a markdown artifact. Context: REST API documentation for a user management service. Document Type: API reference documentation. Structure: H1 API title, H2 Base URL with inline code, H2 Authentication section explaining Bearer token with example header code block. Sections: For each endpoint create H2 with HTTP method badge and path, include H3 Description, H3 Request with parameters table (Name | Type | Required | Description), H3 Request Body with JSON code block and field descriptions, H3 Response with JSON code block showing success response, H3 Example using curl code block. Cover endpoints: GET /users, GET /users/:id, POST /users, PUT /users/:id, DELETE /users/:id. Include H2 Error Codes section with table (Code | Message | Description) covering 400, 401, 403, 404, 500. Add H2 Rate Limiting section explaining limits. Formatting: Use code blocks with json and bash syntax highlighting, tables for all structured data, inline code for parameter names. Tone: Technical reference style, precise and unambiguous.
```

---

### 30. React Hooks Cheatsheet
**ID:** `markdown-5`

**Summary:** Markdown doc: quick reference guide with tables, code examples, tips, common patterns, gotchas

**Prompt:**
```
Build a markdown artifact. Context: Developer quick reference for React Hooks. Document Type: Learning cheatsheet for intermediate developers. Structure: H1 title with topic, brief intro paragraph. Sections: H2 Quick Reference Table with columns (Hook | Purpose | Returns | Common Use), H2 useState with syntax code block, example code block, and tips as bullet list, H2 useEffect with syntax, dependency array explanation table, cleanup example code block, H2 useContext with provider pattern code block, H2 useRef with DOM access vs value storage examples, H2 useMemo vs useCallback comparison table (Aspect | useMemo | useCallback), H2 Custom Hooks with naming conventions and example, H2 Common Gotchas as numbered list with incorrect vs correct code blocks, H2 Decision Tree as nested bullet list for choosing hooks, H2 Performance Tips as bullet list with emoji indicators. Formatting: Heavy use of code blocks with jsx highlighting, comparison tables, blockquotes for warnings, bold for key terms. Tone: Friendly and educational, scannable format for quick lookup.
```

---

## SVG Graphics

### 31. Animated Tech Logo
**ID:** `svg-1`

**Summary:** SVG graphic: modern tech company logo with morphing shapes, pulse animations, gradient fills, neon glow effects

**Prompt:**
```
Build an SVG artifact. Context: Modern tech startup brand identity. Subject: Abstract logo combining hexagon shapes that morph and connect. Structure: Use <defs> for gradients and filters, <g> groups for logo parts, <path> for custom shapes. Style: Flat design with gradient fills. Colors: Primary #6366F1 (indigo), secondary #8B5CF6 (violet), accent #06B6D4 (cyan), glow #E0E7FF. Animations: CSS @keyframes for continuous rotation of outer ring (8s), pulse effect on center element (2s ease-in-out infinite), morphing path animation using SMIL <animate> for shape transitions. Viewbox: 0 0 200 200. Include: Drop shadow filter, gradient definitions, 3 concentric geometric shapes, connecting lines that draw on with stroke-dashoffset animation.
```

---

### 32. Isometric Workspace
**ID:** `svg-2`

**Summary:** SVG graphic: 3D isometric office desk scene with computer, plants, geometric shapes, subtle hover animations

**Prompt:**
```
Build an SVG artifact. Context: Modern developer workspace illustration for portfolio. Subject: Isometric 3D-style desk setup with monitor, keyboard, coffee mug, plant, and floating geometric decorations. Structure: Use transform for isometric projection, <g> groups for each object layer (desk, items, decorations). Style: Isometric flat design with subtle shadows. Colors: Desk #1E293B (slate), monitor #0F172A, screen gradient #3B82F6 to #8B5CF6, plant #22C55E, mug #F97316, accents #FBBF24. Animations: CSS @keyframes for floating geometric shapes (translateY 3s ease-in-out infinite alternate), gentle screen glow pulse (4s), plant leaf subtle sway. Viewbox: 0 0 400 300. Include: Layered shadows using semi-transparent fills, code lines on screen using <text>, 4 floating shapes (cube, sphere, pyramid, torus) with staggered animations.
```

---

### 33. Data Infographic
**ID:** `svg-3`

**Summary:** SVG graphic: animated pie chart with segment labels, bar graph with growing bars, percentage counters, clean data viz style

**Prompt:**
```
Build an SVG artifact. Context: Business metrics infographic for presentations. Subject: Multi-chart data visualization with animated pie chart and bar graph. Structure: <defs> for gradients, <g id='pie-chart'> with <path> segments using arc commands, <g id='bar-chart'> with <rect> bars, <text> for labels and values. Style: Clean minimal data visualization with rounded corners on bars. Colors: Segment1 #3B82F6, Segment2 #10B981, Segment3 #F59E0B, Segment4 #EF4444, Segment5 #8B5CF6, background #F8FAFC, text #1E293B. Animations: CSS @keyframes for pie segments drawing in with stroke-dasharray/dashoffset (1.5s ease-out), bar heights growing from 0 (1s ease-out staggered 0.1s each), percentage text counting up effect. Viewbox: 0 0 500 300. Include: 5-segment donut chart with center hole, 6-bar horizontal chart, floating percentage labels, subtle grid lines, legend with color swatches.
```

---

### 34. App Icon Set
**ID:** `svg-4`

**Summary:** SVG graphic: 6 cohesive app icons with consistent style, rounded squares, gradient fills, hover scale animations

**Prompt:**
```
Build an SVG artifact. Context: Mobile app icon design system. Subject: Set of 6 utility app icons (settings gear, notification bell, user profile, search magnifier, home house, heart favorite). Structure: <defs> for shared gradients and filters, 6 separate <g> groups each containing <rect rx='16'> background and <path> icon shape. Style: Flat design with subtle gradient fills, 2px stroke weight for icon paths, rounded square backgrounds. Colors: Gradient pairs - Settings #6366F1/#8B5CF6, Bell #F59E0B/#F97316, User #10B981/#14B8A6, Search #3B82F6/#0EA5E9, Home #EC4899/#F43F5E, Heart #EF4444/#F97316. Animations: CSS @keyframes for hover-like scale transform (1.1x on 3s interval per icon staggered), subtle background pulse, icon path stroke-dasharray draw-in on load. Viewbox: 0 0 400 280. Include: 3x2 grid layout with 20px gaps, drop shadow filter, consistent 64x64 icon containers, white icon paths on gradient backgrounds.
```

---

### 35. Animated Space Scene
**ID:** `svg-5`

**Summary:** SVG graphic: cosmic scene with parallax stars, orbiting planets, shooting stars, nebula gradients, floating astronaut

**Prompt:**
```
Build an SVG artifact. Context: Animated illustration for landing page hero. Subject: Deep space scene with planets, stars, and floating astronaut. Structure: Multiple <g> layers for parallax effect (background stars, mid nebula, foreground planets, astronaut), <defs> for radial gradients and glow filters. Style: Stylized flat space illustration with gradient depth. Colors: Space background #0F0D1A to #1E1B4B gradient, stars #FFFFFF with varying opacity, planet1 #3B82F6/#1E40AF, planet2 #F97316/#EA580C, planet3 #A855F7/#7C3AED, nebula #EC4899 at 20% opacity, astronaut suit #F8FAFC. Animations: CSS @keyframes for star twinkle (opacity 2s random delays), planet orbit rotation (20s/30s/40s linear infinite), shooting star streak across (8s linear infinite), astronaut gentle float (translateY 4s ease-in-out infinite alternate), nebula subtle color shift. Viewbox: 0 0 600 400. Include: 50+ small star circles, 3 planets with ring details, 2 shooting star paths, layered nebula shapes with blur filter, detailed astronaut silhouette with helmet reflection.
```

---

## Code Snippets

### 36. CSV Data Analyzer
**ID:** `code-1`

**Summary:** Python script: pandas-style CSV parsing, statistical analysis (mean/median/std), correlation matrix, formatted report output

**Prompt:**
```
Build a code artifact. Language: Python 3.10+. Context: Data analysis utility for CSV files. Task: Create a comprehensive data analyzer script that processes CSV data and generates statistical insights. Algorithm: Parse CSV with csv module, compute descriptive statistics (count, mean, median, mode, std dev, min, max, quartiles) for numeric columns, calculate correlation coefficients between numeric pairs, detect outliers using IQR method. Input: CSV file path as command-line argument. Output: Formatted text report with aligned columns, section headers, and summary statistics table. Code Organization: Use dataclass for stats results, separate functions for parsing, analysis, and formatting. Include: Detailed docstrings, type hints on all functions, input validation with helpful error messages, example usage in __main__ block.
```

---

### 37. Sorting Visualizer
**ID:** `code-2`

**Summary:** JavaScript sorting algorithms: QuickSort/MergeSort/BubbleSort with step-by-step trace comments, complexity analysis, comparison output

**Prompt:**
```
Build a code artifact. Language: JavaScript ES2022. Context: Educational algorithm demonstration for teaching sorting concepts. Task: Implement three sorting algorithms (QuickSort, MergeSort, BubbleSort) with detailed step-by-step execution traces. Algorithm: Each sort function logs partition/merge/swap operations with array state, includes Big-O complexity comments (time and space), counts comparisons and swaps. Input: Array of numbers passed to each function. Output: Console logs showing each step with before/after states, final sorted array, and performance metrics (comparisons, swaps, time elapsed). Code Organization: Separate function for each algorithm, shared utility for logging and metrics, demo runner comparing all three. Include: JSDoc comments on every function, inline comments explaining algorithm logic at each step, ASCII visualization of current array state during execution.
```

---

### 38. API Client Library
**ID:** `code-3`

**Summary:** TypeScript REST client: generic fetch wrapper, typed responses, exponential backoff retry, request interceptors, error handling

**Prompt:**
```
Build a code artifact. Language: TypeScript 5.0+. Context: Production-ready HTTP client library for REST APIs. Task: Create a type-safe API client with robust error handling and retry logic. Algorithm: Generic fetch wrapper with response type inference, exponential backoff retry (configurable max attempts, base delay, jitter), request/response interceptors for auth headers and logging, circuit breaker pattern for failing endpoints. Input: Base URL, endpoint path, request options (method, body, headers, timeout). Output: Typed response object or structured error with status, message, and retry info. Code Organization: ApiClient class with generic methods (get, post, put, delete), separate interfaces for config/response/error types, RequestInterceptor and ResponseInterceptor types. Include: Comprehensive type definitions, async/await with proper error boundaries, timeout handling with AbortController, example usage demonstrating typed API calls.
```

---

### 39. Web Scraper Tool
**ID:** `code-4`

**Summary:** Python scraper: BeautifulSoup HTML parsing, CSS selectors, rate limiting, structured JSON output, error recovery

**Prompt:**
```
Build a code artifact. Language: Python 3.10+. Context: Web scraping utility following best practices and ethical guidelines. Task: Create a configurable web scraper that extracts structured data from HTML pages. Algorithm: Fetch pages with requests library, parse HTML with BeautifulSoup, extract data using CSS selectors, implement polite crawling with rate limiting (configurable delay between requests), handle pagination, retry failed requests with backoff. Input: Target URL, CSS selectors map (field name to selector), optional pagination selector. Output: JSON array of extracted records, saved to file with timestamp. Code Organization: Scraper class with configurable options, separate methods for fetch/parse/extract/save, custom exceptions for scraping errors. Include: Type hints throughout, robots.txt checking, User-Agent header configuration, progress logging, graceful handling of missing elements, example scraping a sample page structure.
```

---

### 40. Dev Workflow Script
**ID:** `code-5`

**Summary:** Bash automation: git operations, dependency checks, build/test runners, colored output, cross-platform compatibility

**Prompt:**
```
Build a code artifact. Language: Bash (POSIX-compatible with bashisms noted). Context: Developer workflow automation for daily tasks. Task: Create a comprehensive dev helper script that automates common development operations. Features: Git status summary with branch info and uncommitted changes, dependency version checker (node/npm/python/docker), project health check (lint, test, build commands), environment variable validator, port availability checker, log file tailer with grep filtering. Input: Command-line subcommands (status, check, health, logs) with optional flags. Output: Colorized terminal output with status indicators (checkmarks, X marks, warnings), aligned columns, section headers. Code Organization: Functions for each subcommand, shared utilities for colors and formatting, help text generator, error handling with meaningful messages. Include: Shebang and strict mode (set -euo pipefail), comments explaining each section, cross-platform considerations (macOS vs Linux), example invocations in header comment.
```

---

## Mermaid Diagrams

### 41. Microservices Architecture
**ID:** `mermaid-1`

**Summary:** Mermaid diagram: flowchart showing microservices with subgraphs, API gateway, databases, message queues, load balancer

**Prompt:**
```
Build a mermaid artifact. Context: Technical documentation for a distributed e-commerce platform. Diagram Type: flowchart TD (top-down). Subject: Microservices architecture with 6+ services. Elements: Create subgraphs for 'Client Layer' (Web App, Mobile App), 'API Gateway Layer' (Kong/Nginx with rate limiting), 'Services Layer' (User Service, Product Service, Order Service, Payment Service, Notification Service, Inventory Service), 'Data Layer' (PostgreSQL for users/orders, MongoDB for products, Redis for caching, RabbitMQ for async messaging). Relationships: Show request flow from clients through gateway to services, inter-service communication via message queue, database connections. Labels: Include protocol annotations (REST, gRPC, AMQP). Styling: Use different node shapes (rounded for services, cylinder for databases, stadium for queues). Include notes for scalability considerations.
```

---

### 42. OAuth Login Flow
**ID:** `mermaid-2`

**Summary:** Mermaid diagram: sequence diagram for OAuth2 authentication with actors, API calls, token handling, refresh flow, error paths

**Prompt:**
```
Build a mermaid artifact. Context: Security documentation for OAuth2 implementation. Diagram Type: sequenceDiagram. Subject: Complete OAuth2 authorization code flow with refresh tokens. Actors: User (actor), Browser (participant), Frontend App, Auth Server (OAuth Provider), Resource Server (API), Token Store. Sequence: 1) User initiates login, 2) Redirect to auth server with client_id/scope/redirect_uri, 3) User authenticates and grants consent, 4) Auth server redirects with authorization code, 5) Backend exchanges code for tokens (access + refresh), 6) Store tokens securely, 7) API requests with Bearer token, 8) Token expiration and refresh flow. Error Paths: Include alt blocks for invalid credentials, expired tokens, revoked access. Notes: Add note blocks explaining token lifetimes, PKCE for public clients. Styling: Use activate/deactivate for lifelines, loop for token refresh retry.
```

---

### 43. E-Commerce Database
**ID:** `mermaid-3`

**Summary:** Mermaid diagram: ERD for online store with tables, relationships, cardinality, primary/foreign keys, indexes

**Prompt:**
```
Build a mermaid artifact. Context: Database design documentation for an e-commerce platform. Diagram Type: erDiagram. Subject: Complete relational schema for online shopping. Entities (8+ tables): CUSTOMER (id PK, email UK, name, password_hash, created_at), ADDRESS (id PK, customer_id FK, street, city, state, zip, is_default), PRODUCT (id PK, sku UK, name, description, price, category_id FK, stock_qty), CATEGORY (id PK, name, parent_id FK self-ref), ORDER (id PK, customer_id FK, status, total, shipping_address_id FK, created_at), ORDER_ITEM (id PK, order_id FK, product_id FK, quantity, unit_price), PAYMENT (id PK, order_id FK, method, amount, status, transaction_id), REVIEW (id PK, product_id FK, customer_id FK, rating, comment). Relationships: Show cardinality (one-to-many, many-to-many via junction). Include relationship labels like 'places', 'contains', 'belongs_to'. Styling: Use proper ERD notation with PK/FK indicators.
```

---

### 44. GitFlow Branching
**ID:** `mermaid-4`

**Summary:** Mermaid diagram: gitGraph showing feature branches, develop, releases, hotfixes, merge strategies, version tags

**Prompt:**
```
Build a mermaid artifact. Context: Development team onboarding documentation for GitFlow workflow. Diagram Type: gitGraph. Subject: Complete GitFlow branching strategy over a release cycle. Branches: main (production), develop (integration), feature/user-auth, feature/payment-api, release/v1.2.0, hotfix/security-patch. Sequence: 1) Start from main with v1.1.0 tag, 2) Create develop branch, 3) Branch feature/user-auth from develop with 3 commits, 4) Branch feature/payment-api from develop with 2 commits, 5) Merge user-auth to develop, 6) Create release/v1.2.0 from develop, 7) Bug fix commit on release branch, 8) Merge release to main with v1.2.0 tag, 9) Merge release back to develop, 10) Hotfix branch from main for security-patch, 11) Merge hotfix to both main (v1.2.1 tag) and develop. Commit Messages: Use realistic messages like 'Add JWT authentication', 'Integrate Stripe webhook'. Styling: Use meaningful branch colors and clear commit labels.
```

---

### 45. Order State Machine
**ID:** `mermaid-5`

**Summary:** Mermaid diagram: stateDiagram for order processing with states, transitions, guards, actions, parallel states, history

**Prompt:**
```
Build a mermaid artifact. Context: Business logic documentation for order management system. Diagram Type: stateDiagram-v2. Subject: Complete order lifecycle from creation to completion/cancellation. States: [*] initial, Created, PaymentPending, PaymentFailed, Confirmed, Processing (composite state with substates: Picking, Packing, QualityCheck), Shipped, InTransit, Delivered, Returned, Cancelled, Refunded, [*] final. Transitions: Created-->PaymentPending (submit_order), PaymentPending-->PaymentFailed (payment_declined), PaymentPending-->Confirmed (payment_success), Confirmed-->Processing (begin_fulfillment), Processing-->Shipped (dispatch), Shipped-->InTransit (carrier_pickup), InTransit-->Delivered (delivery_confirmed), Delivered-->Returned (return_requested within 30 days). Guards: Add conditions like [stock_available], [payment_valid], [within_return_window]. Actions: Include entry/exit actions like 'send_confirmation_email', 'notify_warehouse', 'update_inventory'. Include note blocks for SLA requirements and retry policies.
```

---

## Quick Reference

| Category | Count | ID Prefix |
|----------|-------|-----------|
| React Games | 5 | `game-*` |
| Data Visualizations | 5 | `data-viz-*` |
| Web Applications | 5 | `web-app-*` |
| Image Generation | 5 | `img-gen-*` |
| HTML Artifacts | 5 | `html-*` |
| Markdown Documents | 5 | `markdown-*` |
| SVG Graphics | 5 | `svg-*` |
| Code Snippets | 5 | `code-*` |
| Mermaid Diagrams | 5 | `mermaid-*` |
| **Total** | **45** | |

---

## Key Constraints for All Prompts

1. **No `@/` imports** - Sandpack sandbox isolation
2. **Whitelisted packages only** - React, Recharts, Framer Motion, Lucide, Radix UI
3. **`export default` required** - For React components
4. **Tailwind CSS only** - No CSS modules or styled-components
5. **Immutability** - Always use `.map()`, `.filter()`, spread operators
6. **Sample data required** - Never show empty states
