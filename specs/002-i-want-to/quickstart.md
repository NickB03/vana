# Quickstart Guide: Frontend Development Continuation

**Date**: 2025-09-09  
**Prerequisites**: research.md, data-model.md, API contracts complete  
**Estimated Time**: 30 minutes setup + development phases

This quickstart guide provides a step-by-step path to rebuild the frontend following proper standards while preserving the current sidebar layout and implementing modern minimal design.

## 🚀 Phase 0: Environment Setup (10 minutes)

### Step 1: Backup Current Implementation
```bash
# Create backup of current sidebar (user specifically requested preservation)
cd /Users/nick/Development/vana/frontend
mkdir -p ../backups/sidebar-backup-$(date +%Y%m%d)
cp -r components/vana-sidebar.tsx ../backups/sidebar-backup-$(date +%Y%m%d)/
cp -r components/ui/sidebar.tsx ../backups/sidebar-backup-$(date +%Y%m%d)/

# Verify backup
ls -la ../backups/sidebar-backup-*/
```

### Step 2: Verify Current Setup
```bash
# Confirm we're in the frontend directory
pwd  # Should show: /Users/nick/Development/vana/frontend

# Check Next.js version and dependencies
cat package.json | grep -E "(next|react|typescript)"

# Verify shadcn/ui configuration
cat components.json

# Check current component installations
ls components/ui/ | wc -l  # Should show ~10 components installed
```

### Step 3: Install Missing shadcn/ui Components
```bash
# Install the 9 missing components identified in our analysis
npx shadcn@latest add textarea skeleton badge separator tooltip dropdown-menu input select tabs sheet progress accordion alert label

# Verify all 19 components are now installed
ls components/ui/ | wc -l  # Should show 19 components

# List installed components for confirmation
ls components/ui/
```

## 🏗️ Phase 1: Component Approval Workflow Setup (10 minutes)

### Step 1: Initialize Playwright Component Testing
```bash
# Install Playwright for component testing (if not already installed)
npm install --save-dev @playwright/test @axe-core/playwright

# Create component test directory structure
mkdir -p tests/component
mkdir -p tests/integration  
mkdir -p tests/e2e

# Copy existing Playwright config or create new one
cp ../app/playwright.config.js . 2>/dev/null || cat > playwright.config.js << 'EOF'
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
EOF
```

### Step 2: Create Component Validation Template
```bash
cat > tests/component/component-template.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

// Template for component approval workflow tests
test.describe('Component Approval Workflow Template', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/component-test');
    await injectAxe(page);
  });

  test('visual regression check', async ({ page }) => {
    await expect(page).toHaveScreenshot('component-baseline.png');
  });

  test('accessibility compliance', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('keyboard navigation', async ({ page }) => {
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('responsive behavior', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await expect(page.locator('[data-testid="component"]')).toBeVisible();
    
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await expect(page.locator('[data-testid="component"]')).toBeVisible();
  });
});
EOF
```

## 🎨 Phase 2: Modern Minimal Theme Implementation (15 minutes)

### Step 1: Update Tailwind Configuration
```bash
# Update tailwind.config.js with modern minimal theme
cat > tailwind.config.js << 'EOF'
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.4s ease-out",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: 'hsl(var(--primary))',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config

export default config
EOF
```

### Step 2: Create Modern Minimal CSS Variables
```bash
# Update app/globals.css with modern minimal theme
cat > app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    --card: 0 0% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;
    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;
    --ring: 0 0% 83.1%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
}

/* Modern Minimal Theme Enhancements */
@layer components {
  .gradient-accent {
    @apply bg-gradient-to-r from-primary/10 to-accent/10 hover:from-primary/20 hover:to-accent/20 transition-all duration-300;
  }
  
  .text-oversized {
    @apply text-4xl md:text-5xl font-bold tracking-tight;
  }
  
  .chat-message-enter {
    @apply animate-slide-in;
  }
  
  .focus-ring {
    @apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
  }
  
  .minimal-border {
    @apply border border-border/50 hover:border-border transition-colors;
  }
}

/* Typography Scale (Modern Minimal) */
.text-micro { font-size: 0.75rem; line-height: 1rem; }
.text-small { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-large { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
.text-5xl { font-size: 3rem; line-height: 1; }

/* Spacing System (8px grid) */
.space-grid-1 { @apply space-y-2; } /* 8px */
.space-grid-2 { @apply space-y-4; } /* 16px */
.space-grid-3 { @apply space-y-6; } /* 24px */
.space-grid-4 { @apply space-y-8; } /* 32px */
.space-grid-5 { @apply space-y-10; } /* 40px */
EOF
```

## 🔄 Phase 3: SSE Integration Setup (20 minutes)

### Step 1: Create SSE Client Library
```bash
mkdir -p lib/sse
cat > lib/sse/client.ts << 'EOF'
export interface SSEClientOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  headers?: Record<string, string>;
}

export interface SSEEvent {
  type: string;
  data: any;
  id?: string;
  retry?: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectInterval: number;
  private readonly url: string;
  private readonly headers: Record<string, string>;
  private listeners: Map<string, Set<(event: SSEEvent) => void>> = new Map();

  constructor(options: SSEClientOptions) {
    this.url = options.url;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.reconnectInterval = options.reconnectInterval ?? 1000;
    this.headers = options.headers ?? {};
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.eventSource = new EventSource(this.url);
        
        this.eventSource.onopen = () => {
          this.reconnectAttempts = 0;
          this.emit('connection_established', {
            timestamp: new Date().toISOString(),
            status: 'connected'
          });
          resolve();
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.eventSource.onerror = (error) => {
          this.handleError(error);
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      const sseEvent: SSEEvent = {
        type: event.type || 'message',
        data,
        id: event.lastEventId,
      };
      this.emit(sseEvent.type, sseEvent.data);
    } catch (error) {
      console.error('Failed to parse SSE message:', error);
    }
  }

  private handleError(error: Event) {
    console.error('SSE connection error:', error);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(
        this.reconnectInterval * Math.pow(2, this.reconnectAttempts),
        30000
      );
      
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect().catch(() => {
          // Reconnection failed, will retry if attempts remain
        });
      }, delay);
    } else {
      this.emit('connection_failed', {
        message: 'Maximum reconnection attempts reached',
        attempts: this.reconnectAttempts
      });
    }
  }

  on(eventType: string, listener: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  off(eventType: string, listener: (data: any) => void) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  private emit(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.listeners.clear();
  }

  get readyState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}
EOF
```

### Step 2: Create React SSE Hook
```bash
mkdir -p hooks
cat > hooks/use-sse.ts << 'EOF'
import { useEffect, useRef, useState } from 'react';
import { SSEClient, SSEClientOptions } from '@/lib/sse/client';

export interface UseSSEOptions extends SSEClientOptions {
  enabled?: boolean;
}

export function useSSE(options: UseSSEOptions) {
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');
  const [lastEvent, setLastEvent] = useState<any>(null);
  const clientRef = useRef<SSEClient | null>(null);

  useEffect(() => {
    if (!options.enabled) {
      return;
    }

    const client = new SSEClient(options);
    clientRef.current = client;
    
    // Connection state handlers
    client.on('connection_established', () => {
      setConnectionState('connected');
    });
    
    client.on('connection_failed', () => {
      setConnectionState('failed');
    });

    // Research event handlers
    client.on('query_received', (data) => setLastEvent({ type: 'query_received', data }));
    client.on('processing_started', (data) => setLastEvent({ type: 'processing_started', data }));
    client.on('agent_started', (data) => setLastEvent({ type: 'agent_started', data }));
    client.on('agent_progress', (data) => setLastEvent({ type: 'agent_progress', data }));
    client.on('agent_completed', (data) => setLastEvent({ type: 'agent_completed', data }));
    client.on('partial_result', (data) => setLastEvent({ type: 'partial_result', data }));
    client.on('quality_check', (data) => setLastEvent({ type: 'quality_check', data }));
    client.on('result_generated', (data) => setLastEvent({ type: 'result_generated', data }));
    client.on('processing_complete', (data) => setLastEvent({ type: 'processing_complete', data }));
    client.on('error_occurred', (data) => setLastEvent({ type: 'error_occurred', data }));

    setConnectionState('connecting');
    client.connect().catch(() => {
      setConnectionState('failed');
    });

    return () => {
      client.disconnect();
      clientRef.current = null;
      setConnectionState('disconnected');
    };
  }, [options.enabled, options.url]);

  const subscribe = (eventType: string, handler: (data: any) => void) => {
    clientRef.current?.on(eventType, handler);
    
    return () => {
      clientRef.current?.off(eventType, handler);
    };
  };

  return {
    connectionState,
    lastEvent,
    subscribe,
    client: clientRef.current,
  };
}
EOF
```

## 🧪 Phase 4: Integration Test Creation (15 minutes)

### Step 1: Create Backend Integration Test
```bash
cat > tests/integration/api-integration.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('Backend API Integration', () => {
  const API_BASE = 'http://localhost:8000';

  test('health check endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.timestamp).toBeDefined();
  });

  test('SSE endpoint authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/run_sse`, {
      data: {
        query: "Test research query",
        sessionId: "test-session-id",
        type: "research",
        priority: "medium"
      },
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    // Should require authentication or return proper error
    expect([200, 401, 403]).toContain(response.status());
  });

  test('session management endpoints', async ({ request }) => {
    const response = await request.get(`${API_BASE}/api/apps/test/users/test/sessions`);
    
    // Should require authentication or return proper error structure
    expect([200, 401, 404]).toContain(response.status());
  });
});
EOF
```

### Step 2: Create SSE Integration Test
```bash
cat > tests/integration/sse-integration.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test.describe('SSE Integration', () => {
  test('SSE connection and event handling', async ({ page }) => {
    // Navigate to a page that establishes SSE connection
    await page.goto('/chat');

    // Mock SSE events for testing
    await page.route('**/api/run_sse', (route) => {
      const events = [
        'event: query_received\ndata: {"queryId": "test-123", "timestamp": "2025-09-09T10:00:00Z"}\n\n',
        'event: processing_started\ndata: {"queryId": "test-123", "totalAgents": 8}\n\n',
        'event: processing_complete\ndata: {"queryId": "test-123", "resultId": "result-456"}\n\n'
      ];
      
      route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: events.join('')
      });
    });

    // Test that SSE events are properly handled
    const submitButton = page.locator('[data-testid="submit-query"]');
    const queryInput = page.locator('[data-testid="query-input"]');
    
    await queryInput.fill('Test research query');
    await submitButton.click();

    // Verify that SSE events trigger UI updates
    await expect(page.locator('[data-testid="processing-status"]')).toContainText('processing');
    await expect(page.locator('[data-testid="completion-status"]')).toContainText('complete');
  });

  test('SSE reconnection handling', async ({ page }) => {
    let connectionCount = 0;
    
    await page.route('**/api/run_sse', (route) => {
      connectionCount++;
      
      if (connectionCount === 1) {
        // Simulate connection failure
        route.abort('failed');
      } else {
        // Successful reconnection
        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: 'event: connection_established\ndata: {"status": "reconnected"}\n\n'
        });
      }
    });

    await page.goto('/chat');
    
    // Wait for reconnection attempt
    await page.waitForTimeout(2000);
    
    expect(connectionCount).toBeGreaterThan(1);
  });
});
EOF
```

## ✅ Phase 5: Validation and Testing (10 minutes)

### Step 1: Run Component Installation Validation
```bash
# Verify all shadcn/ui components are properly installed
echo "=== Component Installation Verification ==="
echo "Expected: 19 components"
echo "Actual: $(ls components/ui/ | wc -l) components"
echo ""

echo "Installed components:"
ls -1 components/ui/

echo ""
echo "=== Required Components Check ==="
required_components=(
  "textarea" "button" "card" "scroll-area" "skeleton" 
  "badge" "separator" "tooltip" "dropdown-menu" "avatar" 
  "sidebar" "input" "select" "tabs" "sheet" 
  "dialog" "progress" "accordion" "alert" "label"
)

missing_components=()
for component in "${required_components[@]}"; do
  if [[ ! -f "components/ui/${component}.tsx" ]]; then
    missing_components+=("$component")
  fi
done

if [[ ${#missing_components[@]} -eq 0 ]]; then
  echo "✅ All 19 required components are installed"
else
  echo "❌ Missing components: ${missing_components[*]}"
fi
```

### Step 2: Run Build Validation
```bash
# Test that the application builds successfully
echo "=== Build Validation ==="
npm run build

if [[ $? -eq 0 ]]; then
  echo "✅ Frontend builds successfully"
else
  echo "❌ Build failed - check errors above"
  exit 1
fi
```

### Step 3: Run Integration Tests
```bash
# Start backend server in background
echo "=== Starting Backend for Integration Tests ==="
cd ../app
python server.py &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Return to frontend and run integration tests
cd ../frontend
echo "=== Running Integration Tests ==="
npx playwright test tests/integration/

# Clean up
kill $BACKEND_PID 2>/dev/null || true

echo "✅ Quickstart validation complete!"
```

## 🎯 Next Steps

After completing this quickstart:

1. **Component Approval Workflow**: Use `/tasks` command to generate detailed implementation tasks
2. **Chat Interface Rebuild**: Implement proper chat components following the approval workflow
3. **Real SSE Integration**: Connect to actual FastAPI backend endpoints
4. **Theme Application**: Apply modern minimal design to all components
5. **Testing**: Run comprehensive Playwright validation suite

## 📋 Success Criteria Checklist

- [ ] All 19 shadcn/ui components installed via CLI
- [ ] Sidebar backup created and preserved
- [ ] Modern minimal theme CSS variables configured
- [ ] Playwright component testing framework setup
- [ ] SSE client library implemented
- [ ] React SSE hook created
- [ ] Backend integration tests passing
- [ ] Frontend builds without errors
- [ ] Component approval workflow operational

## 🚨 Troubleshooting

### Common Issues:
1. **shadcn/ui installation fails**: Verify `components.json` is properly configured
2. **Build errors**: Check TypeScript strict mode compatibility
3. **SSE connection fails**: Verify backend is running on localhost:8000
4. **Playwright tests fail**: Ensure dev server is running on localhost:3000

### Quick Fixes:
```bash
# Reset shadcn/ui configuration
npx shadcn@latest init --force

# Clear Next.js cache
rm -rf .next node_modules/.cache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify backend health
curl http://localhost:8000/health
```

This quickstart provides the foundation for implementing a production-ready frontend that meets all requirements while following the established approval workflow and maintaining code quality standards.