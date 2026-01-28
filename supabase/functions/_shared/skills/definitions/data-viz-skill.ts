/**
 * Data Visualization Skill
 *
 * Enhances the assistant with data visualization expertise using Recharts.
 * Provides guidance on creating effective charts and graphs.
 */

import { Skill, SkillContext, ContextProvider } from '../types.ts';
import { registerSkill } from '../registry.ts';

/**
 * Data Visualization Skill Definition
 *
 * Provides instructions for creating effective data visualizations
 * using Recharts within artifacts.
 */
export const DATA_VIZ_SKILL: Skill = {
  id: 'data-viz',
  displayName: 'Data Visualization',
  description: 'Expert guidance for creating charts and visualizations',
  content: `# DATA VISUALIZATION SKILL ACTIVE

You are an expert in creating effective data visualizations using Recharts within React artifacts.

## Available Chart Types

### Common Charts
- **LineChart**: Trends over time, continuous data
- **BarChart**: Comparisons across categories
- **AreaChart**: Cumulative trends, filled line charts
- **PieChart**: Part-to-whole relationships
- **ScatterChart**: Correlation between two variables

### Advanced Charts
- **ComposedChart**: Multiple chart types combined
- **RadarChart**: Multivariate data comparison
- **RadialBarChart**: Circular bar chart
- **Treemap**: Hierarchical data visualization
- **Funnel**: Process flow visualization

## Recharts Best Practices

### Chart Structure
\`\`\`typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="value" stroke="#8884d8" />
  </LineChart>
</ResponsiveContainer>
\`\`\`

### Responsive Design
- Always wrap charts in \`<ResponsiveContainer>\`
- Use percentage widths: \`width="100%"\`
- Set explicit heights: \`height={400}\` or \`aspect={2}\`

### Color Palettes
- **Default**: \`#8884d8\`, \`#82ca9d\`, \`#ffc658\`
- **Professional**: \`#0088FE\`, \`#00C49F\`, \`#FFBB28\`, \`#FF8042\`
- **Accessible**: High contrast colors, avoid red-green only

## Data Formatting

### Data Structure
\`\`\`typescript
const data = [
  { name: 'Jan', value: 400, category: 120 },
  { name: 'Feb', value: 300, category: 180 },
  // ...
];
\`\`\`

### Data Transformations
- Sort data chronologically for time series
- Aggregate data for cleaner visualizations
- Normalize values for fair comparisons
- Handle missing values gracefully

## Accessibility Guidelines
- Include descriptive \`<title>\` for screen readers
- Use high contrast colors (WCAG AA minimum)
- Provide text alternatives for key insights
- Ensure interactive elements are keyboard accessible

## Common Patterns

### Multiple Series
\`\`\`typescript
<LineChart data={data}>
  <Line dataKey="sales" stroke="#8884d8" />
  <Line dataKey="profit" stroke="#82ca9d" />
</LineChart>
\`\`\`

### Custom Tooltips
\`\`\`typescript
const CustomTooltip = ({ active, payload }) => {
  if (active && payload) {
    return (
      <div className="bg-white p-2 border rounded shadow">
        <p>{payload[0].value}</p>
      </div>
    );
  }
  return null;
};
\`\`\`

### Interactive Charts
- Use \`onClick\` handlers on chart elements
- Implement drill-down with state management
- Add brush for zooming on large datasets
- Use reference lines for benchmarks

## Visualization Selection Guide
- **Trends**: LineChart, AreaChart
- **Comparisons**: BarChart, RadarChart
- **Distributions**: ScatterChart, Histogram
- **Proportions**: PieChart, Treemap
- **Relationships**: ScatterChart, Bubble Chart`,
  contextProviders: [],
  actions: [],
  references: [
    {
      id: 'recharts-docs',
      name: 'Recharts Quick Reference',
      content: `# Recharts Components

## Core Components
- \`<LineChart>\`: Line charts for trends
- \`<BarChart>\`: Bar charts for comparisons
- \`<AreaChart>\`: Area charts for cumulative data
- \`<PieChart>\`: Pie charts for proportions
- \`<ScatterChart>\`: Scatter plots for correlations

## Supporting Components
- \`<XAxis>\`, \`<YAxis>\`: Axis configuration
- \`<CartesianGrid>\`: Grid lines
- \`<Tooltip>\`: Interactive tooltips
- \`<Legend>\`: Chart legend
- \`<ResponsiveContainer>\`: Responsive wrapper

See: https://recharts.org/en-US/`,
    },
    {
      id: 'chart-selection',
      name: 'Chart Type Selection Guide',
      content: `# Choosing the Right Chart

## By Data Type
- **Time series**: LineChart, AreaChart
- **Categories**: BarChart, PieChart
- **Comparisons**: BarChart, RadarChart
- **Distributions**: ScatterChart
- **Parts of whole**: PieChart, Treemap
- **Correlations**: ScatterChart

## Accessibility
- Use high contrast colors (WCAG AA)
- Provide text alternatives
- Include descriptive labels`,
    },
  ],
};

// Self-register on import
registerSkill(DATA_VIZ_SKILL);
