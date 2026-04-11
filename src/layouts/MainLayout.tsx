import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import { StatusBar } from '@/components/StatusBar';
import {
  LayoutDashboard,
  Settings,
  Network,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Tag,
} from 'lucide-react';
import logoDark from '@/assets/logo-dark.jpg';
import logoLight from '@/assets/logo-light.jpg';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ErrorBoundary } from 'react-error-boundary';
import { useToast } from '@/components/ui/use-toast';
import { getLocalizedErrorMessage } from '@/utils/errorMessages';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const hasShownRouteErrorToastRef = useRef(false);

  // Initialize state from localStorage if available, default to false (expanded)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Persist state changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const navItems = [
    {
      to: '/',
      icon: LayoutDashboard,
      label: t('nav.accounts'),
    },
    {
      to: '/categories',
      icon: Tag,
      label: 'Categories',
    },
    {
      to: '/proxy',
      icon: Network,
      label: t('nav.proxy', 'API Proxy'),
    },
    {
      to: '/settings',
      icon: Settings,
      label: t('nav.settings'),
    },
  ];

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'bg-card/40 backdrop-blur-3xl group relative flex flex-col border-r border-border/40 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 ease-in-out',
            isCollapsed ? 'w-[76px]' : 'w-64',
          )}
        >
          <Button
            variant="outline"
            size="icon"
            className="bg-background hover:bg-accent text-muted-foreground hover:text-foreground absolute top-7 -right-3 z-40 h-6 w-6 cursor-pointer rounded-full border shadow-sm opacity-0 transition-all duration-200 ease-in-out group-hover:opacity-100 hover:scale-110"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </Button>

          <div className={cn('flex flex-col mb-4', isCollapsed ? 'items-center p-5' : 'p-6 pb-2')}>
            <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg shadow-sm border border-border/50 bg-background/50">
                <img src={logoLight} alt="Logo" className="hidden h-full w-full object-cover dark:block" />
                <img src={logoDark} alt="Logo" className="block h-full w-full object-cover dark:hidden" />
              </div>
              <div
                className={cn(
                  'flex flex-col justify-center overflow-hidden transition-all duration-300',
                  isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                )}
              >
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight w-full font-[Poppins]">Antigravity</h1>
                <span className="text-[10px] font-[Poppins] font-bold text-muted-foreground tracking-wide mt-0.5 leading-none">Helper</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 px-3">
            <TooltipProvider>
              {navItems.map((item) => {
                const isActive = location.pathname === item.to;

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.to} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.to}
                          className={cn(
                            'group mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200',
                            isActive
                              ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                              : 'hover:bg-secondary/50 text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <item.icon className={cn("transition-transform duration-200", isActive ? "h-5 w-5 scale-110" : "h-5 w-5 group-hover:scale-110")} />
                          <span className="sr-only">{item.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 border border-transparent',
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm border-primary/20'
                        : 'hover:bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-border/30',
                    )}
                  >
                    <item.icon className={cn("transition-transform duration-200", isActive ? "h-[18px] w-[18px] scale-110" : "h-[18px] w-[18px] group-hover:scale-110")} />
                    {item.label}
                  </Link>
                );
              })}
            </TooltipProvider>
          </nav>

          <div className="p-3 mt-auto border-t border-border/40 bg-gradient-to-t from-muted/20 to-transparent">
            <StatusBar isCollapsed={isCollapsed} />
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-auto transition-all duration-300">
          <ErrorBoundary
            resetKeys={[location.pathname]}
            onReset={() => {
              hasShownRouteErrorToastRef.current = false;
            }}
            onError={(error) => {
              if (hasShownRouteErrorToastRef.current) {
                return;
              }

              toast({
                title: t('error.generic'),
                description: getLocalizedErrorMessage(error, t),
                variant: 'destructive',
              });
              hasShownRouteErrorToastRef.current = true;
            }}
            fallbackRender={({ resetErrorBoundary }) => (
              <div className="mx-auto max-w-3xl p-6">
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <div className="text-lg font-semibold">{t('error.generic')}</div>
                  <div className="text-muted-foreground mt-2 text-sm">{t('action.retry')}</div>
                  <Button className="mt-4" variant="outline" onClick={resetErrorBoundary}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('action.retry')}
                  </Button>
                </div>
              </div>
            )}
          >
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      {/* Footer */}
      <footer className="border-t px-4 py-1.5 text-center">
        <span className="text-muted-foreground text-[11px]">
          Created by{' '}
          <a
            href="https://github.com/Draculabo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold cursor-pointer"
          >
            Draculabo
          </a>
          {', '}Enhanced by{' '}
          <a
            href="https://github.com/LippyyDev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold cursor-pointer"
          >
            LippyyDev
          </a>
        </span>
      </footer>
    </div>
  );
};
