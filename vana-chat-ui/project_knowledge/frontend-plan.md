VANA UI: Master Technical Specification & Development PlanProject OverviewObjective: Your primary goal is to build a high-fidelity frontend application for "VANA," an AI agent platform. The development will occur in two main phases:Phase 1: Core Chat UI (POC): Create a polished, production-ready chat interface that mimics the core user experience of modern platforms like Google Gemini and ChatGPT.Phase 2: Advanced UI Implementation: Build the multi-panel "Advanced Mode" for power users to monitor and interact with the multi-agent system.Core Technologies:Framework: ReactLanguage: TypeScriptBuild Tool: ViteUI Components: shadcn/ui exclusively.Styling: Tailwind CSSPhase 1: Core Chat UI (Proof of Concept)This phase focuses on building the fundamental, user-facing chat interface.1.1. Global Styles & Theme (src/index.css)Establish the application's dark theme using these global CSS variables. All components MUST reference these variables.--bg-main: #1a1a1a;--bg-element: #2d2d2d;--bg-input: #3a3a3a;--border-primary: #4a4a4a;--text-primary: #ffffff;--text-secondary: #a0a0a0;--accent-blue: #7c9fff;--accent-purple: #c58af9;--accent-orange: #fb923c;--accent-red: #f28b82;.gemini-gradient-text class for titles.1.2. Architectural BlueprintCreate the following component files. The main state will be managed in ChatPage.tsx.src/pages/ChatPage.tsxsrc/components/Sidebar.tsxsrc/components/ChatView.tsxsrc/components/WelcomeScreen.tsxsrc/components/MessageHistory.tsxsrc/components/PromptInput.tsxsrc/components/UserProfile.tsx1.3. Component Implementation & UI RequirementsLayout & Sizing: The main content column (ChatView) and the PromptInput bar at the bottom MUST be centered and constrained with a max-w-3xl class.Borders: The page header and the PromptInput container must not have top or bottom borders.Sidebar (Sidebar.tsx):Must default to a collapsed state (useState(true)).On desktop, it must expand on hover and collapse on mouse leave.On mobile, it must be hidden and replaced by a hamburger icon (<Button> with Menu icon) that toggles a slide-in overlay.User Profile (UserProfile.tsx):Implement using shadcn/ui's <DropdownMenu>.The trigger must be a <Button> with variant="ghost", size="icon", containing a User icon.The content must match the visual layout from previous builds, including the <Avatar>.Prompt Input (PromptInput.tsx):This is a composite component built with shadcn/ui's <Textarea>, <Button>, and <Tooltip>.It must include icon buttons for "attach file" and "microphone," and a prominent "Send" button that is enabled only when text is present.Phase 2: Advanced UI ImplementationThis phase adds the multi-panel interface for power users.2.1. Create the Advanced UI PageCreate a new page at src/pages/AdvancedMode.tsx.2.2. Implement the Resizable LayoutUse the <ResizablePanelGroup> and <ResizableHandle> components from shadcn/ui to build the layout:Create a primary horizontal group to separate the main Sidebar from the content.Within the main content panel, create a nested vertical group to separate the Top Panel (Logs/Plan) from the Bottom Panel (Canvas).Within the Top Panel, create a final nested horizontal group to separate the Team Log Panel from the Task Plan Panel.2.3. Implement the Feature Panels (as Components)Create the following self-contained components and place them into their respective resizable panels.src/components/TeamLog.tsx:Props: logs: LogEntry[] (See Appendix A).Functionality: Renders a scrolling list of agent messages.UI States: If the logs array is empty, it must display a centered message: "Waiting for task...".src/components/TaskPlan.tsx:Implementation: Use the damianricobelli/stepperize library. Install with npx shadcn-ui@latest add https://stepperize.vercel.app/r/stepper-with-variants.json.Props: tasks: Task[] (See Appendix A).Functionality: Use the <Stepper> and <Step> components with a vertical orientation. The useStepper hook will programmatically advance the timeline.UI States: If the tasks array is empty, display "Waiting for task...". The state prop on each <Step> must be used to visually represent status (e.g., 'success', 'error').src/components/CanvasView.tsx:Props: content: stringState: Must manage its own viewMode state ('preview' or 'code').Functionality: Contains "Preview" and "Code" buttons. Renders content using marked for preview and highlight.js for code. Includes a "Copy" button.UI States: If the content string is empty, display a message: "Canvas is empty."2.4. Implement the Agentic Workflow LogicIn AdvancedMode.tsx, set up the state and orchestration logic.State Management: Create useState hooks for tasks, logs, canvasContent, and isProcessing.Workflow Function (handleSendMessage):This async function is triggered by user input.It will use setTimeout to simulate the asynchronous steps:Set isProcessing to true. This should disable the main input form.Clear old data (tasks, logs, canvasContent).Generate a mock task plan and update the tasks state.Loop through the plan, updating the tasks and logs states at each step to show real-time progress. Use the nextStep() function from the stepperize hook to advance the visual timeline.On completion, populate canvasContent, update userMessages, and set isProcessing to false.Error Handling: If the backend API returns an error, display the error message to the user using a shadcn/ui <Toast> notification.Appendix A: Data Structures & API ContractsThis section provides the specific data shapes and API endpoints the application will use.A.1. TypeScript Type DefinitionsCreate a file at src/types/index.ts to store all shared type definitions.// src/types/index.ts

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'vana';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

// For the 'stepperize' component
export interface Task {
  id: string; // Corresponds to the 'id' in the stepper item
  label: string; // The main title of the step
  description?: string; // An optional, more detailed description
  status: 'pending' | 'working' | 'done' | 'error';
}

export interface LogEntry {
  agent: string;
  message: string;
  color: string;
  timestamp: Date;
}
A.2. API ContractThe frontend will communicate with the backend via a single primary endpoint.Endpoint: POST /api/v1/agent/invokeDescription: Sends a user's request to the main orchestrator agent and receives the final output.Request Body:{
  "prompt": "string",
  "sessionId": "string | null"
}
Success Response (200 OK):{
  "chatResponse": "string", // The message to display in the user chat
  "canvasContent": "string", // The final markdown/code for the canvas
  "newSessionId": "string"
}
Error Response (4xx/5xx):{
  "error": "string" // A user-friendly error message
}
