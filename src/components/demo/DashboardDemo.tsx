import { useState, useEffect } from 'react';
import { TrendingUp, Users, DollarSign, ShoppingCart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DashboardDemo - Interactive analytics dashboard for demo
 *
 * Features:
 * - Animated metric cards with trending indicators
 * - Mini sparkline charts
 * - Progress bars
 * - Real-time data simulation with smooth transitions
 * - Responsive grid layout
 */

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  delay?: number;
}

function MetricCard({ title, value, change, icon, color, delay = 0 }: MetricCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const isPositive = change >= 0;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-gradient-to-br from-card to-card/50 p-3",
        "transform transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {/* Icon background glow */}
      <div className={cn(
        "absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20",
        color
      )} />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-2">
        <div className={cn(
          "p-1.5 rounded-md",
          color.replace('bg-', 'bg-') + '/10'
        )}>
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-0.5 text-xs font-semibold",
          isPositive ? "text-emerald-500" : "text-red-500"
        )}>
          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(change)}%
        </div>
      </div>

      {/* Value */}
      <div className="relative">
        <div className="text-xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{title}</div>
      </div>
    </div>
  );
}

interface ChartBarProps {
  height: number;
  label: string;
  color: string;
  delay?: number;
}

function ChartBar({ height, label, color, delay = 0 }: ChartBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-full h-16 flex items-end">
        <div
          className={cn(
            "w-full rounded-t transition-all duration-1000 ease-out",
            color,
            "shadow-md"
          )}
          style={{
            height: isVisible ? `${height}%` : '0%',
          }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

interface ProgressItemProps {
  label: string;
  value: number;
  color: string;
  delay?: number;
}

function ProgressItem({ label, value, color, delay = 0 }: ProgressItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground font-semibold">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            color
          )}
          style={{
            width: isVisible ? `${value}%` : '0%',
          }}
        />
      </div>
    </div>
  );
}

export function DashboardDemo() {
  return (
    <div className="h-full bg-background p-4 overflow-hidden">
      <div className="h-full flex flex-col gap-3">
        {/* Header */}
        <div className="space-y-0.5 shrink-0">
          <h1 className="text-xl font-bold tracking-tight">Q4 Results</h1>
          <p className="text-xs text-muted-foreground">Quarterly performance metrics</p>
        </div>

        {/* Metric Cards Grid - 2x2 */}
        <div className="grid grid-cols-2 gap-2 shrink-0">
          <MetricCard
            title="Revenue"
            value="$48,592"
            change={12.5}
            icon={<DollarSign className="h-4 w-4 text-emerald-500" />}
            color="bg-emerald-500"
            delay={0}
          />
          <MetricCard
            title="Users"
            value="2,847"
            change={8.2}
            icon={<Users className="h-4 w-4 text-blue-500" />}
            color="bg-blue-500"
            delay={100}
          />
          <MetricCard
            title="Conversion"
            value="3.24%"
            change={-2.1}
            icon={<TrendingUp className="h-4 w-4 text-purple-500" />}
            color="bg-purple-500"
            delay={200}
          />
          <MetricCard
            title="Orders"
            value="1,429"
            change={15.8}
            icon={<ShoppingCart className="h-4 w-4 text-orange-500" />}
            color="bg-orange-500"
            delay={300}
          />
        </div>

        {/* Charts Section - side by side */}
        <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
          {/* Revenue Chart */}
          <div className="rounded-lg border bg-card p-3 flex flex-col">
            <div className="mb-2 shrink-0">
              <h2 className="text-sm font-semibold">Revenue</h2>
              <p className="text-[10px] text-muted-foreground">Last 7 days</p>
            </div>
            <div className="grid grid-cols-7 gap-1 flex-1 items-end">
              <ChartBar height={65} label="M" color="bg-emerald-500" delay={400} />
              <ChartBar height={78} label="T" color="bg-emerald-500" delay={500} />
              <ChartBar height={55} label="W" color="bg-emerald-500" delay={600} />
              <ChartBar height={85} label="T" color="bg-emerald-500" delay={700} />
              <ChartBar height={72} label="F" color="bg-emerald-500" delay={800} />
              <ChartBar height={90} label="S" color="bg-emerald-500" delay={900} />
              <ChartBar height={95} label="S" color="bg-emerald-500" delay={1000} />
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="rounded-lg border bg-card p-3 flex flex-col">
            <div className="mb-2 shrink-0">
              <h2 className="text-sm font-semibold">Traffic</h2>
              <p className="text-[10px] text-muted-foreground">By channel</p>
            </div>
            <div className="space-y-2 flex-1">
              <ProgressItem label="Organic" value={45} color="bg-blue-500" delay={1100} />
              <ProgressItem label="Direct" value={30} color="bg-purple-500" delay={1200} />
              <ProgressItem label="Social" value={15} color="bg-pink-500" delay={1300} />
              <ProgressItem label="Email" value={10} color="bg-orange-500" delay={1400} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
