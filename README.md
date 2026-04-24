# Sculptor AI 🧠⚡

**Agentic Pareto-Optimal Database Design, Backed by Formal Verification**

A specialized, database-focused agentic developer support system that goes beyond identifying Pareto-optimal solutions — it supports the full database design lifecycle: analysis, synthesis, selection, integration, and continuous refinement within existing developer workflows.

## 🌐 Live Application

**Production**: [https://reinforceorm-e8b22f70.viktor.space](https://reinforceorm-e8b22f70.viktor.space)

## 👥 Co-Founders

- **[Md Rashedul Hasan](https://www.mdrashedulhasan.me/)** — University of Nebraska–Lincoln
- **[Hamid Bagheri](https://cse.unl.edu/~hbagheri/)** — University of Nebraska–Lincoln

## 📖 Research Foundation

Built on over a decade of peer-reviewed research published at top-tier software engineering venues:

| Year | Venue | Contribution |
|------|-------|-------------|
| 2014 | ICSE | Specification-driven synthesis of ORM tradespaces using formal logic |
| 2016 | IEEE TSE | Dynamic analysis, formal ORM strategy definitions, load synthesis |
| 2025 | ACM FSE | Deep learning approach reducing analysis from 15 days to 18 minutes |
| 2026 | Under Review | RL-based approach: 80%+ Pareto-optimal, 99.99% cost reduction, formal verification |

## 🎯 Agentic Database Design Lifecycle

Sculptor AI implements a full agentic pipeline:

1. **Analysis** — Parse object models (Alloy, JSON, text) and understand your domain
2. **Synthesis** — RL algorithms (MC Control, DQN, Actor-Critic) explore the ORM strategy space
3. **Selection** — Pareto-optimal solutions identified across query time, insertion, storage, security
4. **Integration** — Generate SQL/NoSQL schemas; integrate via VS Code/Cursor plugin
5. **Continuous Refinement** — Re-optimize as your application evolves

## 🎯 Key Features

### Multi-Algorithm RL Engine
- **Monte Carlo Control** — Episode-based policy optimization with ε-greedy exploration (decay 0.995)
- **Deep Q-Network (DQN)** — Neural value estimation with soft-update target networks (τ=1e-3)
- **Actor-Critic** — Policy gradient with entropy regularization

### Pareto-Optimal Solutions
- Multi-objective optimization: query time, insertion time, storage, security, scalability
- Top 50 solutions ranked by confidence level
- Visual Pareto front scatter plots
- Reward formula: `r = 0.35·r_strategy + 0.35·r_performance + 0.30·r_constraints`

### ORM Strategy Space
- **Inheritance**: UnionSubclass (1.2), JoinedSubclass (1.0), UnionSuperclass (1.1)
- **Association**: ForeignKeyEmbedding (1.15), OwnAssociationTable (1.0)

### Flexible Input
- **Alloy Format** — Formal specification (native research format)
- **JSON Schema** — Structured class/association definitions
- **Plain Text** — Natural language descriptions

### Multi-Format Output
- **SQL Schema** — Complete CREATE TABLE + ALTER TABLE
- **NoSQL Schema** — MongoDB collections with JSON Schema validation

### Simulation Lab
- Configure: record counts, query complexity, concurrent users
- Compare Pareto-optimal vs non-optimal solutions under load

### VS Code / Cursor Extension
- Analyze models directly from your editor
- Browse Pareto solutions in sidebar tree view
- Insert SQL/NoSQL schemas at cursor position
- Performance roadmap webview
- See `vscode-extension/` directory

### Formal Verification
- Alloy-based verification for structural and behavioral correctness

### 15+ Benchmarks
Pre-loaded domains: E-Commerce, Hospital, Bank, University, Library, and more.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│            React + Vite Frontend             │
│          (Tailwind CSS + shadcn/ui)          │
├─────────────────────────────────────────────┤
│            Convex Backend (Real-time)        │
│  ┌────────────┐  ┌─────────────────────┐    │
│  │ Object     │  │ RL Engine           │    │
│  │ Model      │  │ (MC/DQN/AC)         │    │
│  │ Parser     │  │                     │    │
│  └────────────┘  │ → Pareto Front      │    │
│                  │ → SQL Generation     │    │
│  ┌────────────┐  │ → NoSQL Gen         │    │
│  │ Simulation │  │ → Confidence        │    │
│  │ Lab        │  └─────────────────────┘    │
│  └────────────┘                             │
├─────────────────────────────────────────────┤
│   VS Code / Cursor Extension                │
│   → Analyze, Browse, Insert, Simulate       │
├─────────────────────────────────────────────┤
│            Convex Database                   │
│   objectModels | analysisRuns | solutions    │
│   simulations | benchmarks                  │
└─────────────────────────────────────────────┘
```

## 🚀 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, shadcn/ui
- **Backend**: Convex (real-time serverless)
- **Authentication**: Convex Auth
- **Deployment**: Vercel + Convex Cloud
- **Language**: TypeScript (full-stack)
- **IDE Extension**: VS Code Extension API

## 📦 Getting Started

### Web Application

```bash
git clone https://github.com/rashedhasan090/ReinforceORM.git
cd ReinforceORM
bun install
bunx convex dev    # Start Convex backend
bun run dev        # Start frontend
```

### VS Code Extension

```bash
cd vscode-extension
npm install
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

## 📊 Performance

| Metric | Value |
|--------|-------|
| Cost reduction vs exhaustive | 99.99% |
| Pareto-optimal coverage | 80%+ |
| Analysis time | Minutes (vs 15 days) |
| Validated benchmarks | 15+ domains |

## 📜 License

Private repository. All rights reserved.

## 📧 Contact

- [Md Rashedul Hasan](https://www.mdrashedulhasan.me/)
- [Hamid Bagheri](https://cse.unl.edu/~hbagheri/)
