'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import '@excalidraw/excalidraw/index.css';

// Carrega Excalidraw somente no client (SSR off)
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false }
);

type ExcalidrawAPI = any;

type SceneData = {
  elements: any[];
  appState: any;
  files?: Record<string, any>;
};

const LS_KEY = 'artefatos:excalidraw:v1';

export default function ExcalidrawCanvas() {
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [initialData, setInitialData] = useState<SceneData | null>(null);
  const [mounted, setMounted] = useState(false);

  // Carrega a cena salva
  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.elements) {
          setInitialData({ ...parsed, appState: sanitizeAppState(parsed.appState) });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  function sanitizeAppState(state: any) {
    if (!state || typeof state !== 'object') return {};
    const { collaborators, ...rest } = state; // collaborators (Map) pode causar erros ao serializar/reidratar
    return rest;
  }

  const onChange = (elements: any, appState: any, files: any) => {
    try {
      const payload: SceneData = { elements, appState: sanitizeAppState(appState), files };
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  };

  const clearScene = () => {
    const api = apiRef.current;
    if (!api) return;
    api.updateScene({
      elements: [],
      appState: { ...api.getAppState(), viewBackgroundColor: '#ffffff' },
      files: {},
    });
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  };

  const exportPNG = async () => {
    const mod = await import('@excalidraw/excalidraw');
    const api = apiRef.current;
    if (!api) return;
    const blob = await mod.exportToBlob({
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
      mimeType: 'image/png',
      quality: 1,
      exportPadding: 16,
      backgroundColor: api.getAppState()?.viewBackgroundColor ?? '#ffffff',
      scale: 2,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'excalidraw.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveJSON = () => {
    const api = apiRef.current;
    if (!api) return;
    const payload: SceneData = {
      elements: api.getSceneElements(),
      appState: api.getAppState(),
      files: api.getFiles(),
    };
    const data = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'excalidraw.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openJSONFilePicker = () => fileInputRef.current?.click();

  const importJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const txt = await file.text();
      const parsed = JSON.parse(txt);
      const api = apiRef.current;
      if (!api) return;
      api.updateScene({
        elements: parsed.elements || [],
        appState: { ...api.getAppState(), ...(parsed.appState || {}) },
        files: parsed.files || {},
      });
      localStorage.setItem(LS_KEY, JSON.stringify(parsed));
    } catch {
      alert('Arquivo inválido');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-full w-full flex-col">

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        {mounted && (
          <Excalidraw
            excalidrawAPI={(api: any) => (apiRef.current = api)}
            onChange={onChange}
            initialData={
              initialData
                ? { ...initialData, appState: sanitizeAppState(initialData.appState) }
                : undefined
            }
            langCode="pt-BR"
            viewModeEnabled={false}
            zenModeEnabled={false}
            gridModeEnabled={false}
          />
        )}
      </div>
    </div>
  );
}
