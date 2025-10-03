import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CustomModel {
  id: string;
  label: string;
}

interface ModelStore {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  customModels: CustomModel[];
  addCustomModel: (model: CustomModel) => void;
  updateCustomModel: (oldId: string, newModel: CustomModel) => void;
  removeCustomModel: (modelId: string) => void;
}

export const useModelStore = create<ModelStore>()(
  persist(
    (set) => ({
      selectedModel: '', // Will be set by the hook based on API data
      customModels: [],
      setSelectedModel: (model: string) => {
        console.log('🔧 ModelStore: Setting selected model to:', model);
        set({ selectedModel: model });
      },
      addCustomModel: (model: CustomModel) => {
        console.log('🔧 ModelStore: Adding custom model:', model);
        set((state) => ({
          customModels: [...state.customModels, model],
        }));
      },
      updateCustomModel: (oldId: string, newModel: CustomModel) => {
        console.log('🔧 ModelStore: Updating custom model:', oldId, 'to:', newModel);
        set((state) => ({
          customModels: state.customModels.map((m) =>
            m.id === oldId ? newModel : m
          ),
          // Update selected model if it was the one being edited
          selectedModel: state.selectedModel === oldId ? newModel.id : state.selectedModel,
        }));
      },
      removeCustomModel: (modelId: string) => {
        console.log('🔧 ModelStore: Removing custom model:', modelId);
        set((state) => ({
          customModels: state.customModels.filter((m) => m.id !== modelId),
        }));
      },
    }),
    {
      name: 'suna-model-selection-v3',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        customModels: state.customModels,
      }),
    }
  )
);

// Utility functions for compatibility
export const formatModelName = (name: string): string => {
  return name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
