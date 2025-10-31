import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Alert, Linking } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { 
  X, 
  CreditCard, 
  CheckCircle, 
  Clock, 
  Zap,
  Bot,
  FileText,
  Settings,
  Grid3X3,
  Image,
  Video,
  Presentation,
  Diamond,
  Heart,
  Shield,
  AlertTriangle,
  RotateCcw
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { billingService } from '@/services/billingService';

interface BillingModalProps {
  visible: boolean;
  onClose: () => void;
}

interface PricingTier {
  name: string;
  price: string;
  yearlyPrice?: string;
  description: string;
  buttonText: string;
  isPopular: boolean;
  features: string[];
  monthlyPrice: number;
  yearlyPriceNum?: number;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Plus',
    price: '$20',
    yearlyPrice: '$204',
    description: 'Best for individuals and small teams',
    buttonText: 'Get started',
    isPopular: true,
    monthlyPrice: 20,
    yearlyPriceNum: 204,
    features: [
      '$20 AI token credits/m',
      '5 custom agents',
      'Private projects',
      'Custom abilities',
      '100+ integrations',
      'Premium AI Models',
      'Advanced AI Capabilities',
    ],
  },
  {
    name: 'Pro',
    price: '$50',
    yearlyPrice: '$510',
    description: 'Ideal for growing businesses',
    buttonText: 'Get started',
    isPopular: false,
    monthlyPrice: 50,
    yearlyPriceNum: 510,
    features: [
      '$50 AI token credits/m',
      '20 custom agents',
      'Private projects',
      'Custom abilities',
      '100+ integrations',
      'Premium AI Models',
      'Advanced AI Capabilities',
    ],
  },
  {
    name: 'Business',
    price: '$100',
    yearlyPrice: '$1020',
    description: 'Perfect for large teams',
    buttonText: 'Get started',
    isPopular: false,
    monthlyPrice: 100,
    yearlyPriceNum: 1020,
    features: [
      '$100 AI token credits/m',
      '50 custom agents',
      'Private projects',
      'Custom abilities',
      '100+ integrations',
      'Premium AI Models',
      'Advanced AI Capabilities',
    ],
  },
];

const getFeatureIcon = (feature: string) => {
  if (feature.includes('AI token')) return <Zap size={16} color="#10b981" />;
  if (feature.includes('agents')) return <Bot size={16} color="#3b82f6" />;
  if (feature.includes('projects')) return <FileText size={16} color="#8b5cf6" />;
  if (feature.includes('abilities')) return <Settings size={16} color="#f59e0b" />;
  if (feature.includes('integrations')) return <Grid3X3 size={16} color="#ef4444" />;
  if (feature.includes('AI Models')) return <Diamond size={16} color="#06b6d4" />;
  if (feature.includes('Capabilities')) return <Heart size={16} color="#ec4899" />;
  return <CheckCircle size={16} color="#10b981" />;
};

export const BillingModal: React.FC<BillingModalProps> = ({ visible, onClose }) => {
  const theme = useTheme();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Map app plans to Stripe price IDs via env/extra, so we don't hardcode secrets
  const priceIdMap = {
    Plus: {
      monthly: Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_TIER_2_20_ID || process.env.EXPO_PUBLIC_STRIPE_TIER_2_20_ID,
      yearly: Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_TIER_2_20_YEARLY_ID || process.env.EXPO_PUBLIC_STRIPE_TIER_2_20_YEARLY_ID,
    },
    Pro: {
      monthly: Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_TIER_6_50_ID || process.env.EXPO_PUBLIC_STRIPE_TIER_6_50_ID,
      yearly: Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_TIER_6_50_YEARLY_ID || process.env.EXPO_PUBLIC_STRIPE_TIER_6_50_YEARLY_ID,
    },
    Business: {
      monthly: Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_TIER_12_100_ID || process.env.EXPO_PUBLIC_STRIPE_TIER_12_100_ID,
      yearly: Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_TIER_12_100_YEARLY_ID || process.env.EXPO_PUBLIC_STRIPE_TIER_12_100_YEARLY_ID,
    },
  } as const;

  const handlePlanSelect = async (planName: string) => {
    try {
      setSelectedPlan(planName);
      setLoadingPlan(planName);

      const priceId = priceIdMap[planName as keyof typeof priceIdMap]?.[billingPeriod];
      if (!priceId) {
        Alert.alert('Billing not configured', 'Stripe price ID is missing. Please set EXPO_PUBLIC_STRIPE_* env vars.');
        return;
      }

      // Use a neutral HTTPS return URL; Stripe requires HTTPS. Replace with your production app URL if available.
      const successUrl = 'https://tars.ai/billing/return-success';
      const cancelUrl = 'https://tars.ai/billing/return-cancel';

      const { checkout_url } = await billingService.createCheckoutSession(priceId, successUrl, cancelUrl);
      await Linking.openURL(checkout_url);
    } catch (e: any) {
      Alert.alert('Checkout failed', e?.message || 'Unknown error');
    } finally {
      setLoadingPlan(null);
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.background,
      borderRadius: 16,
      width: '100%',
      maxWidth: 400,
      maxHeight: '90%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingLeft: 20,
      paddingRight: 40, // Match IntegrationsModal close button spacing
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.foreground,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.foreground,
      textAlign: 'center',
      marginBottom: 8,
    },
    description: {
      fontSize: 16,
      color: theme.mutedForeground,
      textAlign: 'center',
      marginBottom: 24,
    },
    billingToggle: {
      flexDirection: 'row',
      backgroundColor: theme.mutedWithOpacity(0.1),
      borderRadius: 8,
      padding: 4,
      marginBottom: 24,
    },
    toggleButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 6,
      alignItems: 'center',
    },
    toggleButtonActive: {
      backgroundColor: '#1f2937', // Force dark color
    },
    toggleButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.mutedForeground,
    },
    toggleButtonTextActive: {
      color: '#ffffff', // Force white text
    },
    pricingGrid: {
      gap: 16,
    },
    pricingCard: {
      backgroundColor: theme.mutedWithOpacity(0.05),
      borderRadius: 12,
      padding: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    pricingCardPopular: {
      borderColor: theme.primary,
      borderWidth: 2,
      backgroundColor: theme.primary + '10',
    },
    cardHeader: {
      alignItems: 'center',
      marginBottom: 16,
    },
    planName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 4,
    },
    planDescription: {
      fontSize: 14,
      color: theme.mutedForeground,
      textAlign: 'center',
      marginBottom: 8,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      marginBottom: 8,
    },
    price: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.foreground,
    },
    pricePeriod: {
      fontSize: 16,
      color: theme.mutedForeground,
      marginLeft: 4,
    },
    popularBadge: {
      backgroundColor: '#1f2937', // Force dark color
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 8,
    },
    popularBadgeText: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: '600',
    },
    featuresList: {
      marginBottom: 20,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    featureIcon: {
      marginRight: 12,
    },
    featureText: {
      flex: 1,
      fontSize: 14,
      color: theme.foreground,
    },
    selectButton: {
      backgroundColor: '#1f2937', // Force dark color
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
    },
    selectButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    currentPlanBadge: {
      backgroundColor: theme.mutedWithOpacity(0.2),
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 8,
    },
    currentPlanBadgeText: {
      color: theme.mutedForeground,
      fontSize: 12,
      fontWeight: '600',
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    footerText: {
      fontSize: 12,
      color: theme.mutedForeground,
      textAlign: 'center',
      lineHeight: 16,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Upgrade Your Plan</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={16} color={theme.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Simple, transparent pricing</Text>
            <Text style={styles.description}>No hidden fees. Cancel anytime.</Text>

            {/* Billing Period Toggle */}
            <View style={styles.billingToggle}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  billingPeriod === 'monthly' && styles.toggleButtonActive,
                ]}
                onPress={() => setBillingPeriod('monthly')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    billingPeriod === 'monthly' && styles.toggleButtonTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  billingPeriod === 'yearly' && styles.toggleButtonActive,
                ]}
                onPress={() => setBillingPeriod('yearly')}
              >
                <Text
                  style={[
                    styles.toggleButtonText,
                    billingPeriod === 'yearly' && styles.toggleButtonTextActive,
                  ]}
                >
                  Yearly
                </Text>
              </TouchableOpacity>
            </View>

            {/* Pricing Cards */}
            <View style={styles.pricingGrid}>
              {pricingTiers.map((tier) => (
                <View
                  key={tier.name}
                  style={[
                    styles.pricingCard,
                    tier.isPopular && styles.pricingCardPopular,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    {tier.isPopular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>Most Popular</Text>
                      </View>
                    )}
                    <Text style={styles.planName}>{tier.name}</Text>
                    <Text style={styles.planDescription}>{tier.description}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>
                        {billingPeriod === 'yearly' ? tier.yearlyPrice : tier.price}
                      </Text>
                      <Text style={styles.pricePeriod}>
                        {billingPeriod === 'yearly' ? '/year' : '/month'}
                      </Text>
                    </View>
                    {billingPeriod === 'yearly' && (
                      <Text style={styles.currentPlanBadgeText}>
                        Save ${Math.round((tier.monthlyPrice * 12) - (tier.yearlyPriceNum || 0))} per year
                      </Text>
                    )}
                  </View>

                  <View style={styles.featuresList}>
                    {tier.features.map((feature, index) => (
                      <View key={index} style={styles.featureItem}>
                        <View style={styles.featureIcon}>
                          {getFeatureIcon(feature)}
                        </View>
                        <Text style={styles.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => handlePlanSelect(tier.name)}
                    disabled={loadingPlan === tier.name}
                  >
                    <Text style={styles.selectButtonText}>
                      {loadingPlan === tier.name ? 'Opening…' : tier.buttonText}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              All plans include a 7-day free trial. Cancel anytime.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};
