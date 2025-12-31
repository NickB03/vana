import { memo, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { COLOR_PRESETS, GLOW_PRESETS, GRADIENT_PRESETS } from "@/constants/sparkle-presets";
import type { SparkleSettings } from "@/hooks/useSparkleSettings";

interface SparkleControlPanelProps {
  sparkleSettings: SparkleSettings;
  onUpdateSetting: <K extends keyof SparkleSettings>(key: K, value: SparkleSettings[K]) => void;
  onReset: () => void;
  promptPosition: number;
  onPromptPositionChange: (value: number) => void;
  mobilePromptPosition: number;
  onMobilePromptPositionChange: (value: number) => void;
  mobileCurvePosition?: number;
  onMobileCurvePositionChange?: (value: number) => void;
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
}

/**
 * SparkleControlPanel - Development tool for tweaking sparkle background settings
 *
 * Features:
 * - Live control of all sparkle parameters
 * - Preset colors and gradients
 * - Layout position controls
 * - Minimize/expand and reset functionality
 * - Real-time visual feedback
 *
 * Usage: Import and place in any page that uses SparkleBackground
 */
export const SparkleControlPanel = memo(function SparkleControlPanel({
  sparkleSettings,
  onUpdateSetting,
  onReset,
  promptPosition,
  onPromptPositionChange,
  mobilePromptPosition,
  onMobilePromptPositionChange,
  mobileCurvePosition,
  onMobileCurvePositionChange,
  minimized,
  onMinimizedChange,
}: SparkleControlPanelProps) {
  // Helper function to compare gradient arrays efficiently
  const isGradientSelected = useCallback((presetColors: readonly string[]) => {
    if (sparkleSettings.glowGradient.length !== presetColors.length) return false;
    return sparkleSettings.glowGradient.every((color, i) => color === presetColors[i]);
  }, [sparkleSettings.glowGradient]);

  return (
    <div className="fixed top-4 right-4 z-[100] w-80 rounded-lg bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 overflow-hidden">
      {/* Header with minimize/reset buttons */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white">Sparkle Controls</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={onReset}
            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMinimizedChange(!minimized)}
            className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title={minimized ? "Expand" : "Minimize"}
          >
            {minimized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      {!minimized && (
        <div className="p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="space-y-4">
            {/* Height */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-zinc-400">Height</Label>
                <span className="text-xs text-zinc-500">{sparkleSettings.height}%</span>
              </div>
              <Slider
                value={[sparkleSettings.height]}
                onValueChange={([v]) => onUpdateSetting('height', v)}
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
                <span className="text-xs text-zinc-500">{sparkleSettings.curvePosition}%</span>
              </div>
              <Slider
                value={[sparkleSettings.curvePosition]}
                onValueChange={([v]) => onUpdateSetting('curvePosition', v)}
                min={40}
                max={95}
                step={1}
                className="w-full"
              />
            </div>

            {/* Mobile Curve Position */}
            {mobileCurvePosition !== undefined && onMobileCurvePositionChange && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs text-zinc-400">Mobile Curve Position</Label>
                  <span className="text-xs text-zinc-500">{mobileCurvePosition}%</span>
                </div>
                <Slider
                  value={[mobileCurvePosition]}
                  onValueChange={([v]) => onMobileCurvePositionChange(v)}
                  min={40}
                  max={95}
                  step={1}
                  className="w-full"
                />
              </div>
            )}

            {/* Layout Position Controls - Divider */}
            <div className="border-t border-zinc-700 pt-3 mt-3">
              <Label className="text-xs text-zinc-300 font-semibold">Layout Positions</Label>
            </div>

            {/* Desktop Prompt Position */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-zinc-400">Desktop Content</Label>
                <span className="text-xs text-zinc-500">{promptPosition}%</span>
              </div>
              <Slider
                value={[promptPosition]}
                onValueChange={([v]) => onPromptPositionChange(v)}
                min={40}
                max={90}
                step={1}
                className="w-full"
              />
            </div>

            {/* Mobile Prompt Position */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-zinc-400">Mobile Content</Label>
                <span className="text-xs text-zinc-500">{mobilePromptPosition}%</span>
              </div>
              <Slider
                value={[mobilePromptPosition]}
                onValueChange={([v]) => onMobilePromptPositionChange(v)}
                min={50}
                max={95}
                step={1}
                className="w-full"
              />
            </div>

            {/* Particle Density */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-zinc-400">Particle Density</Label>
                <span className="text-xs text-zinc-500">{sparkleSettings.density}</span>
              </div>
              <Slider
                value={[sparkleSettings.density]}
                onValueChange={([v]) => onUpdateSetting('density', v)}
                min={50}
                max={3000}
                step={50}
                className="w-full"
              />
            </div>

            {/* Particle Size */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-zinc-400">Particle Size</Label>
                <span className="text-xs text-zinc-500">{sparkleSettings.particleSize}</span>
              </div>
              <Slider
                value={[sparkleSettings.particleSize]}
                onValueChange={([v]) => onUpdateSetting('particleSize', v)}
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
                  onClick={() => onUpdateSetting('particleGlow', !sparkleSettings.particleGlow)}
                  className={`w-10 h-5 rounded-full transition-all relative ${
                    sparkleSettings.particleGlow ? "bg-indigo-600" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      sparkleSettings.particleGlow ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Speed */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-zinc-400">Particle Speed</Label>
                <span className="text-xs text-zinc-500">{sparkleSettings.speed}</span>
              </div>
              <Slider
                value={[sparkleSettings.speed]}
                onValueChange={([v]) => onUpdateSetting('speed', v)}
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
                <span className="text-xs text-zinc-500">{sparkleSettings.opacitySpeed}</span>
              </div>
              <Slider
                value={[sparkleSettings.opacitySpeed]}
                onValueChange={([v]) => onUpdateSetting('opacitySpeed', v)}
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
                <span className="text-xs text-zinc-500">{Math.round(sparkleSettings.minOpacity * 100)}%</span>
              </div>
              <Slider
                value={[sparkleSettings.minOpacity]}
                onValueChange={([v]) => onUpdateSetting('minOpacity', v)}
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
                <span className="text-xs text-zinc-500">{sparkleSettings.glowOpacity}%</span>
              </div>
              <Slider
                value={[sparkleSettings.glowOpacity]}
                onValueChange={([v]) => onUpdateSetting('glowOpacity', v)}
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
                    onClick={() => onUpdateSetting('particleColor', preset.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      sparkleSettings.particleColor === preset.value
                        ? "border-white scale-110"
                        : "border-zinc-600 hover:border-zinc-400"
                    }`}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
                <input
                  type="color"
                  value={sparkleSettings.particleColor}
                  onChange={(e) => onUpdateSetting('particleColor', e.target.value)}
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
                    onClick={() => onUpdateSetting('useGradient', false)}
                    className={`px-2 py-1 text-xs rounded transition-all ${
                      !sparkleSettings.useGradient
                        ? "bg-zinc-600 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Solid
                  </button>
                  <button
                    onClick={() => onUpdateSetting('useGradient', true)}
                    className={`px-2 py-1 text-xs rounded transition-all ${
                      sparkleSettings.useGradient
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
            {!sparkleSettings.useGradient && (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Glow Color</Label>
                <div className="flex flex-wrap gap-2">
                  {GLOW_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => onUpdateSetting('glowColor', preset.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        sparkleSettings.glowColor === preset.value
                          ? "border-white scale-110"
                          : "border-zinc-600 hover:border-zinc-400"
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={sparkleSettings.glowColor}
                    onChange={(e) => onUpdateSetting('glowColor', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border border-zinc-600"
                    title="Custom color"
                  />
                </div>
              </div>
            )}

            {/* Gradient Presets */}
            {sparkleSettings.useGradient && (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Gradient Preset</Label>
                <div className="grid grid-cols-4 gap-2">
                  {GRADIENT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => onUpdateSetting('glowGradient', [...preset.colors])}
                      className={`h-6 rounded border-2 transition-all ${
                        isGradientSelected(preset.colors)
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
              height: {sparkleSettings.height}% | curve: {sparkleSettings.curvePosition}% | density: {sparkleSettings.density}
            </p>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              size: {sparkleSettings.particleSize} | speed: {sparkleSettings.speed} | glow: {sparkleSettings.glowOpacity}%
            </p>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              glow: {sparkleSettings.useGradient ? `gradient (${sparkleSettings.glowGradient.length} colors)` : sparkleSettings.glowColor}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
