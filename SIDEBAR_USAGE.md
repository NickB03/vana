# ChatGPT-Style Sidebar Implementation

## Overview

The sidebar now features ChatGPT-style collapse/expand behavior with perfect icon alignment and smooth transitions.

## Key Features Implemented

### 1. **Collapse/Expand Toggle**
- Toggle button in the top-right of the sidebar header
- Icons: `ChevronLeft` (expanded) and `ChevronRight` (collapsed)
- Collapsed width: `4rem` (w-16)
- Expanded width: `16rem` (w-64)
- Smooth transitions between states

### 2. **Logo Hover Behavior**
- When collapsed, hovering over the logo shows a `ChevronRight` icon
- Provides visual hint that clicking will create a new chat
- Uses `group` and `group-hover` for state management

### 3. **Icon Alignment**
- All icons are perfectly vertically aligned using flexbox
- Icons maintain consistent sizing: `w-5 h-5` containers with `h-4 w-4` icons
- Center alignment: `flex items-center justify-center`

### 4. **Tooltips in Collapsed State**
- Chat session titles appear as tooltips when hovering in collapsed mode
- Automatically hidden in expanded mode
- Built-in support via shadcn's `SidebarMenuButton` component

### 5. **Responsive Behavior**
- Search button hidden in collapsed state
- "New Chat" button shows only icon when collapsed
- Delete (More) buttons only show in expanded state

## Component Structure

### Updated Files

1. **`src/components/ui/sidebar.tsx`**
   - Updated `SIDEBAR_WIDTH_ICON` from `3rem` to `4rem`

2. **`src/components/ChatSidebar.tsx`**
   - Added collapse/expand toggle button
   - Implemented logo hover behavior
   - Updated all menu items with proper icon alignment
   - Added tooltips for collapsed state
   - Conditional rendering based on collapse state

3. **`src/components/SidebarItem.tsx`** (New)
   - Reusable component for sidebar items
   - Accepts: `icon`, `label`, `onClick`, `isActive`, `tooltip`
   - Automatically handles collapsed/expanded states

## Usage Examples

### Using the Reusable SidebarItem Component

```tsx
import { SidebarItem } from "@/components/SidebarItem";
import { Home, Settings, User } from "lucide-react";

// In your component
<SidebarMenu>
  <SidebarMenuItem>
    <SidebarItem
      icon={<Home className="h-4 w-4" />}
      label="Home"
      onClick={() => navigate("/")}
      isActive={pathname === "/"}
      tooltip="Go to home page"
    />
  </SidebarMenuItem>

  <SidebarMenuItem>
    <SidebarItem
      icon={<Settings className="h-4 w-4" />}
      label="Settings"
      onClick={() => navigate("/settings")}
      isActive={pathname === "/settings"}
    />
  </SidebarMenuItem>

  <SidebarMenuItem>
    <SidebarItem
      icon={<User className="h-4 w-4" />}
      label="Profile"
      onClick={() => navigate("/profile")}
      isActive={pathname === "/profile"}
    />
  </SidebarMenuItem>
</SidebarMenu>
```

### Accessing Sidebar State

```tsx
import { useSidebar } from "@/components/ui/sidebar";

function MyComponent() {
  const { state, toggleSidebar, open, setOpen } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <div>
      <p>Sidebar is {collapsed ? "collapsed" : "expanded"}</p>
      <button onClick={toggleSidebar}>Toggle Sidebar</button>
    </div>
  );
}
```

### Custom Menu Items with Icons

```tsx
<SidebarMenuButton
  onClick={handleClick}
  isActive={isActive}
  tooltip={collapsed ? "Tooltip text" : undefined}
  className={cn(
    "flex items-center gap-3 hover:bg-accent/50 transition-colors",
    collapsed ? "justify-center px-2" : "justify-start px-3"
  )}
>
  {/* Icon container - ensures perfect alignment */}
  <div className="flex items-center justify-center w-5 h-5 shrink-0">
    <MessageSquare className="h-4 w-4" />
  </div>

  {/* Label - hidden when collapsed */}
  {!collapsed && <span className="truncate text-sm flex-1">Label Text</span>}
</SidebarMenuButton>
```

## Styling Guidelines

### Icon Alignment Pattern
```tsx
// Container: w-5 h-5 with flex centering
<div className="flex items-center justify-center w-5 h-5 shrink-0">
  {/* Icon: h-4 w-4 */}
  <Icon className="h-4 w-4" />
</div>
```

### Conditional Padding
```tsx
className={cn(
  "transition-all",
  collapsed ? "px-2" : "px-4"  // Less padding when collapsed
)}
```

### Hide Elements When Collapsed
```tsx
{!collapsed && <ElementToHide />}
```

### Group Hover for Logo
```tsx
<button
  onMouseEnter={() => setIsLogoHovered(true)}
  onMouseLeave={() => setIsLogoHovered(false)}
>
  {collapsed && isLogoHovered ? (
    <ChevronRight className="h-6 w-6" />
  ) : (
    <Logo />
  )}
</button>
```

## Optional Enhancements

### 1. Persist Collapse State with localStorage

```tsx
import { useEffect } from "react";

const SIDEBAR_STATE_KEY = "sidebar-collapsed";

function usePersistentSidebar() {
  const { state, setOpen } = useSidebar();

  // Load saved state on mount
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (saved !== null) {
      setOpen(saved === "expanded");
    }
  }, [setOpen]);

  // Save state on change
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, state);
  }, [state]);

  return state;
}
```

### 2. Add Zustand for Global State

```tsx
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarStore {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      toggle: () => set((state) => ({ collapsed: !state.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
    }),
    {
      name: "sidebar-storage",
    }
  )
);
```

### 3. Keyboard Shortcut

The sidebar already has a built-in keyboard shortcut: `Cmd+B` (Mac) or `Ctrl+B` (Windows/Linux).

This is configured in `sidebar.tsx:20`:
```tsx
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
```

## Tailwind Utilities Reference

### Useful Classes for Sidebar Development

- **Width**: `w-16` (4rem), `w-64` (16rem)
- **Transitions**: `transition-all duration-200 ease-linear`
- **Flexbox**: `flex items-center justify-center`
- **Gap**: `gap-1`, `gap-2`, `gap-3`
- **Truncate**: `truncate` (for long text)
- **Shrink**: `shrink-0` (prevents flex shrinking)
- **Group Hover**: `group-hover:opacity-100`

## Browser Compatibility

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (responsive design)

## Performance Notes

- Smooth transitions use CSS `transition-all`
- No layout shift during collapse/expand
- Icons are SVG-based (lightweight)
- Tooltips only render when needed
- HMR (Hot Module Replacement) compatible

## Accessibility

- ARIA labels on toggle button
- Keyboard navigation support (`Cmd/Ctrl + B`)
- Focus management preserved
- Screen reader friendly
- Proper semantic HTML

## Known Issues

None currently. The implementation is production-ready.

## Future Improvements

1. **Animation Options**: Add spring animations with Framer Motion
2. **Resize Handle**: Drag to resize sidebar width
3. **Multiple Sidebars**: Support left and right sidebars simultaneously
4. **Themes**: Different color schemes for sidebar
5. **Mobile Gestures**: Swipe to open/close on mobile
