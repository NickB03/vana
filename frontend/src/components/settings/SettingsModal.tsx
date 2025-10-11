"use client"

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/components/providers/theme-provider'
import { Monitor, Moon, Sun } from 'lucide-react'

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { theme, setTheme } = useTheme()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your preferences and application settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Appearance Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Appearance</h3>
              <p className="text-sm text-muted-foreground">
                Customize how Vana looks on your device
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select value={theme} onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}>
                <SelectTrigger id="theme" className="w-full">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      <span>Light</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      <span>Dark</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>System</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select your preferred theme or use system settings
              </p>
            </div>
          </div>

          <Separator />

          {/* Language Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Language & Region</h3>
              <p className="text-sm text-muted-foreground">
                Set your language preferences
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select defaultValue="english" disabled>
                <SelectTrigger id="language" className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="german">German</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Coming soon - Additional languages will be available
              </p>
            </div>
          </div>

          <Separator />

          {/* Notifications Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Configure how you receive notifications
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive notifications on your desktop
                  </p>
                </div>
                <Switch id="desktop-notifications" disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound-notifications">Sound</Label>
                  <p className="text-xs text-muted-foreground">
                    Play sound for notifications
                  </p>
                </div>
                <Switch id="sound-notifications" disabled />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Coming soon - Notification settings will be configurable
            </p>
          </div>

          <Separator />

          {/* API & Model Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">API & Models</h3>
              <p className="text-sm text-muted-foreground">
                Configure AI model and API settings
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Coming soon - Custom API keys will be supported
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-model">Default Model</Label>
                <Select defaultValue="gemini" disabled>
                  <SelectTrigger id="default-model" className="w-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Gemini 2.5 Pro Flash</SelectItem>
                    <SelectItem value="gpt4">GPT-4</SelectItem>
                    <SelectItem value="claude">Claude 3.5 Sonnet</SelectItem>
                    <SelectItem value="qwen">Qwen 3 Coder</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Coming soon - Model selection will be available
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Session Management Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Session Management</h3>
              <p className="text-sm text-muted-foreground">
                Control how your sessions are saved
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-save">Auto-save Sessions</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically save your conversations
                  </p>
                </div>
                <Switch id="auto-save" disabled />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-cloud">Cloud Sync</Label>
                  <p className="text-xs text-muted-foreground">
                    Sync sessions across devices
                  </p>
                </div>
                <Switch id="sync-cloud" disabled />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Coming soon - Session management features will be available
            </p>
          </div>
        </div>

        {/* Footer with Save Button */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => onOpenChange(false)} disabled>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
