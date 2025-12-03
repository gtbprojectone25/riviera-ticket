'use client'

import { useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useBookingStore } from '@/stores/booking'
import { SeatMap } from '../seat-selection/SeatMap'
import { INITIAL_SEATS } from '../seat-selection/utils'
import { Row } from '../seat-selection/types'
import { AnimatedBackground } from '@/components/animated-background'
import { PremiumTicketSummary, FeatureCards, BuyerGuarantee } from './_components/premium-summary'

export default function CheckoutPage() {
  const router = useRouter()
  const selectedCinema = useBookingStore((s) => s.selectedCinema)
  const finalizedTickets = useBookingStore((s) => s.finalizedTickets)

  // Proteção de rota
  useEffect(() => {
    if (!finalizedTickets || finalizedTickets.length === 0) {
       router.push('/seat-selection')
    }
  }, [finalizedTickets, router])

  // Dados derivados
  const totalAmount = finalizedTickets.reduce((acc, t) => acc + t.price, 0)
  const selectedSeatIds = finalizedTickets.map(t => t.assignedSeatId).filter(Boolean) as string[]
  
  // Agrupar tickets para o resumo
  const summaryTickets = useMemo(() => {
    const grouped = finalizedTickets.reduce<Record<string, { id: string; name: string; price: number; amount: number }>>((acc, t) => {
        const baseName = t.name.replace(/ #\d+$/, '');
        const key = t.type + t.price; 

        if (!acc[key]) {
            acc[key] = {
                id: t.type, 
                name: baseName,
                price: t.price,
                amount: 0
            };
        }
        acc[key].amount += 1;
        return acc;
    }, {});

    return Object.values(grouped);
  }, [finalizedTickets]);
  
  // Gerar linhas para o mapa (reuso da lógica)
  const seatRows = useMemo(() => {
      const rows: Row[] = [];
      const rowLabels = Array.from(new Set(INITIAL_SEATS.map(s => s.row)));
      for (const rowLabel of rowLabels) {
        rows.push({ 
            label: rowLabel, 
            seats: INITIAL_SEATS.filter(s => s.row === rowLabel) 
        });
      }
      return rows;
  }, []);

  if (!selectedCinema) return null;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <AnimatedBackground />

      {/* Top Alert */}
      <div className="bg-[#0066FF] text-white text-center py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium tracking-wide relative z-20">
        To guarantee your place, finish within 10:00 minutes (only 4 per session).
      </div>

      <div className="relative z-10 flex flex-col items-center min-h-screen pt-6">
        
        <div className="w-full max-w-md space-y-6 relative rounded-2xl p-10 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)] pb-40">
            
            {/* Back Button */}
            <button 
              onClick={() => router.back()}
              className="flex items-center text-gray-500 hover:text-white transition-colors text-sm mb-2 group w-fit"
            >
              <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
              To go back
            </button>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white mb-2">Order summary</h1>

            {/* Divider */}
            <div className="h-px bg-white/10 w-full" />

            {/* Summary List */}
            <div className="space-y-6">
                
                {/* Pre-Sale */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Pre-Sale</span>
                    <span className="text-base text-white font-bold">Die Odyssee</span>
                </div>

                {/* Exhibition Location */}
                <div className="flex justify-between items-start border-b border-white/10 pb-4">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">Exhibition location</span>
                    <div className="text-right">
                        <div className="text-base text-white font-bold">{selectedCinema.name || 'Roxy Cinema'}</div>
                        <div className="text-xs text-gray-500 mt-1 max-w-[180px] leading-relaxed">
                            {selectedCinema.address || '234 W 42nd St, New York, NY 10036'}
                        </div>
                    </div>
                </div>

                {/* Ticket Details */}
                <div className="flex justify-between items-start border-b border-white/10 pb-4">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider mt-1">Ticket Details</span>
                    <div className="text-right">
                        <div className="text-base text-white font-bold">{finalizedTickets.length} Premium Ticket</div>
                        <div className="text-xs text-gray-500 mt-1 max-w-[180px] leading-relaxed">
                            Tickets are available the week of the premiere
                        </div>
                    </div>
                </div>

                {/* Session Date */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Session date</span>
                    <span className="text-base text-white font-bold">16/06/2026</span>
                </div>

                {/* Session Time */}
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Session time</span>
                    <span className="text-base text-white font-bold">10am at 12pm</span>
                </div>
            </div>

            {/* Your Accent (Seats) */}
            <div className="mt-6 space-y-4">
                <div className="space-y-1">
                    <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wider">Your Accent</h3>
                    <p className="text-base text-white font-bold">
                        {selectedSeatIds.join(' | ')}
                    </p>
                </div>

                {/* Map Visualization - Arrastável e Responsivo */}
                <div className="w-full bg-[#111] rounded-xl border border-white/5 p-2 min-h-[300px] flex items-center justify-center">
                    <SeatMap 
                        rows={seatRows}
                        selectedSeats={selectedSeatIds}
                        onSeatClick={() => {}} // No-op no checkout
                        allowedTypes={[]} 
                        maxSelectable={0}
                        readOnly={true}
                    />
                </div>
            </div>

            {/* Premium Ticket Summary */}
            <div className="mt-8">
                <PremiumTicketSummary tickets={summaryTickets} />
            </div>

            {/* Feature Cards */}
            <div className="mt-8">
                <FeatureCards />
            </div>

            {/* Buyer Guarantee */}
            <div className="mt-8 border-t border-white/10 pt-6">
                <BuyerGuarantee />
            </div>

            {/* Go to Payment Button */}
            <div className="fixed bottom-0 left-0 w-full p-6 bg-linear-to-t from-black via-black to-transparent pt-12 z-30 max-w-md mx-auto right-0">
                <Button 
                    className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white py-6 rounded-xl text-base font-bold shadow-[0_0_20px_rgba(0,102,255,0.3)] transition-all active:scale-[0.98]"
                    onClick={() => {
                      router.push('/register?returnUrl=/payment')
                    }}
                >
                    Go to payment ${totalAmount.toLocaleString()}
                </Button>
            </div>
        </div>
      </div>
    </div>
  )
}
