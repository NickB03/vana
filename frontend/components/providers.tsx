"use client"

import React, { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Initialize stores on mount
  useEffect(() => {
    // Initialize UI store theme
    const { setTheme } = useUIStore.getState()
    setTheme('dark') // Default to dark theme
  }, [])

  return <>{children}</>
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  )
}