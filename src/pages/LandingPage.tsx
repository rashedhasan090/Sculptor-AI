import { Link } from "react-router-dom";
import { ArrowRight, Brain, FlaskConical, Shield, Zap, BarChart3, Layers, Code2, Target, Bot, RefreshCw, Plug, Workflow, Download, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-background to-teal-950/30" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(16,185,129,0.15) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(20,184,166,0.15) 0%, transparent 50%)`
        }} />

        <nav className="relative z-10 flex items-center justify-between max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <BarChart3 className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Sculptor AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/docs">
              <Button variant="ghost" size="sm">Documentation</Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Get Started</Button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-6">
              <Bot className="size-3.5" />
              Agentic Database Design · Backed by Formal Verification
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08]">
              Your AI Agent for{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                Pareto-Optimal
              </span>
              {" "}Database Design
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Sculptor AI is a specialized, database-focused agentic developer support system that goes beyond 
              identifying Pareto-optimal solutions — it supports the full database design lifecycle: analysis, 
              synthesis, selection, integration, and continuous refinement within your existing developer workflows.
            </p>
            <div className="flex items-center gap-4 mt-8 flex-wrap">
              <Link to="/signup">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 h-12 px-7 text-base">
                  Start Building <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
              <a href="https://github.com/rashedhasan090/Sculptor-AI/releases" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="h-12 px-7 text-base border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
                  <Download className="mr-2 size-4" /> VS Code Extension
                </Button>
              </a>
              <Link to="/docs">
                <Button variant="outline" size="lg" className="h-12 px-7 text-base border-border/60">
                  Read the Docs
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-3xl">
            {[
              { label: "Cost Reduction", value: "99.99%", sub: "vs exhaustive" },
              { label: "Pareto Coverage", value: "80%+", sub: "optimal found" },
              { label: "Benchmarks", value: "15+", sub: "domains" },
              { label: "RL Algorithms", value: "3+", sub: "ensemble" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Agentic Lifecycle */}
      <section className="py-24 bg-card/50 border-y border-border/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight">Full Database Design Lifecycle</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              An agentic pipeline from object model to production-ready, continuously refined database
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6">
            {[
              {
                icon: Code2,
                step: "01",
                title: "Analysis",
                desc: "Upload your domain model in any format. The agent parses classes, associations, and constraints to understand your domain."
              },
              {
                icon: Brain,
                step: "02",
                title: "Synthesis",
                desc: "RL algorithms (MC Control, DQN, Actor-Critic) explore the vast ORM strategy space to synthesize candidate designs."
              },
              {
                icon: Target,
                step: "03",
                title: "Selection",
                desc: "Pareto-optimal solutions identified across query time, insertion, storage, security — ranked by confidence."
              },
              {
                icon: Plug,
                step: "04",
                title: "Integration",
                desc: "Generate deployable SQL/NoSQL schemas. Integrate directly into your codebase via VS Code / Cursor plugin."
              },
              {
                icon: RefreshCw,
                step: "05",
                title: "Refinement",
                desc: "Continuous monitoring, simulation, and re-optimization as your application evolves and workloads change."
              },
            ].map(item => (
              <div key={item.step} className="relative group">
                <div className="text-6xl font-black text-emerald-500/10 absolute -top-2 -left-1 group-hover:text-emerald-500/20 transition-colors">
                  {item.step}
                </div>
                <div className="relative pt-10">
                  <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                    <item.icon className="size-5 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight">Core Capabilities</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Backed by over a decade of peer-reviewed research in automated database design
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Bot,
                title: "Agentic Design Pipeline",
                desc: "An AI agent that autonomously analyzes your domain model, explores the design space, identifies optimal trade-offs, and generates production-ready schemas — end to end."
              },
              {
                icon: Brain,
                title: "Multi-Algorithm RL Engine",
                desc: "Monte Carlo Control, Deep Q-Networks, and Actor-Critic explore complementary regions of the design space. ε-greedy exploration with decay ensures convergence."
              },
              {
                icon: Layers,
                title: "ORM Strategy Synthesis",
                desc: "Three inheritance strategies (UnionSubclass, JoinedSubclass, UnionSuperclass) and two association strategies (ForeignKey, OwnTable) for complete coverage."
              },
              {
                icon: BarChart3,
                title: "Pareto Front Visualization",
                desc: "Interactive scatter plots showing the tradeoff landscape. Compare solutions across insertion time, query time, storage, and security dimensions."
              },
              {
                icon: Shield,
                title: "Formal Verification",
                desc: "Every generated schema is backed by formal verification to ensure structural and behavioral correctness — no guesswork, mathematical guarantees."
              },
              {
                icon: FlaskConical,
                title: "Simulation Lab",
                desc: "Test solutions under realistic loads. Configure record counts, query complexity, and concurrent users to predict production performance."
              },
              {
                icon: Plug,
                title: "IDE Integration",
                desc: "VS Code and Cursor plugin for seamless integration into your developer workflow. Analyze, select, and apply schemas without leaving your editor."
              },
              {
                icon: Workflow,
                title: "Continuous Refinement",
                desc: "As your application evolves, re-run analysis with updated workload profiles to keep your database design Pareto-optimal over time."
              },
              {
                icon: Zap,
                title: "99.99% Cost Reduction",
                desc: "RL-based exploration reduces computational cost from days to minutes while identifying 80%+ of Pareto-optimal solutions."
              },
            ].map(item => (
              <div key={item.title} className="rounded-xl border border-border/60 bg-card p-6 hover:border-emerald-500/40 transition-colors">
                <div className="size-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                  <item.icon className="size-5 text-emerald-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Research foundation - no paper names */}
      <section className="py-24 bg-card/50 border-y border-border/40">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight">Research Foundation</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Grounded in peer-reviewed research published at top-tier software engineering venues
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                year: "2014",
                venue: "ICSE",
                desc: "Specification-driven synthesis of ORM tradespaces using formal logic and automated analysis.",
                color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
              },
              {
                year: "2016",
                venue: "IEEE TSE",
                desc: "Dynamic analysis of synthesized tradespaces with formal strategy definitions and load synthesis.",
                color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
              },
              {
                year: "2025",
                venue: "ACM FSE",
                desc: "Deep learning approach reducing analysis from 15 days to 18 minutes while maintaining high accuracy.",
                color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
              },
              {
                year: "2026",
                venue: "Under Review",
                desc: "Reinforcement learning approach achieving 80%+ Pareto identification with 99.99% cost reduction and formal verification.",
                color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
              },
            ].map(p => (
              <div key={p.year} className="flex gap-4 rounded-xl border border-border/60 bg-card p-5">
                <div className={`shrink-0 size-12 rounded-lg flex items-center justify-center text-xs font-bold border ${p.color}`}>
                  {p.year}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Peer-Reviewed Research</span>
                    <span className="text-xs text-muted-foreground">({p.venue})</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VS Code / Cursor Extension */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-card to-teal-950/20 p-10 md:p-14">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-4">
                  <Monitor className="size-3.5" />
                  IDE Plugin Available
                </div>
                <h2 className="text-3xl font-bold tracking-tight">VS Code & Cursor Extension</h2>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  Analyze object models, browse Pareto-optimal solutions, and insert SQL/NoSQL schemas — 
                  all without leaving your editor. The full agentic pipeline, directly in your IDE.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><Zap className="size-3.5 text-emerald-500 shrink-0" /> Analyze with <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">Ctrl+Shift+S</code></li>
                  <li className="flex items-center gap-2"><Target className="size-3.5 text-emerald-500 shrink-0" /> Browse Pareto solutions in sidebar tree view</li>
                  <li className="flex items-center gap-2"><Code2 className="size-3.5 text-emerald-500 shrink-0" /> Insert SQL/NoSQL at cursor position</li>
                  <li className="flex items-center gap-2"><BarChart3 className="size-3.5 text-emerald-500 shrink-0" /> Interactive dashboard &amp; performance roadmap</li>
                  <li className="flex items-center gap-2"><Brain className="size-3.5 text-emerald-500 shrink-0" /> Select algorithm: MC Control, DQN, Actor-Critic</li>
                </ul>
                <div className="flex items-center gap-3 mt-6">
                  <a href="https://github.com/rashedhasan090/Sculptor-AI/releases" target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 h-11 px-6">
                      <Download className="mr-2 size-4" /> Download Extension
                    </Button>
                  </a>
                  <Link to="/docs#ide-integration">
                    <Button variant="ghost" size="lg" className="h-11 text-emerald-400 hover:text-emerald-300">
                      View Docs →
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-5 font-mono text-xs leading-relaxed">
                <div className="flex items-center gap-2 mb-3 text-muted-foreground">
                  <div className="size-3 rounded-full bg-red-500/60" />
                  <div className="size-3 rounded-full bg-yellow-500/60" />
                  <div className="size-3 rounded-full bg-green-500/60" />
                  <span className="text-xs ml-2">extension.ts</span>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <div><span className="text-purple-400">import</span> * <span className="text-purple-400">as</span> vscode <span className="text-purple-400">from</span> <span className="text-emerald-400">"vscode"</span>;</div>
                  <div className="mt-2"><span className="text-blue-400">// 🧠 Sculptor AI activated</span></div>
                  <div><span className="text-purple-400">export function</span> <span className="text-yellow-400">activate</span>(ctx) {"{"}</div>
                  <div className="pl-4"><span className="text-blue-400">// 7 commands registered</span></div>
                  <div className="pl-4"><span className="text-purple-400">const</span> analyze = <span className="text-yellow-400">analyzeModel</span>();</div>
                  <div className="pl-4"><span className="text-purple-400">const</span> pareto = <span className="text-yellow-400">identifyParetoFront</span>();</div>
                  <div className="pl-4"><span className="text-purple-400">const</span> schema = <span className="text-yellow-400">generateSQL</span>(model);</div>
                  <div className="pl-4 mt-1"><span className="text-blue-400">// ★ Insert at cursor</span></div>
                  <div className="pl-4">editor.<span className="text-yellow-400">insertSchemaAtCursor</span>(schema);</div>
                  <div>{"}"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to Sculpt Your Database?</h2>
          <p className="text-muted-foreground mt-4 max-w-lg mx-auto">
            Let Sculptor AI analyze your domain, synthesize optimal designs, and integrate them 
            into your workflow — all in minutes, backed by formal verification.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link to="/signup">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 h-12 px-8">
                Get Started Free <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-emerald-500" />
            <span className="font-semibold text-foreground">Sculptor AI</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-center">
            <span>Co-founded by</span>
            <a href="https://www.mdrashedulhasan.me/" target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
              Md Rashedul Hasan
            </a>
            <span>&</span>
            <a href="https://cse.unl.edu/~hbagheri/" target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
              Hamid Bagheri
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
