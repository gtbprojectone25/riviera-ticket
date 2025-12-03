'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

// Componentes Visuais / UI
import { AnimatedBackground } from '@/components/animated-background';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Componentes do Mapa
import { SeatLegend } from './SeatLegend';
import { SeatMap } from './SeatMap';
import { SelectedSeatsPanel } from './SelectedSeatsPanel';
import { ApplyButton } from './ApplyButton';

// Store e Tipos
import { useBookingStore } from '@/stores/booking';
import type { Ticket, Seat, Row, SeatType } from './types';
   

// --- GERADOR DE LAYOUT DO MAPA (Removido - usa utils) ---


import { INITIAL_SEATS } from './utils';

export default function SeatSelectionPage() {
  const router = useRouter();
  
  // 1. Consumir dados da Store
  const selectedCinema = useBookingStore((s) => s.selectedCinema);
  const selectedTicketsFromStore = useBookingStore((s) => s.selectedTickets); 
  
  // 2. Inicialização Lazy
  const [ticketsToAssign, setTicketsToAssign] = useState<Ticket[]>(() => {
    if (!selectedTicketsFromStore || selectedTicketsFromStore.length === 0) {
        return [];
    }

    const expandedTickets: Ticket[] = [];
    selectedTicketsFromStore.forEach((t) => {
        for (let i = 0; i < t.amount; i++) {
            expandedTickets.push({
                id: `ticket-${t.id}-${i}-${Date.now()}`,
                name: `${t.name} #${i + 1}`,
                type: t.id === 'vip' ? 'VIP' : 'STANDARD', 
                price: t.price,
                assignedSeatId: undefined
            });
        }
    });
    return expandedTickets;
  });

  // 3. Proteção de Rota
  useEffect(() => {
    if (!selectedCinema || !selectedTicketsFromStore || selectedTicketsFromStore.length === 0) {
      router.push('/ticket-selection');
    }
  }, [selectedCinema, selectedTicketsFromStore, router]);


  // --- DADOS PARA O RESUMO ---
  const summaryTickets = useMemo(() => {
    const grouped = ticketsToAssign.reduce<Record<string, { id: string; name: string; price: number; amount: number; description: string[] }>>((acc, t) => {
        const baseName = t.name.replace(/ #\d+$/, '');
        const key = t.type + t.price; 

        if (!acc[key]) {
            acc[key] = {
                id: t.type, 
                name: baseName,
                price: t.price,
                amount: 0,
                description: [] 
            };
        }
        acc[key].amount += 1;
        return acc;
    }, {});

    return Object.values(grouped);
  }, [ticketsToAssign]);

  // Lógica do Mapa
  const handleSeatClick = (row: string, number: string | number, id: string) => {
    const seat = INITIAL_SEATS.find(s => s.id === id);
    if (!seat || seat.status !== 'available') return;

    let requiredType = seat.type === 'VIP' ? 'VIP' : 'STANDARD';
    if (seat.type === 'WHEELCHAIR') requiredType = 'STANDARD'; 

    const isAlreadySelected = ticketsToAssign.find(t => t.assignedSeatId === id);
    
    if (isAlreadySelected) {
        handleRemoveSeat(isAlreadySelected.id);
        return;
    }

    const availableTicket = ticketsToAssign.find(t => !t.assignedSeatId && t.type === requiredType);
    
    if (availableTicket) {
      setTicketsToAssign(prev => prev.map(t => t.id === availableTicket.id ? { ...t, assignedSeatId: id } : t));
    } else {
        console.log("Nenhum ticket disponível para este tipo de assento");
    }
  };

  const handleRemoveSeat = (ticketId: string) => {
    setTicketsToAssign(prev => prev.map(t => t.id === ticketId ? { ...t, assignedSeatId: undefined } : t));
  };

  const handleApply = () => {
    useBookingStore.getState().setFinalizedTickets(ticketsToAssign as any);
    router.push('/checkout');
  };

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

  const selectedSeatIds = ticketsToAssign.filter(t => t.assignedSeatId).map(t => t.assignedSeatId!);
  const allowedTypes = Array.from(new Set(ticketsToAssign.map(t => t.type)));
  const isAllSelected = ticketsToAssign.length > 0 && ticketsToAssign.every(t => t.assignedSeatId);

  if (!selectedCinema) return null;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden">
      <AnimatedBackground />

      <div className="relative z-10 flex flex-col items-center min-h-screen pt-6">
        
        <div className="w-full max-w-md space-y-6 relative rounded-2xl p-10 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)]">
            
            {/* Header */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Die Odyssee</h1>
                    <Badge variant="secondary" className="bg-[#2A2A2A] hover:bg-[#333] text-gray-300 px-4 py-1.5 rounded-full border-0 font-medium">
                        Pre-order
                    </Badge>
                </div>

                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-gray-500 hover:text-white p-0 h-auto font-normal hover:bg-transparent text-sm flex items-center"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    To go back
                </Button>
            </div>
            
            {/* Divider */}
            <div className="h-px bg-white/10 w-full" />

            {/* Cinema Info */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-white">Roxy Cinema</h2>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                        {selectedCinema.address || `${selectedCinema.city}, ${selectedCinema.state}`}
                    </p>
                </div>
                <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-white/10 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-bold">
                                9.7/10
                            </div>
                            <span className="text-[10px] font-medium text-white">Extraordinary</span>
                        </div>
                    <p className="text-[10px] text-gray-500">2.987 reviews</p>
                </div>
            </div>

            {/* Resumo dos Tickets */}
            <div className="bg-[#171C20] rounded-2xl p-5 border border-white/5">
              {summaryTickets.map((ticket, index) => (
                <div key={ticket.id}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-white font-semibold text-base">{ticket.name}</h3>
                            <p className="text-gray-500 text-xs mt-1">{ticket.amount}x ${ticket.price}</p>
                        </div>
                        <div className="px-4 py-2 rounded-full bg-[#2A2A2A] border border-white/5 text-white text-xs font-bold">
                            ${ticket.price}
                        </div>
                    </div>
                    {index < summaryTickets.length - 1 && (
                        <div className="h-px bg-white/5 w-full my-4" />
                    )}
                </div>
              ))}
            </div>
            
            {/* Legenda e Mapa */}
            <div className="space-y-2 pl-2 pr-2">
                <SeatLegend />

                <div className="w-full mask-content-auto">
                     <SeatMap
                        rows={seatRows}
                        selectedSeats={selectedSeatIds}
                        onSeatClick={handleSeatClick}
                        allowedTypes={allowedTypes}
                        maxSelectable={ticketsToAssign.length}
                    />
                </div>
            </div>

            {/* Painel de Seleção Inferior */}
            <SelectedSeatsPanel tickets={ticketsToAssign} onRemoveSeat={handleRemoveSeat} />

            {/* Botão Apply */}
            <ApplyButton onApply={handleApply} isReady={isAllSelected} />
        </div>
      </div>
    </div>
  );
}
