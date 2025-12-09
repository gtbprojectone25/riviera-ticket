'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, CreditCard, Lock } from 'lucide-react'
import { useBookingStore } from '@/stores/booking'
import { createCart, type SelectedSeat } from '@/actions/bookings'
import { useAuth } from '@/context/auth'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { StripeCheckoutForm } from './StripeCheckoutForm'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

export default function PaymentPage() {
  const router = useRouter()
  const finalizedTickets = useBookingStore((s) => s.finalizedTickets)
  const selectedCinema = useBookingStore((s) => s.selectedCinema)
  const selectedSessionId = useBookingStore((s) => s.selectedSessionId)
  const setPaymentData = useBookingStore((s) => s.setPaymentData)
  const setCartId = useBookingStore((s) => s.setCartId)
  const { user } = useAuth()

  const [isInitializingPayment, setIsInitializingPayment] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [currentCartId, setCurrentCartId] = useState<string | null>(null)

  useEffect(() => {
    if (!finalizedTickets || finalizedTickets.length === 0) {
      router.push('/checkout')
      return
    }

    if (!selectedSessionId || clientSecret) {
      // Sem sessão ou PaymentIntent já criado
      return
    }

    const setupPayment = async () => {
      try {
        setIsInitializingPayment(true)
        setInitError(null)

        const seatsForCart: SelectedSeat[] = finalizedTickets
          .filter((t) => t.assignedSeatId)
          .map((t) => ({
            id: t.assignedSeatId as string,
            price: t.price,
            type: t.type === 'VIP' ? 'VIP' : 'STANDARD',
          }))

        const cartResult = await createCart(user?.id ?? null, selectedSessionId, seatsForCart)

        if (!cartResult.success || !cartResult.cartId) {
          throw new Error(cartResult.message || 'Failed to create cart')
        }

        // Salvar cartId na store e localmente
        setCartId(cartResult.cartId)
        setCurrentCartId(cartResult.cartId)

        const totalAmount = finalizedTickets.reduce((acc, t) => acc + t.price, 0)

        const intentResponse = await fetch('/api/payment/stripe/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartId: cartResult.cartId,
            amount: totalAmount,
            currency: 'usd',
          }),
        })

        if (!intentResponse.ok) {
          const errorData = await intentResponse.json()
          throw new Error(errorData.error || 'Failed to create payment intent')
        }

        const intentData = await intentResponse.json()

        if (!intentData.clientSecret) {
          throw new Error('Missing clientSecret from Stripe')
        }

        setClientSecret(intentData.clientSecret)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao iniciar pagamento'
        console.error('Erro ao iniciar pagamento com Stripe:', error)
        setInitError(message)
      } finally {
        setIsInitializingPayment(false)
      }
    }

    void setupPayment()
  }, [finalizedTickets, selectedSessionId, user?.id, router, clientSecret, setCartId])

  const handleSuccess = useCallback(() => {
    const totalAmount = finalizedTickets.reduce((acc, t) => acc + t.price, 0)
    
    // Salvar dados do pagamento na store
    setPaymentData({
      orderId: currentCartId || `ORD-${Date.now()}`,
      totalAmount,
      paymentDate: new Date().toISOString(),
      status: 'succeeded',
    })

    router.push('/confirmation')
  }, [finalizedTickets, currentCartId, setPaymentData, router])

  if (!finalizedTickets || finalizedTickets.length === 0) {
    return null
  }

  const totalAmount = finalizedTickets.reduce((acc, t) => acc + t.price, 0)
  const ticketCount = finalizedTickets.length

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden bg-black/60">
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
          <div className="bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl mb-6 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Tickets</span>
                <span className="text-white font-semibold">
                  {ticketCount} Premium Ticket{ticketCount > 1 ? 's' : ''}
                </span>
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
                  <span className="text-white font-bold text-2xl">
                    ${totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl mb-6 p-6">
            <h2 className="text-xl font-bold text-white mb-4">Payment Method</h2>

            <div className="space-y-3">
              <div className="w-full p-4 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Credit Card (Stripe)</span>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-blue-400 bg-blue-400" />
              </div>

              <div className="w-full p-4 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-between opacity-50">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-500">Other methods (soon)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stripe Payment Element */}
          {initError && (
            <p className="text-sm text-red-500 mb-4">
              {initError}
            </p>
          )}

          {!clientSecret || !stripePromise ? (
            <Button
              disabled
              className="w-full bg-[#0066FF] text-white py-6 rounded-xl text-base font-bold flex items-center justify-center gap-2"
            >
              {isInitializingPayment ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Preparing payment...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Unable to start payment
                </>
              )}
            </Button>
          ) : (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripeCheckoutForm amount={totalAmount} onSuccess={handleSuccess} />
            </Elements>
          )}
        </div>
      </div>
    </div>
  )
}

