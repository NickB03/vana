import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DollarSign, Activity, TrendingUp, AlertCircle, RefreshCw, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OverviewData {
  totalRequests: number;
  totalCost: number;
  successRate: number;
  avgLatency: number;
  todayCost: number;
  todayRequests: number;
  byProvider: Array<{ provider: string; requests: number; cost: number }>;
  byFunction: Array<{ function_name: string; requests: number; cost: number; avg_latency: number }>;
}

interface DailyData {
  day: string;
  requests: number;
  cost: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [timeRange, setTimeRange] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin access
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Check if user is admin (adjust based on your setup)
      const adminCheck = user?.email === 'nick@vana.bot' ||
                        user?.user_metadata?.role === 'admin';

      if (!adminCheck) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page",
          variant: "destructive"
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
    };

    checkAuth();
  }, [navigate]);

  // Fetch overview data
  const fetchOverview = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-analytics', {
        body: { metric: 'overview', days: timeRange }
      });

      if (error) throw error;
      setOverview(data.data);
    } catch (error) {
      console.error("Failed to fetch overview:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive"
      });
    }
  }, [timeRange]);

  // Fetch daily data
  const fetchDailyData = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-analytics', {
        body: { metric: 'daily', days: timeRange }
      });

      if (error) throw error;
      setDailyData(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error("Failed to fetch daily data:", error);
    }
  }, [timeRange]);

  // Initial load
  useEffect(() => {
    if (!isAdmin) return;

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchOverview(), fetchDailyData()]);
      setLoading(false);
    };
    loadData();
  }, [timeRange, isAdmin, fetchOverview, fetchDailyData]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isAdmin) return;

    const interval = setInterval(() => {
      fetchOverview();
      fetchDailyData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, timeRange, isAdmin, fetchOverview, fetchDailyData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Usage Dashboard</h1>
          <p className="text-muted-foreground">Monitor Kimi K2 & Gemini API usage and costs</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map((days) => (
          <Button
            key={days}
            variant={timeRange === days ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange(days)}
          >
            Last {days} days
          </Button>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {overview?.todayRequests} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overview?.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${overview?.todayCost.toFixed(2)} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((overview?.successRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.successRate >= 0.95 ? 'Excellent' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.avgLatency}ms</div>
            <p className="text-xs text-muted-foreground">
              Response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="costs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="costs">Cost Breakdown</TabsTrigger>
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="costs" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cost by Provider */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Provider</CardTitle>
                <CardDescription>Last {timeRange} days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={overview?.byProvider || []}
                      dataKey="cost"
                      nameKey="provider"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.provider}: $${entry.cost.toFixed(2)}`}
                    >
                      {(overview?.byProvider || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost by Function */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Function</CardTitle>
                <CardDescription>Last {timeRange} days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overview?.byFunction || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="function_name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cost" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Request Volume</CardTitle>
              <CardDescription>Last {timeRange} days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={Array.isArray(dailyData) ? dailyData.slice(0, 30).reverse() : []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickFormatter={(day) => new Date(day).toLocaleDateString()} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="successful_requests" stroke="#00C49F" name="Successful" />
                  <Line type="monotone" dataKey="failed_requests" stroke="#FF8042" name="Failed" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Average Latency by Function</CardTitle>
              <CardDescription>Response time performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview?.byFunction?.map((func, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{func.function_name}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {func.requests.toLocaleString()} requests
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{func.avg_latency}ms</div>
                      <div className="text-xs text-muted-foreground">
                        ${func.cost.toFixed(4)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
