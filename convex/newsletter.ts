import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const subscribe = mutation({
  args: { email: v.string() },
  returns: v.object({ success: v.boolean(), message: v.string() }),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { success: false, message: "Please enter a valid email address." };
    }

    // Check if already subscribed
    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      return { success: true, message: "You're already subscribed!" };
    }

    await ctx.db.insert("subscribers", {
      email,
      subscribedAt: Date.now(),
    });

    return { success: true, message: "Successfully subscribed! You'll receive updates when the app is updated." };
  },
});

export const getSubscribers = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("subscribers"),
    _creationTime: v.number(),
    email: v.string(),
    subscribedAt: v.number(),
  })),
  handler: async (ctx) => {
    return await ctx.db.query("subscribers").order("desc").collect();
  },
});

export const getCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const all = await ctx.db.query("subscribers").collect();
    return all.length;
  },
});
