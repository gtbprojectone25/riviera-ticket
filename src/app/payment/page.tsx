'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, CreditCard, Lock } from 'lucide-react'
import { AnimatedBackground } from '@/components/animated-background'
import { useBookingStore } from '@/stores/booking'

export default function PaymentPage() {
  const router = useRouter()
  const finalizedTickets = useBookingStore((s) => s.finalizedTickets)
  const selectedCinema = useBookingStore((s) => s.selectedCinema)
  const [user, setUser] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Carregar dados do usuário do localStorage
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }

    // Verificar se há tickets selecionados
    if (!finalizedTickets || finalizedTickets.length === 0) {
      router.push('/checkout')
    }
  }, [finalizedTickets, router])

  // Calcular total
  const totalAmount = finalizedTickets.reduce((acc, t) => acc + t.price, 0)
  const ticketCount = finalizedTickets.length

  const handlePayment = async () => {
    setIsProcessing(true)
    
    try {
      // Aqui você pode integrar com Stripe, Adyen ou outro gateway
      // Por enquanto, vamos redirecionar para confirmação
      
      // Simular processamento de pagamento
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Redirecionar para confirmação após pagamento
      router.push('/confirmation')
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      setIsProcessing(false)
    }
  }

  if (!finalizedTickets || finalizedTickets.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <AnimatedBackground />

      {/* Top Alert */}
      <div className="bg-[#0066FF] text-white text-center py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium tracking-wide relative z-20">
        To guarantee your place, finish within 10:00 minutes (only 4 per session).
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 relative z-20">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-white hover:bg-gray-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-white font-bold text-lg">Payment</div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6 max-w-md relative z-10">
          {/* Order Summary */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl mb-6 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Tickets</span>
                <span className="text-white font-semibold">{ticketCount} Premium Ticket{ticketCount > 1 ? 's' : ''}</span>
              </div>
              
              {selectedCinema && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Cinema</span>
                  <span className="text-white font-semibold">{selectedCinema.name}</span>
                </div>
              )}
              
              <div className="border-t border-gray-700 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-lg">Total</span>
                  <span className="text-white font-bold text-2xl">${totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl mb-6 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Payment Method</h2>
            
            <div className="space-y-3">
              <button className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Credit Card</span>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-blue-400 bg-blue-400"></div>
              </button>
              
              <button className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-400">Debit Card</span>
                </div>
              </button>
            </div>
          </div>

          {/* Security Info */}
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-6">
            <Lock className="w-4 h-4" />
            <span>Your payment information is secure and encrypted</span>
          </div>

          {/* Pay Button */}
          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white py-6 rounded-xl text-base font-bold shadow-[0_0_20px_rgba(0,102,255,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay ${totalAmount.toLocaleString()}
                <Lock className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

