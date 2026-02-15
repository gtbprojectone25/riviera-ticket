'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react'

// Componentes Visuais / UI
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OdysseyLoading } from '@/components/ui/OdysseyLoading';
import { ImaxSeatMap } from '@/components/seats/ImaxSeatMap';

// Componentes do Mapa
import { SelectedSeatsPanel } from './SelectedSeatsPanel';
import { ApplyButton } from './ApplyButton';
import { formatCurrency } from '@/lib/utils';

// Store e Tipos
import { useBookingStore, type FinalizedTicket } from '@/stores/booking';
import type { Ticket } from './types';
import { useSessionSeats } from './useSessionSeats';
import { useAuth } from '@/context/auth';
import { useSeatSelectionManager } from './useSeatSelectionManager';

export default function SeatSelectionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <SeatSelectionPageContent />
    </Suspense>
  );
}

function SeatSelectionPageContent() {
  const router = useRouter();
  
  // 1. Consumir dados da Store
  const selectedCinema = useBookingStore((s) => s.selectedCinema);
  const selectedTicketsFromStore = useBookingStore((s) => s.selectedTickets); 
  const selectedSessionId = useBookingStore((s) => s.selectedSessionId);
  const setSelectedSessionId = useBookingStore((s) => s.setSelectedSessionId);
  const cartId = useBookingStore((s) => s.cartId);
  const setCartId = useBookingStore((s) => s.setCartId);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isDev = process.env.NODE_ENV !== 'production';
  const debugLayout = searchParams.get('debugLayout') === '1';
  const debug = searchParams.get('debug') === '1';

  const {
    rows: seatRows,
    loading: seatsLoading,
    error: seatsError,
  } = useSessionSeats({ sessionId: selectedSessionId });
  const [holdError, setHoldError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!isDev) return;
    console.debug('[seat-selection] init', {
      sessionId: selectedSessionId,
      cartId,
      userId: user?.id ?? null,
      tickets: selectedTicketsFromStore?.length ?? 0,
    });
    if (selectedSessionId) {
      console.warn('sessionId', selectedSessionId, selectedSessionId.length)
      if (selectedSessionId.length !== 36) {
        console.warn('BAD SESSION ID', selectedSessionId, selectedSessionId.length)
      }
    }
  }, [isDev, selectedSessionId, cartId, user?.id, selectedTicketsFromStore?.length]);

  // Garantir que o sessionId existe (fallback via query param)
  useEffect(() => {
    if (selectedSessionId) return;
    const sessionIdFromQuery = searchParams.get('sessionId');
    if (sessionIdFromQuery) {
      setSelectedSessionId(sessionIdFromQuery);
    }
  }, [searchParams, selectedSessionId, setSelectedSessionId]);
  
  // 2. InicializaÃ§Ã£o Lazy
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
    return expandedTickets.slice(0, 4);
  });

  const allSeats = useMemo(() => seatRows.flatMap((r) => r.seats), [seatRows]);

  const selectionManager = useSeatSelectionManager({
    tickets: ticketsToAssign,
    seats: allSeats,
    cartId,
    maxTotalSlots: 4,
  });

  const {
    ticketSlots,
    counts,
    resolveToggleSeat,
    seatUiStateById,
  } = selectionManager;

  // 3. ProteÃ§Ã£o de Rota
  useEffect(() => {
    if (!selectedCinema || !selectedTicketsFromStore || selectedTicketsFromStore.length === 0) {
      router.push('/ticket-selection');
    }
  }, [selectedCinema, selectedTicketsFromStore, router]);


  // --- DADOS PARA O RESUMO ---
  const summaryTickets = useMemo(() => {
    const grouped = ticketSlots.reduce<Record<string, { id: string; name: string; price: number; amount: number; description: string[] }>>((acc, t) => {
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
  }, [ticketSlots]);

  useEffect(() => {
    if (ticketsToAssign.length <= 4) return
    const removed = ticketsToAssign.slice(4).map((t) => t.assignedSeatId).filter(Boolean) as string[]
    setTicketsToAssign((prev) => prev.slice(0, 4))
    if (!selectedSessionId || !cartId || removed.length === 0) return
    void fetch('/api/seats/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartId,
        sessionId: selectedSessionId,
        seatIds: removed,
        userId: user?.id ?? null,
      }),
    }).catch(() => undefined)
  }, [cartId, selectedSessionId, ticketsToAssign, user?.id]);

  const handleHoldSeat = async (seatId: string, ticketId: string) => {
    if (!selectedSessionId) return;
    setHoldError(null);

    try {
      if (isDev) {
        console.debug('[seat-selection] hold request', { seatId, cartId, sessionId: selectedSessionId });
      }
      const response = await fetch('/api/seats/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          sessionId: selectedSessionId,
          seatIds: [seatId],
          ttlMinutes: 10,
          userId: user?.id ?? null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (isDev) {
        console.debug('[seat-selection] hold response', { status: response.status, data });
      }
      if (!response.ok || !data?.ok) {
        const reason = typeof data?.error === 'string' ? data.error : 'Assento indisponível'
        if (isDev) {
          console.debug('[seat-selection] hold failed', { status: response.status, data })
        }
        if (reason === 'CART_SESSION_MISMATCH' || reason === 'CART_NOT_FOUND') {
          setCartId(null)
        }
        setHoldError(reason);
        return;
      }

      if (data.cartId && data.cartId !== cartId) {
        setCartId(data.cartId);
      }

      setTicketsToAssign(prev =>
        prev.map(t => (t.id === ticketId ? { ...t, assignedSeatId: seatId } : t)),
      );
    } catch (error) {
      console.error('Erro ao segurar assento:', error);
      setHoldError('Assento indisponível');
    }
  };

  const handleRemoveSeat = async (ticketId: string, seatId?: string) => {
    setTicketsToAssign(prev => prev.map(t => t.id === ticketId ? { ...t, assignedSeatId: undefined } : t));

    if (!seatId || !selectedSessionId || !cartId) return;

    try {
      await fetch('/api/seats/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartId,
          sessionId: selectedSessionId,
          seatIds: [seatId],
          userId: user?.id ?? null,
        }),
      });
    } catch (error) {
      console.error('Erro ao liberar assento:', error);
    }
  };

  // LÃ³gica do Mapa
  const handleSeatClick = (id: string) => {
    const action = resolveToggleSeat(id);
    if (action.kind === 'unselect') {
      void handleRemoveSeat(action.ticketId, action.seatId);
      return;
    }
    if (action.kind === 'select') {
      void handleHoldSeat(action.seatId, action.ticketId);
      return;
    }
    if (isDev && action.kind === 'blocked') {
      console.debug('[seat-selection] blocked by slot/backend rule', { seatId: id, reason: action.reason });
    }
  };

  const handleApply = () => {
    const finalizedTickets: FinalizedTicket[] = ticketSlots.map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      type: ticket.type,
      price: ticket.price,
      assignedSeatId: ticket.assignedSeatId,
    }));

    useBookingStore.getState().setFinalizedTickets(finalizedTickets);
    router.push('/checkout');
  };

  const selectedSeatIds = ticketSlots.filter(t => t.assignedSeatId).map(t => t.assignedSeatId!);
  const selectedSeatLabels = useMemo(() => {
    if (selectedSeatIds.length === 0) return [];
    const allSeats = seatRows.flatMap((r) => r.seats);
    return selectedSeatIds
      .map((id) => {
        const seat = allSeats.find((s) => s.id === id);
        if (!seat) return null;
        return seat.seatId ?? seat.seat_id ?? `${seat.row}-${String(seat.number).padStart(2, '0')}`;
      })
      .filter((value): value is string => Boolean(value));
  }, [selectedSeatIds, seatRows]);
  const allowedTypes = Array.from(new Set(ticketSlots.map((t) => t.type)));
  const isAllSelected = counts.totalSlots > 0 && counts.totalSelected === counts.totalSlots;

  useEffect(() => {
    if (!seatRows.length) return;
    const now = new Date();
    const allSeats = seatRows.flatMap(r => r.seats);
    const unavailableSelected = ticketSlots.filter(t => {
      if (!t.assignedSeatId) return false;
      const seat = allSeats.find(s => s.id === t.assignedSeatId);
      if (!seat) return false;
      if (seat.status === 'SOLD') return true;
      if (seat.status === 'HELD') {
        const heldActive = seat.heldUntil ? new Date(seat.heldUntil) > now : true;
        return heldActive && (!seat.heldByCartId || seat.heldByCartId !== cartId);
      }
      return false;
    });

    if (unavailableSelected.length > 0) {
      setTicketsToAssign(prev =>
        prev.map(t =>
          unavailableSelected.find(u => u.id === t.id)
            ? { ...t, assignedSeatId: undefined }
            : t
        )
      );
      setHoldError('Alguns assentos ficaram indisponíveis e foram removidos.');
    }
  }, [seatRows, ticketSlots, cartId]);

  const handleRegenerateSeats = async () => {
    if (!selectedSessionId) return;
    setRegenerateError(null);
    setRegenerating(true);
    try {
      const res = await fetch(`/api/sessions/${selectedSessionId}/seats/generate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Falha ao regenerar (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao regenerar assentos';
      setRegenerateError(message);
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[seat-selection] regenerate failed', { sessionId: selectedSessionId, error: message });
      }
    } finally {
      setRegenerating(false);
    }
  };

  if (!selectedCinema) return null;

  return (
    <div className="min-h-screen text-white relative overflow-x-hidden">
      <OdysseyLoading isLoading={seatsLoading} />
      <div className="relative z-10 flex flex-col items-center min-h-screen pt-6 px-3 md:px-6">
        <div className="w-full max-w-[1200px] space-y-6 relative rounded-xl p-4 md:p-6 bg-[linear-gradient(to_top,#050505_0%,#080808_25%,#0A0A0A_45%,#0D0D0D_65%,#111111_80%,#181818_100%)]">
            {/* Header */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">The Odyssey</h1>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className="bg-[#2A2A2A] hover:bg-[#333] text-gray-300 px-3 py-1 border-0 font-medium">
                        Pre-order
                      </Badge>
                      <span className="max-w-[260px] truncate text-[11px] text-gray-400">
                        {selectedSeatLabels.length > 0
                          ? `Selected: ${selectedSeatLabels.join(', ')}`
                          : 'Selected: none'}
                      </span>
                    </div>
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
                    <h2 className="text-xl font-bold text-white">
                      {selectedCinema.name}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                        {selectedCinema.address || `${selectedCinema.city}, ${selectedCinema.state}`}
                    </p>
                </div>
                <div className="text-right flex flex-col items-end">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-white/10 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-bold">
                                9.7/10
                            </div>
                            <span className="text-xs font-medium text-white">Extraordinary</span>
                        </div>
                    <p className="text-xs text-gray-500">2.987 reviews</p>
                </div>
            </div>

            {/* Resumo dos Tickets */}
            <div className="bg-[#171C20] rounded-xl p-5 border border-white/5">
              {summaryTickets.map((ticket, index) => (
                <div key={ticket.id}>
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-white font-semibold text-base">{ticket.name}</h3>
                            <p className="text-gray-500 text-xs mt-1">{ticket.amount}x {formatCurrency(ticket.price)}</p>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-[#2A2A2A] border border-white/5 text-white text-xs font-bold">
                            {formatCurrency(ticket.price)}
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
                {!selectedSessionId && (
                  <p className="text-xs text-red-400 px-2">
                   Select a session before choosing your seats.
                  </p>
                )}

                {seatsLoading && (
                  <p className="text-xs text-gray-400 px-2">
                    Loading seats...
                  </p>
                )}

                {seatsError && !seatsLoading && (
                  <div className="text-xs text-red-400 px-2 space-y-2">
                    <p>Invalid session or seats not generated.</p>
                    {process.env.NODE_ENV !== 'production' && selectedSessionId && (
                      <p className="text-[11px] text-gray-400">sessionId: {selectedSessionId} (len {selectedSessionId.length}) | error: {seatsError}</p>
                    )}
                    {process.env.NODE_ENV !== 'production' ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRegenerateSeats}
                          disabled={regenerating}
                        >
                          {regenerating ? 'Regenerating…' : 'Regenerate seats for this session'}
                        </Button>
                        {regenerateError && (
                          <span className="text-[11px] text-amber-300">{regenerateError}</span>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-300">Ask an administrator to make the slots available again for this session.</p>
                    )}
                  </div>
                )}

                {holdError && !seatsLoading && (
                  <p className="text-xs text-amber-400 px-2">
                    {holdError}
                  </p>
                )}

                {!seatsLoading && !seatsError && seatRows.length > 0 && (
                  <div className="w-full mask-content-auto">
                    <ImaxSeatMap
                      rows={seatRows}
                      selectedSeatIds={selectedSeatIds}
                      onSeatToggle={handleSeatClick}
                      allowedTypes={allowedTypes}
                      maxSelectable={counts.totalSlots}
                      seatUiStates={seatUiStateById}
                      currentCartId={cartId}
                      debugLayout={debugLayout}
                      debug={debug}
                    />
                  </div>
                )}

                {!seatsLoading && !seatsError && selectedSessionId && seatRows.length === 0 && (
                  <p className="text-xs text-gray-400 px-2">
                    No seats found for this session.
                  </p>
                )}
            </div>

            {/* Painel de SeleÃ§Ã£o Inferior */}
            <SelectedSeatsPanel tickets={ticketSlots} onRemoveSeat={handleRemoveSeat} />

            {/* BotÃ£o Apply */}
            <ApplyButton onApply={handleApply} isReady={isAllSelected} />
        </div>
      </div>
    </div>
  );
}
