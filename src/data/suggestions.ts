export interface SuggestionItem {
  id: string;
  title: string;
  summary: string;
  prompt: string;
  image: string;
  category?: string;
}

export const suggestions: SuggestionItem[] = [
  // Reordered: Artifact-Image-Artifact-Image pattern with Frogger first

  // 1. ARTIFACT: Frogger Game (Featured First)
  {
    id: "game-1",
    title: "Frogger Game",
    summary: "React Frogger with HTML5 Canvas: arrow keys, traffic lanes, lily pads, collision detection, lives, progressive difficulty",
    prompt: "Build a React artifact game. Context: Classic arcade Frogger remake. Rendering: HTML5 Canvas for game graphics. Controls: Arrow keys for movement (up/down/left/right). Game Mechanics: Player frog must cross traffic lanes with cars moving at different speeds, then hop across water on lily pads to reach goal. Collision: Hit by car = lose life, fall in water = lose life. Lives: 3 hearts displayed, game over when all lost. Scoring: Points for forward progress, bonus for speed. Progression: Each level increases car speed. Visual Style: Retro pixel art aesthetic with simple geometric shapes. UI: Lives counter, score display, level indicator, game over modal with restart button using Radix UI Dialog. State: React useState for game state.",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop"
  },
  // 2. IMAGE: Retro Character Art
  {
    id: "img-gen-1",
    title: "Retro Character Art",
    summary: "Pixel art image: Pikachu in banana costume on tropical beach with palm trees, 16-bit aesthetic, yellow/orange palette",
    prompt: "Generate an image. Context: Creating retro gaming fan art. Task: Pikachu character wearing a full banana costume. Setting: Sunny tropical beach with palm trees and coconuts in background. Style: 16-bit pixel art aesthetic. Colors: Bright yellow and orange dominant palette. Quality: Crisp pixel definition, nostalgic gaming feel.",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=300&fit=crop"
  },
  // 3. ARTIFACT: Sales Dashboard
  {
    id: "data-viz-1",
    title: "Sales Dashboard",
    summary: "React sales analytics: Recharts multi-line revenue trends, donut chart by category, top products bar chart, KPI cards",
    prompt: "Build a React artifact. Context: Business intelligence dashboard. Task: Create a sales analytics visualization. Library: Use Recharts exclusively. Charts: 1) Multi-line chart for revenue trends with toggle for monthly/quarterly/yearly views, 2) Donut chart showing sales distribution by product category, 3) Horizontal bar chart for top 10 products. KPIs: Cards showing total revenue, growth percentage, average order value with up/down indicators. Interactions: Date range selector using Radix UI Popover, hover tooltips on all charts. Styling: Professional business dashboard with Tailwind CSS, gradient fills on charts, smooth animations on data updates.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop"
  },
  // 4. IMAGE: Cyberpunk Cityscape
  {
    id: "img-gen-2",
    title: "Cyberpunk Cityscape",
    summary: "Futuristic city at sunset: neon skyscrapers, flying cars with light trails, holographic ads, rain-slicked streets",
    prompt: "Generate an image. Context: Concept art for cyberpunk game. Task: Create a breathtaking city scene. Time: Golden hour sunset. Elements: Neon-lit skyscrapers, flying cars leaving light trails, holographic billboards, rain-slicked streets reflecting lights. Colors: Purple and pink neon dominance. Composition: Cinematic wide angle. Mood: Dystopian but beautiful.",
    image: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&h=300&fit=crop"
  },
  // 5. ARTIFACT: Todo List App
  {
    id: "web-app-1",
    title: "Todo List App",
    summary: "React todo app: drag-and-drop reorder, priority tags, category filters, due dates, Radix UI Dialog, dark mode",
    prompt: "Build a React artifact. Context: Personal productivity tool. Task: Create a modern todo list application. Features: Add/edit/delete tasks, drag-and-drop reordering, color-coded priority badges (high=red, medium=yellow, low=green), category filters (work/personal/health), due date picker. UI Components: Use Radix UI Dialog for add/edit modals, Radix UI Tabs for category switching. State: Use React useState (no localStorage). Styling: Glassmorphism UI with Tailwind CSS, dark mode support. Animations: Smooth completion checkmarks, task deletion fade-out.",
    image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=300&fit=crop"
  },
  // 6. IMAGE: Fantasy Warrior
  {
    id: "img-gen-3",
    title: "Fantasy Warrior",
    summary: "Elven warrior in glowing silver armor with runes, enchanted forest with bioluminescent plants, ethereal atmosphere",
    prompt: "Generate an image. Context: Fantasy RPG character portrait. Task: Female elven warrior in mystical forest. Armor: Luminescent silver with ancient glowing runes. Environment: Enchanted forest with bioluminescent plants, magical fireflies, ethereal mist. Lighting: Dramatic rim lighting from behind. Style: Photorealistic fantasy art. Atmosphere: Magical and mysterious.",
    image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop"
  },
  // 7. ARTIFACT: Snake Game
  {
    id: "game-2",
    title: "Snake Game",
    summary: "React Snake game: WASD/arrow controls, food collection grows snake, collision detection, high score tracking, neon aesthetic",
    prompt: "Build a React artifact game. Context: Classic Snake game. Rendering: HTML5 Canvas with 20x20 grid. Controls: WASD or arrow keys. Mechanics: Snake moves continuously, eating food (red square) grows body by one segment, collision with walls or self = game over. Scoring: 10 points per food, track high score in component state. Speed: Game speed increases every 5 foods eaten. Visual Design: Neon grid aesthetic with dark background, colorful gradient snake body (head=bright green fading to blue at tail), animated glow on food, particle effect when food eaten. UI: Score display, high score, pause button (spacebar). State: React useState for game state (no localStorage).",
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop"
  },
  // 8. IMAGE: Sci-Fi Movie Poster
  {
    id: "img-gen-4",
    title: "Sci-Fi Movie Poster",
    summary: "Movie poster 'Silicon Awakening': massive AI computer core with glowing circuits, human silhouettes, storm clouds",
    prompt: "Generate an image. Context: Promotional poster for AI thriller movie. Title: 'Silicon Awakening'. Main Element: Massive quantum computer core with glowing blue circuits. Foreground: Silhouettes of people looking up. Background: Ominous storm clouds. Typography: Bold, futuristic title treatment. Color Grading: Dark moody tones with electric blue accents. Style: Professional movie poster aesthetic.",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=400&h=300&fit=crop"
  },
  // 9. ARTIFACT: Weather Dashboard
  {
    id: "data-viz-2",
    title: "Weather Dashboard",
    summary: "React weather viz: Recharts 7-day temp/precipitation charts, hourly forecast tooltips, UV gauge, dynamic gradient background",
    prompt: "Build a React artifact. Context: Weather forecast visualization. Task: Create an interactive weather dashboard. Library: Recharts for all charts. Charts: 1) Area chart showing 7-day temperature forecast with min/max shading, 2) Bar chart for daily precipitation, 3) Radial gauge for UV index. Data: Mock weather data with hourly breakdowns. Interactions: Tooltip showing hourly forecast on hover, click day to see details. Visual Design: Gradient background that changes color based on conditions (sunny=yellow/orange, rainy=blue/gray, cloudy=gray), animated weather icons (lucide-react), beautiful card layout with Tailwind CSS.",
    image: "https://images.unsplash.com/photo-1561484930-998b6a7b22e8?w=400&h=300&fit=crop"
  },
  // 10. IMAGE: Product Photography
  {
    id: "img-gen-5",
    title: "Product Photography",
    summary: "Premium smartwatch with holographic display showing health data, titanium/rose gold, floating with studio lighting",
    prompt: "Generate an image. Context: Luxury tech product advertisement. Product: Modern smartwatch with holographic transparent display. Display Content: Health metrics and vital signs. Materials: Curved sapphire glass, titanium body, rose gold accents. Presentation: Floating in space (no background). Lighting: Soft professional studio lighting. Quality: 8K resolution, premium product photography aesthetic. Mood: Futuristic and luxurious.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"
  },
  // 11. ARTIFACT: Nutrition Tracker
  {
    id: "web-app-2",
    title: "Nutrition Tracker",
    summary: "React protein/macro tracker: meal logging, progress rings for macros, food database, Recharts weekly trends",
    prompt: "Build a React artifact. Context: Fitness and nutrition tracking. Task: Create a protein and nutrition tracker. Core Features: Meal logging form, macro breakdown (protein/carbs/fats), daily goal setting, meal history with timestamps, searchable food database. Visualizations: Colorful circular progress rings for each macro, Recharts line chart showing weekly protein intake trends. State Management: React useState for in-memory data. Styling: Clean card-based layout with Tailwind CSS, gradient accent colors. Interactions: Smooth animations on progress updates, hover effects on meal entries.",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop"
  },
  // 12. ARTIFACT: Memory Match Game
  {
    id: "game-3",
    title: "Memory Match",
    summary: "React memory game: Framer Motion flip animations, emoji cards, difficulty levels, move counter, timer, win celebration",
    prompt: "Build a React artifact game. Context: Memory card matching game. Layout: 4x4 grid of cards (16 cards, 8 pairs). Content: Colorful emoji icons (🎨🎮🎵🎯🚀🌟💎🔥). Animations: Use Framer Motion for card flip effects (rotateY transform). Mechanics: Click to flip 2 cards, if match they stay revealed with celebration animation, if no match they flip back after 1 second delay. Difficulty: Radix UI Select to choose Easy (4x2 grid), Medium (4x4 grid), Hard (6x4 grid). Tracking: Move counter, elapsed timer. Win Condition: All pairs matched, show confetti celebration and stats (moves taken, time). Styling: Modern gradient card backs, smooth animations with Tailwind CSS.",
    image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=300&fit=crop"
  },
  // 13. ARTIFACT: Budget Tracker
  {
    id: "web-app-3",
    title: "Budget Tracker",
    summary: "React finance tracker: expense entry with Radix UI, spending categories, visual budgets, Recharts pie chart",
    prompt: "Build a React artifact. Context: Personal finance management. Task: Create a budget tracking application. Features: Expense entry form, categorized spending (food/transport/entertainment/bills), monthly budget limits, visual progress bars for each category, transaction history table with sort/filter. UI Components: Radix UI Dialog for expense entry, Radix UI Select for categories. Charts: Recharts pie chart showing spending breakdown. Export: Generate CSV download of transactions. Styling: Professional financial dashboard aesthetic with Tailwind CSS, green=under budget, red=over budget color coding.",
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop"
  },
  // 14. ARTIFACT: Stock Portfolio
  {
    id: "data-viz-3",
    title: "Stock Portfolio",
    summary: "React stock tracker: Recharts candlestick charts, allocation pie, multi-stock comparison, gain/loss indicators, animated counters",
    prompt: "Build a React artifact. Context: Investment portfolio tracker. Task: Create a stock portfolio visualization. Library: Recharts for all charts. Charts: 1) Composed chart with candlestick-style visualization for price movements, 2) Pie chart showing portfolio allocation percentages, 3) Multi-line chart comparing performance of 3-5 stocks. Features: Mock real-time price updates (setInterval), gain/loss indicators with color coding (green=profit, red=loss), interactive legend to toggle stock visibility, animated number counters showing total value. UI: Radix UI Tabs to switch between charts. Styling: Financial theme with Tailwind CSS, stock ticker aesthetic.",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop"
  },
  // 15. ARTIFACT: Recipe Manager
  {
    id: "web-app-4",
    title: "Recipe Manager",
    summary: "React recipe book: add/edit via Radix Dialog, ingredient checklists, cooking timer, search/filter by cuisine",
    prompt: "Build a React artifact. Context: Digital cookbook application. Task: Create a recipe management system. Features: Add/edit recipes, ingredient list with checkboxes, step-by-step instructions, built-in countdown timer with audio alerts, serving size calculator (adjusts ingredient quantities), recipe search and filter by cuisine type (Italian/Mexican/Asian/American). UI: Radix UI Dialog for recipe forms, beautiful card grid layout. Storage: React useState (no localStorage). Styling: Food-themed warm color palette with Tailwind CSS, placeholder food images, modern card design with hover effects.",
    image: "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=400&h=300&fit=crop"
  },
  // 16. ARTIFACT: Trivia Quiz
  {
    id: "game-4",
    title: "Trivia Quiz",
    summary: "React trivia game: 10 questions, multiple choice, visual feedback (green/red), timer, lifelines (50/50, skip), results screen",
    prompt: "Build a React artifact game. Context: Interactive trivia quiz. Questions: 10 multiple choice questions covering science, history, and entertainment. UI: Display question text, 4 answer buttons. Feedback: Correct answer turns green, wrong turns red, brief pause before next question. Scoring: Track correct answers, display percentage. Progress: Visual progress bar showing question number (1/10, 2/10, etc). Timer: 15 second countdown per question, auto-advance when time expires. Lifelines: 50/50 button (removes 2 wrong answers), Skip button (move to next question). Results: Final screen showing score, percentage, grade (A/B/C/D/F), share button. Styling: Game show aesthetic with Tailwind CSS, animated transitions.",
    image: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&h=300&fit=crop"
  },
  // 17. ARTIFACT: Habit Tracker
  {
    id: "data-viz-4",
    title: "Habit Tracker",
    summary: "React habit tracker: D3 GitHub-style heat map calendar, Recharts radial progress, streak counter with fire emoji, stats cards",
    prompt: "Build a React artifact. Context: Personal habit tracking. Task: Create a habit visualization dashboard. Libraries: D3 for heat map calendar, Recharts for other charts. Visualizations: 1) GitHub-style contribution heat map showing daily habit completion using D3 (365 days, darker=more habits completed), 2) Radial bar charts (Recharts) showing completion rate for each habit, 3) Bar chart showing weekly consistency trends. Features: Streak counter with fire emoji and animation when streak increases, habit checklist, completion celebration effects. Stats: Total completions, longest streak, current streak cards with animated count-ups. Styling: Motivational color scheme with Tailwind CSS.",
    image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400&h=300&fit=crop"
  },
  // 18. ARTIFACT: Workout Logger
  {
    id: "web-app-5",
    title: "Workout Logger",
    summary: "React workout tracker: exercise library by muscle group, sets/reps input, rest timer, Recharts progress",
    prompt: "Build a React artifact. Context: Gym workout tracking application. Task: Create a comprehensive workout logger. Features: Exercise library categorized by muscle group, workout session builder with sets/reps/weight inputs, countdown rest timer between sets, personal records tracking, workout history calendar view. Visualizations: Recharts line chart showing strength progression over time, bar chart for volume per muscle group. UI: Radix UI Tabs for muscle groups, Radix UI Dialog for exercise selection. Gamification: Achievement badges with celebration animations (Framer Motion) when PR is hit. Styling: Fitness-inspired bold design with Tailwind CSS.",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400&h=300&fit=crop"
  },
  // 19. ARTIFACT: Tic Tac Toe AI
  {
    id: "game-5",
    title: "Tic Tac Toe AI",
    summary: "React Tic Tac Toe: minimax AI opponent, difficulty selector, animated placement, win line highlight, multi-round scoring",
    prompt: "Build a React artifact game. Context: Tic-tac-toe with AI opponent. Board: 3x3 grid. Players: User chooses X or O, AI takes the other. AI Logic: Implement minimax algorithm for unbeatable AI on 'Impossible' difficulty. Difficulty: Radix UI Select with Easy (random moves), Medium (mix of smart/random), Impossible (minimax). Animations: Scale effect on piece placement using Framer Motion, winning line highlight animation. Win Detection: Check rows, columns, diagonals, detect draws. Scoring: Track wins/losses/draws across multiple rounds displayed in score cards. UI: Reset button, difficulty selector, celebration confetti on player win. Styling: Modern board with gradient cells, smooth animations with Tailwind CSS.",
    image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=300&fit=crop"
  },
  // 20. ARTIFACT: Analytics Dashboard
  {
    id: "data-viz-5",
    title: "Analytics Dashboard",
    summary: "React web analytics: Recharts visitor traffic area, conversion funnel, device breakdown pie, sparkline trends, time filters",
    prompt: "Build a React artifact. Context: Website analytics dashboard. Task: Create a comprehensive web analytics visualization. Library: Recharts for all charts. Charts: 1) Area chart for visitor traffic over time with real-time mock updates, 2) Funnel chart showing conversion rates (views→clicks→signups→purchases), 3) Pie chart for device breakdown (mobile/desktop/tablet), 4) Sparklines for engagement metrics (time on site, pages per session). Features: Bounce rate gauge, geographic heat map (simplified), time range filter tabs (today/week/month/year) with smooth transitions. Styling: Analytics dashboard aesthetic with Tailwind CSS, blue/purple color scheme, metric cards with trend arrows.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop"
  },

  // =============================================
  // HTML ARTIFACTS (Vanilla HTML/CSS/JS)
  // =============================================

  // 21. HTML: Parallax Landing Page
  {
    id: "html-1",
    title: "Parallax Landing Page",
    summary: "HTML landing page: parallax scrolling hero, CSS keyframe animations, floating CTA buttons, gradient sections, smooth scroll navigation",
    prompt: "Build an HTML artifact. Context: Modern SaaS product landing page. Structure: Hero section with parallax background layers (CSS transform on scroll), feature cards grid, testimonial carousel, pricing section, footer with newsletter signup. Features: Smooth scroll navigation anchors, floating call-to-action button with pulse animation, animated counter stats on scroll into view, mobile hamburger menu toggle. Styling: CSS Grid and Flexbox layout, gradient backgrounds (purple to blue), glassmorphism cards with backdrop-filter, CSS @keyframes for fade-in and slide-up animations on section entry, custom CSS variables for theming. Interactions: Vanilla JavaScript scroll event listeners for parallax effect, IntersectionObserver for scroll-triggered animations. NO external dependencies - use only vanilla HTML, CSS, JavaScript.",
    image: "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=400&h=300&fit=crop"
  },
  // 22. HTML: Multi-Step Form
  {
    id: "html-2",
    title: "Animated Survey Form",
    summary: "HTML multi-step form: CSS transitions between steps, progress indicator, validation states, confetti celebration on submit",
    prompt: "Build an HTML artifact. Context: User onboarding survey form. Structure: 4-step wizard (Personal Info, Preferences, Experience, Confirmation) with step indicator dots at top. Features: Form field validation with real-time feedback (red borders for errors, green checkmarks for valid), character counters for text areas, animated progress bar filling as user advances, smooth CSS transitions between steps (slide left/right), keyboard navigation support (Enter to advance). Validation: Required field checks, email format validation, minimum length checks. Styling: Modern card-based form centered on page, soft shadow, rounded inputs with focus glow effect, CSS transitions for all state changes (0.3s ease), gradient submit button with hover scale effect. Final Step: Confetti animation using CSS particles on successful submission, summary of all entered data. NO external dependencies - use only vanilla HTML, CSS, JavaScript.",
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop"
  },
  // 23. HTML: CSS Art Gallery
  {
    id: "html-3",
    title: "CSS Art Gallery",
    summary: "HTML gallery: pure CSS artwork cards, 3D hover flip effects, lightbox modal, masonry grid, animated gradient borders",
    prompt: "Build an HTML artifact. Context: Portfolio showcase for digital artwork. Structure: Masonry-style grid gallery using CSS columns, header with filter buttons by category (Abstract, Nature, Geometric), lightbox modal for enlarged view. Cards: Each artwork card has 3D flip effect on hover revealing artwork description (CSS perspective and rotateY transform), animated gradient borders using CSS background-clip, subtle floating animation using CSS keyframes. Lightbox: Full-screen overlay modal with fade-in animation, close button, navigation arrows for next/previous, keyboard support (Escape to close, arrows to navigate). Artworks: Use CSS gradients and shapes to create 6 abstract art pieces directly in CSS (conic-gradient, radial-gradient, clip-path shapes). Styling: Dark theme with neon accent colors, smooth transitions throughout, focus states for accessibility. NO external dependencies - use only vanilla HTML, CSS, JavaScript.",
    image: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400&h=300&fit=crop"
  },
  // 24. HTML: Interactive Pricing Table
  {
    id: "html-4",
    title: "Dynamic Pricing Table",
    summary: "HTML pricing table: animated monthly/yearly toggle with savings badge, hover card lift effects, feature comparison tooltips, CTA pulse",
    prompt: "Build an HTML artifact. Context: SaaS subscription pricing page. Structure: Toggle switch for Monthly/Yearly billing (yearly shows savings percentage), 3 pricing tiers (Starter, Pro, Enterprise) as cards, feature comparison matrix below. Cards: Staggered entrance animation on page load using CSS animation-delay, hover effect lifts card with increased shadow (transform: translateY and box-shadow), popular tier has glowing border animation, feature list with checkmarks and X marks. Toggle: Smooth sliding pill animation between Monthly/Yearly, price counter animation when switching (numbers roll up/down effect). Features: Tooltip popups on hover over feature names explaining each feature, sticky header on scroll, responsive design collapsing to vertical on mobile. Styling: Clean white cards on subtle gradient background, accent color for CTAs with pulse animation, CSS custom properties for easy theming, smooth 0.3s transitions. NO external dependencies - use only vanilla HTML, CSS, JavaScript.",
    image: "https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400&h=300&fit=crop"
  },
  // 25. HTML: Animated Timeline
  {
    id: "html-5",
    title: "Interactive Timeline",
    summary: "HTML timeline: scroll-triggered milestone animations, alternating layout, progress line fill, expandable details, responsive design",
    prompt: "Build an HTML artifact. Context: Company history or project roadmap timeline. Structure: Vertical timeline with central line, alternating left/right milestone cards, year markers, expandable detail sections. Scroll Animations: Timeline progress line fills as user scrolls (CSS clip-path or scaleY), milestone dots pulse when entering viewport, cards slide in from left or right using IntersectionObserver and CSS transforms, staggered animation timing. Milestones: 8 events with dates, titles, descriptions, and icons (using CSS shapes or Unicode symbols). Interactions: Click milestone to expand showing additional details with smooth height transition, active state highlighting current milestone based on scroll position. Styling: Modern design with subtle gradient background, connecting line with gradient fill, glassmorphism cards with backdrop-filter blur, responsive layout stacking vertically on mobile with all cards aligned left. Accessibility: Focus states, reduced motion media query support. NO external dependencies - use only vanilla HTML, CSS, JavaScript.",
    image: "https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=400&h=300&fit=crop"
  },

  // =============================================
  // MARKDOWN ARTIFACTS (Rich text documents)
  // =============================================

  // 26. MARKDOWN: Project README
  {
    id: "markdown-1",
    title: "Project README",
    summary: "Markdown doc: comprehensive README with badges, installation, usage, API docs, contributing guidelines",
    prompt: "Build a markdown artifact. Context: Open-source project documentation for a TypeScript library. Document Type: Comprehensive README.md. Structure: Start with project name as H1, then shields.io badges row (npm version, build status, coverage, license). Sections: H2 Overview with one-paragraph description, H2 Features as bullet list with emoji icons, H2 Installation with npm/yarn/pnpm code blocks, H2 Quick Start with minimal usage example, H2 API Reference with function signatures in code blocks and parameter tables (Name | Type | Default | Description), H2 Configuration with options table, H2 Examples with multiple code blocks showing common use cases, H2 Contributing with setup steps as numbered list, H2 License. Formatting: Use syntax-highlighted code blocks for all code, tables for structured data, blockquotes for important notes, horizontal rules between major sections. Tone: Professional but approachable, developer-focused.",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop"
  },
  // 27. MARKDOWN: Technical RFC
  {
    id: "markdown-2",
    title: "Technical RFC",
    summary: "Markdown doc: Request for Comments with problem statement, proposed solution, alternatives, risks, timeline",
    prompt: "Build a markdown artifact. Context: Engineering team decision-making document for a new authentication system. Document Type: Technical RFC (Request for Comments). Structure: H1 title with RFC number, metadata table (Author, Status, Created, Updated), H2 Summary with 2-3 sentence overview. Sections: H2 Problem Statement describing current pain points with bullet list, H2 Goals with numbered success criteria, H2 Non-Goals explicitly listing out-of-scope items, H2 Proposed Solution with detailed technical approach using nested H3 subsections and architecture diagram placeholder, H2 Alternatives Considered with pros/cons tables for each option, H2 Security Considerations as bullet list, H2 Risks and Mitigations as two-column table, H2 Implementation Timeline with task list checkboxes and estimated dates, H2 Open Questions as numbered list. Formatting: Use blockquotes for key decisions, code blocks for technical snippets, task lists for action items. Tone: Formal technical writing, objective analysis.",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop"
  },
  // 28. MARKDOWN: Meeting Notes
  {
    id: "markdown-3",
    title: "Meeting Notes",
    summary: "Markdown doc: structured meeting notes with attendees, agenda, decisions, action items, follow-ups",
    prompt: "Build a markdown artifact. Context: Weekly engineering team sync meeting documentation. Document Type: Meeting notes template. Structure: H1 with meeting title and date, metadata section with Meeting Type, Duration, and Location. Sections: H2 Attendees with present/absent columns using table format and role annotations, H2 Agenda Items as numbered list with time allocations, H2 Discussion Notes with H3 subsections for each agenda topic containing key points as bullets, H2 Decisions Made as bold statements with rationale in blockquotes, H2 Action Items using task list checkboxes with assignee in brackets and due date, H2 Parking Lot for deferred topics as bullet list, H2 Next Steps with upcoming meeting date and preliminary agenda, H2 Resources/Links as bullet list with markdown links. Formatting: Use tables for structured data, task lists for trackable items, bold for emphasis on owners, blockquotes for direct quotes or key decisions. Tone: Concise and scannable, action-oriented, professional.",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400&h=300&fit=crop"
  },
  // 29. MARKDOWN: API Documentation
  {
    id: "markdown-4",
    title: "API Documentation",
    summary: "Markdown doc: REST API docs with endpoints, parameters, responses, examples, error codes",
    prompt: "Build a markdown artifact. Context: REST API documentation for a user management service. Document Type: API reference documentation. Structure: H1 API title, H2 Base URL with inline code, H2 Authentication section explaining Bearer token with example header code block. Sections: For each endpoint create H2 with HTTP method badge and path, include H3 Description, H3 Request with parameters table (Name | Type | Required | Description), H3 Request Body with JSON code block and field descriptions, H3 Response with JSON code block showing success response, H3 Example using curl code block. Cover endpoints: GET /users, GET /users/:id, POST /users, PUT /users/:id, DELETE /users/:id. Include H2 Error Codes section with table (Code | Message | Description) covering 400, 401, 403, 404, 500. Add H2 Rate Limiting section explaining limits. Formatting: Use code blocks with json and bash syntax highlighting, tables for all structured data, inline code for parameter names. Tone: Technical reference style, precise and unambiguous.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=300&fit=crop"
  },
  // 30. MARKDOWN: Learning Cheatsheet
  {
    id: "markdown-5",
    title: "React Hooks Cheatsheet",
    summary: "Markdown doc: quick reference guide with tables, code examples, tips, common patterns, gotchas",
    prompt: "Build a markdown artifact. Context: Developer quick reference for React Hooks. Document Type: Learning cheatsheet for intermediate developers. Structure: H1 title with topic, brief intro paragraph. Sections: H2 Quick Reference Table with columns (Hook | Purpose | Returns | Common Use), H2 useState with syntax code block, example code block, and tips as bullet list, H2 useEffect with syntax, dependency array explanation table, cleanup example code block, H2 useContext with provider pattern code block, H2 useRef with DOM access vs value storage examples, H2 useMemo vs useCallback comparison table (Aspect | useMemo | useCallback), H2 Custom Hooks with naming conventions and example, H2 Common Gotchas as numbered list with incorrect vs correct code blocks, H2 Decision Tree as nested bullet list for choosing hooks, H2 Performance Tips as bullet list with emoji indicators. Formatting: Heavy use of code blocks with jsx highlighting, comparison tables, blockquotes for warnings, bold for key terms. Tone: Friendly and educational, scannable format for quick lookup.",
    image: "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?w=400&h=300&fit=crop"
  },

  // =============================================
  // SVG ARTIFACTS (Vector graphics)
  // =============================================

  // 31. SVG: Animated Tech Logo
  {
    id: "svg-1",
    title: "Animated Tech Logo",
    summary: "SVG graphic: modern tech company logo with morphing shapes, pulse animations, gradient fills, neon glow effects",
    prompt: "Build an SVG artifact. Context: Modern tech startup brand identity. Subject: Abstract logo combining hexagon shapes that morph and connect. Structure: Use <defs> for gradients and filters, <g> groups for logo parts, <path> for custom shapes. Style: Flat design with gradient fills. Colors: Primary #6366F1 (indigo), secondary #8B5CF6 (violet), accent #06B6D4 (cyan), glow #E0E7FF. Animations: CSS @keyframes for continuous rotation of outer ring (8s), pulse effect on center element (2s ease-in-out infinite), morphing path animation using SMIL <animate> for shape transitions. Viewbox: 0 0 200 200. Include: Drop shadow filter, gradient definitions, 3 concentric geometric shapes, connecting lines that draw on with stroke-dashoffset animation.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop"
  },
  // 32. SVG: Isometric Workspace
  {
    id: "svg-2",
    title: "Isometric Workspace",
    summary: "SVG graphic: 3D isometric office desk scene with computer, plants, geometric shapes, subtle hover animations",
    prompt: "Build an SVG artifact. Context: Modern developer workspace illustration for portfolio. Subject: Isometric 3D-style desk setup with monitor, keyboard, coffee mug, plant, and floating geometric decorations. Structure: Use transform for isometric projection, <g> groups for each object layer (desk, items, decorations). Style: Isometric flat design with subtle shadows. Colors: Desk #1E293B (slate), monitor #0F172A, screen gradient #3B82F6 to #8B5CF6, plant #22C55E, mug #F97316, accents #FBBF24. Animations: CSS @keyframes for floating geometric shapes (translateY 3s ease-in-out infinite alternate), gentle screen glow pulse (4s), plant leaf subtle sway. Viewbox: 0 0 400 300. Include: Layered shadows using semi-transparent fills, code lines on screen using <text>, 4 floating shapes (cube, sphere, pyramid, torus) with staggered animations.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop"
  },
  // 33. SVG: Animated Data Infographic
  {
    id: "svg-3",
    title: "Data Infographic",
    summary: "SVG graphic: animated pie chart with segment labels, bar graph with growing bars, percentage counters, clean data viz style",
    prompt: "Build an SVG artifact. Context: Business metrics infographic for presentations. Subject: Multi-chart data visualization with animated pie chart and bar graph. Structure: <defs> for gradients, <g id='pie-chart'> with <path> segments using arc commands, <g id='bar-chart'> with <rect> bars, <text> for labels and values. Style: Clean minimal data visualization with rounded corners on bars. Colors: Segment1 #3B82F6, Segment2 #10B981, Segment3 #F59E0B, Segment4 #EF4444, Segment5 #8B5CF6, background #F8FAFC, text #1E293B. Animations: CSS @keyframes for pie segments drawing in with stroke-dasharray/dashoffset (1.5s ease-out), bar heights growing from 0 (1s ease-out staggered 0.1s each), percentage text counting up effect. Viewbox: 0 0 500 300. Include: 5-segment donut chart with center hole, 6-bar horizontal chart, floating percentage labels, subtle grid lines, legend with color swatches.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop"
  },
  // 34. SVG: App Icon Set
  {
    id: "svg-4",
    title: "App Icon Set",
    summary: "SVG graphic: 6 cohesive app icons with consistent style, rounded squares, gradient fills, hover scale animations",
    prompt: "Build an SVG artifact. Context: Mobile app icon design system. Subject: Set of 6 utility app icons (settings gear, notification bell, user profile, search magnifier, home house, heart favorite). Structure: <defs> for shared gradients and filters, 6 separate <g> groups each containing <rect rx='16'> background and <path> icon shape. Style: Flat design with subtle gradient fills, 2px stroke weight for icon paths, rounded square backgrounds. Colors: Gradient pairs - Settings #6366F1/#8B5CF6, Bell #F59E0B/#F97316, User #10B981/#14B8A6, Search #3B82F6/#0EA5E9, Home #EC4899/#F43F5E, Heart #EF4444/#F97316. Animations: CSS @keyframes for hover-like scale transform (1.1x on 3s interval per icon staggered), subtle background pulse, icon path stroke-dasharray draw-in on load. Viewbox: 0 0 400 280. Include: 3x2 grid layout with 20px gaps, drop shadow filter, consistent 64x64 icon containers, white icon paths on gradient backgrounds.",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop"
  },
  // 35. SVG: Animated Space Scene
  {
    id: "svg-5",
    title: "Animated Space Scene",
    summary: "SVG graphic: cosmic scene with parallax stars, orbiting planets, shooting stars, nebula gradients, floating astronaut",
    prompt: "Build an SVG artifact. Context: Animated illustration for landing page hero. Subject: Deep space scene with planets, stars, and floating astronaut. Structure: Multiple <g> layers for parallax effect (background stars, mid nebula, foreground planets, astronaut), <defs> for radial gradients and glow filters. Style: Stylized flat space illustration with gradient depth. Colors: Space background #0F0D1A to #1E1B4B gradient, stars #FFFFFF with varying opacity, planet1 #3B82F6/#1E40AF, planet2 #F97316/#EA580C, planet3 #A855F7/#7C3AED, nebula #EC4899 at 20% opacity, astronaut suit #F8FAFC. Animations: CSS @keyframes for star twinkle (opacity 2s random delays), planet orbit rotation (20s/30s/40s linear infinite), shooting star streak across (8s linear infinite), astronaut gentle float (translateY 4s ease-in-out infinite alternate), nebula subtle color shift. Viewbox: 0 0 600 400. Include: 50+ small star circles, 3 planets with ring details, 2 shooting star paths, layered nebula shapes with blur filter, detailed astronaut silhouette with helmet reflection.",
    image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400&h=300&fit=crop"
  },

  // =============================================
  // CODE ARTIFACTS (Syntax-highlighted code snippets)
  // =============================================

  // 36. CODE: Python Data Analyzer
  {
    id: "code-1",
    title: "CSV Data Analyzer",
    summary: "Python script: pandas-style CSV parsing, statistical analysis (mean/median/std), correlation matrix, formatted report output",
    prompt: "Build a code artifact. Language: Python 3.10+. Context: Data analysis utility for CSV files. Task: Create a comprehensive data analyzer script that processes CSV data and generates statistical insights. Algorithm: Parse CSV with csv module, compute descriptive statistics (count, mean, median, mode, std dev, min, max, quartiles) for numeric columns, calculate correlation coefficients between numeric pairs, detect outliers using IQR method. Input: CSV file path as command-line argument. Output: Formatted text report with aligned columns, section headers, and summary statistics table. Code Organization: Use dataclass for stats results, separate functions for parsing, analysis, and formatting. Include: Detailed docstrings, type hints on all functions, input validation with helpful error messages, example usage in __main__ block.",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop"
  },
  // 37. CODE: JavaScript Algorithm Visualizer
  {
    id: "code-2",
    title: "Sorting Visualizer",
    summary: "JavaScript sorting algorithms: QuickSort/MergeSort/BubbleSort with step-by-step trace comments, complexity analysis, comparison output",
    prompt: "Build a code artifact. Language: JavaScript ES2022. Context: Educational algorithm demonstration for teaching sorting concepts. Task: Implement three sorting algorithms (QuickSort, MergeSort, BubbleSort) with detailed step-by-step execution traces. Algorithm: Each sort function logs partition/merge/swap operations with array state, includes Big-O complexity comments (time and space), counts comparisons and swaps. Input: Array of numbers passed to each function. Output: Console logs showing each step with before/after states, final sorted array, and performance metrics (comparisons, swaps, time elapsed). Code Organization: Separate function for each algorithm, shared utility for logging and metrics, demo runner comparing all three. Include: JSDoc comments on every function, inline comments explaining algorithm logic at each step, ASCII visualization of current array state during execution.",
    image: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=300&fit=crop"
  },
  // 38. CODE: TypeScript API Client
  {
    id: "code-3",
    title: "API Client Library",
    summary: "TypeScript REST client: generic fetch wrapper, typed responses, exponential backoff retry, request interceptors, error handling",
    prompt: "Build a code artifact. Language: TypeScript 5.0+. Context: Production-ready HTTP client library for REST APIs. Task: Create a type-safe API client with robust error handling and retry logic. Algorithm: Generic fetch wrapper with response type inference, exponential backoff retry (configurable max attempts, base delay, jitter), request/response interceptors for auth headers and logging, circuit breaker pattern for failing endpoints. Input: Base URL, endpoint path, request options (method, body, headers, timeout). Output: Typed response object or structured error with status, message, and retry info. Code Organization: ApiClient class with generic methods (get, post, put, delete), separate interfaces for config/response/error types, RequestInterceptor and ResponseInterceptor types. Include: Comprehensive type definitions, async/await with proper error boundaries, timeout handling with AbortController, example usage demonstrating typed API calls.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop"
  },
  // 39. CODE: Python Web Scraper
  {
    id: "code-4",
    title: "Web Scraper Tool",
    summary: "Python scraper: BeautifulSoup HTML parsing, CSS selectors, rate limiting, structured JSON output, error recovery",
    prompt: "Build a code artifact. Language: Python 3.10+. Context: Web scraping utility following best practices and ethical guidelines. Task: Create a configurable web scraper that extracts structured data from HTML pages. Algorithm: Fetch pages with requests library, parse HTML with BeautifulSoup, extract data using CSS selectors, implement polite crawling with rate limiting (configurable delay between requests), handle pagination, retry failed requests with backoff. Input: Target URL, CSS selectors map (field name to selector), optional pagination selector. Output: JSON array of extracted records, saved to file with timestamp. Code Organization: Scraper class with configurable options, separate methods for fetch/parse/extract/save, custom exceptions for scraping errors. Include: Type hints throughout, robots.txt checking, User-Agent header configuration, progress logging, graceful handling of missing elements, example scraping a sample page structure.",
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=300&fit=crop"
  },
  // 40. CODE: Shell Script Automation
  {
    id: "code-5",
    title: "Dev Workflow Script",
    summary: "Bash automation: git operations, dependency checks, build/test runners, colored output, cross-platform compatibility",
    prompt: "Build a code artifact. Language: Bash (POSIX-compatible with bashisms noted). Context: Developer workflow automation for daily tasks. Task: Create a comprehensive dev helper script that automates common development operations. Features: Git status summary with branch info and uncommitted changes, dependency version checker (node/npm/python/docker), project health check (lint, test, build commands), environment variable validator, port availability checker, log file tailer with grep filtering. Input: Command-line subcommands (status, check, health, logs) with optional flags. Output: Colorized terminal output with status indicators (checkmarks, X marks, warnings), aligned columns, section headers. Code Organization: Functions for each subcommand, shared utilities for colors and formatting, help text generator, error handling with meaningful messages. Include: Shebang and strict mode (set -euo pipefail), comments explaining each section, cross-platform considerations (macOS vs Linux), example invocations in header comment.",
    image: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=400&h=300&fit=crop"
  },

  // =============================================
  // MERMAID DIAGRAMS (Technical visualizations)
  // =============================================

  // 41. MERMAID: System Architecture Flowchart
  {
    id: "mermaid-1",
    title: "Microservices Architecture",
    summary: "Mermaid diagram: flowchart showing microservices with subgraphs, API gateway, databases, message queues, load balancer",
    prompt: "Build a mermaid artifact. Context: Technical documentation for a distributed e-commerce platform. Diagram Type: flowchart TD (top-down). Subject: Microservices architecture with 6+ services. Elements: Create subgraphs for 'Client Layer' (Web App, Mobile App), 'API Gateway Layer' (Kong/Nginx with rate limiting), 'Services Layer' (User Service, Product Service, Order Service, Payment Service, Notification Service, Inventory Service), 'Data Layer' (PostgreSQL for users/orders, MongoDB for products, Redis for caching, RabbitMQ for async messaging). Relationships: Show request flow from clients through gateway to services, inter-service communication via message queue, database connections. Labels: Include protocol annotations (REST, gRPC, AMQP). Styling: Use different node shapes (rounded for services, cylinder for databases, stadium for queues). Include notes for scalability considerations.",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=300&fit=crop"
  },
  // 42. MERMAID: User Authentication Sequence
  {
    id: "mermaid-2",
    title: "OAuth Login Flow",
    summary: "Mermaid diagram: sequence diagram for OAuth2 authentication with actors, API calls, token handling, refresh flow, error paths",
    prompt: "Build a mermaid artifact. Context: Security documentation for OAuth2 implementation. Diagram Type: sequenceDiagram. Subject: Complete OAuth2 authorization code flow with refresh tokens. Actors: User (actor), Browser (participant), Frontend App, Auth Server (OAuth Provider), Resource Server (API), Token Store. Sequence: 1) User initiates login, 2) Redirect to auth server with client_id/scope/redirect_uri, 3) User authenticates and grants consent, 4) Auth server redirects with authorization code, 5) Backend exchanges code for tokens (access + refresh), 6) Store tokens securely, 7) API requests with Bearer token, 8) Token expiration and refresh flow. Error Paths: Include alt blocks for invalid credentials, expired tokens, revoked access. Notes: Add note blocks explaining token lifetimes, PKCE for public clients. Styling: Use activate/deactivate for lifelines, loop for token refresh retry.",
    image: "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=400&h=300&fit=crop"
  },
  // 43. MERMAID: Database ERD
  {
    id: "mermaid-3",
    title: "E-Commerce Database",
    summary: "Mermaid diagram: ERD for online store with tables, relationships, cardinality, primary/foreign keys, indexes",
    prompt: "Build a mermaid artifact. Context: Database design documentation for an e-commerce platform. Diagram Type: erDiagram. Subject: Complete relational schema for online shopping. Entities (8+ tables): CUSTOMER (id PK, email UK, name, password_hash, created_at), ADDRESS (id PK, customer_id FK, street, city, state, zip, is_default), PRODUCT (id PK, sku UK, name, description, price, category_id FK, stock_qty), CATEGORY (id PK, name, parent_id FK self-ref), ORDER (id PK, customer_id FK, status, total, shipping_address_id FK, created_at), ORDER_ITEM (id PK, order_id FK, product_id FK, quantity, unit_price), PAYMENT (id PK, order_id FK, method, amount, status, transaction_id), REVIEW (id PK, product_id FK, customer_id FK, rating, comment). Relationships: Show cardinality (one-to-many, many-to-many via junction). Include relationship labels like 'places', 'contains', 'belongs_to'. Styling: Use proper ERD notation with PK/FK indicators.",
    image: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&h=300&fit=crop"
  },
  // 44. MERMAID: Git Workflow
  {
    id: "mermaid-4",
    title: "GitFlow Branching",
    summary: "Mermaid diagram: gitGraph showing feature branches, develop, releases, hotfixes, merge strategies, version tags",
    prompt: "Build a mermaid artifact. Context: Development team onboarding documentation for GitFlow workflow. Diagram Type: gitGraph. Subject: Complete GitFlow branching strategy over a release cycle. Branches: main (production), develop (integration), feature/user-auth, feature/payment-api, release/v1.2.0, hotfix/security-patch. Sequence: 1) Start from main with v1.1.0 tag, 2) Create develop branch, 3) Branch feature/user-auth from develop with 3 commits, 4) Branch feature/payment-api from develop with 2 commits, 5) Merge user-auth to develop, 6) Create release/v1.2.0 from develop, 7) Bug fix commit on release branch, 8) Merge release to main with v1.2.0 tag, 9) Merge release back to develop, 10) Hotfix branch from main for security-patch, 11) Merge hotfix to both main (v1.2.1 tag) and develop. Commit Messages: Use realistic messages like 'Add JWT authentication', 'Integrate Stripe webhook'. Styling: Use meaningful branch colors and clear commit labels.",
    image: "https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=400&h=300&fit=crop"
  },
  // 45. MERMAID: Order State Machine
  {
    id: "mermaid-5",
    title: "Order State Machine",
    summary: "Mermaid diagram: stateDiagram for order processing with states, transitions, guards, actions, parallel states, history",
    prompt: "Build a mermaid artifact. Context: Business logic documentation for order management system. Diagram Type: stateDiagram-v2. Subject: Complete order lifecycle from creation to completion/cancellation. States: [*] initial, Created, PaymentPending, PaymentFailed, Confirmed, Processing (composite state with substates: Picking, Packing, QualityCheck), Shipped, InTransit, Delivered, Returned, Cancelled, Refunded, [*] final. Transitions: Created-->PaymentPending (submit_order), PaymentPending-->PaymentFailed (payment_declined), PaymentPending-->Confirmed (payment_success), Confirmed-->Processing (begin_fulfillment), Processing-->Shipped (dispatch), Shipped-->InTransit (carrier_pickup), InTransit-->Delivered (delivery_confirmed), Delivered-->Returned (return_requested within 30 days). Guards: Add conditions like [stock_available], [payment_valid], [within_return_window]. Actions: Include entry/exit actions like 'send_confirmation_email', 'notify_warehouse', 'update_inventory'. Include note blocks for SLA requirements and retry policies.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&h=300&fit=crop"
  },
];
