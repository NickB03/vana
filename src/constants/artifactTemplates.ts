// Phase 5: Smart Artifact Templates

export interface ArtifactTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  requiredLibraries: string[];
  systemPromptGuidance: string;
  exampleStructure: string;
}

export const ARTIFACT_TEMPLATES: ArtifactTemplate[] = [
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Hero section with features and call-to-action',
    keywords: ['landing', 'homepage', 'marketing', 'hero', 'cta'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a modern landing page with:
- Hero section with headline, subheadline, and CTA button
- Features section with 3-6 feature cards (icon + title + description)
- Testimonials or social proof section
- Final CTA section
- Mobile-responsive design
- Use gradient backgrounds and modern UI patterns
- Include smooth scroll animations
`,
    exampleStructure: `
<div class="landing-page">
  <section class="hero">
    <h1>Main Headline</h1>
    <p>Compelling subheadline</p>
    <button>Primary CTA</button>
  </section>
  <section class="features">
    <!-- Feature cards -->
  </section>
  <section class="cta">
    <!-- Final call to action -->
  </section>
</div>
`
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Admin dashboard with charts and data cards',
    keywords: ['dashboard', 'admin', 'analytics', 'charts', 'metrics'],
    requiredLibraries: ['chart.js'],
    systemPromptGuidance: `
Create a dashboard interface with:
- Sidebar navigation
- Top metrics cards showing KPIs
- Chart visualizations (line, bar, pie charts)
- Data table with sorting/filtering
- Responsive grid layout
- Dark/light theme support
- Use Chart.js for visualizations
`,
    exampleStructure: `
<div class="dashboard">
  <aside class="sidebar">
    <!-- Navigation -->
  </aside>
  <main class="content">
    <div class="metrics-grid">
      <!-- KPI cards -->
    </div>
    <div class="charts">
      <canvas id="chart1"></canvas>
    </div>
    <div class="data-table">
      <!-- Table -->
    </div>
  </main>
</div>
`
  },
  {
    id: 'form',
    name: 'Interactive Form',
    description: 'Form with validation and submission states',
    keywords: ['form', 'input', 'validation', 'submit', 'contact'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create an interactive form with:
- Input fields with labels and placeholders
- Client-side validation with error messages
- Loading state during submission
- Success/error feedback
- Accessible form design (labels, ARIA attributes)
- Mobile-friendly layout
- Progressive disclosure for complex forms
`,
    exampleStructure: `
<form class="interactive-form">
  <div class="form-group">
    <label for="email">Email</label>
    <input type="email" id="email" required>
    <span class="error-message"></span>
  </div>
  <button type="submit" class="submit-btn">
    Submit
  </button>
  <div class="success-message hidden">
    Form submitted successfully!
  </div>
</form>
`
  },
  {
    id: 'interactive-demo',
    name: 'Interactive Demo',
    description: 'Canvas-based interactive visualization or animation',
    keywords: ['interactive', 'animation', 'canvas', 'demo', 'visualization'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create an interactive demo with:
- HTML5 Canvas for rendering
- Mouse/touch interaction handlers
- Smooth animations using requestAnimationFrame
- Controls for adjusting parameters
- Responsive canvas sizing
- Performance optimizations
- Clear visual feedback
`,
    exampleStructure: `
<div class="interactive-demo">
  <canvas id="canvas"></canvas>
  <div class="controls">
    <label>Speed: <input type="range" id="speed"></label>
    <button id="reset">Reset</button>
  </div>
</div>
<script>
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  
  function animate() {
    // Animation logic
    requestAnimationFrame(animate);
  }
  animate();
</script>
`
  },
  {
    id: 'data-visualization',
    name: 'Data Visualization',
    description: 'Charts and graphs for data presentation',
    keywords: ['chart', 'graph', 'data', 'visualization', 'statistics'],
    requiredLibraries: ['chart.js'],
    systemPromptGuidance: `
Create data visualizations with:
- Multiple chart types (line, bar, pie, doughnut)
- Interactive tooltips and legends
- Responsive sizing
- Data labels and annotations
- Color-coded data sets
- Export/download options
- Use Chart.js for professional charts
`,
    exampleStructure: `
<div class="data-viz">
  <div class="chart-container">
    <canvas id="mainChart"></canvas>
  </div>
  <div class="data-summary">
    <!-- Summary statistics -->
  </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
  const ctx = document.getElementById('mainChart');
  new Chart(ctx, {
    type: 'bar',
    data: { /* data */ },
    options: { /* options */ }
  });
</script>
`
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Chronological event timeline',
    keywords: ['timeline', 'history', 'events', 'chronological', 'roadmap'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a timeline with:
- Vertical or horizontal layout
- Event markers with dates
- Descriptions and images for each event
- Alternating left/right layout (vertical)
- Smooth scroll animations
- Mobile-responsive design
- Color-coded categories
`,
    exampleStructure: `
<div class="timeline">
  <div class="timeline-item">
    <div class="timeline-marker"></div>
    <div class="timeline-content">
      <h3>Event Title</h3>
      <time>Date</time>
      <p>Description</p>
    </div>
  </div>
</div>
`
  }
];

/**
 * Detect which template best matches the user's request
 */
export function detectTemplate(prompt: string): ArtifactTemplate | null {
  const lowerPrompt = prompt.toLowerCase();
  
  for (const template of ARTIFACT_TEMPLATES) {
    const matchCount = template.keywords.filter(keyword => 
      lowerPrompt.includes(keyword)
    ).length;
    
    // If 2 or more keywords match, suggest this template
    if (matchCount >= 2) {
      return template;
    }
  }
  
  return null;
}

/**
 * Generate enhanced system prompt with template guidance
 */
export function getTemplateGuidance(template: ArtifactTemplate): string {
  return `
TEMPLATE GUIDANCE: ${template.name}
${template.systemPromptGuidance}

Required Libraries: ${template.requiredLibraries.length > 0 ? template.requiredLibraries.join(', ') : 'None'}

Example Structure:
${template.exampleStructure}

Follow these best practices for this template type.
`;
}
