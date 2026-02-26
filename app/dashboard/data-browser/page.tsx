"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Database,
  Copy,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

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
  userId: string;
}

interface DocumentRecord {
  _id: string;
  [key: string]: unknown;
}

interface FetchState {
  documents: DocumentRecord[];
  isLoading: boolean;
  error: string | null;
  cursor: string | null;
  hasMore: boolean;
  page: number;
}

const INITIAL_FETCH_STATE: FetchState = {
  documents: [],
  isLoading: false,
  error: null,
  cursor: null,
  hasMore: false,
  page: 0,
};

function DocumentTable({
  documents,
  isLoading,
  error,
  onCopy,
  side,
}: {
  documents: DocumentRecord[];
  isLoading: boolean;
  error: string | null;
  onCopy?: (doc: DocumentRecord) => void;
  side?: "left" | "right";
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-8 w-8 mb-2 animate-spin" />
        <p className="text-sm">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2 text-destructive opacity-70" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Database className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">No documents</p>
      </div>
    );
  }

  const allKeys = Array.from(
    new Set(documents.flatMap((doc) => Object.keys(doc)))
  );

  return (
    <ScrollArea className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            {onCopy && <TableHead className="w-10" />}
            {allKeys.map((key) => (
              <TableHead
                key={key}
                className="font-mono text-xs whitespace-nowrap"
              >
                {key}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc._id}>
              {onCopy && (
                <TableCell className="p-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onCopy(doc)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side={side === "left" ? "right" : "left"}
                    >
                      Copy JSON to clipboard
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
              )}
              {allKeys.map((key) => (
                <TableCell
                  key={key}
                  className="font-mono text-xs max-w-[200px] truncate"
                >
                  {formatValue(doc[key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    if (value > 1_000_000_000_000 && value < 2_000_000_000_000) {
      return new Date(value).toLocaleString();
    }
    return String(value);
  }
  if (typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function parseDocumentsResponse(raw: string): {
  documents: DocumentRecord[];
  cursor: string | null;
  hasMore: boolean;
} {
  try {
    const parsed: Record<string, unknown> = JSON.parse(raw);
    // Handle Convex HTTP API response format: { status, value: { page, continueCursor, isDone } }
    const value = (
      typeof parsed.value === "object" && parsed.value !== null
        ? parsed.value
        : parsed
    ) as Record<string, unknown>;
    const page = Array.isArray(value.page) ? value.page : [];
    const documents = page.filter(
      (d): d is DocumentRecord =>
        typeof d === "object" &&
        d !== null &&
        typeof (d as Record<string, unknown>)._id === "string"
    );
    const cursor =
      typeof value.continueCursor === "string"
        ? value.continueCursor
        : null;
    const hasMore = value.isDone === false;
    return { documents, cursor, hasMore };
  } catch {
    return { documents: [], cursor: null, hasMore: false };
  }
}

export default function DataBrowserPage() {
  const deployments = useQuery(api.deployments.list);
  const queryDocuments = useAction(api.deploymentApi.queryDocuments);

  const [leftDeploymentId, setLeftDeploymentId] = useState<string>("");
  const [rightDeploymentId, setRightDeploymentId] = useState<string>("");
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [compareMode, setCompareMode] = useState(false);

  const [leftState, setLeftState] = useState<FetchState>(INITIAL_FETCH_STATE);
  const [rightState, setRightState] = useState<FetchState>(INITIAL_FETCH_STATE);

  const leftTableNames = useQuery(
    api.schemas.getTableNames,
    leftDeploymentId
      ? { deploymentId: leftDeploymentId as Id<"deployments"> }
      : "skip"
  );
  const rightTableNames = useQuery(
    api.schemas.getTableNames,
    rightDeploymentId
      ? { deploymentId: rightDeploymentId as Id<"deployments"> }
      : "skip"
  );

  const tableNames = leftTableNames ?? [];

  const fetchDocs = useCallback(
    async (
      deploymentId: string,
      table: string,
      cursor: string | null,
      setState: React.Dispatch<React.SetStateAction<FetchState>>,
      page: number
    ) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const result = await queryDocuments({
          deploymentId: deploymentId as Id<"deployments">,
          tableName: table,
          cursor: cursor ?? undefined,
          limit: 10,
        });
        if (result.success && result.documents) {
          const parsed = parseDocumentsResponse(result.documents);
          setState({
            documents: parsed.documents,
            isLoading: false,
            error: null,
            cursor: parsed.cursor,
            hasMore: parsed.hasMore,
            page,
          });
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: result.error ?? "Failed to fetch documents",
          }));
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Failed to fetch documents";
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
      }
    },
    [queryDocuments]
  );

  // Fetch documents when deployment or table changes
  useEffect(() => {
    if (leftDeploymentId && selectedTable) {
      fetchDocs(leftDeploymentId, selectedTable, null, setLeftState, 0);
    } else {
      setLeftState(INITIAL_FETCH_STATE);
    }
  }, [leftDeploymentId, selectedTable, fetchDocs]);

  useEffect(() => {
    if (compareMode && rightDeploymentId && selectedTable) {
      fetchDocs(rightDeploymentId, selectedTable, null, setRightState, 0);
    } else {
      setRightState(INITIAL_FETCH_STATE);
    }
  }, [compareMode, rightDeploymentId, selectedTable, fetchDocs]);

  function handleCopyDoc(doc: DocumentRecord) {
    navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
  }

  function handleLeftNextPage() {
    if (leftState.cursor && leftDeploymentId && selectedTable) {
      fetchDocs(
        leftDeploymentId,
        selectedTable,
        leftState.cursor,
        setLeftState,
        leftState.page + 1
      );
    }
  }

  function handleLeftPrevPage() {
    if (leftState.page > 0 && leftDeploymentId && selectedTable) {
      // Re-fetch from beginning for simplicity (cursor-based pagination)
      fetchDocs(leftDeploymentId, selectedTable, null, setLeftState, 0);
    }
  }

  function handleRightNextPage() {
    if (rightState.cursor && rightDeploymentId && selectedTable) {
      fetchDocs(
        rightDeploymentId,
        selectedTable,
        rightState.cursor,
        setRightState,
        rightState.page + 1
      );
    }
  }

  function handleRightPrevPage() {
    if (rightState.page > 0 && rightDeploymentId && selectedTable) {
      fetchDocs(rightDeploymentId, selectedTable, null, setRightState, 0);
    }
  }

  function handleRefreshLeft() {
    if (leftDeploymentId && selectedTable) {
      fetchDocs(leftDeploymentId, selectedTable, null, setLeftState, 0);
    }
  }

  function handleRefreshRight() {
    if (rightDeploymentId && selectedTable) {
      fetchDocs(rightDeploymentId, selectedTable, null, setRightState, 0);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Browser</h1>
          <p className="text-muted-foreground mt-1">
            Browse and compare data across deployments
          </p>
        </div>
        <Button
          variant={compareMode ? "default" : "outline"}
          onClick={() => setCompareMode(!compareMode)}
        >
          <Columns2 className="mr-2 h-4 w-4" />
          {compareMode ? "Exit Compare" : "Compare Mode"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={leftDeploymentId}
          onValueChange={(v) => {
            setLeftDeploymentId(v);
            setSelectedTable("");
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select deployment" />
          </SelectTrigger>
          <SelectContent>
            {deployments?.map((d: Deployment) => (
              <SelectItem key={d._id} value={d._id}>
                {d.name} ({d.environment})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {compareMode && (
          <Select
            value={rightDeploymentId}
            onValueChange={setRightDeploymentId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select comparison deployment" />
            </SelectTrigger>
            <SelectContent>
              {deployments?.map((d: Deployment) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.name} ({d.environment})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={selectedTable} onValueChange={setSelectedTable}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select table" />
          </SelectTrigger>
          <SelectContent>
            {tableNames.length > 0 ? (
              tableNames.map((name: string) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="__none" disabled>
                {leftDeploymentId
                  ? "No cached schema — use Schema Diff to input schema"
                  : "Select a deployment first"}
              </SelectItem>
            )}
            {compareMode &&
              rightTableNames &&
              rightTableNames
                .filter((n: string) => !tableNames.includes(n))
                .map((name: string) => (
                  <SelectItem key={`r-${name}`} value={name}>
                    {name} (right only)
                  </SelectItem>
                ))}
          </SelectContent>
        </Select>
      </div>

      {!leftDeploymentId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Select a deployment</h3>
            <p className="text-muted-foreground text-sm">
              Choose a deployment and table to browse documents
            </p>
          </CardContent>
        </Card>
      ) : !selectedTable ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">Select a table</h3>
            <p className="text-muted-foreground text-sm">
              {tableNames.length === 0
                ? "No cached schema found. Go to Schema Diff to fetch or input a schema for this deployment."
                : "Choose a table to browse its documents"}
            </p>
          </CardContent>
        </Card>
      ) : compareMode ? (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {deployments?.find((d: Deployment) => d._id === leftDeploymentId)?.name ??
                  "Left"}
                <Badge variant="outline" className="text-xs">
                  {selectedTable}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-auto"
                  onClick={handleRefreshLeft}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DocumentTable
                documents={leftState.documents}
                isLoading={leftState.isLoading}
                error={leftState.error}
                onCopy={handleCopyDoc}
                side="left"
              />
              {leftState.documents.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Page {leftState.page + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={leftState.page === 0}
                      onClick={handleLeftPrevPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={!leftState.hasMore}
                      onClick={handleLeftNextPage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {deployments?.find((d: Deployment) => d._id === rightDeploymentId)?.name ??
                  "Right"}
                <Badge variant="outline" className="text-xs">
                  {selectedTable}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-auto"
                  onClick={handleRefreshRight}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DocumentTable
                documents={rightState.documents}
                isLoading={rightState.isLoading}
                error={rightState.error}
                onCopy={handleCopyDoc}
                side="right"
              />
              {rightState.documents.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    Page {rightState.page + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={rightState.page === 0}
                      onClick={handleRightPrevPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={!rightState.hasMore}
                      onClick={handleRightNextPage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {deployments?.find((d: Deployment) => d._id === leftDeploymentId)?.name}
              <Badge variant="outline" className="text-xs">
                {selectedTable}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 ml-auto"
                onClick={handleRefreshLeft}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <DocumentTable
              documents={leftState.documents}
              isLoading={leftState.isLoading}
              error={leftState.error}
            />
            {leftState.documents.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Page {leftState.page + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={leftState.page === 0}
                    onClick={handleLeftPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!leftState.hasMore}
                    onClick={handleLeftNextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
