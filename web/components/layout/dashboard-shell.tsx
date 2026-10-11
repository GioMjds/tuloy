'use client';
import { useEffect, type ReactNode } from 'react';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { BottomNav } from './bottom-nav';
import { ConnectionStatus } from './connection-status';
import { LocaleSwitcher } from './locale-switcher';
import { UserMenu } from './user-menu';
import { useUiStore } from '@/stores/ui-store';

export function DashboardShell({
  variant,
  children,
}: {
  variant: 'owner' | 'admin';
  children: ReactNode;
}) {
  useEffect(() => {
    useUiStore.persist.rehydrate();
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar variant={variant} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger className="hidden md:inline-flex" />
          <div className="ml-auto flex items-center gap-2">
            <ConnectionStatus />
            <LocaleSwitcher />
            <UserMenu />
          </div>
        </header>
        {/* pb-24 leaves room for the fixed bottom nav on mobile */}
        <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
        <BottomNav variant={variant} />
      </SidebarInset>
    </SidebarProvider>
  );
}
