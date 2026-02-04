"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Cinema } from "@/data/cinemas";

// Definindo o tipo do Ticket na Store para ser reutilizado
export type SelectedTicket = {
  id: string;
  name: string;
  price: number;
  amount: number;
  description?: string[];
};

// Tipo do Ticket com Assento (usado no checkout)
export type FinalizedTicket = {
  id: string; // ID único gerado
  name: string;
  type: string; // 'VIP' | 'STANDARD'
  price: number;
  assignedSeatId?: string;
};

// Dados do pagamento confirmado
export type PaymentData = {
  orderId: string;
  paymentIntentId?: string;
  totalAmount: number;
  paymentDate: string;
  status: "pending" | "succeeded" | "failed";
};

// Sessão selecionada com metadados
export type SessionData = {
  id: string;
  movieTitle: string;
  startTime: string;
  endTime: string;
};

type BookingState = {
  // Dados Geográficos e de Cinema
  selectedCinema: Cinema | null;
  userLocation: { lat: number; lng: number } | null;

  // Dados da Sessão e Compra
  selectedSessionId: string | null;
  sessionData: SessionData | null;
  selectedTickets: SelectedTicket[];

  // Tickets finalizados com assentos
  finalizedTickets: FinalizedTicket[];

  // Dados do pagamento
  paymentData: PaymentData | null;

  // Cart ID (para rastrear carrinho no backend)
  cartId: string | null;

  // Actions
  setCinema: (cinema: Cinema) => void;
  setUserLocation: (loc: { lat: number; lng: number }) => void;
  setSelectedSessionId: (id: string) => void;
  setSessionData: (data: SessionData) => void;
  setSelectedTickets: (tickets: SelectedTicket[]) => void;
  setFinalizedTickets: (tickets: FinalizedTicket[]) => void;
  setPaymentData: (data: PaymentData) => void;
  setCartId: (id: string | null) => void;

  // Limpar todo o estado (após confirmação ou expiração)
  resetBooking: () => void;

  // Validações
  canProceedToSeatSelection: () => boolean;
  canProceedToCheckout: () => boolean;
  canProceedToPayment: () => boolean;
};

const initialState = {
  selectedCinema: null,
  userLocation: null,
  selectedSessionId: null,
  sessionData: null,
  selectedTickets: [],
  finalizedTickets: [],
  paymentData: null,
  cartId: null,
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCinema: (cinema) => set({ selectedCinema: cinema }),
      setUserLocation: (loc) => set({ userLocation: loc }),
      setSelectedSessionId: (id) => set({ selectedSessionId: id }),
      setSessionData: (data) => set({ sessionData: data }),
      setSelectedTickets: (tickets) => set({ selectedTickets: tickets }),
      setFinalizedTickets: (tickets) => set({ finalizedTickets: tickets }),
      setPaymentData: (data) => set({ paymentData: data }),
      setCartId: (id) => set({ cartId: id }),

      resetBooking: () => set(initialState),

      // Validações do fluxo
      canProceedToSeatSelection: () => {
        const state = get();
        return (
          state.selectedCinema !== null &&
          state.selectedSessionId !== null &&
          state.selectedTickets.length > 0 &&
          state.selectedTickets.some((t) => t.amount > 0)
        );
      },

      canProceedToCheckout: () => {
        const state = get();
        return (
          state.canProceedToSeatSelection() &&
          state.finalizedTickets.length > 0 &&
          state.finalizedTickets.every((t) => t.assignedSeatId)
        );
      },

      canProceedToPayment: () => {
        const state = get();
        return state.canProceedToCheckout();
      },
    }),
    {
      name: "riviera-booking-store",
      // Opcional: limpar dados expirados (10 min)
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Verificar se há dados de pagamento pendente há mais de 10 min
          // Se necessário, implementar lógica de expiração aqui
        }
      },
    }
  )
);
