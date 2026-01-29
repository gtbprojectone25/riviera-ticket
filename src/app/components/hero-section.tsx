'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'

export function HeroSection() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let rafId = 0
    const durationMs = 12000
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const next = Math.min(100, (elapsed / durationMs) * 100)
      setProgress(next)
      if (next < 100) {
        rafId = requestAnimationFrame(tick)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="min-h-screen text-white relative overflow-y-auto">
      <div className="container mx-auto px-4 py-4 relative z-10">
        <div className="max-w-md mx-auto space-y-4">
          {/* Movie Poster */}
          <div className="relative aspect-2/3 rounded-2xl overflow-hidden">
            <Image
              src="/theodyssey.jpg"
              alt="The Odyssey"
              fill
              className="object-cover"
              priority
            />

            <style>{`
              @keyframes badge-fade-up {
                from { opacity: 0; transform: translateY(6px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            {/* Genre/Rating Badges OVER Image */}
            <div className="absolute bottom-4 left-0 right-0 flex flex-wrap gap-2 justify-center px-4">
              <Badge
                className="bg-white text-black text-xs px-3 py-1 rounded-full font-medium"
                style={{ animation: 'badge-fade-up 450ms ease-out 80ms both' }}
              >
                Pré-order
              </Badge>
              <Badge
                className="bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full"
                style={{ animation: 'badge-fade-up 450ms ease-out 140ms both' }}
              >
                2026
              </Badge>
              <Badge
                className="bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full"
                style={{ animation: 'badge-fade-up 450ms ease-out 200ms both' }}
              >
                Ação | Fantasia
              </Badge>
              <Badge
                className="bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full"
                style={{ animation: 'badge-fade-up 450ms ease-out 260ms both' }}
              >
                +18
              </Badge>
            </div>
          </div>

          {/* Queue Status Card */}
          <Card className="bg-linear-to-br from-slate-900 via-blue-950/30 to-slate-950 border-slate-800/50 overflow-hidden rounded-2xl shadow-xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">
                    Você está na fila
                  </h3>
                  <p className="text-gray-500 text-xs">Tamanho da fila</p>
                </div>
                <div className="text-blue-500 font-bold text-2xl">IMAX</div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-800/50 rounded-full h-1.5">
                <div
                  className="bg-white h-1.5 rounded-full"
                  style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
                />
              </div>

              <p className="text-gray-400 text-sm leading-relaxed">
                Os ingressos podem esgotar a qualquer momento,<br />
                não saia desta página.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
