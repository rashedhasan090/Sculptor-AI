import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  // Object models uploaded by users
  objectModels: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    inputType: v.string(), // "text", "json", "alloy", "image"
    rawInput: v.string(),
    parsedModel: v.optional(v.string()), // JSON stringified parsed model
    classes: v.optional(v.array(v.object({
      name: v.string(),
      attributes: v.array(v.object({ name: v.string(), type: v.string() })),
      isAbstract: v.boolean(),
      parent: v.optional(v.string()),
      primaryKey: v.string(),
    }))),
    associations: v.optional(v.array(v.object({
      name: v.string(),
      source: v.string(),
      destination: v.string(),
      srcMultiplicity: v.string(),
      dstMultiplicity: v.string(),
    }))),
    status: v.string(), // "pending", "parsed", "analyzing", "complete", "error"
    createdAt: v.number(),
  }).index("by_user", ["userId"]).index("by_status", ["status"]),

  // Analysis runs
  analysisRuns: defineTable({
    userId: v.id("users"),
    objectModelId: v.id("objectModels"),
    algorithms: v.array(v.string()), // ["monte_carlo", "dqn", "actor_critic"]
    llmProvider: v.optional(v.string()),
    status: v.string(), // "queued", "running", "complete", "error"
    progress: v.number(), // 0-100
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
  }).index("by_user", ["userId"]).index("by_model", ["objectModelId"]),

  // Generated solutions
  solutions: defineTable({
    analysisRunId: v.id("analysisRuns"),
    objectModelId: v.id("objectModels"),
    userId: v.id("users"),
    solutionIndex: v.number(),
    isPareto: v.boolean(),
    confidence: v.number(), // 0-1
    algorithm: v.string(), // which RL algorithm found this
    mappingStrategies: v.array(v.object({
      className: v.string(),
      strategy: v.string(), // "UnionSubclass", "JoinedSubclass", "UnionSuperclass"
    })),
    associationStrategies: v.array(v.object({
      associationName: v.string(),
      strategy: v.string(), // "ForeignKeyEmbedding", "OwnAssociationTable"
    })),
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
  }).index("by_run", ["analysisRunId"])
    .index("by_model", ["objectModelId"])
    .index("by_user", ["userId"])
    .index("by_pareto", ["analysisRunId", "isPareto"]),

  // Simulation runs
  simulations: defineTable({
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
  }).index("by_user", ["userId"]).index("by_solution", ["solutionId"]),

  // Pre-loaded benchmark datasets
  benchmarks: defineTable({
    name: v.string(),
    domain: v.string(),
    objectModelText: v.string(),
    numClasses: v.number(),
    numAssociations: v.number(),
    totalDesigns: v.number(),
    paretoOptimalCount: v.number(),
    description: v.string(),
  }).index("by_name", ["name"]),
});

export default schema;
