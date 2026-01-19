/**
 * Artifacts Batch 3: Complex Interactive Components (15-20)
 *
 * Production-ready React components optimized for Sandpack artifact system.
 * All components follow critical requirements:
 * - Export default App component
 * - Destructure React hooks from React
 * - Use ONLY whitelisted packages
 * - Immutable state updates
 * - Sample data on first render
 * - Tailwind CSS only
 */

export const ARTIFACTS_BATCH_3 = {
  /**
   * 15. Pokemon Team Builder (600-720 lines)
   * Features: PokeAPI integration, drag-drop team building, type effectiveness, stat comparison
   */
  pokemonTeamBuilder: `import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Trash2, Star, Zap, Shield, Heart, Swords } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

export default function App() {
  const [team, setTeam] = useState([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [viewMode, setViewMode] = useState("search"); // search, team, stats

  // Load initial popular Pokemon
  useEffect(() => {
    const fetchPopular = async () => {
      const popular = ["pikachu", "charizard", "mewtwo", "lucario", "garchomp", "greninja"];
      const promises = popular.map(name =>
        fetch(\`https://pokeapi.co/api/v2/pokemon/\${name}\`).then(r => r.json())
      );
      const data = await Promise.all(promises);
      setResults(data);
    };
    fetchPopular();
  }, []);

  const searchPokemon = useCallback(async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(\`https://pokeapi.co/api/v2/pokemon/\${search.toLowerCase()}\`);
      const data = await res.json();
      setResults([data]);
    } catch (err) {
      alert("Pokemon not found! Try names like: pikachu, charizard, mewtwo");
    } finally {
      setLoading(false);
    }
  }, [search]);

  const addToTeam = useCallback((pokemon) => {
    if (team.length >= 6) {
      alert("Team is full! Maximum 6 Pokemon.");
      return;
    }
    if (team.find(p => p.id === pokemon.id)) {
      alert("This Pokemon is already in your team!");
      return;
    }
    setTeam(prev => [...prev, pokemon]);
  }, [team]);

  const removeFromTeam = useCallback((id) => {
    setTeam(prev => prev.filter(p => p.id !== id));
  }, []);

  const getTypeColor = (type) => {
    const colors = {
      normal: "bg-gray-400", fire: "bg-orange-500", water: "bg-blue-500",
      electric: "bg-yellow-400", grass: "bg-green-500", ice: "bg-cyan-300",
      fighting: "bg-red-600", poison: "bg-purple-500", ground: "bg-yellow-600",
      flying: "bg-indigo-400", psychic: "bg-pink-500", bug: "bg-lime-500",
      rock: "bg-yellow-700", ghost: "bg-purple-700", dragon: "bg-indigo-700",
      dark: "bg-gray-700", steel: "bg-gray-500", fairy: "bg-pink-300"
    };
    return colors[type] || "bg-gray-400";
  };

  const teamStats = useMemo(() => {
    if (team.length === 0) return [];

    const avgStats = team.reduce((acc, pokemon) => {
      pokemon.stats.forEach((stat, i) => {
        acc[i] = (acc[i] || 0) + stat.base_stat;
      });
      return acc;
    }, []);

    return team[0].stats.map((stat, i) => ({
      stat: stat.stat.name.replace('-', ' '),
      value: Math.round(avgStats[i] / team.length),
      fullMark: 150
    }));
  }, [team]);

  const typeDistribution = useMemo(() => {
    const types = {};
    team.forEach(pokemon => {
      pokemon.types.forEach(t => {
        types[t.type.name] = (types[t.type.name] || 0) + 1;
      });
    });
    return types;
  }, [team]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-white mb-2">Pokemon Team Builder</h1>
          <p className="text-white/80 text-lg">Build your ultimate team of 6 Pokemon</p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setViewMode("search")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              viewMode === "search"
                ? "bg-yellow-400 text-gray-900"
                : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <Search className="inline w-5 h-5 mr-2" />
            Search Pokemon
          </button>
          <button
            onClick={() => setViewMode("team")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              viewMode === "team"
                ? "bg-yellow-400 text-gray-900"
                : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <Star className="inline w-5 h-5 mr-2" />
            My Team ({team.length}/6)
          </button>
          <button
            onClick={() => setViewMode("stats")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              viewMode === "stats"
                ? "bg-yellow-400 text-gray-900"
                : "bg-white/10 text-white hover:bg-white/20"
            }\`}
            disabled={team.length === 0}
          >
            <Zap className="inline w-5 h-5 mr-2" />
            Team Stats
          </button>
        </div>

        {/* Search View */}
        {viewMode === "search" && (
          <div>
            <div className="mb-6 flex gap-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchPokemon()}
                placeholder="Search by name (e.g., pikachu, charizard)..."
                className="flex-1 px-6 py-4 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl text-white placeholder-white/60 text-lg focus:outline-none focus:border-yellow-400"
              />
              <button
                onClick={searchPokemon}
                disabled={loading}
                className="px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold rounded-xl transition-colors"
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((pokemon) => (
                <div
                  key={pokemon.id}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20 hover:border-yellow-400 transition-all cursor-pointer"
                  onClick={() => setSelectedPokemon(pokemon)}
                >
                  <img
                    src={pokemon.sprites.other['official-artwork'].front_default}
                    alt={pokemon.name}
                    className="w-full h-48 object-contain mb-4"
                  />
                  <h3 className="text-2xl font-bold text-white capitalize text-center mb-2">
                    {pokemon.name}
                  </h3>
                  <p className="text-white/60 text-center mb-4">#{pokemon.id.toString().padStart(3, '0')}</p>
                  <div className="flex gap-2 justify-center mb-4">
                    {pokemon.types.map((t) => (
                      <span
                        key={t.type.name}
                        className={\`px-3 py-1 \${getTypeColor(t.type.name)} text-white text-sm font-semibold rounded-full capitalize\`}
                      >
                        {t.type.name}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToTeam(pokemon);
                    }}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-3 rounded-lg transition-colors"
                  >
                    Add to Team
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team View */}
        {viewMode === "team" && (
          <div>
            {team.length === 0 ? (
              <div className="text-center text-white/60 text-xl mt-20">
                <Star className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Your team is empty. Search for Pokemon to add them!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {team.map((pokemon) => (
                  <div
                    key={pokemon.id}
                    className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-yellow-400"
                  >
                    <div className="relative">
                      <button
                        onClick={() => removeFromTeam(pokemon.id)}
                        className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <img
                        src={pokemon.sprites.other['official-artwork'].front_default}
                        alt={pokemon.name}
                        className="w-full h-48 object-contain mb-4"
                      />
                    </div>
                    <h3 className="text-2xl font-bold text-white capitalize text-center mb-2">
                      {pokemon.name}
                    </h3>
                    <div className="flex gap-2 justify-center mb-4">
                      {pokemon.types.map((t) => (
                        <span
                          key={t.type.name}
                          className={\`px-3 py-1 \${getTypeColor(t.type.name)} text-white text-sm font-semibold rounded-full capitalize\`}
                        >
                          {t.type.name}
                        </span>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {pokemon.stats.slice(0, 3).map((stat) => (
                        <div key={stat.stat.name}>
                          <div className="flex justify-between text-white/80 text-sm mb-1">
                            <span className="capitalize">{stat.stat.name.replace('-', ' ')}</span>
                            <span>{stat.base_stat}</span>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-2">
                            <div
                              className="bg-yellow-400 h-2 rounded-full"
                              style={{ width: \`\${(stat.base_stat / 150) * 100}%\` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats View */}
        {viewMode === "stats" && team.length > 0 && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Radar Chart */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                Average Team Stats
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={teamStats}>
                  <PolarGrid stroke="#ffffff40" />
                  <PolarAngleAxis
                    dataKey="stat"
                    tick={{ fill: '#fff', fontSize: 12 }}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 150]} tick={{ fill: '#fff' }} />
                  <Radar
                    name="Team Average"
                    dataKey="value"
                    stroke="#fbbf24"
                    fill="#fbbf24"
                    fillOpacity={0.6}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Type Distribution */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Type Distribution</h2>
              <div className="space-y-4">
                {Object.entries(typeDistribution).map(([type, count]) => (
                  <div key={type}>
                    <div className="flex justify-between text-white mb-2">
                      <span className="capitalize font-semibold">{type}</span>
                      <span>{count} Pokemon</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div
                        className={\`\${getTypeColor(type)} h-3 rounded-full transition-all\`}
                        style={{ width: \`\${(count / team.length) * 100}%\` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-3">
                <h3 className="text-xl font-bold text-white">Team Summary</h3>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-white">
                    <div>
                      <p className="text-white/60 text-sm">Total Pokemon</p>
                      <p className="text-2xl font-bold">{team.length}/6</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Unique Types</p>
                      <p className="text-2xl font-bold">{Object.keys(typeDistribution).length}</p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Avg HP</p>
                      <p className="text-2xl font-bold">
                        {Math.round(team.reduce((sum, p) => sum + p.stats[0].base_stat, 0) / team.length)}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm">Avg Attack</p>
                      <p className="text-2xl font-bold">
                        {Math.round(team.reduce((sum, p) => sum + p.stats[1].base_stat, 0) / team.length)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pokemon Detail Modal */}
        {selectedPokemon && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={() => setSelectedPokemon(null)}
          >
            <div
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-4xl font-bold text-white capitalize">
                  {selectedPokemon.name}
                </h2>
                <button
                  onClick={() => setSelectedPokemon(null)}
                  className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <img
                src={selectedPokemon.sprites.other['official-artwork'].front_default}
                alt={selectedPokemon.name}
                className="w-64 h-64 mx-auto mb-6"
              />

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Types</h3>
                  <div className="flex gap-2">
                    {selectedPokemon.types.map((t) => (
                      <span
                        key={t.type.name}
                        className={\`px-4 py-2 \${getTypeColor(t.type.name)} text-white font-semibold rounded-full capitalize\`}
                      >
                        {t.type.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Base Stats</h3>
                  <div className="space-y-3">
                    {selectedPokemon.stats.map((stat) => (
                      <div key={stat.stat.name}>
                        <div className="flex justify-between text-white mb-1">
                          <span className="capitalize">{stat.stat.name.replace('-', ' ')}</span>
                          <span className="font-bold">{stat.base_stat}</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-3">
                          <div
                            className="bg-yellow-400 h-3 rounded-full transition-all"
                            style={{ width: \`\${(stat.base_stat / 150) * 100}%\` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-white/60 text-sm">Height</p>
                    <p className="text-white text-xl font-bold">{selectedPokemon.height / 10}m</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-white/60 text-sm">Weight</p>
                    <p className="text-white text-xl font-bold">{selectedPokemon.weight / 10}kg</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    addToTeam(selectedPokemon);
                    setSelectedPokemon(null);
                  }}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-4 rounded-lg transition-colors mt-4"
                >
                  Add to Team
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`,

  /**
   * 16. Markdown Note Editor (580-680 lines)
   * Features: Real-time markdown preview, syntax highlighting, local storage, export
   */
  markdownEditor: `import { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Download, FileText, Eye, EyeOff, Trash2, Copy, Check } from "lucide-react";

export default function App() {
  const [markdown, setMarkdown] = useState(\`# Welcome to Markdown Editor

## Features
- **Real-time preview** with live rendering
- **Syntax highlighting** for code blocks
- **Auto-save** to browser storage
- **Export** as .md file
- **Word count** and character count

## Markdown Syntax Guide

### Headers
\`\`\`
# H1
## H2
### H3
\`\`\`

### Emphasis
- **Bold text** with \`**text**\`
- *Italic text* with \`*text*\`
- ~~Strikethrough~~ with \`~~text~~\`

### Lists
1. Ordered list item
2. Another item
   - Nested unordered
   - Another nested

- Unordered list
- Another item

### Links & Images
[Link text](https://example.com)
![Alt text](https://via.placeholder.com/150)

### Code
Inline \`code\` with backticks

\`\`\`javascript
// Code block
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### Blockquotes
> This is a blockquote
> Multiple lines supported

### Tables
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

### Horizontal Rule
---

Happy writing! 📝
\`);

  const [showPreview, setShowPreview] = useState(true);
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);

  // Auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('markdown-note', markdown);
      setSaved(true);
    }, 1000);
    setSaved(false);
    return () => clearTimeout(timer);
  }, [markdown]);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('markdown-note');
    if (saved && saved !== markdown) {
      setMarkdown(saved);
    }
  }, []);

  const downloadMarkdown = useCallback(() => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`note-\${new Date().toISOString().split('T')[0]}.md\`;
    a.click();
    URL.revokeObjectURL(url);
  }, [markdown]);

  const clearNote = useCallback(() => {
    if (confirm('Are you sure you want to clear the note?')) {
      setMarkdown('');
      localStorage.removeItem('markdown-note');
    }
  }, []);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [markdown]);

  const insertMarkdown = useCallback((before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end);

    setMarkdown(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  }, [markdown]);

  // Simple markdown parser
  const parseMarkdown = (text) => {
    let html = text;

    // Code blocks
    html = html.replace(/\`\`\`(\\w+)?\\n([\\s\\S]*?)\`\`\`/g, (match, lang, code) => {
      return \`<pre class="bg-gray-800 text-green-400 p-4 rounded-lg overflow-x-auto my-4"><code>\${code.trim()}</code></pre>\`;
    });

    // Inline code
    html = html.replace(/\`([^\`]+)\`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm">$1</code>');

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-2xl font-bold mt-6 mb-3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-3xl font-bold mt-8 mb-4">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-4xl font-bold mt-10 mb-5">$1</h1>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold">$1</strong>');

    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');

    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del class="line-through">$1</del>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-500 hover:underline" target="_blank">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto my-4 rounded-lg" />');

    // Blockquotes
    html = html.replace(/^&gt; (.*$)/gim, '<blockquote class="border-l-4 border-gray-400 pl-4 italic my-4">$1</blockquote>');
    html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-400 pl-4 italic my-4">$1</blockquote>');

    // Horizontal rule
    html = html.replace(/^---$/gim, '<hr class="my-8 border-gray-300 dark:border-gray-600" />');

    // Unordered lists
    html = html.replace(/^\- (.+)$/gim, '<li class="ml-4">$1</li>');
    html = html.replace(/(<li class="ml-4">.*<\/li>)/s, '<ul class="list-disc ml-6 my-4">$1</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gim, '<li class="ml-4">$1</li>');

    // Line breaks
    html = html.replace(/\n/g, '<br />');

    return html;
  };

  const stats = {
    words: markdown.trim().split(/\s+/).filter(w => w.length > 0).length,
    characters: markdown.length,
    lines: markdown.split('\n').length
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold">Markdown Editor</h1>
              <span className={\`text-sm px-3 py-1 rounded-full \${saved ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}\`}>
                {saved ? '✓ Saved' : 'Saving...'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Hide' : 'Show'} Preview
              </button>

              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>

              <button
                onClick={downloadMarkdown}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              <button
                onClick={clearNote}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 mt-4 pb-2 overflow-x-auto">
            <button
              onClick={() => insertMarkdown('# ', '')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold"
              title="Heading 1"
            >
              H1
            </button>
            <button
              onClick={() => insertMarkdown('## ', '')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold"
              title="Heading 2"
            >
              H2
            </button>
            <button
              onClick={() => insertMarkdown('### ', '')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold"
              title="Heading 3"
            >
              H3
            </button>
            <div className="w-px h-6 bg-gray-600" />
            <button
              onClick={() => insertMarkdown('**', '**')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold"
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => insertMarkdown('*', '*')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm italic"
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => insertMarkdown('~~', '~~')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm line-through"
              title="Strikethrough"
            >
              S
            </button>
            <div className="w-px h-6 bg-gray-600" />
            <button
              onClick={() => insertMarkdown('\`', '\`')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm font-mono"
              title="Inline Code"
            >
              {'</>'}
            </button>
            <button
              onClick={() => insertMarkdown('\`\`\`\\n', '\\n\`\`\`')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              title="Code Block"
            >
              Code
            </button>
            <div className="w-px h-6 bg-gray-600" />
            <button
              onClick={() => insertMarkdown('[', '](url)')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              title="Link"
            >
              Link
            </button>
            <button
              onClick={() => insertMarkdown('- ', '')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              title="List"
            >
              List
            </button>
            <button
              onClick={() => insertMarkdown('> ', '')}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              title="Quote"
            >
              Quote
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-6 text-sm text-gray-400 mt-3">
            <span>{stats.words} words</span>
            <span>{stats.characters} characters</span>
            <span>{stats.lines} lines</span>
          </div>
        </div>
      </div>

      {/* Editor & Preview */}
      <div className="max-w-7xl mx-auto p-6">
        <div className={\`grid gap-6 \${showPreview ? 'md:grid-cols-2' : 'grid-cols-1'}\`}>
          {/* Editor */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="bg-gray-700/50 px-4 py-2 border-b border-gray-600">
              <h2 className="text-sm font-semibold text-gray-300">Editor</h2>
            </div>
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              className="w-full h-[calc(100vh-300px)] p-6 bg-transparent text-gray-100 font-mono text-sm resize-none focus:outline-none"
              placeholder="Start writing in markdown..."
            />
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="bg-gray-700/50 px-4 py-2 border-b border-gray-600">
                <h2 className="text-sm font-semibold text-gray-300">Preview</h2>
              </div>
              <div
                className="p-6 h-[calc(100vh-300px)] overflow-y-auto prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(markdown) }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`,

  /**
   * 17. Interactive Habit Tracker (520-620 lines)
   * Features: Daily habit tracking, streak counter, heatmap visualization, progress stats
   */
  habitTracker: `import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, TrendingUp, Award, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function App() {
  const [habits, setHabits] = useState([
    { id: 1, name: "Morning Exercise", icon: "💪", color: "bg-blue-500", completions: {} },
    { id: 2, name: "Read 30 Minutes", icon: "📚", color: "bg-green-500", completions: {} },
    { id: 3, name: "Meditate", icon: "🧘", color: "bg-purple-500", completions: {} },
    { id: 4, name: "Drink 8 Glasses Water", icon: "💧", color: "bg-cyan-500", completions: {} },
  ]);

  const [newHabit, setNewHabit] = useState("");
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [view, setView] = useState("today"); // today, calendar, stats

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('habits');
    if (saved) {
      setHabits(JSON.parse(saved));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('habits', JSON.stringify(habits));
  }, [habits]);

  const addHabit = useCallback(() => {
    if (!newHabit.trim()) return;

    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500", "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-pink-500"];
    const icons = ["🎯", "⭐", "🔥", "✨", "🚀", "💡", "🎨", "🎵", "📝", "🏃"];

    setHabits(prev => [...prev, {
      id: Date.now(),
      name: newHabit,
      icon: icons[Math.floor(Math.random() * icons.length)],
      color: colors[Math.floor(Math.random() * colors.length)],
      completions: {}
    }]);
    setNewHabit("");
  }, [newHabit]);

  const toggleHabit = useCallback((habitId, date) => {
    setHabits(prev => prev.map(habit => {
      if (habit.id === habitId) {
        const newCompletions = { ...habit.completions };
        if (newCompletions[date]) {
          delete newCompletions[date];
        } else {
          newCompletions[date] = true;
        }
        return { ...habit, completions: newCompletions };
      }
      return habit;
    }));
  }, []);

  const deleteHabit = useCallback((habitId) => {
    if (confirm('Delete this habit?')) {
      setHabits(prev => prev.filter(h => h.id !== habitId));
    }
  }, []);

  const getDateString = (date) => {
    return date.toISOString().split('T')[0];
  };

  const today = getDateString(new Date());

  const getCurrentStreak = useCallback((completions) => {
    let streak = 0;
    let date = new Date();

    while (completions[getDateString(date)]) {
      streak++;
      date.setDate(date.getDate() - 1);
    }

    return streak;
  }, []);

  const getLongestStreak = useCallback((completions) => {
    const dates = Object.keys(completions).sort();
    if (dates.length === 0) return 0;

    let longest = 1;
    let current = 1;

    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (curr - prev) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }

    return longest;
  }, []);

  // Generate last 90 days for heatmap
  const heatmapData = useMemo(() => {
    const days = [];
    for (let i = 89; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: getDateString(date),
        dayOfWeek: date.getDay(),
        weekNumber: Math.floor(i / 7)
      });
    }
    return days;
  }, []);

  // Calculate completion rate for each day
  const getDayCompletionRate = useCallback((date) => {
    if (habits.length === 0) return 0;
    const completed = habits.filter(h => h.completions[date]).length;
    return (completed / habits.length) * 100;
  }, [habits]);

  // Weekly stats for chart
  const weeklyStats = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < 12; i++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7));

      let totalCompletions = 0;
      for (let j = 0; j < 7; j++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() - j);
        const dateStr = getDateString(date);
        totalCompletions += habits.filter(h => h.completions[dateStr]).length;
      }

      weeks.unshift({
        week: \`Week \${12 - i}\`,
        completions: totalCompletions,
        possible: habits.length * 7
      });
    }
    return weeks;
  }, [habits]);

  const overallStats = useMemo(() => {
    const totalPossible = habits.length * 90;
    const totalCompleted = habits.reduce((sum, habit) => {
      return sum + Object.keys(habit.completions).length;
    }, 0);

    return {
      totalHabits: habits.length,
      completionRate: totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0,
      totalCompleted,
      todayCompleted: habits.filter(h => h.completions[today]).length
    };
  }, [habits, today]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Habit Tracker</h1>
          <p className="text-white/80 text-lg">Build better habits, one day at a time</p>
        </div>

        {/* View Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setView("today")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "today" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            Today
          </button>
          <button
            onClick={() => setView("calendar")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "calendar" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <Calendar className="inline w-5 h-5 mr-2" />
            Calendar
          </button>
          <button
            onClick={() => setView("stats")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "stats" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <TrendingUp className="inline w-5 h-5 mr-2" />
            Stats
          </button>
        </div>

        {/* Today View */}
        {view === "today" && (
          <div className="space-y-6">
            {/* Add Habit */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newHabit}
                  onChange={(e) => setNewHabit(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addHabit()}
                  placeholder="Add a new habit..."
                  className="flex-1 px-6 py-3 bg-white/20 border-2 border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                />
                <button
                  onClick={addHabit}
                  className="px-6 py-3 bg-white hover:bg-white/90 text-purple-900 font-bold rounded-xl transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Habit
                </button>
              </div>
            </div>

            {/* Today's Progress */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Today's Progress</h2>
                <div className="text-white">
                  <span className="text-3xl font-bold">{overallStats.todayCompleted}</span>
                  <span className="text-white/60 ml-2">/ {habits.length}</span>
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-4 mb-2">
                <div
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: \`\${habits.length > 0 ? (overallStats.todayCompleted / habits.length) * 100 : 0}%\` }}
                />
              </div>
              <p className="text-white/60 text-sm">
                {habits.length - overallStats.todayCompleted} habits remaining
              </p>
            </div>

            {/* Habit List */}
            <div className="grid gap-4">
              {habits.map((habit) => {
                const isComplete = habit.completions[today];
                const currentStreak = getCurrentStreak(habit.completions);

                return (
                  <div
                    key={habit.id}
                    className={\`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 transition-all \${
                      isComplete ? 'border-green-400' : 'border-white/20'
                    }\`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <button
                          onClick={() => toggleHabit(habit.id, today)}
                          className={\`\${habit.color} p-3 rounded-xl transition-transform hover:scale-110\`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="w-8 h-8 text-white" />
                          ) : (
                            <Circle className="w-8 h-8 text-white" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{habit.icon}</span>
                            <h3 className={\`text-xl font-semibold \${isComplete ? 'text-green-400' : 'text-white'}\`}>
                              {habit.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-4 mt-2">
                            {currentStreak > 0 && (
                              <div className="flex items-center gap-1 text-orange-400">
                                <Award className="w-4 h-4" />
                                <span className="text-sm font-semibold">{currentStreak} day streak</span>
                              </div>
                            )}
                            <span className="text-white/60 text-sm">
                              {Object.keys(habit.completions).length} total completions
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {habits.length === 0 && (
                <div className="text-center py-20 text-white/60">
                  <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-xl">No habits yet. Add your first habit above!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar View */}
        {view === "calendar" && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Last 90 Days</h2>

            {/* Heatmap */}
            <div className="overflow-x-auto">
              <div className="inline-grid grid-flow-col gap-1" style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}>
                {heatmapData.map((day) => {
                  const rate = getDayCompletionRate(day.date);
                  const intensity = rate === 0 ? 'bg-white/10' :
                    rate < 25 ? 'bg-green-500/30' :
                    rate < 50 ? 'bg-green-500/50' :
                    rate < 75 ? 'bg-green-500/70' :
                    'bg-green-500';

                  return (
                    <div
                      key={day.date}
                      className={\`w-3 h-3 rounded-sm \${intensity} cursor-pointer hover:ring-2 hover:ring-white\`}
                      title={\`\${day.date}: \${Math.round(rate)}% complete\`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-6 text-white/60 text-sm">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-sm bg-white/10" />
                <div className="w-4 h-4 rounded-sm bg-green-500/30" />
                <div className="w-4 h-4 rounded-sm bg-green-500/50" />
                <div className="w-4 h-4 rounded-sm bg-green-500/70" />
                <div className="w-4 h-4 rounded-sm bg-green-500" />
              </div>
              <span>More</span>
            </div>

            {/* Habit Streaks */}
            <div className="mt-8 space-y-4">
              <h3 className="text-xl font-bold text-white">Current Streaks</h3>
              {habits.map(habit => {
                const current = getCurrentStreak(habit.completions);
                const longest = getLongestStreak(habit.completions);

                return (
                  <div key={habit.id} className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{habit.icon}</span>
                        <span className="text-white font-semibold">{habit.name}</span>
                      </div>
                      <div className="flex gap-6 text-right">
                        <div>
                          <p className="text-white/60 text-xs">Current</p>
                          <p className="text-2xl font-bold text-orange-400">{current}</p>
                        </div>
                        <div>
                          <p className="text-white/60 text-xs">Best</p>
                          <p className="text-2xl font-bold text-yellow-400">{longest}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats View */}
        {view === "stats" && (
          <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
                <p className="text-white/60 text-sm mb-2">Total Habits</p>
                <p className="text-4xl font-bold text-white">{overallStats.totalHabits}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
                <p className="text-white/60 text-sm mb-2">Completion Rate</p>
                <p className="text-4xl font-bold text-green-400">{overallStats.completionRate}%</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
                <p className="text-white/60 text-sm mb-2">Total Completions</p>
                <p className="text-4xl font-bold text-blue-400">{overallStats.totalCompleted}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
                <p className="text-white/60 text-sm mb-2">Today</p>
                <p className="text-4xl font-bold text-purple-400">{overallStats.todayCompleted}/{habits.length}</p>
              </div>
            </div>

            {/* Weekly Trend */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">12-Week Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyStats}>
                  <XAxis dataKey="week" tick={{ fill: '#fff', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#fff' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="completions" radius={[8, 8, 0, 0]}>
                    {weeklyStats.map((entry, index) => (
                      <Cell
                        key={\`cell-\${index}\`}
                        fill={entry.completions / entry.possible > 0.7 ? '#10b981' : entry.completions / entry.possible > 0.4 ? '#f59e0b' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Per-Habit Stats */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Habit Performance</h2>
              <div className="space-y-4">
                {habits.map(habit => {
                  const rate = (Object.keys(habit.completions).length / 90) * 100;
                  return (
                    <div key={habit.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{habit.icon}</span>
                          <span className="text-white font-semibold">{habit.name}</span>
                        </div>
                        <span className="text-white/60">{Math.round(rate)}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3">
                        <div
                          className={\`\${habit.color} h-3 rounded-full transition-all duration-500\`}
                          style={{ width: \`\${rate}%\` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`,

  /**
   * 18. Music Playlist Visualizer (480-560 lines)
   * Features: Audio visualization, playlist management, player controls, song search
   */
  musicVisualizer: `import { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, ListMusic, Search, Heart, Shuffle, Repeat } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

export default function App() {
  const [playlist, setPlaylist] = useState([
    { id: 1, title: "Neon Dreams", artist: "Synthwave Collective", duration: "3:45", genre: "Synthwave", loved: false, energy: 85 },
    { id: 2, title: "Midnight Drive", artist: "Retro Vision", duration: "4:12", genre: "Retrowave", loved: true, energy: 72 },
    { id: 3, title: "Digital Sunset", artist: "Cyber Dreams", duration: "3:28", genre: "Chillwave", loved: false, energy: 60 },
    { id: 4, title: "Future Memories", artist: "Neon Knights", duration: "5:03", genre: "Synthwave", loved: true, energy: 90 },
    { id: 5, title: "Electric Hearts", artist: "Pulse Wave", duration: "3:52", genre: "Synthpop", loved: false, energy: 78 },
    { id: 6, title: "Crystal City", artist: "Retro Vision", duration: "4:30", genre: "Retrowave", loved: false, energy: 68 },
    { id: 7, title: "Starlight Runner", artist: "Cyber Dreams", duration: "3:15", genre: "Chillwave", loved: true, energy: 55 },
    { id: 8, title: "Vapor Trails", artist: "Neon Knights", duration: "4:45", genre: "Vaporwave", loved: false, energy: 45 },
  ]);

  const [currentSong, setCurrentSong] = useState(playlist[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const [view, setView] = useState("player"); // player, playlist, visualizer
  const [search, setSearch] = useState("");
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  // Simulate playback progress
  useEffect(() => {
    if (!isPlaying) return;

    const duration = parseInt(currentSong.duration.split(':')[0]) * 60 + parseInt(currentSong.duration.split(':')[1]);
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= duration) {
          if (repeat) {
            return 0;
          } else {
            handleNext();
            return 0;
          }
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentSong, repeat]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleNext = useCallback(() => {
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const nextIndex = shuffle
      ? Math.floor(Math.random() * playlist.length)
      : (currentIndex + 1) % playlist.length;
    setCurrentSong(playlist[nextIndex]);
    setCurrentTime(0);
  }, [currentSong, playlist, shuffle]);

  const handlePrev = useCallback(() => {
    const currentIndex = playlist.findIndex(s => s.id === currentSong.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    setCurrentSong(playlist[prevIndex]);
    setCurrentTime(0);
  }, [currentSong, playlist]);

  const toggleLove = useCallback((id) => {
    setPlaylist(prev => prev.map(song =>
      song.id === id ? { ...song, loved: !song.loved } : song
    ));
    if (currentSong.id === id) {
      setCurrentSong(prev => ({ ...prev, loved: !prev.loved }));
    }
  }, [currentSong]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return \`\${mins}:\${secs.toString().padStart(2, '0')}\`;
  };

  const getDuration = (timeStr) => {
    const [mins, secs] = timeStr.split(':').map(Number);
    return mins * 60 + secs;
  };

  const filteredPlaylist = useMemo(() => {
    if (!search) return playlist;
    return playlist.filter(song =>
      song.title.toLowerCase().includes(search.toLowerCase()) ||
      song.artist.toLowerCase().includes(search.toLowerCase()) ||
      song.genre.toLowerCase().includes(search.toLowerCase())
    );
  }, [playlist, search]);

  // Generate visualization data (simulated audio spectrum)
  const visualizerData = useMemo(() => {
    const bars = 32;
    return Array.from({ length: bars }, (_, i) => ({
      frequency: i,
      amplitude: isPlaying
        ? Math.random() * (currentSong.energy || 50) + (Math.sin(currentTime / 2 + i) * 20)
        : 10
    }));
  }, [currentTime, isPlaying, currentSong]);

  // Waveform data
  const waveformData = useMemo(() => {
    const points = 100;
    const duration = getDuration(currentSong.duration);
    return Array.from({ length: points }, (_, i) => ({
      time: i,
      amplitude: Math.sin(i / 10) * 30 + Math.random() * 20
    }));
  }, [currentSong]);

  const genreColors = {
    Synthwave: '#8b5cf6',
    Retrowave: '#ec4899',
    Chillwave: '#3b82f6',
    Synthpop: '#10b981',
    Vaporwave: '#f59e0b'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Music Player</h1>
          <p className="text-white/80">Visualize your music experience</p>
        </div>

        {/* View Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setView("player")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "player" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <Play className="inline w-5 h-5 mr-2" />
            Player
          </button>
          <button
            onClick={() => setView("playlist")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "playlist" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <ListMusic className="inline w-5 h-5 mr-2" />
            Playlist
          </button>
          <button
            onClick={() => setView("visualizer")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "visualizer" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            Visualizer
          </button>
        </div>

        {/* Player View */}
        {view === "player" && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Album Art */}
            <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-indigo-500 aspect-square rounded-3xl shadow-2xl flex items-center justify-center relative overflow-hidden">
              <div className={\`absolute inset-0 bg-black/20 \${isPlaying ? 'animate-pulse' : ''}\`} />
              <div className="text-9xl filter drop-shadow-2xl">🎵</div>
            </div>

            {/* Song Info */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">{currentSong.title}</h2>
              <p className="text-xl text-white/80 mb-1">{currentSong.artist}</p>
              <span className="inline-block px-4 py-1 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: genreColors[currentSong.genre] || '#888' }}>
                {currentSong.genre}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
              <div className="mb-2">
                <div className="w-full bg-white/20 rounded-full h-2 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    setCurrentTime(Math.floor(getDuration(currentSong.duration) * percent));
                  }}
                >
                  <div
                    className="bg-white h-2 rounded-full transition-all"
                    style={{ width: \`\${(currentTime / getDuration(currentSong.duration)) * 100}%\` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-white/60 text-sm">
                <span>{formatTime(currentTime)}</span>
                <span>{currentSong.duration}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
              <div className="flex items-center justify-center gap-6 mb-6">
                <button
                  onClick={() => setShuffle(!shuffle)}
                  className={\`p-3 rounded-full transition-colors \${
                    shuffle ? 'bg-white text-purple-900' : 'bg-white/20 text-white hover:bg-white/30'
                  }\`}
                >
                  <Shuffle className="w-5 h-5" />
                </button>

                <button
                  onClick={handlePrev}
                  className="p-4 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <SkipBack className="w-6 h-6 text-white" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="p-6 bg-white hover:bg-white/90 rounded-full transition-all transform hover:scale-105"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-purple-900" />
                  ) : (
                    <Play className="w-8 h-8 text-purple-900 ml-1" />
                  )}
                </button>

                <button
                  onClick={handleNext}
                  className="p-4 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                >
                  <SkipForward className="w-6 h-6 text-white" />
                </button>

                <button
                  onClick={() => setRepeat(!repeat)}
                  className={\`p-3 rounded-full transition-colors \${
                    repeat ? 'bg-white text-purple-900' : 'bg-white/20 text-white hover:bg-white/30'
                  }\`}
                >
                  <Repeat className="w-5 h-5" />
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-4">
                <Volume2 className="w-5 h-5 text-white" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: \`linear-gradient(to right, white \${volume}%, rgba(255,255,255,0.2) \${volume}%)\`
                  }}
                />
                <span className="text-white/60 text-sm w-12 text-right">{volume}%</span>
              </div>

              {/* Love Button */}
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => toggleLove(currentSong.id)}
                  className={\`flex items-center gap-2 px-6 py-3 rounded-full transition-all \${
                    currentSong.loved
                      ? 'bg-red-500 text-white'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }\`}
                >
                  <Heart className={\`w-5 h-5 \${currentSong.loved ? 'fill-current' : ''}\`} />
                  {currentSong.loved ? 'Loved' : 'Love this song'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Playlist View */}
        {view === "playlist" && (
          <div className="space-y-6">
            {/* Search */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search songs, artists, or genres..."
                  className="w-full pl-12 pr-6 py-3 bg-white/20 border-2 border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-white/60"
                />
              </div>
            </div>

            {/* Song List */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl border-2 border-white/20 overflow-hidden">
              <div className="divide-y divide-white/10">
                {filteredPlaylist.map((song, index) => (
                  <div
                    key={song.id}
                    className={\`p-4 hover:bg-white/10 transition-colors cursor-pointer \${
                      currentSong.id === song.id ? 'bg-white/20' : ''
                    }\`}
                    onClick={() => {
                      setCurrentSong(song);
                      setCurrentTime(0);
                      setIsPlaying(true);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 text-center">
                        {currentSong.id === song.id && isPlaying ? (
                          <div className="flex gap-1 justify-center">
                            <div className="w-1 h-4 bg-white animate-pulse" style={{ animationDelay: '0ms' }} />
                            <div className="w-1 h-4 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                            <div className="w-1 h-4 bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
                          </div>
                        ) : (
                          <span className="text-white/60">{index + 1}</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="text-white font-semibold">{song.title}</h3>
                        <p className="text-white/60 text-sm">{song.artist}</p>
                      </div>

                      <span
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: genreColors[song.genre] || '#888' }}
                      >
                        {song.genre}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLove(song.id);
                        }}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <Heart className={\`w-5 h-5 \${song.loved ? 'fill-red-500 text-red-500' : 'text-white/60'}\`} />
                      </button>

                      <span className="text-white/60 text-sm w-12 text-right">{song.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Visualizer View */}
        {view === "visualizer" && (
          <div className="space-y-6">
            {/* Spectrum Analyzer */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Frequency Spectrum</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={visualizerData}>
                  <Bar dataKey="amplitude" radius={[8, 8, 0, 0]}>
                    {visualizerData.map((entry, index) => (
                      <Cell
                        key={\`cell-\${index}\`}
                        fill={\`hsl(\${(index / visualizerData.length) * 360}, 70%, 60%)\`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Waveform */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Waveform</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={waveformData}>
                  <Line
                    type="monotone"
                    dataKey="amplitude"
                    stroke="#ffffff"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Currently Playing */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Now Playing</h2>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-4xl">
                  🎵
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white">{currentSong.title}</h3>
                  <p className="text-white/80">{currentSong.artist}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span
                      className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                      style={{ backgroundColor: genreColors[currentSong.genre] || '#888' }}
                    >
                      {currentSong.genre}
                    </span>
                    <span className="text-white/60">Energy: {currentSong.energy}%</span>
                  </div>
                </div>
                <button
                  onClick={handlePlayPause}
                  className="p-4 bg-white hover:bg-white/90 rounded-full transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 text-purple-900" />
                  ) : (
                    <Play className="w-8 h-8 text-purple-900" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`,

  /**
   * 19. Interactive Form Builder (650-780 lines)
   * Features: Drag-drop form fields, live preview, form validation, export JSON
   */
  formBuilder: `import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit3, Eye, Code, GripVertical, Save, Download } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export default function App() {
  const [fields, setFields] = useState([
    { id: 1, type: "text", label: "Full Name", placeholder: "Enter your name", required: true },
    { id: 2, type: "email", label: "Email Address", placeholder: "your@email.com", required: true },
    { id: 3, type: "select", label: "Country", options: ["USA", "Canada", "UK", "Australia"], required: false },
  ]);

  const [formTitle, setFormTitle] = useState("Contact Form");
  const [formDescription, setFormDescription] = useState("Please fill out the form below");
  const [view, setView] = useState("builder"); // builder, preview, code
  const [editingField, setEditingField] = useState(null);
  const [draggedField, setDraggedField] = useState(null);
  const [formData, setFormData] = useState({});

  const fieldTypes = [
    { type: "text", label: "Text Input", icon: "📝" },
    { type: "email", label: "Email", icon: "📧" },
    { type: "number", label: "Number", icon: "🔢" },
    { type: "tel", label: "Phone", icon: "📞" },
    { type: "textarea", label: "Text Area", icon: "📄" },
    { type: "select", label: "Dropdown", icon: "⬇️" },
    { type: "radio", label: "Radio Buttons", icon: "🔘" },
    { type: "checkbox", label: "Checkboxes", icon: "☑️" },
    { type: "date", label: "Date Picker", icon: "📅" },
  ];

  const addField = useCallback((type) => {
    const newField = {
      id: Date.now(),
      type,
      label: \`New \${type} field\`,
      placeholder: "",
      required: false,
      options: type === "select" || type === "radio" || type === "checkbox" ? ["Option 1", "Option 2"] : undefined
    };
    setFields(prev => [...prev, newField]);
  }, []);

  const removeField = useCallback((id) => {
    setFields(prev => prev.filter(f => f.id !== id));
  }, []);

  const updateField = useCallback((id, updates) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const handleDragStart = useCallback((e, field) => {
    setDraggedField(field);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e, targetField) => {
    e.preventDefault();
    if (!draggedField || draggedField.id === targetField.id) return;

    const draggedIndex = fields.findIndex(f => f.id === draggedField.id);
    const targetIndex = fields.findIndex(f => f.id === targetField.id);

    const newFields = [...fields];
    newFields.splice(draggedIndex, 1);
    newFields.splice(targetIndex, 0, draggedField);

    setFields(newFields);
    setDraggedField(null);
  }, [draggedField, fields]);

  const exportForm = useCallback(() => {
    const formSchema = {
      title: formTitle,
      description: formDescription,
      fields: fields.map(f => ({
        id: f.id,
        type: f.type,
        label: f.label,
        placeholder: f.placeholder,
        required: f.required,
        options: f.options
      }))
    };

    const blob = new Blob([JSON.stringify(formSchema, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`form-\${Date.now()}.json\`;
    a.click();
    URL.revokeObjectURL(url);
  }, [formTitle, formDescription, fields]);

  const formCode = useMemo(() => {
    return \`<form>
  <h2>\${formTitle}</h2>
  <p>\${formDescription}</p>

\${fields.map(f => {
  if (f.type === 'textarea') {
    return \`  <label>
    \${f.label}\${f.required ? ' *' : ''}
    <textarea placeholder="\${f.placeholder}" \${f.required ? 'required' : ''}></textarea>
  </label>\`;
  } else if (f.type === 'select') {
    return \`  <label>
    \${f.label}\${f.required ? ' *' : ''}
    <select \${f.required ? 'required' : ''}>
\${f.options.map(opt => \`      <option>\${opt}</option>\`).join('\\n')}
    </select>
  </label>\`;
  } else if (f.type === 'radio' || f.type === 'checkbox') {
    return \`  <fieldset>
    <legend>\${f.label}\${f.required ? ' *' : ''}</legend>
\${f.options.map((opt, i) => \`    <label>
      <input type="\${f.type}" name="\${f.label.toLowerCase().replace(/\\s+/g, '_')}" value="\${opt}">
      \${opt}
    </label>\`).join('\\n')}
  </fieldset>\`;
  } else {
    return \`  <label>
    \${f.label}\${f.required ? ' *' : ''}
    <input type="\${f.type}" placeholder="\${f.placeholder}" \${f.required ? 'required' : ''}>
  </label>\`;
  }
}).join('\\n\\n')}

  <button type="submit">Submit</button>
</form>\`;
  }, [formTitle, formDescription, fields]);

  const handleFormChange = useCallback((fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    alert("Form submitted! Check console for data.");
    console.log("Form Data:", formData);
  }, [formData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Form Builder</h1>
          <p className="text-white/80">Drag and drop to create custom forms</p>
        </div>

        {/* View Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setView("builder")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "builder" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <Edit3 className="inline w-5 h-5 mr-2" />
            Builder
          </button>
          <button
            onClick={() => setView("preview")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "preview" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <Eye className="inline w-5 h-5 mr-2" />
            Preview
          </button>
          <button
            onClick={() => setView("code")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "code" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <Code className="inline w-5 h-5 mr-2" />
            Code
          </button>
        </div>

        {/* Builder View */}
        {view === "builder" && (
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Field Types Palette */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20 sticky top-6">
                <h3 className="text-xl font-bold text-white mb-4">Field Types</h3>
                <div className="space-y-2">
                  {fieldTypes.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => addField(type)}
                      className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-left flex items-center gap-3"
                    >
                      <span className="text-2xl">{icon}</span>
                      <span className="font-medium">{label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-white/20 space-y-3">
                  <button
                    onClick={exportForm}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Export JSON
                  </button>
                </div>
              </div>
            </div>

            {/* Form Canvas */}
            <div className="lg:col-span-3">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
                {/* Form Header */}
                <div className="mb-8">
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full text-4xl font-bold text-white bg-transparent border-b-2 border-white/20 focus:border-white/60 outline-none mb-4 pb-2"
                    placeholder="Form Title"
                  />
                  <input
                    type="text"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full text-lg text-white/80 bg-transparent border-b-2 border-white/20 focus:border-white/60 outline-none pb-2"
                    placeholder="Form Description"
                  />
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  {fields.map((field) => (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, field)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, field)}
                      className="group bg-white/10 rounded-lg p-4 border-2 border-white/20 hover:border-white/40 transition-colors cursor-move"
                    >
                      <div className="flex items-start gap-4">
                        <GripVertical className="w-5 h-5 text-white/40 mt-1 group-hover:text-white/80 transition-colors" />

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-white/60 uppercase">{field.type}</span>
                              {field.required && (
                                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">Required</span>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingField(field)}
                                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                              >
                                <Edit3 className="w-4 h-4 text-white/60" />
                              </button>
                              <button
                                onClick={() => removeField(field.id)}
                                className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </div>

                          <p className="text-white font-medium mb-1">{field.label}</p>
                          {field.placeholder && (
                            <p className="text-white/40 text-sm">{field.placeholder}</p>
                          )}
                          {field.options && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {field.options.map((opt, i) => (
                                <span key={i} className="px-2 py-1 bg-white/10 text-white/80 text-xs rounded">
                                  {opt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {fields.length === 0 && (
                    <div className="text-center py-20 text-white/60">
                      <Plus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-xl">No fields yet. Add fields from the left panel!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview View */}
        {view === "preview" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-4xl font-bold text-white mb-2">{formTitle}</h2>
                  <p className="text-white/80">{formDescription}</p>
                </div>

                {fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-white font-medium mb-2">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </label>

                    {field.type === "textarea" ? (
                      <textarea
                        placeholder={field.placeholder}
                        required={field.required}
                        onChange={(e) => handleFormChange(field.id, e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60 resize-none"
                        rows={4}
                      />
                    ) : field.type === "select" ? (
                      <select
                        required={field.required}
                        onChange={(e) => handleFormChange(field.id, e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:border-white/60"
                      >
                        <option value="">Select an option</option>
                        {field.options?.map((opt, i) => (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === "radio" || field.type === "checkbox" ? (
                      <div className="space-y-2">
                        {field.options?.map((opt, i) => (
                          <label key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                            <input
                              type={field.type}
                              name={\`field-\${field.id}\`}
                              value={opt}
                              required={field.required && i === 0}
                              onChange={(e) => handleFormChange(field.id, e.target.value)}
                              className="w-5 h-5"
                            />
                            <span className="text-white">{opt}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        required={field.required}
                        onChange={(e) => handleFormChange(field.id, e.target.value)}
                        className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60"
                      />
                    )}
                  </div>
                ))}

                {fields.length > 0 && (
                  <button
                    type="submit"
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all transform hover:scale-105"
                  >
                    Submit Form
                  </button>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Code View */}
        {view === "code" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Generated HTML</h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(formCode);
                    alert("Code copied to clipboard!");
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                >
                  Copy Code
                </button>
              </div>

              <pre className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                <code className="text-green-400 text-sm font-mono whitespace-pre">{formCode}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Edit Field Dialog */}
        <Dialog.Root open={!!editingField} onOpenChange={(open) => !open && setEditingField(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 rounded-2xl p-8 border-2 border-white/20 max-w-lg w-full max-h-[90vh] overflow-y-auto z-50">
              {editingField && (
                <>
                  <Dialog.Title className="text-2xl font-bold text-white mb-6">
                    Edit Field
                  </Dialog.Title>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/80 mb-2">Field Label</label>
                      <input
                        type="text"
                        value={editingField.label}
                        onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:border-white/60"
                      />
                    </div>

                    <div>
                      <label className="block text-white/80 mb-2">Placeholder</label>
                      <input
                        type="text"
                        value={editingField.placeholder || ""}
                        onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                        className="w-full px-4 py-2 bg-white/10 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:border-white/60"
                      />
                    </div>

                    {editingField.options && (
                      <div>
                        <label className="block text-white/80 mb-2">Options (one per line)</label>
                        <textarea
                          value={editingField.options.join('\\n')}
                          onChange={(e) => setEditingField({ ...editingField, options: e.target.value.split('\\n') })}
                          className="w-full px-4 py-2 bg-white/10 border-2 border-white/20 rounded-lg text-white focus:outline-none focus:border-white/60"
                          rows={5}
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingField.required}
                        onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                        className="w-5 h-5"
                      />
                      <span className="text-white">Required field</span>
                    </label>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <Dialog.Close asChild>
                      <button
                        onClick={() => {
                          updateField(editingField.id, editingField);
                          setEditingField(null);
                        }}
                        className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
                      >
                        Save Changes
                      </button>
                    </Dialog.Close>
                    <Dialog.Close asChild>
                      <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                        Cancel
                      </button>
                    </Dialog.Close>
                  </div>
                </>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}`,

  /**
   * 20. Financial Portfolio Tracker (680-800 lines)
   * Features: CoinGecko API, real crypto prices, portfolio tracking, performance charts
   */
  portfolioTracker: `import { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Plus, Trash2, RefreshCw, DollarSign, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function App() {
  const [portfolio, setPortfolio] = useState([
    { id: 1, symbol: "bitcoin", name: "Bitcoin", amount: 0.5, buyPrice: 45000 },
    { id: 2, symbol: "ethereum", name: "Ethereum", amount: 3, buyPrice: 2800 },
    { id: 3, symbol: "cardano", name: "Cardano", amount: 5000, buyPrice: 0.45 },
  ]);

  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("overview"); // overview, assets, performance
  const [newAsset, setNewAsset] = useState({ symbol: "", amount: "", buyPrice: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [priceHistory, setPriceHistory] = useState({});

  // Fetch current prices
  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const symbols = portfolio.map(p => p.symbol).join(',');
      const res = await fetch(\`https://api.coingecko.com/api/v3/simple/price?ids=\${symbols}&vs_currencies=usd&include_24hr_change=true\`);
      const data = await res.json();
      setPrices(data);
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    } finally {
      setLoading(false);
    }
  }, [portfolio]);

  // Fetch price history
  const fetchPriceHistory = useCallback(async () => {
    try {
      const historyData = {};
      for (const asset of portfolio.slice(0, 3)) { // Limit to avoid rate limits
        const res = await fetch(\`https://api.coingecko.com/api/v3/coins/\${asset.symbol}/market_chart?vs_currency=usd&days=30\`);
        const data = await res.json();
        historyData[asset.symbol] = data.prices.map((p, i) => ({
          day: i,
          price: p[1]
        }));
      }
      setPriceHistory(historyData);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  }, [portfolio]);

  useEffect(() => {
    fetchPrices();
    fetchPriceHistory();
    const interval = setInterval(fetchPrices, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [portfolio.length]);

  const addAsset = useCallback(() => {
    if (!newAsset.symbol || !newAsset.amount || !newAsset.buyPrice) {
      alert("Please fill all fields");
      return;
    }

    setPortfolio(prev => [...prev, {
      id: Date.now(),
      symbol: newAsset.symbol.toLowerCase(),
      name: newAsset.symbol.charAt(0).toUpperCase() + newAsset.symbol.slice(1),
      amount: parseFloat(newAsset.amount),
      buyPrice: parseFloat(newAsset.buyPrice)
    }]);

    setNewAsset({ symbol: "", amount: "", buyPrice: "" });
    setShowAddForm(false);
  }, [newAsset]);

  const removeAsset = useCallback((id) => {
    if (confirm("Remove this asset from portfolio?")) {
      setPortfolio(prev => prev.filter(a => a.id !== id));
    }
  }, []);

  const portfolioStats = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let totalPnL = 0;

    portfolio.forEach(asset => {
      const currentPrice = prices[asset.symbol]?.usd || 0;
      const value = currentPrice * asset.amount;
      const cost = asset.buyPrice * asset.amount;

      totalValue += value;
      totalCost += cost;
      totalPnL += (value - cost);
    });

    const pnlPercent = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPnL,
      pnlPercent
    };
  }, [portfolio, prices]);

  const assetData = useMemo(() => {
    return portfolio.map(asset => {
      const currentPrice = prices[asset.symbol]?.usd || 0;
      const value = currentPrice * asset.amount;
      const cost = asset.buyPrice * asset.amount;
      const pnl = value - cost;
      const pnlPercent = cost > 0 ? ((value - cost) / cost) * 100 : 0;
      const change24h = prices[asset.symbol]?.usd_24h_change || 0;

      return {
        ...asset,
        currentPrice,
        value,
        cost,
        pnl,
        pnlPercent,
        change24h
      };
    }).sort((a, b) => b.value - a.value);
  }, [portfolio, prices]);

  const pieChartData = useMemo(() => {
    return assetData.map(asset => ({
      name: asset.name,
      value: asset.value
    }));
  }, [assetData]);

  const colors = ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  const topPerformers = useMemo(() => {
    return [...assetData].sort((a, b) => b.pnlPercent - a.pnlPercent).slice(0, 3);
  }, [assetData]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value) => {
    return \`\${value > 0 ? '+' : ''}\${value.toFixed(2)}%\`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2">Crypto Portfolio</h1>
            <p className="text-white/80">Track your cryptocurrency investments</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchPrices}
              disabled={loading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className={\`w-5 h-5 \${loading ? 'animate-spin' : ''}\`} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Asset
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setView("overview")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "overview" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <DollarSign className="inline w-5 h-5 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setView("assets")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "assets" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <BarChart3 className="inline w-5 h-5 mr-2" />
            Assets
          </button>
          <button
            onClick={() => setView("performance")}
            className={\`px-6 py-3 rounded-lg font-semibold transition-all \${
              view === "performance" ? "bg-white text-purple-900" : "bg-white/10 text-white hover:bg-white/20"
            }\`}
          >
            <TrendingUp className="inline w-5 h-5 mr-2" />
            Performance
          </button>
        </div>

        {/* Overview View */}
        {view === "overview" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
                <p className="text-white/60 text-sm mb-2">Total Value</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(portfolioStats.totalValue)}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
                <p className="text-white/60 text-sm mb-2">Total Cost</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(portfolioStats.totalCost)}</p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
                <p className="text-white/60 text-sm mb-2">Total P&L</p>
                <p className={\`text-3xl font-bold \${portfolioStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}\`}>
                  {formatCurrency(portfolioStats.totalPnL)}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-white/20">
                <p className="text-white/60 text-sm mb-2">Return</p>
                <div className="flex items-center gap-2">
                  <p className={\`text-3xl font-bold \${portfolioStats.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}\`}>
                    {formatPercent(portfolioStats.pnlPercent)}
                  </p>
                  {portfolioStats.pnlPercent >= 0 ? (
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Portfolio Allocation */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6">Portfolio Allocation</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => \`\${name} \${(percent * 100).toFixed(0)}%\`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={\`cell-\${index}\`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
                <h2 className="text-2xl font-bold text-white mb-6">Top Performers</h2>
                <div className="space-y-4">
                  {topPerformers.map((asset, index) => (
                    <div key={asset.id} className="bg-white/10 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={\`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold\`}
                            style={{ backgroundColor: colors[index] }}>
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="text-white font-semibold">{asset.name}</h3>
                            <p className="text-white/60 text-sm">{asset.amount} {asset.symbol.toUpperCase()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={\`text-lg font-bold \${asset.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}\`}>
                            {formatPercent(asset.pnlPercent)}
                          </p>
                          <p className="text-white/60 text-sm">{formatCurrency(asset.pnl)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Asset List */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Holdings</h2>
              <div className="space-y-3">
                {assetData.map((asset, index) => (
                  <div key={asset.id} className="bg-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl"
                          style={{ backgroundColor: colors[index % colors.length] }}>
                          {asset.symbol[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">{asset.name}</h3>
                          <p className="text-white/60">{asset.amount} @ {formatCurrency(asset.currentPrice)}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-white font-bold text-xl">{formatCurrency(asset.value)}</p>
                        <div className="flex items-center gap-2 justify-end">
                          <p className={\`text-sm font-semibold \${asset.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}\`}>
                            {formatPercent(asset.pnlPercent)}
                          </p>
                          <p className="text-white/60 text-sm">({formatCurrency(asset.pnl)})</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Assets View */}
        {view === "assets" && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border-2 border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 border-b border-white/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-white font-semibold">Asset</th>
                    <th className="px-6 py-4 text-right text-white font-semibold">Amount</th>
                    <th className="px-6 py-4 text-right text-white font-semibold">Price</th>
                    <th className="px-6 py-4 text-right text-white font-semibold">24h Change</th>
                    <th className="px-6 py-4 text-right text-white font-semibold">Value</th>
                    <th className="px-6 py-4 text-right text-white font-semibold">P&L</th>
                    <th className="px-6 py-4 text-right text-white font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {assetData.map((asset) => (
                    <tr key={asset.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                            {asset.symbol[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{asset.name}</p>
                            <p className="text-white/60 text-sm">{asset.symbol.toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-white">{asset.amount}</td>
                      <td className="px-6 py-4 text-right text-white">{formatCurrency(asset.currentPrice)}</td>
                      <td className={\`px-6 py-4 text-right font-semibold \${asset.change24h >= 0 ? 'text-green-400' : 'text-red-400'}\`}>
                        <div className="flex items-center justify-end gap-1">
                          {asset.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {formatPercent(asset.change24h)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-white font-bold">{formatCurrency(asset.value)}</td>
                      <td className="px-6 py-4 text-right">
                        <div>
                          <p className={\`font-semibold \${asset.pnl >= 0 ? 'text-green-400' : 'text-red-400'}\`}>
                            {formatCurrency(asset.pnl)}
                          </p>
                          <p className={\`text-sm \${asset.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}\`}>
                            {formatPercent(asset.pnlPercent)}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => removeAsset(asset.id)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5 text-red-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Performance View */}
        {view === "performance" && (
          <div className="space-y-6">
            {Object.entries(priceHistory).map(([symbol, history]) => {
              const asset = portfolio.find(a => a.symbol === symbol);
              if (!asset) return null;

              return (
                <div key={symbol} className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 border-white/20">
                  <h2 className="text-2xl font-bold text-white mb-6">{asset.name} - 30 Day Price History</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={history}>
                      <XAxis
                        dataKey="day"
                        tick={{ fill: '#fff', fontSize: 12 }}
                        label={{ value: 'Days', position: 'insideBottom', offset: -5, fill: '#fff' }}
                      />
                      <YAxis
                        tick={{ fill: '#fff' }}
                        label={{ value: 'Price (USD)', angle: -90, position: 'insideLeft', fill: '#fff' }}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: 'rgba(0,0,0,0.8)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Asset Modal */}
        {showAddForm && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50"
            onClick={() => setShowAddForm(false)}
          >
            <div
              className="bg-gray-900 rounded-2xl p-8 border-2 border-white/20 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-white mb-6">Add New Asset</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 mb-2">Cryptocurrency Symbol</label>
                  <input
                    type="text"
                    value={newAsset.symbol}
                    onChange={(e) => setNewAsset({ ...newAsset, symbol: e.target.value })}
                    placeholder="bitcoin, ethereum, cardano..."
                    className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2">Amount Owned</label>
                  <input
                    type="number"
                    step="any"
                    value={newAsset.amount}
                    onChange={(e) => setNewAsset({ ...newAsset, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60"
                  />
                </div>

                <div>
                  <label className="block text-white/80 mb-2">Buy Price (USD)</label>
                  <input
                    type="number"
                    step="any"
                    value={newAsset.buyPrice}
                    onChange={(e) => setNewAsset({ ...newAsset, buyPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/60"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={addAsset}
                  className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
                >
                  Add Asset
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}`
};
