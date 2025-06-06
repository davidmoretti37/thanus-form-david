'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ThinkingAnimationProps {
  size?: number;
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  angle: number;
  radius: number;
  speed: number;
  size: number;
  opacity: number;
}

export function ThinkingAnimation({ 
  size = 16, 
  className 
}: ThinkingAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  const initializeParticles = () => {
    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size * 0.3;
    const particleCount = 6;

    particlesRef.current = Array.from({ length: particleCount }, (_, i) => ({
      x: centerX,
      y: centerY,
      angle: (i / particleCount) * Math.PI * 2,
      radius: baseRadius,
      speed: 0.08,
      size: size * 0.08,
      opacity: 0.8,
    }));
  };

  const updateParticles = () => {
    const centerX = size / 2;
    const centerY = size / 2;

    particlesRef.current.forEach((particle) => {
      // Rotate particle around center
      particle.angle += particle.speed;
      
      // Calculate position
      particle.x = centerX + Math.cos(particle.angle) * particle.radius;
      particle.y = centerY + Math.sin(particle.angle) * particle.radius;
      
      // Animate opacity for breathing effect
      particle.opacity = 0.6 + Math.sin(Date.now() * 0.005 + particle.angle) * 0.3;
    });
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, size, size);

    particlesRef.current.forEach((particle) => {
      // Gradient radial for glow effect
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

      // Add small white glow
      ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity * 0.4})`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    updateParticles();
    drawParticles(ctx);

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = size;
    canvas.height = size;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    initializeParticles();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className={cn('inline-block', className)}
      style={{
        width: size,
        height: size,
      }}
    />
  );
}