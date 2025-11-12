import { parseArtifacts } from './artifactParser';

describe('artifactParser', () => {
  describe('stripMarkdownFences', () => {
    it('should strip markdown fences from React artifact', () => {
      const content = `<artifact type="application/vnd.ant.react" title="Test Component">
\`\`\`jsx
import * as Select from '@radix-ui/react-select';

export default function TestComponent() {
  const { useState } = React;
  return <div>Hello World</div>;
}
\`\`\`
</artifact>`;

      const { artifacts } = parseArtifacts(content);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].content).not.toContain('```jsx');
      expect(artifacts[0].content).not.toContain('```');
      expect(artifacts[0].content).toContain('import * as Select');
      expect(artifacts[0].content).toContain('export default function TestComponent');
    });

    it('should strip markdown fences from HTML artifact', () => {
      const content = `<artifact type="text/html" title="Test HTML">
\`\`\`html
<!DOCTYPE html>
<html>
<body>Test</body>
</html>
\`\`\`
</artifact>`;

      const { artifacts } = parseArtifacts(content);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].content).not.toContain('```html');
      expect(artifacts[0].content).not.toContain('```');
      expect(artifacts[0].content).toContain('<!DOCTYPE html>');
    });

    it('should handle artifacts without markdown fences', () => {
      const content = `<artifact type="application/vnd.ant.react" title="Clean Component">
export default function CleanComponent() {
  return <div>No fences</div>;
}
</artifact>`;

      const { artifacts } = parseArtifacts(content);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].content).toContain('export default function CleanComponent');
      expect(artifacts[0].content).not.toContain('```');
    });

    it('should strip multiple fence types', () => {
      const content = `<artifact type="application/vnd.ant.code" title="TypeScript Code">
\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
</artifact>`;

      const { artifacts } = parseArtifacts(content);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].content).not.toContain('```typescript');
      expect(artifacts[0].content).not.toContain('```');
      expect(artifacts[0].content).toContain('function greet');
    });

    it('should handle real-world Tic-Tac-Toe example', () => {
      const content = `<artifact type="application/vnd.ant.react" title="Unbeatable Tic-Tac-Toe with AI">
\`\`\`jsx
import * as Select from '@radix-ui/react-select';
import * as Tooltip from '@radix-ui/react-tooltip';

export default function TicTacToeAI() {
  const { useState, useEffect, useCallback, useMemo } = React;
  const { motion, AnimatePresence } = FramerMotion;
  const { User, Bot, Award, ChevronsUpDown, Check } = LucideReact;

  const [board, setBoard] = useState(Array(9).fill(null));

  return (
    <div className="min-h-screen bg-slate-900">
      <h1>Tic-Tac-Toe AI</h1>
    </div>
  );
}
\`\`\`
</artifact>`;

      const { artifacts } = parseArtifacts(content);

      expect(artifacts).toHaveLength(1);
      expect(artifacts[0].type).toBe('react');
      expect(artifacts[0].content).not.toContain('```jsx');
      expect(artifacts[0].content).not.toContain('```');
      expect(artifacts[0].content).toContain('import * as Select');
      expect(artifacts[0].content).toContain('export default function TicTacToeAI');
      expect(artifacts[0].content).toContain('const { useState, useEffect');
    });
  });
});
