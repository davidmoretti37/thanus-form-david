import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';
import { Button } from './button';
import { Memory, approveMemory, deleteMemory } from '@/lib/actions/memories';
import { toast } from 'sonner';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { Separator } from './separator';
import { InfoIcon, Brain } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface MemoryApprovalModalProps {
  memory: Memory | null;
  isOpen: boolean;
  onClose: () => void;
  onApproved: () => void;
  memories?: Memory[];
}

export function MemoryApprovalModal({ memory, memories = [], isOpen, onClose, onApproved }: MemoryApprovalModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMemories, setSelectedMemories] = useState<Record<string, boolean>>({});
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Helper function to determine memory type label
  const getMemoryTypeLabel = (type: string) => {
    switch(type) {
      case 'preference': return 'Preference';
      case 'background': return 'Knowledge';
      case 'goal': return 'Goal';
      case 'constraint': return 'Constraint';
      default: return type;
    }
  };
  
  // Initialize selected memories when modal opens or memories change
  React.useEffect(() => {
    if (isOpen && memoriesToShow.length > 0) {
      // Initialize all memories with default selection (true)
      const initialSelection: Record<string, boolean> = {};
      memoriesToShow.forEach(mem => {
        initialSelection[mem.id] = true;
      });
      setSelectedMemories(initialSelection);
    }
  }, [isOpen, memories, memory]);

  const handleCheckboxChange = (memoryId: string) => {
    setSelectedMemories(prev => ({
      ...prev,
      [memoryId]: !prev[memoryId]
    }));
  };

  const handleSaveSelections = async () => {
    // Use memoriesToShow to ensure we process all memories
    if (memoriesToShow.length === 0) return;
    
    setIsLoading(true);
    try {
      // Process each memory based on selection
      const promises = memoriesToShow.map(async (mem) => {
        const isSelected = selectedMemories[mem.id] ?? false;
        
        if (isSelected) {
          // Approve selected memories
          console.log(`Approving memory: ${mem.id}`);
          return await approveMemory(mem.id);
        } else {
          // Delete unselected memories
          console.log(`Deleting memory: ${mem.id}`);
          return await deleteMemory(mem.id);
        }
      });
      
      const results = await Promise.all(promises);
      const allSuccessful = results.every(result => result === true);
      
      if (allSuccessful) {
        toast.success('Memories processed successfully');
        onApproved();
      } else {
        toast.error('Error processing some memories');
      }
    } catch (error) {
      console.error('Error processing memories:', error);
      toast.error('Error processing memories');
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  // Legacy handlers for backward compatibility
  const handleApprove = async () => {
    if (!memory) return;
    await handleSaveSelections();
  };

  const handleDelete = async () => {
    if (!memory) return;
    
    setIsLoading(true);
    try {
      const success = await deleteMemory(memory.id);
      if (success) {
        toast.success('Memória excluída com sucesso');
        onApproved(); // Refresh the list
      } else {
        toast.error('Falha ao excluir a memória');
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast.error('Erro ao excluir a memória');
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  if (!memory) return null;
  
  // Use the single memory if no memories array is provided
  const memoriesToShow = memories.length > 0 ? memories : [memory];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <InfoIcon className="h-5 w-5" />
            <DialogTitle>User Memories</DialogTitle>
          </div>
          <DialogDescription>
            The assistant detected important information about you. Select the memories you want to store to personalize your future interactions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 mb-2 text-sm text-center">
          <span>Select the memories you want to keep ({memoriesToShow.length} total)</span>
          <span className="block text-muted-foreground text-xs mt-1">Selected items will be saved, unselected will be deleted</span>
        </div>
        
        <Separator className="my-2" />
        
        <div className="py-2 max-h-[400px] overflow-y-auto">
          {memoriesToShow.map((mem) => (
            <div key={mem.id} className="mb-4 pb-4 border-b border-gray-200 last:border-0">
              <div className="flex items-start gap-4">
                <div className="flex h-full">
                  <div className="mt-[38px]">
                    <Checkbox 
                      id={`memory-${mem.id}`} 
                      checked={selectedMemories[mem.id] ?? false}
                      onCheckedChange={() => handleCheckboxChange(mem.id)}
                      className="h-5 w-5 border-2"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <Label 
                    htmlFor={`memory-${mem.id}`}
                    className="text-sm font-medium cursor-pointer block"
                  >
                    <div className="mb-2">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        {getMemoryTypeLabel(mem.tipo_memoria)}
                      </span>
                    </div>
                    <div className="bg-muted p-3 rounded-md text-sm">
                      {mem.memoria}
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <Separator className="my-2" />
        
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <a 
              href={`/memories?from=${encodeURIComponent(currentPath)}`} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => onClose()}
              className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-700 dark:hover:bg-purple-800 shadow-sm px-3 py-2 rounded-md text-sm font-medium"
            >
              <Brain className="h-4 w-4" />
              View My Memories
            </a>
            
            <div className="flex items-center gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading}
                size="sm"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSelections} 
                disabled={isLoading}
                size="sm"
              >
                Save Selected
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
