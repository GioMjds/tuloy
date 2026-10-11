import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UiState = { soundEnabled: boolean; setSoundEnabled: (v: boolean) => void };

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
    }),
    { name: 'tuloy-ui', skipHydration: true },
  ),
);
