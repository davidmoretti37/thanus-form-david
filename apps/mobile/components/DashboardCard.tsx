import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ArrowRight, Plus, Zap, CreditCard, Plug, KeyRound, Wrench, Palette } from 'lucide-react-native';
import { WebStyleRadialGradient } from './RadialGradient';

type CardSize = 'large' | 'medium' | 'small'

export interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onPress?: () => void;
  gradient?: string[];
  size?: CardSize; // visual density/height
  glowColorA?: string; // soft background glow color A
  glowColorB?: string; // soft background glow color B
  image?: any; // image source
  webGradients?: Array<{
    size: { width: number; height: number };
    center: { x: number; y: number };
    color: string;
    opacity: number;
    stopPosition: number;
  }>;
  customBackground?: (props: { height: number; borderRadius: number }) => React.ReactNode;
  disableDefaultBackground?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  icon,
  onPress,
  gradient = ['#2563eb', '#22d3ee'],
  size = 'medium',
  glowColorA = 'rgba(37, 99, 235, 0.35)',
  glowColorB = 'rgba(34, 211, 238, 0.30)',
  image,
  webGradients,
  customBackground,
  disableDefaultBackground = false,
}) => {
  const theme = useTheme();
  const colorScheme = useColorScheme();

  // Dynamic border color and width based on theme
  const borderColor = colorScheme === 'dark' ? '#ffffff' : '#000000';
  const borderWidth = colorScheme === 'dark' ? 0.5 : 1;

  // Size tokens
  const heightBySize = size === 'large' ? 180 : size === 'small' ? 112 : 144;
  const titleSize = size === 'large' ? 20 : 18;
  const descSize = 14;
  const paddingH = size === 'large' ? 22 : 20;
  const paddingV = size === 'large' ? 22 : 18;

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.background,
      borderRadius: 16,
      paddingHorizontal: paddingH,
      paddingVertical: paddingV,
      marginBottom: 16,
      borderWidth,
      borderColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 6,
      overflow: 'hidden',
      minHeight: heightBySize,
    },
    backgroundWrap: {
      position: 'absolute',
      inset: 0 as any,
      borderRadius: 16,
    },
    glowA: {
      position: 'absolute',
      width: 400,
      height: 300,
      borderRadius: 200,
      backgroundColor: glowColorA,
      top: -120,
      left: -100,
      opacity: 0.6,
    },
    glowB: {
      position: 'absolute',
      width: 350,
      height: 280,
      borderRadius: 200,
      backgroundColor: glowColorB,
      right: -120,
      top: -60,
      opacity: 0.5,
    },
    glowC: {
      position: 'absolute',
      width: 500,
      height: 400,
      borderRadius: 250,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      top: -150,
      left: -150,
      opacity: 0.3,
    },
    surface: {
      position: 'absolute',
      inset: 0 as any,
      borderRadius: 16,
      backgroundColor: 'transparent',
      // Remove border for seamless blending
      borderWidth: 0,
      // Add subtle shadow for depth without borders
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    cardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    leftSection: {
      flex: 1,
      marginRight: 16,
    },
    title: {
      fontSize: titleSize,
      fontWeight: '600',
      color: theme.foreground,
      marginBottom: 4,
    },
    description: {
      fontSize: descSize,
      color: theme.foreground,
      lineHeight: 20,
    },
    iconContainer: {
      width: size === 'large' ? 56 : 48,
      height: size === 'large' ? 56 : 48,
      borderRadius: 12,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    arrowContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: theme.mutedWithOpacity(0.1),
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 16,
      overflow: 'hidden',
    },
    backgroundImage: {
      width: '100%',
      height: '150%',
      transform: [{ translateY: -25 }],
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'transparent',
      borderRadius: 16,
    },
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Web-style radial gradients with exact same patterns */}
      <View pointerEvents="none" style={styles.backgroundWrap}>
        {!disableDefaultBackground && (
          webGradients ? (
            <WebStyleRadialGradient
              gradients={webGradients}
              containerSize={{ width: 400, height: heightBySize }}
              style={{ borderRadius: 16 }}
            />
          ) : (
            <>
              <View style={styles.glowC} />
              <View style={styles.glowA} />
              <View style={styles.glowB} />
            </>
          )
        )}
        <View style={styles.surface} />
      </View>
      {(customBackground || image) && (
        <View style={styles.imageContainer} pointerEvents="none">
          {customBackground ? (
            customBackground({ height: heightBySize, borderRadius: 16 })
          ) : (
            <Image 
              source={image} 
              style={styles.backgroundImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.overlay} />
        </View>
      )}
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.leftSection}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={styles.arrowContainer}>
          <ArrowRight size={16} color={theme.mutedForeground} />
        </View>
      </View>
    </TouchableOpacity>
  );
};
