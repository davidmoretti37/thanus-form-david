'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  originalX?: number;
  originalY?: number;
  targetX?: number;
  targetY?: number;
  angle?: number;
  radius?: number;
  isCircling?: boolean;
  spreading?: boolean;
}

interface CosmicParticlesProps {
  isFocused?: boolean;
}

export function CosmicParticles({ isFocused = false }: CosmicParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles ONLY ONCE
    if (particlesRef.current.length === 0) {
      const particleCount = Math.floor((canvas.width * canvas.height) / 7700);
      
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          size: Math.random() * 0.7 + 0.35,
          opacity: Math.random() * 0.5 + 0.3,
          life: Math.random() * 1500 + 1000,
        });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Center of the screen for title area
      const centerX = canvas.width / 2;
      const centerY = canvas.height * 0.32; // Adjusted to match text position
      const circleRadius = 209; // Reduced by 5% (220 * 0.95 = 209)

      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        if (isFocused) {
          // When focused, move particles to form a circle around the title
          if (!particle.isCircling) {
            // Initialize circular motion
            particle.originalX = particle.x;
            particle.originalY = particle.y;
            particle.angle = Math.random() * Math.PI * 2;
            particle.radius = circleRadius + (Math.random() - 0.5) * 50; // Slight variation
            particle.isCircling = true;
          }

          // Update angle for clockwise rotation (very slow)
          particle.angle += 0.002; // Much slower rotation speed

          // Calculate target position on circle
          particle.targetX = centerX + Math.cos(particle.angle) * particle.radius;
          particle.targetY = centerY + Math.sin(particle.angle) * particle.radius;

          // Smoothly move towards target position
          const lerpFactor = 0.02; // Smooth transition
          particle.x += (particle.targetX - particle.x) * lerpFactor;
          particle.y += (particle.targetY - particle.y) * lerpFactor;

          // Increase opacity when circling
          particle.opacity = Math.min(particle.opacity + 0.01, 0.8);
        } else {
          // When not focused, spread particles back to random positions (inverse of convergence)
          if (particle.isCircling) {
            // Initialize spreading target ONLY ONCE when starting to spread
            if (!particle.spreading) {
              // Mark that this particle is now spreading
              particle.spreading = true;
              // Set random target position anywhere on screen
              particle.targetX = Math.random() * canvas.width;
              particle.targetY = Math.random() * canvas.height;
            }
            
            // Continue moving towards target position smoothly
            const lerpFactor = 0.015; // Slightly slower for more visible movement
            particle.x += (particle.targetX - particle.x) * lerpFactor;
            particle.y += (particle.targetY - particle.y) * lerpFactor;
            
            // Check if reached target position
            const distToTarget = Math.sqrt(
              Math.pow(particle.targetX - particle.x, 2) + Math.pow(particle.targetY - particle.y, 2)
            );
            
            if (distToTarget < 10) {
              // Reset to normal random movement
              particle.isCircling = false;
              particle.spreading = false;
              particle.vx = (Math.random() - 0.5) * 0.2;
              particle.vy = (Math.random() - 0.5) * 0.2;
              particle.opacity = Math.random() * 0.5 + 0.3;
              delete particle.originalX;
              delete particle.originalY;
              delete particle.targetX;
              delete particle.targetY;
              delete particle.angle;
              delete particle.radius;
            }
            
            // Gradually decrease opacity during spreading
            particle.opacity = Math.max(particle.opacity - 0.005, 0.3);
          } else {
            // Normal particle behavior
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;

            // Wrap around screen edges
            if (particle.x < 0) particle.x = canvas.width;
            if (particle.x > canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = canvas.height;
            if (particle.y > canvas.height) particle.y = 0;

            // Regenerate particle if life is over
            if (particle.life <= 0) {
              particle.x = Math.random() * canvas.width;
              particle.y = Math.random() * canvas.height;
              particle.vx = (Math.random() - 0.5) * 0.2;
              particle.vy = (Math.random() - 0.5) * 0.2;
              particle.size = Math.random() * 0.7 + 0.35;
              particle.opacity = Math.random() * 0.5 + 0.3;
              particle.life = Math.random() * 1500 + 1000;
            }

            // Gradually return opacity to normal
            if (particle.opacity > 0.8) {
              particle.opacity = Math.max(particle.opacity - 0.01, 0.3);
            }
          }
        }

        // Draw particle with subtle glow
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        
        // Very subtle glow for particles
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        );
        gradient.addColorStop(0, '#ff44ff'); // Bright magenta center
        gradient.addColorStop(0.5, '#cc00cc'); // Medium magenta
        gradient.addColorStop(1, 'transparent'); // Fade to transparent

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw bright center
        ctx.fillStyle = '#ff66ff';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isFocused]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
}
