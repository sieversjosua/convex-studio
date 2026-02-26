"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, ScrollText, AlertTriangle, Database } from "lucide-react";
import Link from "next/link";

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

interface LogEntry {
  _id: string;
  _creationTime: number;
  deploymentId: string;
  level: "error" | "warning" | "info" | "debug";
  message: string;
  timestamp: number;
  functionName?: string;
  requestId?: string;
  userId: string;
}

export default function DashboardPage() {
  const deployments = useQuery(api.deployments.list);
  const logs = useQuery(api.logs.list, { limit: 10 });

  const connectedCount = deployments?.filter((d: Deployment) => d.status === "connected").length ?? 0;
  const errorCount = deployments?.filter((d: Deployment) => d.status === "error").length ?? 0;
  const recentErrors = logs?.filter((l: LogEntry) => l.level === "error").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your Convex deployments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Deployments</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deployments?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {connectedCount} connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <Database className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{connectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Active connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{errorCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Deployment errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Logs</CardTitle>
            <ScrollText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {recentErrors} errors
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deployments</CardTitle>
            <CardDescription>Your connected Convex deployments</CardDescription>
          </CardHeader>
          <CardContent>
            {!deployments || deployments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No deployments yet</p>
                <Link
                  href="/dashboard/deployments"
                  className="text-primary text-sm hover:underline"
                >
                  Add your first deployment
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {deployments.slice(0, 5).map((d: Deployment) => (
                  <div
                    key={d._id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.environment}</p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        d.status === "connected"
                          ? "default"
                          : d.status === "error"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {d.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Logs</CardTitle>
            <CardDescription>Latest log entries across deployments</CardDescription>
          </CardHeader>
          <CardContent>
            {!logs || logs.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No logs yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.slice(0, 5).map((log: LogEntry) => (
                  <div
                    key={log._id}
                    className="flex items-start gap-3 rounded-md border p-3"
                  >
                    <Badge
                      variant={
                        log.level === "error"
                          ? "destructive"
                          : log.level === "warning"
                            ? "secondary"
                            : "outline"
                      }
                      className="mt-0.5 shrink-0 text-[10px]"
                    >
                      {log.level}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{log.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
