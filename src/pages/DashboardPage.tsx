import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";
import { Plus, Database, Brain, FlaskConical, Clock, CheckCircle, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

export function DashboardPage() {
  const models = useQuery(api.objectModels.getUserModels);
  const runs = useQuery(api.analysisRuns.getUserRuns);
  const seedBenchmarks = useMutation(api.benchmarks.seed);
  const deleteModel = useMutation(api.objectModels.deleteModel);

  useEffect(() => {
    seedBenchmarks().catch(() => {});
  }, [seedBenchmarks]);

  const completedRuns = runs?.filter((r: any) => r.status === "complete").length ?? 0;
  const totalPareto = runs?.reduce((sum: number, r: any) => sum + (r.paretoSolutionsFound ?? 0), 0) ?? 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your object models and analysis runs</p>
        </div>
        <Link to="/models/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="size-4 mr-2" /> New Analysis
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Object Models", value: models?.length ?? 0, icon: Database, color: "text-emerald-500" },
          { label: "Analysis Runs", value: runs?.length ?? 0, icon: Brain, color: "text-blue-500" },
          { label: "Completed", value: completedRuns, icon: CheckCircle, color: "text-green-500" },
          { label: "Pareto Solutions", value: totalPareto, icon: FlaskConical, color: "text-amber-500" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`size-8 ${stat.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Models */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Object Models</h2>
        {!models ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" /> Loading...
          </div>
        ) : models.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Database className="size-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground mb-4">No object models yet</p>
              <Link to="/models/new">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="size-4 mr-2" /> Create Your First Model
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {models.map((model: any) => {
              const modelRuns = runs?.filter((r: any) => r.objectModelId === model._id) ?? [];
              const latestRun = modelRuns[0];

              return (
                <Card key={model._id} className="hover:border-emerald-500/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Database className="size-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{model.name}</h3>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {model.inputType}
                            </Badge>
                            <StatusBadge status={model.status} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {model.classes?.length ?? 0} classes · {model.associations?.length ?? 0} associations
                            {latestRun && ` · ${modelRuns.length} run${modelRuns.length > 1 ? "s" : ""}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {latestRun?.status === "complete" && (
                          <Link to={`/results/${latestRun._id}`}>
                            <Button variant="outline" size="sm">View Results</Button>
                          </Link>
                        )}
                        {latestRun?.status === "running" && (
                          <Link to={`/results/${latestRun._id}`}>
                            <Button variant="outline" size="sm">
                              <Loader2 className="size-3 animate-spin mr-1" />
                              {latestRun.progress}%
                            </Button>
                          </Link>
                        )}
                        <Link to={`/analysis/${model._id}`}>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                            {modelRuns.length > 0 ? "Re-Analyze" : "Analyze"}
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => deleteModel({ id: model._id })}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Runs */}
      {runs && runs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Analysis Runs</h2>
          <div className="grid gap-3">
            {runs.slice(0, 5).map((run: any) => (
              <Card key={run._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Brain className="size-5 text-blue-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {run.algorithms.map((a: string) => a === "monte_carlo" ? "MC" : a === "dqn" ? "DQN" : "AC").join(" + ")}
                          </span>
                          <StatusBadge status={run.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {run.config.episodes} episodes
                          {run.totalSolutionsExplored && ` · ${run.totalSolutionsExplored.toLocaleString()} explored`}
                          {run.paretoSolutionsFound && ` · ${run.paretoSolutionsFound} Pareto`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {run.status === "running" && (
                        <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${run.progress}%` }}
                          />
                        </div>
                      )}
                      <Link to={`/results/${run._id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30", icon: Clock },
    parsed: { label: "Parsed", className: "bg-blue-500/10 text-blue-500 border-blue-500/30", icon: CheckCircle },
    queued: { label: "Queued", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30", icon: Clock },
    running: { label: "Running", className: "bg-blue-500/10 text-blue-500 border-blue-500/30", icon: Loader2 },
    complete: { label: "Complete", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", icon: CheckCircle },
    error: { label: "Error", className: "bg-red-500/10 text-red-500 border-red-500/30", icon: AlertCircle },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`text-xs ${c.className}`}>
      <Icon className={`size-3 mr-1 ${status === "running" ? "animate-spin" : ""}`} />
      {c.label}
    </Badge>
  );
}
