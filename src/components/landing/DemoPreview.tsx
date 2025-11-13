import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Sparkles, TrendingUp, Users, DollarSign, FileSpreadsheet } from "lucide-react";

export const DemoPreview = () => {
  const [step, setStep] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Animation sequence with smooth transitions using transform
  // Runs once on mount and sets up infinite animation loop
  // Empty dependency array ensures proper cleanup on unmount and prevents memory leaks
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    const runAnimation = () => {
      // Step 0: Show user message
      timers.push(setTimeout(() => setStep(1), 800));

      // Step 1: Show assistant response
      timers.push(setTimeout(() => setStep(2), 2500));

      // Step 2: Show artifact and scroll down using transform
      timers.push(setTimeout(() => {
        setStep(3);
        // Scroll down to show artifact (approximate height of user + assistant messages)
        setScrollOffset(200);
      }, 4200));

      // Step 3: Hold for viewing, then reset and loop
      timers.push(setTimeout(() => {
        setStep(0);
        // Reset scroll position
        setScrollOffset(0);
        // Restart the animation loop
        runAnimation();
      }, 8200));
    };

    // Start the animation loop
    runAnimation();

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] bg-background border-2 rounded-xl shadow-2xl overflow-hidden">
      {/* Simulated browser chrome */}
      <div className="bg-muted border-b px-4 py-2 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 bg-background/50 rounded px-3 py-1 text-xs text-muted-foreground ml-2">
          localhost:8080
        </div>
      </div>

      {/* Chat simulation */}
      <div className="p-4 h-[calc(100%-3rem)] overflow-hidden relative">
        <div
          className="space-y-3 transition-transform duration-500 ease-in-out"
          style={{ transform: `translateY(-${scrollOffset}px)` }}
        >
        {/* User message with attachment */}
        {step >= 1 && (
          <div className="flex justify-end animate-in fade-in slide-in-from-right-5 duration-500">
            <div className="max-w-[85%] space-y-2">
              {/* Excel attachment */}
              <div className="flex justify-end">
                <div className="bg-muted/50 border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-green-600" />
                  <div className="text-xs">
                    <div className="font-medium">Q3_Report.xlsx</div>
                    <div className="text-muted-foreground">24 KB</div>
                  </div>
                </div>
              </div>
              {/* User message */}
              <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm">
                Create a dashboard for this report.
              </div>
            </div>
          </div>
        )}

        {/* Assistant message - show when step 2 starts */}
        {step >= 2 && (
          <div className="flex justify-start animate-in fade-in slide-in-from-left-5 duration-500">
            <div className="bg-muted rounded-lg px-4 py-2 max-w-[85%]">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Vana</span>
              </div>
              <p className="text-sm">
                I'll create an interactive analytics dashboard with your Q3 data.
                This will include key metrics, trends, and visualizations.
              </p>
            </div>
          </div>
        )}

        {/* Artifact card - dashboard preview (appears after Vana response) */}
        {step >= 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
            <Card className="p-3 border-primary/50 bg-primary/5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold">Q3 Analytics Dashboard</h4>
                    <p className="text-[10px] text-muted-foreground">React • TypeScript • Recharts</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                  Interactive
                </Badge>
              </div>
              <div className="bg-background/50 rounded-md p-2 space-y-1.5">
                {/* Mini dashboard preview */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="bg-purple-500/10 rounded p-1.5 border border-purple-500/20">
                    <TrendingUp className="h-3 w-3 text-purple-400 mb-0.5" />
                    <div className="text-[10px] font-semibold text-purple-400">+24%</div>
                    <div className="text-[8px] text-muted-foreground">Q3 Growth</div>
                  </div>
                  <div className="bg-cyan-500/10 rounded p-1.5 border border-cyan-500/20">
                    <Users className="h-3 w-3 text-cyan-400 mb-0.5" />
                    <div className="text-[10px] font-semibold text-cyan-400">8.2k</div>
                    <div className="text-[8px] text-muted-foreground">New Users</div>
                  </div>
                  <div className="bg-emerald-500/10 rounded p-1.5 border border-emerald-500/20">
                    <DollarSign className="h-3 w-3 text-emerald-400 mb-0.5" />
                    <div className="text-[10px] font-semibold text-emerald-400">$124k</div>
                    <div className="text-[8px] text-muted-foreground">Revenue</div>
                  </div>
                </div>
                {/* Mini chart representation - colorful gradient bars */}
                <div className="flex items-end gap-0.5 h-8 justify-between px-1">
                  {[
                    { height: 40, color: 'bg-blue-500' },
                    { height: 65, color: 'bg-purple-500' },
                    { height: 45, color: 'bg-cyan-500' },
                    { height: 80, color: 'bg-emerald-500' },
                    { height: 55, color: 'bg-blue-500' },
                    { height: 90, color: 'bg-purple-500' },
                    { height: 70, color: 'bg-cyan-500' },
                    { height: 85, color: 'bg-emerald-500' },
                  ].map((bar, i) => (
                    <div
                      key={i}
                      className={`flex-1 ${bar.color} rounded-sm opacity-80`}
                      style={{ height: `${bar.height}%` }}
                    />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
