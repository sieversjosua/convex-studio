import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("deployments").collect();
  },
});

export const get = query({
  args: { id: v.id("deployments") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
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
    return ctx.db.insert("deployments", {
      ...args,
      status: "pending",
    });
  },
});

export const remove = mutation({
  args: { id: v.id("deployments") },
  handler: async (ctx, { id }) => {
    const deployment = await ctx.db.get(id);
    if (!deployment) {
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
    const deployment = await ctx.db.get(id);
    if (!deployment) {
      throw new Error("Deployment not found");
    }
    await ctx.db.patch(id, {
      status,
      errorMessage,
      lastChecked: Date.now(),
    });
  },
});
