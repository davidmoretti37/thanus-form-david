'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Calculator,
  Clock3,
  Mic,
  FolderKanban,
  Cog,
  PenTool,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

/**
 * Artefatos - "Home de iPad" para micro-aplicações internas.
 * Visual limpo, moderno e futurista (glass + blur), com ícones em grid.
 */

type MicroAppKey = 'calculator' | 'stopwatch' | 'recorder' | 'create' | 'comingSoon1' | 'comingSoon2';

type MicroApp = {
  key: MicroAppKey;
  name: string;
  icon: JSX.Element;
  accent: string;
  description?: string;
  disabled?: boolean;
};

const APPS: MicroApp[] = [
  {
    key: 'calculator',
    name: 'Calculadora',
    icon: <Calculator className="h-7 w-7" />,
    accent:
      'from-blue-500/60 to-cyan-400/60 text-blue-900 dark:text-blue-50 ring-blue-500/30',
  },
  {
    key: 'stopwatch',
    name: 'Cronômetro',
    icon: <Clock3 className="h-7 w-7" />,
    accent:
      'from-emerald-500/60 to-teal-400/60 text-emerald-900 dark:text-emerald-50 ring-emerald-500/30',
  },
  {
    key: 'recorder',
    name: 'Gravador',
    icon: <Mic className="h-7 w-7" />,
    accent:
      'from-rose-500/60 to-fuchsia-400/60 text-rose-900 dark:text-rose-50 ring-rose-500/30',
  },
  {
    key: 'create',
    name: 'Criar',
    icon: <PenTool className="h-7 w-7" />,
    accent:
      'from-violet-500/60 to-indigo-400/60 text-violet-900 dark:text-violet-50 ring-violet-500/30',
  },
  {
    key: 'comingSoon1',
    name: 'Apps',
    icon: <FolderKanban className="h-7 w-7" />,
    accent:
      'from-amber-500/60 to-orange-400/60 text-amber-900 dark:text-amber-50 ring-amber-500/30',
    disabled: true,
  },
  {
    key: 'comingSoon2',
    name: 'Configurações',
    icon: <Cog className="h-7 w-7" />,
    accent:
      'from-slate-500/60 to-zinc-400/60 text-slate-900 dark:text-slate-50 ring-slate-500/30',
    disabled: true,
  },
];

export default function ArtefatosPage() {
  const [openKey, setOpenKey] = useState<MicroAppKey | null>(null);
  const router = useRouter();

  return (
    <main className="relative mx-auto max-w-[1400px] min-h-screen px-6 pt-20 pb-16">
      {/* Futuristic ambient background */}
      <div className="pointer-events-none absolute -z-10 inset-0">
        {/* Light mode blue gradient ambience (inspirado no Multi Agents) */}
        <div
          className="absolute -inset-20 rounded-2xl blur-[80px] dark:hidden"
          style={{
            backgroundImage: `
              radial-gradient(360px 300px at 18% 86%, rgba(37, 99, 235, 0.78), transparent 66%),
              radial-gradient(320px 260px at 82% 82%, rgba(34, 211, 238, 0.72), transparent 62%),
              radial-gradient(420px 340px at 56% 58%, rgba(59, 130, 246, 0.55), transparent 62%),
              radial-gradient(520px 380px at 50% 14%, rgba(255, 255, 255, 0.98), transparent 66%),
              radial-gradient(260px 220px at 10% 12%, rgba(191, 219, 254, 0.65), transparent 70%)
            `,
            filter: 'saturate(150%) brightness(105%) contrast(104%)',
          }}
        />
        {/* Dark mode ambience */}
        <div
          className="absolute -inset-20 rounded-2xl blur-[80px] hidden dark:block"
          style={{
            backgroundImage: `
              radial-gradient(360px 300px at 18% 86%, rgba(37, 99, 235, 0.60), transparent 66%),
              radial-gradient(320px 260px at 82% 82%, rgba(34, 211, 238, 0.50), transparent 62%),
              radial-gradient(420px 340px at 56% 58%, rgba(59, 130, 246, 0.40), transparent 62%),
              radial-gradient(520px 380px at 50% 14%, rgba(0, 0, 0, 0.88), transparent 66%),
              radial-gradient(260px 220px at 10% 12%, rgba(14, 23, 38, 0.55), transparent 70%)
            `,
            filter: 'saturate(150%) brightness(92%) contrast(110%)',
          }}
        />
      </div>

      <header className="mb-8">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] leading-none font-semibold text-black dark:text-white">TARS</span>
          <span className="text-[24px] leading-none font-semibold bg-gradient-to-b from-blue-400 to-cyan-400 text-transparent bg-clip-text">
            /
          </span>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Artefatos</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Micro-aplicações integradas para tarefas rápidas, com experiência visual inspirada no iPad.
        </p>
      </header>

      <section className="rounded-3xl bg-white/8 dark:bg-black/20 backdrop-blur-xl ring-1 ring-white/10 p-6 md:p-8 shadow-[0_8px_60px_-20px_rgba(0,0,0,0.35)]">
        <AppsGrid
          apps={APPS}
          onOpen={(k) => {
            if (k === 'create') {
              router.push('/artefatos/criar');
            } else {
              setOpenKey(k);
            }
          }}
        />

        {/* Modais dos apps */}
        <CalculatorDialog open={openKey === 'calculator'} onOpenChange={(o) => setOpenKey(o ? 'calculator' : null)} />
        <StopwatchDialog open={openKey === 'stopwatch'} onOpenChange={(o) => setOpenKey(o ? 'stopwatch' : null)} />
        <RecorderDialog open={openKey === 'recorder'} onOpenChange={(o) => setOpenKey(o ? 'recorder' : null)} />
        <ComingSoonDialog
          title="Em breve"
          description="Mais micro-aplicações chegando em breve."
          open={openKey === 'comingSoon1' || openKey === 'comingSoon2'}
          onOpenChange={(o) => setOpenKey(o ? openKey : null)}
        />
      </section>
    </main>
  );
}

function AppsGrid({
  apps,
  onOpen,
}: {
  apps: MicroApp[];
  onOpen: (key: MicroAppKey) => void;
}) {
  return (
    <div
      className={cn(
        'grid',
        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
        'gap-5'
      )}
    >
      {apps.map((app) => (
        <button
          key={app.key}
          type="button"
          disabled={app.disabled}
          onClick={() => onOpen(app.key)}
          className={cn(
            'group relative isolate rounded-3xl p-5 text-center flex flex-col items-center gap-3 transition focus:outline-none',
            'bg-white/60 dark:bg-zinc-900/60 ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-xl',
            'hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0',
            app.disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          <div
            className={cn(
              'absolute -z-10 inset-0 opacity-0 group-hover:opacity-100 transition',
              'rounded-3xl bg-gradient-to-br',
              app.accent
            )}
          />
          <div className="flex flex-col items-center gap-2">
            <div
              className={cn(
                'flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-3xl ring-1',
                'bg-white/70 dark:bg-zinc-950/70 backdrop-blur-lg shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]',
                'ring-black/10 dark:ring-white/10'
              )}
            >
              {app.icon}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold tracking-tight">{app.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {app.description ?? 'Abrir'}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ========== Calculator ========== */
function CalculatorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState<string>('');

  const input = (v: string) => setExpr((e) => (e + v).slice(0, 64));
  const clear = () => {
    setExpr('');
    setResult('');
  };
  const back = () => setExpr((e) => e.slice(0, -1));

  const evaluateExpr = () => {
    try {
      // Simple expression evaluator (for basic calculator use only)
      // eslint-disable-next-line no-new-func
      const val = Function(`"use strict"; return (${expr || 0})`)();
      setResult(String(val));
    } catch {
      setResult('Erro');
    }
  };

  const keys = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '(', ')', '+',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calculadora</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-xl border bg-background p-3">
            <div className="text-xs text-muted-foreground">Expressão</div>
            <Input value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="Ex.: (12+3.5)*2" />
            <div className="mt-2 text-xs text-muted-foreground">Resultado</div>
            <div className="rounded-md border bg-white/60 dark:bg-zinc-900/60 p-2 min-h-[40px]">
              {result || '-'}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {keys.map((k) => (
              <Button key={k} variant="outline" onClick={() => input(k)}>
                {k}
              </Button>
            ))}
            <Button variant="secondary" onClick={back}>⌫</Button>
            <Button variant="secondary" onClick={clear}>C</Button>
            <Button className="col-span-2" onClick={evaluateExpr}>=</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ========== Stopwatch ========== */
function StopwatchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setMs((v) => v + 10), 10) as any;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [running]);

  const reset = () => setMs(0);

  const fmt = useMemo(() => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const ss = s % 60;
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }, [ms]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cronômetro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-3xl font-semibold text-center tracking-widest tabular-nums">{fmt}</div>
          <div className="flex justify-center gap-2">
            {!running ? (
              <Button onClick={() => setRunning(true)}>Iniciar</Button>
            ) : (
              <Button variant="destructive" onClick={() => setRunning(false)}>Parar</Button>
            )}
            <Button variant="outline" onClick={reset}>Zerar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ========== Voice Recorder ========== */
function RecorderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (!open) {
      stop();
      setAudioURL(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioURL(URL.createObjectURL(blob));
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      console.error(e);
      alert('Não foi possível acessar o microfone.');
    }
  };

  const stop = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gravador</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            {!recording ? (
              <Button onClick={start}>Iniciar gravação</Button>
            ) : (
              <Button variant="destructive" onClick={stop}>Parar</Button>
            )}
          </div>
          <div className="rounded-xl border p-3 bg-muted/30">
            <div className="text-sm font-medium mb-2">Prévia</div>
            {audioURL ? (
              <audio src={audioURL} controls className="w-full" />
            ) : (
              <div className="text-xs text-muted-foreground">Sem áudio gravado</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/* ========== Coming Soon Placeholder ========== */
function ComingSoonDialog({
  title,
  description,
  open,
  onOpenChange,
}: {
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">{description}</div>
      </DialogContent>
    </Dialog>
  );
}
