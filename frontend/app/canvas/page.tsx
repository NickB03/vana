"use client"

import { AuthGuard } from "@/components/auth/auth-guard"
import { MarkdownCanvas } from "@/components/canvas/markdown-canvas"

export default function CanvasPage() {
  return (
    <AuthGuard>
      <div className="h-screen w-full">
        <MarkdownCanvas />
      </div>
    </AuthGuard>
  )
}