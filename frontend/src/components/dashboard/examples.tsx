'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BarChart3,
  Briefcase,
  Settings,
  TrendingUp,
  Users,
  Shield,
  Target,
  Brain,
  Globe,
  Heart,
  PenTool,
  Camera,
  Calendar,
  DollarSign,
  Rocket,
  RefreshCw,
} from 'lucide-react';

type PromptExample = {
  title: string;
  query: string;
  icon: React.ReactNode;
};

interface ExamplesProps {
  onSelectPrompt?: (query: string) => void;
  count?: number;
}

export const Examples: React.FC<ExamplesProps> = ({
  onSelectPrompt,
  count = 3,
}) => {
  // Use the language context to get the current language and translation function
  const { language, t } = useLanguage();
  const [displayedPrompts, setDisplayedPrompts] = useState<PromptExample[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Define all prompts with translations
  const allPrompts: PromptExample[] = React.useMemo(() => [
    {
      title: t('dashboard.examples.findBakeries.title'),
      query: t('dashboard.examples.findBakeries.query'),
      icon: <Globe className="text-blue-700 dark:text-blue-400" size={16} />,
    },
    {
      title: t('dashboard.examples.researchEducation.title'),
      query: t('dashboard.examples.researchEducation.query'),
      icon: <BarChart3 className="text-purple-700 dark:text-purple-400" size={16} />,
    },
    {
      title: t('dashboard.examples.planTravel.title'),
      query: t('dashboard.examples.planTravel.query'),
      icon: <Calendar className="text-rose-700 dark:text-rose-400" size={16} />,
    },
    {
      title: t('dashboard.examples.analyzeNews.title'),
      query: t('dashboard.examples.analyzeNews.query'),
      icon: <PenTool className="text-indigo-700 dark:text-indigo-400" size={16} />,
    },
    {
      title: t('dashboard.examples.buildFinancialModel.title'),
      query: t('dashboard.examples.buildFinancialModel.query'),
      icon: <DollarSign className="text-orange-700 dark:text-orange-400" size={16} />,
    },
    {
      title: t('dashboard.examples.developMarketStrategy.title'),
      query: t('dashboard.examples.developMarketStrategy.query'),
      icon: <Target className="text-cyan-700 dark:text-cyan-400" size={16} />,
    },
    {
      title: t('dashboard.examples.researchCompany.title'),
      query: t('dashboard.examples.researchCompany.query'),
      icon: <Briefcase className="text-teal-700 dark:text-teal-400" size={16} />,
    },
    {
      title: t('dashboard.examples.auditCalendar.title'),
      query: t('dashboard.examples.auditCalendar.query'),
      icon: <Calendar className="text-violet-700 dark:text-violet-400" size={16} />,
    },
    {
      title: t('dashboard.examples.researchIndustryTrends.title'),
      query: t('dashboard.examples.researchIndustryTrends.query'),
      icon: <TrendingUp className="text-pink-700 dark:text-pink-400" size={16} />,
    },
    {
      title: t('dashboard.examples.automateSupportTickets.title'),
      query: t('dashboard.examples.automateSupportTickets.query'),
      icon: <Shield className="text-yellow-600 dark:text-yellow-300" size={16} />,
    },
    {
      title: t('dashboard.examples.researchLegalCompliance.title'),
      query: t('dashboard.examples.researchLegalCompliance.query'),
      icon: <Settings className="text-red-700 dark:text-red-400" size={16} />,
    },
    {
      title: t('dashboard.examples.compileDataAnalysis.title'),
      query: t('dashboard.examples.compileDataAnalysis.query'),
      icon: <BarChart3 className="text-slate-700 dark:text-slate-400" size={16} />,
    },
    {
      title: t('dashboard.examples.planSocialMedia.title'),
      query: t('dashboard.examples.planSocialMedia.query'),
      icon: <Camera className="text-stone-700 dark:text-stone-400" size={16} />,
    },
    {
      title: t('dashboard.examples.compareProducts.title'),
      query: t('dashboard.examples.compareProducts.query'),
      icon: <Brain className="text-fuchsia-700 dark:text-fuchsia-400" size={16} />,
    },
    {
      title: t('dashboard.examples.analyzeMarketOpportunities.title'),
      query: t('dashboard.examples.analyzeMarketOpportunities.query'),
      icon: <Rocket className="text-green-600 dark:text-green-300" size={16} />,
    },
    {
      title: t('dashboard.examples.processInvoices.title'),
      query: t('dashboard.examples.processInvoices.query'),
      icon: <Heart className="text-amber-700 dark:text-amber-400" size={16} />,
    },
    {
      title: t('dashboard.examples.sourceTalent.title'),
      query: t('dashboard.examples.sourceTalent.query'),
      icon: <Users className="text-blue-600 dark:text-blue-300" size={16} />,
    },
    {
      title: t('dashboard.examples.buildWebsite.title'),
      query: t('dashboard.examples.buildWebsite.query'),
      icon: <Globe className="text-red-600 dark:text-red-300" size={16} />,
    }
  ], [language, t]); // Recreate prompts when language or t function changes

  const getRandomPrompts = useCallback((prompts: PromptExample[], promptCount: number = 3): PromptExample[] => {
    if (!prompts.length) return [];
    const shuffled = [...prompts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(promptCount, prompts.length));
  }, []);

  // Update displayed prompts when count or allPrompts changes
  useEffect(() => {
    if (allPrompts.length > 0) {
      setDisplayedPrompts(prev => {
        // Only update if count changed or we don't have any prompts yet
        if (prev.length === 0 || prev.length !== count) {
          return getRandomPrompts(allPrompts, count);
        }
        return prev;
      });
    }
  }, [count, allPrompts, getRandomPrompts]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setDisplayedPrompts(getRandomPrompts(allPrompts, count));
    const timer = setTimeout(() => setIsRefreshing(false), 300);
    return () => clearTimeout(timer);
  }, [allPrompts, count, getRandomPrompts]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="group relative">
        <div className="flex gap-2 justify-center py-2 flex-wrap">
          {displayedPrompts.map((prompt, index) => (
            <motion.div
              key={`${prompt.title}-${index}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.3,
                delay: index * 0.03,
                ease: "easeOut"
              }}
            >
              <Button
                variant="outline"
                className="w-fit h-fit px-3 py-2 rounded-full border-neutral-200 dark:border-neutral-800 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-sm font-normal text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => onSelectPrompt && onSelectPrompt(prompt.query)}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0">
                    {React.cloneElement(prompt.icon as React.ReactElement, { size: 14 })}
                  </div>
                  <span className="whitespace-nowrap">{prompt.title}</span>
                </div>
              </Button>
            </motion.div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="absolute -top-4 right-1 h-5 w-5 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <motion.div
            animate={{ rotate: isRefreshing ? 360 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <RefreshCw size={10} className="text-muted-foreground" />
          </motion.div>
        </Button>
      </div>
    </div>
  );
};