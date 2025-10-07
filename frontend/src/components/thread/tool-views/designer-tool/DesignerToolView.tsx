import React, { useState, useRef, useEffect } from 'react';
import {
  Palette,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Download,
  Grid,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { ToolViewProps } from '../types';
import { formatTimestamp } from '../utils';
import { extractDesignerData } from './_utils';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DesignNode, DesignNodeData } from './DesignNode';

interface DesignerToolViewProps extends ToolViewProps {
  onFileClick?: (filePath: string) => void;
}

const nodeTypes = {
  designNode: DesignNode,
};

export function DesignerToolView({
  name = 'designer_create_or_edit',
  assistantContent,
  toolContent,
  assistantTimestamp,
  toolTimestamp,
  isSuccess = true,
  isStreaming = false,
  onFileClick,
  project,
}: DesignerToolViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DesignNodeData>>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const lastProcessedPath = useRef<string>('');

  const {
    mode,
    prompt,
    designStyle,
    platformPreset,
    width,
    height,
    quality,
    imagePath,
    generatedImagePath,
    designUrl,
    status,
    error,
    actualIsSuccess,
    actualToolTimestamp,
    actualAssistantTimestamp,
    sandbox_id,
  } = extractDesignerData(
    assistantContent,
    toolContent,
    isSuccess,
    toolTimestamp,
    assistantTimestamp
  );

  useEffect(() => {
    if (generatedImagePath && !isStreaming) {
      const sandboxId = sandbox_id || project?.sandbox?.id || project?.id;
      
      if (!sandboxId) {
        console.warn('Designer Tool: No sandbox ID available', { sandbox_id, project });
        return;
      }
      
      let relativePath = generatedImagePath;
      if (relativePath.startsWith('/workspace/')) {
        relativePath = relativePath.substring('/workspace/'.length);
      } else if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1);
      }
      
      // Create a unique key based on the generated content, not nodes
      const contentKey = `${sandboxId}-${relativePath}-${designUrl || ''}`;
      
      if (lastProcessedPath.current === contentKey) {
        console.log('Designer Tool: Skipping duplicate content', contentKey);
        return;
      }
      
      lastProcessedPath.current = contentKey;
      const elementId = `design-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Designer Tool: Adding node to canvas', {
        elementId,
        sandboxId,
        relativePath,
        designUrl,
        width,
        height,
      });
      
      // Calculate position for new node - use a callback to get latest nodes
      setNodes((currentNodes) => {
        let x = 100;
        let y = 100;
        
        if (currentNodes.length > 0) {
          const rightmostNode = currentNodes.reduce((rightmost, node) => {
            const rightmostRight = rightmost.position.x + (rightmost.data.width || 400);
            const currentRight = node.position.x + (node.data.width || 400);
            return currentRight > rightmostRight ? node : rightmost;
          }, currentNodes[0]);
          
          x = rightmostNode.position.x + (rightmostNode.data.width || 400) + 50;
          y = rightmostNode.position.y;
        }
        
        // Compute display size snapped to supported ratios (9:16, 1:1, 4:5)
        const naturalW = width || 512;
        const naturalH = height || 512;
        const aspect = naturalW / naturalH;
        const candidates = [9 / 16, 1, 4 / 5];
        let target = candidates[0];
        let minDiff = Math.abs(aspect - target);
        for (const r of candidates) {
          const d = Math.abs(aspect - r);
          if (d < minDiff) {
            minDiff = d;
            target = r;
          }
        }
        const MAX_DISPLAY_SIZE = 600;
        let displayWidth = 0;
        let displayHeight = 0;
        if (target <= 1) {
          // Portrait or square: fix height
          displayHeight = MAX_DISPLAY_SIZE;
          displayWidth = Math.round(MAX_DISPLAY_SIZE * target);
        } else {
          // Landscape (fallback)
          displayWidth = MAX_DISPLAY_SIZE;
          displayHeight = Math.round(MAX_DISPLAY_SIZE / target);
        }
        
        const newNode: Node<DesignNodeData> = {
          id: elementId,
          type: 'designNode',
          position: { x, y },
          data: {
            sandboxId: sandboxId,
            filePath: relativePath,
            directUrl: designUrl,
            name: relativePath.split('/').pop() || 'design',
            width: Math.round(displayWidth),
            height: Math.round(displayHeight),
            locked: false,
            onSelect: () => setSelectedNodeId(elementId),
            onResize: (size) => {
              setNodes((ns) =>
                ns.map((n) =>
                  n.id === elementId
                    ? { ...n, data: { ...n.data, width: size.width, height: size.height } }
                    : n
                )
              );
            },
          },
        };
        
        return [...currentNodes, newNode];
      });
      
      setSelectedNodeId(elementId);
    }
  }, [generatedImagePath, designUrl, sandbox_id, project, width, height, isStreaming, setNodes]);

  const handleDownload = () => {
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (node?.data.directUrl || node?.data.filePath) {
      const link = document.createElement('a');
      link.href = node.data.directUrl || `/api/sandboxes/${node.data.sandboxId}/files?path=${encodeURIComponent(node.data.filePath)}`;
      link.download = node.data.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className="gap-0 flex border shadow-none border-t border-b-0 border-x-0 p-0 rounded-none flex-col h-full overflow-hidden bg-card">
      <CardHeader className="h-16 border-b p-3 px-4">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20">
              <Palette className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Designer Canvas
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {platformPreset && platformPreset !== 'custom' && (
                  <Badge variant="secondary" className="text-xs">
                    {platformPreset.replace(/_/g, ' ')}
                  </Badge>
                )}
                {designStyle && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {designStyle}
                  </Badge>
                )}
                {width && height && (
                  <Badge variant="outline" className="text-xs">
                    {width}×{height}px
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <div className="flex items-center gap-1 bg-background/80 rounded-lg p-1 border">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Toggle
                      pressed={showGrid}
                      onPressedChange={setShowGrid}
                      className="h-8 w-8 data-[state=on]:bg-purple-100 dark:data-[state=on]:bg-purple-900/50"
                    >
                      <Grid className="h-4 w-4" />
                    </Toggle>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Grid</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDownload}
                      disabled={!selectedNodeId}
                      className="h-8 w-8"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export Selected</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            {!isStreaming && generatedImagePath && (
              <Badge
                className={cn(
                  "px-3",
                  actualIsSuccess
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                    : "bg-gradient-to-r from-rose-500 to-rose-600 text-white"
                )}
              >
                {actualIsSuccess ? (
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                )}
                {actualIsSuccess ? 'Ready' : 'Failed'}
              </Badge>
            )}
            
            {!isStreaming && !generatedImagePath && error && (
              <Badge className="px-3 bg-gradient-to-r from-rose-500 to-rose-600 text-white">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Failed
              </Badge>
            )}

            {isStreaming && (
              <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                Creating Design
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex">
        <div className="flex flex-1">
          <div className="flex-1 relative bg-zinc-50 dark:bg-zinc-950">
            <style>{`
              .react-flow__attribution {
                display: none !important;
              }
            `}</style>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.1}
              maxZoom={4}
              defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            >
              {showGrid && <Background />}
              <Controls />
              
              {nodes.length === 0 && !isStreaming && (
                <Panel position="top-center" className="pointer-events-none">
                  <div className="flex flex-col items-center justify-center text-center mt-20">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 flex items-center justify-center mb-4">
                      <Sparkles className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Professional Design Canvas
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Designs will appear here. Use mouse wheel to zoom, drag to pan.
                    </p>
                  </div>
                </Panel>
              )}
              
              {isStreaming && (
                <Panel position="top-center" className="pointer-events-none">
                  <div className="flex flex-col items-center justify-center text-center mt-20">
                    <Loader2 className="h-10 w-10 text-purple-600 dark:text-purple-400 animate-spin mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Generating Design
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Creating your {platformPreset?.replace(/_/g, ' ')} design...
                    </p>
                  </div>
                </Panel>
              )}
            </ReactFlow>

          </div>
        </div>
      </CardContent>
      
      <div className="px-4 py-2 h-10 bg-gradient-to-r from-zinc-50/90 to-zinc-100/90 dark:from-zinc-900/90 dark:to-zinc-800/90 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Badge className="h-6 py-0.5" variant="outline">
            <Wand2 className="h-3 w-3 mr-1" />
            Canvas
          </Badge>
          {nodes.length > 0 && (
            <Badge variant="secondary" className="h-6 py-0.5">
              {nodes.length} Artboard{nodes.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {selectedNodeId && (() => {
            const node = nodes.find((n) => n.id === selectedNodeId);
            return node ? (
              <Badge variant="secondary" className="h-6 py-0.5">
                {node.data.name}
              </Badge>
            ) : null;
          })()}
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {actualAssistantTimestamp ? formatTimestamp(actualAssistantTimestamp) : ''}
        </div>
      </div>
    </Card>
  );
}
