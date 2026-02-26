import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const getDeploymentInternal = internalQuery({
  args: { id: v.id("deployments") },
  handler: async (ctx, { id }) => {
    return ctx.db.get(id);
  },
});

export const updateStatusInternal = internalMutation({
  args: {
    id: v.id("deployments"),
    status: v.union(
      v.literal("connected"),
      v.literal("error"),
      v.literal("pending")
    ),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { id, status, errorMessage }) => {
    await ctx.db.patch(id, { status, errorMessage, lastChecked: Date.now() });
  },
});

export const upsertSchemaInternal = internalMutation({
  args: {
    deploymentId: v.id("deployments"),
    schema: v.string(),
  },
  handler: async (ctx, { deploymentId, schema }) => {
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
      });
    }
  },
});

export const checkConnection = action({
  args: { deploymentId: v.id("deployments") },
  handler: async (
    ctx,
    { deploymentId }
  ): Promise<{ success: boolean; error?: string }> => {
    const deployment = await ctx.runQuery(
      internal.deploymentApi.getDeploymentInternal,
      { id: deploymentId }
    );
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    try {
      const res: Response = await fetch(deployment.url, {
        headers: { Authorization: `Convex ${deployment.deployKey}` },
      });

      const isReachable: boolean = res.status < 500;
      await ctx.runMutation(internal.deploymentApi.updateStatusInternal, {
        id: deploymentId,
        status: isReachable ? ("connected" as const) : ("error" as const),
        errorMessage: isReachable
          ? undefined
          : `Server error (HTTP ${res.status})`,
      });
      return { success: isReachable };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Connection failed";
      await ctx.runMutation(internal.deploymentApi.updateStatusInternal, {
        id: deploymentId,
        status: "error" as const,
        errorMessage: message,
      });
      return { success: false, error: message };
    }
  },
});

export const fetchSchema = action({
  args: { deploymentId: v.id("deployments") },
  handler: async (
    ctx,
    { deploymentId }
  ): Promise<{ success: boolean; error?: string }> => {
    const deployment = await ctx.runQuery(
      internal.deploymentApi.getDeploymentInternal,
      { id: deploymentId }
    );
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    const baseUrl: string = deployment.url.replace(/\/$/, "");

    try {
      const res: Response = await fetch(`${baseUrl}/api/schema`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Convex ${deployment.deployKey}`,
        },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const schemaText: string = await res.text();
        await ctx.runMutation(internal.deploymentApi.upsertSchemaInternal, {
          deploymentId,
          schema: schemaText,
        });
        return { success: true };
      }

      return {
        success: false,
        error: `Could not auto-fetch schema (HTTP ${res.status}). Use manual input instead.`,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to fetch schema";
      return { success: false, error: message };
    }
  },
});

export const queryDocuments = action({
  args: {
    deploymentId: v.id("deployments"),
    tableName: v.string(),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (
    ctx,
    { deploymentId, tableName, cursor, limit }
  ): Promise<{ success: boolean; documents?: string; error?: string }> => {
    const deployment = await ctx.runQuery(
      internal.deploymentApi.getDeploymentInternal,
      { id: deploymentId }
    );
    if (!deployment) {
      throw new Error("Deployment not found");
    }

    const baseUrl: string = deployment.url.replace(/\/$/, "");
    const pageSize: number = limit ?? 10;

    try {
      const res: Response = await fetch(`${baseUrl}/api/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Convex ${deployment.deployKey}`,
        },
        body: JSON.stringify({
          path: "_system/frontend/paginatedTableDocuments",
          args: { tableName, cursor: cursor ?? null, pageSize },
          format: "json",
        }),
      });

      if (res.ok) {
        const resultText: string = await res.text();
        return { success: true, documents: resultText };
      }

      return {
        success: false,
        error: `Query failed (HTTP ${res.status})`,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Query failed";
      return { success: false, error: message };
    }
  },
});
