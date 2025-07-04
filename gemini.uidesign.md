<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VANA UI Design Infographic (Interactive)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    
    <style>
        :root {
            --bg-main: #131314;
            --bg-element: #1e1f20;
            --bg-input: #2d2e30;
            --border-primary: #3c4043;
            --text-primary: #e8eaed;
            --text-secondary: #bdc1c6;
            --accent-blue: #89b3f7;
            --accent-purple: #c58af9;
            --accent-orange: #fb923c;
            --accent-red: #f28b82;
            --accent-green: #34a853;
            --accent-yellow: #fbbc04;
            /* New theme colors from aceternity (dark mode) */
            --sidebar-bg: #1C1C1C;
            --sidebar-border: #262626;
            --sidebar-text: #A3A3A3;
            --sidebar-text-hover: #F5F5F5;
            --sidebar-active-bg: #262626;
        }

        body {
            font-family: 'Inter', sans-serif;
            color: var(--text-primary);
            background-color: #0d0d0f;
            background-image: 
                radial-gradient(circle at 50% 15%, rgba(137, 179, 247, 0.15), rgba(137, 179, 247, 0) 30%),
                repeating-linear-gradient(0deg, rgba(60, 64, 67, .3) 0px, rgba(60, 64, 67, .3) 1px, transparent 1px, transparent 40px),
                repeating-linear-gradient(90deg, rgba(60, 64, 67, .3) 0px, rgba(60, 64, 67, .3) 1px, transparent 1px, transparent 40px);
        }

        .gemini-gradient-text {
            background: linear-gradient(90deg, var(--accent-blue), var(--accent-purple), var(--accent-orange), var(--accent-red));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;
        }
        
        .section-card {
            background-color: rgba(30, 31, 32, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-primary);
            border-radius: 20px;
            padding: 2rem;
            transition: all 0.3s ease-in-out;
        }
        
        .section-card:hover:not(.interactive) {
             border-color: rgba(137, 179, 247, 0.5);
             transform: translateY(-4px);
        }

        .flow-arrow {
            color: var(--border-primary);
            margin: 4rem 0;
        }

        .icon-bg {
            background-color: var(--bg-input);
            border: 1px solid var(--border-primary);
            width: 64px;
            height: 64px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .mock-ui {
             background-color: rgba(13, 13, 15, 0.7);
             border: 1px solid var(--border-primary);
             border-radius: 12px;
             padding: 1.5rem;
        }
        
        /* --- Styles for Interactive Components --- */
        .demo-container {
            height: 500px;
            width: 100%;
            background-color: var(--bg-element);
            border: 1px solid var(--border-primary);
            border-radius: 12px;
            margin-top: 1.5rem;
        }
         .mock-chat-bubble {
            background-color: var(--bg-main);
            max-width: 95%;
            font-size: 0.875rem;
            color: var(--text-primary);
            border-radius: 0.5rem;
        }
        .mock-user-bubble {
            background-color: var(--bg-input);
            color: var(--text-primary);
            max-width: 95%;
            font-size: 0.875rem;
            border-radius: 0.5rem;
        }
        .action-button {
             background-color: var(--bg-input);
             color: var(--accent-blue);
             border: 1px solid var(--border-primary);
             transition: background-color 0.2s;
        }
         .action-button:hover:not(:disabled) {
            background-color: #37383b;
         }
        
        @keyframes trace { to { stroke-dashoffset: -1000; } }
        .chasing-border-path {
            stroke-dasharray: 120 400; 
            stroke-dashoffset: 0;
            animation: trace 2s linear infinite;
        }

        .send-icon-button {
            background-color: var(--bg-input);
            border: 1px solid var(--border-primary);
            color: var(--text-primary);
            width: 36px;
            height: 36px;
        }
        .send-icon-button:hover:not(:disabled) { background-color: #37383b; }
        .send-icon-button:disabled { opacity: 0.7; cursor: not-allowed; }
        .canvas-container .prose { max-width: none; }
        .canvas-container .prose h1,
        .canvas-container .prose h2,
        .canvas-container .prose h3 { color: var(--text-primary); }
        .canvas-container .prose ul { list-style-type: disc; padding-left: 1.5rem;}
        .canvas-container .prose li { margin-top: 0.25rem; margin-bottom: 0.25rem; }

        /* --- Styles for NEW Aceternity-inspired Sidebar --- */
        .vana-sidebar {
            width: 60px;
            background-color: var(--sidebar-bg);
            border-right: 1px solid var(--sidebar-border);
            transition: width 0.3s ease-in-out;
            flex-shrink: 0;
            overflow: hidden;
        }
        .vana-sidebar.expanded {
            width: 250px;
        }
        .vana-sidebar-header {
            color: var(--sidebar-text-hover);
        }
        .vana-sidebar-link {
            display: flex;
            align-items: center;
            gap: 0.75rem; /* 12px */
            padding: 0.5rem; /* 8px */
            border-radius: 0.375rem; /* 6px */
            color: var(--sidebar-text);
            cursor: pointer;
            transition: color 0.2s ease, background-color 0.2s ease;
        }
        .vana-sidebar-link:hover {
            color: var(--sidebar-text-hover);
            background-color: var(--sidebar-active-bg);
        }
        .vana-sidebar-link.active {
             color: var(--sidebar-text-hover);
            background-color: var(--sidebar-active-bg);
        }
        .vana-sidebar-link-label {
            white-space: pre;
            opacity: 0;
            display: none;
            transition: opacity 0.2s ease-in-out, display 0.2s ease-in-out;
            transition-delay: 0.1s;
        }
        .vana-sidebar.expanded .vana-sidebar-link-label {
            opacity: 1;
            display: inline-block;
        }
        
        /* --- Moving Border Effect --- */
        @keyframes moving-border-spin { from { --border-angle: 0deg; } to { --border-angle: 360deg; } }
        @property --border-angle { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
        .moving-border {
            position: relative;
            border-radius: 0.75rem; 
            padding: 2px;
        }
        .moving-border::before {
             content: "";
            position: absolute;
            top: 0; right: 0; bottom: 0; left: 0;
            z-index: 0;
            border-radius: inherit;
            background: conic-gradient(
                from var(--border-angle),
                var(--accent-blue), 
                var(--accent-purple), 
                var(--accent-red), 
                var(--accent-orange),
                var(--accent-blue)
            );
            animation: moving-border-spin 4s linear infinite;
        }
        .moving-border-content {
            position: relative;
            z-index: 1;
            background-color: var(--bg-main);
            border-radius: 0.6rem; 
        }

        .awb-canvas-view-btn.active {
            background-color: var(--accent-blue);
            color: var(--bg-main);
        }
        .awb-canvas-view-btn:not(.active) {
            background-color: transparent;
            color: var(--text-secondary);
        }
        .awb-canvas-view-btn:not(.active):hover {
            background-color: rgba(255,255,255,0.1);
        }
        
        /* Styles for Settings Flyout Panel */
        .settings-flyout-overlay {
            position: fixed;
            inset: 0;
            background-color: rgba(0,0,0,0.5);
            backdrop-filter: blur(4px);
            z-index: 40;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
            pointer-events: none;
        }
        .settings-flyout-overlay.visible {
            opacity: 1;
            pointer-events: auto;
        }
        .settings-flyout-panel {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 300px;
            background-color: var(--sidebar-bg);
            border-right: 1px solid var(--sidebar-border);
            z-index: 50;
            transform: translateX(-100%);
            transition: transform 0.3s ease-in-out;
            padding: 1rem;
        }
        .settings-flyout-panel.visible {
            transform: translateX(0);
        }
    </style>
</head>
<body class="antialiased">
    <!-- SVG Definitions -->
    <svg style="display: none;">
      <defs>
          <linearGradient id="gemini-chase-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="var(--accent-blue)" />
              <stop offset="33%" stop-color="var(--accent-purple)" />
              <stop offset="66%" stop-color="var(--accent-red)" />
              <stop offset="100%" stop-color="var(--accent-orange)" />
          </linearGradient>
      </defs>
    </svg>

    <div class="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        
        <header class="text-center my-16">
            <h1 class="text-5xl md:text-7xl font-extrabold gemini-gradient-text">Designing VANA</h1>
            <p class="text-xl text-[--text-secondary] mt-4 max-w-3xl mx-auto">A design philosophy for building intuitive, trustworthy, and collaborative Human-Agent Interfaces.</p>
        </header>
        
        <section class="my-24">
            <h2 class="text-4xl font-bold text-center mb-12 text-white">The Core Philosophy</h2>
            <div class="grid md:grid-cols-3 gap-8 text-center">
                <div class="section-card flex flex-col items-center">
                    <div class="icon-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-[--accent-blue]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 class="text-2xl font-bold mt-5 text-white">Trust</h3>
                    <p class="text-[--text-secondary] mt-2">Build user confidence through reliability, verifiable sources, and predictable behavior.</p>
                </div>
                <div class="section-card flex flex-col items-center">
                    <div class="icon-bg">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-[--accent-purple]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6V4m0 16v-2m0-8a2 2 0 100-4 2 2 0 000 4zm0 8a2 2 0 100-4 2 2 0 000 4zm-4-4a2 2 0 10-4 0 2 2 0 004 0zm8 0a2 2 0 10-4 0 2 2 0 004 0zm-4-4a2 2 0 100-4 2 2 0 000 4z" /></svg>
                    </div>
                    <h3 class="text-2xl font-bold mt-5 text-white">Control</h3>
                    <p class="text-[--text-secondary] mt-2">Ensure users feel empowered to guide, interrupt, and correct the AI at every step.</p>
                </div>
                <div class="section-card flex flex-col items-center">
                    <div class="icon-bg">
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-[--accent-green]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </div>
                    <h3 class="text-2xl font-bold mt-5 text-white">Transparency</h3>
                    <p class="text-[--text-secondary] mt-2">Turn the "black box" into a glass box by showing the AI's thought process and actions.</p>
                </div>
            </div>
        </section>

        <div class="text-center flow-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        </div>
        
        <section class="my-24">
             <h2 class="text-3xl font-bold text-center mb-10 text-white">Authentication</h2>
             <div class="max-w-4xl mx-auto section-card overflow-hidden p-0">
                 <div class="flex">
                    <div class="hidden md:block w-1/2 p-12 flex flex-col items-center justify-center text-center bg-bg-element border-r border-border-primary">
                        <div class="mb-6 icon-bg" style="width: 80px; height: 80px;">
                             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="url(#gemini-chase-gradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M2 7L12 12L22 7" stroke="url(#gemini-chase-gradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M12 22V12" stroke="url(#gemini-chase-gradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h2 class="text-3xl font-bold mb-2 text-white">Welcome to VANA</h2>
                        <p class="text-sm text-text-secondary max-w-xs">Sign in to access your dashboard and unlock the full potential of AI collaboration.</p>
                    </div>
                    <div class="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
                        <div>
                             <h2 class="text-2xl font-bold mb-1 text-white">Sign In</h2>
                             <p class="text-text-secondary mb-8">Enter your credentials to continue.</p>
                             
                             <div class="space-y-4">
                                <div>
                                    <label for="email-auth" class="block text-sm font-medium text-text-secondary mb-2">Email</label>
                                    <input type="email" name="email-auth" id="email-auth" class="w-full p-3 bg-bg-input border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                                </div>
                                <div>
                                    <label for="password-auth" class="block text-sm font-medium text-text-secondary mb-2">Password</label>
                                    <input type="password" name="password-auth" id="password-auth" class="w-full p-3 bg-bg-input border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue">
                                </div>
                                <button class="w-full p-3 bg-accent-blue text-bg-main font-bold rounded-lg hover:bg-opacity-90 transition-colors">Sign In</button>
                                <div class="relative flex py-5 items-center">
                                    <div class="flex-grow border-t border-border-primary"></div>
                                    <span class="flex-shrink mx-4 text-text-secondary text-sm">Or continue with</span>
                                    <div class="flex-grow border-t border-border-primary"></div>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <button class="w-full p-3 bg-bg-input border border-border-primary rounded-lg flex items-center justify-center gap-2 hover:bg-bg-element text-text-secondary hover:text-white">
                                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.223,0-9.655-3.356-11.303-8H6.306C9.656,39.663,16.318,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.02,35.625,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                                        Google
                                    </button>
                                    <button class="w-full p-3 bg-bg-input border border-border-primary rounded-lg flex items-center justify-center gap-2 hover:bg-bg-element text-text-secondary hover:text-white">
                                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path></svg>
                                        GitHub
                                    </button>
                                </div>
                                <div class="text-center mt-6">
                                    <a href="#" class="text-accent-blue hover:underline text-sm transition-colors">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                 </div>
             </div>
        </section>

        <div class="text-center flow-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        </div>
        
        <section class="my-24">
            <h2 class="text-3xl font-bold text-center mb-10 text-white">Design Blueprints</h2>
            <div class="space-y-16">
                
                <!-- Basic UI -->
                <div class="section-card interactive">
                    <h3 class="text-2xl font-bold text-white mb-2">Basic UI</h3>
                    <p class="text-[--text-secondary]">A standard layout with a collapsible canvas, providing more room for the chat when needed.</p>
                    <div id="threads-demo" class="demo-container flex overflow-hidden mt-6">
                        <aside id="vana-sidebar" class="vana-sidebar flex flex-col p-2 space-y-2">
                             <div class="flex items-center justify-between flex-shrink-0 h-10 px-2">
                                 <span class="vana-sidebar-link-label font-bold text-lg vana-sidebar-header">Threads</span>
                                 <button id="awb-new-chat-btn" class="action-button rounded-md p-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
                                 </button>
                             </div>
                             <div id="awb-thread-list" class="flex-1 overflow-y-auto space-y-1"></div>
                        </aside>
                        <div id="awb-chat-panel-wrapper" class="w-2/5 flex flex-col bg-[--bg-element] border-r border-[--border-primary] transition-all duration-300">
                            <header class="p-3 h-14 border-b border-[--border-primary] flex items-center gap-2 flex-shrink-0"><h2 class="text-lg font-bold text-white">Chat</h2></header>
                            <div id="awb-chat-window" class="flex-1 p-4 overflow-y-auto"></div>
                            <footer class="p-4 border-t border-[--border-primary] bg-[--bg-element] flex-shrink-0">
                                <form id="awb-chat-form" class="flex items-center space-x-2">
                                    <input id="awb-chat-input" type="text" placeholder="Message VANA..." class="flex-1 p-2 border border-[--border-primary] rounded-lg focus:outline-none bg-[--bg-input]" autocomplete="off">
                                    <button type="submit" class="send-icon-button flex items-center justify-center rounded-full flex-shrink-0 relative"></button>
                                </form>
                            </footer>
                        </div>
                        <div id="awb-canvas-wrapper" class="flex-1 flex flex-col bg-[--bg-main] transition-all duration-300">
                             <header id="awb-canvas-header" class="p-3 h-14 border-b border-[--border-primary] flex justify-between items-center flex-shrink-0">
                                <h2 id="awb-canvas-title" class="text-lg font-bold text-white">Canvas</h2>
                                 <div id="awb-canvas-controls" class="flex items-center gap-2">
                                    <div class="bg-[--bg-input] p-0.5 rounded-md flex">
                                       <button data-view="preview" class="awb-canvas-view-btn active text-xs font-semibold py-1 px-2 rounded">Preview</button>
                                       <button data-view="code" class="awb-canvas-view-btn text-xs font-semibold py-1 px-2 rounded">Code</button>
                                    </div>
                                    <button class="awb-copy-btn action-button p-1.5 rounded-md"></button>
                                    <button id="awb-canvas-toggle-btn" class="action-button p-1.5 rounded-md"></button>
                                 </div>
                            </header>
                            <div id="awb-canvas" class="flex-1 p-6 overflow-y-auto canvas-container relative"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Advanced UI -->
                <div class="section-card interactive">
                    <h3 class="text-2xl font-bold text-white mb-2">Advanced UI</h3>
                    <p class="text-[--text-secondary]">A multi-panel layout for power users, providing full transparency into an agent's workflow. Type a goal in the chat to start the simulation.</p>
                    <div id="mission-control-demo" class="demo-container flex overflow-hidden">
                        <aside id="mc-sidebar" class="vana-sidebar flex flex-col p-2 space-y-2">
                            <div class="flex items-center justify-between flex-shrink-0 h-10 px-2">
                                <span class="vana-sidebar-link-label font-bold text-lg vana-sidebar-header">Actions</span>
                            </div>
                            <div class="flex-1 space-y-1">
                                <button class="vana-sidebar-link w-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="flex-shrink-0" viewBox="0 0 16 16"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>
                                    <span class="vana-sidebar-link-label">New Task</span>
                                </button>
                                <button class="vana-sidebar-link w-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="flex-shrink-0" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
                                    <span class="vana-sidebar-link-label">View History</span>
                                </button>
                            </div>
                        </aside>
                        <div class="flex flex-1 overflow-hidden">
                            <div class="w-1/3 flex-shrink-0 h-full flex flex-col border-r border-[--border-primary] bg-[--bg-main]">
                                 <header class="p-3 border-b border-[--border-primary] font-bold text-center text-white h-14 flex items-center justify-center">User Chat</header>
                                 <div id="mc-chat-window" class="flex-1 p-2 overflow-y-auto"></div>
                                 <footer class="p-2 border-t border-[--border-primary] bg-[--bg-main]">
                                    <form id="mc-chat-form" class="flex items-center space-x-2">
                                        <input id="mc-chat-input" type="text" placeholder="Message VANA..." class="flex-1 p-2 border border-[--border-primary] rounded-lg text-sm bg-[--bg-input] focus:outline-none" autocomplete="off">
                                        <button type="submit" class="send-icon-button flex items-center justify-center rounded-full flex-shrink-0 relative"></button>
                                    </form>
                                 </footer>
                            </div>
                            <div class="flex-1 h-full flex flex-col bg-[--bg-element]">
                                <div class="flex-1 flex overflow-hidden">
                                    <div class="w-1/2 h-full flex flex-col border-r border-[--border-primary]">
                                        <header class="p-3 border-b border-[--border-primary] font-bold text-center text-white h-14 flex items-center justify-center">Team Log</header>
                                        <div id="mc-team-log" class="flex-1 p-2 overflow-y-auto text-xs space-y-2"></div>
                                    </div>
                                    <div class="w-1/2 h-full flex flex-col">
                                        <header class="p-3 border-b border-[--border-primary] font-bold text-center text-white h-14 flex items-center justify-center">Task Plan</header>
                                         <div id="mc-task-plan" class="flex-1 p-2 overflow-y-auto text-sm space-y-2"></div>
                                    </div>
                                </div>
                                <div class="h-1/2 border-t border-[--border-primary] flex flex-col">
                                    <header class="p-3 border-b border-[--border-primary] flex justify-between items-center text-white h-14">
                                        <h2 class="font-bold">Canvas</h2>
                                        <button class="mc-copy-btn action-button p-1.5 rounded-md">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                    </header>
                                    <div id="mc-canvas" class="flex-1 p-4 overflow-y-auto canvas-container"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <footer class="text-center my-16 border-t border-[--border-primary] pt-12">
            <h3 class="text-2xl font-bold gemini-gradient-text">A New Paradigm</h3>
            <p class="mt-2 text-[--text-secondary]">By focusing on Trust, Control, and Transparency, we can build agentic systems that act as true partners to humanity.</p>
        </footer>
    </div>
    
    <!-- Settings Flyout Panel HTML -->
    <div id="settings-flyout-overlay" class="settings-flyout-overlay"></div>
    <div id="settings-flyout-panel" class="settings-flyout-panel flex flex-col">
        <div class="flex-shrink-0 flex items-center justify-between h-10 mb-4">
            <h3 class="font-bold text-lg text-white">Settings</h3>
            <button id="close-settings-btn" class="p-2 text-[--sidebar-text] hover:text-[--sidebar-text-hover]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854Z"/></svg>
            </button>
        </div>
        <nav class="flex-grow flex flex-col space-y-2">
            <a href="#" class="vana-sidebar-link active">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="flex-shrink-0" viewBox="0 0 16 16"><path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>
                <span class="vana-sidebar-link-label opacity-100 inline-block">Profile</span>
            </a>
             <a href="#" class="vana-sidebar-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="flex-shrink-0" viewBox="0 0 16 16"><path d="M8 1a.5.5 0 0 1 .5.5v1.277a.5.5 0 0 0 .894.447l.879-.507a.5.5 0 0 1 .632.632l-.507.879a.5.5 0 0 0 .447.894V5.5a.5.5 0 0 1 1 0v.277a.5.5 0 0 0 .894-.447l.879.507a.5.5 0 0 1-.632.632l-.507-.879a.5.5 0 0 0-.447-.894H12.5a.5.5 0 0 1 0-1h-.277a.5.5 0 0 0-.894.447l-.879-.507a.5.5 0 0 1-.632-.632l.507-.879a.5.5 0 0 0 .447-.894V1.5A.5.5 0 0 1 8 1zM4.447.894A.5.5 0 0 0 4.134 0H2.5a.5.5 0 0 0 0 1h1.277a.5.5 0 0 1 .447.894l-.879.507a.5.5 0 0 0-.632.632l.879.507a.5.5 0 0 1 .447.894V5.5a.5.5 0 0 0 1 0v-.723a.5.5 0 0 0-.447-.894l.879-.507a.5.5 0 0 0 .632-.632l-.879-.507a.5.5 0 0 1-.447-.894V1.5a.5.5 0 0 0-1 0v.723a.5.5 0 0 0 .447.894l-.879.507a.5.5 0 0 0 .632.632l.879-.507A.5.5 0 0 1 5.866 3H7.5a.5.5 0 0 0 0-1H5.366a.5.5 0 0 1-.447-.894l.879-.507a.5.5 0 0 0 .632-.632L5.553.171a.5.5 0 0 0-.447-.894H4.447zM1.5 9.5A.5.5 0 0 1 2 9h12a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5zm0 2A.5.5 0 0 1 2 11h12a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5zm0 2A.5.5 0 0 1 2 13h12a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5z"/></svg>
                <span class="vana-sidebar-link-label opacity-100 inline-block">Theme</span>
            </a>
             <a href="#" class="vana-sidebar-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="flex-shrink-0" viewBox="0 0 16 16"><path d="M10 7.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/><path d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887 1.177C14.49 2.195 15 3.05 15 3.994v2.604c0 .865-.486 1.83-1.18 2.5l-1.07 1.071c-.504.504-1.154.832-1.837.953v2.87c0 .178-.073.342-.2.465l-.328.328a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 0-.707 0L5.343 14.83a.5.5 0 0 1-.707 0l-.328-.328a.5.5 0 0 1-.2-.465v-2.87c-.683-.121-1.333-.449-1.837-.953L1.18 9.098C.486 8.43 0 7.465 0 6.598V3.994c0-.944.51-1.799 1.187-2.257C1.845 1.215 2.964.86 4.072.56zM8 1a1 1 0 0 0-1 1v.016a1 1 0 0 0 2 0V2a1 1 0 0 0-1-1z"/></svg>
                <span class="vana-sidebar-link-label opacity-100 inline-block">API Keys</span>
            </a>
        </nav>
        <div class="flex-shrink-0">
             <a href="#" class="vana-sidebar-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="flex-shrink-0" viewBox="0 0 16 16"><path d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2.146a.5.5 0 0 1-.146.354l-2.5 2.5a.5.5 0 0 1 0 .708l2.5 2.5a.5.5 0 0 1 .146.354V12.5zM_11.5 5.854a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L8 3.207l2.646 2.647a.5.5 0 0 0 .708 0z"/></svg>
                <span class="vana-sidebar-link-label opacity-100 inline-block">Logout</span>
            </a>
        </div>
    </div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    
    // --- UTILITY: Sanitize HTML to prevent XSS ---
    const escapeHtml = (unsafe) => {
        if (typeof unsafe !== 'string') return '';
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
     }

    // --- UTILITY: Gemini API Call Helper ---
    const callGemini = async (prompt) => {
        let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };
        const apiKey = ""; // Canvas will provide the key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error("API Error:", errorBody);
                return `Error: API call failed with status: ${response.status}.`;
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts[0].text) {
                return result.candidates[0].content.parts[0].text;
            } else {
                 if (result.promptFeedback && result.promptFeedback.blockReason) {
                     return `Error: Request was blocked. Reason: ${result.promptFeedback.blockReason}`;
                }
                console.error("Invalid API Response:", result);
                return "Error: Received an empty or invalid response from the AI.";
            }
        } catch (error) {
            console.error("Fetch Error:", error);
            return `Error: Could not connect to the AI service. ${error}`;
        }
    };
    
    // --- UTILITY: Robust JSON Parser ---
    function tryParseJson(text) {
        if (typeof text !== 'string') {
            console.error("tryParseJson received non-string input:", text);
            return null;
        }

        let jsonString = text.trim();

        const markdownMatch = jsonString.match(/^```json\s*([\s\S]*?)\s*```$/);
        if (markdownMatch && markdownMatch[1]) {
            jsonString = markdownMatch[1];
        }

        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error(`JSON parse failed: ${e.message}`);
            console.error("Failed to parse the following JSON string:", jsonString);
            return null;
        }
    }
    
    // --- UTILITY: Clipboard Copy (iFrame friendly) ---
    function copyToClipboard(text, buttonElement) {
        const originalText = buttonElement.innerHTML;
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
             buttonElement.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
        }
        document.body.removeChild(textarea);
        setTimeout(() => { buttonElement.innerHTML = originalText; }, 2000);
    }

    // --- ICONS & ANIMATIONS ---
    const sendIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z"/></svg>`;
    const chasingBorderSvg = `<svg class="absolute top-0 left-0 w-full h-full pointer-events-none"><rect class="chasing-border-path" x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="17" fill="none" stroke="url(#gemini-chase-gradient)" stroke-width="2.5"></rect></svg>`;
    const threadIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="flex-shrink-0" viewBox="0 0 16 16"><path d="M2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m3 4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m-3 4a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"></path></svg>`;
    const minimizeIconSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>`;
    const plusIconSvg = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>`;
    const copyIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>`;


    // --- Basic UI SCRIPT (with Threads & Canvas Toggle) ---
    function initThreadsDemo() {
        const awbDemo = document.getElementById('threads-demo');
        if (!awbDemo || awbDemo.initialized) return;
        
        awbDemo.initialized = true;

        const state = {
            activeThreadId: null,
            threads: [],
            isCanvasMinimized: true
        };

        const vanaSidebar = awbDemo.querySelector('#vana-sidebar');
        const awbThreadList = awbDemo.querySelector('#awb-thread-list');
        const awbNewChatBtn = awbDemo.querySelector('#awb-new-chat-btn');
        const awbChatWindow = awbDemo.querySelector('#awb-chat-window');
        const awbChatForm = awbDemo.querySelector('#awb-chat-form');
        const awbChatInput = awbDemo.querySelector('#awb-chat-input');
        const awbSendBtn = awbChatForm.querySelector('button');
        
        // Canvas elements
        const awbCopyBtn = awbDemo.querySelector('.awb-copy-btn');
        const awbCanvasViewBtns = awbDemo.querySelectorAll('.awb-canvas-view-btn');
        const toggleBtn = document.getElementById('awb-canvas-toggle-btn');
        const canvasWrapper = document.getElementById('awb-canvas-wrapper');
        const chatWrapper = document.getElementById('awb-chat-panel-wrapper');
        const canvasContainer = document.getElementById('awb-canvas');
        const canvasControls = document.getElementById('awb-canvas-controls');
        const canvasTitle = document.getElementById('awb-canvas-title');
        const canvasHeader = document.getElementById('awb-canvas-header');

        // Create dedicated elements for canvas views
        canvasContainer.innerHTML = `
            <div id="awb-canvas-preview" class="prose prose-invert max-w-none"></div>
            <pre id="awb-canvas-code" class="hidden"><code class="language-markdown"></code></pre>
        `;
        const canvasPreview = document.getElementById('awb-canvas-preview');
        const canvasCode = document.getElementById('awb-canvas-code');
        const canvasCodeBlock = canvasCode.querySelector('code');

        const setAwbButtonThinkingState = (isThinking) => {
            awbSendBtn.disabled = isThinking;
            awbSendBtn.innerHTML = isThinking ? chasingBorderSvg : sendIconSvg;
        };

        const renderAwbCanvasContent = (content) => {
            const activeThread = getActiveThread();
            if(!activeThread) return;
            
            activeThread.rawCanvasContent = content;
            activeThread.canvasContent = marked.parse(content);

            canvasPreview.innerHTML = activeThread.canvasContent;
            canvasCodeBlock.textContent = activeThread.rawCanvasContent;
            hljs.highlightElement(canvasCodeBlock);
        }
        
        const createNewThread = () => {
            const newThread = {
                id: Date.now(),
                title: 'New Chat',
                messages: [{type: 'ai', text: 'Hello! Ask me a question, or ask for a file to see the canvas appear.'}],
                canvasContent: '<p class="text-[--text-secondary]">Canvas content will appear here.</p>',
                rawCanvasContent: 'Canvas content will appear here.'
            };
            state.threads.unshift(newThread);
            setActiveThread(newThread.id);
        };

        const setActiveThread = (threadId) => {
            state.activeThreadId = threadId;
            renderAll();
        };

        const getActiveThread = () => {
            return state.threads.find(t => t.id === state.activeThreadId);
        }

        const renderThreadList = () => {
            awbThreadList.innerHTML = '';
            state.threads.forEach(thread => {
                const threadItem = document.createElement('button');
                threadItem.className = `vana-sidebar-link w-full`;
                if(thread.id === state.activeThreadId) {
                    threadItem.classList.add('active');
                }
                threadItem.dataset.threadId = thread.id;
                threadItem.innerHTML = `
                    ${threadIconSvg}
                    <span class="vana-sidebar-link-label truncate">${escapeHtml(thread.title)}</span>
                `;
                awbThreadList.appendChild(threadItem);
            });
        };
        
        const renderActiveThread = () => {
            const activeThread = getActiveThread();
            if (!activeThread) {
                awbChatWindow.innerHTML = '';
                canvasPreview.innerHTML = '';
                canvasCodeBlock.textContent = '';
                return;
            };
            
            awbChatWindow.innerHTML = '';
            activeThread.messages.forEach(msg => {
                const messageContainer = document.createElement('div');
                messageContainer.className = `flex w-full ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-4`;
                
                if (msg.isThought) {
                     messageContainer.innerHTML = `
                        <div class="moving-border w-full">
                           <div class="moving-border-content p-3 text-sm text-secondary w-full">
                                ${escapeHtml(msg.text)}
                           </div>
                        </div>`;
                }
                else {
                    const bubble = document.createElement('div');
                    bubble.className = `p-3 text-sm mock-chat-bubble ${msg.type === 'user' ? 'mock-user-bubble' : ''}`;
                    bubble.innerHTML = marked.parse(msg.text || '');
                    messageContainer.appendChild(bubble);
                }
                awbChatWindow.appendChild(messageContainer);
            });
             awbChatWindow.scrollTop = awbChatWindow.scrollHeight;

            canvasPreview.innerHTML = activeThread.canvasContent;
            canvasCodeBlock.textContent = activeThread.rawCanvasContent;
            if(activeThread.rawCanvasContent){
                hljs.highlightElement(canvasCodeBlock);
            }
        };

        const renderAll = () => {
            renderThreadList();
            renderActiveThread();
        }

        const setCanvasMinimized = (isMinimized) => {
            state.isCanvasMinimized = isMinimized;
            
            if (isMinimized) {
                chatWrapper.classList.remove('w-2/5');
                chatWrapper.classList.add('flex-1');
                canvasWrapper.classList.remove('flex-1');
                canvasWrapper.classList.add('w-[60px]');
                canvasContainer.classList.add('hidden');
                canvasTitle.classList.add('hidden');
                canvasControls.querySelectorAll('*:not(#awb-canvas-toggle-btn)').forEach(el => el.classList.add('hidden'));
                canvasHeader.classList.remove('justify-between');
                canvasHeader.classList.add('justify-center');
                toggleBtn.innerHTML = plusIconSvg;
            } else {
                chatWrapper.classList.add('w-2/5');
                chatWrapper.classList.remove('flex-1');
                canvasWrapper.classList.add('flex-1');
                canvasWrapper.classList.remove('w-[60px]');
                canvasContainer.classList.remove('hidden');
                canvasTitle.classList.remove('hidden');
                canvasControls.querySelectorAll('*:not(#awb-canvas-toggle-btn)').forEach(el => el.classList.remove('hidden'));
                canvasHeader.classList.add('justify-between');
                canvasHeader.classList.remove('justify-center');
                toggleBtn.innerHTML = minimizeIconSvg;
            }
        };
        
        // --- Event Listeners ---
        awbNewChatBtn.addEventListener('click', () => {
            createNewThread();
            setCanvasMinimized(true);
        });
        
        vanaSidebar.addEventListener('mouseenter', () => vanaSidebar.classList.add('expanded'));
        vanaSidebar.addEventListener('mouseleave', () => vanaSidebar.classList.remove('expanded'));

        awbThreadList.addEventListener('click', (e) => {
            const button = e.target.closest('.vana-sidebar-link');
            if (button) {
                const threadId = parseInt(button.dataset.threadId, 10);
                setActiveThread(threadId);
            }
        });
        
        awbChatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userInput = awbChatInput.value.trim();
            if(!userInput || !state.activeThreadId) return;

            const activeThread = getActiveThread();
            activeThread.messages.push({type: 'user', text: userInput});
            
            if(activeThread.title === 'New Chat') {
                activeThread.title = userInput;
            }
            
            activeThread.messages.push({type: 'ai', text: 'Thinking...', isThought: true});
            renderAll();

            awbChatInput.value = '';
            setAwbButtonThinkingState(true);
            
            const isFileRequest = userInput.toLowerCase().includes('file') || userInput.toLowerCase().includes('report') || userInput.toLowerCase().includes('code') || userInput.toLowerCase().includes('markdown');
            
            // Simulating different responses based on request
            let responseText;
            let prompt;
            if (isFileRequest) {
                prompt = `The user wants a file or long-form content. Generate a response in markdown format for the user request: "${userInput}".`;
                setCanvasMinimized(false);
            } else {
                prompt = `The user asked a simple question. Provide a concise answer in plain text for: "${userInput}"`;
                if (state.isCanvasMinimized === false) {
                     setCanvasMinimized(true);
                }
            }
            
            responseText = await callGemini(prompt);

            const thinkingIndex = activeThread.messages.findIndex(m => m.isThought);
            if (thinkingIndex !== -1) {
                if (isFileRequest) {
                     activeThread.messages[thinkingIndex] = {type: 'ai', text: "I've generated that for you in the canvas."};
                     renderAwbCanvasContent(responseText);
                } else {
                    activeThread.messages.splice(thinkingIndex, 1, {type: 'ai', text: responseText});
                }
            }
            
            renderAll();
            setAwbButtonThinkingState(false);
        });
        
        awbCanvasViewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                awbCanvasViewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (view === 'code') {
                    canvasPreview.classList.add('hidden');
                    canvasCode.classList.remove('hidden');
                } else {
                    canvasPreview.classList.remove('hidden');
                    canvasCode.classList.add('hidden');
                }
            });
        });
        
        // --- Canvas Toggle Logic ---
        awbCopyBtn.innerHTML = copyIconSvg;
        toggleBtn.addEventListener('click', () => setCanvasMinimized(!state.isCanvasMinimized));

         awbCopyBtn.addEventListener('click', () => {
             const activeThread = getActiveThread();
             if (activeThread && activeThread.rawCanvasContent) {
                copyToClipboard(activeThread.rawCanvasContent, awbCopyBtn);
             }
        });

        // --- Initial State ---
        createNewThread();
        setCanvasMinimized(true);
        setAwbButtonThinkingState(false);
    }


    // --- Advanced UI SCRIPT ---
    function initMissionControlDemo() {
        const mcDemo = document.getElementById('mission-control-demo');
        if(!mcDemo || mcDemo.initialized) return;
        mcDemo.initialized = true;

        const mcSidebar = mcDemo.querySelector('#mc-sidebar'); 
        const mcChatWindow = mcDemo.querySelector('#mc-chat-window');
        const mcChatForm = mcDemo.querySelector('#mc-chat-form');
        const mcChatInput = mcDemo.querySelector('#mc-chat-input');
        const mcTeamLog = mcDemo.querySelector('#mc-team-log');
        const mcTaskPlan = mcDemo.querySelector('#mc-task-plan');
        const mcCanvas = mcDemo.querySelector('#mc-canvas');
        const mcSendBtn = mcChatForm.querySelector('button');
        const mcCopyBtn = mcDemo.querySelector('.mc-copy-btn');
        
        let rawMcCanvasContent = '';
        let mcIsFirstMessage = true;
        let agentColors = {};
        const colorPalette = ['var(--accent-blue)', 'var(--accent-purple)', 'var(--accent-red)', 'var(--accent-orange)'];
        let colorIndex = 0;
        
        mcSidebar.addEventListener('mouseenter', () => mcSidebar.classList.add('expanded'));
        mcSidebar.addEventListener('mouseleave', () => mcSidebar.classList.remove('expanded'));

        const getAgentColor = (agentName) => {
            if (!agentColors[agentName]) {
                agentColors[agentName] = colorPalette[colorIndex % colorPalette.length];
                colorIndex++;
            }
            return agentColors[agentName];
        };

        const mcAddChatMessage = (text, sender, isThinking = false) => {
            if (mcIsFirstMessage) {
                mcChatWindow.innerHTML = '';
                mcIsFirstMessage = false;
            }
            const messageDiv = document.createElement('div');
            messageDiv.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`;
            
            if(isThinking){
                 messageDiv.innerHTML = `
                    <div class="moving-border max-w-[95%]">
                       <div class="moving-border-content p-2 text-sm">
                            ${escapeHtml(text)}
                       </div>
                    </div>`;
            } else {
                 const bubble = document.createElement('div');
                 bubble.className = `p-2 rounded-lg text-sm ${sender === 'user' ? 'mock-user-bubble' : 'mock-chat-bubble'}`;
                 bubble.innerHTML = escapeHtml(text);
                 messageDiv.appendChild(bubble);
            }
           
            mcChatWindow.appendChild(messageDiv);
            mcChatWindow.scrollTop = mcChatWindow.scrollHeight;
            return messageDiv;
        };
        
        const mcAddLog = (agent, message, color, isThinking = false) => {
            const textClass = isThinking ? 'text-secondary' : '';
            mcTeamLog.innerHTML += `<p><span class="font-bold" style="color:${color};">[${escapeHtml(agent)}]</span> <span class="${textClass}">${escapeHtml(message)}</span></p>`;
            mcTeamLog.scrollTop = mcTeamLog.scrollHeight;
        };
        
        const mcUpdateTask = (taskIndex, newStatus) => {
            const taskEl = mcTaskPlan.querySelector(`[data-task-index="${taskIndex}"]`);
            if (taskEl) {
                const statusIcons = { pending: '📋', working: '⏳', done: '✅' };
                const textEl = taskEl.querySelector('span');
                const textContent = textEl.textContent;
                
                let statusClass = '';
                if(newStatus === 'working') statusClass = 'text-secondary';
                if(newStatus === 'done') statusClass = 'line-through text-gray-500';

                taskEl.innerHTML = `${statusIcons[newStatus]} <span class="${statusClass}">${escapeHtml(textContent)}</span>`;
            }
        };

        const setMcButtonThinkingState = (isThinking) => {
            mcSendBtn.disabled = isThinking;
            if (isThinking) {
                mcSendBtn.innerHTML = chasingBorderSvg;
            } else {
                mcSendBtn.innerHTML = sendIconSvg;
            }
        };
        
        const runSimulation = async (planSteps, userInput) => {
            const stepDelay = 1500;
            const delay = ms => new Promise(res => setTimeout(res, ms));

            mcAddLog('VANA', 'Plan approved. Delegating tasks to specialist agents.', 'var(--accent-blue)');
            const thinkingMessage = mcAddChatMessage('Okay, I have a plan. The team is getting to work now...', 'ai', true);

            for (const [index, step] of planSteps.entries()) {
                await delay(stepDelay / 2);
                mcUpdateTask(index, 'working');
                
                const agentNameMatch = step.match(/^(\w+-Agent):/);
                const agent = agentNameMatch ? agentNameMatch[1] : 'Writer-Agent';
                const agentColor = getAgentColor(agent);

                mcAddLog(agent, `Starting task: "${step}"`, agentColor, true);
                await delay(stepDelay);
                mcUpdateTask(index, 'done');
                mcAddLog(agent, `Completed task: "${step}"`, agentColor);
            }
            
            await delay(500);
            mcAddLog('VANA', 'All tasks complete. Synthesizing final response.', 'var(--accent-blue)');
            
            const finalAnswerPrompt = `A team of AI agents just completed a plan to address the user's request. The original user request was: "${userInput}". The executed plan was: ${JSON.stringify(planSteps)}.
Based on the successful completion of this plan, generate two things in a JSON object:
1) 'chat_response': A direct, friendly, and concise message to the user confirming the task is done.
2) 'canvas_content': A detailed final report in markdown format. This report MUST be well-structured and easy to read. Use markdown headings (e.g., '## Summary', '## Key Findings'), bullet points (using '-' or '*') for lists of information, and bold text for emphasis. Ensure the output is clean and professional.
Respond with ONLY the JSON object, inside a \`\`\`json markdown block.`;
            
            const finalResponseText = await callGemini(finalAnswerPrompt);
            
            if(thinkingMessage) {
                mcChatWindow.removeChild(thinkingMessage);
            }

            const finalResponseJson = tryParseJson(finalResponseText);

            if(finalResponseJson && finalResponseJson.chat_response && finalResponseJson.canvas_content) {
                mcAddChatMessage(finalResponseJson.chat_response, 'ai');
                rawMcCanvasContent = finalResponseJson.canvas_content;
                mcCanvas.innerHTML = `<div class="prose prose-invert max-w-none">${marked.parse(rawMcCanvasContent)}</div>`;
            } else {
                 mcAddChatMessage("The task is complete, but I had trouble formatting the final report. You can see the raw output in the canvas.", 'ai');
                 mcCanvas.innerHTML = `<p class="text-red-400">Error generating final content. Raw output:</p><pre class="text-xs">${escapeHtml(finalResponseText)}</pre>`;
                 rawMcCanvasContent = finalResponseText;
            }
           
            mcAddLog('VANA', 'Final answer provided to user.', 'var(--accent-blue)');
        };

        const mcRenderOnboarding = () => {
             mcChatWindow.innerHTML = '';
             mcIsFirstMessage = true;
             agentColors = {};
             colorIndex = 0;
             mcAddChatMessage("Ask for a high-level goal to see the agents work.", "ai");
             mcTeamLog.innerHTML = `<p class="text-[--text-secondary]">Waiting for task...</p>`;
             mcTaskPlan.innerHTML = `<p class="text-[--text-secondary]">Waiting for task...</p>`;
             mcCanvas.innerHTML = `<p class="text-[--text-secondary]">Canvas content will appear here.</p>`;
             setMcButtonThinkingState(false);
        };

        mcChatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const userInput = mcChatInput.value.trim();
            if (!userInput) return;

            mcAddChatMessage(userInput, 'user');
            mcChatInput.value = '';
            setMcButtonThinkingState(true);

            mcTeamLog.innerHTML = '';
            mcTaskPlan.innerHTML = `<p class="text-[--text-secondary]">Generating plan...</p>`;
            mcCanvas.innerHTML = '';
            rawMcCanvasContent = '';
            agentColors = {}; 
            colorIndex = 0;

            mcAddLog('VANA', `Received request: "${userInput}". Generating initial plan.`, 'var(--accent-blue)');

            const prompt = `You are a project manager AI. A user requested: "${userInput}". Break this into a short plan of 3-5 steps. For each step, prefix it with the name of a specialist agent who would perform it (e.g., "Research-Agent:", "Writer-Agent:", "Code-Agent:"). Return ONLY a JSON string array inside a \`\`\`json markdown block.`;
            const response = await callGemini(prompt);
            const planSteps = tryParseJson(response);

            if (planSteps && Array.isArray(planSteps) && planSteps.length > 0) {
                mcTaskPlan.innerHTML = '';
                planSteps.forEach((step, index) => {
                    const taskDiv = document.createElement('div');
                    taskDiv.dataset.taskIndex = index;
                    taskDiv.innerHTML = `📋 <span>${escapeHtml(step)}</span>`;
                    mcTaskPlan.appendChild(taskDiv);
                });
                await runSimulation(planSteps, userInput);
            } else {
                mcTaskPlan.innerHTML = `<p class="text-red-400">Could not generate a valid plan.</p>`;
                mcTeamLog.innerHTML = `<p><span class="font-bold text-red-400">[VANA]</span> Error in planning phase. The AI returned an invalid format.</p>`;
                 mcCanvas.innerHTML = `<p class="text-red-400">Could not generate a plan. Raw output:</p><pre class="text-xs">${escapeHtml(response)}</pre>`;
            }
            setMcButtonThinkingState(false);
        });
        
        mcCopyBtn.addEventListener('click', () => {
             if (rawMcCanvasContent) {
                copyToClipboard(rawMcCanvasContent, mcCopyBtn);
             }
        });

        mcRenderOnboarding();
    }

    // --- SETTINGS FLYOUT SCRIPT ---
    function initSettingsFlyout() {
        const openBtn = document.getElementById('open-settings-btn');
        const closeBtn = document.getElementById('close-settings-btn');
        const overlay = document.getElementById('settings-flyout-overlay');
        const panel = document.getElementById('settings-flyout-panel');
        if(!openBtn) return;

        const openPanel = () => {
            panel.classList.add('visible');
            overlay.classList.add('visible');
        };
        const closePanel = () => {
            panel.classList.remove('visible');
            overlay.classList.remove('visible');
        };

        openBtn.addEventListener('click', openPanel);
        closeBtn.addEventListener('click', closePanel);
        overlay.addEventListener('click', closePanel);
    }

    // --- INITIALIZE ALL DEMOS ---
    initThreadsDemo();
    initMissionControlDemo();
    initSettingsFlyout();
});
</script>

</body>
</html>
