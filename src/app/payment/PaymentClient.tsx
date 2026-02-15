'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

type ResumePaymentResponse = {
  orderId: string
  cartId: string
  amountCents: number
  clientSecret: string | null
  paymentIntentId: string
  checkoutSessionId: string | null
  ticketsCount?: number
  session?: {
    id: string
    movieTitle: string
    startTime: string
    endTime: string
    cinemaName: string
  } | null
}

export default function PaymentClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resumeOrderId = searchParams.get('resumeOrderId')
  const isResumeMode = Boolean(resumeOrderId)

  const finalizedTickets = useBookingStore((s) => s.finalizedTickets)
  const selectedCinema = useBookingStore((s) => s.selectedCinema)
  const selectedSessionId = useBookingStore((s) => s.selectedSessionId)
  const cartId = useBookingStore((s) => s.cartId)
  const setPaymentData = useBookingStore((s) => s.setPaymentData)
  const setCartId = useBookingStore((s) => s.setCartId)
  const { user, token, isLoading: authLoading } = useAuth()

  const [isInitializingPayment, setIsInitializingPayment] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [currentCartId, setCurrentCartId] = useState<string | null>(null)
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null)
  const [resumeData, setResumeData] = useState<ResumePaymentResponse | null>(null)

  useEffect(() => {
    if (authLoading) return

    const setupPayment = async () => {
      try {
        setIsInitializingPayment(true)
        setInitError(null)

        if (isResumeMode && resumeOrderId) {
          const res = await fetch('/api/payments/resume', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ orderId: resumeOrderId }),
          })

          if (!res.ok) {
            const payload = await res.json().catch(() => ({}))
            throw new Error(payload.error || 'Failed to resume payment')
          }

          const data = (await res.json()) as ResumePaymentResponse
          setResumeData(data)
          setCurrentCartId(data.cartId)
          setCheckoutSessionId(data.checkoutSessionId)

          if (!data.clientSecret) {
            throw new Error('Missing clientSecret from resumed payment')
          }

          setClientSecret(data.clientSecret)
          return
        }

        if (!finalizedTickets || finalizedTickets.length === 0) {
          router.push('/checkout')
          return
        }

        if (!selectedSessionId || clientSecret) {
          return
        }

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
          setCartId(activeCartId)
        }
        setCurrentCartId(activeCartId)

        const totalAmountCents = finalizedTickets.reduce((acc, t) => acc + t.price, 0)

        const intentResponse = await fetch('/api/payment/stripe/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            cartId: activeCartId,
            amountCents: totalAmountCents,
            currency: 'usd',
            customerEmail: user?.email,
          }),
        })

        if (!intentResponse.ok) {
          const errorData = await intentResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to create payment intent')
        }

        const intentData = await intentResponse.json()

        if (!intentData.clientSecret) {
          throw new Error('Missing clientSecret from Stripe')
        }

        setClientSecret(intentData.clientSecret)
        if (intentData.checkoutSessionId) {
          setCheckoutSessionId(intentData.checkoutSessionId)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to initialize payment'
        console.error('Error initializing payment:', error)
        setInitError(message)
      } finally {
        setIsInitializingPayment(false)
      }
    }

    void setupPayment()
  }, [
    authLoading,
    isResumeMode,
    resumeOrderId,
    token,
    finalizedTickets,
    selectedSessionId,
    clientSecret,
    cartId,
    setCartId,
    user?.id,
    user?.email,
    router,
  ])

  const totalAmountCents = useMemo(() => {
    if (isResumeMode) {
      return resumeData?.amountCents ?? 0
    }
    return finalizedTickets.reduce((acc, t) => acc + t.price, 0)
  }, [isResumeMode, resumeData, finalizedTickets])

  const ticketCount = useMemo(() => {
    if (isResumeMode) return resumeData?.ticketsCount ?? 1
    return finalizedTickets.length
  }, [isResumeMode, finalizedTickets, resumeData?.ticketsCount])

  const cinemaLabel = useMemo(() => {
    if (isResumeMode) return resumeData?.session?.cinemaName ?? 'Riviera'
    return selectedCinema?.name ?? 'Riviera'
  }, [isResumeMode, resumeData, selectedCinema])

  const handleSuccess = useCallback(() => {
    if (!totalAmountCents) return

    setPaymentData({
      orderId: currentCartId || `ORD-${Date.now()}`,
      paymentIntentId: checkoutSessionId || undefined,
      checkoutSessionId: checkoutSessionId || undefined,
      totalAmount: totalAmountCents,
      paymentDate: new Date().toISOString(),
      status: 'succeeded',
    })

    const successQuery = new URLSearchParams()
    if (currentCartId) {
      successQuery.set('cartId', currentCartId)
    }
    if (checkoutSessionId) {
      successQuery.set('checkout_session_id', checkoutSessionId)
    }

    const successPath = `/confirmation${successQuery.toString() ? `?${successQuery.toString()}` : ''}`

    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent(successPath)}`)
      return
    }

    router.push(successPath)
  }, [totalAmountCents, setPaymentData, currentCartId, checkoutSessionId, user, router])

  if (!isResumeMode && (!finalizedTickets || finalizedTickets.length === 0)) {
    return null
  }

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden">
      <div className="relative z-10">
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

        <div className="container mx-auto px-4 pb-8 max-w-md relative z-10 space-y-5">
          <div className="bg-zinc-800/90 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.45)] p-5">
            <h2 className="text-lg font-semibold text-white mb-3">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/80">
                <span>Tickets</span>
                <span className="text-white">
                
                  {ticketCount} Ticket{ticketCount > 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex justify-between text-white/80">
                <span>Cinema</span>
                <span className="text-white">{cinemaLabel}</span>
              </div>

              <div className="h-px bg-white/10 my-3" />

              <div className="flex justify-between items-center text-sm">
                <span className="text-white/70">Total</span>
                <span className="text-white font-semibold">
                  {formatCurrency(totalAmountCents)}
                </span>
              </div>
            </div>
          </div>

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
              <p className="text-sm text-red-500">{initError}</p>
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
