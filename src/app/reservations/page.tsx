'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ArrowRight } from 'lucide-react'
import { useBookingStore } from '@/stores/booking'
import { formatCurrency } from '@/lib/utils'

export default function ReservationsPage() {
  const router = useRouter()
  const finalizedTickets = useBookingStore((s) => s.finalizedTickets)
  const selectedCinema = useBookingStore((s) => s.selectedCinema)

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
              <span className="ml-1">To go out</span>
            </Button>
            <div className="text-white font-bold text-lg">My Reservations</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 relative z-20">
          <button className="flex-1 py-4 px-4 text-center border-b-2 border-[#0066FF] text-[#0066FF] font-medium">
            Pendants
          </button>
          <button
            onClick={() => router.push('/my-tickets')}
            className="flex-1 py-4 px-4 text-center text-gray-400 hover:text-white transition-colors"
          >
            My events
          </button>
          <button
            onClick={() => router.push('/my-tickets')}
            className="flex-1 py-4 px-4 text-center text-gray-400 hover:text-white transition-colors"
          >
            My account
          </button>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6 max-w-md relative z-10">
          {/* Movie Poster Card */}
          <div className="bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl mb-6">
            {/* Movie Poster Section */}
            <div className="relative h-64 bg-linear-to-b from-gray-800 to-gray-900 flex items-center justify-center">
              <div className="w-40 h-56 bg-gray-700 rounded-lg shadow-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">THE ODYSSEY</div>
                  <div className="text-xs text-gray-400">A FILM BY</div>
                  <div className="text-xs text-gray-400">CHRISTOPHER NOLAN</div>
                </div>
              </div>
            </div>

            {/* Ticket Info */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Tickets</p>
                  <p className="text-white font-bold text-lg">
                    {ticketCount} Premium Ticket{ticketCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Tickets are available the week of the premiere.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm mb-1">Total</p>
                  <p className="text-white font-bold text-xl">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
              </div>

              {selectedCinema && (
                <div className="pt-4 border-t border-gray-700">
                  <p className="text-gray-400 text-xs mb-1">Cinema</p>
                  <p className="text-white font-semibold">{selectedCinema.name}</p>
                  <p className="text-gray-500 text-xs mt-1">{selectedCinema.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* My Reservation Button */}
          <Button
            onClick={() => router.push('/payment')}
            className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white py-6 rounded-xl text-base font-bold shadow-[0_0_20px_rgba(0,102,255,0.3)] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            My reservation
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
