'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCart } from '@/hooks/use-cart'
import { cn } from '@/lib/utils'
import type { Seat, CartSeat } from '@/types'

interface SeatSelectionProps {
  sessionId: string
  availableSeats: Seat[]
  onSelectionChange?: (selectedSeats: string[]) => void
}

/**
 * Seat selection component with cinema layout visualization
 * Supports max 4 seats per user with real-time validation
 */
export function SeatSelection({ 
  sessionId, 
  availableSeats,
  onSelectionChange 
}: SeatSelectionProps) {
  const { cart, addSeat, removeSeat, isSeatInCart, validateTicketLimit } = useCart()
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])

  // Generate seat grid (rows A-J, seats 1-20)
  const generateSeatGrid = useCallback(() => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    const seatsPerRow = 20
    const grid: Array<Array<{ seatId: string; available: boolean; type: 'STANDARD' | 'VIP'; price: number }>> = []

    rows.forEach(row => {
      const seatRow: Array<{ seatId: string; available: boolean; type: 'STANDARD' | 'VIP'; price: number }> = []
      
      for (let seat = 1; seat <= seatsPerRow; seat++) {
        const seatId = `${row}${seat}`
        const seatData = availableSeats.find(s => s.seatId === seatId)
        
        // VIP seats are in rows D, E, F and center seats
        const isVIP = ['D', 'E', 'F'].includes(row) && seat >= 6 && seat <= 15
        
        seatRow.push({
          seatId,
          available: seatData ? seatData.isAvailable : false,
          type: isVIP ? 'VIP' : 'STANDARD',
          price: isVIP ? 44900 : 34900 // $449.00 for VIP, $349.00 for Standard
        })
      }
      
      grid.push(seatRow)
    })

    return grid
  }, [availableSeats])

  const seatGrid = generateSeatGrid()

  // Handle seat click
  const handleSeatClick = useCallback((seatId: string, seatType: 'STANDARD' | 'VIP', price: number) => {
    const isCurrentlySelected = isSeatInCart(seatId)
    
    if (isCurrentlySelected) {
      // Remove seat
      removeSeat(seatId)
      setSelectedSeats(prev => prev.filter(id => id !== seatId))
    } else {
      // Check if we can add more seats
      if (!validateTicketLimit(1)) {
        alert('Maximum 4 tickets allowed per user')
        return
      }

      // Add seat
      const row = seatId.charAt(0)
      const number = parseInt(seatId.slice(1))
      
      const cartSeat: CartSeat = {
        seatId,
        row,
        number,
        type: seatType,
        price
      }

      addSeat(sessionId, cartSeat)
      setSelectedSeats(prev => [...prev, seatId])
    }

    // Notify parent component
    const newSelection = isCurrentlySelected 
      ? selectedSeats.filter(id => id !== seatId)
      : [...selectedSeats, seatId]
    
    onSelectionChange?.(newSelection)
  }, [sessionId, addSeat, removeSeat, isSeatInCart, validateTicketLimit, selectedSeats, onSelectionChange])

  // Get seat display status
  const getSeatStatus = useCallback((seatId: string, available: boolean) => {
    if (!available) return 'unavailable'
    if (isSeatInCart(seatId)) return 'selected'
    return 'available'
  }, [isSeatInCart])

  // Get seat styling classes
  const getSeatClasses = useCallback((status: string, type: 'STANDARD' | 'VIP') => {
    const baseClasses = "w-6 h-6 rounded-t-lg border-2 cursor-pointer transition-all duration-200 text-xs flex items-center justify-center font-semibold"
    
    switch (status) {
      case 'unavailable':
        return cn(baseClasses, "bg-gray-400 border-gray-500 cursor-not-allowed text-gray-600")
      case 'selected':
        return cn(baseClasses, "bg-blue-600 border-blue-700 text-white scale-110 shadow-lg")
      case 'available':
        return cn(
          baseClasses,
          type === 'VIP' 
            ? "bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200 hover:scale-105" 
            : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200 hover:scale-105"
        )
      default:
        return baseClasses
    }
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center text-white">Choose Your Seats</CardTitle>
        <div className="text-center text-sm text-muted-foreground">
          Select up to 4 seats for your IMAX experience
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Screen */}
        <div className="flex justify-center mb-8">
          <div className="w-3/4 h-3 bg-linear-to-r from-gray-600 via-gray-400 to-gray-600 rounded-full shadow-lg">
            <div className="text-center text-xs text-muted-foreground mt-2">IMAX 70MM SCREEN</div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded-t-lg"></div>
            <span className="text-muted-foreground">Available ($29.99)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-400 rounded-t-lg"></div>
            <span className="text-muted-foreground">VIP ($49.99)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-600 border-2 border-blue-700 rounded-t-lg"></div>
            <span className="text-muted-foreground">Selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-400 border-2 border-gray-500 rounded-t-lg"></div>
            <span className="text-muted-foreground">Unavailable</span>
          </div>
        </div>

        {/* Seat Grid */}
        <div className="flex justify-center">
          <div className="space-y-2">
            {seatGrid.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center space-x-1">
                {/* Row Label */}
                <div className="w-6 text-center text-sm font-semibold text-muted-foreground">
                  {String.fromCharCode(65 + rowIndex)}
                </div>
                
                {/* Seats */}
                <div className="flex space-x-1">
                  {row.slice(0, 8).map((seat) => {
                    const status = getSeatStatus(seat.seatId, seat.available)
                    return (
                      <button
                        key={seat.seatId}
                        className={getSeatClasses(status, seat.type)}
                        onClick={() => status !== 'unavailable' && handleSeatClick(seat.seatId, seat.type, seat.price)}
                        disabled={status === 'unavailable'}
                        title={`Seat ${seat.seatId} - ${seat.type} - $${seat.price / 100}`}
                      >
                        {seat.seatId.slice(1)}
                      </button>
                    )
                  })}
                </div>

                {/* Aisle */}
                <div className="w-6"></div>

                {/* Center Seats */}
                <div className="flex space-x-1">
                  {row.slice(8, 12).map((seat) => {
                    const status = getSeatStatus(seat.seatId, seat.available)
                    return (
                      <button
                        key={seat.seatId}
                        className={getSeatClasses(status, seat.type)}
                        onClick={() => status !== 'unavailable' && handleSeatClick(seat.seatId, seat.type, seat.price)}
                        disabled={status === 'unavailable'}
                        title={`Seat ${seat.seatId} - ${seat.type} - $${seat.price / 100}`}
                      >
                        {seat.seatId.slice(1)}
                      </button>
                    )
                  })}
                </div>

                {/* Aisle */}
                <div className="w-6"></div>

                {/* Right Seats */}
                <div className="flex space-x-1">
                  {row.slice(12).map((seat) => {
                    const status = getSeatStatus(seat.seatId, seat.available)
                    return (
                      <button
                        key={seat.seatId}
                        className={getSeatClasses(status, seat.type)}
                        onClick={() => status !== 'unavailable' && handleSeatClick(seat.seatId, seat.type, seat.price)}
                        disabled={status === 'unavailable'}
                        title={`Seat ${seat.seatId} - ${seat.type} - $${seat.price / 100}`}
                      >
                        {seat.seatId.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selection Summary */}
        {cart && cart.seats.length > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2 text-foreground">Selected Seats:</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {cart.seats.map(seat => (
                <span key={seat.seatId} className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                  {seat.seatId} ({seat.type})
                </span>
              ))}
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-foreground">
                Total: ${cart.totalAmount / 100}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}