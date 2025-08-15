'use client';

import React, { useState } from 'react';
import { CanvasSystem } from './canvas-system';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CanvasMode } from '@/types/canvas';

const demoContent = {
  markdown: `# Canvas System Demo

Welcome to the **Canvas System** with 4 progressive modes!

## Features

- **Markdown Mode**: Rich text editing with live preview
- **Code Mode**: Syntax highlighting with Monaco Editor
- **Web Mode**: HTML/CSS with live preview
- **Sandbox Mode**: JavaScript execution environment

## Getting Started

1. Switch between modes using the tabs
2. Upload files with automatic mode detection
3. Export your content in various formats
4. Use fullscreen mode for focused work

\`\`\`javascript
console.log("Hello from Canvas!");
\`\`\`

*Happy coding!*`,

  code: `// Canvas System Demo - TypeScript Example
interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

class UserManager {
  private users: Map<string, User> = new Map();

  addUser(user: User): void {
    this.users.set(user.id, user);
    console.log(\`Added user: \${user.name}\`);
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getActiveUsers(): User[] {
    return Array.from(this.users.values())
      .filter(user => user.isActive);
  }

  updateUser(id: string, updates: Partial<User>): boolean {
    const user = this.users.get(id);
    if (!user) return false;
    
    this.users.set(id, { ...user, ...updates });
    return true;
  }
}

// Usage example
const userManager = new UserManager();
userManager.addUser({
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  isActive: true
});

console.log('Active users:', userManager.getActiveUsers());`,

  web: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Canvas Web Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 40px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            transition: transform 0.3s ease;
        }
        
        .feature:hover {
            transform: translateY(-5px);
        }
        
        .feature h3 {
            margin: 0 0 10px 0;
            color: #ffd700;
        }
        
        .cta {
            text-align: center;
            margin-top: 40px;
        }
        
        .btn {
            display: inline-block;
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 25px;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .btn:hover {
            transform: scale(1.05);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Canvas System</h1>
        <p>A powerful, progressive canvas system with 4 distinct modes for different content types.</p>
        
        <div class="features">
            <div class="feature">
                <h3>📝 Markdown</h3>
                <p>Rich text editing with live preview support</p>
            </div>
            <div class="feature">
                <h3>💻 Code</h3>
                <p>Monaco editor with syntax highlighting</p>
            </div>
            <div class="feature">
                <h3>🌐 Web</h3>
                <p>HTML/CSS with live preview</p>
            </div>
            <div class="feature">
                <h3>⚡ Sandbox</h3>
                <p>JavaScript execution environment</p>
            </div>
        </div>
        
        <div class="cta">
            <a href="#" class="btn" onclick="alert('Canvas system is ready!')">Get Started</a>
        </div>
    </div>
</body>
</html>`,

  sandbox: `// Canvas Sandbox Demo - Interactive JavaScript
console.log('🚀 Welcome to Canvas Sandbox!');

// Demo 1: Basic functionality
const greeting = (name) => {
  return \`Hello, \${name}! Welcome to the Canvas system.\`;
};

console.log(greeting('Developer'));

// Demo 2: Data manipulation
const users = [
  { id: 1, name: 'Alice', role: 'developer' },
  { id: 2, name: 'Bob', role: 'designer' },
  { id: 3, name: 'Charlie', role: 'manager' }
];

const developers = users.filter(user => user.role === 'developer');
console.log('Developers:', developers);

// Demo 3: Async operations simulation
const fetchData = async () => {
  console.log('Fetching data...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { status: 'success', data: 'Canvas is working!' };
};

fetchData().then(result => {
  console.log('Result:', result);
});

// Demo 4: DOM manipulation (if available)
if (typeof document !== 'undefined') {
  console.log('DOM is available');
} else {
  console.log('Running in sandbox mode');
}

// Demo 5: Error handling
try {
  const result = Math.random() > 0.5 ? 'success' : null;
  if (!result) throw new Error('Random error for demo');
  console.log('Success:', result);
} catch (error) {
  console.error('Caught error:', error.message);
}

console.log('✅ Sandbox demo complete!');`
};

export function CanvasDemo() {
  const [selectedDemo, setSelectedDemo] = useState<CanvasMode>('markdown');
  const [content, setContent] = useState(demoContent.markdown);

  const handleDemoChange = (demo: CanvasMode) => {
    setSelectedDemo(demo);
    setContent(demoContent[demo]);
  };

  const demos = [
    { id: 'markdown', label: 'Markdown Demo', description: 'Rich text with formatting' },
    { id: 'code', label: 'Code Demo', description: 'TypeScript with syntax highlighting' },
    { id: 'web', label: 'Web Demo', description: 'HTML/CSS with live preview' },
    { id: 'sandbox', label: 'Sandbox Demo', description: 'JavaScript execution' }
  ] as const;

  return (
    <div className="h-screen flex flex-col bg-background">
      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Canvas System Demo</span>
            <Badge variant="secondary">4 Modes Available</Badge>
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            {demos.map((demo) => (
              <Button
                key={demo.id}
                variant={selectedDemo === demo.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleDemoChange(demo.id as CanvasMode)}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <span className="font-medium">{demo.label}</span>
                <span className="text-xs opacity-70">{demo.description}</span>
              </Button>
            ))}
          </div>
        </CardHeader>
      </Card>

      <div className="flex-1">
        <CanvasSystem
          key={selectedDemo} // Force re-render on mode change
          initialMode={selectedDemo}
          initialContent={content}
          onContentChange={setContent}
          onModeChange={(mode) => {
            setSelectedDemo(mode);
          }}
        />
      </div>
    </div>
  );
}