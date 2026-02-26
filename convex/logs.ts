import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    deploymentId: v.optional(v.id("deployments")),
    level: v.optional(v.union(v.literal("error"), v.literal("warning"), v.literal("info"), v.literal("debug"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { deploymentId, level, limit }) => {
    const resultLimit = limit ?? 100;

    if (deploymentId && level) {
      return ctx.db
        .query("logs")
        .withIndex("by_level", (q) =>
          q.eq("deploymentId", deploymentId).eq("level", level)
        )
        .order("desc")
        .take(resultLimit);
    }

    if (deploymentId) {
      return ctx.db
        .query("logs")
        .withIndex("by_deployment", (q) => q.eq("deploymentId", deploymentId))
        .order("desc")
        .take(resultLimit);
    }

    return ctx.db
      .query("logs")
      .order("desc")
      .take(resultLimit);
  },
});

export const add = mutation({
  args: {
    deploymentId: v.id("deployments"),
    level: v.union(v.literal("error"), v.literal("warning"), v.literal("info"), v.literal("debug")),
    message: v.string(),
    functionName: v.optional(v.string()),
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("logs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});

export const clear = mutation({
  args: { deploymentId: v.id("deployments") },
  handler: async (ctx, { deploymentId }) => {
    const logs = await ctx.db
      .query("logs")
      .withIndex("by_deployment", (q) => q.eq("deploymentId", deploymentId))
      .collect();
    for (const log of logs) {
      await ctx.db.delete(log._id);
    }
  },
});
