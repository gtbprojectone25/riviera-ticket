'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Ticket, Download } from 'lucide-react'
import { useAuth } from '@/context/auth'

export default function MyTicketsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [isChecked, setIsChecked] = useState(false)

  // Mover useMemo para antes dos retornos antecipados
  const barcodeHeights = useMemo(() => 
    // eslint-disable-next-line react-hooks/purity
    Array.from({ length: 30 }, () => Math.random() * 40 + 40),
    []
  )

  // Verificar autenticação
  useEffect(() => {
    setIsChecked(true)
    if (!isLoading && !isAuthenticated) {
      router.push('/checkout')
    }
  }, [isLoading, isAuthenticated, router])

  // Mostrar loading enquanto verifica autenticação
  if (isLoading || !isChecked) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center bg-black/70">
        <div className="text-center">
          <Ticket className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  // Se não autenticado, não renderiza nada (redireciona no useEffect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen text-white pb-20 bg-black/60">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-800">
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">My Tickets</h1>
      </div>

      <div className="container mx-auto max-w-md px-4 py-6">
        {/* Ticket Card */}
        <div className="bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
          {/* Movie Poster Section */}
          <div className="relative h-64 bg-linear-to-b from-gray-800 to-gray-900">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-40 h-56 bg-gray-700 rounded-lg shadow-xl flex items-center justify-center">
                <Ticket className="w-16 h-16 text-gray-500" />
              </div>
            </div>
            
            {/* IMAX Badge */}
            <div className="absolute top-4 right-4">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                IMAX 70MM
              </div>
            </div>
          </div>

          {/* Ticket Info */}
          <div className="p-6 space-y-4">
            {/* Movie Title */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Die Odyssee</h2>
              <p className="text-gray-400 text-sm">Roxy Cinema</p>
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-gray-700" />

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-xs mb-1">Date</p>
                <p className="text-white font-semibold">Apr 16, 2026</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Time</p>
                <p className="text-white font-semibold">5:00 PM</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Seats</p>
                <p className="text-white font-semibold">A12, A13</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs mb-1">Type</p>
                <p className="text-white font-semibold">VIP</p>
              </div>
            </div>

            {/* Barcode */}
            <div className="bg-white p-4 rounded-lg">
              <div className="flex justify-center gap-1">
                {barcodeHeights.map((height, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-black"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
              <p className="text-center text-black text-xs font-mono mt-2">
                BK001-2026-04-16-A12A13
              </p>
            </div>

            {/* Booking ID */}
            <div className="text-center">
              <p className="text-gray-400 text-xs">Booking ID</p>
              <p className="text-white font-mono text-sm">BK001</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-base font-semibold"
            onClick={() => window.print()}
          >
            <Download className="w-5 h-5 mr-2" />
            Download Ticket
          </Button>
          
          <Button 
            variant="outline"
            className="w-full border-gray-700 text-white hover:bg-gray-800 py-6 text-base"
            onClick={() => router.push('/')}
          >
            Book Another Ticket
          </Button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <p className="text-gray-400 text-sm leading-relaxed">
            Please show this ticket at the entrance. Arrive 15 minutes before the showtime.
          </p>
        </div>
      </div>
    </div>
  )
}
