'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { LocationModal } from '../(main)/_components/location-modal'

export function HeroSection() {
  const [showLocationModal, setShowLocationModal] = useState(false)

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="text-white font-bold">LOGO</div>
        <div className="text-blue-400 font-bold text-xl">IMAX</div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-sm mx-auto space-y-6">
          {/* Movie Poster Card - Frame 2 Style */}
          <Card className="bg-gray-900/50 border-gray-700 overflow-hidden">
            <CardContent className="p-0">
              {/* Poster Background with Face */}
              <div className="aspect-[2/3] bg-gradient-to-b from-orange-900/30 via-black/70 to-black relative">
                {/* Background Image Simulation */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-red-900/30 to-black"></div>
                
                {/* Face/Character silhouette in center */}
                <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-32 h-32 rounded-full bg-gradient-to-b from-orange-200/40 via-orange-400/30 to-transparent blur-sm"></div>
                
                {/* Movie Title Overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-6">
                  {/* Top: Director Info */}
                  <div className="text-center space-y-1">
                    <div className="text-xs text-gray-400 tracking-widest">
                      A FILM BY CHRISTOPHER NOLAN
                    </div>
                  </div>

                  {/* Center: Title */}
                  <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-wider text-white">
                      THE ODYSSEY
                    </h1>
                    <div className="text-sm text-red-400 font-semibold tracking-wider">
                      DEFY THE GODS
                    </div>
                    <div className="text-lg text-gray-300 font-light">
                      07.17.26
                    </div>
                  </div>

                  {/* Bottom: Movie Info */}
                  <div className="space-y-3">
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Badge variant="outline" className="bg-gray-800/80 text-gray-300 border-gray-600">
                        Pré-order
                      </Badge>
                      <Badge variant="outline" className="bg-gray-800/80 text-gray-300 border-gray-600">
                        2026
                      </Badge>
                      <Badge variant="outline" className="bg-gray-800/80 text-gray-300 border-gray-600">
                        Ação | Fantasia
                      </Badge>
                      <Badge variant="outline" className="bg-gray-800/80 text-gray-300 border-gray-600">
                        +18
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Floating particles effect */}
                <div className="absolute inset-0 pointer-events-none">
                  {[
                    { left: '25%', top: '30%', delay: '0s', duration: '2s' },
                    { left: '70%', top: '20%', delay: '0.5s', duration: '3s' },
                    { left: '40%', top: '60%', delay: '1s', duration: '2.5s' },
                    { left: '60%', top: '70%', delay: '1.5s', duration: '3.5s' },
                    { left: '80%', top: '40%', delay: '2s', duration: '2s' },
                    { left: '30%', top: '80%', delay: '2.5s', duration: '4s' },
                    { left: '75%', top: '60%', delay: '3s', duration: '2.5s' },
                    { left: '50%', top: '25%', delay: '3.5s', duration: '3s' },
                  ].map((particle, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 bg-orange-400 rounded-full animate-pulse"
                      style={{
                        left: particle.left,
                        top: particle.top,
                        animationDelay: particle.delay,
                        animationDuration: particle.duration,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Queue Information */}
              <div className="bg-gray-900 p-4 space-y-2">
                <div className="text-white font-medium text-sm">
                  Você está na fila
                </div>
                <div className="text-gray-400 text-xs">
                  Aguardando sua vez
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div className="bg-blue-500 h-1 rounded-full w-1/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Button - Trigger for Modal Flow */}
          <Button 
            onClick={() => setShowLocationModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            SELECIONAR LOCALIZAÇÃO
          </Button>
        </div>
      </div>

      {/* Location Modal - Frames 3-6 */}
      <LocationModal 
        isOpen={showLocationModal} 
        onClose={() => setShowLocationModal(false)} 
      />
    </div>
  )
}