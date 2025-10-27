import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/hooks/useThemeColor';

type Particle = {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  opacity: number;
};

const DEFAULT_ACCENT_COLOR = '#22c55e';

const clampOpacity = (value: number) => {
  if (Number.isNaN(value)) return 1;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const hexToRgba = (hex: string, alpha: number) => {
  let sanitized = hex.replace('#', '');
  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (sanitized.length !== 6) {
    return hexToRgba(DEFAULT_ACCENT_COLOR, alpha);
  }

  const num = parseInt(sanitized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${clampOpacity(alpha)})`;
};

const rgbStringToRgba = (rgb: string, alpha: number) => {
  const match = rgb.match(/rgba?\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (!match) {
    return hexToRgba(DEFAULT_ACCENT_COLOR, alpha);
  }

  const [, r, g, b] = match;
  return `rgba(${r}, ${g}, ${b}, ${clampOpacity(alpha)})`;
};

const colorWithOpacity = (color: string | undefined, alpha: number) => {
  if (!color) {
    return hexToRgba(DEFAULT_ACCENT_COLOR, alpha);
  }

  if (color.startsWith('#')) {
    return hexToRgba(color, alpha);
  }

  if (color.startsWith('rgb')) {
    return rgbStringToRgba(color, alpha);
  }

  return hexToRgba(DEFAULT_ACCENT_COLOR, alpha);
};

interface AnimatedKnowledgeBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  height?: number;
  showShimmer?: boolean;
  accentColor?: string;
  backgroundTintOpacity?: number;
  motionSpeedMultiplier?: number;
  connectionIntensity?: number;
}

const PARTICLE_COUNT = 28;
const CONNECTION_DISTANCE = 90;
const BASE_VELOCITY = 0.35;
const MIN_SPEED_MULTIPLIER = 0.1;
const MIN_INTERVAL_MS = 16;
const MIN_CONNECTION_INTENSITY = 0.1;
const MAX_CONNECTION_INTENSITY = 2;

export const AnimatedKnowledgeBackground: React.FC<AnimatedKnowledgeBackgroundProps> = ({
  children,
  style,
  height = 220,
  showShimmer = true,
  accentColor,
  backgroundTintOpacity = 0.18,
  motionSpeedMultiplier = 1,
  connectionIntensity = 1,
}) => {
  const theme = useTheme();
  const [layout, setLayout] = useState({ width: 0, height });
  const [, forceRerender] = useState(0);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);
  const speedRef = useRef<number>(Math.max(MIN_SPEED_MULTIPLIER, motionSpeedMultiplier));

  const shimmer = useRef(new Animated.Value(0)).current;
  const shimmerAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const themePrimary = (theme as any).primary as string | undefined;
  const themePrimaryWithOpacity = (theme as any).primaryWithOpacity as ((opacity: number) => string) | undefined;
  const themeBackgroundWithOpacity = (theme as any).backgroundWithOpacity as ((opacity: number) => string) | undefined;
  const isDarkTheme = Boolean((theme as any).isDark);
  const speedMultiplier = Math.max(MIN_SPEED_MULTIPLIER, motionSpeedMultiplier);
  const clampedConnectionIntensity = Math.max(
    MIN_CONNECTION_INTENSITY,
    Math.min(connectionIntensity, MAX_CONNECTION_INTENSITY),
  );
  const effectiveConnectionDistance = CONNECTION_DISTANCE * clampedConnectionIntensity;
  const symbolBaseOpacity = isDarkTheme ? 0.12 : 0.24;

  const getAccentColor = useCallback(
    (opacity: number) => {
      if (accentColor) {
        return colorWithOpacity(accentColor, opacity);
      }

      if (typeof themePrimary === 'string') {
        return colorWithOpacity(themePrimary, opacity);
      }

      if (typeof themePrimaryWithOpacity === 'function') {
        return themePrimaryWithOpacity(opacity);
      }

      return colorWithOpacity(undefined, opacity);
    },
    [accentColor, themePrimary, themePrimaryWithOpacity],
  );

  const containerBackgroundColor = accentColor
    ? colorWithOpacity(accentColor, backgroundTintOpacity)
    : typeof themeBackgroundWithOpacity === 'function'
      ? themeBackgroundWithOpacity(0.35)
      : (theme as any).background;

  useEffect(() => {
    if (!showShimmer) {
      shimmerAnimation.current?.stop();
      shimmer.stopAnimation();
      shimmer.setValue(0);
      return;
    }

    shimmerAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 4500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    shimmerAnimation.current.start();

    return () => {
      shimmerAnimation.current?.stop();
    };
  }, [showShimmer, shimmer]);

  const initializeParticles = useCallback((width: number, heightValue: number, speed: number) => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * heightValue,
      radius: Math.random() * 2.2 + 1.2,
      vx: (Math.random() - 0.5) * BASE_VELOCITY * speed,
      vy: (Math.random() - 0.5) * BASE_VELOCITY * speed,
      opacity: Math.random() * 0.4 + 0.3,
    }));
    forceRerender((v) => v + 1);
  }, []);

  useEffect(() => {
    if (layout.width === 0 || layout.height === 0) return;

    if (particlesRef.current.length === 0 || speedRef.current !== speedMultiplier) {
      initializeParticles(layout.width, layout.height, speedMultiplier);
      speedRef.current = speedMultiplier;
    }

    const intervalDelay = Math.max(MIN_INTERVAL_MS, 60 / speedMultiplier);

    const interval = setInterval(() => {
      const nextParticles = particlesRef.current.map((particle) => {
        let { x, y, vx, vy } = particle;
        x += vx;
        y += vy;

        if (x <= 0 || x >= layout.width) {
          vx *= -1;
        }
        if (y <= 0 || y >= layout.height) {
          vy *= -1;
        }

        x = Math.max(0, Math.min(layout.width, x));
        y = Math.max(0, Math.min(layout.height, y));

        return {
          ...particle,
          x,
          y,
          vx,
          vy,
        };
      });

      particlesRef.current = nextParticles;
      frameRef.current += 1;
      forceRerender((v) => v + 1);
    }, intervalDelay);

    return () => clearInterval(interval);
  }, [layout, initializeParticles, speedMultiplier]);

  const connections = useMemo(() => {
    const nodes = particlesRef.current;
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; opacity: number }> = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < effectiveConnectionDistance) {
          const intensityScale = clampedConnectionIntensity;
          lines.push({
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            opacity: (1 - distance / effectiveConnectionDistance) * 0.18 * intensityScale,
          });
        }
      }
    }

    return lines;
  }, [layout.width, layout.height, frameRef.current, effectiveConnectionDistance, clampedConnectionIntensity]);

  const codeSymbols = useMemo(() => ['<', '>', '{', '}', '[', ']', '/', '=', '+', '-'], []);

  const handleLayout = useCallback((event: any) => {
    const { width, height: layoutHeight } = event.nativeEvent.layout;
    setLayout({ width, height: layoutHeight || height });
  }, [height]);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-layout.width || -300, layout.width || 300],
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: containerBackgroundColor },
        { height },
        style,
      ]}
      onLayout={handleLayout}
    >
      {layout.width > 0 && layout.height > 0 && (
        <Svg width={layout.width} height={layout.height} style={StyleSheet.absoluteFill}>
          {connections.map((line, index) => (
            <Line
              key={`line-${index}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={getAccentColor(Math.min(line.opacity + 0.08, 0.35))}
              strokeWidth={1}
            />
          ))}

          {particlesRef.current.map((particle, index) => (
            <Circle
              key={`particle-${index}`}
              cx={particle.x}
              cy={particle.y}
              r={particle.radius}
              fill={getAccentColor(Math.min(particle.opacity + 0.1, 1))}
            />
          ))}

          {codeSymbols.map((symbol, index) => {
            const x = ((frameRef.current * 0.7) + index * 60) % (layout.width || 1);
            const y = 30 + ((index * 28) % Math.max(layout.height - 60, 80));
            return (
              <SvgText
                key={`symbol-${symbol}-${index}`}
                x={x}
                y={y}
                fill={getAccentColor(symbolBaseOpacity)}
                fontSize={12}
              >
                {symbol}
              </SvgText>
            );
          })}
        </Svg>
      )}

      {showShimmer && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmer,
            {
              backgroundColor: accentColor
                ? getAccentColor(0.16)
                : themePrimaryWithOpacity
                  ? themePrimaryWithOpacity(0.1)
                  : 'rgba(255,255,255,0.08)',
              transform: [{ translateX: shimmerTranslate }],
            },
          ]}
        />
      )}

      <View
        style={[
          styles.overlay,
          accentColor
            ? {
                borderColor: colorWithOpacity(accentColor, 0.3),
                backgroundColor: 'transparent',
              }
            : {
                borderColor: themePrimaryWithOpacity
                  ? themePrimaryWithOpacity(0.05)
                  : 'rgba(255,255,255,0.05)',
                backgroundColor: 'transparent',
              },
        ]}
        pointerEvents="none"
      />

      <View style={[styles.content, { zIndex: 10, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 180,
    opacity: 0.35,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});


