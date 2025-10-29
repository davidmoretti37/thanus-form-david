import { create } from 'zustand';

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

export const useCreationsStore = create<CreationsState>((set) => ({
  creations: [],
  addCreation: (item) => set((state) => {
    // De-duplicate by id if already present
    if (state.creations.some((c) => c.id === item.id)) return state;
    return { creations: [item, ...state.creations].slice(0, 500) };
  }),
  clear: () => set({ creations: [] }),
}));


