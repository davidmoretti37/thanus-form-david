"use client"

import React, { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface Particle {
  x: number
  y: number
  size: number
  speedX: number
  speedY: number
  opacity: number
  color: string
  glowSize: number
  pulseSpeed: number
  pulseDirection: number
  blurAmount: number
  starType: number // 0-2 for different star appearances
}

interface ParticlesCardProps extends React.HTMLAttributes<HTMLDivElement> {
  particleCount?: number
  particleColors?: string[]
  children: React.ReactNode
}

export function ParticlesCard({
  children,
  className,
  particleCount = 20,
  particleColors = ["#9333ea", "#a855f7", "#c084fc", "#d8b4fe"],
  ...props
}: ParticlesCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)

  // Initialize particles
  const initParticles = () => {
    if (!containerRef.current || !canvasRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const particles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      // Determine if this will be a small, medium, or large particle
      const sizeCategory = Math.random()
      let size, opacity, blurAmount
      
      if (sizeCategory < 0.7) { // 70% small particles
        size = Math.random() * 1 + 0.5
        opacity = Math.random() * 0.3 + 0.1
        blurAmount = Math.random() * 1 + 0.5
      } else if (sizeCategory < 0.95) { // 25% medium particles
        size = Math.random() * 1.5 + 1
        opacity = Math.random() * 0.35 + 0.15
        blurAmount = Math.random() * 1.5 + 0.7
      } else { // 5% large particles
        size = Math.random() * 2 + 1.5
        opacity = Math.random() * 0.4 + 0.2
        blurAmount = Math.random() * 2 + 1
      }
      
      particles.push({
        x: Math.random() * containerRect.width,
        y: Math.random() * containerRect.height,
        size: size,
        speedX: (Math.random() - 0.5) * 0.5, // Slower horizontal movement
        speedY: (Math.random() - 0.5) * 0.3, // Slower vertical movement
        opacity: opacity,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        glowSize: Math.random() * 3 + 2, // Smaller glow effect
        pulseSpeed: Math.random() * 0.015 + 0.005, // Slower pulsing effect
        pulseDirection: Math.random() > 0.5 ? 1 : -1, // Direction of pulse (growing or shrinking)
        blurAmount: blurAmount, // Amount of blur to apply
        starType: Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 3) // Mostly simple circles (70%)
      })
    }

    particlesRef.current = particles
  }

  // Animation loop
  const animate = () => {
    if (!canvasRef.current || !containerRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const containerRect = containerRef.current.getBoundingClientRect()
    canvas.width = containerRect.width
    canvas.height = containerRect.height
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Enable global composite operation for glow effect
    ctx.globalCompositeOperation = "lighter"

    // Update and draw particles
    particlesRef.current.forEach(particle => {
      // Update position with very slight randomness for subtle natural movement
      particle.x += particle.speedX + (Math.random() - 0.5) * 0.1
      particle.y += particle.speedY + (Math.random() - 0.5) * 0.1

      // Wrap around edges with some margin
      if (particle.x < -20) particle.x = canvas.width + 20
      if (particle.x > canvas.width + 20) particle.x = -20
      if (particle.y < -20) particle.y = canvas.height + 20
      if (particle.y > canvas.height + 20) particle.y = -20

      // Update pulse effect - more subtle
      particle.size += particle.pulseDirection * particle.pulseSpeed * 0.7
      
      // Reverse pulse direction if size gets too large or small
      if (particle.size > particle.glowSize || particle.size < 0.8) {
        particle.pulseDirection *= -1
      }

      // Very subtle opacity fluctuation for gentle twinkling effect
      particle.opacity = Math.max(particle.opacity * 0.95, Math.min(particle.opacity * 1.05, particle.opacity + (Math.random() - 0.5) * 0.03))

      // Apply blur filter for a soft glow effect
      ctx.filter = `blur(${particle.blurAmount}px)`
      
      // Extract the hex color without alpha
      const baseColor = particle.color
      const alphaHex = Math.floor(particle.opacity * 255).toString(16).padStart(2, '0')
      
      // Different star types - all made more subtle
      // Calculate a lighter version of the base color instead of using pure white
      const colorNum = parseInt(baseColor.substring(1), 16)
      const r = Math.min(255, ((colorNum >> 16) & 255) + 30)
      const g = Math.min(255, ((colorNum >> 8) & 255) + 30)
      const b = Math.min(255, (colorNum & 255) + 30)
      const lighterColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
      
      // Reduce opacity for more subtlety
      const reducedAlphaHex = Math.floor(particle.opacity * 0.7 * 255).toString(16).padStart(2, '0')
      
      switch(particle.starType) {
        case 0: // Simple blurred circle
          // Draw the blurred glow point - smaller and more transparent
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 0.7, 0, Math.PI * 2)
          ctx.fillStyle = baseColor + reducedAlphaHex
          ctx.fill()
          
          // Reset filter for the subtle center
          ctx.filter = 'none'
          
          // Draw a tiny subtle center point
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 0.2, 0, Math.PI * 2)
          ctx.fillStyle = lighterColor + reducedAlphaHex
          ctx.fill()
          break;
          
        case 1: // Cross-shaped star with blur - made smaller
          // Draw a cross shape
          ctx.fillStyle = baseColor + reducedAlphaHex
          
          // Horizontal line - thinner
          ctx.fillRect(
            particle.x - particle.size * 0.9, 
            particle.y - particle.size * 0.2, 
            particle.size * 1.8, 
            particle.size * 0.4
          )
          
          // Vertical line - thinner
          ctx.fillRect(
            particle.x - particle.size * 0.2, 
            particle.y - particle.size * 0.9, 
            particle.size * 0.4, 
            particle.size * 1.8
          )
          
          // Reset filter for the subtle center
          ctx.filter = 'none'
          
          // Draw a tiny subtle center point
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 0.25, 0, Math.PI * 2)
          ctx.fillStyle = lighterColor + reducedAlphaHex
          ctx.fill()
          break;
          
        case 2: // Diamond-shaped star with blur - made smaller
          // Draw a diamond shape
          ctx.fillStyle = baseColor + reducedAlphaHex
          ctx.beginPath()
          ctx.moveTo(particle.x, particle.y - particle.size * 0.9) // Top
          ctx.lineTo(particle.x + particle.size * 0.6, particle.y) // Right
          ctx.lineTo(particle.x, particle.y + particle.size * 0.9) // Bottom
          ctx.lineTo(particle.x - particle.size * 0.6, particle.y) // Left
          ctx.closePath()
          ctx.fill()
          
          // Reset filter for the subtle center
          ctx.filter = 'none'
          
          // Draw a tiny subtle center point
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size * 0.2, 0, Math.PI * 2)
          ctx.fillStyle = lighterColor + reducedAlphaHex
          ctx.fill()
          break;
      }
    })

    // Reset composite operation
    ctx.globalCompositeOperation = "source-over"

    // Continue animation loop
    animationRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    // Initialize and start animation when component mounts
    initParticles()
    animate()

    // Handle window resize
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        canvasRef.current.width = containerRect.width
        canvasRef.current.height = containerRect.height
      }
    }

    window.addEventListener("resize", handleResize)

    // Clean up animation and event listener on unmount
    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <div 
      ref={containerRef} 
      className={cn("relative overflow-visible", className)} 
      {...props}
    >
      <div className="relative">
        {children}
      </div>
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 pointer-events-none z-20"
      />
    </div>
  )
}
