/**
 * Production-Ready Artifact Test Fixtures - Batch 2
 *
 * Artifacts 8-14 from vanilla-sandpack-refactor-plan.md
 * All artifacts follow Sandpack best practices:
 * - Default export App component (MANDATORY)
 * - Destructured React hooks from React namespace
 * - Whitelisted packages only (recharts, framer-motion, lucide-react, @radix-ui/react-*, tailwind)
 * - Immutable state updates
 * - Sample data on first render
 * - Tailwind CSS only for styling
 */

export const ARTIFACTS_BATCH_2 = {
  // Artifact 8: Kanban Task Board (485 lines)
  kanbanBoard: `import { useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Plus, Trash2, GripVertical } from 'lucide-react';

const initialTasks = {
  todo: [
    { id: '1', title: 'Design landing page', description: 'Create wireframes and mockups', priority: 'high' },
    { id: '2', title: 'Set up analytics', description: 'Configure Google Analytics', priority: 'medium' },
  ],
  inProgress: [
    { id: '3', title: 'Build authentication', description: 'Implement JWT-based auth', priority: 'high' },
  ],
  done: [
    { id: '4', title: 'Initialize repository', description: 'Set up Git and CI/CD', priority: 'low' },
  ],
};

const columnConfig = {
  todo: { title: 'To Do', color: 'border-blue-500', bgColor: 'bg-blue-50' },
  inProgress: { title: 'In Progress', color: 'border-yellow-500', bgColor: 'bg-yellow-50' },
  done: { title: 'Done', color: 'border-green-500', bgColor: 'bg-green-50' },
};

const priorityColors = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTaskColumn, setNewTaskColumn] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  const addTask = (column) => {
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: newTaskDescription,
      priority: newTaskPriority,
    };

    setTasks({
      ...tasks,
      [column]: [...tasks[column], newTask],
    });

    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskPriority('medium');
    setNewTaskColumn(null);
  };

  const deleteTask = (column, taskId) => {
    setTasks({
      ...tasks,
      [column]: tasks[column].filter(t => t.id !== taskId),
    });
  };

  const moveTask = (taskId, fromColumn, toColumn) => {
    const task = tasks[fromColumn].find(t => t.id === taskId);
    if (!task) return;

    setTasks({
      ...tasks,
      [fromColumn]: tasks[fromColumn].filter(t => t.id !== taskId),
      [toColumn]: [...tasks[toColumn], task],
    });
  };

  const updateColumnOrder = (column, newOrder) => {
    setTasks({
      ...tasks,
      [column]: newOrder,
    });
  };

  const TaskCard = ({ task, column }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-lg border-2 border-gray-200 p-4 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <h3 className="font-semibold text-gray-800">{task.title}</h3>
        </div>
        <button
          onClick={() => deleteTask(column, task.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-3 ml-6">{task.description}</p>
      <div className="flex items-center justify-between ml-6">
        <span className={\`text-xs px-2 py-1 rounded border \${priorityColors[task.priority]}\`}>
          {task.priority}
        </span>
        <div className="flex gap-1">
          {column !== 'todo' && (
            <button
              onClick={() => moveTask(task.id, column, column === 'inProgress' ? 'todo' : 'inProgress')}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              ←
            </button>
          )}
          {column !== 'done' && (
            <button
              onClick={() => moveTask(task.id, column, column === 'todo' ? 'inProgress' : 'done')}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const Column = ({ column, columnKey }) => (
    <div className="flex-1 min-w-[280px]">
      <div className={\`border-l-4 \${columnConfig[columnKey].color} bg-white rounded-lg shadow-sm\`}>
        <div className={\`p-4 \${columnConfig[columnKey].bgColor} rounded-t-lg\`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800 text-lg">{columnConfig[columnKey].title}</h2>
            <span className="bg-white px-2 py-1 rounded text-sm font-semibold text-gray-600">
              {tasks[columnKey].length}
            </span>
          </div>
          <button
            onClick={() => setNewTaskColumn(columnKey)}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 py-2 rounded-lg border-2 border-dashed border-gray-300 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Task</span>
          </button>
        </div>

        <div className="p-4 space-y-3 min-h-[400px]">
          <Reorder.Group
            axis="y"
            values={tasks[columnKey]}
            onReorder={(newOrder) => updateColumnOrder(columnKey, newOrder)}
            className="space-y-3"
          >
            {tasks[columnKey].map((task) => (
              <Reorder.Item key={task.id} value={task}>
                <TaskCard task={task} column={columnKey} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Project Board</h1>
          <p className="text-gray-600">Drag and drop tasks to organize your workflow</p>
        </header>

        <div className="flex gap-6 overflow-x-auto pb-4">
          {Object.keys(columnConfig).map((columnKey) => (
            <Column key={columnKey} column={tasks[columnKey]} columnKey={columnKey} />
          ))}
        </div>
      </div>

      {newTaskColumn && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setNewTaskColumn(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Add Task to {columnConfig[newTaskColumn].title}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter task title..."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  rows={3}
                  placeholder="Enter task description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <div className="flex gap-2">
                  {['low', 'medium', 'high'].map((priority) => (
                    <button
                      key={priority}
                      onClick={() => setNewTaskPriority(priority)}
                      className={\`flex-1 py-2 rounded-lg border-2 font-medium transition-all \${
                        newTaskPriority === priority
                          ? priorityColors[priority]
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }\`}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setNewTaskColumn(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addTask(newTaskColumn)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Add Task
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}`,

  // Artifact 9: Interactive Data Table (420 lines)
  dataTable: `import { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, ExternalLink } from 'lucide-react';

export default function App() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const itemsPerPage = 10;

  useEffect(() => {
    fetch('https://jsonplaceholder.typicode.com/users')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch users:', err);
        setLoading(false);
      });
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal, bVal;

    if (sortField === 'name') {
      aVal = a.name;
      bVal = b.name;
    } else if (sortField === 'email') {
      aVal = a.email;
      bVal = b.email;
    } else if (sortField === 'company') {
      aVal = a.company.name;
      bVal = b.company.name;
    } else if (sortField === 'city') {
      aVal = a.address.city;
      bVal = b.address.city;
    }

    if (sortDirection === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    }
  });

  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = sortedUsers.slice(startIndex, startIndex + itemsPerPage);

  const toggleRowSelection = (id) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRows(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedRows.size === paginatedUsers.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedUsers.map(u => u.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Users Directory</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredUsers.length} users found
                  {selectedRows.size > 0 && \` · \${selectedRows.size} selected\`}
                </p>
              </div>
              <a
                href="https://jsonplaceholder.typicode.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <span>API Source</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, email, or company..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === paginatedUsers.length && paginatedUsers.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Name
                      {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Email
                      {getSortIcon('email')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('company')}
                      className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                    >
                      Company
                      {getSortIcon('company')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left">
                    <button
                      onClick={() => handleSort('city')}
                      className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                    >
                      City
                      {getSortIcon('city')}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={\`hover:bg-gray-50 transition-colors \${
                      selectedRows.has(user.id) ? 'bg-blue-50' : ''
                    }\`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(user.id)}
                        onChange={() => toggleRowSelection(user.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{user.email}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{user.company.name}</div>
                      <div className="text-sm text-gray-500">{user.company.catchPhrase}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{user.address.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedUsers.length)} of {sortedUsers.length}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={\`px-4 py-2 rounded-lg font-medium transition-colors \${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }\`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,

  // Artifact 10: Animated Statistics Dashboard (480 lines)
  statsDashboard: `import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, ShoppingCart, Activity } from 'lucide-react';

const revenueData = [
  { month: 'Jan', revenue: 45000, target: 40000, expenses: 28000 },
  { month: 'Feb', revenue: 52000, target: 45000, expenses: 31000 },
  { month: 'Mar', revenue: 48000, target: 50000, expenses: 29000 },
  { month: 'Apr', revenue: 61000, target: 55000, expenses: 35000 },
  { month: 'May', revenue: 55000, target: 60000, expenses: 33000 },
  { month: 'Jun', revenue: 67000, target: 65000, expenses: 38000 },
  { month: 'Jul', revenue: 72000, target: 70000, expenses: 41000 },
];

const userGrowthData = [
  { week: 'W1', users: 1200, active: 980 },
  { week: 'W2', users: 1450, active: 1180 },
  { week: 'W3', users: 1680, active: 1350 },
  { week: 'W4', users: 1950, active: 1580 },
  { week: 'W5', users: 2200, active: 1820 },
  { week: 'W6', users: 2480, active: 2050 },
];

const categoryData = [
  { name: 'Electronics', value: 35, color: '#3B82F6' },
  { name: 'Clothing', value: 28, color: '#10B981' },
  { name: 'Home & Garden', value: 18, color: '#F59E0B' },
  { name: 'Sports', value: 12, color: '#EF4444' },
  { name: 'Other', value: 7, color: '#8B5CF6' },
];

const orderData = [
  { day: 'Mon', orders: 45, completed: 38, cancelled: 7 },
  { day: 'Tue', orders: 52, completed: 48, cancelled: 4 },
  { day: 'Wed', orders: 48, completed: 42, cancelled: 6 },
  { day: 'Thu', orders: 61, completed: 55, cancelled: 6 },
  { day: 'Fri', orders: 70, completed: 65, cancelled: 5 },
  { day: 'Sat', orders: 85, completed: 78, cancelled: 7 },
  { day: 'Sun', orders: 65, completed: 60, cancelled: 5 },
];

export default function App() {
  const [animatedStats, setAnimatedStats] = useState({
    revenue: 0,
    users: 0,
    orders: 0,
    conversion: 0,
  });

  const targetStats = {
    revenue: 374000,
    users: 12960,
    orders: 426,
    conversion: 3.8,
  };

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;

      setAnimatedStats({
        revenue: Math.floor(targetStats.revenue * progress),
        users: Math.floor(targetStats.users * progress),
        orders: Math.floor(targetStats.orders * progress),
        conversion: (targetStats.conversion * progress).toFixed(1),
      });

      if (step >= steps) {
        clearInterval(timer);
        setAnimatedStats(targetStats);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const StatCard = ({ icon: Icon, label, value, change, prefix = '', suffix = '', color }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-lg p-6 border-l-4"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={\`p-3 rounded-lg\`} style={{ backgroundColor: color + '20' }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className={\`flex items-center gap-1 text-sm font-semibold \${
          change >= 0 ? 'text-green-600' : 'text-red-600'
        }\`}>
          {change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {Math.abs(change)}%
        </div>
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{label}</h3>
      <p className="text-3xl font-bold text-gray-800">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
      </p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Real-time business metrics and insights</p>
        </motion.header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={DollarSign}
            label="Total Revenue"
            value={animatedStats.revenue}
            change={12.5}
            prefix="$"
            color="#10B981"
          />
          <StatCard
            icon={Users}
            label="Active Users"
            value={animatedStats.users}
            change={8.3}
            color="#3B82F6"
          />
          <StatCard
            icon={ShoppingCart}
            label="Total Orders"
            value={animatedStats.orders}
            change={-2.4}
            color="#F59E0B"
          />
          <StatCard
            icon={Activity}
            label="Conversion Rate"
            value={animatedStats.conversion}
            change={5.7}
            suffix="%"
            color="#8B5CF6"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">Revenue Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="target" stroke="#3B82F6" strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">User Growth</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="week" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 5 }} />
                <Line type="monotone" dataKey="active" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">Sales by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => \`\${name}: \${value}%\`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">Weekly Orders</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={orderData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="day" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="completed" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="cancelled" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </div>
  );
}`,

  // Artifact 11: Advanced Memory Card Game (350 lines)
  memoryGame: `import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Trophy, Timer, Target } from 'lucide-react';

const themes = {
  emojis: ['🎨', '🎭', '🎪', '🎬', '🎮', '🎯', '🎲', '🎸'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'],
  fruits: ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒'],
};

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function App() {
  const [theme, setTheme] = useState('emojis');
  const [difficulty, setDifficulty] = useState(8);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [bestScore, setBestScore] = useState(null);

  useEffect(() => {
    initializeGame();
  }, [theme, difficulty]);

  useEffect(() => {
    let interval;
    if (gameActive && !gameWon) {
      interval = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameActive, gameWon]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped;
      if (cards[first] === cards[second]) {
        setMatched([...matched, first, second]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
      setMoves(m => m + 1);
    }
  }, [flipped]);

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      setGameWon(true);
      setGameActive(false);
      const score = moves * 100 + time;
      if (!bestScore || score < bestScore) {
        setBestScore(score);
      }
    }
  }, [matched]);

  const initializeGame = () => {
    const emojis = themes[theme].slice(0, difficulty);
    const doubled = [...emojis, ...emojis];
    const shuffled = shuffle(doubled).map((emoji, i) => ({ id: i, emoji }));
    setCards(shuffled.map(c => c.emoji));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setTime(0);
    setGameActive(false);
    setGameWon(false);
  };

  const handleCardClick = (index) => {
    if (!gameActive) setGameActive(true);
    if (flipped.length < 2 && !flipped.includes(index) && !matched.includes(index)) {
      setFlipped([...flipped, index]);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-5xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-400" />
            Memory Master
          </h1>
          <p className="text-white/80">Match all pairs in the fewest moves and shortest time</p>
        </motion.header>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="emojis">🎨 Activities</option>
                <option value="animals">🐶 Animals</option>
                <option value="fruits">🍎 Fruits</option>
              </select>
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white border border-white/30 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={4}>Easy (4 pairs)</option>
                <option value={6}>Medium (6 pairs)</option>
                <option value={8}>Hard (8 pairs)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={initializeGame}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-medium transition-colors border border-white/30"
              >
                <RotateCcw className="w-4 h-4" />
                New Game
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Timer className="w-5 h-5 text-blue-400" />
              <span className="text-white/80 text-sm font-medium">Time</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatTime(time)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="w-5 h-5 text-green-400" />
              <span className="text-white/80 text-sm font-medium">Moves</span>
            </div>
            <p className="text-3xl font-bold text-white">{moves}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-white/80 text-sm font-medium">Best Score</span>
            </div>
            <p className="text-3xl font-bold text-white">{bestScore || '-'}</p>
          </div>
        </div>

        <div className={\`grid gap-4 mb-6 \${difficulty === 4 ? 'grid-cols-4' : difficulty === 6 ? 'grid-cols-4' : 'grid-cols-4'}\`}>
          {cards.map((emoji, index) => {
            const isFlipped = flipped.includes(index) || matched.includes(index);
            const isMatched = matched.includes(index);

            return (
              <motion.button
                key={index}
                onClick={() => handleCardClick(index)}
                className={\`aspect-square rounded-xl text-5xl flex items-center justify-center transition-all \${
                  isMatched
                    ? 'bg-green-500/30 border-2 border-green-400'
                    : isFlipped
                    ? 'bg-white/20 border-2 border-white/40'
                    : 'bg-white/10 hover:bg-white/20 border-2 border-white/20'
                } cursor-pointer\`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  rotateY: isFlipped ? 0 : 180,
                }}
                transition={{ duration: 0.3 }}
              >
                {isFlipped ? emoji : '❓'}
              </motion.button>
            );
          })}
        </div>

        {gameWon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/20 backdrop-blur-lg rounded-xl p-8 text-center border-2 border-white/30"
          >
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Congratulations!</h2>
            <p className="text-white/80 text-lg mb-4">
              You won in {moves} moves and {formatTime(time)}!
            </p>
            <p className="text-white/60 mb-6">Score: {moves * 100 + time}</p>
            <button
              onClick={initializeGame}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-lg font-semibold transition-all"
            >
              Play Again
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}`,

  // Artifact 12: Quote Generator with Themes (320 lines)
  quoteGenerator: `import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Copy, Check, Heart, Share2 } from 'lucide-react';

const themes = {
  light: {
    bg: 'from-blue-50 to-purple-50',
    card: 'bg-white',
    text: 'text-gray-800',
    subtext: 'text-gray-600',
    border: 'border-gray-200',
  },
  dark: {
    bg: 'from-gray-900 to-indigo-900',
    card: 'bg-gray-800/50 backdrop-blur-lg',
    text: 'text-white',
    subtext: 'text-gray-300',
    border: 'border-gray-700',
  },
  ocean: {
    bg: 'from-cyan-900 to-blue-900',
    card: 'bg-blue-800/30 backdrop-blur-lg',
    text: 'text-white',
    subtext: 'text-cyan-200',
    border: 'border-cyan-700',
  },
  sunset: {
    bg: 'from-orange-900 to-pink-900',
    card: 'bg-orange-800/30 backdrop-blur-lg',
    text: 'text-white',
    subtext: 'text-orange-200',
    border: 'border-orange-700',
  },
};

export default function App() {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [copied, setCopied] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showFavorites, setShowFavorites] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, []);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://quotable.io/random');
      const data = await response.json();
      setQuote(data);
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      setQuote({
        content: 'The only way to do great work is to love what you do.',
        author: 'Steve Jobs',
      });
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (quote) {
      navigator.clipboard.writeText(\`"\${quote.content}" - \${quote.author}\`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleFavorite = () => {
    if (!quote) return;

    const exists = favorites.find(f => f.content === quote.content);
    if (exists) {
      setFavorites(favorites.filter(f => f.content !== quote.content));
    } else {
      setFavorites([...favorites, quote]);
    }
  };

  const isFavorite = quote && favorites.some(f => f.content === quote.content);

  const t = themes[theme];

  return (
    <div className={\`min-h-screen bg-gradient-to-br \${t.bg} p-8 transition-all duration-500\`}>
      <div className="max-w-4xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className={\`text-5xl font-bold \${t.text} mb-2\`}>
            Daily Inspiration
          </h1>
          <p className={\`\${t.subtext}\`}>Discover wisdom from great minds</p>
        </motion.header>

        <div className="flex gap-2 justify-center mb-6">
          {Object.keys(themes).map((themeName) => (
            <button
              key={themeName}
              onClick={() => setTheme(themeName)}
              className={\`px-4 py-2 rounded-lg font-medium transition-all \${
                theme === themeName
                  ? 'bg-white/30 border-2 border-white/50'
                  : 'bg-white/10 border-2 border-transparent hover:bg-white/20'
              } \${t.text}\`}
            >
              {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {!showFavorites ? (
            <motion.div
              key="quote"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={\`\${t.card} rounded-2xl shadow-2xl p-12 border \${t.border} mb-6\`}
            >
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white mx-auto"></div>
                </div>
              ) : quote ? (
                <>
                  <motion.blockquote
                    key={quote.content}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={\`text-3xl font-serif \${t.text} mb-6 leading-relaxed italic\`}
                  >
                    "{quote.content}"
                  </motion.blockquote>
                  <p className={\`text-xl \${t.subtext} text-right font-medium\`}>
                    — {quote.author}
                  </p>
                  {quote.tags && (
                    <div className="flex flex-wrap gap-2 mt-6">
                      {quote.tags.map((tag) => (
                        <span
                          key={tag}
                          className={\`px-3 py-1 rounded-full text-sm \${t.card} border \${t.border} \${t.subtext}\`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : null}
            </motion.div>
          ) : (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={\`\${t.card} rounded-2xl shadow-2xl p-8 border \${t.border} mb-6\`}
            >
              <h2 className={\`text-2xl font-bold \${t.text} mb-4\`}>
                Favorite Quotes ({favorites.length})
              </h2>
              {favorites.length === 0 ? (
                <p className={\`\${t.subtext} text-center py-8\`}>
                  No favorites yet. Start adding quotes you love!
                </p>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {favorites.map((fav, index) => (
                    <div
                      key={index}
                      className={\`p-4 rounded-lg bg-white/10 border \${t.border}\`}
                    >
                      <p className={\`\${t.text} font-serif italic mb-2\`}>
                        "{fav.content}"
                      </p>
                      <p className={\`\${t.subtext} text-sm text-right\`}>
                        — {fav.author}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-4 justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchQuote}
            disabled={loading}
            className={\`flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 \${t.text} rounded-lg font-semibold transition-all border \${t.border} disabled:opacity-50\`}
          >
            <RefreshCw className={\`w-5 h-5 \${loading ? 'animate-spin' : ''}\`} />
            New Quote
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={copyToClipboard}
            className={\`flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 \${t.text} rounded-lg font-semibold transition-all border \${t.border}\`}
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Copied!' : 'Copy'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleFavorite}
            className={\`flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 \${t.text} rounded-lg font-semibold transition-all border \${t.border}\`}
          >
            <Heart className={\`w-5 h-5 \${isFavorite ? 'fill-current text-red-500' : ''}\`} />
            {isFavorite ? 'Unfavorite' : 'Favorite'}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowFavorites(!showFavorites)}
            className={\`flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 \${t.text} rounded-lg font-semibold transition-all border \${t.border}\`}
          >
            <Heart className="w-5 h-5" />
            {showFavorites ? 'Back to Quote' : \`Favorites (\${favorites.length})\`}
          </motion.button>
        </div>
      </div>
    </div>
  );
}`,

  // Artifact 13: Color Palette Generator (390 lines)
  colorPalette: `import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Copy, Check, Lock, Unlock, Download, Palette } from 'lucide-react';

const generateRandomColor = () => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const getLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const { r, g, b } = rgb;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

const generateHarmoniousColors = (baseColor, count = 5) => {
  const colors = [baseColor];
  const rgb = hexToRgb(baseColor);

  for (let i = 1; i < count; i++) {
    const factor = i / count;
    const newR = Math.floor(rgb.r + (255 - rgb.r) * factor);
    const newG = Math.floor(rgb.g + (255 - rgb.g) * factor);
    const newB = Math.floor(rgb.b + (255 - rgb.b) * factor);
    colors.push(\`#\${newR.toString(16).padStart(2, '0')}\${newG.toString(16).padStart(2, '0')}\${newB.toString(16).padStart(2, '0')}\`);
  }

  return colors;
};

export default function App() {
  const [colors, setColors] = useState(Array(5).fill(null).map(() => generateRandomColor()));
  const [locked, setLocked] = useState(Array(5).fill(false));
  const [copied, setCopied] = useState(null);
  const [mode, setMode] = useState('random');

  const generatePalette = () => {
    if (mode === 'random') {
      setColors(colors.map((color, index) => locked[index] ? color : generateRandomColor()));
    } else {
      const baseColor = colors.find((_, i) => locked[i]) || generateRandomColor();
      const harmonious = generateHarmoniousColors(baseColor, 5);
      setColors(colors.map((color, index) => locked[index] ? color : harmonious[index]));
    }
  };

  const toggleLock = (index) => {
    const newLocked = [...locked];
    newLocked[index] = !newLocked[index];
    setLocked(newLocked);
  };

  const copyColor = (color, index) => {
    navigator.clipboard.writeText(color);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  };

  const exportPalette = () => {
    const css = colors.map((color, i) => \`  --color-\${i + 1}: \${color};\`).join('\\n');
    const fullCss = \`:root {\\n\${css}\\n}\`;

    const blob = new Blob([fullCss], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'palette.css';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Palette className="w-10 h-10 text-purple-600" />
            <h1 className="text-5xl font-bold text-gray-800">Color Palette Generator</h1>
          </div>
          <p className="text-gray-600">Generate beautiful color combinations for your designs</p>
        </motion.header>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setMode('random')}
                className={\`px-4 py-2 rounded-lg font-medium transition-colors \${
                  mode === 'random'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }\`}
              >
                Random
              </button>
              <button
                onClick={() => setMode('harmonious')}
                className={\`px-4 py-2 rounded-lg font-medium transition-colors \${
                  mode === 'harmonious'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }\`}
              >
                Harmonious
              </button>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generatePalette}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Generate
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={exportPalette}
                className="flex items-center gap-2 px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSS
              </motion.button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {colors.map((color, index) => {
              const isLight = getLuminance(color) > 0.5;
              const textColor = isLight ? 'text-gray-800' : 'text-white';

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <div
                    className="rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-105 cursor-pointer"
                    style={{ backgroundColor: color, height: '300px' }}
                    onClick={() => copyColor(color, index)}
                  >
                    <div className={\`h-full flex flex-col items-center justify-center \${textColor} opacity-0 group-hover:opacity-100 transition-opacity bg-black/20\`}>
                      <div className="text-center">
                        {copied === index ? (
                          <Check className="w-8 h-8 mx-auto mb-2" />
                        ) : (
                          <Copy className="w-8 h-8 mx-auto mb-2" />
                        )}
                        <p className="font-bold text-lg">{color.toUpperCase()}</p>
                        <p className="text-sm mt-1">
                          RGB({hexToRgb(color).r}, {hexToRgb(color).g}, {hexToRgb(color).b})
                        </p>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleLock(index)}
                    className={\`absolute top-2 right-2 p-2 rounded-lg transition-colors \${
                      locked[index]
                        ? 'bg-yellow-500 text-white'
                        : 'bg-white/80 text-gray-700 hover:bg-white'
                    }\`}
                  >
                    {locked[index] ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </motion.button>

                  <div className={\`mt-2 p-2 rounded text-center font-mono text-sm \${textColor}\`} style={{ backgroundColor: color }}>
                    {color.toUpperCase()}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Color Palette Preview</h2>
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="flex-1 h-20 rounded-lg" style={{ backgroundColor: colors[0] }}></div>
              <div className="flex-1 h-20 rounded-lg" style={{ backgroundColor: colors[1] }}></div>
              <div className="flex-1 h-20 rounded-lg" style={{ backgroundColor: colors[2] }}></div>
            </div>
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-2xl font-bold mb-2" style={{ color: colors[0] }}>
                Heading with Primary Color
              </h3>
              <p className="text-gray-700 mb-4">
                This is a preview of how your color palette looks in a real design. The primary color is used for headings and important elements.
              </p>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: colors[0] }}
                >
                  Primary Button
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: colors[1] }}
                >
                  Secondary Button
                </button>
                <button
                  className="px-4 py-2 rounded-lg border-2 font-medium"
                  style={{ borderColor: colors[2], color: colors[2] }}
                >
                  Outline Button
                </button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {colors.map((color, i) => (
                <div key={i} className="aspect-square rounded-lg" style={{ backgroundColor: color }}></div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-gray-600 text-sm">
          <p>Press spacebar to generate new palette • Click color to copy • Lock colors to keep them</p>
        </div>
      </div>
    </div>
  );
}`,

  // Artifact 14: Real-Time Weather Dashboard (620 lines)
  weatherDashboard: `import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Cloud, CloudRain, Sun, Wind, Droplet, Eye, Gauge, Navigation, MapPin, Search, TrendingUp, TrendingDown } from 'lucide-react';

const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const GEO_API = 'https://geocoding-api.open-meteo.com/v1/search';

const defaultLocations = [
  { name: 'New York', lat: 40.7128, lon: -74.0060, country: 'US' },
  { name: 'London', lat: 51.5074, lon: -0.1278, country: 'GB' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'JP' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'AU' },
];

const getWeatherIcon = (code, size = 'w-6 h-6') => {
  if (code === 0) return <Sun className={size} />;
  if (code <= 3) return <Cloud className={size} />;
  if (code <= 67) return <CloudRain className={size} />;
  return <Wind className={size} />;
};

const getWeatherDescription = (code) => {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  return 'Stormy';
};

export default function App() {
  const [location, setLocation] = useState(defaultLocations[0]);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchWeatherData(location.lat, location.lon);
  }, [location]);

  const fetchWeatherData = async (lat, lon) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m',
        hourly: 'temperature_2m,precipitation_probability,weather_code',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
        timezone: 'auto',
      });

      const response = await fetch(\`\${API_BASE}?\${params}\`);
      const data = await response.json();
      setWeatherData(data);
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    }
    setLoading(false);
  };

  const searchLocation = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(\`\${GEO_API}?name=\${encodeURIComponent(query)}&count=5&language=en&format=json\`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Failed to search location:', error);
      setSearchResults([]);
    }
    setSearching(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchLocation(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectLocation = (result) => {
    setLocation({
      name: result.name,
      lat: result.latitude,
      lon: result.longitude,
      country: result.country_code,
    });
    setSearchQuery('');
    setSearchResults([]);
  };

  if (loading || !weatherData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading weather data...</p>
        </div>
      </div>
    );
  }

  const current = weatherData.current;
  const hourly = weatherData.hourly;
  const daily = weatherData.daily;

  const next24Hours = hourly.time.slice(0, 24).map((time, i) => ({
    time: new Date(time).getHours() + ':00',
    temp: Math.round(hourly.temperature_2m[i]),
    precipitation: hourly.precipitation_probability[i],
  }));

  const next7Days = daily.time.slice(0, 7).map((date, i) => ({
    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    high: Math.round(daily.temperature_2m_max[i]),
    low: Math.round(daily.temperature_2m_min[i]),
    code: daily.weather_code[i],
    precipitation: daily.precipitation_sum[i],
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-4 flex items-center gap-3">
            <Cloud className="w-12 h-12" />
            Weather Dashboard
          </h1>

          <div className="relative">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a city..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/90 backdrop-blur-lg border border-white/20 focus:ring-2 focus:ring-white/50 outline-none text-gray-800"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl overflow-hidden z-10">
                {searchResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => selectLocation(result)}
                    className="w-full px-4 py-3 hover:bg-gray-100 flex items-center gap-3 transition-colors text-left"
                  >
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-800">{result.name}</p>
                      <p className="text-sm text-gray-500">
                        {result.admin1 && \`\${result.admin1}, \`}{result.country}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            {defaultLocations.map((loc) => (
              <button
                key={loc.name}
                onClick={() => setLocation(loc)}
                className={\`px-4 py-2 rounded-lg font-medium transition-all \${
                  location.name === loc.name
                    ? 'bg-white text-blue-600'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }\`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </header>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-white/80 mb-2">
                <MapPin className="w-5 h-5" />
                <span className="text-lg">{location.name}, {location.country}</span>
              </div>
              <h2 className="text-7xl font-bold text-white mb-2">
                {Math.round(current.temperature_2m)}°C
              </h2>
              <p className="text-white/80 text-xl">
                Feels like {Math.round(current.apparent_temperature)}°C
              </p>
            </div>
            <div className="text-right">
              <div className="text-white">
                {getWeatherIcon(current.weather_code, 'w-24 h-24')}
              </div>
              <p className="text-white text-xl mt-2">
                {getWeatherDescription(current.weather_code)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/80 mb-2">
                <Droplet className="w-5 h-5" />
                <span className="text-sm">Humidity</span>
              </div>
              <p className="text-2xl font-bold text-white">{current.relative_humidity_2m}%</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/80 mb-2">
                <Wind className="w-5 h-5" />
                <span className="text-sm">Wind Speed</span>
              </div>
              <p className="text-2xl font-bold text-white">{Math.round(current.wind_speed_10m)} km/h</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/80 mb-2">
                <Navigation className="w-5 h-5" />
                <span className="text-sm">Wind Direction</span>
              </div>
              <p className="text-2xl font-bold text-white">{Math.round(current.wind_direction_10m)}°</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 text-white/80 mb-2">
                <CloudRain className="w-5 h-5" />
                <span className="text-sm">Precipitation</span>
              </div>
              <p className="text-2xl font-bold text-white">{current.precipitation} mm</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">24-Hour Forecast</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={next24Hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="time" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#fff"
                  strokeWidth={3}
                  dot={{ fill: '#fff', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">7-Day Forecast</h3>
            <div className="space-y-3">
              {next7Days.map((day, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white/10 rounded-lg p-3"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-white font-medium w-12">{day.day}</span>
                    <div className="text-white">
                      {getWeatherIcon(day.code, 'w-6 h-6')}
                    </div>
                    <span className="text-white/60 text-sm">{day.precipitation}mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 text-sm">{day.low}°</span>
                    <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-orange-400 rounded-full"
                        style={{ width: '70%' }}
                      ></div>
                    </div>
                    <span className="text-white font-bold">{day.high}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="text-center text-white/60 text-sm">
          <p>Weather data provided by Open-Meteo API • Updated in real-time</p>
        </footer>
      </div>
    </div>
  );
}`,
};
