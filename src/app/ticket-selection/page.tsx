'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft } from 'lucide-react'

type TicketType = {
  id: string
  name: string
  price: number
  description?: string
  quantity: number
}

export default function TicketSelectionPage() {
  const router = useRouter()

  const sessionData = {
    id: 'session_1',
    movieTitle: 'Die Odyssee',
    cinemaName: 'Roxy Cinema',
    location: '291 W 4th St, New York, NY 10014',
    date: '16/04/2026',
    showtimes: ['12:00', '14:30', '17:00', '19:30'],
    screenType: 'IMAX 70MM' as const,
  }

  const [selectedShowtime, setSelectedShowtime] = useState(sessionData.showtimes[2])

  const [tickets, setTickets] = useState<TicketType[]>([
    { id: 'standard', name: 'Standard', price: 218, description: 'Standard seat', quantity: 0 },
    { id: 'vip', name: 'VIP', price: 449, description: 'VIP seat', quantity: 0 },
  ])

  const updateTicketQuantity = (id: string, delta: number) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, quantity: Math.max(0, t.quantity + delta) } : t))
  }

  const totalTickets = tickets.reduce((s, t) => s + t.quantity, 0)
  const totalPrice = tickets.reduce((s, t) => s + t.quantity * t.price, 0)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="font-bold">{sessionData.movieTitle}</div>
        </div>
        <div className="text-sm text-gray-400">{sessionData.screenType}</div>
      </div>

      <div className="container mx-auto max-w-md p-4">
        <Card className="mb-4 bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">{sessionData.cinemaName}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-400 mb-3">{sessionData.location}</div>

            <div className="grid grid-cols-2 gap-2">
              {sessionData.showtimes.map((t) => (
                <Button
                  key={t}
                  variant={selectedShowtime === t ? 'default' : 'outline'}
                  className={selectedShowtime === t ? 'bg-blue-600 hover:bg-blue-700' : 'border-gray-600 text-white hover:bg-gray-800'}
                  onClick={() => setSelectedShowtime(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 mb-6">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="bg-gray-900 border-gray-700">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{ticket.name}</div>
                  <div className="text-sm text-gray-400">{ticket.description}</div>
                  <div className="text-white font-medium mt-1">${ticket.price}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="w-8 h-8 p-0 border-gray-600 text-white" onClick={() => updateTicketQuantity(ticket.id, -1)} disabled={ticket.quantity === 0}>-</Button>
                  <div className="w-8 text-center text-white">{ticket.quantity}</div>
                  <Button size="sm" variant="outline" className="w-8 h-8 p-0 border-gray-600 text-white" onClick={() => updateTicketQuantity(ticket.id, 1)} disabled={totalTickets >= 4}>+</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {totalTickets > 0 && (
          <Card className="mb-4 bg-gray-900 border-gray-700">
            <CardContent className="p-4">
              <div className="flex justify-between text-sm">
                <div className="text-gray-400">{totalTickets} ticket(s)</div>
                <div className="font-medium text-white">${totalPrice}</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={totalTickets === 0} onClick={() => router.push('/seat-selection')}>
          Continue to Seat Selection
        </Button>
      </div>
    </div>
  )
}
