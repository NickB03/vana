import { useState, useEffect } from "react";
import { Monitor, Smartphone, Type, Scaling } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Markdown } from "@/components/ui/markdown";
import { cn } from "@/lib/utils";

// Sample chat content
const sampleUserMessage = "How do I create a responsive React component with TypeScript?";

const sampleAssistantMessage = `# Creating Responsive React Components

Let me help you create a responsive React component with TypeScript. Here's a comprehensive guide:

## Key Principles

When building responsive components, consider these essential factors:

- **Mobile-first approach**: Start with mobile styles, then add desktop enhancements
- **Flexible layouts**: Use flexbox or grid for adaptive layouts
- **Breakpoints**: Define clear breakpoints for different screen sizes

## Example Implementation

Here's a basic responsive card component:

\`\`\`typescript
interface CardProps {
  title: string;
  description: string;
  className?: string;
}

export function ResponsiveCard({ title, description, className }: CardProps) {
  return (
    <div className={cn(
      "flex flex-col gap-2 p-4",
      "md:flex-row md:gap-4 md:p-6",
      className
    )}>
      <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
      <p className="text-sm md:text-base text-muted-foreground">{description}</p>
    </div>
  );
}
\`\`\`

## Best Practices

1. **Use semantic HTML** - Start with proper HTML elements
2. **Leverage CSS utilities** - Tailwind makes responsive design easier
3. **Test on real devices** - Emulators don't always catch everything
4. **Consider touch targets** - Minimum 44px for mobile buttons

You can also use the \`useIsMobile\` hook to conditionally render different layouts based on screen size.`;

type PreviewSize = "mobile" | "desktop";
type FontFamily = "system" | "inter" | "jakarta" | "geist";
type FontSize = "compact" | "normal" | "comfortable" | "large";

const fontFamilies: { value: FontFamily; label: string; description: string }[] = [
  { value: "system", label: "System", description: "Native OS fonts" },
  { value: "inter", label: "Inter", description: "Modern, clean sans-serif" },
  { value: "jakarta", label: "Jakarta", description: "Friendly, geometric" },
  { value: "geist", label: "Geist", description: "Vercel's modern font" },
];

const fontSizes: { value: FontSize; label: string; desktop: string; mobile: string }[] = [
  { value: "compact", label: "Compact", desktop: "15px", mobile: "16px" },
  { value: "normal", label: "Normal", desktop: "16px", mobile: "17px" },
  { value: "comfortable", label: "Comfortable", desktop: "17px", mobile: "18px" },
  { value: "large", label: "Large", desktop: "18px", mobile: "19px" },
];

// Load Google Fonts dynamically
function loadGoogleFonts() {
  if (document.getElementById("google-fonts-typography")) return;

  const link = document.createElement("link");
  link.id = "google-fonts-typography";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Geist:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}

export default function TypographyDemo() {
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [fontFamily, setFontFamily] = useState<FontFamily>("inter");
  const [fontSize, setFontSize] = useState<FontSize>("comfortable");

  const isMobilePreview = previewSize === "mobile";

  // Load fonts on mount
  useEffect(() => {
    loadGoogleFonts();
  }, []);

  // Get CSS class for font family
  const fontFamilyClass = `font-${fontFamily}`;
  const fontSizeClass = `chat-size-${fontSize}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            Chat Typography Playground
          </h1>
          <p className="text-gray-400">
            Experiment with fonts and sizes to find optimal readability
          </p>
        </div>

        {/* Controls */}
        <Card className="bg-gray-800/70 border-gray-700 max-w-4xl mx-auto">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Preview Size */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Monitor className="h-4 w-4" />
                  Preview Size
                </label>
                <div className="flex gap-2">
                  <Button
                    variant={isMobilePreview ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewSize("mobile")}
                    className="flex-1 gap-1"
                  >
                    <Smartphone className="h-3 w-3" />
                    Mobile
                  </Button>
                  <Button
                    variant={!isMobilePreview ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewSize("desktop")}
                    className="flex-1 gap-1"
                  >
                    <Monitor className="h-3 w-3" />
                    Desktop
                  </Button>
                </div>
              </div>

              {/* Font Family */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Type className="h-4 w-4" />
                  Font Family
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {fontFamilies.map((font) => (
                    <Button
                      key={font.value}
                      variant={fontFamily === font.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFontFamily(font.value)}
                      className="text-xs"
                    >
                      {font.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Scaling className="h-4 w-4" />
                  Text Size
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {fontSizes.map((size) => (
                    <Button
                      key={size.value}
                      variant={fontSize === size.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFontSize(size.value)}
                      className="text-xs"
                    >
                      {size.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Current Settings Display */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex flex-wrap gap-3 justify-center text-xs text-gray-400">
                <span className="bg-gray-900/50 px-2 py-1 rounded">
                  Font: <span className="text-blue-400">{fontFamilies.find(f => f.value === fontFamily)?.label}</span>
                </span>
                <span className="bg-gray-900/50 px-2 py-1 rounded">
                  Desktop: <span className="text-green-400">{fontSizes.find(s => s.value === fontSize)?.desktop}</span>
                </span>
                <span className="bg-gray-900/50 px-2 py-1 rounded">
                  Mobile: <span className="text-green-400">{fontSizes.find(s => s.value === fontSize)?.mobile}</span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* BEFORE Column */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-red-400 mb-1">Before</h2>
              <p className="text-sm text-gray-400">
                Old style: 15px fixed, leading-relaxed
              </p>
            </div>

            <div
              className={cn(
                "mx-auto transition-all duration-300",
                isMobilePreview ? "max-w-[375px]" : "max-w-full"
              )}
            >
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400">User Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-600/20 rounded-lg p-4 border border-blue-600/30">
                    {/* BEFORE: Old user message style */}
                    <p className="text-[15px] leading-relaxed text-gray-100">
                      {sampleUserMessage}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400">Assistant Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-purple-600/30 flex items-center justify-center">
                        <span className="text-xs">V</span>
                      </div>
                      <span className="text-sm font-medium text-gray-300">Vana</span>
                    </div>
                    {/* BEFORE: Old assistant message style - no special classes */}
                    <div className="text-[15px] leading-relaxed text-gray-100">
                      <Markdown>{sampleAssistantMessage}</Markdown>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* AFTER Column */}
          <div className={cn("space-y-4", fontFamilyClass, fontSizeClass)}>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-green-400 mb-1">After</h2>
              <p className="text-sm text-gray-400">
                New style: responsive, optimized typography
              </p>
            </div>

            <div
              className={cn(
                "mx-auto transition-all duration-300",
                isMobilePreview ? "max-w-[375px]" : "max-w-full"
              )}
            >
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400">User Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-600/20 rounded-lg p-4 border border-blue-600/30">
                    {/* AFTER: New user message style */}
                    <p className="chat-user-message text-gray-100">
                      {sampleUserMessage}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-400">Assistant Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full bg-purple-600/30 flex items-center justify-center">
                        <span className="text-xs">V</span>
                      </div>
                      {/* AFTER: New assistant name style */}
                      <span className="chat-assistant-name text-gray-300">Vana</span>
                    </div>
                    {/* AFTER: New assistant message style with chat-markdown */}
                    <div className="chat-markdown text-gray-100">
                      <Markdown>{sampleAssistantMessage}</Markdown>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Font Details */}
        <Card className="bg-gray-800/50 border-gray-700 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-white">Font Comparison Guide</CardTitle>
            <CardDescription>
              Each font has different characteristics for readability
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fontFamilies.map((font) => (
                <div
                  key={font.value}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    fontFamily === font.value
                      ? "bg-blue-600/20 border-blue-500"
                      : "bg-gray-900/30 border-gray-700"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{font.label}</span>
                    {fontFamily === font.value && (
                      <span className="text-xs bg-blue-600 px-2 py-0.5 rounded text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">{font.description}</p>
                  <div className={cn("text-gray-200", `font-${font.value}`)}>
                    <p className="text-base">
                      The quick brown fox jumps over the lazy dog.
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      0123456789 • ABCDEFGHIJKLM
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <h3 className="text-sm font-semibold text-blue-400 mb-3">
                Size Presets Reference
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {fontSizes.map((size) => (
                  <div
                    key={size.value}
                    className={cn(
                      "p-3 rounded-lg text-center",
                      fontSize === size.value
                        ? "bg-green-600/20 border border-green-500"
                        : "bg-gray-900/30"
                    )}
                  >
                    <div className="text-sm font-medium text-white">{size.label}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {size.desktop} / {size.mobile}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Default */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-block bg-green-600/20 border border-green-500/50 rounded-lg px-4 py-2">
            <p className="text-sm text-green-300">
              ✅ <strong>Active Default:</strong> Inter + Comfortable (17px desktop / 18px mobile)
            </p>
          </div>
          <p className="text-xs text-gray-500">
            This is now applied to all chat messages. Toggle settings above to preview alternatives.
          </p>
        </div>
      </div>
    </div>
  );
}
