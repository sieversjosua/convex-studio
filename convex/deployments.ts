import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return ctx.db
      .query("deployments")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const get = query({
  args: { id: v.id("deployments") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const deployment = await ctx.db.get(id);
    if (!deployment || deployment.userId !== identity.subject) return null;
    return deployment;
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    deployKey: v.string(),
    environment: v.union(v.literal("dev"), v.literal("prod"), v.literal("staging")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return ctx.db.insert("deployments", {
      ...args,
      status: "pending",
      userId: identity.subject,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("deployments") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const deployment = await ctx.db.get(id);
    if (!deployment || deployment.userId !== identity.subject) {
      throw new Error("Deployment not found");
    }
    await ctx.db.delete(id);
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("deployments"),
    status: v.union(v.literal("connected"), v.literal("error"), v.literal("pending")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, errorMessage }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const deployment = await ctx.db.get(id);
    if (!deployment || deployment.userId !== identity.subject) {
      throw new Error("Deployment not found");
    }
    await ctx.db.patch(id, {
      status,
      errorMessage,
      lastChecked: Date.now(),
    });
  },
});
