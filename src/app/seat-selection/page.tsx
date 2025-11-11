'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Users, Armchair } from 'lucide-react'

interface SeatData {
  id: string
  row: string
  number: number
  type: 'standard' | 'vip' | 'unavailable'
  price: number
}

export default function SeatSelectionPage() {
  const router = useRouter()
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])

  // Generate seat layout (14 rows, varying seats per row)
  const generateSeats = (): SeatData[] => {
    const seats: SeatData[] = []
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']
    
    rows.forEach((row, rowIndex) => {
      const seatsInRow = rowIndex < 4 ? 12 : rowIndex < 8 ? 14 : 16
      const startNumber = Math.floor((20 - seatsInRow) / 2) + 1
      
      for (let i = 0; i < seatsInRow; i++) {
        const seatNumber = startNumber + i
        const seatId = `${row}${seatNumber}`
        
        // Mark some seats as unavailable
        const isUnavailable = Math.random() < 0.15
        
        // VIP seats are in rows F-J
        const isVip = rowIndex >= 5 && rowIndex <= 9
        
        seats.push({
          id: seatId,
          row,
          number: seatNumber,
          type: isUnavailable ? 'unavailable' : isVip ? 'vip' : 'standard',
          price: isVip ? 449 : 218
        })
      }
    })
    
    return seats
  }

  const [seats] = useState<SeatData[]>(generateSeats())

  const handleSeatClick = (seatId: string, seatType: string) => {
    if (seatType === 'unavailable') return
    
    setSelectedSeats(prev => 
      prev.includes(seatId) 
        ? prev.filter(id => id !== seatId)
        : prev.length < 4 ? [...prev, seatId] : prev
    )
  }

  const getSelectedSeatsData = () => {
    return seats.filter(seat => selectedSeats.includes(seat.id))
  }

  const getTotalPrice = () => {
    return getSelectedSeatsData().reduce((total, seat) => total + seat.price, 0)
  }

  const getSeatIcon = (seat: SeatData) => {
    if (selectedSeats.includes(seat.id)) {
      return '🪑' // Selected seat emoji
    }
    
    switch (seat.type) {
      case 'unavailable':
        return '❌'
      case 'vip':
        return '🟡'
      case 'standard':
        return '⚪'
      default:
        return '⚪'
    }
  }

  const getSeatClass = (seat: SeatData) => {
    const baseClass = "w-6 h-6 text-xs flex items-center justify-center rounded cursor-pointer transition-all"
    
    if (selectedSeats.includes(seat.id)) {
      return `${baseClass} bg-blue-500 text-white border-2 border-blue-400`
    }
    
    switch (seat.type) {
      case 'unavailable':
        return `${baseClass} bg-gray-600 text-gray-400 cursor-not-allowed`
      case 'vip':
        return `${baseClass} bg-yellow-500 text-black hover:bg-yellow-400`
      case 'standard':
        return `${baseClass} bg-gray-300 text-black hover:bg-gray-200`
      default:
        return `${baseClass} bg-gray-300 text-black hover:bg-gray-200`
    }
  }

  const handleContinue = () => {
    if (selectedSeats.length > 0) {
      router.push('/auth')
    }
  }

  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = []
    acc[seat.row].push(seat)
    return acc
  }, {} as Record<string, SeatData[]>)

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="text-white font-bold">LOGO</div>
        <div className="text-blue-400 font-bold text-xl">IMAX</div>
      </div>

      {/* Timer Alert */}
      <div className="bg-blue-600 text-white text-center py-2 px-4 text-sm">
        To guarantee your place, finish within 10:00 minutes (only 4 per session)
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="text-gray-400 hover:text-white p-0 mb-4"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Go back
        </Button>

        {/* Movie Info */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white mb-2">Die Odyssee</h1>
          <div className="text-gray-400 text-sm">Roxy Cinema • 16/04/2026 • 18h at 11pm</div>
        </div>

        {/* Screen */}
        <div className="mb-8">
          <div className="bg-linear-to-r from-transparent via-white to-transparent h-1 rounded-full mb-2 opacity-60"></div>
          <div className="text-center text-gray-400 text-sm">SCREEN</div>
        </div>

        {/* Seat Map */}
        <div className="mb-8 overflow-x-auto">
          <div className="min-w-[600px]">
            {Object.entries(seatsByRow).map(([row, rowSeats]) => (
              <div key={row} className="flex items-center justify-center gap-1 mb-2">
                <div className="w-6 text-gray-400 text-sm font-medium text-center">{row}</div>
                <div className="flex gap-1 mx-4">
                  {rowSeats.map((seat) => (
                    <div
                      key={seat.id}
                      className={getSeatClass(seat)}
                      onClick={() => handleSeatClick(seat.id, seat.type)}
                      title={`${seat.id} - $${seat.price} (${seat.type})`}
                    >
                      {getSeatIcon(seat)}
                    </div>
                  ))}
                </div>
                <div className="w-6 text-gray-400 text-sm font-medium text-center">{row}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mb-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <span className="text-gray-400">Available ($218)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-400">VIP ($449)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-400">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-600 rounded"></div>
            <span className="text-gray-400">Unavailable</span>
          </div>
        </div>

        {/* Selected Seats Summary */}
        {selectedSeats.length > 0 && (
          <Card className="bg-gray-900 border-gray-700 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-white font-medium">Selected Seats</span>
              </div>
              
              <div className="space-y-2">
                {getSelectedSeatsData().map((seat) => (
                  <div key={seat.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <Armchair className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">Seat {seat.id}</span>
                      <Badge variant={seat.type === 'vip' ? 'default' : 'secondary'} className="text-xs">
                        {seat.type.toUpperCase()}
                      </Badge>
                    </div>
                    <span className="text-white">${seat.price}</span>
                  </div>
                ))}
                
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-400">Total ({selectedSeats.length} seats)</span>
                    <span className="text-green-400 text-lg">${getTotalPrice()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        <Button 
          onClick={handleContinue}
          disabled={selectedSeats.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 text-white py-3 rounded-lg"
        >
          Continue to Checkout ({selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''})
        </Button>
      </div>
    </div>
  )
}