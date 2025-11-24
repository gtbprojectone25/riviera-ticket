'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Clock } from 'lucide-react';

// Componentes Visuais / UI
import { AnimatedBackground } from '@/components/animated-background';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Componentes do Mapa
import { SeatLegend } from './SeatLegend';
import { SeatMap } from './SeatMap';
import { SelectedSeatsPanel } from './SelectedSeatsPanel';
import { ApplyButton } from './ApplyButton';

// Import do Resumo
import { TicketSummary } from '../ticket-selection/_components/ticket-summary';

// Store e Tipos
import { useBookingStore } from '@/stores/booking';
import type { Ticket, Seat, Row, SeatType } from './types';
   

// --- GERADOR DE LAYOUT DO MAPA (Mantido) ---
const generateSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const rowsStandard = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const rowsVip = ['M', 'N', 'O'];
  const allRows = [...rowsStandard, ...rowsVip];

  allRows.forEach((row) => {
    const isVipRow = rowsVip.includes(row);
    const defaultType: SeatType = isVipRow ? 'VIP' : 'STANDARD';
    
    for (let i = 1; i <= 25; i++) {
      let seatType: SeatType = defaultType;
      let status: 'available' | 'occupied' = 'available';

      if (isVipRow) {
        if (i >= 7 && i <= 18) {
            seatType = 'VIP';
        } else {
            seatType = 'GAP';
        }
      } 
      else {
          if (row === 'E') {
            if (i === 1 || i === 2) status = 'occupied';
            else if (i === 3 || i === 4) seatType = 'STANDARD';
            else if (i === 5 || i === 6) seatType = 'WHEELCHAIR';
            else if (i >= 7 && i <= 10) seatType = 'GAP';
            else if (i >= 11 && i <= 14) seatType = 'WHEELCHAIR';
            else if (i === 15) seatType = 'GAP';
            else if (i === 16 || i === 17) seatType = 'STANDARD';
            else if (i >= 18) seatType = 'GAP';
          } 
          else if (row === 'F') {
            if (i === 21 || i === 22) seatType = 'WHEELCHAIR';
            else if (i === 23) seatType = 'GAP';
            else if (i === 24 || i === 25) seatType = 'WHEELCHAIR';
          } else if (row === 'O') {
            if (i > 8 && i < 18) seatType = 'GAP';
          }
      }

      seats.push({
        id: `${row}${i}`,
        row: row,
        number: i,
        type: seatType,
        status: status,
      });
    }
  });
  return seats;
};

const INITIAL_SEATS = generateSeats();

export default function SeatSelectionPage() {
  const router = useRouter();
  
  // 1. Consumir dados da Store
  const selectedCinema = useBookingStore((s) => s.selectedCinema);
  const selectedTicketsFromStore = useBookingStore((s) => s.selectedTickets); 
  
  // 2. Inicialização Lazy (CORREÇÃO DO ERRO)
  // Calculamos o estado inicial DENTRO do useState, em vez de no useEffect
  const [ticketsToAssign, setTicketsToAssign] = useState<Ticket[]>(() => {
    // Se não houver tickets na store, retorna array vazio (o useEffect abaixo vai redirecionar)
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

  const [timeLeft, setTimeLeft] = useState(600);

  // 3. Proteção de Rota (Apenas Redirecionamento)
  useEffect(() => {
    if (!selectedCinema || !selectedTicketsFromStore || selectedTicketsFromStore.length === 0) {
      router.push('/ticket-selection');
    }
  }, [selectedCinema, selectedTicketsFromStore, router]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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
    console.log("Finalizando com:", ticketsToAssign);
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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-100px)] pt-8">
        
        <div className="w-full max-w-md rounded-2xl mx-4 space-y-4 p-6 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)]">
            
            <div className="w-full bg-[#0266FC] p-3 flex items-center justify-center rounded-lg sticky top-0 z-30 shadow-lg">
                <Clock className="h-4 w-4 text-white shrink-0 mr-2" />
                <p className="text-white text-xs font-medium text-center">
                    To guarantee your place, finish within {formatTime(timeLeft)}
                </p>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Die Odyssee</h1>
                    <Badge variant="secondary" className="bg-gray-700 text-white px-3 py-1 rounded-full">
                        Pre-order
                    </Badge>
                </div>

                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-white p-0 h-auto font-normal hover:bg-transparent"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    To go back
                </Button>
            </div>

            <div className="bg-gray-900/50 rounded-xl p-4 border border-white/5">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-semibold text-white">{selectedCinema.name}</h2>
                        <p className="text-xs text-gray-400">
                            {selectedCinema.address || `${selectedCinema.city}, ${selectedCinema.state}`}
                        </p>
                    </div>
                    <div className="text-right">
                         <div className="bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold inline-block mb-1">
                            9.7
                         </div>
                        <p className="text-[10px] text-gray-500">2.987 reviews</p>
                    </div>
                </div>
            </div>

            {/* Resumo dos Tickets */}
            <div className="py-2">
                <TicketSummary tickets={summaryTickets} />
            </div>
            
            <div className="h-px bg-gray-800 w-full my-2" />

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-white">Select Seats</h3>
                    <span className="text-xs text-gray-400">Pinch to zoom</span>
                </div>
                
                <SeatLegend />


                <div className="relative w-full overflow-hidden bg-[#111] rounded-xl border border-white/5 p-2 min-h-[300px] flex items-center justify-center">
                     <SeatMap
                        rows={seatRows}
                        selectedSeats={selectedSeatIds}
                        onSeatClick={handleSeatClick}
                        allowedTypes={allowedTypes}
                        maxSelectable={ticketsToAssign.length}
                    />
                </div>
            </div>

            <SelectedSeatsPanel tickets={ticketsToAssign} onRemoveSeat={handleRemoveSeat} />

            <div className="pt-2">
                <ApplyButton onApply={handleApply} isReady={isAllSelected} />
            </div>
        </div>

        <div className="text-center text-sm text-gray-500 pb-4 opacity-50 mt-4">
           Screen is facing this way
        </div>

      </div>
    </div>
  );
}