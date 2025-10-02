'use client';

import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bot, Flower2, ListTodo, MessageCircle, MessageSquare, Monitor, Plug, Wrench } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import BlueRingIcon from "@/components/ui/blue-ring-icon";

/**
 * FloatingSidebar
 * Minimal floating vertical menu on the left side, applied globally.
 * Matches the attached reference: rounded vertical bar with stacked icons.
 */
export default function FloatingSidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isExcalidrawFull = pathname === '/artefatos/criar';
  
  // Memoize the items to prevent unnecessary re-renders
  const items = [
    { href: '/dashboard', icon: MessageCircle, label: t('floatingSidebar.chat') },
    { href: '/tasks', icon: ListTodo, label: t('floatingSidebar.tasks') },
    { href: '/agents?tab=my-agents', icon: Bot, label: t('floatingSidebar.agents') },
    { href: '/knowledge', icon: Flower2, label: t('floatingSidebar.knowledge') },
    { href: '/multi-computer', icon: Monitor, label: t('floatingSidebar.multiComputer') },
    { href: '/settings/whatsapp', icon: MessageSquare, label: t('floatingSidebar.whatsapp') },
    { href: '/settings/credentials', icon: Plug, label: t('floatingSidebar.integrations') },
    { href: '/settings/billing', icon: Wrench, label: t('floatingSidebar.settings') },
  ];

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
          // Verifica se o item está ativo
          const isActive = () => {
            // Se for a rota exata
            if (pathname === href) return true;
            
            // Se não for o dashboard e o pathname começar com o href
            if (href !== '/dashboard') {
              const baseHref = href.split('?')[0];
              // Verifica se o pathname começa com o href e o próximo caractere é / ou ? ou undefined
              // Isso evita que /settings marque /settings/billing e /settings/outra-coisa ao mesmo tempo
              return pathname?.startsWith(baseHref) && 
                     (pathname.length === baseHref.length || 
                      pathname[baseHref.length] === '/' ||
                      pathname[baseHref.length] === '?');
            }
            return false;
          };
          
          const active = isActive();

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

