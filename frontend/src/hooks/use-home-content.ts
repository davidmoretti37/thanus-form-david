import { useLanguage } from '@/contexts/LanguageContext';
import { siteConfig as staticSiteConfig } from '@/lib/home';

export const useHomeContent = () => {
  const { t } = useLanguage();
  
  const siteConfig = {
    ...staticSiteConfig,
    name: t('home.site.name'),
    description: t('home.site.description'),
    cta: t('home.site.cta'),
    nav: {
      links: [
        { id: 1, name: t('home.nav.home'), href: '#hero' },
        { id: 2, name: t('home.nav.process'), href: '#process' },
        { id: 4, name: t('home.nav.openSource'), href: '#open-source' },
        { id: 5, name: t('home.nav.pricing'), href: '#pricing' },
        { id: 6, name: t('home.nav.enterprise'), href: '/enterprise' },
      ],
    },
    hero: {
      ...staticSiteConfig.hero,
      badge: t('home.hero.badge'),
      title: t('home.hero.title'),
      description: t('home.hero.description'),
      inputPlaceholder: t('home.hero.inputPlaceholder'),
    },
    cloudPricingItems: staticSiteConfig.cloudPricingItems.map((item) => {
      const pricingItemName = item.name.toLowerCase() as 'basic' | 'pro' | 'enterprise' | 'self-hosted';
      const baseKey = `home.pricing.${pricingItemName}` as const;
      
      return {
        ...item,
        name: t(`${baseKey}.name` as const),
        description: t(`${baseKey}.description` as const),
        buttonText: t(`${baseKey}.buttonText` as const),
        features: item.features.map((_, index) => 
          t(`${baseKey}.features.${index}` as const)
        ),
      };
    }),
    companyShowcase: {
      ...staticSiteConfig.companyShowcase,
      title: t('home.companies.title'),
      description: t('home.companies.description'),
    },
    ctaSection: {
      ...staticSiteConfig.ctaSection,
      title: t('home.cta.title'),
      button: {
        ...staticSiteConfig.ctaSection.button,
        text: t('home.cta.button.text'),
      },
      subtext: t('home.cta.subtext'),
    },
    pricing: {
      title: t('home.pricing.title'),
      description: t('home.pricing.description'),
    },
    footerLinks: [
      {
        title: t('home.footer.tars'),
        links: [
          { id: 1, title: t('home.footer.about'), url: 'https://tars.ai' },
          { id: 3, title: t('home.footer.contact'), url: 'mailto:hey@tars.ai' },
          { id: 4, title: t('home.footer.careers'), url: 'https://tars.ai/careers' },
        ],
      },
      {
        title: t('home.footer.resources'),
        links: [
          {
            id: 5,
            title: t('home.footer.documentation'),
            url: 'https://github.com/inventu-ai/tars',
          },
          { id: 7, title: t('home.footer.discord'), url: 'https://discord.gg/inventuai' },
          { id: 8, title: t('home.footer.github'), url: 'https://github.com/inventu-ai/tars' },
        ],
      },
      {
        title: t('home.footer.legal'),
        links: [
          {
            id: 9,
            title: t('home.footer.privacyPolicy'),
            url: 'https://tars.ai/legal?tab=privacy',
          },
          {
            id: 10,
            title: t('home.footer.termsOfService'),
            url: 'https://tars.ai/legal?tab=terms',
          },
          {
            id: 11,
            title: t('home.footer.license'),
            url: 'https://github.com/inventu-ai/tars/blob/main/LICENSE',
          },
        ],
      },
    ],
    faq: {
      title: t('home.faq.title'),
      items: [
        {
          id: 1,
          question: t('home.faq.items.1.question'),
          answer: t('home.faq.items.1.answer'),
        },
        {
          id: 6,
          question: t('home.faq.items.6.question'),
          answer: t('home.faq.items.6.answer'),
        },
      ],
    },
  };

  return { siteConfig };
};

export default useHomeContent;
