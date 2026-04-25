import { v } from "convex/values";
import { action } from "./_generated/server";

const VISION_SYSTEM_PROMPT = `You are a UML class diagram parser for a database design tool called DesignTradeoffSculptor (DTF).
Your job is to extract ALL classes, attributes, types, inheritance, and associations from a UML class diagram image.

Output ONLY in this exact structured text format (no markdown, no explanation):

class ClassName
- attributeName: Type
- attributeName2: Type

class ChildClass extends ParentClass
- extraAttribute: Type

abstract class AbstractClassName
- attributeName: Type

association AssociationName: SourceClass -> DestinationClass (SRC_MULT to DST_MULT)

Rules:
- Types must be one of: Integer, String, Real, Boolean, Date
- Multiplicities must be: ONE, MANY, ZERO_OR_ONE, ZERO_OR_MANY, ONE_OR_MANY
- Map "int" -> Integer, "string/varchar/text/char" -> String, "float/double/decimal/real" -> Real, "bool/boolean" -> Boolean, "date/datetime/timestamp" -> Date
- Include ALL classes you can see, even if partially visible
- For inheritance (generalization arrows with hollow triangles), use "extends"
- For abstract classes (italic class names or marked abstract), use "abstract class"
- Ignore methods/operations - only extract attributes
- First attribute of each class is the primary key if not obvious, use className + "Id" as Integer
- If multiplicity is shown (1, *, 0..1, 1..*, 0..*), map to: 1->ONE, *->MANY, 0..1->ZERO_OR_ONE, 0..*->ZERO_OR_MANY, 1..*->ONE_OR_MANY
- Name associations as SourceDestinationAssociation if no name is shown`;

const USER_PROMPT =
  "Extract all classes, attributes, types, inheritance, and associations from this UML class diagram. Output ONLY in the structured text format specified.";

/* ── provider call helpers ── */

async function callOpenAI(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as Record<string, Record<string, string>>)?.error?.message ||
        `OpenAI API error: ${response.status}`
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOpenAIUrl(
  imageUrl: string,
  apiKey: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as Record<string, Record<string, string>>)?.error?.message ||
        `OpenAI API error: ${response.status}`
    );
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: VISION_SYSTEM_PROMPT }] },
        contents: [
          {
            parts: [
              { text: USER_PROMPT },
              { inlineData: { mimeType, data: base64Data } },
            ],
          },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as Record<string, Record<string, string>>)?.error?.message ||
        `Gemini API error: ${response.status}`
    );
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callAnthropic(
  base64Data: string,
  mimeType: string,
  apiKey: string
): Promise<string> {
  const mediaType = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            { type: "text", text: USER_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as Record<string, Record<string, string>>)?.error?.message ||
        `Anthropic API error: ${response.status}`
    );
  }

  const data = (await response.json()) as {
    content?: { text?: string }[];
  };
  return data.content?.[0]?.text ?? "";
}

/* ── helper to clean up error messages ── */

function cleanError(raw: string, provider: string): string {
  if (/quota/i.test(raw) || /rate.limit/i.test(raw) || /exceeded/i.test(raw)) {
    return `${provider}: quota or rate limit exceeded`;
  }
  if (/invalid.*key/i.test(raw) || /auth/i.test(raw) || /401/i.test(raw)) {
    return `${provider}: API key is invalid`;
  }
  if (/billing/i.test(raw) || /payment/i.test(raw)) {
    return `${provider}: billing issue — check your plan`;
  }
  const short = raw.length > 100 ? raw.slice(0, 100) + "…" : raw;
  return `${provider}: ${short}`;
}

/* ══════════════════════════════════════════════════════════════
   Public action — called from the frontend
   ══════════════════════════════════════════════════════════════ */

export const analyzeImage = action({
  args: {
    base64Data: v.string(),
    mimeType: v.string(),
    openaiKey: v.optional(v.string()),
    anthropicKey: v.optional(v.string()),
    geminiKey: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    result: v.string(),
    provider: v.string(),
    errors: v.array(v.string()),
  }),
  handler: async (_ctx, args) => {
    const providers: {
      name: string;
      fn: () => Promise<string>;
    }[] = [];

    if (args.openaiKey) {
      providers.push({
        name: "OpenAI GPT-4o",
        fn: () => callOpenAI(args.base64Data, args.mimeType, args.openaiKey!),
      });
    }
    if (args.anthropicKey) {
      providers.push({
        name: "Claude",
        fn: () =>
          callAnthropic(args.base64Data, args.mimeType, args.anthropicKey!),
      });
    }
    if (args.geminiKey) {
      providers.push({
        name: "Gemini",
        fn: () => callGemini(args.base64Data, args.mimeType, args.geminiKey!),
      });
    }

    if (providers.length === 0) {
      return {
        success: false,
        result: "",
        provider: "",
        errors: [
          "No API keys provided. Add an OpenAI, Anthropic, or Gemini key in Settings.",
        ],
      };
    }

    const errors: string[] = [];

    for (const provider of providers) {
      try {
        const raw = await provider.fn();
        if (raw.trim()) {
          let cleaned = raw.trim();
          cleaned = cleaned
            .replace(/^```[\w]*\n?/gm, "")
            .replace(/```$/gm, "")
            .trim();
          return {
            success: true,
            result: cleaned,
            provider: provider.name,
            errors,
          };
        }
        errors.push(`${provider.name}: returned empty result`);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : String(err);
        errors.push(cleanError(msg, provider.name));
      }
    }

    // Suggest missing providers
    const configured = new Set(providers.map((p) => p.name));
    const missing: string[] = [];
    if (!configured.has("OpenAI GPT-4o")) missing.push("OpenAI");
    if (!configured.has("Claude")) missing.push("Anthropic");
    if (!configured.has("Gemini")) missing.push("Gemini");
    if (missing.length > 0) {
      errors.push(
        `Tip: add a ${missing.join(" or ")} API key in Settings as backup.`
      );
    }

    return { success: false, result: "", provider: "", errors };
  },
});

export const analyzeImageUrl = action({
  args: {
    imageUrl: v.string(),
    openaiKey: v.optional(v.string()),
    anthropicKey: v.optional(v.string()),
    geminiKey: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    result: v.string(),
    provider: v.string(),
    errors: v.array(v.string()),
  }),
  handler: async (_ctx, args) => {
    // Try to fetch the image as base64 for providers that need it
    let base64Data = "";
    let mimeType = "image/png";
    let fetchedImage = false;

    try {
      const resp = await fetch(args.imageUrl);
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        // Convert ArrayBuffer to base64 without Node's Buffer
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
        mimeType = resp.headers.get("content-type") || "image/png";
        fetchedImage = true;
      }
    } catch {
      // Will try OpenAI with URL directly
    }

    const providers: {
      name: string;
      fn: () => Promise<string>;
    }[] = [];

    if (args.openaiKey) {
      providers.push({
        name: "OpenAI GPT-4o",
        fn: () => callOpenAIUrl(args.imageUrl, args.openaiKey!),
      });
    }
    if (args.anthropicKey && fetchedImage) {
      providers.push({
        name: "Claude",
        fn: () => callAnthropic(base64Data, mimeType, args.anthropicKey!),
      });
    }
    if (args.geminiKey && fetchedImage) {
      providers.push({
        name: "Gemini",
        fn: () => callGemini(base64Data, mimeType, args.geminiKey!),
      });
    }

    if (providers.length === 0) {
      return {
        success: false,
        result: "",
        provider: "",
        errors: [
          "No usable providers. Add an API key in Settings, or ensure the image URL is accessible.",
        ],
      };
    }

    const errors: string[] = [];

    for (const provider of providers) {
      try {
        const raw = await provider.fn();
        if (raw.trim()) {
          let cleaned = raw.trim();
          cleaned = cleaned
            .replace(/^```[\w]*\n?/gm, "")
            .replace(/```$/gm, "")
            .trim();
          return {
            success: true,
            result: cleaned,
            provider: provider.name,
            errors,
          };
        }
        errors.push(`${provider.name}: returned empty result`);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : String(err);
        errors.push(cleanError(msg, provider.name));
      }
    }

    const configured = new Set(providers.map((p) => p.name));
    const missing: string[] = [];
    if (!configured.has("OpenAI GPT-4o")) missing.push("OpenAI");
    if (!configured.has("Claude")) missing.push("Anthropic");
    if (!configured.has("Gemini")) missing.push("Gemini");
    if (missing.length > 0) {
      errors.push(
        `Tip: add a ${missing.join(" or ")} API key in Settings as backup.`
      );
    }

    return { success: false, result: "", provider: "", errors };
  },
});
