"use client";

import { useState, useMemo } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GitCompareArrows, Plus, Minus, PenLine, Download, FileEdit, Loader2 } from "lucide-react";

interface Deployment {
  _id: string;
  _creationTime: number;
  name: string;
  url: string;
  deployKey: string;
  environment: "dev" | "prod" | "staging";
  status: "connected" | "error" | "pending";
  lastChecked?: number;
  errorMessage?: string;
}

interface SchemaTable {
  name: string;
  indexes: string[];
  fields: Record<string, string>;
}

interface ParsedSchema {
  tables: SchemaTable[];
  functions: string[];
}

interface DiffItem {
  name: string;
  status: "added" | "removed" | "changed" | "unchanged";
  details?: string;
}

function parseSchemaJson(raw: string): ParsedSchema {
  try {
    const data = JSON.parse(raw) as {
      tables?: Array<{ name: string; indexes?: string[]; fields?: Record<string, string> }>;
      functions?: string[];
    };
    return {
      tables: (data.tables ?? []).map((t) => ({
        name: t.name,
        indexes: t.indexes ?? [],
        fields: t.fields ?? {},
      })),
      functions: data.functions ?? [],
    };
  } catch {
    return { tables: [], functions: [] };
  }
}

function computeDiff(left: ParsedSchema, right: ParsedSchema): {
  tables: DiffItem[];
  indexes: DiffItem[];
  functions: DiffItem[];
} {
  const leftTableNames = new Set(left.tables.map((t) => t.name));
  const rightTableNames = new Set(right.tables.map((t) => t.name));

  const tables: DiffItem[] = [];
  const indexes: DiffItem[] = [];

  for (const table of right.tables) {
    if (!leftTableNames.has(table.name)) {
      tables.push({ name: table.name, status: "added" });
      for (const idx of table.indexes) {
        indexes.push({ name: `${table.name}.${idx}`, status: "added" });
      }
    }
  }

  for (const table of left.tables) {
    if (!rightTableNames.has(table.name)) {
      tables.push({ name: table.name, status: "removed" });
      for (const idx of table.indexes) {
        indexes.push({ name: `${table.name}.${idx}`, status: "removed" });
      }
    }
  }

  for (const leftTable of left.tables) {
    const rightTable = right.tables.find((t) => t.name === leftTable.name);
    if (!rightTable) continue;

    const leftFields = JSON.stringify(leftTable.fields);
    const rightFields = JSON.stringify(rightTable.fields);

    if (leftFields !== rightFields) {
      tables.push({
        name: leftTable.name,
        status: "changed",
        details: "Fields changed",
      });
    } else {
      tables.push({ name: leftTable.name, status: "unchanged" });
    }

    const leftIndexSet = new Set(leftTable.indexes);
    const rightIndexSet = new Set(rightTable.indexes);

    for (const idx of rightTable.indexes) {
      if (!leftIndexSet.has(idx)) {
        indexes.push({ name: `${leftTable.name}.${idx}`, status: "added" });
      } else {
        indexes.push({ name: `${leftTable.name}.${idx}`, status: "unchanged" });
      }
    }
    for (const idx of leftTable.indexes) {
      if (!rightIndexSet.has(idx)) {
        indexes.push({ name: `${leftTable.name}.${idx}`, status: "removed" });
      }
    }
  }

  const leftFnSet = new Set(left.functions);
  const rightFnSet = new Set(right.functions);
  const functions: DiffItem[] = [];

  for (const fn of right.functions) {
    if (!leftFnSet.has(fn)) {
      functions.push({ name: fn, status: "added" });
    } else {
      functions.push({ name: fn, status: "unchanged" });
    }
  }
  for (const fn of left.functions) {
    if (!rightFnSet.has(fn)) {
      functions.push({ name: fn, status: "removed" });
    }
  }

  return { tables, indexes, functions };
}

function StatusIcon({ status }: { status: DiffItem["status"] }) {
  switch (status) {
    case "added":
      return <Plus className="h-3.5 w-3.5 text-green-500" />;
    case "removed":
      return <Minus className="h-3.5 w-3.5 text-red-500" />;
    case "changed":
      return <PenLine className="h-3.5 w-3.5 text-yellow-500" />;
    default:
      return null;
  }
}

function statusBg(status: DiffItem["status"]): string {
  switch (status) {
    case "added":
      return "bg-green-500/5 border-l-2 border-l-green-500";
    case "removed":
      return "bg-red-500/5 border-l-2 border-l-red-500";
    case "changed":
      return "bg-yellow-500/5 border-l-2 border-l-yellow-500";
    default:
      return "";
  }
}

function DiffSection({ title, items }: { title: string; items: DiffItem[] }) {
  const changed = items.filter((i) => i.status !== "unchanged");
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {title}
          {changed.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {changed.length} change{changed.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 pb-4">
            No items to compare
          </p>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div
                key={item.name}
                className={`flex items-center gap-3 px-4 py-2.5 ${statusBg(item.status)}`}
              >
                <StatusIcon status={item.status} />
                <span className="text-sm font-mono">{item.name}</span>
                {item.details && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {item.details}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SchemaDiffPage() {
  const deployments = useQuery(api.deployments.list);
  const fetchSchemaAction = useAction(api.deploymentApi.fetchSchema);
  const upsertSchema = useMutation(api.schemas.upsert);

  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [manualInputOpen, setManualInputOpen] = useState(false);
  const [manualInputTarget, setManualInputTarget] = useState<string>("");
  const [manualSchemaText, setManualSchemaText] = useState("");

  const leftSchema = useQuery(
    api.schemas.getCached,
    leftId ? { deploymentId: leftId as Id<"deployments"> } : "skip"
  );
  const rightSchema = useQuery(
    api.schemas.getCached,
    rightId ? { deploymentId: rightId as Id<"deployments"> } : "skip"
  );

  const diff = useMemo(() => {
    if (!leftSchema?.schema || !rightSchema?.schema) return null;
    const left = parseSchemaJson(leftSchema.schema);
    const right = parseSchemaJson(rightSchema.schema);
    return computeDiff(left, right);
  }, [leftSchema, rightSchema]);

  const leftDeployment = deployments?.find((d: Deployment) => d._id === leftId);
  const rightDeployment = deployments?.find((d: Deployment) => d._id === rightId);

  async function handleFetchSchema(deploymentId: string) {
    setFetchingId(deploymentId);
    try {
      const result = await fetchSchemaAction({
        deploymentId: deploymentId as Id<"deployments">,
      });
      if (!result.success) {
        setManualInputTarget(deploymentId);
        setManualInputOpen(true);
      }
    } catch {
      setManualInputTarget(deploymentId);
      setManualInputOpen(true);
    } finally {
      setFetchingId(null);
    }
  }

  async function handleManualSchemaSubmit() {
    if (!manualInputTarget || !manualSchemaText.trim()) return;
    await upsertSchema({
      deploymentId: manualInputTarget as Id<"deployments">,
      schema: manualSchemaText.trim(),
    });
    setManualInputOpen(false);
    setManualSchemaText("");
    setManualInputTarget("");
  }

  function openManualInput(deploymentId: string) {
    setManualInputTarget(deploymentId);
    setManualInputOpen(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Schema Diff</h1>
        <p className="text-muted-foreground mt-1">
          Compare schemas between two deployments
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Select value={leftId} onValueChange={setLeftId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select left deployment" />
            </SelectTrigger>
            <SelectContent>
              {deployments?.map((d: Deployment) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.name} ({d.environment})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {leftId && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                title="Fetch schema from deployment"
                disabled={fetchingId === leftId}
                onClick={() => handleFetchSchema(leftId)}
              >
                {fetchingId === leftId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                title="Manually input schema"
                onClick={() => openManualInput(leftId)}
              >
                <FileEdit className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <GitCompareArrows className="h-5 w-5 text-muted-foreground" />

        <div className="flex items-center gap-2">
          <Select value={rightId} onValueChange={setRightId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select right deployment" />
            </SelectTrigger>
            <SelectContent>
              {deployments?.map((d: Deployment) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.name} ({d.environment})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {rightId && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                title="Fetch schema from deployment"
                disabled={fetchingId === rightId}
                onClick={() => handleFetchSchema(rightId)}
              >
                {fetchingId === rightId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                title="Manually input schema"
                onClick={() => openManualInput(rightId)}
              >
                <FileEdit className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {leftId && rightId && leftId === rightId && (
        <p className="text-sm text-destructive">
          Select two different deployments to compare.
        </p>
      )}

      {leftId && leftSchema && (
        <Badge variant="outline" className="text-xs">
          Left schema cached {new Date(leftSchema.fetchedAt).toLocaleString()}
        </Badge>
      )}
      {rightId && rightSchema && (
        <Badge variant="outline" className="text-xs ml-2">
          Right schema cached{" "}
          {new Date(rightSchema.fetchedAt).toLocaleString()}
        </Badge>
      )}

      {!leftId || !rightId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitCompareArrows className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Select deployments</h3>
            <p className="text-muted-foreground text-sm">
              Choose two deployments to compare their schemas
            </p>
          </CardContent>
        </Card>
      ) : !diff ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitCompareArrows className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No schema data</h3>
            <p className="text-muted-foreground text-sm text-center max-w-md">
              Use the <Download className="inline h-4 w-4" /> button to
              auto-fetch schemas, or <FileEdit className="inline h-4 w-4" /> to
              manually paste schema JSON for each deployment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-green-500" />
              <span>Added in {rightDeployment?.name ?? "right"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-red-500" />
              <span>Removed from {leftDeployment?.name ?? "left"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-sm bg-yellow-500" />
              <span>Changed</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-1">
            <DiffSection title="Tables" items={diff.tables} />
            <DiffSection title="Indexes" items={diff.indexes} />
            <DiffSection title="Functions" items={diff.functions} />
          </div>
        </div>
      )}

      <Dialog open={manualInputOpen} onOpenChange={setManualInputOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Input Schema JSON</DialogTitle>
            <DialogDescription>
              Paste the schema JSON for{" "}
              {deployments?.find((d: Deployment) => d._id === manualInputTarget)?.name ??
                "this deployment"}
              . Use the format:{" "}
              {
                '{"tables": [{"name": "tableName", "indexes": [], "fields": {}}], "functions": []}'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="schema-json">Schema JSON</Label>
            <Textarea
              id="schema-json"
              className="font-mono text-sm min-h-[200px]"
              placeholder='{"tables": [{"name": "users", "indexes": ["by_email"], "fields": {"name": "string", "email": "string"}}], "functions": ["users:list", "users:get"]}'
              value={manualSchemaText}
              onChange={(e) => setManualSchemaText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setManualInputOpen(false);
                setManualSchemaText("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualSchemaSubmit}
              disabled={!manualSchemaText.trim()}
            >
              Save Schema
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
