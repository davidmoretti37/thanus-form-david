'use client';

import { BentoGrid, BentoCard } from '@/components/ui/bento-grid';
import { Plus, Menu, Moon, Sun, CalendarDays, Bell, Settings, Zap, CreditCard, Plug, KeyRound, Wrench, Palette, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useComposioToolkitIcon } from '@/hooks/react-query/composio/use-composio';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInitiateAgentWithInvalidation } from '@/hooks/react-query/dashboard/use-initiate-agent';
import { useThreadQuery } from '@/hooks/react-query/threads/use-threads';
import { IconCloud } from '@/components/ui/interactive-icon-cloud';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { useAgents } from '@/hooks/react-query/agents/use-agents';
import { AnimatedTooltip } from '@/components/ui/animated-tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import MiniCalendar from '@/components/ui/mini-calendar';
import { t } from '@/lib/i18n';

const ICON_CLOUD_SLUGS: string[] = [
  "react",
  "nextdotjs",
  "typescript",
  "javascript",
  "tailwindcss",
  "supabase",
  "vercel",
  "github",
  "notion",
  "slack",
  "googlecloud",
  "firebase",
  "docker",
  "kubernetes",
  "python",
  "figma",
];

function BadgeRow({ icons }: { icons: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      {icons}
    </div>
  );
}

function TeamAvatars() {
  const members = ['AL', 'BR', 'CM', 'DN', 'ER', 'FS'];
  return (
    <div className="fixed right-6 bottom-8 flex flex-col items-end gap-1">
      <div className="flex -space-x-2">
        {members.map((m, i) => (
          <div
            key={i}
            className="h-8 w-8 rounded-full border bg-gradient-to-br from-muted to-background flex items-center justify-center text-[10px] font-semibold shadow-sm"
          >
            {m}
          </div>
        ))}
      </div>
      <div className="text-xs text-muted-foreground mt-1">Team</div>
    </div>
  );
}

/**
 * Futuristic blue gradient ring icon (many small lines with smooth per-line gradient)
 * The color transitions vertically (top blue -> bottom cyan) applied per tick.
 */
function BlueRingIcon({ className }: { className?: string }) {
  // Helpers for color interpolation
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  const lerpColor = (c1: [number, number, number], c2: [number, number, number], t: number) =>
    `#${toHex(lerp(c1[0], c2[0], t))}${toHex(lerp(c1[1], c2[1], t))}${toHex(lerp(c1[2], c2[2], t))}`;

  // Multi-stop gradient (top blue -> mid blue -> sky -> bottom cyan)
  const TOP: [number, number, number] = [79, 169, 255];   // #4FA9FF
  const BLUE2: [number, number, number] = [59, 130, 246]; // #3B82F6
  const SKY: [number, number, number] = [56, 189, 248];   // #38BDF8
  const CYAN: [number, number, number] = [34, 211, 238];  // #22D3EE

  const getGradientColor = (t: number) => {
    const ease = (x: number) => x * x * (3 - 2 * x); // smoothstep
    const tt = ease(Math.max(0, Math.min(1, t)));
    if (tt < 0.35) return lerpColor(TOP, BLUE2, tt / 0.35);
    if (tt < 0.7) return lerpColor(BLUE2, SKY, (tt - 0.35) / 0.35);
    return lerpColor(SKY, CYAN, (tt - 0.7) / 0.3);
  };

  // Arc helpers to draw small tangent segments (not radial lines)
  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });
  const arcPath = (cx: number, cy: number, r: number, start: number, end: number) => {
    const { x: x1, y: y1 } = polarToCartesian(cx, cy, r, start);
    const { x: x2, y: y2 } = polarToCartesian(cx, cy, r, end);
    const largeArc = end - start <= Math.PI ? 0 : 1;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Parameters tuned to match the reference (many thin dashes around the circle)
  const cx = 12, cy = 12;
  const radius = 9.4;                // ring radius
  const segments = 140;              // number of visible dashes
  const step = (2 * Math.PI) / segments;
  const arcPortion = 0.55;           // fraction of step occupied by dash (rest is gap)
  const dashAngle = step * arcPortion;
  const strokeWidth = 0.9;           // thin dashes

  const paths: JSX.Element[] = [];
  for (let i = 0; i < segments; i++) {
    const start = i * step;
    const end = start + dashAngle;
    const mid = (start + end) / 2;

    // Vertical gradient sampling (top blue -> bottom cyan)
    const yf = (1 - Math.sin(mid)) / 2; // 0 at top, 1 at bottom
    const color = getGradientColor(yf);

    paths.push(
      <path
        key={i}
        d={arcPath(cx, cy, radius, start, end)}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-5 w-5'} aria-hidden="true">
      <g style={{ filter: 'drop-shadow(0 0 5px rgba(56,189,248,0.35))' }}>{paths}</g>
    </svg>
  );
}

const avatarData = (initials: string) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect fill='#ffffff' width='100%' height='100%'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' font-family='Inter, Arial, sans-serif' font-size='48' fill='#111111'>${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export default function HomePage() {
  const { data: googleDriveIcon } = useComposioToolkitIcon('googledrive');
  const { data: slackIcon } = useComposioToolkitIcon('slack');
  const { data: notionIcon } = useComposioToolkitIcon('notion');

  // Home chat input: create new thread like dashboard
  const router = useRouter();
  const [homeMessage, setHomeMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initiatedThreadId, setInitiatedThreadId] = useState<string | null>(null);
  const initiateAgentMutation = useInitiateAgentWithInvalidation();
  const threadQuery = useThreadQuery(initiatedThreadId || '');

  // Theme toggle (light/dark)
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mountedTheme, setMountedTheme] = useState(false);
  useEffect(() => setMountedTheme(true), []);
  const isDark = (resolvedTheme ?? theme) === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');


  // Agent mention setup for Home input
  const { data: agentsResponse } = useAgents({ limit: 100, sort_by: 'name', sort_order: 'asc' });
  const agents = agentsResponse?.agents || [];
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [mentionActive, setMentionActive] = useState(false);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const filteredAgents = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!mentionActive) return [];
    if (!q) return agents.slice(0, 8);
    return agents.filter((a: any) => a.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [agents, mentionActive, mentionQuery]);

  const handleSelectAgent = (agent: any) => {
    setSelectedAgent(agent);
    setMentionActive(false);
    setMentionQuery('');
    // Remove @query typed from the input and leave a space
    setHomeMessage((prev) => {
      if (mentionStart !== null && prev[mentionStart] === '@') {
        const before = prev.slice(0, mentionStart);
        return (before.trimEnd() + ' ');
      }
      return prev;
    });
  };

  // Logout
  const supabase = createClient();
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (e) {
      console.error('Failed to sign out', e);
    }
  };

  useEffect(() => {
    if (threadQuery.data && initiatedThreadId) {
      const t = threadQuery.data as any;
      if (t?.project_id) {
        router.push(`/projects/${t.project_id}/thread/${initiatedThreadId}`);
      } else {
        router.push(`/agents/${initiatedThreadId}`);
      }
      setInitiatedThreadId(null);
      setIsSubmitting(false);
    }
  }, [threadQuery.data, initiatedThreadId, router]);

  const handleHomeSubmit = async () => {
    if (isSubmitting) return;
    const message = homeMessage.trim();
    if (!message) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('prompt', message);
      formData.append('stream', 'true');
      if (selectedAgent?.agent_id) {
        formData.append('agent_id', selectedAgent.agent_id);
      }
      const result = await initiateAgentMutation.mutateAsync(formData);
      if (result?.thread_id) {
        setInitiatedThreadId(result.thread_id);
      } else {
        setIsSubmitting(false);
      }
    } catch (e) {
      setIsSubmitting(false);
    }
  };
  return (
    <main className="relative mx-auto max-w-[1200px] h-screen overflow-hidden px-6 pt-16">
      


      {/* Top icons (restaurados) */}
      <div className="absolute top-5 left-6 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <img 
            src="/Logo Echo.png" 
            alt="Echo Logo" 
            className="w-auto"
            style={{ height: '22.58px' }}
          />
          <img 
            src="/Ai First.png" 
            alt="AI First" 
            className="h-6 w-auto"
          />
        </div>
      </div>
      <div className="absolute top-5 right-6 flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="h-8 rounded-full border bg-background shadow-sm px-2 flex items-center gap-1 cursor-pointer"
          aria-label="Alternar tema claro/escuro"
          title="Alternar tema"
        >
          {mountedTheme ? (
            <>
              <Moon className={`h-4 w-4 ${isDark ? 'opacity-100' : 'opacity-50'}`} />
              <Sun className={`h-4 w-4 ${isDark ? 'opacity-50' : 'opacity-100'}`} />
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 opacity-50" />
              <Sun className="h-4 w-4 opacity-50" />
            </>
          )}
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="Open calendar"
              className="h-8 w-8 rounded-md border bg-background shadow-sm flex items-center justify-center"
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" sideOffset={6} className="p-2 w-auto border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <MiniCalendar />
          </PopoverContent>
        </Popover>
        <button className="h-8 w-8 rounded-md border bg-background shadow-sm flex items-center justify-center">
          <Bell className="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-8 w-8 rounded-md border bg-background shadow-sm flex items-center justify-center">
              <Settings className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Personal Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/billing" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Upgrade
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/billing" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/credentials" className="flex items-center gap-2">
                  <Plug className="h-4 w-4" /> Integrations
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/api-keys" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" /> API Keys (Admin)
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Local .Env Manager
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Theme
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600 cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>



      {/* Grid */}
      {/* Grid */}
      <BentoGrid
        className="grid-cols-3 h-[calc(100vh-140px)] gap-4 mt-4"
        style={{ gridTemplateRows: '4fr 1.6fr 3.4fr 56px' }}>
        {/* Left column: Agents (2 rows) */}
        <BentoCard
          name={t('home.createWorker.title')}
          description={t('home.createWorker.description')}
          href="/construtor"
          cta={t('home.createWorker.cta')}
          className="col-start-1 row-start-1 row-span-2"
          background={
            <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
              <div
                className="absolute -inset-20 rounded-2xl blur-[60px] dark:hidden"
                style={{
                  backgroundImage: `
                    radial-gradient(300px 240px at 18% 10%, rgba(37, 99, 235, 0.45), transparent 62%),
                    radial-gradient(280px 220px at 82% 14%, rgba(34, 211, 238, 0.40), transparent 60%),
                    radial-gradient(520px 420px at 50% 22%, rgba(255, 255, 255, 0.92), transparent 66%)
                  `,
                  filter: 'saturate(140%) brightness(108%) contrast(104%)',
                }}
              />
              <div
                className="absolute -inset-20 rounded-2xl blur-[60px] hidden dark:block"
                style={{
                  backgroundImage: `
                    radial-gradient(300px 240px at 18% 10%, rgba(37, 99, 235, 0.56), transparent 62%),
                    radial-gradient(280px 220px at 82% 14%, rgba(34, 211, 238, 0.46), transparent 60%),
                    radial-gradient(520px 420px at 50% 22%, rgba(0, 0, 0, 0.85), transparent 66%)
                  `,
                  filter: 'saturate(140%) brightness(95%) contrast(110%)',
                }}
              />
              <div className="absolute inset-0 rounded-2xl bg-white/28 dark:bg-black/40 backdrop-blur-2xl shadow-[inset_0_2px_14px_rgba(255,255,255,0.5)] dark:shadow-[inset_0_2px_14px_rgba(0,0,0,0.6)]" />
            </div>
          }
        />

        {/* Center column: Workers (3 rows - principal) */}
        <BentoCard
          name={t('home.workers.title')}
          description={t('home.workers.description')}
          href="/agents?tab=marketplace"
          cta={t('home.workers.cta')}
          className="col-start-2 row-start-1 row-span-3"
          background={
            <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
              {/* Cloudy blue ambient like the reference (Apple-style soft blobs) */}
              <div
                className="absolute -inset-16 rounded-2xl blur-[60px] will-change-transform dark:hidden"
                style={{
                  backgroundImage: `
                    radial-gradient(360px 300px at 18% 86%, rgba(37, 99, 235, 0.78), transparent 66%),
                    radial-gradient(320px 260px at 82% 82%, rgba(34, 211, 238, 0.72), transparent 62%),
                    radial-gradient(420px 340px at 56% 58%, rgba(59, 130, 246, 0.55), transparent 62%),
                    radial-gradient(520px 380px at 50% 14%, rgba(255, 255, 255, 0.98), transparent 66%),
                    radial-gradient(260px 220px at 10% 12%, rgba(191, 219, 254, 0.65), transparent 70%)
                  `,
                  filter: 'saturate(160%) brightness(105%) contrast(104%)',
                }}
              />
              <div
                className="absolute -inset-16 rounded-2xl blur-[60px] will-change-transform hidden dark:block"
                style={{
                  backgroundImage: `
                    radial-gradient(360px 300px at 18% 86%, rgba(37, 99, 235, 0.60), transparent 66%),
                    radial-gradient(320px 260px at 82% 82%, rgba(34, 211, 238, 0.50), transparent 62%),
                    radial-gradient(420px 340px at 56% 58%, rgba(59, 130, 246, 0.40), transparent 62%),
                    radial-gradient(520px 380px at 50% 14%, rgba(0, 0, 0, 0.88), transparent 66%),
                    radial-gradient(260px 220px at 10% 12%, rgba(14, 23, 38, 0.55), transparent 70%)
                  `,
                  filter: 'saturate(150%) brightness(90%) contrast(110%)',
                }}
              />
              {/* Glass layer and subtle inner highlight */}
              <div className="absolute inset-0 rounded-2xl bg-white/40 dark:bg-black/45 backdrop-blur-2xl shadow-[inset_0_2px_16px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_2px_16px_rgba(0,0,0,0.6)]" />
              {/* Soft inner ring for depth */}
              <div className="absolute inset-0 rounded-2xl ring-1 ring-black/5 dark:ring-black/40" />
            </div>
          }
        />

        {/* Right column - top: Artefato (1 row) */}
        <BentoCard
          name={t('home.artifacts.title')}
          description={t('home.artifacts.description')}
          href="/artefatos"
          cta={t('home.artifacts.cta')}
          className="col-start-3 row-start-1 row-span-2"
          background={
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div
                className="absolute -inset-20 rounded-2xl blur-[60px] dark:hidden"
                style={{
                  backgroundImage: `
                    radial-gradient(300px 240px at 20% 12%, rgba(37, 99, 235, 0.35), transparent 62%),
                    radial-gradient(280px 220px at 82% 16%, rgba(34, 211, 238, 0.32), transparent 60%),
                    radial-gradient(520px 420px at 50% 10%, rgba(255, 255, 255, 0.95), transparent 66%)
                  `,
                  filter: 'saturate(135%) brightness(108%) contrast(103%)',
                }}
              />
              <div
                className="absolute -inset-20 rounded-2xl blur-[60px] hidden dark:block"
                style={{
                  backgroundImage: `
                    radial-gradient(300px 240px at 20% 12%, rgba(37, 99, 235, 0.28), transparent 62%),
                    radial-gradient(280px 220px at 82% 16%, rgba(34, 211, 238, 0.26), transparent 60%),
                    radial-gradient(520px 420px at 50% 10%, rgba(0, 0, 0, 0.88), transparent 66%)
                  `,
                  filter: 'saturate(135%) brightness(92%) contrast(110%)',
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[70%] h-[70%] max-w-[380px] -translate-y-12 md:-translate-y-16">
                  <IconCloud iconSlugs={ICON_CLOUD_SLUGS} />
                </div>
              </div>
            </div>
          }
        />

        {/* Right column - bottom: My Workspace (2 rows) */}
        <BentoCard
          name={t('home.tasks.title')}
          description={t('home.tasks.description')}
          href="/tasks"
          cta={t('home.tasks.cta')}
          className="col-start-3 row-start-3 row-span-1"
          background={
            <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
              <div
                className="absolute -inset-20 rounded-2xl blur-[60px] dark:hidden"
                style={{
                  backgroundImage: `
                    radial-gradient(280px 220px at 18% 8%, rgba(37, 99, 235, 0.32), transparent 62%),
                    radial-gradient(260px 200px at 82% 12%, rgba(34, 211, 238, 0.30), transparent 60%),
                    radial-gradient(520px 420px at 50% 14%, rgba(255, 255, 255, 0.96), transparent 66%)
                  `,
                  filter: 'saturate(130%) brightness(108%) contrast(102%)',
                }}
              />
              <div
                className="absolute -inset-20 rounded-2xl blur-[60px] hidden dark:block"
                style={{
                  backgroundImage: `
                    radial-gradient(280px 220px at 18% 8%, rgba(37, 99, 235, 0.48), transparent 62%),
                    radial-gradient(260px 200px at 82% 12%, rgba(34, 211, 238, 0.36), transparent 60%),
                    radial-gradient(520px 420px at 50% 14%, rgba(0, 0, 0, 0.88), transparent 66%)
                  `,
                  filter: 'saturate(130%) brightness(92%) contrast(108%)',
                }}
              />
              <div className="absolute inset-0 rounded-2xl bg-white/30 dark:bg-black/45 backdrop-blur-2xl" />
            </div>
          }
        />

        {/* Left column - bottom: Integrações (1 row) */}
        <BentoCard
          name={t('home.integrations.title')}
          description={t('home.integrations.description')}
          href="/settings/credentials"
          cta={t('home.integrations.cta')}
          className="col-start-1 row-start-3 row-span-1"
          background={
            <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
              <div
                className="absolute -inset-20 rounded-2xl blur-[60px] dark:hidden"
                style={{
                  backgroundImage: `
                    radial-gradient(260px 200px at 20% 10%, rgba(37, 99, 235, 0.28), transparent 62%),
                    radial-gradient(240px 180px at 78% 14%, rgba(34, 211, 238, 0.26), transparent 60%),
                    radial-gradient(480px 360px at 50% 16%, rgba(255, 255, 255, 0.95), transparent 66%)
                  `,
                }}
              />
              <div
                className="absolute -inset-20 rounded-2xl blur-[60px] hidden dark:block"
                style={{
                  backgroundImage: `
                    radial-gradient(260px 200px at 20% 10%, rgba(37, 99, 235, 0.40), transparent 62%),
                    radial-gradient(240px 180px at 78% 14%, rgba(34, 211, 238, 0.32), transparent 60%),
                    radial-gradient(480px 360px at 50% 16%, rgba(0, 0, 0, 0.88), transparent 66%)
                  `,
                }}
              />
              <div className="absolute inset-0 rounded-2xl bg-white/26 dark:bg-black/45 backdrop-blur-2xl" />
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {googleDriveIcon?.icon_url && (
                  <div className="h-8 w-8 rounded-full bg-white shadow-sm border flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={googleDriveIcon.icon_url} alt="Google Drive" className="h-4 w-4" />
                  </div>
                )}
                {slackIcon?.icon_url && (
                  <div className="h-8 w-8 rounded-full bg-white shadow-sm border flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slackIcon.icon_url} alt="Slack" className="h-4 w-4" />
                  </div>
                )}
                {notionIcon?.icon_url && (
                  <div className="h-8 w-8 rounded-full bg-white shadow-sm border flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={notionIcon.icon_url} alt="Notion" className="h-4 w-4" />
                  </div>
                )}
              </div>
            </div>
          }
        />
        {/* Bottom center chat bar as grid item (submit creates a new thread like Dashboard) */}
        <div className="col-start-2 row-start-4 self-center w-full max-w-xl">
          <div className="relative h-12 rounded-2xl border bg-background/80 backdrop-blur-sm shadow-sm flex items-center gap-3 px-4">
            <Plus className="h-4 w-4 text-muted-foreground" />
            {selectedAgent && (
              <div className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-400/30 rounded-full pl-2 pr-1 py-0.5">
                <span>@{selectedAgent.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedAgent(null)}
                  className="ml-1 h-5 w-5 rounded-full hover:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400"
                  aria-label="Remover agente selecionado"
                  title="Remover agente selecionado"
                >
                  ×
                </button>
              </div>
            )}
            <input
              value={homeMessage}
              onChange={(e) => {
                const v = e.target.value;
                if (mentionActive && mentionStart !== null) {
                  if (v.length <= mentionStart || v[mentionStart] !== '@') {
                    setMentionActive(false);
                    setMentionQuery('');
                  } else {
                    const sub = v.slice(mentionStart + 1);
                    if (/\s/.test(sub)) {
                      setMentionActive(false);
                      setMentionQuery('');
                    } else {
                      setMentionQuery(sub);
                    }
                  }
                }
                setHomeMessage(v);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && selectedAgent && homeMessage.trim().length === 0) {
                  setSelectedAgent(null);
                  return;
                }
                if (e.key === '@' && !mentionActive && !selectedAgent) {
                  setMentionActive(true);
                  setMentionStart(homeMessage.length);
                  setMentionQuery('');
                  setHighlightIndex(0);
                  return;
                }
                if (mentionActive) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightIndex((p) =>
                      filteredAgents.length ? (p + 1) % filteredAgents.length : 0
                    );
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightIndex((p) =>
                      filteredAgents.length ? (p - 1 + filteredAgents.length) % filteredAgents.length : 0
                    );
                    return;
                  }
                  if (e.key === 'Enter' || e.key === 'Tab') {
                    if (filteredAgents.length > 0) {
                      e.preventDefault();
                      handleSelectAgent(filteredAgents[highlightIndex]);
                      return;
                    }
                  }
                  if (e.key === 'Escape') {
                    setMentionActive(false);
                    setMentionQuery('');
                    return;
                  }
                }
                if (e.key === 'Enter' && !mentionActive) {
                  handleHomeSubmit();
                }
              }}
              placeholder={selectedAgent ? t('home.chat.placeholder.agent') : t('home.chat.placeholder.noAgent')}
              disabled={isSubmitting}
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button
              onClick={handleHomeSubmit}
              disabled={isSubmitting}
              className="disabled:opacity-50"
              aria-label="Enviar"
            >
              <BlueRingIcon className={`h-4 w-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
            </button>

            {mentionActive && filteredAgents.length > 0 && (
              <div className="absolute bottom-14 left-0 right-0 z-50">
                <div className="mx-2 rounded-2xl border bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg shadow-xl p-2">
                  {filteredAgents.map((a: any, idx: number) => (
                    <button
                      key={a.agent_id || a.name || idx}
                      className={`w-full h-12 flex items-center gap-3 px-3 rounded-xl transition ${
                        idx === highlightIndex
                          ? 'bg-black/5 dark:bg-white/10'
                          : 'hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                      onMouseDown={(ev) => {
                        ev.preventDefault();
                        handleSelectAgent(a);
                      }}
                    >
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex-shrink-0">
                        {(a.name || 'A').slice(0, 1)}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="text-sm font-medium truncate">{a.name}</div>
                        {a.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {a.description}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </BentoGrid>


      {/* Extra sections present in mock (optional quick links) */}
      <div className="sr-only">
        <Link href="/agents?tab=my-agents">Agents</Link>
        <Link href="/tasks">Tasks</Link>
        <Link href="/docs/introduction">Docs</Link>
      </div>

      {/* Removido: Avatares/ícones da equipe */}
    </main>
  );
}
