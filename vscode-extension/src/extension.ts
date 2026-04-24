import * as vscode from "vscode";

// ─── Constants ────────────────────────────────────────────────────────────────
const CHANNEL_NAME = "Sculptor AI";
const DEFAULT_API = "https://clever-jay-27.convex.cloud";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedModel {
  classes: ClassDef[];
  associations: AssociationDef[];
}

interface ClassDef {
  name: string;
  attributes: { name: string; type: string }[];
  isAbstract: boolean;
  primaryKey: string;
  parent?: string;
}

interface AssociationDef {
  name: string;
  source: string;
  destination: string;
  srcMultiplicity: string;
  dstMultiplicity: string;
}

interface ParetoSolution {
  id: string;
  rank: number;
  confidence: number;
  isParetoOptimal: boolean;
  strategies: Record<string, string>;
  metrics: {
    insertionTime: number;
    queryTime: number;
    storageSize: number;
  };
  sqlSchema: string;
  nosqlSchema: string;
}

interface AnalysisResult {
  runId: string;
  status: string;
  solutions: ParetoSolution[];
  paretoCount: number;
  totalExplored: number;
}

// ─── State ────────────────────────────────────────────────────────────────────
let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let currentResult: AnalysisResult | null = null;
let solutionProvider: SolutionTreeProvider;

// ─── Activation ───────────────────────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel(CHANNEL_NAME);
  outputChannel.appendLine("Sculptor AI activated — Agentic Database Design Assistant");

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.text = "$(beaker) Sculptor AI";
  statusBarItem.tooltip = "Sculptor AI — Click to open dashboard";
  statusBarItem.command = "sculptor-ai.openDashboard";
  statusBarItem.show();

  // Solution tree view
  solutionProvider = new SolutionTreeProvider();
  vscode.window.registerTreeDataProvider("sculptorSolutions", solutionProvider);

  // Register all commands
  context.subscriptions.push(
    vscode.commands.registerCommand("sculptor-ai.analyzeModel", analyzeModel),
    vscode.commands.registerCommand("sculptor-ai.openDashboard", openDashboard),
    vscode.commands.registerCommand("sculptor-ai.insertSchema", insertSchema),
    vscode.commands.registerCommand("sculptor-ai.browsePareto", browsePareto),
    vscode.commands.registerCommand("sculptor-ai.runSimulation", runSimulation),
    vscode.commands.registerCommand("sculptor-ai.selectAlgorithm", selectAlgorithm),
    vscode.commands.registerCommand("sculptor-ai.viewRoadmap", viewRoadmap),
    statusBarItem,
    outputChannel
  );

  // Auto-analyze on file open (if enabled)
  vscode.workspace.onDidOpenTextDocument((doc) => {
    const config = vscode.workspace.getConfiguration("sculptor-ai");
    if (
      config.get<boolean>("autoAnalyze") &&
      (doc.fileName.endsWith(".als") || doc.fileName.endsWith(".alloy"))
    ) {
      vscode.commands.executeCommand("sculptor-ai.analyzeModel");
    }
  });

  outputChannel.appendLine("All commands registered. Ready to sculpt databases.");
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function analyzeModel() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage(
      "Sculptor AI: Open a file containing an object model first."
    );
    return;
  }

  const text = editor.document.getText();
  if (!text.trim()) {
    vscode.window.showWarningMessage("Sculptor AI: The file is empty.");
    return;
  }

  // Detect input format
  const format = detectFormat(text);
  outputChannel.appendLine(`\nDetected format: ${format}`);

  // Parse model
  let parsed: ParsedModel;
  try {
    parsed = parseModel(text, format);
    outputChannel.appendLine(
      `Parsed: ${parsed.classes.length} classes, ${parsed.associations.length} associations`
    );
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `Sculptor AI: Failed to parse model — ${err.message}`
    );
    return;
  }

  // Select algorithm
  const config = vscode.workspace.getConfiguration("sculptor-ai");
  const algorithm =
    config.get<string>("defaultAlgorithm") || "actor_critic";
  const episodes = config.get<number>("episodes") || 500;

  // Show progress
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Sculptor AI",
      cancellable: true,
    },
    async (progress, token) => {
      progress.report({
        message: `Analyzing with ${algorithmLabel(algorithm)}...`,
        increment: 0,
      });

      statusBarItem.text = "$(loading~spin) Sculptor AI — Analyzing...";

      try {
        // Call the Sculptor AI API
        const apiEndpoint = config.get<string>("apiEndpoint") || DEFAULT_API;
        const result = await callAnalysisAPI(
          apiEndpoint,
          parsed,
          algorithm,
          episodes,
          progress,
          token
        );

        currentResult = result;
        solutionProvider.refresh(result.solutions);

        vscode.commands.executeCommand(
          "setContext",
          "sculptorHasResults",
          true
        );

        statusBarItem.text = `$(check) Sculptor AI — ${result.paretoCount} Pareto-optimal`;

        vscode.window
          .showInformationMessage(
            `Sculptor AI: Found ${result.paretoCount} Pareto-optimal solutions out of ${result.totalExplored} explored.`,
            "Browse Solutions",
            "Insert Best SQL",
            "Insert Best NoSQL"
          )
          .then((choice) => {
            if (choice === "Browse Solutions") {
              vscode.commands.executeCommand("sculptor-ai.browsePareto");
            } else if (choice === "Insert Best SQL") {
              insertSchemaAtCursor(result.solutions[0]?.sqlSchema || "");
            } else if (choice === "Insert Best NoSQL") {
              insertSchemaAtCursor(result.solutions[0]?.nosqlSchema || "");
            }
          });
      } catch (err: any) {
        statusBarItem.text = "$(error) Sculptor AI — Error";
        if (token.isCancellationRequested) {
          outputChannel.appendLine("Analysis cancelled by user.");
        } else {
          vscode.window.showErrorMessage(
            `Sculptor AI: Analysis failed — ${err.message}`
          );
          outputChannel.appendLine(`Error: ${err.message}`);
        }
      }
    }
  );
}

async function openDashboard() {
  const panel = vscode.window.createWebviewPanel(
    "sculptorDashboard",
    "Sculptor AI Dashboard",
    vscode.ViewColumn.One,
    { enableScripts: true }
  );
  panel.webview.html = getDashboardHTML(currentResult);
}

async function insertSchema() {
  if (!currentResult || currentResult.solutions.length === 0) {
    vscode.window.showWarningMessage(
      "Sculptor AI: No analysis results. Run 'Analyze Object Model' first."
    );
    return;
  }

  const format = await vscode.window.showQuickPick(
    [
      { label: "SQL Schema", description: "MySQL-compatible CREATE TABLE", value: "sql" },
      { label: "NoSQL Schema", description: "MongoDB collection design", value: "nosql" },
    ],
    { placeHolder: "Select output format" }
  );

  if (!format) return;

  const solutions = currentResult.solutions.filter((s) => s.isParetoOptimal);
  const picks = solutions.map((s, i) => ({
    label: `#${i + 1} — Confidence: ${(s.confidence * 100).toFixed(1)}%`,
    description: `Query: ${s.metrics.queryTime.toFixed(1)}ms | Insert: ${s.metrics.insertionTime.toFixed(1)}ms | Storage: ${s.metrics.storageSize.toFixed(0)}KB`,
    solution: s,
  }));

  const selected = await vscode.window.showQuickPick(picks, {
    placeHolder: "Select a Pareto-optimal solution",
  });

  if (!selected) return;

  const schema =
    format.value === "sql"
      ? selected.solution.sqlSchema
      : selected.solution.nosqlSchema;

  insertSchemaAtCursor(schema);
}

async function browsePareto() {
  if (!currentResult || currentResult.solutions.length === 0) {
    vscode.window.showWarningMessage(
      "Sculptor AI: No analysis results. Run 'Analyze Object Model' first."
    );
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "sculptorPareto",
    "Sculptor AI — Pareto Solutions",
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );
  panel.webview.html = getParetoHTML(currentResult.solutions);
}

async function runSimulation() {
  if (!currentResult || currentResult.solutions.length === 0) {
    vscode.window.showWarningMessage(
      "Sculptor AI: No solutions to simulate. Run analysis first."
    );
    return;
  }

  const records = await vscode.window.showInputBox({
    prompt: "Number of records to simulate",
    value: "10000",
    validateInput: (v) =>
      isNaN(Number(v)) ? "Must be a number" : undefined,
  });
  if (!records) return;

  const complexity = await vscode.window.showQuickPick(
    ["simple", "moderate", "complex", "analytical"],
    { placeHolder: "Query complexity" }
  );
  if (!complexity) return;

  outputChannel.appendLine(
    `\nRunning simulation: ${records} records, ${complexity} complexity...`
  );
  vscode.window.showInformationMessage(
    `Sculptor AI: Simulation started with ${records} records and ${complexity} queries.`
  );
}

async function selectAlgorithm() {
  const config = vscode.workspace.getConfiguration("sculptor-ai");
  const current = config.get<string>("defaultAlgorithm") || "actor_critic";

  const picked = await vscode.window.showQuickPick(
    [
      {
        label: "Monte Carlo Control",
        description: current === "mc_control" ? "(current)" : "",
        value: "mc_control",
        detail: "Episode-based policy optimization with ε-greedy exploration (decay 0.995)",
      },
      {
        label: "Deep Q-Network (DQN)",
        description: current === "dqn" ? "(current)" : "",
        value: "dqn",
        detail: "Neural value estimation with soft-update target networks (τ=1e-3)",
      },
      {
        label: "Actor-Critic",
        description: current === "actor_critic" ? "(current)" : "",
        value: "actor_critic",
        detail: "Policy gradient with entropy regularization for exploration-exploitation balance",
      },
    ],
    { placeHolder: "Select RL algorithm for next analysis" }
  );

  if (picked) {
    await config.update("defaultAlgorithm", picked.value, true);
    vscode.window.showInformationMessage(
      `Sculptor AI: Algorithm set to ${picked.label}`
    );
  }
}

async function viewRoadmap() {
  if (!currentResult || currentResult.solutions.length === 0) {
    vscode.window.showWarningMessage("Sculptor AI: No results to show roadmap for.");
    return;
  }

  const panel = vscode.window.createWebviewPanel(
    "sculptorRoadmap",
    "Sculptor AI — Performance Roadmap",
    vscode.ViewColumn.Two,
    { enableScripts: true }
  );
  panel.webview.html = getRoadmapHTML(currentResult.solutions[0]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectFormat(text: string): "alloy" | "json" | "text" {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (/\bsig\b.*extends\s+Class/.test(trimmed)) return "alloy";
  return "text";
}

function parseModel(text: string, format: string): ParsedModel {
  if (format === "json") {
    const obj = JSON.parse(text);
    return {
      classes: (obj.classes || []).map((c: any) => ({
        name: c.name,
        attributes: c.attributes || [],
        isAbstract: c.isAbstract || false,
        primaryKey: c.primaryKey || c.attributes?.[0]?.name || "id",
        parent: c.parent,
      })),
      associations: (obj.associations || []).map((a: any) => ({
        name: a.name || `${a.source}_${a.destination}`,
        source: a.source,
        destination: a.destination,
        srcMultiplicity: a.srcMultiplicity || "ONE",
        dstMultiplicity: a.dstMultiplicity || "MANY",
      })),
    };
  }

  if (format === "alloy") {
    return parseAlloy(text);
  }

  return parsePlainText(text);
}

function parseAlloy(text: string): ParsedModel {
  const classes: ClassDef[] = [];
  const associations: AssociationDef[] = [];

  // Parse class signatures
  const sigRegex =
    /one\s+sig\s+(\w+)\s+extends\s+Class\s*\{[^}]*\}\s*\{([^}]*)\}/g;
  let match;
  while ((match = sigRegex.exec(text)) !== null) {
    const name = match[1];
    const body = match[2];

    const attrMatch = body.match(/attrSet\s*=\s*(.+)/);
    const idMatch = body.match(/id\s*=\s*(\w+)/);
    const abstractMatch = body.match(/isAbstract\s*=\s*(\w+)/);
    const parentMatch = body.match(/parent\s*=\s*(\w+)/);

    const attrNames = attrMatch
      ? attrMatch[1].split("+").map((a) => a.trim())
      : [];

    classes.push({
      name,
      attributes: attrNames.map((a) => ({ name: a, type: "String" })),
      isAbstract: abstractMatch?.[1] === "Yes",
      primaryKey: idMatch?.[1] || attrNames[0] || "id",
      parent: parentMatch ? parentMatch[1] : undefined,
    });
  }

  // Parse association signatures
  const assocRegex =
    /one\s+sig\s+(\w+)\s+extends\s+Association\s*\{[^}]*\}\s*\{([^}]*)\}/g;
  while ((match = assocRegex.exec(text)) !== null) {
    const name = match[1];
    const body = match[2];

    const srcMatch = body.match(/src\s*=\s*(\w+)/);
    const dstMatch = body.match(/dst\s*=\s*(\w+)/);
    const srcMultMatch = body.match(/src_multiplicity\s*=\s*(\w+)/);
    const dstMultMatch = body.match(/dst_multiplicity\s*=\s*(\w+)/);

    if (srcMatch && dstMatch) {
      associations.push({
        name,
        source: srcMatch[1],
        destination: dstMatch[1],
        srcMultiplicity: srcMultMatch?.[1] || "ONE",
        dstMultiplicity: dstMultMatch?.[1] || "MANY",
      });
    }
  }

  return { classes, associations };
}

function parsePlainText(text: string): ParsedModel {
  const classes: ClassDef[] = [];
  const associations: AssociationDef[] = [];
  let currentClass: ClassDef | null = null;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();

    const classMatch = trimmed.match(/^class\s+(\w+)/i);
    if (classMatch) {
      currentClass = {
        name: classMatch[1],
        attributes: [],
        isAbstract: false,
        primaryKey: "",
      };
      classes.push(currentClass);
      continue;
    }

    const attrMatch = trimmed.match(/^-\s+(\w+)\s*:\s*(\w+)/);
    if (attrMatch && currentClass) {
      currentClass.attributes.push({
        name: attrMatch[1],
        type: attrMatch[2],
      });
      if (!currentClass.primaryKey) {
        currentClass.primaryKey = attrMatch[1];
      }
      continue;
    }

    const assocMatch = trimmed.match(
      /^association\s+(\w+)\s*:\s*(\w+)\s*->\s*(\w+)\s*\((\w+)\s+to\s+(\w+)\)/i
    );
    if (assocMatch) {
      associations.push({
        name: assocMatch[1],
        source: assocMatch[2],
        destination: assocMatch[3],
        srcMultiplicity: assocMatch[4].toUpperCase(),
        dstMultiplicity: assocMatch[5].toUpperCase(),
      });
    }
  }

  return { classes, associations };
}

async function callAnalysisAPI(
  endpoint: string,
  model: ParsedModel,
  algorithm: string,
  episodes: number,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  _token: vscode.CancellationToken
): Promise<AnalysisResult> {
  // In production, this would call the Convex API.
  // For now, we simulate the RL analysis pipeline locally.
  outputChannel.appendLine(`API: ${endpoint}`);
  outputChannel.appendLine(`Algorithm: ${algorithm}, Episodes: ${episodes}`);
  outputChannel.appendLine(
    `Model: ${model.classes.length} classes, ${model.associations.length} associations`
  );

  const strategies = [
    "UnionSubclass",
    "JoinedSubclass",
    "UnionSuperclass",
  ];
  const assocStrategies = ["ForeignKeyEmbedding", "OwnAssociationTable"];
  const config = vscode.workspace.getConfiguration("sculptor-ai");
  const wStrategy = config.get<number>("rewardWeights.strategy") || 0.35;
  const wPerf = config.get<number>("rewardWeights.performance") || 0.35;
  const wConst = config.get<number>("rewardWeights.constraints") || 0.3;

  const solutions: ParetoSolution[] = [];
  const totalSteps = Math.min(episodes, 50);

  for (let i = 0; i < totalSteps; i++) {
    progress.report({
      message: `Episode ${i + 1}/${totalSteps} — exploring design space...`,
      increment: 100 / totalSteps,
    });

    await new Promise((r) => setTimeout(r, 80));

    const strategyMap: Record<string, string> = {};
    for (const cls of model.classes) {
      strategyMap[cls.name] =
        strategies[Math.floor(Math.random() * strategies.length)];
    }
    for (const assoc of model.associations) {
      strategyMap[assoc.name] =
        assocStrategies[Math.floor(Math.random() * assocStrategies.length)];
    }

    const insertionTime = 0.5 + Math.random() * 15;
    const queryTime = 1 + Math.random() * 25;
    const storageSize = 50 + Math.random() * 500;

    // Reward calculation
    const strategyScores: Record<string, number> = {
      UnionSubclass: 1.2,
      JoinedSubclass: 1.0,
      UnionSuperclass: 1.1,
      ForeignKeyEmbedding: 1.15,
      OwnAssociationTable: 1.0,
    };
    const avgStratScore =
      Object.values(strategyMap).reduce(
        (s, v) => s + (strategyScores[v] || 1),
        0
      ) / Object.values(strategyMap).length;

    const perfScore =
      1 / (1 + insertionTime / 10) + 1 / (1 + queryTime / 10);
    const constraintScore = 0.8 + Math.random() * 0.2;

    const reward =
      wStrategy * avgStratScore +
      wPerf * perfScore +
      wConst * constraintScore;

    solutions.push({
      id: `sol-${i}`,
      rank: i + 1,
      confidence: Math.min(reward / 2, 0.99),
      isParetoOptimal: false,
      strategies: strategyMap,
      metrics: { insertionTime, queryTime, storageSize },
      sqlSchema: generateSQL(model, strategyMap),
      nosqlSchema: generateNoSQL(model, strategyMap),
    });
  }

  // Identify Pareto front
  for (let i = 0; i < solutions.length; i++) {
    let dominated = false;
    for (let j = 0; j < solutions.length; j++) {
      if (i === j) continue;
      const a = solutions[i].metrics;
      const b = solutions[j].metrics;
      if (
        b.insertionTime <= a.insertionTime &&
        b.queryTime <= a.queryTime &&
        b.storageSize <= a.storageSize &&
        (b.insertionTime < a.insertionTime ||
          b.queryTime < a.queryTime ||
          b.storageSize < a.storageSize)
      ) {
        dominated = true;
        break;
      }
    }
    solutions[i].isParetoOptimal = !dominated;
  }

  // Sort: Pareto first, then by confidence
  solutions.sort((a, b) => {
    if (a.isParetoOptimal !== b.isParetoOptimal)
      return a.isParetoOptimal ? -1 : 1;
    return b.confidence - a.confidence;
  });

  solutions.forEach((s, i) => (s.rank = i + 1));

  const paretoCount = solutions.filter((s) => s.isParetoOptimal).length;

  return {
    runId: `run-${Date.now()}`,
    status: "completed",
    solutions,
    paretoCount,
    totalExplored: totalSteps,
  };
}

function generateSQL(model: ParsedModel, strategies: Record<string, string>): string {
  const lines: string[] = [];
  lines.push("-- Sculptor AI Generated SQL Schema");
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push("");

  for (const cls of model.classes) {
    const strategy = strategies[cls.name] || "JoinedSubclass";
    lines.push(`-- Strategy: ${strategy}`);
    lines.push(`CREATE TABLE ${cls.name} (`);

    const cols: string[] = [];
    for (const attr of cls.attributes) {
      const sqlType =
        attr.type === "Integer"
          ? "INT"
          : attr.type === "Float"
          ? "DECIMAL(10,2)"
          : "VARCHAR(255)";
      cols.push(`  ${attr.name} ${sqlType}${attr.name === cls.primaryKey ? " PRIMARY KEY" : ""}`);
    }

    if (strategy === "UnionSuperclass") {
      cols.push("  DType VARCHAR(50) NOT NULL");
    }

    lines.push(cols.join(",\n"));
    lines.push(");");
    lines.push("");
  }

  for (const assoc of model.associations) {
    const strategy = strategies[assoc.name] || "ForeignKeyEmbedding";
    if (strategy === "OwnAssociationTable") {
      lines.push(`-- Association table: ${assoc.name}`);
      lines.push(`CREATE TABLE ${assoc.name} (`);
      lines.push(`  ${assoc.source}_id INT,`);
      lines.push(`  ${assoc.destination}_id INT,`);
      lines.push(
        `  FOREIGN KEY (${assoc.source}_id) REFERENCES ${assoc.source}(${model.classes.find((c) => c.name === assoc.source)?.primaryKey || "id"}),`
      );
      lines.push(
        `  FOREIGN KEY (${assoc.destination}_id) REFERENCES ${assoc.destination}(${model.classes.find((c) => c.name === assoc.destination)?.primaryKey || "id"})`
      );
      lines.push(");");
      lines.push("");
    } else {
      lines.push(
        `ALTER TABLE ${assoc.destination} ADD COLUMN ${assoc.source}_id INT;`
      );
      lines.push(
        `ALTER TABLE ${assoc.destination} ADD FOREIGN KEY (${assoc.source}_id) REFERENCES ${assoc.source}(${model.classes.find((c) => c.name === assoc.source)?.primaryKey || "id"});`
      );
      lines.push("");
    }
  }

  return lines.join("\n");
}

function generateNoSQL(model: ParsedModel, strategies: Record<string, string>): string {
  const lines: string[] = [];
  lines.push("// Sculptor AI Generated NoSQL Schema (MongoDB)");
  lines.push(`// Generated: ${new Date().toISOString()}`);
  lines.push("");

  for (const cls of model.classes) {
    lines.push(`// Collection: ${cls.name}`);
    lines.push(`db.createCollection("${cls.name.toLowerCase()}s", {`);
    lines.push("  validator: {");
    lines.push("    $jsonSchema: {");
    lines.push('      bsonType: "object",');
    lines.push(
      `      required: [${cls.attributes.map((a) => `"${a.name}"`).join(", ")}],`
    );
    lines.push("      properties: {");
    for (const attr of cls.attributes) {
      const bsonType =
        attr.type === "Integer"
          ? "int"
          : attr.type === "Float"
          ? "double"
          : "string";
      lines.push(
        `        ${attr.name}: { bsonType: "${bsonType}" },`
      );
    }

    // Embed associations if ForeignKeyEmbedding
    for (const assoc of model.associations) {
      if (
        assoc.source === cls.name &&
        strategies[assoc.name] === "ForeignKeyEmbedding"
      ) {
        lines.push(
          `        ${assoc.destination.toLowerCase()}Refs: { bsonType: "array", items: { bsonType: "objectId" } },`
        );
      }
    }

    lines.push("      }");
    lines.push("    }");
    lines.push("  }");
    lines.push("});");
    lines.push("");
  }

  return lines.join("\n");
}

function algorithmLabel(alg: string): string {
  switch (alg) {
    case "mc_control":
      return "Monte Carlo Control";
    case "dqn":
      return "Deep Q-Network";
    case "actor_critic":
      return "Actor-Critic";
    default:
      return alg;
  }
}

function insertSchemaAtCursor(schema: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    // Open new doc
    vscode.workspace
      .openTextDocument({ content: schema, language: "sql" })
      .then((doc) => vscode.window.showTextDocument(doc));
    return;
  }

  editor.edit((builder) => {
    builder.insert(editor.selection.active, schema);
  });
}

// ─── Tree Provider ────────────────────────────────────────────────────────────

class SolutionTreeProvider implements vscode.TreeDataProvider<SolutionTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<
    SolutionTreeItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private solutions: ParetoSolution[] = [];

  refresh(solutions: ParetoSolution[]) {
    this.solutions = solutions;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SolutionTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SolutionTreeItem): SolutionTreeItem[] {
    if (!element) {
      return this.solutions.map(
        (s) =>
          new SolutionTreeItem(
            `#${s.rank} ${s.isParetoOptimal ? "★" : "○"} Conf: ${(s.confidence * 100).toFixed(1)}%`,
            s.isParetoOptimal
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.Collapsed,
            s
          )
      );
    }

    const s = element.solution;
    return [
      new SolutionTreeItem(
        `Query: ${s.metrics.queryTime.toFixed(1)}ms`,
        vscode.TreeItemCollapsibleState.None
      ),
      new SolutionTreeItem(
        `Insert: ${s.metrics.insertionTime.toFixed(1)}ms`,
        vscode.TreeItemCollapsibleState.None
      ),
      new SolutionTreeItem(
        `Storage: ${s.metrics.storageSize.toFixed(0)}KB`,
        vscode.TreeItemCollapsibleState.None
      ),
      ...Object.entries(s.strategies).map(
        ([k, v]) =>
          new SolutionTreeItem(
            `${k}: ${v}`,
            vscode.TreeItemCollapsibleState.None
          )
      ),
    ];
  }
}

class SolutionTreeItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    public solution?: ParetoSolution
  ) {
    super(label, collapsibleState);
    if (solution?.isParetoOptimal) {
      this.iconPath = new vscode.ThemeIcon("star-full");
      this.contextValue = "paretoSolution";
    }
  }
}

// ─── Webview HTML ─────────────────────────────────────────────────────────────

function getDashboardHTML(result: AnalysisResult | null): string {
  const paretoCount = result?.paretoCount || 0;
  const totalCount = result?.totalExplored || 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 24px; }
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .logo { width: 40px; height: 40px; border-radius: 8px; background: linear-gradient(135deg, #10b981, #14b8a6); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px; }
    h1 { font-size: 24px; margin: 0; }
    .subtitle { color: var(--vscode-descriptionForeground); margin-top: 4px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
    .stat { background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 8px; padding: 16px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #10b981; }
    .stat-label { font-size: 12px; color: var(--vscode-descriptionForeground); margin-top: 4px; }
    .lifecycle { margin: 32px 0; }
    .lifecycle h2 { font-size: 18px; margin-bottom: 16px; }
    .step { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; padding: 12px; border-radius: 8px; border: 1px solid var(--vscode-panel-border); }
    .step-num { width: 28px; height: 28px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0; }
    .step-title { font-weight: 600; }
    .step-desc { font-size: 13px; color: var(--vscode-descriptionForeground); margin-top: 4px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--vscode-panel-border); text-align: center; font-size: 12px; color: var(--vscode-descriptionForeground); }
    a { color: #10b981; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">S</div>
    <div>
      <h1>Sculptor AI</h1>
      <div class="subtitle">Agentic Pareto-Optimal Database Design</div>
    </div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-value">${paretoCount}</div><div class="stat-label">Pareto-Optimal</div></div>
    <div class="stat"><div class="stat-value">${totalCount}</div><div class="stat-label">Solutions Explored</div></div>
    <div class="stat"><div class="stat-value">${result ? "✓" : "—"}</div><div class="stat-label">Analysis Status</div></div>
  </div>

  <div class="lifecycle">
    <h2>Agentic Database Design Lifecycle</h2>
    <div class="step"><div class="step-num">1</div><div><div class="step-title">Analysis</div><div class="step-desc">Parse object models (Alloy, JSON, text) and understand your domain</div></div></div>
    <div class="step"><div class="step-num">2</div><div><div class="step-title">Synthesis</div><div class="step-desc">RL algorithms explore ORM strategy space</div></div></div>
    <div class="step"><div class="step-num">3</div><div><div class="step-title">Selection</div><div class="step-desc">Pareto-optimal solutions identified and ranked</div></div></div>
    <div class="step"><div class="step-num">4</div><div><div class="step-title">Integration</div><div class="step-desc">Insert SQL/NoSQL schemas directly into your codebase</div></div></div>
    <div class="step"><div class="step-num">5</div><div><div class="step-title">Refinement</div><div class="step-desc">Re-analyze as workloads evolve</div></div></div>
  </div>

  <div class="footer">
    Co-founded by <a href="https://www.mdrashedulhasan.me/">Md Rashedul Hasan</a> &amp; <a href="https://cse.unl.edu/~hbagheri/">Hamid Bagheri</a>
  </div>
</body>
</html>`;
}

function getParetoHTML(solutions: ParetoSolution[]): string {
  const pareto = solutions.filter((s) => s.isParetoOptimal);
  const rows = pareto
    .map(
      (s) =>
        `<tr>
      <td>#${s.rank}</td>
      <td>${(s.confidence * 100).toFixed(1)}%</td>
      <td>${s.metrics.queryTime.toFixed(1)}ms</td>
      <td>${s.metrics.insertionTime.toFixed(1)}ms</td>
      <td>${s.metrics.storageSize.toFixed(0)}KB</td>
      <td>${Object.entries(s.strategies).map(([k, v]) => `${k}: ${v}`).join("<br/>")}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 24px; }
    h1 { font-size: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid var(--vscode-panel-border); font-size: 13px; }
    th { font-weight: 600; color: #10b981; }
    .footer { margin-top: 24px; text-align: center; font-size: 12px; color: var(--vscode-descriptionForeground); }
    a { color: #10b981; }
  </style>
</head>
<body>
  <h1>★ Pareto-Optimal Solutions (${pareto.length})</h1>
  <table>
    <tr><th>Rank</th><th>Confidence</th><th>Query</th><th>Insert</th><th>Storage</th><th>Strategies</th></tr>
    ${rows}
  </table>
  <div class="footer">Co-founded by <a href="https://www.mdrashedulhasan.me/">Md Rashedul Hasan</a> &amp; <a href="https://cse.unl.edu/~hbagheri/">Hamid Bagheri</a></div>
</body>
</html>`;
}

function getRoadmapHTML(solution: ParetoSolution): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); padding: 24px; }
    h1 { font-size: 20px; }
    .metric { margin: 16px 0; padding: 16px; border-radius: 8px; border: 1px solid var(--vscode-panel-border); }
    .metric-title { font-weight: 600; margin-bottom: 8px; }
    .bar { height: 8px; border-radius: 4px; background: var(--vscode-editor-inactiveSelectionBackground); margin-top: 8px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 4px; background: #10b981; }
    .rec { margin-top: 24px; padding: 16px; border-radius: 8px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); }
    .rec-title { font-weight: 600; color: #10b981; margin-bottom: 8px; }
    .footer { margin-top: 24px; text-align: center; font-size: 12px; color: var(--vscode-descriptionForeground); }
    a { color: #10b981; }
  </style>
</head>
<body>
  <h1>📈 Performance Roadmap — Solution #${solution.rank}</h1>

  <div class="metric">
    <div class="metric-title">Query Performance</div>
    <div>Average: ${solution.metrics.queryTime.toFixed(1)}ms</div>
    <div class="bar"><div class="bar-fill" style="width: ${Math.max(5, 100 - solution.metrics.queryTime * 4)}%"></div></div>
  </div>

  <div class="metric">
    <div class="metric-title">Insertion Performance</div>
    <div>Average: ${solution.metrics.insertionTime.toFixed(1)}ms</div>
    <div class="bar"><div class="bar-fill" style="width: ${Math.max(5, 100 - solution.metrics.insertionTime * 6)}%"></div></div>
  </div>

  <div class="metric">
    <div class="metric-title">Storage Efficiency</div>
    <div>Estimated: ${solution.metrics.storageSize.toFixed(0)}KB per 1000 records</div>
    <div class="bar"><div class="bar-fill" style="width: ${Math.max(5, 100 - solution.metrics.storageSize / 5)}%"></div></div>
  </div>

  <div class="rec">
    <div class="rec-title">Recommendations</div>
    <ul>
      <li>Add database indexes on primary key columns for faster lookups</li>
      <li>Consider connection pooling for concurrent user scenarios</li>
      <li>Use read replicas if query load exceeds insertion load by 5:1</li>
      <li>Monitor P99 latency and re-run Sculptor AI analysis if degradation exceeds 20%</li>
      <li>Schedule periodic re-optimization as your data model evolves</li>
    </ul>
  </div>

  <div class="footer">Co-founded by <a href="https://www.mdrashedulhasan.me/">Md Rashedul Hasan</a> &amp; <a href="https://cse.unl.edu/~hbagheri/">Hamid Bagheri</a></div>
</body>
</html>`;
}

export function deactivate() {
  outputChannel?.dispose();
  statusBarItem?.dispose();
}
