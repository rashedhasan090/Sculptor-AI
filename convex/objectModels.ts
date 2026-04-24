import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { resolveUserId } from "./guestHelper";

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

// ============== Natural Language Parser ==============

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function singularize(s: string): string {
  if (s.endsWith("ies")) return s.slice(0, -3) + "y";
  if (s.endsWith("ses") || s.endsWith("xes") || s.endsWith("zes") || s.endsWith("ches") || s.endsWith("shes")) return s.slice(0, -2);
  if (s.endsWith("s") && !s.endsWith("ss") && !s.endsWith("us")) return s.slice(0, -1);
  return s;
}

function inferTypeFromName(name: string, typeHint?: string): string {
  if (typeHint) {
    const t = typeHint.toLowerCase().trim();
    if (/^(int|integer|bigint|smallint|number)$/i.test(t)) return "Integer";
    if (/^(str|string|text|varchar|char)$/i.test(t)) return "string";
    if (/^(real|float|double|decimal|numeric|money)$/i.test(t)) return "Real";
    if (/^(bool|boolean)$/i.test(t)) return "Bool";
  }
  const n = name.toLowerCase();
  if (/id$|_id$|count|number|quantity|age|year|num$|index|size|port/.test(n)) return "Integer";
  if (/name|email|address|title|description|type|status|date|url|phone|text|label|code|path/.test(n)) return "string";
  if (/price|cost|total|amount|weight|salary|balance|rate|score|percent|lat|lon|height|width/.test(n)) return "Real";
  if (/^is_|^has_|^can_|active|enabled|visible|deleted|flag|published/.test(n)) return "Bool";
  return "Integer";
}

function parseNaturalLanguage(input: string): { classes: ParsedClass[]; associations: ParsedAssociation[] } {
  const classMap = new Map<string, ParsedClass>();
  const associations: ParsedAssociation[] = [];

  const getOrCreate = (rawName: string): ParsedClass => {
    const name = capitalize(singularize(rawName.trim()));
    const key = name.toLowerCase();
    if (classMap.has(key)) return classMap.get(key)!;
    const cls: ParsedClass = { name, attributes: [], isAbstract: false, primaryKey: "" };
    classMap.set(key, cls);
    return cls;
  };

  const addAssoc = (srcName: string, dstName: string, srcMult: string, dstMult: string) => {
    const src = getOrCreate(srcName);
    const dst = getOrCreate(dstName);
    // Prevent duplicate associations
    const exists = associations.some(
      a => a.source === src.name && a.destination === dst.name
    );
    if (!exists) {
      associations.push({
        name: `${src.name}${dst.name}Association`,
        source: src.name,
        destination: dst.name,
        srcMultiplicity: srcMult,
        dstMultiplicity: dstMult,
      });
    }
  };

  // Split into sentences on periods, newlines, semicolons
  const sentences = input
    .replace(/\r\n/g, "\n")
    .split(/[.\n;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 2);

  for (const sentence of sentences) {
    const s = sentence;

    // ---- INHERITANCE: "X extends/inherits from Y" ----
    const inheritMatch = s.match(/(\w+)\s+(?:extends|inherits?\s+from|is\s+a\s+(?:type|subclass|kind|child)\s+of)\s+(\w+)/i);
    if (inheritMatch) {
      const child = getOrCreate(inheritMatch[1]);
      const parent = getOrCreate(inheritMatch[2]);
      child.parent = parent.name;
      // Parse trailing "with X, Y attributes"
      const withAttrs = s.match(/with\s+(.+?)(?:\s+attributes?)?$/i);
      if (withAttrs) {
        const parts = withAttrs[1].split(/,\s*(?:and\s+)?|\s+and\s+/);
        for (const p of parts) {
          const m = p.trim().match(/(?:an?\s+)?(\w+)\s*(?:\((\w+)\))?/);
          if (m && m[1] && m[1].length > 1) {
            child.attributes.push({ name: m[1], type: inferTypeFromName(m[1], m[2]) });
          }
        }
      }
      continue;
    }

    // ---- ABSTRACT: "abstract class X" ----
    const abstractMatch = s.match(/abstract\s+(?:class|entity|table)\s+(\w+)/i) ||
                          s.match(/(\w+)\s+is\s+(?:an?\s+)?abstract\s+(?:class|entity)?/i);
    if (abstractMatch) {
      const cls = getOrCreate(abstractMatch[1]);
      cls.isAbstract = true;
      continue;
    }

    // ---- MANY-TO-MANY: "many-to-many between X and Y" ----
    const m2m = s.match(/many[- ]to[- ]many\s+(?:between\s+|relationship\s+|link\s+)?(\w+)\s+and\s+(\w+)/i) ||
                s.match(/(\w+)\s+and\s+(\w+)\s+(?:have\s+)?(?:a\s+)?many[- ]to[- ]many/i);
    if (m2m) { addAssoc(m2m[1], m2m[2], "MANY", "MANY"); continue; }

    // ---- ONE-TO-MANY explicit: "one-to-many between X and Y" ----
    const o2m = s.match(/one[- ]to[- ]many\s+(?:between\s+|relationship\s+)?(\w+)\s+and\s+(\w+)/i) ||
                s.match(/(\w+)\s+and\s+(\w+)\s+(?:have\s+)?(?:a\s+)?one[- ]to[- ]many/i);
    if (o2m) { addAssoc(o2m[1], o2m[2], "ONE", "MANY"); continue; }

    // ---- ONE-TO-ONE: "one-to-one between X and Y" ----
    const o2o = s.match(/one[- ]to[- ]one\s+(?:between\s+|relationship\s+)?(\w+)\s+and\s+(\w+)/i) ||
                s.match(/(\w+)\s+and\s+(\w+)\s+(?:have\s+)?(?:a\s+)?one[- ]to[- ]one/i);
    if (o2o) { addAssoc(o2o[1], o2o[2], "ONE", "ONE"); continue; }

    // ---- BELONGS TO: "X belongs to Y" ----
    const belongs = s.match(/(\w+)\s+belongs?\s+to\s+(?:a\s+|an\s+)?(\w+)/i);
    if (belongs) { addAssoc(belongs[2], belongs[1], "ONE", "MANY"); continue; }

    // ---- RELATIONSHIP: "X has/can have many Y" ----
    const relMany = s.match(/(?:each|every|a|an)?\s*(\w+)\s+(?:can\s+)?(?:has|have|places?|contains?|includes?|owns?|manages?|creates?|holds?|stores?)\s+(?:many|multiple|several|one\s+or\s+more|zero\s+or\s+more)\s+(\w+)/i);
    if (relMany) { addAssoc(relMany[1], relMany[2], "ONE", "MANY"); continue; }

    // ---- RELATIONSHIP: "X has one Y" or "X has a Y" ----
    const relOne = s.match(/(?:each|every|a|an)?\s*(\w+)\s+(?:has|have)\s+(?:exactly\s+)?(?:one|a|an|single)\s+(\w+)/i);
    if (relOne) {
      // Make sure the second word isn't an attribute pattern
      const secondWord = relOne[2].toLowerCase();
      if (!["id", "name", "email", "address", "type", "date", "status"].some(a => secondWord.includes(a))) {
        addAssoc(relOne[1], relOne[2], "ONE", "ONE");
        continue;
      }
    }

    // ---- ATTRIBUTES with explicit format: "X has attributes: a (type), b (type)" ----
    const attrExplicit = s.match(/(\w+)\s+(?:has|have|contains?|includes?)\s+(?:the\s+)?(?:following\s+)?(?:attributes?|properties|fields?|columns?)\s*:?\s+(.+)/i);
    if (attrExplicit) {
      const cls = getOrCreate(attrExplicit[1]);
      const attrStr = attrExplicit[2];
      const parts = attrStr.split(/,\s*(?:and\s+)?|\s+and\s+/);
      for (const p of parts) {
        const m = p.trim().match(/(?:an?\s+)?(\w+)\s*(?:\((\w+)\)|:\s*(\w+)|\[(\w+)\])/);
        if (m) {
          cls.attributes.push({ name: m[1], type: inferTypeFromName(m[1], m[2] || m[3] || m[4]) });
        } else {
          const simple = p.trim().match(/^(?:an?\s+)?(\w+)$/);
          if (simple && simple[1].length > 1) {
            cls.attributes.push({ name: simple[1], type: inferTypeFromName(simple[1]) });
          }
        }
      }
      continue;
    }

    // ---- ATTRIBUTES inline: "X has/have a, b (type), and c" (not followed by relationship words) ----
    const attrInline = s.match(/(\w+)\s+(?:has|have)\s+(?:an?\s+)?(?!many|multiple|several|one\s+or)(.+)/i);
    if (attrInline) {
      const entityName = attrInline[1];
      const rest = attrInline[2].trim();
      // Check if it looks like attribute list (contains parenthesized types or commas)
      if (/\(|,|:\s*\w/.test(rest)) {
        const cls = getOrCreate(entityName);
        const parts = rest.split(/,\s*(?:and\s+)?|\s+and\s+/);
        for (const p of parts) {
          const m = p.trim().match(/(?:an?\s+)?(\w+)\s*(?:\((\w+)\)|:\s*(\w+)|\[(\w+)\])/);
          if (m) {
            cls.attributes.push({ name: m[1], type: inferTypeFromName(m[1], m[2] || m[3] || m[4]) });
          } else {
            const simple = p.trim().match(/^(?:an?\s+)?(\w+)$/);
            if (simple && simple[1].length > 1 && !["a", "an", "the"].includes(simple[1].toLowerCase())) {
              cls.attributes.push({ name: simple[1], type: inferTypeFromName(simple[1]) });
            }
          }
        }
        continue;
      }
    }

    // ---- ATTRIBUTE LINES: "- attributeName: type" or "- attributeName (type)" ----
    const attrLine = s.match(/^[-*•]\s*(\w+)\s*(?:\((\w+)\)|:\s*(\w+))/);
    if (attrLine) {
      // Find the most recently created class
      const classes = Array.from(classMap.values());
      if (classes.length > 0) {
        const lastClass = classes[classes.length - 1];
        lastClass.attributes.push({
          name: attrLine[1],
          type: inferTypeFromName(attrLine[1], attrLine[2] || attrLine[3]),
        });
      }
      continue;
    }

    // ---- ENTITY LIST: "system with X, Y, and Z entities" ----
    const entityList = s.match(/(?:with|include[s]?|ha(?:s|ve)|:)\s+((?:\w+(?:\s*,\s*)?)+\s+and\s+\w+)\s+(?:entities|classes|tables|models|objects|types)/i);
    if (entityList) {
      const names = entityList[1].split(/,\s*|\s+and\s+/).map(n => n.trim()).filter(Boolean);
      for (const name of names) {
        if (name.length > 1) getOrCreate(name);
      }
      continue;
    }
  }

  // Auto-assign primary keys
  for (const cls of classMap.values()) {
    if (!cls.primaryKey) {
      const idAttr = cls.attributes.find(a => a.name.toLowerCase().endsWith("id"));
      if (idAttr) {
        cls.primaryKey = idAttr.name;
      } else if (cls.attributes.length > 0) {
        cls.primaryKey = cls.attributes[0].name;
      } else {
        const autoId = cls.name.charAt(0).toLowerCase() + cls.name.slice(1) + "ID";
        cls.attributes.unshift({ name: autoId, type: "Integer" });
        cls.primaryKey = autoId;
      }
    }
  }

  return { classes: Array.from(classMap.values()), associations };
}

// ============== Queries ==============

export const getUserModels = query({
  args: { guestUserId: v.optional(v.string()) },
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
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.guestUserId);
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
    guestUserId: v.optional(v.string()),
  },
  returns: v.id("objectModels"),
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.guestUserId);
    if (!userId) throw new Error("Not authenticated");

    let parsed: { classes: ParsedClass[]; associations: ParsedAssociation[] };

    try {
      if (args.inputType === "alloy") {
        parsed = parseAlloyModel(args.rawInput);
      } else if (args.inputType === "json") {
        parsed = parseJSONModel(args.rawInput);
      } else if (args.inputType === "natural") {
        parsed = parseNaturalLanguage(args.rawInput);
      } else {
        parsed = parseTextModel(args.rawInput);
      }
    } catch {
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
  args: { id: v.id("objectModels"), guestUserId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await resolveUserId(ctx, args.guestUserId);
    if (!userId) throw new Error("Not authenticated");
    const model = await ctx.db.get(args.id);
    if (!model || model.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(args.id);
    return null;
  },
});
