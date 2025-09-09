Awesome. You’ve confirmed:

* ✅ **Next.js 15** with **TypeScript**
* ✅ **ShadCN** for UI
* ✅ Upload icon in the input just opens a modal (backend stub only)
* ✅ Sidebar: Cleaned-up version based on your screenshots

---

### 📝 Generating Your Scaffold Plan

Below is the full `README.md` that will serve as your **kickoff project documentation** for Phase 1. You can drop this directly into the root of your project repo.

---

````markdown
# Vana AI Frontend (Phase 1 Scaffold)

> A Perplexity-style AI assistant UI built with **Next.js 15**, **TypeScript**, and **ShadCN**  
> Tied to the **Google ADK + FastAPI backend**, styled similarly to ChatGPT/Perplexity — with a custom UX layer.

---

## ✨ Features in Phase 1

- ✅ Sidebar with:
  - Vana logo (top left)
  - ➕ New chat button
  - 📦 Artifacts (replaces “Discover”)
  - 👤 Account (bottom left)
- ✅ Central landing area:
  - “Hi, I’m Vana” text with **purple → orange gradient**
- ✅ Prompt input:
  - Classic ChatGPT style
  - Upload button (opens modal)
  - Send/submit button
  - Placeholder: _"What can I help you with today?"_
- ✅ SSE-based chat streaming ready (backend stubbed in `lib/api.ts`)
- ✅ Modular component structure using **ShadCN/UI**

---

## 🛠 Tech Stack

| Tech         | Description                             |
|--------------|-----------------------------------------|
| Next.js 15   | App router, React server components     |
| TypeScript   | Type safety                             |
| Tailwind CSS | Styling framework                       |
| ShadCN/UI    | Component library                       |
| Zustand      | Lightweight state manager               |
| EventSource  | SSE integration                         |

---

## 📦 Installation

```bash
git clone https://github.com/your-org/vana-frontend
cd vana-frontend
pnpm install
pnpm dev
````

Make sure your backend is running on `http://localhost:8000`.

---

## 🗂 Directory Structure

```bash
/app
  layout.tsx               # Main app layout
  page.tsx                 # Root page (landing)
  /chat
    page.tsx               # Chat interface
    /components
      ChatInput.tsx        # Prompt bar w/ upload & submit
      ChatStream.tsx       # SSE message stream renderer
      MessageBubble.tsx    # User + assistant messages
      UploadModal.tsx      # Upload UI (stubbed)
  /components
    Sidebar.tsx            # Collapsible sidebar
    GradientHeader.tsx     # “Hi, I’m Vana” gradient

/lib
  api.ts                   # Chat API & SSE connectors
  auth.ts                  # Stubbed auth token utils
  store.ts                 # Zustand chat store
  types.ts                 # Types from backend

/public
  /icons                   # Vana logo, sidebar icons

/styles
  globals.css              # Tailwind + reset

/env.local                 # Dev config (not committed)
```

---

## 🔧 Configuration

### `.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_REQUIRE_AUTH=false
```

---

## 💬 Chat Input Behavior

* **Input bar** at bottom with Tailwind padding and border
* **Upload icon** (left) triggers `UploadModal.tsx`
* **Send button** (right) submits via POST:

  ```ts
  POST /chat/{chatId}/message
  Headers:
    X-User-ID
    X-Session-ID
    Authorization: Bearer <token>
  ```
* Response is streamed from:

  ```
  GET /chat/{chatId}/stream?task_id={taskId}
  ```

---

## 🧱 UI Snapshots

* `Sidebar.tsx` uses ShadCN `Resizable` + Tailwind for stateful collapse/expand
* `GradientHeader.tsx` uses:

  ```ts
  bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-transparent bg-clip-text
  ```
* Placeholder in prompt:
  *"What can I help you with today?"*

---

## ✅ Component Responsibility

| Component           | Responsibility                              |
| ------------------- | ------------------------------------------- |
| `ChatInput.tsx`     | Manages message input, file button, submit  |
| `ChatStream.tsx`    | Renders streaming messages via SSE          |
| `UploadModal.tsx`   | File picker UI (future backend integration) |
| `Sidebar.tsx`       | Logo, New chat, Artifacts, Account          |
| `MessageBubble.tsx` | Styled chat messages (user + system)        |
