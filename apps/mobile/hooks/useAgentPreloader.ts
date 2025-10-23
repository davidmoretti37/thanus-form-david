import { useEffect, useState } from 'react';
import { agentService } from '@/services/agentService';

export const useAgentPreloader = () => {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);

  useEffect(() => {
    const preloadAgents = async () => {
      if (isPreloaded || isPreloading) return;
      
      setIsPreloading(true);
      try {
        await agentService.preloadAgents();
        setIsPreloaded(true);
        console.log('Agents preloaded successfully');
      } catch (error) {
        console.log('Agent preload failed:', error);
      } finally {
        setIsPreloading(false);
      }
    };

    preloadAgents();
  }, [isPreloaded, isPreloading]);

  return {
    isPreloaded,
    isPreloading,
    preloadAgents: () => {
      if (!isPreloading) {
        agentService.preloadAgents().catch(console.log);
      }
    }
  };
};
