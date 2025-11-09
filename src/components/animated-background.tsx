'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  opacity: number
}

/**
 * Animated background component with red flames effect
 * Optimized for performance with canvas and RAF
 */
export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationIdRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let isAnimating = true

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = []
      const particleCount = Math.min(50, Math.floor((canvas.width * canvas.height) / 15000))
      
      for (let i = 0; i < particleCount; i++) {
        createParticle()
      }
    }

    // Create a single particle
    const createParticle = () => {
      const particle: Particle = {
        x: Math.random() * canvas.width,
        y: canvas.height + 20,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 2 - 1,
        life: 0,
        maxLife: Math.random() * 120 + 60,
        size: Math.random() * 3 + 1,
        opacity: 0
      }
      particlesRef.current.push(particle)
    }

    // Update particles
    const updateParticles = () => {
      particlesRef.current = particlesRef.current.filter(particle => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life++

        // Calculate opacity based on life cycle
        const lifeProgress = particle.life / particle.maxLife
        if (lifeProgress < 0.1) {
          particle.opacity = lifeProgress * 10
        } else if (lifeProgress > 0.8) {
          particle.opacity = (1 - lifeProgress) * 5
        } else {
          particle.opacity = 1
        }

        // Add some randomness to movement
        particle.vx += (Math.random() - 0.5) * 0.02
        particle.vy += Math.random() * 0.01 - 0.005

        return particle.life < particle.maxLife && particle.y > -50
      })

      // Add new particles occasionally
      if (Math.random() < 0.3 && particlesRef.current.length < 50) {
        createParticle()
      }
    }

    // Draw particles
    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach(particle => {
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        )

        // Red flame colors
        gradient.addColorStop(0, `rgba(255, 100, 50, ${particle.opacity * 0.8})`)
        gradient.addColorStop(0.5, `rgba(255, 60, 20, ${particle.opacity * 0.6})`)
        gradient.addColorStop(1, `rgba(200, 40, 0, ${particle.opacity * 0.2})`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    // Animation loop
    const animate = () => {
      if (!isAnimating) return

      updateParticles()
      drawParticles()
      animationIdRef.current = requestAnimationFrame(animate)
    }

    initParticles()
    animate()

    return () => {
      isAnimating = false
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ 
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)' 
      }}
    />
  )
}