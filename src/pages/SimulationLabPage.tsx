import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useGuestUser } from "@/hooks/useGuestUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FlaskConical, Play, Clock, Zap, HardDrive, Activity, BarChart3, Star,
  Pause, RotateCcw, TrendingUp, TrendingDown, Server, Database as DatabaseIcon,
  ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

interface LiveMetrics {
  insertLatency: number;
  queryLatency: number;
  storageKB: number;
  throughput: number;
  p99Latency: number;
  activeConnections: number;
  cacheHitRate: number;
  rowsInserted: number;
  queriesExecuted: number;
  errorRate: number;
}

interface TimeSeriesPoint {
  t: number;
  insertLatency: number;
  queryLatency: number;
  throughput: number;
  p99Latency: number;
}

// Built-in demo solutions so the Simulation Lab works without running an analysis first
const DEMO_SOLUTIONS = [
  {
    _id: "demo-tpc",
    label: "TPC-Joined (Table-Per-Class + Join)",
    algorithm: "MC Control",
    isPareto: true,
    isDemo: true,
    metrics: { insertionTime: 2.8, queryTime: 6.4, storageSize: 95 },
    description: "Balanced strategy — normalized joins with moderate storage",
  },
  {
    _id: "demo-sti",
    label: "STI-Optimized (Single-Table Inheritance)",
    algorithm: "DQN",
    isPareto: true,
    isDemo: true,
    metrics: { insertionTime: 1.2, queryTime: 3.1, storageSize: 210 },
    description: "Fastest queries — denormalized single table, higher storage",
  },
  {
    _id: "demo-cti",
    label: "CTI-Hybrid (Class-Table Inheritance)",
    algorithm: "Actor-Critic",
    isPareto: true,
    isDemo: true,
    metrics: { insertionTime: 3.9, queryTime: 9.7, storageSize: 68 },
    description: "Minimal storage — fully normalized, slower joins",
  },
  {
    _id: "demo-mixed",
    label: "Mixed Strategy (Pareto-Optimal)",
    algorithm: "MC + DQN Ensemble",
    isPareto: true,
    isDemo: true,
    metrics: { insertionTime: 2.1, queryTime: 4.8, storageSize: 135 },
    description: "Best tradeoff — mixed inheritance, RL-optimized assignment",
  },
];

export function SimulationLabPage() {
  const { guestUserId } = useGuestUser();
  const guestArgs = guestUserId ? { guestUserId } : {};
  const solutions = useQuery(api.solutions.getUserSolutions, guestArgs);
  const simulations = useQuery(api.simulations.getUserSimulations, guestArgs);
  const createSim = useMutation(api.simulations.createSimulation);

  const [selectedSolution, setSelectedSolution] = useState<string>("demo-mixed");
  const [numRecords, setNumRecords] = useState(10000);
  const [queryComplexity, setQueryComplexity] = useState("moderate");
  const [concurrentUsers, setConcurrentUsers] = useState(50);

  // Live simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [prevMetrics, setPrevMetrics] = useState<LiveMetrics | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const userSolutions = solutions ?? [];
  const paretoSolutions = userSolutions.filter((s: any) => s.isPareto);

  // Combine demo + user solutions
  const allSolutions = [...DEMO_SOLUTIONS, ...userSolutions] as any[];

  // Simulation parameters derived from solution
  const selectedSol = allSolutions.find((s: any) => s._id === selectedSolution);
  const baseInsert = selectedSol?.metrics?.insertionTime ?? 3.5;
  const baseQuery = selectedSol?.metrics?.queryTime ?? 8.2;
  const baseStorage = selectedSol?.metrics?.storageSize ?? 120;

  // Complexity multipliers
  const complexityMultiplier = { simple: 0.6, moderate: 1.0, complex: 1.8, analytical: 3.0 }[queryComplexity] ?? 1.0;

  // Simulate realistic metrics tick
  const simulateTick = useCallback(() => {
    setElapsedSec(prev => prev + 1);
    setLiveMetrics(prev => {
      const prevM = prev ?? {
        insertLatency: baseInsert, queryLatency: baseQuery * complexityMultiplier,
        storageKB: 0, throughput: 0, p99Latency: 0, activeConnections: 0,
        cacheHitRate: 0, rowsInserted: 0, queriesExecuted: 0, errorRate: 0,
      };

      // Jitter
      const jitter = () => (Math.random() - 0.5) * 0.4;
      const userLoad = concurrentUsers / 50; // normalize to baseline of 50

      // Insert latency increases with load + record count
      const recordPressure = Math.log10(Math.max(numRecords, 100)) / 5;
      const insertLat = Math.max(0.1, baseInsert * (1 + jitter()) * userLoad * recordPressure);

      // Query latency affected by complexity and record count
      const queryLat = Math.max(0.2, baseQuery * complexityMultiplier * (1 + jitter()) * userLoad * recordPressure);

      // Storage grows
      const rowsPerSec = Math.floor(concurrentUsers * 2.5 * (1 + jitter() * 0.3));
      const newRows = prevM.rowsInserted + rowsPerSec;
      const storageKB = baseStorage * (newRows / 1000);

      // Throughput
      const throughput = Math.floor(concurrentUsers * 12 * (1 + jitter() * 0.5) / complexityMultiplier);

      // P99
      const p99 = queryLat * (2.5 + Math.random() * 1.5);

      // Active connections fluctuate
      const activeConns = Math.max(1, Math.floor(concurrentUsers * (0.7 + Math.random() * 0.6)));

      // Cache hit rate improves over time
      const cacheHitRate = Math.min(0.98, 0.5 + (prevM.rowsInserted / numRecords) * 0.3 + Math.random() * 0.05);

      // Queries executed
      const queriesExec = prevM.queriesExecuted + Math.floor(throughput * 0.6);

      // Error rate (very low, occasional spikes)
      const errorRate = Math.random() < 0.05 ? 0.01 + Math.random() * 0.02 : Math.max(0, prevM.errorRate * 0.9 + Math.random() * 0.001);

      const newMetrics: LiveMetrics = {
        insertLatency: insertLat,
        queryLatency: queryLat,
        storageKB,
        throughput,
        p99Latency: p99,
        activeConnections: activeConns,
        cacheHitRate,
        rowsInserted: newRows,
        queriesExecuted: queriesExec,
        errorRate,
      };

      setPrevMetrics(prev);

      return newMetrics;
    });

    setTimeSeries(prev => {
      const newPoint: TimeSeriesPoint = {
        t: prev.length,
        insertLatency: 0,
        queryLatency: 0,
        throughput: 0,
        p99Latency: 0,
      };
      // Will be filled from liveMetrics effect
      return [...prev.slice(-120), newPoint];
    });
  }, [baseInsert, baseQuery, baseStorage, complexityMultiplier, concurrentUsers, numRecords]);

  // Update time series with actual live metrics
  useEffect(() => {
    if (liveMetrics && timeSeries.length > 0) {
      setTimeSeries(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last) {
          last.insertLatency = liveMetrics.insertLatency;
          last.queryLatency = liveMetrics.queryLatency;
          last.throughput = liveMetrics.throughput;
          last.p99Latency = liveMetrics.p99Latency;
        }
        return updated;
      });
    }
  }, [liveMetrics]);

  // Draw real-time chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || timeSeries.length < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    // Background
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (H / 5) * i + 20;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(W - 10, y);
      ctx.stroke();
    }

    const points = timeSeries.slice(-60);
    if (points.length < 2) return;

    const maxQuery = Math.max(...points.map(p => p.queryLatency), 1);
    const maxInsert = Math.max(...points.map(p => p.insertLatency), 1);
    const maxVal = Math.max(maxQuery, maxInsert) * 1.3;
    const xStep = (W - 50) / (points.length - 1);

    // Helper to draw line
    const drawLine = (data: number[], color: string, alpha: number = 1) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;
      data.forEach((val, i) => {
        const x = 40 + i * xStep;
        const y = 20 + (H - 40) * (1 - val / maxVal);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Area fill
      ctx.globalAlpha = alpha * 0.1;
      ctx.lineTo(40 + (data.length - 1) * xStep, H - 20);
      ctx.lineTo(40, H - 20);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    drawLine(points.map(p => p.queryLatency), "#10b981", 1);
    drawLine(points.map(p => p.insertLatency), "#14b8a6", 0.7);

    // Y axis labels
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal / 4) * (4 - i);
      const y = 20 + ((H - 40) / 4) * i;
      ctx.fillText(`${val.toFixed(1)}`, 36, y + 3);
    }

    // Legend
    ctx.textAlign = "left";
    ctx.fillStyle = "#10b981";
    ctx.fillRect(W - 180, 8, 10, 3);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("Query Latency (ms)", W - 165, 13);
    ctx.fillStyle = "#14b8a6";
    ctx.fillRect(W - 180, 22, 10, 3);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("Insert Latency (ms)", W - 165, 27);

  }, [timeSeries]);

  // Start/stop simulation
  const startSimulation = useCallback(async () => {
    if (!selectedSolution) {
      toast.error("Select a solution to simulate");
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    setElapsedSec(0);
    setTimeSeries([]);
    setLiveMetrics(null);
    setPrevMetrics(null);

    // Create server-side record only for real (non-demo) solutions
    const isDemo = selectedSolution.startsWith("demo-");
    if (!isDemo) {
      const sol = allSolutions.find((s: any) => s._id === selectedSolution);
      if (sol) {
        try {
          await createSim({
            solutionId: selectedSolution as Id<"solutions">,
            objectModelId: sol.objectModelId,
            config: { numRecords, queryComplexity, concurrentUsers },
            ...(guestUserId ? { guestUserId } : {}),
          });
        } catch {}
      }
    }

    toast.success(`Simulation started — ${isDemo ? "demo" : "custom"} solution`);

    intervalRef.current = setInterval(() => {
      simulateTick();
    }, 1000);
  }, [selectedSolution, allSolutions, createSim, numRecords, queryComplexity, concurrentUsers, simulateTick, guestUserId]);

  const pauseSimulation = () => {
    setIsPaused(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const resumeSimulation = () => {
    setIsPaused(false);
    intervalRef.current = setInterval(() => simulateTick(), 1000);
  };

  const stopSimulation = () => {
    setIsRunning(false);
    setIsPaused(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    toast.success("Simulation stopped. Results preserved.");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Trend indicator
  const trend = (current: number | undefined, previous: number | undefined) => {
    if (!current || !previous) return <Minus className="size-3 text-muted-foreground" />;
    const diff = ((current - previous) / previous) * 100;
    if (Math.abs(diff) < 2) return <Minus className="size-3 text-muted-foreground" />;
    if (diff > 0) return <ArrowUpRight className="size-3 text-red-400" />;
    return <ArrowDownRight className="size-3 text-emerald-400" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FlaskConical className="size-6 text-emerald-500" />
          Simulation Lab
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time interactive database performance simulation — see how your design performs under production load
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {/* Config Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Solution</Label>
                <Select value={selectedSolution} onValueChange={setSelectedSolution} disabled={isRunning}>
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="Choose..." />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Demo solutions always available */}
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium">⚡ Built-in Scenarios</div>
                    {DEMO_SOLUTIONS.map(s => (
                      <SelectItem key={s._id} value={s._id}>
                        <span className="flex items-center gap-1.5 text-xs">
                          <Star className="size-3 text-emerald-500" />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                    {/* User solutions from analysis runs */}
                    {paretoSolutions.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium border-t mt-1 pt-1.5">★ Your Pareto-Optimal</div>
                        {paretoSolutions.map((s: any) => (
                          <SelectItem key={s._id} value={s._id}>
                            <span className="flex items-center gap-1.5 text-xs">
                              <Star className="size-3 text-amber-500" />
                              #{s.solutionIndex + 1} — {s.algorithm}
                            </span>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {userSolutions.filter((s: any) => !s.isPareto).length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium border-t mt-1 pt-1.5">Your Solutions</div>
                        {userSolutions.filter((s: any) => !s.isPareto).slice(0, 10).map((s: any) => (
                          <SelectItem key={s._id} value={s._id}>
                            <span className="text-xs">#{s.solutionIndex + 1} — {s.algorithm}</span>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {selectedSol?.isDemo && (
                  <p className="text-[10px] text-muted-foreground mt-1">{(selectedSol as any).description}</p>
                )}
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Records</Label>
                  <span className="text-xs font-mono text-muted-foreground">{numRecords.toLocaleString()}</span>
                </div>
                <Slider
                  value={[numRecords]}
                  onValueChange={v => setNumRecords(v[0])}
                  min={100} max={1000000} step={1000}
                  disabled={isRunning}
                />
              </div>

              <div>
                <Label className="text-xs">Query Complexity</Label>
                <Select value={queryComplexity} onValueChange={setQueryComplexity} disabled={isRunning}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="complex">Complex</SelectItem>
                    <SelectItem value="analytical">Analytical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <Label className="text-xs">Concurrent Users</Label>
                  <span className="text-xs font-mono text-muted-foreground">{concurrentUsers}</span>
                </div>
                <Slider
                  value={[concurrentUsers]}
                  onValueChange={v => setConcurrentUsers(v[0])}
                  min={1} max={500} step={5}
                  disabled={isRunning}
                />
              </div>

              <div className="flex gap-2 pt-2">
                {!isRunning ? (
                  <Button
                    onClick={startSimulation}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 h-9 text-xs"
                  >
                    <Play className="size-3.5 mr-1.5" /> Start Simulation
                  </Button>
                ) : (
                  <>
                    {isPaused ? (
                      <Button onClick={resumeSimulation} className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9 text-xs">
                        <Play className="size-3.5 mr-1" /> Resume
                      </Button>
                    ) : (
                      <Button onClick={pauseSimulation} variant="outline" className="flex-1 h-9 text-xs border-amber-500/40 text-amber-400">
                        <Pause className="size-3.5 mr-1" /> Pause
                      </Button>
                    )}
                    <Button onClick={stopSimulation} variant="outline" className="h-9 text-xs border-red-500/40 text-red-400">
                      <RotateCcw className="size-3.5" />
                    </Button>
                  </>
                )}
              </div>

              {isRunning && (
                <div className="text-center">
                  <Badge variant="outline" className={`text-xs ${isPaused ? "border-amber-500/40 text-amber-400" : "border-emerald-500/40 text-emerald-400"}`}>
                    {isPaused ? "⏸ Paused" : "● Live"} — {elapsedSec}s
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main live view */}
        <div className="md:col-span-3 space-y-4">
          {/* Live metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              {
                label: "Insert Latency",
                value: liveMetrics ? `${liveMetrics.insertLatency.toFixed(2)}ms` : "—",
                icon: Zap,
                color: "text-teal-400",
                trendEl: trend(liveMetrics?.insertLatency, prevMetrics?.insertLatency),
              },
              {
                label: "Query Latency",
                value: liveMetrics ? `${liveMetrics.queryLatency.toFixed(2)}ms` : "—",
                icon: Clock,
                color: "text-emerald-400",
                trendEl: trend(liveMetrics?.queryLatency, prevMetrics?.queryLatency),
              },
              {
                label: "Throughput",
                value: liveMetrics ? `${liveMetrics.throughput} ops/s` : "—",
                icon: Activity,
                color: "text-blue-400",
                trendEl: null,
              },
              {
                label: "P99 Latency",
                value: liveMetrics ? `${liveMetrics.p99Latency.toFixed(1)}ms` : "—",
                icon: TrendingUp,
                color: "text-amber-400",
                trendEl: trend(liveMetrics?.p99Latency, prevMetrics?.p99Latency),
              },
              {
                label: "Storage",
                value: liveMetrics
                  ? liveMetrics.storageKB > 1024
                    ? `${(liveMetrics.storageKB / 1024).toFixed(1)}MB`
                    : `${liveMetrics.storageKB.toFixed(0)}KB`
                  : "—",
                icon: HardDrive,
                color: "text-purple-400",
                trendEl: null,
              },
            ].map(m => (
              <Card key={m.label} className="border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <m.icon className={`size-4 ${m.color}`} />
                    {m.trendEl}
                  </div>
                  <div className="mt-2 text-lg font-bold font-mono">{m.value}</div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Real-time chart */}
          <Card className="border-border/40">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="size-4 text-emerald-500" />
                  Real-Time Latency
                </CardTitle>
                {isRunning && !isPaused && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg"
                style={{ height: 220 }}
              />
              {!isRunning && timeSeries.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Start a simulation to see real-time data</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Secondary metrics */}
          {liveMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Server className="size-3.5 text-blue-400" />
                    <span className="text-xs text-muted-foreground">Active Connections</span>
                  </div>
                  <div className="text-xl font-bold font-mono">{liveMetrics.activeConnections}</div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (liveMetrics.activeConnections / concurrentUsers) * 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <DatabaseIcon className="size-3.5 text-emerald-400" />
                    <span className="text-xs text-muted-foreground">Rows Inserted</span>
                  </div>
                  <div className="text-xl font-bold font-mono">{liveMetrics.rowsInserted.toLocaleString()}</div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (liveMetrics.rowsInserted / numRecords) * 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="size-3.5 text-amber-400" />
                    <span className="text-xs text-muted-foreground">Cache Hit Rate</span>
                  </div>
                  <div className="text-xl font-bold font-mono">{(liveMetrics.cacheHitRate * 100).toFixed(1)}%</div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${liveMetrics.cacheHitRate * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingDown className="size-3.5 text-red-400" />
                    <span className="text-xs text-muted-foreground">Error Rate</span>
                  </div>
                  <div className="text-xl font-bold font-mono">{(liveMetrics.errorRate * 100).toFixed(3)}%</div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, liveMetrics.errorRate * 1000)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Query execution log */}
          {isRunning && liveMetrics && (
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="size-4 text-emerald-500" />
                  Live Query Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/30 rounded-lg p-3 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
                  {Array.from({ length: Math.min(8, Math.floor(elapsedSec / 2) + 1) }).map((_, i) => {
                    const ops = ["SELECT", "INSERT", "SELECT", "SELECT", "INSERT", "SELECT", "UPDATE", "SELECT"];
                    const tables = ["customers", "orders", "products", "inventory", "payments", "shipments"];
                    const op = ops[i % ops.length];
                    const table = tables[i % tables.length];
                    const lat = (op === "SELECT" ? liveMetrics.queryLatency : liveMetrics.insertLatency) * (0.7 + Math.random() * 0.6);
                    const status = lat < (op === "SELECT" ? baseQuery * 2 : baseInsert * 2) ? "ok" : "slow";
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-muted-foreground w-20">{new Date(Date.now() - (8 - i) * 1200).toLocaleTimeString()}</span>
                        <Badge variant="outline" className={`text-[10px] w-14 justify-center ${op === "SELECT" ? "border-blue-500/30 text-blue-400" : op === "INSERT" ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}>
                          {op}
                        </Badge>
                        <span className="text-muted-foreground flex-1">{table}</span>
                        <span className={`font-medium ${status === "ok" ? "text-emerald-400" : "text-amber-400"}`}>
                          {lat.toFixed(2)}ms
                        </span>
                        <span className={`size-1.5 rounded-full ${status === "ok" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Past simulations */}
      {simulations && simulations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simulation History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {simulations.map((sim: any) => (
                <div key={sim._id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card">
                  <div className="flex items-center gap-4">
                    <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <FlaskConical className="size-5 text-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sim.config.numRecords.toLocaleString()} records</span>
                        <Badge variant="outline" className="text-xs">{sim.config.queryComplexity}</Badge>
                        <Badge variant="outline" className="text-xs">{sim.config.concurrentUsers} users</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(sim.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {sim.results && (
                    <div className="flex items-center gap-6 text-xs">
                      <div className="text-center">
                        <div className="text-muted-foreground">Insert</div>
                        <div className="font-mono font-medium">{sim.results.avgInsertTime.toFixed(1)}ms</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Query</div>
                        <div className="font-mono font-medium">{sim.results.avgQueryTime.toFixed(1)}ms</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Storage</div>
                        <div className="font-mono font-medium">{(sim.results.storageUsed / 1024).toFixed(1)}MB</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Throughput</div>
                        <div className="font-mono font-medium">{sim.results.throughput} ops/s</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">P99</div>
                        <div className="font-mono font-medium">{sim.results.p99Latency.toFixed(1)}ms</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
