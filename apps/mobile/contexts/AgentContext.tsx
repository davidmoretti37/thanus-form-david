import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Agent } from '@/services/agentService';

interface AgentContextType {
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;
  clearSelectedAgent: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

interface AgentProviderProps {
  children: ReactNode;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ children }) => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const clearSelectedAgent = () => {
    setSelectedAgent(null);
  };

  return (
    <AgentContext.Provider
      value={{
        selectedAgent,
        setSelectedAgent,
        clearSelectedAgent,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = (): AgentContextType => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};
