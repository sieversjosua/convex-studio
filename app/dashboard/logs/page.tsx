"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScrollText, Search, RefreshCw } from "lucide-react";

type LogLevel = "error" | "warning" | "info" | "debug";

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

interface LogEntry {
  _id: string;
  _creationTime: number;
  deploymentId: string;
  level: "error" | "warning" | "info" | "debug";
  message: string;
  timestamp: number;
  functionName?: string;
  requestId?: string;
}

const levelColors: Record<LogLevel, string> = {
  error: "text-red-500 bg-red-500/10 border-red-500/20",
  warning: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  info: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  debug: "text-gray-500 bg-gray-500/10 border-gray-500/20",
};

export default function LogsPage() {
  const deployments = useQuery(api.deployments.list);
  const [selectedDeployment, setSelectedDeployment] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const deploymentId =
    selectedDeployment !== "all"
      ? (selectedDeployment as Id<"deployments">)
      : undefined;

  const level =
    levelFilter !== "all" ? (levelFilter as LogLevel) : undefined;

  const logs = useQuery(api.logs.list, {
    deploymentId,
    level,
    limit: 200,
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!searchQuery) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(
      (log: LogEntry) =>
        log.message.toLowerCase().includes(query) ||
        log.functionName?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
        <p className="text-muted-foreground mt-1">
          View and filter logs from your deployments
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedDeployment} onValueChange={setSelectedDeployment}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All deployments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All deployments</SelectItem>
            {deployments?.map((d: Deployment) => (
              <SelectItem key={d._id} value={d._id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="debug">Debug</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button variant="outline" size="icon" title="Logs auto-refresh via Convex">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            {filteredLogs.length} log entries
            <Badge variant="outline" className="ml-auto text-xs font-normal">
              Auto-refresh
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <ScrollText className="h-8 w-8 mb-2 opacity-50" />
              <p>No logs found</p>
              <p className="text-xs mt-1">
                Logs will appear here as they come in from your deployments
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {filteredLogs.map((log: LogEntry) => (
                  <div
                    key={log._id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <Badge
                      className={`mt-0.5 shrink-0 text-[10px] font-mono ${levelColors[log.level as LogLevel]}`}
                      variant="outline"
                    >
                      {log.level.toUpperCase()}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-mono break-all">{log.message}</p>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        {log.functionName && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.functionName}
                          </span>
                        )}
                        {log.requestId && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.requestId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
