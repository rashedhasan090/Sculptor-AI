import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createSimulation = mutation({
  args: {
    solutionId: v.id("solutions"),
    objectModelId: v.id("objectModels"),
    config: v.object({
      numRecords: v.number(),
      queryComplexity: v.string(),
      concurrentUsers: v.number(),
    }),
  },
  returns: v.id("simulations"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const solution = await ctx.db.get(args.solutionId);
    if (!solution) throw new Error("Solution not found");

    // Simulate realistic results based on solution metrics
    const baseInsert = solution.metrics.insertionTime;
    const baseQuery = solution.metrics.queryTime;
    const baseStorage = solution.metrics.storageSize;

    const recordFactor = Math.log10(args.config.numRecords) / 3;
    const complexityFactor = args.config.queryComplexity === "simple" ? 1 :
                            args.config.queryComplexity === "moderate" ? 1.8 :
                            args.config.queryComplexity === "complex" ? 3.2 : 5.0;
    const concurrencyFactor = 1 + (args.config.concurrentUsers / 100) * 0.5;

    const avgInsertTime = Math.round(baseInsert * recordFactor * concurrencyFactor * 10) / 10;
    const avgQueryTime = Math.round(baseQuery * complexityFactor * concurrencyFactor * 10) / 10;
    const storageUsed = Math.round(baseStorage * args.config.numRecords / 1000);
    const throughput = Math.round(1000 / (avgInsertTime + avgQueryTime) * args.config.concurrentUsers);
    const p99Latency = Math.round(avgQueryTime * 3.5 * 10) / 10;

    const simId = await ctx.db.insert("simulations", {
      userId,
      solutionId: args.solutionId,
      objectModelId: args.objectModelId,
      config: args.config,
      results: {
        avgInsertTime,
        avgQueryTime,
        storageUsed,
        throughput,
        p99Latency,
      },
      status: "complete",
      createdAt: Date.now(),
    });

    return simId;
  },
});

export const getUserSimulations = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("simulations"),
    _creationTime: v.number(),
    userId: v.id("users"),
    solutionId: v.id("solutions"),
    objectModelId: v.id("objectModels"),
    config: v.object({
      numRecords: v.number(),
      queryComplexity: v.string(),
      concurrentUsers: v.number(),
    }),
    results: v.optional(v.object({
      avgInsertTime: v.number(),
      avgQueryTime: v.number(),
      storageUsed: v.number(),
      throughput: v.number(),
      p99Latency: v.number(),
    })),
    status: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("simulations").withIndex("by_user", q => q.eq("userId", userId)).order("desc").collect();
  },
});

export const getSimulation = query({
  args: { id: v.id("simulations") },
  returns: v.union(v.object({
    _id: v.id("simulations"),
    _creationTime: v.number(),
    userId: v.id("users"),
    solutionId: v.id("solutions"),
    objectModelId: v.id("objectModels"),
    config: v.object({
      numRecords: v.number(),
      queryComplexity: v.string(),
      concurrentUsers: v.number(),
    }),
    results: v.optional(v.object({
      avgInsertTime: v.number(),
      avgQueryTime: v.number(),
      storageUsed: v.number(),
      throughput: v.number(),
      p99Latency: v.number(),
    })),
    status: v.string(),
    createdAt: v.number(),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getBySolution = query({
  args: { solutionId: v.id("solutions") },
  returns: v.array(v.object({
    _id: v.id("simulations"),
    _creationTime: v.number(),
    userId: v.id("users"),
    solutionId: v.id("solutions"),
    objectModelId: v.id("objectModels"),
    config: v.object({
      numRecords: v.number(),
      queryComplexity: v.string(),
      concurrentUsers: v.number(),
    }),
    results: v.optional(v.object({
      avgInsertTime: v.number(),
      avgQueryTime: v.number(),
      storageUsed: v.number(),
      throughput: v.number(),
      p99Latency: v.number(),
    })),
    status: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db.query("simulations").withIndex("by_solution", q => q.eq("solutionId", args.solutionId)).collect();
  },
});
