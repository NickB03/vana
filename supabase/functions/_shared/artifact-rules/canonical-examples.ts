/**
 * Canonical Artifact Examples
 *
 * Following Z.ai's philosophy: Provide FULL working examples inline for the AI to copy.
 * Each example is complete, tested, and demonstrates best practices.
 *
 * Philosophy:
 * - Show, don't tell: Complete working code instead of abstract patterns
 * - Copy-paste ready: AI can use these as templates
 * - Real-world scenarios: Common use cases developers request
 * - Best practices baked in: Dark mode, validation, loading states, accessibility
 *
 * @module artifact-rules/canonical-examples
 */

/**
 * Type definition for a canonical example
 */
export interface CanonicalExample {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly keywords: readonly [string, ...string[]];
  readonly fullCode: string;
}

/**
 * Example 1: Interactive Contact Form
 *
 * Demonstrates:
 * - Form validation with user feedback
 * - Loading states during submission
 * - Success/error messaging
 * - lucide-react icons
 * - Dark mode support
 * - Immutable state updates
 */
const EXAMPLE_CONTACT_FORM: CanonicalExample = {
  id: 'contact-form',
  name: 'Interactive Contact Form',
  description: 'Contact form with validation, loading states, and success feedback',
  keywords: [
    'form',
    'contact',
    'validation',
    'input',
    'submit',
    'email',
    'message',
    'loading',
    'success',
  ],
  fullCode: `import { Mail, User, Send, CheckCircle, AlertCircle } from 'lucide-react';

const { useState } = React;

export default function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    // ✅ Immutable update pattern
    setFormData({ ...formData, [field]: value });
    // Clear error for this field when user types
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    setSubmitStatus('success');

    // Reset form after success
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Get in Touch
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We'd love to hear from you
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={\`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white \${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }\`}
                placeholder="John Doe"
              />
            </div>
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={\`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white \${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }\`}
                placeholder="john@example.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Message Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => handleChange('message', e.target.value)}
              rows={4}
              className={\`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none \${
                errors.message ? 'border-red-500' : 'border-gray-300'
              }\`}
              placeholder="Tell us what's on your mind..."
            />
            {errors.message && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Message
              </>
            )}
          </button>

          {/* Success Message */}
          {submitStatus === 'success' && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-800 dark:text-green-200">
                Message sent successfully! We'll get back to you soon.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}`,
};

/**
 * Example 2: Analytics Dashboard with Charts
 *
 * Demonstrates:
 * - recharts integration (LineChart, BarChart)
 * - @radix-ui/react-tabs for navigation
 * - Metric cards with icons
 * - Responsive grid layout
 * - Sample data (never empty state)
 */
const EXAMPLE_DASHBOARD: CanonicalExample = {
  id: 'analytics-dashboard',
  name: 'Analytics Dashboard',
  description: 'Dashboard with charts, tabs, and metric cards',
  keywords: [
    'dashboard',
    'analytics',
    'chart',
    'graph',
    'metrics',
    'statistics',
    'data',
    'visualization',
    'tabs',
  ],
  fullCode: `import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const { useState } = React;

export default function App() {
  // ✅ ALWAYS include sample data
  const revenueData = [
    { month: 'Jan', revenue: 4200, users: 240 },
    { month: 'Feb', revenue: 5100, users: 310 },
    { month: 'Mar', revenue: 4800, users: 290 },
    { month: 'Apr', revenue: 6300, users: 380 },
    { month: 'May', revenue: 7200, users: 450 },
    { month: 'Jun', revenue: 8100, users: 520 },
  ];

  const categoryData = [
    { category: 'Electronics', sales: 12500 },
    { category: 'Clothing', sales: 8900 },
    { category: 'Home', sales: 6700 },
    { category: 'Books', sales: 4200 },
    { category: 'Sports', sales: 5800 },
  ];

  const metrics = [
    {
      title: 'Total Revenue',
      value: '$45,231',
      change: '+20.1%',
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Active Users',
      value: '2,420',
      change: '+15.3%',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Orders',
      value: '1,893',
      change: '+12.5%',
      icon: ShoppingCart,
      color: 'bg-purple-500',
    },
    {
      title: 'Growth Rate',
      value: '23.5%',
      change: '+4.2%',
      icon: TrendingUp,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your business metrics and performance
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.title}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={\`\${metric.color} p-3 rounded-lg\`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {metric.change}
                  </span>
                </div>
                <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">
                  {metric.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Charts Section with Tabs */}
        <Tabs.Root defaultValue="revenue" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <Tabs.List className="flex gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
            <Tabs.Trigger
              value="revenue"
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition"
            >
              Revenue Trend
            </Tabs.Trigger>
            <Tabs.Trigger
              value="category"
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition"
            >
              Sales by Category
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="revenue">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Monthly Revenue & User Growth
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Tabs.Content>

          <Tabs.Content value="category">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Sales Performance by Category
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="category" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Bar dataKey="sales" fill="#8B5CF6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}`,
};

/**
 * Example 3: Interactive Tic-Tac-Toe Game
 *
 * Demonstrates:
 * - Complete game logic with winner detection
 * - Immutable state updates (CRITICAL for React strict mode)
 * - Score tracking across games
 * - Animated transitions
 * - Reset functionality
 */
const EXAMPLE_GAME: CanonicalExample = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe Game',
  description: 'Interactive game with winner detection and score tracking',
  keywords: [
    'game',
    'tic-tac-toe',
    'interactive',
    'play',
    'score',
    'winner',
    'board',
    'player',
  ],
  fullCode: `import { RotateCcw, Trophy } from 'lucide-react';

const { useState } = React;

export default function App() {
  // ✅ ALWAYS include sample data (game in progress)
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [scores, setScores] = useState({ X: 0, O: 0, draws: 0 });
  const [gameOver, setGameOver] = useState(false);

  const calculateWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
      [0, 4, 8], [2, 4, 6],             // Diagonals
    ];

    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: [a, b, c] };
      }
    }

    return null;
  };

  const handleClick = (index) => {
    if (board[index] || gameOver) return;

    // ✅ CORRECT: Immutable update pattern
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);

    const result = calculateWinner(newBoard);
    if (result) {
      setGameOver(true);
      // ✅ Immutable score update
      setScores({ ...scores, [result.winner]: scores[result.winner] + 1 });
    } else if (newBoard.every(square => square !== null)) {
      setGameOver(true);
      setScores({ ...scores, draws: scores.draws + 1 });
    } else {
      setIsXNext(!isXNext);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setGameOver(false);
  };

  const resetScores = () => {
    setScores({ X: 0, O: 0, draws: 0 });
    resetGame();
  };

  const winnerInfo = calculateWinner(board);
  const isDraw = gameOver && !winnerInfo;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Tic-Tac-Toe
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {gameOver
              ? isDraw
                ? "It's a draw!"
                : \`🎉 Player \${winnerInfo.winner} wins!\`
              : \`Player \${isXNext ? 'X' : 'O'}'s turn\`}
          </p>
        </div>

        {/* Score Board */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {scores.X}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Player X
            </div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {scores.draws}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Draws
            </div>
          </div>
          <div className="bg-pink-100 dark:bg-pink-900/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
              {scores.O}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Player O
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {board.map((square, index) => {
            const isWinningSquare = winnerInfo?.line.includes(index);
            return (
              <button
                key={index}
                onClick={() => handleClick(index)}
                className={\`aspect-square text-4xl font-bold rounded-lg transition-all duration-200 \${
                  square
                    ? isWinningSquare
                      ? 'bg-green-500 text-white scale-105'
                      : square === 'X'
                      ? 'bg-blue-500 text-white'
                      : 'bg-pink-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                } \${!square && !gameOver ? 'cursor-pointer' : 'cursor-not-allowed'}\`}
                disabled={!!square || gameOver}
              >
                {square}
              </button>
            );
          })}
        </div>

        {/* Winner Message */}
        {winnerInfo && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-green-800 dark:text-green-200 font-medium">
              Congratulations! Player {winnerInfo.winner} wins this round!
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={resetGame}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            New Game
          </button>
          <button
            onClick={resetScores}
            className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium py-3 px-4 rounded-lg transition duration-200"
          >
            Reset Scores
          </button>
        </div>
      </div>
    </div>
  );
}`,
};

/**
 * Example 4: Data Table with Search and Actions
 *
 * Demonstrates:
 * - Filterable data with search
 * - Sort functionality
 * - Action buttons (edit/delete)
 * - Status badges with colors
 * - Sample data (never empty state)
 */
const EXAMPLE_DATA_TABLE: CanonicalExample = {
  id: 'data-table',
  name: 'Data Table with Search',
  description: 'Searchable and sortable data table with action buttons',
  keywords: [
    'table',
    'data',
    'search',
    'filter',
    'sort',
    'list',
    'records',
    'crud',
    'actions',
  ],
  fullCode: `import { Search, Edit, Trash2, ArrowUpDown } from 'lucide-react';

const { useState } = React;

export default function App() {
  // ✅ ALWAYS include sample data
  const [users] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'active', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive', role: 'User' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', status: 'active', role: 'Editor' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', status: 'pending', role: 'User' },
    { id: 6, name: 'Eva Martinez', email: 'eva@example.com', status: 'active', role: 'Admin' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredUsers = users
    .filter((user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField].toLowerCase();
      const bVal = b[sortField].toLowerCase();
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and search through user accounts
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Found {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                    >
                      Name
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                    >
                      Email
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('role')}
                      className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                    >
                      Role
                      <ArrowUpDown className="w-4 h-4" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {user.role}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={\`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full \${getStatusColor(
                          user.status
                        )}\`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No users found matching your search.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`,
};

/**
 * Example 5: Settings Page with Toggles
 *
 * Demonstrates:
 * - @radix-ui/react-tabs for navigation
 * - @radix-ui/react-switch for toggles
 * - Form inputs with labels
 * - Save functionality with feedback
 * - Organized sections
 */
const EXAMPLE_SETTINGS: CanonicalExample = {
  id: 'settings-page',
  name: 'Settings Page',
  description: 'Settings interface with tabs, toggles, and form inputs',
  keywords: [
    'settings',
    'preferences',
    'configuration',
    'options',
    'toggle',
    'switch',
    'form',
    'tabs',
    'profile',
  ],
  fullCode: `import { Bell, Lock, User, Save, CheckCircle } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';

const { useState } = React;

export default function App() {
  // ✅ ALWAYS include sample data
  const [settings, setSettings] = useState({
    // Profile
    displayName: 'John Doe',
    email: 'john@example.com',
    bio: 'Software developer and coffee enthusiast',

    // Notifications
    emailNotifications: true,
    pushNotifications: false,
    weeklyDigest: true,

    // Privacy
    publicProfile: true,
    showEmail: false,
    twoFactorAuth: true,
  });

  const [saved, setSaved] = useState(false);

  const updateSetting = (key, value) => {
    // ✅ Immutable update pattern
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account preferences and settings
          </p>
        </div>

        {/* Settings Tabs */}
        <Tabs.Root defaultValue="profile" className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
          <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <Tabs.Trigger
              value="profile"
              className="flex items-center gap-2 px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition"
            >
              <User className="w-4 h-4" />
              Profile
            </Tabs.Trigger>
            <Tabs.Trigger
              value="notifications"
              className="flex items-center gap-2 px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition"
            >
              <Bell className="w-4 h-4" />
              Notifications
            </Tabs.Trigger>
            <Tabs.Trigger
              value="privacy"
              className="flex items-center gap-2 px-6 py-4 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition"
            >
              <Lock className="w-4 h-4" />
              Privacy & Security
            </Tabs.Trigger>
          </Tabs.List>

          {/* Profile Tab */}
          <Tabs.Content value="profile" className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={settings.displayName}
                onChange={(e) => updateSetting('displayName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => updateSetting('email', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                value={settings.bio}
                onChange={(e) => updateSetting('bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              />
            </div>
          </Tabs.Content>

          {/* Notifications Tab */}
          <Tabs.Content value="notifications" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Email Notifications
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive notifications via email
                </p>
              </div>
              <Switch.Root
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-blue-600 transition"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Push Notifications
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive push notifications on your device
                </p>
              </div>
              <Switch.Root
                checked={settings.pushNotifications}
                onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-blue-600 transition"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Weekly Digest
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive a weekly summary of your activity
                </p>
              </div>
              <Switch.Root
                checked={settings.weeklyDigest}
                onCheckedChange={(checked) => updateSetting('weeklyDigest', checked)}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-blue-600 transition"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>
          </Tabs.Content>

          {/* Privacy Tab */}
          <Tabs.Content value="privacy" className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Public Profile
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Make your profile visible to everyone
                </p>
              </div>
              <Switch.Root
                checked={settings.publicProfile}
                onCheckedChange={(checked) => updateSetting('publicProfile', checked)}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-blue-600 transition"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Show Email Address
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Display your email on your public profile
                </p>
              </div>
              <Switch.Root
                checked={settings.showEmail}
                onCheckedChange={(checked) => updateSetting('showEmail', checked)}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-blue-600 transition"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Two-Factor Authentication
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch.Root
                checked={settings.twoFactorAuth}
                onCheckedChange={(checked) => updateSetting('twoFactorAuth', checked)}
                className="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full relative data-[state=checked]:bg-blue-600 transition"
              >
                <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform duration-100 translate-x-0.5 will-change-transform data-[state=checked]:translate-x-[22px]" />
              </Switch.Root>
            </div>
          </Tabs.Content>
        </Tabs.Root>

        {/* Save Button */}
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save Changes
          </button>

          {saved && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Settings saved successfully!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`,
};

/**
 * All canonical examples in a single array
 */
export const CANONICAL_EXAMPLES: CanonicalExample[] = [
  EXAMPLE_CONTACT_FORM,
  EXAMPLE_DASHBOARD,
  EXAMPLE_GAME,
  EXAMPLE_DATA_TABLE,
  EXAMPLE_SETTINGS,
];

/**
 * Get a formatted section for the system prompt with all canonical examples
 *
 * This function returns a string that can be injected into the artifact
 * generation system prompt. The AI will use these examples as templates
 * for generating similar artifacts.
 *
 * @returns {string} Formatted section with all examples
 */
export function getCanonicalExampleSection(): string {
  return `
## CANONICAL EXAMPLES

The following are COMPLETE, WORKING examples you can use as templates.
These examples follow ALL best practices and demonstrate proper patterns.

When a user request matches these patterns, USE THESE EXAMPLES AS YOUR FOUNDATION.

${CANONICAL_EXAMPLES.map(
  (example) => `
### ${example.name}

**Keywords:** ${example.keywords.join(', ')}
**Description:** ${example.description}

\`\`\`jsx
${example.fullCode}
\`\`\`
`
).join('\n')}

## How to Use These Examples

1. **Match user intent** to example keywords
2. **Copy the relevant example** as your starting point
3. **Customize** for the specific user request
4. **Preserve** the structure, patterns, and best practices

Remember: These are PROVEN working examples. Don't reinvent the wheel!
`;
}

/**
 * Result interface for example matching with rich context
 */
export interface ExampleMatchResult {
  /** The matched canonical example, or null if no match */
  readonly example: CanonicalExample | null;
  /** Array of keywords that matched the user request */
  readonly matchedKeywords: readonly string[];
  /** Debug information for troubleshooting and logging */
  readonly debugInfo?: Readonly<{
    /** Total number of examples searched */
    totalExamples: number;
    /** Best match score (number of matched keywords) */
    bestScore: number;
  }>;
}

/**
 * Find the most relevant canonical example for a user request
 *
 * Returns richer context instead of just null to aid in debugging and
 * provide better error messages when no match is found.
 *
 * @param userRequest - The user's request text (validated for non-empty string)
 * @returns {ExampleMatchResult} Rich match result with context
 * @throws {Error} If userRequest is invalid
 *
 * @example
 * const result = findRelevantExample("create a contact form");
 * if (result.example) {
 *   console.log(`Matched ${result.matchedKeywords.length} keywords`);
 * } else {
 *   console.log(`No match found (searched ${result.debugInfo.totalExamples} examples)`);
 * }
 */
export function findRelevantExample(
  userRequest: string
): ExampleMatchResult {
  // Input validation
  if (!userRequest || typeof userRequest !== 'string') {
    throw new Error('findRelevantExample: userRequest must be a non-empty string');
  }

  const lowerRequest = userRequest.toLowerCase();

  // Find examples whose keywords match the request
  const matches = CANONICAL_EXAMPLES.map((example) => {
    const matchedKeywords = example.keywords.filter((keyword) =>
      lowerRequest.includes(keyword.toLowerCase())
    );

    return {
      example,
      matchCount: matchedKeywords.length,
      matchedKeywords,
    };
  })
    .filter((match) => match.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount);

  if (matches.length === 0) {
    // No matches found - return rich context for debugging
    return {
      example: null,
      matchedKeywords: [],
      debugInfo: {
        totalExamples: CANONICAL_EXAMPLES.length,
        bestScore: 0,
      },
    };
  }

  // Return best match with rich context
  const bestMatch = matches[0];
  return {
    example: bestMatch.example,
    matchedKeywords: bestMatch.matchedKeywords,
    debugInfo: {
      totalExamples: CANONICAL_EXAMPLES.length,
      bestScore: bestMatch.matchCount,
    },
  };
}
