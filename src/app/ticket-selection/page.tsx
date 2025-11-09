'use client'

import { useState } from 'react'
import { PageContainer } from '@/components/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SeatSelection } from './_components/seat-selection'
import { CountdownTimer } from './_components/countdown-timer'
import { useCart } from '@/hooks/use-cart'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import type { Seat } from '@/types'

/**
 * Ticket Selection Page - Main seat selection interface
 * Includes session info, seat picker, and cart summary
 */
export default function TicketSelectionPage() {
  const router = useRouter()
  const { cart, getCartSummary } = useCart()
  const [isLoading, setIsLoading] = useState(false)

  // Mock session data - in real app, this would come from API
  const sessionData = {
    id: 'session_1',
    movieTitle: 'Die Odyssee',
    startTime: '16:00',
    endTime: '18:30',
    date: '16/04/2026',
    cinemaName: 'Roxy Cinema',
    screenType: 'IMAX 70MM' as const,
    totalSeats: 200,
    availableSeats: 156
  }

  // Generate mock seat data - in real app, this would come from API
  const generateMockSeats = (): Seat[] => {
    const availableSeats: Seat[] = []
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    
    rows.forEach(row => {
      for (let seat = 1; seat <= 20; seat++) {
        const seatId = `${row}${seat}`
        // Randomly make some seats unavailable for demo
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
      // Simulate API call delay
      setTimeout(() => {
        router.push('/cart')
      }, 1000)
    }
  }

  const handleSessionExpired = () => {
    router.push('/queue-expired')
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header with countdown */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Select Your Seats</h1>
            <p className="text-muted-foreground">
              Choose your preferred seats for an unforgettable IMAX experience
            </p>
          </div>
          <CountdownTimer onExpired={handleSessionExpired} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main seat selection area */}
          <div className="xl:col-span-3">
            <SeatSelection
              sessionId={sessionData.id}
              availableSeats={availableSeats}
            />
          </div>

          {/* Sidebar with session info and cart */}
          <div className="space-y-6">
            {/* Session Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-white">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-semibold text-white text-lg mb-1">{sessionData.movieTitle}</h3>
                  <p className="text-sm text-muted-foreground">Presented by</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cinema:</span>
                    <span className="text-white">{sessionData.cinemaName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="text-white">{sessionData.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="text-white">{sessionData.startTime} - {sessionData.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Format:</span>
                    <div className="bg-blue-600 px-2 py-1 rounded text-xs text-white font-semibold">
                      {sessionData.screenType}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available seats:</span>
                    <span className="text-white font-semibold">{sessionData.availableSeats}/{sessionData.totalSeats}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cart Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-white">Your Selection</CardTitle>
                <CardDescription>
                  {cartSummary.totalSeats === 0 
                    ? "No seats selected yet" 
                    : `${cartSummary.totalSeats} seat${cartSummary.totalSeats > 1 ? 's' : ''} selected`
                  }
                </CardDescription>
              </CardHeader>
              
              {cart && cart.seats.length > 0 && (
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {cart.seats.map(seat => (
                      <div key={seat.seatId} className="flex justify-between items-center text-sm">
                        <span className="text-white">
                          Seat {seat.seatId} ({seat.type})
                        </span>
                        <span className="text-white font-semibold">
                          {formatCurrency(seat.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-white">Total:</span>
                      <span className="text-xl font-bold text-white">
                        {formatCurrency(cartSummary.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <Button 
                    onClick={handleContinueToCart}
                    disabled={isLoading || cartSummary.totalSeats === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? 'Processing...' : 'Continue to Cart'}
                  </Button>
                </CardContent>
              )}
              
              {(!cart || cart.seats.length === 0) && (
                <CardContent>
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Select seats from the cinema layout to continue
                  </p>
                </CardContent>
              )}
            </Card>

            {/* Help Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-white">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• Maximum 4 tickets per person</p>
                <p>• VIP seats include premium amenities</p>
                <p>• Session expires in 10 minutes</p>
                <p>• Seats are held during selection</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}