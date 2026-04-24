import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const solutionValidator = v.object({
  _id: v.id("solutions"),
  _creationTime: v.number(),
  analysisRunId: v.id("analysisRuns"),
  objectModelId: v.id("objectModels"),
  userId: v.id("users"),
  solutionIndex: v.number(),
  isPareto: v.boolean(),
  confidence: v.number(),
  algorithm: v.string(),
  mappingStrategies: v.array(v.object({ className: v.string(), strategy: v.string() })),
  associationStrategies: v.array(v.object({ associationName: v.string(), strategy: v.string() })),
  metrics: v.object({
    insertionTime: v.number(),
    queryTime: v.number(),
    storageSize: v.number(),
    securityScore: v.optional(v.number()),
    scalabilityScore: v.optional(v.number()),
  }),
  sqlSchema: v.optional(v.string()),
  nosqlSchema: v.optional(v.string()),
  reward: v.number(),
  createdAt: v.number(),
});

export const getByRun = query({
  args: { analysisRunId: v.id("analysisRuns") },
  returns: v.array(solutionValidator),
  handler: async (ctx, args) => {
    return await ctx.db.query("solutions").withIndex("by_run", q => q.eq("analysisRunId", args.analysisRunId)).collect();
  },
});

export const getParetoByRun = query({
  args: { analysisRunId: v.id("analysisRuns") },
  returns: v.array(solutionValidator),
  handler: async (ctx, args) => {
    return await ctx.db.query("solutions")
      .withIndex("by_pareto", q => q.eq("analysisRunId", args.analysisRunId).eq("isPareto", true))
      .collect();
  },
});

export const getSolution = query({
  args: { id: v.id("solutions") },
  returns: v.union(solutionValidator, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getUserSolutions = query({
  args: {},
  returns: v.array(solutionValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("solutions").withIndex("by_user", q => q.eq("userId", userId)).order("desc").take(100);
  },
});
