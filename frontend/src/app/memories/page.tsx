"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getMemories, approveMemory as apiApproveMemory, deleteMemory as apiDeleteMemory, Memory as MemoryType } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { BadgeCheck, Trash2, RefreshCw, Loader2, ArrowLeft, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ParticlesCard } from "@/components/ui/particles-card"

// Using the Memory type from api.ts

function MemoriesContent() {
  // Custom styles for the animated glow effect
  const customStyles = `
    @keyframes shimmer {
      0% { background-position: 200% 50%; }
      100% { background-position: 0% 50%; }
    }
    
    @keyframes subtlePulse {
      0% { box-shadow: 0 0 3px 1px rgba(147, 51, 234, 0.1), 0 0 8px 2px rgba(0, 0, 0, 0.1); }
      50% { box-shadow: 0 0 5px 2px rgba(147, 51, 234, 0.15), 0 0 12px 3px rgba(0, 0, 0, 0.15); }
      100% { box-shadow: 0 0 3px 1px rgba(147, 51, 234, 0.1), 0 0 8px 2px rgba(0, 0, 0, 0.1); }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes scaleIn {
      from { transform: scale(0.95); }
      to { transform: scale(1); }
    }
    
    @keyframes glow {
      0% { box-shadow: 0 0 0 rgba(147, 51, 234, 0); }
      50% { box-shadow: 0 0 10px rgba(147, 51, 234, 0.3); }
      100% { box-shadow: 0 0 0 rgba(147, 51, 234, 0); }
    }
    
    @keyframes tabFadeIn {
      from { opacity: 0.5; }
      to { opacity: 1; }
    }
    
    .tab-content-animate {
      animation: fadeIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      will-change: opacity, transform;
    }
    
    .tab-button-active {
      animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, glow 3s ease-in-out infinite;
      will-change: transform, box-shadow;
    }
    
    /* Estilo para os botões de filtro */
    [data-state=inactive] {
      color: white !important;
    }
    
    [data-state=active] {
      color: black !important;
    }
    
    /* No modo escuro, todos os botões de filtro têm texto branco */
    .dark [data-state=active],
    .dark [data-state=inactive] {
      color: white !important;
    }
    
    .tab-fade {
      animation: tabFadeIn 0.5s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
    }
    
    .memory-text-wrapper {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: radial-gradient(circle, rgba(240,240,245,0.8) 0%, rgba(224, 231, 255, 0.6) 70%, rgba(224, 231, 255, 0.3) 100%);
      border-radius: 9999px;
      box-shadow: 0 0 3px 1px rgba(99, 102, 241, 0.1), 0 0 8px 2px rgba(224, 231, 255, 0.3);
      animation: subtlePulse 6s ease-in-out infinite;
      position: relative;
      z-index: 1;
      color: hsl(var(--foreground));
      margin-bottom: 0.5rem;
      border: 1px solid rgba(99, 102, 241, 0.1);
    }
    
    .dark .memory-text-wrapper {
      background: radial-gradient(circle, rgba(15,15,15,0.6) 0%, rgba(91, 33, 182, 0.2) 70%, rgba(167, 139, 250, 0.05) 100%);
      box-shadow: 0 0 3px 1px rgba(167, 139, 250, 0.1), 0 0 8px 2px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(167, 139, 250, 0.1);
    }
    
    .memory-gradient {
      background: linear-gradient(to right, 
        #475569 0%, 
        #a855f7 25%, 
        #475569 50%,
        #a855f7 75%,
        #475569 100%
      );
      background-size: 200% 100%;
      animation: shimmer 3s linear infinite;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      font-weight: 600;
    }
    
    .dark .memory-gradient {
      background: linear-gradient(to right, 
        #e2e8f0 0%, 
        #c084fc 25%, 
        #e2e8f0 50%,
        #c084fc 75%,
        #e2e8f0 100%
      );
      background-size: 200% 100%;
      animation: shimmer 3s linear infinite;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      font-weight: 600;
    }
  `;
  const [memories, setMemories] = useState<MemoryType[]>([])
  const [loading, setLoading] = useState(true)
  // We no longer need selectedMemories state since we removed checkboxes
  const [activeTab, setActiveTab] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [memoryToDelete, setMemoryToDelete] = useState<string | number | null>(null)
  const [animationKey, setAnimationKey] = useState(0) // For forcing animation re-render
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromPath = searchParams.get('from')
  const supabase = createClient()

  // Fetch memories from the backend using the API function
  const fetchMemories = async () => {
    setLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      
      if (!session.session) {
        router.push("/auth")
        return
      }
      
      // Use the getMemories function from api.ts
      const memoriesData = await getMemories()
      setMemories(memoriesData)
    } catch (error) {
      console.error("Error fetching memories:", error)
      toast.error("Could not load your memories. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // Approve a memory using the API function
  const approveMemory = async (memoryId: string | number) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      
      if (!session.session) {
        router.push("/auth")
        return
      }
      
      // Use the approveMemory function from api.ts
      await apiApproveMemory(memoryId)
      
      // Update local state
      setMemories(memories.map(memory => 
        memory.id === memoryId ? { ...memory, aprovacao_usuario: true } : memory
      ))
      
      toast.success("Memory approved successfully.")
    } catch (error) {
      console.error("Error approving memory:", error)
      toast.error("Could not approve the memory. Please try again later.")
    }
  }

  // Delete a memory using the API function
  const deleteMemory = async (memoryId: string | number) => {
    try {
      const { data: session } = await supabase.auth.getSession()
      
      if (!session.session) {
        router.push("/auth")
        return
      }
      
      // Use the deleteMemory function from api.ts
      await apiDeleteMemory(memoryId)
      
      // Update local state
      setMemories(memories.filter(memory => memory.id !== memoryId))
      
      toast.success("Memory deleted successfully.")
    } catch (error) {
      console.error("Error deleting memory:", error)
      toast.error("Could not delete the memory. Please try again later.")
    }
  }

  // Filter memories based on active tab
  const filteredMemories = memories.filter(memory => {
    if (activeTab === "all") return true
    if (activeTab === "approved") return memory.aprovacao_usuario
    if (activeTab === "pending") return !memory.aprovacao_usuario
    return true
  })

  // Load memories on component mount
  useEffect(() => {
    fetchMemories()
  }, [])
  
  // Handle tab changes with simple animation
  const handleTabChange = (value: string) => {
    setActiveTab(value) // Update active tab
    setAnimationKey(prev => prev + 1) // Trigger animation
  }
  
  // Update animation key when tab changes to trigger animation
  useEffect(() => {
    setAnimationKey(prev => prev + 1)
  }, [activeTab])

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Memories</h1>
        <div className="w-full flex justify-between items-center">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => router.push(fromPath || "/dashboard")}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchMemories}
            className="gap-1.5"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="bg-transparent p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-lg font-medium text-white dark:text-slate-300">About Your Memories</h3>
            <div className="mt-2 text-sm text-white dark:text-slate-400">
              <p>Thanus uses these memories to personalize and improve your experience. Approved memories help Thanus understand your preferences, background, and goals to provide more relevant and tailored responses.</p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" className="mb-6" onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3 mb-2 bg-transparent border border-input relative overflow-hidden text-white">
          <TabsTrigger 
            value="all" 
            className={`data-[state=active]:bg-accent data-[state=active]:text-black font-medium data-[state=active]:tab-button-active ${activeTab === 'all' ? 'tab-fade' : ''}`}
            key={`all-${animationKey}`}
          >
            All ({memories.length})
          </TabsTrigger>
          <TabsTrigger 
            value="approved" 
            className={`data-[state=active]:bg-accent data-[state=active]:text-black font-medium data-[state=active]:tab-button-active ${activeTab === 'approved' ? 'tab-fade' : ''}`}
            key={`approved-${animationKey}`}
          >
            Approved ({memories.filter(m => m.aprovacao_usuario).length})
          </TabsTrigger>
          <TabsTrigger 
            value="pending" 
            className={`data-[state=active]:bg-accent data-[state=active]:text-black font-medium data-[state=active]:tab-button-active ${activeTab === 'pending' ? 'tab-fade' : ''}`}
            key={`pending-${animationKey}`}
          >
            Pending Approval ({memories.filter(m => !m.aprovacao_usuario).length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete memory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this memory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              deleteMemory(memoryToDelete!);
              setDeleteDialogOpen(false);
            }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMemories.length === 0 ? (
          <div key={`empty-${activeTab}-${animationKey}`} className="tab-content-animate">
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <p className="text-muted-foreground text-lg mb-4">
                  {activeTab === "all" 
                    ? "You don't have any saved memories yet." 
                    : activeTab === "approved" 
                      ? "You don't have any approved memories." 
                      : "You don't have any memories pending approval."}
                </p>
                {activeTab !== "all" && (
                  <Button variant="outline" onClick={() => setActiveTab("all")}>
                    View all memories
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div key={`memories-${activeTab}-${animationKey}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 auto-rows-fr tab-content-animate">
            {filteredMemories.map((memory) => (
              <ParticlesCard 
                key={memory.id} 
                className="h-full"
                particleCount={15}
                particleColors={[
                  "#9333ea", // Purple
                  "#a855f7", // Lighter purple
                  "#c084fc", // Lavender
                  "#d8b4fe", // Light lavender
                  "#8b5cf6", // Indigo/purple
                ]}
              >
                <Card
                  className="overflow-hidden transition-all duration-200 hover:shadow-xl border border-purple-300/40 dark:border-purple-700/25 rounded-lg bg-white/60 dark:bg-zinc-900/25 backdrop-blur-[2px] shadow-[0_0_15px_rgba(147,51,234,0.15)] hover:shadow-[0_0_20px_rgba(147,51,234,0.3)] pt-0 h-full flex flex-col min-h-0"
                >
                  {memory.aprovacao_usuario ? (
                    <div className="w-full bg-green-100/80 dark:bg-green-800/40 text-green-700 dark:text-green-300 py-1.5 text-center text-xs font-semibold z-10 flex items-center justify-center gap-1.5 border-b border-green-200 dark:border-green-700/60 rounded-t-lg overflow-hidden">
                      <BadgeCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      Approved memory
                    </div>
                  ) : (
                    <div className="w-full bg-amber-50/90 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 py-1.5 text-center text-xs font-semibold z-10 flex items-center justify-center gap-1.5 border-b border-amber-200 dark:border-amber-700/60 rounded-t-lg overflow-hidden">
                      <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      Pending your approval
                    </div>
                  )}

                  <CardContent className="px-4 pb-3 pt-0 flex-1 flex flex-col h-full">
                    <div className="flex flex-col">
                      {/* Memory Title - Removed */}
                      
                      {/* Memory Content */}
                      <div className="p-4 mb-3 flex justify-center items-center flex-1 min-h-[120px] overflow-auto">
                        <style dangerouslySetInnerHTML={{ __html: customStyles }} />
                        <div className="memory-text-wrapper" style={{ display: 'inline-block' }}>
                          <p className="text-base leading-relaxed whitespace-pre-wrap text-center max-w-full break-words tracking-wide">
                            <span className="memory-gradient">{memory.memoria}</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Memory Metadata */}
                      <div className="flex justify-between w-full bg-slate-50/70 dark:bg-slate-800/15 rounded-md p-2 mb-2 backdrop-blur-[1px] border border-slate-200/50 dark:border-slate-700/20">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">Memory Type</span>
                          <Badge className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 dark:bg-gray-800/20 dark:text-gray-300 font-semibold text-xs shadow-sm border border-indigo-100 dark:border-gray-700/20">
                            {memory.tipo_memoria ? memory.tipo_memoria.charAt(0).toUpperCase() + memory.tipo_memoria.slice(1) : "General"}
                          </Badge>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-slate-600 dark:text-slate-400 mb-1 font-medium">Created</span>
                          <span className="text-xs text-slate-700 dark:text-slate-400 font-medium bg-slate-100/80 dark:bg-slate-700/20 px-2 py-0.5 rounded-sm border border-slate-200 dark:border-gray-700/20">
                            {formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {memory.user_triggered && (
                      <div className="mb-2 flex justify-center">
                        <Badge variant="outline" className="text-xs text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700/50 bg-purple-50/80 dark:bg-transparent shadow-sm">
                          User requested
                        </Badge>
                      </div>
                    )}
                    
                    <div className="mt-2 flex justify-center gap-3">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-7 text-xs font-semibold shadow-sm hover:shadow-md transition-shadow py-0 text-red-600 dark:text-red-400 border-red-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-gray-800 hover:text-red-700 dark:hover:text-red-300"
                        onClick={() => {
                          setMemoryToDelete(memory.id)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        Delete Memory
                      </Button>
                      {!memory.aprovacao_usuario && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-7 text-xs font-semibold shadow-sm hover:shadow-md transition-shadow py-0 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-600/40 hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-800 dark:hover:text-purple-300"
                          onClick={() => approveMemory(memory.id)}
                        >
                          Approve Memory
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </ParticlesCard>
            ))}
          </div>
        )}
      </>

    </div>
  )
}

// Main page component that wraps MemoriesContent with Suspense
export default function MemoriesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading memories...</p>
        </div>
      </div>
    }>
      <MemoriesContent />
    </Suspense>
  )
}
