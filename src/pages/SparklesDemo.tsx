import { useState } from "react"
import { Sparkles } from "@/components/Sparkles"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ChatSidebar } from "@/components/ChatSidebar"
import { SidebarInset } from "@/components/ui/sidebar"
import { MobileHeader } from "@/components/MobileHeader"
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input"
import { PromptInputControls } from "@/components/prompt-kit/prompt-input-controls"
import { useChatSessions } from "@/hooks/useChatSessions"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react"
import { SPARKLE_DEFAULTS } from "@/components/ui/sparkle-background"
import { COLOR_PRESETS, GLOW_PRESETS, GRADIENT_PRESETS } from "@/constants/sparkle-presets"

/**
 * Demo page for the Sparkles component from LunarUI
 * Shows the animated floating particles with the "half moon" horizon effect
 * integrated with the main app layout (sidebar + chat)
 */
export default function SparklesDemo() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [input, setInput] = useState("")
  const [imageMode, setImageMode] = useState(false)
  const [artifactMode, setArtifactMode] = useState(false)
  const { sessions, isLoading: sessionsLoading } = useChatSessions()

  // Control panel state
  const [isMinimized, setIsMinimized] = useState(false)

  // Adjustable parameters for the half moon effect
  const [height, setHeight] = useState(SPARKLE_DEFAULTS.height)
  const [curvePosition, setCurvePosition] = useState(SPARKLE_DEFAULTS.curvePosition)
  const [density, setDensity] = useState(SPARKLE_DEFAULTS.density)
  const [glowOpacity, setGlowOpacity] = useState(SPARKLE_DEFAULTS.glowOpacity)
  const [particleColor, setParticleColor] = useState(SPARKLE_DEFAULTS.particleColor)
  const [glowColor, setGlowColor] = useState(SPARKLE_DEFAULTS.glowColor)
  const [glowGradient, setGlowGradient] = useState<string[]>(SPARKLE_DEFAULTS.glowGradient)
  const [useGradient, setUseGradient] = useState(SPARKLE_DEFAULTS.useGradient)
  const [speed, setSpeed] = useState(SPARKLE_DEFAULTS.speed)
  const [particleSize, setParticleSize] = useState(SPARKLE_DEFAULTS.particleSize)
  const [particleGlow, setParticleGlow] = useState(SPARKLE_DEFAULTS.particleGlow)
  const [opacitySpeed, setOpacitySpeed] = useState(SPARKLE_DEFAULTS.opacitySpeed)
  const [minOpacity, setMinOpacity] = useState(SPARKLE_DEFAULTS.minOpacity)

  const handleReset = () => {
    setHeight(SPARKLE_DEFAULTS.height)
    setCurvePosition(SPARKLE_DEFAULTS.curvePosition)
    setDensity(SPARKLE_DEFAULTS.density)
    setGlowOpacity(SPARKLE_DEFAULTS.glowOpacity)
    setParticleColor(SPARKLE_DEFAULTS.particleColor)
    setGlowColor(SPARKLE_DEFAULTS.glowColor)
    setGlowGradient(SPARKLE_DEFAULTS.glowGradient)
    setUseGradient(SPARKLE_DEFAULTS.useGradient)
    setSpeed(SPARKLE_DEFAULTS.speed)
    setParticleSize(SPARKLE_DEFAULTS.particleSize)
    setParticleGlow(SPARKLE_DEFAULTS.particleGlow)
    setOpacitySpeed(SPARKLE_DEFAULTS.opacitySpeed)
    setMinOpacity(SPARKLE_DEFAULTS.minOpacity)
  }

  // Generate the glow background based on mode
  const getGlowBackground = () => {
    if (useGradient) {
      // Create a conic/radial gradient from the colors
      const colorStops = glowGradient.map((c, i) => `${c} ${(i / (glowGradient.length - 1)) * 100}%`).join(', ')
      return `radial-gradient(ellipse 100% 60% at 50% 100%, ${glowGradient[0]}, transparent 70%), conic-gradient(from 180deg at 50% 100%, ${colorStops})`
    }
    return `radial-gradient(circle at bottom center, ${glowColor}, transparent 70%)`
  }

  // Get the primary color for the curve glow (first gradient color or solid color)
  const getCurveGlowColor = () => {
    return useGradient ? glowGradient[0] : glowColor
  }

  return (
    <div className="min-h-screen w-full overflow-hidden bg-zinc-950">
      <SidebarProvider
        defaultOpen={true}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      >
        <ChatSidebar
          sessions={sessions}
          currentSessionId={undefined}
          onSessionSelect={() => {}}
          onNewChat={() => {}}
          onDeleteSession={() => {}}
          isLoading={sessionsLoading}
        />

        <SidebarInset className="relative bg-zinc-950">
          <main className="flex h-[var(--app-height)] flex-col relative">
            {/* Mobile Header */}
            <MobileHeader isAuthenticated={false} />

            {/* Sparkles background effect - matches LunarUI original structure */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ clipPath: 'inset(0)' }}
            >
              {/* Container with radial mask for overall fade effect */}
              <div
                className="absolute left-0 right-0 bottom-0"
                style={{
                  height: `${height}%`,
                  maskImage: 'radial-gradient(50% 50%, white, transparent)',
                  WebkitMaskImage: 'radial-gradient(50% 50%, white, transparent)',
                }}
              >
                {/* Layer 1: Glow (behind everything) - supports solid or gradient */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: getGlowBackground(),
                    opacity: glowOpacity / 100,
                  }}
                />

                {/* Layer 2: Sparkles (middle layer) */}
                <div
                  className="absolute inset-0"
                  style={{
                    maskImage: 'radial-gradient(50% 50%, white, transparent 85%)',
                    WebkitMaskImage: 'radial-gradient(50% 50%, white, transparent 85%)',
                  }}
                >
                  <Sparkles
                    key={`sparkles-${density}-${particleColor}-${speed}-${particleSize}-${particleGlow}-${opacitySpeed}-${minOpacity}`}
                    density={density}
                    color={particleColor}
                    speed={speed}
                    size={particleSize}
                    glow={particleGlow}
                    glowColor={useGradient ? glowGradient[0] : glowColor}
                    opacitySpeed={opacitySpeed}
                    minOpacity={minOpacity}
                    className="absolute inset-0 w-full h-full"
                  />
                </div>

                {/* Layer 3: Half moon curve (ON TOP - covers bottom portion) */}
                <div
                  className="absolute -left-1/2 w-[200%] rounded-[100%] bg-zinc-900"
                  style={{
                    top: `${curvePosition}%`,
                    aspectRatio: '1 / 0.7',
                    boxShadow: `
                      0 -60px 100px -20px ${getCurveGlowColor()}50,
                      0 -30px 60px -10px ${getCurveGlowColor()}40,
                      0 -10px 30px 0px ${getCurveGlowColor()}60,
                      0 -2px 10px 0px ${getCurveGlowColor()}80,
                      inset 0 2px 4px 0 ${getCurveGlowColor()}40
                    `,
                  }}
                />
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative z-10">
              {/* Chat layout content */}
              <div className="flex h-full w-full flex-col items-center justify-between p-4 sm:p-8">
                {/* Top spacer */}
                <div aria-hidden="true"></div>

                {/* Centered heading */}
                <div className="text-center w-full max-w-full px-4">
                  <h1 className="bg-gradient-to-r from-indigo-200 via-white to-indigo-200 bg-clip-text text-3xl sm:text-4xl md:text-5xl font-bold text-transparent">
                    Hi, I'm Vana.
                  </h1>
                </div>

                {/* Bottom section with prompt */}
                <div className="w-full">
                  <div className="w-full max-w-5xl mx-auto mb-6 px-4">
                    <PromptInput
                      value={input}
                      onValueChange={setInput}
                      isLoading={false}
                      onSubmit={() => {}}
                      className="w-full relative rounded-xl bg-black/50 backdrop-blur-sm p-0 pt-1"
                    >
                      <div className="flex flex-col">
                        <PromptInputTextarea
                          placeholder="Ask anything"
                          className="min-h-[44px] text-base leading-[1.3] pl-4 pt-3"
                          aria-label="Chat input"
                        />
                        <PromptInputControls
                          className="mt-5 px-3 pb-3"
                          imageMode={imageMode}
                          onImageModeChange={setImageMode}
                          artifactMode={artifactMode}
                          onArtifactModeChange={setArtifactMode}
                          isLoading={false}
                          input={input}
                          onSend={() => {}}
                          showFileUpload={false}
                          sendIcon="send"
                        />
                      </div>
                    </PromptInput>
                  </div>

                  {/* Placeholder for suggestions area */}
                  <div className="w-full max-w-5xl mx-auto py-2 h-20" />
                </div>
              </div>
            </div>

            {/* Controls Panel */}
            <div className="absolute top-4 right-4 z-20 w-80 rounded-lg bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 overflow-hidden">
              {/* Header with minimize/reset buttons */}
              <div className="flex items-center justify-between p-3 border-b border-zinc-800">
                <h3 className="text-sm font-semibold text-white">Sparkles Controls</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleReset}
                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    title="Reset to defaults"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    title={isMinimized ? "Expand" : "Minimize"}
                  >
                    {isMinimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsible content */}
              {!isMinimized && (
                <div className="p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
                  <div className="space-y-4">
                    {/* Height */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-zinc-400">Height</Label>
                        <span className="text-xs text-zinc-500">{height}%</span>
                      </div>
                      <Slider
                        value={[height]}
                        onValueChange={([v]) => setHeight(v)}
                        min={20}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    {/* Curve Position */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-zinc-400">Curve Position</Label>
                        <span className="text-xs text-zinc-500">{curvePosition}%</span>
                      </div>
                      <Slider
                        value={[curvePosition]}
                        onValueChange={([v]) => setCurvePosition(v)}
                        min={40}
                        max={95}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Particle Density */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-zinc-400">Particle Density</Label>
                        <span className="text-xs text-zinc-500">{density}</span>
                      </div>
                      <Slider
                        value={[density]}
                        onValueChange={([v]) => setDensity(v)}
                        min={100}
                        max={3000}
                        step={100}
                        className="w-full"
                      />
                    </div>

                    {/* Particle Size */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-zinc-400">Particle Size</Label>
                        <span className="text-xs text-zinc-500">{particleSize}</span>
                      </div>
                      <Slider
                        value={[particleSize]}
                        onValueChange={([v]) => setParticleSize(v)}
                        min={0.5}
                        max={4}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Particle Glow Toggle */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-zinc-400">Particle Glow</Label>
                        <button
                          onClick={() => setParticleGlow(!particleGlow)}
                          className={`w-10 h-5 rounded-full transition-all relative ${
                            particleGlow ? "bg-indigo-600" : "bg-zinc-700"
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                              particleGlow ? "left-5" : "left-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Speed */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-zinc-400">Particle Speed</Label>
                        <span className="text-xs text-zinc-500">{speed}</span>
                      </div>
                      <Slider
                        value={[speed]}
                        onValueChange={([v]) => setSpeed(v)}
                        min={0.01}
                        max={5}
                        step={0.01}
                        className="w-full"
                      />
                    </div>

                    {/* Blink Speed (Opacity Animation) */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-zinc-400">Blink Speed</Label>
                        <span className="text-xs text-zinc-500">{opacitySpeed}</span>
                      </div>
                      <Slider
                        value={[opacitySpeed]}
                        onValueChange={([v]) => setOpacitySpeed(v)}
                        min={0}
                        max={5}
                        step={0.1}
                        className="w-full"
                      />
                    </div>

                    {/* Min Opacity */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-zinc-400">Min Brightness</Label>
                        <span className="text-xs text-zinc-500">{Math.round(minOpacity * 100)}%</span>
                      </div>
                      <Slider
                        value={[minOpacity]}
                        onValueChange={([v]) => setMinOpacity(v)}
                        min={0.1}
                        max={1}
                        step={0.05}
                        className="w-full"
                      />
                    </div>

                    {/* Glow Opacity */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-xs text-zinc-400">Glow Opacity</Label>
                        <span className="text-xs text-zinc-500">{glowOpacity}%</span>
                      </div>
                      <Slider
                        value={[glowOpacity]}
                        onValueChange={([v]) => setGlowOpacity(v)}
                        min={0}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    {/* Particle Color */}
                    <div className="space-y-2">
                      <Label className="text-xs text-zinc-400">Particle Color</Label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => setParticleColor(preset.value)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${
                              particleColor === preset.value
                                ? "border-white scale-110"
                                : "border-zinc-600 hover:border-zinc-400"
                            }`}
                            style={{ backgroundColor: preset.value }}
                            title={preset.name}
                          />
                        ))}
                        <input
                          type="color"
                          value={particleColor}
                          onChange={(e) => setParticleColor(e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border border-zinc-600"
                          title="Custom color"
                        />
                      </div>
                    </div>

                    {/* Glow Color Mode Toggle */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-zinc-400">Glow Type</Label>
                        <div className="flex gap-1 bg-zinc-800 rounded-md p-0.5">
                          <button
                            onClick={() => setUseGradient(false)}
                            className={`px-2 py-1 text-xs rounded transition-all ${
                              !useGradient
                                ? "bg-zinc-600 text-white"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Solid
                          </button>
                          <button
                            onClick={() => setUseGradient(true)}
                            className={`px-2 py-1 text-xs rounded transition-all ${
                              useGradient
                                ? "bg-zinc-600 text-white"
                                : "text-zinc-400 hover:text-white"
                            }`}
                          >
                            Gradient
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Solid Glow Color */}
                    {!useGradient && (
                      <div className="space-y-2">
                        <Label className="text-xs text-zinc-400">Glow Color</Label>
                        <div className="flex flex-wrap gap-2">
                          {GLOW_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              onClick={() => setGlowColor(preset.value)}
                              className={`w-6 h-6 rounded-full border-2 transition-all ${
                                glowColor === preset.value
                                  ? "border-white scale-110"
                                  : "border-zinc-600 hover:border-zinc-400"
                              }`}
                              style={{ backgroundColor: preset.value }}
                              title={preset.name}
                            />
                          ))}
                          <input
                            type="color"
                            value={glowColor}
                            onChange={(e) => setGlowColor(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border border-zinc-600"
                            title="Custom color"
                          />
                        </div>
                      </div>
                    )}

                    {/* Gradient Presets */}
                    {useGradient && (
                      <div className="space-y-2">
                        <Label className="text-xs text-zinc-400">Gradient Preset</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {GRADIENT_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              onClick={() => setGlowGradient(preset.colors)}
                              className={`h-6 rounded border-2 transition-all ${
                                JSON.stringify(glowGradient) === JSON.stringify(preset.colors)
                                  ? "border-white scale-105"
                                  : "border-zinc-600 hover:border-zinc-400"
                              }`}
                              style={{ background: preset.preview }}
                              title={preset.name}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Current values display */}
                  <div className="mt-4 pt-3 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 font-mono break-all">
                      height: {height}% | curve: {curvePosition}% | density: {density}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                      size: {particleSize} | speed: {speed} | glow: {glowOpacity}%
                    </p>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                      glow: {useGradient ? `gradient (${glowGradient.length} colors)` : glowColor}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
