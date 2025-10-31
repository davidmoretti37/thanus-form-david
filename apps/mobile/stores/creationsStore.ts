import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CreationItem {
  id: string;
  title: string;
  description?: string;
  createdAt: string; // ISO
  sourceTool?: string;
  threadId?: string;
  filePath?: string;
  url?: string;
}

interface CreationsState {
  creations: CreationItem[];
  addCreation: (item: CreationItem) => void;
  clear: () => void;
}

export const useCreationsStore = create<CreationsState>()(
  persist(
    (set, get) => ({
  creations: [],
  addCreation: (item) => set((state) => {
    // De-duplicate by id if already present
    if (state.creations.some((c) => c.id === item.id)) return state;
        const next = [item, ...state.creations].slice(0, 2000);
        return { creations: next };
  }),
  clear: () => set({ creations: [] }),
    }),
    {
      name: 'creations-history',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Ensure we never crash on bad/older data
      partialize: (state) => ({ creations: state.creations }),
      migrate: (persistedState, _version) => persistedState as any,
    }
  )
);


