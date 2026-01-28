import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Sparkles, TrendingUp, Users, DollarSign, FileSpreadsheet } from "lucide-react";

export const DemoPreview = () => {
  const [step, setStep] = useState(0);

  // Animation sequence with smooth transitions
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    const runAnimation = () => {
      // Step 0: Show user message
      timers.push(setTimeout(() => setStep(1), 800));

      // Step 1: Show assistant response
      timers.push(setTimeout(() => setStep(2), 2500));

      // Step 2: Show artifact
      timers.push(setTimeout(() => setStep(3), 4200));

      // Step 3: Hold for viewing, then reset and loop
      timers.push(setTimeout(() => {
        setStep(0);
        runAnimation();
      }, 8200));
    };

    runAnimation();

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  return (
    <div className="relative w-full aspect-[892/720] bg-background border-2 rounded-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Simulated browser chrome */}
      <div className="bg-muted border-b px-4 py-2 flex items-center gap-2 shrink-0">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 bg-background/50 rounded px-3 py-1 text-xs text-muted-foreground ml-2">
          https://vana.bot
        </div>
      </div>

      {/* Chat simulation - flex-1 to fill remaining space */}
      <div className="p-2 flex-1 overflow-hidden flex flex-col">
        <div className="space-y-1.5 flex-1 flex flex-col">
          {/* User message with attachment */}
          {step >= 1 && (
            <div className="flex justify-end animate-in fade-in slide-in-from-right-5 duration-500 shrink-0">
              <div className="max-w-[80%] space-y-1">
                {/* Excel attachment */}
                <div className="flex justify-end">
                  <div className="bg-muted/50 border border-border rounded-lg px-2 py-1.5 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3 w-3 text-green-600" />
                    <div className="text-[10px]">
                      <div className="font-medium">Q3_Report.xlsx</div>
                      <div className="text-muted-foreground">24 KB</div>
                    </div>
                  </div>
                </div>
                {/* User message */}
                <div className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs">
                  Create a dashboard for this report.
                </div>
              </div>
            </div>
          )}

          {/* Assistant message */}
          {step >= 2 && (
            <div className="flex justify-start animate-in fade-in slide-in-from-left-5 duration-500 shrink-0">
              <div className="bg-muted rounded-lg px-3 py-1.5 max-w-[80%]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-medium">Vana</span>
                </div>
                <p className="text-xs">
                  I'll create an interactive analytics dashboard with your Q3 data.
                </p>
              </div>
            </div>
          )}

          {/* Artifact card - 70% width, flex to fill remaining space */}
          {step >= 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 flex-1 flex flex-col min-h-0 w-[70%]">
              <Card className="p-1.5 border-primary/50 bg-primary/5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-1 shrink-0">
                  <div className="flex items-center gap-1">
                    <div className="p-0.5 bg-primary/10 rounded">
                      <LayoutDashboard className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-[8px] font-semibold leading-tight">Q3 Analytics Dashboard</h4>
                      <p className="text-[6px] text-muted-foreground leading-tight">React • TypeScript • Recharts</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[6px] px-1 py-0 h-3">
                    Interactive
                  </Badge>
                </div>
                <div className="bg-background/50 rounded p-1.5 flex-1 flex flex-col gap-1.5">
                  {/* Top: Mini metrics row */}
                  <div className="flex gap-1.5 shrink-0">
                    <div className="bg-purple-500/10 rounded px-1.5 py-1 border border-purple-500/20 flex items-center gap-1 flex-1">
                      <TrendingUp className="h-2 w-2 text-purple-400" />
                      <div>
                        <div className="text-[8px] font-semibold text-purple-400 leading-tight">+24%</div>
                        <div className="text-[5px] text-muted-foreground leading-tight">Growth</div>
                      </div>
                    </div>
                    <div className="bg-cyan-500/10 rounded px-1.5 py-1 border border-cyan-500/20 flex items-center gap-1 flex-1">
                      <Users className="h-2 w-2 text-cyan-400" />
                      <div>
                        <div className="text-[8px] font-semibold text-cyan-400 leading-tight">8.2k</div>
                        <div className="text-[5px] text-muted-foreground leading-tight">Users</div>
                      </div>
                    </div>
                    <div className="bg-emerald-500/10 rounded px-1.5 py-1 border border-emerald-500/20 flex items-center gap-1 flex-1">
                      <DollarSign className="h-2 w-2 text-emerald-400" />
                      <div>
                        <div className="text-[8px] font-semibold text-emerald-400 leading-tight">$124k</div>
                        <div className="text-[5px] text-muted-foreground leading-tight">Revenue</div>
                      </div>
                    </div>
                  </div>
                  {/* Bottom: Chart fills remaining space */}
                  <div className="flex items-end gap-0.5 flex-1 min-h-[2rem]">
                    {[
                      { height: 35, color: 'bg-blue-500' },
                      { height: 60, color: 'bg-purple-500' },
                      { height: 45, color: 'bg-cyan-500' },
                      { height: 80, color: 'bg-emerald-500' },
                      { height: 50, color: 'bg-blue-500' },
                      { height: 70, color: 'bg-purple-500' },
                    ].map((bar, i) => (
                      <div
                        key={i}
                        className={`flex-1 ${bar.color} rounded-[2px] opacity-80`}
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
