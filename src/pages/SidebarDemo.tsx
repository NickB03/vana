/**
 * SidebarDemo - Design exploration page for sidebar variants
 *
 * Showcases multiple design options for the chat sidebar:
 * - Different background opacities and blur effects
 * - Various glow/shadow treatments
 * - Border and edge styling options
 * - Glass-morphic, solid, and gradient effects
 *
 * Purpose: Visual reference for design decisions and user testing
 */

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CirclePlus,
  MessageSquare,
  Settings,
  User,
  ChevronRight,
  Search,
  Trash2,
  Star,
  Clock
} from "lucide-react";

// Mock chat history data
const mockChats = [
  { id: 1, title: "Dallas Weather Forecast", time: "Today" },
  { id: 2, title: "React Analytics Dashboard", time: "Today" },
  { id: 3, title: "Test Conversation", time: "Today" },
  { id: 4, title: "Texas Roadhouse Sides", time: "Last 7 days" },
  { id: 5, title: "Counter with useState", time: "Last 7 days" },
];

interface SidebarVariantProps {
  label: string;
  description?: string;
  className: string;
  glowStyle?: string;
  borderStyle?: string;
  variant: "default" | "expanded";
}

const SidebarVariant = ({
  label,
  description,
  className,
  glowStyle = "",
  borderStyle = "",
  variant = "default"
}: SidebarVariantProps) => {
  const [selectedChat, setSelectedChat] = useState(1);

  return (
    <div className="flex flex-col gap-3">
      {/* Label */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {/* Sidebar Preview Container */}
      <div className="relative h-[500px] w-[280px] rounded-lg overflow-hidden bg-black/50">
        {/* Aurora Background (to show glow effects) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_100%,rgba(52,211,153,0.3),rgba(255,255,255,0))]" />

        {/* Sidebar */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[240px] flex flex-col",
            className,
            glowStyle,
            borderStyle
          )}
        >
          {/* Header */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="font-semibold text-foreground">Vana</span>
          </div>

          {/* New Chat Button */}
          <div className="px-3 mb-2">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
              <CirclePlus className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">New chat</span>
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-2">
            <div className="text-xs text-muted-foreground px-2 py-2">Today</div>
            {mockChats.slice(0, 3).map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors mb-1",
                  selectedChat === chat.id
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="text-sm truncate">{chat.title}</span>
              </button>
            ))}

            <div className="text-xs text-muted-foreground px-2 py-2 mt-2">Last 7 days</div>
            {mockChats.slice(3).map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors mb-1",
                  selectedChat === chat.id
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5"
                )}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="text-sm truncate">{chat.title}</span>
              </button>
            ))}
          </div>

          {/* User Profile Footer */}
          <div className="p-3">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                <span className="text-sm font-medium">N</span>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">nick</p>
                <p className="text-xs text-muted-foreground">nick@vana.bot</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SidebarDemo() {
  return (
    <div className="min-h-screen bg-background">
      {/* Aurora gradient background matching the site theme */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_60%,rgba(99,179,237,0.2),rgba(255,255,255,0))]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_70%_at_20%_70%,rgba(52,211,153,0.2),rgba(255,255,255,0))]" />
      </div>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">
            Sidebar Design Options
          </h1>
          <p className="text-muted-foreground">
            Explore different visual styles for the chat sidebar
          </p>
        </div>

        {/* Glass Morphism Variants */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Glass Morphism Variants</h2>
            <p className="text-sm text-muted-foreground">
              Different opacity and blur combinations for frosted glass effect
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Current Design */}
            <SidebarVariant
              label="Current Design"
              description="70% black + aurora glow"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              variant="default"
            />

            {/* Lighter Glass */}
            <SidebarVariant
              label="Light Glass"
              description="50% black + stronger blur"
              className="bg-black/50 backdrop-blur-md"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              variant="default"
            />

            {/* Darker Glass */}
            <SidebarVariant
              label="Dark Glass"
              description="85% black + subtle blur"
              className="bg-black/85 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              variant="default"
            />

            {/* Heavy Blur */}
            <SidebarVariant
              label="Heavy Blur"
              description="60% black + strong blur"
              className="bg-black/60 backdrop-blur-xl"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              variant="default"
            />
          </div>
        </section>

        {/* Glow Effect Variants */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Glow Effect Variants</h2>
            <p className="text-sm text-muted-foreground">
              Different glow colors and intensities on the sidebar edge
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Aurora Glow (Current) */}
            <SidebarVariant
              label="Aurora Glow"
              description="Green → Cyan gradient"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              variant="default"
            />

            {/* Intense Aurora */}
            <SidebarVariant
              label="Intense Aurora"
              description="Stronger green → cyan"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_30px_rgba(52,211,153,0.4),8px_0_60px_rgba(6,182,212,0.25)]"
              variant="default"
            />

            {/* Purple Glow */}
            <SidebarVariant
              label="Purple Glow"
              description="Violet → Purple gradient"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(139,92,246,0.25),6px_0_50px_rgba(168,85,247,0.15)]"
              variant="default"
            />

            {/* Blue Glow */}
            <SidebarVariant
              label="Blue Glow"
              description="Blue → Cyan gradient"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(59,130,246,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              variant="default"
            />

            {/* White Glow */}
            <SidebarVariant
              label="White Glow"
              description="Soft white edge light"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_20px_rgba(255,255,255,0.1),4px_0_40px_rgba(255,255,255,0.05)]"
              variant="default"
            />

            {/* No Glow */}
            <SidebarVariant
              label="No Glow"
              description="Clean edge, no effects"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle=""
              variant="default"
            />

            {/* Sunset Glow */}
            <SidebarVariant
              label="Sunset Glow"
              description="Orange → Pink gradient"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(251,146,60,0.25),6px_0_50px_rgba(236,72,153,0.15)]"
              variant="default"
            />

            {/* Neon Green */}
            <SidebarVariant
              label="Neon Green"
              description="Bright green edge"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(34,197,94,0.35),6px_0_50px_rgba(34,197,94,0.2)]"
              variant="default"
            />
          </div>
        </section>

        {/* Border Variants */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Border Variants</h2>
            <p className="text-sm text-muted-foreground">
              Different border treatments for sidebar edge definition
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* No Border */}
            <SidebarVariant
              label="No Border"
              description="Glow only, no border"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              borderStyle=""
              variant="default"
            />

            {/* Subtle White Border */}
            <SidebarVariant
              label="Subtle Border"
              description="Thin white/10 border"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              borderStyle="border-r border-white/10"
              variant="default"
            />

            {/* Aurora Border */}
            <SidebarVariant
              label="Aurora Border"
              description="Emerald right border"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              borderStyle="border-r-2 border-emerald-500/30"
              variant="default"
            />

            {/* Gradient Border Effect */}
            <SidebarVariant
              label="Bright Border"
              description="Visible white/20 border"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle=""
              borderStyle="border-r border-white/20"
              variant="default"
            />
          </div>
        </section>

        {/* Gradient Backgrounds */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Gradient Backgrounds</h2>
            <p className="text-sm text-muted-foreground">
              Subtle gradient backgrounds with matching glow effects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Aurora Gradient */}
            <SidebarVariant
              label="Aurora Gradient"
              description="Green to cyan, matching site"
              className="bg-gradient-to-b from-emerald-950/20 via-black/70 to-cyan-950/20 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_30px_rgba(52,211,153,0.3),6px_0_50px_rgba(6,182,212,0.2)]"
              variant="default"
            />

            {/* Night Sky */}
            <SidebarVariant
              label="Night Sky"
              description="Deep blue to purple"
              className="bg-gradient-to-br from-blue-950/20 via-black/70 to-purple-950/20 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_30px_rgba(59,130,246,0.25),6px_0_50px_rgba(139,92,246,0.2)]"
              variant="default"
            />

            {/* Ember Fade */}
            <SidebarVariant
              label="Ember Fade"
              description="Dark red to orange"
              className="bg-gradient-to-b from-red-950/15 via-black/70 to-orange-950/15 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_30px_rgba(239,68,68,0.2),6px_0_50px_rgba(251,146,60,0.15)]"
              variant="default"
            />

            {/* Ocean Depth */}
            <SidebarVariant
              label="Ocean Depth"
              description="Deep teal to dark blue"
              className="bg-gradient-to-br from-teal-950/20 via-black/70 to-blue-950/20 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_30px_rgba(20,184,166,0.25),6px_0_50px_rgba(37,99,235,0.2)]"
              variant="default"
            />
          </div>
        </section>

        {/* Special Effects Variants */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Special Effects</h2>
            <p className="text-sm text-muted-foreground">
              Unique visual treatments and experimental styles
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Gradient Background */}
            <SidebarVariant
              label="Gradient Background"
              description="Subtle vertical gradient"
              className="bg-gradient-to-b from-black/80 via-black/70 to-black/60 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              variant="default"
            />

            {/* Inner Glow */}
            <SidebarVariant
              label="Inner Edge Glow"
              description="Inset highlight on right"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[inset_-2px_0_20px_rgba(52,211,153,0.15),2px_0_25px_rgba(52,211,153,0.2)]"
              variant="default"
            />

            {/* Solid Dark */}
            <SidebarVariant
              label="Solid Dark"
              description="No transparency"
              className="bg-zinc-950"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15)]"
              variant="default"
            />

            {/* Dual Glow */}
            <SidebarVariant
              label="Dual Glow"
              description="Both edges lit"
              className="bg-black/70 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_25px_rgba(52,211,153,0.25),6px_0_50px_rgba(6,182,212,0.15),-2px_0_25px_rgba(52,211,153,0.1)]"
              variant="default"
            />

            {/* Metallic Edge - Premium silver/chrome effect */}
            <SidebarVariant
              label="Metallic Edge"
              description="Silver chrome luxury"
              className="bg-gradient-to-b from-zinc-900/90 via-zinc-800/85 to-zinc-900/90 backdrop-blur-md"
              glowStyle="shadow-[1px_0_8px_rgba(255,255,255,0.15),2px_0_20px_rgba(192,192,192,0.2),4px_0_40px_rgba(148,163,184,0.15)]"
              borderStyle="border-r border-white/20"
              variant="default"
            />

            {/* Gold Accent - Subtle gold/amber luxury feel */}
            <SidebarVariant
              label="Gold Accent"
              description="Warm amber luxury"
              className="bg-gradient-to-b from-black/80 via-amber-950/20 to-black/80 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_15px_rgba(251,191,36,0.2),4px_0_35px_rgba(245,158,11,0.15),6px_0_60px_rgba(217,119,6,0.1)]"
              borderStyle="border-r border-amber-500/15"
              variant="default"
            />

            {/* Diamond Sparkle - White crystalline edge effect */}
            <SidebarVariant
              label="Diamond Sparkle"
              description="Crystalline white edge"
              className="bg-gradient-to-b from-slate-900/85 via-slate-800/80 to-slate-900/85 backdrop-blur-md"
              glowStyle="shadow-[1px_0_6px_rgba(255,255,255,0.3),2px_0_12px_rgba(255,255,255,0.2),4px_0_25px_rgba(226,232,240,0.15),6px_0_50px_rgba(203,213,225,0.1)]"
              borderStyle="border-r border-white/25"
              variant="default"
            />

            {/* Obsidian Glass - Deep black with subtle purple undertones */}
            <SidebarVariant
              label="Obsidian Glass"
              description="Deep purple undertones"
              className="bg-gradient-to-b from-black/90 via-purple-950/15 to-black/90 backdrop-blur-sm"
              glowStyle="shadow-[2px_0_20px_rgba(88,28,135,0.2),4px_0_40px_rgba(126,34,206,0.1),inset_-1px_0_15px_rgba(139,92,246,0.05)]"
              borderStyle="border-r border-purple-500/10"
              variant="default"
            />
          </div>
        </section>

        {/* Minimalist Variants */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Minimalist Variants</h2>
            <p className="text-sm text-muted-foreground">
              Clean, distraction-free designs with minimal visual effects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Pure Black */}
            <SidebarVariant
              label="Pure Black"
              description="Solid black, no effects"
              className="bg-black"
              glowStyle=""
              borderStyle="border-r border-neutral-800"
              variant="default"
            />

            {/* Subtle Divide */}
            <SidebarVariant
              label="Subtle Divide"
              description="Minimal 1px line separator"
              className="bg-zinc-950"
              glowStyle=""
              borderStyle="border-r border-white/5"
              variant="default"
            />

            {/* Soft Shadow */}
            <SidebarVariant
              label="Soft Shadow"
              description="Very subtle drop shadow only"
              className="bg-zinc-950"
              glowStyle="shadow-[4px_0_12px_rgba(0,0,0,0.4)]"
              borderStyle=""
              variant="default"
            />

            {/* Clean Blur */}
            <SidebarVariant
              label="Clean Blur"
              description="Pure backdrop blur, no color overlay"
              className="bg-black/40 backdrop-blur-md"
              glowStyle=""
              borderStyle=""
              variant="default"
            />
          </div>
        </section>

        {/* Design Considerations */}
        <section className="mt-12 p-6 rounded-lg bg-black/30 border border-white/10">
          <h3 className="text-lg font-semibold mb-3">Design Considerations</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <strong>Glass Morphism:</strong> Balance between transparency (showing aurora) and readability (text contrast).
            </li>
            <li>
              <strong>Glow Effects:</strong> Should complement the aurora background without competing for attention.
            </li>
            <li>
              <strong>Border Treatment:</strong> Defines the edge while maintaining the cohesive dark theme.
            </li>
            <li>
              <strong>Performance:</strong> backdrop-blur can impact performance on mobile; consider subtle blur values.
            </li>
            <li>
              <strong>Consistency:</strong> Sidebar style should match the chat container glass effect.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
