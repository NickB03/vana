"use client"

import { useEffect, useState } from 'react'
import {
  getThemePreset,
  themeColorsToCSSVariables,
  type ThemePreset,
} from '@/lib/themes'
import { useTheme } from '@/components/providers/theme-provider'

const STORAGE_KEY = 'vana-theme-preset'
const DEFAULT_PRESET = 'default'

/**
 * Hook for managing theme presets
 *
 * Provides functionality to:
 * - Get current theme preset
 * - Change theme preset with immediate visual feedback
 * - Persist theme preset selection in localStorage
 * - Apply theme colors dynamically based on light/dark mode
 */
export function useThemePreset() {
  const { actualTheme } = useTheme()
  const [preset, setPresetState] = useState<string>(DEFAULT_PRESET)
  const [mounted, setMounted] = useState(false)

  // Load saved preset from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const savedPreset = localStorage.getItem(STORAGE_KEY)
    if (savedPreset) {
      setPresetState(savedPreset)
    }
  }, [])

  // Apply theme colors whenever preset or theme mode changes
  useEffect(() => {
    if (!mounted) return

    const themePreset = getThemePreset(preset)
    if (!themePreset) {
      console.warn(`Theme preset "${preset}" not found, falling back to default`)
      setPresetState(DEFAULT_PRESET)
      return
    }

    applyThemeColors(themePreset, actualTheme)
  }, [preset, actualTheme, mounted])

  /**
   * Change the current theme preset
   */
  const setPreset = (newPreset: string) => {
    const themePreset = getThemePreset(newPreset)
    if (!themePreset) {
      console.error(`Theme preset "${newPreset}" not found`)
      return
    }

    setPresetState(newPreset)
    localStorage.setItem(STORAGE_KEY, newPreset)
  }

  /**
   * Get the current theme preset object
   */
  const getCurrentPreset = (): ThemePreset | undefined => {
    return getThemePreset(preset)
  }

  return {
    preset,
    setPreset,
    getCurrentPreset,
  }
}

/**
 * Apply theme colors to the document root
 * Updates CSS custom properties dynamically
 */
function applyThemeColors(themePreset: ThemePreset, mode: 'light' | 'dark') {
  const root = document.documentElement
  const colors = mode === 'dark' ? themePreset.dark : themePreset.light
  const cssVariables = themeColorsToCSSVariables(colors)

  // Apply each CSS variable to the root element
  Object.entries(cssVariables).forEach(([property, value]) => {
    root.style.setProperty(property, value)
  })
}
