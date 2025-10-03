/**
 * Sidebar component exports
 *
 * Refactored from single 773-line file into modular components:
 * - context.tsx: Context and provider logic
 * - sidebar-main.tsx: Main sidebar and inset components
 * - sidebar-layout.tsx: Layout components (header, footer, content)
 * - sidebar-controls.tsx: Interactive controls (trigger, rail)
 * - sidebar-menu.tsx: Menu components and variants
 * - sidebar-group.tsx: Group components
 * - types.ts: TypeScript interfaces
 * - constants.ts: Configuration constants
 */

// Context and hooks
export { SidebarProvider, useSidebar } from "./context"

// Main components
export { Sidebar, SidebarInset } from "./sidebar-main"

// Layout components
export {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInput,
  SidebarSeparator,
} from "./sidebar-layout"

// Control components
export { SidebarRail, SidebarTrigger } from "./sidebar-controls"

// Menu components
export {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./sidebar-menu"

// Group components
export {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "./sidebar-group"

// Types and constants
export type { SidebarContextProps } from "./types"
export {
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_MOBILE,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_KEYBOARD_SHORTCUT,
} from "./constants"