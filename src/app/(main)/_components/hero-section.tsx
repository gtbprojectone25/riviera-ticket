'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OdysseyLoading } from '@/components/ui/OdysseyLoading'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export function HeroSection() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleNavigateToPreOrder = () => {
    if (isLoading) return
    setIsLoading(true)
    setTimeout(() => {
      router.push('/pre-order')
    }, 14000) 
  }

  return (
    <div className="min-h-screen text-white relative overflow-y-auto flex gap-4 ">
      <OdysseyLoading isLoading={isLoading} />

      <div className="container mx-auto px-4 py-4 relative z-10">
        <div className="max-w-md mx-auto space-y-4">
          {/* Movie Poster */}
          <div 
            className="relative aspect-2/3 rounded-2xl overflow-hidden p-4 mt-0 pt-0 cursor-pointer transition-transform "
            onClick={handleNavigateToPreOrder}
          >
            {/* Movie Poster */}
            <Image
              src="/theodyssey.jpg"
              alt="The Odyssey"
              fill
              className="object-cover"
              priority
            />

            {/* Black fade gradient overlay */}
           <div className="absolute bottom-0 left-0 right-0 h-[65%] bg-linear-to-t from-black to-transparent" />

            {/* Badges */}
            <div className="absolute bottom-4 left-0 right-0 flex flex-wrap gap-2 justify-center px-4 z-20">
              <Badge variant="secondary" className="bg-white text-black text-sm px-3 py-1 rounded-full font-medium">
                Pré-order
              </Badge>
              <Badge variant="secondary" className="bg-gray-900/80 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
                2026
              </Badge>
              <Badge variant="secondary" className="bg-gray-900/80 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
                Ação | Fantasia
              </Badge>
              <Badge variant="secondary" className="bg-gray-900/80 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
                +18
              </Badge>
            </div>
          </div>

           

          <div className="max-w-md mx-auto h-full bg-linear-to-br from-black to-slate-950 rounded-3xl p-4 space-y-5 mt-[-45px] " >
            {/* Queue Status Card */}
            <Card 
              className="bg-linear-to-br from-slate-900 via-blue-950/30 to-slate-950 border-slate-800/50 overflow-hidden rounded-2xl shadow-xl mt-4 pt-0 cursor-pointer transition-transform hover:scale-[1.02]"
              onClick={handleNavigateToPreOrder}
            >
              <CardContent className="p-5 space-y-3">
                {/* Header with Title and IMAX */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">Você está na fila</h3>
                    <p className="text-gray-500 text-xs">Tamanho da fila</p>
                  </div>
                  <div className="text-blue-500 font-bold text-2xl">IMAX</div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-800/50 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '50%' }}></div>
                </div>

                {/* Warning Text */}
                <p className="text-gray-400 text-sm leading-relaxed">
                  Os ingressos podem esgotar a qualquer momento,<br />
                  não saia desta página.
                </p>
              </CardContent>
            </Card>
          </div>          
        </div>
      </div>
    </div>
  )
}
