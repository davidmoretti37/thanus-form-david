"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Copy, Eye, EyeOff } from "lucide-react";
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

interface ApiProject {
  project_id: string;
  name: string;
  created_at: string;
  is_api_execution: boolean;
  account_id: string;
  thread_id?: string;
}

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [showNewToken, setShowNewToken] = useState(false);
  const [apiProjects, setApiProjects] = useState<ApiProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
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
        toast.error("Failed to fetch API tokens");
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
      toast.error("Failed to fetch API tokens");
    } finally {
      setLoading(false);
    }
  };

  const fetchApiProjects = async () => {
    setLoadingProjects(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch projects that were created via API with their associated thread_id
      // This avoids the account_id confusion and gets projects for the authenticated user
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          project_id, 
          name, 
          created_at, 
          is_api_execution, 
          account_id,
          threads!inner(thread_id)
        `)
        .eq('is_api_execution', true)
        .order('created_at', { ascending: false });

      // Transform the data to flatten the thread_id
      const flattenedProjects = projects?.map(project => ({
        ...project,
        thread_id: project.threads?.[0]?.thread_id || null,
        threads: undefined // Remove the nested threads object
      })) || [];

      // Filter projects to only show those that belong to user's accounts
      let filteredProjects = projects || [];
      
      // If we need to filter by account, get user accounts first
      if (projects && projects.length > 0) {
        const { data: userAccounts } = await supabase
          .schema('basejump')
          .from('account_user')
          .select('account_id')
          .eq('user_id', session.user.id);
        
        if (userAccounts && userAccounts.length > 0) {
          const userAccountIds = userAccounts.map(acc => acc.account_id);
          filteredProjects = flattenedProjects.filter(project => 
            userAccountIds.includes(project.account_id)
          );
        } else {
          filteredProjects = flattenedProjects;
        }
      }

      if (error) {
        console.error("Error fetching API projects:", error);
        toast.error("Failed to fetch API projects");
      } else {
        setApiProjects(filteredProjects);
      }
    } catch (error) {
      console.error("Error fetching API projects:", error);
      toast.error("Failed to fetch API projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const createToken = async () => {
    if (!newTokenName.trim()) {
      toast.error("Please enter a token name");
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
        toast.success("API token created successfully");
      } else {
        toast.error("Failed to create API token");
      }
    } catch (error) {
      console.error("Error creating token:", error);
      toast.error("Failed to create API token");
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
        toast.success("API token deleted successfully");
      } else {
        toast.error("Failed to delete API token");
      }
    } catch (error) {
      console.error("Error deleting token:", error);
      toast.error("Failed to delete API token");
    }
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Token copied to clipboard");
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
        toast.success(`Token ${!currentStatus ? "activated" : "deactivated"} successfully`);
      } else {
        toast.error("Failed to update token status");
      }
    } catch (error) {
      console.error("Error updating token:", error);
      toast.error("Failed to update token status");
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  useEffect(() => {
    if (showProjects) {
      fetchApiProjects();
    }
  }, [showProjects]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">API Tokens</h1>
          <p className="text-muted-foreground mt-2">
            Manage your API tokens for programmatic access to your account.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/settings/api-docs'}
          >
            API Documentation
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/settings/api-projects'}
          >
            View API Projects
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Token
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New API Token</DialogTitle>
                <DialogDescription>
                  Create a new API token for programmatic access to your account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="token-name">Token Name</Label>
                  <Input
                    id="token-name"
                    placeholder="Enter a descriptive name for your token"
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
                  {creating ? "Creating..." : "Create Token"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* New Token Display Dialog */}
      {newToken && (
        <Dialog open={!!newToken} onOpenChange={() => setNewToken(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Token Created Successfully</DialogTitle>
              <DialogDescription>
                Please copy your token now. You won't be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono">
                    {showNewToken ? newToken : "•".repeat(newToken.length)}
                  </code>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewToken(!showNewToken)}
                    >
                      {showNewToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToken(newToken)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setNewToken(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div>
          <h2 className="text-xl font-semibold mb-4">Your API Tokens</h2>
          {tokens.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No API tokens found.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Create your first token to get started with the API.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tokens.map((token) => (
                <Card key={token.token_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{token.name}</CardTitle>
                        <CardDescription>
                          Created on {new Date(token.created_at).toLocaleDateString()}
                        </CardDescription>
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
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {token.token_prefix}...
                      </code>
                      <span className="text-sm text-muted-foreground">
                        Last updated: {new Date(token.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
