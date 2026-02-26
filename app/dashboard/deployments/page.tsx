"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Server, Trash2, RefreshCw, ExternalLink, Loader2 } from "lucide-react";

type Environment = "dev" | "prod" | "staging";

interface Deployment {
  _id: Id<"deployments">;
  _creationTime: number;
  name: string;
  url: string;
  deployKey: string;
  environment: "dev" | "prod" | "staging";
  status: "connected" | "error" | "pending";
  lastChecked?: number;
  errorMessage?: string;
}

export default function DeploymentsPage() {
  const deployments = useQuery(api.deployments.list);
  const addDeployment = useMutation(api.deployments.add);
  const removeDeployment = useMutation(api.deployments.remove);
  const checkConnection = useAction(api.deploymentApi.checkConnection);

  const [open, setOpen] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [deployKey, setDeployKey] = useState("");
  const [environment, setEnvironment] = useState<Environment>("dev");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleAdd() {
    if (!name || !url || !deployKey) return;
    setIsSubmitting(true);
    try {
      await addDeployment({ name, url, deployKey, environment });
      setName("");
      setUrl("");
      setDeployKey("");
      setEnvironment("dev");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCheckConnection(id: Id<"deployments">) {
    setCheckingId(id);
    try {
      await checkConnection({ deploymentId: id });
    } catch {
      // Error is handled by the action (updates status in DB)
    } finally {
      setCheckingId(null);
    }
  }

  async function handleRemove(id: Id<"deployments">) {
    await removeDeployment({ id });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deployments</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Convex deployment connections
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Deployment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Deployment</DialogTitle>
              <DialogDescription>
                Connect a new Convex deployment by providing its URL and deploy key.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="My App (Production)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">Deployment URL</Label>
                <Input
                  id="url"
                  placeholder="https://your-deployment.convex.cloud"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">Deploy Key</Label>
                <Input
                  id="key"
                  type="password"
                  placeholder="prod:deploy_key_..."
                  value={deployKey}
                  onChange={(e) => setDeployKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="env">Environment</Label>
                <Select
                  value={environment}
                  onValueChange={(v) => setEnvironment(v as Environment)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dev">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="prod">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={isSubmitting || !name || !url || !deployKey}>
                {isSubmitting ? "Adding..." : "Add Deployment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!deployments || deployments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Server className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">No deployments</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add your first Convex deployment to get started.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Deployment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {deployments.map((deployment: Deployment) => (
            <Card key={deployment._id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{deployment.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {deployment.url}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      deployment.status === "connected"
                        ? "default"
                        : deployment.status === "error"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {deployment.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Badge variant="outline" className="text-xs">
                    {deployment.environment}
                  </Badge>
                  {deployment.lastChecked && (
                    <span className="text-xs">
                      Checked {new Date(deployment.lastChecked).toLocaleString()}
                    </span>
                  )}
                </div>
                {deployment.errorMessage && (
                  <p className="text-sm text-destructive mb-4">
                    {deployment.errorMessage}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={checkingId === deployment._id}
                    onClick={() => handleCheckConnection(deployment._id)}
                  >
                    {checkingId === deployment._id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-3 w-3" />
                    )}
                    Check
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={deployment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Open
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => handleRemove(deployment._id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
