/**
 * HTML Artifact Patterns
 *
 * Guidelines for HTML artifacts including structure,
 * accessibility, and security best practices.
 */

export const HTML_PATTERNS = `
## HTML Artifact Guidelines

### [CRITICAL - STRUCTURAL REQUIREMENTS]

**Basic Structure:**
- All tags must be properly closed (except self-closing tags)
- Matching opening and closing tags
- Valid HTML5 syntax

**Self-Closing Tags:**
\`img\`, \`br\`, \`hr\`, \`input\`, \`meta\`, \`link\`, \`area\`, \`base\`, \`col\`, \`embed\`, \`param\`, \`source\`, \`track\`, \`wbr\`

### [HIGH - ACCESSIBILITY]

**Required Attributes:**
- \`<img>\` tags MUST have \`alt\` attributes
- Form inputs MUST have associated \`<label>\` elements
- Buttons MUST have descriptive text or \`aria-label\`

**Semantic HTML:**
- Use \`<header>\`, \`<nav>\`, \`<main>\`, \`<article>\`, \`<section>\`, \`<footer>\`
- Avoid excessive \`<div>\` nesting when semantic elements exist
- Use heading hierarchy correctly (\`<h1>\` to \`<h6>\`)

### [RECOMMENDED - BEST PRACTICES]

**Responsive Design:**
\`\`\`html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
\`\`\`

**Styling:**
- Tailwind CSS is automatically available (no need to include)
- For custom styles, use \`<style>\` tags
- Avoid inline styles when possible

**JavaScript:**
- Use \`<script>\` tags for interactivity
- Avoid inline event handlers (\`onclick="..."\`)
- Prefer \`addEventListener\` for better separation of concerns
- Store state in JavaScript variables (NOT localStorage)

**External Libraries:**
- Load from CDN only: https://cdnjs.cloudflare.com
- Common libraries: Chart.js, D3.js, GSAP, Anime.js, p5.js, Alpine.js

### HTML Examples

**Complete HTML Document:**
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Artifact</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 dark:bg-gray-900">
  <main class="container mx-auto p-6">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-6">
      Welcome
    </h1>
    <p class="text-gray-600 dark:text-gray-300">
      Content goes here
    </p>
  </main>

  <script>
    // JavaScript goes here
    // Use variables for state, not localStorage
    let appState = {
      count: 0
    };
  </script>
</body>
</html>
\`\`\`

**Accessible Form:**
\`\`\`html
<form class="space-y-4 max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
  <div>
    <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Email Address
    </label>
    <input
      id="email"
      type="email"
      required
      aria-required="true"
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
             focus:ring-2 focus:ring-blue-500 focus:border-transparent
             dark:bg-gray-700 dark:text-white"
    />
  </div>
  <button
    type="submit"
    class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg
           hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
           transition-colors"
  >
    Submit
  </button>
</form>
\`\`\`
`;

export const SVG_PATTERNS = `
## SVG Artifact Guidelines

### [CRITICAL - REQUIRED ATTRIBUTES]

**SVG tags MUST have either:**
- \`viewBox\` attribute: \`<svg viewBox="0 0 800 600">\`
- OR explicit \`width\` and \`height\`: \`<svg width="800" height="600">\`

**Example:**
\`\`\`svg
<svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="100" height="100" fill="blue" />
  <circle cx="200" cy="200" r="50" fill="red" />
</svg>
\`\`\`

### [RECOMMENDED - BEST PRACTICES]

**Use Cases:**
- Logos and icons
- Badges and emblems
- Simple illustrations
- Geometric shapes
- Line art and flat design

**NOT for:**
- Complex detailed artwork (use IMAGE type instead)
- Flowcharts or diagrams (use MERMAID type instead)
- Photo-realistic content (use IMAGE type)

**Responsive SVG:**
\`\`\`svg
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
     class="w-full h-auto max-w-md">
  <!-- Content scales automatically -->
</svg>
\`\`\`
`;
