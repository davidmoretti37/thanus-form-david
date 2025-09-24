'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageCircle,
  Wrench,
  Plug,
  ListTodo,
  Bot,
  Folder
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BlueRingIcon from '@/components/ui/blue-ring-icon';

/**
 * FloatingSidebar
 * Minimal floating vertical menu on the left side, applied globally.
 * Matches the attached reference: rounded vertical bar with stacked icons.
 */
export function FloatingSidebar() {
  const pathname = usePathname();
  const isExcalidrawFull = pathname === '/artefatos/criar';

  // Render in a portal to avoid parent transforms breaking position: fixed (e.g., marketplace)
  const [mounted, setMounted] = useState(false);
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setMounted(true);
    let el = document.getElementById('floating-sidebar-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'floating-sidebar-root';
      document.body.appendChild(el);
    }
    setPortalEl(el);
  }, []);
  if (!mounted || !portalEl) return null;

  // Try to keep links stable using existing routes in the project
  const items = [
    // Chat bubble -> Dashboard chat area
    { href: '/dashboard', icon: MessageCircle, label: 'Chat' },
    // Tasks (second item)
    { href: '/tasks', icon: ListTodo, label: 'Tasks' },
    // Agents
    { href: '/agents?tab=my-agents', icon: Bot, label: 'Agents' },
    // Knowledge (pastas) - abaixo de Agents
    { href: '/knowledge', icon: Folder, label: 'Knowledge' },
    // Integrations
    { href: '/settings/credentials', icon: Plug, label: 'Integrations' },
    // Settings (last)
    { href: '/settings', icon: Wrench, label: 'Settings' },
  ];

  return createPortal(
    <div
      className={cn(
        "fixed top-1/2 -translate-y-1/2 z-50 flex flex-col items-center justify-start w-[45px] py-2.5 gap-3 rounded-2xl border bg-background/85 backdrop-blur-lg shadow-lg dark:border-white/10 border-black/10",
        isExcalidrawFull ? "right-4" : "left-4"
      )}
      aria-label="Floating sidebar"
    >
      {/* Top ring indicator - same gradient ring as Home header */}
      <Link
        href="/home"
        aria-label="Home"
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-foreground/10 transition-colors"
      >
        <BlueRingIcon className="w-5 h-5" />
      </Link>

      {/* Menu icons */}
      <nav className="flex flex-col items-center gap-3">
        {items.map(({ href, icon: Icon, label }) => {
          const active =
            pathname === href ||
            (href !== '/dashboard' && pathname?.startsWith(href.split('?')[0]));

          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    'relative z-10 pointer-events-auto flex items-center justify-center w-8 h-8 rounded-full transition-colors',
                    active
                      ? 'ring-1 ring-primary/40 text-foreground bg-transparent'
                      : 'text-foreground/80 hover:bg-foreground/10'
                  )}
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </div>,
    portalEl
  );
}

export default FloatingSidebar;
