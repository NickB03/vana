import { Link } from "react-router-dom";
import { ArrowRight, MessageSquare, FormInput, Zap, Sparkles, ArrowLeft, CheckSquare } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * DeepResearchComparison
 *
 * A comparison page that presents three different UX approaches for the
 * Deep Research clarifying questions flow. Allows stakeholders to evaluate
 * and compare each approach side-by-side.
 */

interface ApproachCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  pros: string[];
  cons: string[];
  demoPath: string;
  recommended?: boolean;
  isAlternate?: boolean;
}

function ApproachCard({ title, description, icon, pros, cons, demoPath, recommended, isAlternate }: ApproachCardProps) {
  return (
    <Card className={`relative flex flex-col ${recommended ? "border-primary/50 shadow-lg shadow-primary/10" : ""} ${isAlternate ? "border-dashed" : ""}`}>
      {recommended && (
        <Badge className="absolute -top-2 left-4 bg-primary">
          Recommended
        </Badge>
      )}
      {isAlternate && (
        <Badge variant="outline" className="absolute -top-2 left-4">
          Alternate
        </Badge>
      )}
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Pros */}
        <div>
          <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Pros</h4>
          <ul className="space-y-1">
            {pros.map((pro, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-green-500 mt-1">✓</span>
                {pro}
              </li>
            ))}
          </ul>
        </div>
        {/* Cons */}
        <div>
          <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">Cons</h4>
          <ul className="space-y-1">
            {cons.map((con, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-orange-500 mt-1">−</span>
                {con}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full gap-2">
          <Link to={demoPath}>
            View Demo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function DeepResearchComparison() {
  const approaches: ApproachCardProps[] = [
    {
      title: "Option A: Interactive Dialog",
      description: "Conversational clarification in chat",
      icon: <MessageSquare className="h-5 w-5" />,
      pros: [
        "Natural, familiar chat UX",
        "Allows nuanced, free-form answers",
        "Progressive refinement of query",
        "Feels like talking to a research assistant",
      ],
      cons: [
        "Takes longer (3-5 back-and-forth)",
        "User might give incomplete answers",
        "More cognitive load per question",
      ],
      demoPath: "/deep-research-demo-a",
      recommended: true,
    },
    {
      title: "Option B: Structured Form",
      description: "All questions in a modal form",
      icon: <FormInput className="h-5 w-5" />,
      pros: [
        "Faster completion (single submit)",
        "Clear structure and expectations",
        "Easy to skip optional fields",
        "Familiar form pattern",
      ],
      cons: [
        "Less flexible answers",
        "May feel impersonal",
        "Questions must be pre-determined",
        "Can't adapt based on answers",
      ],
      demoPath: "/deep-research-demo-b",
    },
    {
      title: "Option B2: Dynamic Inline Questions",
      description: "Adaptive question types in chat",
      icon: <CheckSquare className="h-5 w-5" />,
      pros: [
        "5 question types: text, yes/no, multi-select, single-select, scale",
        "LLM adapts question type to context",
        "Follow-up questions based on answers",
        "Feels like a smart form in chat",
      ],
      cons: [
        "More complex to implement",
        "Requires LLM to choose question types",
        "Longer flow than single modal",
      ],
      demoPath: "/deep-research-demo-b2",
      isAlternate: true,
    },
    {
      title: "Option C: Optional Clarification",
      description: "Smart detection - ask only when needed",
      icon: <Zap className="h-5 w-5" />,
      pros: [
        "Fastest for clear queries",
        "Reduces friction for experts",
        "Adaptive to query complexity",
        "Best of both worlds potential",
      ],
      cons: [
        "May skip important nuances",
        "Inconsistent UX (sometimes asks, sometimes doesn't)",
        "AI detection may be wrong",
        "Users may expect questions",
      ],
      demoPath: "/deep-research-demo-c",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Deep Research UX Comparison</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container px-4 py-8">
        {/* Introduction */}
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-3xl font-bold mb-4">
            Clarifying Questions: Four Approaches
          </h2>
          <p className="text-muted-foreground text-lg">
            Before generating a research plan, the LLM needs to understand the user's intent.
            Compare these UX patterns for gathering clarification.
          </p>
        </div>

        {/* User Flow Overview */}
        <div className="max-w-4xl mx-auto mb-10">
          <Card className="bg-muted/30">
            <CardContent className="py-6">
              <h3 className="font-semibold mb-4">Common User Flow</h3>
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                <Badge variant="outline" className="gap-1">
                  1. User clicks "Deep Research"
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="gap-1">
                  2. LLM analyzes prompt
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary" className="gap-1 bg-primary/20">
                  3. Clarification (varies by approach)
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="gap-1">
                  4. Show reasoning ticker
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="gap-1">
                  5. Present Plan component
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="gap-1">
                  6. Begin Research
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approach Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {approaches.map((approach) => (
            <ApproachCard key={approach.demoPath} {...approach} />
          ))}
        </div>

        {/* Technical Notes */}
        <div className="max-w-4xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Technical Implementation Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <h4 className="font-medium text-foreground mb-1">Plan Component</h4>
                <p>
                  All approaches use the <code className="text-xs bg-muted px-1 py-0.5 rounded">ResearchPlan</code> component
                  (based on AI SDK's Plan component pattern) to display the research execution plan with collapsible
                  steps, status indicators, and action buttons.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Z.ai MCP Integration</h4>
                <p>
                  Deep Research uses Z.ai MCP tools (Web Search Prime, Web Reader, Vision) as the primary
                  search backend, with Tavily as fallback. This provides 4,000 free searches/month.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Reasoning Display</h4>
                <p>
                  The existing <code className="text-xs bg-muted px-1 py-0.5 rounded">ReasoningDisplay</code> component
                  is reused to show the thinking/planning process with Claude-style ticker animations.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-foreground mb-1">Dynamic Question Types (B2)</h4>
                <p>
                  Option B2 uses a flexible <code className="text-xs bg-muted px-1 py-0.5 rounded">Question</code> discriminated union
                  supporting 5 input types: <code className="text-xs bg-muted px-1 py-0.5 rounded">text</code>,{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">yes_no</code>,{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">multi_select</code>,{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">single_select</code>, and{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">scale</code>.
                  Yes/No questions support conditional follow-up questions based on the user's answer.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
