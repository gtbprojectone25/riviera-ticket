'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin } from 'lucide-react'
import { useState } from 'react'
import { LocationModal } from './location-modal'

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
          {/* Movie Poster */}
          <Card className="bg-gray-900 border-gray-700 overflow-hidden">
            <CardContent className="p-0">
              {/* Poster Image */}
              <div className="aspect-[2/3] bg-gradient-to-b from-orange-900/50 to-black relative">
                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6">
                  {/* Movie Title */}
                  <div className="space-y-2 mb-8">
                    <div className="text-xs text-gray-400 tracking-wider">
                      UMA EXPERIÊNCIA SENSORIAL
                    </div>
                    <h1 className="text-3xl font-bold tracking-wider">
                      THE <span className="text-orange-400">ODYSSEY</span>
                    </h1>
                    <div className="text-orange-400 text-sm tracking-wider">
                      DEFY THE GODS
                    </div>
                    <div className="text-2xl font-bold text-white mt-4">
                      07.17.25
                    </div>
                  </div>

                  {/* Planet/Visual Element */}
                  <div className="w-32 h-32 rounded-full bg-gradient-to-b from-orange-600 to-orange-900 relative mb-8">
                    <div className="absolute inset-2 rounded-full bg-gradient-to-b from-orange-700 to-orange-950"></div>
                    {/* Floating particles effect */}
                    <div className="absolute -top-2 -right-2 w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-orange-300 rounded-full animate-pulse delay-300"></div>
                    <div className="absolute top-1/3 -right-3 w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse delay-700"></div>
                  </div>
                </div>

                {/* Genre/Rating Tags */}
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 justify-center">
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs px-2 py-1">
                    Drama
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs px-2 py-1">
                    70%
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs px-2 py-1">
                    Adult Content
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs px-2 py-1">
                    +18
                  </Badge>
                </div>
              </div>

              {/* Movie Info Section */}
              <div className="bg-gray-900 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">Você está no fila</h3>
                  <div className="text-blue-400 font-bold">IMAX</div>
                </div>
                
                <p className="text-gray-400 text-sm leading-relaxed">
                  Os melhores lugares estão à venda no cinema, 
                  aguarde seu tempo.
                </p>

                {/* Location Button */}
                <Button
                  onClick={() => setShowLocationModal(true)}
                  variant="outline"
                  className="w-full bg-transparent border-gray-600 text-white hover:bg-gray-800 flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Buscar localização mais próxima
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Location Modal */}
      <LocationModal 
        isOpen={showLocationModal} 
        onClose={() => setShowLocationModal(false)} 
      />
    </div>
  )
}