/**
 * Example usage of generateStandaloneReactHTML utility
 *
 * This file demonstrates how to generate standalone HTML documents
 * from React artifacts using transpiled code from Sandpack.
 */

import { generateStandaloneReactHTML } from '../generateStandaloneReactHTML';

// Example 1: Basic React component
export function exampleBasicComponent() {
  const html = generateStandaloneReactHTML({
    title: 'Hello World Component',
    modules: [
      {
        path: '/App.js',
        code: `export default function App() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Hello World!</h1>
      <p className="text-gray-600 mt-2">This is a standalone React component.</p>
    </div>
  );
}`,
      },
    ],
  });

  return html;
}

// Example 2: Component with state and interactivity
export function exampleInteractiveComponent() {
  const html = generateStandaloneReactHTML({
    title: 'Counter App',
    modules: [
      {
        path: '/App.js',
        code: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-4">Counter App</h1>
      <div className="bg-blue-50 p-6 rounded-lg">
        <p className="text-5xl font-bold text-center mb-4">{count}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setCount(count - 1)}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Decrement
          </button>
          <button
            onClick={() => setCount(0)}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Reset
          </button>
          <button
            onClick={() => setCount(count + 1)}
            className="flex-1 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Increment
          </button>
        </div>
      </div>
    </div>
  );
}`,
      },
    ],
  });

  return html;
}

// Example 3: Component with npm dependencies
export function exampleWithDependencies() {
  const html = generateStandaloneReactHTML({
    title: 'Icon Gallery',
    modules: [
      {
        path: '/App.js',
        code: `import { Heart, Star, Zap, Sparkles, Rocket } from 'lucide-react';

export default function App() {
  const icons = [
    { Icon: Heart, name: 'Heart', color: 'text-red-500' },
    { Icon: Star, name: 'Star', color: 'text-yellow-500' },
    { Icon: Zap, name: 'Zap', color: 'text-blue-500' },
    { Icon: Sparkles, name: 'Sparkles', color: 'text-purple-500' },
    { Icon: Rocket, name: 'Rocket', color: 'text-green-500' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Icon Gallery</h1>
      <div className="grid grid-cols-5 gap-6">
        {icons.map(({ Icon, name, color }) => (
          <div key={name} className="flex flex-col items-center gap-2">
            <Icon className={\`w-12 h-12 \${color}\`} />
            <span className="text-sm text-gray-600">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}`,
      },
    ],
    // Dependencies will be auto-extracted, but you can also provide them explicitly
    dependencies: {
      'lucide-react': '^0.344.0',
    },
  });

  return html;
}

// Example 4: Component with effects and lifecycle
export function exampleWithEffects() {
  const html = generateStandaloneReactHTML({
    title: 'Clock Component',
    modules: [
      {
        path: '/App.js',
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-12 rounded-2xl shadow-2xl">
        <h1 className="text-2xl font-light text-center mb-4 text-gray-600">Current Time</h1>
        <div className="text-6xl font-bold text-center font-mono">
          <span className="text-blue-600">{hours}</span>
          <span className="text-gray-400">:</span>
          <span className="text-purple-600">{minutes}</span>
          <span className="text-gray-400">:</span>
          <span className="text-pink-600">{seconds}</span>
        </div>
      </div>
    </div>
  );
}`,
      },
    ],
  });

  return html;
}

// Example 5: Component without Tailwind
export function exampleWithoutTailwind() {
  const html = generateStandaloneReactHTML({
    title: 'Plain React Component',
    modules: [
      {
        path: '/App.js',
        code: `export default function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#333', fontSize: '24px', marginBottom: '10px' }}>
        Plain React Component
      </h1>
      <p style={{ color: '#666', lineHeight: '1.6' }}>
        This component doesn't use Tailwind CSS. All styles are inline.
      </p>
      <button
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '10px',
        }}
        onClick={() => alert('Button clicked!')}
      >
        Click Me
      </button>
    </div>
  );
}`,
      },
    ],
    includeTailwind: false,
  });

  return html;
}

// Example 6: Component without theme CSS
export function exampleWithoutTheme() {
  const html = generateStandaloneReactHTML({
    title: 'Component Without Theme',
    modules: [
      {
        path: '/App.js',
        code: `export default function App() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">No Theme Variables</h1>
      <p className="mt-2">This component doesn't use shadcn/ui theme variables.</p>
    </div>
  );
}`,
      },
    ],
    includeTheme: false,
  });

  return html;
}

// Example 7: Complex component with multiple hooks
export function exampleComplexComponent() {
  const html = generateStandaloneReactHTML({
    title: 'Todo List',
    modules: [
      {
        path: '/App.js',
        code: `import { useState, useCallback } from 'react';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = useCallback(() => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, done: false }]);
      setInput('');
    }
  }, [input, todos]);

  const toggleTodo = useCallback((id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, done: !todo.done } : todo
    ));
  }, [todos]);

  const deleteTodo = useCallback((id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  }, [todos]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Todo List</h1>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="Add a new todo..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addTodo}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {todos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No todos yet. Add one above!</p>
          ) : (
            todos.map(todo => (
              <div
                key={todo.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={todo.done}
                  onChange={() => toggleTodo(todo.id)}
                  className="w-5 h-5"
                />
                <span
                  className={\`flex-1 \${todo.done ? 'line-through text-gray-400' : 'text-gray-800'}\`}
                >
                  {todo.text}
                </span>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="px-3 py-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            {todos.filter(t => !t.done).length} of {todos.length} tasks remaining
          </p>
        </div>
      </div>
    </div>
  );
}`,
      },
    ],
  });

  return html;
}

// Usage in real application:
// 1. Get transpiled code from Sandpack
// 2. Pass it to generateStandaloneReactHTML
// 3. Save or serve the generated HTML

// Example: How to use with Sandpack bundler output
export function exampleWithSandpackTranspilation() {
  // In a real application, you would get transpiled code from Sandpack:
  // const sandpackClient = sandpackInstanceRef.current?.bundler?.client;
  // const transpiledModules = await sandpackClient?.getTranspiledModules();

  // For this example, we'll simulate transpiled code
  const transpiledModules = [
    {
      path: '/App.js',
      code: `// This would be transpiled code from Sandpack
import React from 'react';

export default function App() {
  return React.createElement('div', { className: 'p-4' },
    React.createElement('h1', null, 'Transpiled Component')
  );
}`,
    },
  ];

  const html = generateStandaloneReactHTML({
    title: 'Sandpack Artifact',
    modules: transpiledModules,
  });

  return html;
}

// Example: Saving generated HTML to file (browser)
export function saveHTMLToFile(filename: string) {
  const html = exampleInteractiveComponent();

  // Create blob and download link
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// Example: Opening generated HTML in new window
export function openHTMLInNewWindow() {
  const html = exampleInteractiveComponent();

  const newWindow = window.open('', '_blank');
  if (newWindow) {
    newWindow.document.write(html);
    newWindow.document.close();
  }
}
