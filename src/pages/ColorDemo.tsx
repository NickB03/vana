export default function ColorDemo() {
  // Base colors from Option 1 (Discord Style) - vibrant blue user vs neutral gray AI
  const userBg = "hsl(215 85% 65% / 0.20)";
  const userBorder = "hsl(215 85% 65% / 0.40)";
  const aiBg = "hsl(0 0% 100% / 0.08)";
  const aiBorder = "hsl(0 0% 100% / 0.15)";

  const shadowVariations = [
    {
      name: "Option 1: Three-Layer Depth",
      userShadow: "0 1px 2px 0 hsl(215 85% 65% / 0.10), 0 4px 8px -2px hsl(215 85% 65% / 0.20), 0 0 0 1px hsl(215 85% 65% / 0.15)",
      aiShadow: "0 1px 2px 0 hsl(0 0% 100% / 0.04), 0 4px 8px -2px hsl(0 0% 100% / 0.08), 0 0 0 1px hsl(0 0% 100% / 0.06)",
      description: "Ambient + direct + rim lighting - balanced natural depth"
    },
    {
      name: "Option 2: Soft Diffuse Glow",
      userShadow: "0 2px 12px 0 hsl(215 85% 65% / 0.25), 0 8px 24px -4px hsl(215 85% 65% / 0.30), 0 0 0 1px hsl(215 85% 65% / 0.12)",
      aiShadow: "0 2px 12px 0 hsl(0 0% 100% / 0.08), 0 8px 24px -4px hsl(0 0% 100% / 0.12), 0 0 0 1px hsl(0 0% 100% / 0.05)",
      description: "Large, soft shadows - dreamy, floating appearance"
    },
    {
      name: "Option 3: Sharp Neon Glow",
      userShadow: "0 0 8px hsl(215 85% 65% / 0.50), 0 0 16px hsl(215 85% 65% / 0.30), 0 0 0 2px hsl(215 85% 65% / 0.40)",
      aiShadow: "0 0 6px hsl(0 0% 100% / 0.20), 0 0 12px hsl(0 0% 100% / 0.15), 0 0 0 1px hsl(0 0% 100% / 0.15)",
      description: "Bright outer glow - neon, energetic, modern"
    },
    {
      name: "Option 4: Minimal Flat",
      userShadow: "0 1px 3px 0 hsl(215 85% 65% / 0.12), 0 0 0 1px hsl(215 85% 65% / 0.10)",
      aiShadow: "0 1px 3px 0 hsl(0 0% 0% / 0.10), 0 0 0 1px hsl(0 0% 100% / 0.05)",
      description: "Subtle, almost flat - clean, minimalist"
    },
    {
      name: "Option 5: Deep Shadow",
      userShadow: "0 2px 4px -1px hsl(215 85% 65% / 0.15), 0 8px 16px -4px hsl(215 85% 65% / 0.30), 0 16px 32px -8px hsl(215 85% 65% / 0.25), 0 0 0 1px hsl(215 85% 65% / 0.18)",
      aiShadow: "0 2px 4px -1px hsl(0 0% 0% / 0.15), 0 8px 16px -4px hsl(0 0% 0% / 0.20), 0 16px 32px -8px hsl(0 0% 0% / 0.15), 0 0 0 1px hsl(0 0% 100% / 0.08)",
      description: "Strong depth - dramatic elevation, floating cards"
    },
    {
      name: "Option 6: Halo Effect",
      userShadow: "0 0 0 3px hsl(215 85% 65% / 0.15), 0 0 12px 2px hsl(215 85% 65% / 0.20), 0 4px 8px -2px hsl(215 85% 65% / 0.15)",
      aiShadow: "0 0 0 2px hsl(0 0% 100% / 0.08), 0 0 10px 1px hsl(0 0% 100% / 0.12), 0 4px 8px -2px hsl(0 0% 0% / 0.10)",
      description: "Outer ring glow - highlighted, focused attention"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Shadow & Glow Variations</h1>
          <p className="text-muted-foreground mb-2">
            Using <strong>Option 1 (Discord Style)</strong> colors - compare 6 different shadow and glow effects
          </p>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-12 rounded border" style={{ backgroundColor: userBg, borderColor: userBorder }}></div>
              <span className="text-muted-foreground">User: Vibrant Blue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-12 rounded border" style={{ backgroundColor: aiBg, borderColor: aiBorder }}></div>
              <span className="text-muted-foreground">AI: Neutral Gray</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {shadowVariations.map((variant, index) => (
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
                {/* User Message */}
                <div className="flex justify-end">
                  <div
                    className="max-w-[80%] rounded-3xl px-5 py-2.5 text-sm border transition-all"
                    style={{
                      backgroundColor: userBg,
                      borderColor: userBorder,
                      boxShadow: variant.userShadow,
                    }}
                  >
                    Give him a super hero cape make him flying in the air
                  </div>
                </div>

                {/* AI Message */}
                <div className="flex justify-start">
                  <div
                    className="max-w-[85%] rounded-lg px-4 py-3 text-sm border transition-all"
                    style={{
                      backgroundColor: aiBg,
                      borderColor: aiBorder,
                      boxShadow: variant.aiShadow,
                    }}
                  >
                    I've generated an image for you: Give him a super hero cape make him flying in the air
                  </div>
                </div>
              </div>

              {/* Shadow Values */}
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                  View shadow CSS
                </summary>
                <div className="mt-2 space-y-2 text-xs font-mono bg-muted/50 p-3 rounded max-h-32 overflow-auto">
                  <div className="text-blue-400">User shadow:</div>
                  <div className="text-muted-foreground break-all">{variant.userShadow}</div>
                  <div className="text-cyan-400 mt-2">AI shadow:</div>
                  <div className="text-muted-foreground break-all">{variant.aiShadow}</div>
                </div>
              </details>
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 rounded-xl border bg-muted/30">
          <h3 className="font-semibold mb-2">Recommendations</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong className="text-foreground">Option 1 (Three-Layer):</strong> Best balance of depth and subtlety - industry standard</li>
            <li><strong className="text-foreground">Option 2 (Soft Glow):</strong> Modern, premium feel - good for content-focused apps</li>
            <li><strong className="text-foreground">Option 3 (Neon):</strong> Bold, high-energy - best for gaming/creative apps</li>
            <li><strong className="text-foreground">Option 5 (Deep Shadow):</strong> Strong elevation - excellent for important messages</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
