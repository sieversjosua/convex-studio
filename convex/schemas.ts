import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getCached = query({
  args: { deploymentId: v.id("deployments") },
  handler: async (ctx, { deploymentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const cached = await ctx.db
      .query("cachedSchemas")
      .withIndex("by_deployment", (q) => q.eq("deploymentId", deploymentId))
      .unique();
    if (!cached || cached.userId !== identity.subject) return null;
    return cached;
  },
});

export const getTableNames = query({
  args: { deploymentId: v.id("deployments") },
  handler: async (ctx, { deploymentId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const cached = await ctx.db
      .query("cachedSchemas")
      .withIndex("by_deployment", (q) => q.eq("deploymentId", deploymentId))
      .unique();
    if (!cached || cached.userId !== identity.subject) return [];
    try {
      const data: { tables?: Array<{ name: string }> } = JSON.parse(
        cached.schema
      );
      if (Array.isArray(data.tables)) {
        return data.tables
          .filter(
            (t): t is { name: string } =>
              typeof t === "object" && t !== null && typeof t.name === "string"
          )
          .map((t) => t.name);
      }
      return Object.keys(data).filter(
        (k) => k !== "functions" && k !== "schemaValidation"
      );
    } catch {
      return [];
    }
  },
});

export const upsert = mutation({
  args: {
    deploymentId: v.id("deployments"),
    schema: v.string(),
  },
  handler: async (ctx, { deploymentId, schema }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("cachedSchemas")
      .withIndex("by_deployment", (q) => q.eq("deploymentId", deploymentId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { schema, fetchedAt: Date.now() });
    } else {
      await ctx.db.insert("cachedSchemas", {
        deploymentId,
        schema,
        fetchedAt: Date.now(),
        userId: identity.subject,
      });
    }
  },
});
