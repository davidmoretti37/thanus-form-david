import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ToolViewProps } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Film, Loader2, Clapperboard } from 'lucide-react';
import OpenCutEmbed from '@/components/opencut/OpenCutEmbed';

type VideoToolPayload = {
  success?: boolean;
  video_path?: string;
  video_url?: string;
  sandbox_id?: string;
  mode?: 'generate' | 'edit';
  model?: string;
  fal_video_url?: string;
  message?: string;
  original_video?: string;
  original_image?: string;
};

function safeParse(content?: string): any {
  if (!content) return {};
  try {
    return JSON.parse(content);
  } catch {
    // Some ToolResult outputs may not be pure JSON; attempt to extract trailing JSON block
    try {
      const firstBrace = content.indexOf('{');
      const lastBrace = content.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace >= 0 && lastBrace > firstBrace) {
        return JSON.parse(content.slice(firstBrace, lastBrace + 1));
      }
    } catch {
      // ignore
    }
  }
  return {};
}

function buildSandboxUrl(sandboxId?: string, path?: string): string | undefined {
  if (!sandboxId || !path) return undefined;
  let relativePath = path;
  if (relativePath.startsWith('/workspace/')) {
    relativePath = relativePath.substring('/workspace/'.length);
  } else if (relativePath.startsWith('/')) {
    relativePath = relativePath.substring(1);
  }
  return `/api/sandboxes/${sandboxId}/files?path=${encodeURIComponent(relativePath)}`;
}

export function VideoToolView({
  name = 'video_generate_or_edit',
  assistantContent,
  toolContent,
  isSuccess = true,
  isStreaming = false,
  project,
}: ToolViewProps) {
  const payload: VideoToolPayload = useMemo(() => {
    // Handle object-shaped toolContent directly
    if (toolContent && typeof toolContent === 'object') {
      const obj = toolContent as any;
      // try common nests
      const out = obj?.tool_execution?.result?.output ?? obj?.output ?? obj;
      if (typeof out === 'string') {
        const inner = safeParse(out);
        if (inner && typeof inner === 'object') return inner as VideoToolPayload;
      }
      if (out && typeof out === 'object') return out as VideoToolPayload;
    }
    // Fallback to string parsing
    const parsed = safeParse(typeof toolContent === 'string' ? toolContent : JSON.stringify(toolContent || {}));
    // unwrap output if present
    if (parsed && typeof parsed === 'object' && typeof parsed.output === 'string') {
      const inner = safeParse(parsed.output);
      if (inner && typeof inner === 'object') {
        return inner as VideoToolPayload;
      }
    }
    return parsed as VideoToolPayload;
  }, [toolContent]);

  // Track videos that have been added to the timeline
  const [addedVideos, setAddedVideos] = useState<string[]>([]);
  const lastProcessedUrl = useRef<string>('');
  
  const sandboxUrl = payload.video_url || buildSandboxUrl(payload.sandbox_id, payload.video_path);
  const displayUrl = sandboxUrl || payload.fal_video_url;

  const isEmbed = !!displayUrl && /(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com)/i.test(displayUrl);
  const isDirectVideo = !!displayUrl && /\.(mp4|webm|ogv|mov|avi|mkv)(\?|$)/i.test(displayUrl);

  // Automatically add new videos to the timeline
  useEffect(() => {
    if (!displayUrl || isStreaming) return;
    
    // Create a unique key for this video
    const videoKey = `${displayUrl}-${payload.mode || 'video'}`;
    
    // Skip if already processed
    if (lastProcessedUrl.current === videoKey) return;
    
    lastProcessedUrl.current = videoKey;
    
    console.log('VideoToolView: Adding video to timeline', {
      displayUrl,
      sandboxUrl,
      falUrl: payload.fal_video_url,
      mode: payload.mode,
      payload: payload
    });
    
    // Add to the list of videos in the timeline
    setAddedVideos(prev => {
      const urls: string[] = [];
      
      // Priority: Use Fal URL first (direct from generation), then sandbox URL
      if (payload.fal_video_url && !prev.includes(payload.fal_video_url)) {
        console.log('VideoToolView: Adding Fal video URL:', payload.fal_video_url);
        urls.push(payload.fal_video_url);
      }
      
      if (sandboxUrl && !prev.includes(sandboxUrl)) {
        console.log('VideoToolView: Adding sandbox video URL:', sandboxUrl);
        urls.push(sandboxUrl);
      }
      
      // Filter out duplicates and empty values
      const newUrls = Array.from(new Set([...prev, ...urls].filter(Boolean)));
      console.log('VideoToolView: Total videos in timeline:', newUrls);
      return newUrls;
    });
  }, [displayUrl, sandboxUrl, payload.fal_video_url, payload.mode, isStreaming]);
  
  // Build list of URLs to display in OpenCut timeline
  const mediaUrls = useMemo(() => {
    return addedVideos;
  }, [addedVideos]);

  const handleDownload = () => {
    if (!sandboxUrl) return;
    const link = document.createElement('a');
    link.href = sandboxUrl;
    const fileName =
      (payload.video_path?.split('/').pop()) ||
      `video_${payload.mode || 'output'}.mp4`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="gap-0 flex border shadow-none border-t border-b-0 border-x-0 p-0 rounded-none flex-col h-full overflow-hidden bg-card">
      <CardHeader className="h-16 border-b p-3 px-4">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20">
              <Film className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Video Output
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {payload.mode && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {payload.mode}
                  </Badge>
                )}
                {payload.model && (
                  <Badge variant="outline" className="text-xs">
                    {payload.model}
                  </Badge>
                )}
                {isSuccess && payload.success && (
                  <Badge className="text-xs bg-emerald-600 text-white">Success</Badge>
                )}
                {!payload.success && (
                  <Badge className="text-xs bg-rose-600 text-white">Failed</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              disabled={!sandboxUrl}
              className="h-8"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex relative">
        <div className="w-full h-full bg-zinc-50 dark:bg-zinc-950 flex items-stretch justify-center">
          {/* Always show OpenCut embed - videos will be added when ready */}
          <OpenCutEmbed 
            mediaUrls={mediaUrls} 
            className="w-full" 
            height="70vh"
            onReady={() => {
              console.log('VideoToolView: OpenCut is ready');
            }}
          />
          
          {/* Overlay when generating */}
          {isStreaming && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
              <div className="bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <div className="text-center">
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    Generating Video
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {payload.mode === 'edit' ? 'Editing video' : 'Creating video from prompt'}...
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Overlay when waiting for first video */}
          {!isStreaming && mediaUrls.length === 0 && !payload.fal_video_url && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center mb-4 mx-auto">
                  <Clapperboard className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Video Timeline
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Generated videos will appear in the timeline automatically
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {payload.message && (
        <div className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800">
          {payload.message}
          {payload.fal_video_url && (
            <>
              {' '}
              <a
                href={payload.fal_video_url}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Open Fal URL
              </a>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

export default VideoToolView;
