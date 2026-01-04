/**
 * Artifact Template Matcher
 *
 * Matches user messages to predefined artifact templates and returns
 * formatted guidance with example structures to improve AI artifact generation.
 *
 * This is an Edge Function copy of src/constants/artifactTemplates.ts
 * since we cannot import from src/ in Supabase Edge Functions.
 */

export interface ArtifactTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly keywords: readonly [string, ...string[]];
  readonly requiredLibraries: readonly string[];
  readonly systemPromptGuidance: string;
  readonly exampleStructure: string;
}

/**
 * Task complexity tier for artifact generation
 * Based on Z.ai's multi-tier classification approach
 */
export type TaskComplexity = 'simple' | 'moderate' | 'complex';

/**
 * Analysis result for task complexity classification
 * Provides guidance on which templates to use and whether multi-step generation is needed
 */
export interface TaskAnalysis {
  readonly complexity: TaskComplexity;
  readonly suggestedTemplates: readonly string[];  // Template IDs
  readonly requiresMultiStep: boolean;
  readonly dependencies: readonly string[];  // Which templates depend on others
  readonly reasoning: string; // Explanation for the classification
}

/**
 * Analyze task complexity BEFORE template matching
 *
 * Complexity tiers:
 * - Simple: Single artifact type with clear scope (logo, chart, single form, single component)
 * - Moderate: Single template with multiple features or customization requirements
 * - Complex: Multi-template needs (full website, dashboard with charts, multi-page app)
 *
 * @param userMessage - User's request to analyze
 * @returns TaskAnalysis with complexity tier and suggested templates
 *
 * @example
 * // Simple
 * analyzeTaskComplexity("create a bar chart showing sales data")
 * // → { complexity: 'simple', suggestedTemplates: ['chart'], ... }
 *
 * @example
 * // Moderate
 * analyzeTaskComplexity("create a contact form with email validation and success message")
 * // → { complexity: 'moderate', suggestedTemplates: ['form-page'], ... }
 *
 * @example
 * // Complex
 * analyzeTaskComplexity("build a website with landing page, dashboard, and analytics charts")
 * // → { complexity: 'complex', suggestedTemplates: ['landing-page', 'dashboard', 'chart'], ... }
 */
export function analyzeTaskComplexity(userMessage: string): TaskAnalysis {
  // Input validation
  if (!userMessage || typeof userMessage !== 'string') {
    console.warn(
      `[template-matcher] analyzeTaskComplexity received invalid input: ` +
      `type=${typeof userMessage}, value=${JSON.stringify(userMessage)?.slice(0, 100)}`
    );
    return {
      complexity: 'simple',
      suggestedTemplates: [],
      requiresMultiStep: false,
      dependencies: [],
      reasoning: 'Invalid input - defaulting to simple complexity',
    };
  }

  const normalized = userMessage.toLowerCase();
  const words = normalized.split(/\s+/);

  // Complexity indicators
  const complexKeywords = [
    'website', 'app', 'application', 'platform', 'system',
    'dashboard', 'portal', 'suite', 'multi-page', 'full-stack',
  ];

  const moderateKeywords = [
    'with', 'including', 'features', 'multiple', 'interactive',
    'validation', 'animated', 'responsive', 'dynamic',
  ];

  const simpleKeywords = [
    'chart', 'graph', 'logo', 'icon', 'button', 'card',
    'form', 'table', 'list', 'single',
  ];

  // Multi-template indicators (complex)
  // These patterns identify requests that need multiple distinct artifacts
  const multiTemplateIndicators = [
    /landing\s+page.*and.*dashboard/i,
    /website.*with.*(chart|dashboard|form)/i,
    /app.*and.*(analytics|dashboard|chart)/i,
    /dashboard.*with.*(form|chart)/i,
    /portal.*and.*report/i,
    /(landing|homepage).*and.*(dashboard|chart|form)/i,
    // Multiple artifact types mentioned with "and" between them
    /(chart|dashboard|form|landing|page).*and.*(chart|dashboard|form|landing|page)/i,
  ];

  // Count keyword matches
  let complexCount = 0;
  let moderateCount = 0;
  let simpleCount = 0;

  for (const word of words) {
    if (complexKeywords.includes(word)) complexCount++;
    if (moderateKeywords.includes(word)) moderateCount++;
    if (simpleKeywords.includes(word)) simpleCount++;
  }

  // Check for multi-template patterns
  const hasMultiTemplatePattern = multiTemplateIndicators.some(pattern =>
    pattern.test(userMessage)
  );

  // Count "and" conjunctions suggesting multiple artifact types
  const andCount = (normalized.match(/\band\b/g) || []).length;
  const withCount = (normalized.match(/\bwith\b/g) || []).length;

  // Determine complexity tier
  let complexity: TaskComplexity;
  let requiresMultiStep: boolean;
  let reasoning: string;
  let suggestedTemplates: string[] = [];
  let dependencies: string[] = [];

  // Complex requires BOTH complexity indicators AND multiple artifact patterns
  // This prevents "form with email and success" from being complex (it's just feature lists)
  if (hasMultiTemplatePattern || complexCount >= 2 || (complexCount >= 1 && andCount >= 3)) {
    // Complex: Multiple templates or full applications
    complexity = 'complex';
    requiresMultiStep = true;
    reasoning = 'Request involves multiple artifact types or a full application requiring multi-step generation';

    // Suggest templates based on keywords
    if (/landing|homepage|marketing/i.test(normalized)) suggestedTemplates.push('landing-page');
    if (/dashboard|analytics|admin/i.test(normalized)) suggestedTemplates.push('dashboard');
    if (/chart|graph|visualization/i.test(normalized)) suggestedTemplates.push('chart');
    if (/form|input|contact/i.test(normalized)) suggestedTemplates.push('form-page');
    if (/todo|task|list.*manage/i.test(normalized)) suggestedTemplates.push('todo-app');

    // Define dependencies (landing page typically comes first)
    if (suggestedTemplates.includes('landing-page') && suggestedTemplates.length > 1) {
      dependencies = suggestedTemplates.slice(1).map(id =>
        `${id} depends on landing-page navigation`
      );
    }

  } else if (moderateCount >= 2 || withCount >= 2 || (simpleCount >= 1 && moderateCount >= 1)) {
    // Moderate: Single template with multiple features
    complexity = 'moderate';
    requiresMultiStep = false;
    reasoning = 'Request involves a single artifact with multiple features or customization requirements';

    // Suggest single best-fit template
    if (/form|contact|signup|input/i.test(normalized)) suggestedTemplates.push('form-page');
    else if (/chart|graph|data|visualization/i.test(normalized)) suggestedTemplates.push('chart');
    else if (/dashboard|admin|analytics/i.test(normalized)) suggestedTemplates.push('dashboard');
    else if (/landing|homepage|marketing/i.test(normalized)) suggestedTemplates.push('landing-page');
    else if (/todo|task/i.test(normalized)) suggestedTemplates.push('todo-app');
    else if (/game|interactive/i.test(normalized)) suggestedTemplates.push('game');

  } else {
    // Simple: Single artifact type with clear scope
    complexity = 'simple';
    requiresMultiStep = false;
    reasoning = 'Request is focused on a single artifact type with clear, limited scope';

    // Suggest single template
    if (/chart|graph/i.test(normalized)) suggestedTemplates.push('chart');
    else if (/logo|icon/i.test(normalized)) suggestedTemplates.push('logo');
    else if (/form/i.test(normalized)) suggestedTemplates.push('form-page');
    else if (/card|component/i.test(normalized)) suggestedTemplates.push('card');
    else if (/table|grid/i.test(normalized)) suggestedTemplates.push('table');
  }

  return {
    complexity,
    suggestedTemplates: suggestedTemplates as readonly string[],
    requiresMultiStep,
    dependencies: dependencies as readonly string[],
    reasoning,
  };
}

/**
 * Predefined artifact templates with working examples
 * IMPORTANT: All examples use Radix UI + Tailwind (NOT shadcn/ui)
 * Artifacts run in isolated sandboxes and cannot access local @/ imports
 */
export const ARTIFACT_TEMPLATES: ArtifactTemplate[] = [
  {
    id: 'landing-page',
    name: 'Landing Page',
    description: 'Hero section with features and call-to-action',
    keywords: ['landing', 'homepage', 'marketing', 'hero', 'cta', 'website'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a modern landing page with:
- Hero section with headline, subheadline, and CTA button using Tailwind classes
- Features section with 3-6 feature cards (icon from lucide-react + title + description)
- Testimonials section with cards
- Final CTA section with button
- Mobile-responsive design with Tailwind
- Use gradient backgrounds and modern UI patterns
- Include smooth scroll animations
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { Star, Zap, Shield } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="py-20 px-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Welcome to Our Product
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          The best solution for your needs
        </p>
        <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
          Get Started
        </button>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <Star className="w-12 h-12 mb-4 text-blue-600" />
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Amazing Feature</h3>
            <p className="text-gray-600 dark:text-gray-300">Feature description goes here</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <Zap className="w-12 h-12 mb-4 text-blue-600" />
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Lightning Fast</h3>
            <p className="text-gray-600 dark:text-gray-300">Speed description goes here</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <Shield className="w-12 h-12 mb-4 text-blue-600" />
            <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">Secure</h3>
            <p className="text-gray-600 dark:text-gray-300">Security description goes here</p>
          </div>
        </div>
      </section>
    </div>
  )
}
`
  },
  {
    id: 'form-page',
    name: 'Form with Validation',
    description: 'Contact or signup form with validation',
    keywords: ['form', 'contact', 'signup', 'input', 'validation', 'submit'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create an interactive form using Tailwind CSS:
- Use native HTML form elements styled with Tailwind
- Implement client-side validation with React state
- Show loading state during submission with disabled button
- Display success/error messages using conditional rendering
- Include proper accessibility (labels, ARIA attributes)
- Mobile-friendly layout with proper spacing
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { Mail, User, MessageSquare, AlertCircle, CheckCircle } from "lucide-react"

const { useState } = React

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState({})

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      setSuccess(true)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Contact Us</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="name"
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Your name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                required
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <textarea
              id="message"
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Your message..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {isSubmitting ? "Sending..." : "Send Message"}
          </button>

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Message sent successfully!</span>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
`
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Admin dashboard with charts and data cards',
    keywords: ['dashboard', 'admin', 'analytics', 'charts', 'metrics', 'data'],
    requiredLibraries: ['recharts', '@radix-ui/react-tabs'],
    systemPromptGuidance: `
Create a dashboard interface with Tailwind CSS and Recharts:
- Top metrics cards showing KPIs with status badges
- Chart visualizations using recharts library
- Data table with proper typography
- Responsive grid layout
- Use Radix UI Tabs for different dashboard views
- Include profile section
- Use ONLY Radix UI primitives + Tailwind CSS (NO local component imports)
`,
    exampleStructure: `
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import * as Tabs from '@radix-ui/react-tabs'
import { TrendingUp, Users, DollarSign, Activity } from "lucide-react"

export default function Dashboard() {
  const data = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 },
    { name: 'May', value: 700 },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>

      {/* Metrics Cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</span>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">+12%</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">1,234</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</span>
            <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">+24%</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <p className="text-3xl font-bold text-gray-900 dark:text-white">$45.2k</p>
          </div>
        </div>
      </div>

      {/* Tabs with Charts */}
      <Tabs.Root defaultValue="overview" className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 px-4">
          <Tabs.Trigger
            value="overview"
            className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 transition"
          >
            Overview
          </Tabs.Trigger>
          <Tabs.Trigger
            value="analytics"
            className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 transition"
          >
            Analytics
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" className="p-6">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Tabs.Content>

        <Tabs.Content value="analytics" className="p-6">
          <p className="text-gray-600 dark:text-gray-300">Analytics content here</p>
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
`
  },
  {
    id: 'data-table',
    name: 'Data Table',
    description: 'Sortable and filterable data table',
    keywords: ['table', 'data', 'list', 'sort', 'filter', 'search'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a data table with Tailwind CSS:
- Use native HTML table elements styled with Tailwind
- Add input for search/filter functionality
- Include buttons for actions
- Use badges for status indicators
- Add pagination controls
- Implement sorting with clear visual indicators
- Mobile-responsive with horizontal scroll
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { Search, ChevronUp, ChevronDown, Edit, Trash } from "lucide-react"

const { useState } = React

export default function DataTable() {
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")

  const data = [
    { id: 1, name: "John Doe", email: "john@example.com", status: "Active" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", status: "Inactive" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", status: "Active" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Users</h1>

        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {row.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {row.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={\`px-2 py-1 text-xs rounded-full \${
                      row.status === 'Active'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }\`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-red-600 hover:text-red-800 dark:text-red-400">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
`
  },
  {
    id: 'settings-page',
    name: 'Settings Page',
    description: 'User settings with form controls',
    keywords: ['settings', 'preferences', 'profile', 'account', 'configuration'],
    requiredLibraries: ['@radix-ui/react-tabs', '@radix-ui/react-switch'],
    systemPromptGuidance: `
Create a settings page with Radix UI + Tailwind:
- Use Radix UI Tabs for different setting categories
- Group related settings in cards
- Include Radix UI Switch for toggle options
- Use native inputs and labels for text settings
- Add buttons for save actions
- Include alerts for important notices
- Use horizontal rules to divide sections
- Use ONLY Radix UI primitives + Tailwind CSS (NO local component imports)
`,
    exampleStructure: `
import * as Tabs from '@radix-ui/react-tabs'
import * as Switch from '@radix-ui/react-switch'
import { User, Bell, Shield, Save } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Settings</h1>

        <Tabs.Root defaultValue="general" className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 px-4">
            <Tabs.Trigger
              value="general"
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 transition"
            >
              General
            </Tabs.Trigger>
            <Tabs.Trigger
              value="notifications"
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 transition"
            >
              Notifications
            </Tabs.Trigger>
            <Tabs.Trigger
              value="security"
              className="px-4 py-3 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 transition"
            >
              Security
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="general" className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Profile Information</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Update your account profile</p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Receive email updates</p>
              </div>
              <Switch.Root
                className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-blue-600 transition"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow-md transform transition data-[state=checked]:translate-x-5 translate-x-0.5" />
              </Switch.Root>
            </div>

            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </Tabs.Content>

          <Tabs.Content value="notifications" className="p-6">
            <p className="text-gray-600 dark:text-gray-300">Notification settings here</p>
          </Tabs.Content>

          <Tabs.Content value="security" className="p-6">
            <p className="text-gray-600 dark:text-gray-300">Security settings here</p>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  )
}
`
  },
  {
    id: 'game',
    name: 'Interactive Game',
    description: 'Tic-tac-toe style game with score tracking',
    keywords: ['game', 'tic-tac-toe', 'play', 'score', 'winner', 'player', 'board', 'puzzle', 'quiz', 'trivia'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create an interactive game with Tailwind CSS:
- Complete game loop (start → play → end → restart)
- Score tracking with visual feedback
- Winner detection and celebration
- Clear game board/interface
- Reset and new game buttons
- Responsive design for all screen sizes
- Use lucide-react for icons (RotateCcw, Trophy, etc.)
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { RotateCcw, Trophy } from 'lucide-react';

const { useState } = React;

export default function App() {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [gameOver, setGameOver] = useState(false);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }
    return null;
  };

  const handleClick = (index) => {
    if (board[index] || gameOver) return;
    // ✅ CORRECT: Immutable update
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);

    const result = calculateWinner(newBoard);
    if (result) {
      setGameOver(true);
      setScores({ ...scores, [result.winner]: scores[result.winner] + 1 });
    } else if (newBoard.every(s => s !== null)) {
      setGameOver(true);
      setScores({ ...scores, draws: scores.draws + 1 });
    } else {
      setIsXNext(!isXNext);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setGameOver(false);
  };

  const winnerInfo = calculateWinner(board);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">Tic-Tac-Toe</h1>

        {/* Score Board */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{scores.X}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Player X</div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-600">{scores.draws}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Draws</div>
          </div>
          <div className="bg-pink-100 dark:bg-pink-900/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-pink-600">{scores.O}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Player O</div>
          </div>
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {board.map((square, index) => (
            <button
              key={index}
              onClick={() => handleClick(index)}
              className={\`aspect-square text-4xl font-bold rounded-lg transition-all \${
                square ? (square === 'X' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white')
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }\`}
              disabled={!!square || gameOver}
            >
              {square}
            </button>
          ))}
        </div>

        {winnerInfo && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-green-600" />
            <p className="text-green-800 dark:text-green-200 font-medium">Player {winnerInfo.winner} wins!</p>
          </div>
        )}

        <button onClick={resetGame} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2">
          <RotateCcw className="w-5 h-5" />
          New Game
        </button>
      </div>
    </div>
  );
}
`
  },
  {
    id: 'counter',
    name: 'Counter or Timer',
    description: 'Simple interactive counter with increment/decrement',
    keywords: ['counter', 'count', 'increment', 'decrement', 'timer', 'stopwatch', 'clock', 'simple'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a beautiful counter or timer with Tailwind CSS:
- Large, prominent number display
- Increment, decrement, and reset buttons
- Animated number transitions
- Gradient background for visual appeal
- lucide-react icons for buttons (Plus, Minus, RotateCcw)
- Mobile-responsive design
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { Plus, Minus, RotateCcw } from 'lucide-react';

const { useState } = React;

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 text-center">
        <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-8">Counter</h1>

        <div className="text-8xl font-bold text-gray-900 dark:text-white mb-8 tabular-nums transition-all duration-200">
          {count}
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setCount(c => c - 1)}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg"
          >
            <Minus className="w-8 h-8" />
          </button>

          <button
            onClick={() => setCount(0)}
            className="w-16 h-16 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg"
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          <button
            onClick={() => setCount(c => c + 1)}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
      </div>
    </div>
  );
}
`
  },
  {
    id: 'todo-list',
    name: 'Todo List',
    description: 'Task list with add, complete, and delete functionality',
    keywords: ['todo', 'task', 'tasks', 'list', 'checklist', 'app', 'tracker', 'to-do', 'add', 'delete', 'complete', 'done', 'item'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a todo list app with Tailwind CSS:
- Add new tasks with input field
- Toggle task completion with checkboxes
- Delete tasks with button
- Show completion count/progress
- lucide-react icons (Plus, Check, Trash2, CheckCircle)
- Include sample tasks (never empty state)
- Mobile-responsive design
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { Plus, Trash2, Check } from 'lucide-react';

const { useState } = React;

export default function App() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Learn React', completed: true },
    { id: 2, text: 'Build a todo app', completed: false },
    { id: 3, text: 'Deploy to production', completed: false },
  ]);
  const [newTask, setNewTask] = useState('');

  const addTask = () => {
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
    setNewTask('');
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Todo List</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{completedCount} of {tasks.length} completed</p>

        {/* Add Task */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={addTask}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Task List */}
        <ul className="space-y-3">
          {tasks.map(task => (
            <li key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <button
                onClick={() => toggleTask(task.id)}
                className={\`w-6 h-6 rounded-full border-2 flex items-center justify-center \${
                  task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                }\`}
              >
                {task.completed && <Check className="w-4 h-4" />}
              </button>
              <span className={\`flex-1 \${task.completed ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}\`}>
                {task.text}
              </span>
              <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
`
  },
  {
    id: 'card-display',
    name: 'Card Display',
    description: 'Information cards with visual presentation',
    keywords: ['card', 'weather', 'profile', 'info', 'display', 'showcase', 'preview', 'widget'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a beautiful card display with Tailwind CSS:
- Gradient or image background
- Icon representation
- Primary and secondary text
- Supporting statistics or badges
- Hover effects and shadows
- lucide-react icons appropriate to content
- Include sample data (never empty)
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { Cloud, Sun, Droplets, Wind, Thermometer } from 'lucide-react';

export default function App() {
  // ✅ Always include sample data
  const weather = {
    city: 'San Francisco',
    temp: 72,
    condition: 'Partly Cloudy',
    humidity: 65,
    wind: 12,
    forecast: [
      { day: 'Mon', high: 74, low: 58, icon: Sun },
      { day: 'Tue', high: 71, low: 56, icon: Cloud },
      { day: 'Wed', high: 68, low: 54, icon: Droplets },
      { day: 'Thu', high: 70, low: 55, icon: Sun },
      { day: 'Fri', high: 73, low: 57, icon: Sun },
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 text-white max-w-md w-full">
        <div className="text-center mb-8">
          <p className="text-lg opacity-80">{weather.city}</p>
          <div className="flex items-center justify-center gap-4 my-4">
            <Cloud className="w-16 h-16" />
            <span className="text-7xl font-light">{weather.temp}°</span>
          </div>
          <p className="text-xl">{weather.condition}</p>
        </div>

        <div className="flex justify-around mb-8 py-4 border-y border-white/20">
          <div className="text-center">
            <Droplets className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm opacity-80">Humidity</p>
            <p className="font-semibold">{weather.humidity}%</p>
          </div>
          <div className="text-center">
            <Wind className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm opacity-80">Wind</p>
            <p className="font-semibold">{weather.wind} mph</p>
          </div>
          <div className="text-center">
            <Thermometer className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm opacity-80">Feels Like</p>
            <p className="font-semibold">70°</p>
          </div>
        </div>

        <div className="flex justify-between">
          {weather.forecast.map((day) => {
            const Icon = day.icon;
            return (
              <div key={day.day} className="text-center">
                <p className="text-sm opacity-80 mb-2">{day.day}</p>
                <Icon className="w-6 h-6 mx-auto mb-2" />
                <p className="font-semibold">{day.high}°</p>
                <p className="text-sm opacity-60">{day.low}°</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
`
  },
  {
    id: 'multi-step-wizard',
    name: 'Multi-Step Wizard',
    description: 'Multi-step form with progress indicator and navigation',
    keywords: ['wizard', 'steps', 'checkout', 'onboarding', 'registration', 'multi-step', 'progress', 'stepper', 'flow'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a multi-step wizard with Tailwind CSS:
- Progress indicator showing current step
- Navigation buttons (Next, Previous, Submit)
- Form validation for each step
- Smooth transitions between steps
- Step completion indicators
- Mobile-responsive design
- lucide-react icons (ChevronLeft, ChevronRight, Check)
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const { useState } = React;

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });

  const steps = [
    { id: 1, title: 'Personal Info', fields: ['name', 'email'] },
    { id: 2, title: 'Company Details', fields: ['company'] },
    { id: 3, title: 'Message', fields: ['message'] }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    alert('Form submitted!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Registration Wizard</h1>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div className={\`w-10 h-10 rounded-full flex items-center justify-center \${
                    currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }\`}>
                    {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                  </div>
                  <span className="text-xs mt-2 text-gray-600 dark:text-gray-400">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={\`h-1 flex-1 mx-2 \${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }\`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="john@example.com"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Acme Inc."
              />
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Additional Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Tell us more..."
              />
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>
          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
            >
              Submit
              <Check className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
`
  },
  {
    id: 'data-visualization',
    name: 'Data Visualization',
    description: 'Interactive charts and graphs for data analysis',
    keywords: ['chart', 'graph', 'visualization', 'pie', 'bar', 'line', 'area', 'statistics', 'report'],
    requiredLibraries: ['recharts', '@radix-ui/react-tabs'],
    systemPromptGuidance: `
Create data visualizations using Recharts library:
- Multiple chart types (LineChart, BarChart, PieChart, AreaChart)
- Responsive containers for mobile support
- Tooltips for data interaction
- Legend for data series identification
- Color-coded data series with theme support
- Grid lines and axes labels
- Sample data included
- Use ONLY Recharts + Tailwind CSS (NO local component imports)
`,
    exampleStructure: `
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as Tabs from '@radix-ui/react-tabs';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

export default function App() {
  const lineData = [
    { month: 'Jan', revenue: 4000, expenses: 2400 },
    { month: 'Feb', revenue: 3000, expenses: 1398 },
    { month: 'Mar', revenue: 2000, expenses: 9800 },
    { month: 'Apr', revenue: 2780, expenses: 3908 },
    { month: 'May', revenue: 1890, expenses: 4800 },
    { month: 'Jun', revenue: 2390, expenses: 3800 }
  ];

  const barData = [
    { name: 'Product A', sales: 4000 },
    { name: 'Product B', sales: 3000 },
    { name: 'Product C', sales: 2000 },
    { name: 'Product D', sales: 2780 },
    { name: 'Product E', sales: 1890 }
  ];

  const pieData = [
    { name: 'Desktop', value: 400 },
    { name: 'Mobile', value: 300 },
    { name: 'Tablet', value: 200 }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Data Visualization Dashboard</h1>

        <Tabs.Root defaultValue="line" className="space-y-6">
          <Tabs.List className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <Tabs.Trigger
              value="line"
              className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Line Chart
            </Tabs.Trigger>
            <Tabs.Trigger
              value="bar"
              className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Bar Chart
            </Tabs.Trigger>
            <Tabs.Trigger
              value="pie"
              className="px-4 py-2 text-sm font-medium border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 flex items-center gap-2"
            >
              <PieChartIcon className="w-4 h-4" />
              Pie Chart
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="line" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Revenue vs Expenses</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Tabs.Content>

          <Tabs.Content value="bar" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Product Sales</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="sales" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </Tabs.Content>

          <Tabs.Content value="pie" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Traffic Sources</h2>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => \`\${name}: \${(percent * 100).toFixed(0)}%\`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
`
  },
  {
    id: 'e-commerce',
    name: 'E-Commerce Product Catalog',
    description: 'Product catalog with shopping cart and checkout',
    keywords: ['shop', 'store', 'product', 'cart', 'buy', 'purchase', 'e-commerce', 'ecommerce', 'shopping', 'price'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create an e-commerce interface with Tailwind CSS:
- Product grid with images, titles, prices
- Add to cart functionality
- Shopping cart sidebar or modal
- Quantity controls (increment/decrement)
- Total price calculation
- Remove from cart button
- Product badges (sale, new, featured)
- lucide-react icons (ShoppingCart, Plus, Minus, Trash2)
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { ShoppingCart, Plus, Minus, Trash2, X } from 'lucide-react';

const { useState } = React;

export default function App() {
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);

  const products = [
    { id: 1, name: 'Premium Headphones', price: 299, image: '🎧', badge: 'Sale' },
    { id: 2, name: 'Smart Watch', price: 399, image: '⌚', badge: 'New' },
    { id: 3, name: 'Laptop Stand', price: 89, image: '💻', badge: null },
    { id: 4, name: 'Mechanical Keyboard', price: 149, image: '⌨️', badge: 'Popular' },
    { id: 5, name: 'Wireless Mouse', price: 59, image: '🖱️', badge: null },
    { id: 6, name: 'USB-C Hub', price: 79, image: '🔌', badge: 'Sale' }
  ];

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item =>
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">TechStore</h1>
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <ShoppingCart className="w-6 h-6" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Products Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Featured Products</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="relative bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 h-48 flex items-center justify-center">
                <span className="text-6xl">{product.image}</span>
                {product.badge && (
                  <span className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                    {product.badge}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">\${product.price}</span>
                  <button
                    onClick={() => addToCart(product)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCart(false)}>
          <div
            className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shopping Cart</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-600 dark:text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400 text-center py-8">Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <span className="text-3xl">{item.image}</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                        <p className="text-blue-600 font-bold">\${item.price}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 bg-gray-200 dark:bg-gray-600 rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold text-gray-900 dark:text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 bg-gray-200 dark:bg-gray-600 rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">\${total}</span>
                  </div>
                  <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg">
                    Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
`
  },
  {
    id: 'portfolio',
    name: 'Portfolio Gallery',
    description: 'Image gallery with filtering and lightbox',
    keywords: ['portfolio', 'gallery', 'images', 'photos', 'projects', 'work', 'showcase', 'filter', 'lightbox'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a portfolio gallery with Tailwind CSS:
- Grid layout for project cards
- Filter buttons for categories
- Hover effects on images
- Modal/lightbox for full-size view
- Project titles and descriptions
- Category badges
- lucide-react icons (X, ExternalLink, Github)
- Smooth animations and transitions
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { X, ExternalLink, Github } from 'lucide-react';

const { useState } = React;

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProject, setSelectedProject] = useState(null);

  const projects = [
    { id: 1, title: 'E-Commerce Platform', category: 'web', image: '🛍️', description: 'Full-stack online store' },
    { id: 2, title: 'Mobile Banking App', category: 'mobile', image: '📱', description: 'iOS/Android banking' },
    { id: 3, title: 'Dashboard Analytics', category: 'web', image: '📊', description: 'Real-time data viz' },
    { id: 4, title: 'Social Media App', category: 'mobile', image: '💬', description: 'React Native social' },
    { id: 5, title: 'Portfolio Website', category: 'design', image: '🎨', description: 'Modern portfolio' },
    { id: 6, title: 'Brand Identity', category: 'design', image: '✨', description: 'Complete rebrand' },
    { id: 7, title: 'AI Chat Interface', category: 'web', image: '🤖', description: 'GPT-powered chat' },
    { id: 8, title: 'Fitness Tracker', category: 'mobile', image: '💪', description: 'Health & wellness' }
  ];

  const categories = ['all', 'web', 'mobile', 'design'];

  const filteredProjects = selectedCategory === 'all'
    ? projects
    : projects.filter(p => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-4">My Portfolio</h1>
          <p className="text-xl opacity-90">Showcasing my best work across web, mobile, and design</p>
        </div>
      </header>

      {/* Filter Buttons */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-2 justify-center mb-8 flex-wrap">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={\`px-6 py-2 rounded-full font-medium transition \${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }\`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <div
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition hover:scale-105 hover:shadow-2xl"
            >
              <div className="relative bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 h-64 flex items-center justify-center overflow-hidden">
                <span className="text-7xl transform transition group-hover:scale-110">{project.image}</span>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ExternalLink className="w-10 h-10 text-white" />
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{project.title}</h3>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-medium rounded-full">
                    {project.category}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{project.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedProject && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 h-96 flex items-center justify-center">
              <span className="text-9xl">{selectedProject.image}</span>
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{selectedProject.title}</h2>
                <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium rounded-full">
                  {selectedProject.category}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">{selectedProject.description}</p>
              <div className="flex gap-4">
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2">
                  <ExternalLink className="w-5 h-5" />
                  View Live
                </button>
                <button className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg flex items-center gap-2">
                  <Github className="w-5 h-5" />
                  View Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`
  },
  {
    id: 'pricing-page',
    name: 'Pricing Page',
    description: 'Pricing tiers with feature comparison',
    keywords: ['pricing', 'plans', 'subscription', 'tiers', 'saas', 'billing', 'features', 'compare'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a pricing page with Tailwind CSS:
- Multiple pricing tiers (3-4 plans)
- Feature lists with checkmarks
- Highlighted "popular" plan
- Call-to-action buttons
- Monthly/Annual toggle
- Feature comparison table
- lucide-react icons (Check, X, Zap, Star)
- Mobile-responsive cards
- Use ONLY Tailwind CSS for styling (NO local component imports)
`,
    exampleStructure: `
import { Check, X, Zap, Star } from 'lucide-react';

const { useState } = React;

export default function App() {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: 'Starter',
      monthlyPrice: 9,
      annualPrice: 90,
      description: 'Perfect for individuals',
      features: [
        { name: 'Up to 10 projects', included: true },
        { name: '5GB storage', included: true },
        { name: 'Basic analytics', included: true },
        { name: 'Email support', included: true },
        { name: 'Advanced features', included: false },
        { name: 'Priority support', included: false }
      ],
      popular: false
    },
    {
      name: 'Professional',
      monthlyPrice: 29,
      annualPrice: 290,
      description: 'For growing teams',
      features: [
        { name: 'Unlimited projects', included: true },
        { name: '50GB storage', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Priority email support', included: true },
        { name: 'Advanced features', included: true },
        { name: '24/7 phone support', included: false }
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      monthlyPrice: 99,
      annualPrice: 990,
      description: 'For large organizations',
      features: [
        { name: 'Unlimited everything', included: true },
        { name: 'Unlimited storage', included: true },
        { name: 'Custom analytics', included: true },
        { name: '24/7 phone support', included: true },
        { name: 'Advanced features', included: true },
        { name: 'Dedicated account manager', included: true }
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Choose the perfect plan for your needs</p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-4 bg-white dark:bg-gray-800 p-1 rounded-full shadow">
            <button
              onClick={() => setIsAnnual(false)}
              className={\`px-6 py-2 rounded-full font-medium transition \${
                !isAnnual
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }\`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={\`px-6 py-2 rounded-full font-medium transition \${
                isAnnual
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }\`}
            >
              Annual
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Save 17%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={\`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 \${
                plan.popular ? 'ring-4 ring-blue-600 transform scale-105' : ''
              }\`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 px-4 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
                    <Star className="w-4 h-4" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">
                    \${isAnnual ? plan.annualPrice : plan.monthlyPrice}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    /{isAnnual ? 'year' : 'month'}
                  </span>
                </div>
              </div>

              <button
                className={\`w-full py-3 rounded-lg font-semibold mb-6 transition \${
                  plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                }\`}
              >
                Get Started
              </button>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <span className={\`text-sm \${
                      feature.included
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-400 dark:text-gray-600'
                    }\`}>
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <Zap className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Need a custom plan?</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Contact our sales team for enterprise pricing and custom features
          </p>
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  );
}
`
  }
];

/**
 * Confidence Score Result for template matching
 * Based on Z.ai's 5-criterion confidence scoring approach
 */
export interface TemplateMatchResult {
  readonly template: ArtifactTemplate;
  readonly confidence: number; // 0-100 scale
  readonly scores: Readonly<{
    keywordDensity: number;    // 30% weight - keyword match ratio
    wordBoundary: number;      // 25% weight - exact word matches (not substrings)
    specificity: number;       // 20% weight - how specific the match is
    templateRelevance: number; // 15% weight - how well template fits the request
    intentClarity: number;     // 10% weight - clear artifact-building intent
  }>;
  readonly isHighQuality: boolean; // confidence >= 70%
}

/**
 * Output format for getMatchingTemplate function
 * Returns structured result with reason instead of silent empty string
 */
export interface TemplateMatchOutput {
  readonly template: string; // Formatted template guidance or empty string
  readonly matched: boolean; // Whether a template was matched
  readonly reason: 'invalid_input' | 'no_matches' | 'low_confidence' | 'matched';
  readonly confidence?: number; // Confidence score if matched
  readonly templateId?: string; // Template ID if matched
}

/**
 * Calculate confidence score for a template match
 *
 * Criteria weights (inspired by Z.ai's 5-criterion system):
 * - Keyword Density (30%): Ratio of matched keywords to total keywords
 * - Word Boundary (25%): Matches that occur at word boundaries (not substrings)
 * - Specificity (20%): Templates with more keywords need more matches
 * - Template Relevance (15%): How well the template description matches
 * - Intent Clarity (10%): Presence of artifact-building intent words
 *
 * @param message - User message to analyze (validated for type and content)
 * @param template - Template to match against (validated for required fields)
 * @returns Score breakdown for confidence calculation
 * @throws {Error} If message is empty or template is invalid
 */
function calculateConfidenceScore(
  message: string,
  template: ArtifactTemplate
): TemplateMatchResult['scores'] {
  // Input validation
  if (!message || typeof message !== 'string') {
    throw new Error('calculateConfidenceScore: message must be a non-empty string');
  }

  if (!template || typeof template !== 'object') {
    throw new Error('calculateConfidenceScore: template must be a valid object');
  }

  if (!Array.isArray(template.keywords)) {
    throw new Error('calculateConfidenceScore: template.keywords must be an array');
  }

  const normalizedMessage = message.toLowerCase();
  const words = normalizedMessage.split(/\s+/);
  const messageWordSet = new Set(words);

  // 1. Keyword Density (30%): How many keywords are matched
  let matchedKeywords = 0;
  let wordBoundaryMatches = 0;

  // Handle empty keywords array safely (avoid NaN from division by zero)
  if (template.keywords.length === 0) {
    // Return zero scores for templates with no keywords
    return {
      keywordDensity: 0,
      wordBoundary: 0,
      specificity: 0,
      templateRelevance: 0,
      intentClarity: 0,
    };
  }

  for (const keyword of template.keywords) {
    const lowerKeyword = keyword.toLowerCase();

    // Check for word boundary match (more valuable)
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegex(lowerKeyword)}\\b`, 'i');
    if (wordBoundaryRegex.test(normalizedMessage)) {
      matchedKeywords++;
      wordBoundaryMatches++;
    } else if (normalizedMessage.includes(lowerKeyword)) {
      // Substring match (less valuable)
      matchedKeywords += 0.5;
    }
  }

  // Safe division - keywords.length is guaranteed > 0 here
  const keywordDensity = Math.min((matchedKeywords / template.keywords.length) * 100, 100);

  // 2. Word Boundary Score (25%): Ratio of exact word matches
  const wordBoundary = Math.min((wordBoundaryMatches / template.keywords.length) * 100, 100);

  // 3. Specificity (20%): Penalize templates that match too generically
  // More keywords = need more matches to be confident
  const minMatchRatio = template.keywords.length >= 8 ? 0.3 :
                        template.keywords.length >= 5 ? 0.25 :
                        template.keywords.length >= 3 ? 0.2 : 0.15;

  const specificity = matchedKeywords >= template.keywords.length * minMatchRatio
    ? Math.min(matchedKeywords * 15, 100)
    : matchedKeywords * 10;

  // 4. Template Relevance (15%): Check if description words appear in message
  const descriptionWords = (template.description || '').toLowerCase().split(/\s+/);
  const descriptionMatches = descriptionWords.filter(w =>
    w.length > 3 && messageWordSet.has(w)
  ).length;
  const templateRelevance = descriptionWords.length > 0
    ? Math.min((descriptionMatches / descriptionWords.length) * 100, 100)
    : 0;

  // 5. Intent Clarity (10%): Look for artifact-building intent
  const intentWords = ['create', 'build', 'make', 'generate', 'design', 'develop'];
  const hasIntent = intentWords.some(word => normalizedMessage.includes(word));
  const intentClarity = hasIntent ? 100 : 40;

  return {
    keywordDensity,
    wordBoundary,
    specificity,
    templateRelevance,
    intentClarity,
  };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Calculate weighted confidence score
 */
function calculateWeightedConfidence(scores: TemplateMatchResult['scores']): number {
  // Weights based on Z.ai's approach: equal importance with slight emphasis on core matching
  const weights = {
    keywordDensity: 0.30,    // 30%
    wordBoundary: 0.25,      // 25%
    specificity: 0.20,       // 20%
    templateRelevance: 0.15, // 15%
    intentClarity: 0.10,     // 10%
  };

  return (
    scores.keywordDensity * weights.keywordDensity +
    scores.wordBoundary * weights.wordBoundary +
    scores.specificity * weights.specificity +
    scores.templateRelevance * weights.templateRelevance +
    scores.intentClarity * weights.intentClarity
  );
}

/**
 * Get all template matches above a confidence threshold
 * Returns matches sorted by confidence (highest first)
 *
 * @throws {Error} If userMessage is invalid (null, undefined, or not a string)
 */
export function getTemplateMatches(
  userMessage: string,
  threshold: number = 25 // Minimum confidence to consider (0-100)
): TemplateMatchResult[] {
  // Input validation - throw Error for programming errors
  if (userMessage === null || userMessage === undefined) {
    throw new Error('getTemplateMatches: userMessage cannot be null or undefined');
  }

  if (typeof userMessage !== 'string') {
    throw new Error(`getTemplateMatches: userMessage must be a string, got ${typeof userMessage}`);
  }

  // Empty string is valid input, just returns no matches
  if (userMessage.trim() === '') {
    return [];
  }

  const results: TemplateMatchResult[] = [];

  for (const template of ARTIFACT_TEMPLATES) {
    const scores = calculateConfidenceScore(userMessage, template);
    const confidence = calculateWeightedConfidence(scores);

    if (confidence >= threshold) {
      results.push({
        template,
        confidence,
        scores,
        isHighQuality: confidence >= 70, // Z.ai uses 80%, we use 70% for artifacts
      });
    }
  }

  // Sort by confidence (highest first)
  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get the best matching template for a user message
 *
 * Uses confidence scoring with a 70% quality threshold.
 * Falls back to returning the best match above 25% if no high-quality match exists.
 *
 * @param userMessage - The user's message to match against templates
 * @returns Structured result with template guidance and match metadata
 *
 * @example
 * const result = getMatchingTemplate("create a landing page");
 * if (result.matched) {
 *   console.log(result.template); // Formatted template guidance
 *   console.log(result.confidence); // 85
 *   console.log(result.templateId); // "landing-page"
 * } else {
 *   console.log(result.reason); // "no_matches" | "low_confidence" | "invalid_input"
 * }
 */
export function getMatchingTemplate(userMessage: string): TemplateMatchOutput {
  // Validate input - return structured error instead of silent empty string
  if (userMessage === null || userMessage === undefined) {
    return {
      template: '',
      matched: false,
      reason: 'invalid_input',
    };
  }

  if (typeof userMessage !== 'string') {
    return {
      template: '',
      matched: false,
      reason: 'invalid_input',
    };
  }

  // Get matches (will return [] for empty string, which is valid)
  let matches: TemplateMatchResult[];
  try {
    matches = getTemplateMatches(userMessage, 25);
  } catch (error) {
    // Log the unexpected error for debugging
    console.error(
      '[template-matcher] Unexpected error in getTemplateMatches:',
      error instanceof Error ? error.message : error,
      { userMessage: userMessage.slice(0, 200) }
    );
    return {
      template: '',
      matched: false,
      reason: 'invalid_input',
    };
  }

  if (matches.length === 0) {
    return {
      template: '',
      matched: false,
      reason: 'no_matches',
    };
  }

  // Prefer high-quality matches (confidence >= 70%)
  const highQualityMatch = matches.find(m => m.isHighQuality);
  const bestMatch = highQualityMatch || matches[0];

  // Only return if we have a reasonable match
  // For non-high-quality matches, require at least 30% confidence
  if (!bestMatch.isHighQuality && bestMatch.confidence < 30) {
    return {
      template: '',
      matched: false,
      reason: 'low_confidence',
      confidence: bestMatch.confidence,
      templateId: bestMatch.template.id,
    };
  }

  // Format the template guidance
  return {
    template: formatTemplateGuidance(bestMatch.template),
    matched: true,
    reason: 'matched',
    confidence: bestMatch.confidence,
    templateId: bestMatch.template.id,
  };
}

/**
 * Formats an artifact template into system prompt guidance
 *
 * @param template - The artifact template to format
 * @returns Formatted guidance string ready for injection into system prompt
 */
function formatTemplateGuidance(template: ArtifactTemplate): string {
  return `
## EXACT PATTERN TO FOLLOW

You are building a ${template.name}. Use THIS EXACT STRUCTURE:

${template.exampleStructure}

**Requirements:**
${template.systemPromptGuidance}

${template.requiredLibraries.length > 0
  ? `**Required Libraries:** ${template.requiredLibraries.join(', ')}`
  : ''}
`.trim();
}

/**
 * Get all available template IDs
 * Useful for debugging and testing
 *
 * @returns Array of template IDs
 */
export function getAvailableTemplateIds(): string[] {
  return ARTIFACT_TEMPLATES.map(t => t.id);
}
