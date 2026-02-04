'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, CreditCard, Lock } from 'lucide-react'
import { useBookingStore } from '@/stores/booking'
import { createCart, type SelectedSeat } from '@/actions/bookings'
import { useAuth } from '@/context/auth'
import { formatCurrency } from '@/lib/utils'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { StripeCheckoutForm } from './StripeCheckoutForm'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

export default function PaymentPage() {
  const router = useRouter()
  const finalizedTickets = useBookingStore((s) => s.finalizedTickets)
  const selectedCinema = useBookingStore((s) => s.selectedCinema)
  const selectedSessionId = useBookingStore((s) => s.selectedSessionId)
  const cartId = useBookingStore((s) => s.cartId)
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

        let activeCartId = cartId ?? null
        if (!activeCartId) {
          const cartResult = await createCart(user?.id ?? null, selectedSessionId, seatsForCart)
          if (!cartResult.success || !cartResult.cartId) {
            throw new Error(cartResult.message || 'Failed to create cart')
          }
          activeCartId = cartResult.cartId
          // Salvar cartId na store e localmente
          setCartId(activeCartId)
        }
        setCurrentCartId(activeCartId)

        const totalAmountCents = finalizedTickets.reduce((acc, t) => acc + t.price, 0)

        const intentResponse = await fetch('/api/payment/stripe/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cartId: activeCartId,
            amountCents: totalAmountCents,
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
  }, [finalizedTickets, selectedSessionId, user?.id, router, clientSecret, cartId, setCartId])

  const handleSuccess = useCallback(() => {
    const totalAmountCents = finalizedTickets.reduce((acc, t) => acc + t.price, 0)
    
    // Salvar dados do pagamento na store
    setPaymentData({
      orderId: currentCartId || `ORD-${Date.now()}`,
      totalAmount: totalAmountCents,
      paymentDate: new Date().toISOString(),
      status: 'succeeded',
    })

    router.push('/confirmation')
  }, [finalizedTickets, currentCartId, setPaymentData, router])

  if (!finalizedTickets || finalizedTickets.length === 0) {
    return null
  }

  const totalAmountCents = finalizedTickets.reduce((acc, t) => acc + t.price, 0)
  const ticketCount = finalizedTickets.length

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden bg-black/60">
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-white/5"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-white font-semibold text-base">Payment</div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 pb-8 max-w-md relative z-10 space-y-5">
          {/* Order Summary */}
          <div className="bg-zinc-800/90 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.45)] p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Order Summary</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/80">
                <span>Tickets</span>
                <span className="text-white">
                  {ticketCount} Premium Ticket{ticketCount > 1 ? 's' : ''}
                </span>
              </div>

              {selectedCinema && (
                <div className="flex justify-between text-white/80">
                  <span>Cinema</span>
                  <span className="text-white">{selectedCinema.name}</span>
                </div>
              )}

              <div className="h-px bg-white/10 my-3" />

              <div className="flex justify-between items-center text-sm">
                <span className="text-white/70">Total</span>
                <span className="text-white font-semibold">
                  {formatCurrency(totalAmountCents)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Methods + Stripe */}
          <div className="bg-zinc-800/90 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.45)] p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">Payment Method</h2>

            <div className="w-full px-4 py-3 bg-zinc-700/80 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm">Credit Card</span>
              </div>
              <div className="h-2 w-2 rounded-full bg-blue-400" />
            </div>

            {initError && (
              <p className="text-sm text-red-500">
                {initError}
              </p>
            )}

            {!clientSecret || !stripePromise ? (
              <Button
                disabled
                className="w-full bg-[#0066FF] text-white h-12 rounded-xl text-base font-semibold flex items-center justify-center gap-2"
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
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#2563eb',
                      colorBackground: '#ffffff',
                      colorText: '#0f172a',
                      colorTextSecondary: '#64748b',
                      borderRadius: '10px',
                      fontFamily: 'inherit',
                    },
                    rules: {
                      '.Input': { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' },
                      '.Label': { color: '#e5e7eb' },
                      '.Tab': { border: '1px solid #e5e7eb' },
                    },
                  },
                }}
              >
                <StripeCheckoutForm amountCents={totalAmountCents} onSuccess={handleSuccess} />
              </Elements>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
