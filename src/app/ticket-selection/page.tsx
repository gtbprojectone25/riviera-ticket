'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SeatSelection } from './_components/seat-selection'
import { useCart } from '@/hooks/use-cart'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, MapPin, Calendar, Clock } from 'lucide-react'
import type { Seat } from '@/types'

export default function TicketSelectionPage() {
  const router = useRouter()
  const { cart, getCartSummary } = useCart()
  const [selectedShowtime, setSelectedShowtime] = useState('18:30')
  const [isLoading, setIsLoading] = useState(false)

  const sessionData = {
    id: 'session_1',
    movieTitle: 'Die Odyssee',
    cinemaName: 'Roxy Cinema',
    location: 'São Paulo - SP',
    date: '16/04/2026',
    showtimes: ['14:00', '16:30', '18:30', '21:00'],
    screenType: 'IMAX 70MM' as const,
  }

  const ticketTypes = [
    {
      id: 'standard',
      name: 'Standard Ticket',
      description: 'Comfortable seating with great view',
      price: 2999,
      available: true
    },
    {
      id: 'vip',
      name: 'VIP',
      description: 'Premium seating with luxury amenities',
      price: 4999,
      available: true
    }
  ]

  // Generate mock seat data
  const generateMockSeats = (): Seat[] => {
    const availableSeats: Seat[] = []
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    
    rows.forEach(row => {
      for (let seat = 1; seat <= 20; seat++) {
        const seatId = `${row}${seat}`
        const isAvailable = Math.random() > 0.2
        
        availableSeats.push({
          id: `seat_${seatId}`,
          sessionId: sessionData.id,
          row,
          number: seat,
          seatId,
          isAvailable,
          isReserved: !isAvailable,
          price: ['D', 'E', 'F'].includes(row) && seat >= 6 && seat <= 15 ? 4999 : 2999,
          type: ['D', 'E', 'F'].includes(row) && seat >= 6 && seat <= 15 ? 'VIP' : 'STANDARD'
        })
      }
    })
    
    return availableSeats
  }

  const availableSeats = generateMockSeats()
  const cartSummary = getCartSummary()

  const handleContinueToCart = () => {
    if (cart && cart.seats.length > 0) {
      setIsLoading(true)
      setTimeout(() => {
        router.push('/cart')
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-white font-bold">PASSO 01</div>
        </div>
        <div className="text-blue-400 font-bold text-xl">IMAX</div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Movie Info */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">{sessionData.movieTitle}</h1>
          <div className="text-gray-400 text-sm">Apresentado</div>
        </div>

        {/* Cinema Info */}
        <Card className="bg-gray-900 border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-medium">{sessionData.cinemaName}</h3>
              <div className="text-gray-400 text-sm">{sessionData.location}</div>
            </div>
            
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Terça-feira, 16 Abril 2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Sessão {selectedShowtime}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Sala 1 • IMAX 70MM</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Times */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Choose the session time</h3>
          <div className="grid grid-cols-2 gap-3">
            {sessionData.showtimes.map((time) => (
              <Button
                key={time}
                variant={selectedShowtime === time ? "default" : "outline"}
                className={`h-12 ${
                  selectedShowtime === time 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "border-gray-600 text-white hover:bg-gray-800"
                }`}
                onClick={() => setSelectedShowtime(time)}
              >
                {time}
              </Button>
            ))}
          </div>
        </div>

        {/* Ticket Types */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Choose the type of ticket you will buy</h3>
          <div className="space-y-3">
            {ticketTypes.map((ticket) => (
              <Card key={ticket.id} className="bg-gray-800 border-gray-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-medium">{ticket.name}</h4>
                        <Badge variant="secondary" className="bg-gray-700 text-white text-xs">
                          {ticket.id === 'standard' ? 'R$30' : 'R$50'}
                        </Badge>
                      </div>
                      <p className="text-gray-400 text-sm">{ticket.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-bold">
                        {formatCurrency(ticket.price)}
                      </div>
                      <div className="text-xs text-gray-400">Amount</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="outline" className="w-8 h-8 p-0 border-gray-600">
                          -
                        </Button>
                        <span className="text-white w-8 text-center">0</span>
                        <Button size="sm" variant="outline" className="w-8 h-8 p-0 border-gray-600">
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Seat Selection */}
        <div className="mb-6">
          <h3 className="text-white font-medium mb-3">Reserve</h3>
          <div className="text-gray-400 text-sm mb-4">Clique Reservar</div>
          
          <Card className="bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <SeatSelection
                sessionId={sessionData.id}
                availableSeats={availableSeats}
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        {cart && cart.seats.length > 0 && (
          <Card className="bg-gray-900 border-gray-700 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-medium">Resumo</span>
              </div>
              
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Ticket Premium + {cart.seats.length}</span>
                  <span className="text-white">R$ {(cart.seats.length * 50).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Taxa de Reserva</span>
                  <span className="text-white">R$ {(cart.seats.length * 4).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">16/04/2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">15:00 às 17:30pm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">***{cart.seats.map(s => s.seatId).join(', ')}***</span>
                </div>
              </div>
              
              <div className="border-t border-gray-700 pt-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-lg">
                    ${formatCurrency(cartSummary.totalAmount).replace('R$', '').trim()}
                  </span>
                </div>
              </div>

              <Button 
                onClick={handleContinueToCart}
                disabled={isLoading || cartSummary.totalSeats === 0}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? 'Processando...' : 'Continue to checkout'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        <div className="text-center text-gray-400 text-xs">
          Após clicar em reservar com cinema 1&2 disponível
        </div>
      </div>
    </div>
  )
}