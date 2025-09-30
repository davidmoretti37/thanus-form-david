"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Copy, Eye, EyeOff, Key, ExternalLink, Sparkles, Shield } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

// Get backend URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

interface ApiToken {
  token_id: string;
  name: string;
  token_prefix: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateTokenResponse {
  token_id: string;
  name: string;
  token: string;
  token_prefix: string;
  is_active: boolean;
  created_at: string;
}

export default function ApiKeysPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showNewToken, setShowNewToken] = useState(false);
  const supabase = createClient();

  const fetchTokens = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = `${API_URL}/user-api/api-tokens`;
      console.log('Fetching tokens from URL:', url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTokens(data);
      } else {
        toast.error("Failed to fetch API keys");
      }
    } catch (error) {
      console.error("Error fetching keys:", error);
      toast.error("Failed to fetch API keys");
    } finally {
      setLoading(false);
    }
  };

  const createToken = async () => {
    if (!newTokenName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/user-api/api-tokens`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: newTokenName }),
      });

      if (response.ok) {
        const data: CreateTokenResponse = await response.json();
        setNewToken(data.token);
        setNewTokenName("");
        setShowCreateDialog(false);
        await fetchTokens();
        toast.success("API key created successfully");
      } else {
        toast.error("Failed to create API key");
      }
    } catch (error) {
      console.error("Error creating key:", error);
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const deleteToken = async (tokenId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/user-api/api-tokens/${tokenId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        await fetchTokens();
        toast.success("API key deleted successfully");
      } else {
        toast.error("Failed to delete API key");
      }
    } catch (error) {
      console.error("Error deleting key:", error);
      toast.error("Failed to delete API key");
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Key copied to clipboard");
  };

  const toggleTokenStatus = async (tokenId: string, currentStatus: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_URL}/user-api/api-tokens/${tokenId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (response.ok) {
        await fetchTokens();
        toast.success(`Key ${!currentStatus ? "activated" : "deactivated"} successfully`);
      } else {
        toast.error("Failed to update key status");
      }
    } catch (error) {
      console.error("Error updating key:", error);
      toast.error("Failed to update key status");
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-6 py-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Key className="w-6 h-6" />
              <h1 className="text-2xl font-bold">API Keys</h1>
            </div>
            <p className="text-muted-foreground">
              Manage your API keys for programmatic access to your account.
            </p>
          </div>
          
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const navigateToApiDocs = () => {
    window.open('/settings/api-docs', '_blank');
  };

  const navigateToApiProjects = () => {
    window.open('/settings/api-projects', '_blank');
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="w-6 h-6" />
              <h1 className="text-2xl font-bold">API Keys</h1>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={navigateToApiDocs}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                API Documentation
              </Button>
              <Button 
                variant="outline" 
                onClick={navigateToApiProjects}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                API Projects
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">
            Manage your API keys for programmatic access to your account.
          </p>
        </div>

        {/* SDK Beta Notice */}
        <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/10 dark:border-blue-800/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-500/20">
                  <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="absolute -top-1 -right-1">
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700">
                    Beta
                  </Badge>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-base font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Tars SDK & API
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                    Our SDK and API are currently in beta. Use these API keys to integrate with our 
                    programmatic interface for building custom applications and automations.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <a 
                    href="https://github.com/kortix-ai/suna/tree/main/sdk" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    <span>View SDK Documentation</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>
              API keys use a token prefix for secure authentication
            </span>
          </div>

          <div className="flex gap-2">
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key for programmatic access to your account.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="key-name">Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="Enter a descriptive name for your key"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createToken} disabled={creating}>
                    {creating ? "Creating..." : "Create Key"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* API Keys List */}
        {tokens.length === 0 ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No API keys yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first API key to start using the Tars API
                  programmatically. Each key includes a token prefix for secure authentication.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    className="flex-1 sm:flex-none"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create API Key
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={navigateToApiDocs}
                    className="flex-1 sm:flex-none"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View API Documentation
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Getting Started with Tars API</CardTitle>
                <CardDescription>
                  Learn how to integrate with Tars API using your API keys
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-medium">1. Create an API Key</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Generate a new API key to authenticate your requests to the Tars API.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 dark:text-purple-400">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <line x1="10" y1="9" x2="8" y2="9"></line>
                        </svg>
                      </div>
                      <h4 className="font-medium">2. Read the Documentation</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Explore our API documentation to understand available endpoints and how to use them.
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                      </div>
                      <h4 className="font-medium">3. Start Building</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Integrate Tars API into your applications and automate your workflows.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    Need help with API integration?
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Check out our <a href="#" className="text-blue-600 hover:underline dark:text-blue-400" onClick={(e) => { e.preventDefault(); navigateToApiDocs(); }}>API documentation</a> or contact our <a href="#" className="text-blue-600 hover:underline dark:text-blue-400">support team</a> for assistance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {tokens.map((token) => (
              <Card key={token.token_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{token.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Created on {new Date(token.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={token.is_active ? "default" : "secondary"}>
                        {token.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleTokenStatus(token.token_id, token.is_active)}
                      >
                        {token.is_active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteToken(token.token_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Token Prefix</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {token.token_prefix}...
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToken(token.token_prefix)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Updated</p>
                      <p>{new Date(token.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {newToken && token.token_id === tokens[tokens.length - 1]?.token_id && (
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800/50">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <svg
                            className="h-5 w-5 text-yellow-500"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Save your API key
                          </h4>
                          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                            This is the only time you'll be able to see your full API key. Make sure to copy it now and store it securely.
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <code className="flex-1 text-xs font-mono bg-yellow-100 dark:bg-yellow-900/50 px-3 py-2 rounded flex items-center">
                              {showNewToken ? newToken : '•'.repeat(32)}
                              <button 
                                onClick={() => setShowNewToken(!showNewToken)}
                                className="ml-2 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                              >
                                {showNewToken ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToken(newToken)}
                              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-800 dark:text-yellow-300 dark:hover:bg-yellow-900/30"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <p className="mt-2 text-xs text-yellow-700/80 dark:text-yellow-300/80">
                            For security reasons, we won't show this key again.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-yellow-600 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
                          onClick={() => setNewToken(null)}
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
