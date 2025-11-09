'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/hooks/use-cart'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { ChevronLeft, CheckCircle, Clock } from 'lucide-react'

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, clearCart, getCartSummary } = useCart()
  const [isProcessing, setIsProcessing] = useState(false)
  const [standardQuantity, setStandardQuantity] = useState(2)
  const [vipQuantity, setVipQuantity] = useState(1)

  const cartSummary = getCartSummary()

  const handlePayment = async () => {
    setIsProcessing(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const orderId = `order_${Date.now()}`
      const orderDetails = {
        id: orderId,
        cart,
        status: 'completed',
        purchaseDate: new Date().toISOString(),
        total: cartSummary.totalAmount
      }
      
      localStorage.setItem('last-order', JSON.stringify(orderDetails))
      clearCart()
      router.push(`/confirmation?orderId=${orderId}`)
      
    } catch (error) {
      console.error('Payment error:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const standardPrice = 3000 // R$ 30
  const vipPrice = 5000 // R$ 50
  const totalPrice = (standardQuantity * standardPrice) + (vipQuantity * vipPrice)

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
          <div className="text-white font-bold">Order summary</div>
        </div>
        <div className="text-blue-400 font-bold text-xl">IMAX</div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-md">
        {/* Movie Info */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Die Odyssee</h1>
          <div className="space-y-1 text-sm text-gray-400">
            <div>Roxy Cinema</div>
            <div>2 Premium Ticket</div>
            <div>16/04/2026</div>
            <div>15:00 às 17:30pm</div>
            <div>***D7, D6***</div>
          </div>
        </div>

        {/* Seat Map Preview */}
        <Card className="bg-gray-900 border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <div className="text-white font-medium mb-2">Screen</div>
              <div className="w-full h-1 bg-gray-600 rounded mb-6"></div>
            </div>
            
            {/* Simplified seat grid */}
            <div className="space-y-2">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((row) => (
                <div key={row} className="flex items-center justify-center gap-1">
                  <div className="w-6 text-xs text-gray-400 text-center">{row}</div>
                  {Array.from({ length: 14 }, (_, i) => {
                    const isSelected = (row === 'D' && (i === 2 || i === 3)) // D6, D7
                    const isOccupied = Math.random() < 0.3
                    
                    return (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-sm ${
                          isSelected 
                            ? 'bg-blue-500' 
                            : isOccupied 
                              ? 'bg-gray-600' 
                              : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-700 rounded-sm"></div>
                <span className="text-gray-400">Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                <span className="text-gray-400">Selected</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-600 rounded-sm"></div>
                <span className="text-gray-400">Occupied</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Selection */}
        <div className="space-y-4 mb-6">
          <h3 className="text-white font-medium">Choose the type of ticket you will buy</h3>
          
          {/* Standard Ticket */}
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-medium">Standard</h4>
                    <Badge variant="secondary" className="bg-gray-700 text-white text-xs">
                      R$30
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm">Comfortable seating with great view</p>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">
                    {formatCurrency(standardPrice)}
                  </div>
                  <div className="text-xs text-gray-400">Amount</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-8 h-8 p-0 border-gray-600"
                      onClick={() => setStandardQuantity(Math.max(0, standardQuantity - 1))}
                    >
                      -
                    </Button>
                    <span className="text-white w-8 text-center">{standardQuantity}</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-8 h-8 p-0 border-gray-600"
                      onClick={() => setStandardQuantity(standardQuantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* VIP Ticket */}
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-medium">VIP</h4>
                    <Badge variant="secondary" className="bg-gray-700 text-white text-xs">
                      R$50
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm">Premium seating with luxury amenities</p>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">
                    {formatCurrency(vipPrice)}
                  </div>
                  <div className="text-xs text-gray-400">Amount</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-8 h-8 p-0 border-gray-600"
                      onClick={() => setVipQuantity(Math.max(0, vipQuantity - 1))}
                    >
                      -
                    </Button>
                    <span className="text-white w-8 text-center">{vipQuantity}</span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-8 h-8 p-0 border-gray-600"
                      onClick={() => setVipQuantity(vipQuantity + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <Card className="bg-gray-900 border-gray-700 mb-6">
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-green-400 mb-2">
                ${((standardQuantity * 30) + (vipQuantity * 50)).toFixed(0)}
              </div>
              <div className="text-lg font-bold text-white">
                ${totalPrice.toFixed(0)}
              </div>
            </div>
            
            {/* Benefits */}
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <p className="font-medium">Ingressos garantidos</p>
                  <p className="text-gray-400">Seus lugares estão reservados por 10 minutos.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <p className="font-medium">Cancelamento flexível</p>
                  <p className="text-gray-400">Cancele até 2 horas antes da sessão.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-gray-300">
                  <p className="font-medium">Experiência premium</p>
                  <p className="text-gray-400">Audio e vídeo de alta qualidade IMAX.</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg font-semibold"
            >
              {isProcessing ? 'Processando...' : `Pagar ${formatCurrency(totalPrice)}`}
            </Button>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>Sua reserva expira em 8 minutos</span>
          </div>
          <div className="text-gray-500 text-xs">
            Todos os preços incluem taxas e impostos
          </div>
        </div>
      </div>
    </div>
  )
}