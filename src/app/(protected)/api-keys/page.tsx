"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { Copy, Key, RotateCw, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApiKeysPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [keyToCopy, setKeyToCopy] = useState("");

  const utils = api.useUtils();
  const { data: apiKeys, isLoading } = api.apiKey.list.useQuery();
  const { data: usageStats } = api.apiKey.usageStats.useQuery({ days: 30 });

  const generateKey = api.apiKey.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedKey(data.key);
      setKeyToCopy(data.key);
      setShowCreateDialog(false);
      setShowKeyDialog(true);
      setNewKeyName("");
      void utils.apiKey.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to generate API key", {
        description: error.message,
      });
    },
  });

  const revokeKey = api.apiKey.revoke.useMutation({
    onSuccess: () => {
      toast.success("API key revoked");
      void utils.apiKey.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to revoke API key", {
        description: error.message,
      });
    },
  });

  const rotateKey = api.apiKey.rotate.useMutation({
    onSuccess: (data) => {
      setGeneratedKey(data.key);
      setKeyToCopy(data.key);
      setShowKeyDialog(true);
      void utils.apiKey.list.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to rotate API key", {
        description: error.message,
      });
    },
  });

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(keyToCopy);
      toast.success("API key copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy API key");
    }
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }
    generateKey.mutate({ name: newKeyName });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const activeKeys = apiKeys?.filter(key => key.isActive && !key.isExpired) || [];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="text-muted-foreground mt-2">
          Manage API keys for programmatic access to your flashcard data
        </p>
      </div>

      {/* API Documentation Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            Use these API keys to authenticate requests to our REST API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Authentication</h4>
              <code className="block p-2 bg-muted rounded text-sm">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Available Endpoints</h4>
              <ul className="space-y-1 text-sm">
                <li>• <code>GET /api/v1/decks</code> - List your decks</li>
                <li>• <code>POST /api/v1/decks</code> - Create a new deck</li>
                <li>• <code>POST /api/v1/decks/{'{deckId}'}/cards/batch</code> - Add multiple cards</li>
                <li>• <code>GET /api/v1/study/queue</code> - Get cards due for review</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Rate Limits</h4>
              <p className="text-sm text-muted-foreground">
                • Default endpoints: 1000 requests/hour
              </p>
              <p className="text-sm text-muted-foreground">
                • Batch endpoints: 100 requests/hour
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Keys */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Active API Keys</CardTitle>
            <CardDescription>
              {activeKeys.length} active {activeKeys.length === 1 ? 'key' : 'keys'}
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Key className="mr-2 h-4 w-4" />
            Generate New Key
          </Button>
        </CardHeader>
        <CardContent>
          {activeKeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Key className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No active API keys</p>
              <p className="text-sm mt-2">Generate your first API key to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeKeys.map((key) => {
                  const stats = usageStats?.find(s => s.id === key.id);
                  return (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>{format(new Date(key.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        {key.lastUsedAt
                          ? format(new Date(key.lastUsedAt), 'MMM d, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {stats?.totalRequests || 0} requests
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {key.expiresAt
                          ? format(new Date(key.expiresAt), 'MMM d, yyyy')
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rotateKey.mutate({ id: key.id })}
                            disabled={rotateKey.isPending}
                          >
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => revokeKey.mutate({ id: key.id })}
                            disabled={revokeKey.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., My Application"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateKey();
                  }
                }}
              />
              <p className="text-sm text-muted-foreground mt-1">
                A descriptive name to help you identify this key
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewKeyName("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateKey}
              disabled={generateKey.isPending || !newKeyName.trim()}
            >
              Generate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Generated Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Copy this key now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Store this key securely. It has full access to your account data.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>Your API Key</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedKey}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowKeyDialog(false);
                setGeneratedKey("");
                setKeyToCopy("");
              }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}