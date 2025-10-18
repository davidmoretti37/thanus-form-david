# Frontend (Web) - Agent & Model Selection Architecture

## 📋 Overview

The frontend has a sophisticated system for fetching, caching, and managing both **Agents** and **Models**. Here's how it works:

---

## 🤖 AGENTS SYSTEM

### 1. **Data Fetching**
**File**: `frontend/src/hooks/react-query/agents/utils.ts`

```typescript
export const getAgents = async (params: AgentsParams = {}): Promise<AgentsResponse> => {
  // Fetch with JWT token from Supabase
  // Endpoint: GET /agents?page=1&limit=50&search=query&...
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });
  
  return response.json(); // Returns: { agents: [], pagination: {...} }
};
```

**Query Parameters Supported**:
- `page`: Pagination (1-based)
- `limit`: Items per page (default 50, max 100)
- `search`: Search agents by name
- `sort_by`: Sort field (name, created_at, updated_at, tools_count)
- `sort_order`: asc or desc
- `has_default`: Filter by default agents
- `has_mcp_tools`: Filter by MCP tools
- `has_agentpress_tools`: Filter by AgentPress tools
- `tools`: Comma-separated tool names
- `content_type`: Filter (agents, templates)

### 2. **React Query Hook**
**File**: `frontend/src/hooks/react-query/agents/use-agents.ts`

```typescript
const { data: agentsResponse, isLoading } = useAgents(agentsParams);
// Caches automatically with query keys
// Returns: { agents: Agent[], pagination: {...} }
```

### 3. **Agent Selector Component**
**File**: `frontend/src/components/agents/agent-selector.tsx`

```typescript
export const AgentSelector: React.FC<AgentSelectorProps> = ({
  selectedAgentId,
  onAgentSelect,
  ...
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Debounce search 300ms
  // Fetch with pagination and search
  const { data: agentsResponse, isLoading } = useAgents({
    page: currentPage,
    limit: 50,
    search: debouncedSearchQuery,
  });
  
  // Infinite loading - append more agents on scroll
  // Shows checkmark next to selected agent
};
```

### 4. **Agent Selection Store**
**File**: `frontend/src/hooks/use-agent-selection.ts`

```typescript
const { 
  selectedAgentId,
  setSelectedAgent,
  initializeFromAgents 
} = useAgentSelection();
// Persists selected agent to localStorage
// Auto-selects first available agent if none selected
```

---

## 🧠 MODELS SYSTEM

### 1. **Data Fetching**
**File**: `frontend/src/lib/api.ts`

```typescript
export const getAvailableModels = async (): Promise<AvailableModelsResponse> => {
  // Fetch from: GET /billing/available-models
  // This is a BILLING endpoint, not /models
  
  const response = await fetch(`${API_URL}/billing/available-models`, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });
  
  return response.json();
};
```

**Response Structure**:
```typescript
{
  models: [
    {
      id: 'claude-sonnet-4',
      display_name: 'Claude Sonnet 4',
      short_name: 'Sonnet',
      provider: 'anthropic',
      requires_subscription: false,
      priority: 100,
      recommended: true,
      capabilities: ['vision', 'tool_use'],
      context_window: 200000,
    },
    ...
  ]
}
```

### 2. **Model Selection Hook**
**File**: `frontend/src/hooks/use-model-selection.ts`

```typescript
export const useModelSelection = () => {
  // Fetch models from API
  const { data: modelsData, isLoading } = useQuery({
    queryKey: ['models', 'available'],
    queryFn: getAvailableModels,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Get subscription status
  const { data: subscriptionData } = useSubscriptionData();

  // Transform API models + add custom models (for local dev)
  const availableModels = useMemo(() => {
    // Filter by subscription status
    // Sort by: recommended > priority > name
  }, [modelsData, customModels]);

  // Auto-select default model
  useEffect(() => {
    if (!selectedModel || !accessibleModels.some(m => m.id === selectedModel)) {
      const defaultModelId = getDefaultModel(availableModels, hasActiveSubscription);
      setSelectedModel(defaultModelId);
    }
  }, [accessibleModels]);

  return {
    selectedModel,
    setSelectedModel: handleModelChange,
    availableModels,
    accessibleModels, // Filtered by subscription
    ...
  };
};
```

### 3. **Model Selector Component**
**File**: `frontend/src/components/agents/config/model-selector.tsx`

```typescript
export function AgentModelSelector({
  value, // Currently selected model
  onChange, // When model is changed
  disabled = false,
  variant = 'default', // Dropdown or menu item style
}) {
  const {
    allModels,
    canAccessModel,
    subscriptionStatus,
    selectedModel: storeSelectedModel,
    handleModelChange,
    customModels,
    modelsData
  } = useModelSelection();

  // Merge API models + custom models
  const enhancedModelOptions = useMemo(() => {
    // Filter: show recommended models first
    // Show lock icon for subscription-required models
    // Show custom models in dev mode
  }, [modelsData?.models, allModels, customModels]);

  // On selection: check if model requires subscription
  // If locked: show paywall modal
  // If allowed: update parent with new model_id
}
```

---

## 🔄 DATA FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Dashboard/Chat Input                                    │
│         ↓                                                │
│  useAgentSelection() hook                                │
│  - Gets selectedAgentId from localStorage               │
│  - Fetches agents list with useAgents()                 │
│         ↓                                                │
│  AgentSelector Component                                 │
│  - Shows dropdown with all agents                       │
│  - Search & pagination                                  │
│  - Highlights selected agent ✓                          │
│         ↓                                                │
│  User selects agent                                     │
│         ↓                                                │
│  ┌──────────────────────────────────────────┐           │
│  │  Agent + Model Selection                 │           │
│  ├──────────────────────────────────────────┤           │
│  │                                          │           │
│  │  useModelSelection() hook                │           │
│  │  - Fetches available models              │           │
│  │  - Filters by subscription               │           │
│  │  - Caches 5 minutes                      │           │
│  │         ↓                                │           │
│  │  AgentModelSelector Component            │           │
│  │  - Shows dropdown with models            │           │
│  │  - Lock icon for premium models          │           │
│  │  - Shows recommended badge               │           │
│  │         ↓                                │           │
│  │  User selects model                      │           │
│  └──────────────────────────────────────────┘           │
│         ↓                                                │
│  useInitiateAgentMutation()                              │
│  - Sends: { agent_id, model_name, ... }                 │
│         ↓                                                │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│                    BACKEND API                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  GET /agents                                             │
│  - Returns list with pagination                         │
│                                                           │
│  GET /billing/available-models                          │
│  - Returns models with subscription info                │
│                                                           │
│  POST /agent/initiate                                   │
│  - Accepts: agent_id, model_name                        │
│  - Returns: thread_id, agent_run_id                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 KEY DIFFERENCES: Frontend vs Mobile

### Frontend (Web)
✅ Fetches from `/billing/available-models` (billing-aware)  
✅ Handles subscription filtering  
✅ Supports custom models in local mode  
✅ Persistent selection (localStorage)  
✅ Complex filtering & sorting  
✅ Inline paywall for locked models  

### Mobile (What We Built)
✅ Fetches from `/agents` and `/models` (simpler endpoints)  
✅ No subscription filtering yet  
✅ Modal-based selector  
✅ Simple selection UI  
❌ No persistence yet (should add)  
❌ No paywall  

---

## 🔌 API Endpoints Used

### Frontend
```
GET /agents                          - List agents with search/sort
GET /billing/available-models        - List models (billing-aware)
GET /billing/subscription-status     - Check subscription
POST /thread/{id}/initiate           - Start agent with model
```

### Mobile (Currently)
```
GET /agents                          - List agents (basic)
GET /models                          - List models (basic)
POST /agent/initiate                 - Start agent with model
```

**Note**: Mobile should ideally also use `/billing/available-models` to match frontend behavior and handle subscription filtering properly.

---

## 💡 Improvements for Mobile

1. **Add localStorage persistence** for selected agent/model
2. **Call `/billing/available-models`** instead of `/models` to get subscription info
3. **Filter models by subscription status**
4. **Show "Recommended" badge** on models
5. **Add search/pagination** to agent selector
6. **Cache models** for 5 minutes like frontend does
7. **Add custom model support** for local development
