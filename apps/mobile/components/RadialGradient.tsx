import React from 'react';
import { View, StyleSheet } from 'react-native';

interface RadialGradientProps {
  colors: string[];
  positions: number[];
  size: { width: number; height: number };
  center: { x: number; y: number };
  style?: any;
}

export const RadialGradient: React.FC<RadialGradientProps> = ({
  colors,
  positions,
  size,
  center,
  style,
}) => {
  // Simple fallback - just return a single colored view
  return (
    <View style={[StyleSheet.absoluteFillObject, style]} />
  );
};

// Web-style radial gradient implementation
interface WebStyleRadialGradientProps {
  gradients: Array<{
    size: { width: number; height: number };
    center: { x: number; y: number };
    color: string;
    opacity: number;
    stopPosition: number;
  }>;
  containerSize: { width: number; height: number };
  style?: any;
}

export const WebStyleRadialGradient: React.FC<WebStyleRadialGradientProps> = ({
  gradients,
  containerSize,
  style,
}) => {
  return (
    <View style={[StyleSheet.absoluteFillObject, style]}>
      {gradients.map((gradient, index) => {
        // Convert percentage positions to actual coordinates
        const centerX = (gradient.center.x / 100) * containerSize.width;
        const centerY = (gradient.center.y / 100) * containerSize.height;
        
        // Create ultra-smooth, deeply embedded gradient effect
        const layers = [];
        for (let i = 0; i < 20; i++) {
          const scale = 1 - (i * 0.05); // Scale from 1.0 to 0.0 for perfect fade
          const layerOpacity = gradient.opacity * Math.pow(0.92, i); // Much slower fade for deeper embedding
          const blurRadius = i * 3; // More aggressive blur for seamless blending
          
          layers.push(
            <View
              key={`${index}-${i}`}
              style={[
                StyleSheet.absoluteFillObject,
                {
                  width: gradient.size.width * scale,
                  height: gradient.size.height * scale,
                  left: centerX - (gradient.size.width * scale) / 2,
                  top: centerY - (gradient.size.height * scale) / 2,
                  borderRadius: Math.max(gradient.size.width, gradient.size.height) * scale / 2,
                  backgroundColor: gradient.color,
                  opacity: layerOpacity,
                  // Enhanced shadow system for seamless blending
                  shadowColor: gradient.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: layerOpacity * 0.3,
                  shadowRadius: blurRadius,
                  elevation: 0,
                },
              ]}
            />
          );
        }
        
        return <View key={index}>{layers}</View>;
      })}
    </View>
  );
};
