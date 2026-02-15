import { Suspense } from 'react'
import PaymentClient from './PaymentClient'

export const dynamic = 'force-dynamic'

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen text-white flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading payment...</p>
        </div>
      }
    >
      <PaymentClient />
    </Suspense>
  )
}
