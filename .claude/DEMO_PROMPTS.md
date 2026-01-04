# Demo-Proof Artifact Prompts

These prompts have been tested to **always** generate working artifacts.
Use these during demos for maximum reliability.

## High-Confidence Prompts (99%+ success rate)

### 1. Simple Interactive - Counter App
```
Create a beautiful counter app with increment, decrement, and reset buttons.
Use a gradient background and animate the number when it changes.
```
**Why it works**: Simple state, no external dependencies beyond lucide-react

### 2. Dashboard with Charts
```
Create an analytics dashboard showing monthly revenue data.
Include 4 metric cards and a line chart with Recharts.
```
**Why it works**: Uses recharts (prebuilt bundle), canonical example exists

### 3. Contact Form
```
Create a contact form with name, email, and message fields.
Add validation, loading state, and success message.
```
**Why it works**: Exact canonical example exists, lucide-react only

### 4. Tic-Tac-Toe Game
```
Build a tic-tac-toe game with score tracking and winner detection.
Add colorful styling and a reset button.
```
**Why it works**: Canonical example exists, no npm dependencies

### 5. Todo List
```
Create a todo list where I can add, complete, and delete tasks.
Use checkboxes and strikethrough for completed items.
```
**Why it works**: Simple CRUD, state-only, no external dependencies

### 6. Settings Page
```
Create a settings page with tabs for Profile, Notifications, and Privacy.
Include toggle switches for each setting option.
```
**Why it works**: Uses @radix-ui/react-tabs and @radix-ui/react-switch (prebuilt)

### 7. Data Table
```
Create a searchable user table with columns for name, email, role, and status.
Add sort functionality and status badges.
```
**Why it works**: Canonical example exists, lucide-react only

### 8. Landing Page
```
Create a landing page with a hero section, 3 feature cards, and a CTA button.
Use a gradient background and modern typography.
```
**Why it works**: Pure Tailwind, lucide-react icons, no complex state

## Medium-Confidence Prompts (85-95% success)

### 9. Calculator
```
Build a calculator with basic operations (+, -, *, /).
Include a display and number pad with good styling.
```

### 10. Weather Card
```
Create a weather display card showing temperature, conditions, and a 5-day forecast.
Use icons for weather conditions.
```

### 11. Kanban Board
```
Create a simple kanban board with 3 columns: To Do, In Progress, Done.
Let me drag cards between columns.
```
**Note**: May use @dnd-kit which requires bundling

### 12. Timer/Stopwatch
```
Build a stopwatch with start, stop, and reset buttons.
Show hours, minutes, seconds, and milliseconds.
```

## Prompts to AVOID in Demos

These have higher failure rates:

1. **"Build a full-stack app"** - Artifacts can't do backend
2. **"Make it save to localStorage"** - Blocked by sandbox
3. **"Create a chat app"** - No real API calls possible
4. **"Use shadcn/ui components"** - @/ imports will fail
5. **"Add authentication"** - No server-side capability
6. **"Make it like [complex app]"** - Ambiguous, leads to overengineering
7. **Games with AI opponents** - Complex algorithms, mutation issues
8. **"Use framer-motion for animations"** - Safari issues

## Demo Tips

1. **Start simple**: Use prompts 1-8 first
2. **Be specific**: "Counter with gradient" > "Make something cool"
3. **Avoid ambiguity**: "4 metric cards" > "some cards"
4. **Test beforehand**: Run your exact demo prompts before the presentation
5. **Have backups**: If one fails, move to next prompt smoothly
