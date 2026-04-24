import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, Link } from "react-router-dom";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, CheckCircle, Loader2, Star, ArrowRight, Database, Clock, Zap, Target, BarChart3 } from "lucide-react";
import { useMemo } from "react";

export function ResultsPage() {
  const { runId } = useParams();
  const run = useQuery(api.analysisRuns.getRun, runId ? { id: runId as Id<"analysisRuns"> } : "skip");
  const solutions = useQuery(api.solutions.getByRun, runId ? { analysisRunId: runId as Id<"analysisRuns"> } : "skip");

  const sortedSolutions = useMemo(() => {
    if (!solutions) return [];
    return [...solutions].sort((a, b) => {
      if (a.isPareto !== b.isPareto) return a.isPareto ? -1 : 1;
      return b.reward - a.reward;
    });
  }, [solutions]);

  const paretoSolutions = sortedSolutions.filter(s => s.isPareto);

  if (!run) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (run.status === "running" || run.status === "queued") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="size-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
              <Brain className="size-8 text-emerald-500 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold mb-2">Analysis in Progress</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {run.algorithms.map((a: string) => a === "monte_carlo" ? "Monte Carlo" : a === "dqn" ? "DQN" : "Actor-Critic").join(", ")} •{" "}
              {run.config.episodes} episodes
            </p>
            <div className="w-full max-w-sm">
              <Progress value={run.progress} className="h-3" />
              <p className="text-center text-sm text-muted-foreground mt-2">{run.progress}% complete</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Metrics ranges for visualization
  const metrics = sortedSolutions.map(s => s.metrics);
  const insertRange = { min: Math.min(...metrics.map(m => m.insertionTime)), max: Math.max(...metrics.map(m => m.insertionTime)) };
  const queryRange = { min: Math.min(...metrics.map(m => m.queryTime)), max: Math.max(...metrics.map(m => m.queryTime)) };
  const storageRange = { min: Math.min(...metrics.map(m => m.storageSize)), max: Math.max(...metrics.map(m => m.storageSize)) };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analysis Results</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sortedSolutions.length} solutions found · {paretoSolutions.length} Pareto-optimal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            <CheckCircle className="size-3 mr-1" /> Complete
          </Badge>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Explored", value: run.totalSolutionsExplored?.toLocaleString() ?? "—", icon: Brain },
          { label: "Unique Solutions", value: sortedSolutions.length, icon: Database },
          { label: "Pareto Optimal", value: paretoSolutions.length, icon: Star },
          { label: "Best Insert Time", value: `${insertRange.min.toFixed(1)}ms`, icon: Zap },
          { label: "Best Query Time", value: `${queryRange.min.toFixed(1)}ms`, icon: Clock },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <s.icon className="size-3.5" />
                <span className="text-xs">{s.label}</span>
              </div>
              <span className="text-lg font-bold">{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pareto Front Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-emerald-500" />
            Pareto Front — Tradespace Visualization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative h-80 border rounded-lg bg-muted/30 overflow-hidden">
            {/* SVG scatter plot */}
            <svg viewBox="0 0 800 320" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {/* Grid */}
              {[0, 1, 2, 3, 4].map(i => (
                <g key={i}>
                  <line x1={80} y1={30 + i * 62} x2={760} y2={30 + i * 62} stroke="currentColor" strokeOpacity={0.1} />
                  <text x={70} y={34 + i * 62} textAnchor="end" className="fill-muted-foreground" fontSize="10">
                    {(queryRange.max - (i / 4) * (queryRange.max - queryRange.min)).toFixed(0)}
                  </text>
                </g>
              ))}
              {[0, 1, 2, 3, 4].map(i => (
                <g key={i}>
                  <line x1={80 + i * 170} y1={30} x2={80 + i * 170} y2={278} stroke="currentColor" strokeOpacity={0.1} />
                  <text x={80 + i * 170} y={298} textAnchor="middle" className="fill-muted-foreground" fontSize="10">
                    {(insertRange.min + (i / 4) * (insertRange.max - insertRange.min)).toFixed(0)}
                  </text>
                </g>
              ))}

              {/* Axis labels */}
              <text x={420} y={316} textAnchor="middle" className="fill-muted-foreground" fontSize="11" fontWeight="500">
                Insertion Time (ms)
              </text>
              <text x={15} y={155} textAnchor="middle" className="fill-muted-foreground" fontSize="11" fontWeight="500" transform="rotate(-90, 15, 155)">
                Query Time (ms)
              </text>

              {/* Non-Pareto points */}
              {sortedSolutions.filter(s => !s.isPareto).map((sol, i) => {
                const x = 80 + ((sol.metrics.insertionTime - insertRange.min) / (insertRange.max - insertRange.min || 1)) * 680;
                const y = 278 - ((sol.metrics.queryTime - queryRange.min) / (queryRange.max - queryRange.min || 1)) * 248;
                const r = 3 + ((sol.metrics.storageSize - storageRange.min) / (storageRange.max - storageRange.min || 1)) * 5;
                return (
                  <circle key={i} cx={x} cy={y} r={r} fill="currentColor" fillOpacity={0.15} stroke="currentColor" strokeOpacity={0.3} strokeWidth={0.5} />
                );
              })}

              {/* Pareto points */}
              {paretoSolutions.map((sol, i) => {
                const x = 80 + ((sol.metrics.insertionTime - insertRange.min) / (insertRange.max - insertRange.min || 1)) * 680;
                const y = 278 - ((sol.metrics.queryTime - queryRange.min) / (queryRange.max - queryRange.min || 1)) * 248;
                const r = 4 + ((sol.metrics.storageSize - storageRange.min) / (storageRange.max - storageRange.min || 1)) * 6;
                return (
                  <g key={`p${i}`}>
                    <circle cx={x} cy={y} r={r + 3} fill="rgba(16,185,129,0.15)" />
                    <circle cx={x} cy={y} r={r} fill="rgb(16,185,129)" fillOpacity={0.8} stroke="rgb(16,185,129)" strokeWidth={1.5} />
                  </g>
                );
              })}

              {/* Pareto front line */}
              {paretoSolutions.length > 1 && (() => {
                const sorted = [...paretoSolutions].sort((a, b) => a.metrics.insertionTime - b.metrics.insertionTime);
                const points = sorted.map(s => {
                  const x = 80 + ((s.metrics.insertionTime - insertRange.min) / (insertRange.max - insertRange.min || 1)) * 680;
                  const y = 278 - ((s.metrics.queryTime - queryRange.min) / (queryRange.max - queryRange.min || 1)) * 248;
                  return `${x},${y}`;
                });
                return <polyline points={points.join(" ")} fill="none" stroke="rgb(16,185,129)" strokeWidth={1.5} strokeDasharray="6,3" strokeOpacity={0.6} />;
              })()}

              {/* Legend */}
              <circle cx={620} cy={20} r={5} fill="rgb(16,185,129)" fillOpacity={0.8} />
              <text x={630} y={24} className="fill-foreground" fontSize="10">Pareto Optimal</text>
              <circle cx={620} cy={38} r={4} fill="currentColor" fillOpacity={0.15} stroke="currentColor" strokeOpacity={0.3} />
              <text x={630} y={42} className="fill-muted-foreground" fontSize="10">Other Solutions</text>
            </svg>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Point size represents storage consumption. Pareto-optimal solutions form the efficient frontier.
          </p>
        </CardContent>
      </Card>

      {/* Solutions table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="size-5 text-amber-500" />
            All Solutions (Top {sortedSolutions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">Algorithm</th>
                  <th className="pb-3 pr-4">Insert (ms)</th>
                  <th className="pb-3 pr-4">Query (ms)</th>
                  <th className="pb-3 pr-4">Storage</th>
                  <th className="pb-3 pr-4">Confidence</th>
                  <th className="pb-3 pr-4">Reward</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {sortedSolutions.map((sol, i) => (
                  <tr key={sol._id} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td className="py-3 pr-4">
                      {sol.isPareto ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
                          <Star className="size-3 mr-1" /> Pareto
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Non-dominated</Badge>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="outline" className="text-xs">
                        {sol.algorithm === "Monte Carlo Control" ? "MC" : sol.algorithm === "Deep Q-Network" ? "DQN" : "A2C"}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      <MetricBar value={sol.metrics.insertionTime} min={insertRange.min} max={insertRange.max} color="blue" />
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      <MetricBar value={sol.metrics.queryTime} min={queryRange.min} max={queryRange.max} color="purple" />
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">
                      <MetricBar value={sol.metrics.storageSize} min={storageRange.min} max={storageRange.max} color="amber" />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${sol.confidence * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono">{(sol.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{sol.reward.toFixed(3)}</td>
                    <td className="py-3">
                      <Link to={`/solution/${sol._id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs">
                          Details <ArrowRight className="size-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricBar({ value, min, max, color }: { value: number; min: number; max: number; color: string }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 50;
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    amber: "bg-amber-500",
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${colorMap[color]} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span>{typeof value === "number" && value > 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(1)}</span>
    </div>
  );
}
