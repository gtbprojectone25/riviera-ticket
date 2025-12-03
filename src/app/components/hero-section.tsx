'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useState } from 'react'
import Image from 'next/image'

export function HeroSection() {
  // gera um valor entre 70 e 100 uma única vez por montagem
  const [progress] = useState(
    () => 70 + Math.floor(Math.random() * 31) // 70–100
  )


   return (
    <div className="min-h-screen text-white relative overflow-y-auto">
      <div className="container mx-auto px-4 py-4 relative z-10">
        <div className="max-w-md mx-auto bg-black rounded-3xl p-6 space-y-4">
          {/* Movie Poster */}
          <div className="relative aspect-2/3 rounded-2xl overflow-hidden">
            <Image
              src="/theodyssey.jpg"
              alt="The Odyssey"
              fill
              className="object-cover"
              priority
            />

            {/* Genre/Rating Badges OVER Image */}
            <div className="absolute bottom-4 left-0 right-0 flex flex-wrap gap-2 justify-center px-4">
              <Badge className="bg-white text-black text-xs px-3 py-1 rounded-full font-medium">
                Pré-order
              </Badge>
              <Badge className="bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                2026
              </Badge>
              <Badge className="bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                Ação | Fantasia
              </Badge>
              <Badge className="bg-gray-900/80 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
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
                  className="bg-white h-1.5 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
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