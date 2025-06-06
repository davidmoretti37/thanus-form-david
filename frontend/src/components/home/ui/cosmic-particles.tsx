'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  targetX?: number;
  targetY?: number;
  angle?: number;
  radius?: number;
  originalX?: number;
  originalY?: number;
}

interface CosmicParticlesProps {
  particleCount?: number;
  isInputFocused?: boolean;
  className?: string;
}

export const CosmicParticles: React.FC<CosmicParticlesProps> = ({
  particleCount = 150,
  isInputFocused = false,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isInView, setIsInView] = useState(false);

  const createParticle = useCallback((width: number, height: number, isSmall: boolean = false): Particle => {
    const baseSize = Math.random() * 0.8 + 0.2; // Tamanho base (0.2 - 1.0)
    const finalSize = isSmall ? baseSize * 0.7 : baseSize; // 30% menores para as novas partículas
    
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: finalSize,
      opacity: Math.random() * 0.6 + 0.4,
    };
  }, []);

  const initializeParticles = useCallback(() => {
    if (canvasSize.width === 0 || canvasSize.height === 0) return;
    
    const halfCount = Math.floor(particleCount / 2);
    const particles = [];
    
    // Primeira metade: partículas originais (tamanho normal)
    for (let i = 0; i < halfCount; i++) {
      particles.push(createParticle(canvasSize.width, canvasSize.height, false));
    }
    
    // Segunda metade: partículas novas (30% menores)
    for (let i = halfCount; i < particleCount; i++) {
      particles.push(createParticle(canvasSize.width, canvasSize.height, true));
    }
    
    particlesRef.current = particles;
  }, [particleCount, canvasSize, createParticle]);

  const updateParticles = useCallback(() => {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height * 0.4; // Círculo 20% para cima (0.5 - 0.1 = 0.4)
    const circleRadius = 200; // Círculo maior para englobar os textos

    particlesRef.current.forEach((particle, index) => {
      if (isInputFocused) {
        // Movimento para formar círculo ao redor do centro
        if (!particle.angle) {
          particle.angle = (index / particlesRef.current.length) * Math.PI * 2;
          particle.originalX = particle.x;
          particle.originalY = particle.y;
        }

        const targetX = centerX + Math.cos(particle.angle + Date.now() * 0.001) * circleRadius;
        const targetY = centerY + Math.sin(particle.angle + Date.now() * 0.001) * circleRadius;

        // Interpolação suave para o círculo
        particle.x += (targetX - particle.x) * 0.02;
        particle.y += (targetY - particle.y) * 0.02;

        // Rotação no sentido horário
        particle.angle += 0.01;
      } else {
        // Movimento livre/espalhado
        if (particle.originalX !== undefined && particle.originalY !== undefined) {
          // Volta para posição original suavemente
          particle.x += (particle.originalX - particle.x) * 0.01;
          particle.y += (particle.originalY - particle.y) * 0.01;

          // Se chegou próximo da posição original, volta ao movimento livre
          if (Math.abs(particle.x - particle.originalX) < 5 && Math.abs(particle.y - particle.originalY) < 5) {
            particle.originalX = undefined;
            particle.originalY = undefined;
            particle.angle = undefined;
          }
        } else {
          // Movimento livre normal
          particle.x += particle.vx;
          particle.y += particle.vy;

          // Bounce nas bordas
          if (particle.x <= 0 || particle.x >= canvasSize.width) {
            particle.vx *= -1;
          }
          if (particle.y <= 0 || particle.y >= canvasSize.height) {
            particle.vy *= -1;
          }

          // Mantem dentro dos limites
          particle.x = Math.max(0, Math.min(canvasSize.width, particle.x));
          particle.y = Math.max(0, Math.min(canvasSize.height, particle.y));
        }
      }

      // Variação suave na opacidade
      particle.opacity += (Math.random() - 0.5) * 0.02;
      particle.opacity = Math.max(0.1, Math.min(1, particle.opacity));
    });
  }, [isInputFocused, canvasSize]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    particlesRef.current.forEach((particle) => {
      // Gradient radial para efeito de brilho
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 2
      );
      
      gradient.addColorStop(0, `rgba(255, 0, 255, ${particle.opacity})`); // Magenta core
      gradient.addColorStop(0.5, `rgba(255, 64, 255, ${particle.opacity * 0.6})`); // Magenta medium
      gradient.addColorStop(1, `rgba(255, 128, 255, 0)`); // Magenta fade

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();

      // Adiciona um pequeno brilho extra
      ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity * 0.3})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [canvasSize]);

  const animate = useCallback(() => {
    if (!isInView) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    updateParticles();
    drawParticles(ctx);

    animationRef.current = requestAnimationFrame(animate);
  }, [updateParticles, drawParticles, isInView]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        const newWidth = rect.width;
        const newHeight = rect.height;
        setCanvasSize({ width: newWidth, height: newHeight });
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.style.width = `${newWidth}px`;
        canvas.style.height = `${newHeight}px`;
      }
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    intersectionObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    initializeParticles();
  }, [initializeParticles]);

  useEffect(() => {
    if (isInView) {
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [animate, isInView]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{
        width: canvasSize.width,
        height: canvasSize.height,
      }}
    />
  );
};