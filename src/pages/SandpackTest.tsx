/**
 * SandpackTest - Comprehensive test page for validating artifacts with vanilla Sandpack
 *
 * Purpose: Test the hypothesis that Gemini 3 Flash generates code
 * that works with vanilla Sandpack WITHOUT all the complexity layers.
 *
 * This page provides:
 * - All 20 production-ready artifacts from test batches
 * - Clear success/failure tracking
 * - Error visibility for debugging
 * - Category and API badges for organization
 */

import { useState } from 'react';
import { BareSandpackTest } from '@/components/BareSandpackTest';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Play } from 'lucide-react';
import { ARTIFACTS_BATCH_1 } from '@/test-fixtures/artifacts-batch-1';
import { ARTIFACTS_BATCH_2 } from '@/test-fixtures/artifacts-batch-2';
import { ARTIFACTS_BATCH_3 } from '@/test-fixtures/artifacts-batch-3';

// Comprehensive test artifacts - 20 diverse components testing all capabilities
const TEST_ARTIFACTS = [
  // Batch 1 (1-7): APIs + Charts + Animation
  {
    id: 'animated-buttons',
    name: 'Animated Gradient Buttons',
    complexity: 'basic',
    category: 'UI Components',
    description: 'Framer Motion button animations with gradient backgrounds',
    apis: [],
    libraries: ['framer-motion', 'lucide-react'],
    code: ARTIFACTS_BATCH_1.animatedButtons,
  },
  {
    id: 'mood-tracker',
    name: 'Interactive Mood Tracker',
    complexity: 'medium',
    category: 'Data Visualization',
    description: 'Mood logging with Recharts bar charts and state management',
    apis: [],
    libraries: ['framer-motion', 'recharts', 'lucide-react'],
    code: ARTIFACTS_BATCH_1.moodTracker,
  },
  {
    id: 'dog-gallery',
    name: 'Random Dog Gallery',
    complexity: 'medium',
    category: 'API Integration',
    description: 'Dog.ceo API integration with favorites and animations',
    apis: ['Dog API'],
    libraries: ['framer-motion', 'lucide-react'],
    code: ARTIFACTS_BATCH_1.dogGallery,
  },
  {
    id: 'pomodoro-timer',
    name: 'Pomodoro Focus Timer',
    complexity: 'medium',
    category: 'Productivity',
    description: 'Work/break timer with session tracking and circular progress',
    apis: [],
    libraries: ['framer-motion', 'lucide-react'],
    code: ARTIFACTS_BATCH_1.pomodoroTimer,
  },
  {
    id: 'cat-fact-cards',
    name: 'Cat Fact Cards',
    complexity: 'basic',
    category: 'API Integration',
    description: 'CatFact.ninja + TheCatAPI with card animations',
    apis: ['Cat Fact API', 'Cat API'],
    libraries: ['framer-motion', 'lucide-react'],
    code: ARTIFACTS_BATCH_1.catFactCards,
  },
  {
    id: 'world-explorer',
    name: 'World Explorer Dashboard',
    complexity: 'advanced',
    category: 'API Integration',
    description: 'REST Countries API with charts, search, and detailed country views',
    apis: ['REST Countries'],
    libraries: ['framer-motion', 'recharts', 'lucide-react'],
    code: ARTIFACTS_BATCH_1.worldExplorer,
  },
  {
    id: 'recipe-finder',
    name: 'Recipe Finder & Meal Planner',
    complexity: 'advanced',
    category: 'API Integration',
    description: 'TheMealDB API with tabs, search, favorites, and meal planning',
    apis: ['TheMealDB'],
    libraries: ['framer-motion', 'lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-tabs'],
    code: ARTIFACTS_BATCH_1.recipeFinder,
  },

  // Batch 2 (8-14): Complex State + Tables + Forms
  {
    id: 'kanban-board',
    name: 'Kanban Task Board',
    complexity: 'advanced',
    category: 'Productivity',
    description: 'Drag-and-drop task board with Reorder.Group and priority levels',
    apis: [],
    libraries: ['framer-motion', 'lucide-react'],
    code: ARTIFACTS_BATCH_2.kanbanBoard,
  },
  {
    id: 'data-table',
    name: 'Interactive Data Table',
    complexity: 'medium',
    category: 'Data Display',
    description: 'JSONPlaceholder API with sorting, search, pagination, and row selection',
    apis: ['JSONPlaceholder'],
    libraries: ['lucide-react'],
    code: ARTIFACTS_BATCH_2.dataTable,
  },
  {
    id: 'stats-dashboard',
    name: 'Animated Statistics Dashboard',
    complexity: 'advanced',
    category: 'Data Visualization',
    description: 'Business metrics with area, line, bar, and pie charts',
    apis: [],
    libraries: ['framer-motion', 'recharts', 'lucide-react'],
    code: ARTIFACTS_BATCH_2.statsDashboard,
  },
  {
    id: 'memory-game',
    name: 'Advanced Memory Card Game',
    complexity: 'medium',
    category: 'Games',
    description: 'Card matching game with themes, difficulty levels, and best scores',
    apis: [],
    libraries: ['framer-motion', 'lucide-react'],
    code: ARTIFACTS_BATCH_2.memoryGame,
  },
  {
    id: 'quote-generator',
    name: 'Quote Generator with Themes',
    complexity: 'basic',
    category: 'API Integration',
    description: 'Quotable.io API with 4 visual themes and favorites',
    apis: ['Quotable'],
    libraries: ['framer-motion', 'lucide-react'],
    code: ARTIFACTS_BATCH_2.quoteGenerator,
  },
  {
    id: 'color-palette',
    name: 'Color Palette Generator',
    complexity: 'medium',
    category: 'Design Tools',
    description: 'Random/harmonious color generation with CSS export',
    apis: [],
    libraries: ['framer-motion', 'lucide-react'],
    code: ARTIFACTS_BATCH_2.colorPalette,
  },
  {
    id: 'weather-dashboard',
    name: 'Real-Time Weather Dashboard',
    complexity: 'advanced',
    category: 'API Integration',
    description: 'Open-Meteo API with location search, 24h forecast, and 7-day forecast',
    apis: ['Open-Meteo', 'Geocoding'],
    libraries: ['recharts', 'lucide-react'],
    code: ARTIFACTS_BATCH_2.weatherDashboard,
  },

  // Batch 3 (15-20): Advanced API Integration
  {
    id: 'pokemon-team',
    name: 'Pokemon Team Builder',
    complexity: 'advanced',
    category: 'API Integration',
    description: 'PokeAPI with team building, radar charts, and type distribution',
    apis: ['PokeAPI'],
    libraries: ['recharts', 'lucide-react'],
    code: ARTIFACTS_BATCH_3.pokemonTeamBuilder,
  },
  {
    id: 'markdown-editor',
    name: 'Markdown Note Editor',
    complexity: 'medium',
    category: 'Productivity',
    description: 'Real-time markdown preview with local storage and export',
    apis: [],
    libraries: ['lucide-react'],
    code: ARTIFACTS_BATCH_3.markdownEditor,
  },
  {
    id: 'habit-tracker',
    name: 'Habit Tracker',
    complexity: 'medium',
    category: 'Productivity',
    description: 'Daily habit tracking with streak counting and statistics',
    apis: [],
    libraries: ['framer-motion', 'lucide-react'],
    code: ARTIFACTS_BATCH_3.habitTracker,
  },
  {
    id: 'music-visualizer',
    name: 'Music Visualizer',
    complexity: 'advanced',
    category: 'Entertainment',
    description: 'Audio API visualization with waveforms and frequency bars',
    apis: [],
    libraries: ['framer-motion', 'lucide-react'],
    code: ARTIFACTS_BATCH_3.musicVisualizer,
  },
  {
    id: 'form-builder',
    name: 'Dynamic Form Builder',
    complexity: 'advanced',
    category: 'Productivity',
    description: 'Drag-and-drop form builder with preview and JSON export',
    apis: [],
    libraries: ['lucide-react'],
    code: ARTIFACTS_BATCH_3.formBuilder,
  },
  {
    id: 'portfolio-tracker',
    name: 'Investment Portfolio Tracker',
    complexity: 'advanced',
    category: 'Finance',
    description: 'Stock portfolio management with performance charts',
    apis: [],
    libraries: ['recharts', 'lucide-react'],
    code: ARTIFACTS_BATCH_3.portfolioTracker,
  },
];

type TestResult = 'pending' | 'success' | 'error';

interface ArtifactResult {
  id: string;
  result: TestResult;
  error?: string;
}

export default function SandpackTest() {
  const [selectedArtifact, setSelectedArtifact] = useState(TEST_ARTIFACTS[0]);
  const [results, setResults] = useState<ArtifactResult[]>(
    TEST_ARTIFACTS.map(a => ({ id: a.id, result: 'pending' }))
  );

  const markResult = (id: string, result: TestResult, error?: string) => {
    setResults(prev => prev.map(r =>
      r.id === id ? { ...r, result, error } : r
    ));
  };

  const successCount = results.filter(r => r.result === 'success').length;
  const errorCount = results.filter(r => r.result === 'error').length;
  const testedCount = successCount + errorCount;

  // Get unique categories for filtering
  const categories = Array.from(new Set(TEST_ARTIFACTS.map(a => a.category)));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30 p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">Sandpack Test Harness - 20 Artifacts</h1>
          <p className="text-muted-foreground">
            Testing: Does Gemini 3 Flash generate code that works with vanilla Sandpack?
          </p>
          <div className="flex gap-4 mt-2 flex-wrap">
            <Badge variant="outline">
              Tested: {testedCount}/{TEST_ARTIFACTS.length}
            </Badge>
            <Badge variant="default" className="bg-green-500">
              Success: {successCount}
            </Badge>
            <Badge variant="destructive">
              Errors: {errorCount}
            </Badge>
            <Badge variant="secondary">
              Success Rate: {testedCount > 0 ? Math.round((successCount / testedCount) * 100) : 0}%
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid grid-cols-[320px_1fr] gap-4 h-[calc(100vh-140px)] overflow-hidden">
        {/* Sidebar - Artifact list */}
        <div className="border rounded-lg overflow-hidden flex flex-col">
          <div className="bg-muted/50 p-3 border-b font-medium">
            Test Artifacts ({TEST_ARTIFACTS.length})
          </div>
          <div className="flex-1 overflow-auto">
            {TEST_ARTIFACTS.map(artifact => {
              const artifactResult = results.find(r => r.id === artifact.id);
              return (
                <button
                  key={artifact.id}
                  onClick={() => setSelectedArtifact(artifact)}
                  className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${
                    selectedArtifact.id === artifact.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{artifact.name}</span>
                    {artifactResult?.result === 'success' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {artifactResult?.result === 'error' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {artifact.complexity}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {artifact.category}
                    </Badge>
                    {artifact.apis.length > 0 && (
                      <Badge variant="default" className="text-xs bg-blue-500">
                        API
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {artifact.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main - Sandpack preview */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Artifact Info */}
          <div className="flex-none bg-muted/30 p-4 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">{selectedArtifact.name}</h2>
                <p className="text-sm text-muted-foreground mb-2">
                  {selectedArtifact.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedArtifact.complexity}</Badge>
                  <Badge variant="secondary">{selectedArtifact.category}</Badge>
                  {selectedArtifact.apis.map(api => (
                    <Badge key={api} className="bg-blue-500">
                      {api}
                    </Badge>
                  ))}
                  {selectedArtifact.libraries.map(lib => (
                    <Badge key={lib} variant="outline" className="text-xs">
                      {lib}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-none flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markResult(selectedArtifact.id, 'success')}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Success
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => markResult(selectedArtifact.id, 'error', 'Manual mark')}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Mark Error
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const idx = TEST_ARTIFACTS.findIndex(a => a.id === selectedArtifact.id);
                if (idx < TEST_ARTIFACTS.length - 1) {
                  setSelectedArtifact(TEST_ARTIFACTS[idx + 1]);
                }
              }}
              disabled={selectedArtifact.id === TEST_ARTIFACTS[TEST_ARTIFACTS.length - 1].id}
            >
              <Play className="h-4 w-4 mr-1" />
              Next
            </Button>
          </div>

          {/* Preview - must have explicit height for Sandpack iframe */}
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden relative">
            <BareSandpackTest
              key={selectedArtifact.id}
              code={selectedArtifact.code}
              title={selectedArtifact.name}
              onAIFix={(error) => {
                console.log('Error in artifact:', selectedArtifact.id, error);
                markResult(selectedArtifact.id, 'error', error);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
