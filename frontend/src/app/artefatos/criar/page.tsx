'use client';

import { useEffect, useState } from 'react';
import ExcalidrawCanvas from '@/components/artefatos/ExcalidrawCanvas';
import { Loader2 } from 'lucide-react';

/**
 * Página de criação (Excalidraw) em tela cheia.
 * - Mantém o layout padrão (menu lateral esquerdo permanece)
 * - Mostra uma animação de carregamento breve antes de renderizar o canvas
 * - Canvas ocupa praticamente toda a área disponível
 */
export default function ArtefatosCriarPage() {
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    // Breve animação de carregamento para transição suave
    const t = setTimeout(() => setShowEditor(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="relative h-[calc(100vh-0px)] w-full overflow-hidden">
      {/* Fundo com degradê azul suave (combina com o restante da aplicação) */}
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

      {/* Loading overlay */}
      {!showEditor && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            <span className="text-xs text-muted-foreground">Carregando editor…</span>
          </div>
        </div>
      )}

      {/* Excalidraw em tela cheia (abaixo do topo do layout, mantendo o menu lateral esquerdo) */}
      <div className="h-full w-full">
        {showEditor && <ExcalidrawCanvas />}
      </div>
    </main>
  );
}
