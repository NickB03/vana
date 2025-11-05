/**
 * SystemMessage Component Examples
 *
 * Visual showcase of all SystemMessage variants and configurations.
 * This file can be used for testing and reference.
 */

import { SystemMessage } from "@/components/ui/system-message"
import { Wifi, WifiOff, Zap, Download } from "lucide-react"

export default function SystemMessageExamples() {
  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold mb-8">SystemMessage Component Examples</h1>

      {/* Action Variants */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Action Variant (Default)</h2>

        <div className="space-y-3">
          <SystemMessage variant="action">
            Your session will expire in 5 minutes
          </SystemMessage>

          <SystemMessage variant="action" fill>
            Processing your request...
          </SystemMessage>

          <SystemMessage
            variant="action"
            cta={{
              label: "Reload Now",
              onClick: () => console.log("Reload clicked")
            }}
          >
            New version available
          </SystemMessage>

          <SystemMessage
            variant="action"
            fill
            icon={<Download className="size-4" />}
            cta={{
              label: "Update",
              onClick: () => console.log("Update clicked")
            }}
          >
            Software update ready to install
          </SystemMessage>
        </div>
      </section>

      {/* Error Variants */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-red-700 dark:text-red-400">
          Error Variant
        </h2>

        <div className="space-y-3">
          <SystemMessage variant="error">
            Failed to send message. Please try again.
          </SystemMessage>

          <SystemMessage variant="error" fill>
            Authentication failed
          </SystemMessage>

          <SystemMessage
            variant="error"
            cta={{
              label: "Retry",
              onClick: () => console.log("Retry clicked")
            }}
          >
            Connection lost. Unable to load chat history.
          </SystemMessage>

          <SystemMessage
            variant="error"
            fill
            cta={{
              label: "Reconnect",
              onClick: () => console.log("Reconnect clicked")
            }}
          >
            Server error. Some features may be unavailable.
          </SystemMessage>
        </div>
      </section>

      {/* Warning Variants */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-amber-700 dark:text-amber-400">
          Warning Variant
        </h2>

        <div className="space-y-3">
          <SystemMessage variant="warning">
            You have unsaved changes
          </SystemMessage>

          <SystemMessage variant="warning" fill>
            API rate limit approaching
          </SystemMessage>

          <SystemMessage
            variant="warning"
            cta={{
              label: "Save Now",
              onClick: () => console.log("Save clicked")
            }}
          >
            Unsaved changes will be lost if you navigate away
          </SystemMessage>

          <SystemMessage
            variant="warning"
            fill
            icon={<WifiOff className="size-4" />}
          >
            Slow network detected. Operations may take longer.
          </SystemMessage>
        </div>
      </section>

      {/* Custom Icons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Custom Icons</h2>

        <div className="space-y-3">
          <SystemMessage
            variant="action"
            icon={<Wifi className="size-4" />}
          >
            Connected to server
          </SystemMessage>

          <SystemMessage
            variant="warning"
            fill
            icon={<WifiOff className="size-4" />}
          >
            Offline mode enabled
          </SystemMessage>

          <SystemMessage
            variant="action"
            fill
            icon={<Zap className="size-4" />}
          >
            Performance mode activated
          </SystemMessage>

          <SystemMessage
            variant="action"
            isIconHidden
          >
            Text-only message without icon
          </SystemMessage>
        </div>
      </section>

      {/* Real-World Use Cases */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Real-World Use Cases</h2>

        <div className="space-y-3">
          {/* Session Expiration */}
          <SystemMessage
            variant="warning"
            fill
            cta={{
              label: "Extend Session",
              onClick: () => console.log("Extend session")
            }}
          >
            Your session will expire in 2 minutes. Please save your work.
          </SystemMessage>

          {/* File Upload Error */}
          <SystemMessage variant="error" fill>
            File upload failed. Max file size: 10MB. Supported formats: PDF, PNG, JPG.
          </SystemMessage>

          {/* Artifact Generation */}
          <SystemMessage variant="action">
            Generating interactive preview...
          </SystemMessage>

          {/* Network Status */}
          <SystemMessage
            variant="action"
            fill
            icon={<Wifi className="size-4" />}
          >
            Reconnected to server. Syncing messages...
          </SystemMessage>

          {/* Update Available */}
          <SystemMessage
            variant="action"
            fill
            cta={{
              label: "Reload Now",
              onClick: () => window.location.reload()
            }}
          >
            A new version of the app is available. Reload to update.
          </SystemMessage>

          {/* Rate Limiting */}
          <SystemMessage variant="warning" fill>
            You've made 95/100 API requests this hour. Rate limit resets in 15 minutes.
          </SystemMessage>
        </div>
      </section>

      {/* Custom Styling */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Custom Styling</h2>

        <div className="space-y-3">
          <SystemMessage
            variant="action"
            className="max-w-md mx-auto"
          >
            Centered message with max-width constraint
          </SystemMessage>

          <SystemMessage
            variant="error"
            fill
            className="border-2 border-red-500 shadow-lg"
          >
            Enhanced border and shadow for emphasis
          </SystemMessage>
        </div>
      </section>
    </div>
  )
}
