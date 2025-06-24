"""
UI/UX Specialist Agent - Google ADK Implementation

This agent provides expert-level user interface design, user experience optimization,
accessibility guidance, and frontend development recommendations.

Specializations:
- User interface design and prototyping
- User experience research and optimization
- Accessibility (WCAG) compliance and inclusive design
- Frontend frameworks and modern web technologies
- Design systems and component libraries
- Mobile-first and responsive design patterns
"""

from lib._tools import (
    adk_list_directory,
    adk_read_file,
    adk_search_knowledge,
    adk_vector_search,
)
from google.adk.tools import FunctionTool
from google.adk.agents import LlmAgent
import os
import sys

from dotenv import load_dotenv

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables
load_dotenv()

# Google ADK imports

# Import relevant tools for UI/UX analysis


def analyze_user_interface(context: str) -> str:
    """Analyze user interface design and provide detailed recommendations."""
    return f"""🎨 UI/UX Analysis for: {context}

## User Interface Assessment
- **Design System**: Implement atomic design methodology with reusable components
- **Visual Hierarchy**: Clear typography scale with consistent spacing (8px grid)
- **Color Palette**: Accessible color scheme with 4.5:1 contrast ratio minimum
- **Layout Strategy**: CSS Grid + Flexbox for responsive, mobile-first design

## User Experience Optimization
- **Information Architecture**: Intuitive navigation with breadcrumbs and search
- **User Flow**: Streamlined task completion with minimal cognitive load
- **Interaction Design**: Micro-interactions for feedback and engagement
- **Performance**: <3s load time with progressive loading and skeleton screens

## Accessibility (WCAG 2.1 AA)
- **Keyboard Navigation**: Full keyboard accessibility with visible focus indicators
- **Screen Reader Support**: Semantic HTML with proper ARIA labels
- **Color Independence**: Information conveyed through multiple channels
- **Text Alternatives**: Alt text for images, captions for videos

## Frontend Technology Stack
- **Framework**: React 18+ with TypeScript for type safety
- **Styling**: Tailwind CSS or Styled Components with CSS-in-JS
- **State Management**: Zustand or Redux Toolkit for complex state
- **Testing**: Jest + React Testing Library + Playwright for E2E

## Component Architecture
- **Design Tokens**: Centralized design values (colors, spacing, typography)
- **Component Library**: Storybook for component documentation and testing
- **Atomic Design**: Atoms → Molecules → Organisms → Templates → Pages
- **Accessibility**: Built-in a11y features in all components

## Mobile & Responsive Design
- **Breakpoints**: Mobile-first with 320px, 768px, 1024px, 1440px breakpoints
- **Touch Targets**: Minimum 44px touch targets for mobile usability
- **Progressive Enhancement**: Core functionality works without JavaScript
- **Performance**: Optimized images with WebP format and lazy loading

## Design System Implementation
- **Typography**: Modular scale with system fonts for performance
- **Spacing**: Consistent 8px grid system for visual rhythm
- **Icons**: SVG icon system with consistent style and sizing
- **Animation**: Purposeful animations with reduced motion preferences"""


def evaluate_user_experience(context: str) -> str:
    """Evaluate user experience and provide optimization recommendations."""
    return f"""🔍 UX Evaluation for: {context}

## User Research Insights
- **User Personas**: Define primary, secondary, and edge case users
- **User Journey Mapping**: Identify pain points and optimization opportunities
- **Usability Testing**: A/B testing for key conversion paths
- **Analytics Integration**: Heat maps, user recordings, conversion funnels

## Conversion Optimization
- **Call-to-Action**: Clear, prominent CTAs with action-oriented language
- **Form Design**: Progressive disclosure with inline validation
- **Trust Signals**: Social proof, testimonials, security badges
- **Error Handling**: Helpful error messages with recovery suggestions

## Performance UX
- **Perceived Performance**: Loading states, skeleton screens, progressive enhancement
- **Core Web Vitals**: LCP <2.5s, FID <100ms, CLS <0.1
- **Offline Experience**: Service worker for offline functionality
- **Progressive Web App**: App-like experience with push notifications

## Accessibility Excellence
- **Inclusive Design**: Design for diverse abilities and contexts
- **Cognitive Load**: Simplified interfaces with clear mental models
- **Error Prevention**: Constraints and confirmations for destructive actions
- **Help & Documentation**: Contextual help and onboarding flows"""


# Create the UI/UX Specialist Agent
ui_specialist = LlmAgent(
    name="ui_specialist",
    model="gemini-2.0-flash",
    description="Expert UI/UX designer specializing in user interface design, accessibility, frontend technologies, and user experience optimization.",
    instruction="""You are an expert UI/UX Specialist with comprehensive knowledge of:

## Core Expertise Areas
- **User Interface Design**: Visual design, typography, color theory, layout principles
- **User Experience**: User research, journey mapping, usability testing, conversion optimization
- **Accessibility**: WCAG guidelines, inclusive design, assistive technologies
- **Frontend Development**: React, Vue, Angular, modern CSS, responsive design
- **Design Systems**: Component libraries, design tokens, atomic design methodology
- **Mobile Design**: iOS/Android guidelines, responsive design, progressive web apps
- **Performance**: Core Web Vitals, loading optimization, perceived performance
- **Tools**: Figma, Sketch, Adobe XD, Storybook, browser dev tools

## Analysis Approach
1. **User-Centered Design**: Start with user needs and business objectives
2. **Accessibility First**: Ensure inclusive design from the beginning
3. **Performance Considerations**: Balance visual appeal with loading speed
4. **Mobile-First**: Design for mobile devices first, then scale up
5. **Component Thinking**: Create reusable, maintainable design systems

## Response Style
- Provide specific, actionable design recommendations
- Include accessibility considerations in all suggestions
- Suggest appropriate frontend technologies and frameworks
- Offer multiple design approaches with trade-offs
- Include implementation guidance for developers
- Consider user psychology and behavior patterns
- Reference established design principles and guidelines

Always provide expert-level UI/UX guidance that balances user needs, business goals, technical constraints, and accessibility requirements.""",
    tools=[
        FunctionTool(func=analyze_user_interface),
        FunctionTool(func=evaluate_user_experience),
        adk_vector_search,
        adk_search_knowledge,
        adk_read_file,
        adk_list_directory,
    ],
)
