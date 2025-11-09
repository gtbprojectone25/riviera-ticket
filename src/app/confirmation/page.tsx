'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PageContainer } from '@/components/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle, Download, Mail, Calendar, MapPin, Clock } from 'lucide-react'
import type { Cart, CartSeat } from '@/types'

interface OrderDetails {
  id: string
  cart: Cart
  paymentData: unknown
  status: string
  purchaseDate: string
  total: number
}

/**
 * Confirmation Page - Order success and ticket details
 * Shows purchase confirmation with QR codes and booking details
 */
export default function ConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  
  // Initialize orderDetails from localStorage
  const [orderDetails] = useState<OrderDetails | null>(() => {
    if (typeof window === 'undefined') return null
    
    const savedOrder = localStorage.getItem('last-order')
    if (savedOrder) {
      try {
        return JSON.parse(savedOrder) as OrderDetails
      } catch {
        return null
      }
    }
    return null
  })

  if (!orderDetails) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-white mb-4">Order not found</h1>
          <p className="text-muted-foreground mb-6">
            We couldn&apos;t find your order. Please check your email for confirmation details.
          </p>
          <Button 
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Return Home
          </Button>
        </div>
      </PageContainer>
    )
  }

  const { cart, total } = orderDetails
  const standardSeats = cart.seats.filter((seat: CartSeat) => seat.type === 'STANDARD')
  const vipSeats = cart.seats.filter((seat: CartSeat) => seat.type === 'VIP')

  const handleDownloadTickets = () => {
    // In real app, this would generate and download PDF tickets
    alert('Ticket download functionality would be implemented here')
  }

  const handleEmailTickets = () => {
    // In real app, this would send email with tickets
    alert('Email functionality would be implemented here')
  }

  const handleAddToCalendar = () => {
    // In real app, this would generate calendar event
    const eventData = {
      title: 'Die Odyssee - IMAX 70MM',
      start: '2026-04-16T16:00:00',
      end: '2026-04-16T18:30:00',
      location: 'Roxy Cinema',
      description: `Seats: ${cart.seats.map((s: CartSeat) => s.seatId).join(', ')}`
    }
    
    // Generate Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.title)}&dates=${eventData.start.replace(/[-:]/g, '')}/${eventData.end.replace(/[-:]/g, '')}&details=${encodeURIComponent(eventData.description)}&location=${encodeURIComponent(eventData.location)}`
    
    window.open(googleCalendarUrl, '_blank')
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Success Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-full mb-4">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-muted-foreground text-lg">
            Your tickets have been confirmed. Get ready for an amazing IMAX experience!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Movie Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Event Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Die Odyssee</h3>
                  <div className="bg-blue-600 px-3 py-1 rounded text-sm text-white font-semibold inline-block">
                    IMAX 70MM
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Date: </span>
                      <span className="text-white font-medium">April 16, 2026</span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Time: </span>
                      <span className="text-white font-medium">4:00 PM - 6:30 PM</span>
                    </div>
                  </div>

                  <div className="flex items-center md:col-span-2">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Location: </span>
                      <span className="text-white font-medium">Roxy Cinema</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Seat Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Your Seats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {cart.seats.map((seat: CartSeat) => (
                    <div key={seat.seatId} className="text-center p-3 bg-muted/20 rounded-lg">
                      <div className="w-10 h-10 bg-blue-600 rounded mx-auto mb-2 flex items-center justify-center text-white font-bold">
                        {seat.seatId}
                      </div>
                      <p className="text-sm text-white font-medium">
                        Row {seat.row}, Seat {seat.number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {seat.type}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Your Ticket QR Code</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="inline-block p-4 bg-white rounded-lg mb-4">
                  {/* Mock QR Code - in real app, use a QR code library */}
                  <div className="w-32 h-32 bg-black rounded grid grid-cols-8 gap-px p-2">
                    {Array.from({ length: 64 }, (_, i) => (
                      <div 
                        key={i} 
                        className={`${i % 3 === 0 ? 'bg-black' : 'bg-white'} rounded-sm`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Show this QR code at the cinema entrance
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Order ID: {orderId}
                </p>
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
                <div className="space-y-2">
                  {standardSeats.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Standard Tickets ({standardSeats.length}x)
                      </span>
                      <span className="text-white">
                        {formatCurrency(standardSeats.reduce((sum: number, seat: CartSeat) => sum + seat.price, 0))}
                      </span>
                    </div>
                  )}
                  
                  {vipSeats.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        VIP Tickets ({vipSeats.length}x)
                      </span>
                      <span className="text-white">
                        {formatCurrency(vipSeats.reduce((sum: number, seat: CartSeat) => sum + seat.price, 0))}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">Total Paid:</span>
                    <span className="text-xl font-bold text-green-400">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-white text-sm">Manage Your Tickets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleDownloadTickets}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Tickets
                </Button>
                
                <Button 
                  onClick={handleEmailTickets}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email Tickets
                </Button>
                
                <Button 
                  onClick={handleAddToCalendar}
                  variant="outline"
                  className="w-full"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Add to Calendar
                </Button>
              </CardContent>
            </Card>

            {/* Important Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-white">Important Information</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• Arrive 30 minutes before showtime</p>
                <p>• Bring a valid photo ID</p>
                <p>• No outside food or drinks allowed</p>
                <p>• Tickets are non-transferable</p>
                <p>• Contact support for any issues</p>
              </CardContent>
            </Card>

            {/* Return Home */}
            <Button 
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              Return Home
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}