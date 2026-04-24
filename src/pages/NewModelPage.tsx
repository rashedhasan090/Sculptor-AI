import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { useGuestUser } from "@/hooks/useGuestUser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowRight,
  Code2,
  FileJson,
  FileText,
  Sparkles,
  Database,
  Loader2,
  MessageSquareText,
  Upload,
  Link2,
  ImageIcon,
  FileUp,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Wand2,
  Settings,
  BrainCircuit,
} from "lucide-react";

/* ──────────────────────────── sample data ──────────────────────────── */

const SAMPLE_NATURAL = `An e-commerce system with Customer, Order, and Product entities.

Customer has customerID (integer), customerName (string), and email (string).
Order has orderID (integer), orderDate (string), and total (real).
Product has productID (integer), productName (string), and price (real).

ElectronicProduct extends Product with voltage (integer).
PhysicalProduct extends Product with weight (real).

A customer can place many orders.
An order contains many products.`;

const SAMPLE_ALLOY = `module ecommerce
open Declaration

one sig Customer extends Class{}{
attrSet = customerID
id=customerID
isAbstract = No
no parent
}
one sig customerID extends Integer{}

one sig Order extends Class{}{
attrSet = orderID
id=orderID
isAbstract = No
no parent
}
one sig orderID extends Integer{}

one sig CustomerOrderAssociation extends Association{}{
src = Customer
dst = Order
src_multiplicity = ONE
dst_multiplicity = MANY
}

one sig Product extends Class{}{
attrSet = productID+productName+price
id=productID
isAbstract = No
no parent
}
one sig productID extends Integer{}
one sig productName extends string{}
one sig price extends Real{}

one sig ElectronicProduct extends Class{}{
attrSet = size
one parent
id=productID
isAbstract = No
parent in Product
}
one sig size extends string{}

one sig PhysicalProduct extends Class{}{
attrSet = weight
one parent
id=productID
isAbstract = No
parent in Product
}
one sig weight extends Real{}

one sig ProductOrderAssociation extends Association{}{
src = Product
dst = Order
src_multiplicity = MANY
dst_multiplicity = MANY
}`;

const SAMPLE_JSON = `{
  "classes": [
    {
      "name": "Customer",
      "attributes": [
        {"name": "customerID", "type": "Integer"},
        {"name": "customerName", "type": "string"}
      ],
      "isAbstract": false,
      "primaryKey": "customerID"
    },
    {
      "name": "Order",
      "attributes": [
        {"name": "orderID", "type": "Integer"},
        {"name": "orderDate", "type": "string"},
        {"name": "total", "type": "Real"}
      ],
      "isAbstract": false,
      "primaryKey": "orderID"
    },
    {
      "name": "Product",
      "attributes": [
        {"name": "productID", "type": "Integer"},
        {"name": "productName", "type": "string"},
        {"name": "price", "type": "Real"}
      ],
      "isAbstract": false,
      "primaryKey": "productID"
    }
  ],
  "associations": [
    {
      "name": "CustomerOrderAssociation",
      "source": "Customer",
      "destination": "Order",
      "srcMultiplicity": "ONE",
      "dstMultiplicity": "MANY"
    },
    {
      "name": "OrderProductAssociation",
      "source": "Order",
      "destination": "Product",
      "srcMultiplicity": "MANY",
      "dstMultiplicity": "MANY"
    }
  ]
}`;

const SAMPLE_TEXT = `class Customer
- customerID: Integer
- customerName: String
- email: String

class Order
- orderID: Integer
- orderDate: String
- total: Real

class Product
- productID: Integer
- productName: String
- price: Real

class ElectronicProduct extends Product
- voltage: Integer

class PhysicalProduct extends Product
- weight: Real

association CustomerOrderAssociation: Customer -> Order (ONE to MANY)
association OrderProductAssociation: Order -> Product (MANY to MANY)`;

/* ──────────────────────── file‐type helpers ──────────────────────── */

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/gif"];
const TEXT_EXTS = [".txt", ".als", ".alloy"];
const JSON_EXTS = [".json"];

function detectFileFormat(name: string, content: string): "alloy" | "json" | "text" | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".json") || JSON_EXTS.some(e => lower.endsWith(e))) return "json";
  if (lower.endsWith(".als") || lower.endsWith(".alloy")) return "alloy";
  if (TEXT_EXTS.some(e => lower.endsWith(e))) return "text";
  const trimmed = content.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
  if (/^module\s/m.test(trimmed) || /one\s+sig\s+\w+\s+extends\s+(Class|Association)/m.test(trimmed)) return "alloy";
  if (/^class\s+\w+/m.test(trimmed) || /^association\s+\w+/m.test(trimmed)) return "text";
  return null;
}

/* ─────────────────── AI Vision parsing ─────────────────── */

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

async function analyzeImageWithOpenAI(base64Data: string, mimeType: string, apiKey: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: VISION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract all classes, attributes, types, inheritance, and associations from this UML class diagram. Output ONLY in the structured text format specified." },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Data}`, detail: "high" },
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
    throw new Error(err?.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function analyzeImageWithGemini(base64Data: string, mimeType: string, apiKey: string): Promise<string> {
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
              { text: "Extract all classes, attributes, types, inheritance, and associations from this UML class diagram. Output ONLY in the structured text format specified." },
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
    throw new Error(err?.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function analyzeImageWithAnthropic(base64Data: string, mimeType: string, apiKey: string): Promise<string> {
  const mediaType = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
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
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            { type: "text", text: "Extract all classes, attributes, types, inheritance, and associations from this UML class diagram. Output ONLY in the structured text format specified." },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

interface VisionProvider {
  name: string;
  key: string;
  fn: (b64: string, mime: string, key: string) => Promise<string>;
}

function getAvailableVisionProviders(): VisionProvider[] {
  const providers: VisionProvider[] = [];
  const openaiKey = localStorage.getItem("sculptor-openai-key");
  const geminiKey = localStorage.getItem("sculptor-gemini-key");
  const anthropicKey = localStorage.getItem("sculptor-anthropic-key");

  if (openaiKey) providers.push({ name: "OpenAI GPT-4o", key: openaiKey, fn: analyzeImageWithOpenAI });
  if (anthropicKey) providers.push({ name: "Claude", key: anthropicKey, fn: analyzeImageWithAnthropic });
  if (geminiKey) providers.push({ name: "Gemini", key: geminiKey, fn: analyzeImageWithGemini });

  return providers;
}

function cleanApiError(raw: string, providerName: string): string {
  // Extract the useful part of verbose API errors
  if (/quota/i.test(raw) || /rate.limit/i.test(raw) || /exceeded/i.test(raw)) {
    return `${providerName} quota/rate limit exceeded`;
  }
  if (/invalid.*key/i.test(raw) || /auth/i.test(raw) || /401/i.test(raw)) {
    return `${providerName} API key is invalid`;
  }
  if (/billing/i.test(raw) || /payment/i.test(raw)) {
    return `${providerName} billing issue — check your plan`;
  }
  // Truncate long errors
  const short = raw.length > 80 ? raw.slice(0, 80) + "…" : raw;
  return `${providerName}: ${short}`;
}

function suggestAlternateProviders(providers: VisionProvider[]): string {
  const configured = new Set(providers.map(p => p.name));
  const missing: string[] = [];
  if (!configured.has("OpenAI GPT-4o")) missing.push("OpenAI");
  if (!configured.has("Claude")) missing.push("Anthropic");
  if (!configured.has("Gemini")) missing.push("Gemini");
  if (missing.length > 0) {
    return ` Add a ${missing.join(" or ")} key in Settings as backup.`;
  }
  return " All configured providers failed — check your API keys.";
}

function extractBase64FromDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  return { mimeType: match[1], base64: match[2] };
}

/* ────────────────────────── live preview ────────────────────────── */

interface PreviewClass {
  name: string;
  attrs: number;
  parent?: string;
  isAbstract: boolean;
}
interface PreviewAssoc {
  src: string;
  dst: string;
  mult: string;
}

function quickPreview(
  inputType: string,
  rawInput: string
): { classes: PreviewClass[]; assocs: PreviewAssoc[] } | null {
  if (!rawInput.trim()) return null;
  try {
    if (inputType === "json") {
      const data = JSON.parse(rawInput);
      return {
        classes: (data.classes ?? []).map((c: { name: string; attributes?: unknown[]; parent?: string; isAbstract?: boolean }) => ({
          name: c.name,
          attrs: c.attributes?.length ?? 0,
          parent: c.parent,
          isAbstract: c.isAbstract ?? false,
        })),
        assocs: (data.associations ?? []).map((a: { source: string; destination: string; srcMultiplicity?: string; dstMultiplicity?: string }) => ({
          src: a.source,
          dst: a.destination,
          mult: `${a.srcMultiplicity ?? "ONE"}:${a.dstMultiplicity ?? "MANY"}`,
        })),
      };
    }

    // For text format — more precise parsing
    if (inputType === "text") {
      const classes: PreviewClass[] = [];
      const assocs: PreviewAssoc[] = [];
      let currentClass: PreviewClass | null = null;
      for (const line of rawInput.split("\n")) {
        const trimmed = line.trim();
        const classMatch = trimmed.match(/^(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/);
        if (classMatch) {
          if (currentClass) classes.push(currentClass);
          currentClass = {
            name: classMatch[1],
            attrs: 0,
            parent: classMatch[2],
            isAbstract: trimmed.startsWith("abstract"),
          };
          continue;
        }
        if (trimmed.startsWith("- ") && currentClass) {
          currentClass.attrs++;
          continue;
        }
        const assocMatch = trimmed.match(/^association\s+\w+:\s*(\w+)\s*->\s*(\w+)\s*\((\w+)\s+to\s+(\w+)\)/);
        if (assocMatch) {
          if (currentClass) { classes.push(currentClass); currentClass = null; }
          assocs.push({ src: assocMatch[1], dst: assocMatch[2], mult: `${assocMatch[3]}:${assocMatch[4]}` });
        }
      }
      if (currentClass) classes.push(currentClass);
      if (classes.length > 0) return { classes, assocs };
    }

    // For alloy / natural: count keywords
    const classMatches = rawInput.match(/(?:class\s+|one\s+sig\s+)(\w+)/gi) ?? [];
    const assocMatches = rawInput.match(/(?:association|Association|has\s+many|many-to-many|one-to-many|belongs?\s+to|contains?\s+many)/gi) ?? [];
    if (classMatches.length === 0 && inputType !== "natural") return null;

    // For natural language, try to count entity-like capitalized words
    if (inputType === "natural") {
      const caps = new Set<string>();
      const words = rawInput.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
      for (const w of words) {
        if (!["The", "This", "That", "Each", "Every", "Has", "Have", "Can", "One", "Many", "With", "And", "For"].includes(w)) {
          caps.add(w);
        }
      }
      return {
        classes: Array.from(caps).map(n => ({ name: n, attrs: 0, isAbstract: false })),
        assocs: assocMatches.map(() => ({ src: "?", dst: "?", mult: "?" })),
      };
    }
    return {
      classes: classMatches.map(m => {
        const n = m.replace(/class\s+|one\s+sig\s+/i, "").trim();
        return { name: n, attrs: 0, isAbstract: false };
      }),
      assocs: assocMatches.map(() => ({ src: "?", dst: "?", mult: "?" })),
    };
  } catch {
    return null;
  }
}

/* ────────────────────────── component ────────────────────────── */

export function NewModelPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inputTab, setInputTab] = useState<string>("describe");
  const [rawInput, setRawInput] = useState(SAMPLE_NATURAL);
  const [effectiveType, setEffectiveType] = useState<string>("natural");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [imageDescription, setImageDescription] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL state
  const [modelUrl, setModelUrl] = useState("");
  const [urlPreview, setUrlPreview] = useState<string | null>(null);
  const [urlContent, setUrlContent] = useState<string>("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlIsImage, setUrlIsImage] = useState(false);

  // AI Vision state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProvider, setAnalysisProvider] = useState<string>("");
  const [visionExtracted, setVisionExtracted] = useState(false);
  const [analysisError, setAnalysisError] = useState<string>("");

  const createModel = useMutation(api.objectModels.createModel);
  const navigate = useNavigate();
  const { guestUserId } = useGuestUser();

  /* ── tab switching ── */
  const handleTabChange = (tab: string) => {
    setInputTab(tab);
    setVisionExtracted(false);
    if (tab === "describe") {
      setRawInput(SAMPLE_NATURAL);
      setEffectiveType("natural");
    } else if (tab === "alloy") {
      setRawInput(SAMPLE_ALLOY);
      setEffectiveType("alloy");
    } else if (tab === "json") {
      setRawInput(SAMPLE_JSON);
      setEffectiveType("json");
    } else if (tab === "text") {
      setRawInput(SAMPLE_TEXT);
      setEffectiveType("text");
    } else if (tab === "upload") {
      setEffectiveType("natural");
    } else if (tab === "url") {
      setEffectiveType("natural");
    }
  };

  /* ── AI Vision analysis ── */
  const handleAnalyzeImage = async (imageDataUrl: string) => {
    const providers = getAvailableVisionProviders();
    if (providers.length === 0) {
      toast.error("No AI API key found. Add an OpenAI, Anthropic, or Gemini key in Settings to analyze images.", { duration: 6000 });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");
    const failedProviders: string[] = [];

    for (const provider of providers) {
      try {
        setAnalysisProvider(provider.name);
        const { base64, mimeType } = extractBase64FromDataUrl(imageDataUrl);
        const result = await provider.fn(base64, mimeType, provider.key);

        if (result.trim()) {
          let cleaned = result.trim();
          cleaned = cleaned.replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim();

          setRawInput(cleaned);
          setEffectiveType("text");
          setImageDescription(cleaned);
          setVisionExtracted(true);
          setAnalysisError("");
          toast.success(`Class diagram analyzed with ${provider.name}!`, { duration: 4000 });
          setIsAnalyzing(false);
          setAnalysisProvider("");
          return;
        }
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        failedProviders.push(cleanApiError(rawMsg, provider.name));
        console.warn(`Vision analysis failed with ${provider.name}:`, rawMsg);
        continue;
      }
    }

    setIsAnalyzing(false);
    setAnalysisProvider("");
    const errSummary = failedProviders.join(". ") + "." + suggestAlternateProviders(providers);
    setAnalysisError(errSummary);
    toast.error("AI analysis failed — see details below. You can still describe the model manually.", { duration: 5000 });
  };

  const handleAnalyzeUrlImage = async (imageUrl: string) => {
    const providers = getAvailableVisionProviders();
    if (providers.length === 0) {
      toast.error("No AI API key found. Add an OpenAI, Anthropic, or Gemini key in Settings.", { duration: 6000 });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");
    const failedProviders: string[] = [];

    for (const provider of providers) {
      try {
        setAnalysisProvider(provider.name);

        // For OpenAI, we can pass the URL directly
        if (provider.name === "OpenAI GPT-4o") {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${provider.key}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: [
                { role: "system", content: VISION_SYSTEM_PROMPT },
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Extract all classes, attributes, types, inheritance, and associations from this UML class diagram. Output ONLY in the structured text format specified." },
                    { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
                  ],
                },
              ],
              max_tokens: 4096,
              temperature: 0.1,
            }),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err?.error?.message || `API error: ${response.status}`);
          }

          const data = await response.json();
          const result = data.choices?.[0]?.message?.content ?? "";
          if (result.trim()) {
            let cleaned = result.trim().replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim();
            setRawInput(cleaned);
            setEffectiveType("text");
            setImageDescription(cleaned);
            setVisionExtracted(true);
            setAnalysisError("");
            toast.success(`Class diagram analyzed with ${provider.name}!`);
            setIsAnalyzing(false);
            setAnalysisProvider("");
            return;
          }
        }

        // For other providers, try fetching the image as base64
        try {
          const resp = await fetch(imageUrl);
          if (resp.ok) {
            const blob = await resp.blob();
            const reader = new FileReader();
            const dataUrl = await new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            const { base64, mimeType } = extractBase64FromDataUrl(dataUrl);
            const result = await provider.fn(base64, mimeType, provider.key);
            if (result.trim()) {
              let cleaned = result.trim().replace(/^```[\w]*\n?/gm, "").replace(/```$/gm, "").trim();
              setRawInput(cleaned);
              setEffectiveType("text");
              setImageDescription(cleaned);
              setVisionExtracted(true);
              setAnalysisError("");
              toast.success(`Class diagram analyzed with ${provider.name}!`);
              setIsAnalyzing(false);
              setAnalysisProvider("");
              return;
            }
          }
        } catch {
          throw new Error("Could not fetch image for analysis");
        }
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        failedProviders.push(cleanApiError(rawMsg, provider.name));
        console.warn(`Vision analysis failed with ${provider.name}:`, rawMsg);
        continue;
      }
    }

    setIsAnalyzing(false);
    setAnalysisProvider("");
    const errSummary = failedProviders.join(". ") + "." + suggestAlternateProviders(providers);
    setAnalysisError(errSummary);
    toast.error("AI analysis failed — see details below. You can still describe the model manually.", { duration: 5000 });
  };

  /* ── file upload handling ── */
  const processFile = useCallback(
    (file: File) => {
      const isImage = IMAGE_TYPES.includes(file.type) || /\.(png|jpe?g|svg|webp|gif)$/i.test(file.name);

      if (isImage) {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedImage(reader.result as string);
          setUploadedFileName(file.name);
          setEffectiveType("natural");
          setVisionExtracted(false);
          setImageDescription("");
        };
        reader.readAsDataURL(file);
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          const format = detectFileFormat(file.name, content);
          setUploadedFileName(file.name);
          setUploadedImage(null);
          if (format) {
            setRawInput(content);
            setEffectiveType(format);
            setInputTab(format);
            toast.success(`Detected ${format.toUpperCase()} format — loaded into editor`);
          } else {
            setRawInput(content);
            setEffectiveType("text");
            setInputTab("text");
            toast.info("Loaded file content — using text format");
          }
        };
        reader.readAsText(file);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  /* ── URL fetching ── */
  const handleFetchUrl = async () => {
    if (!modelUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    setIsFetchingUrl(true);
    try {
      const isImg = /\.(png|jpe?g|svg|webp|gif|bmp)(\?.*)?$/i.test(modelUrl);
      if (isImg) {
        setUrlPreview(modelUrl);
        setUrlIsImage(true);
        setUrlContent("");
        setEffectiveType("natural");
        setVisionExtracted(false);
        setImageDescription("");
        toast.success("Image URL detected — click Analyze to extract the class diagram");
      } else {
        const resp = await fetch(modelUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        const urlName = modelUrl.split("/").pop() ?? "model";
        const format = detectFileFormat(urlName, text);
        setUrlContent(text);
        setUrlIsImage(false);
        setUrlPreview(null);
        if (format) {
          setRawInput(text);
          setEffectiveType(format);
          toast.success(`Detected ${format.toUpperCase()} format from URL`);
        } else {
          setRawInput(text);
          setEffectiveType("text");
          toast.info("Content loaded — using text format");
        }
      }
    } catch {
      toast.error("Could not fetch URL. For cross-origin URLs, try downloading the file and using Upload instead.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a model name");
      return;
    }

    let submitInput = rawInput;
    let submitType = effectiveType;

    // If on upload/url tab with image and vision extracted the text format
    if (inputTab === "upload" && uploadedImage && visionExtracted) {
      submitInput = rawInput; // Already set by vision analysis
      submitType = "text";
    } else if (inputTab === "upload" && uploadedImage && !visionExtracted) {
      // Manual description fallback
      if (!imageDescription.trim()) {
        toast.error("Please analyze the image with AI or describe the object model manually");
        return;
      }
      submitInput = imageDescription;
      submitType = "natural";
    } else if (inputTab === "url" && urlIsImage && visionExtracted) {
      submitInput = rawInput;
      submitType = "text";
    } else if (inputTab === "url" && urlIsImage && !visionExtracted) {
      if (!imageDescription.trim()) {
        toast.error("Please analyze the image with AI or describe the object model manually");
        return;
      }
      submitInput = imageDescription;
      submitType = "natural";
    }

    if (!submitInput.trim()) {
      toast.error("Please enter an object model");
      return;
    }

    setIsSubmitting(true);
    try {
      const modelId = await createModel({
        name: name.trim(),
        description: description.trim() || undefined,
        inputType: submitType,
        rawInput: submitInput.trim(),
        ...(guestUserId ? { guestUserId } : {}),
      });
      toast.success("Object model created successfully!");
      navigate(`/analysis/${modelId}`);
    } catch {
      toast.error("Failed to create model");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ── live preview ── */
  const previewInput = (inputTab === "upload" && uploadedImage && !visionExtracted) ? imageDescription :
                       (inputTab === "url" && urlIsImage && !visionExtracted) ? imageDescription : rawInput;
  const previewType = visionExtracted ? "text" : effectiveType;
  const preview = quickPreview(previewType, previewInput);

  const hasAnyKey = getAvailableVisionProviders().length > 0;

  /* ──────────────────── render ──────────────────── */
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Database className="size-6 text-emerald-500" />
          New Analysis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define your object model in any format — natural language, image, URL, Alloy, JSON, or structured text
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ═══════ Main input area ═══════ */}
        <div className="lg:col-span-2 space-y-6">
          {/* Name + Description */}
          <Card>
            <CardContent className="p-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Model Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., E-Commerce System"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Optional description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Input format tabs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-500" />
                Object Model Input
              </CardTitle>
              <CardDescription>
                Choose any input method — all formats are parsed into the same structured model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={inputTab} onValueChange={handleTabChange}>
                <TabsList className="grid grid-cols-6 w-full h-auto">
                  <TabsTrigger value="describe" className="gap-1 text-xs px-1.5 py-2">
                    <MessageSquareText className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">Describe</span>
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="gap-1 text-xs px-1.5 py-2">
                    <Upload className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">Upload</span>
                  </TabsTrigger>
                  <TabsTrigger value="url" className="gap-1 text-xs px-1.5 py-2">
                    <Link2 className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">URL</span>
                  </TabsTrigger>
                  <TabsTrigger value="alloy" className="gap-1 text-xs px-1.5 py-2">
                    <Code2 className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">Alloy</span>
                  </TabsTrigger>
                  <TabsTrigger value="json" className="gap-1 text-xs px-1.5 py-2">
                    <FileJson className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">JSON</span>
                  </TabsTrigger>
                  <TabsTrigger value="text" className="gap-1 text-xs px-1.5 py-2">
                    <FileText className="size-3.5 shrink-0" />
                    <span className="hidden sm:inline">Text</span>
                  </TabsTrigger>
                </TabsList>

                {/* ─── Describe Tab ─── */}
                <TabsContent value="describe" className="space-y-3">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 text-xs text-muted-foreground">
                    <p className="font-medium text-emerald-400 mb-1.5">💡 Describe your model in plain English</p>
                    <p>
                      Mention entities (classes), their attributes with types, and relationships.
                      For example: <em>"Customer has customerID (integer), name (string). A customer has many orders."</em>
                    </p>
                  </div>
                  <Textarea
                    value={rawInput}
                    onChange={e => setRawInput(e.target.value)}
                    className="min-h-[360px] leading-relaxed text-sm"
                    placeholder={`Describe your database model in natural language...\n\nExample:\nAn e-commerce system with customers, orders, and products.\nCustomers have customerID (integer), name (string), email (string).\nA customer can place many orders.\nAn order contains many products.`}
                  />
                </TabsContent>

                {/* ─── Upload Tab ─── */}
                <TabsContent value="upload" className="space-y-4">
                  {!uploadedImage && !uploadedFileName && (
                    <div
                      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`
                        border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
                        transition-all duration-200 min-h-[280px] flex flex-col items-center justify-center gap-3
                        ${isDragging
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-muted-foreground/25 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                        }
                      `}
                    >
                      <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                        <FileUp className="size-7 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Drop your file here or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports images (PNG, JPG, SVG), documents (PDF), and model files (JSON, TXT, Alloy)
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                        {["PNG", "JPG", "SVG", "JSON", "TXT", "Alloy", "PDF"].map(ext => (
                          <Badge key={ext} variant="outline" className="text-[10px] px-1.5 py-0">
                            .{ext.toLowerCase()}
                          </Badge>
                        ))}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".png,.jpg,.jpeg,.svg,.webp,.gif,.json,.txt,.als,.alloy,.pdf"
                        onChange={handleFileSelect}
                      />
                    </div>
                  )}

                  {/* Image preview */}
                  {uploadedImage && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="size-4 text-emerald-500" />
                          <span className="text-sm font-medium">{uploadedFileName}</span>
                          <Badge variant="outline" className="text-[10px]">Image</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setUploadedImage(null);
                            setUploadedFileName("");
                            setImageDescription("");
                            setVisionExtracted(false);
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                      <div className="rounded-lg border overflow-hidden bg-black/20 max-h-[300px] flex items-center justify-center">
                        <img
                          src={uploadedImage}
                          alt="Uploaded model"
                          className="max-h-[300px] object-contain"
                        />
                      </div>

                      {/* AI Analyze button */}
                      {!visionExtracted && (
                        <div className="space-y-2">
                          <Button
                            onClick={() => { setAnalysisError(""); handleAnalyzeImage(uploadedImage); }}
                            disabled={isAnalyzing}
                            className="w-full bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-700 hover:to-emerald-700 h-11"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Analyzing with {analysisProvider}...
                              </>
                            ) : (
                              <>
                                <BrainCircuit className="size-4 mr-2" />
                                {analysisError ? "Retry Analysis" : "Analyze Class Diagram with AI"}
                                <Wand2 className="size-4 ml-2" />
                              </>
                            )}
                          </Button>
                          {analysisError && (
                            <div className="flex items-start gap-2 text-xs text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                              <span>{analysisError}</span>
                            </div>
                          )}
                          {!hasAnyKey && !analysisError && (
                            <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                              <Settings className="size-3.5 mt-0.5 shrink-0" />
                              <span>
                                Add an OpenAI, Anthropic, or Gemini API key in{" "}
                                <a href="/settings" className="underline font-medium">Settings</a>{" "}
                                to enable AI image analysis. You can also describe the model manually below.
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Vision extracted result */}
                      {visionExtracted && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            <span>
                              <strong>AI extracted the class diagram!</strong> Review and edit the parsed model below.
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto text-xs"
                              onClick={() => { setVisionExtracted(false); setImageDescription(""); }}
                            >
                              Re-analyze
                            </Button>
                          </div>
                          <Textarea
                            value={rawInput}
                            onChange={e => setRawInput(e.target.value)}
                            className="font-mono text-xs min-h-[240px] leading-relaxed"
                          />
                        </div>
                      )}

                      {/* Manual description fallback */}
                      {!visionExtracted && (
                        <div>
                          <Label className="text-xs flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                            <Eye className="size-3.5" />
                            Or describe the model manually
                          </Label>
                          <Textarea
                            value={imageDescription}
                            onChange={e => setImageDescription(e.target.value)}
                            className="min-h-[120px] text-sm leading-relaxed"
                            placeholder={`Describe the classes, attributes, and relationships you see...\n\nExample: Customer has name (string), email (string). Order has orderID (integer), total (real). A customer has many orders.`}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text file loaded */}
                  {uploadedFileName && !uploadedImage && (
                    <div className="flex items-center gap-2 text-sm bg-emerald-500/10 rounded-lg p-3">
                      <CheckCircle2 className="size-4 text-emerald-500" />
                      <span>
                        <strong>{uploadedFileName}</strong> loaded as{" "}
                        <Badge variant="outline" className="text-xs mx-1">{effectiveType}</Badge>
                        format — edit below if needed
                      </span>
                    </div>
                  )}
                </TabsContent>

                {/* ─── URL Tab ─── */}
                <TabsContent value="url" className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={modelUrl}
                      onChange={e => setModelUrl(e.target.value)}
                      placeholder="https://raw.githubusercontent.com/user/repo/main/model.json"
                      className="flex-1 font-mono text-xs"
                    />
                    <Button
                      onClick={handleFetchUrl}
                      disabled={isFetchingUrl}
                      variant="outline"
                      className="shrink-0"
                    >
                      {isFetchingUrl ? (
                        <Loader2 className="size-4 animate-spin mr-1.5" />
                      ) : (
                        <Link2 className="size-4 mr-1.5" />
                      )}
                      Fetch
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                    <span>
                      Supports GitHub raw URLs, direct file links, and image URLs.
                      For cross-origin protected URLs, download the file and use Upload instead.
                    </span>
                  </div>

                  {/* URL image preview */}
                  {urlPreview && urlIsImage && (
                    <div className="space-y-3">
                      <div className="rounded-lg border overflow-hidden bg-black/20 max-h-[300px] flex items-center justify-center">
                        <img
                          src={urlPreview}
                          alt="Model from URL"
                          className="max-h-[300px] object-contain"
                          onError={() => {
                            toast.error("Could not load image from URL");
                            setUrlPreview(null);
                            setUrlIsImage(false);
                          }}
                        />
                      </div>

                      {/* AI Analyze button */}
                      {!visionExtracted && (
                        <div className="space-y-2">
                          <Button
                            onClick={() => { setAnalysisError(""); handleAnalyzeUrlImage(urlPreview); }}
                            disabled={isAnalyzing}
                            className="w-full bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-700 hover:to-emerald-700 h-11"
                          >
                            {isAnalyzing ? (
                              <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Analyzing with {analysisProvider}...
                              </>
                            ) : (
                              <>
                                <BrainCircuit className="size-4 mr-2" />
                                {analysisError ? "Retry Analysis" : "Analyze Class Diagram with AI"}
                                <Wand2 className="size-4 ml-2" />
                              </>
                            )}
                          </Button>
                          {analysisError && (
                            <div className="flex items-start gap-2 text-xs text-red-400/90 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
                              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                              <span>{analysisError}</span>
                            </div>
                          )}
                          {!hasAnyKey && !analysisError && (
                            <div className="flex items-start gap-2 text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                              <Settings className="size-3.5 mt-0.5 shrink-0" />
                              <span>
                                Add an API key in{" "}
                                <a href="/settings" className="underline font-medium">Settings</a>{" "}
                                to enable AI image analysis.
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Vision extracted */}
                      {visionExtracted && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                            <span><strong>AI extracted the class diagram!</strong> Review and edit below.</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto text-xs"
                              onClick={() => { setVisionExtracted(false); setImageDescription(""); }}
                            >
                              Re-analyze
                            </Button>
                          </div>
                          <Textarea
                            value={rawInput}
                            onChange={e => setRawInput(e.target.value)}
                            className="font-mono text-xs min-h-[240px] leading-relaxed"
                          />
                        </div>
                      )}

                      {/* Manual fallback */}
                      {!visionExtracted && (
                        <div>
                          <Label className="text-xs flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                            <Eye className="size-3.5" />
                            Or describe the model manually
                          </Label>
                          <Textarea
                            value={imageDescription}
                            onChange={e => setImageDescription(e.target.value)}
                            className="min-h-[120px] text-sm leading-relaxed"
                            placeholder="Describe the classes, attributes, and relationships you see..."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* URL text content loaded */}
                  {urlContent && !urlIsImage && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm bg-emerald-500/10 rounded-lg p-3">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                        <span>
                          Content loaded as{" "}
                          <Badge variant="outline" className="text-xs mx-1">{effectiveType}</Badge>
                          format — switch to the{" "}
                          <button
                            className="text-emerald-400 underline"
                            onClick={() => setInputTab(effectiveType)}
                          >
                            {effectiveType}
                          </button>{" "}
                          tab to review
                        </span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* ─── Alloy Tab ─── */}
                <TabsContent value="alloy">
                  <Textarea
                    value={rawInput}
                    onChange={e => setRawInput(e.target.value)}
                    className="font-mono text-xs min-h-[400px] leading-relaxed"
                    placeholder="Paste your Alloy object model here..."
                  />
                </TabsContent>

                {/* ─── JSON Tab ─── */}
                <TabsContent value="json">
                  <Textarea
                    value={rawInput}
                    onChange={e => setRawInput(e.target.value)}
                    className="font-mono text-xs min-h-[400px] leading-relaxed"
                    placeholder="Paste your JSON object model here..."
                  />
                </TabsContent>

                {/* ─── Text Tab ─── */}
                <TabsContent value="text">
                  <Textarea
                    value={rawInput}
                    onChange={e => setRawInput(e.target.value)}
                    className="font-mono text-xs min-h-[400px] leading-relaxed"
                    placeholder="Define classes and associations in plain text..."
                  />
                </TabsContent>
              </Tabs>

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-11 mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="size-4 mr-2" />
                )}
                Parse & Continue to Analysis
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ═══════ Sidebar ═══════ */}
        <div className="space-y-4">
          {/* Live Preview */}
          {preview && preview.classes.length > 0 && (
            <Card className="border-emerald-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="size-4 text-emerald-500" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div>
                  <p className="text-muted-foreground mb-1">
                    Detected {preview.classes.length} entit{preview.classes.length === 1 ? "y" : "ies"}
                    {preview.assocs.length > 0 && `, ${preview.assocs.length} relationship${preview.assocs.length === 1 ? "" : "s"}`}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.classes.map(c => (
                      <Badge
                        key={c.name}
                        variant="outline"
                        className={`text-[10px] ${c.isAbstract ? "border-amber-500/50 text-amber-400" : "border-emerald-500/50 text-emerald-400"}`}
                      >
                        {c.isAbstract && "⟐ "}
                        {c.name}
                        {c.attrs > 0 && ` (${c.attrs})`}
                        {c.parent && ` → ${c.parent}`}
                      </Badge>
                    ))}
                  </div>
                </div>
                {preview.assocs.length > 0 && (
                  <div className="pt-1 border-t border-border/50">
                    {preview.assocs.map((a, i) => (
                      <div key={i} className="text-[10px] text-muted-foreground">
                        {a.src} → {a.dst} <span className="text-emerald-400">({a.mult})</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* AI Vision Info */}
          <Card className="border-violet-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BrainCircuit className="size-4 text-violet-400" />
                AI Vision Parsing
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>
                Upload a <strong>UML class diagram</strong> image and click <em>Analyze</em> to
                automatically extract classes, attributes, types, inheritance, and associations.
              </p>
              <p>Supports GPT-4o, Claude, and Gemini vision models.</p>
              {hasAnyKey ? (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>API key configured</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-400">
                  <AlertCircle className="size-3.5" />
                  <span>
                    No API key — <a href="/settings" className="underline">add one in Settings</a>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Format Guide */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Input Format Guide</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-3">
              <div>
                <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                  <MessageSquareText className="size-3" /> Natural Language
                </p>
                <p>
                  Describe entities, attributes, and relationships in plain English.
                  Mention types in parentheses: <code>name (string)</code>
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                  <Upload className="size-3" /> Image / File Upload
                </p>
                <p>Upload UML class diagrams — AI extracts the model automatically. Also accepts JSON, TXT, and Alloy files.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                  <Code2 className="size-3" /> Alloy Format
                </p>
                <p>
                  Formal Alloy specification with <code>Class</code> and <code>Association</code> signatures.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                  <FileJson className="size-3" /> JSON Format
                </p>
                <p>
                  Structured JSON with <code>classes</code> and <code>associations</code> arrays.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1 flex items-center gap-1.5">
                  <FileText className="size-3" /> Structured Text
                </p>
                <p>
                  <code>class Name</code>, attributes as <code>- name: type</code>,
                  associations as <code>association Name: Src → Dst</code>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Supported Types */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Supported Types</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1.5">
              <div className="flex justify-between">
                <span>Integer / Int</span>
                <span className="font-mono">int</span>
              </div>
              <div className="flex justify-between">
                <span>String / string</span>
                <span className="font-mono">varchar(64)</span>
              </div>
              <div className="flex justify-between">
                <span>Real / Float</span>
                <span className="font-mono">decimal(20,5)</span>
              </div>
              <div className="flex justify-between">
                <span>Bool / Boolean</span>
                <span className="font-mono">boolean</span>
              </div>
            </CardContent>
          </Card>

          {/* Strategies */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ORM Strategies</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Inheritance</p>
              <ul className="space-y-1 pl-3 list-disc">
                <li>
                  <b>UnionSubclass</b> — Independent tables
                </li>
                <li>
                  <b>JoinedSubclass</b> — Normalized with FK joins
                </li>
                <li>
                  <b>UnionSuperclass</b> — Single table + discriminator
                </li>
              </ul>
              <p className="font-medium text-foreground mt-2">Association</p>
              <ul className="space-y-1 pl-3 list-disc">
                <li>
                  <b>ForeignKeyEmbedding</b> — Direct FK
                </li>
                <li>
                  <b>OwnAssociationTable</b> — Junction table
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
