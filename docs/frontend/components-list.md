You're absolutely right to question that — the previous list only covered **functional UI components**, not **layout, navigation, or utility elements**, which are just as critical for building a complete Perplexity/ChatGPT-style frontend with ShadCN.

Let's fix that.

---

## ✅ **Full & Expanded List of ShadCN Components for Your Vana Frontend (Phase 1)**

| Area                         | UI Element                                                     | ShadCN Component                                                           |
| ---------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Layout**                   | Page structure, consistent spacing, vertical/horizontal layout | `Container` (manual via Tailwind), `Flex`, `Grid` (custom via Tailwind)    |
| **Sidebar**                  | Collapsible sidebar                                            | `Resizable`, `Button`, `Tooltip`, `Icon`                                   |
|                              | Vana Logo (top)                                                | Static SVG or `<Image />`                                                  |
|                              | ➕ New Chat Icon                                                | `Button` with icon only                                                    |
|                              | 📦 Artifacts Icon                                              | `Button` or `Link` with `Tooltip`                                          |
|                              | 👤 Account Icon (bottom)                                       | `Button` with icon                                                         |
|                              | Divider                                                        | `Separator`                                                                |
| **Main Panel**               | Welcome message “Hi, I’m Vana” with gradient                   | `Text` with Tailwind `bg-clip-text` utility                                |
| **Chat Stream**              | Scrollable message history                                     | `ScrollArea`                                                               |
|                              | Messages                                                       | `Card` (optional), `Avatar`, `Text`                                        |
|                              | SSE streaming placeholders                                     | `Skeleton`, `Loading Spinner` (custom or from ShadCN)                      |
| **Chat Input**               | Text input bar                                                 | `Textarea` or `Input` (ShadCN)                                             |
|                              | Upload icon                                                    | `Button` with `Dialog`                                                     |
|                              | Submit icon                                                    | `Button` with `Icon`                                                       |
| **Dialogs / Modals**         | Upload file UI                                                 | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter` |
|                              | (Optional) Auth/Login in future                                | `Dialog`, `Tabs`                                                           |
| **Notifications (optional)** | Success, error, or system messages                             | `Toast` (via `useToast()` from ShadCN)                                     |
| **Forms (optional)**         | For search settings or preferences later                       | `Form`, `FormField`, `Label`, `Input`, `Switch`, `Checkbox`, `Select`      |

---

## 🧩 Utility Components / Hooks

| Purpose             | Component / Hook                          |
| ------------------- | ----------------------------------------- |
| Modal state         | `useDialog()` or custom state             |
| Toast notifications | `useToast()`                              |
| Responsive layouts  | Tailwind CSS (`hidden`, `md:flex`, etc.)  |
| Icons               | `lucide-react` icons (included by ShadCN) |
