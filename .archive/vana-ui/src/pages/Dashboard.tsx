
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/Icons";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
  
  const [userMessages] = useState([
    { id: 1, type: "user", content: "Create a comprehensive market analysis report for Q4 2024" },
    { id: 2, type: "ai", content: "I'll coordinate with our research, data analysis, and reporting specialists to create a detailed market analysis." },
  ]);

  const [teamLogs] = useState([
    { id: 1, agent: "Research Specialist", message: "Gathering market data from 15 sources...", timestamp: "2 min ago", color: "var(--accent-blue)" },
    { id: 2, agent: "Data Analyst", message: "Processing trend analysis for tech sector", timestamp: "1 min ago", color: "var(--accent-purple)" },
    { id: 3, agent: "Report Writer", message: "Structuring executive summary", timestamp: "30 sec ago", color: "var(--accent-orange)" },
    { id: 4, agent: "Quality Reviewer", message: "Reviewing data accuracy and sources", timestamp: "Just now", color: "var(--accent-red)" },
  ]);

  const [taskPlan] = useState([
    { id: 1, task: "Market data collection", status: "done", icon: Icons.checkCircle },
    { id: 2, task: "Competitive analysis", status: "working", icon: Icons.clock },
    { id: 3, task: "Trend identification", status: "working", icon: Icons.clock },
    { id: 4, task: "Executive summary", status: "pending", icon: Icons.alertCircle },
    { id: 5, task: "Visual charts creation", status: "pending", icon: Icons.alertCircle },
    { id: 6, task: "Final review", status: "pending", icon: Icons.alertCircle },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done": return "var(--accent-blue)";
      case "working": return "var(--accent-orange)";
      case "pending": return "var(--text-secondary)";
      default: return "var(--text-secondary)";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "done": return "Completed";
      case "working": return "In Progress";
      case "pending": return "Pending";
      default: return "Unknown";
    }
  };

  const sampleReport = `# Q4 2024 Market Analysis Report

## Executive Summary
The technology sector shows robust growth with emerging AI and cloud computing trends driving significant market expansion.

## Key Findings
- **Market Growth**: 23% YoY increase in tech sector
- **Top Performers**: AI, Cloud Infrastructure, Cybersecurity
- **Investment Flow**: $45B in venture capital funding

## Recommendations
1. Increase investment in AI infrastructure
2. Focus on cybersecurity solutions
3. Expand cloud service offerings

## Market Projections
- Q1 2025: Continued growth expected
- Full Year 2025: 18-22% growth projection

*This report was generated collaboratively by VANA's AI agent team*`;

  return (
    <div className="flex h-screen bg-[var(--bg-main)]">
      {/* Left Sidebar */}
      <div
        className={cn(
          "vana-sidebar flex flex-col transition-all duration-300 ease-in-out",
          sidebarExpanded ? "w-64" : "w-16"
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="p-4 border-b border-[var(--border-primary)]">
          {sidebarExpanded ? (
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Actions</h2>
              <Button size="sm" className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90">
                <Icons.plus className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90 w-full">
              <Icons.plus className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        <div className="p-2 space-y-2">
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start",
              sidebarExpanded ? "px-3" : "px-2"
            )}
          >
            <Icons.settings className="w-4 h-4" />
            <AnimatePresence>
              {sidebarExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="ml-2"
                >
                  New Task
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start",
              sidebarExpanded ? "px-3" : "px-2"
            )}
          >
            <Icons.users className="w-4 h-4" />
            <AnimatePresence>
              {sidebarExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="ml-2"
                >
                  Team Status
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Column 1: User Chat (1/3 width) */}
        <div className="w-1/3 border-r border-[var(--border-primary)] flex flex-col">
          <div className="p-4 border-b border-[var(--border-primary)]">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">User Chat</h2>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {userMessages.map((msg) => (
                <div key={msg.id} className={msg.type === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={msg.type === "user" ? "mock-user-bubble text-sm" : "mock-chat-bubble text-sm"}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t border-[var(--border-primary)]">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-[var(--bg-input)] border-[var(--border-primary)] text-[var(--text-primary)] text-sm"
              />
              <Button size="sm" className="bg-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/90">
                <Icons.send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Column 2: Agent Workflow (2/3 width) */}
        <div className="w-2/3 flex flex-col">
          {/* Top Half: Team Log & Task Plan */}
          <div className="h-1/2 flex border-b border-[var(--border-primary)]">
            {/* Team Log (50%) */}
            <div className="w-1/2 border-r border-[var(--border-primary)] flex flex-col">
              <div className="p-4 border-b border-[var(--border-primary)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Team Log</h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {teamLogs.map((log) => (
                    <Card key={log.id} className="p-3 section-card">
                      <div className="flex items-start space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: log.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                            {log.agent}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mb-2">
                            {log.message}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {log.timestamp}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Task Plan (50%) */}
            <div className="w-1/2 flex flex-col">
              <div className="p-4 border-b border-[var(--border-primary)]">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Task Plan</h3>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {taskPlan.map((task) => (
                    <div key={task.id} className="flex items-center space-x-3 p-3 rounded-lg bg-[var(--bg-element)]">
                      <task.icon 
                        className="w-5 h-5 flex-shrink-0" 
                        style={{ color: getStatusColor(task.status) }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] mb-1">
                          {task.task}
                        </p>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ 
                            borderColor: getStatusColor(task.status),
                            color: getStatusColor(task.status)
                          }}
                        >
                          {getStatusText(task.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Bottom Half: Canvas */}
          <div className="h-1/2 flex flex-col">
            <div className="p-4 border-b border-[var(--border-primary)] flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Generated Report</h3>
              <div className="flex items-center space-x-2">
                <div className="flex bg-[var(--bg-input)] rounded-lg p-1">
                  <Button
                    size="sm"
                    variant={viewMode === "preview" ? "default" : "ghost"}
                    onClick={() => setViewMode("preview")}
                    className="text-xs"
                  >
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "code" ? "default" : "ghost"}
                    onClick={() => setViewMode("code")}
                    className="text-xs"
                  >
                    Code
                  </Button>
                </div>
                <Button size="sm" variant="outline">
                  <Icons.copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              {viewMode === "preview" ? (
                <div className="prose prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ 
                    __html: sampleReport
                      .replace(/^# (.*$)/gim, '<h1 class="gemini-gradient-text text-2xl font-bold mb-4">$1</h1>')
                      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3 text-[var(--text-primary)]">$1</h2>')
                      .replace(/^- (.*$)/gim, '<li class="text-[var(--text-secondary)] mb-1">$1</li>')
                      .replace(/^\d+\. (.*$)/gim, '<li class="text-[var(--text-secondary)] mb-1">$1</li>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--accent-blue)]">$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em class="text-[var(--text-secondary)]">$1</em>')
                  }} />
                </div>
              ) : (
                <pre className="bg-[var(--bg-input)] p-4 rounded-lg text-[var(--text-primary)] text-sm overflow-auto">
                  <code>{sampleReport}</code>
                </pre>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
