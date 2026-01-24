/**
 * Typography Test Page
 * Compare current vs. optimized typography settings
 * Navigate to /typography-test to view
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Sample content for testing
const SAMPLE_ASSISTANT_MESSAGE = `The evolution of modern coffee culture is a fascinating journey that mirrors changes in global trade, technology, and social habits over the last century.

## The Three Waves of Coffee

**The First Wave** began in the late 19th century when coffee became a household staple. Brands like Folgers and Maxwell House made coffee accessible and convenient, though quality wasn't the priority.

**The Second Wave** emerged in the 1960s-90s with Starbucks and Peet's Coffee, introducing espresso drinks and the "coffee shop experience" to mainstream America.

**The Third Wave** (2000s-present) treats coffee as an artisanal craft, emphasizing:
- Single-origin beans
- Direct trade relationships
- Precise brewing methods
- Flavor notes and terroir

Here's a simple brewing ratio to remember:

\`\`\`
Coffee: 1g per 16ml water
Ideal temperature: 195-205°F (90-96°C)
Brew time: 3-4 minutes
\`\`\`

Would you like me to explain any of these concepts in more detail?`;

const SAMPLE_USER_MESSAGE = "Can you tell me about the history of coffee culture and why specialty coffee has become so popular?";

// Typography presets
const PRESETS = {
  current: {
    name: 'Current Settings',
    description: 'Your current typography configuration',
    styles: {
      '--test-font-size': '18px',
      '--test-line-height': '1.6',
      '--test-letter-spacing': '0.01em',
      '--test-muted': '0 0% 48%',
      '--test-muted-accessible': '0 0% 35%',
      '--test-bg-dark': '0 0% 0%',
    },
  },
  optimized: {
    name: 'Optimized Settings',
    description: 'Research-based recommendations',
    styles: {
      '--test-font-size': '18px',
      '--test-line-height': '1.6',
      '--test-letter-spacing': '0.01em',
      '--test-muted': '0 0% 42%', // Better contrast (5.2:1)
      '--test-muted-accessible': '0 0% 35%',
      '--test-bg-dark': '0 0% 6%', // Softer dark background
    },
  },
  large: {
    name: 'Large & Accessible',
    description: 'Maximum readability for accessibility',
    styles: {
      '--test-font-size': '19px',
      '--test-line-height': '1.7',
      '--test-letter-spacing': '0.015em',
      '--test-muted': '0 0% 40%', // Even better contrast
      '--test-muted-accessible': '0 0% 32%',
      '--test-bg-dark': '0 0% 8%',
    },
  },
};

type PresetKey = keyof typeof PRESETS;

// Comparison table data
const COMPARISON_DATA = [
  {
    property: 'Muted Text Contrast',
    current: '48% gray (3.8:1)',
    currentPass: false,
    optimized: '42% gray (5.2:1)',
    optimizedPass: true,
  },
  {
    property: 'Dark Background',
    current: 'Pure black (0%)',
    currentPass: false,
    optimized: 'Soft dark (6%)',
    optimizedPass: true,
  },
  {
    property: 'WCAG AA Compliance',
    current: 'Fails for muted text',
    currentPass: false,
    optimized: 'Passes all checks',
    optimizedPass: true,
  },
  {
    property: 'Eye Strain (dark mode)',
    current: 'Halation effect possible',
    currentPass: false,
    optimized: 'Reduced strain',
    optimizedPass: true,
  },
];

export default function TypographyTest() {
  const [activePreset, setActivePreset] = useState<PresetKey>('optimized');
  const [forceDark, setForceDark] = useState(false);

  const preset = PRESETS[activePreset];

  return (
    <div
      className={cn(
        "min-h-screen transition-colors duration-300",
        forceDark ? "bg-[hsl(0,0%,6%)]" : "bg-[#FAFAFA]"
      )}
      style={preset.styles as React.CSSProperties}
    >
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className={cn(
            "text-3xl font-bold",
            forceDark ? "text-white" : "text-gray-900"
          )}>
            Typography Test Page
          </h1>
          <p className={cn(
            "text-lg",
            forceDark ? "text-white/70" : "text-gray-600"
          )}>
            Compare typography presets to find the optimal settings
          </p>
        </div>

        {/* Controls */}
        <div className={cn(
          "flex flex-wrap gap-4 p-4 rounded-xl border",
          forceDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
        )}>
          <div className="space-y-2">
            <label className={cn("text-sm font-medium", forceDark ? "text-white" : "text-gray-900")}>Preset</label>
            <div className="flex gap-2">
              {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
                <Button
                  key={key}
                  variant={activePreset === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivePreset(key)}
                >
                  {PRESETS[key].name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className={cn("text-sm font-medium", forceDark ? "text-white" : "text-gray-900")}>Theme</label>
            <div className="flex gap-2">
              <Button
                variant={!forceDark ? "default" : "outline"}
                size="sm"
                onClick={() => setForceDark(false)}
              >
                Light
              </Button>
              <Button
                variant={forceDark ? "default" : "outline"}
                size="sm"
                onClick={() => setForceDark(true)}
              >
                Dark
              </Button>
            </div>
          </div>
        </div>

        {/* Active Preset Info */}
        <div className={cn(
          "p-4 rounded-xl border",
          forceDark ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"
        )}>
          <h3 className={cn("font-semibold", forceDark ? "text-white" : "text-gray-900")}>{preset.name}</h3>
          <p className={cn("text-sm", forceDark ? "text-gray-400" : "text-gray-600")}>{preset.description}</p>
          <div className={cn(
            "mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono",
            forceDark ? "text-gray-300" : "text-gray-700"
          )}>
            <div>Font: {preset.styles['--test-font-size']}</div>
            <div>Line Height: {preset.styles['--test-line-height']}</div>
            <div>Letter Spacing: {preset.styles['--test-letter-spacing']}</div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className={cn(
          "rounded-xl border overflow-hidden",
          forceDark ? "border-white/20" : "border-gray-200"
        )}>
          <table className="w-full text-sm">
            <thead className={forceDark ? "bg-white/5" : "bg-gray-100"}>
              <tr>
                <th className={cn("text-left p-3 font-medium", forceDark ? "text-white" : "text-gray-900")}>Property</th>
                <th className={cn("text-left p-3 font-medium", forceDark ? "text-white" : "text-gray-900")}>Current</th>
                <th className={cn("text-left p-3 font-medium", forceDark ? "text-white" : "text-gray-900")}>Optimized</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_DATA.map((row, i) => (
                <tr key={i} className={cn("border-t", forceDark ? "border-white/10" : "border-gray-200")}>
                  <td className={cn("p-3 font-medium", forceDark ? "text-white" : "text-gray-900")}>{row.property}</td>
                  <td className={cn("p-3", forceDark ? "text-gray-300" : "text-gray-700")}>
                    <span className="flex items-center gap-2">
                      {row.currentPass ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      {row.current}
                    </span>
                  </td>
                  <td className={cn("p-3", forceDark ? "text-gray-300" : "text-gray-700")}>
                    <span className="flex items-center gap-2">
                      {row.optimizedPass ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      {row.optimized}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chat Preview */}
        <div
          className={cn(
            "rounded-xl border overflow-hidden transition-colors duration-300",
            forceDark
              ? "bg-[hsl(0,0%,6%)] border-white/10"
              : "bg-white border-gray-200"
          )}
        >
          <div className={cn(
            "p-3 border-b font-medium",
            forceDark ? "border-white/10 text-white" : "border-gray-200 text-gray-900"
          )}>
            Chat Preview
          </div>

          <div className="p-6 space-y-6">
            {/* User Message */}
            <div className="flex justify-end">
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[85%]",
                  forceDark ? "bg-white/10" : "bg-gray-100"
                )}
              >
                <p
                  className={forceDark ? "text-white" : "text-gray-900"}
                  style={{
                    fontSize: 'var(--test-font-size)',
                    lineHeight: 'var(--test-line-height)',
                    letterSpacing: 'var(--test-letter-spacing)',
                  }}
                >
                  {SAMPLE_USER_MESSAGE}
                </p>
              </div>
            </div>

            {/* Assistant Message */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  forceDark ? "bg-white/10" : "bg-blue-100"
                )}>
                  <Sparkles className={cn(
                    "h-3.5 w-3.5",
                    forceDark ? "text-white" : "text-blue-600"
                  )} />
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    forceDark ? "text-white" : "text-gray-900"
                  )}
                >
                  Vana
                </span>
                <span
                  className="text-xs"
                  style={{
                    color: forceDark
                      ? `hsl(${preset.styles['--test-muted'].replace('0 0%', '0 0%')} / 0.7)`
                      : `hsl(${preset.styles['--test-muted']})`
                  }}
                >
                  • 8s
                </span>
              </div>

              <div
                className={cn(
                  "prose prose-sm max-w-none",
                  forceDark ? "prose-invert" : ""
                )}
                style={{
                  fontSize: 'var(--test-font-size)',
                  lineHeight: 'var(--test-line-height)',
                  letterSpacing: 'var(--test-letter-spacing)',
                  color: forceDark ? '#F2F2F2' : '#1a1a1a',
                  '--tw-prose-body': forceDark ? '#F2F2F2' : '#1a1a1a',
                  '--tw-prose-headings': forceDark ? '#FAFAFA' : '#111111',
                  '--tw-prose-bold': forceDark ? '#FAFAFA' : '#111111',
                } as React.CSSProperties}
              >
                {SAMPLE_ASSISTANT_MESSAGE.split('\n\n').map((paragraph, i) => {
                  if (paragraph.startsWith('## ')) {
                    return (
                      <h2
                        key={i}
                        className={cn(
                          "text-xl font-semibold mt-4 mb-2",
                          forceDark ? "text-white" : "text-gray-900"
                        )}
                      >
                        {paragraph.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (paragraph.startsWith('```')) {
                    const code = paragraph.replace(/```\w*\n?/g, '');
                    return (
                      <pre key={i} className={cn(
                        "rounded-lg p-4 text-sm overflow-x-auto",
                        forceDark ? "bg-white/5 text-gray-300" : "bg-gray-100 text-gray-800"
                      )}>
                        <code>{code}</code>
                      </pre>
                    );
                  }
                  if (paragraph.startsWith('- ')) {
                    const items = paragraph.split('\n').filter(line => line.startsWith('- '));
                    return (
                      <ul key={i} className="list-disc pl-6 space-y-1">
                        {items.map((item, j) => (
                          <li key={j}>{item.replace('- ', '')}</li>
                        ))}
                      </ul>
                    );
                  }
                  // Handle bold text
                  const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
                  return (
                    <p key={i} className="mb-4">
                      {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                          return (
                            <strong
                              key={j}
                              className={forceDark ? "text-white font-semibold" : "text-gray-900 font-semibold"}
                            >
                              {part.slice(2, -2)}
                            </strong>
                          );
                        }
                        return part;
                      })}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Muted Text Samples */}
        <div className={cn(
          "rounded-xl border p-6 space-y-4 transition-colors duration-300",
          forceDark
            ? "bg-[hsl(var(--test-bg-dark))] border-white/10"
            : "bg-background"
        )}>
          <h3 className={cn(
            "font-semibold",
            forceDark ? "text-white" : "text-foreground"
          )}>
            Muted Text Contrast Test
          </h3>

          <div className="space-y-3">
            <div>
              <p
                className="text-sm"
                style={{
                  color: forceDark
                    ? `hsl(0 0% 62%)` // Dark mode muted
                    : `hsl(${preset.styles['--test-muted']})`
                }}
              >
                This is muted text using the {activePreset} preset. Can you read this comfortably?
              </p>
            </div>

            <div>
              <p
                className="text-xs"
                style={{
                  color: forceDark
                    ? `hsl(0 0% 62%)`
                    : `hsl(${preset.styles['--test-muted']})`
                }}
              >
                12:34 PM • This timestamp should be readable but subtle
              </p>
            </div>

            <div className={cn(
              "p-3 rounded-lg text-sm",
              forceDark ? "bg-white/5" : "bg-muted/50"
            )}>
              <p
                style={{
                  color: forceDark
                    ? `hsl(0 0% 75%)`
                    : `hsl(${preset.styles['--test-muted-accessible']})`
                }}
              >
                This uses the "accessible" muted variant for critical secondary content.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 pt-4">
          <Button
            variant="default"
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(preset.styles, null, 2));
              alert('Preset CSS variables copied to clipboard!');
            }}
          >
            Copy {preset.name} CSS
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            Back to Chat
          </Button>
        </div>

        {/* Raw Values */}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View raw CSS values
          </summary>
          <pre className="mt-2 p-4 rounded-lg bg-muted overflow-x-auto text-xs">
            {JSON.stringify(preset.styles, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
