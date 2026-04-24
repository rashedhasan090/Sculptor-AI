import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Database, Loader2, Copy, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export function BenchmarksPage() {
  const benchmarks = useQuery(api.benchmarks.list);
  const seedBenchmarks = useMutation(api.benchmarks.seed);
  const createModel = useMutation(api.objectModels.createModel);
  const navigate = useNavigate();

  useEffect(() => {
    seedBenchmarks().catch(() => {});
  }, [seedBenchmarks]);

  const handleUseBenchmark = async (name: string, modelText: string) => {
    try {
      const modelId = await createModel({
        name: `${name} (Benchmark)`,
        description: `Pre-loaded benchmark from peer-reviewed research`,
        inputType: "alloy",
        rawInput: modelText,
      });
      toast.success(`${name} benchmark loaded!`);
      navigate(`/analysis/${modelId}`);
    } catch (err) {
      toast.error("Failed to load benchmark");
    }
  };

  if (!benchmarks) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading benchmarks...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Benchmark Datasets</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pre-loaded object models from peer-reviewed research across 15 real-world domains
        </p>
      </div>

      <div className="grid gap-4">
        {benchmarks.map((b: any) => (
          <Card key={b._id} className="hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Database className="size-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{b.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{b.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className="text-xs">{b.numClasses} classes</Badge>
                      <Badge variant="outline" className="text-xs">{b.numAssociations} associations</Badge>
                      <Badge variant="outline" className="text-xs">{b.totalDesigns.toLocaleString()} total designs</Badge>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
                        {b.paretoOptimalCount} Pareto optimal
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(b.objectModelText);
                      toast.success("Object model copied!");
                    }}
                  >
                    <Copy className="size-3.5 mr-1" /> Copy
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => handleUseBenchmark(b.name, b.objectModelText)}
                  >
                    Analyze <ArrowRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {benchmarks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="size-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-4">No benchmarks loaded yet</p>
            <Button onClick={() => seedBenchmarks()} className="bg-emerald-600 hover:bg-emerald-700">
              Load Benchmark Datasets
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
