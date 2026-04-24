import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============== Object Model Parser ==============

interface ParsedClass {
  name: string;
  attributes: { name: string; type: string }[];
  isAbstract: boolean;
  parent?: string;
  primaryKey: string;
}

interface ParsedAssociation {
  name: string;
  source: string;
  destination: string;
  srcMultiplicity: string;
  dstMultiplicity: string;
}

function parseAlloyModel(input: string): { classes: ParsedClass[]; associations: ParsedAssociation[] } {
  const classes: ParsedClass[] = [];
  const associations: ParsedAssociation[] = [];

  // Parse Alloy-format object models
  const sigRegex = /one\s+sig\s+(\w+)\s+extends\s+(Class|Association)\s*\{[^}]*\}\s*\{([^}]*)\}/gs;
  let match;

  while ((match = sigRegex.exec(input)) !== null) {
    const name = match[1];
    const type = match[2];
    const body = match[3];

    if (type === "Class") {
      const attrMatch = body.match(/attrSet\s*=\s*([^\n]+)/);
      const idMatch = body.match(/id\s*=\s*(\w+)/);
      const abstractMatch = body.match(/isAbstract\s*=\s*(\w+)/);
      const parentMatch = body.match(/parent\s+in\s+(\w+)/);
      const noParentMatch = body.match(/no\s+parent/);

      const attributes = attrMatch
        ? attrMatch[1].trim().split("+").map(a => a.trim()).filter(Boolean)
        : [];

      classes.push({
        name,
        attributes: attributes.map(a => ({ name: a, type: guessType(a, input) })),
        isAbstract: abstractMatch ? abstractMatch[1] === "Yes" : false,
        parent: noParentMatch ? undefined : (parentMatch ? parentMatch[1] : undefined),
        primaryKey: idMatch ? idMatch[1].trim() : (attributes[0] || "id"),
      });
    } else if (type === "Association") {
      const srcMatch = body.match(/src\s*=\s*(\w+)/);
      const dstMatch = body.match(/dst\s*=\s*(\w+)/);
      const srcMultMatch = body.match(/src_multiplicity\s*=\s*(\w+)/);
      const dstMultMatch = body.match(/dst_multiplicity\s*=\s*(\w+)/);

      if (srcMatch && dstMatch) {
        associations.push({
          name,
          source: srcMatch[1],
          destination: dstMatch[1],
          srcMultiplicity: srcMultMatch ? srcMultMatch[1] : "ONE",
          dstMultiplicity: dstMultMatch ? dstMultMatch[1] : "MANY",
        });
      }
    }
  }

  return { classes, associations };
}

function guessType(attrName: string, fullText: string): string {
  const typeMatch = fullText.match(new RegExp(`one\\s+sig\\s+${attrName}\\s+extends\\s+(\\w+)`));
  if (typeMatch) {
    const t = typeMatch[1];
    if (t === "Integer" || t === "Int") return "Integer";
    if (t === "Real") return "Real";
    if (t === "Bool") return "Bool";
    if (t === "string" || t === "String") return "string";
  }
  if (attrName.toLowerCase().includes("id") || attrName.toLowerCase().includes("number")) return "Integer";
  if (attrName.toLowerCase().includes("name") || attrName.toLowerCase().includes("description")) return "string";
  if (attrName.toLowerCase().includes("price") || attrName.toLowerCase().includes("weight")) return "Real";
  return "Integer";
}

function parseJSONModel(input: string): { classes: ParsedClass[]; associations: ParsedAssociation[] } {
  try {
    const data = JSON.parse(input);
    const classes: ParsedClass[] = (data.classes || []).map((c: Record<string, unknown>) => ({
      name: c.name as string,
      attributes: ((c.attributes as { name: string; type: string }[]) || []).map((a) => ({ name: a.name, type: a.type || "Integer" })),
      isAbstract: c.isAbstract as boolean || false,
      parent: c.parent as string | undefined,
      primaryKey: c.primaryKey as string || ((c.attributes as { name: string }[])?.[0]?.name || "id"),
    }));
    const associations: ParsedAssociation[] = (data.associations || []).map((a: Record<string, unknown>) => ({
      name: a.name as string,
      source: a.source as string,
      destination: a.destination as string,
      srcMultiplicity: a.srcMultiplicity as string || "ONE",
      dstMultiplicity: a.dstMultiplicity as string || "MANY",
    }));
    return { classes, associations };
  } catch {
    throw new Error("Invalid JSON format");
  }
}

function parseTextModel(input: string): { classes: ParsedClass[]; associations: ParsedAssociation[] } {
  const classes: ParsedClass[] = [];
  const associations: ParsedAssociation[] = [];
  const lines = input.split("\n").map(l => l.trim()).filter(Boolean);

  let currentClass: ParsedClass | null = null;

  for (const line of lines) {
    // Class definition: "class ClassName" or "class ClassName extends Parent"
    const classMatch = line.match(/^(?:class|entity|table)\s+(\w+)(?:\s+extends\s+(\w+))?/i);
    if (classMatch) {
      if (currentClass) classes.push(currentClass);
      currentClass = {
        name: classMatch[1],
        attributes: [],
        isAbstract: line.toLowerCase().includes("abstract"),
        parent: classMatch[2] || undefined,
        primaryKey: "",
      };
      continue;
    }

    // Attribute: "- attributeName: type" or "attributeName type"
    if (currentClass) {
      const attrMatch = line.match(/^[-*]?\s*(\w+)\s*[:\s]\s*(Integer|Int|String|string|Real|Float|Bool|Boolean|varchar|int|text)/i);
      if (attrMatch) {
        const attrType = attrMatch[2].toLowerCase();
        const type = attrType.includes("int") ? "Integer" :
                    attrType.includes("str") || attrType.includes("varchar") || attrType.includes("text") ? "string" :
                    attrType.includes("real") || attrType.includes("float") ? "Real" :
                    attrType.includes("bool") ? "Bool" : "Integer";
        currentClass.attributes.push({ name: attrMatch[1], type });
        if (attrMatch[1].toLowerCase().endsWith("id") && !currentClass.primaryKey) {
          currentClass.primaryKey = attrMatch[1];
        }
        continue;
      }
      // Simple attr: just "attributeName" on its own line with a dash
      const simpleAttr = line.match(/^[-*]\s+(\w+)\s*$/);
      if (simpleAttr) {
        currentClass.attributes.push({ name: simpleAttr[1], type: "Integer" });
        if (simpleAttr[1].toLowerCase().endsWith("id") && !currentClass.primaryKey) {
          currentClass.primaryKey = simpleAttr[1];
        }
        continue;
      }
    }

    // Association: "association Name: Source -> Destination (ONE to MANY)"
    const assocMatch = line.match(/^(?:association|relationship|link)\s+(\w+)\s*:\s*(\w+)\s*(?:->|→|to)\s*(\w+)(?:\s*\((\w+)\s*(?:to|-)\s*(\w+)\))?/i);
    if (assocMatch) {
      if (currentClass) { classes.push(currentClass); currentClass = null; }
      associations.push({
        name: assocMatch[1],
        source: assocMatch[2],
        destination: assocMatch[3],
        srcMultiplicity: (assocMatch[4] || "ONE").toUpperCase(),
        dstMultiplicity: (assocMatch[5] || "MANY").toUpperCase(),
      });
    }
  }
  if (currentClass) {
    if (!currentClass.primaryKey && currentClass.attributes.length > 0) {
      currentClass.primaryKey = currentClass.attributes[0].name;
    }
    classes.push(currentClass);
  }

  // Set primary keys for any classes missing them
  for (const cls of classes) {
    if (!cls.primaryKey && cls.attributes.length > 0) {
      cls.primaryKey = cls.attributes[0].name;
    }
  }

  return { classes, associations };
}

// ============== Queries ==============

export const getUserModels = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("objectModels"),
    _creationTime: v.number(),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    inputType: v.string(),
    rawInput: v.string(),
    parsedModel: v.optional(v.string()),
    classes: v.optional(v.array(v.object({
      name: v.string(),
      attributes: v.array(v.object({ name: v.string(), type: v.string() })),
      isAbstract: v.boolean(),
      parent: v.optional(v.string()),
      primaryKey: v.string(),
    }))),
    associations: v.optional(v.array(v.object({
      name: v.string(),
      source: v.string(),
      destination: v.string(),
      srcMultiplicity: v.string(),
      dstMultiplicity: v.string(),
    }))),
    status: v.string(),
    createdAt: v.number(),
  })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("objectModels").withIndex("by_user", q => q.eq("userId", userId)).order("desc").collect();
  },
});

export const getModel = query({
  args: { id: v.id("objectModels") },
  returns: v.union(v.object({
    _id: v.id("objectModels"),
    _creationTime: v.number(),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    inputType: v.string(),
    rawInput: v.string(),
    parsedModel: v.optional(v.string()),
    classes: v.optional(v.array(v.object({
      name: v.string(),
      attributes: v.array(v.object({ name: v.string(), type: v.string() })),
      isAbstract: v.boolean(),
      parent: v.optional(v.string()),
      primaryKey: v.string(),
    }))),
    associations: v.optional(v.array(v.object({
      name: v.string(),
      source: v.string(),
      destination: v.string(),
      srcMultiplicity: v.string(),
      dstMultiplicity: v.string(),
    }))),
    status: v.string(),
    createdAt: v.number(),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getModelInternal = internalQuery({
  args: { id: v.id("objectModels") },
  returns: v.union(v.object({
    _id: v.id("objectModels"),
    _creationTime: v.number(),
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    inputType: v.string(),
    rawInput: v.string(),
    parsedModel: v.optional(v.string()),
    classes: v.optional(v.array(v.object({
      name: v.string(),
      attributes: v.array(v.object({ name: v.string(), type: v.string() })),
      isAbstract: v.boolean(),
      parent: v.optional(v.string()),
      primaryKey: v.string(),
    }))),
    associations: v.optional(v.array(v.object({
      name: v.string(),
      source: v.string(),
      destination: v.string(),
      srcMultiplicity: v.string(),
      dstMultiplicity: v.string(),
    }))),
    status: v.string(),
    createdAt: v.number(),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ============== Mutations ==============

export const createModel = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    inputType: v.string(),
    rawInput: v.string(),
  },
  returns: v.id("objectModels"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let parsed: { classes: ParsedClass[]; associations: ParsedAssociation[] };

    try {
      if (args.inputType === "alloy") {
        parsed = parseAlloyModel(args.rawInput);
      } else if (args.inputType === "json") {
        parsed = parseJSONModel(args.rawInput);
      } else {
        parsed = parseTextModel(args.rawInput);
      }
    } catch (e) {
      parsed = { classes: [], associations: [] };
    }

    const status = parsed.classes.length > 0 ? "parsed" : "pending";

    return await ctx.db.insert("objectModels", {
      userId,
      name: args.name,
      description: args.description,
      inputType: args.inputType,
      rawInput: args.rawInput,
      parsedModel: JSON.stringify(parsed),
      classes: parsed.classes,
      associations: parsed.associations,
      status,
      createdAt: Date.now(),
    });
  },
});

export const deleteModel = mutation({
  args: { id: v.id("objectModels") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const model = await ctx.db.get(args.id);
    if (!model || model.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(args.id);
    return null;
  },
});
