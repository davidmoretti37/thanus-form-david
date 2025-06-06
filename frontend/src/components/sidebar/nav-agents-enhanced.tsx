'use client';

import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Link as LinkIcon,
  MoreHorizontal,
  Trash2,
  Plus,
  MessagesSquare,
  Loader2,
  Share2,
  X,
  Check,
  History,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Edit2,
  FolderPlus
} from "lucide-react"
import { toast } from "sonner"
import { usePathname, useRouter } from "next/navigation"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShareModal } from "./share-modal"
import { DeleteConfirmationDialog } from "@/components/thread/DeleteConfirmationDialog"
import { useDeleteOperation } from '@/contexts/DeleteOperationContext'
import { Checkbox } from "@/components/ui/checkbox"
import { ThreadWithProject } from '@/hooks/react-query/sidebar/use-sidebar';
import { processThreadsWithProjects, useDeleteMultipleThreads, useDeleteThread, useProjects, useThreads } from '@/hooks/react-query/sidebar/use-sidebar';
import { projectKeys, threadKeys } from '@/hooks/react-query/sidebar/keys';

// Types
interface Folder {
  id: string;
  name: string;
  isExpanded: boolean;
  threadIds: string[];
}

interface ThreadItem extends ThreadWithProject {
  folderId?: string;
}

// Draggable Thread Component
function DraggableThread({ 
  thread, 
  isActive, 
  isLoading, 
  isSelected, 
  onSelect, 
  onMenuAction,
  handleThreadClick,
  isCollapsed = false
}: {
  thread: ThreadItem;
  isActive: boolean;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: (threadId: string, e?: React.MouseEvent) => void;
  onMenuAction: (action: string, thread: ThreadItem) => void;
  handleThreadClick: (e: React.MouseEvent<HTMLAnchorElement>, threadId: string, url: string) => void;
  isCollapsed?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: thread.threadId,
    data: {
      type: 'thread',
      thread,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <SidebarMenuItem ref={setNodeRef} style={style} className="group">
      <SidebarMenuButton
        asChild
        className={`relative cursor-pointer ${isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : isSelected && !isCollapsed
            ? 'bg-primary/10'
            : ''
          }`}
      >
        <Link
          href={thread.url}
          onClick={(e) => handleThreadClick(e, thread.threadId, thread.url)}
          className="flex items-center"
          {...attributes}
          {...listeners}
        >
          <div className="flex items-center group/icon relative">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isCollapsed ? (
              // When collapsed, only show MessagesSquare icon
              <MessagesSquare className="h-4 w-4" />
            ) : (
              <>
                <MessagesSquare
                  className={`h-4 w-4 transition-opacity duration-150 ${isSelected ? 'opacity-0' : 'opacity-100 group-hover/icon:opacity-0'
                    }`}
                />
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${isSelected
                    ? 'opacity-100'
                    : 'opacity-0 group-hover/icon:opacity-100'
                    }`}
                  onClick={(e) => onSelect(thread.threadId, e)}
                >
                  <div
                    className={`h-4 w-4 border rounded cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-center ${isSelected
                      ? 'bg-primary border-primary'
                      : 'border-muted-foreground/30 bg-background'
                      }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                </div>
              </>
            )}
          </div>
          <span className="ml-2">{thread.projectName}</span>
        </Link>
      </SidebarMenuButton>
      {!isSelected && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover className="group-hover:opacity-100">
              <MoreHorizontal />
              <span className="sr-only">More</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-lg" side="right" align="start">
            <DropdownMenuItem onClick={() => onMenuAction('share', thread)}>
              <Share2 className="text-muted-foreground" />
              <span>Share Chat</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={thread.url} target="_blank" rel="noopener noreferrer">
                <ArrowUpRight className="text-muted-foreground" />
                <span>Open in New Tab</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onMenuAction('delete', thread)}>
              <Trash2 className="text-muted-foreground" />
              <span>Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
}

// Droppable Folder Component
function DroppableFolder({ 
  folder, 
  threads, 
  onToggle, 
  onRename, 
  onDelete,
  children,
  isCollapsed = false
}: {
  folder: Folder;
  threads: ThreadItem[];
  onToggle: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  onDelete: (folderId: string) => void;
  children: React.ReactNode;
  isCollapsed?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const { setNodeRef } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
      folder,
    },
  });

  const handleRename = () => {
    if (editName.trim() && editName !== folder.name) {
      onRename(folder.id, editName.trim());
    }
    setIsEditing(false);
  };

  const folderThreads = threads.filter(t => t.folderId === folder.id);

  // When collapsed, show only the folder icon - clean and simple
  if (isCollapsed) {
    return (
      <SidebarMenuItem ref={setNodeRef}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton
              onClick={() => onToggle(folder.id)}
            >
              {folder.isExpanded ? (
                <FolderOpen className="h-4 w-4 text-fuchsia-700" />
              ) : (
                <Folder className="h-4 w-4 text-fuchsia-700" />
              )}
            </SidebarMenuButton>
          </TooltipTrigger>
          <TooltipContent side="right">
            {folder.name} ({folderThreads.length})
          </TooltipContent>
        </Tooltip>
        {/* No children/threads visible when collapsed */}
      </SidebarMenuItem>
    );
  }

  // Expanded view - entire folder area is droppable
  return (
    <div className="mb-2">
      <div 
        ref={setNodeRef}
        className="flex items-center group min-h-[32px] p-1 rounded transition-colors hover:bg-accent/50"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggle(folder.id)}
          className="h-6 w-6 p-0 mr-1"
        >
          {folder.isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>
        
        {folder.isExpanded ? (
          <FolderOpen className="h-4 w-4 mr-2 text-fuchsia-700" />
        ) : (
          <Folder className="h-4 w-4 mr-2 text-fuchsia-700" />
        )}
        
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setIsEditing(false);
                setEditName(folder.name);
              }
            }}
            className="h-6 text-sm flex-1"
            autoFocus
          />
        ) : (
          <span 
            className="text-sm font-medium flex-1 cursor-pointer"
            onClick={() => onToggle(folder.id)}
          >
            {folder.name} ({folderThreads.length})
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(folder.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {folder.isExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function NavAgentsEnhanced() {
  const { isMobile, state } = useSidebar();
  const [loadingThreadId, setLoadingThreadId] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ threadId: string, projectId: string } | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<{ id: string; name: string } | null>(null);
  const isNavigatingRef = useRef(false);
  const { performDelete } = useDeleteOperation();
  const isPerformingActionRef = useRef(false);
  const queryClient = useQueryClient();

  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(new Set());
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [totalToDelete, setTotalToDelete] = useState(0);

  // Folder management state with persistence
  const [folders, setFolders] = useState<Folder[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-folders');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fall back to default if parsing fails
        }
      }
    }
    return [
      { id: 'folder-1', name: 'Personal', isExpanded: true, threadIds: [] },
      { id: 'folder-2', name: 'Work', isExpanded: true, threadIds: [] }
    ];
  });
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Thread to folder mapping with persistence
  const [threadFolderMap, setThreadFolderMap] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-thread-folder-map');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fall back to empty object if parsing fails
        }
      }
    }
    return {};
  });

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<ThreadItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Persist folders to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-folders', JSON.stringify(folders));
    }
  }, [folders]);

  // Persist threadFolderMap to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-thread-folder-map', JSON.stringify(threadFolderMap));
    }
  }, [threadFolderMap]);

  // Reset loading state when pathname changes
  useEffect(() => {
    setLoadingThreadId(null);
  }, [pathname]);

  const {
    data: projects = [],
    isLoading: isProjectsLoading,
    error: projectsError
  } = useProjects();

  const {
    data: threads = [],
    isLoading: isThreadsLoading,
    error: threadsError
  } = useThreads();

  const { mutate: deleteThreadMutation, isPending: isDeletingSingle } = useDeleteThread();
  const {
    mutate: deleteMultipleThreadsMutation,
    isPending: isDeletingMultiple
  } = useDeleteMultipleThreads();

  const combinedThreads: ThreadItem[] =
    !isProjectsLoading && !isThreadsLoading ?
      processThreadsWithProjects(threads, projects).map(thread => ({
        ...thread,
        folderId: threadFolderMap[thread.threadId] // Use mapping to determine folder
      })) : [];

  // Organize threads by folders
  const unorganizedThreads = combinedThreads.filter(t => !t.folderId);
  const folderThreads = (folderId: string) => 
    combinedThreads.filter(t => t.folderId === folderId);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag started:', event.active.id);
    setActiveId(event.active.id as string);
    const thread = combinedThreads.find(t => t.threadId === event.active.id);
    setDraggedItem(thread || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag ended:', { activeId: active.id, overId: over?.id, overData: over?.data.current });
    
    if (!over) {
      setActiveId(null);
      setDraggedItem(null);
      return;
    }

    const activeThreadId = active.id as string;
    const activeThread = combinedThreads.find(t => t.threadId === activeThreadId);
    if (!activeThread) {
      console.log('Active thread not found');
      return;
    }

    // Check if dropped over a folder
    if (over.data.current?.type === 'folder') {
      const folderId = over.id as string;
      const currentFolderId = threadFolderMap[activeThreadId];
      
      console.log('Dropped over folder:', { folderId, currentFolderId });
      
      // Don't do anything if already in the same folder
      if (currentFolderId === folderId) {
        setActiveId(null);
        setDraggedItem(null);
        return;
      }
      
      // Expand the target folder if it's closed
      setFolders(prev => prev.map(f => 
        f.id === folderId ? { ...f, isExpanded: true } : f
      ));
      
      // Update thread to folder mapping
      setThreadFolderMap(prev => ({
        ...prev,
        [activeThreadId]: folderId
      }));
      
      // Update folder's threadIds
      setFolders(prev => prev.map(f => {
        if (f.id === folderId) {
          // Add thread to target folder if not already there
          return {
            ...f,
            threadIds: f.threadIds.includes(activeThreadId) 
              ? f.threadIds 
              : [...f.threadIds, activeThreadId]
          };
        } else {
          // Remove thread from other folders
          return {
            ...f,
            threadIds: f.threadIds.filter(id => id !== activeThreadId)
          };
        }
      }));

      const folderName = folders.find(f => f.id === folderId)?.name || 'folder';
      toast.success(`Moved "${activeThread.projectName}" to ${folderName}`);
    } else {
      console.log('Not dropped over a folder');
    }

    setActiveId(null);
    setDraggedItem(null);
  };

  // Folder management functions
  const createFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      isExpanded: true,
      threadIds: []
    };
    
    setFolders(prev => [...prev, newFolder]);
    setNewFolderName('');
    setIsCreatingFolder(false);
    toast.success(`Created folder "${newFolder.name}"`);
  };

  const toggleFolder = (folderId: string) => {
    setFolders(prev => prev.map(f => 
      f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f
    ));
  };

  const renameFolder = (folderId: string, newName: string) => {
    setFolders(prev => prev.map(f => 
      f.id === folderId ? { ...f, name: newName } : f
    ));
    toast.success('Folder renamed');
  };

  const deleteFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;

    // Remove threads from the folder mapping
    setThreadFolderMap(prev => {
      const newMap = { ...prev };
      Object.keys(newMap).forEach(threadId => {
        if (newMap[threadId] === folderId) {
          delete newMap[threadId];
        }
      });
      return newMap;
    });

    setFolders(prev => prev.filter(f => f.id !== folderId));
    toast.success(`Deleted folder "${folder.name}"`);
  };

  // Existing thread management functions (simplified for brevity)
  const handleThreadClick = (e: React.MouseEvent<HTMLAnchorElement>, threadId: string, url: string) => {
    // Don't prevent navigation if this is a normal click (not in selection mode)
    if (selectedThreads.has(threadId)) {
      e.preventDefault();
      return;
    }
    
    // Check if this was triggered by drag and drop
    if (e.defaultPrevented) {
      return;
    }
    
    e.preventDefault();
    setLoadingThreadId(threadId);
    router.push(url);
  };

  const toggleThreadSelection = (threadId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedThreads(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(threadId)) {
        newSelection.delete(threadId);
      } else {
        newSelection.add(threadId);
      }
      return newSelection;
    });
  };

  const handleMenuAction = (action: string, thread: ThreadItem) => {
    switch (action) {
      case 'share':
        setSelectedItem({ threadId: thread.threadId, projectId: thread.projectId });
        setShowShareModal(true);
        break;
      case 'delete':
        setThreadToDelete({ id: thread.threadId, name: thread.projectName });
        setIsDeleteDialogOpen(true);
        break;
    }
  };

  const handleDeleteConfirm = () => {
    if (threadToDelete) {
      deleteThreadMutation({ threadId: threadToDelete.id }, {
        onSuccess: () => {
          toast.success(`Thread "${threadToDelete.name}" deleted successfully`);
          setIsDeleteDialogOpen(false);
          setThreadToDelete(null);
        },
        onError: (error) => {
          toast.error(`Failed to delete thread: ${error.message}`);
        }
      });
    }
  };

  const handleDeleteMultiple = () => {
    if (selectedThreads.size === 0) return;
    
    const threadIds = Array.from(selectedThreads);
    setTotalToDelete(threadIds.length);
    setDeleteProgress(0);

    deleteMultipleThreadsMutation({ threadIds }, {
      onSuccess: () => {
        toast.success(`${threadIds.length} threads deleted successfully`);
        setSelectedThreads(new Set());
        setDeleteProgress(0);
        setTotalToDelete(0);
      },
      onError: (error) => {
        toast.error(`Failed to delete threads: ${error.message}`);
        setDeleteProgress(0);
        setTotalToDelete(0);
      }
    });
  };

  // Rest of the component logic remains the same as original...
  const isLoading = isProjectsLoading || isThreadsLoading;
  const hasError = projectsError || threadsError;

  if (hasError) {
    console.error('Error loading data:', { projectsError, threadsError });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Folders Section */}
      <SidebarGroup>
        <div className="flex justify-between items-center">
          <SidebarGroupLabel>Folders</SidebarGroupLabel>
          {state !== 'collapsed' && (
            <div className="flex items-center space-x-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCreatingFolder(true)}
                    className="h-7 w-7"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Folder</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* New Folder Creation */}
        {isCreatingFolder && (
          <div className="mb-2 flex items-center space-x-2">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="h-7 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') createFolder();
                if (e.key === 'Escape') {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }
              }}
              autoFocus
            />
            <Button size="sm" onClick={createFolder} className="h-7">
              <Check className="h-3 w-3" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
              }}
              className="h-7"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <SidebarMenu>
          {isLoading ? (
            // Loading skeleton for folders
            Array.from({ length: 2 }).map((_, index) => (
              <SidebarMenuItem key={`folder-skeleton-${index}`}>
                <div className="flex items-center">
                  <div className="h-4 w-4 bg-sidebar-foreground/10 rounded-md animate-pulse mr-2"></div>
                  <div className="h-3 bg-sidebar-foreground/10 rounded w-1/2 animate-pulse"></div>
                </div>
              </SidebarMenuItem>
            ))
          ) : (
            // Render Folders
            folders.map(folder => (
              <DroppableFolder
                key={folder.id}
                folder={folder}
                threads={combinedThreads}
                onToggle={toggleFolder}
                onRename={renameFolder}
                onDelete={deleteFolder}
                isCollapsed={state === 'collapsed'}
              >
                <SortableContext
                  items={folderThreads(folder.id).map(t => t.threadId)}
                  strategy={verticalListSortingStrategy}
                >
                  {folderThreads(folder.id).map(thread => {
                    const isActive = pathname?.includes(thread.threadId) || false;
                    const isThreadLoading = loadingThreadId === thread.threadId;
                    const isSelected = selectedThreads.has(thread.threadId);

                    return (
                      <DraggableThread
                        key={thread.threadId}
                        thread={thread}
                        isActive={isActive}
                        isLoading={isThreadLoading}
                        isSelected={isSelected}
                        onSelect={toggleThreadSelection}
                        onMenuAction={handleMenuAction}
                        handleThreadClick={handleThreadClick}
                        isCollapsed={state === 'collapsed'}
                      />
                    );
                  })}
                </SortableContext>
              </DroppableFolder>
            ))
          )}
        </SidebarMenu>
      </SidebarGroup>

      {/* Tasks Section */}
      <SidebarGroup>
        <div className="flex justify-between items-center">
          <SidebarGroupLabel>Tasks</SidebarGroupLabel>
          {state !== 'collapsed' && (
            <div className="flex items-center space-x-1">
              {selectedThreads.size > 0 ? (
                <>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedThreads(new Set())} className="h-7 w-7">
                    <X className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleDeleteMultiple} className="h-7 w-7 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/dashboard"
                      className="text-muted-foreground hover:text-foreground h-7 w-7 flex items-center justify-center rounded-md"
                    >
                      <Plus className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>New Agent</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        <SidebarMenu className="overflow-y-auto max-h-[calc(100vh-300px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {isLoading ? (
            // Loading skeleton for tasks
            Array.from({ length: 3 }).map((_, index) => (
              <SidebarMenuItem key={`task-skeleton-${index}`}>
                <SidebarMenuButton>
                  <div className="h-4 w-4 bg-sidebar-foreground/10 rounded-md animate-pulse"></div>
                  <div className="h-3 bg-sidebar-foreground/10 rounded w-3/4 animate-pulse"></div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          ) : unorganizedThreads.length > 0 ? (
            <SortableContext
              items={unorganizedThreads.map(t => t.threadId)}
              strategy={verticalListSortingStrategy}
            >
              {unorganizedThreads.map(thread => {
                const isActive = pathname?.includes(thread.threadId) || false;
                const isThreadLoading = loadingThreadId === thread.threadId;
                const isSelected = selectedThreads.has(thread.threadId);

                return (
                  <DraggableThread
                    key={thread.threadId}
                    thread={thread}
                    isActive={isActive}
                    isLoading={isThreadLoading}
                    isSelected={isSelected}
                    onSelect={toggleThreadSelection}
                    onMenuAction={handleMenuAction}
                    handleThreadClick={handleThreadClick}
                    isCollapsed={state === 'collapsed'}
                  />
                );
              })}
            </SortableContext>
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton className="text-sidebar-foreground/70">
                <MessagesSquare className="h-4 w-4" />
                <span>No tasks yet</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroup>

      <DragOverlay>
        {activeId && draggedItem ? (
          <div className="bg-background border rounded p-2 shadow-lg">
            <div className="flex items-center">
              <MessagesSquare className="h-4 w-4 mr-2" />
              <span className="text-sm">{draggedItem.projectName}</span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
      {/* Modals and dialogs */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        threadId={selectedItem?.threadId}
        projectId={selectedItem?.projectId}
      />

      {threadToDelete && (
        <DeleteConfirmationDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirm}
          threadName={threadToDelete.name}
          isDeleting={isDeletingSingle || isDeletingMultiple}
        />
      )}
    </DndContext>
  );
}