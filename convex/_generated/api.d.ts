/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as deploymentApi from "../deploymentApi.js";
import type * as deployments from "../deployments.js";
import type * as logs from "../logs.js";
import type * as schemas from "../schemas.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  deploymentApi: typeof deploymentApi;
  deployments: typeof deployments;
  logs: typeof logs;
  schemas: typeof schemas;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<"public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<"internal">
>;
