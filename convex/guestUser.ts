import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Guest user support.
 *
 * When a guest user (no auth) wants to use the app, the frontend calls
 * `getOrCreateGuestUser` with a stable `sessionId` (generated once and
 * stored in localStorage).  This either returns an existing guest user or
 * creates one.  All mutations then accept an optional `guestUserId`
 * parameter and fall back to it when `getAuthUserId` returns null.
 */

export const getOrCreateGuestUser = mutation({
  args: { sessionId: v.string() },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    // Check if there's already a guest user with this sessionId stored as name
    const existing = await ctx.db
      .query("users")
      .filter(q =>
        q.and(
          q.eq(q.field("isAnonymous"), true),
          q.eq(q.field("name"), `guest_${args.sessionId}`)
        )
      )
      .first();

    if (existing) return existing._id;

    // Create a new guest user
    const id = await ctx.db.insert("users", {
      name: `guest_${args.sessionId}`,
      isAnonymous: true,
    });
    return id;
  },
});
