'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Agent, 
  AgentCapability, 
  CapabilityShowcase 
} from '@/types/agents';
import { 
  Brain, 
  MessageSquare, 
  Lightbulb, 
  Code, 
  BarChart3,
  Star,
  TrendingUp,
  Target,
} from 'lucide-react';

interface AgentCapabilitiesProps {
  agent: Agent;
  capabilities: AgentCapability[];
  showcase?: CapabilityShowcase;
  showDemo?: boolean;
  showProgress?: boolean;
  className?: string;
}

const CATEGORY_ICONS = {
  analysis: BarChart3,
  communication: MessageSquare,
  'problem-solving': Lightbulb,
  creativity: Brain,
  technical: Code
};

const CATEGORY_COLORS = {
  analysis: 'blue',
  communication: 'green',
  'problem-solving': 'yellow',
  creativity: 'purple',
  technical: 'red'
};

const SKILL_LEVEL_LABELS = {
  1: 'Novice',
  2: 'Beginner',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert'
};

const SKILL_LEVEL_COLORS = {
  1: 'gray',
  2: 'blue',
  3: 'green',
  4: 'orange',
  5: 'red'
};

export function AgentCapabilities({ 
  agent,
  capabilities,
  showcase,
  showDemo = true,
  showProgress = true,
  className 
}: AgentCapabilitiesProps) {
  const [selectedCapability, setSelectedCapability] = useState<AgentCapability | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Group capabilities by category
  const capabilitiesByCategory = capabilities.reduce((acc, capability) => {
    if (!acc[capability.category]) {
      acc[capability.category] = [];
    }
    acc[capability.category]!.push(capability);
    return acc;
  }, {} as Record<string, AgentCapability[]>);

  // Sort capabilities within each category by level (highest first)
  Object.values(capabilitiesByCategory).forEach(cats => {
    cats.sort((a, b) => b.level - a.level);
  });

  const categories = Object.keys(capabilitiesByCategory);
  const allCapabilities = capabilities.sort((a, b) => b.level - a.level);

  // Calculate category averages
  const categoryAverages = categories.reduce((acc, category) => {
    const cats = capabilitiesByCategory[category];
    if (!cats || cats.length === 0) return acc;
    const average = cats.reduce((sum, cap) => sum + cap.level, 0) / cats.length;
    acc[category] = average;
    return acc;
  }, {} as Record<string, number>);

  // Overall capability score
  const overallScore = capabilities.reduce((sum, cap) => sum + cap.level, 0) / capabilities.length;

  const filteredCapabilities = activeCategory === 'all' 
    ? allCapabilities 
    : capabilitiesByCategory[activeCategory] || [];

  const handleCapabilityClick = (capability: AgentCapability) => {
    setSelectedCapability(selectedCapability?.id === capability.id ? null : capability);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <span>{agent.name}&apos;s Capabilities</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">
              {overallScore.toFixed(1)}/5.0
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Performance Metrics */}
        {showProgress && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Rating</span>
                <span className="font-medium">{overallScore.toFixed(1)}/5</span>
              </div>
              <Progress value={(overallScore / 5) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium">
                  {Math.round(agent.stats.success_rate * 100)}%
                </span>
              </div>
              <Progress value={agent.stats.success_rate * 100} className="h-2" />
            </div>
          </div>
        )}

        {/* Category Performance Overview */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Category Strengths</div>
          <div className="grid grid-cols-1 gap-2">
            {categories.map((category) => {
              const Icon = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS];
              const average = categoryAverages[category];
              const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
              
              return (
                <div key={category} className="flex items-center justify-between p-2 rounded bg-muted/20">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span className="text-sm capitalize">{category.replace('-', ' ')}</span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        `border-${color}-200 text-${color}-700`
                      )}
                    >
                      {capabilitiesByCategory[category]?.length || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{average?.toFixed(1) || '0.0'}/5</div>
                    <div className="w-16">
                      <Progress value={((average || 0) / 5) * 100} className="h-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Capability Navigation */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            {categories.slice(0, 5).map((category) => (
              <TabsTrigger key={category} value={category} className="text-xs">
                {category.charAt(0).toUpperCase() + category.slice(1, 4)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeCategory} className="space-y-3">
            {/* Capability Grid */}
            <div className="grid gap-2">
              {filteredCapabilities.map((capability) => {
                const color = CATEGORY_COLORS[capability.category as keyof typeof CATEGORY_COLORS];
                const levelColor = SKILL_LEVEL_COLORS[capability.level as keyof typeof SKILL_LEVEL_COLORS];
                const isSelected = selectedCapability?.id === capability.id;
                const isFeatured = showcase?.featured_capability === capability.id;
                
                return (
                  <div key={capability.id}>
                    <div
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        "hover:bg-muted/50 hover:border-muted-foreground/20",
                        isSelected && "bg-blue-50 border-blue-200",
                        isFeatured && "ring-2 ring-yellow-400 ring-opacity-50 bg-yellow-50"
                      )}
                      onClick={() => handleCapabilityClick(capability)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-lg">{capability.icon}</div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{capability.name}</span>
                              {isFeatured && (
                                <Badge variant="default" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  Featured
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {capability.description}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-xs",
                              `border-${color}-200 text-${color}-700`
                            )}
                          >
                            {capability.category}
                          </Badge>
                          <Badge 
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              `bg-${levelColor}-100 text-${levelColor}-800`
                            )}
                          >
                            L{capability.level} {SKILL_LEVEL_LABELS[capability.level as keyof typeof SKILL_LEVEL_LABELS]}
                          </Badge>
                        </div>
                      </div>

                      {/* Expanded Capability Details */}
                      {isSelected && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="text-sm">
                            <strong>Skill Level:</strong> {SKILL_LEVEL_LABELS[capability.level as keyof typeof SKILL_LEVEL_LABELS]} (Level {capability.level}/5)
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Proficiency</span>
                              <span>{(capability.level / 5 * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={(capability.level / 5) * 100} className="h-2" />
                          </div>

                          {/* Demonstration Example */}
                          {showDemo && showcase?.demonstration && capability.id === showcase.featured_capability && (
                            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                              <div className="font-medium text-sm text-blue-800 mb-1">
                                {showcase.demonstration.title}
                              </div>
                              <div className="text-sm text-blue-700 mb-2">
                                {showcase.demonstration.description}
                              </div>
                              <div className="text-xs font-mono bg-white p-2 rounded border text-gray-800">
                                {showcase.demonstration.example}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredCapabilities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-sm">No capabilities found in this category</div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Performance Insights */}
        <div className="space-y-3">
          <div className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance Insights
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-700">
                {capabilities.filter(c => c.level >= 4).length}
              </div>
              <div className="text-xs text-green-600">Expert Skills</div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-700">
                {agent.stats.tasks_completed}
              </div>
              <div className="text-xs text-blue-600">Tasks Completed</div>
            </div>
            
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-700">
                {agent.stats.collaborations}
              </div>
              <div className="text-xs text-purple-600">Collaborations</div>
            </div>
          </div>
        </div>

        {/* Recommended Focus Areas */}
        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <Target className="w-4 h-4" />
            Growth Opportunities
          </div>
          
          <div className="space-y-1">
            {capabilities
              .filter(c => c.level <= 3)
              .slice(0, 3)
              .map((capability) => (
                <div key={capability.id} className="flex items-center justify-between text-sm p-2 bg-orange-50 rounded">
                  <span>{capability.name}</span>
                  <Badge variant="outline" className="text-xs">
                    Level {capability.level} → {capability.level + 1}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}