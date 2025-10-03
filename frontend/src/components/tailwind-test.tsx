import React from 'react';

/**
 * Test component to verify Tailwind CSS configuration
 * Tests standard classes, CSS variables, and shadcn/ui compatibility
 */
export function TailwindTest() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground mb-6">
        Tailwind CSS Configuration Test
      </h1>
      
      {/* Standard Tailwind Classes */}
      <div className="space-y-4">
        <div className="bg-background border border-border rounded-lg p-4">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Standard Tailwind Classes
          </h2>
          <p className="text-muted-foreground">
            This text uses standard Tailwind utility classes and should be properly styled.
          </p>
        </div>

        {/* CSS Variables Test */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xl font-semibold text-card-foreground mb-2">
            CSS Variables (shadcn/ui)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary text-primary-foreground p-3 rounded">
              Primary
            </div>
            <div className="bg-secondary text-secondary-foreground p-3 rounded">
              Secondary
            </div>
            <div className="bg-muted text-muted-foreground p-3 rounded">
              Muted
            </div>
            <div className="bg-accent text-accent-foreground p-3 rounded">
              Accent
            </div>
          </div>
        </div>

        {/* Border Radius Test */}
        <div className="bg-card border border-border p-4">
          <h2 className="text-xl font-semibold text-card-foreground mb-2">
            Border Radius Variables
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted p-3 rounded-sm text-center text-muted-foreground">
              Small (sm)
            </div>
            <div className="bg-muted p-3 rounded-md text-center text-muted-foreground">
              Medium (md)
            </div>
            <div className="bg-muted p-3 rounded-lg text-center text-muted-foreground">
              Large (lg)
            </div>
          </div>
        </div>

        {/* Animation Test */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xl font-semibold text-card-foreground mb-2">
            Animation Test
          </h2>
          <div className="animate-fade-in">
            <p className="text-muted-foreground">
              This element should have a fade-in animation (if tailwindcss-animate is working).
            </p>
          </div>
        </div>

        {/* Dark Mode Test */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xl font-semibold text-card-foreground mb-2">
            Dark Mode Test
          </h2>
          <p className="text-muted-foreground mb-2">
            Toggle between light and dark modes to test CSS variable switching.
          </p>
          <button 
            onClick={() => document.documentElement.classList.toggle('dark')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 transition-opacity"
          >
            Toggle Dark Mode
          </button>
        </div>

        {/* Focus Ring Test */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-xl font-semibold text-card-foreground mb-2">
            Focus Ring Test
          </h2>
          <input 
            type="text" 
            placeholder="Click here to test focus ring"
            className="w-full p-2 border border-input bg-background text-foreground rounded focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}