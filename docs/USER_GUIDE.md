# Vana AI - Complete User Guide

**Created**: 2025-11-21
**Last Updated**: 2025-12-26
**Version**: 2.1
**Audience**: End Users, Developers, and Teams

---

## 📋 Table of Contents

- [Getting Started](#-getting-started)
- [Core Features](#-core-features)
- [Chat Interface](#-chat-interface)
- [Web Search Integration](#-web-search-integration)
- [Artifact System](#-artifact-system)
- [Chain of Thought Reasoning](#-chain-of-thought-reasoning)
- [Export & Sharing](#-export--sharing)
- [Advanced Features](#-advanced-features)
- [Tips & Best Practices](#-tips--best-practices)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)

---

## 🚀 Getting Started

### What is Vana AI?

Vana AI is an intelligent development assistant that transforms natural language into interactive code, components, and diagrams in real-time. Powered by advanced AI models, Vana helps you:

- **Build Faster**: Generate complete applications from simple descriptions
- **Learn More**: See exactly how AI thinks through problems
- **Search the Web**: Get real-time information with integrated web search
- **Collaborate**: Share artifacts and version history with your team

**AI Models in Use**:
- **Chat**: Gemini 3 Flash (OpenRouter) - Fast, conversational responses with 1M context
- **Artifacts**: Gemini 3 Flash (OpenRouter) - Deep reasoning with thinking mode for code generation
- **Images**: Gemini 2.5 Flash Image (OpenRouter) - AI image generation
- **Web Search**: Tavily API - Real-time web information retrieval

### Quick Start

1. **Sign Up**: Create an account with email or Google OAuth
2. **Start Chatting**: Type your first request in plain English
3. **Watch Magic Happen**: See artifacts appear in real-time
4. **Export & Use**: Download your creations in any format you need

### First Time Setup

#### Account Creation

```bash
# Option 1: Email Sign Up
1. Visit app.vana.ai
2. Click "Sign Up"
3. Enter your email and create a password
4. Verify your email address

# Option 2: Google OAuth
1. Click "Continue with Google"
2. Choose your Google account
3. Grant necessary permissions
4. You're ready to start!
```

#### Understanding the Interface

```
┌─────────────────────────────────────────────────────────────┐
│ Vana AI                                          [🌙] [👤] │
├─────────────────────────────────────────────────────────────┤
│ 💬 Chat History                    │ 🎨 Artifact Canvas  │
│ ┌─────────────────────────────┐    │ ┌─────────────────┐ │
│ │ Welcome to Vana AI!        │    │ │                 │ │
│ │ How can I help you today?  │    │ │   Your artifacts │
│ │                           │    │ │    appear here   │
│ └─────────────────────────────┘    │ └─────────────────┘ │
│                                   │                 │
│ ┌─────────────────────────────┐    │                 │
│ │ [Type your message here...] │    │                 │
│ └─────────────────────────────┘    │                 │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ Core Features

### AI-Powered Chat

**Natural Language Processing**
- Simply describe what you want to build
- Get instant, intelligent responses
- Supports complex, multi-step requests
- Context-aware conversations

**Example Prompts:**
```
"Create a React dashboard with user authentication"
"Build a todo app with drag and drop functionality"
"Design a landing page for a SaaS product"
"Generate a Python script to analyze CSV data"
```

### Real-Time Streaming

Watch as Vana AI thinks and creates in real-time:

1. **Analyzing**: Understanding your request
2. **Planning**: Determining the best approach
3. **Generating**: Creating code and artifacts
4. **Finalizing**: Polishing the result

### Multi-Artifact Support

Generate multiple artifacts in a single conversation:
- **React Components**: Interactive UI elements
- **HTML Pages**: Complete web pages
- **Diagrams**: Mermaid charts and flowcharts
- **Code Snippets**: Functions, classes, utilities
- **Images**: AI-generated visuals
- **Documentation**: Markdown files and guides

---

## 💬 Chat Interface

### Chat Sidebar

Your conversation history is organized automatically:

```
📅 Today
├── Dashboard Component (2 artifacts)
├── User Authentication Flow
└── API Integration Guide

📅 Yesterday  
├── Todo App (3 artifacts)
└── Data Visualization Dashboard

📅 Last 7 Days
├── Landing Page Design
├── Contact Form Component
└── Payment Integration
```

### Message Features

#### Rich Text Support
- **Code Blocks**: Syntax highlighting for all languages
- **Inline Formatting**: Bold, italic, links, lists
- **Artifact Embeds**: Interactive components in messages
- **Reasoning Steps**: See AI's thought process

#### Interactive Elements
- **Copy to Clipboard**: Quick copy of any code or text
- **Artifact Cards**: Preview and manage generated artifacts
- **Expand/Collapse**: Organize long conversations
- **Timestamps**: Track when messages were sent

### Input Methods

#### Text Input
- **Markdown Support**: Format your messages with Markdown
- **Code Blocks**: Use ```language syntax for code
- **@ Mentions**: Reference previous messages or artifacts
- **Commands**: Use `/help` for available commands

#### File Upload
- **Image Upload**: Add screenshots for context
- **File Analysis**: Upload files for AI analysis
- **Drag & Drop**: Simply drag files into the chat

#### Voice Input (Coming Soon)
- Voice-to-text conversion
- Language detection
- Real-time transcription

---

## 🔍 Web Search Integration

### Real-Time Information Retrieval

Vana can search the web for real-time information when needed, powered by the Tavily API:

- **Automatic Detection**: The AI determines when web search is needed based on your query
- **Inline Citations**: Sources appear as clickable badges in responses
- **Source Preview**: Hover over citations to see source details
- **Real-Time Data**: Get current information beyond the AI's training cutoff

### When Web Search is Used

The AI automatically searches the web when your question:
- Asks about current events or recent news
- Requires up-to-date statistics or data
- References recent releases, updates, or announcements
- Needs verification of time-sensitive information

### Understanding Search Results

```
┌─────────────────────────────────────────────────────────────┐
│ Your question: "What are the latest React 19 features?"    │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Searching the web...                                     │
│                                                             │
│ React 19 introduces several new features:                   │
│                                                             │
│ - **Actions**: Simplify async state management [1]          │
│ - **Server Components**: Enhanced server-side rendering [2] │
│ - **Use Hook**: New primitive for promises [1]              │
│                                                             │
│ Sources:                                                    │
│ [1] react.dev - React 19 Release Notes                      │
│ [2] vercel.com - Server Components Guide                    │
└─────────────────────────────────────────────────────────────┘
```

### Tips for Web Search Queries

**Be Specific About Time**:
```
❌ "What is React?"
✅ "What new features were added in React 19?"
```

**Ask About Current Events**:
```
❌ "How does JavaScript work?"
✅ "What JavaScript runtime updates were announced at the latest Node.js conference?"
```

---

## 🎨 Artifact System

### What are Artifacts?

Artifacts are interactive, runnable pieces of content generated by Vana AI. Instead of just code snippets, artifacts are fully functional components you can use immediately.

### Supported Artifact Types

#### React Components
```
<artifact type="application/vnd.ant.react" title="UserProfile">
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"

export default function UserProfile({ name, email, avatar }) {
  return (
    <Card className="p-6">
      <Avatar src={avatar} />
      <h3>{name}</h3>
      <p>{email}</p>
    </Card>
  )
}
</artifact>
```

#### HTML Pages
```
<artifact type="text/html" title="LandingPage">
<!DOCTYPE html>
<html>
<head>
  <title>My Landing Page</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div class="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
    <h1 class="text-4xl font-bold text-white">Welcome!</h1>
  </div>
</body>
</html>
</artifact>
```

#### Mermaid Diagrams
```
<artifact type="application/vnd.ant.mermaid" title="UserFlow">
graph TD
    A[User Login] --> B[Dashboard]
    B --> C[Create Project]
    C --> D[Configure Settings]
    D --> E[Deploy]
</artifact>
```

#### Code Snippets
```
<artifact type="application/vnd.ant.code" title="APIClient" language="javascript">
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }
  
  async get(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`);
    return response.json();
  }
}
</artifact>
```

### Artifact Canvas

The right panel displays all artifacts from your current conversation:

```
┌─────────────────────────────────────┐
│ 🎨 Artifacts (3)           [Export] │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 👤 UserProfile Component      │ │
│ │ [▶️ Preview] [✏️ Edit] [... ] │ │
│ │                               │ │
│ │ Interactive React component     │ │
│ │ with avatar and card layout     │ │
│ └─────────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────────┐ │
│ │ 📊 User Flow Diagram          │ │
│ │ [▶️ Preview] [📥 SVG] [...] │ │
│ │                               │ │
│ │ Mermaid diagram showing        │ │
│ │ user journey through app        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Artifact Features

#### Interactive Preview
- **Live Rendering**: See your artifacts in action
- **Real-time Updates**: Changes appear instantly
- **Responsive Design**: Test on different screen sizes
- **Error Detection**: Get immediate feedback on issues

#### Version Control
- **Automatic Versioning**: Every change is saved
- **Compare Versions**: See what changed between versions
- **Rollback**: Revert to previous versions
- **Branching**: Try different approaches

#### Collaboration
- **Share Links**: Send artifacts to team members
- **Comments**: Add notes and feedback
- **Embedding**: Use artifacts in other projects
- **Export**: Download in multiple formats

---

## 🧠 Chain of Thought Reasoning

### Understanding AI Reasoning

Vana AI shows you exactly how it thinks through problems. This transparency helps you:

- **Learn**: See best practices and approaches
- **Debug**: Understand why certain decisions were made
- **Trust**: Verify the AI's logic
- **Improve**: Get insights for future requests

### Reasoning Phases

#### 🔍 Research Phase
```
🔍 Research: Analyzing requirements
├── Identifying key features needed
├── Researching best practices for React forms
├── Finding optimal UI patterns
└── Checking accessibility requirements
```

#### 💡 Analysis Phase
```
💡 Analysis: Planning implementation
├── Component structure design
├── State management strategy
├── API integration points
└── Error handling approach
```

#### 🎯 Solution Phase
```
🎯 Solution: Creating implementation
├── Building React components
├── Implementing form validation
├── Adding responsive design
└── Testing user interactions
```

### Interactive Reasoning

#### Expandable Steps
- Click any reasoning step to see details
- Each step contains specific items and considerations
- Collapsed view shows overview, expanded shows details

#### Real-time Updates
- Watch reasoning appear as AI thinks
- Progress indicators show current phase
- Complete reasoning saved with each message

#### Learning Features
- **Best Practices**: See industry standards in action
- **Alternative Approaches**: Multiple solution methods
- **Trade-offs**: Understand design decisions
- **Context**: Learn why specific technologies were chosen

---

## 📤 Export & Sharing

> **Coming Soon**: Full export functionality is currently under development. Basic copy-to-clipboard and source download are available now. Advanced export formats and sharing features described below are planned for future releases.

### Export Options

Every artifact can be exported in multiple formats:

#### Universal Options (All Artifacts)
- **📋 Copy to Clipboard**: Quick copy of source code
- **💾 Download Source**: Original file format
- **📦 Export with Versions**: Include complete history

#### React Components
- **⚛️ JSX Component**: Complete React component with imports
- **📦 Standalone HTML**: As HTML with React CDN

#### HTML Pages
- **🌐 Standalone HTML**: Complete page with dependencies
- **📦 Project Export**: HTML + CSS + JS as ZIP

#### Mermaid Diagrams
- **📊 SVG Image**: Rendered diagram as vector
- **📝 Source File**: Original Mermaid syntax

#### Images
- **🖼️ PNG Download**: High-quality image file
- **📋 Copy URL**: Direct link to image

### Export Workflow

#### Individual Export
1. Click the **Export** button on any artifact
2. Choose your preferred format
3. File downloads automatically
4. Success notification appears

#### Batch Export
1. Select multiple artifacts in the canvas
2. Click **Export All**
3. Choose **ZIP Archive** format
4. All artifacts bundled and downloaded

#### Version History Export
1. Click artifact **History** button
2. Select versions to include
3. Choose **Export with Versions**
4. JSON file with all versions downloaded

### Sharing Features

#### Direct Links
- Generate shareable URLs for artifacts
- View-only access for collaboration
- Automatic expiration options

#### Embedding
- Copy embed code for websites
- Responsive iframe support
- Custom styling options

#### Team Collaboration
- Workspace sharing (Pro feature)
- Real-time co-editing
- Comment and review system

---

## 🔧 Advanced Features

### Prompt Engineering

#### Structured Prompts
Get better results with structured prompts:

```
Context: Building a dashboard for analytics
Task: Create a responsive data visualization component
Requirements:
- Display monthly revenue data using bar charts
- Include filters for date range and product category
- Support real-time data updates
- Mobile-friendly design
Output: React component with Recharts integration
```

#### Template Prompts
Use pre-built templates for common tasks:

```
/dashboard: "Create analytics dashboard with charts"
/form: "Build form with validation and submission"
/table: "Generate data table with sorting and filtering"
/api: "Create API client with error handling"
```

### Customization

#### Component Libraries
- **shadcn/ui**: Modern, accessible components
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Data visualization
- **Radix UI**: Unstyled primitives

#### Styling Options
- **Theme System**: Dark/light mode support
- **Custom Colors**: Brand color integration
- **Typography**: Font family and sizing
- **Spacing**: Layout and padding preferences

### Integration Options

#### Git Integration
- Connect to GitHub repositories
- Commit artifacts directly
- Pull request generation
- Branch management

#### API Integration
- Export to REST APIs
- Webhook support
- Database connections
- Third-party services

---

## 💡 Tips & Best Practices

### Getting Better Results

#### Be Specific
```
❌ "Make a button"
✅ "Create a primary button with hover effects, 
    loading state, and accessibility labels for a checkout form"
```

#### Provide Context
```
❌ "Fix this code"
✅ "This React form component isn't submitting properly. 
    The validation works but the onSubmit handler 
    isn't being called. Can you debug it?"
```

#### Iterate and Refine
1. Start with a basic request
2. Review the generated artifact
3. Ask for specific improvements
4. Export when satisfied

### Workflow Optimization

#### Session Management
- Use descriptive session titles
- Organize by project or feature
- Archive old conversations
- Use search to find relevant content

#### Artifact Organization
- Give artifacts descriptive titles
- Use consistent naming conventions
- Tag artifacts for easy filtering
- Keep related artifacts together

#### Collaboration Tips
- Share artifacts early for feedback
- Use version control for iterations
- Comment on specific changes
- Document decisions and trade-offs

### Performance Tips

#### Large Artifacts
- Break complex requests into smaller parts
- Use pagination for large datasets
- Optimize images and assets
- Test on different devices

#### Code Quality
- Review generated code before using
- Add error handling and validation
- Test thoroughly in production
- Follow accessibility guidelines

---

## 🔧 Troubleshooting

### Common Issues

#### Artifacts Not Rendering

**Symptoms**: Blank artifact canvas or error messages

**Solutions**:
1. Check your internet connection
2. Refresh the page (Ctrl/Cmd + R)
3. Clear browser cache
4. Try a different browser
5. Check console for error messages

#### Slow Performance

**Symptoms**: Laggy interface or slow generation

**Solutions**:
1. Close other browser tabs
2. Check system resources
3. Reduce artifact complexity
4. Use smaller code snippets
5. Disable browser extensions

#### Export Failures

**Symptoms**: Download doesn't start or errors occur

**Solutions**:
1. Check browser download settings
2. Allow pop-ups for this site
3. Try a different export format
4. Check available disk space
5. Use clipboard copy as fallback

#### Reasoning Not Showing

**Symptoms**: No Chain of Thought displayed

**Solutions**:
1. Enable reasoning in settings
2. Check if feature is available for your plan
3. Try a more complex request
4. Clear conversation cache
5. Contact support if issue persists

### Error Messages

#### "Failed to Generate Artifact"
- **Cause**: Request too complex or ambiguous
- **Solution**: Break into smaller, specific requests

#### "Export Not Available"
- **Cause**: Feature not available for artifact type
- **Solution**: Try a different export format

#### "Rate Limit Exceeded"
- **Cause**: Too many requests in short time
- **Solution**: Wait a few minutes before retrying

#### "Authentication Required"
- **Cause**: Session expired or login required
- **Solution**: Sign in again

### Getting Help

#### Built-in Help
- Type `/help` in chat for command list
- Use the help button in the interface
- Check the knowledge base articles

#### Community Support
- Visit the Discord community
- Browse GitHub discussions
- Check Stack Overflow for common issues

#### Direct Support
- Use the in-app support chat
- Email support@vana.ai
- Submit bug reports through the interface

---

## ❓ FAQ

### General Questions

**Q: Is Vana AI free to use?**
A: Vana offers a free tier with basic features and paid plans for advanced functionality. Check the pricing page for details.

**Q: What programming languages are supported?**
A: Vana supports all major languages including JavaScript, TypeScript, Python, Java, C++, Go, Rust, and more.

**Q: Can I use Vana AI for commercial projects?**
A: Yes, generated code can be used in commercial projects. Check the license terms for details.

**Q: How does Vana AI protect my data?**
A: All data is encrypted in transit and at rest. We don't share your conversations with third parties.

### Technical Questions

**Q: What AI models does Vana use?**
A: Vana uses Gemini 3 Flash for chat and artifact generation with reasoning mode, and Gemini 2.5 Flash Lite for titles and summaries.

**Q: Can I integrate Vana AI with my existing tools?**
A: Yes, Vana offers API access and integrations with popular development tools.

**Q: How large can artifacts be?**
A: Individual artifacts can be up to 10MB. Larger projects should be split into multiple artifacts.

**Q: Can I import existing code into Vana?**
A: Yes, you can upload code files for analysis, modification, or explanation.

### Billing Questions

**Q: How is usage measured?**
A: Usage is measured by the number of artifacts generated and API calls made.

**Q: Can I change my plan?**
A: Yes, you can upgrade or downgrade your plan at any time.

**Q: Is there a limit on the number of conversations?**
A: Free tier has limited conversations, paid plans have unlimited conversations.

### Feature Questions

**Q: Does Vana AI support team collaboration?**
A: Yes, Pro and Enterprise plans include team collaboration features.

**Q: Can I customize the AI responses?**
A: Yes, you can set preferences and customize prompts for your use case.

**Q: Is there a mobile app?**
A: Vana AI is web-based but works great on mobile browsers. A native app is in development.

---

## 📚 Additional Resources

### Documentation
- [API Reference](./API_REFERENCE.md)
- [Security Best Practices](../SECURITY.md)

### Support
- [Contact Support](mailto:support@vana.ai)
- [Changelog](./CHANGELOG.md)

---

**Last Updated**: 2025-12-26
**Version**: 2.1
**Next Review**: 2026-01-26

Need help? Contact us at [support@vana.ai](mailto:support@vana.ai).
