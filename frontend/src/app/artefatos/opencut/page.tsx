'use client';

import { useEffect, useState } from 'react';
import OpenCutEmbed from '@/components/opencut/OpenCutEmbed';
import { Loader2 } from 'lucide-react';

/**
 * Página do OpenCut em tela cheia.
 * - Mantém o layout padrão (menu lateral esquerdo permanece)
 * - Mostra uma animação de carregamento breve antes de renderizar o editor
 * - Editor ocupa praticamente toda a área disponível
 * - Usa a mesma lógica/estilo do artefato Excalidraw (/artefatos/criar)
 */
export default function ArtefatosOpenCutPage() {
  const [showEditor, setShowEditor] = useState(false);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    // Breve animação de carregamento para transição suave (igual ao Excalidraw)
    const t = setTimeout(() => setShowEditor(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="relative h-[calc(100vh-0px)] w-full overflow-hidden">
      {/* Fundo com degradê azul suave (mesmo estilo da página do Excalidraw) */}
      <div className="pointer-events-none absolute -z-10 inset-0">
        <div
          className="absolute -inset-24 blur-[80px] dark:hidden"
          style={{
            backgroundImage: `
              radial-gradient(360px 300px at 18% 86%, rgba(37, 99, 235, 0.35), transparent 66%),
              radial-gradient(320px 260px at 82% 82%, rgba(34, 211, 238, 0.30), transparent 62%),
              radial-gradient(420px 340px at 56% 58%, rgba(59, 130, 246, 0.25), transparent 62%)
            `,
            filter: 'saturate(140%) brightness(105%) contrast(104%)',
          }}
        />
        <div
          className="absolute -inset-24 blur-[80px] hidden dark:block"
          style={{
            backgroundImage: `
              radial-gradient(360px 300px at 18% 86%, rgba(37, 99, 235, 0.28), transparent 66%),
              radial-gradient(320px 260px at 82% 82%, rgba(34, 211, 238, 0.24), transparent 62%),
              radial-gradient(420px 340px at 56% 58%, rgba(59, 130, 246, 0.18), transparent 62%)
            `,
            filter: 'saturate(140%) brightness(92%) contrast(110%)',
          }}
        />
      </div>

      {/* Loading overlay (igual ao Excalidraw) */}
      {!showEditor && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="text-xs text-muted-foreground">Carregando editor…</span>
          </div>
        </div>
      )}

      {/* OpenCut em tela cheia (abaixo do topo do layout, mantendo o menu lateral esquerdo) */}
      <div className="h-full w-full">
        {showEditor && (
          <OpenCutEmbed
            mediaUrls={[]}
            className="w-full"
            height="100%"
          />
        )}
      </div>

      {/* Onboarding overlay to explain the basic flow */}
      {showEditor && showHelp && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center p-4">
          <div className="pointer-events-auto mt-6 w-full max-w-3xl rounded-lg border border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold">Getting started with the Video Editor</h2>
              <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setShowHelp(false)}>Dismiss</button>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <div className="rounded-md border border-dashed border-border p-3">
                <div className="text-xs font-medium mb-1">1) Import media</div>
                <p className="text-xs text-muted-foreground">Use the Import button at the top of the editor to add videos, audio, or images.</p>
              </div>
              <div className="rounded-md border border-dashed border-border p-3">
                <div className="text-xs font-medium mb-1">2) Build your timeline</div>
                <p className="text-xs text-muted-foreground">Drag clips onto the timeline. Trim, split, and move them as needed.</p>
              </div>
              <div className="rounded-md border border-dashed border-border p-3">
                <div className="text-xs font-medium mb-1">3) Export</div>
                <p className="text-xs text-muted-foreground">Click Export to render your video. Finished files appear under Creations.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 pb-4">
              <a href="https://opencut.app" target="_blank" rel="noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">OpenCut docs</a>
              <button className="text-xs rounded-md border border-border px-3 py-1.5 hover:bg-accent" onClick={() => setShowHelp(false)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
