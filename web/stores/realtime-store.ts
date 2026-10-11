import { create } from 'zustand';

export type RealtimeStatus = 'idle' | 'connecting' | 'live' | 'offline';
type RealtimeState = {
  status: RealtimeStatus;
  setStatus: (s: RealtimeStatus) => void;
};

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
