/**
 * Sample Artifact Fixtures for Testing
 *
 * These artifacts are extracted from SandpackTest.tsx and represent
 * the full range of artifact complexity levels:
 * - Basic: Simple React hooks (Counter, Todo, Icons)
 * - Medium: External npm packages (Dashboard with Recharts, Animated Card with Framer Motion)
 * - Advanced: Complex state logic (Memory Game)
 */

export interface SampleArtifact {
  id: string;
  name: string;
  complexity: 'basic' | 'medium' | 'advanced';
  description: string;
  code: string;
}

export const SAMPLE_ARTIFACTS: SampleArtifact[] = [
  {
    id: 'counter',
    name: 'Simple Counter',
    complexity: 'basic',
    description: 'Basic useState counter - the simplest React test',
    code: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Counter</h1>
        <p className="text-6xl font-bold text-blue-600 mb-6">{count}</p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setCount(c => c - 1)}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            -1
          </button>
          <button
            onClick={() => setCount(c => c + 1)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            +1
          </button>
        </div>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'todo',
    name: 'Todo List',
    complexity: 'basic',
    description: 'Basic todo app with add/remove - tests state arrays',
    code: `import { useState } from 'react';

export default function App() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input, done: false }]);
      setInput('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTodo = (id) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Todo List</h1>
        <div className="flex gap-2 mb-4">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && addTodo()}
            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Add a todo..."
          />
          <button
            onClick={addTodo}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {todos.map(todo => (
            <li key={todo.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggleTodo(todo.id)}
                className="w-5 h-5"
              />
              <span className={\`flex-1 \${todo.done ? 'line-through text-gray-400' : ''}\`}>
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-red-500 hover:text-red-700"
              >
                x
              </button>
            </li>
          ))}
        </ul>
        {todos.length === 0 && (
          <p className="text-gray-400 text-center py-4">No todos yet!</p>
        )}
      </div>
    </div>
  );
}`,
  },
  {
    id: 'dashboard',
    name: 'Analytics Dashboard',
    complexity: 'medium',
    description: 'Dashboard with Recharts - tests npm package imports',
    code: `import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const data = [
  { name: 'Jan', revenue: 4000, users: 2400 },
  { name: 'Feb', revenue: 3000, users: 1398 },
  { name: 'Mar', revenue: 2000, users: 9800 },
  { name: 'Apr', revenue: 2780, users: 3908 },
  { name: 'May', revenue: 1890, users: 4800 },
  { name: 'Jun', revenue: 2390, users: 3800 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('revenue');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: '$16,060', change: '+12%' },
          { label: 'Active Users', value: '26,104', change: '+8%' },
          { label: 'Conversion', value: '3.2%', change: '+0.4%' },
        ].map((stat, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-6">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-green-400 text-sm">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl p-6 mb-8">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab('revenue')}
            className={\`px-4 py-2 rounded-lg \${activeTab === 'revenue' ? 'bg-blue-600' : 'bg-gray-700'}\`}
          >
            Revenue
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={\`px-4 py-2 rounded-lg \${activeTab === 'users' ? 'bg-blue-600' : 'bg-gray-700'}\`}
          >
            Users
          </button>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === 'revenue' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip />
                <Bar dataKey="users" fill="#10B981" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}`,
  },
  {
    id: 'animated-card',
    name: 'Animated Card',
    complexity: 'medium',
    description: 'Card with Framer Motion - tests animation library',
    code: `import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const cards = [
  { id: 1, title: 'Project Alpha', description: 'Machine learning pipeline', color: 'from-purple-500 to-pink-500' },
  { id: 2, title: 'Project Beta', description: 'Real-time analytics', color: 'from-blue-500 to-cyan-500' },
  { id: 3, title: 'Project Gamma', description: 'Mobile application', color: 'from-green-500 to-emerald-500' },
];

export default function App() {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center">
      <div className="grid grid-cols-3 gap-6">
        {cards.map(card => (
          <motion.div
            key={card.id}
            layoutId={card.id}
            onClick={() => setSelectedId(card.id)}
            className={\`bg-gradient-to-br \${card.color} rounded-2xl p-6 cursor-pointer\`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <h2 className="text-xl font-bold text-white mb-2">{card.title}</h2>
            <p className="text-white/80">{card.description}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center"
            onClick={() => setSelectedId(null)}
          >
            <motion.div
              layoutId={selectedId}
              className={\`bg-gradient-to-br \${cards.find(c => c.id === selectedId)?.color} rounded-2xl p-12 max-w-md\`}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold text-white mb-4">
                {cards.find(c => c.id === selectedId)?.title}
              </h2>
              <p className="text-white/80 text-lg mb-6">
                {cards.find(c => c.id === selectedId)?.description}
              </p>
              <button
                onClick={() => setSelectedId(null)}
                className="bg-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/30"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}`,
  },
  {
    id: 'icons',
    name: 'Icon Gallery',
    complexity: 'basic',
    description: 'Lucide icons - tests icon library import',
    code: `import { useState } from 'react';
import { Heart, Star, Sun, Moon, Cloud, Zap, Flame, Droplet, Wind, Leaf } from 'lucide-react';

const icons = [
  { Icon: Heart, name: 'Heart', color: 'text-red-500' },
  { Icon: Star, name: 'Star', color: 'text-yellow-500' },
  { Icon: Sun, name: 'Sun', color: 'text-orange-500' },
  { Icon: Moon, name: 'Moon', color: 'text-indigo-500' },
  { Icon: Cloud, name: 'Cloud', color: 'text-blue-400' },
  { Icon: Zap, name: 'Zap', color: 'text-yellow-400' },
  { Icon: Flame, name: 'Flame', color: 'text-orange-600' },
  { Icon: Droplet, name: 'Droplet', color: 'text-cyan-500' },
  { Icon: Wind, name: 'Wind', color: 'text-gray-400' },
  { Icon: Leaf, name: 'Leaf', color: 'text-green-500' },
];

export default function App() {
  const [selected, setSelected] = useState(null);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-center mb-8">Icon Gallery</h1>
      <div className="grid grid-cols-5 gap-4 max-w-2xl mx-auto">
        {icons.map(({ Icon, name, color }) => (
          <button
            key={name}
            onClick={() => setSelected(name)}
            className={\`p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all \${
              selected === name ? 'ring-2 ring-blue-500' : ''
            }\`}
          >
            <Icon className={\`w-8 h-8 mx-auto \${color}\`} />
            <p className="text-sm text-gray-600 mt-2 text-center">{name}</p>
          </button>
        ))}
      </div>
      {selected && (
        <p className="text-center mt-8 text-lg">
          Selected: <span className="font-bold">{selected}</span>
        </p>
      )}
    </div>
  );
}`,
  },
  {
    id: 'game',
    name: 'Memory Game',
    complexity: 'advanced',
    description: 'Interactive game - tests complex state logic',
    code: `import { useState, useEffect } from 'react';

const emojis = ['A', 'B', 'C', 'D', 'E', 'F', 'A', 'B', 'C', 'D', 'E', 'F'];

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function App() {
  const [cards, setCards] = useState(() =>
    shuffle(emojis.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false })))
  );
  const [selected, setSelected] = useState([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);

  useEffect(() => {
    if (selected.length === 2) {
      const [first, second] = selected;
      if (cards[first].emoji === cards[second].emoji) {
        setCards(cards.map((c, i) =>
          i === first || i === second ? { ...c, matched: true } : c
        ));
      } else {
        setTimeout(() => {
          setCards(cards.map((c, i) =>
            i === first || i === second ? { ...c, flipped: false } : c
          ));
        }, 1000);
      }
      setMoves(m => m + 1);
      setSelected([]);
    }
  }, [selected, cards]);

  useEffect(() => {
    if (cards.every(c => c.matched)) setWon(true);
  }, [cards]);

  const handleClick = (index) => {
    if (selected.length < 2 && !cards[index].flipped && !cards[index].matched) {
      setCards(cards.map((c, i) => i === index ? { ...c, flipped: true } : c));
      setSelected([...selected, index]);
    }
  };

  const restart = () => {
    setCards(shuffle(emojis.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))));
    setSelected([]);
    setMoves(0);
    setWon(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 p-8 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-white mb-4">Memory Game</h1>
      <p className="text-white/80 mb-8">Moves: {moves}</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => handleClick(index)}
            className={\`w-20 h-20 rounded-xl text-4xl flex items-center justify-center transition-all duration-300 \${
              card.flipped || card.matched
                ? 'bg-white'
                : 'bg-indigo-600 hover:bg-indigo-500'
            } \${card.matched ? 'opacity-50' : ''}\`}
          >
            {(card.flipped || card.matched) ? card.emoji : '?'}
          </button>
        ))}
      </div>

      {won && (
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400 mb-4">You Won!</p>
          <button
            onClick={restart}
            className="bg-white text-indigo-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}`,
  },
];

/**
 * Get a sample artifact by ID
 */
export function getSampleArtifact(id: string): SampleArtifact | undefined {
  return SAMPLE_ARTIFACTS.find(a => a.id === id);
}

/**
 * Get sample artifacts by complexity level
 */
export function getSampleArtifactsByComplexity(
  complexity: 'basic' | 'medium' | 'advanced'
): SampleArtifact[] {
  return SAMPLE_ARTIFACTS.filter(a => a.complexity === complexity);
}
