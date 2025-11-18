export default function ChatStyleDemo() {
  // User message styling (keeping the bubble)
  const userBg = "hsl(215 85% 65% / 0.20)";
  const userBorder = "hsl(215 85% 65% / 0.40)";
  const userShadow = "0 1px 2px 0 hsl(215 85% 65% / 0.10), 0 4px 8px -2px hsl(215 85% 65% / 0.20), 0 0 0 1px hsl(215 85% 65% / 0.15)";

  const aiMessageVariations = [
    {
      name: "Option 1: Left Accent Border",
      description: "ChatGPT style - subtle left border with no background",
      style: {
        borderLeft: "3px solid hsl(190 88% 62% / 0.6)",
        paddingLeft: "1rem",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
      }
    },
    {
      name: "Option 2: Minimal Bottom Border",
      description: "Clean separator - thin bottom line only",
      style: {
        borderBottom: "1px solid hsl(0 0% 100% / 0.1)",
        paddingBottom: "1rem",
        marginBottom: "0.5rem",
      }
    },
    {
      name: "Option 3: Indented Text Block",
      description: "Simple left padding, no borders",
      style: {
        paddingLeft: "1.5rem",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
      }
    },
    {
      name: "Option 4: Thick Left Bar",
      description: "Bold accent bar for strong visual anchor",
      style: {
        borderLeft: "6px solid hsl(190 88% 62% / 0.5)",
        paddingLeft: "1.25rem",
        paddingTop: "0.75rem",
        paddingBottom: "0.75rem",
      }
    },
    {
      name: "Option 5: Gradient Left Border",
      description: "Fade effect from accent to transparent",
      style: {
        borderLeft: "3px solid transparent",
        borderImage: "linear-gradient(to bottom, hsl(190 88% 62% / 0.8), hsl(190 88% 62% / 0.1)) 1",
        paddingLeft: "1rem",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
      }
    },
    {
      name: "Option 6: Double Border System",
      description: "Outer + inner border for depth without background",
      style: {
        borderLeft: "1px solid hsl(0 0% 100% / 0.1)",
        borderBottom: "1px solid hsl(0 0% 100% / 0.05)",
        paddingLeft: "1rem",
        paddingBottom: "1rem",
        paddingTop: "0.5rem",
        marginBottom: "0.5rem",
      }
    },
    {
      name: "Option 7: No Border, Extra Spacing",
      description: "Pure whitespace separation - ultra minimal",
      style: {
        paddingTop: "1rem",
        paddingBottom: "1rem",
        marginBottom: "0.5rem",
      }
    },
    {
      name: "Option 8: Dotted Left Accent",
      description: "Playful dotted border style",
      style: {
        borderLeft: "3px dotted hsl(190 88% 62% / 0.4)",
        paddingLeft: "1rem",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
      }
    },
    {
      name: "Option 9: Top + Bottom Borders",
      description: "Sandwich style with dual borders",
      style: {
        borderTop: "1px solid hsl(0 0% 100% / 0.08)",
        borderBottom: "1px solid hsl(0 0% 100% / 0.08)",
        paddingTop: "1rem",
        paddingBottom: "1rem",
        marginTop: "0.5rem",
        marginBottom: "0.5rem",
      }
    },
    {
      name: "Option 10: Thin Vertical Line",
      description: "Very subtle 1px left line",
      style: {
        borderLeft: "1px solid hsl(190 88% 62% / 0.3)",
        paddingLeft: "0.75rem",
        paddingTop: "0.5rem",
        paddingBottom: "0.5rem",
      }
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">AI Message Styles (No Bubble)</h1>
          <p className="text-muted-foreground mb-2">
            10 different approaches for AI messages without background bubbles - using your exact glassmorphism background
          </p>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-12 rounded border" style={{ backgroundColor: userBg, borderColor: userBorder }}></div>
              <span className="text-muted-foreground">User: Vibrant Blue (with bubble)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">AI: No bubble, various border styles</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {aiMessageVariations.map((variant, index) => (
            <div
              key={index}
              className="rounded-xl border bg-card p-6 hover:border-primary/50 transition-colors"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">{variant.name}</h3>
                <p className="text-sm text-muted-foreground">{variant.description}</p>
              </div>

              {/* Sample Messages */}
              <div className="space-y-4 bg-black/30 rounded-lg p-4">
                {/* User Message (with bubble) */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-3xl px-5 py-2.5 text-sm border transition-all"
                    style={{
                      backgroundColor: userBg,
                      borderColor: userBorder,
                      boxShadow: userShadow,
                    }}
                  >
                    Give him a super hero cape make him flying in the air
                  </div>
                </div>

                {/* AI Message (NO bubble - just the variation style) */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[85%] text-sm text-foreground transition-all"
                    style={variant.style}
                  >
                    I've generated an image for you: Give him a super hero cape make him flying in the air
                  </div>
                </div>
              </div>

              {/* Style Values */}
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  View CSS styles
                </summary>
                <div className="mt-2 space-y-1 text-xs font-mono bg-muted/50 p-3 rounded max-h-32 overflow-auto">
                  {Object.entries(variant.style).map(([key, value]) => (
                    <div key={key} className="text-muted-foreground">
                      <span className="text-cyan-400">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 rounded-xl border bg-muted/30">
          <h3 className="font-semibold mb-2">Professional Recommendations</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong className="text-foreground">Option 1 (Left Accent):</strong> Industry standard - ChatGPT, Claude, Perplexity</li>
            <li><strong className="text-foreground">Option 4 (Thick Bar):</strong> Strong visual anchor without overwhelming</li>
            <li><strong className="text-foreground">Option 7 (No Border):</strong> Ultimate minimalism - focus purely on content</li>
            <li><strong className="text-foreground">Option 10 (Thin Line):</strong> Subtle structure without distraction</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
