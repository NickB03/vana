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
    keywords: ['landing', 'homepage', 'marketing', 'hero', 'cta', 'website'],
    requiredLibraries: [],
    systemPromptGuidance: `
Create a modern landing page with:
- Hero section with headline, subheadline, and CTA button using shadcn Button
- Features section with 3-6 feature cards (icon from lucide-react + title + description) using shadcn Card
- Testimonials section using shadcn Card with Avatar
- Final CTA section with shadcn Button
- Mobile-responsive design with Tailwind
- Use gradient backgrounds and modern UI patterns
- Include smooth scroll animations
- Use shadcn/ui components: Button, Card, Avatar, Badge
`,
    exampleStructure: `
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="landing-page">
      <section className="hero py-20 px-4">
        <h1 className="text-5xl font-bold">Main Headline</h1>
        <p className="text-xl mt-4">Compelling subheadline</p>
        <Button size="lg" className="mt-6">Get Started</Button>
      </section>
      <section className="features py-16 px-4">
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <Star className="w-12 h-12 mb-4" />
              <h3 className="font-bold text-lg">Feature Title</h3>
              <p>Feature description</p>
            </CardContent>
          </Card>
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
Create an interactive form using shadcn/ui components:
- Use shadcn Form, Input, Label, Button components
- Implement client-side validation with visual feedback
- Show loading state during submission with Button disabled state
- Display success/error messages using shadcn Alert
- Include proper accessibility (labels, ARIA attributes)
- Mobile-friendly layout with proper spacing
- Use shadcn/ui components: Form, Input, Label, Button, Alert, Card
`,
    exampleStructure: `
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Contact Us</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input type="email" id="email" required />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Submit"}
          </Button>
          {success && (
            <Alert>
              <AlertDescription>Form submitted successfully!</AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
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
Create a dashboard interface with shadcn/ui:
- Top metrics cards using shadcn Card showing KPIs with Badge for status
- Chart visualizations using recharts
- Data table with shadcn Table component
- Responsive grid layout
- Use shadcn Tabs for different dashboard views
- Include shadcn Avatar for user profile
- Use shadcn/ui components: Card, Badge, Table, Tabs, Avatar, Button
`,
    exampleStructure: `
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts"

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Total Users
              <Badge>+12%</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">1,234</p>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              <LineChart width={600} height={300} data={[]}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#8884d8" />
              </LineChart>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
Create a data table with shadcn/ui:
- Use shadcn Table component for structure
- Add Input for search/filter functionality
- Include Button for actions
- Use Badge for status indicators
- Add pagination controls
- Implement sorting with clear visual indicators
- Mobile-responsive with horizontal scroll
- Use shadcn/ui components: Table, Input, Button, Badge, Select
`,
    exampleStructure: `
import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"

export default function DataTable() {
  const [search, setSearch] = useState("")
  
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4" />
        <Input 
          placeholder="Search..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Item 1</TableCell>
              <TableCell><Badge>Active</Badge></TableCell>
              <TableCell><Button size="sm" variant="outline">Edit</Button></TableCell>
            </TableRow>
          </TableBody>
        </Table>
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
Create a settings page with shadcn/ui:
- Use Tabs for different setting categories
- Use Card to group related settings
- Include Switch for toggle options
- Use Input and Label for text settings
- Add Button for save actions
- Include Alert for important notices
- Use Separator to divide sections
- Use shadcn/ui components: Tabs, Card, Switch, Input, Label, Button, Alert, Separator
`,
    exampleStructure: `
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Enable notifications</Label>
                <Switch id="notifications" />
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
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
