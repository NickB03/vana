import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ArrowLeft, Bot, User, Send, RotateCcw, Clock, CheckCircle2, ThumbsUp, ThumbsDown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { ResearchPlan, ResearchPlanStep } from "@/components/deep-research/ResearchPlan";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";

/**
 * DeepResearchDemoB2 - Dynamic Inline Question Types
 *
 * Supports multiple question types that the LLM can dynamically choose:
 * 1. TEXT - Open-ended text input for detailed responses
 * 2. YES_NO - Binary choice with clickable buttons
 * 3. MULTI_SELECT - Checkboxes for selecting multiple options
 * 4. SINGLE_SELECT - Radio buttons for choosing one option
 * 5. SCALE - Numeric scale selection (1-5, 1-10, etc.)
 *
 * The LLM can chain these in any order based on conversation context.
 */

// ============================================================================
// Type Definitions
// ============================================================================

type QuestionType = "text" | "yes_no" | "multi_select" | "single_select" | "scale";

interface BaseQuestion {
  id: string;
  question: string;
  hint?: string;
  required?: boolean;
}

interface TextQuestion extends BaseQuestion {
  type: "text";
  placeholder?: string;
  multiline?: boolean;
}

interface YesNoQuestion extends BaseQuestion {
  type: "yes_no";
  yesLabel?: string;
  noLabel?: string;
  /** Optional follow-up questions based on answer */
  followUp?: {
    yes?: Question;
    no?: Question;
  };
}

interface Option {
  id: string;
  label: string;
  description?: string;
}

interface MultiSelectQuestion extends BaseQuestion {
  type: "multi_select";
  options: Option[];
  minSelection?: number;
  maxSelection?: number;
}

interface SingleSelectQuestion extends BaseQuestion {
  type: "single_select";
  options: Option[];
  layout?: "buttons" | "radio" | "dropdown";
}

interface ScaleQuestion extends BaseQuestion {
  type: "scale";
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}

type Question = TextQuestion | YesNoQuestion | MultiSelectQuestion | SingleSelectQuestion | ScaleQuestion;

interface QuestionAnswer {
  questionId: string;
  type: QuestionType;
  value: string | string[] | number | boolean;
  displayValue: React.ReactNode;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: React.ReactNode;
  timestamp?: Date;
}

type Stage =
  | "initial"
  | "analyzing"
  | "questioning"
  | "planning"
  | "plan-ready";

// ============================================================================
// Demo Question Flow Configuration
// ============================================================================

/**
 * This simulates how an LLM might dynamically generate questions based on context.
 * In production, these would come from the LLM response.
 */
const DEMO_QUESTION_FLOW: Question[] = [
  // Question 1: Multi-select for focus areas
  {
    id: "aspects",
    type: "multi_select",
    question: "What aspects would you like me to focus on?",
    hint: "Select all that apply - you can pick multiple areas",
    options: [
      { id: "technical", label: "Technical Implementation", description: "Architecture, code patterns, and best practices" },
      { id: "applications", label: "Real-World Applications", description: "Case studies, use cases, and practical examples" },
      { id: "comparison", label: "Comparative Analysis", description: "Alternatives, trade-offs, and benchmarks" },
      { id: "trends", label: "Future Trends", description: "Emerging patterns, predictions, and roadmaps" },
    ],
    minSelection: 1,
  },
  // Question 2: Yes/No with follow-up
  {
    id: "specific-tech",
    type: "yes_no",
    question: "Are you focused on a specific technology or framework?",
    hint: "This helps narrow down the research scope",
    yesLabel: "Yes, specific tech",
    noLabel: "No, general overview",
    followUp: {
      yes: {
        id: "tech-name",
        type: "text",
        question: "Which technology or framework should I focus on?",
        placeholder: "e.g., LangChain, AutoGPT, CrewAI, OpenAI Assistants...",
        required: true,
      },
    },
  },
  // Question 3: Single select for depth
  {
    id: "depth",
    type: "single_select",
    question: "How comprehensive should the research be?",
    options: [
      { id: "quick", label: "Quick Overview", description: "~5 min, 5-10 sources" },
      { id: "standard", label: "Standard Research", description: "~15 min, 15-20 sources" },
      { id: "deep", label: "Deep Dive", description: "~30 min, 30+ sources" },
    ],
    layout: "buttons",
  },
  // Question 4: Scale for recency preference
  {
    id: "recency",
    type: "scale",
    question: "How important is information recency?",
    hint: "Higher = prioritize very recent sources (last 3 months)",
    min: 1,
    max: 5,
    minLabel: "Include older sources",
    maxLabel: "Only recent (3 months)",
  },
  // Question 5: Optional text for source preferences
  {
    id: "sources",
    type: "text",
    question: "Any specific sources to prioritize or avoid?",
    hint: "Optional - leave blank to search all sources",
    placeholder: "e.g., Prioritize: arxiv.org, official docs. Avoid: medium.com",
    multiline: true,
    required: false,
  },
];

// ============================================================================
// Question Components
// ============================================================================

interface QuestionRendererProps {
  question: Question;
  onAnswer: (answer: QuestionAnswer) => void;
  disabled?: boolean;
}

function TextQuestionInput({ question, onAnswer, disabled }: QuestionRendererProps & { question: TextQuestion }) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (question.required && !value.trim()) return;
    onAnswer({
      questionId: question.id,
      type: "text",
      value: value.trim() || "(No response)",
      displayValue: value.trim() ? (
        <span>{value}</span>
      ) : (
        <span className="text-muted-foreground italic">No response provided</span>
      ),
    });
  };

  const InputComponent = question.multiline ? Textarea : Input;

  return (
    <Card className="max-w-[85%] border-primary/20">
      <CardContent className="pt-4 space-y-3">
        <div>
          <p className="font-medium">{question.question}</p>
          {question.hint && (
            <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>
          )}
        </div>
        <InputComponent
          placeholder={question.placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !question.multiline) handleSubmit();
          }}
          disabled={disabled}
          className={question.multiline ? "min-h-[80px]" : ""}
        />
        <div className="flex items-center justify-between pt-2 border-t">
          {!question.required && (
            <Button variant="ghost" size="sm" onClick={handleSubmit} disabled={disabled}>
              Skip
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            size="sm"
            className="gap-2 ml-auto"
            disabled={disabled || (question.required && !value.trim())}
          >
            Continue
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function YesNoQuestionInput({ question, onAnswer, disabled }: QuestionRendererProps & { question: YesNoQuestion }) {
  const handleAnswer = (answer: boolean) => {
    onAnswer({
      questionId: question.id,
      type: "yes_no",
      value: answer,
      displayValue: (
        <Badge variant="secondary" className="gap-1">
          {answer ? (
            <><ThumbsUp className="h-3 w-3" /> {question.yesLabel || "Yes"}</>
          ) : (
            <><ThumbsDown className="h-3 w-3" /> {question.noLabel || "No"}</>
          )}
        </Badge>
      ),
    });
  };

  return (
    <Card className="max-w-[85%] border-primary/20">
      <CardContent className="pt-4 space-y-3">
        <div>
          <p className="font-medium">{question.question}</p>
          {question.hint && (
            <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 h-12"
            onClick={() => handleAnswer(true)}
            disabled={disabled}
          >
            <ThumbsUp className="h-4 w-4" />
            {question.yesLabel || "Yes"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 h-12"
            onClick={() => handleAnswer(false)}
            disabled={disabled}
          >
            <ThumbsDown className="h-4 w-4" />
            {question.noLabel || "No"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MultiSelectQuestionInput({ question, onAnswer, disabled }: QuestionRendererProps & { question: MultiSelectQuestion }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleOption = (optionId: string) => {
    setSelected((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }
      if (question.maxSelection && prev.length >= question.maxSelection) {
        return prev;
      }
      return [...prev, optionId];
    });
  };

  const handleSubmit = () => {
    if (question.minSelection && selected.length < question.minSelection) return;

    const selectedLabels = selected
      .map((id) => question.options.find((o) => o.id === id)?.label)
      .filter(Boolean);

    onAnswer({
      questionId: question.id,
      type: "multi_select",
      value: selected,
      displayValue: (
        <div className="flex flex-wrap gap-2">
          {selectedLabels.map((label) => (
            <Badge key={label} variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {label}
            </Badge>
          ))}
        </div>
      ),
    });
  };

  const canSubmit = !question.minSelection || selected.length >= question.minSelection;

  return (
    <Card className="max-w-[85%] border-primary/20">
      <CardContent className="pt-4 space-y-4">
        <div>
          <p className="font-medium">{question.question}</p>
          {question.hint && (
            <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>
          )}
        </div>
        <div className="grid gap-3">
          {question.options.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                selected.includes(option.id)
                  ? "border-primary bg-primary/5"
                  : "border-transparent bg-muted/50 hover:bg-muted",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Checkbox
                checked={selected.includes(option.id)}
                onCheckedChange={() => !disabled && toggleOption(option.id)}
                className="mt-0.5"
                disabled={disabled}
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{option.label}</div>
                {option.description && (
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                )}
              </div>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              {selected.length} selected
              {question.minSelection && selected.length < question.minSelection && (
                <span className="text-destructive ml-2">
                  (min {question.minSelection})
                </span>
              )}
            </span>
            <Button
              onClick={handleSubmit}
              size="sm"
              className="gap-2"
              disabled={disabled || !canSubmit}
            >
              Continue
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SingleSelectQuestionInput({ question, onAnswer, disabled }: QuestionRendererProps & { question: SingleSelectQuestion }) {
  const [selected, setSelected] = useState<string>("");

  const handleSelect = (optionId: string) => {
    const option = question.options.find((o) => o.id === optionId);
    if (!option) return;

    // For buttons layout, submit immediately
    if (question.layout === "buttons") {
      onAnswer({
        questionId: question.id,
        type: "single_select",
        value: optionId,
        displayValue: (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {option.label}
          </Badge>
        ),
      });
    } else {
      setSelected(optionId);
    }
  };

  const handleSubmit = () => {
    const option = question.options.find((o) => o.id === selected);
    if (!option) return;

    onAnswer({
      questionId: question.id,
      type: "single_select",
      value: selected,
      displayValue: (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          {option.label}
        </Badge>
      ),
    });
  };

  // Button layout - clickable cards
  if (question.layout === "buttons") {
    return (
      <Card className="max-w-[85%] border-primary/20">
        <CardContent className="pt-4 space-y-3">
          <div>
            <p className="font-medium">{question.question}</p>
            {question.hint && (
              <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>
            )}
          </div>
          <div className="grid gap-2">
            {question.options.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                className="h-auto py-3 px-4 justify-start text-left"
                onClick={() => handleSelect(option.id)}
                disabled={disabled}
              >
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                    <div className="text-xs text-muted-foreground font-normal">
                      {option.description}
                    </div>
                  )}
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Radio layout
  return (
    <Card className="max-w-[85%] border-primary/20">
      <CardContent className="pt-4 space-y-3">
        <div>
          <p className="font-medium">{question.question}</p>
          {question.hint && (
            <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>
          )}
        </div>
        <RadioGroup value={selected} onValueChange={setSelected} disabled={disabled}>
          {question.options.map((option) => (
            <div key={option.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50">
              <RadioGroupItem value={option.id} id={option.id} className="mt-0.5" />
              <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                <div className="font-medium text-sm">{option.label}</div>
                {option.description && (
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {selected && (
          <div className="flex justify-end pt-2 border-t">
            <Button onClick={handleSubmit} size="sm" className="gap-2" disabled={disabled}>
              Continue
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScaleQuestionInput({ question, onAnswer, disabled }: QuestionRendererProps & { question: ScaleQuestion }) {
  const [value, setValue] = useState<number | null>(null);

  const handleSelect = (num: number) => {
    setValue(num);
    onAnswer({
      questionId: question.id,
      type: "scale",
      value: num,
      displayValue: (
        <Badge variant="secondary" className="gap-1">
          {num} / {question.max}
          {num === question.min && question.minLabel && (
            <span className="text-muted-foreground ml-1">({question.minLabel})</span>
          )}
          {num === question.max && question.maxLabel && (
            <span className="text-muted-foreground ml-1">({question.maxLabel})</span>
          )}
        </Badge>
      ),
    });
  };

  const scaleOptions = Array.from(
    { length: question.max - question.min + 1 },
    (_, i) => question.min + i
  );

  return (
    <Card className="max-w-[85%] border-primary/20">
      <CardContent className="pt-4 space-y-4">
        <div>
          <p className="font-medium">{question.question}</p>
          {question.hint && (
            <p className="text-sm text-muted-foreground mt-1">{question.hint}</p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{question.minLabel || question.min}</span>
            <span>{question.maxLabel || question.max}</span>
          </div>
          <div className="flex gap-2 justify-center">
            {scaleOptions.map((num) => (
              <Button
                key={num}
                variant={value === num ? "default" : "outline"}
                size="sm"
                className={cn(
                  "w-10 h-10 rounded-full",
                  value === num && "ring-2 ring-offset-2 ring-primary"
                )}
                onClick={() => handleSelect(num)}
                disabled={disabled}
              >
                {num}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuestionRenderer({ question, onAnswer, disabled }: QuestionRendererProps) {
  switch (question.type) {
    case "text":
      return <TextQuestionInput question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "yes_no":
      return <YesNoQuestionInput question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "multi_select":
      return <MultiSelectQuestionInput question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "single_select":
      return <SingleSelectQuestionInput question={question} onAnswer={onAnswer} disabled={disabled} />;
    case "scale":
      return <ScaleQuestionInput question={question} onAnswer={onAnswer} disabled={disabled} />;
    default:
      return null;
  }
}

// ============================================================================
// Main Component
// ============================================================================

const DeepResearchDemoB2 = () => {
  const [stage, setStage] = useState<Stage>("initial");
  const [query, setQuery] = useState("Latest trends in AI agents for 2025");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [pendingFollowUp, setPendingFollowUp] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, stage, currentQuestionIndex, pendingFollowUp]);

  // Add message helper
  const addMessage = useCallback((role: "user" | "assistant", content: React.ReactNode) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  // Simulate typing delay
  const simulateTyping = useCallback(async (duration = 1000) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, duration));
    setIsTyping(false);
  }, []);

  // Handle deep research button click
  const handleStartResearch = async () => {
    if (!query.trim()) return;

    addMessage("user", query);
    setStage("analyzing");

    await simulateTyping(1500);

    addMessage(
      "assistant",
      <div className="space-y-2">
        <p>I'll help you research <strong>"{query}"</strong>. To provide the most relevant findings, I have a few quick questions.</p>
        <p className="text-sm text-muted-foreground">Each question helps me tailor the research to your specific needs.</p>
      </div>
    );

    await simulateTyping(800);
    setStage("questioning");
  };

  // Handle question answer
  const handleAnswer = async (answer: QuestionAnswer) => {
    // Add user's answer as a message
    addMessage("user", answer.displayValue);
    setAnswers((prev) => [...prev, answer]);

    // Check for follow-up questions (for yes/no questions)
    const currentQuestion = pendingFollowUp || DEMO_QUESTION_FLOW[currentQuestionIndex];
    if (currentQuestion.type === "yes_no" && currentQuestion.followUp) {
      const followUp = answer.value === true
        ? currentQuestion.followUp.yes
        : currentQuestion.followUp.no;

      if (followUp) {
        await simulateTyping(600);
        addMessage("assistant", <p className="text-sm">{getTransitionText()}</p>);
        await simulateTyping(400);
        setPendingFollowUp(followUp);
        return;
      }
    }

    // Clear any pending follow-up
    setPendingFollowUp(null);

    // Move to next question or planning
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < DEMO_QUESTION_FLOW.length) {
      await simulateTyping(600);

      // Add transition text between questions
      const transition = getTransitionText();
      if (transition) {
        addMessage("assistant", <p className="text-sm">{transition}</p>);
        await simulateTyping(400);
      }

      setCurrentQuestionIndex(nextIndex);
    } else {
      // All questions answered, proceed to planning
      await simulateTyping(800);
      addMessage(
        "assistant",
        <div className="space-y-2">
          <p>Perfect! I have all the information I need.</p>
          <p className="text-sm text-muted-foreground">Creating your personalized research plan...</p>
        </div>
      );
      setStage("planning");

      await simulateTyping(2000);
      setStage("plan-ready");
    }
  };

  // Get random transition text
  const getTransitionText = () => {
    const transitions = [
      "Great choice!",
      "Got it!",
      "Perfect, that helps a lot.",
      "Excellent!",
      "Thanks!",
      "Good to know.",
    ];
    return transitions[Math.floor(Math.random() * transitions.length)];
  };

  // Reset demo
  const handleReset = () => {
    setStage("initial");
    setMessages([]);
    setCurrentQuestionIndex(0);
    setPendingFollowUp(null);
    setAnswers([]);
  };

  // Get current question to display
  const currentQuestion = pendingFollowUp || (stage === "questioning" ? DEMO_QUESTION_FLOW[currentQuestionIndex] : null);

  // Generate research plan steps based on answers
  const generatePlanSteps = (): ResearchPlanStep[] => {
    const steps: ResearchPlanStep[] = [];

    // Find aspect selections
    const aspectAnswer = answers.find((a) => a.questionId === "aspects");
    const aspects = (aspectAnswer?.value as string[]) || [];

    if (aspects.includes("technical")) {
      steps.push({
        id: "technical",
        title: "Technical Deep-Dive",
        description: "Analyze architecture patterns, implementation details, and code examples",
        status: "pending",
        estimatedTime: "3 min",
      });
    }

    if (aspects.includes("applications")) {
      steps.push({
        id: "applications",
        title: "Real-World Applications",
        description: "Gather case studies, production deployments, and practical use cases",
        status: "pending",
        estimatedTime: "4 min",
      });
    }

    if (aspects.includes("comparison")) {
      steps.push({
        id: "comparison",
        title: "Comparative Analysis",
        description: "Compare frameworks, tools, and approaches with benchmarks",
        status: "pending",
        estimatedTime: "3 min",
      });
    }

    if (aspects.includes("trends")) {
      steps.push({
        id: "trends",
        title: "Future Trends & Predictions",
        description: "Research emerging patterns, expert predictions, and roadmaps",
        status: "pending",
        estimatedTime: "2 min",
      });
    }

    // Add tech-specific step if specified
    const techAnswer = answers.find((a) => a.questionId === "tech-name");
    if (techAnswer && typeof techAnswer.value === "string" && techAnswer.value !== "(No response)") {
      steps.unshift({
        id: "specific-tech",
        title: `${techAnswer.value} Focus`,
        description: `Detailed analysis of ${techAnswer.value} specifically`,
        status: "pending",
        estimatedTime: "5 min",
      });
    }

    // Always add synthesis step
    steps.push({
      id: "synthesis",
      title: "Synthesize Findings",
      description: "Compile comprehensive report with citations and key insights",
      status: "pending",
      estimatedTime: "2 min",
    });

    return steps;
  };

  // Get depth info for display
  const getDepthInfo = () => {
    const depthAnswer = answers.find((a) => a.questionId === "depth");
    const depth = depthAnswer?.value as string;
    switch (depth) {
      case "quick": return { label: "Quick Overview", time: "~5 min", sources: 8 };
      case "deep": return { label: "Deep Dive", time: "~30 min", sources: 35 };
      default: return { label: "Standard Research", time: "~15 min", sources: 18 };
    }
  };

  const depthInfo = getDepthInfo();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/deep-research-comparison" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Option B2: Dynamic Inline Questions</h1>
            <Badge variant="outline" className="ml-2">Alternate</Badge>
          </div>
          {stage !== "initial" && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset Demo
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-6 max-w-3xl flex flex-col">
        {/* Initial State */}
        {stage === "initial" && (
          <div className="flex-1 flex flex-col justify-center">
            <Card className="border-2 border-dashed">
              <CardContent className="pt-6 space-y-4">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">Start Deep Research</h2>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Experience dynamic inline questions - the LLM adapts question types based on context.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="query" className="text-sm font-medium">
                    What would you like to research?
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="query"
                      placeholder="e.g., Latest trends in AI agents for 2025"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleStartResearch()}
                      className="flex-1"
                    />
                    <Button onClick={handleStartResearch} disabled={!query.trim()} className="gap-2">
                      <Send className="h-4 w-4" />
                      Research
                    </Button>
                  </div>
                </div>

                {/* Supported question types */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-3 font-medium flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" />
                    Supported question types (LLM chooses dynamically):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span>Multi-select checkboxes</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span>Yes/No buttons</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span>Open text input</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span>Single-select buttons</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span>Numeric scale (1-5)</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-muted/50 rounded">
                      <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                      <span>Follow-up questions</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chat Interface */}
        {stage !== "initial" && (
          <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "flex-row-reverse" : ""
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  {/* Content */}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 max-w-[80%]",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Current Question */}
              {stage === "questioning" && currentQuestion && !isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <QuestionRenderer
                    question={currentQuestion}
                    onAnswer={handleAnswer}
                  />
                </div>
              )}

              {/* Planning indicator */}
              {stage === "planning" && !isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <TextShimmer duration={2} spread={20} className="text-sm">
                      Creating your personalized research plan...
                    </TextShimmer>
                  </div>
                </div>
              )}

              {/* Research Plan */}
              {stage === "plan-ready" && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-2.5">
                      <p>Here's your customized research plan based on your responses:</p>
                    </div>
                  </div>

                  <ResearchPlan
                    title={`Research Plan: ${query}`}
                    description={`${generatePlanSteps().length - 1} focus areas • ${depthInfo.label}`}
                    steps={generatePlanSteps()}
                    estimatedTime={depthInfo.time}
                    sourcesCount={depthInfo.sources}
                    defaultOpen={true}
                    onBeginResearch={() => {
                      console.log("Begin research with:", {
                        query,
                        answers: answers.map((a) => ({ id: a.questionId, value: a.value })),
                      });
                    }}
                    className="ml-11"
                  />

                  {/* Summary of all answers */}
                  <Card className="ml-11 border-primary/20 bg-primary/5">
                    <CardContent className="py-3">
                      <p className="text-xs font-medium mb-2">Your responses summary:</p>
                      <div className="space-y-2">
                        {answers.map((answer) => (
                          <div key={answer.questionId} className="flex items-start gap-2 text-xs">
                            <span className="text-muted-foreground shrink-0">
                              {answer.questionId}:
                            </span>
                            <div>{answer.displayValue}</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeepResearchDemoB2;
