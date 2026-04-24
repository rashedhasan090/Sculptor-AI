import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Brain, Loader2, Play, BarChart3, Database, Settings2, Sparkles, Key, AlertCircle } from "lucide-react";

export function AnalysisPage() {
  const { modelId } = useParams();
  const model = useQuery(api.objectModels.getModel, modelId ? { id: modelId as Id<"objectModels"> } : "skip");
  const createRun = useMutation(api.analysisRuns.createRun);
  const navigate = useNavigate();

  const [algorithms, setAlgorithms] = useState({
    monte_carlo: true,
    dqn: true,
    actor_critic: true,
  });
  const [llmModels, setLlmModels] = useState({
    gpt4: false,
    claude: false,
    gemini: false,
  });
  const [episodes, setEpisodes] = useState(1000);
  const [epsilon, setEpsilon] = useState(0.3);
  const [learningRate, setLearningRate] = useState(0.1);
  const [discountFactor, setDiscountFactor] = useState(0.95);
  const [weightStrategy, setWeightStrategy] = useState(0.35);
  const [weightPerformance, setWeightPerformance] = useState(0.35);
  const [weightConstraints, setWeightConstraints] = useState(0.30);
  const [isRunning, setIsRunning] = useState(false);

  // LLM API Keys (stored in localStorage for privacy)
  const [openaiKey, setOpenaiKey] = useState(() => localStorage.getItem("sculptor-openai-key") || "");
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("sculptor-anthropic-key") || "");
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("sculptor-gemini-key") || "");
  const [showApiKeys, setShowApiKeys] = useState(false);

  const selectedAlgorithms = Object.entries(algorithms).filter(([, v]) => v).map(([k]) => k);
  const selectedLlms = Object.entries(llmModels).filter(([, v]) => v).map(([k]) => k);
  const totalSelected = selectedAlgorithms.length + selectedLlms.length;

  // Check if API keys are provided for selected LLMs
  const missingKeys = [];
  if (llmModels.gpt4 && !openaiKey) missingKeys.push("OpenAI");
  if (llmModels.claude && !anthropicKey) missingKeys.push("Anthropic");
  if (llmModels.gemini && !geminiKey) missingKeys.push("Google");

  const saveApiKey = (provider: string, value: string) => {
    localStorage.setItem(`sculptor-${provider}-key`, value);
  };

  const handleRun = async () => {
    if (totalSelected === 0) {
      toast.error("Select at least one algorithm or LLM");
      return;
    }
    if (missingKeys.length > 0) {
      toast.error(`Missing API keys: ${missingKeys.join(", ")}`);
      setShowApiKeys(true);
      return;
    }
    if (!modelId) return;

    setIsRunning(true);
    try {
      const runId = await createRun({
        objectModelId: modelId as Id<"objectModels">,
        algorithms: [...selectedAlgorithms, ...selectedLlms.map(l => `llm_${l}`)],
        config: {
          episodes,
          epsilon,
          learningRate,
          discountFactor,
          weightStrategy,
          weightPerformance,
          weightConstraints,
        },
      });
      toast.success("Analysis started! Redirecting to results...");
      navigate(`/results/${runId}`);
    } catch (err) {
      toast.error("Failed to start analysis");
      setIsRunning(false);
    }
  };

  if (!model) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading model...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configure Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set RL & LLM parameters for <span className="text-foreground font-medium">{model.name}</span>
        </p>
      </div>

      {/* Model summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Database className="size-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{model.name}</h3>
              <p className="text-xs text-muted-foreground">
                {model.classes?.length ?? 0} classes · {model.associations?.length ?? 0} associations · {model.inputType} format
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {model.classes?.map((c: { name: string; parent?: string }) => (
                <Badge key={c.name} variant="outline" className="text-xs">
                  {c.name}
                  {c.parent && <span className="text-muted-foreground ml-1">→ {c.parent}</span>}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* RL Algorithm Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="size-5 text-blue-500" />
              RL Algorithms
            </CardTitle>
            <CardDescription>
              Reinforcement learning agents for Pareto-optimal exploration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              {
                key: "monte_carlo" as const,
                name: "Monte Carlo Control",
                desc: "Episode-based learning with ε-greedy exploration. Good for delayed rewards.",
                color: "bg-purple-500/10 text-purple-500",
                tag: "MC",
              },
              {
                key: "dqn" as const,
                name: "Deep Q-Network",
                desc: "Neural function approximation with experience replay and target networks.",
                color: "bg-blue-500/10 text-blue-500",
                tag: "DQN",
              },
              {
                key: "actor_critic" as const,
                name: "Actor-Critic",
                desc: "Policy-value networks with entropy regularization for stable multi-objective optimization.",
                color: "bg-emerald-500/10 text-emerald-500",
                tag: "A2C",
              },
            ].map(algo => (
              <div key={algo.key} className="flex items-start gap-4">
                <Switch
                  checked={algorithms[algo.key]}
                  onCheckedChange={v => setAlgorithms(prev => ({ ...prev, [algo.key]: v }))}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{algo.name}</span>
                    <Badge variant="outline" className={`text-xs ${algo.color}`}>
                      {algo.tag}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{algo.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* LLM-Based Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              LLM-Powered Analysis
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 ml-auto">New</Badge>
            </CardTitle>
            <CardDescription>
              Use large language models to reason about database design tradeoffs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              {
                key: "gpt4" as const,
                name: "GPT-4o",
                desc: "OpenAI's flagship model. Strong at multi-objective reasoning and schema generation.",
                color: "bg-green-500/10 text-green-500",
                tag: "OpenAI",
              },
              {
                key: "claude" as const,
                name: "Claude 3.5 Sonnet",
                desc: "Anthropic's reasoning model. Excellent at analyzing complex DB tradeoffs.",
                color: "bg-orange-500/10 text-orange-500",
                tag: "Anthropic",
              },
              {
                key: "gemini" as const,
                name: "Gemini 2.0 Pro",
                desc: "Google's multimodal model. Fast inference with strong code understanding.",
                color: "bg-sky-500/10 text-sky-500",
                tag: "Google",
              },
            ].map(llm => (
              <div key={llm.key} className="flex items-start gap-4">
                <Switch
                  checked={llmModels[llm.key]}
                  onCheckedChange={v => setLlmModels(prev => ({ ...prev, [llm.key]: v }))}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{llm.name}</span>
                    <Badge variant="outline" className={`text-xs ${llm.color}`}>
                      {llm.tag}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{llm.desc}</p>
                </div>
              </div>
            ))}

            {selectedLlms.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setShowApiKeys(!showApiKeys)}
                  className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors"
                >
                  <Key className="size-4" />
                  {showApiKeys ? "Hide" : "Configure"} API Keys
                </button>

                {showApiKeys && (
                  <div className="mt-3 space-y-3">
                    {llmModels.gpt4 && (
                      <div>
                        <Label className="text-xs">OpenAI API Key</Label>
                        <Input
                          type="password"
                          placeholder="sk-..."
                          value={openaiKey}
                          onChange={e => { setOpenaiKey(e.target.value); saveApiKey("openai", e.target.value); }}
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                    )}
                    {llmModels.claude && (
                      <div>
                        <Label className="text-xs">Anthropic API Key</Label>
                        <Input
                          type="password"
                          placeholder="sk-ant-..."
                          value={anthropicKey}
                          onChange={e => { setAnthropicKey(e.target.value); saveApiKey("anthropic", e.target.value); }}
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                    )}
                    {llmModels.gemini && (
                      <div>
                        <Label className="text-xs">Google AI API Key</Label>
                        <Input
                          type="password"
                          placeholder="AIza..."
                          value={geminiKey}
                          onChange={e => { setGeminiKey(e.target.value); saveApiKey("gemini", e.target.value); }}
                          className="mt-1 font-mono text-xs"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Keys are stored locally in your browser — never sent to our servers.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Hyperparameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="size-5 text-amber-500" />
              Hyperparameters
            </CardTitle>
            <CardDescription>
              Fine-tune the RL learning process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs">Training Episodes</Label>
                <span className="text-xs font-mono text-muted-foreground">{episodes}</span>
              </div>
              <Slider value={[episodes]} onValueChange={v => setEpisodes(v[0])} min={100} max={5000} step={100} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs">Epsilon (ε)</Label>
                <span className="text-xs font-mono text-muted-foreground">{epsilon.toFixed(2)}</span>
              </div>
              <Slider value={[epsilon * 100]} onValueChange={v => setEpsilon(v[0] / 100)} min={5} max={80} step={5} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs">Learning Rate (α)</Label>
                <span className="text-xs font-mono text-muted-foreground">{learningRate.toFixed(2)}</span>
              </div>
              <Slider value={[learningRate * 100]} onValueChange={v => setLearningRate(v[0] / 100)} min={1} max={50} step={1} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs">Discount Factor (γ)</Label>
                <span className="text-xs font-mono text-muted-foreground">{discountFactor.toFixed(2)}</span>
              </div>
              <Slider value={[discountFactor * 100]} onValueChange={v => setDiscountFactor(v[0] / 100)} min={50} max={99} step={1} />
            </div>
          </CardContent>
        </Card>

        {/* Objective Weights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-emerald-500" />
              Reward Weights
            </CardTitle>
            <CardDescription>
              Balance strategy, performance, and constraint satisfaction
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs">Strategy Weight</Label>
                <span className="text-xs font-mono text-muted-foreground">{weightStrategy.toFixed(2)}</span>
              </div>
              <Slider value={[weightStrategy * 100]} onValueChange={v => setWeightStrategy(v[0] / 100)} min={0} max={100} step={5} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs">Performance Weight</Label>
                <span className="text-xs font-mono text-muted-foreground">{weightPerformance.toFixed(2)}</span>
              </div>
              <Slider value={[weightPerformance * 100]} onValueChange={v => setWeightPerformance(v[0] / 100)} min={0} max={100} step={5} />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Label className="text-xs">Constraints Weight</Label>
                <span className="text-xs font-mono text-muted-foreground">{weightConstraints.toFixed(2)}</span>
              </div>
              <Slider value={[weightConstraints * 100]} onValueChange={v => setWeightConstraints(v[0] / 100)} min={0} max={100} step={5} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Run button */}
      {missingKeys.length > 0 && selectedLlms.length > 0 && (
        <div className="flex items-center gap-2 text-amber-500 text-sm bg-amber-500/10 rounded-lg p-3">
          <AlertCircle className="size-4 shrink-0" />
          <span>Missing API keys for: {missingKeys.join(", ")}. Configure them above before running.</span>
        </div>
      )}

      <Button
        onClick={handleRun}
        disabled={isRunning || totalSelected === 0}
        className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base"
      >
        {isRunning ? (
          <>
            <Loader2 className="size-5 mr-2 animate-spin" />
            Starting Analysis...
          </>
        ) : (
          <>
            <Play className="size-5 mr-2" />
            Run Pareto Analysis ({selectedAlgorithms.length} RL + {selectedLlms.length} LLM · {episodes} episodes)
          </>
        )}
      </Button>
    </div>
  );
}
