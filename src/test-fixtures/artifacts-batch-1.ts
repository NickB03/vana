/**
 * Test Fixtures: Artifacts Batch 1
 *
 * Production-ready React artifacts for Sandpack rendering.
 * All components follow Vana artifact system requirements:
 * - Export default App component
 * - Destructure React hooks from React namespace
 * - Use only whitelisted packages (recharts, framer-motion, lucide-react, @radix-ui/react-*)
 * - Immutable state updates
 * - Sample data on first render
 * - Tailwind CSS only for styling
 */

export const ARTIFACTS_BATCH_1 = {
  // Artifact 1: Animated Gradient Button Collection (120-150 lines)
  animatedButtons: `
import { motion } from 'framer-motion';
import { Sparkles, Zap, Heart, Star, Rocket, Crown } from 'lucide-react';

import { useState } from 'react';

export default function App() {

  const [clickedButton, setClickedButton] = useState(null);

  const buttons = [
    {
      id: 'shimmer',
      label: 'Shimmer',
      icon: Sparkles,
      gradient: 'from-purple-500 via-pink-500 to-red-500',
      hoverGradient: 'hover:from-purple-600 hover:via-pink-600 hover:to-red-600',
    },
    {
      id: 'electric',
      label: 'Electric',
      icon: Zap,
      gradient: 'from-cyan-500 via-blue-500 to-indigo-500',
      hoverGradient: 'hover:from-cyan-600 hover:via-blue-600 hover:to-indigo-600',
    },
    {
      id: 'love',
      label: 'Love',
      icon: Heart,
      gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
      hoverGradient: 'hover:from-rose-600 hover:via-pink-600 hover:to-fuchsia-600',
    },
    {
      id: 'stellar',
      label: 'Stellar',
      icon: Star,
      gradient: 'from-amber-500 via-orange-500 to-yellow-500',
      hoverGradient: 'hover:from-amber-600 hover:via-orange-600 hover:to-yellow-600',
    },
    {
      id: 'launch',
      label: 'Launch',
      icon: Rocket,
      gradient: 'from-green-500 via-emerald-500 to-teal-500',
      hoverGradient: 'hover:from-green-600 hover:via-emerald-600 hover:to-teal-600',
    },
    {
      id: 'royal',
      label: 'Royal',
      icon: Crown,
      gradient: 'from-violet-500 via-purple-500 to-indigo-500',
      hoverGradient: 'hover:from-violet-600 hover:via-purple-600 hover:to-indigo-600',
    },
  ];

  const handleClick = (id) => {
    setClickedButton(id);
    setTimeout(() => setClickedButton(null), 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Animated Gradient Buttons
          </h1>
          <p className="text-slate-400 text-lg">Click any button to see the magic happen</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buttons.map((button) => {
            const Icon = button.icon;
            const isClicked = clickedButton === button.id;

            return (
              <motion.button
                key={button.id}
                onClick={() => handleClick(button.id)}
                className={\`relative overflow-hidden rounded-2xl p-1 bg-gradient-to-r \${button.gradient} \${button.hoverGradient} transition-all duration-300 shadow-lg hover:shadow-2xl\`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isClicked ? {
                  scale: [1, 1.1, 0.95, 1.05, 1],
                  rotate: [0, -5, 5, -3, 0],
                } : {}}
                transition={{ duration: 0.6 }}
              >
                <div className="relative bg-slate-900 rounded-xl px-8 py-6 flex flex-col items-center justify-center gap-3">
                  <motion.div
                    animate={isClicked ? {
                      rotate: [0, 360],
                      scale: [1, 1.3, 1],
                    } : {}}
                    transition={{ duration: 0.6 }}
                  >
                    <Icon className={\`w-8 h-8 bg-gradient-to-r \${button.gradient} bg-clip-text text-transparent\`} strokeWidth={2} />
                  </motion.div>

                  <span className="text-white font-semibold text-lg">{button.label}</span>

                  {isClicked && (
                    <motion.div
                      className={\`absolute inset-0 bg-gradient-to-r \${button.gradient} opacity-20 rounded-xl\`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: [0, 0.4, 0], scale: [0, 2] }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-500 text-sm">
            {clickedButton ? \`You clicked: \${buttons.find(b => b.id === clickedButton)?.label}\` : 'Try clicking different buttons!'}
          </p>
        </div>
      </div>
    </div>
  );
}`,

  // Artifact 2: Interactive Mood Tracker (180-220 lines)
  moodTracker: `
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Smile, Meh, Frown, Heart, Zap, Coffee, Sun, Moon } from 'lucide-react';


import { useState, useMemo } from 'react';

export default function App() {


  const moods = [
    { id: 'amazing', label: 'Amazing', icon: Heart, color: 'from-rose-500 to-pink-500', emoji: '😍' },
    { id: 'happy', label: 'Happy', icon: Smile, color: 'from-yellow-500 to-amber-500', emoji: '😊' },
    { id: 'energetic', label: 'Energetic', icon: Zap, color: 'from-cyan-500 to-blue-500', emoji: '⚡' },
    { id: 'calm', label: 'Calm', icon: Sun, color: 'from-green-500 to-emerald-500', emoji: '😌' },
    { id: 'tired', label: 'Tired', icon: Coffee, color: 'from-orange-500 to-amber-600', emoji: '😴' },
    { id: 'neutral', label: 'Neutral', icon: Meh, color: 'from-slate-500 to-gray-500', emoji: '😐' },
    { id: 'stressed', label: 'Stressed', icon: Moon, color: 'from-purple-500 to-violet-500', emoji: '😰' },
    { id: 'sad', label: 'Sad', icon: Frown, color: 'from-blue-600 to-indigo-600', emoji: '😢' },
  ];

  const [entries, setEntries] = useState([
    { id: '1', mood: 'happy', emoji: '😊', color: 'from-yellow-500 to-amber-500', timestamp: new Date('2026-01-18T09:00:00'), note: 'Great start to the day!' },
    { id: '2', mood: 'energetic', emoji: '⚡', color: 'from-cyan-500 to-blue-500', timestamp: new Date('2026-01-18T12:00:00'), note: 'Productive morning' },
    { id: '3', mood: 'calm', emoji: '😌', color: 'from-green-500 to-emerald-500', timestamp: new Date('2026-01-18T15:00:00'), note: 'Lunch break was relaxing' },
    { id: '4', mood: 'happy', emoji: '😊', color: 'from-yellow-500 to-amber-500', timestamp: new Date('2026-01-18T18:00:00'), note: 'Finished my tasks' },
  ]);

  const [note, setNote] = useState('');
  const [selectedMood, setSelectedMood] = useState(null);

  const chartData = useMemo(() => {
    const moodCounts = moods.map(mood => ({
      name: mood.label,
      count: entries.filter(e => e.mood === mood.id).length,
      emoji: mood.emoji,
    }));
    return moodCounts;
  }, [entries]);

  const handleAddMood = (moodId) => {
    const mood = moods.find(m => m.id === moodId);
    if (!mood) return;

    const newEntry: MoodEntry = {
      id: Date.now().toString(),
      mood: moodId,
      emoji: mood.emoji,
      color: mood.color,
      timestamp: new Date(),
      note: note.trim() || 'No note added',
    };

    setEntries([...entries, newEntry]);
    setNote('');
    setSelectedMood(moodId);
    setTimeout(() => setSelectedMood(null), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Mood Tracker</h1>
          <p className="text-purple-200">How are you feeling today?</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {moods.map((mood) => {
            const Icon = mood.icon;
            const isSelected = selectedMood === mood.id;

            return (
              <motion.button
                key={mood.id}
                onClick={() => handleAddMood(mood.id)}
                className={\`relative overflow-hidden rounded-2xl p-1 bg-gradient-to-r \${mood.color}\`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
              >
                <div className="bg-slate-900/90 rounded-xl p-4 flex flex-col items-center gap-2">
                  <span className="text-4xl">{mood.emoji}</span>
                  <Icon className="w-5 h-5 text-white" />
                  <span className="text-white font-medium text-sm">{mood.label}</span>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="bg-slate-900/50 backdrop-blur rounded-2xl p-6 mb-8">
          <label className="block text-white font-medium mb-2">Add a note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 text-white placeholder-slate-400 border border-slate-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        <div className="bg-slate-900/50 backdrop-blur rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Mood Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="emoji" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
              />
              <Bar dataKey="count" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900/50 backdrop-blur rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Entries</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {entries.slice().reverse().map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className={\`p-4 rounded-xl bg-gradient-to-r \${entry.color} bg-opacity-10 border border-slate-700\`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{entry.emoji}</span>
                      <div>
                        <p className="text-white font-medium">{entry.note}</p>
                        <p className="text-slate-400 text-sm">
                          {entry.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}`,

  // Artifact 3: Random Dog Gallery (140-170 lines)
  dogGallery: `
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Heart, Download, RefreshCw } from 'lucide-react';


import { useState, useEffect } from 'react';

export default function App() {

  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDog, setSelectedDog] = useState(null);

  const fetchDogs = async () => {
    setLoading(true);
    try {
      const responses = await Promise.all([
        fetch('https://dog.ceo/api/breeds/image/random'),
        fetch('https://dog.ceo/api/breeds/image/random'),
        fetch('https://dog.ceo/api/breeds/image/random'),
        fetch('https://dog.ceo/api/breeds/image/random'),
        fetch('https://dog.ceo/api/breeds/image/random'),
        fetch('https://dog.ceo/api/breeds/image/random'),
      ]);

      const data = await Promise.all(responses.map(r => r.json()));
      const newDogs = data.map((d, i) => ({
        id: Date.now().toString() + i,
        url: d.message,
        liked: false,
      }));

      setDogs(newDogs);
    } catch (error) {
      console.error('Failed to fetch dogs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDogs();
  }, []);

  const toggleLike = (id) => {
    setDogs(dogs.map(dog => dog.id === id ? { ...dog, liked: !dog.liked } : dog));
  };

  const likedCount = dogs.filter(d => d.liked).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-purple-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3 flex items-center justify-center gap-3">
            Random Dog Gallery
            <span className="text-4xl">🐕</span>
          </h1>
          <p className="text-blue-200 text-lg mb-6">Discover adorable dogs from around the world</p>

          <div className="flex items-center justify-center gap-4">
            <motion.button
              onClick={fetchDogs}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
              {loading ? 'Loading...' : 'New Dogs'}
            </motion.button>

            <div className="px-6 py-3 bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700">
              <span className="text-white font-semibold flex items-center gap-2">
                <Heart className="text-red-500 fill-red-500" size={20} />
                {likedCount} Liked
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {dogs.map((dog, index) => (
              <motion.div
                key={dog.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="relative overflow-hidden rounded-2xl bg-slate-800 shadow-xl hover:shadow-2xl transition-shadow">
                  <div className="aspect-square overflow-hidden">
                    <motion.img
                      src={dog.url}
                      alt="Random dog"
                      className="w-full h-full object-cover cursor-pointer"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => setSelectedDog(dog)}
                    />
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      onClick={() => toggleLike(dog.id)}
                      className="p-3 bg-white/20 backdrop-blur rounded-full"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Heart
                        size={24}
                        className={dog.liked ? 'text-red-500 fill-red-500' : 'text-white'}
                      />
                    </motion.button>

                    <motion.a
                      href={dog.url}
                      download
                      className="p-3 bg-white/20 backdrop-blur rounded-full"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Download size={24} className="text-white" />
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selectedDog && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8"
              onClick={() => setSelectedDog(null)}
            >
              <motion.img
                src={selectedDog.url}
                alt="Selected dog"
                className="max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                onClick={(e) => e.stopPropagation()}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}`,

  // Artifact 4: Pomodoro Focus Timer (200-250 lines)
  pomodoroTimer: `
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, Coffee, Zap, Clock, TrendingUp } from 'lucide-react';


import { useState, useEffect, useRef } from 'react';

export default function App() {


  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work');
  const [sessions, setSessions] = useState([
    { id: '1', type: 'work', duration: 25, timestamp: new Date('2026-01-18T09:00:00') },
    { id: '2', type: 'break', duration: 5, timestamp: new Date('2026-01-18T09:25:00') },
    { id: '3', type: 'work', duration: 25, timestamp: new Date('2026-01-18T09:30:00') },
  ]);

  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  const WORK_TIME = 25 * 60;
  const BREAK_TIME = 5 * 60;

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            handleTimerComplete();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsRunning(false);

    const newSession: Session = {
      id: Date.now().toString(),
      type: mode,
      duration: mode === 'work' ? 25 : 5,
      timestamp: new Date(),
    };
    setSessions([...sessions, newSession]);

    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    setTimeLeft(newMode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setTimeLeft(newMode === 'work' ? WORK_TIME : BREAK_TIME);
    setIsRunning(false);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = mode === 'work'
    ? ((WORK_TIME - timeLeft) / WORK_TIME) * 100
    : ((BREAK_TIME - timeLeft) / BREAK_TIME) * 100;

  const workSessions = sessions.filter(s => s.type === 'work').length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Clock className="text-purple-400" size={48} />
            Pomodoro Timer
          </h1>
          <p className="text-purple-200">Stay focused and productive</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-3xl p-8 mb-6 shadow-2xl border border-slate-700">
          <div className="flex justify-center gap-4 mb-8">
            <motion.button
              onClick={() => switchMode('work')}
              className={\`px-6 py-3 rounded-xl font-semibold transition-all \${
                mode === 'work'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }\`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-2">
                <Zap size={20} />
                Work
              </div>
            </motion.button>

            <motion.button
              onClick={() => switchMode('break')}
              className={\`px-6 py-3 rounded-xl font-semibold transition-all \${
                mode === 'break'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }\`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-2">
                <Coffee size={20} />
                Break
              </div>
            </motion.button>
          </div>

          <div className="relative mb-8">
            <svg className="w-full h-64" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#1e293b"
                strokeWidth="12"
              />
              <motion.circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke={mode === 'work' ? '#a855f7' : '#10b981'}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 90}
                strokeDashoffset={2 * Math.PI * 90 * (1 - progress / 100)}
                transform="rotate(-90 100 100)"
                initial={{ strokeDashoffset: 2 * Math.PI * 90 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - progress / 100) }}
                transition={{ duration: 0.5 }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-7xl font-bold text-white tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="text-xl text-slate-400 mt-2 capitalize">{mode} Time</div>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <motion.button
              onClick={toggleTimer}
              className={\`px-8 py-4 rounded-xl font-semibold text-white shadow-lg \${
                mode === 'work'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500'
              }\`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-2">
                {isRunning ? <Pause size={24} /> : <Play size={24} />}
                {isRunning ? 'Pause' : 'Start'}
              </div>
            </motion.button>

            <motion.button
              onClick={resetTimer}
              className="px-8 py-4 rounded-xl font-semibold bg-slate-700 text-white shadow-lg hover:bg-slate-600"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="flex items-center gap-2">
                <RotateCcw size={24} />
                Reset
              </div>
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="text-purple-400" size={24} />
              <span className="text-slate-300 font-medium">Work Sessions</span>
            </div>
            <div className="text-4xl font-bold text-white">{workSessions}</div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-400" size={24} />
              <span className="text-slate-300 font-medium">Total Minutes</span>
            </div>
            <div className="text-4xl font-bold text-white">{totalMinutes}</div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4">Recent Sessions</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sessions.slice().reverse().map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={\`flex items-center justify-between p-3 rounded-lg \${
                  session.type === 'work' ? 'bg-purple-500/20' : 'bg-green-500/20'
                }\`}
              >
                <div className="flex items-center gap-3">
                  {session.type === 'work' ? (
                    <Zap className="text-purple-400" size={20} />
                  ) : (
                    <Coffee className="text-green-400" size={20} />
                  )}
                  <span className="text-white font-medium capitalize">{session.type}</span>
                </div>
                <div className="text-slate-300 text-sm">
                  {session.duration} min • {session.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}`,

  // Artifact 5: Cat Fact Cards (130-160 lines)
  catFactCards: `
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Heart, Share2, X } from 'lucide-react';


import { useState, useEffect } from 'react';

export default function App() {

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  const fetchCatCards = async () => {
    setLoading(true);
    try {
      const factResponse = await fetch('https://catfact.ninja/facts?limit=6');
      const factData = await factResponse.json();

      const imageRequests = Array(6).fill(null).map(() =>
        fetch('https://api.thecatapi.com/v1/images/search').then(r => r.json())
      );
      const imageData = await Promise.all(imageRequests);

      const newCards = factData.data.map((item) => ({
        id: Date.now().toString() + index,
        fact: item.fact,
        imageUrl: imageData[index][0].url,
        liked: false,
      }));

      setCards(newCards);
    } catch (error) {
      console.error('Failed to fetch cat data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatCards();
  }, []);

  const toggleLike = (id) => {
    setCards(cards.map(card => card.id === id ? { ...card, liked: !card.liked } : card));
  };

  const removeCard = (id) => {
    setCards(cards.filter(card => card.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-amber-900 to-yellow-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3 flex items-center justify-center gap-3">
            Cat Fact Cards
            <span className="text-4xl">🐱</span>
          </h1>
          <p className="text-amber-200 text-lg mb-6">Discover fascinating feline facts</p>

          <motion.button
            onClick={fetchCatCards}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw className={loading ? 'animate-spin' : ''} size={20} />
            {loading ? 'Loading...' : 'New Facts'}
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {cards.map((card, index) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                <div className="bg-gradient-to-br from-amber-800 to-orange-900 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow">
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={card.imageUrl}
                      alt="Cat"
                      className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110"
                      onClick={() => setSelectedCard(card)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    <motion.button
                      onClick={() => removeCard(card.id)}
                      className="absolute top-3 right-3 p-2 bg-red-500/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={20} className="text-white" />
                    </motion.button>
                  </div>

                  <div className="p-5">
                    <p className="text-white text-sm leading-relaxed mb-4 line-clamp-3">
                      {card.fact}
                    </p>

                    <div className="flex items-center justify-between">
                      <motion.button
                        onClick={() => toggleLike(card.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-lg"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Heart
                          size={20}
                          className={card.liked ? 'text-red-500 fill-red-500' : 'text-white'}
                        />
                        <span className="text-white text-sm font-medium">
                          {card.liked ? 'Liked' : 'Like'}
                        </span>
                      </motion.button>

                      <motion.button
                        className="p-2 bg-white/10 backdrop-blur rounded-lg"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Share2 size={20} className="text-white" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {cards.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-amber-200 text-xl">No cat facts yet. Click "New Facts" to get started!</p>
          </div>
        )}

        <AnimatePresence>
          {selectedCard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8"
              onClick={() => setSelectedCard(null)}
            >
              <motion.div
                initial={{ scale: 0.8, rotateY: -90 }}
                animate={{ scale: 1, rotateY: 0 }}
                exit={{ scale: 0.8, rotateY: 90 }}
                className="max-w-2xl bg-gradient-to-br from-amber-800 to-orange-900 rounded-2xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={selectedCard.imageUrl}
                  alt="Cat"
                  className="w-full h-96 object-cover"
                />
                <div className="p-8">
                  <p className="text-white text-lg leading-relaxed">{selectedCard.fact}</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}`,

  // Artifact 6: World Explorer Dashboard (350-420 lines)
  worldExplorer: `
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Globe, MapPin, TrendingUp, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

import { useState, useEffect, useMemo } from 'react';

export default function App() {

  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('all');

  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://restcountries.com/v3.1/all');
      const data = await response.json();
      setCountries(data.slice(0, 50));
    } catch (error) {
      console.error('Failed to fetch countries:', error);
    } finally {
      setLoading(false);
    }
  };

  const regions = useMemo(() => {
    const uniqueRegions = Array.from(new Set(countries.map(c => c.region))).filter(Boolean);
    return ['all', ...uniqueRegions];
  }, [countries]);

  const filteredCountries = useMemo(() => {
    return countries.filter(country => {
      const matchesSearch = country.name.common.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegion = selectedRegion === 'all' || country.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [countries, searchTerm, selectedRegion]);

  const regionData = useMemo(() => {
    const regionCounts = countries.reduce((acc, country) => {
      const region = country.region || 'Unknown';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as { [key] });

    return Object.entries(regionCounts).map(([name, value]) => ({ name, value }));
  }, [countries]);

  const populationData = useMemo(() => {
    return filteredCountries
      .sort((a, b) => b.population - a.population)
      .slice(0, 10)
      .map(c => ({
        name: c.name.common.length > 12 ? c.name.common.slice(0, 12) + '...' : c.name.common,
        population: Math.round(c.population / 1000000),
      }));
  }, [filteredCountries]);

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

  const formatPopulation = (pop) => {
    if (pop >= 1000000) return (pop / 1000000).toFixed(1) + 'M';
    if (pop >= 1000) return (pop / 1000).toFixed(1) + 'K';
    return pop.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3 flex items-center justify-center gap-3">
            <Globe className="text-blue-400" size={48} />
            World Explorer
          </h1>
          <p className="text-blue-200 text-lg">Discover countries and their statistics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Total Countries</p>
                <p className="text-4xl font-bold text-white">{countries.length}</p>
              </div>
              <Globe className="text-white/30" size={48} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Population</p>
                <p className="text-4xl font-bold text-white">
                  {formatPopulation(countries.reduce((sum, c) => sum + c.population, 0))}
                </p>
              </div>
              <Users className="text-white/30" size={48} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Regions</p>
                <p className="text-4xl font-bold text-white">{regions.length - 1}</p>
              </div>
              <MapPin className="text-white/30" size={48} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="text-blue-400" size={24} />
              Top 10 by Population
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={populationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="#9ca3af" label={{ value: 'Million', angle: -90, position: 'insideLeft', fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar dataKey="population" fill="url(#populationGradient)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="populationGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Globe className="text-blue-400" size={24} />
              Countries by Region
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={regionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => \`\${name} \${(percent * 100).toFixed(0)}%\`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {regionData.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-6 border border-slate-700 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search countries..."
                className="w-full pl-12 pr-4 py-3 bg-slate-700/50 text-white placeholder-slate-400 rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-4 py-3 bg-slate-700/50 text-white rounded-xl border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {regions.map(region => (
                <option key={region} value={region}>
                  {region === 'all' ? 'All Regions' : region}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCountries.map((country, index) => (
              <motion.div
                key={country.name.common}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => setSelectedCountry(country)}
                className="bg-slate-800 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow cursor-pointer group"
              >
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={country.flags.png}
                    alt={\`\${country.name.common} flag\`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                </div>

                <div className="p-4">
                  <h3 className="text-white font-bold text-lg mb-2 truncate">{country.name.common}</h3>
                  <div className="space-y-1 text-sm">
                    <p className="text-slate-300">
                      <span className="text-slate-500">Capital:</span> {country.capital?.[0] || 'N/A'}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Population:</span> {formatPopulation(country.population)}
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">Region:</span> {country.region}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {selectedCountry && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-8"
              onClick={() => setSelectedCountry(null)}
            >
              <motion.div
                initial={{ scale: 0.8, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: 50 }}
                className="max-w-2xl w-full bg-slate-800 rounded-2xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative h-64">
                  <img
                    src={selectedCountry.flags.svg}
                    alt={\`\${selectedCountry.name.common} flag\`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setSelectedCountry(null)}
                    className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="text-white" size={24} />
                  </button>
                </div>

                <div className="p-8">
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedCountry.name.common}</h2>
                  <p className="text-slate-400 mb-6">{selectedCountry.name.official}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Capital</p>
                      <p className="text-white font-medium">{selectedCountry.capital?.[0] || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Region</p>
                      <p className="text-white font-medium">{selectedCountry.region}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Population</p>
                      <p className="text-white font-medium">{selectedCountry.population.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Area</p>
                      <p className="text-white font-medium">{selectedCountry.area.toLocaleString()} km²</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Subregion</p>
                      <p className="text-white font-medium">{selectedCountry.subregion || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Timezones</p>
                      <p className="text-white font-medium">{selectedCountry.timezones[0]}</p>
                    </div>
                    {selectedCountry.languages && (
                      <div className="col-span-2">
                        <p className="text-slate-500 mb-1">Languages</p>
                        <p className="text-white font-medium">
                          {Object.values(selectedCountry.languages).join(', ')}
                        </p>
                      </div>
                    )}
                    {selectedCountry.currencies && (
                      <div className="col-span-2">
                        <p className="text-slate-500 mb-1">Currency</p>
                        <p className="text-white font-medium">
                          {Object.values(selectedCountry.currencies).map(c => \`\${c.name} (\${c.symbol})\`).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}`,

  // Artifact 7: Recipe Finder & Meal Planner (400-480 lines)
  recipeFinder: `
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChefHat, Clock, Users, Bookmark, X, Calendar, Plus, Trash2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';

}


import { useState, useEffect, useMemo } from 'react';

export default function App() {

  const [searchQuery, setSearchQuery] = useState('');
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [savedMeals, setSavedMeals] = useState([]);
  const [plannedMeals, setPlannedMeals] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'Breakfast', 'Vegetarian', 'Dessert', 'Seafood', 'Pasta', 'Chicken'];
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealTimes = ['Breakfast', 'Lunch', 'Dinner'];

  useEffect(() => {
    fetchRandomMeals();
  }, []);

  const fetchRandomMeals = async () => {
    setLoading(true);
    try {
      const requests = Array(9).fill(null).map(() =>
        fetch('https://www.themealdb.com/api/json/v1/1/random.php').then(r => r.json())
      );
      const responses = await Promise.all(requests);
      const mealsData = responses.map(r => r.meals[0]).filter(Boolean);
      setMeals(mealsData);
    } catch (error) {
      console.error('Failed to fetch meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchMeals = async () => {
    if (!searchQuery.trim()) {
      fetchRandomMeals();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(\`https://www.themealdb.com/api/json/v1/1/search.php?s=\${searchQuery}\`);
      const data = await response.json();
      setMeals(data.meals || []);
    } catch (error) {
      console.error('Failed to search meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchByCategory = async (category) => {
    if (category === 'all') {
      fetchRandomMeals();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(\`https://www.themealdb.com/api/json/v1/1/filter.php?c=\${category}\`);
      const data = await response.json();

      if (data.meals) {
        const detailedMeals = await Promise.all(
          data.meals.slice(0, 9).map(async (meal) => {
            const detailResponse = await fetch(\`https://www.themealdb.com/api/json/v1/1/lookup.php?i=\${meal.idMeal}\`);
            const detailData = await detailResponse.json();
            return detailData.meals[0];
          })
        );
        setMeals(detailedMeals);
      }
    } catch (error) {
      console.error('Failed to fetch by category:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaveMeal = (meal) => {
    const isSaved = savedMeals.some(m => m.idMeal === meal.idMeal);
    if (isSaved) {
      setSavedMeals(savedMeals.filter(m => m.idMeal !== meal.idMeal));
    } else {
      setSavedMeals([...savedMeals, meal]);
    }
  };

  const addToMealPlan = (meal) => {
    const newPlannedMeal: PlannedMeal = {
      id: Date.now().toString(),
      meal,
      day,
      mealTime,
    };
    setPlannedMeals([...plannedMeals, newPlannedMeal]);
  };

  const removePlannedMeal = (id) => {
    setPlannedMeals(plannedMeals.filter(pm => pm.id !== id));
  };

  const getIngredients = (meal) => {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[\`strIngredient\${i}\`];
      const measure = meal[\`strMeasure\${i}\`];
      if (ingredient && ingredient.trim()) {
        ingredients.push({ ingredient, measure });
      }
    }
    return ingredients;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-950 via-red-900 to-pink-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3 flex items-center justify-center gap-3">
            <ChefHat className="text-orange-400" size={48} />
            Recipe Finder & Meal Planner
          </h1>
          <p className="text-orange-200 text-lg">Discover delicious recipes and plan your meals</p>
        </div>

        <Tabs.Root defaultValue="discover" className="w-full">
          <Tabs.List className="flex gap-2 mb-6 bg-slate-900/50 backdrop-blur rounded-xl p-2">
            <Tabs.Trigger
              value="discover"
              className="flex-1 px-6 py-3 rounded-lg font-semibold text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 transition-all"
            >
              Discover
            </Tabs.Trigger>
            <Tabs.Trigger
              value="saved"
              className="flex-1 px-6 py-3 rounded-lg font-semibold text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 transition-all"
            >
              Saved ({savedMeals.length})
            </Tabs.Trigger>
            <Tabs.Trigger
              value="planner"
              className="flex-1 px-6 py-3 rounded-lg font-semibold text-white data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 transition-all"
            >
              Meal Plan ({plannedMeals.length})
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="discover">
            <div className="bg-slate-900/50 backdrop-blur rounded-2xl p-6 border border-slate-700 mb-6">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchMeals()}
                    placeholder="Search recipes..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-800/50 text-white placeholder-slate-400 rounded-xl border border-slate-600 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                </div>
                <motion.button
                  onClick={searchMeals}
                  className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Search
                </motion.button>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <motion.button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      fetchByCategory(category);
                    }}
                    className={\`px-4 py-2 rounded-lg font-medium transition-all \${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }\`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {category === 'all' ? 'All' : category}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {meals.map((meal, index) => {
                  const isSaved = savedMeals.some(m => m.idMeal === meal.idMeal);
                  return (
                    <motion.div
                      key={meal.idMeal}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-slate-800 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow group"
                    >
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={meal.strMealThumb}
                          alt={meal.strMeal}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 cursor-pointer"
                          onClick={() => setSelectedMeal(meal)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />

                        <motion.button
                          onClick={() => toggleSaveMeal(meal)}
                          className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur rounded-full"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Bookmark
                            size={20}
                            className={isSaved ? 'text-orange-500 fill-orange-500' : 'text-white'}
                          />
                        </motion.button>
                      </div>

                      <div className="p-4">
                        <h3 className="text-white font-bold text-lg mb-2 line-clamp-1">{meal.strMeal}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                          <span className="flex items-center gap-1">
                            <ChefHat size={16} />
                            {meal.strCategory}
                          </span>
                          <span>{meal.strArea}</span>
                        </div>
                        <motion.button
                          onClick={() => setSelectedMeal(meal)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          View Recipe
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </Tabs.Content>

          <Tabs.Content value="saved">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedMeals.length === 0 ? (
                <div className="col-span-full text-center py-20">
                  <Bookmark className="mx-auto text-slate-600 mb-4" size={64} />
                  <p className="text-slate-400 text-xl">No saved recipes yet</p>
                </div>
              ) : (
                savedMeals.map((meal) => (
                  <motion.div
                    key={meal.idMeal}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-800 rounded-xl overflow-hidden shadow-xl"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <img src={meal.strMealThumb} alt={meal.strMeal} className="w-full h-full object-cover" />
                      <motion.button
                        onClick={() => toggleSaveMeal(meal)}
                        className="absolute top-3 right-3 p-2 bg-black/50 backdrop-blur rounded-full"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <X size={20} className="text-white" />
                      </motion.button>
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-bold text-lg mb-2">{meal.strMeal}</h3>
                      <motion.button
                        onClick={() => setSelectedMeal(meal)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        View Recipe
                      </motion.button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Tabs.Content>

          <Tabs.Content value="planner">
            <div className="bg-slate-900/50 backdrop-blur rounded-2xl p-6 border border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {daysOfWeek.map(day => (
                  <div key={day} className="bg-slate-800/50 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-3 text-center">{day}</h3>
                    <div className="space-y-2">
                      {mealTimes.map(mealTime => {
                        const planned = plannedMeals.find(pm => pm.day === day && pm.mealTime === mealTime);
                        return (
                          <div key={mealTime} className="bg-slate-900 rounded-lg p-2">
                            <p className="text-slate-400 text-xs mb-1">{mealTime}</p>
                            {planned ? (
                              <div className="relative group">
                                <p className="text-white text-sm line-clamp-2">{planned.meal.strMeal}</p>
                                <button
                                  onClick={() => removePlannedMeal(planned.id)}
                                  className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={12} className="text-white" />
                                </button>
                              </div>
                            ) : (
                              <Dialog.Root>
                                <Dialog.Trigger asChild>
                                  <button className="w-full py-1 border border-dashed border-slate-600 rounded text-slate-500 hover:border-orange-500 hover:text-orange-500 transition-colors">
                                    <Plus size={16} className="mx-auto" />
                                  </button>
                                </Dialog.Trigger>
                                <Dialog.Portal>
                                  <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
                                  <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto z-50">
                                    <Dialog.Title className="text-white font-bold text-xl mb-4">
                                      Add to {day} - {mealTime}
                                    </Dialog.Title>
                                    <div className="space-y-2">
                                      {savedMeals.map(meal => (
                                        <button
                                          key={meal.idMeal}
                                          onClick={() => {
                                            addToMealPlan(meal, day, mealTime);
                                          }}
                                          className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
                                        >
                                          {meal.strMeal}
                                        </button>
                                      ))}
                                    </div>
                                  </Dialog.Content>
                                </Dialog.Portal>
                              </Dialog.Root>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>

        <AnimatePresence>
          {selectedMeal && (
            <Dialog.Root open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/90 z-50" />
                <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto z-50">
                  <div className="relative h-64">
                    <img src={selectedMeal.strMealThumb} alt={selectedMeal.strMeal} className="w-full h-full object-cover" />
                    <Dialog.Close asChild>
                      <button className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur rounded-full hover:bg-black/70 transition-colors">
                        <X className="text-white" size={24} />
                      </button>
                    </Dialog.Close>
                  </div>

                  <div className="p-8">
                    <Dialog.Title className="text-3xl font-bold text-white mb-4">
                      {selectedMeal.strMeal}
                    </Dialog.Title>

                    <div className="flex items-center gap-4 mb-6 text-slate-400">
                      <span className="flex items-center gap-2">
                        <ChefHat size={20} />
                        {selectedMeal.strCategory}
                      </span>
                      <span>{selectedMeal.strArea}</span>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-xl font-bold text-white mb-3">Ingredients</h3>
                      <ul className="grid grid-cols-2 gap-2">
                        {getIngredients(selectedMeal).map((item, index) => (
                          <li key={index} className="text-slate-300 text-sm">
                            {item.measure} {item.ingredient}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white mb-3">Instructions</h3>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                        {selectedMeal.strInstructions}
                      </p>
                    </div>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}`,
};
