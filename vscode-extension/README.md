# Sculptor AI — VS Code / Cursor Extension

**Agentic Pareto-Optimal Database Design, right in your editor.**

Sculptor AI is a specialized, database-focused agentic developer support system that supports the full database design lifecycle: analysis, synthesis, selection, integration, and continuous refinement — all without leaving VS Code or Cursor.

## ✨ Features

### 🧠 Analyze Object Models
- Open any file containing an Alloy spec, JSON schema, or plain text description
- Right-click → **Sculptor AI: Analyze Object Model** (or `Ctrl+Shift+S`)
- Three RL algorithms explore the design space in parallel

### 📊 Browse Pareto-Optimal Solutions
- Interactive tree view in the sidebar shows all solutions
- ★ Pareto-optimal solutions highlighted with confidence scores
- Drill down into metrics: query time, insertion time, storage

### 📝 Insert Schemas Directly
- **Sculptor AI: Insert Schema at Cursor** — choose SQL or NoSQL
- Pick from Pareto-optimal solutions ranked by confidence
- Schema is inserted directly at your cursor position

### 🔬 Simulation Lab
- Run load simulations from VS Code
- Configure record counts, query complexity, concurrent users
- View results in the output panel

### 📈 Performance Roadmap
- Visual webview showing performance projections
- Recommendations for indexing, connection pooling, scaling

### ⚙️ Configurable
- Default RL algorithm (Monte Carlo / DQN / Actor-Critic)
- Episode count, reward weights
- Output format (SQL / NoSQL / both)
- Auto-analyze `.als`/`.alloy` files on open

## 🚀 Quick Start

1. Install the extension from the VS Code Marketplace
2. Open a file with your object model (Alloy, JSON, or text)
3. `Ctrl+Shift+S` to analyze
4. Browse solutions in the **Sculptor AI** sidebar
5. Insert the best schema with **Insert Schema at Cursor**

## 📋 Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Analyze Object Model | `Ctrl+Shift+S` | Run RL analysis on current file |
| Open Dashboard | — | Open the Sculptor AI dashboard webview |
| Insert Schema at Cursor | — | Insert SQL/NoSQL at cursor position |
| Browse Pareto Solutions | `Ctrl+Shift+P` | View all Pareto-optimal solutions |
| Run Simulation | — | Simulate load on a solution |
| Select Algorithm | — | Change default RL algorithm |
| View Roadmap | — | Performance recommendations |

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `sculptor-ai.apiEndpoint` | Convex cloud URL | API endpoint |
| `sculptor-ai.defaultAlgorithm` | `actor_critic` | RL algorithm |
| `sculptor-ai.episodes` | `500` | Training episodes |
| `sculptor-ai.rewardWeights.strategy` | `0.35` | Strategy weight |
| `sculptor-ai.rewardWeights.performance` | `0.35` | Performance weight |
| `sculptor-ai.rewardWeights.constraints` | `0.30` | Constraint weight |
| `sculptor-ai.outputFormat` | `both` | SQL, NoSQL, or both |
| `sculptor-ai.autoAnalyze` | `false` | Auto-analyze .als files |

## 🏗️ Supported Input Formats

### Alloy (.als, .alloy)
```alloy
one sig Customer extends Class{}{
  attrSet = customerID+customerName
  id = customerID
  isAbstract = No
  no parent
}
```

### JSON
```json
{
  "classes": [{"name": "Customer", "attributes": [...]}],
  "associations": [{"source": "Customer", "destination": "Order"}]
}
```

### Plain Text
```
class Customer
- customerID: Integer
- customerName: String

association CustomerOrder: Customer -> Order (ONE to MANY)
```

## 🔬 RL Algorithms

- **Monte Carlo Control** — Episode-based policy optimization, ε-greedy exploration (decay 0.995)
- **Deep Q-Network (DQN)** — Neural value estimation, soft-update target networks (τ=1e-3)
- **Actor-Critic** — Policy gradient, entropy regularization for exploration-exploitation

## 📖 Research Foundation

Built on peer-reviewed research published at ICSE, IEEE TSE, and ACM FSE spanning over a decade of work in automated database design optimization.

## 👥 Co-Founders

- [Md Rashedul Hasan](https://www.mdrashedulhasan.me/)
- [Hamid Bagheri](https://cse.unl.edu/~hbagheri/)

## 📜 License

MIT
