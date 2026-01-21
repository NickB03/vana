# Integration Guide: Standalone React HTML Generator

This guide shows how to integrate the `generateStandaloneReactHTML` utility into the Vana chat application to enable downloading and sharing React artifacts.

## Quick Start

Add a "Download HTML" button to artifact containers:

```typescript
import { generateStandaloneReactHTML } from '@/utils/generateStandaloneReactHTML';

function ArtifactActions({ artifact }: { artifact: ArtifactData }) {
  const handleDownload = () => {
    const html = generateStandaloneReactHTML({
      title: artifact.title,
      modules: [
        {
          path: '/App.js',
          code: artifact.content,
        },
      ],
    });

    // Download as file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifact.title.replace(/\s+/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <button onClick={handleDownload}>Download HTML</button>;
}
```

## Integration Points

### 1. Artifact Container Actions

Add download button to `ArtifactContainer.tsx`:

```typescript
// src/components/ArtifactContainer.tsx

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateStandaloneReactHTML } from '@/utils/generateStandaloneReactHTML';
import { toast } from 'sonner';

// Add to ArtifactContainer component
const handleDownloadHTML = useCallback(() => {
  if (artifact.type !== 'react') {
    toast.error('Only React artifacts can be downloaded as HTML');
    return;
  }

  try {
    const html = generateStandaloneReactHTML({
      title: artifact.title,
      modules: [
        {
          path: '/App.js',
          code: artifact.content,
        },
      ],
    });

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifact.title.replace(/\s+/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('HTML file downloaded successfully');
  } catch (error) {
    console.error('Failed to generate HTML:', error);
    toast.error('Failed to generate HTML file');
  }
}, [artifact]);

// Add button to toolbar
<Button
  onClick={handleDownloadHTML}
  variant="ghost"
  size="sm"
  title="Download as HTML"
>
  <Download className="h-4 w-4" />
</Button>
```

### 2. Pop-out Window

Create a pop-out window feature in `ArtifactRenderer.tsx`:

```typescript
// src/components/ArtifactRenderer.tsx

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateStandaloneReactHTML } from '@/utils/generateStandaloneReactHTML';

const handlePopout = useCallback(() => {
  try {
    const html = generateStandaloneReactHTML({
      title: artifact.title,
      modules: [
        {
          path: '/App.js',
          code: artifact.content,
        },
      ],
    });

    const newWindow = window.open('', '_blank', 'width=800,height=600');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
      toast.success('Artifact opened in new window');
    } else {
      toast.error('Failed to open new window. Check popup settings.');
    }
  } catch (error) {
    console.error('Failed to open pop-out:', error);
    toast.error('Failed to open artifact in new window');
  }
}, [artifact]);

// Add button
<Button
  onClick={handlePopout}
  variant="ghost"
  size="sm"
  title="Open in new window"
>
  <ExternalLink className="h-4 w-4" />
</Button>
```

### 3. Share Link

Generate shareable HTML with a share dialog:

```typescript
// src/components/ShareArtifactDialog.tsx

import { useState } from 'react';
import { Share2, Copy, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { generateStandaloneReactHTML } from '@/utils/generateStandaloneReactHTML';
import { toast } from 'sonner';

interface ShareArtifactDialogProps {
  artifact: ArtifactData;
}

export function ShareArtifactDialog({ artifact }: ShareArtifactDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCopyHTML = () => {
    const html = generateStandaloneReactHTML({
      title: artifact.title,
      modules: [
        {
          path: '/App.js',
          code: artifact.content,
        },
      ],
    });

    navigator.clipboard.writeText(html);
    toast.success('HTML copied to clipboard');
  };

  const handleDownload = () => {
    const html = generateStandaloneReactHTML({
      title: artifact.title,
      modules: [
        {
          path: '/App.js',
          code: artifact.content,
        },
      ],
    });

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifact.title.replace(/\s+/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('HTML file downloaded');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Artifact</DialogTitle>
          <DialogDescription>
            Download or copy the standalone HTML for this artifact
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button onClick={handleDownload} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Download HTML File
          </Button>
          <Button onClick={handleCopyHTML} variant="outline" className="w-full">
            <Copy className="h-4 w-4 mr-2" />
            Copy HTML to Clipboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Bulk Export

Export multiple artifacts at once:

```typescript
// src/hooks/useArtifactExport.ts

import { useCallback } from 'react';
import JSZip from 'jszip';
import { generateStandaloneReactHTML } from '@/utils/generateStandaloneReactHTML';
import { toast } from 'sonner';

export function useArtifactExport() {
  const exportArtifacts = useCallback(async (artifacts: ArtifactData[]) => {
    try {
      const zip = new JSZip();

      for (const artifact of artifacts) {
        if (artifact.type !== 'react') continue;

        const html = generateStandaloneReactHTML({
          title: artifact.title,
          modules: [
            {
              path: '/App.js',
              code: artifact.content,
            },
          ],
        });

        const filename = `${artifact.title.replace(/\s+/g, '_')}.html`;
        zip.file(filename, html);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'artifacts.zip';
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${artifacts.length} artifacts`);
    } catch (error) {
      console.error('Failed to export artifacts:', error);
      toast.error('Failed to export artifacts');
    }
  }, []);

  return { exportArtifacts };
}
```

### 5. Custom Options UI

Allow users to customize export options:

```typescript
// src/components/ExportOptionsDialog.tsx

import { useState } from 'react';
import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { generateStandaloneReactHTML } from '@/utils/generateStandaloneReactHTML';

interface ExportOptionsDialogProps {
  artifact: ArtifactData;
}

export function ExportOptionsDialog({ artifact }: ExportOptionsDialogProps) {
  const [includeTailwind, setIncludeTailwind] = useState(true);
  const [includeTheme, setIncludeTheme] = useState(true);

  const handleExport = () => {
    const html = generateStandaloneReactHTML({
      title: artifact.title,
      modules: [
        {
          path: '/App.js',
          code: artifact.content,
        },
      ],
      includeTailwind,
      includeTheme,
    });

    // Download logic...
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Options</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="tailwind">Include Tailwind CSS</Label>
            <Switch
              id="tailwind"
              checked={includeTailwind}
              onCheckedChange={setIncludeTailwind}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="theme">Include Theme Variables</Label>
            <Switch
              id="theme"
              checked={includeTheme}
              onCheckedChange={setIncludeTheme}
            />
          </div>
          <Button onClick={handleExport} className="w-full">
            Export HTML
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Advanced Integration

### With Sandpack Transpilation

Use Sandpack's transpiled code for more complex artifacts:

```typescript
import { useSandpack } from '@codesandbox/sandpack-react';
import { generateStandaloneReactHTML } from '@/utils/generateStandaloneReactHTML';

function SandpackExport() {
  const { sandpack } = useSandpack();

  const exportTranspiled = async () => {
    // Get all files from Sandpack
    const files = sandpack.files;
    const modules = Object.entries(files).map(([path, file]) => ({
      path,
      code: file.code,
    }));

    const html = generateStandaloneReactHTML({
      title: 'Exported Component',
      modules,
    });

    // Download...
  };

  return <button onClick={exportTranspiled}>Export</button>;
}
```

### Server-Side Export

Create an API endpoint for server-side HTML generation:

```typescript
// supabase/functions/export-artifact/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { generateStandaloneReactHTML } from './generateStandaloneReactHTML.ts';

serve(async (req) => {
  const { title, code } = await req.json();

  const html = generateStandaloneReactHTML({
    title,
    modules: [
      {
        path: '/App.js',
        code,
      },
    ],
  });

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="${title}.html"`,
    },
  });
});
```

### Email Sharing

Generate HTML for email attachments:

```typescript
async function emailArtifact(artifact: ArtifactData, recipient: string) {
  const html = generateStandaloneReactHTML({
    title: artifact.title,
    modules: [
      {
        path: '/App.js',
        code: artifact.content,
      },
    ],
  });

  // Convert to base64 for email attachment
  const base64 = btoa(html);

  // Send email with attachment via API
  await fetch('/api/send-email', {
    method: 'POST',
    body: JSON.stringify({
      to: recipient,
      subject: `Artifact: ${artifact.title}`,
      attachments: [
        {
          filename: `${artifact.title}.html`,
          content: base64,
          encoding: 'base64',
        },
      ],
    }),
  });
}
```

## Best Practices

### 1. Error Handling

Always wrap HTML generation in try-catch:

```typescript
try {
  const html = generateStandaloneReactHTML({ ... });
  // Use html
} catch (error) {
  console.error('Failed to generate HTML:', error);
  toast.error('Failed to generate standalone HTML');
}
```

### 2. User Feedback

Provide clear feedback during export:

```typescript
const handleExport = async () => {
  const loadingToast = toast.loading('Generating HTML...');

  try {
    const html = generateStandaloneReactHTML({ ... });
    // Download logic
    toast.success('HTML downloaded successfully', { id: loadingToast });
  } catch (error) {
    toast.error('Export failed', { id: loadingToast });
  }
};
```

### 3. File Naming

Sanitize filenames for safe downloads:

```typescript
function sanitizeFilename(title: string): string {
  return title
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50);
}

const filename = `${sanitizeFilename(artifact.title)}.html`;
```

### 4. Memory Management

Clean up object URLs after downloads:

```typescript
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = filename;
link.click();

// Clean up
setTimeout(() => URL.revokeObjectURL(url), 100);
```

### 5. Type Safety

Use TypeScript types for better type safety:

```typescript
import type { GenerateStandaloneReactHTMLOptions } from '@/utils/generateStandaloneReactHTML';

const options: GenerateStandaloneReactHTMLOptions = {
  title: artifact.title,
  modules: [
    {
      path: '/App.js',
      code: artifact.content,
    },
  ],
  includeTailwind: true,
  includeTheme: true,
};

const html = generateStandaloneReactHTML(options);
```

## Testing Integration

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useArtifactExport } from './useArtifactExport';

describe('useArtifactExport', () => {
  it('should export artifact as HTML', async () => {
    const { result } = renderHook(() => useArtifactExport());

    const artifact = {
      id: '1',
      type: 'react',
      title: 'Test Component',
      content: 'export default function App() { return <div>Test</div>; }',
    };

    await result.current.exportArtifacts([artifact]);

    // Assert download was triggered
    // ...
  });
});
```

### E2E Tests

```typescript
// tests/e2e/artifact-export.spec.ts

import { test, expect } from '@playwright/test';

test('should download artifact as HTML', async ({ page }) => {
  await page.goto('/chat/123');

  // Wait for artifact to load
  await page.waitForSelector('[data-testid="artifact-container"]');

  // Click download button
  const downloadPromise = page.waitForEvent('download');
  await page.click('[data-testid="download-html-button"]');
  const download = await downloadPromise;

  // Verify filename
  expect(download.suggestedFilename()).toMatch(/\.html$/);

  // Verify content
  const path = await download.path();
  const content = await fs.readFile(path, 'utf-8');
  expect(content).toContain('<!DOCTYPE html>');
  expect(content).toContain('React');
});
```

## Performance Considerations

### 1. Lazy Loading

Only load the utility when needed:

```typescript
const handleExport = async () => {
  const { generateStandaloneReactHTML } = await import(
    '@/utils/generateStandaloneReactHTML'
  );

  const html = generateStandaloneReactHTML({ ... });
};
```

### 2. Debouncing

Debounce export actions to prevent rapid clicks:

```typescript
import { useDebouncedCallback } from 'use-debounce';

const handleExport = useDebouncedCallback(() => {
  const html = generateStandaloneReactHTML({ ... });
  // Download logic
}, 500);
```

### 3. Worker Threads

For large artifacts, consider using web workers:

```typescript
// export.worker.ts
self.onmessage = async (e) => {
  const { generateStandaloneReactHTML } = await import(
    './generateStandaloneReactHTML'
  );

  const html = generateStandaloneReactHTML(e.data);
  self.postMessage(html);
};

// Usage
const worker = new Worker(new URL('./export.worker.ts', import.meta.url));
worker.postMessage({ title, modules });
worker.onmessage = (e) => {
  const html = e.data;
  // Download logic
};
```

## Troubleshooting

### Download not working

Check browser popup settings:

```typescript
if (!window.open()) {
  toast.error('Please allow popups to download artifacts');
}
```

### Large files

Compress HTML for large artifacts:

```typescript
import pako from 'pako';

const compressed = pako.gzip(html);
const blob = new Blob([compressed], { type: 'application/gzip' });
```

### Cross-origin issues

Ensure proper CORS headers when serving HTML:

```typescript
headers: {
  'Content-Type': 'text/html',
  'Access-Control-Allow-Origin': '*',
}
```

## Next Steps

1. Add download button to artifact toolbar
2. Implement share dialog with options
3. Add bulk export feature
4. Create export analytics tracking
5. Add export history/cache

For complete examples, see:
- `src/utils/__tests__/generateStandaloneReactHTML.example.ts`
- `docs/STANDALONE_REACT_HTML.md`
