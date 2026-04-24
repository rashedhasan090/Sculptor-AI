import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { resolveUserId } from "./guestHelper";
import { api } from "./_generated/api";

export const createRun = mutation({
  args: {
    objectModelId: v.id("objectModels"),
    algorithms: v.array(v.string()),
    llmProvider: v.optional(v.string()),
    guestUserId: v.optional(v.string()),
    config: v.object({
      episodes: v.number(),
      epsilon: v.number(),
      learningRate: v.number(),
      discountFactor: v.number(),
      weightStrategy: v.number(),
      weightPerformance: v.number(),
      weightConstraints: v.number(),
    }),
  },
  returns: v.id("analysisRuns"),
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.guestUserId);
    if (!userId) throw new Error("Not authenticated");

    const runId = await ctx.db.insert("analysisRuns", {
      userId,
      objectModelId: args.objectModelId,
      algorithms: args.algorithms,
      llmProvider: args.llmProvider,
      status: "queued",
      progress: 0,
      config: args.config,
      startedAt: Date.now(),
    });

    // Schedule the analysis
    await ctx.scheduler.runAfter(0, api.rlEngine.runAnalysis, {
      analysisRunId: runId,
      objectModelId: args.objectModelId,
      algorithms: args.algorithms,
      config: args.config,
    });

    return runId;
  },
});

export const getUserRuns = query({
  args: { guestUserId: v.optional(v.string()) },
  returns: v.array(v.object({
    _id: v.id("analysisRuns"),
    _creationTime: v.number(),
    userId: v.id("users"),
    objectModelId: v.id("objectModels"),
    algorithms: v.array(v.string()),
    llmProvider: v.optional(v.string()),
    status: v.string(),
    progress: v.number(),
    config: v.object({
      episodes: v.number(),
      epsilon: v.number(),
      learningRate: v.number(),
      discountFactor: v.number(),
      weightStrategy: v.number(),
      weightPerformance: v.number(),
      weightConstraints: v.number(),
    }),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    totalSolutionsExplored: v.optional(v.number()),
    paretoSolutionsFound: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.guestUserId);
    if (!userId) return [];
    return await ctx.db.query("analysisRuns").withIndex("by_user", q => q.eq("userId", userId)).order("desc").collect();
  },
});

export const getRun = query({
  args: { id: v.id("analysisRuns") },
  returns: v.union(v.object({
    _id: v.id("analysisRuns"),
    _creationTime: v.number(),
    userId: v.id("users"),
    objectModelId: v.id("objectModels"),
    algorithms: v.array(v.string()),
    llmProvider: v.optional(v.string()),
    status: v.string(),
    progress: v.number(),
    config: v.object({
      episodes: v.number(),
      epsilon: v.number(),
      learningRate: v.number(),
      discountFactor: v.number(),
      weightStrategy: v.number(),
      weightPerformance: v.number(),
      weightConstraints: v.number(),
    }),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    totalSolutionsExplored: v.optional(v.number()),
    paretoSolutionsFound: v.optional(v.number()),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getRunsByModel = query({
  args: { objectModelId: v.id("objectModels") },
  returns: v.array(v.object({
    _id: v.id("analysisRuns"),
    _creationTime: v.number(),
    userId: v.id("users"),
    objectModelId: v.id("objectModels"),
    algorithms: v.array(v.string()),
    llmProvider: v.optional(v.string()),
    status: v.string(),
    progress: v.number(),
    config: v.object({
      episodes: v.number(),
      epsilon: v.number(),
      learningRate: v.number(),
      discountFactor: v.number(),
      weightStrategy: v.number(),
      weightPerformance: v.number(),
      weightConstraints: v.number(),
    }),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    totalSolutionsExplored: v.optional(v.number()),
    paretoSolutionsFound: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    return await ctx.db.query("analysisRuns").withIndex("by_model", q => q.eq("objectModelId", args.objectModelId)).order("desc").collect();
  },
});
