# Vana 2.0 - Public Launch Release Notes

**Date:** January 28, 2026
**Version:** 2.0.0

🎉 **We are thrilled to announce the public launch of Vana!** 🎉

Vana is an AI-powered development assistant that transforms natural language into interactive code, React components, diagrams, and images in real-time. Previously a private internal tool, Vana is now open source and ready for the world.

## 🌟 Key Features

### 🤖 Intelligent AI Chat
- Powered by **Google Gemini 3 Flash** (via OpenRouter) for lightning-fast, intelligent responses.
- **1M Token Context Window**: Maintains deep conversation history and understands complex project contexts.
- **Real-time Streaming**: Watch your ideas materialize with instant streaming responses.

### 📦 Interactive Artifacts
Vana goes beyond text. It generates "Artifacts"—fully functional components that render right in your chat:
- **React Components**: Full support for `shadcn/ui`, `framer-motion`, and `recharts`.
- **HTML Pages**: Generating landing pages and layouts has never been easier.
- **Mermaid Diagrams**: Visualize architectures and flows instantly.
- **SVG Graphics**: Create icons and illustrations on the fly.
- **Sandpack Integration**: Client-side rendering ensures artifacts are secure and fast.

### 🛡️ Enterprise-Grade Security
- **Secure by Design**: Built on Supabase with Row-Level Security (RLS).
- **Artifact Isolation**: Artifacts run in isolated sandboxed environments.
- **Guest Rate Limiting**: Fair usage policies for guest users.

### 📱 Modern Experience
- **Responsive Design**: Works beautifully on desktop and mobile.
- **Multi-Artifact Workspace**: Work on multiple components simultaneously.
- **Export Options**: Download artifacts as code, HTML, or ZIP files.

## 🚀 What's New in 2.0.0?

This release marks our transition from a private alpha (1.x series) to a public beta.

- **Public Repository Cleanup**: usage of sensitive internal tools has been removed.
- **Optimized for Open Source**: Documentation updated for public contributors.
- **Performance Improvements**: Latest optimization for artifact rendering and streaming.

## 🤝 Getting Started
Check out our [README](README.md) to set up Vana locally. We welcome contributions from the community!

---
*Built with ❤️ by the Vana Team*
