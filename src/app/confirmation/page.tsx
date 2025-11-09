'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Download, Share2, Calendar, Clock, MapPin, Armchair, QrCode } from 'lucide-react'

export default function ConfirmationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orderData, setOrderData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Mock order data - in real app this would come from API
  const mockOrderData = {
    id: 'ORD-2026-001234',
    movieTitle: 'Die Odyssee',
    cinemaName: 'Roxy Cinema',
    location: '291 W 4th St, New York, NY 10014',
    date: '16/04/2026',
    time: '18h at 11pm',
    screenType: 'IMAX 70MM',
    selectedSeats: ['H8', 'H9'],
    ticketType: 'VIP',
    totalPrice: 898,
    purchaseDate: new Date().toISOString(),
    status: 'confirmed',
    qrCode: 'QR-CODE-H8H9-041626',
    email: 'customer@example.com'
  }

  useEffect(() => {
    // Simulate loading order data
    const timer = setTimeout(() => {
      setOrderData(mockOrderData)
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleDownloadTicket = () => {
    // Simulate ticket download
    const ticketData = {
      ...orderData,
      downloadDate: new Date().toISOString()
    }
    
    // In real app, this would generate a PDF or image
    console.log('Downloading ticket:', ticketData)
    alert('Ticket downloaded successfully!')
  }

  const handleShareTicket = () => {
    if (navigator.share) {
      navigator.share({
        title: `${orderData.movieTitle} - Ticket Confirmation`,
        text: `My ticket for ${orderData.movieTitle} at ${orderData.cinemaName}`,
        url: window.location.href
      })
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(window.location.href)
      alert('Ticket link copied to clipboard!')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Processing your order...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="text-white font-bold">LOGO</div>
        <div className="text-blue-400 font-bold text-xl">IMAX</div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-md">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
          <p className="text-gray-400">Your tickets have been confirmed</p>
        </div>

        {/* Order Summary */}
        <Card className="bg-gray-900 border-gray-700 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-medium text-lg">{orderData.movieTitle}</h3>
                <p className="text-gray-400 text-sm">{orderData.cinemaName}</p>
                <p className="text-gray-400 text-sm">{orderData.location}</p>
              </div>
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {orderData.screenType}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">{formatDate(orderData.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">{orderData.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Armchair className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Seats: {orderData.selectedSeats.join(', ')}</span>
                <Badge variant="outline" className="text-xs">{orderData.ticketType}</Badge>
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Order ID</span>
                <span className="text-white font-mono text-sm">{orderData.id}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">Total Paid</span>
                <span className="text-green-400 text-xl font-bold">${orderData.totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Ticket */}
        <Card className="bg-gray-900 border-gray-700 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Your Ticket
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="bg-white p-6 rounded-lg inline-block mb-4">
              <div className="w-32 h-32 bg-gray-900 flex items-center justify-center text-white font-mono text-xs">
                QR CODE
                <br />
                {orderData.qrCode}
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Show this QR code at the cinema entrance
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                onClick={handleDownloadTicket}
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button 
                variant="outline"
                onClick={handleShareTicket}
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Important Information */}
        <Card className="bg-yellow-900/20 border-yellow-700 mb-6">
          <CardContent className="p-4">
            <h4 className="text-yellow-400 font-medium mb-2">Important Information</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Arrive at least 30 minutes before the show</li>
              <li>• Bring a valid ID for verification</li>
              <li>• No outside food or drinks allowed</li>
              <li>• Cancellation allowed up to 2 hours before showtime</li>
            </ul>
          </CardContent>
        </Card>

        {/* Email Confirmation */}
        <Card className="bg-gray-900 border-gray-700 mb-8">
          <CardContent className="p-4 text-center">
            <h4 className="text-white font-medium mb-2">Email Confirmation Sent</h4>
            <p className="text-gray-400 text-sm">
              A confirmation email has been sent to<br />
              <span className="text-blue-400">{orderData.email}</span>
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
          >
            Book Another Movie
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => router.push('/my-tickets')}
            className="w-full bg-gray-800 border-gray-600 text-white hover:bg-gray-700 py-3 rounded-lg"
          >
            View My Tickets
          </Button>
        </div>

        <p className="text-gray-500 text-xs text-center mt-6">
          Thank you for choosing our cinema experience!
        </p>
      </div>
    </div>
  )
}