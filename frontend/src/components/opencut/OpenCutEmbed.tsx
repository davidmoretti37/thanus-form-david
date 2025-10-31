'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type OpenCutEmbedProps = {
  // Absolute or sandbox URLs to import into the editor timeline
  mediaUrls: string[];
  // Optional: when the editor signals it's ready
  onReady?: () => void;
  // Optional: custom source for the embedded editor
  src?: string;
  // Optional: className passthrough
  className?: string;
  // Optional: height (default: 70vh)
  height?: string | number;
  // Make desktop editor usable on small screens by scaling down
  responsive?: boolean;
};

type OpenCutOutgoing =
  | { type: 'opencut:handshake'; version: 1 }
  | { type: 'opencut:import'; clips: { url: string; start?: number; track?: number }[] }
  | { type: 'opencut:ping' };

type OpenCutIncoming =
  | { type: 'opencut:ready' }
  | { type: 'opencut:import:ack'; imported: number }
  | { type: 'opencut:error'; message?: string }
  | { type: 'opencut:pong' }
  | Record<string, unknown>;

// Basic, forward-compatible protocol spec:
// - We send: handshake → wait for "ready" → send "import" with clips
// - The embedded app should implement a window message listener to receive these events.
// - If the embedded app is not same-origin, postMessage still works, but the target must also listen.

export function OpenCutEmbed({
  mediaUrls,
  onReady,
  src,
  className,
  height = '70vh',
  responsive = true,
}: OpenCutEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasHandshake, setHasHandshake] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const editorSrc = useMemo(() => {
    // For embedded use, we need to point directly to the OpenCut iframe endpoint
    // which serves just the editor without any wrapper UI
    // Using the environment variable or fallback to remote OpenCut
    const baseUrl = src ||
      process.env.NEXT_PUBLIC_OPENCUT_URL ||
      'https://opencut.app';
    
    // If it's a localhost URL, assume it's the local OpenCut build
    // and just return it as-is (it will show the editor directly)
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      return baseUrl;
    }
    
    // For remote OpenCut, go to projects page
    // (we can't create new projects on remote without their API)
    return `${baseUrl}/projects`;
  }, [src]);

  const postToEditor = useCallback((msg: OpenCutOutgoing) => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow) return;
    // Use wildcard targetOrigin for flexibility; if you host OpenCut same-origin, you can replace with location.origin
    iframe.contentWindow.postMessage(msg, '*');
  }, []);

  // Handshake once iframe loads
  const handleLoad = useCallback(() => {
    // Initiate handshake
    postToEditor({ type: 'opencut:handshake', version: 1 });
    setHasHandshake(true);
  }, [postToEditor]);

  // Listen for messages from the embedded editor
  useEffect(() => {
    const onMessage = (evt: MessageEvent<OpenCutIncoming>) => {
      const data = evt.data as OpenCutIncoming;
      if (!data || typeof data !== 'object') return;

      switch ((data as any).type) {
        case 'opencut:ready':
          setIsReady(true);
          onReady?.();
          break;
        case 'opencut:import:ack':
          // We could surface telemetry or notifications here
          break;
        case 'opencut:error':
          // eslint-disable-next-line no-console
          console.warn('[OpenCutEmbed] error from editor:', (data as any).message);
          break;
        case 'opencut:pong':
          break;
        default:
          // ignore unknown messages
          break;
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onReady]);

  // When the editor becomes ready and we have media URLs, push them into timeline
  useEffect(() => {
    console.log('[OpenCutEmbed] Effect triggered:', { isReady, mediaUrls });
    
    if (!isReady) {
      console.log('[OpenCutEmbed] Not ready yet, waiting...');
      return;
    }
    
    if (!mediaUrls || mediaUrls.length === 0) {
      console.log('[OpenCutEmbed] No media URLs to import');
      return;
    }

    // Build clips payload with default placement: start at 0s, track 1 (the app can place intelligently)
    const unique = Array.from(new Set(mediaUrls.filter(Boolean)));
    if (unique.length === 0) {
      console.log('[OpenCutEmbed] No unique URLs after filtering');
      return;
    }

    const clipsToImport = unique.map((url) => ({ url, start: 0, track: 1 }));
    console.log('[OpenCutEmbed] Sending import message to OpenCut:', clipsToImport);
    
    postToEditor({
      type: 'opencut:import',
      clips: clipsToImport,
    });
  }, [isReady, mediaUrls, postToEditor]);

  // Optionally ping while waiting for ready (robustness)
  useEffect(() => {
    if (!hasHandshake || isReady) return;
    const id = setInterval(() => postToEditor({ type: 'opencut:ping' }), 2000);
    return () => clearInterval(id);
  }, [hasHandshake, isReady, postToEditor]);

  // Observe container width for responsive scaling
  useEffect(() => {
    if (!responsive) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width) setContainerWidth(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [responsive]);

  // Desktop base size for OpenCut UI
  const baseWidth = 1280;
  const baseHeight = 720 + 120; // timeline + toolbars room
  const [manualScale, setManualScale] = useState<number | null>(null);
  const autoScale = responsive && containerWidth > 0 ? Math.min(1, containerWidth / baseWidth) : 1;
  // Solo mode: scale to fit approx one editor column into viewport
  const [solo, setSolo] = useState<boolean>(true);
  const panelApprox = 360;
  const soloScale = responsive && containerWidth > 0 ? Math.min(1.25, Math.max(0.6, containerWidth / panelApprox)) : autoScale;
  const scale = manualScale ?? (solo ? soloScale : autoScale);
  const scaledHeight = responsive ? Math.round(baseHeight * scale) : undefined;
  const [section, setSection] = useState<'tools' | 'canvas' | 'props'>('canvas');

  // Estimate panel centers (in editor pixels)
  const centers = {
    tools: 180,
    canvas: 640,
    props: 1100,
  } as const;
  const targetCenter = centers[section];
  const desiredCenter = baseWidth / 2;
  // translateX to bring targetCenter to desiredCenter
  const translateLogical = (desiredCenter - targetCenter); // positive shifts content right
  // Because translate happens after scale(), divide by scale to keep pixel-accurate pan
  const translatePx = translateLogical / scale;

  return (
    <div ref={containerRef} className={className} style={{ height, overflow: 'hidden', position: 'relative' }}>
      {/* Simple zoom controls for cramped layouts */}
      {responsive && (
        <div style={{ position: 'absolute', right: 8, top: 8, zIndex: 5 }} className="flex items-center gap-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-background/70 backdrop-blur px-1 py-0.5">
          <button className="text-xs px-2 py-1 hover:bg-accent rounded" onClick={() => setManualScale(Math.max(0.6, (manualScale ?? autoScale) - 0.1))}>−</button>
          <span className="text-[11px] min-w-[38px] text-center">{Math.round(scale * 100)}%</span>
          <button className="text-xs px-2 py-1 hover:bg-accent rounded" onClick={() => setManualScale(Math.min(1.2, (manualScale ?? autoScale) + 0.1))}>+</button>
          <button className="text-[11px] px-2 py-1 hover:bg-accent rounded" onClick={() => setManualScale(null)}>Fit</button>
          <button className={`text-[11px] px-2 py-1 rounded ${solo ? 'bg-accent' : 'hover:bg-accent'}`} onClick={() => setSolo(s => !s)}>{solo ? 'Solo' : 'Wide'}</button>
        </div>
      )}
      {responsive && (
        <div
          style={{ position: 'absolute', left: '50%', bottom: 10, transform: 'translateX(-50%)', zIndex: 6 }}
          className="flex items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-background/80 backdrop-blur px-1.5 py-1 shadow"
        >
          {(['tools','canvas','props'] as const).map((k) => (
            <button
              key={k}
              className={`text-[12px] px-3 py-1 rounded-full ${section===k ? 'bg-accent' : 'hover:bg-accent'}`}
              onClick={() => setSection(k)}
            >
              {k === 'tools' ? 'Tools' : k === 'canvas' ? 'Canvas' : 'Props'}
            </button>
          ))}
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={editorSrc}
        title="OpenCut Editor"
        onLoad={handleLoad}
        className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-black"
        // Allow features commonly needed for editors
        allow="clipboard-write; clipboard-read; microphone; camera; autoplay"
        // If you vendorize OpenCut under same-origin, sandbox can be reduced. Keep generous here for compatibility.
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
        style={{
          width: responsive ? baseWidth : '100%',
          height: responsive ? baseHeight : '100%',
          transform: responsive ? `scale(${scale}) translateX(${translatePx}px)` : undefined,
          transformOrigin: 'top left',
          display: 'block',
        }}
      />
    </div>
  );
}

export default OpenCutEmbed;
