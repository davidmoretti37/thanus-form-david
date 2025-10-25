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

interface AnimatedKnowledgeBackgroundProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  height?: number;
}

const PARTICLE_COUNT = 28;
const CONNECTION_DISTANCE = 90;

export const AnimatedKnowledgeBackground: React.FC<AnimatedKnowledgeBackgroundProps> = ({
  children,
  style,
  height = 220,
}) => {
  const theme = useTheme();
  const [layout, setLayout] = useState({ width: 0, height });
  const [, forceRerender] = useState(0);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef(0);

  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, [shimmer]);

  const initializeParticles = useCallback((width: number, heightValue: number) => {
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * heightValue,
      radius: Math.random() * 2.2 + 1.2,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      opacity: Math.random() * 0.4 + 0.3,
    }));
    forceRerender((v) => v + 1);
  }, []);

  useEffect(() => {
    if (layout.width === 0 || layout.height === 0) return;

    if (particlesRef.current.length === 0) {
      initializeParticles(layout.width, layout.height);
    }

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
    }, 60);

    return () => clearInterval(interval);
  }, [layout, initializeParticles]);

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

        if (distance < CONNECTION_DISTANCE) {
          lines.push({
            x1: a.x,
            y1: a.y,
            x2: b.x,
            y2: b.y,
            opacity: (1 - distance / CONNECTION_DISTANCE) * 0.18,
          });
        }
      }
    }

    return lines;
  }, [layout.width, layout.height, frameRef.current]);

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
        { backgroundColor: theme.backgroundWithOpacity ? theme.backgroundWithOpacity(0.35) : theme.background },
        style,
        { height },
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
              stroke={theme.primaryWithOpacity ? theme.primaryWithOpacity(line.opacity) : 'rgba(74, 222, 128, 0.15)'}
              strokeWidth={1}
            />
          ))}

          {particlesRef.current.map((particle, index) => (
            <Circle
              key={`particle-${index}`}
              cx={particle.x}
              cy={particle.y}
              r={particle.radius}
              fill={theme.primaryWithOpacity ? theme.primaryWithOpacity(particle.opacity) : 'rgba(74, 222, 128, 0.7)'}
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
                fill={theme.primaryWithOpacity ? theme.primaryWithOpacity(0.1) : 'rgba(74, 222, 128, 0.12)'}
                fontSize={12}
              >
                {symbol}
              </SvgText>
            );
          })}
        </Svg>
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          {
            backgroundColor: theme.primaryWithOpacity ? theme.primaryWithOpacity(0.1) : 'rgba(255,255,255,0.08)',
            transform: [{ translateX: shimmerTranslate }],
          },
        ]}
      />

      <View style={styles.overlay} />

      <View style={styles.content}>{children}</View>
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
    height: '100%',
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: 'center',
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


