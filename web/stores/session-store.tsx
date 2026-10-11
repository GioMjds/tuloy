'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { SessionUser } from '@/lib/auth/shared';

type SessionState = { user: SessionUser | null; clear: () => void };
const SessionContext = createContext<StoreApi<SessionState> | null>(null);

export function SessionProvider({
  initialUser,
  children,
}: {
  initialUser: SessionUser | null;
  children: ReactNode;
}) {
  const [store] = useState(() =>
    createStore<SessionState>((set) => ({
      user: initialUser,
      clear: () => set({ user: null }),
    })),
  );
  return (
    <SessionContext.Provider value={store}>{children}</SessionContext.Provider>
  );
}

export function useSession<T>(selector: (s: SessionState) => T): T {
  const store = useContext(SessionContext);
  if (!store)
    throw new Error('useSession must be used inside <SessionProvider>');
  return useStore(store, selector);
}
