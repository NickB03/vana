import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Message, MessageAvatar, MessageContent } from "@/components/prompt-kit/message";
import { Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { ResearchPlan, ResearchPlanStep } from "@/components/deep-research/ResearchPlan";

/**
 * DeepResearchDemoA - Interactive Dialog Approach Demo
 *
 * Demonstrates a conversational clarification flow where the AI asks
 * questions ONE AT A TIME, users respond inline, and then a research
 * plan is generated after sufficient clarification.
 *
 * Flow:
 * 1. User asks initial question
 * 2. AI asks clarifying questions sequentially
 * 3. User answers each one
 * 4. AI generates research plan
 * 5. User confirms to begin research
 */

type DemoStage = 'initial' | 'question1' | 'answer1' | 'question2' | 'answer2' | 'planning' | 'plan-ready';

export default function DeepResearchDemoA() {
  const [stage, setStage] = useState<DemoStage>('initial');

  const handleNextStage = () => {
    const stageFlow: DemoStage[] = ['initial', 'question1', 'answer1', 'question2', 'answer2', 'planning', 'plan-ready'];
    const currentIndex = stageFlow.indexOf(stage);
    if (currentIndex < stageFlow.length - 1) {
      setStage(stageFlow[currentIndex + 1]);
    }
  };

  const handleReset = () => {
    setStage('initial');
  };

  // Research plan steps
  const researchSteps: ResearchPlanStep[] = [
    {
      id: "step-1",
      title: "Current Market Landscape",
      description: "Survey top AI coding assistants (GitHub Copilot, Cursor, Cody, etc.), compare architecture approaches and deployment models, analyze adoption metrics and user feedback",
      status: "pending",
      estimatedTime: "~1 min"
    },
    {
      id: "step-2",
      title: "Production Deployment Patterns",
      description: "Infrastructure requirements (cloud vs edge vs hybrid), latency optimization techniques, cost management strategies, security and compliance considerations",
      status: "pending",
      estimatedTime: "~1.5 min"
    },
    {
      id: "step-3",
      title: "Best Practices & Case Studies",
      description: "Real-world implementation examples, common pitfalls and solutions, scaling strategies for enterprise use",
      status: "pending",
      estimatedTime: "~1 min"
    },
    {
      id: "step-4",
      title: "2025 Trends & Predictions",
      description: "Emerging technologies and methodologies, industry expert predictions, recommended action items",
      status: "pending",
      estimatedTime: "~1 min"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/deep-research-comparison" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Comparison
            </Link>
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Deep Research Demo</h1>
            <Badge variant="secondary" className="text-xs">Option A</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset Demo
          </Button>
        </div>
      </header>

      {/* Chat Container */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">

          {/* User's Initial Message */}
          <Message className="gap-3">
            <MessageAvatar fallback="U" className="bg-primary text-primary-foreground" />
            <MessageContent className="bg-primary/10 max-w-2xl">
              Research the latest trends in AI agents for 2025
            </MessageContent>
          </Message>

          {/* AI's First Question */}
          {stage !== 'initial' && (
            <Message className="gap-3">
              <MessageAvatar fallback="AI" className="bg-purple-500 text-white" />
              <MessageContent className="bg-muted max-w-2xl">
                <div className="space-y-3">
                  <p className="text-sm">
                    I'd like to clarify your research focus to provide the most relevant insights.
                    What specific aspect of AI agents interests you most?
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">Choose one:</div>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Framework comparisons (LangChain, AutoGPT, CrewAI, etc.)</li>
                      <li>Production deployment patterns and best practices</li>
                      <li>Multi-agent orchestration and communication</li>
                    </ol>
                  </div>
                </div>
              </MessageContent>
            </Message>
          )}

          {/* User's First Answer */}
          {['answer1', 'question2', 'answer2', 'planning', 'plan-ready'].includes(stage) && (
            <Message className="gap-3">
              <MessageAvatar fallback="U" className="bg-primary text-primary-foreground" />
              <MessageContent className="bg-primary/10 max-w-2xl">
                I'm most interested in production deployment patterns
              </MessageContent>
            </Message>
          )}

          {/* AI's Second Question */}
          {['question2', 'answer2', 'planning', 'plan-ready'].includes(stage) && (
            <Message className="gap-3">
              <MessageAvatar fallback="AI" className="bg-purple-500 text-white" />
              <MessageContent className="bg-muted max-w-2xl">
                <div className="space-y-3">
                  <p className="text-sm">
                    Great! To ensure the research is comprehensive, what's your primary use case?
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">Choose one:</div>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Enterprise customer support automation</li>
                      <li>Developer tools and code assistance</li>
                      <li>Research and analysis workflows</li>
                    </ol>
                  </div>
                </div>
              </MessageContent>
            </Message>
          )}

          {/* User's Second Answer */}
          {['answer2', 'planning', 'plan-ready'].includes(stage) && (
            <Message className="gap-3">
              <MessageAvatar fallback="U" className="bg-primary text-primary-foreground" />
              <MessageContent className="bg-primary/10 max-w-2xl">
                Developer tools and code assistance
              </MessageContent>
            </Message>
          )}

          {/* Planning Stage - Reasoning Ticker */}
          {stage === 'planning' && (
            <Message className="gap-3">
              <MessageAvatar fallback="AI" className="bg-purple-500 text-white" />
              <div className="flex-1 max-w-2xl">
                <Card className="border-purple-500/20 bg-purple-500/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
                        <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-md animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium mb-1">Generating Research Plan</div>
                        <div className="text-xs text-muted-foreground">
                          Analyzing production deployment patterns for AI agents...
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Message>
          )}

          {/* Research Plan */}
          {stage === 'plan-ready' && (
            <Message className="gap-3">
              <MessageAvatar fallback="AI" className="bg-purple-500 text-white" />
              <div className="flex-1 max-w-3xl">
                <ResearchPlan
                  title="Research Plan: AI Agents for Developer Tools"
                  description="Focused on production deployment patterns for code assistance applications"
                  steps={researchSteps}
                  estimatedTime="3-5 minutes"
                  sourcesCount={12}
                  defaultOpen={true}
                  className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-blue-500/5"
                  onBeginResearch={() => console.log('Begin research clicked')}
                />
              </div>
            </Message>
          )}

          {/* Demo Controls */}
          {stage !== 'plan-ready' && (
            <div className="flex justify-center pt-4">
              <Button onClick={handleNextStage} variant="outline" className="gap-2">
                Advance Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
