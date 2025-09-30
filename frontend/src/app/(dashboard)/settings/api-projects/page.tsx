"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface ApiProject {
  project_id: string;
  name: string;
  created_at: string;
  is_api_execution: boolean;
  account_id: string;
  thread_id?: string;
}

export default function ApiProjectsPage() {
  const [apiProjects, setApiProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  const fetchApiProjects = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch projects that were created via API with their associated thread_id
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
      let filteredProjects = flattenedProjects;
      
      // Get user accounts to filter projects
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiProjects();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push('/settings');
              }
            }}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
        <h1 className="text-3xl font-bold">API Projects</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all projects created through API executions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your API Projects</CardTitle>
          <CardDescription>
            Projects created through programmatic API calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-2">
                No API projects found
              </p>
              <p className="text-sm text-muted-foreground">
                Execute agents via API to see projects here. Use your API tokens to create automated workflows.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.href = '/settings/api-keys'}
              >
                Manage API Tokens
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {apiProjects.map((project) => (
                <div
                  key={project.project_id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-lg">{project.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        API
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Created: {new Date(project.created_at).toLocaleString()}
                      </span>
                      <span>•</span>
                      <span>
                        Project ID: {project.project_id}
                      </span>
                      {project.thread_id && (
                        <>
                          <span>•</span>
                          <span>
                            Thread ID: {project.thread_id}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const url = project.thread_id 
                          ? `/projects/${project.project_id}/thread/${project.thread_id}`
                          : `/projects/${project.project_id}`;
                        window.open(url, '_blank');
                      }}
                    >
                      View Project
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {apiProjects.length > 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Need to create more API projects? Manage your API tokens to get started.
          </p>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/settings/api-tokens'}
          >
            Manage API Tokens
          </Button>
        </div>
      )}
    </div>
  );
}
