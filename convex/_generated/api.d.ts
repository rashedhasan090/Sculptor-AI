/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ViktorSpacesEmail from "../ViktorSpacesEmail.js";
import type * as analysisRuns from "../analysisRuns.js";
import type * as auth from "../auth.js";
import type * as benchmarks from "../benchmarks.js";
import type * as constants from "../constants.js";
import type * as http from "../http.js";
import type * as objectModels from "../objectModels.js";
import type * as rlEngine from "../rlEngine.js";
import type * as seedTestUser from "../seedTestUser.js";
import type * as simulations from "../simulations.js";
import type * as solutions from "../solutions.js";
import type * as testAuth from "../testAuth.js";
import type * as users from "../users.js";
import type * as viktorTools from "../viktorTools.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ViktorSpacesEmail: typeof ViktorSpacesEmail;
  analysisRuns: typeof analysisRuns;
  auth: typeof auth;
  benchmarks: typeof benchmarks;
  constants: typeof constants;
  http: typeof http;
  objectModels: typeof objectModels;
  rlEngine: typeof rlEngine;
  seedTestUser: typeof seedTestUser;
  simulations: typeof simulations;
  solutions: typeof solutions;
  testAuth: typeof testAuth;
  users: typeof users;
  viktorTools: typeof viktorTools;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
