'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { ChevronLeft, CreditCard, Smartphone, QrCode, Clock, MapPin, Calendar, Users, Armchair } from 'lucide-react'

export default function CheckoutPage() {
  const router = useRouter()
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix' | 'qr'>('card')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  })

  // Mock data for the selected session and seats
  const sessionData = {
    movieTitle: 'Die Odyssee',
    cinemaName: 'Roxy Cinema',
    location: '291 W 4th St, New York, NY 10014',
    date: '16/04/2026',
    time: '18h at 11pm',
    screenType: 'IMAX 70MM',
    selectedSeats: ['H8', 'H9'],
    ticketType: 'VIP',
    totalPrice: 898
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePayment = async () => {
    setIsLoading(true)
    
    // Simulate payment processing
    setTimeout(() => {
      router.push('/confirmation')
      setIsLoading(false)
    }, 2000)
  }

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    const groups = numbers.match(/.{1,4}/g) || []
    return groups.join(' ').substring(0, 19)
  }

  const formatExpiryDate = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length >= 2) {
      return `${numbers.substring(0, 2)}/${numbers.substring(2, 4)}`
    }
    return numbers
  }

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

      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="text-gray-400 hover:text-white p-0 mb-4"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Go back
        </Button>

        {/* Order Summary */}
        <Card className="bg-gray-900 border-gray-700 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-medium">{sessionData.movieTitle}</h3>
                <p className="text-gray-400 text-sm">{sessionData.cinemaName}</p>
                <p className="text-gray-400 text-sm">{sessionData.location}</p>
              </div>
              <Badge variant="secondary" className="bg-blue-600 text-white">
                {sessionData.screenType}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">{sessionData.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">{sessionData.time}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Armchair className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">Seats: {sessionData.selectedSeats.join(', ')}</span>
              <Badge variant="outline" className="text-xs">{sessionData.ticketType}</Badge>
            </div>
            
            <div className="border-t border-gray-700 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total ({sessionData.selectedSeats.length} tickets)</span>
                <span className="text-green-400 text-xl font-bold">${sessionData.totalPrice}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="bg-gray-900 border-gray-700 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-gray-400">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label htmlFor="phone" className="text-gray-400">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="bg-gray-900 border-gray-700 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Button
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                className={`${
                  paymentMethod === 'card' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-gray-800 text-gray-300 border-gray-600'
                } flex flex-col items-center p-3 h-auto`}
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span className="text-xs">Card</span>
              </Button>
              
              <Button
                variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                className={`${
                  paymentMethod === 'pix' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-gray-800 text-gray-300 border-gray-600'
                } flex flex-col items-center p-3 h-auto`}
                onClick={() => setPaymentMethod('pix')}
              >
                <Smartphone className="w-5 h-5 mb-1" />
                <span className="text-xs">PIX</span>
              </Button>
              
              <Button
                variant={paymentMethod === 'qr' ? 'default' : 'outline'}
                className={`${
                  paymentMethod === 'qr' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-gray-800 text-gray-300 border-gray-600'
                } flex flex-col items-center p-3 h-auto`}
                onClick={() => setPaymentMethod('qr')}
              >
                <QrCode className="w-5 h-5 mb-1" />
                <span className="text-xs">QR Code</span>
              </Button>
            </div>

            {paymentMethod === 'card' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber" className="text-gray-400">Card Number</Label>
                  <Input
                    id="cardNumber"
                    value={formData.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', formatCardNumber(e.target.value))}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiryDate" className="text-gray-400">Expiry Date</Label>
                    <Input
                      id="expiryDate"
                      value={formData.expiryDate}
                      onChange={(e) => handleInputChange('expiryDate', formatExpiryDate(e.target.value))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv" className="text-gray-400">CVV</Label>
                    <Input
                      id="cvv"
                      value={formData.cvv}
                      onChange={(e) => handleInputChange('cvv', e.target.value.replace(/\D/g, '').substring(0, 3))}
                      className="bg-gray-800 border-gray-600 text-white"
                      placeholder="123"
                      maxLength={3}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cardName" className="text-gray-400">Cardholder Name</Label>
                  <Input
                    id="cardName"
                    value={formData.cardName}
                    onChange={(e) => handleInputChange('cardName', e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'pix' && (
              <div className="text-center py-8">
                <div className="bg-white p-6 rounded-lg inline-block mb-4">
                  <div className="w-32 h-32 bg-gray-900 flex items-center justify-center text-white">
                    PIX QR
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  Scan the QR code with your banking app to complete the payment
                </p>
              </div>
            )}

            {paymentMethod === 'qr' && (
              <div className="text-center py-8">
                <div className="bg-white p-6 rounded-lg inline-block mb-4">
                  <div className="w-32 h-32 bg-gray-900 flex items-center justify-center text-white">
                    QR CODE
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  Scan the QR code to complete your payment
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Complete Payment Button */}
        <Button 
          onClick={handlePayment}
          disabled={isLoading || (paymentMethod === 'card' && (!formData.cardNumber || !formData.expiryDate || !formData.cvv || !formData.cardName))}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-400 text-white py-3 rounded-lg text-lg font-medium"
        >
          {isLoading ? 'Processing...' : `Complete Payment - $${sessionData.totalPrice}`}
        </Button>

        <p className="text-gray-400 text-xs text-center mt-3">
          Your payment is secured with 256-bit SSL encryption
        </p>
      </div>
    </div>
  )
}