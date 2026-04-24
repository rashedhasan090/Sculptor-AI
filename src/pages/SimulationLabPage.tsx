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
  ArrowUpRight, ArrowDownRight, Minus, Maximize2, Minimize2, RotateCw, Box,
} from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════════════════════
   Demo Solutions
   ═══════════════════════════════════════════════════════════════ */

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

// Additional non-Pareto demo points for the 3D visualization
const EXTRA_3D_POINTS = [
  { queryTime: 8.2, insertionTime: 4.5, storageSize: 180, label: "Eager-Load", isPareto: false },
  { queryTime: 5.5, insertionTime: 3.2, storageSize: 250, label: "Full-Denorm", isPareto: false },
  { queryTime: 12.1, insertionTime: 1.8, storageSize: 50, label: "Deep-Norm", isPareto: false },
  { queryTime: 7.0, insertionTime: 2.6, storageSize: 160, label: "Lazy+Cache", isPareto: false },
  { queryTime: 4.2, insertionTime: 5.1, storageSize: 300, label: "Materialized", isPareto: false },
  { queryTime: 9.8, insertionTime: 3.5, storageSize: 110, label: "Hybrid-Lazy", isPareto: false },
  { queryTime: 6.3, insertionTime: 4.0, storageSize: 145, label: "Part-Denorm", isPareto: false },
  { queryTime: 11.0, insertionTime: 2.2, storageSize: 75, label: "3NF-Strict", isPareto: false },
];

/* ═══════════════════════════════════════════════════════════════
   3D Pareto Front Visualization (pure canvas, no deps)
   ═══════════════════════════════════════════════════════════════ */

function ParetoFront3D({ solutions, isFullscreen, onToggleFullscreen }: {
  solutions: Array<{ queryTime: number; insertionTime: number; storageSize: number; label: string; isPareto: boolean }>;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef({ rx: -0.45, ry: 0.65 });
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 });
  const zoomRef = useRef(1.0);
  const animRef = useRef<number>(0);
  const autoRotRef = useRef(true);

  const project = useCallback((x: number, y: number, z: number, W: number, H: number) => {
    const rx = rotRef.current.rx;
    const ry = rotRef.current.ry;
    const zoom = zoomRef.current;

    // Rotate Y
    let x1 = x * Math.cos(ry) - z * Math.sin(ry);
    const z1 = x * Math.sin(ry) + z * Math.cos(ry);

    // Rotate X
    let y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
    const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);

    // Perspective
    const perspective = 4.5;
    const scale = perspective / (perspective + z2) * zoom;

    return {
      sx: W / 2 + x1 * scale * (W * 0.28),
      sy: H / 2 - y1 * scale * (H * 0.28),
      z: z2,
      scale,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const W = rect.width;
      const H = rect.height;

      // Auto rotate
      if (autoRotRef.current && !dragRef.current.dragging) {
        rotRef.current.ry += 0.003;
      }

      // Background
      ctx.clearRect(0, 0, W, H);

      // Normalize data
      const maxQ = Math.max(...solutions.map(s => s.queryTime), 1) * 1.2;
      const maxI = Math.max(...solutions.map(s => s.insertionTime), 1) * 1.2;
      const maxS = Math.max(...solutions.map(s => s.storageSize), 1) * 1.2;

      // Draw grid planes (faint)
      const gridLines = 5;
      ctx.lineWidth = 0.5;

      // Draw axes
      const axes = [
        { from: [-1, -1, -1], to: [1, -1, -1], label: "Query Time (ms)", color: "#10b981" },
        { from: [-1, -1, -1], to: [-1, 1, -1], label: "Insertion Time (ms)", color: "#14b8a6" },
        { from: [-1, -1, -1], to: [-1, -1, 1], label: "Schema Size (KB)", color: "#8b5cf6" },
      ];

      // Draw grid lines on each plane
      ctx.globalAlpha = 0.08;
      for (let i = 0; i <= gridLines; i++) {
        const t = -1 + (2 * i) / gridLines;
        // XY plane (z=-1)
        const xy1 = project(t, -1, -1, W, H);
        const xy2 = project(t, 1, -1, W, H);
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath(); ctx.moveTo(xy1.sx, xy1.sy); ctx.lineTo(xy2.sx, xy2.sy); ctx.stroke();
        const xy3 = project(-1, t, -1, W, H);
        const xy4 = project(1, t, -1, W, H);
        ctx.beginPath(); ctx.moveTo(xy3.sx, xy3.sy); ctx.lineTo(xy4.sx, xy4.sy); ctx.stroke();
        // XZ plane (y=-1)
        const xz1 = project(t, -1, -1, W, H);
        const xz2 = project(t, -1, 1, W, H);
        ctx.beginPath(); ctx.moveTo(xz1.sx, xz1.sy); ctx.lineTo(xz2.sx, xz2.sy); ctx.stroke();
        const xz3 = project(-1, -1, t, W, H);
        const xz4 = project(1, -1, t, W, H);
        ctx.beginPath(); ctx.moveTo(xz3.sx, xz3.sy); ctx.lineTo(xz4.sx, xz4.sy); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Draw axes
      for (const axis of axes) {
        const p1 = project(axis.from[0], axis.from[1], axis.from[2], W, H);
        const p2 = project(axis.to[0], axis.to[1], axis.to[2], W, H);
        ctx.strokeStyle = axis.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.stroke();

        // Axis label
        ctx.fillStyle = axis.color;
        ctx.font = `${isFullscreen ? 13 : 11}px system-ui, sans-serif`;
        ctx.globalAlpha = 0.9;
        ctx.textAlign = "center";
        ctx.fillText(axis.label, p2.sx, p2.sy - 8);
      }
      ctx.globalAlpha = 1;

      // Tick marks on axes
      ctx.font = `${isFullscreen ? 10 : 9}px monospace`;
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.textAlign = "center";
      for (let i = 0; i <= gridLines; i++) {
        const t = -1 + (2 * i) / gridLines;
        const val_q = ((i / gridLines) * maxQ).toFixed(1);
        const val_i = ((i / gridLines) * maxI).toFixed(1);
        const val_s = ((i / gridLines) * maxS).toFixed(0);
        // X axis ticks
        const tx = project(t, -1, -1, W, H);
        ctx.fillText(val_q, tx.sx, tx.sy + 14);
        // Y axis ticks
        const ty = project(-1, t, -1, W, H);
        ctx.textAlign = "right";
        ctx.fillText(val_i, ty.sx - 6, ty.sy + 3);
        ctx.textAlign = "center";
        // Z axis ticks
        const tz = project(-1, -1, t, W, H);
        ctx.fillText(val_s, tz.sx, tz.sy + 14);
      }

      // Sort by z for painter's algorithm
      const projected = solutions.map(s => {
        const nx = (s.queryTime / maxQ) * 2 - 1;
        const ny = (s.insertionTime / maxI) * 2 - 1;
        const nz = (s.storageSize / maxS) * 2 - 1;
        const p = project(nx, ny, nz, W, H);
        return { ...s, ...p, nx, ny, nz };
      }).sort((a, b) => a.z - b.z);

      // Draw Pareto surface (connect Pareto points)
      const paretoPoints = projected.filter(p => p.isPareto);
      if (paretoPoints.length >= 3) {
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = "#10b981";
        ctx.beginPath();
        ctx.moveTo(paretoPoints[0].sx, paretoPoints[0].sy);
        for (let i = 1; i < paretoPoints.length; i++) {
          ctx.lineTo(paretoPoints[i].sx, paretoPoints[i].sy);
        }
        ctx.closePath();
        ctx.fill();

        // Wireframe
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(paretoPoints[0].sx, paretoPoints[0].sy);
        for (let i = 1; i < paretoPoints.length; i++) {
          ctx.lineTo(paretoPoints[i].sx, paretoPoints[i].sy);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw points
      for (const p of projected) {
        const r = (isFullscreen ? 7 : 5) * p.scale;
        const isP = p.isPareto;

        // Shadow
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(p.sx + 1, p.sy + 1, r, 0, Math.PI * 2);
        ctx.fill();

        // Point
        ctx.globalAlpha = isP ? 0.95 : 0.55;
        const color = isP ? "#10b981" : "#64748b";
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.fill();

        // Glow for Pareto
        if (isP) {
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = "#10b981";
          ctx.beginPath();
          ctx.arc(p.sx, p.sy, r * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Border
        ctx.globalAlpha = isP ? 0.9 : 0.4;
        ctx.strokeStyle = isP ? "#34d399" : "#94a3b8";
        ctx.lineWidth = isP ? 2 : 1;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.globalAlpha = isP ? 0.9 : 0.5;
        ctx.fillStyle = "#fff";
        ctx.font = `${isP ? (isFullscreen ? 11 : 10) : (isFullscreen ? 9 : 8)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(p.label, p.sx, p.sy - r - 4);
      }

      ctx.globalAlpha = 1;

      // Legend
      const lx = W - (isFullscreen ? 190 : 150);
      const ly = isFullscreen ? 20 : 14;
      ctx.font = `${isFullscreen ? 12 : 10}px system-ui, sans-serif`;
      ctx.textAlign = "left";

      ctx.fillStyle = "#10b981";
      ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("Pareto-Optimal", lx + 10, ly + 4);

      ctx.fillStyle = "#64748b";
      ctx.beginPath(); ctx.arc(lx, ly + 20, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText("Non-Pareto", lx + 10, ly + 24);

      // Drag instruction
      if (!dragRef.current.dragging) {
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.font = `${isFullscreen ? 11 : 9}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText("🖱 Drag to rotate · Scroll to zoom", W / 2, H - 10);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [solutions, project, isFullscreen]);

  // Mouse/touch handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
      autoRotRef.current = false;
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      rotRef.current.ry += dx * 0.008;
      rotRef.current.rx += dy * 0.008;
      rotRef.current.rx = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotRef.current.rx));
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };
    const onPointerUp = () => {
      dragRef.current.dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.max(0.4, Math.min(2.5, zoomRef.current - e.deltaY * 0.001));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg cursor-grab active:cursor-grabbing touch-none"
        style={{ height: isFullscreen ? "calc(100vh - 80px)" : 320 }}
      />
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={() => { autoRotRef.current = true; }}
          className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white/60 hover:text-white transition-colors"
          title="Auto-rotate"
        >
          <RotateCw className="size-3.5" />
        </button>
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white/60 hover:text-white transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3D Architecture Map (resource topology during simulation)
   ═══════════════════════════════════════════════════════════════ */

interface ArchNode {
  id: string;
  label: string;
  type: "table" | "index" | "cache" | "connector" | "client";
  x: number; y: number; z: number;
  load: number; // 0-1
}

interface ArchEdge {
  from: string; to: string; active: boolean; throughput: number;
}

function ArchitectureMap3D({ metrics, isFullscreen, onToggleFullscreen, elapsedSec }: {
  metrics: LiveMetrics | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  elapsedSec: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef({ rx: -0.3, ry: 0.8 });
  const dragRef = useRef({ dragging: false, lastX: 0, lastY: 0 });
  const zoomRef = useRef(0.9);
  const animRef = useRef<number>(0);

  const project = useCallback((x: number, y: number, z: number, W: number, H: number) => {
    const rx = rotRef.current.rx;
    const ry = rotRef.current.ry;
    const zoom = zoomRef.current;
    let x1 = x * Math.cos(ry) - z * Math.sin(ry);
    const z1 = x * Math.sin(ry) + z * Math.cos(ry);
    let y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
    const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
    const perspective = 4.0;
    const scale = perspective / (perspective + z2) * zoom;
    return {
      sx: W / 2 + x1 * scale * (W * 0.28),
      sy: H / 2 - y1 * scale * (H * 0.28),
      z: z2,
      scale,
    };
  }, []);

  // Architecture topology
  const nodes: ArchNode[] = [
    { id: "clients", label: "Clients", type: "client", x: 0, y: 1.2, z: 0, load: 0 },
    { id: "lb", label: "Load Balancer", type: "connector", x: 0, y: 0.6, z: 0, load: 0 },
    { id: "cache", label: "Query Cache", type: "cache", x: -0.8, y: 0, z: -0.4, load: 0 },
    { id: "primary", label: "Primary DB", type: "table", x: 0, y: -0.3, z: 0, load: 0 },
    { id: "replica1", label: "Read Replica 1", type: "table", x: -0.9, y: -0.8, z: 0.5, load: 0 },
    { id: "replica2", label: "Read Replica 2", type: "table", x: 0.9, y: -0.8, z: 0.5, load: 0 },
    { id: "idx_btree", label: "B-Tree Index", type: "index", x: 0.7, y: 0, z: -0.5, load: 0 },
    { id: "idx_hash", label: "Hash Index", type: "index", x: 0.3, y: -0.7, z: -0.7, load: 0 },
    { id: "storage", label: "Storage Engine", type: "table", x: 0, y: -1.3, z: 0, load: 0 },
  ];

  const edges: ArchEdge[] = [
    { from: "clients", to: "lb", active: true, throughput: 1 },
    { from: "lb", to: "cache", active: true, throughput: 0.6 },
    { from: "lb", to: "primary", active: true, throughput: 0.8 },
    { from: "cache", to: "primary", active: true, throughput: 0.4 },
    { from: "primary", to: "replica1", active: true, throughput: 0.5 },
    { from: "primary", to: "replica2", active: true, throughput: 0.5 },
    { from: "primary", to: "idx_btree", active: true, throughput: 0.7 },
    { from: "primary", to: "idx_hash", active: true, throughput: 0.5 },
    { from: "primary", to: "storage", active: true, throughput: 0.9 },
    { from: "replica1", to: "storage", active: true, throughput: 0.3 },
    { from: "replica2", to: "storage", active: true, throughput: 0.3 },
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const W = rect.width;
      const H = rect.height;

      // Slow auto-rotate
      if (!dragRef.current.dragging) {
        rotRef.current.ry += 0.002;
      }

      ctx.clearRect(0, 0, W, H);

      const t = elapsedSec;
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.8);

      // Update node loads from metrics
      const activeNodes = nodes.map(n => {
        let load = 0;
        if (metrics) {
          switch (n.type) {
            case "client": load = metrics.activeConnections / 100; break;
            case "connector": load = metrics.activeConnections / 150; break;
            case "cache": load = metrics.cacheHitRate; break;
            case "table": load = 0.4 + metrics.errorRate * 10 + pulse * 0.2; break;
            case "index": load = 0.3 + (1 - metrics.cacheHitRate) * 0.5; break;
          }
        }
        return { ...n, load: Math.min(1, load) };
      });

      // Project all nodes
      const projectedNodes = activeNodes.map(n => ({
        ...n,
        ...project(n.x, n.y, n.z, W, H),
      }));

      // Draw edges first (back to front)
      for (const edge of edges) {
        const from = projectedNodes.find(n => n.id === edge.from);
        const to = projectedNodes.find(n => n.id === edge.to);
        if (!from || !to) continue;

        const edgeLoad = metrics ? Math.min(1, (metrics.throughput / 2000) * edge.throughput) : 0.2;

        // Edge line
        ctx.globalAlpha = 0.15 + edgeLoad * 0.4;
        ctx.strokeStyle = metrics ? `hsl(${160 - edgeLoad * 40}, 70%, 50%)` : "#475569";
        ctx.lineWidth = 1 + edgeLoad * 2;
        ctx.beginPath();
        ctx.moveTo(from.sx, from.sy);
        ctx.lineTo(to.sx, to.sy);
        ctx.stroke();

        // Animated data flow particles
        if (metrics && edge.active) {
          const numParticles = Math.ceil(edgeLoad * 3);
          for (let i = 0; i < numParticles; i++) {
            const pt = ((t * 0.3 * edge.throughput + i / numParticles) % 1);
            const px = from.sx + (to.sx - from.sx) * pt;
            const py = from.sy + (to.sy - from.sy) * pt;
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = "#10b981";
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Sort nodes by z for painter's algorithm
      const sorted = [...projectedNodes].sort((a, b) => a.z - b.z);

      // Draw nodes
      for (const node of sorted) {
        const baseR = (isFullscreen ? 22 : 16) * node.scale;
        const r = baseR;

        // Node type colors
        const colors: Record<string, string> = {
          table: "#10b981",
          index: "#8b5cf6",
          cache: "#f59e0b",
          connector: "#3b82f6",
          client: "#ec4899",
        };
        const color = colors[node.type] || "#64748b";

        // Glow based on load
        if (metrics && node.load > 0.3) {
          ctx.globalAlpha = node.load * 0.2 * (0.7 + pulse * 0.3);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, r * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node circle background
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = `rgba(15, 23, 42, 0.85)`;
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, r, 0, Math.PI * 2);
        ctx.fill();

        // Border (color intensity based on load)
        ctx.globalAlpha = 0.5 + node.load * 0.5;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.sx, node.sy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Load arc
        if (metrics && node.load > 0) {
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(node.sx, node.sy, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * node.load);
          ctx.stroke();
        }

        // Icon text
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = color;
        ctx.font = `${Math.round(r * 0.55)}px system-ui`;
        ctx.textAlign = "center";
        const icons: Record<string, string> = { table: "⊞", index: "⋮", cache: "◈", connector: "⇋", client: "◉" };
        ctx.fillText(icons[node.type] || "●", node.sx, node.sy + r * 0.18);

        // Label
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "#e2e8f0";
        ctx.font = `${isFullscreen ? 11 : 9}px system-ui, sans-serif`;
        ctx.fillText(node.label, node.sx, node.sy + r + 14);
      }

      ctx.globalAlpha = 1;

      // Title & info
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = `${isFullscreen ? 11 : 9}px system-ui`;
      ctx.textAlign = "center";
      ctx.fillText("🖱 Drag to rotate · Scroll to zoom", W / 2, H - 8);

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [metrics, project, isFullscreen, elapsedSec, nodes, edges]);

  // Mouse/touch handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      dragRef.current = { dragging: true, lastX: e.clientX, lastY: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      rotRef.current.ry += dx * 0.008;
      rotRef.current.rx += dy * 0.008;
      rotRef.current.rx = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotRef.current.rx));
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };
    const onPointerUp = () => { dragRef.current.dragging = false; };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current = Math.max(0.4, Math.min(2.5, zoomRef.current - e.deltaY * 0.001));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full rounded-lg cursor-grab active:cursor-grabbing touch-none"
        style={{ height: isFullscreen ? "calc(100vh - 80px)" : 320 }}
      />
      <div className="absolute top-2 right-2 flex gap-1">
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-md bg-black/40 hover:bg-black/60 text-white/60 hover:text-white transition-colors"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
        </button>
      </div>
      {!metrics && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-muted-foreground bg-background/80 px-3 py-1.5 rounded-lg">
            Start a simulation to see live resource topology
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Fullscreen Wrapper
   ═══════════════════════════════════════════════════════════════ */

function FullscreenPanel({ title, icon: Icon, isFullscreen, onClose, children }: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isFullscreen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!isFullscreen) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-emerald-500" />
          <span className="font-semibold">{title}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <Minimize2 className="size-4 mr-1" /> Exit Fullscreen
        </Button>
      </div>
      <div className="flex-1 p-2">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Main: Simulation Lab Page
   ═══════════════════════════════════════════════════════════════ */

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

  // Fullscreen
  const [fullscreenPanel, setFullscreenPanel] = useState<"pareto" | "arch" | null>(null);

  const userSolutions = solutions ?? [];
  const paretoSolutions = userSolutions.filter((s: any) => s.isPareto);
  const allSolutions = [...DEMO_SOLUTIONS, ...userSolutions] as any[];
  const selectedSol = allSolutions.find((s: any) => s._id === selectedSolution);
  const baseInsert = selectedSol?.metrics?.insertionTime ?? 3.5;
  const baseQuery = selectedSol?.metrics?.queryTime ?? 8.2;
  const baseStorage = selectedSol?.metrics?.storageSize ?? 120;

  const complexityMultiplier = { simple: 0.6, moderate: 1.0, complex: 1.8, analytical: 3.0 }[queryComplexity] ?? 1.0;

  // Build 3D points for Pareto front
  const pareto3DPoints = [
    ...DEMO_SOLUTIONS.map(s => ({
      queryTime: s.metrics.queryTime,
      insertionTime: s.metrics.insertionTime,
      storageSize: s.metrics.storageSize,
      label: s.label.split(" (")[0],
      isPareto: true,
    })),
    ...EXTRA_3D_POINTS,
    ...userSolutions.map((s: any) => ({
      queryTime: s.metrics.queryTime,
      insertionTime: s.metrics.insertionTime,
      storageSize: s.metrics.storageSize,
      label: `#${s.solutionIndex + 1}`,
      isPareto: s.isPareto,
    })),
  ];

  // Simulate realistic metrics tick
  const simulateTick = useCallback(() => {
    setElapsedSec(prev => prev + 1);
    setLiveMetrics(prev => {
      const prevM = prev ?? {
        insertLatency: baseInsert, queryLatency: baseQuery * complexityMultiplier,
        storageKB: 0, throughput: 0, p99Latency: 0, activeConnections: 0,
        cacheHitRate: 0, rowsInserted: 0, queriesExecuted: 0, errorRate: 0,
      };

      const jitter = () => (Math.random() - 0.5) * 0.4;
      const userLoad = concurrentUsers / 50;
      const recordPressure = Math.log10(Math.max(numRecords, 100)) / 5;

      const insertLat = Math.max(0.1, baseInsert * (1 + jitter()) * userLoad * recordPressure);
      const queryLat = Math.max(0.2, baseQuery * complexityMultiplier * (1 + jitter()) * userLoad * recordPressure);

      const rowsPerSec = Math.floor(concurrentUsers * 2.5 * (1 + jitter() * 0.3));
      const newRows = prevM.rowsInserted + rowsPerSec;
      const storageKB = baseStorage * (newRows / 1000);
      const throughput = Math.floor(concurrentUsers * 12 * (1 + jitter() * 0.5) / complexityMultiplier);
      const p99 = queryLat * (2.5 + Math.random() * 1.5);
      const activeConns = Math.max(1, Math.floor(concurrentUsers * (0.7 + Math.random() * 0.6)));
      const cacheHitRate = Math.min(0.98, 0.5 + (prevM.rowsInserted / numRecords) * 0.3 + Math.random() * 0.05);
      const queriesExec = prevM.queriesExecuted + Math.floor(throughput * 0.6);
      const errorRate = Math.random() < 0.05 ? 0.01 + Math.random() * 0.02 : Math.max(0, prevM.errorRate * 0.9 + Math.random() * 0.001);

      const newMetrics: LiveMetrics = {
        insertLatency: insertLat, queryLatency: queryLat, storageKB, throughput,
        p99Latency: p99, activeConnections: activeConns, cacheHitRate,
        rowsInserted: newRows, queriesExecuted: queriesExec, errorRate,
      };
      setPrevMetrics(prev);
      return newMetrics;
    });

    setTimeSeries(prev => [...prev.slice(-120), {
      t: prev.length,
      insertLatency: 0,
      queryLatency: 0,
      throughput: 0,
      p99Latency: 0,
    }]);
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

    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (H / 5) * i + 20;
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(W - 10, y); ctx.stroke();
    }

    const points = timeSeries.slice(-60);
    if (points.length < 2) return;

    const maxQuery = Math.max(...points.map(p => p.queryLatency), 1);
    const maxInsert = Math.max(...points.map(p => p.insertLatency), 1);
    const maxVal = Math.max(maxQuery, maxInsert) * 1.3;
    const xStep = (W - 50) / (points.length - 1);

    const drawLine = (data: number[], color: string, alpha: number = 1) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha;
      data.forEach((val, i) => {
        const x = 40 + i * xStep;
        const y = 20 + (H - 40) * (1 - val / maxVal);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.1;
      ctx.lineTo(40 + (data.length - 1) * xStep, H - 20);
      ctx.lineTo(40, H - 20);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    drawLine(points.map(p => p.queryLatency), "#10b981", 1);
    drawLine(points.map(p => p.insertLatency), "#14b8a6", 0.7);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = (maxVal / 4) * (4 - i);
      const y = 20 + ((H - 40) / 4) * i;
      ctx.fillText(`${val.toFixed(1)}`, 36, y + 3);
    }

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

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

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
          Real-time interactive database performance simulation with 3D trade-space visualization
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
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium">⚡ Built-in Scenarios</div>
                    {DEMO_SOLUTIONS.map(s => (
                      <SelectItem key={s._id} value={s._id}>
                        <span className="flex items-center gap-1.5 text-xs">
                          <Star className="size-3 text-emerald-500" />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
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
                <Slider value={[numRecords]} onValueChange={v => setNumRecords(v[0])} min={100} max={1000000} step={1000} disabled={isRunning} />
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
                <Slider value={[concurrentUsers]} onValueChange={v => setConcurrentUsers(v[0])} min={1} max={500} step={5} disabled={isRunning} />
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

        {/* Main view */}
        <div className="md:col-span-3 space-y-4">

          {/* ── 3D Pareto Front ── */}
          <FullscreenPanel title="3D Pareto Trade Space" icon={Box} isFullscreen={fullscreenPanel === "pareto"} onClose={() => setFullscreenPanel(null)}>
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Box className="size-4 text-emerald-500" />
                    3D Pareto Trade Space
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    Query Time × Insertion Time × Schema Size
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ParetoFront3D
                  solutions={pareto3DPoints}
                  isFullscreen={fullscreenPanel === "pareto"}
                  onToggleFullscreen={() => setFullscreenPanel(p => p === "pareto" ? null : "pareto")}
                />
              </CardContent>
            </Card>
          </FullscreenPanel>

          {/* Live metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Insert Latency", value: liveMetrics ? `${liveMetrics.insertLatency.toFixed(2)}ms` : "—", icon: Zap, color: "text-teal-400", trendEl: trend(liveMetrics?.insertLatency, prevMetrics?.insertLatency) },
              { label: "Query Latency", value: liveMetrics ? `${liveMetrics.queryLatency.toFixed(2)}ms` : "—", icon: Clock, color: "text-emerald-400", trendEl: trend(liveMetrics?.queryLatency, prevMetrics?.queryLatency) },
              { label: "Throughput", value: liveMetrics ? `${liveMetrics.throughput} ops/s` : "—", icon: Activity, color: "text-blue-400", trendEl: null },
              { label: "P99 Latency", value: liveMetrics ? `${liveMetrics.p99Latency.toFixed(1)}ms` : "—", icon: TrendingUp, color: "text-amber-400", trendEl: trend(liveMetrics?.p99Latency, prevMetrics?.p99Latency) },
              { label: "Storage", value: liveMetrics ? liveMetrics.storageKB > 1024 ? `${(liveMetrics.storageKB / 1024).toFixed(1)}MB` : `${liveMetrics.storageKB.toFixed(0)}KB` : "—", icon: HardDrive, color: "text-purple-400", trendEl: null },
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

          {/* ── 3D Architecture Map ── */}
          <FullscreenPanel title="3D Resource Topology" icon={Server} isFullscreen={fullscreenPanel === "arch"} onClose={() => setFullscreenPanel(null)}>
            <Card className="border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Server className="size-4 text-blue-400" />
                    3D Resource Topology
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
                <ArchitectureMap3D
                  metrics={liveMetrics}
                  isFullscreen={fullscreenPanel === "arch"}
                  onToggleFullscreen={() => setFullscreenPanel(p => p === "arch" ? null : "arch")}
                  elapsedSec={elapsedSec}
                />
              </CardContent>
            </Card>
          </FullscreenPanel>

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
            <CardContent className="relative">
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg"
                style={{ height: 200 }}
              />
              {!isRunning && timeSeries.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
                    <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(100, (liveMetrics.activeConnections / concurrentUsers) * 100)}%` }} />
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
                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(100, (liveMetrics.rowsInserted / numRecords) * 100)}%` }} />
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
                    <div className="h-full rounded-full bg-amber-500 transition-all duration-500" style={{ width: `${liveMetrics.cacheHitRate * 100}%` }} />
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
                    <div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${Math.min(100, liveMetrics.errorRate * 1000)}%` }} />
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
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(sim.createdAt).toLocaleString()}</p>
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
