'use client';

import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bot, Flower2, Home, ListTodo, MessageCircle, MessageSquare, Monitor, Plug, Wrench, User, LogOut, Settings, CreditCard, Key, Users, BarChart3, FileText, Shield, AudioWaveform, Command, Sun, Moon, Zap, KeyRound, DollarSign, ChevronsUpDown, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "next-themes";
import { isLocalMode } from "@/lib/config";
import { clearUserLocalStorage } from "@/lib/utils/clear-local-storage";
import { BillingModal } from "@/components/billing/billing-modal";
import { useAccounts } from "@/hooks/use-accounts";

/**
 * FloatingSidebar
 * Minimal floating vertical menu on the left side, applied globally.
 * Matches the attached reference: rounded vertical bar with stacked icons.
 */
export default function FloatingSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const isFullArtifact = pathname === '/artefatos/criar' || pathname === '/artefatos/opencut';
  const { data: accounts } = useAccounts();
  const [showBillingModal, setShowBillingModal] = useState(false);
  
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar: string;
    isAdmin?: boolean;
  }>({
    name: '...',
    email: '...',
    avatar: '',
    isAdmin: false,
  });
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Prepare personal account and team accounts
  const personalAccount = accounts?.find((account) => account.personal_account);
  const teamAccounts = accounts?.filter((account) => !account.personal_account);
  
  // Memoize the items to prevent unnecessary re-renders
  const items = [
    { href: '/dashboard', icon: MessageCircle, label: t('floatingSidebar.chat') },
    { href: '/tasks', icon: ListTodo, label: t('floatingSidebar.tasks') },
    { href: '/agents?tab=my-agents', icon: Bot, label: t('floatingSidebar.agents') },
    { href: '/knowledge', icon: Flower2, label: t('floatingSidebar.knowledge') },
    { href: '/multi-computer', icon: Monitor, label: t('floatingSidebar.multiComputer') },
    { href: '/settings/credentials', icon: Plug, label: t('floatingSidebar.integrations') },
  ];
  
  // Handle team selection
  const handleTeamSelect = (team: any) => {
    if (team.personal_account) {
      router.push('/dashboard');
    } else {
      router.push(`/dashboard/${team.slug}`);
    }
  };
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearUserLocalStorage();
    // Redireciona para a página de autenticação
    window.location.href = 'http://localhost:3000/auth';
  };
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .in('role', ['admin', 'super_admin']);
        const isAdmin = roleData && roleData.length > 0;

        setUser({
          name: data.user.user_metadata?.name ||
                data.user.email?.split('@')[0] ||
                'User',
          email: data.user.email || '',
          avatar: data.user.user_metadata?.avatar_url || '',
          isAdmin,
        });
      }
    };

    fetchUserData();
  }, []);

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
        isFullArtifact ? "right-4" : "left-4"
      )}
      aria-label="Floating sidebar"
    >
      {/* Home icon */}
      <Link
        href="/home"
        aria-label="Home"
        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-foreground/10 transition-colors"
      >
        <Home className="w-5 h-5" />
      </Link>

      {/* Menu icons */}
      <nav className="flex flex-col items-center gap-3">
        {items.map(({ href, icon: Icon, label }) => {
          // Verifica se o item está ativo
          const isActive = () => {
            // Se for a rota exata
            if (pathname === href) return true;
            
            // Para rotas que não são o dashboard
            if (href !== '/dashboard') {
              const baseHref = href.split('?')[0];
              
              // Para rotas de configuração, verifica se é a rota exata ou um filho direto
              if (baseHref.startsWith('/settings/')) {
                // Verifica se é a rota exata ou um filho direto (apenas um nível abaixo)
                return pathname === baseHref || 
                       (pathname.startsWith(baseHref + '/') && 
                        pathname.substring(baseHref.length + 1).split('/').length === 1);
              }
              
              // Para outras rotas, verifica se o pathname começa com o href
              // e o próximo caractere é / ou ? ou é o final da string
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
        
        {/* User profile */}
        <DropdownMenu onOpenChange={setIsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="mt-auto">
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-colors',
                      'text-foreground/80 hover:bg-foreground/10',
                      isOpen && 'ring-1 ring-primary/40 text-foreground bg-transparent'
                    )}
                    aria-label="User menu"
                  >
                    {user.avatar ? (
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-foreground/70" />
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {user.name}
            </TooltipContent>
          </Tooltip>
          
          <DropdownMenuContent 
            className="w-64 ml-2" 
            side="right" 
            align="center" 
            sideOffset={8}
            forceMount
          >
            <div className="p-2">
              <div className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {personalAccount && 'billing_plan' in personalAccount && (personalAccount as any).billing_plan?.name ? (personalAccount as any).billing_plan.name : t('floatingSidebar.freePlan')}
                    </span>
                    {user.isAdmin && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                        {t('floatingSidebar.admin')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
{/* Teams Section */}
            <div className="p-1">
              <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {t('floatingSidebar.accounts')}
              </div>
              
              {personalAccount && (
                <DropdownMenuItem
                  key={personalAccount.account_id}
                  onClick={() =>
                    handleTeamSelect({
                      name: personalAccount.name,
                      logo: Command,
                      plan: 'Personal',
                      account_id: personalAccount.account_id,
                      slug: personalAccount.slug,
                      personal_account: true,
                    })
                  }
                  className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Command className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{personalAccount.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{t('floatingSidebar.personalAccount')}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              )}

              {teamAccounts?.map((team) => (
                <DropdownMenuItem
                  key={team.account_id}
                  onClick={() =>
                    handleTeamSelect({
                      name: team.name,
                      logo: AudioWaveform,
                      plan: 'Team',
                      account_id: team.account_id,
                      slug: team.slug,
                      personal_account: false,
                    })
                  }
                  className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                      <Users className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{team.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{t('floatingSidebar.team')}</p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}

            </div>
            
            <DropdownMenuSeparator />

            {/* User Settings Section */}
            <DropdownMenuGroup>
              {user.isAdmin && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Shield className="h-4 w-4 mr-2" />
                    <span>Admin</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem asChild>
                        <Link href="/admin/billing" className="w-full">
                          <DollarSign className="h-4 w-4 mr-2" />
                          {t('floatingSidebar.manageBilling')}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )}
              
              <DropdownMenuItem onClick={() => setShowBillingModal(true)}>
                <Zap className="h-4 w-4 mr-2" />
                {t('floatingSidebar.upgradePlan')}
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/settings/billing" className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {t('floatingSidebar.billing')}
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/settings/credentials" className="w-full">
                  <Plug className="h-4 w-4 mr-2" />
                  {t('floatingSidebar.integrations')}
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/settings/whatsapp" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {t('floatingSidebar.whatsapp')}
                </Link>
              </DropdownMenuItem>
              
              {user.isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/settings/api-keys" className="w-full">
                    <Key className="h-4 w-4 mr-2" />
                    {t('floatingSidebar.apiKeys')}
                  </Link>
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem asChild>
                <div 
                  className="flex w-full items-center cursor-pointer"
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                >
                  <div className="relative mr-2 h-4 w-4">
                    <Sun className="absolute h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </div>
                  {t('floatingSidebar.toggleTheme')}
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              className='text-destructive focus:text-destructive focus:bg-destructive/10' 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2 text-destructive" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
      
      {/* Billing Modal */}
      <BillingModal
        open={showBillingModal}
        onOpenChange={setShowBillingModal}
        returnUrl={typeof window !== 'undefined' ? window?.location?.href || '/' : '/'}
      />
    </div>,
    portalEl
  );
}
