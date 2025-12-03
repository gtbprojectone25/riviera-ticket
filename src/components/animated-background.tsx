'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  length: number      // comprimento do risco
  thickness: number   // espessura (bem fina)
  opacity: number
}

/**
 * Animated background component with ember streaks
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

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // deixa as cores “somando” (brilho de fogo)
    ctx.globalCompositeOperation = 'lighter'

    // Cria 1 partícula
    const createParticle = () => {
      const p: Particle = {
        x: Math.random() * canvas.width,
        y: canvas.height + 20,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -Math.random() * 2.5 - 1.0,
        life: 0,
        maxLife: Math.random() * 150 + 80,
        length: Math.random() * 18 + 4,          // risco mais longo
        thickness: Math.random() * 1.2 + 0.9,    // bem fininho
        opacity: 0
      }
      particlesRef.current.push(p)
    }

    // Inicializa o conjunto
    const initParticles = () => {
      particlesRef.current = []
      const particleCount = Math.min(80, Math.floor((canvas.width * canvas.height) / 10000))
      for (let i = 0; i < particleCount; i++) {
        createParticle()
      }
    }

    // Atualiza partículas
    const updateParticles = () => {
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx
        p.y += p.vy
        p.life++

        const lifeProgress = p.life / p.maxLife
        if (lifeProgress < 0.1) {
          p.opacity = lifeProgress * 10
        } else if (lifeProgress > 0.8) {
          p.opacity = (1 - lifeProgress) * 5
        } else {
          p.opacity = 1
        }

        // movimento meio aleatório
        p.vx += (Math.random() - 0.5) * 0.02
        p.vy += Math.random() * 0.01 - 0.005

        const alive = p.life < p.maxLife && p.y > -50
        if (!alive && particlesRef.current.length < 80) {
          createParticle()
        }

        return alive
      })

      // adiciona algumas aleatórias
      if (Math.random() < 0.3 && particlesRef.current.length < 80) {
        createParticle()
      }
    }

    // Desenha partículas
    const drawParticles = () => {
      // em vez de apagar tudo, pinta um véu escuro → rastro/fumaça
      ctx.fillStyle = 'rgba(5, 0, 0, 0.35)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach(p => {
        ctx.save()
        ctx.translate(p.x, p.y)

        // ângulo baseado na direção da velocidade → risquinho acompanha o movimento
        const angle = Math.atan2(p.vy, p.vx || -0.0001)
        ctx.rotate(angle)

        const halfLen = p.length / 2

        const gradient = ctx.createLinearGradient(0, -halfLen, 0, halfLen)
        gradient.addColorStop(0, `rgba(255, 210, 150, ${p.opacity})`)
        gradient.addColorStop(0.4, `rgba(255, 150, 70, ${p.opacity})`)
        gradient.addColorStop(1, `rgba(230, 80, 20, ${p.opacity * 0.6})`)

        ctx.fillStyle = gradient
        ctx.shadowColor = 'rgba(255, 120, 60, 0.7)'
        ctx.shadowBlur = 6

        // retângulo bem fino com borda arredondada → risco/lasca
        ctx.beginPath()
        ctx.roundRect(
          -p.thickness / 2,
          -halfLen,
          p.thickness,
          p.length,
          p.thickness
        )
        ctx.fill()

        ctx.restore()
      })
    }

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
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0808 30%, #1a0a0a 60%, #0a0a0a 100%)'
      }}
    />
  )
}
