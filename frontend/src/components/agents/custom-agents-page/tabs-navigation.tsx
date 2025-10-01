'use client';

import React from 'react';
import { Bot, ShoppingBag, FileText, Plus } from 'lucide-react';
import { FancyTabs, TabConfig } from '@/components/ui/fancy-tabs';
import { useLanguage } from '@/contexts/LanguageContext';

interface TabsNavigationProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  onCreateAgent?: () => void;
}

const agentTabs: TabConfig[] = [
  {
    value: 'my-agents',
    icon: Bot,
    label: 'Meus Agentes',
  },
  {
    value: 'marketplace',
    icon: ShoppingBag,
    label: 'Mercado',
  },
];

export const TabsNavigation = ({ activeTab, onTabChange, onCreateAgent }: TabsNavigationProps) => {
  const tabs = React.useMemo(() => {
    if (onCreateAgent) {
      return [
        ...agentTabs,
        { value: 'create-agent', icon: Plus, label: 'Criar Agente' }
      ];
    }
    return agentTabs;
  }, [onCreateAgent]);

  const handleTabSelection = (value: string) => {
    if (value === 'create-agent') {
      onCreateAgent?.();
    } else {
      onTabChange(value);
    }
  };

  return (
    <FancyTabs
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabSelection}
    />
);
}
