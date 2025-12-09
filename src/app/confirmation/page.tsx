'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { CheckCircle, Download, Share2, Calendar, Clock, Armchair, QrCode, MapPin } from 'lucide-react'
import { useBookingStore } from '@/stores/booking'
import { qrcodeService } from '@/lib/qrcode-service'

export default function ConfirmationPage() {
  const router = useRouter()
  
  // Dados da store
  const selectedCinema = useBookingStore((s) => s.selectedCinema)
  const sessionData = useBookingStore((s) => s.sessionData)
  const finalizedTickets = useBookingStore((s) => s.finalizedTickets)
  const paymentData = useBookingStore((s) => s.paymentData)
  const cartId = useBookingStore((s) => s.cartId)
  const resetBooking = useBookingStore((s) => s.resetBooking)

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Dados derivados
  const totalAmount = useMemo(() => 
    finalizedTickets.reduce((acc, t) => acc + t.price, 0), 
    [finalizedTickets]
  )

  const selectedSeats = useMemo(() => 
    finalizedTickets
      .map((t) => t.assignedSeatId)
      .filter(Boolean) as string[],
    [finalizedTickets]
  )

  const orderId = useMemo(() => 
    paymentData?.orderId || cartId || `ORD-${Date.now()}`,
    [paymentData, cartId]
  )

  // Gerar QR Code
  useEffect(() => {
    const generateQR = async () => {
      if (selectedSeats.length === 0) {
        setIsLoading(false)
        return
      }

      try {
        const qrData = qrcodeService.generateTicketQRData({
          orderId,
          ticketId: finalizedTickets[0]?.id || 'ticket-1',
          seatId: selectedSeats.join('-'),
          sessionId: sessionData?.id || 'session-1',
        })

        const dataUrl = await qrcodeService.generateDataURL(qrData, {
          width: 200,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        })

        setQrCodeUrl(dataUrl)
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error)
      } finally {
        setIsLoading(false)
      }
    }

    // Pequeno delay para simular carregamento
    const timer = setTimeout(generateQR, 1000)
    return () => clearTimeout(timer)
  }, [orderId, finalizedTickets, selectedSeats, sessionData?.id])

  // Proteção de rota
  useEffect(() => {
    if (!finalizedTickets || finalizedTickets.length === 0) {
      // Se não há tickets, pode ser um refresh - tentar usar dados do localStorage
      const timer = setTimeout(() => {
        if (!finalizedTickets || finalizedTickets.length === 0) {
          router.push('/')
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [finalizedTickets, router])

  const handleDownloadTicket = useCallback(() => {
    if (!qrCodeUrl) return

    // Criar link de download
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `ticket-${orderId}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [qrCodeUrl, orderId])

  const handleShareTicket = useCallback(async () => {
    const shareData = {
      title: `${sessionData?.movieTitle || 'Die Odyssee'} - Ticket Confirmation`,
      text: `My ticket for ${sessionData?.movieTitle || 'Die Odyssee'} at ${selectedCinema?.name || 'IMAX Cinema'}`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(window.location.href)
      alert('Ticket link copied to clipboard!')
    }
  }, [sessionData?.movieTitle, selectedCinema?.name])

  const handleNewBooking = useCallback(() => {
    resetBooking()
    router.push('/')
  }, [resetBooking, router])

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }, [])

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center bg-black/70">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Processing your order...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white bg-black/60">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="text-white font-bold">RIVIERA</div>
        <div className="text-blue-400 font-bold text-xl">IMAX</div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-md">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
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
                <h3 className="text-white font-medium text-lg">
                  {sessionData?.movieTitle || 'Die Odyssee'}
                </h3>
                <p className="text-gray-400 text-sm">{selectedCinema?.name || 'IMAX Cinema'}</p>
                {selectedCinema && (
                  <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {selectedCinema.city}, {selectedCinema.state}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {selectedCinema?.format || 'IMAX'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">
                  {sessionData?.startTime 
                    ? formatDate(sessionData.startTime)
                    : 'April 16, 2026'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">
                  {sessionData?.startTime && sessionData?.endTime
                    ? `${formatTime(sessionData.startTime)} - ${formatTime(sessionData.endTime)}`
                    : '18:00 - 21:00'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Armchair className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">
                  Seats: {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'H8, H9'}
                </span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {finalizedTickets[0]?.type || 'VIP'}
                </Badge>
              </div>
            </div>
            
            <div className="border-t border-gray-700 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Order ID</span>
                <span className="text-white font-mono text-sm">{orderId}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-gray-400">Total Paid</span>
                <span className="text-green-400 text-xl font-bold">
                  ${totalAmount.toLocaleString()}
                </span>
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
              {qrCodeUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={qrCodeUrl} 
                  alt="Ticket QR Code" 
                  className="w-40 h-40"
                />
              ) : (
                <div className="w-40 h-40 bg-gray-200 flex items-center justify-center text-gray-500 font-mono text-xs">
                  QR CODE
                </div>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Show this QR code at the cinema entrance
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                onClick={handleDownloadTicket}
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                disabled={!qrCodeUrl}
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
              A confirmation email has been sent to your registered email address.
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={handleNewBooking}
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
          Thank you for choosing Riviera Cinema!
        </p>
      </div>
    </div>
  )
}
