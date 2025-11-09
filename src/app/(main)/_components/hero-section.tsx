'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin } from 'lucide-react'

/**
 * Hero section component for the landing page
 * Features the main movie poster, title, and primary CTA
 */
export function HeroSection() {
  return (
    <section className="relative py-12 lg:py-20">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Movie Poster */}
        <div className="order-2 lg:order-1 flex justify-center">
          <Card className="w-full max-w-md bg-gradient-to-b from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-6">
              {/* Poster Image Placeholder */}
              <div className="aspect-[2/3] bg-gradient-to-b from-orange-900 via-red-900 to-gray-900 rounded-lg mb-4 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <h3 className="text-2xl font-bold mb-2">THE ODYSSEY</h3>
                    <p className="text-sm opacity-80">DEFY THE GODS</p>
                    <p className="text-lg font-semibold mt-4">07.17.26</p>
                  </div>
                </div>
                
                {/* IMAX Badge */}
                <div className="absolute top-4 right-4">
                  <Badge className="bg-blue-600 text-white">IMAX</Badge>
                </div>
              </div>

              {/* Movie Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs">Premium</Badge>
                <Badge variant="outline" className="text-xs">70mm</Badge>
                <Badge variant="outline" className="text-xs">Adult Cinema</Badge>
                <Badge variant="outline" className="text-xs">+18</Badge>
              </div>

              {/* Movie Info */}
              <div className="text-white text-sm space-y-2">
                <p className="font-medium">Você está na fila</p>
                <p className="text-xs text-gray-400">
                  Aguarde sua vez para comprar os ingressos
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hero Content */}
        <div className="order-1 lg:order-2 text-center lg:text-left">
          <div className="space-y-6">
            {/* Main Headline */}
            <div>
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                THE ODYSSEY
              </h1>
              <p className="text-xl lg:text-2xl text-red-400 font-semibold mt-2">
                DEFY THE GODS
              </p>
              <p className="text-lg text-gray-300 mt-2">
                07.17.26
              </p>
            </div>

            {/* Movie Details */}
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <Calendar className="w-5 h-5" />
                <span>July 17, 2026</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <Clock className="w-5 h-5" />
                <span>Multiple Sessions Available</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <MapPin className="w-5 h-5" />
                <span>IMAX Theaters</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                Get Tickets Now
              </Button>
              <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
                Watch Trailer
              </Button>
            </div>

            {/* IMAX Experience Note */}
            <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 mt-8">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 px-3 py-1 rounded">
                  <span className="text-white font-bold text-sm">IMAX</span>
                </div>
                <div className="text-sm text-gray-300">
                  <p className="font-medium">Experience THE ODYSSEY in IMAX 70mm</p>
                  <p className="text-gray-400">The most immersive film experience</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}