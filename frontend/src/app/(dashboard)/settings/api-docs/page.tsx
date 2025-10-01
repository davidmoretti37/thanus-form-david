"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Play, Eye, EyeOff, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Get backend URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface ApiEndpoint {
  method: string;
  path: string;
  title: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    example?: any;
  }>;
  requestBody?: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
    example: any;
  };
  responses: {
    success: {
      code: number;
      description: string;
      example: any;
    };
    error?: {
      code: number;
      description: string;
      example: any;
    };
  };
}

const API_ENDPOINTS = (t: (key: string) => string): ApiEndpoint[] => [
  {
    method: "GET",
    path: "/user-api/agents",
    title: t('apiEndpoints.listAgents'),
    description: t('apiEndpoints.listAgentsDescription'),
    responses: {
      success: {
        code: 200,
        description: t('apiEndpoints.listAgentsResponse'),
        example: {
          agents: [
            {
              agent_id: "agent_123",
              name: "My Agent",
              description: t('apiModelDescriptions.helpfulAI'),
              is_default: true,
              is_public: false,
              created_at: "2025-08-11T10:00:00Z",
              version_count: 1,
              current_version_name: "v1.0"
            }
          ],
          total: 1
        }
      }
    }
  },
  {
    method: "GET",
    path: "/user-api/models",
    title: t('apiEndpoints.listModels'),
    description: t('apiEndpoints.listModelsDescription'),
    responses: {
      success: {
        code: 200,
        description: t('apiEndpoints.listModelsResponse'),
        example: {
          models: [
            {
              name: "anthropic/claude-sonnet-4-20250514",
              display_name: "thanus-2.0",
              provider: "Anthropic",
              description: t('apiModelDescriptions.advancedAI'),
              max_tokens: 200000,
              supports_thinking: true,
              supports_vision: true
            }
          ],
          total: 1,
          default_model: "anthropic/claude-sonnet-4-20250514"
        }
      }
    }
  },
  {
    method: "GET",
    path: "/user-api/projects",
    title: t('apiEndpoints.listProjects'),
    description: t('apiEndpoints.listProjectsDescription'),
    parameters: [
      {
        name: "api_only",
        type: "boolean",
        required: false,
        description: t('apiParams.apiOnly'),
        example: true
      },
      {
        name: "page",
        type: "integer",
        required: false,
        description: t('apiParams.page'),
        example: 1
      },
      {
        name: "limit",
        type: "integer",
        required: false,
        description: t('apiParams.limit'),
        example: 100
      }
    ],
    responses: {
      success: {
        code: 200,
        description: t('apiEndpoints.listProjectsResponse'),
        example: {
          projects: [
            {
              project_id: "project_789",
              name: "API: Create a simple HTML page",
              created_at: "2025-08-12T10:00:00Z",
              updated_at: "2025-08-12T10:05:00Z",
              is_api_execution: true,
              thread_id: "thread_123"
            },
            {
              project_id: "project_456",
              name: "My Dashboard Project",
              created_at: "2025-08-11T15:30:00Z",
              updated_at: null,
              is_api_execution: false,
              thread_id: "thread_456"
            }
          ],
          total: 2
        }
      }
    }
  },
  {
    method: "POST",
    path: "/user-api/agents/execute",
    title: t('apiEndpoints.executeDefaultAgent'),
    description: t('apiEndpoints.executeDefaultAgentDescription'),
    requestBody: {
      type: "object",
      properties: {
        prompt: { type: "string", description: t('apiParams.prompt'), required: true },
        model_name: { type: "string", description: t('apiParams.modelName') },
        enable_thinking: { type: "boolean", description: t('apiParams.enableThinking'), default: false },
        reasoning_effort: { type: "string", description: t('apiParams.reasoningEffort'), enum: ["low", "medium", "high"], default: "low" },
        stream: { type: "boolean", description: t('apiParams.stream'), default: true },
        enable_context_manager: { type: "boolean", description: t('apiParams.enableContextManager'), default: false }
      },
      required: ["prompt"],
      example: {
        prompt: "Create a simple Python function that prints 'Hello, World!'",
        model_name: "anthropic/claude-sonnet-4-20250514",
        enable_thinking: false,
        stream: true
      }
    },
    responses: {
      success: {
        code: 200,
        description: t('apiResponses.agentExecutionStarted'),
        example: {
          thread_id: "thread_123",
          agent_run_id: "run_456",
          project_id: "project_789",
          status: "running",
          message: "Agent execution started successfully",
          view_url: "http://localhost:3000/projects/project_789/thread/thread_123"
        }
      }
    }
  },
  {
    method: "POST",
    path: "/user-api/agents/execute",
    title: t('apiEndpoints.executeSpecificAgent'),
    description: t('apiEndpoints.executeSpecificAgentDescription'),
    requestBody: {
      type: "object",
      properties: {
        prompt: { type: "string", description: t('apiParams.prompt'), required: true },
        agent_id: { type: "string", description: t('apiParams.agentId') + ' (required for this example)', required: true },
        model_name: { type: "string", description: t('apiParams.modelName') },
        enable_thinking: { type: "boolean", description: t('apiParams.enableThinking'), default: false },
        reasoning_effort: { type: "string", description: t('apiParams.reasoningEffort'), enum: ["low", "medium", "high"], default: "low" },
        stream: { type: "boolean", description: t('apiParams.stream'), default: true },
        enable_context_manager: { type: "boolean", description: t('apiParams.enableContextManager'), default: false }
      },
      required: ["prompt", "agent_id"],
      example: {
        prompt: "Analyze this code and suggest improvements",
        agent_id: "agent_123",
        model_name: "anthropic/claude-sonnet-4-20250514",
        enable_thinking: true,
        stream: true
      }
    },
    responses: {
      success: {
        code: 200,
        description: t('apiResponses.agentExecutionStarted'),
        example: {
          thread_id: "thread_456",
          agent_run_id: "run_789",
          project_id: "project_012",
          status: "running",
          message: "Agent execution started successfully",
          view_url: "http://localhost:3000/projects/project_012/thread/thread_456"
        }
      }
    }
  },
  {
    method: "POST",
    path: "/user-api/threads/{thread_id}/send-message",
    title: t('apiEndpoints.sendMessageToThread'),
    description: t('apiEndpoints.sendMessageToThreadDescription'),
    parameters: [
      {
        name: "thread_id",
        type: "string",
        required: true,
        description: t('apiParams.threadId'),
        example: "thread_123"
      }
    ],
    requestBody: {
      type: "object",
      properties: {
        message: { type: "string", description: t('apiCommon.message'), required: true },
        model_name: { type: "string", description: t('apiParams.modelName') + ' (uses previous execution model if not provided)' },
        enable_thinking: { type: "boolean", description: t('apiParams.enableThinking') + ' (uses previous execution setting if not provided)', default: false },
        reasoning_effort: { type: "string", description: t('apiParams.reasoningEffort'), enum: ["low", "medium", "high"] },
        stream: { type: "boolean", description: t('apiParams.stream'), default: true },
        enable_context_manager: { type: "boolean", description: t('apiParams.enableContextManager') + ' (uses previous execution setting if not provided)', default: false }
      },
      required: ["message"],
      example: {
        message: "Now add CSS styling to make the page look more professional",
        enable_thinking: true,
        stream: true
      }
    },
    responses: {
      success: {
        code: 200,
        description: t('apiResponses.newAgentRunStarted'),
        example: {
          agent_run_id: "run_789",
          thread_id: "thread_123",
          project_id: "project_456",
          status: "running",
          message: "Message sent successfully, new agent run started",
          view_url: "http://localhost:3000/projects/project_456/thread/thread_123"
        }
      }
    }
  },
  {
    method: "GET",
    path: "/user-api/agents/runs/{agent_run_id}/stream",
    title: t('apiEndpoints.streamAgentRun'),
    description: t('apiEndpoints.streamAgentRunDescription'),
    parameters: [
      {
        name: "agent_run_id",
        type: "string",
        required: true,
        description: t('apiParams.agentRunId'),
        example: "run_456"
      }
    ],
    responses: {
      success: {
        code: 200,
        description: t('apiResponses.serverSentEvents'),
        example: "data: {\"type\": \"message\", \"role\": \"assistant\", \"content\": \"Hello!\"}\n\n"
      }
    }
  },
  {
    method: "GET",
    path: "/user-api/agents/runs/{agent_run_id}/status",
    title: t('apiEndpoints.getAgentRunStatus'),
    description: t('apiEndpoints.getAgentRunStatusDescription'),
    parameters: [
      {
        name: "agent_run_id",
        type: "string",
        required: true,
        description: t('apiResponses.agentRunStatus'),
        example: "run_456"
      }
    ],
    responses: {
      success: {
        code: 200,
        description: "Agent run status",
        example: {
          id: "run_456",
          thread_id: "thread_123",
          status: "completed",
          started_at: "2025-08-11T10:00:00Z",
          completed_at: "2025-08-11T10:05:00Z",
          error: null,
          metadata: {}
        }
      }
    }
  },
  {
    method: "GET",
    path: "/user-api/threads/{thread_id}/messages",
    title: t('apiEndpoints.getThreadMessages'),
    description: t('apiEndpoints.getThreadMessagesDescription'),
    parameters: [
      {
        name: "include_responses",
        type: "boolean",
        required: false,
        description: t('apiParams.includeResponses'),
        example: true
      },
      {
        name: "format_output",
        type: "boolean",
        required: false,
        description: "Format output for better readability",
        example: true
      }
    ],
    responses: {
      success: {
        code: 200,
        description: "Thread messages and responses",
        example: {
          thread_id: "thread_123",
          project_id: "project_456",
          latest_agent_run_id: "run_789",
          status: "completed",
          messages: [],
          responses: [],
          summary: {
            total_messages: 4,
            total_responses: 10,
            user_messages: 2,
            assistant_messages: 2,
            tool_uses: 3,
            tool_results: 3
          }
        }
      }
    }
  },
  {
    method: "GET",
    path: "/user-api/agents/runs/{agent_run_id}/result",
    title: t('apiEndpoints.getAgentRunResult'),
    description: t('apiEndpoints.getAgentRunResultDescription'),
    parameters: [
      {
        name: "agent_run_id",
        type: "string",
        required: true,
        description: t('apiResponses.agentRunStatus'),
        example: "run_456"
      }
    ],
    responses: {
      success: {
        code: 200,
        description: "Agent run final result",
        example: {
          agent_run_id: "run_456",
          status: "completed",
          started_at: "2025-08-11T10:00:00Z",
          completed_at: "2025-08-11T10:05:00Z",
          error: null,
          result: "I've created a simple Python function that prints 'Hello, World!'...",
          tool_outputs: [],
          files_created: ["hello.py"]
        }
      }
    }
  },
  {
    method: "POST",
    path: "/user-api/sandbox/init-and-list",
    title: t('apiEndpoints.initSandbox'),
    description: t('apiEndpoints.initSandboxDescription'),
    requestBody: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "Project ID that owns the sandbox" },
        agent_run_id: { type: "string", description: "Agent run ID to resolve project" }
      },
      example: {
        project_id: "project_789"
      }
    },
    responses: {
      success: {
        code: 200,
        description: "Sandbox initialized and files listed",
        example: {
          project_id: "project_789",
          sandbox: {
            id: "sandbox_123"
          },
          files: [
            {
              path: "/workspace/hello.py",
              size: 91,
              modified: "2025-08-11 14:02:57"
            }
          ],
          listing_error: null
        }
      }
    }
  },
  {
    method: "GET",
    path: "/user-api/sandbox/files/download",
    title: "Download Sandbox File",
    description: "Download a specific file from the sandbox. Use the 'Initialize Sandbox and List Files' endpoint first to get the available files and their paths.",
    parameters: [
      {
        name: "project_id",
        type: "string",
        required: false,
        description: t('apiResponses.sandboxFiles'),
        example: "project_789"
      },
      {
        name: "agent_run_id",
        type: "string",
        required: false,
        description: "Agent run ID to resolve project",
        example: "run_456"
      },
      {
        name: "path",
        type: "string",
        required: true,
        description: t('apiResponses.downloadFile'),
        example: "/workspace/hello.py"
      }
    ],
    responses: {
      success: {
        code: 200,
        description: "File content as binary stream",
        example: "Binary file content with proper Content-Disposition headers"
      }
    }
  }
];

export default function ApiDocsPage() {
  const { t } = useLanguage();
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [bodyParams, setBodyParams] = useState<Record<string, any>>({});
  const [savedExecutionData, setSavedExecutionData] = useState<{
    agent_run_id: string;
    project_id: string;
    thread_id: string;
  } | null>(null);
  const [streamingData, setStreamingData] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const router = useRouter();
  
  // Initialize endpoints with translations
  const endpoints = API_ENDPOINTS(t);

  useEffect(() => {
    // Load API key from localStorage
    const savedApiKey = localStorage.getItem("thanus_api_key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }

    // Load saved execution data from localStorage
    const savedData = localStorage.getItem("thanus_execution_data");
    if (savedData) {
      try {
        setSavedExecutionData(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to parse saved execution data:", e);
      }
    }
  }, []);

  const saveApiKey = () => {
    localStorage.setItem("thanus_api_key", apiKey);
    toast.success("API key saved locally");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const updateRequestBodyFromParams = (newBodyParams: Record<string, any>, endpoint: ApiEndpoint) => {
    if (endpoint.requestBody?.example) {
      // Start with the original example
      const updatedBody = { ...endpoint.requestBody.example };
      
      // Update with values from individual parameters
      Object.entries(newBodyParams).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          updatedBody[key] = value;
        }
      });
      
      setRequestBody(JSON.stringify(updatedBody, null, 2));
    }
  };

  const selectEndpoint = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setResponse("");
    setPathParams({});
    setQueryParams({});
    setBodyParams({});
    
    // Set default request body if available
    if (endpoint.requestBody?.example) {
      setRequestBody(JSON.stringify(endpoint.requestBody.example, null, 2));
    } else {
      setRequestBody("");
    }

    // Initialize path parameters
    const pathParamMatches = endpoint.path.match(/\{([^}]+)\}/g);
    if (pathParamMatches) {
      const newPathParams: Record<string, string> = {};
      pathParamMatches.forEach(match => {
        const paramName = match.slice(1, -1);
        const paramDef = endpoint.parameters?.find(p => p.name === paramName);
        newPathParams[paramName] = paramDef?.example || "";
      });
      setPathParams(newPathParams);
    }

    // Initialize query parameters
    if (endpoint.parameters) {
      const newQueryParams: Record<string, string> = {};
      endpoint.parameters
        .filter(p => !endpoint.path.includes(`{${p.name}}`))
        .forEach(param => {
          // Set default value for api_only to "true"
          if (param.name === "api_only" && param.type === "boolean") {
            newQueryParams[param.name] = "true";
          } else {
            newQueryParams[param.name] = param.example || "";
          }
        });
      setQueryParams(newQueryParams);
    }

    // Initialize body parameters
    if (endpoint.requestBody?.properties) {
      const newBodyParams: Record<string, any> = {};
      Object.entries(endpoint.requestBody.properties).forEach(([key, prop]: [string, any]) => {
        if (endpoint.requestBody?.example && endpoint.requestBody.example[key] !== undefined) {
          newBodyParams[key] = endpoint.requestBody.example[key];
        } else if (prop.default !== undefined) {
          newBodyParams[key] = prop.default;
        } else if (prop.type === "boolean") {
          newBodyParams[key] = false;
        } else {
          newBodyParams[key] = "";
        }
      });
      setBodyParams(newBodyParams);
    }
  };

  const downloadFile = async () => {
    if (!selectedEndpoint || !apiKey || selectedEndpoint.path !== "/user-api/sandbox/files/download") {
      toast.error("This function is only available for the download endpoint");
      return;
    }

    setLoading(true);

    try {
      // Build URL with path parameters
      let url = selectedEndpoint.path;
      Object.entries(pathParams).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, value);
      });

      // Add query parameters
      const queryString = Object.entries(queryParams)
        .filter(([_, value]) => {
          const stringValue = String(value || "");
          return stringValue.trim() !== "";
        })
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
      
      if (queryString) {
        url += `?${queryString}`;
      }

      const fullUrl = `${API_URL}${url}`;

      const response = await fetch(fullUrl, {
        method: selectedEndpoint.method,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast.error(`Download failed: ${response.status} ${response.statusText}`);
        setResponse(JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorText
        }, null, 2));
        return;
      }

      // Handle file download with proper content type detection
      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      let filename = 'downloaded_file';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      } else {
        // Try to extract filename from path parameter
        const pathParam = queryParams.path || '';
        if (pathParam) {
          const pathParts = pathParam.split('/');
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart.includes('.')) {
            filename = lastPart;
          }
        }
      }

      // Create a new blob with the correct MIME type to preserve file format
      const typedBlob = new Blob([blob], { type: contentType });
      
      // Create download link
      const url_obj = window.URL.createObjectURL(typedBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url_obj;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url_obj);
      document.body.removeChild(a);
      
      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: {
          message: `File "${filename}" downloaded successfully`,
          filename: filename,
          size: blob.size,
          type: contentType,
          originalType: blob.type
        }
      };
      
      setResponse(JSON.stringify(result, null, 2));
      toast.success(`File "${filename}" downloaded successfully`);

    } catch (error) {
      const errorResult = {
        error: "Download Error",
        message: error instanceof Error ? error.message : "Unknown download error occurred"
      };
      setResponse(JSON.stringify(errorResult, null, 2));
      toast.error("Download failed");
    } finally {
      setLoading(false);
    }
  };

  const generateCurlCommand = () => {
    if (!selectedEndpoint) return "";

    // Build URL with path parameters
    let url = selectedEndpoint.path;
    Object.entries(pathParams).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value || `{${key}}`);
    });

    // Add query parameters
    const queryString = Object.entries(queryParams)
      .filter(([_, value]) => {
        const stringValue = String(value || "");
        return stringValue.trim() !== "";
      })
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    
    if (queryString) {
      url += `?${queryString}`;
    }

    const fullUrl = `${API_URL}${url}`;

    let curlCommand = `curl -X ${selectedEndpoint.method} "${fullUrl}" \\\n`;
    curlCommand += `  -H "Authorization: Bearer YOUR_API_KEY" \\\n`;
    curlCommand += `  -H "Content-Type: application/json"`;

    if (selectedEndpoint.method !== "GET" && requestBody.trim()) {
      curlCommand += ` \\\n  -d '${requestBody.replace(/'/g, "'\\''")}' `;
    }

    return curlCommand;
  };

  const generateJavaScriptCode = () => {
    if (!selectedEndpoint) return "";

    // Build URL with path parameters
    let url = selectedEndpoint.path;
    Object.entries(pathParams).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value || `{${key}}`);
    });

    // Add query parameters
    const queryString = Object.entries(queryParams)
      .filter(([_, value]) => {
        const stringValue = String(value || "");
        return stringValue.trim() !== "";
      })
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    
    if (queryString) {
      url += `?${queryString}`;
    }

    const fullUrl = `${API_URL}${url}`;

    let jsCode = `const apiKey = "YOUR_API_KEY";\n`;
    jsCode += `const url = "${fullUrl}";\n\n`;

    jsCode += `const options = {\n`;
    jsCode += `  method: "${selectedEndpoint.method}",\n`;
    jsCode += `  headers: {\n`;
    jsCode += `    "Authorization": \`Bearer \${apiKey}\`,\n`;
    jsCode += `    "Content-Type": "application/json"\n`;
    jsCode += `  }`;

    if (selectedEndpoint.method !== "GET" && requestBody.trim()) {
      jsCode += `,\n  body: JSON.stringify(${requestBody})`;
    }

    jsCode += `\n};\n\n`;

    if (selectedEndpoint.path === "/user-api/agents/runs/{agent_run_id}/stream") {
      jsCode += `// For streaming endpoints, use EventSource or fetch with stream handling\n`;
      jsCode += `fetch(url, options)\n`;
      jsCode += `  .then(response => {\n`;
      jsCode += `    const reader = response.body.getReader();\n`;
      jsCode += `    const decoder = new TextDecoder();\n\n`;
      jsCode += `    function readStream() {\n`;
      jsCode += `      return reader.read().then(({ done, value }) => {\n`;
      jsCode += `        if (done) return;\n`;
      jsCode += `        const chunk = decoder.decode(value, { stream: true });\n`;
      jsCode += `        console.log('Stream chunk:', chunk);\n`;
      jsCode += `        return readStream();\n`;
      jsCode += `      });\n`;
      jsCode += `    }\n\n`;
      jsCode += `    return readStream();\n`;
      jsCode += `  })\n`;
      jsCode += `  .catch(error => console.error('Error:', error));`;
    } else {
      jsCode += `fetch(url, options)\n`;
      jsCode += `  .then(response => response.json())\n`;
      jsCode += `  .then(data => console.log('Success:', data))\n`;
      jsCode += `  .catch(error => console.error('Error:', error));`;
    }

    return jsCode;
  };

  const generatePythonCode = () => {
    if (!selectedEndpoint) return "";

    // Build URL with path parameters
    let url = selectedEndpoint.path;
    Object.entries(pathParams).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value || `{${key}}`);
    });

    // Add query parameters
    const queryString = Object.entries(queryParams)
      .filter(([_, value]) => {
        const stringValue = String(value || "");
        return stringValue.trim() !== "";
      })
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&");
    
    if (queryString) {
      url += `?${queryString}`;
    }

    const fullUrl = `${API_URL}${url}`;

    let pythonCode = `import requests\nimport json\n\n`;
    pythonCode += `api_key = "YOUR_API_KEY"\n`;
    pythonCode += `url = "${fullUrl}"\n\n`;

    pythonCode += `headers = {\n`;
    pythonCode += `    "Authorization": f"Bearer {api_key}",\n`;
    pythonCode += `    "Content-Type": "application/json"\n`;
    pythonCode += `}\n\n`;

    if (selectedEndpoint.method !== "GET" && requestBody.trim()) {
      pythonCode += `data = ${requestBody}\n\n`;
    }

    if (selectedEndpoint.path === "/user-api/agents/runs/{agent_run_id}/stream") {
      pythonCode += `# For streaming endpoints\n`;
      pythonCode += `response = requests.${selectedEndpoint.method.toLowerCase()}(url, headers=headers`;
      if (selectedEndpoint.method !== "GET" && requestBody.trim()) {
        pythonCode += `, json=data`;
      }
      pythonCode += `, stream=True)\n\n`;
      pythonCode += `if response.status_code == 200:\n`;
      pythonCode += `    for line in response.iter_lines():\n`;
      pythonCode += `        if line:\n`;
      pythonCode += `            decoded_line = line.decode('utf-8')\n`;
      pythonCode += `            if decoded_line.startswith('data: '):\n`;
      pythonCode += `                data_content = decoded_line[6:]  # Remove 'data: ' prefix\n`;
      pythonCode += `                try:\n`;
      pythonCode += `                    json_data = json.loads(data_content)\n`;
      pythonCode += `                    print("Stream data:", json_data)\n`;
      pythonCode += `                except json.JSONDecodeError:\n`;
      pythonCode += `                    print("Raw data:", data_content)\n`;
      pythonCode += `else:\n`;
      pythonCode += `    print(f"Error: {response.status_code} - {response.text}")`;
    } else {
      pythonCode += `response = requests.${selectedEndpoint.method.toLowerCase()}(url, headers=headers`;
      if (selectedEndpoint.method !== "GET" && requestBody.trim()) {
        pythonCode += `, json=data`;
      }
      pythonCode += `)\n\n`;
      pythonCode += `if response.status_code == 200:\n`;
      pythonCode += `    result = response.json()\n`;
      pythonCode += `    print("Success:", result)\n`;
      pythonCode += `else:\n`;
      pythonCode += `    print(f"Error: {response.status_code} - {response.text}")`;
    }

    return pythonCode;
  };

  const executeRequest = async () => {
    if (!selectedEndpoint || !apiKey) {
      toast.error("Please select an endpoint and provide an API key");
      return;
    }

    setLoading(true);
    
    // Check if this is the streaming endpoint
    const isStreamEndpoint = selectedEndpoint.path === "/user-api/agents/runs/{agent_run_id}/stream";
    
    if (isStreamEndpoint) {
      setStreamingData([]);
      setIsStreaming(true);
      setResponse("");
    }

    try {
      // Build URL with path parameters
      let url = selectedEndpoint.path;
      Object.entries(pathParams).forEach(([key, value]) => {
        url = url.replace(`{${key}}`, value);
      });

      // Add query parameters
      const queryString = Object.entries(queryParams)
        .filter(([_, value]) => {
          const stringValue = String(value || "");
          return stringValue.trim() !== "";
        })
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");
      
      if (queryString) {
        url += `?${queryString}`;
      }

      const fullUrl = `${API_URL}${url}`;

      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      };

      if (selectedEndpoint.method !== "GET") {
        // Use body parameters if available, otherwise use raw JSON
        if (selectedEndpoint.requestBody?.properties && Object.keys(bodyParams).length > 0) {
          // Build request body from individual parameters
          const filteredBodyParams = Object.fromEntries(
            Object.entries(bodyParams).filter(([_, value]) => {
              // Include non-empty strings, all booleans, and non-zero numbers
              return value !== "" && value !== null && value !== undefined;
            })
          );
          
          if (Object.keys(filteredBodyParams).length > 0) {
            options.body = JSON.stringify(filteredBodyParams);
            // Update the JSON textarea to show what will be sent
            setRequestBody(JSON.stringify(filteredBodyParams, null, 2));
          }
        } else if (requestBody.trim()) {
          try {
            JSON.parse(requestBody); // Validate JSON
            options.body = requestBody;
          } catch (e) {
            toast.error("Invalid JSON in request body");
            setLoading(false);
            return;
          }
        }
      }

      if (isStreamEndpoint) {
        // Handle streaming endpoint
        try {
          const response = await fetch(fullUrl, options);
          
          if (!response.ok) {
            const errorText = await response.text();
            setResponse(JSON.stringify({
              status: response.status,
              statusText: response.statusText,
              error: errorText
            }, null, 2));
            toast.error(`Stream failed: ${response.status} ${response.statusText}`);
            setIsStreaming(false);
            setLoading(false);
            return;
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();

          if (!reader) {
            throw new Error("No reader available");
          }

          toast.success("Stream started successfully");
          
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              setIsStreaming(false);
              toast.success("Stream completed");
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.trim() && line.startsWith('data: ')) {
                const data = line.slice(6); // Remove 'data: ' prefix
                if (data.trim() && data !== '[DONE]') {
                  try {
                    const parsed = JSON.parse(data);
                    setStreamingData(prev => [...prev, JSON.stringify(parsed, null, 2)]);
                  } catch (e) {
                    // If not JSON, add as raw text
                    setStreamingData(prev => [...prev, data]);
                  }
                }
              }
            }
          }
        } catch (streamError) {
          console.error("Streaming error:", streamError);
          setResponse(JSON.stringify({
            error: "Streaming Error",
            message: streamError instanceof Error ? streamError.message : "Unknown streaming error"
          }, null, 2));
          toast.error("Stream failed");
          setIsStreaming(false);
        }
      } else {
        // Handle regular endpoint
        const response = await fetch(fullUrl, options);
        
        // Handle regular response
        const responseText = await response.text();
        
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }

        const result = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData
        };

        setResponse(JSON.stringify(result, null, 2));
        
        if (response.ok) {
          toast.success("Request completed successfully");
          
          // Save execution data if this is the execute endpoint or send-message endpoint
          if ((selectedEndpoint.path === "/user-api/agents/execute" || selectedEndpoint.path === "/user-api/threads/{thread_id}/send-message") && responseData) {
            const executionData = {
              agent_run_id: responseData.agent_run_id,
              project_id: responseData.project_id,
              thread_id: responseData.thread_id
            };
            
            if (executionData.agent_run_id && executionData.project_id && executionData.thread_id) {
              setSavedExecutionData(executionData);
              localStorage.setItem("thanus_execution_data", JSON.stringify(executionData));
              toast.success("Execution data updated for future requests");
            }
          }
        } else {
          toast.error(`Request failed: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error) {
      const errorResult = {
        error: "Network Error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      };
      setResponse(JSON.stringify(errorResult, null, 2));
      toast.error("Request failed");
      setIsStreaming(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('apiDocs.back')}
          </Button>
        </div>
        <h1 className="text-3xl font-bold">{t('apiDocs.pageTitle')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('apiDocs.pageDescription')}
        </p>
      </div>

      {/* API Key Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('apiDocs.authTitle')}</CardTitle>
          <CardDescription>
            {t('apiDocs.authDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="api-key">{t('apiDocs.apiKey')}</Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="thanus_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button onClick={saveApiKey} disabled={!apiKey.trim()}>
                  {t('apiKeys.save')}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {t('apiKeys.dontHaveKey')} <Link href="/settings/api-tokens" className="text-blue-600 hover:underline">{t('apiDocs.createKeyLink')}</Link>
          </p>
        </CardContent>
      </Card>

      {/* Saved Execution Data Section */}
      {savedExecutionData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('apiDocs.lastExecution.title')}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSavedExecutionData(null);
                  localStorage.removeItem("thanus_execution_data");
                  toast.success(t('apiDocs.lastExecution.cleared'));
                }}
              >
                {t('apiDocs.lastExecution.clear')}
              </Button>
            </CardTitle>
            <CardDescription>
              {t('apiDocs.lastExecution.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">{t('apiDocs.lastExecution.agentRunId')}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                    {savedExecutionData.agent_run_id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(savedExecutionData.agent_run_id)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">{t('apiDocs.lastExecution.projectId')}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                    {savedExecutionData.project_id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(savedExecutionData.project_id)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Thread ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                    {savedExecutionData.thread_id}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(savedExecutionData.thread_id)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.open(`/projects/${savedExecutionData.project_id}/thread/${savedExecutionData.thread_id}`, '_blank');
                }}
              >
                {t('apiEndpoints.viewInDashboard')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!selectedEndpoint) {
                    toast.info("Select an endpoint first");
                    return;
                  }

                  let fieldsUpdated = [];

                  // Auto-fill agent_run_id - prioritize path params over query params
                  if (selectedEndpoint.path.includes('{agent_run_id}')) {
                    setPathParams(prev => ({ ...prev, agent_run_id: savedExecutionData.agent_run_id }));
                    fieldsUpdated.push("Agent Run ID (path)");
                  } else if (selectedEndpoint.parameters?.some(p => p.name === "agent_run_id")) {
                    setQueryParams(prev => ({ ...prev, agent_run_id: savedExecutionData.agent_run_id }));
                    fieldsUpdated.push("Agent Run ID (query)");
                  }

                  // Auto-fill thread_id - prioritize path params over body params
                  if (selectedEndpoint.path.includes('{thread_id}')) {
                    setPathParams(prev => ({ ...prev, thread_id: savedExecutionData.thread_id }));
                    fieldsUpdated.push("Thread ID (path)");
                  } else if (selectedEndpoint.requestBody?.properties?.thread_id) {
                    const newBodyParams = { ...bodyParams, thread_id: savedExecutionData.thread_id };
                    setBodyParams(newBodyParams);
                    updateRequestBodyFromParams(newBodyParams, selectedEndpoint);
                    fieldsUpdated.push("Thread ID (body)");
                  } else if (selectedEndpoint.parameters?.some(p => p.name === "thread_id")) {
                    setQueryParams(prev => ({ ...prev, thread_id: savedExecutionData.thread_id }));
                    fieldsUpdated.push("Thread ID (query)");
                  }

                  // Auto-fill project_id - prioritize body params over query params
                  if (selectedEndpoint.requestBody?.properties?.project_id) {
                    const newBodyParams = { ...bodyParams, project_id: savedExecutionData.project_id };
                    setBodyParams(newBodyParams);
                    updateRequestBodyFromParams(newBodyParams, selectedEndpoint);
                    fieldsUpdated.push("Project ID (body)");
                  } else if (selectedEndpoint.parameters?.some(p => p.name === "project_id")) {
                    setQueryParams(prev => ({ ...prev, project_id: savedExecutionData.project_id }));
                    fieldsUpdated.push("Project ID (query)");
                  }

                  if (fieldsUpdated.length > 0) {
                    toast.success(`Filled: ${fieldsUpdated.join(", ")}`);
                  } else {
                    toast.info(t('apiEndpoints.noCompatibleFields'));
                  }
                }}
              >
                {t('apiEndpoints.useInCurrentEndpoint')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoints List */}
        <Card>
          <CardHeader>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>
              Select an endpoint to view documentation and test it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {endpoints.map((endpoint, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedEndpoint === endpoint ? "bg-muted border-primary" : ""
                  }`}
                  onClick={() => selectEndpoint(endpoint)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={endpoint.method === "GET" ? "secondary" : "default"}>
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm">{endpoint.path}</code>
                  </div>
                  <p className="text-sm font-medium">{endpoint.title}</p>
                  <p className="text-xs text-muted-foreground">{endpoint.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Endpoint Details */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedEndpoint ? selectedEndpoint.title : t('apiDocs.selectEndpoint')}
            </CardTitle>
            <CardDescription>
              {selectedEndpoint ? selectedEndpoint.description : t('apiDocs.chooseEndpointDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedEndpoint ? (
              <Tabs defaultValue="docs" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="docs">{t('apiDocs.documentation')}</TabsTrigger>
                  <TabsTrigger value="test">{t('apiDocs.testRequest')}</TabsTrigger>
                  <TabsTrigger value="code">{t('apiDocs.codeExamples')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="docs" className="space-y-4">
                  {/* Method and Path */}
                  <div>
                    <Label>{t('apiDocs.endpoint')}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={selectedEndpoint.method === "GET" ? "secondary" : "default"}>
                        {selectedEndpoint.method}
                      </Badge>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {API_URL}{selectedEndpoint.path}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`${API_URL}${selectedEndpoint.path}`)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Parameters */}
                  {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                    <div>
                      <Label>{t('apiDocs.parameters')}</Label>
                      <div className="space-y-2 mt-2">
                        {selectedEndpoint.parameters.map((param, idx) => (
                          <div key={idx} className="border rounded p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-sm font-medium">{param.name}</code>
                              <Badge variant="outline" className="text-xs">
                                {param.type}
                              </Badge>
                              {param.required && (
                                <Badge variant="destructive" className="text-xs">
                                  {t('apiCommon.requiredBadge')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{param.description}</p>
                            {param.example && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {t('apiDocs.example')}: <code>{JSON.stringify(param.example)}</code>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Request Body */}
                  {selectedEndpoint.requestBody && (
                    <div>
                      <Label>{t('apiDocs.requestBody')}</Label>
                      <div className="mt-2">
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                          {JSON.stringify(selectedEndpoint.requestBody.example, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Response */}
                  <div>
                    <Label>{t('apiDocs.responseExample')}</Label>
                    <div className="mt-2">
                      <Badge className="mb-2">{selectedEndpoint.responses.success.code}</Badge>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                        {JSON.stringify(selectedEndpoint.responses.success.example, null, 2)}
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="test" className="space-y-4">
                  {/* Endpoint Information */}
                  <div>
                    <Label>{t('apiDocs.endpoint')}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={selectedEndpoint.method === "GET" ? "secondary" : "default"}>
                        {selectedEndpoint.method}
                      </Badge>
                      <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                        {API_URL}{selectedEndpoint.path}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(`${API_URL}${selectedEndpoint.path}`)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Path Parameters */}
                  {Object.keys(pathParams).length > 0 && (
                    <div>
                      <Label>Path Parameters</Label>
                      <div className="space-y-2 mt-2">
                        {Object.entries(pathParams).map(([key, value]) => (
                          <div key={key}>
                            <Label className="text-sm">{key}</Label>
                            <Input
                              value={value}
                              onChange={(e) => setPathParams(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={`Enter ${key}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Query Parameters */}
                  {Object.keys(queryParams).length > 0 && (
                    <div>
                      <Label>Query Parameters</Label>
                      <div className="space-y-2 mt-2">
                        {Object.entries(queryParams).map(([key, value]) => {
                          // Special handling for boolean parameters like api_only
                          const paramDef = selectedEndpoint.parameters?.find(p => p.name === key);
                          const isBoolean = paramDef?.type === "boolean";
                          
                          return (
                            <div key={key}>
                              <Label className="text-sm">{key}</Label>
                              {isBoolean ? (
                                <Select
                                  value={value || ""}
                                  onValueChange={(newValue) => setQueryParams(prev => ({ 
                                    ...prev, 
                                    [key]: newValue 
                                  }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={`Select ${key}`} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">True</SelectItem>
                                    <SelectItem value="false">False</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={value || ""}
                                  onChange={(e) => setQueryParams(prev => ({ ...prev, [key]: e.target.value }))}
                                  placeholder={`Enter ${key}`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Request Body Parameters - Simplified */}
                  {selectedEndpoint.requestBody?.properties && Object.keys(bodyParams).length > 0 && (
                    <div>
                      <Label>Request Body Parameters</Label>
                      <div className="space-y-2 mt-2">
                        {Object.entries(selectedEndpoint.requestBody.properties).map(([key, prop]: [string, any]) => {
                          const isRequired = selectedEndpoint.requestBody?.required?.includes(key) || prop.required;
                          
                          // Only show prompt, agent_id, model_name, project_id, thread_id, and message fields as customizable
                          // Exclude agent_run_id since it's typically a path parameter or alternative to project_id
                          if (key !== "prompt" && key !== "agent_id" && key !== "model_name" && key !== "project_id" && key !== "thread_id" && key !== "message") {
                            return null;
                          }
                          
                          return (
                            <div key={key}>
                              <div className="flex items-center gap-2 mb-1">
                                <Label className="text-sm">{key}</Label>
                                <Badge variant="outline" className="text-xs">
                                  {prop.type}
                                </Badge>
                                {isRequired && (
                                  <Badge variant="destructive" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">{prop.description}</p>
                              {key === "prompt" || key === "message" ? (
                                <Textarea
                                  value={bodyParams[key] || ""}
                                  onChange={(e) => {
                                    const newBodyParams = { ...bodyParams, [key]: e.target.value };
                                    setBodyParams(newBodyParams);
                                    updateRequestBodyFromParams(newBodyParams, selectedEndpoint);
                                  }}
                                  placeholder={key === "prompt" ? "Enter your prompt here..." : "Enter your message here..."}
                                  rows={3}
                                />
                              ) : (
                                <Input
                                  value={bodyParams[key] || ""}
                                  onChange={(e) => {
                                    const newBodyParams = { ...bodyParams, [key]: e.target.value };
                                    setBodyParams(newBodyParams);
                                    updateRequestBodyFromParams(newBodyParams, selectedEndpoint);
                                  }}
                                  placeholder={key === "agent_id" ? "Enter agent ID (e.g., agent_123)" : key === "model_name" ? "anthropic/claude-sonnet-4-20250514" : `Enter ${key}`}
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Request Body JSON - Only show for non-GET endpoints */}
                  {selectedEndpoint.method !== "GET" && (
                    <div>
                      <Label>Request Body (JSON) - Will be sent to server</Label>
                      {selectedEndpoint.requestBody ? (
                        <>
                          <Textarea
                            value={requestBody}
                            onChange={(e) => setRequestBody(e.target.value)}
                            placeholder="Enter JSON request body"
                            rows={8}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            This JSON will be sent to the server. It updates automatically when you change the fields above.
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="mt-2 p-3 bg-muted rounded text-sm text-muted-foreground font-mono">
                            No request body required
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            This endpoint does not send any data in the request body.
                          </p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Execute Button */}
                  <div className="space-y-2">
                    <Button 
                      onClick={executeRequest} 
                      disabled={loading || !apiKey}
                      className="w-full"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {loading ? "Executing..." : "Execute Request"}
                    </Button>

                    {/* Download Button - Only for download endpoint */}
                    {selectedEndpoint?.path === "/user-api/sandbox/files/download" && (
                      <Button 
                        onClick={downloadFile} 
                        disabled={loading || !apiKey}
                        variant="outline"
                        className="w-full"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {loading ? "Downloading..." : "Download File"}
                      </Button>
                    )}
                  </div>

                  {/* Streaming Response */}
                  {selectedEndpoint?.path === "/user-api/agents/runs/{agent_run_id}/stream" && (streamingData.length > 0 || isStreaming) && (
                    <div>
                      <Label className="flex items-center gap-2">
                        Stream Response
                        {isStreaming && (
                          <Badge variant="outline" className="text-xs">
                            Streaming...
                          </Badge>
                        )}
                      </Label>
                      <div className="mt-2 max-h-96 overflow-auto bg-muted p-3 rounded">
                        {streamingData.length === 0 && isStreaming ? (
                          <p className="text-sm text-muted-foreground">Waiting for stream data...</p>
                        ) : (
                          <div className="space-y-2">
                            {streamingData.map((data, index) => (
                              <div key={index} className="border-b border-muted-foreground/20 pb-2 last:border-b-0">
                                <pre className="text-xs whitespace-pre-wrap">{data}</pre>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {streamingData.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => copyToClipboard(streamingData.join('\n\n'))}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Stream Data
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Regular Response */}
                  {response && selectedEndpoint?.path !== "/user-api/agents/runs/{agent_run_id}/stream" && (
                    <div>
                      <Label>{t('apiDocs.response')}</Label>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto mt-2 max-h-96">
                        {response}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => copyToClipboard(response)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Response
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="code" className="space-y-4">
                  {/* Code Examples */}
                  <div>
                    <Label>Code Examples</Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Copy and paste these examples to integrate with the Thanus AI API in your preferred language.
                    </p>
                    
                    <Tabs defaultValue="curl" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="curl">cURL</TabsTrigger>
                        <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                        <TabsTrigger value="python">Python</TabsTrigger>
                      </TabsList>

                      <TabsContent value="curl" className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">cURL Command</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const curlCommand = generateCurlCommand();
                                copyToClipboard(curlCommand);
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </Button>
                          </div>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                            <code>{generateCurlCommand()}</code>
                          </pre>
                        </div>
                      </TabsContent>

                      <TabsContent value="javascript" className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">JavaScript (Fetch API)</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const jsCode = generateJavaScriptCode();
                                copyToClipboard(jsCode);
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </Button>
                          </div>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                            <code>{generateJavaScriptCode()}</code>
                          </pre>
                        </div>
                      </TabsContent>

                      <TabsContent value="python" className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">Python (requests)</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const pythonCode = generatePythonCode();
                                copyToClipboard(pythonCode);
                              }}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copy
                            </Button>
                          </div>
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                            <code>{generatePythonCode()}</code>
                          </pre>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>Select an endpoint from the list to view documentation and test it</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
