import { useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResearchPlan, ResearchPlanStep } from "@/components/deep-research/ResearchPlan";

type Stage = "initial" | "form" | "plan";

interface FormData {
  aspect: string;
  depth: string;
  sources: string;
}

const DeepResearchDemoB = () => {
  const [stage, setStage] = useState<Stage>("initial");
  const [query, setQuery] = useState("");
  const [formData, setFormData] = useState<FormData>({
    aspect: "",
    depth: "",
    sources: "",
  });

  const initialFormData: FormData = {
    aspect: "",
    depth: "",
    sources: "",
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setQuery("");
  };

  const handleDeepResearch = () => {
    setStage("form");
  };

  const handleFormSubmit = () => {
    setStage("plan");
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setStage("initial");
      resetForm();
    }
  };

  const mockSteps: ResearchPlanStep[] = [
    {
      id: "step-1",
      title: "Gather foundational sources",
      description: "Search academic databases and industry publications",
      status: "pending",
      estimatedTime: "2 min",
    },
    {
      id: "step-2",
      title: "Analyze current trends",
      description: "Identify patterns and emerging developments",
      status: "pending",
      estimatedTime: "3 min",
    },
    {
      id: "step-3",
      title: "Synthesize findings",
      description: "Create comprehensive summary",
      status: "pending",
      estimatedTime: "2 min",
    },
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
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Deep Research Demo - Option B</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {stage === "initial" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Start Your Research</CardTitle>
                <CardDescription>
                  Enter a topic to begin in-depth research
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="query">Research Topic</Label>
                  <Input
                    id="query"
                    placeholder="e.g., Recent advances in transformer architectures"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button variant="outline" size="default">
                  Quick Search
                </Button>
                <Button
                  onClick={handleDeepResearch}
                  disabled={!query.trim()}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Deep Research
                </Button>
              </CardFooter>
            </Card>

            {/* Info Card */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">What is Deep Research?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Deep Research mode conducts comprehensive multi-source
                  analysis with AI-powered synthesis.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Multi-step research planning</li>
                  <li>Source verification and cross-referencing</li>
                  <li>Comprehensive report generation</li>
                  <li>Custom depth and focus options</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}

        {stage === "form" && (
          <Dialog open={true} onOpenChange={handleDialogClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customize Your Research</DialogTitle>
                <DialogDescription>
                  Help us tailor the research to your specific needs
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Question 1: Aspect */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">
                    1. What specific aspect interests you most?
                  </Label>
                  <RadioGroup
                    value={formData.aspect}
                    onValueChange={(value) =>
                      setFormData({ ...formData, aspect: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="technical" id="technical" />
                      <Label htmlFor="technical" className="font-normal cursor-pointer">
                        Technical implementation details
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="applications" id="applications" />
                      <Label
                        htmlFor="applications"
                        className="font-normal cursor-pointer"
                      >
                        Real-world applications and use cases
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="comparison" id="comparison" />
                      <Label
                        htmlFor="comparison"
                        className="font-normal cursor-pointer"
                      >
                        Comparative analysis with alternatives
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="trends" id="trends" />
                      <Label htmlFor="trends" className="font-normal cursor-pointer">
                        Future trends and research directions
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Question 2: Depth */}
                <div className="space-y-3">
                  <Label htmlFor="depth" className="text-base font-semibold">
                    2. How comprehensive should the research be?
                  </Label>
                  <Select
                    value={formData.depth}
                    onValueChange={(value) =>
                      setFormData({ ...formData, depth: value })
                    }
                  >
                    <SelectTrigger id="depth">
                      <SelectValue placeholder="Select research depth" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">
                        Quick Overview (5-10 sources, ~5 min)
                      </SelectItem>
                      <SelectItem value="standard">
                        Standard Research (15-20 sources, ~15 min)
                      </SelectItem>
                      <SelectItem value="deep">
                        Deep Dive (30+ sources, ~30 min)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Question 3: Sources */}
                <div className="space-y-3">
                  <Label htmlFor="sources" className="text-base font-semibold">
                    3. Any specific sources to prioritize?{" "}
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </Label>
                  <Input
                    id="sources"
                    placeholder="e.g., arxiv.org, specific journals, company blogs"
                    value={formData.sources}
                    onChange={(e) =>
                      setFormData({ ...formData, sources: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to search across all available sources
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setStage("initial")}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFormSubmit}
                  disabled={!formData.aspect || !formData.depth}
                  className="gap-2"
                >
                  Continue to Plan
                  <Sparkles className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {stage === "plan" && (
          <div className="space-y-6">
            {/* Research Plan using shared component */}
            <ResearchPlan
              title="Research Plan"
              description={`Conduct ${
                formData.depth === "deep" ? "comprehensive" : formData.depth
              } research on "${query}" with focus on ${
                formData.aspect === "technical"
                  ? "technical implementation details"
                  : formData.aspect === "applications"
                  ? "real-world applications"
                  : formData.aspect === "comparison"
                  ? "comparative analysis"
                  : "future trends"
              }.`}
              steps={mockSteps}
              estimatedTime={
                formData.depth === "quick"
                  ? "~5 minutes"
                  : formData.depth === "standard"
                  ? "~15 minutes"
                  : "~30 minutes"
              }
              sourcesCount={
                formData.depth === "quick"
                  ? 7
                  : formData.depth === "standard"
                  ? 17
                  : 30
              }
              defaultOpen={true}
              onBeginResearch={() => {
                // TODO: Implement actual research logic
                console.log("Begin research clicked");
              }}
            />

            {/* Info Card */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-base">What happens next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  When you click "Begin Research", the AI will execute each step
                  of the plan:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Progress updates shown in real-time</li>
                  <li>Sources are verified and analyzed</li>
                  <li>Findings compiled into comprehensive report</li>
                  <li>Citations and references included</li>
                </ul>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setStage("initial");
                  resetForm();
                }}
              >
                Start Over
              </Button>
              <Button
                variant="outline"
                onClick={() => setStage("form")}
              >
                Edit Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepResearchDemoB;
