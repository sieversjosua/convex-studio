import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  deployments: defineTable({
    name: v.string(),
    url: v.string(),
    deployKey: v.string(),
    environment: v.union(v.literal("dev"), v.literal("prod"), v.literal("staging")),
    status: v.union(v.literal("connected"), v.literal("error"), v.literal("pending")),
    lastChecked: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    userId: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_env", ["userId", "environment"]),

  logs: defineTable({
    deploymentId: v.id("deployments"),
    level: v.union(v.literal("error"), v.literal("warning"), v.literal("info"), v.literal("debug")),
    message: v.string(),
    timestamp: v.number(),
    functionName: v.optional(v.string()),
    requestId: v.optional(v.string()),
    userId: v.string(),
  })
    .index("by_deployment", ["deploymentId", "timestamp"])
    .index("by_user", ["userId", "timestamp"])
    .index("by_level", ["deploymentId", "level", "timestamp"]),

  cachedSchemas: defineTable({
    deploymentId: v.id("deployments"),
    schema: v.string(),
    fetchedAt: v.number(),
    userId: v.string(),
  }).index("by_deployment", ["deploymentId"]),
});
