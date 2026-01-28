/**
 * Deep Research Demo C - Optional Clarification Approach
 *
 * This demo showcases the optional clarification flow:
 * - Clear queries skip directly to plan generation
 * - Ambiguous queries get 1-2 focused clarifying questions
 * - Smart analysis determines which path to take
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Sparkles, CheckCircle2, ChevronRight, ArrowLeft, Zap } from "lucide-react";
import { ResearchPlan, type ResearchPlanStep } from "@/components/deep-research/ResearchPlan";

type Stage = "input" | "analyzing" | "questioning" | "plan" | "researching";

interface Scenario {
  id: string;
  query: string;
  description: string;
  needsClarification: boolean;
  analysisText: string;
  question?: {
    text: string;
    options: string[];
  };
  plan: {
    title: string;
    description: string;
    steps: ResearchPlanStep[];
    estimatedTime: string;
  };
}

const scenarios: Record<string, Scenario> = {
  clear: {
    id: "clear",
    query: "Research React Server Components performance benchmarks 2025",
    description: "Clear, specific query - proceeds directly to plan",
    needsClarification: false,
    analysisText: "Query is well-defined with clear scope: React Server Components, performance focus, recent data (2025). Proceeding directly to research plan.",
    plan: {
      title: "React Server Components Performance Research",
      description: "Comprehensive analysis of RSC performance metrics and benchmarks",
      estimatedTime: "12-16 minutes",
      steps: [
        {
          id: "step-1",
          title: "Official Documentation & Benchmarks",
          description: "Review React docs, Vercel Next.js performance data, and official case studies",
          status: "pending",
          estimatedTime: "3-4 min"
        },
        {
          id: "step-2",
          title: "Community Benchmarks & Analysis",
          description: "Search developer blogs, GitHub discussions, and performance comparison tools",
          status: "pending",
          estimatedTime: "4-5 min"
        },
        {
          id: "step-3",
          title: "Real-World Production Metrics",
          description: "Analyze published metrics from companies using RSC in production",
          status: "pending",
          estimatedTime: "3-4 min"
        },
        {
          id: "step-4",
          title: "Synthesis & Recommendations",
          description: "Compile findings, identify patterns, and provide actionable insights",
          status: "pending",
          estimatedTime: "2-3 min"
        }
      ]
    }
  },
  ambiguous: {
    id: "ambiguous",
    query: "Tell me about AI",
    description: "Broad query - asks focused clarifying question",
    needsClarification: true,
    analysisText: "Query is too broad. AI encompasses many domains. Need to clarify user's specific area of interest for effective research.",
    question: {
      text: "AI is a broad topic. Which area interests you most?",
      options: [
        "LLM applications & prompt engineering",
        "Computer vision & image recognition",
        "AI agents & autonomous systems",
        "AI safety & alignment"
      ]
    },
    plan: {
      title: "LLM Applications & Prompt Engineering Research",
      description: "In-depth exploration of modern LLM applications and prompt engineering practices",
      estimatedTime: "12-16 minutes",
      steps: [
        {
          id: "step-1",
          title: "Current State of LLM Technology",
          description: "Survey latest models (GPT-4, Claude, Gemini), capabilities, and limitations",
          status: "pending",
          estimatedTime: "3-4 min"
        },
        {
          id: "step-2",
          title: "Prompt Engineering Techniques",
          description: "Research best practices, frameworks (Chain-of-Thought, ReAct, etc.)",
          status: "pending",
          estimatedTime: "4-5 min"
        },
        {
          id: "step-3",
          title: "Real-World Applications",
          description: "Explore use cases in customer service, code generation, content creation",
          status: "pending",
          estimatedTime: "3-4 min"
        },
        {
          id: "step-4",
          title: "Future Trends & Challenges",
          description: "Analyze emerging patterns, scalability concerns, and ethical considerations",
          status: "pending",
          estimatedTime: "2-3 min"
        }
      ]
    }
  }
};

export default function DeepResearchDemoC() {
  const [selectedScenario, setSelectedScenario] = useState<string>("clear");
  const [stage, setStage] = useState<Stage>("input");
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const scenario = scenarios[selectedScenario];

  // Auto-advance simulation
  useEffect(() => {
    if (stage === "analyzing") {
      const timer = setTimeout(() => {
        if (scenario.needsClarification) {
          setStage("questioning");
        } else {
          setStage("plan");
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [stage, scenario.needsClarification]);

  // Progress bar animation during analysis
  useEffect(() => {
    if (stage === "analyzing") {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) return 100;
          return prev + 2;
        });
      }, 60);
      return () => clearInterval(interval);
    }
  }, [stage]);

  const handleStartResearch = () => {
    setStage("analyzing");
    setSelectedAnswer("");
  };

  const handleAnswerSubmit = () => {
    if (selectedAnswer) {
      setStage("plan");
    }
  };

  const handleBeginResearch = () => {
    setStage("researching");
  };

  const handleReset = () => {
    setStage("input");
    setSelectedAnswer("");
    setProgress(0);
  };

  const handleScenarioChange = (value: string) => {
    setSelectedScenario(value);
    handleReset();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/deep-research-comparison" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Option C: Optional Clarification</h1>
            <Badge variant="secondary">Smart Detection</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Introduction */}
          <div className="text-center space-y-2">
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Smart analysis determines if clarification is needed. Clear queries proceed directly to research,
              while ambiguous queries get focused questions.
            </p>
          </div>

        {/* Scenario Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Scenario</CardTitle>
            <CardDescription>
              Choose between a clear query or an ambiguous one to see different flows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedScenario} onValueChange={handleScenarioChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="clear">Clear Query</TabsTrigger>
                <TabsTrigger value="ambiguous">Ambiguous Query</TabsTrigger>
              </TabsList>
              <TabsContent value="clear" className="space-y-2 mt-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">{scenarios.clear.query}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {scenarios.clear.description}
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="ambiguous" className="space-y-2 mt-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium">{scenarios.ambiguous.query}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {scenarios.ambiguous.description}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Main Demo Area */}
        <Card className="min-h-[400px]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Demo Flow</CardTitle>
              <Badge variant="outline">
                {stage === "input" && "Ready"}
                {stage === "analyzing" && "Analyzing"}
                {stage === "questioning" && "Clarifying"}
                {stage === "plan" && "Plan Ready"}
                {stage === "researching" && "Researching"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Stage */}
            {stage === "input" && (
              <div className="space-y-4 text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Ready to Research</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Query: "{scenario.query}"
                </p>
                <Button onClick={handleStartResearch} size="lg" className="mt-4">
                  Start Deep Research
                </Button>
              </div>
            )}

            {/* Analyzing Stage */}
            {stage === "analyzing" && (
              <div className="space-y-6 py-8">
                <div className="flex items-center justify-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Analyzing query complexity...</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {scenario.analysisText}
                  </p>
                </div>
                {/* Progress bar */}
                <div className="max-w-md mx-auto">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                {/* Shimmer effect */}
                <div className="max-w-md mx-auto space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-4 bg-muted rounded animate-pulse"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Questioning Stage */}
            {stage === "questioning" && scenario.question && (
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Clarification Needed</h3>
                  <p className="text-muted-foreground">{scenario.question.text}</p>
                </div>
                <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                  <div className="space-y-3">
                    {scenario.question.options.map((option, index) => (
                      <label
                        key={index}
                        className="flex items-center space-x-3 p-4 rounded-lg border-2 border-muted hover:border-primary/50 cursor-pointer transition-colors"
                      >
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <span className="flex-1">{option}</span>
                      </label>
                    ))}
                  </div>
                </RadioGroup>
                <div className="flex gap-3">
                  <Button
                    onClick={handleAnswerSubmit}
                    disabled={!selectedAnswer}
                    className="flex-1"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button onClick={handleReset} variant="outline">
                    Reset
                  </Button>
                </div>
              </div>
            )}

            {/* Plan Stage */}
            {stage === "plan" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Research Plan Ready</h3>
                </div>
                <ResearchPlan
                  title={scenario.plan.title}
                  description={scenario.plan.description}
                  steps={scenario.plan.steps}
                  estimatedTime={scenario.plan.estimatedTime}
                  onBeginResearch={handleBeginResearch}
                  isResearching={false}
                  defaultOpen={true}
                />
                <div className="flex justify-end">
                  <Button onClick={handleReset} variant="outline">
                    Reset Demo
                  </Button>
                </div>
              </div>
            )}

            {/* Researching Stage */}
            {stage === "researching" && (
              <div className="space-y-4 text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Research in Progress</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  This is where the actual deep research would execute, gathering information
                  from multiple sources and synthesizing findings.
                </p>
                <Button onClick={handleReset} variant="outline" className="mt-4">
                  Reset Demo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

          {/* Info Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Smart Analysis:</strong> AI evaluates query clarity and scope in ~3 seconds
                </span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Conditional Clarification:</strong> Only asks questions when necessary
                </span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Focused Questions:</strong> 1-2 multiple-choice options, no open-ended text
                </span>
              </div>
              <div className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Efficient Flow:</strong> Clear queries skip directly to research plan
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
