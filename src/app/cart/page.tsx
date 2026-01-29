'use client'

import { useState } from 'react'
import { PageContainer } from '@/components/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CountdownTimer } from '../ticket-selection/_components/countdown-timer'
import { useCart } from '@/hooks/use-cart'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Trash2, ArrowLeft } from 'lucide-react'

/**
 * Cart Page - Review and finalize ticket selection
 * Shows selected seats, pricing, and checkout options
 */
export default function CartPage() {
  const router = useRouter()
  const { cart, removeSeat, clearCart, getCartSummary } = useCart()
  const [isLoading, setIsLoading] = useState(false)

  const cartSummary = getCartSummary()

  // Redirect if no cart or expired
  if (!cart || cartSummary.isExpired || cartSummary.totalSeats === 0) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-white mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            {cartSummary.isExpired 
              ? "Your session has expired. Please start over."
              : "You haven't selected any seats yet."
            }
          </p>
          <Button 
            onClick={() => router.push('/ticket-selection')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Select Seats
          </Button>
        </div>
      </PageContainer>
    )
  }

  const handleRemoveSeat = (seatId: string) => {
    removeSeat(seatId)
  }

  const handleContinueToCheckout = () => {
    setIsLoading(true)
    // Simulate API call delay
    setTimeout(() => {
      router.push('/checkout')
    }, 1000)
  }

  const handleBackToSelection = () => {
    router.push('/ticket-selection')
  }

  const handleSessionExpired = () => {
    clearCart()
    router.push('/queue-expired')
  }

  // Calculate breakdown
  const standardSeats = cart.seats.filter(seat => seat.type === 'STANDARD')
  const vipSeats = cart.seats.filter(seat => seat.type === 'VIP')

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header with countdown */}
        <div className="flex flex-col space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Review Your Order</h1>
            <p className="text-muted-foreground">
              Review your selected seats and proceed to checkout
            </p>
          </div>
          <CountdownTimer onExpired={handleSessionExpired} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Main content */}
          <div className="space-y-6">
            {/* Session Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h3 className="font-semibold text-white text-lg">Die Odyssee</h3>
                  <p className="text-sm text-muted-foreground">Presented by</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cinema:</span>
                    <p className="text-white font-medium">Roxy Cinema</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <p className="text-white font-medium">16/04/2026</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time:</span>
                    <p className="text-white font-medium">16:00 - 18:30</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Format:</span>
                    <div className="bg-blue-600 px-2 py-1 rounded-md text-xs text-white font-semibold inline-block">
                      IMAX 70MM
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Seats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Selected Seats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cart.seats.map(seat => (
                    <div key={seat.seatId} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-md text-white text-sm font-semibold flex items-center justify-center">
                          {seat.seatId}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            Row {seat.row}, Seat {seat.number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {seat.type} ticket
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-semibold">
                          {formatCurrency(seat.price)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSeat(seat.seatId)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Breakdown */}
                <div className="space-y-2">
                  {standardSeats.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Standard Tickets ({standardSeats.length}x)
                      </span>
                      <span className="text-white">
                        {formatCurrency(standardSeats.reduce((sum, seat) => sum + seat.price, 0))}
                      </span>
                    </div>
                  )}
                  
                  {vipSeats.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        VIP Tickets ({vipSeats.length}x)
                      </span>
                      <span className="text-white">
                        {formatCurrency(vipSeats.reduce((sum, seat) => sum + seat.price, 0))}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">Total:</span>
                    <span className="text-xl font-bold text-white">
                      {formatCurrency(cartSummary.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-3">
                  <Button 
                    onClick={handleContinueToCheckout}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {isLoading ? 'Processing...' : 'Continue to Checkout'}
                  </Button>
                  
                  <Button 
                    onClick={handleBackToSelection}
                    variant="outline"
                    className="w-full"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Seat Selection
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Important Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-white">Important Notes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• Tickets are non-refundable</p>
                <p>• Arrive 30 minutes before showtime</p>
                <p>• IMAX 70MM offers premium viewing experience</p>
                <p>• VIP seats include exclusive amenities</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
