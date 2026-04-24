import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Resolve the current user ID — either from auth or from a guest user ID string.
 * Returns null if neither is available.
 */
export async function resolveUserId(
  ctx: QueryCtx | MutationCtx,
  guestUserId?: string
): Promise<Id<"users"> | null> {
  const authId = await getAuthUserId(ctx);
  if (authId) return authId;

  if (guestUserId) {
    try {
      const typedId = guestUserId as Id<"users">;
      const guest = await ctx.db.get(typedId);
      if (guest && guest.isAnonymous) {
        return guest._id;
      }
    } catch {
      // Invalid ID format
    }
  }

  return null;
}
