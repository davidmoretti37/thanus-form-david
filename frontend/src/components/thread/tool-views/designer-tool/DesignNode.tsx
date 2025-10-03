import React, { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useImageContent } from '@/hooks/react-query/files';
import { cn } from '@/lib/utils';

export interface DesignNodeData extends Record<string, unknown> {
  sandboxId: string;
  filePath: string;
  directUrl?: string;
  name: string;
  width: number;
  height: number;
  locked: boolean;
  onSelect: () => void;
}

interface DesignNodeProps {
  data: DesignNodeData;
  selected?: boolean;
}

export function DesignNode({ data, selected }: DesignNodeProps) {
  const [imageError, setImageError] = useState(false);
  
  const { data: imageUrl, isLoading, error } = useImageContent(
    data.sandboxId,
    data.filePath,
    { 
      enabled: !data.directUrl && !imageError
    }
  );

  const finalUrl = data.directUrl || imageUrl;

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-lg",
        selected && "ring-2 ring-purple-500",
        data.locked && "opacity-50 cursor-not-allowed"
      )}
      style={{
        width: `${data.width}px`,
        height: `${data.height}px`,
      }}
      onClick={() => data.onSelect()}
    >
      {!data.directUrl && isLoading && !finalUrl ? (
        <div className="flex items-center justify-center w-full h-full bg-muted/50">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !finalUrl || imageError || (!data.directUrl && error) ? (
        <div className="flex flex-col items-center justify-center w-full h-full bg-muted/50">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground text-center px-2">
            {data.name}
          </span>
        </div>
      ) : (
        <img
          src={finalUrl}
          alt={data.name}
          className="w-full h-full object-contain"
          draggable={false}
          onError={() => setImageError(true)}
          loading="eager"
        />
      )}
      
      {/* Handles for potential connections in the future */}
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500" />
    </div>
  );
}
