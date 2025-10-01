'use client';

import { SectionHeader } from '@/components/home/section-header';
import { motion, useInView } from 'motion/react';
import { useRef } from 'react';
import { 
  FileText,
  Image,
  Presentation,
  Globe,
  BarChart3,
  ShoppingCart,
  Users,
  Clock 
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const Capabilities = () => {
  const { t } = useLanguage();
  
  return [
    {
      title: t('home.capabilities.documents.title'),
      description: t('home.capabilities.documents.description'),
      icon: <FileText className="size-6" />,
    },
    {
      title: t('home.capabilities.design.title'),
      description: t('home.capabilities.design.description'),
      icon: <Image className="size-6" />,
    },
    {
      title: t('home.capabilities.presentations.title'),
      description: t('home.capabilities.presentations.description'),
      icon: <Presentation className="size-6" />,
    },
    {
      title: t('home.capabilities.research.title'),
      description: t('home.capabilities.research.description'),
      icon: <Globe className="size-6" />,
    },
    {
      title: t('home.capabilities.analytics.title'),
      description: t('home.capabilities.analytics.description'),
      icon: <BarChart3 className="size-6" />,
    },
    {
      title: t('home.capabilities.automation.title'),
      description: t('home.capabilities.automation.description'),
      icon: <ShoppingCart className="size-6" />,
    },
    {
      title: t('home.capabilities.workflows.title'),
      description: t('home.capabilities.workflows.description'),
      icon: <Users className="size-6" />,
    },
    {
      title: t('home.capabilities.availability.title'),
      description: t('home.capabilities.availability.description'),
      icon: <Clock className="size-6" />,
    },
  ];
};

export function CapabilitiesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  const { t } = useLanguage();
  const capabilities = Capabilities();

  return (
    <section
      id="capabilities"
      className="flex flex-col items-center justify-center w-full relative"
      ref={ref}
    >
      <div className="relative w-full px-6">
        <div className="max-w-6xl mx-auto border-l border-r border-border">
          <SectionHeader>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance pb-1">
              {t('home.capabilities.title')}
            </h2>
            <p className="text-muted-foreground text-center text-balance font-medium">
              {t('home.capabilities.subtitle')}
            </p>
          </SectionHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-border">
            {capabilities.map((capability, index) => (
              <motion.div
                key={capability.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: 'easeOut',
                }}
                className="relative p-6 border-border group hover:bg-accent/5 transition-colors duration-300 [&:not(:nth-child(4n))]:border-r [&:not(:nth-last-child(-n+4))]:border-b"
              >
                {/* Icon */}
                <div className="flex items-center justify-center size-12 bg-secondary/10 rounded-xl mb-4 group-hover:bg-secondary/20 transition-colors duration-300">
                  <div className="text-secondary">
                    {capability.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold tracking-tight">
                    {capability.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {capability.description}
                  </p>
                </div>

              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
