import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Brain, Database, FlaskConical, Code2, Target, BookOpen, Shield, GitBranch, Bot, Plug } from "lucide-react";

export function DocumentationPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between max-w-7xl mx-auto px-6 py-5 border-b border-border/40">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <BarChart3 className="size-4 text-white" />
          </div>
          <span className="text-lg font-bold">DesignTradeoffSculptor</span>
        </Link>
        <Link to="/signup">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Get Started</Button>
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Documentation</h1>
          <p className="text-lg text-muted-foreground mt-3">
            Complete guide to DesignTradeoffSculptor — your agentic database design assistant, from analysis to continuous refinement
          </p>
        </div>

        {/* TOC */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="size-5" /> Contents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-2 text-sm">
              {[
                "1. Overview",
                "2. Research Foundation",
                "3. Object Model Input Formats",
                "4. RL Algorithms",
                "5. ORM Mapping Strategies",
                "6. Pareto Front Identification",
                "7. Schema Generation",
                "8. Simulation Lab",
                "9. Formal Verification",
                "10. IDE Integration",
                "11. Agentic Lifecycle",
                "12. API Reference",
              ].map(item => (
                <a key={item} href={`#${item.split(". ")[1]?.toLowerCase().replace(/\s/g, "-")}`} className="text-emerald-500 hover:underline">
                  {item}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Section 1 */}
        <section id="overview" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="size-6 text-emerald-500" />
            1. Overview
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            DesignTradeoffSculptor is a specialized, database-focused agentic developer support system backed by 
            formal verification. It goes beyond identifying Pareto-optimal solutions to support the full 
            database design lifecycle — analysis, synthesis, selection, integration, and continuous 
            refinement within existing developer workflows.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The platform addresses the fundamental object-relational impedance mismatch by deploying 
            an AI agent that automatically explores the vast design space of possible ORM configurations 
            using reinforcement learning, identifies solutions that optimally balance competing objectives, 
            and integrates them into your codebase via IDE plugins.
          </p>
          <div className="bg-muted/50 rounded-lg border p-4 text-sm">
            <p className="font-medium mb-2">Key Metrics:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• <strong>99.99%</strong> computational cost reduction vs exhaustive analysis</li>
              <li>• <strong>80%+</strong> Pareto-optimal solution identification rate</li>
              <li>• <strong>15 days → minutes</strong> analysis time reduction</li>
              <li>• <strong>15+</strong> benchmark domains validated</li>
            </ul>
          </div>
        </section>

        {/* Section 2 */}
        <section id="research-foundation" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="size-6 text-blue-500" />
            2. Research Foundation
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            DesignTradeoffSculptor is built on over a decade of peer-reviewed research published at top-tier 
            software engineering conferences and journals:
          </p>
          <div className="space-y-3">
            {[
              {
                year: "2014", venue: "ICSE",
                desc: "Introduced specification-driven synthesis of ORM tradespaces using formal logic. First to formalize ORM strategies as first-class design decisions and generate complete tradespaces automatically.",
              },
              {
                year: "2016", venue: "IEEE TSE",
                desc: "Extended with dynamic analysis of synthesized tradespaces, load synthesis, performance measurement, and formal ORM strategy definitions.",
              },
              {
                year: "2025", venue: "ACM FSE",
                desc: "Applied deep learning to predict Pareto-optimal solutions, reducing analysis time from 15 days to 18 minutes while maintaining high accuracy.",
              },
              {
                year: "2026", venue: "Under Review",
                desc: "Introduced RL-based approach with Monte Carlo Control, DQN, and Actor-Critic algorithms. Achieves 80%+ Pareto identification with 99.99% computational cost reduction. Includes formal verification.",
              },
            ].map(p => (
              <div key={p.year} className="flex gap-4 p-4 rounded-lg border border-border/60">
                <div className="text-emerald-500 font-bold text-sm shrink-0 w-12">{p.year}</div>
                <div>
                  <div className="font-medium">Peer-Reviewed Research <span className="text-xs text-muted-foreground">({p.venue})</span></div>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3 */}
        <section id="object-model-input-formats" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Code2 className="size-6 text-amber-500" />
            3. Object Model Input Formats
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            DesignTradeoffSculptor accepts object models in three formats. Each is parsed into a canonical representation 
            consisting of Classes (with attributes, inheritance, primary keys) and Associations (with source, 
            destination, multiplicities).
          </p>

          <h3 className="text-lg font-semibold mt-6">Alloy Format</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Formal specification format. Classes are defined as Alloy signatures extending <code>Class</code>, 
            with <code>attrSet</code>, <code>id</code>, <code>isAbstract</code>, and <code>parent</code> fields.
          </p>
          <pre className="bg-muted/50 border rounded-lg p-4 text-xs font-mono overflow-x-auto">{`one sig Customer extends Class{}{
  attrSet = customerID+customerName
  id = customerID
  isAbstract = No
  no parent
}
one sig customerID extends Integer{}
one sig customerName extends string{}`}</pre>

          <h3 className="text-lg font-semibold mt-6">JSON Format</h3>
          <pre className="bg-muted/50 border rounded-lg p-4 text-xs font-mono overflow-x-auto">{`{
  "classes": [{
    "name": "Customer",
    "attributes": [
      {"name": "customerID", "type": "Integer"},
      {"name": "customerName", "type": "string"}
    ],
    "isAbstract": false,
    "primaryKey": "customerID"
  }],
  "associations": [{
    "name": "CustomerOrderAssoc",
    "source": "Customer",
    "destination": "Order",
    "srcMultiplicity": "ONE",
    "dstMultiplicity": "MANY"
  }]
}`}</pre>

          <h3 className="text-lg font-semibold mt-6">Plain Text Format</h3>
          <pre className="bg-muted/50 border rounded-lg p-4 text-xs font-mono overflow-x-auto">{`class Customer
- customerID: Integer
- customerName: String

class Order
- orderID: Integer

association CustomerOrder: Customer -> Order (ONE to MANY)`}</pre>
        </section>

        {/* Section 4 */}
        <section id="rl-algorithms" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="size-6 text-purple-500" />
            4. RL Algorithms
          </h2>

          <h3 className="text-lg font-semibold">Monte Carlo Control</h3>
          <p className="text-sm text-muted-foreground">
            Learns optimal policies through complete episode experiences. Uses Q-value functions updated through 
            experience replay, ε-greedy exploration with decay (ε_decay = 0.995), and progressive exploration reduction.
          </p>

          <h3 className="text-lg font-semibold">Deep Q-Network (DQN)</h3>
          <p className="text-sm text-muted-foreground">
            Neural network Q-function approximation for generalization across high-dimensional state spaces. 
            Experience replay breaks sequential correlations, target networks with soft-update (τ = 1e-3) for stability.
          </p>

          <h3 className="text-lg font-semibold">Actor-Critic</h3>
          <p className="text-sm text-muted-foreground">
            Actor network parameterizes policy distributions; critic network estimates state-values to reduce 
            gradient variance. Entropy regularization for exploration diversity and advantage estimation for updates.
          </p>

          <div className="bg-muted/50 rounded-lg border p-4 text-sm">
            <p className="font-medium mb-2">Reward Function:</p>
            <code className="text-xs">r = w_strategy · r_strategy + w_performance · r_performance + w_constraints · r_constraints</code>
            <p className="text-xs text-muted-foreground mt-2">
              Default weights: w_strategy = 0.35, w_performance = 0.35, w_constraints = 0.30
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section id="orm-mapping-strategies" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="size-6 text-emerald-500" />
            5. ORM Mapping Strategies
          </h2>

          <h3 className="text-lg font-semibold">Inheritance Strategies</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-border/60">
              <h4 className="font-medium">UnionSubclass</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Each concrete class gets its own independent table with all inherited attributes duplicated. 
                No joins needed for queries but increased storage. Score weight: 1.2.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border/60">
              <h4 className="font-medium">JoinedSubclass</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Normalized parent-child tables joined via foreign keys. Minimal storage redundancy 
                but requires JOIN operations. Score weight: 1.0.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border/60">
              <h4 className="font-medium">UnionSuperclass</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Single consolidated table for entire hierarchy with discriminator column. 
                Simple queries but may have NULL columns. Score weight: 1.1.
              </p>
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-6">Association Strategies</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-border/60">
              <h4 className="font-medium">ForeignKeyEmbedding</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Embeds the foreign key directly in the destination table. Fewer tables, fewer joins. Score weight: 1.15.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border/60">
              <h4 className="font-medium">OwnAssociationTable</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Dedicated junction/bridge table. Required for many-to-many. More flexible but adds join overhead. Score weight: 1.0.
              </p>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section id="pareto-front-identification" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="size-6 text-amber-500" />
            6. Pareto Front Identification
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            After the RL agents explore the design space, DesignTradeoffSculptor identifies the Pareto front using 
            dominance checks across multiple objectives: insertion time, query time, storage consumption, 
            security, and scalability. A solution is Pareto-optimal if no other solution is better in all 
            objectives simultaneously.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            The dynamic Pareto front maintenance replaces dominated solutions and extends with non-dominated ones, 
            ensuring the final set represents the true efficient frontier of the explored design space. 
            Top 50 solutions are presented with confidence levels.
          </p>
        </section>

        {/* Section 7 */}
        <section id="schema-generation" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Code2 className="size-6 text-cyan-500" />
            7. Schema Generation
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Each solution is transformed into deployable database schemas in both SQL (MySQL-compatible) 
            and NoSQL (MongoDB) formats. The SQL formalization preserves semantic relationships, referential 
            integrity via foreign keys, and proper indexing. The NoSQL output generates collection schemas 
            with JSON Schema validation.
          </p>
        </section>

        {/* Section 8 */}
        <section id="simulation-lab" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="size-6 text-emerald-500" />
            8. Simulation Lab
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The Simulation Lab allows testing solutions under realistic production conditions. Configure 
            the number of records (100 to 1M), query complexity (simple to analytical), and concurrent 
            users (1 to 500) to estimate real-world performance including average insert/query latency, 
            storage consumption, throughput, and P99 latency.
          </p>
        </section>

        {/* Section 9 */}
        <section id="formal-verification" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="size-6 text-red-500" />
            9. Formal Verification
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            DesignTradeoffSculptor verifies generated schemas using formal verification to ensure structural and 
            behavioral correctness across four dimensions: class implementation, attribute-to-column mapping, 
            association representation with correct multiplicities, and inheritance hierarchy preservation. 
            Scope-complete analysis guarantees validity.
          </p>
        </section>

        {/* Section 10 */}
        <section id="ide-integration" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Plug className="size-6 text-teal-500" />
            10. IDE Integration
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            The DesignTradeoffSculptor VS Code / Cursor extension brings the full agentic pipeline directly into your 
            editor. Analyze object models, browse Pareto-optimal solutions, preview SQL/NoSQL schemas, 
            and insert them into your project — all without leaving your development environment.
          </p>
        </section>

        {/* Section 11 */}
        <section id="agentic-lifecycle" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="size-6 text-emerald-500" />
            11. Agentic Lifecycle
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            DesignTradeoffSculptor is not just a one-shot tool — it's a continuous design partner. The agentic lifecycle includes:
          </p>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-border/60">
              <h4 className="font-medium">Analysis</h4>
              <p className="text-sm text-muted-foreground mt-1">Parse and understand your domain model, identify classes, associations, constraints, and design requirements.</p>
            </div>
            <div className="p-4 rounded-lg border border-border/60">
              <h4 className="font-medium">Synthesis</h4>
              <p className="text-sm text-muted-foreground mt-1">RL algorithms explore the vast ORM strategy space to generate candidate database designs.</p>
            </div>
            <div className="p-4 rounded-lg border border-border/60">
              <h4 className="font-medium">Selection</h4>
              <p className="text-sm text-muted-foreground mt-1">Multi-objective Pareto optimization identifies the best trade-off solutions for your specific workload.</p>
            </div>
            <div className="p-4 rounded-lg border border-border/60">
              <h4 className="font-medium">Integration</h4>
              <p className="text-sm text-muted-foreground mt-1">Generated schemas are deployed directly into your codebase via VS Code/Cursor plugin or API.</p>
            </div>
            <div className="p-4 rounded-lg border border-border/60">
              <h4 className="font-medium">Continuous Refinement</h4>
              <p className="text-sm text-muted-foreground mt-1">As your application evolves, re-analyze with updated workload profiles to keep designs optimal.</p>
            </div>
          </div>
        </section>

        {/* Section 12 */}
        <section id="api-reference" className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <GitBranch className="size-6 text-purple-500" />
            12. API Reference
          </h2>
          <div className="bg-muted/50 rounded-lg border p-4 text-sm font-mono space-y-2">
            <div><span className="text-emerald-500">POST</span> /api/objectModels.createModel</div>
            <div><span className="text-blue-500">GET</span> /api/objectModels.getUserModels</div>
            <div><span className="text-emerald-500">POST</span> /api/analysisRuns.createRun</div>
            <div><span className="text-blue-500">GET</span> /api/analysisRuns.getRun</div>
            <div><span className="text-blue-500">GET</span> /api/solutions.getByRun</div>
            <div><span className="text-blue-500">GET</span> /api/solutions.getParetoByRun</div>
            <div><span className="text-emerald-500">POST</span> /api/simulations.createSimulation</div>
            <div><span className="text-blue-500">GET</span> /api/benchmarks.list</div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
          <p>
            DesignTradeoffSculptor — Co-founded by{" "}
            <a href="https://www.mdrashedulhasan.me/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2">Md Rashedul Hasan</a>
            {" "}&{" "}
            <a href="https://cse.unl.edu/~hbagheri/" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 hover:text-emerald-300 underline underline-offset-2">Hamid Bagheri</a>
          </p>
        </div>
      </div>
    </div>
  );
}
