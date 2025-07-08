import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

/**
 * Component Anatomy Example
 * 
 * ⚠️ NOTE: This is a template file for AI reference. The TypeScript errors are expected
 * since this is not part of an actual React project with dependencies installed.
 * 
 * This component demonstrates the standard structure and styling patterns
 * for building components in the VANA chat UI using shadcn/ui and Tailwind CSS.
 * 
 * Key Patterns Demonstrated:
 * - shadcn/ui Card component composition with proper imports
 * - Semantic CSS variable usage with Tailwind CSS
 * - Mobile-first responsive design approach
 * - Clear visual state indicators for agentic UI
 * - Proper use of the cn() utility for conditional styling
 * 
 * Required Dependencies (for actual implementation):
 * - npm install @radix-ui/react-card clsx tailwind-merge
 * - npx shadcn@latest add card
 * 
 * Setup Requirements:
 * 1. Initialize shadcn/ui: npx shadcn@latest init
 * 2. Configure path aliases in tsconfig.json: "@/*": ["./src/*"]
 * 3. Create utility function in lib/utils.ts (see implementation below)
 */
export function ComponentAnatomyExample() {
  return (
    <Card className="w-full max-w-md mx-auto bg-card border shadow-md hover:shadow-lg transition-shadow duration-200">
      {/* Card Header Section */}
      <CardHeader className="space-y-2 pb-4">
        {/* Primary Title - Uses semantic text color */}
        <CardTitle className="text-foreground font-semibold text-lg leading-tight">
          VANA Agent Status
        </CardTitle>
        
        {/* Supporting Description - Uses secondary text color */}
        <CardDescription className="text-muted-foreground text-sm leading-relaxed">
          Real-time status of your AI agents with clear visual indicators
        </CardDescription>
      </CardHeader>

      {/* Card Content Section */}
      <CardContent className="space-y-4">
        {/* Status Indicator - Agentic UI Pattern */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
          {/* Animated thinking indicator */}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
          </div>
          
          {/* Status text */}
          <span className="text-foreground text-sm font-medium">
            Processing your request...
          </span>
        </div>

        {/* Action Button - Interactive element with hover states */}
        <button className={cn(
          // Base styles using semantic color tokens
          "w-full px-4 py-2 rounded-md font-medium text-sm transition-all duration-200",
          // Theme colors using shadcn/ui semantic tokens
          "bg-primary text-primary-foreground",
          // Interactive states
          "hover:bg-primary/90 hover:shadow-md",
          "active:bg-primary/80 active:transform active:scale-[0.98]",
          // Focus states for accessibility
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          // Mobile optimization
          "touch-manipulation"
        )}>
          Send Message
        </button>

        {/* Secondary Information - Muted styling */}
        <div className="text-muted-foreground text-xs text-center border-t border-border pt-3 mt-4">
          Powered by Google ADK Multi-Agent System
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Required lib/utils.ts Implementation:
 * 
 * import { clsx, type ClassValue } from "clsx"
 * import { twMerge } from "tailwind-merge"
 * 
 * export function cn(...inputs: ClassValue[]) {
 *   return twMerge(clsx(inputs))
 * }
 * 
 * Usage Example:
 * 
 * import { ComponentAnatomyExample } from '@/components/ComponentAnatomyExample';
 * 
 * function App() {
 *   return (
 *     <div className="min-h-screen bg-background p-4">
 *       <ComponentAnatomyExample />
 *     </div>
 *   );
 * }
 * 
 * Shadcn/UI Semantic Tokens Used:
 * - bg-card: Card background
 * - bg-muted: Nested element background  
 * - bg-background: Page background
 * - text-foreground: Primary text content
 * - text-muted-foreground: Secondary/muted text
 * - text-primary-foreground: Text on primary colored backgrounds
 * - border-border: Standard borders
 * - bg-primary: Primary action color
 * - hover:bg-primary/90: Primary hover state with opacity
 * - active:bg-primary/80: Primary active state with opacity
 * - focus:ring-ring: Focus ring color
 * 
 * CSS Variables Setup (add to globals.css):
 * 
 * @layer base {
 *   :root {
 *     --background: 0 0% 100%;
 *     --foreground: 222.2 84% 4.9%;
 *     --card: 0 0% 100%;
 *     --card-foreground: 222.2 84% 4.9%;
 *     --primary: 222.2 47.4% 11.2%;
 *     --primary-foreground: 210 40% 98%;
 *     --muted: 210 40% 96%;
 *     --muted-foreground: 215.4 16.3% 46.9%;
 *     --border: 214.3 31.8% 91.4%;
 *     --ring: 222.2 84% 4.9%;
 *   }
 * 
 *   .dark {
 *     --background: 222.2 84% 4.9%;
 *     --foreground: 210 40% 98%;
 *     --card: 222.2 84% 4.9%;
 *     --card-foreground: 210 40% 98%;
 *     --primary: 210 40% 98%;
 *     --primary-foreground: 222.2 47.4% 11.2%;
 *     --muted: 217.2 32.6% 17.5%;
 *     --muted-foreground: 215 20.2% 65.1%;
 *     --border: 217.2 32.6% 17.5%;
 *     --ring: 212.7 26.8% 83.9%;
 *   }
 * }
 */
