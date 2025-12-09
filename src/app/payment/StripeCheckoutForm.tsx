'use client'

import { useState, type FormEvent } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'

interface StripeCheckoutFormProps {
  amount: number
  onSuccess: () => void
}

export function StripeCheckoutForm({ amount, onSuccess }: StripeCheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (result.error) {
      setErrorMessage(result.error.message || 'Payment failed. Please try again.')
      setIsSubmitting(false)
      return
    }

    if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
      onSuccess()
      return
    }

    // Para fluxos com 3DS/redirect, confiamos no webhook + página de confirmação
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {errorMessage && (
        <p className="text-sm text-red-500">
          {errorMessage}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || !stripe || !elements}
        className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white py-6 rounded-xl text-base font-bold shadow-[0_0_20px_rgba(0,102,255,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Pay ${amount.toLocaleString()}
            <Lock className="w-5 h-5" />
          </>
        )}
      </Button>
    </form>
  )
}

