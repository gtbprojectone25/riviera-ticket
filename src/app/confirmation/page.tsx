'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Clock3,AlertTriangle } from 'lucide-react'

import { useAuth } from '@/context/auth'
import { useBookingStore } from '@/stores/booking'
import { qrcodeService } from '@/lib/qrcode-service'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type FetchState = 'processing' | 'confirmed' | 'not_found' | 'error'

type TicketApi = {
  id: string
  type: string
  price: number
  seatId: string
}

const MAX_FETCH_RETRIES = 12
const FETCH_RETRY_DELAY_MS = 1500

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-white flex items-center justify-center bg-black/70">
          <div className="text-center space-y-2">
            <Clock3 className="w-10 h-10 mx-auto animate-pulse text-blue-400" />
            <p className="text-gray-300">Loading confirmation...</p>
          </div>
        </div>
      }
    >
      <ConfirmationPageContent />
    </Suspense>
  )
}

function ConfirmationPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const isDev = process.env.NODE_ENV !== 'production'

  const paymentData = useBookingStore((s) => s.paymentData)
  const resetBooking = useBookingStore((s) => s.resetBooking)

  const checkoutSessionId = searchParams.get('checkout_session_id') || paymentData?.checkoutSessionId || null

  const [fetchState, setFetchState] = useState<FetchState>('processing')
  const [fetchMessage, setFetchMessage] = useState<string>('Awaiting ticket confirmation...')
  const [retryCount, setRetryCount] = useState(0)
  const [reloadNonce, setReloadNonce] = useState(0)

  const [sessionInfo, setSessionInfo] = useState<{
    id: string
    movieTitle: string
    startTime: string
    endTime: string
  } | null>(null)
  const [tickets, setTickets] = useState<Array<{
    id: string
    type: string
    price: number
    assignedSeatId: string
  }>>([])

  const [, setQrCodeUrl] = useState<string | null>(null)
  const [, setQrLoading] = useState(false)

  const hasCheckoutSession = useMemo(() => Boolean(checkoutSessionId), [checkoutSessionId])

  const orderId = useMemo(() => {
    return paymentData?.orderId || checkoutSessionId || `ORD-${Date.now()}`
  }, [paymentData, checkoutSessionId])

  const totalAmount = useMemo(() => tickets.reduce((acc, t) => acc + t.price, 0), [tickets])

  const selectedSeats = useMemo(
    () => tickets.map((t) => t.assignedSeatId).filter(Boolean),
    [tickets],
  )

  useEffect(() => {
    if (authLoading || isAuthenticated) return
    const returnTo = checkoutSessionId
      ? `/confirmation?checkout_session_id=${encodeURIComponent(checkoutSessionId)}`
      : '/confirmation'
    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  }, [authLoading, isAuthenticated, router, checkoutSessionId])

  useEffect(() => {
    if (authLoading || !isAuthenticated) return

    if (!hasCheckoutSession || !checkoutSessionId) {
      setFetchState('not_found')
      setFetchMessage('Checkout session not found. Please return to payment and try again.')
      return
    }

    let active = true

    const finalizeAndLoadTickets = async () => {
      // Best-effort finalize to avoid stuck pending state
      if (checkoutSessionId) {
        void fetch('/api/payment/stripe/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkoutSessionId }),
        }).catch(() => {})
      }

      if (isDev) {
        console.info('[confirmation] start fetch', { checkoutSessionId })
      }

      setFetchState('processing')
      setFetchMessage('Awaiting ticket issuance...')
      setRetryCount(0)

      for (let attempt = 0; attempt <= MAX_FETCH_RETRIES; attempt += 1) {
        if (!active) return

        setRetryCount(attempt)

        try {
          const response = await fetch('/api/tickets/claim', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
            credentials: 'include',
            body: JSON.stringify({
              checkout_session_id: checkoutSessionId,
            }),
          })

          if (response.status === 409) {
            if (isDev) {
              console.info('[confirmation] waiting webhook', { attempt: attempt + 1, checkoutSessionId })
            }

            if (attempt < MAX_FETCH_RETRIES) {
              setFetchState('processing')
              setFetchMessage(`Payment confirmed. Awaiting webhook (${attempt + 1}/${MAX_FETCH_RETRIES + 1})...`)
              await new Promise((resolve) => setTimeout(resolve, FETCH_RETRY_DELAY_MS))
              continue
            }

            setFetchState('error')
            setFetchMessage('Payment confirmed, but tickets are still processing. Please try again shortly.')
            return
          }

          if (response.status === 404) {
            if (isDev) {
              console.info('[confirmation] checkout not found', { checkoutSessionId })
            }
            setFetchState('not_found')
            setFetchMessage('Purchase not found for this checkout_session_id.')
            return
          }

          if (response.status === 403) {
            if (isDev) {
              console.info('[confirmation] forbidden checkout ownership', { checkoutSessionId })
            }
            setFetchState('error')
            setFetchMessage('This purchase is associated with another account.')
            return
          }

          if (!response.ok) {
            if (isDev) {
              console.warn('[confirmation] fetch failed', { status: response.status, checkoutSessionId })
            }
            setFetchState('error')
            setFetchMessage('Failed to load tickets. Please try again.')
            return
          }

          const data = await response.json()
          const mappedTickets = (data?.tickets || []).map((t: TicketApi) => ({
            id: t.id,
            type: t.type,
            price: t.price,
            assignedSeatId: t.seatId,
          }))

          if (!active) return

          if (mappedTickets.length === 0) {
            if (isDev) {
              console.info('[confirmation] no tickets after success', { checkoutSessionId })
            }
            setFetchState('not_found')
            setFetchMessage('No tickets were found for this purchase.')
            return
          }

          setTickets(mappedTickets)

          if (data?.session) {
            setSessionInfo({
              id: data.session.id,
              movieTitle: data.session.movieTitle,
              startTime: data.session.startTime,
              endTime: data.session.endTime,
            })
          }

          setFetchState('confirmed')
          setFetchMessage('Tickets confirmed successfully.')
          if (isDev) {
            console.info('[confirmation] confirmed', { ticketCount: mappedTickets.length, checkoutSessionId })
          }
          return
        } catch {
          if (isDev) {
            console.error('[confirmation] unexpected fetch error', { checkoutSessionId })
          }
          if (!active) return
          setFetchState('error')
          setFetchMessage('Unexpected error while fetching tickets. Please try again.')
          return
        }
      }
    }

    void finalizeAndLoadTickets()

    return () => {
      active = false
    }
  }, [authLoading, isAuthenticated, hasCheckoutSession, reloadNonce, isDev, checkoutSessionId])

  useEffect(() => {
    if (fetchState !== 'confirmed') {
      setQrCodeUrl(null)
      return
    }

    if (selectedSeats.length === 0) return

    let active = true

    const generateQR = async () => {
      try {
        setQrLoading(true)
        const qrData = qrcodeService.generateTicketQRData({
          orderId,
          ticketId: tickets[0]?.id || 'ticket-1',
          seatId: selectedSeats.join('-'),
          sessionId: sessionInfo?.id || 'session-1',
        })

        const dataUrl = await qrcodeService.generateDataURL(qrData, {
          width: 200,
          color: { dark: '#000000', light: '#FFFFFF' },
        })

        if (active) {
          setQrCodeUrl(dataUrl)
        }
      } catch {
        if (active) {
          setQrCodeUrl(null)
        }
      } finally {
        if (active) {
          setQrLoading(false)
        }
      }
    }

    void generateQR()

    return () => {
      active = false
    }
  }, [fetchState, selectedSeats, orderId, tickets, sessionInfo])


  if (authLoading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center bg-black/70">
        <div className="text-center space-y-2">
          <Clock3 className="w-10 h-10 mx-auto animate-pulse text-blue-400" />
          <p className="text-gray-300">Validating authentication...</p>
        </div>
      </div>
    )
  }

  if (fetchState === 'processing') {
    return (
      <div className="min-h-screen text-white flex items-center justify-center bg-black/70 px-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-blue-400" />
              Processing purchase...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-300">
            <p>{fetchMessage}</p>
            <p className="text-gray-500">Attempt {retryCount + 1}/{MAX_FETCH_RETRIES + 1}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (fetchState === 'not_found' || fetchState === 'error') {
    return (
      <div className="min-h-screen text-white flex items-center justify-center bg-black/70 px-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              {fetchState === 'not_found' ? 'Purchase not found' : 'Confirmation failed'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-300">{fetchMessage}</p>
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={() => setReloadNonce((n) => n + 1)} className="bg-blue-600 hover:bg-blue-700 text-white">
                Try again
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/account?tab=events&refresh=1')}
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                View my tickets
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white ">
      <div className="container mx-auto px-4 py-8 max-w-md space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Payment confirmed</h1>
          <p className="text-gray-400">Your tickets have been successfully issued.</p>
        </div>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-gray-300">Movie: {sessionInfo?.movieTitle || 'Session confirmed'}</p>
            <p className="text-gray-300">Seats: {selectedSeats.join(', ')}</p>
            <p className="text-gray-300">Order ID: {orderId}</p>
            <p className="text-green-400 font-semibold">Total: {formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>


        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/account?tab=events&refresh=1')}
            className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
          >
            View my tickets
          </Button>
          <Button
            onClick={() => {
              resetBooking()
              router.push('/')
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Back to home
          </Button>
        </div>
      </div>
    </div>
  )
}
