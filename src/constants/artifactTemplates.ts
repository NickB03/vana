// Phase 5: Smart Artifact Templates
// IMPORTANT: All examples use Radix UI + Tailwind (NOT shadcn/ui)
// Artifacts run in isolated sandboxes and cannot access local @/ imports

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
    requiredLibraries: ['recharts'],
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
    requiredLibraries: [],
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
  }
];
