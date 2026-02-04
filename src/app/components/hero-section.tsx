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
              src="/aquiles-capa.png"
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

            {/* Titles */}
            <div className="absolute top-6 left-0 right-0 flex flex-col items-center text-center px-4 z-20">
              <span className="text-xs tracking-[0.35em] text-white/70 uppercase">
                A film by Christopher Nolan
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-[0.35em] text-blue-200">
                THE ODYSSEY
              </h1>
            </div>

            {/* Tagline + Date */}
            <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center text-center px-4 z-20">
              <span className="text-xs tracking-[0.4em] text-red-500 uppercase">
                Defy the Gods
              </span>
              <span className="mt-2 text-base font-semibold tracking-[0.25em] text-white">
                07.17.26
              </span>
            </div>

            {/* Genre/Rating Badges OVER Image */}
            <div className="absolute bottom-4 left-0 right-0">
              <div className="mx-auto flex w-full max-w-[300px] items-center justify-center gap-1.5 px-3 flex-nowrap">
              <Badge
                className="bg-white text-black text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ animation: 'badge-fade-up 450ms ease-out 80ms both' }}
              >
                Pré-order
              </Badge>
              <Badge
                className="bg-gray-900/80 backdrop-blur-sm text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full"
                style={{ animation: 'badge-fade-up 450ms ease-out 140ms both' }}
              >
                2026
              </Badge>
              <Badge
                className="bg-gray-900/80 backdrop-blur-sm text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full"
                style={{ animation: 'badge-fade-up 450ms ease-out 200ms both' }}
              >
                Ação | Fantasia
              </Badge>
              <Badge
                className="bg-gray-900/80 backdrop-blur-sm text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full"
                style={{ animation: 'badge-fade-up 450ms ease-out 260ms both' }}
              >
                +18
              </Badge>
              </div>
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
