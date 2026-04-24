import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowRight, Code2, FileJson, FileText, Sparkles, Database, Loader2 } from "lucide-react";

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

export function NewModelPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inputType, setInputType] = useState<"alloy" | "json" | "text">("alloy");
  const [rawInput, setRawInput] = useState(SAMPLE_ALLOY);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createModel = useMutation(api.objectModels.createModel);
  const navigate = useNavigate();

  const handleTabChange = (tab: string) => {
    setInputType(tab as "alloy" | "json" | "text");
    if (tab === "alloy" && rawInput === SAMPLE_JSON || rawInput === SAMPLE_TEXT) setRawInput(SAMPLE_ALLOY);
    if (tab === "json" && rawInput === SAMPLE_ALLOY || rawInput === SAMPLE_TEXT) setRawInput(SAMPLE_JSON);
    if (tab === "text" && rawInput === SAMPLE_ALLOY || rawInput === SAMPLE_JSON) setRawInput(SAMPLE_TEXT);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a model name");
      return;
    }
    if (!rawInput.trim()) {
      toast.error("Please enter an object model");
      return;
    }

    setIsSubmitting(true);
    try {
      const modelId = await createModel({
        name: name.trim(),
        description: description.trim() || undefined,
        inputType,
        rawInput: rawInput.trim(),
      });
      toast.success("Object model created successfully!");
      navigate(`/analysis/${modelId}`);
    } catch (err) {
      toast.error("Failed to create model");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define your object model to generate Pareto-optimal database designs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="size-5 text-emerald-500" />
                Object Model Definition
              </CardTitle>
              <CardDescription>
                Enter your domain model using any supported format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

              <div>
                <Label>Input Format</Label>
                <Tabs value={inputType} onValueChange={handleTabChange} className="mt-1.5">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="alloy" className="gap-1.5">
                      <Code2 className="size-3.5" /> Alloy
                    </TabsTrigger>
                    <TabsTrigger value="json" className="gap-1.5">
                      <FileJson className="size-3.5" /> JSON
                    </TabsTrigger>
                    <TabsTrigger value="text" className="gap-1.5">
                      <FileText className="size-3.5" /> Text
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="alloy">
                    <Textarea
                      value={rawInput}
                      onChange={e => setRawInput(e.target.value)}
                      className="font-mono text-xs min-h-[400px] leading-relaxed"
                      placeholder="Paste your Alloy object model here..."
                    />
                  </TabsContent>
                  <TabsContent value="json">
                    <Textarea
                      value={rawInput}
                      onChange={e => setRawInput(e.target.value)}
                      className="font-mono text-xs min-h-[400px] leading-relaxed"
                      placeholder="Paste your JSON object model here..."
                    />
                  </TabsContent>
                  <TabsContent value="text">
                    <Textarea
                      value={rawInput}
                      onChange={e => setRawInput(e.target.value)}
                      className="font-mono text-xs min-h-[400px] leading-relaxed"
                      placeholder="Define classes and associations in plain text..."
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 h-11"
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

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Format Guide</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-3">
              <div>
                <p className="font-medium text-foreground mb-1">Alloy Format</p>
                <p>Use the Alloy specification language with <code>Class</code> and <code>Association</code> signatures as used in the research papers.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">JSON Format</p>
                <p>Structured JSON with <code>classes</code> and <code>associations</code> arrays. Each class has name, attributes, isAbstract, parent, primaryKey.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Text Format</p>
                <p>Simple text with <code>class Name</code>, attributes as <code>- name: type</code>, and associations as <code>association Name: Src → Dst</code>.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Supported Types</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1.5">
              <div className="flex justify-between"><span>Integer / Int</span><span className="font-mono">int</span></div>
              <div className="flex justify-between"><span>String / string</span><span className="font-mono">varchar(64)</span></div>
              <div className="flex justify-between"><span>Real / Float</span><span className="font-mono">decimal(20,5)</span></div>
              <div className="flex justify-between"><span>Bool / Boolean</span><span className="font-mono">boolean</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Strategies</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Inheritance</p>
              <ul className="space-y-1 pl-3 list-disc">
                <li><b>UnionSubclass</b> — Independent tables, all inherited attrs duplicated</li>
                <li><b>JoinedSubclass</b> — Normalized parent-child with FK joins</li>
                <li><b>UnionSuperclass</b> — Single consolidated table with discriminator</li>
              </ul>
              <p className="font-medium text-foreground mt-2">Association</p>
              <ul className="space-y-1 pl-3 list-disc">
                <li><b>ForeignKeyEmbedding</b> — Direct FK in destination table</li>
                <li><b>OwnAssociationTable</b> — Dedicated junction table</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
